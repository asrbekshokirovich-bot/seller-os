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

import { apiga, sozlanganmi, tokenYokiYangi } from '@/lib/sessiya';

export async function GET(): Promise<Response> {
  if (!sozlanganmi()) return javob({ xato: 'API manzili sozlanmagan' }, 503);
  const t = await tokenYokiYangi();
  if (!t) return javob({ xato: 'sessiya ochilmadi' }, 503);
  try {
    const r = await apiga('/suhbat', t, { method: 'GET' });
    return new Response(await r.text(), {
      status: r.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (xato) {
    return javob({ xato: `API ga ulanib boʻlmadi: ${String(xato)}` }, 502);
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!sozlanganmi()) return javob({ xato: 'API manzili sozlanmagan' }, 503);
  const t = await tokenYokiYangi();
  if (!t) return javob({ xato: 'sessiya ochilmadi' }, 503);

  let tana = '{}';
  try { tana = JSON.stringify(await request.json()); } catch { /* boʻsh */ }

  try {
    const r = await apiga('/suhbat', t, { method: 'POST', body: tana });
    return new Response(await r.text(), {
      status: r.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (xato) {
    return javob({ xato: `API ga ulanib boʻlmadi: ${String(xato)}` }, 502);
  }
}

function javob(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
