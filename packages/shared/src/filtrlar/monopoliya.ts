import { THRESHOLDS } from '../thresholds.js';
import type { Flag } from '../traps.js';
import type { Baholanmadi, TurkumHolati } from './turlar.js';

/**
 * 6-tuzoq: monopol kategoriya.
 *
 * Nega jozibali: bozor hajmi juda katta.
 * Aslida: bozorning katta qismi bir necha doʻkonda va yangi kirgan
 * odam qolgan kichik ulush uchun kurashadi.
 *
 * `warn` beriladi, `block` emas: monopol turkumda ham chekka joy
 * topilishi mumkin. Foydalanuvchi buni bilib turib kirsa — bu uning
 * qarori (QOIDALAR.md, 4-qoida: "qaror sizniki").
 *
 * MUHIM: oʻlchangan sotuvchilar soni kam boʻlsa bu filtr ISHLAMAYDI.
 * Turkumda atigi 3 ta doʻkon oʻlchangan boʻlsa, top-3 ulushi tabiiy
 * ravishda 100% chiqadi — bu monopoliya emas, oʻlchov yupqaligi.
 * Bu xato zumsavdo da amalda uchragan.
 */
export function monopoliya(t: TurkumHolati): Flag | Baholanmadi | null {
  const missing: string[] = [];
  if (t.top3SharePercent === null) missing.push('top3SharePercent');
  if (t.measuredSellers === null) missing.push('measuredSellers');
  if (missing.length) return { kind: 'baholanmadi', missing };

  const ulush = t.top3SharePercent as number;
  const sotuvchilar = t.measuredSellers as number;

  // Top-3 ulushi maʻnoga ega boʻlishi uchun kamida shuncha sotuvchi
  // oʻlchangan boʻlishi kerak. Aks holda "top-3" butun turkum demak.
  if (sotuvchilar < MIN_SOTUVCHI) {
    return { kind: 'baholanmadi', missing: [`sotuvchilar<${MIN_SOTUVCHI}`] };
  }

  if (ulush <= THRESHOLDS.monopoly.top3SharePercent) return null;

  return {
    kind: 'monopoly',
    severity: 'warn',
    reason:
      `Kirish qiyin: bozorning ${Math.round(ulush)}% i 3 doʻkonda. ` +
      'Kichik oʻyinchilarga qolgan ulush kichik.',
    evidence: {
      top3_ulush_foiz: Math.round(ulush),
      olchangan_sotuvchi: sotuvchilar,
      chegara_foiz: THRESHOLDS.monopoly.top3SharePercent,
    },
  };
}

/**
 * Top-3 ulushi maʻnoli boʻlishi uchun eng kam sotuvchi soni.
 *
 * 8 tanlandi: 3 ta sotuvchida top-3 har doim 100%, 5 tada 60%+ tabiiy.
 * 8 tadan boshlab ulush haqiqatan konsentratsiyani koʻrsatadi.
 */
export const MIN_SOTUVCHI = 8;
