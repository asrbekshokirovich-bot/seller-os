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
  /** Sotuvchilar soni shuncha kundan beri oʻzgarmagan. */
  sellersStableDays: number | null;
  /** Sotuvchi rasmiy brend doʻkonimi. */
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
