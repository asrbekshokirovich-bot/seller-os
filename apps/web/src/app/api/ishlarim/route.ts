/**
 * «Ishlarim» — chat yozgan ishlar, vositachi (ikkinchi koʻrik K2, 0083).
 *
 * GET — roʻyxat; POST `{ id, bajarildi }` — «bajarildi» yoki qayta ochiq. Sessiya — cookie yoki
 * kengaytmaning `x-sessiya` sarlavhasi; faqat oʻz ishlari (Edge `/ishlarim`, `shared/ishlarim.ts`).
 */

import { apigaSessiya, sozlanganmi } from '@/lib/sessiya';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return uzat(request, { method: 'GET' });
}

export async function POST(request: Request): Promise<Response> {
  let tana = '';
  try { tana = await request.text(); } catch { /* boʻsh — Edge 400 qaytaradi */ }
  // `{ "id": 123, "bajarildi": true }` — 60 belgidan oshmaydi; katta tana Edge ga yuborilmaydi.
  if (tana.length > 200) return javob({ xato: 'soʻrov juda katta' }, 413);
  return uzat(request, { method: 'POST', body: tana || '{}' });
}

async function uzat(request: Request, init: RequestInit): Promise<Response> {
  if (!sozlanganmi()) return javob({ xato: 'API manzili sozlanmagan' }, 503);
  try {
    const r = await apigaSessiya(request, '/ishlarim', init);
    if (!r) return javob({ xato: 'sessiya ochilmadi' }, 503);
    return new Response(await r.text(), {
      status: r.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch (xato) {
    // Xom xato (inglizcha) faqat server logida — odamga qisqa matn.
    console.error('/api/ishlarim:', xato);
    return javob({ xato: 'API ga ulanib boʻlmadi' }, 502);
  }
}

function javob(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
