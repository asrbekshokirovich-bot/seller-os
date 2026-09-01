/**
 * Xitoydan topish — B4 (Usta 4-qadam).
 *
 * Rasm-qidiruv: foydalanuvchi Uzumdagi tovar rasmini yuboradi,
 * tizim 1688.com dan oʻxshash tovarlarni topadi.
 *
 * PROVAYDER HALI ULANMAGAN. TMAPI va OneBound sinovda — kalit
 * kelgach faqat API chaqiruvi almashadi, turlar va mantiq bir xil.
 */

/** 1688 dan topilgan tovar. */
export interface XitoyTovar {
  /** Provayder bergan ID. */
  sourceId: string;
  title: string;
  /** Yuan narx. */
  narxYuan: number;
  /** Rasm URL (provayder beradi). */
  rasmUrl: string;
  /** Minimal buyurtma miqdori. */
  moq: number;
  /** Sotuvchi reytingi (0-5). */
  reyting: number | null;
  /** Provayder nomi. */
  manba: '1688' | 'alibaba';
}

/** Qidiruv soʻrovi. */
export interface XitoyQidiruvSorov {
  /** Uzumdagi tovar IDsi — rasmini olish uchun. */
  productId: number;
  /** Yoki toʻgʻridan-toʻgʻri rasm URL. */
  rasmUrl?: string;
  /** Natijalar soni (standart: 10). */
  limit?: number;
}

/** Qidiruv javobi. */
export interface XitoyQidiruvJavob {
  natijalar: XitoyTovar[];
  /** Provayder nomi. */
  manba: string;
  /** Keshdan olinganmi. */
  keshdan: boolean;
  /** Qidiruv vaqti (ms). */
  vaqtMs: number;
}

/** Kunlik limit chegaralari. */
export const XITOY_LIMIT = {
  /** Kuniga shuncha qidiruv (bepul reja). */
  bepulKunlik: 3,
  /** Kuniga shuncha qidiruv (pro reja). */
  proKunlik: 30,
  /** Kuniga shuncha qidiruv (biznes reja). */
  biznesKunlik: 100,
  /** Kesh muddati (soat). Bir xil rasm uchun qayta soʻrov yuborilmaydi. */
  keshSoat: 72,
} as const;

/**
 * MOQ byudjetga sigʻishini tekshiradi.
 *
 * MOQ (minimal buyurtma) va tovar narxi byudjetdan oshsa —
 * odam sotib ola olmaydi. Bu boʻlsa miqdor rejasi taklif qilinadi:
 * "Hozir 50 ta, keyingi oyda yana 50 ta".
 */
export interface MoqNatija {
  /** Bir martalik xarid summasi (yuan). */
  jamYuan: number;
  /** Soʻmda (kursga koʻra). */
  jamSom: number;
  /** Byudjetga sigʻadimi. */
  sigadi: boolean;
  /** Sigʻmasa — necha qismga boʻlish kerak. */
  qismSoni: number | null;
  /** Har qism miqdori. */
  qismMiqdori: number | null;
}

export function moqHisobi(
  moq: number,
  narxYuan: number,
  kursSomPerYuan: number,
  byudjetSom: number,
): MoqNatija {
  const jamYuan = moq * narxYuan;
  const jamSom = Math.round(jamYuan * kursSomPerYuan);
  const sigadi = jamSom <= byudjetSom;

  if (sigadi) {
    return { jamYuan, jamSom, sigadi, qismSoni: null, qismMiqdori: null };
  }

  // Bir qismga qancha sigʻadi
  const birQismMiqdori = Math.max(1, Math.floor(byudjetSom / (narxYuan * kursSomPerYuan)));
  const qismSoni = Math.ceil(moq / birQismMiqdori);

  return {
    jamYuan,
    jamSom,
    sigadi,
    qismSoni,
    qismMiqdori: birQismMiqdori,
  };
}

/** Kunlik limitga yetganmi tekshiradi. */
export function limitTekshir(
  ishlatilgan: number,
  reja: 'bepul' | 'pro' | 'biznes',
): { ruxsat: boolean; qolgan: number; limit: number } {
  const limit = reja === 'biznes'
    ? XITOY_LIMIT.biznesKunlik
    : reja === 'pro'
      ? XITOY_LIMIT.proKunlik
      : XITOY_LIMIT.bepulKunlik;
  return {
    ruxsat: ishlatilgan < limit,
    qolgan: Math.max(0, limit - ishlatilgan),
    limit,
  };
}
