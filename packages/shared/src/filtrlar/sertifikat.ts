import type { Flag } from '../traps.js';
import type { Baholanmadi } from './turlar.js';

/**
 * Turkumga kirish talablari.
 *
 * Uchala holat FARQLANADI: `true` — kerak, `false` — kerak emas,
 * `null` — tekshirilmagan. Uchinchisini ikkinchisiga qoʻshib
 * yuborish eng qimmat xato boʻlardi: odam sertifikat talab
 * qiladigan turkumga pul tikadi, tovarni keltiradi va sota olmaydi.
 */
export interface KirishTalablari {
  categoryId: number;
  /** Asl Belgisi markirovkasi kerakmi. `null` — tekshirilmagan. */
  markingRequired: boolean | null;
  /** Muvofiqlik sertifikati kerakmi. `null` — tekshirilmagan. */
  certificateRequired: boolean | null;
  /** Taxminiy kirish xarajati, soʻm. */
  entryCostUzs: number | null;
  /** Kirish uchun taxminiy vaqt, hafta. */
  entryWeeks: number | null;
  /** Maʼlumot qayerdan olindi. Manbasiz qator ishlatilmaydi. */
  source: string | null;
}

/**
 * 5-tuzoq: majburiy sertifikat / markirovka.
 *
 * Nega jozibali: elektronika oson va foydali koʻrinadi.
 *
 * Bu tuzoq BLOKLAMAYDI — `note` beradi. Sabab TUZOQLAR.md da: talab
 * bor degani "kirmang" degani emas, "kirishdan oldin buni biling"
 * degani. Tayyor sotuvchi uchun bu hatto afzallik — raqobat kamroq.
 *
 * Xatoning yoʻnalishi muhim va u simmetrik emas:
 *
 *   - talab bor, lekin biz aytmadik  → odam sota olmaydigan tovarga
 *     pul tikadi. Yoʻqotish toʻliq partiya narxida.
 *   - talab yoʻq, lekin biz aytdik   → odam bir marta ortiqcha
 *     tekshiradi. Yoʻqotish — bir soat.
 *
 * Shuning uchun `null` HECH QACHON "kerak emas" deb oʻqilmaydi.
 * Maʼlumot yoʻq boʻlsa filtr `baholanmadi` qaytaradi va foydalanuvchi
 * "bu turkum tekshirilmagan" degan javobni koʻradi.
 *
 * Manbasiz qator ham `baholanmadi`: huquqiy talab oʻzgaradi va
 * qayerdan olingani bilinmasa, uni qayta tekshirib boʻlmaydi.
 */
export function sertifikat(t: KirishTalablari): Flag | Baholanmadi | null {
  const yetishmaydi: string[] = [];
  if (t.markingRequired === null) yetishmaydi.push('markingRequired');
  if (t.certificateRequired === null) yetishmaydi.push('certificateRequired');
  if (yetishmaydi.length > 0) {
    return { kind: 'baholanmadi', missing: yetishmaydi };
  }
  if (!t.source) {
    return { kind: 'baholanmadi', missing: ['source'] };
  }

  const talablar: string[] = [];
  if (t.markingRequired) talablar.push('markirovka');
  if (t.certificateRequired) talablar.push('sertifikat');
  if (talablar.length === 0) return null;

  const evidence: Record<string, number | string> = {
    markirovka: t.markingRequired ? 'kerak' : 'kerak emas',
    sertifikat: t.certificateRequired ? 'kerak' : 'kerak emas',
    manba: t.source,
  };

  // Xarajat va muddat `null` boʻlsa — jimgina nol yozilmaydi. "0 soʻm,
  // 0 hafta" degan xabar "arzon va tez" degan taassurot beradi, holbuki
  // aslida "bilmaymiz".
  const qismlar: string[] = [`Kirishdan oldin: ${talablar.join(' + ')}`];
  if (t.entryCostUzs !== null) {
    evidence.xarajat_som = t.entryCostUzs;
    qismlar.push(`~${t.entryCostUzs.toLocaleString('uz-UZ')} soʻm`);
  }
  if (t.entryWeeks !== null) {
    evidence.hafta = t.entryWeeks;
    qismlar.push(`~${t.entryWeeks} hafta`);
  }
  if (t.entryCostUzs === null || t.entryWeeks === null) {
    qismlar.push('(xarajat va muddat oʻlchanmagan)');
  }

  return {
    kind: 'certification',
    severity: 'note',
    reason: `${qismlar.join(', ')}.`,
    evidence,
  };
}
