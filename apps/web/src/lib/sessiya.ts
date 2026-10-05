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
import { sorovTokeni } from './sessiya-sarlavha';

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
 *
 * KENGAYTMA REJIMI (0.2.0): Chrome yon panelidagi ramkada cookie
 * ishlamaydi — token `x-sessiya` sarlavhasida keladi va cookie'dan
 * USTUN turadi (`sessiya-sarlavha.ts` elagi bilan). Cookie yozilmaydi:
 * ramkada u baribir saqlanmasdi.
 */
export async function tokenYokiYangi(request?: Request): Promise<string | null> {
  const sarlavhadan = sorovTokeni(request);
  if (sarlavhadan) return sarlavhadan;
  const bor = await token();
  if (bor) return bor;
  if (!sozlanganmi()) return null;
  return sessiyaOch();
}

/** Yangi sessiya ochib cookie ga yozadi. `null` — API javob bermadi. */
async function sessiyaOch(): Promise<string | null> {
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

/**
 * Edge Function ga soʻrov — sessiya bilan. Cookie dagi token bazada yoʻq
 * boʻlsa (baza tozalangan, sessiya oʻchirilgan) — BIR MARTA yangi sessiya
 * ochib qaytadan soʻraydi. Aks holda odam "sessiya topilmadi" da abadiy
 * qolardi: cookie bir yil yashaydi va oʻzi almashmaydi (audit, 2026-10-05).
 * Kengaytma tokeni (sarlavha) almashtirilmaydi — uni kengaytma saqlaydi.
 *
 * `null` — sessiya ochilmadi (API sozlanmagan yoki javob bermadi).
 */
export async function apigaSessiya(request: Request, yol: string, init: RequestInit = {}): Promise<Response | null> {
  const t = await tokenYokiYangi(request);
  if (!t) return null;
  const r = await apiga(yol, t, init);
  if (r.status !== 401 || sorovTokeni(request)) return r;
  if (!(await r.clone().text()).includes('sessiya topilmadi')) return r;
  const yangi = await sessiyaOch();
  return yangi ? apiga(yol, yangi, init) : r;
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
