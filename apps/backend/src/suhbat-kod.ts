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
  qadamOchiq,
  rasmYuklovchi,
  reja,
  tashxisMatni,
  type Flag,
  sohalar,
  tovarlar,
  uzumLogistikaSom,
  xitoyLimitHolati,
  xitoyQidiruvniBoshla,
  xitoyQidiruvniTekshir,
  XITOY_LIMIT,
  yonalishlar,
  type NomzodJavobi,
  type ObunaXom,
  type ProfilJavoblari,
  type SuhbatBogliqliklari,
  type TovarNomzodi,
  type TovarToliq,
  type XitoyLimitJavobi,
  type XitoyNatijasi,
  type XitoyQatori,
  type XitoyTaklif,
  type XitoyTovar,
  type YolHolati,
} from '@selleros/shared';

/** 5-qadam uchun tashqi narsalar — hammasi chaqiruvchidan (env, sessiya). */
export interface XitoyBogliqligi {
  /** `XITOY_API_KEY` (Apify tokeni). `null` — ulanmagan; qidiruv bo'lmaydi va shu aytiladi. */
  kalit: string | null;
  fetch: typeof fetch;
  /** Sessiya tokeni — kunlik limit va reja shu odamniki. */
  token: string;
  /** `TARIF_CHEKLOVI=1` — `/xitoy-qidiruv` bilan bir xil darvoza. */
  tarifCheklovi: boolean;
  hozir?: () => Date;
}

/** Bir turnda (bitta yurishda) ko'pi bilan shuncha rasm — Edge/Vercel vaqti va xarajat uchun. */
const BIR_TURNDA_MAX = 5;
/** Tarmoq xatosi bilan tugagan tekshiruvlar — shundan keyin "qidirilmadi". */
const TEKSHIRUV_URINISH_MAX = 3;

