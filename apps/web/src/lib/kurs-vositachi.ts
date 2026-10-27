/**
 * CBU kursi — vositachi (2026-10-27).
 *
 * NEGA. Markaziy bank sayti (cbu.uz) 22-oktyabrdan beri Supabase Edge dan kelgan soʻrovga
 * javob bermaydi (Edge logi: «kurs: CBU USD olinmadi — TimeoutError … (4004 ms)»), boshqa
 * tarmoqlardan esa 0,2 s da beradi. Natijada 1-qadamda dollar tugmalari yoʻq, 4–6-qadamlarda
 * yuan va dollar soʻmga oʻgirilmaydi. Bu yoʻl — Vercel serveri orqali: CBU ning oʻsha JSON ini
 * OʻZGARTIRMAY qaytaradi; Edge uni oʻzi oʻqiydi va tekshiradi (`kursniOl`, `cbuKursiniOqi`).
 *
 * Faqat USD va CNY. CBU kursi kuniga bir marta yangilanadi — javob 30 daqiqa keshlanadi.
 * Olinmasa — 502 va sababi logda (QOIDALAR §8: jim oʻlim yoʻq); kechagi qiymat berilmaydi.
 */

import { cbuManzili, type Valyuta } from '@selleros/shared';

const VALYUTALAR: readonly Valyuta[] = ['USD', 'CNY'];
/** CBU ga shundan uzoq kutilmaydi. */
const CBU_KUTISH_MS = 5_000;

export async function cbuVositachi(valyutaXom: string | null, f: typeof fetch = fetch): Promise<Response> {
  const valyuta = VALYUTALAR.find((v) => v === valyutaXom);
  if (!valyuta) return javob({ xato: 'valyuta: USD yoki CNY' }, 400);
  const boshi = Date.now();
  try {
    const r = await f(cbuManzili(valyuta), { signal: AbortSignal.timeout(CBU_KUTISH_MS), cache: 'no-store' });
    const matn = await r.text();
    if (!r.ok) {
      console.warn(`/api/kurs: CBU ${valyuta} — HTTP ${r.status} (${Date.now() - boshi} ms)`);
      return javob({ xato: `CBU HTTP ${r.status}` }, 502);
    }
    return new Response(matn, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (e) {
    const x = e as Error | undefined;
    console.warn(`/api/kurs: CBU ${valyuta} olinmadi — ${x?.name ?? 'xato'}: ${String(x?.message ?? '').slice(0, 160)} (${Date.now() - boshi} ms)`);
    return javob({ xato: 'CBU javob bermadi' }, 502);
  }
}

function javob(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
