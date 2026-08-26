/**
 * 4-qadam uchi — vositachi.
 *
 * `/api/tovarlar` bilan bir xil sabab: kalit serverda qoladi.
 * Hisobning oʻzi `@selleros/shared` da va u Edge Function da
 * ishlaydi — bu yerda faqat soʻrov uzatiladi.
 */

import { apiga, sozlanganmi, tokenYokiYangi } from '@/lib/sessiya';

export async function POST(request: Request): Promise<Response> {
  if (!sozlanganmi()) return javob({ olchov_yoq: true, sabab: 'API manzili sozlanmagan' }, 503);

  const t = await tokenYokiYangi();
  if (!t) return javob({ olchov_yoq: true, sabab: 'sessiya ochilmadi' }, 503);

  let tana = '{}';
  try { tana = JSON.stringify(await request.json()); } catch { /* boʻsh */ }

  try {
    const r = await apiga('/tannarx', t, { method: 'POST', body: tana });
    return new Response(await r.text(), {
      status: r.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (xato) {
    return javob({ olchov_yoq: true, sabab: `API ga ulanib boʻlmadi: ${String(xato)}` }, 502);
  }
}

function javob(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
