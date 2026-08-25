/**
 * Filtrlarga beriladigan maʻlumot.
 *
 * Har maydon `null` boʻlishi mumkin — "oʻlchanmagan" degani. Filtr
 * yetishmagan maydonni nol deb OLMAYDI: nol "hech kim sotmaydi" degan
 * javob, `null` esa "bilmayman". Aralashtirsak, maʻlumoti yoʻq tovar
 * yopiq brend boʻlib chiqib qolardi (QOIDALAR.md, 4-qoida).
 */
export interface TovarHolati {
  productId: number;
  title: string;
  brand: string | null;
  /** Shu tovarni nechta doʻkon sotyapti. */
  sellersCount: number | null;
  /**
   * Sotuvchilar soni shuncha kundan beri oʻzgarmagan.
   *
   * Kuchli dalil, lekin qimmat: 60 kunlik tarix kerak. Yangi bazada u
   * yoʻq va uzoq kutib boʻlmaydi, shuning uchun `brandReviews` bilan
   * almashtirsa boʻladi — pastdagi izohga qarang.
   */
  sellersStableDays: number | null;
  /**
   * Brend Uzumda necha kundan beri bor.
   *
   * Uzum mahsulot id larini KETMA-KET beradi, demak id — soat. Brendning
   * eng kichik id li mahsuloti uning paydo boʻlgan vaqtini koʻrsatadi.
   * Id → sana kalibrovkasi sharh sanalaridan chiqarilgan (526 mahsulot,
   * korrelyatsiya 0.81) — `supabase/seed/tuzoq_nomzodlari.sql`.
   *
   * Nega sharh EMAS. Avval bu oʻrinda "brendning sharhlar yigʻindisi"
   * turgan edi. U notoʻgʻri: sharh yoshni emas, yosh×sotuvni oʻlchaydi.
   * Mustaqil soat (id) bilan solishtirilganda korrelyatsiya atigi −0.29,
   * 195 brenddan 16 tasi ochiq ziddiyatda. Aniq misol: Rieker — 1102
   * kunlik brend, atigi 11 sharh. Sharh qoidasi uni "yangi" degan edi.
   */
  brandAgeDays: number | null;
  /**
   * Shu BRENDning tovarlarini umuman nechta doʻkon sotadi.
   *
   * `sellersCount` dan farqi: u bitta tovarni, bu esa butun brendni
   * oʻlchaydi. Yopiq brendni aynan shu koʻrsatadi — Lamart 170 tovar,
   * hammasi bitta doʻkonda.
   */
  brandSellersCount: number | null;
  /**
   * Sotuvchi rasmiy brend doʻkonimi.
   *
   * OGOHLANTIRISH: Uzum bu maydonni toʻldirmaydi. 2026-08-19 da jonli
   * tekshirilgan — Artel Brand Shop, ARTEL_OFFICIAL, Яшкино (207 847
   * sharh), hammasi `false` qaytardi. Maydon API'da bor, lekin boʻsh.
   *
   * Shuning uchun hech bir filtr bunga SUYANMAYDI. Saqlab turibmiz:
   * Uzum toʻldira boshlasa, tayyor boʻlamiz. Toʻlmaguncha `null`.
   */
  shopOfficial: boolean | null;
  /** Oxirgi 30 kunlik taxminiy sotuv (dona). */
  soldUnits30d: number | null;
  /** Shu turkumdagi oʻrtacha 30 kunlik sotuv. */
  categoryMedianUnits30d: number | null;
}

export interface TurkumHolati {
  categoryId: number;
  name: string;
  /** Top-3 sotuvchining ulushi, foizda. */
  top3SharePercent: number | null;
  /** Ulush shuncha sotuvchi ustida hisoblandi. */
  measuredSellers: number | null;
  /**
   * Turkumda AMALDA nechta sotuvchi bor (perepis boʻyicha).
   *
   * `measuredSellers` dan farqi hal qiluvchi. Oʻlchandi (2026-08-19):
   * "Qoplamalar" turkumida 10 ta sotuvchi oʻlchangan edi va ular
   * boʻyicha top-3 ulushi 76% chiqdi. Aslida turkumda 2 052 ta
   * sotuvchi bor va haqiqiy ulush 21%. Namuna konsentratsiyani
   * 2–4 barobar oshirib koʻrsatadi — chunki oʻlchovga aynan yirik
   * sotuvchilar tushadi.
   *
   * Shu sababli filtr endi qamrovni ham talab qiladi: namuna
   * turkumning kichik qismi boʻlsa, javob berilmaydi.
   */
  totalSellers: number | null;
}

/**
 * Filtr baholay olmagan holat.
 *
 * Buni bayroqdan ajratish shart: "tuzoq emas" va "tekshira olmadim"
 * boshqa javob. Ikkinchisida tovar chiqariladi, lekin ishonch pasayadi
 * va foydalanuvchiga nima yetishmagani aytiladi.
 */
export interface Baholanmadi {
  kind: 'baholanmadi';
  /** Qaysi maydonlar yetishmadi. */
  missing: string[];
}

/**
 * `TovarHolati` + qolgan filtrlar talab qiladigan maydonlar.
 *
 * Alohida tur, chunki `TovarHolati` ni kengaytirish `so_tovar_holati`
 * shartnomasini buzardi. Yangi maydonlar IXTIYORIY: berilmasa filtr
 * "baholanmadi" qaytaradi va bu SONI bilan koʻrsatiladi.
 *
 * Yaʼni maʼlumot yetib kelmagani jimgina "tuzoq yoʻq" ga
 * aylanmaydi — bu farq QOIDALAR.md 4-qoidasining oʻzagi.
 */
export interface TovarToliq extends TovarHolati {
  /** 4-tuzoq. Sharhlar soni. */
  sharhSoni?: number | null;
  /** 4-tuzoq. Sotuv raqami qayerdan — taxminda filtr baholamaydi. */
  sotuvManbasi?: 'olchandi' | 'taxmin' | null;
  /** 4-tuzoq. Reyting, 0–5. */
  reyting?: number | null;
  /** 7-tuzoq. Ogʻirlik, gramm. */
  weightG?: number | null;
  /** 7-tuzoq. Hajm, ml. Uzum hozircha bermaydi. */
  volumeMl?: number | null;
  /** 7-tuzoq. Uzumning oʻz «katta hajmli» belgisi. */
  oversized?: boolean | null;
  /** 2-tuzoq. Turkumning 12 oylik koeffitsienti. */
  seasonality?: number[] | null;
  /** 8-tuzoq. Tovar necha kundan beri Uzumda. */
  productAgeDays?: number | null;
  /** 8-tuzoq. Sotuvning qancha ulushi soʻnggi oynada (0–1). */
  yangiSotuvUlushi?: number | null;
}
