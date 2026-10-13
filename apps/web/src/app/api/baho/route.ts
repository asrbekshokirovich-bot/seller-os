/**
 * 👍/👎 — yordamchi javobiga baho, vositachi (nazoratchi, 2026-10-13).
 *
 * Tana: `{matn, baho: 'yaxshi' | 'yomon'}`. Edge Function javobni mijozning
 * oʻz suhbatidan qidiradi — topilmasa baho yozilmaydi (`shared/baho.ts`).
 */

import { apiga, sozlanganmi, tokenYokiYangi } from '@/lib/sessiya';

export async function POST(request: Request): Promise<Response> {
  if (!sozlanganmi()) return javob({ xato: 'API manzili sozlanmagan' }, 503);

  const t = await tokenYokiYangi(request);
  if (!t) return javob({ xato: 'sessiya ochilmadi' }, 503);

  let tana = '{}';
  try { tana = JSON.stringify(await request.json()); } catch { /* boʻsh */ }

  try {
    const r = await apiga('/baho', t, { method: 'POST', body: tana });
    return new Response(await r.text(), {
      status: r.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (xato) {
    console.error('[api/baho] API ga ulanib boʻlmadi:', xato);
    return javob({ xato: 'API ga ulanib boʻlmadi' }, 502);
  }
}

function javob(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
