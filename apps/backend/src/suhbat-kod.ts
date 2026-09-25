/**
 * Suhbatning KOD HARAKATLARI — 2, 3, 4-qadam hisoblari.
 *
 * `suhbat.ts` (shared) bu uchta funksiyani chaqiradi; ular deterministik
 * va LLM siz ishlaydi. Mantiq `/yonalishlar`, `/tovarlar`, `/tannarx`
 * uchlari bilan BIR XIL bo'lishi shart — ular ham shu shared
 * funksiyalarni chaqiradi. Farq faqat shaklda: uch HTTP javob beradi,
 * bu esa holatga yoziladigan natija.
 *
 * Bu fayl `tahlil.ts` kabi Edge Function ga KO'CHIRILADI
 * (`supabase/functions/tayyorlash.mjs`). Shuning uchun unda Fastify ham,
 * `process.env` ham yo'q — hamma narsa argument sifatida keladi.
 *
 * TANNARX 4-QADAMDA — CHEGARA NARX. Xitoy narxi hali yo'q (u 5-qadamda
 * keladi), shuning uchun `tannarxHisobi()` emas, `chegaraNarxi()`:
 * "shu sotuv narxi va marja bilan Xitoyda maksimum qancha?". Kargo
 * stavkasi bugun bazada YO'Q — chegara kargosiz chiqadi va bu har
 * qatorda `yetishmaydi` bilan ochiq yoziladi (QOIDALAR.md, 4-bo'lim).
 *
 * XITOY 5-QADAMDA (2026-09-25). Har tanlangan tovar uchun: rasm
 * (bazadan yoki obunachi yuborgan manzil) → 72 soatlik kesh → kunlik
 * limit (reja bo'yicha, `/xitoy-qidiruv` bilan bir xil) → provayder
 * (`xitoyQidir`) → kesh yozish + sanoq. Yuan narx CBU kursi bilan
 * so'mga o'giriladi va 4-qadam chegarasiga solishtiriladi. Kurs
 * olinmasa so'm yo'q va bu aytiladi. Uch holat ATAYLAB farqlanadi:
 * topildi / topilmadi (javob) / qidirilmadi (sabab).
 */

import {
  chegaraNarxi,
  httpsManzilmi,
  KESH_ESKI_SOAT,
  kursniOl,
  limitTekshir,
  reja,
  type Flag,
  sohalar,
  tovarlar,
  uzumLogistikaSom,
  xitoyQidir,
  yonalishlar,
  type NomzodJavobi,
  type ObunaXom,
  type ProfilJavoblari,
  type SuhbatBogliqliklari,
  type TovarNomzodi,
  type TovarToliq,
  type XitoyNatijasi,
  type XitoyQatori,
  type XitoyTaklif,
  type XitoyTovar,
  type YolHolati,
} from '@selleros/shared';

/** 5-qadam uchun tashqi narsalar — hammasi chaqiruvchidan (env, sessiya). */
export interface XitoyBogliqligi {
  /** `XITOY_API_KEY`. `null` — ulanmagan; qidiruv bo'lmaydi va shu aytiladi. */
  kalit: string | null;
  fetch: typeof fetch;
  /** Sessiya tokeni — kunlik limit va reja shu odamniki. */
  token: string;
}

/** Bitta tovar uchun 5-qadam qatori. Hamma maydon har doim to'ldiriladi. */
function xitoyQatori(
  productId: number, title: string, rasmUrl: string | null, chegaraSom: number | null,
  holat: XitoyQatori['holat'], sabab: string | null, jami: number | null, takliflar: XitoyTaklif[],
): XitoyQatori {
  return { productId, title, rasmUrl, chegaraSom, holat, sabab, jami, takliflar };
}

/** `so_tovar_royxati()` javobi. */
interface TovarJavobi {
  turkum: { categoryId: number; name: string } | null;
  royxat: TovarNomzodi[];
}

type Rpc = <T>(nom: string, arg: unknown) => Promise<T | null>;
type Tekshir = (t: TovarToliq) => {
  bayroqlar: Flag[];
  baholanmadi: Array<{ filtr: string; missing: string[] }>;
};

