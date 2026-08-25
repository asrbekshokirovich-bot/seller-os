/**
 * Sotuvchi fikri — vositachi.
 *
 * NEGA BU BOR. Reja B2 darvozasi: "begona 3 sotuvchi Ustadan
 * mustaqil oʻtib «mantiqli» deydi". Shu paytgacha sotuvchi
 * "bu miqdor mantiqsiz" desa, buni yozib oladigan joy yoʻq edi —
 * gap suhbatda qolib ketardi. Endi u bazaga tushadi va darvoza
 * dalili soʻrov bilan olinadi, xotiradan emas.
 *
 * JAVOB BERMASLIK — FIKR EMAS. `mantiqli` maydoni yoʻq boʻlsa,
 * u `null` boʻlib yoziladi va darvoza hisobiga kirmaydi.
 */

import { apiga, sozlanganmi, tokenYokiYangi } from '@/lib/sessiya';

export async function POST(request: Request): Promise<Response> {
  if (!sozlanganmi()) return javob({ xato: 'API manzili sozlanmagan' }, 503);

  const t = await tokenYokiYangi();
  if (!t) return javob({ xato: 'sessiya ochilmadi' }, 503);

  let tana = '{}';
  try { tana = JSON.stringify(await request.json()); } catch { /* boʻsh */ }

  try {
    const r = await apiga('/fikr', t, { method: 'POST', body: tana });
    return new Response(await r.text(), {
      status: r.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (xato) {
    return javob({ xato: `API ga ulanib boʻlmadi: ${String(xato)}` }, 502);
  }
}

function javob(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
