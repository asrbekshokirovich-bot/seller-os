/**
 * 3-qadam uchi — vositachi.
 *
 * `/api/yonalishlar` bilan bir xil sabab: kalit serverda qoladi va
 * autentifikatsiya qoʻshilganda oʻzgaradigan joy bitta boʻladi
 * (reja, 5-boʻlim).
 */

import { tokenYokiYangi } from '@/lib/sessiya';

const API = process.env.SELLEROS_API_URL ?? '';
const KEY = process.env.SELLEROS_API_KEY ?? '';

export async function GET(request: Request): Promise<Response> {
  if (!API || !KEY) {
    return javob({ olchov_yoq: true, sabab: 'API manzili sozlanmagan' }, 503);
  }

  const turkum = new URL(request.url).searchParams.get('turkum') ?? '';
  if (!/^\d+$/.test(turkum)) {
    return javob({ olchov_yoq: true, sabab: 'turkum notoʻgʻri' }, 400);
  }

  try {
    const sessiya = await tokenYokiYangi();
    const r = await fetch(`${API}/tovarlar?turkum=${turkum}`, {
      headers: {
        Authorization: `Bearer ${KEY}`,
        ...(sessiya ? { 'x-sessiya': sessiya } : {}),
      },
      cache: 'no-store',
    });
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
