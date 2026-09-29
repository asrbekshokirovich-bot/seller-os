/**
 * Edge Function mijozi — Chrome kengaytmasi (`apps/extension/src/background.ts`)
 * bilan bir xil yoʻl.
 *
 * KALIT. `apiKey` — Supabase ning OMMAVIY (publishable) kaliti: u
 * qurilmaga chiqishi uchun moʻljallangan, kengaytma ham shuni ishlatadi.
 * `service_role` bu yerga HECH QACHON tushmaydi (QOIDALAR.md, 3-qoida).
 *
 * SESSIYA. Login hali yoʻq (kirish — "tez orada"). Ilova anonim sessiya
 * ochadi va tokenni qurilmada saqlaydi; har soʻrovga `x-sessiya`
 * sarlavhasi bilan qoʻshiladi. 401 kelsa token bir marta yangilanadi.
 */

import Constants from 'expo-constants';
import { ol, yoz } from './saqlash';
import type { BazamizJavobi, SuhbatJavobi } from './turlar';

interface Sozlama { apiUrl?: string; apiKey?: string; sayt?: string }
const extra = (Constants.expoConfig?.extra ?? {}) as Sozlama;

const API = extra.apiUrl ?? '';
const KALIT = extra.apiKey ?? '';
export const SAYT = extra.sayt ?? '';

const SESSIYA = 'so_sessiya';

function sarlavhalar(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    apikey: KALIT,
    Authorization: `Bearer ${KALIT}`,
    'Content-Type': 'application/json',
  };
  if (token) h['x-sessiya'] = token;
  return h;
}

/** Uzilish — foydalanuvchiga koʻrsatiladigan sabab bilan. */
export class UlanishXatosi extends Error {}

async function sessiyaOch(): Promise<string> {
  const r = await fetch(`${API}/sessiya`, { method: 'POST', headers: sarlavhalar(), body: '{}' });
  if (!r.ok) throw new UlanishXatosi(`sessiya ochilmadi (${r.status})`);
  const d = (await r.json()) as { token?: string };
  if (!d.token) throw new UlanishXatosi('sessiya ochilmadi');
  await yoz(SESSIYA, d.token);
  return d.token;
}

async function token(yangidan = false): Promise<string> {
  if (!API || !KALIT) throw new UlanishXatosi('API manzili sozlanmagan');
  if (!yangidan) {
    const t = await ol(SESSIYA);
    if (t) return t;
  }
  return sessiyaOch();
}

/**
 * Sessiyali soʻrov. `ok` boʻlmagan javob ham qaytariladi — `/suhbat`
 * xatoda ham `keyingi` beradi va chat uni chizishi kerak.
 */
async function sessiyali<T>(yol: string, init: RequestInit = {}): Promise<{ ok: boolean; data: T }> {
  let t = await token();
  const yubor = (tk: string) => fetch(`${API}${yol}`, { ...init, headers: sarlavhalar(tk) });
  let r = await yubor(t);
  if (r.status === 401) {
    t = await token(true);
    r = await yubor(t);
  }
  return { ok: r.ok, data: (await r.json()) as T };
}

export function suhbatOl(): Promise<{ ok: boolean; data: SuhbatJavobi }> {
  return sessiyali<SuhbatJavobi>('/suhbat', { method: 'GET' });
}

export function suhbatYubor(tana: Record<string, unknown>): Promise<{ ok: boolean; data: SuhbatJavobi }> {
  return sessiyali<SuhbatJavobi>('/suhbat', { method: 'POST', body: JSON.stringify(tana) });
}

/** Baza hajmi — sessiyasiz. Olinmasa `null` (chiziqcha), nol emas. */
export async function bazamizOl(): Promise<BazamizJavobi | null> {
  if (!API || !KALIT) return null;
  try {
    const r = await fetch(`${API}/bazamiz`, { headers: sarlavhalar() });
    if (!r.ok) return null;
    return (await r.json()) as BazamizJavobi;
  } catch {
    return null;
  }
}

