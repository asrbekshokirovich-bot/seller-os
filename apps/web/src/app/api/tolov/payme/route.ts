/**
 * Payme Merchant API uchi (0067). Payme kabinetida «Endpoint URL»:
 * https://zumsavdo.vercel.app/api/tolov/payme
 *
 * Edge Function JWT bilan yopiq — Payme unga toʻgʻridan-toʻgʻri kira olmaydi. Vositachi
 * soʻrovni OʻZGARTIRMAY uzatadi: tana xom matn, Payme `Authorization` i `x-payme-auth`
 * boʻlib ketadi va Edge da kassa kaliti bilan tekshiriladi (bu yerda emas). Javob DOIM
 * HTTP 200 — Payme talabi; ulanib boʻlmasa — JSON-RPC «tizim xatosi» (-32400).
 */

const JSON_SARLAVHA = { 'Content-Type': 'application/json; charset=utf-8' };

export async function POST(request: Request): Promise<Response> {
  const tana = await request.text();
  const api = process.env.SELLEROS_API_URL ?? '';
  const kalit = process.env.SELLEROS_API_KEY ?? '';
  if (api && kalit) {
    try {
      const r = await fetch(`${api}/tolov/payme`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${kalit}`,
          'Content-Type': 'application/json',
          'x-payme-auth': request.headers.get('authorization') ?? '',
        },
        body: tana,
        cache: 'no-store',
      });
      if (r.ok) return new Response(await r.text(), { status: 200, headers: JSON_SARLAVHA });
      console.error('/api/tolov/payme: Edge', r.status);
    } catch (xato) {
      console.error('/api/tolov/payme:', xato);
    }
  }
  return new Response(JSON.stringify({
    id: sorovIdsi(tana),
    error: { code: -32400, message: { ru: 'Системная ошибка', uz: 'Tizim xatosi', en: 'System error' } },
  }), { status: 200, headers: JSON_SARLAVHA });
}

/** Xato javobida ham Payme soʻrovining `id` si qaytadi (JSON boʻlmasa — `null`). */
function sorovIdsi(tana: string): unknown {
  try {
    const o: unknown = JSON.parse(tana);
    return o !== null && typeof o === 'object' && 'id' in o ? (o as { id: unknown }).id : null;
  } catch {
    return null;
  }
}
