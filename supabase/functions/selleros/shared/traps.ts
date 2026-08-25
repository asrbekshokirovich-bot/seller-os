/**
 * 8 hiyla-filtr turi va natija shakli.
 *
 * Ro'yxat TUZOQLAR.md va bazadagi `selleros.trap_kind` enum bilan bir xil
 * bo'lishi SHART — testda tekshiriladi. Uchtasi bir-biridan ajralib
 * ketsa, filtr jimgina ishlamay qoladi.
 */

export const TRAP_KINDS = [
  'closed_brand',
  'seasonal',
  'dumping',
  'fake_sales',
  'certification',
  'monopoly',
  'heavy',
  'hype',
] as const;

export type TrapKind = (typeof TRAP_KINDS)[number];

/**
 * `block` — tovar tavsiyadan butunlay chiqariladi.
 * `warn`  — chiqadi, lekin ogohlantirish va past ball bilan.
 * `note`  — faqat izoh.
 */
export type Severity = 'block' | 'warn' | 'note';

export interface Flag {
  kind: TrapKind;
  severity: Severity;
  /** Foydalanuvchiga ko'rsatiladigan matn (o'zbekcha). */
  reason: string;
  /**
   * Qaysi raqamdan chiqqani. MAJBURIY.
   *
   * Sababsiz bayroq ishonchni yo'qotadi: foydalanuvchi "nega?" desa,
   * unga raqam ko'rsatilishi kerak, "tizim shunday dedi" emas.
   *
   * `boolean` ham dalil bo'la oladi: `oversized` kabi maydonlarda
   * o'lchov raqam emas, platformaning O'Z belgisi. Uni matnga
   * aylantirib yozish ("ha"/"yo'q") ma'lumotni yo'qotardi —
   * o'qigan kod `null` bilan `false` ni farqlay olmay qolardi.
   */
  evidence: Record<string, number | string | boolean>;
}

/** Tuzoq nomlarining o'zbekcha ko'rinishi — UI va izohlar uchun. */
export const TRAP_LABEL: Record<TrapKind, string> = {
  closed_brand: 'Yopiq brend',
  seasonal: 'Mavsumiy tovar',
  dumping: 'Demping',
  fake_sales: "Sun'iy sotuv",
  certification: 'Sertifikat/markirovka',
  monopoly: 'Monopol kategoriya',
  heavy: "Og'ir tovar",
  hype: 'Qisqa trend',
};
