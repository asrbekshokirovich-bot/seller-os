/**
 * Chiqish — shu brauzerdagi sessiya cookie si oʻchiriladi (`POST /api/chiqish`).
 *
 * Nazoratchi (2026-11-03): «profildan chiqish tugmasi bosilsa chiqmayapti». Ilgari «Chiqish»
 * faqat bosh sahifaga olib borardi: cookie qolardi va sayt odamni tanishda davom etardi —
 * «Boshidan boshlash» ham uni ismi bilan kutib olardi, boshqa odam boʻlib boshlashning yoʻli
 * yoʻq edi. Cookie HttpOnly — brauzer JS i uni oʻchira olmaydi, shuning uchun server javobi
 * oʻchiradi.
 *
 * Bazadagi yozuvlar QOLADI (toʻliq oʻchirish tugmasi hali yoʻq — maxfiylik sahifasi); bu
 * brauzer ularga boshqa bogʻlanmaydi. Kirish (SMS, Telegram) hali yoʻq — qaytib boʻlmaydi,
 * shuning uchun sahifa avval soʻraydi.
 *
 * FAQAT OʻZ SAHIFASIDAN. Begona sayt odamni bilmasdan chiqarib yuborsa, uning suhbati
 * butunlay yoʻqoladi: boshqa saytdan kelgan soʻrov (`Sec-Fetch-Site`, `Origin`) rad etiladi.
 *
 * Kengaytma rejimida chiqish yoʻq — u yerda sessiyani kengaytmaning oʻzi saqlaydi.
 */

import { COOKIE } from './sessiya';

/**
 * Soʻrov shu saytning oʻz sahifasidanmi. Brauzer ikkala sarlavhani ham oʻzi qoʻyadi, sahifa
 * ularni soxtalashtira olmaydi. Ikkalasi ham yoʻq (curl, juda eski brauzer) — oʻtkaziladi:
 * begona cookie siz faqat oʻzini «chiqaradi».
 */
export function ozSaytdanmi(request: Request): boolean {
  const sayt = request.headers.get('sec-fetch-site');
  if (sayt !== null && sayt !== 'same-origin') return false;
  const origin = request.headers.get('origin');
  if (origin === null) return true;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false; // `Origin: null` — sandbox ramka yoki fayl
  }
  const h = request.headers;
  return [new URL(request.url).host, h.get('host'), h.get('x-forwarded-host')].includes(host);
}

/** Cookie ni oʻchiruvchi sarlavha — oʻrnatilgandagi nom, yoʻl va belgilar bilan (`sessiya.ts`). */
export function chiqishCookiesi(himoyali: boolean): string {
  return `${COOKIE}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${himoyali ? '; Secure' : ''}`;
}

/** Oʻz sahifasidan — 204 va cookie oʻchadi; begona — 403, cookie ga tegilmaydi. */
export function chiqishJavobi(request: Request, himoyali: boolean): Response {
  if (!ozSaytdanmi(request)) return new Response(null, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  return new Response(null, {
    status: 204,
    headers: { 'Set-Cookie': chiqishCookiesi(himoyali), 'Cache-Control': 'no-store' },
  });
}