export function suhbatKodHarakatlari(
  rpc: Rpc,
  tekshir: Tekshir,
  hozirgiOy: () => number,
  xitoy: XitoyBogliqligi | null = null,
): SuhbatBogliqliklari['kod'] {
  return {
    async yonalishlar(profil: Partial<ProfilJavoblari>) {
      const kesh = await rpc<NomzodJavobi>('so_yonalish_nomzodlari', {});
      if (kesh === null) return { olchov_yoq: true, sabab: 'baza javob bermadi' };
      if (!kesh.royxat.length) return { olchov_yoq: true, sabab: 'nomzodlar hali hisoblanmadi' };
      const toliq: ProfilJavoblari = {
        experience: null, familyField: null, interest: null,
        budgetUzs: profil.budgetUzs ?? null, capitalLock: null, hoursPerWeek: null,
        city: null, onlineExperience: null, hasUzumShop: profil.hasUzumShop ?? null,
        importedFromChina: null, certExperience: null, riskPreference: null,
      };
      const n = yonalishlar(kesh.royxat, toliq.budgetUzs, sohalar(toliq), hozirgiOy());
      return {
        olchov_yoq: false,
        nomzod_soni: kesh.royxat.length,
        hisoblandi: kesh.hisoblandi,
        yoshi_soat: kesh.yoshi_soat,
        kesh_eskirgan: kesh.yoshi_soat !== null && kesh.yoshi_soat > KESH_ESKI_SOAT,
        ...n,
      };
    },

    async tovarlar(categoryId: number) {
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return { olchov_yoq: true, sabab: 'yoʻnalish tanlanmagan' };
      }
      const kesh = await rpc<TovarJavobi>('so_tovar_royxati', {
        p_category_external_id: categoryId,
        p_limit: 50,
      });
      if (kesh === null) return { olchov_yoq: true, sabab: 'baza javob bermadi' };
      if (!kesh.royxat.length) {
        return {
          olchov_yoq: true,
          sabab: kesh.turkum === null ? 'bunday turkum yoʻq' : 'turkumda oʻlchangan tovar yoʻq',
        };
      }
      const n = tovarlar(kesh.royxat, tekshir);
      return { olchov_yoq: false, turkum: kesh.turkum, ...n };
    },

    async tannarx(holat: YolHolati) {
      const marja = Number(holat.javoblar['marja']);
      const tn = holat.natijalar.tovarlar as
        | { royxat?: Array<{ nomzod: TovarNomzodi & { komissiyaFoizi?: number | null; volumeMl?: number | null } }> }
        | undefined;
      const tanlangan = Array.isArray(holat.javoblar['tovarlar'])
        ? (holat.javoblar['tovarlar'] as unknown[]).map(Number) : [];

      const qatorlar = tanlangan.map((id) => {
        const t = tn?.royxat?.find((x) => x.nomzod.productId === id);
        const miqdor = holat.javoblar[`miqdor:${id}`];
        const n = chegaraNarxi({
          sotuvNarxiSom: t?.nomzod.narxSom ?? null,
          marjaFoizi: Number.isFinite(marja) ? marja : null,
          komissiyaFoizi: t?.nomzod.komissiyaFoizi ?? null,
          uzumLogistikaSom: uzumLogistikaSom(t?.nomzod.volumeMl ?? null),
          // Kargo stavkasi bazada hali yo'q — ochiq `yetishmaydi`.
          kargoSom: null,
        });
        return {
          productId: id,
          title: t?.nomzod.title ?? `#${id}`,
          sotuvNarxiSom: t?.nomzod.narxSom ?? null,
          miqdor: typeof miqdor === 'number' ? miqdor : null,
          marjaFoizi: Number.isFinite(marja) ? marja : null,
          ...n,
        };
      });
      return {
        olchov_yoq: qatorlar.every((q) => q.chegaraSom === null),
        qatorlar,
        izoh: 'Chegara — Xitoyda 1 dona uchun maksimal narx, soʻmda. Yetishmagan qism roʻyxatda; u hisobga kirmagan, demak haqiqiy chegara PASTROQ.',
      };
    },

    async xitoy(holat: YolHolati): Promise<XitoyNatijasi> {
      const tanlangan = Array.isArray(holat.javoblar['tovarlar'])
        ? (holat.javoblar['tovarlar'] as unknown[]).map(Number).filter(Number.isInteger) : [];
      const tn = holat.natijalar.tovarlar as
        | { royxat?: Array<{ nomzod: TovarNomzodi & { rasmUrl?: string | null } }> } | undefined;
      const tannarx = holat.natijalar.tannarx as
        | { qatorlar?: Array<{ productId: number; chegaraSom: number | null }> } | undefined;
      const tovar = (id: number) => tn?.royxat?.find((x) => x.nomzod.productId === id)?.nomzod;
      const chegara = (id: number) => tannarx?.qatorlar?.find((x) => x.productId === id)?.chegaraSom ?? null;
      const rasm = (id: number): string | null => {
        const bazadan = tovar(id)?.rasmUrl;
        if (httpsManzilmi(bazadan)) return bazadan;
        const yuborgan = holat.javoblar[`rasm:${id}`];
        return httpsManzilmi(yuborgan) ? yuborgan.trim() : null;
      };
      const nom = (id: number) => tovar(id)?.title ?? `#${id}`;
      const IZOH = 'Takliflar 1688 dan, rasm boʻyicha. Narx yuanda provayderdan; soʻm — CBU kursi bilan. "Chegarada" — soʻmdagi narx 4-qadam chegarasidan oshmaydi. Sotuv davri provayderda yozilmagan.';

      if (xitoy === null || !xitoy.kalit) {
        return {
          olchov_yoq: true, sabab: 'provayder kaliti yoʻq', kurs: null, izoh: IZOH,
          qatorlar: tanlangan.map((id) => xitoyQatori(id, nom(id), rasm(id), chegara(id), 'qidirilmadi', 'provayder kaliti yoʻq', null, [])),
        };
      }

      // Kurs — o'lchov. Olinmasa so'mga o'girilmaydi va bu aytiladi.
      const kurs = await kursniOl(xitoy.fetch);

      // Kunlik limit — `/xitoy-qidiruv` bilan bir xil qoida, bir xil sanoq.
      const obuna = await rpc<{ xato?: string; obuna: ObunaXom | null }>('so_obuna', { p_token: xitoy.token });
      const r = reja(obuna?.obuna ?? null, new Date()).reja;
      const limitJ = await rpc<{ soni?: number }>('so_xitoy_limit', { p_token: xitoy.token });
      let ishlatilgan = limitJ?.soni ?? 0;

      const qatorlar: XitoyQatori[] = [];
      for (const id of tanlangan) {
        const rasmUrl = rasm(id);
        const chegaraSom = chegara(id);
        if (rasmUrl === null) {
          qatorlar.push(xitoyQatori(id, nom(id), null, chegaraSom, 'qidirilmadi', 'rasm yoʻq — bazada ham, obunachidan ham kelmadi', null, []));
          continue;
        }

        let natijalar: XitoyTovar[];
        let jami: number | null = null;
        const kesh = await rpc<{ topildi: boolean; natijalar?: XitoyTovar[] }>('so_xitoy_kesh_ol', { p_rasm_hash: rasmUrl });
        if (kesh?.topildi && Array.isArray(kesh.natijalar)) {
          natijalar = kesh.natijalar;
        } else {
          const lim = limitTekshir(ishlatilgan, r);
          if (!lim.ruxsat) {
            qatorlar.push(xitoyQatori(id, nom(id), rasmUrl, chegaraSom, 'qidirilmadi', `kunlik limit tugadi (${lim.limit} ta, "${r}" rejasi)`, null, []));
            continue;
          }
          const q = await xitoyQidir({ kalit: xitoy.kalit, fetch: xitoy.fetch }, { rasmUrl });
          if (q.xato !== null) {
            qatorlar.push(xitoyQatori(id, nom(id), rasmUrl, chegaraSom, 'qidirilmadi', `provayder: ${q.xato}`, null, []));
            continue;
          }
          natijalar = q.natijalar;
          jami = q.jami;
          // Qidiruv BO'LDI: kesh (bo'sh natija ham) + sanoq.
          await rpc('so_xitoy_kesh_yoz', { p_rasm_hash: rasmUrl, p_natijalar: natijalar, p_manba: q.manba ?? '1688' });
          const sanoq = await rpc<{ soni?: number }>('so_xitoy_limit', { p_token: xitoy.token, p_oshir: true });
          ishlatilgan = sanoq?.soni ?? ishlatilgan + 1;
        }

        const takliflar: XitoyTaklif[] = natijalar.map((t) => {
          const narxSom = kurs === null ? null : Math.round(t.narxYuan * kurs.somPerYuan);
          const chegaradaMi = narxSom !== null && chegaraSom !== null ? narxSom <= chegaraSom : null;
          return { ...t, narxSom, chegaradaMi };
        });
        // Chegarada bo'lganlar oldinda, qolgani provayder tartibida. Ko'pi bilan 10 ta.
        takliflar.sort((a, b) => Number(b.chegaradaMi === true) - Number(a.chegaradaMi === true));
        qatorlar.push(xitoyQatori(id, nom(id), rasmUrl, chegaraSom,
          takliflar.length ? 'topildi' : 'topilmadi', null, jami, takliflar.slice(0, 10)));
      }

      return {
        olchov_yoq: qatorlar.length === 0 || qatorlar.every((q) => q.holat === 'qidirilmadi'),
        kurs, qatorlar, izoh: IZOH,
      };
    },
  };
}
