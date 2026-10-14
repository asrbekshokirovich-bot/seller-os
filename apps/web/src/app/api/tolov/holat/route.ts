/**
 * Payme/Click sozlanganmi — Edge `/health` dagi `live.tolov` (kalitlar emas, faqat
 * bor-yoʻqligi). «Obuna» ekrani toʻlov tugmasini shunga qarab yoqadi: ulanmagan
 * provayderga «hali ulanmagan» deyiladi, tugma bosilmaydi.
 */

export async function GET(): Promise<Response> {
  const api = process.env.SELLEROS_API_URL ?? '';
  const kalit = process.env.SELLEROS_API_KEY ?? '';
  let tolov = { jonli: false, payme: false, click: false };
  if (api && kalit) {
    try {
      const r = await fetch(`${api}/health`, { headers: { Authorization: `Bearer ${kalit}` }, cache: 'no-store' });
      const d = (await r.json().catch(() => null)) as { live?: { tolov?: Partial<typeof tolov> } } | null;
      const t = d?.live?.tolov;
      if (r.ok && t) tolov = { jonli: t.jonli === true, payme: t.payme === true, click: t.click === true };
    } catch (xato) {
      console.error('/api/tolov/holat:', xato);
    }
  }
  return new Response(JSON.stringify({ tolov }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