/** Bitta tovar uchun 5-qadam qatori. Hamma maydon har doim to'ldiriladi. */
function xitoyQatori(
  productId: number, title: string, rasmUrl: string | null, chegaraSom: number | null, yetishmaydi: string[],
  holat: XitoyQatori['holat'], sabab: string | null, jami: number | null, takliflar: XitoyTaklif[],
  keshdan: boolean, tashlandi: number, tashxis: string | null = null,
): XitoyQatori {
  return { productId, title, rasmUrl, chegaraSom, yetishmaydi, holat, sabab, jami, takliflar, keshdan, tashlandi, tashxis };
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
        | { qatorlar?: Array<{ productId: number; chegaraSom: number | null; yetishmaydi?: string[] }> } | undefined;
      const tovar = (id: number) => tn?.royxat?.find((x) => x.nomzod.productId === id)?.nomzod;
      const tannarxQatori = (id: number) => tannarx?.qatorlar?.find((x) => x.productId === id);
      const chegara = (id: number) => tannarxQatori(id)?.chegaraSom ?? null;
      const yetishmaydi = (id: number) => tannarxQatori(id)?.yetishmaydi ?? [];
      const rasm = (id: number): string | null => {
        const bazadan = tovar(id)?.rasmUrl;
        if (httpsManzilmi(bazadan)) return bazadan;
        const yuborgan = holat.javoblar[`rasm:${id}`];
        return httpsManzilmi(yuborgan) ? yuborgan.trim() : null;
      };
      const nom = (id: number) => tovar(id)?.title ?? `#${id}`;
      const IZOH = 'Takliflar 1688 dan, rasm boʻyicha (Apify). Narx yuanda provayderdan; soʻm — CBU kursi bilan. "Chegarada" — soʻmdagi narx 4-qadam chegarasidan oshmaydi; chegaraga kirmagan qism (kargo) har qatorda yozilgan. Buyurtmalar soni jami, davri yozilmagan.';
      const eski = holat.natijalar.xitoy as XitoyNatijasi | undefined;

      const qidirilmadi = (id: number, sabab: string, rasmUrl: string | null = rasm(id)) =>
        xitoyQatori(id, nom(id), rasmUrl, chegara(id), yetishmaydi(id), 'qidirilmadi', sabab, null, [], false, 0);
      const takliflarniYasa = (natijalar: XitoyTovar[], chegaraSom: number | null, kurs: XitoyNatijasi['kurs']): XitoyTaklif[] => {
        const t = natijalar.map((x) => {
          const narxSom = kurs === null ? null : Math.round(x.narxYuan * kurs.somPerYuan);
          const chegaradaMi = narxSom !== null && chegaraSom !== null ? narxSom <= chegaraSom : null;
          return { ...x, narxSom, chegaradaMi };
        });
        // Chegarada bo'lganlar oldinda, qolgani o'xshashlik tartibida. Ko'pi bilan 10 ta.
        t.sort((a, b) => Number(b.chegaradaMi === true) - Number(a.chegaradaMi === true));
        return t.slice(0, 10);
      };
      const yakun = (kurs: XitoyNatijasi['kurs'], qatorlar: XitoyQatori[], kutilmoqda: XitoyNatijasi['kutilmoqda']): XitoyNatijasi => ({
        olchov_yoq: kutilmoqda === null && (qatorlar.length === 0 || qatorlar.every((q) => q.holat === 'qidirilmadi')),
        kurs,
        qatorlar: [...qatorlar].sort((a, b) => tanlangan.indexOf(a.productId) - tanlangan.indexOf(b.productId)),
        kutilmoqda,
        izoh: IZOH,
      });

      if (xitoy === null || !xitoy.kalit) {
        return yakun(null, tanlangan.map((id) => qidirilmadi(id, 'provayder kaliti yoʻq')), null);
      }
      const p = { kalit: xitoy.kalit, fetch: xitoy.fetch };
      const qaytar = () => rpc('so_xitoy_limit', { p_token: xitoy.token, p_qaytar: true });

      // ---- TEKSHIRISH: yurish boshlangan edi.
      if (eski?.kutilmoqda) {
        const k = eski.kutilmoqda;
        const t = await xitoyQidiruvniTekshir(p, k.runId, k.rasmlar.map((r) => ({ url: r.rasmUrl, sha256: r.sha256 ?? null })));
        if (t.holat === 'kutilmoqda') return eski;
        const qatorlar = [...eski.qatorlar];
        if (t.holat === 'xato' && t.runHolati === null) {
          // Tarmoq/API vaqtinchalik xatosi — yurish Apify'da davom etadi;
          // bir necha marta yana kutamiz, keyin rostini aytamiz.
          const urinish = (k.urinish ?? 0) + 1;
          if (urinish <= TEKSHIRUV_URINISH_MAX) return { ...eski, kutilmoqda: { ...k, urinish } };
        }
        if (t.holat === 'xato') {
          for (const r of k.rasmlar) {
            await qaytar();
            qatorlar.push(qidirilmadi(r.productId, `provayder: ${t.xato}`, r.rasmUrl));
          }
          return yakun(eski.kurs, qatorlar, null);
        }
        for (const r of k.rasmlar) {
          const natija = t.rasmlar.find((x) => x.rasmUrl === r.rasmUrl);
          if (natija === undefined || natija.xato !== null) {
            // RISK_CONTROL, o'qilmagan kartalar yoki natija kelmadi — qidiruv
            // BO'LMADI: band qaytadi, kesh yozilmaydi.
            await qaytar();
            qatorlar.push(qidirilmadi(r.productId, `provayder: ${natija?.xato ?? 'bu rasm uchun natija kelmadi'}`, r.rasmUrl));
            continue;
          }
          // Qidiruv BO'LDI: kesh (bo'sh natija ham — u javob).
          await rpc('so_xitoy_kesh_yoz', { p_rasm_hash: r.rasmUrl, p_natijalar: natija.natijalar, p_manba: '1688' });
          const takliflar = takliflarniYasa(natija.natijalar, chegara(r.productId), eski.kurs);
          qatorlar.push(xitoyQatori(r.productId, nom(r.productId), r.rasmUrl, chegara(r.productId), yetishmaydi(r.productId),
            takliflar.length ? 'topildi' : 'topilmadi', null, natija.jami, takliflar, false, natija.tashlandi, tashxisMatni(natija.tashxis)));
        }
        return yakun(eski.kurs, qatorlar, null);
      }

      // ---- BOSHLASH
      const obuna = await rpc<{ xato?: string; obuna: ObunaXom | null }>('so_obuna', { p_token: xitoy.token });
      const r = reja(obuna?.obuna ?? null, new Date()).reja;
      if (xitoy.tarifCheklovi && !qadamOchiq(r, 4)) {
        return yakun(null, tanlangan.map((id) => qidirilmadi(id, `tarif: "${r}" rejada Xitoy qidiruvi yopiq`)), null);
      }
      // Sanoq — O'LCHOV; kelmasa qidirmaymiz (nol emas).
      const limitH = xitoyLimitHolati(await rpc<XitoyLimitJavobi>('so_xitoy_limit', { p_token: xitoy.token }), r);
      if (!limitH.ok) {
        return yakun(null, tanlangan.map((id) => qidirilmadi(id, `limit oʻlchanmadi: ${limitH.xato}`)), null);
      }
      // Kurs — o'lchov. Olinmasa so'mga o'girilmaydi va bu aytiladi.
      const kurs = await kursniOl(xitoy.fetch);

      const qatorlar: XitoyQatori[] = [];
      const boshlanadigan: Array<{ productId: number; rasmUrl: string }> = [];
      for (const id of tanlangan) {
        const rasmUrl = rasm(id);
        if (rasmUrl === null) {
          qatorlar.push(qidirilmadi(id, 'rasm yoʻq — bazada ham, obunachidan ham kelmadi', null));
          continue;
        }
        const kesh = await rpc<{ topildi: boolean; natijalar?: XitoyTovar[] }>('so_xitoy_kesh_ol', { p_rasm_hash: rasmUrl });
        if (kesh?.topildi && Array.isArray(kesh.natijalar)) {
          const takliflar = takliflarniYasa(kesh.natijalar, chegara(id), kurs);
          qatorlar.push(xitoyQatori(id, nom(id), rasmUrl, chegara(id), yetishmaydi(id),
            takliflar.length ? 'topildi' : 'topilmadi', null, kesh.natijalar.length, takliflar, true, 0));
          continue;
        }
        if (boshlanadigan.length >= BIR_TURNDA_MAX) {
          qatorlar.push(qidirilmadi(id, `bir turnda ${BIR_TURNDA_MAX} tagacha rasm qidiriladi — qayta qidirishda davom etadi`, rasmUrl));
          continue;
        }
        // Band qilish — yurishdan OLDIN, har rasm uchun, atomik (0055).
        const band = xitoyLimitHolati(await rpc<XitoyLimitJavobi>('so_xitoy_limit', {
          p_token: xitoy.token, p_oshir: true, p_limit: limitH.natija.limit, p_umumiy_limit: XITOY_LIMIT.jamiKunlik,
        }), r);
        if (!band.ok) { qatorlar.push(qidirilmadi(id, `limit oʻlchanmadi: ${band.xato}`, rasmUrl)); continue; }
        if (!band.ruxsat) {
          const umumiy = band.natija.umumiy !== null && band.natija.umumiy.ishlatilgan >= band.natija.umumiy.limit;
          qatorlar.push(qidirilmadi(id, `kunlik limit tugadi (${umumiy ? `umumiy ${band.natija.umumiy!.limit}` : `${band.natija.limit} ta, "${r}" rejasi`})`, rasmUrl));
          continue;
        }
        boshlanadigan.push({ productId: id, rasmUrl });
      }
      if (boshlanadigan.length === 0) return yakun(kurs, qatorlar, null);

      // Rasm avval BIZ tomonda yuklanadi (Uzum CDN WebP beradi; 1688 URL dan
      // oʻzi olganda 0 natija — jonli oʻlchov 2026-09-25) va base64 bilan ketadi.
      const b = await xitoyQidiruvniBoshla(p, { rasmlar: boshlanadigan.map((x) => x.rasmUrl), yukla: rasmYuklovchi(xitoy.fetch) });
      if (b.runId === null) {
        for (const x of boshlanadigan) {
          await qaytar();
          qatorlar.push(qidirilmadi(x.productId, `provayder: ${b.xato}`, x.rasmUrl));
        }
        return yakun(kurs, qatorlar, null);
      }
      return yakun(kurs, qatorlar, {
        runId: b.runId,
        boshlandi: (xitoy.hozir ?? (() => new Date()))().toISOString(),
        rasmlar: boshlanadigan.map((x) => {
          const y = b.rasmlar.find((r) => r.url === x.rasmUrl);
          return { ...x, sha256: y?.sha256 ?? null, usul: y?.usul ?? 'url' };
        }),
      });
    },
  };
}
