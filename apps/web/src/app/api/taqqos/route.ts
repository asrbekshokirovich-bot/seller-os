/**
 * Taqqoslash jadvali — vositachi (Edge `/taqqos`, 0071; nazoratchi 2026-10-21,
 * «Sotuvchi koʻzoynagi» D). Kengaytma savatidan keladi:
 * `/taqqos?ids=1,2,3#sessiya=…` — sahifa tokenni `x-sessiya` sarlavhasida
 * yuboradi; oddiy saytda — cookie. Raqamni Edge yasaydi (`shared/tovar-sotuvi.ts`).
 */

import { apigaSessiya, sozlanganmi } from '@/lib/sessiya';

export const dynamic = 'force-dynamic';

/** 1–5 ta Uzum tovar raqami, vergul bilan (Edge `TAQQOS_MAX`). */
const IDLAR = /^\d{1,11}(?:,\d{1,11}){0,4}$/;

export async function GET(request: Request): Promise<Response> {
  if (!sozlanganmi()) return javob({ xato: 'API manzili sozlanmagan' }, 503);
  const ids = new URL(request.url).searchParams.get('ids') ?? '';
  if (!IDLAR.test(ids)) return javob({ xato: 'ids — 1–5 ta tovar raqami, vergul bilan' }, 400);
  try {
    const r = await apigaSessiya(request, `/taqqos?ids=${ids}`, { method: 'GET' });
    if (!r) return javob({ xato: 'sessiya ochilmadi' }, 503);
    return new Response(await r.text(), {
      status: r.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch (xato) {
    console.error('/api/taqqos:', xato);
    return javob({ xato: 'API ga ulanib boʻlmadi' }, 502);
  }
}

function javob(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
