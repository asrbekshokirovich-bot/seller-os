/**
 * Bosh sahifa hisoblagichi — vositachi (0076; nazoratchi, 2026-10-28: «hisoblagich qoʻy»).
 *
 * Tana: `{nom, sinov?}`. Sessiya OCHILMAYDI va cookie oʻqilmaydi: hisob ismsiz, bosh sahifani
 * ochgan har odamga sessiya ochish bazani keraksiz mijozlar bilan toʻldirardi. Edge Function ga
 * faqat nom va sinov belgisi ketadi — tanadagi boshqa narsa tashlanadi.
 */

import { hisobNomimi } from '@selleros/shared';

/** Tana chegarasi — hisob tanasi bir necha oʻn bayt. */
const TANA_MAX = 1_024;

export async function POST(request: Request): Promise<Response> {
  const api = process.env.SELLEROS_API_URL ?? '';
  const kalit = process.env.SELLEROS_API_KEY ?? '';
  if (!api || !kalit) return new Response(null, { status: 503 });

  let tana: Record<string, unknown> = {};
  try {
    const matn = await request.text();
    if (matn.length <= TANA_MAX) tana = JSON.parse(matn) as Record<string, unknown>;
  } catch { /* buzuq tana — quyida rad etiladi */ }
  if (!hisobNomimi(tana.nom)) return new Response(null, { status: 400 });

  try {
    const r = await fetch(`${api}/hisob`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${kalit}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: tana.nom, sinov: tana.sinov === true }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    return new Response(null, { status: r.ok ? 204 : r.status });
  } catch (xato) {
    console.error('[api/hisob] API ga ulanib boʻlmadi:', xato);
    return new Response(null, { status: 502 });
  }
}
