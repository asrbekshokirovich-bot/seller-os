/**
 * Click SHOP API uchi (0067) — Prepare va Complete bitta manzilda (`action` maydoni
 * ajratadi). Click kabinetida ikkala manzil ham:
 * https://zumsavdo.vercel.app/api/tolov/click
 *
 * Edge Function JWT bilan yopiq — vositachi formani OʻZGARTIRMAY uzatadi (imzo xom
 * `amount` bilan tekshiriladi, Edge da). Javob — JSON, DOIM HTTP 200; ulanib
 * boʻlmasa — Click «Failed to update user» (-7): Click keyinroq qayta yuboradi.
 */

const JSON_SARLAVHA = { 'Content-Type': 'application/json; charset=utf-8' };

export async function POST(request: Request): Promise<Response> {
  const tana = await request.text();
  const api = process.env.SELLEROS_API_URL ?? '';
  const kalit = process.env.SELLEROS_API_KEY ?? '';
  if (api && kalit) {
    try {
      const r = await fetch(`${api}/tolov/click`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kalit}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tana,
        cache: 'no-store',
      });
      if (r.ok) return new Response(await r.text(), { status: 200, headers: JSON_SARLAVHA });
      console.error('/api/tolov/click: Edge', r.status);
    } catch (xato) {
      console.error('/api/tolov/click:', xato);
    }
  }
  const f = new URLSearchParams(tana);
  return new Response(JSON.stringify({
    click_trans_id: f.get('click_trans_id') ?? '',
    merchant_trans_id: f.get('merchant_trans_id') ?? '',
    error: -7,
    error_note: 'Failed to update user',
  }), { status: 200, headers: JSON_SARLAVHA });
}
