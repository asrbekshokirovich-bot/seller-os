import { olchamIshonchlimi } from '../tannarx.js';
import { THRESHOLDS } from '../thresholds.js';
import type { Flag } from '../traps.js';
import type { Baholanmadi } from './turlar.js';

const H = THRESHOLDS.heavy;

/** 7-tuzoq kirishi. */
export interface OgirKirishi {
  /** Ogʻirlik, gramm. Uzum `skuList { weight }` dan keladi. */
  weightG: number | null;
  /**
   * Hajm, ml. `Sku.dimensions` medianasidan.
   *
   * 2026-08-25 da bu yerda "Uzumda bunday maydon YOʻQ" deb
   * yozgandim — XATO edi. Faqat `Product` turini qaraganman;
   * oʻlchamlar `Sku.dimensions` da (`length`/`width`/`height`, mm).
   */
  volumeMl: number | null;
  /**
   * Uzumning OʻZI "katta hajmli" deb belgilagan tovar
   * (`Product.oversized`).
   *
   * NEGA KERAK. `volumeMl` HAR DOIM ham kelmaydi: `dimensions`
   * ni sotuvchi toʻldirmagan boʻlishi mumkin, toʻldirgani esa
   * ogʻirlikka zid chiqishi mumkin (pastga qarang). `oversized`
   * shu boʻshliqni toʻldiradi: u hajm oʻlchovi emas, lekin
   * Uzumning oʻz belgisi va MUSTAQIL manba — jonli tekshirildi,
   * 7 ta muzlatgichda `true`, 7 ta yengil tovarda `false`.
   *
   * (2026-08-25 da bu izohda "Uzumda bunday maydon yoʻq" deb
   * yozilgan edi — xato, `Sku.dimensions` da bor.)
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
   * OGʻIRLIK VA HAJM BIR-BIRIGA ZID BOʻLSA — IKKALASI HAM RAD ETILADI.
   *
   * Oʻlchangan namuna: 25 grammlik koʻylakka 122 500 ml hajm
   * yozilgan. Bu filtr uni "122 litr hajm" deb yozib
   * ogohlantirardi — raqamning oʻzi koʻrinib turgan bemaʼnilik va
   * u butun roʻyxatga boʻlgan ishonchni buzadi.
   *
   * Qaysi biri notoʻgʻri ekanini bilib boʻlmaydi, shuning uchun
   * bittasini tanlab olinmaydi — javob "baholanmadi".
   *
   * `oversized` BU YERGA KIRMAYDI: u Uzumning oʻz belgisi, yaʼni
   * mustaqil manba va sotuvchining raqamlariga bogʻliq emas.
   */
  if (!kattaBelgi && olchamIshonchlimi(k.weightG, k.volumeMl) === false) {
    return { kind: 'baholanmadi', missing: ['weightG', 'volumeMl'] };
  }

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
