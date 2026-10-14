/**
 * Obuna toʻlovini boshlash — vositachi (0067, nazoratchi 2026-10-14: 149 000 soʻm/oy,
 * faqat Payme/Click). Sessiya HttpOnly cookie dan Edge Function sarlavhasiga koʻchadi;
 * javobda — Payme yoki Click sahifasi manzili (`checkoutUrl`). Narxni server beradi.
 */

import { apigaSessiya, sozlanganmi } from '@/lib/sessiya';

export async function POST(request: Request): Promise<Response> {
  if (!sozlanganmi()) return javob({ xato: 'API manzili sozlanmagan' }, 503);

  let tana = '{}';
  try { tana = JSON.stringify(await request.json()); } catch { /* boʻsh */ }

  try {
    const r = await apigaSessiya(request, '/tolov/boshla', { method: 'POST', body: tana });
    if (!r) return javob({ xato: 'sessiya ochilmadi' }, 503);
    return new Response(await r.text(), {
      status: r.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (xato) {
    console.error('/api/tolov/boshla:', xato);
    return javob({ xato: 'API ga ulanib boʻlmadi' }, 502);
  }
}

function javob(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
