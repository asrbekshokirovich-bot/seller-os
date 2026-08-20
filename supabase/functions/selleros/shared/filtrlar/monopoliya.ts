import { THRESHOLDS } from '../thresholds.ts';
import type { Flag } from '../traps.ts';
import type { Baholanmadi, TurkumHolati } from './turlar.ts';

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
 *
 * MUTLAQ SON YETARLI EMAS. Avval bu yerda faqat "kamida 8 sotuvchi"
 * sharti bor edi va u oʻlchov bilan RAD ETILDI (2026-08-19):
 * "Qoplamalar" turkumida 10 ta sotuvchi oʻlchangan, ular boʻyicha
 * ulush 76% — filtr ogohlantirish berardi. Aslida turkumda 2 052 ta
 * sotuvchi bor va haqiqiy ulush 21%.
 *
 * Sabab: oʻlchovga aynan yirik sotuvchilar tushadi. Yettita turkumdan
 * yettitasida ham namuna konsentratsiyani 2–4 barobar oshirib
 * koʻrsatdi. Shuning uchun endi QAMROV ham talab qilinadi: ulush
 * turkumdagi sotuvchilarning yarmidan koʻpi ustida hisoblanishi kerak.
 */
export function monopoliya(t: TurkumHolati): Flag | Baholanmadi | null {
  const missing: string[] = [];
  if (t.top3SharePercent === null) missing.push('top3SharePercent');
  if (t.measuredSellers === null) missing.push('measuredSellers');
  if (t.totalSellers === null) missing.push('totalSellers');
  if (missing.length) return { kind: 'baholanmadi', missing };

  const ulush = t.top3SharePercent as number;
  const sotuvchilar = t.measuredSellers as number;
  const jami = t.totalSellers as number;

  // Top-3 ulushi maʻnoga ega boʻlishi uchun kamida shuncha sotuvchi
  // oʻlchangan boʻlishi kerak. Aks holda "top-3" butun turkum demak.
  if (sotuvchilar < MIN_SOTUVCHI) {
    return { kind: 'baholanmadi', missing: [`sotuvchilar<${MIN_SOTUVCHI}`] };
  }

  // Mutlaq son yetarli emas — qamrov ham kerak. Izohga qarang.
  const qamrov = jami > 0 ? (100 * sotuvchilar) / jami : 0;
  if (qamrov < THRESHOLDS.monopoly.minSellerCoveragePercent) {
    return {
      kind: 'baholanmadi',
      missing: [
        `qamrov ${Math.round(qamrov)}% ` +
          `(${sotuvchilar}/${jami}), kerak ` +
          `${THRESHOLDS.monopoly.minSellerCoveragePercent}%`,
      ],
    };
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
      turkumdagi_sotuvchi: jami,
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
