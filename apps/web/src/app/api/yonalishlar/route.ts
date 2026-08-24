/**
 * Brauzer va SellerOS API orasidagi vositachi.
 *
 * NEGA TOʻGʻRIDAN-TOʻGʻRI EMAS. Reja, 5-boʻlim: web, bot va
 * kengaytma bazaga bevosita tegmaydi. Bu yerda ikkita amaliy sabab
 * ham bor:
 *
 *   1. Kalit serverda qoladi. Brauzerga yuborilgan har qanday kalit
 *      — ochiq kalit. `anon` kaliti shunga moʻljallangan, lekin uni
 *      chiqarmaslik arzonroq.
 *   2. Autentifikatsiya qoʻshilganda oʻzgaradigan joy BITTA boʻladi.
 *
 * Xatolar YASHIRILMAYDI. API "oʻlchov yoʻq" desa, u shundayligicha
 * uzatiladi: brauzer boʻsh roʻyxat koʻrsatmasligi kerak, chunki
 * boʻsh roʻyxat "sizga mos yoʻnalish yoʻq" degan daʼvo boʻlardi.
 */

const API = process.env.SELLEROS_API_URL ?? '';
const KEY = process.env.SELLEROS_API_KEY ?? '';

export async function POST(request: Request): Promise<Response> {
  if (!API || !KEY) {
    // Sozlanmagani "natija yoʻq" degani emas. Farqi aytiladi.
    return javob(
      { olchov_yoq: true, sabab: 'API manzili sozlanmagan' },
      503,
    );
  }

  let tana: unknown = {};
  try {
    tana = await request.json();
  } catch {
    // Tanasiz soʻrov — boʻsh profil bilan davom etadi.
  }

  try {
    const r = await fetch(`${API}/yonalishlar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tana),
      // Har soʻrov yangi javob oladi: kesh yoshi javobning oʻzida
      // koʻrsatiladi, yaʼni ikkinchi qatlam keshi faqat chalgʻitardi.
      cache: 'no-store',
    });
    const matn = await r.text();
    return new Response(matn, {
      status: r.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (xato) {
    return javob(
      { olchov_yoq: true, sabab: `API ga ulanib boʻlmadi: ${String(xato)}` },
      502,
    );
  }
}

function javob(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
