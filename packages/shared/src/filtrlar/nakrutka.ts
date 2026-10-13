import { THRESHOLDS } from '../thresholds.js';
import type { Flag } from '../traps.js';
import type { Baholanmadi } from './turlar.js';

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
  /** Sharhlar soni — JAMI (tovar Uzumga chiqqandan beri). */
  reviews: number | null;
  /**
   * Shu 30 kunlik oynada qoʻshilgan sharhlar — sotuv bilan BIR OYNA.
   * Berilmasa faqat "sharh juda kam" tomoni tekshiriladi (pastga qarang).
   */
  sharhOsishi30k?: number | null;
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
 * SHARH VA SOTUV BIR OYNADAN BOʻLISHI SHART (2026-10-13).
 *
 * Ilgari JAMI sharh (yillar davomida yigʻilgan) 30 KUNLIK sotuv bilan
 * solishtirilardi. Yillab sotilayotgan har qanday tovarda jami sharh
 * 30 kunlik sotuvdan kutilganidan doim koʻp chiqadi — yaʼni "sharh juda
 * koʻp, reytingga ishonmang" belgisi eng ishonchli tovarlarga tushardi:
 * katalogdagi eng koʻp sotilgan sumka (30 kunda 53 dona, jami 86 sharh),
 * Bref hojatxona bloki (128 dona, jami 1 233 sharh). Oʻlchandi: 100+
 * dona sotilgan 60 tovarning 26 tasi eski qoidada "koʻp" olardi, shu
 * 30 kunda qoʻshilgan sharh bilan solishtirilganda esa — 2 tasi.
 *
 * Endi:
 *   - `sharhOsishi30k` berilsa — ikkala tomon ham shu oyna bilan;
 *   - faqat jami berilsa — faqat "juda KAM" tomoni. Jami ≥ oynadagi:
 *     jami sharh ham 30 kunlik sotuvdan kutilganidan juda kam boʻlsa,
 *     bu haqiqatan gʻalati. "Juda koʻp" tomoni — baholanmaydi.
 *
 * "Juda kam" koʻpincha BIZNING oʻlchovimizni ushlaydi: sotuvchi qoldiqni
 * olib qoʻysa (masalan, 800 000 → 0), qoldiq farqi uni "sotuv" deb
 * sanaydi, sharh esa yoʻq. Matn shuni aytadi: raqamga tayanib partiya
 * olmang.
 *
 * KICHIK SONLAR BAHOLANMAYDI (`minExpectedReviews`): 2 ta sotuvda
 * "odatda ~0 sharh" boʻladi va 1 ta sharh "6 barobar koʻp" chiqadi.
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
  const oyna = typeof k.sharhOsishi30k === 'number' && k.sharhOsishi30k >= 0 ? k.sharhOsishi30k : null;

  const yetishmaydi: string[] = [];
  if (k.soldUnits30d === null) yetishmaydi.push('soldUnits30d');
  if (k.reviews === null && oyna === null) yetishmaydi.push('reviews');
  if (yetishmaydi.length > 0) return { kind: 'baholanmadi', missing: yetishmaydi };

  if (k.sotuvManbasi !== undefined && k.sotuvManbasi !== 'olchandi') {
    return { kind: 'baholanmadi', missing: ['oʻlchangan sotuv (taxmin yaramaydi)'] };
  }

  const sotuv = k.soldUnits30d as number;

  // Sotuv nol boʻlsa nisbat hisoblanmaydi — boʻlinuvchi yoʻq. Bu
  // "shubhali emas" degani, "oʻlchab boʻlmadi" degani.
  if (sotuv <= 0) return { kind: 'baholanmadi', missing: ['soldUnits30d > 0'] };

  const kutilgan = sotuv * F.expectedReviewRate;
  if (kutilgan < F.minExpectedReviews) {
    return {
      kind: 'baholanmadi',
      missing: [`kamida ${Math.ceil(F.minExpectedReviews / F.expectedReviewRate)} dona oʻlchangan sotuv`],
    };
  }

  const sharh = oyna ?? (k.reviews as number);
  const nisbat = sharh / kutilgan;

  if (nisbat >= 1 / F.reviewRateTolerance && nisbat <= F.reviewRateTolerance) {
    return null;
  }

  const kam = nisbat < 1;
  if (!kam && oyna === null) {
    return { kind: 'baholanmadi', missing: ['30 kunlik sharh oʻsishi (jami sharh 30 kunlik sotuv bilan solishtirilmaydi)'] };
  }

  const son = (x: number) => x.toLocaleString('uz-UZ');
  const sotuvGapi = `oxirgi 30 kunda ~${son(sotuv)} dona sotildi`;
  const odatda = `odatda ~${son(Math.round(kutilgan))} ta boʻladi`;
  return {
    kind: 'fake_sales',
    severity: 'warn',
    reason: kam
      ? `Sotuvga nisbatan sharh juda kam: ${sotuvGapi}, lekin ` +
        (oyna !== null
          ? `shu davrda ${son(sharh)} ta yangi sharh yozildi (${odatda}). `
          : `tovarda jami ${son(sharh)} ta sharh bor (faqat shu 30 kunda ${odatda}). `) +
        'Sotuv raqami shishirilgan boʻlishi mumkin — masalan, sotuvchi qoldiqni olib qoʻygan. ' +
        'Bu raqamga tayanib partiya olmang.'
      : `Sotuvga nisbatan sharh juda koʻp: ${sotuvGapi}, shu davrda esa ${son(sharh)} ta yangi ` +
        `sharh yozildi (${odatda}). Sharhlar sotib olingan boʻlishi mumkin — reytingga koʻr-koʻrona ishonmang.`,
    evidence: {
      sotuv30k: sotuv,
      sharh,
      // `true` — `sharh` shu 30 kunda qoʻshilgani; `false` — jami sharh.
      sharh30kunlik: oyna !== null,
      kutilganSharh: Math.round(kutilgan),
      nisbat: Math.round(nisbat * 100) / 100,
      ...(k.rating !== null ? { reyting: k.rating } : {}),
    },
  };
}
