import { THRESHOLDS } from '../thresholds.ts';
import type { Flag } from '../traps.ts';
import type { Baholanmadi } from './turlar.ts';

const F = THRESHOLDS.fakeSales;

/** 4-tuzoq kirishi. */
export interface NakrutkaKirishi {
  /** 30 kunlik sotuv (dona). */
  soldUnits30d: number | null;
  /**
   * Sotuv raqami qayerdan.
   *
   * `'taxmin'` boʻlsa filtr BAHOLAMAYDI — pastdagi izohga qarang.
   */
  sotuvManbasi?: 'olchandi' | 'taxmin' | null;
  /** Sharhlar soni — jami. */
  reviews: number | null;
  /** Reyting, 0–5. */
  rating: number | null;
}

/**
 * 4-tuzoq: sunʼiy sotuv (nakrutka).
 *
 * Nega jozibali: grafikda keskin oʻsish — "trend!" degan xulosa oʻzi
 * kelib chiqadi.
 *
 * Signal (TUZOQLAR.md §4): sharh soni sotuvga MOS EMAS.
 *
 * Uzumda sharh qoldiruvchilar xaridorlarning ~8% i. Bu nisbatdan
 * keskin chetlashish ikki tomonga ham shubhali:
 *
 *   sharh JUDA KAM  — sotuv raqami shishirilgan boʻlishi mumkin
 *   sharh JUDA KOʻP — sharh sotib olingan boʻlishi mumkin
 *
 * `warn`, `block` emas: nisbat oʻz-oʻzidan dalil emas. Yangi
 * tovarda sharh hali yetib kelmagan boʻlishi mumkin, arzon tovarda
 * odam sharh yozmasligi mumkin. Shuning uchun tovar roʻyxatdan
 * chiqarilmaydi — belgi qoʻyiladi va sabab koʻrsatiladi.
 *
 * FAQAT OʻLCHANGAN SOTUVGA QOʻLLANADI.
 *
 * Nisbat sotuv soniga boʻlinadi, yaʼni sotuv raqami notoʻgʻri boʻlsa
 * bayroq ham notoʻgʻri boʻladi. Perepisdagi `buyers_per_week` ning
 * maʼnosi tasdiqlanmagan (`qadamlar.ts`, `MIQDOR_UCHUN_MANBA`), va
 * bu nazariy eʼtiroz emas — oʻlchandi:
 *
 *   6 012 tovar taxminiy sotuv bilan baholandi
 *   → 3 806 tasi bayroq oldi = **63.3%**
 *
 * Har uch tovarning ikkitasida "shubhali statistika" degan belgi —
 * bu foydali signal emas, shovqin. Odam bunday belgini bir haftada
 * eʼtiborsiz qoldirishni oʻrganadi va oʻshanda HAQIQIY bayroq ham
 * oʻtib ketadi.
 *
 * Shuning uchun taxminiy sotuvda filtr "baholanmadi" qaytaradi.
 * Qoldiq farqi oʻlchanib boshlagach (7 kun) u oʻzi ishlay boshlaydi.
 *
 * ANIQ CHEGARASI YOʻQ narsalar ataylab tekshirilmaydi. TUZOQLAR.md
 * yana ikki signal sanaydi — "1–2 kunlik anomal sakrash" va
 * "reyting-sharh nisbati gʻalati". Birinchisi kunlik tarix talab
 * qiladi (bugun 3 kun bor, kerak boʻlgani `spikeMaxDays` bilan
 * solishtirish uchun yetarli emas), ikkinchisining chegarasi
 * hujjatda yoʻq. Ularni "taxminan" qilib qoʻyish — filtrni
 * ishonchsiz qilish; qoʻshilganda oʻlchov bilan qoʻshiladi.
 */
export function nakrutka(k: NakrutkaKirishi): Flag | Baholanmadi | null {
  const yetishmaydi: string[] = [];
  if (k.soldUnits30d === null) yetishmaydi.push('soldUnits30d');
  if (k.reviews === null) yetishmaydi.push('reviews');
  if (yetishmaydi.length > 0) return { kind: 'baholanmadi', missing: yetishmaydi };

  if (k.sotuvManbasi !== undefined && k.sotuvManbasi !== 'olchandi') {
    return { kind: 'baholanmadi', missing: ['oʻlchangan sotuv (taxmin yaramaydi)'] };
  }

  const sotuv = k.soldUnits30d as number;
  const sharh = k.reviews as number;

  // Sotuv nol boʻlsa nisbat hisoblanmaydi — boʻlinuvchi yoʻq. Bu
  // "shubhali emas" degani, "oʻlchab boʻlmadi" degani.
  if (sotuv <= 0) return { kind: 'baholanmadi', missing: ['soldUnits30d > 0'] };

  const kutilgan = sotuv * F.expectedReviewRate;
  const nisbat = sharh / kutilgan;

  if (nisbat >= 1 / F.reviewRateTolerance && nisbat <= F.reviewRateTolerance) {
    return null;
  }

  const kam = nisbat < 1;
  return {
    kind: 'fake_sales',
    severity: 'warn',
    reason: kam
      ? `Sotuv soniga nisbatan sharh juda kam: ${sotuv.toLocaleString('uz-UZ')} ` +
        `sotuvga ${sharh.toLocaleString('uz-UZ')} sharh. Odatda ~` +
        `${Math.round(kutilgan).toLocaleString('uz-UZ')} boʻladi. Sotuv raqami ` +
        'shishirilgan boʻlishi mumkin — bu raqamga tayanib partiya olmang.'
      : `Sotuv soniga nisbatan sharh juda koʻp: ${sotuv.toLocaleString('uz-UZ')} ` +
        `sotuvga ${sharh.toLocaleString('uz-UZ')} sharh. Odatda ~` +
        `${Math.round(kutilgan).toLocaleString('uz-UZ')} boʻladi. Sharhlar sotib ` +
        'olingan boʻlishi mumkin — reytingga ishonmang.',
    evidence: {
      sotuv30k: sotuv,
      sharh,
      kutilganSharh: Math.round(kutilgan),
      nisbat: Math.round(nisbat * 100) / 100,
      ...(k.rating !== null ? { reyting: k.rating } : {}),
    },
  };
}
