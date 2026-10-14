/**
 * «Suhbatlarim» — mijozning suhbatlari roʻyxati, vositachi (nazoratchi, 2026-10-14).
 *
 * Har karta: mavzu (turkum yoki soha), qadam, sana, xabarlar soni. Ism va
 * telefon kelmaydi (`shared/suhbatlar.ts`). Faqat oʻz sessiyasiniki.
 */

import { apigaSessiya, sozlanganmi } from '@/lib/sessiya';

export async function GET(request: Request): Promise<Response> {
  if (!sozlanganmi()) return javob({ xato: 'API manzili sozlanmagan' }, 503);
  try {
    const r = await apigaSessiya(request, '/suhbatlar', { method: 'GET' });
    if (!r) return javob({ xato: 'sessiya ochilmadi' }, 503);
    return new Response(await r.text(), {
      status: r.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (xato) {
    console.error('/api/suhbatlar:', xato);
    return javob({ xato: 'API ga ulanib boʻlmadi' }, 502);
  }
}

function javob(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
