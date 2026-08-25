/**
 * Profil — oʻqish va saqlash.
 *
 * Sessiya tokeni HttpOnly cookie da, ya'ni brauzer JS i uni
 * koʻrmaydi. Bu marshrut uni cookie dan olib, Edge Function
 * sarlavhasiga koʻchiradi.
 */

import { apiga, sozlanganmi, token, tokenYokiYangi } from '@/lib/sessiya';

export async function GET(): Promise<Response> {
  if (!sozlanganmi()) return javob({ xato: 'API manzili sozlanmagan' }, 503);

  const t = await token();
  // Token YOʻQ — bu xato emas, birinchi tashrif. Boʻsh profil.
  if (!t) return javob({ javoblar: null, yangi: true }, 200);

  try {
    const r = await apiga('/profil', t, { method: 'GET' });
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
    const r = await apiga('/profil', t, { method: 'POST', body: tana });
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
