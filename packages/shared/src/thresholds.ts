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
    /**
     * `stableDays` o'rniga ishlatiladigan yosh o'lchovi: brend Uzumda
     * necha kundan beri bor (mahsulot id soati orqali).
     *
     * Nega 60 emas, 180. `stableDays` kuchliroq dalil — u "sotuvchilar
     * soni o'zgarmadi" deydi. Brend yoshi zaifroq: u faqat "brend bor
     * edi" deydi. Zaifroq dalil uchun uzoqroq muddat talab qilinadi.
     * Yarim yil — yangi sotuvchi kirishga ulgurishi kerak bo'lgan vaqt.
     */
    minBrandAgeDays: 180,
    /** Kategoriya o'rtachasidan shuncha barobar yuqori sotuv — "katta sotuv". */
    highSalesMultiple: 3,
    /**
     * Butun brendni shu qadar yoki undan kam do'kon sotsa — brend yopiq.
     *
     * Bu `maxSellers` dan boshqa narsa: u bitta tovarni, bu butun
     * brendni o'lchaydi. O'lchandi (Uzum, 663 779 tovar): Lamart 170
     * tovar / 1 do'kon, VITACCI 138 / 1, Thule 130 / 1. Ochiq brendlarda
     * bu son o'nlab bo'ladi.
     */
    maxBrandSellers: 2,
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
    /**
     * Ulush turkumdagi sotuvchilarning kamida shuncha foizi ustida
     * hisoblangan bo'lishi shart.
     *
     * O'LCHANGAN, tanlab olinmagan (2026-08-19). 2-qatlam namunasi
     * bo'yicha hisoblangan ulush haqiqatdan qanchalik farq qiladi:
     *
     *   turkum        namuna/jami   namuna ulushi   haqiqiy ulush
     *   Qoplamalar     10/2052          76%              21%
     *   Cho'tkalar      8/720           79%              43%
     *   Sumkalar        9/2439          63%              12%
     *   Ziraklar        8/1452          57%              19%
     *
     * Yettita turkumning YETTITASIDA ham namuna konsentratsiyani
     * oshirib ko'rsatdi. Sabab: o'lchovga aynan yirik sotuvchilar
     * tushadi, kichiklari namunaga kirmaydi.
     *
     * 50% tanlandi: yarmidan ko'pi o'lchanganda tanlov qiyshiqligi
     * ulushni ag'darib yubora olmaydi. Amalda ulush perepisdan
     * hisoblanadi va qamrov 100% bo'ladi — bu chegara plombа vazifasini
     * bajaradi, kimdir yana namunani ulasa CI yiqiladi.
     */
    minSellerCoveragePercent: 50,
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
