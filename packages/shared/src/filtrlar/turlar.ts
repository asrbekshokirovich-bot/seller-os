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
   * Brendning BARCHA mahsulotlaridagi sharhlar yigʻindisi.
   *
   * Sharh — vaqtning bepul oʻlchovi. U faqat sotuvdan keyin paydo
   * boʻladi va yoʻqolmaydi, yaʼni orqaga qarab toʻplangan tarix.
   * Uzum uni birinchi kuniyoq beradi — 60 kun kutish shart emas.
   *
   * Nega kerak: "1 sotuvchi + katta sotuv" yangi brendda ham boʻladi,
   * u esa aynan yaxshi imkoniyat. Oʻlchandi (2026-08-19): VITACCI 224
   * mahsulot / 3 sharh, Rieker 85 / 11 — bular yangi brendlar, tuzoq
   * emas. Willmoda 1 729 sharh, ARTERY 1 333, Lamart 657 — bular esa
   * uzoq vaqtdan beri yolgʻiz.
   */
  brandReviews: number | null;
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
  /** Turkumda nechta sotuvchi oʻlchangan. */
  measuredSellers: number | null;
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
