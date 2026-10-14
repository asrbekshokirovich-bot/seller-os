/**
 * «Suhbatlarim» — bitta eski suhbatni oʻqish, vositachi (nazoratchi, 2026-10-14).
 *
 * `?boshi=&oxiri=` — roʻyxatdagi kartaning chegaralari (butun son). Faqat oʻz
 * sessiyasining xabarlari keladi; davom ettirish — `POST /api/suhbat {qaytish}`.
 */

import { apigaSessiya, sozlanganmi } from '@/lib/sessiya';

export async function GET(request: Request): Promise<Response> {
  if (!sozlanganmi()) return javob({ xato: 'API manzili sozlanmagan' }, 503);
  const q = new URL(request.url).searchParams;
  const boshi = Number(q.get('boshi'));
  const oxiri = Number(q.get('oxiri'));
  if (!Number.isSafeInteger(boshi) || !Number.isSafeInteger(oxiri) || boshi < 1 || oxiri < boshi) {
    return javob({ xato: 'suhbat chegarasi notoʻgʻri' }, 400);
  }
  try {
    const r = await apigaSessiya(request, `/suhbat-bolagi?boshi=${boshi}&oxiri=${oxiri}`, { method: 'GET' });
    if (!r) return javob({ xato: 'sessiya ochilmadi' }, 503);
    return new Response(await r.text(), {
      status: r.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (xato) {
    console.error('/api/suhbat-bolagi:', xato);
    return javob({ xato: 'API ga ulanib boʻlmadi' }, 502);
  }
}

function javob(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
