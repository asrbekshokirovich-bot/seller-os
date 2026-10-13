/**
 * 2-qadam yoʻnalish kartasidagi tovar rasmlari — vositachi (nazoratchi,
 * 2026-10-14: "mijoz rasm topib yuklaguncha zerikib qoladi — rasm bilan oʻzing
 * top"). Kartada shu yoʻnalishda Uzumda eng koʻp sotilayotgan 3 ta tovar rasmi.
 *
 * Sessiya kerak emas: ochiq Uzum rasmlari, tavsiya emas. Rasmlar tez-tez
 * oʻzgarmaydi — 6 soat keshlanadi: server xotirasida va Vercel CDN da
 * (`s-maxage`), bazaga har karta uchun soʻrov ketmasin.
 */

export const dynamic = 'force-dynamic';

const API = process.env.SELLEROS_API_URL ?? '';
const KEY = process.env.SELLEROS_API_KEY ?? '';
const KESH_SONIYA = 21_600;

/** Xotira keshi (bitta server nusxasi ichida): turkum → {tana, vaqt}. */
const kesh = new Map<string, { tana: string; vaqt: number }>();

export async function GET(request: Request): Promise<Response> {
  if (!API || !KEY) return javob(JSON.stringify({ olchov_yoq: true, sabab: 'API manzili sozlanmagan' }), 503);

  const turkum = new URL(request.url).searchParams.get('turkum') ?? '';
  if (!/^\d{1,12}$/.test(turkum)) return javob(JSON.stringify({ olchov_yoq: true, sabab: 'turkum notoʻgʻri' }), 400);

  const bor = kesh.get(turkum);
  if (bor && Date.now() - bor.vaqt < KESH_SONIYA * 1000) return javob(bor.tana, 200, true);

  try {
    const r = await fetch(`${API}/turkum-rasmlari?turkum=${turkum}`, {
      headers: { Authorization: `Bearer ${KEY}` },
      cache: 'no-store',
    });
    const tana = await r.text();
    if (!r.ok) return javob(tana, r.status);
    if (kesh.size > 500) kesh.clear();
    kesh.set(turkum, { tana, vaqt: Date.now() });
    return javob(tana, 200, true);
  } catch (xato) {
    console.error('[api/turkum-rasmlari] API ga ulanib boʻlmadi:', xato);
    return javob(JSON.stringify({ olchov_yoq: true, sabab: 'API ga ulanib boʻlmadi' }), 502);
  }
}

function javob(tana: string, status: number, keshlansin = false): Response {
  return new Response(tana, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': keshlansin ? `public, s-maxage=${KESH_SONIYA}, stale-while-revalidate=86400` : 'no-store',
    },
  });
}
