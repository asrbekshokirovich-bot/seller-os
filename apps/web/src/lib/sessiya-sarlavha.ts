/**
 * Kengaytma rejimi (0.2.0): Chrome yon panelidagi ramkada sayt cookie'si
 * ishlamaydi (uchinchi tomon konteksti), shuning uchun sessiya tokeni
 * `x-sessiya` sarlavhasida keladi.
 *
 * Bu modul `next/headers` ni import qilmaydi — sof funksiya, testda
 * bemalol chaqiriladi. Token faqat shakli toʻgʻri boʻlsa qabul qilinadi
 * va cookie'dagi kabi Edge Function sarlavhasiga koʻchadi, boshqa hech
 * narsaga ishlatilmaydi.
 */

const TOKEN_SHAKLI = /^[A-Za-z0-9_.-]{16,512}$/;

/** Soʻrov sarlavhasidagi sessiya tokeni. Yoʻq yoki shakli buzuq — `null`. */
export function sorovTokeni(request: Request | undefined | null): string | null {
  const t = request?.headers?.get('x-sessiya')?.trim() ?? '';
  return TOKEN_SHAKLI.test(t) ? t : null;
}

/** Manzil hash'idagi token (`#sessiya=…&kengaytma=1`). Hash serverga ketmaydi. */
export function hashTokeni(hash: string): string | null {
  const m = hash.match(/(?:^#|&)sessiya=([^&]+)(?:&|$)/);
  if (!m) return null;
  let t: string;
  try { t = decodeURIComponent(m[1]!); } catch { return null; }
  return TOKEN_SHAKLI.test(t) ? t : null;
}
