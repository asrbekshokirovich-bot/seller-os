/**
 * CBU kursi — brauzerning oʻzidan (2026-10-27).
 *
 * cbu.uz 22-oktyabrdan beri serverlarimizga (Supabase Edge, Vercel) javob bermaydi, brauzerga
 * esa ochiq (`Access-Control-Allow-Origin: *`). Suhbat sahifasi USD va CNY qatorlarini shu yerda
 * oladi va har soʻrovga qoʻshadi; server ularni tekshiradi (`brauzerKursi`) — oʻtmasa yoki yoʻq
 * boʻlsa, CBU ga oʻzi urinadi. Kurs bilan hisob-kitob faqat shu mijozniki.
 *
 * Kuniga bir marta: ikkala qator ham olinsa — varaq xotirasida (`sessionStorage`) saqlanadi.
 * Hech qachon otmaydi: olinmasa `null`.
 */

import { cbuManzili, type Valyuta } from '@selleros/shared';

/** Serverga ketadigan CBU qatori — faqat kerakli maydonlar. */
export interface CbuQatori { Ccy: string; Rate: string; Nominal: string; Date: string }
export type CbuQatorlari = Partial<Record<Valyuta, CbuQatori>>;

const KALIT = 'zs-cbu-kurs';
/** CBU ga shundan uzoq kutilmaydi (odatda 0,2 s). */
const KUTISH_MS = 4_000;

export async function cbuQatorlari(f: typeof fetch = fetch, bugun: Date = new Date()): Promise<CbuQatorlari | null> {
  const kun = bugun.toISOString().slice(0, 10);
  try {
    const x = JSON.parse(sessionStorage.getItem(KALIT) ?? 'null') as { kun?: string; qatorlar?: CbuQatorlari } | null;
    if (x?.kun === kun && x.qatorlar) return x.qatorlar;
  } catch { /* xotira yopiq yoki boʻsh */ }
  const [USD, CNY] = await Promise.all([qator(f, 'USD'), qator(f, 'CNY')]);
  if (!USD && !CNY) return null;
  const qatorlar: CbuQatorlari = { ...(USD ? { USD } : {}), ...(CNY ? { CNY } : {}) };
  // Chalasi saqlanmaydi — keyingi yuklashda yana uriniladi.
  if (USD && CNY) {
    try { sessionStorage.setItem(KALIT, JSON.stringify({ kun, qatorlar })); } catch { /* xotira yopiq */ }
  }
  return qatorlar;
}

async function qator(f: typeof fetch, v: Valyuta): Promise<CbuQatori | null> {
  try {
    const r = await f(cbuManzili(v), { signal: AbortSignal.timeout(KUTISH_MS) });
    if (!r.ok) return null;
    const j: unknown = await r.json();
    const q = Array.isArray(j)
      ? (j as unknown[]).find((y): y is Record<string, unknown> => !!y && typeof y === 'object' && (y as Record<string, unknown>).Ccy === v)
      : undefined;
    if (!q) return null;
    const s = (x: unknown) => (typeof x === 'string' ? x : '');
    return { Ccy: v, Rate: s(q.Rate), Nominal: s(q.Nominal), Date: s(q.Date) };
  } catch {
    return null;
  }
}
