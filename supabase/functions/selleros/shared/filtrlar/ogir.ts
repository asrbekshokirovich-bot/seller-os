import { THRESHOLDS } from '../thresholds.ts';
import type { Flag } from '../traps.ts';
import type { Baholanmadi } from './turlar.ts';

const H = THRESHOLDS.heavy;

/** 7-tuzoq kirishi. */
export interface OgirKirishi {
  /** Ogʻirlik, gramm. Uzum `skuList { weight }` dan keladi. */
  weightG: number | null;
  /**
   * Hajm, ml. Uzumda BUNDAY MAYDON YOʻQ — sxema introspeksiyasi
   * bilan oʻlchandi (2026-08-25). "Hozircha yoʻq" emas: qidirmang.
   * Maydon boshqa bozor uchun qoladi.
   */
  volumeMl: number | null;
  /**
   * Uzumning OʻZI "katta hajmli" deb belgilagan tovar
   * (`Product.oversized`).
   *
   * NEGA KERAK. `volumeMl` hech qachon kelmaydi — Uzumda bunday
   * maydon yoʻq. Yaʼni bu filtrning "katta hajm" tarmogʻi bir
   * marta ham ishlamagan. `oversized` aynan shu boʻshliqni
   * toʻldiradi: u hajm oʻlchovi emas, lekin Uzumning bezovtalik
   * belgisi — jonli tekshirildi, 7 ta muzlatgichda `true`,
   * 7 ta yengil tovarda `false`.
   *
   * `false` HECH NIMANI YOPMAYDI. U "katta emas" degani, "ogʻir
   * emas" degani emas: 6 kg li ixcham tovar ham `false` boʻladi.
   * Shuning uchun `false` ogʻirlik oʻrnini bosmaydi va filtr
   * baribir "baholanmadi" deb qaytadi.
   */
  oversized: boolean | null;
}

/**
 * 7-tuzoq: ogʻir / katta hajmli tovar.
 *
 * Nega jozibali: Xitoyda juda arzon turadi. Narxni koʻrgan odam
 * "shuni olib kelsam boʻldi" deb oʻylaydi.
 *
 * Aslida kargo har kilogramm uchun toʻlanadi va u tannarxga
 * qoʻshilganda marja yoʻqoladi. Bu eng koʻp uchraydigan yangi
 * boshlovchi xatosi: Xitoy narxi solishtiriladi, kargo esa
 * "keyin hisoblaymiz" deb qoldiriladi.
 *
 * TUZOQLAR.md §7: "real kargo tannarx hisobida MAJBURIY qatnashadi.
 * Marja chegaradan tushsa — `block`".
 *
 * Shuning uchun bu yerda `block` YOʻQ, `warn` bor. Sabab aniq:
 * bloklash qarori marjaga bogʻliq, marja esa Xitoy narxini talab
 * qiladi va u 4-qadamda keladi. Ogʻirlikning oʻzi tovarni yomon
 * qilmaydi — u faqat kargo hisobini MAJBURIY qiladi.
 *
 * Yaʼni bu filtr ogohlantiradi: "bu tovarda kargoni chetlab
 * oʻtib boʻlmaydi". Blok esa 4-qadamda, `demping` filtri orqali —
 * u toʻliq tannarxni koʻradi.
 */
export function ogir(k: OgirKirishi): Flag | Baholanmadi | null {
  const kattaBelgi = k.oversized === true;

  /*
   * Oʻlchov umuman yoʻq boʻlsa — baholanmadi. Bittasi maʼlum
   * boʻlsa yetadi: ogʻirlik, hajm va Uzum belgisi — uchalasi
   * mustaqil sabab.
   *
   * `oversized === false` bu yerda "maʼlum" deb sanalmaydi:
   * u ogʻirlik haqida hech nima demaydi.
   */
  if (k.weightG === null && k.volumeMl === null && !kattaBelgi) {
    return { kind: 'baholanmadi', missing: ['weightG', 'volumeMl', 'oversized'] };
  }

  const ogirmi = k.weightG !== null && k.weightG >= H.heavyGrams;
  const kattami = k.volumeMl !== null && k.volumeMl >= H.bulkyVolumeMl;
  if (!ogirmi && !kattami && !kattaBelgi) return null;

  const sabablar: string[] = [];
  if (ogirmi) {
    sabablar.push(`${(k.weightG! / 1000).toFixed(1)} kg`);
  }
  if (kattami) {
    sabablar.push(`${(k.volumeMl! / 1000).toFixed(0)} litr hajm`);
  }
  // Raqam toʻqilmaydi: Uzum necha litr ekanini aytmaydi, faqat
  // "katta" deydi. Shuni aynan shunday yozamiz.
  if (kattaBelgi && !ogirmi && !kattami) {
    sabablar.push('Uzum «katta hajmli» deb belgilagan');
  } else if (kattaBelgi) {
    sabablar.push('Uzumda «katta hajmli»');
  }

  return {
    kind: 'heavy',
    severity: 'warn',
    reason:
      `Ogʻir tovar (${sabablar.join(', ')}). Kargo har kilogramm uchun ` +
      'toʻlanadi va u tannarxga qoʻshilganda marja yoʻqolishi mumkin. ' +
      'Xitoy narxini kargosiz solishtirmang — 4-qadamda toʻliq hisob ' +
      'chiqariladi.',
    evidence: {
      ...(k.weightG !== null ? { ogirlikGramm: k.weightG } : {}),
      ...(k.volumeMl !== null ? { hajmMl: k.volumeMl } : {}),
      ...(k.oversized !== null ? { uzumKatta: k.oversized } : {}),
      ogirChegarasi: H.heavyGrams,
    },
  };
}
