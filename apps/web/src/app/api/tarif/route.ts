/**
 * Mijozning amaldagi rejasi — vositachi (Edge `/tarif`). «Obuna» ekrani va «Profilim»
 * joriy rejani shundan koʻrsatadi: toʻlagandan keyin «Bepul — joriy» deb turib qolmasin.
 */

import { apigaSessiya, sozlanganmi } from '@/lib/sessiya';

export async function GET(request: Request): Promise<Response> {
  if (!sozlanganmi()) return javob({ xato: 'API manzili sozlanmagan' }, 503);
  try {
    const r = await apigaSessiya(request, '/tarif', { method: 'GET' });
    if (!r) return javob({ xato: 'sessiya ochilmadi' }, 503);
    return new Response(await r.text(), {
      status: r.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (xato) {
    console.error('/api/tarif:', xato);
    return javob({ xato: 'API ga ulanib boʻlmadi' }, 502);
  }
}

function javob(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
