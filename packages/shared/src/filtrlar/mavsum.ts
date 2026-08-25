import { THRESHOLDS } from '../thresholds.js';
import type { Flag } from '../traps.js';
import type { Baholanmadi } from './turlar.js';

const M = THRESHOLDS.seasonal;

/** 2-tuzoq kirishi. */
export interface MavsumKirishi {
  /** 12 ta koeffitsient, yanvardan dekabrgacha. `1.0` — oʻrtacha oy. */
  seasonality: number[] | null;
  /** Hozirgi oy, 1–12. */
  oy: number;
}

/**
 * 2-tuzoq: mavsumiy tovar.
 *
 * Nega jozibali: hozir sotuv oʻsib turibdi. Isitgich kuzda ajoyib
 * koʻrinadi — grafik yuqoriga qarab ketadi va "shu ketyapti" degan
 * xulosa oʻzi kelib chiqadi.
 *
 * Aslida partiya kelguncha mavsum tugashi mumkin. Xitoydan tovar
 * kelishi haftalar oladi; isitgichni dekabrda buyurtma qilgan odam
 * uni fevralda oladi va bir yil saqlaydi.
 *
 * Signal: turkumning mavsumiylik jadvali. Ikkita holat belgilanadi:
 *
 *   1. Hozir mavsumdan TASHQARI (`lowCoefficient` dan past) —
 *      sotuv sekin, lekin bu yomon tovar degani emas: mavsumi
 *      kelganda koʻtariladi.
 *   2. Mavsum TUGASHIGA oz qoldi (`warnWeeksLeft` dan kam) — eng
 *      xavflisi, chunki ayni shu paytda grafik eng chiroyli koʻrinadi.
 *
 * `warn`: mavsumiylik oʻz-oʻzidan yomon emas, u REJALASHTIRISHNI
 * talab qiladi. Taklif miqdori kamaytiriladi yoki mavsumdan
 * tashqari alternativa beriladi (TUZOQLAR.md §2).
 *
 * BUGUN BU FILTR ISHLAMAYDI. `category_requirements.seasonality`
 * nol qator — jadvalni nazoratchi toʻldiradi
 * (`supabase/seed/README.md`). Filtr har turkumga "baholanmadi"
 * qaytaradi va bu SONI bilan koʻrsatiladi, jimgina yoʻqolmaydi.
 */
export function mavsumiy(k: MavsumKirishi): Flag | Baholanmadi | null {
  if (!k.seasonality || k.seasonality.length !== 12) {
    // Yarim toʻldirilgan jadval ham yaroqsiz: 8 ta sondan chiqqan
    // "mavsum tugashiga 3 hafta" xulosasi notoʻgʻri boʻladi va buni
    // hech narsa koʻrsatmaydi.
    return { kind: 'baholanmadi', missing: ['seasonality (12 ta koeffitsient)'] };
  }
  if (!Number.isInteger(k.oy) || k.oy < 1 || k.oy > 12) {
    return { kind: 'baholanmadi', missing: ['oy'] };
  }

  const joriy = k.seasonality[k.oy - 1] as number;
  if (!Number.isFinite(joriy) || joriy < 0) {
    return { kind: 'baholanmadi', missing: ['seasonality[oy]'] };
  }

  // Mavsum tugashiga necha hafta: joriy oydan boshlab, koeffitsient
  // chegaradan pastga tushadigan birinchi oygacha.
  const haftalar = mavsumTugashi(k.seasonality, k.oy);

  if (joriy < M.lowCoefficient) {
    return {
      kind: 'seasonal',
      severity: 'warn',
      reason:
        `Hozir bu turkumning mavsumi emas (koeffitsient ${joriy.toFixed(2)}, ` +
        `oʻrtacha 1.00). Sotuv sekin boʻladi — bu tovarning yomonligi emas, ` +
        'lekin pul uzoqroq bogʻlanib qoladi.',
      evidence: { oy: k.oy, koeffitsient: joriy, chegara: M.lowCoefficient },
    };
  }

  if (haftalar !== null && haftalar <= M.warnWeeksLeft) {
    return {
      kind: 'seasonal',
      severity: 'warn',
      reason:
        `Mavsum tugashiga ~${haftalar} hafta qoldi. Xitoydan partiya ` +
        'kelguncha talab tushishi mumkin — kichikroq partiya oling yoki ' +
        'mavsumdan tashqari alternativani koʻring.',
      evidence: { oy: k.oy, koeffitsient: joriy, haftalar },
    };
  }

  return null;
}

/**
 * Mavsum tugashiga necha hafta.
 *
 * Joriy oydan boshlab oldinga yuriladi va koeffitsient
 * `lowCoefficient` dan pastga tushadigan birinchi oy qidiriladi.
 * Yil aylanadi (dekabrdan keyin yanvar). Hech qachon tushmasa —
 * `null`: bu tovar mavsumiy emas.
 */
function mavsumTugashi(koef: number[], oy: number): number | null {
  for (let i = 1; i <= 12; i += 1) {
    const keyingi = koef[(oy - 1 + i) % 12] as number;
    if (keyingi < M.lowCoefficient) return Math.round(i * 4.345);
  }
  return null;
}
