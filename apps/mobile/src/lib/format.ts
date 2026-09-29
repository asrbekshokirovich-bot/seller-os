/**
 * Raqam koʻrinishi. React Native ga tegmaydi — testda bemalol chaqiriladi.
 *
 * Qoida bitta: qiymat yoʻq (`null`/`undefined`) — CHIZIQCHA, nol emas.
 * Nol "sotuv boʻlmagan" degan javob; chiziqcha "javob yoʻq"
 * (QOIDALAR.md, 4-boʻlim).
 */

export const YOQ = '—';

/** `1234567` → `1 234 567`. Web (`lib/bazamiz.ts` `son`) bilan bir xil. */
export function son(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Yoʻq boʻlsa chiziqcha. */
export function raqam(n: number | null | undefined): string {
  return n === null || n === undefined ? YOQ : son(n);
}

/** Soʻm: `12 500 soʻm`, yoʻq boʻlsa chiziqcha (birliksiz). */
export function somda(n: number | null | undefined, birlik: string): string {
  return n === null || n === undefined ? YOQ : `${son(n)} ${birlik}`;
}

/**
 * Qisqa million: `26 400 000` → `26,4`. Dizayndagi katta raqamlar shu
 * koʻrinishda ("26,4 mln"). Bir xona kasr — aniqlik taassurotini
 * oshirmaslik uchun.
 */
export function mln(n: number | null | undefined): string {
  if (n === null || n === undefined) return YOQ;
  const q = Math.round(n / 100_000) / 10;
  return String(q).replace('.', ',');
}
