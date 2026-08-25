import { THRESHOLDS } from '../thresholds.js';
import type { Flag } from '../traps.js';
import type { Baholanmadi } from './turlar.js';

const H = THRESHOLDS.heavy;

/** 7-tuzoq kirishi. */
export interface OgirKirishi {
  /** Ogʻirlik, gramm. Uzum `skuList { weight }` dan keladi. */
  weightG: number | null;
  /** Hajm, ml. Uzum bermaydi — hozircha doim `null`. */
  volumeMl: number | null;
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
  // Ikkalasi ham nomaʼlum boʻlsa — baholanmadi. Bittasi maʼlum
  // boʻlsa yetadi: ogʻirlik ham, hajm ham mustaqil sabab.
  if (k.weightG === null && k.volumeMl === null) {
    return { kind: 'baholanmadi', missing: ['weightG', 'volumeMl'] };
  }

  const ogirmi = k.weightG !== null && k.weightG >= H.heavyGrams;
  const kattami = k.volumeMl !== null && k.volumeMl >= H.bulkyVolumeMl;
  if (!ogirmi && !kattami) return null;

  const sabablar: string[] = [];
  if (ogirmi) {
    sabablar.push(`${(k.weightG! / 1000).toFixed(1)} kg`);
  }
  if (kattami) {
    sabablar.push(`${(k.volumeMl! / 1000).toFixed(0)} litr hajm`);
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
      ogirChegarasi: H.heavyGrams,
    },
  };
}
