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
 */

import {
  chegaraNarxi,
  KESH_ESKI_SOAT,
  type Flag,
  sohalar,
  tovarlar,
  uzumLogistikaSom,
  yonalishlar,
  type NomzodJavobi,
  type ProfilJavoblari,
  type SuhbatBogliqliklari,
  type TovarNomzodi,
  type TovarToliq,
  type YolHolati,
} from '@selleros/shared';

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
  };
}
