/**
 * Hiyla-filtr chegaralari — BITTA joyda.
 *
 * TUZOQLAR.md shu faylga ishora qiladi. Chegaralar kodga tarqalib
 * ketmasligi kerak: nazoratchi bittasini o'zgartirsa, butun tizim bir xil
 * o'zgarsin.
 *
 * O'zgartirish tartibi: alohida PR, sababi yozilgan, testlar yangilangan.
 * Chegara "shunchaki tuyuldi" deb o'zgarmaydi — u pilot ma'lumotidan
 * chiqadi.
 */

export const THRESHOLDS = {
  /** 1-tuzoq: yopiq brend. */
  closedBrand: {
    /** Shu qadar yoki undan kam sotuvchi — birinchi signal. */
    maxSellers: 2,
    /** Sotuvchilar soni shu qadar kun o'zgarmagan bo'lsa — "hech kim kirmagan". */
    stableDays: 60,
    /** Kategoriya o'rtachasidan shuncha barobar yuqori sotuv — "katta sotuv". */
    highSalesMultiple: 3,
  },

  /** 2-tuzoq: mavsumiy. */
  seasonal: {
    /** Mavsum koeffitsienti shundan past bo'lsa — mavsumdan tashqari. */
    lowCoefficient: 0.7,
    /** Mavsum tugashiga shuncha haftadan kam qolsa — ogohlantirish. */
    warnWeeksLeft: 8,
  },

  /** 3-tuzoq: demping. */
  dumping: {
    /** Shu foizdan past marja — bu narxda foyda yo'q. */
    minMarginPercent: 5,
  },

  /** 4-tuzoq: sun'iy sotuv. */
  fakeSales: {
    /** Kunlik sotuv o'rtachadan shuncha barobar sakrasa — anomaliya. */
    spikeMultiple: 8,
    /** Sakrash shuncha kundan qisqa bo'lsa — shubhali. */
    spikeMaxDays: 2,
    /**
     * Sharh/sotuv nisbati. O'lchandi (Uzum): sharh qoldiruvchilar
     * xaridorlarning ~8% i. Shundan keskin chetlashish — g'alati.
     */
    expectedReviewRate: 0.08,
    reviewRateTolerance: 4,
  },

  /** 6-tuzoq: monopoliya. */
  monopoly: {
    /** Top-3 sotuvchi ulushi shundan yuqori bo'lsa — monopol kategoriya. */
    top3SharePercent: 70,
  },

  /** 7-tuzoq: og'ir tovar. */
  heavy: {
    /** Shundan og'ir bo'lsa kargo tannarxni yeydi. */
    heavyGrams: 5000,
    /** Hajm og'irligi (m³ → kg) shundan katta bo'lsa ham. */
    bulkyVolumeMl: 30000,
  },

  /** 8-tuzoq: hype. */
  hype: {
    /** Tovar shundan yosh bo'lsa — trend bo'lishi mumkin. */
    youngWeeks: 6,
    /** O'sish faqat so'nggi shuncha kunda bo'lsa. */
    growthWindowDays: 14,
  },

  /** Ma'lumot yetarlimi. */
  data: {
    /**
     * Talab ballini hisoblash uchun eng kam kunlik nuqta.
     *
     * Bundan kam bo'lsa qism `null` bo'ladi va tovar "ma'lumot
     * yig'ilmoqda" deb belgilanadi. Nol qo'yilmaydi: nol "talab yo'q"
     * degan javob bo'lardi (QOIDALAR.md, 4-qoida).
     */
    minDaysForDemand: 7,
    /** Shuncha qismdan ko'pi `null` bo'lsa — tovar baholanmaydi. */
    maxNullParts: 2,
  },
} as const;

export type Thresholds = typeof THRESHOLDS;
