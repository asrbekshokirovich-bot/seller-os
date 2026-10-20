/**
 * Suhbat uchi — vositachi.
 *
 * `/api/yonalishlar` bilan bir xil sabab: kalit serverda qoladi,
 * sessiya tokeni HttpOnly cookie dan Edge Function sarlavhasiga
 * koʻchadi. Brauzer bazaga ham, Edge Function ga ham toʻgʻridan-toʻgʻri
 * tegmaydi.
 *
 * GET  — tarix va hozirgi savol.
 * POST — {savolId, javob} yoki {matn}; {boshdan: true} — boshidan.
 */

import { OQIM_SARLAVHALARI, oqimmi } from '@selleros/shared';
import { apigaSessiya, sozlanganmi } from '@/lib/sessiya';

/**
 * Erkin savolga AI javobi 25 s gacha kutiladi (`llm.ts`), darvozadan oʻtmasa —
 * yana bir urinish; kartochka matni 30 s. Vositachi undan oldin uzilmasin.
 */
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  if (!sozlanganmi()) return javob({ xato: 'API manzili sozlanmagan' }, 503);
  try {
    const r = await apigaSessiya(request, '/suhbat', { method: 'GET' });
    if (!r) return javob({ xato: 'sessiya ochilmadi' }, 503);
    return new Response(await r.text(), {
      status: r.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (xato) {
    console.error('/api/suhbat:', xato);
    return javob({ xato: 'API ga ulanib boʻlmadi' }, 502);
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!sozlanganmi()) return javob({ xato: 'API manzili sozlanmagan' }, 503);

  let tana = '{}';
  try { tana = JSON.stringify(await request.json()); } catch { /* boʻsh */ }

  try {
    const r = await apigaSessiya(request, '/suhbat', { method: 'POST', body: tana });
    if (!r) return javob({ xato: 'sessiya ochilmadi' }, 503);
    // Oqim (2026-10-20, `{oqim: true}`): Edge javobni yozilgan sari yuboradi — shundayligicha
    // uzatiladi, yigʻib turilmaydi (`@selleros/shared` `oqim.ts`).
    if (oqimmi(r) && r.body) return new Response(r.body, { status: r.status, headers: OQIM_SARLAVHALARI });
    return new Response(await r.text(), {
      status: r.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (xato) {
    console.error('/api/suhbat:', xato);
    return javob({ xato: 'API ga ulanib boʻlmadi' }, 502);
  }
}

function javob(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
