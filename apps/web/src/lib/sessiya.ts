/**
 * Sessiya cookie si.
 *
 * Token HttpOnly cookie da yashaydi: brauzer JS i uni OʻQIY OLMAYDI.
 * Bu XSS ga qarshi eng arzon va eng samarali himoya — sahifaga
 * begona skript tushsa ham tokenni oʻgʻirlay olmaydi.
 *
 * `SameSite=Lax` — boshqa saytdan yuborilgan soʻrovga cookie
 * qoʻshilmaydi (CSRF).
 *
 * Token brauzerga faqat shu cookie orqali beriladi va u yerdan
 * chiqmaydi: sahifadagi JS `/api/...` ga soʻrov yuboradi, cookie
 * avtomatik ketadi, Next server uni Edge Function sarlavhasiga
 * koʻchiradi.
 */

import { cookies } from 'next/headers';

export const COOKIE = 'so_sessiya';
const YIL = 60 * 60 * 24 * 365;

const API = () => process.env.SELLEROS_API_URL ?? '';
const KEY = () => process.env.SELLEROS_API_KEY ?? '';

export function sozlanganmi(): boolean {
  return Boolean(API() && KEY());
}

/** Cookie dagi token. Yoʻq boʻlsa `null`. */
export async function token(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

/**
 * Token boʻlmasa yangi sessiya ochadi.
 *
 * `null` — API sozlanmagan yoki javob bermadi. Chaqiruvchi buni
 * "sessiya yoʻq" deb emas, "ulanib boʻlmadi" deb koʻrsatishi kerak.
 */
export async function tokenYokiYangi(): Promise<string | null> {
  const bor = await token();
  if (bor) return bor;
  if (!sozlanganmi()) return null;

  try {
    const r = await fetch(`${API()}/sessiya`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' },
      body: '{}',
      cache: 'no-store',
    });
    if (!r.ok) return null;
    const s = (await r.json()) as { token?: string };
    if (!s.token) return null;

    (await cookies()).set(COOKIE, s.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: YIL,
    });
    return s.token;
  } catch {
    return null;
  }
}

/** Edge Function ga soʻrov — sessiya sarlavhasi bilan. */
export async function apiga(
  yol: string,
  sessiya: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${API()}${yol}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${KEY()}`,
      'Content-Type': 'application/json',
      'x-sessiya': sessiya,
    },
    cache: 'no-store',
  });
}
