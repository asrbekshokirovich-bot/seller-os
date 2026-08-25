import { THRESHOLDS } from '../thresholds.js';
import type { Flag } from '../traps.js';
import type { Baholanmadi } from './turlar.js';

const H = THRESHOLDS.hype;

/** 8-tuzoq kirishi. */
export interface HypeKirishi {
  /** Tovar Uzumda necha kundan beri bor. `id_yoshi` dan. */
  productAgeDays: number | null;
  /**
   * Sotuvning qancha ulushi soʻnggi `growthWindowDays` kunda boʻlgan.
   *
   * 0–1 oraligʻida. `null` — tarix yetarli emas.
   */
  yangiSotuvUlushi: number | null;
}

/**
 * 8-tuzoq: qisqa trend (hype).
 *
 * Nega jozibali: tovar hamma joyda koʻrinadi — TikTok, Instagram,
 * tanishlar. Sotuv grafigi tik yuqoriga ketadi.
 *
 * Aslida trend soʻnishi mumkin va u odatda tez soʻnadi. Xitoydan
 * partiya kelguncha talab yoʻqolsa, tovar omborda qoladi — bunday
 * tovarni keyin arzonga ham sotib boʻlmaydi, chunki bozor toʻlgan.
 *
 * Signal (TUZOQLAR.md §8): tovar YOSH va oʻsish faqat SOʻNGGI
 * kunlarda. Ikkalasi ham kerak:
 *
 *   yosh, lekin oʻsish barqaror  — bu shunchaki yangi tovar
 *   oʻsyapti, lekin eski         — bu barqaror talab
 *   yosh VA oʻsish yangi         — trend boʻlishi mumkin
 *
 * `warn` — "Yuqori xavf: trend soʻnishi mumkin". Faqat kichik sinov
 * partiyasi taklif qilinadi.
 *
 * UCHINCHI SIGNAL QOʻSHILMADI. Hujjat "oʻxshash tovarlar birdan
 * koʻpaydi" ni ham sanaydi. Uni oʻlchash uchun tovarlarni oʻxshashlik
 * boʻyicha guruhlash kerak, bizda esa bu yoʻq — nom boʻyicha
 * taqqoslash 2026-08-24 da markirovka turkumlarida 9 tadan 5 tasida
 * notoʻgʻri ishlagan edi. Taxminiy oʻxshashlik bu yerda ham
 * notoʻgʻri bayroq beradi.
 */
export function hype(k: HypeKirishi): Flag | Baholanmadi | null {
  const yetishmaydi: string[] = [];
  if (k.productAgeDays === null) yetishmaydi.push('productAgeDays');
  if (k.yangiSotuvUlushi === null) yetishmaydi.push('yangiSotuvUlushi');
  if (yetishmaydi.length > 0) return { kind: 'baholanmadi', missing: yetishmaydi };

  const kun = k.productAgeDays as number;
  const ulush = k.yangiSotuvUlushi as number;

  const yosh = kun <= H.youngWeeks * 7;
  // Oʻsish "faqat soʻnggi kunlarda" degani: sotuvning yarmidan
  // koʻpi shu oynada boʻlgan. Oyna 30 kunning yarmidan kichik,
  // yaʼni bu tasodifiy taqsimotdan aniq chetlashish.
  const yangiOsish = ulush > 0.5;

  if (!yosh || !yangiOsish) return null;

  return {
    kind: 'hype',
    severity: 'warn',
    reason:
      `Yuqori xavf: trend soʻnishi mumkin. Tovar atigi ${kun} kunlik va ` +
      `sotuvining ${Math.round(ulush * 100)}% i soʻnggi ` +
      `${H.growthWindowDays} kunda boʻlgan. Xitoydan partiya kelguncha ` +
      'talab yoʻqolishi mumkin — kichik sinov partiyasidan boshlang.',
    evidence: {
      yoshKun: kun,
      yangiSotuvUlushi: Math.round(ulush * 100) / 100,
      yoshChegarasiKun: H.youngWeeks * 7,
      oynaKun: H.growthWindowDays,
    },
  };
}
