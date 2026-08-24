import { marjaFoizi, type Tannarx } from '../qismlar.ts';
import { THRESHOLDS } from '../thresholds.ts';
import type { Flag } from '../traps.ts';
import type { Baholanmadi } from './turlar.ts';

/**
 * 3-tuzoq: demping / zararga sotish.
 *
 * Nega jozibali: tovar eng koʻp sotilayotganlar roʻyxatida turadi —
 * "demak ishlayapti" degan xulosa oʻzi kelib chiqadi.
 *
 * Aslida katta oʻyinchi bozorni siqib turgan boʻlishi mumkin: u
 * zararga yoki nolga sotadi, chunki maqsadi foyda emas, raqobatchini
 * chiqarib yuborish. Yangi sotuvchi shu narxga tenglashsa, u ham
 * zarar koʻradi — lekin kattaning zaxirasi bor, yangining yoʻq.
 *
 * Signal: shu narxda sotganda marja `minMarginPercent` dan past
 * chiqadi. Tannarx toʻliq hisoblanadi — Xitoy narxi, kargo, bojxona,
 * QQS va platforma komissiyasi.
 *
 * `block` — tovar tavsiyadan butunlay chiqariladi. TUZOQLAR.md §3
 * shunday belgilaydi va mahsulot maqsadiga mos: bu tizim $1 000 bilan
 * boshlayotgan odam uchun. Unga zarariga sotiladigan bozorni
 * koʻrsatish — pulini yoʻqotishga yoʻnaltirish.
 *
 * NAZORATCHIGA SAVOL (hal qilinmagan). Tannarx sotuvchidan sotuvchiga
 * farq qiladi: katta partiya olgan yoki oʻz ishlab chiqarishi bor odam
 * shu narxda ham foyda koʻrishi mumkin. Bizning hisobimiz — yangi
 * boshlovchining tannarxi. Yaʼni `block` tajribali sotuvchiga haqiqiy
 * imkoniyatni ham yopib qoʻyishi mumkin.
 *
 * Hozircha hujjat qanday aytgan boʻlsa shunday: `block`. Oʻzgartirish
 * kerak boʻlsa — TUZOQLAR.md da, tasdiq bilan, oʻlchov bilan.
 */
export function demping(t: Tannarx): Flag | Baholanmadi | null {
  const yetishmaydi: string[] = [];
  if (t.sotuvNarxi === null) yetishmaydi.push('sotuvNarxi');
  if (t.xitoyNarxi === null) yetishmaydi.push('xitoyNarxi');
  if (t.kargo === null) yetishmaydi.push('kargo');
  if (t.bojxonaQqs === null) yetishmaydi.push('bojxonaQqs');
  if (t.komissiya === null) yetishmaydi.push('komissiya');
  if (yetishmaydi.length > 0) return { kind: 'baholanmadi', missing: yetishmaydi };

  const foiz = marjaFoizi(t);
  if (foiz === null) return { kind: 'baholanmadi', missing: ['sotuvNarxi'] };

  const chegara = THRESHOLDS.dumping.minMarginPercent;
  if (foiz >= chegara) return null;

  const sof = Math.round(
    (t.sotuvNarxi as number) - (t.xitoyNarxi as number) - (t.kargo as number) -
    (t.bojxonaQqs as number) - (t.komissiya as number),
  );

  return {
    kind: 'dumping',
    severity: 'block',
    reason:
      foiz < 0
        ? `Bu narxda zarar: har donada ${Math.abs(sof).toLocaleString('uz-UZ')} soʻm ` +
          'yoʻqotasiz. Katta oʻyinchi bozorni siqyapti.'
        : `Bu narxda foyda deyarli yoʻq: marja ${foiz.toFixed(1)}%, ` +
          `kerak ${chegara}%. Katta oʻyinchi bozorni siqyapti.`,
    evidence: {
      marja_foiz: Math.round(foiz * 10) / 10,
      sof_foyda_som: sof,
      chegara_foiz: chegara,
      sotuv_narxi: t.sotuvNarxi as number,
    },
  };
}
