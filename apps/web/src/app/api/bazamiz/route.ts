/**
 * Usta yon panelidagi "Baza" kartasi uchun oʻlchov.
 *
 * Sotuv sahifasi bilan BIR XIL kesh (`lib/bazamizOl.ts`): ikkala
 * joyda bir xil son chiqishi kerak.
 *
 * Javobda `yoshMs` bor, `vaqt` emas: brauzer soati server soatidan
 * farq qilishi mumkin va "5 daqiqa oldin" oʻrniga "−3 soat" chiqardi.
 *
 * `olchov: null` — oʻlchov hech qachon olinmagan. Karta unda
 * CHIZIQCHA koʻrsatadi, nol emas (QOIDALAR.md, 4-boʻlim).
 */

import { bazamizniOl } from '@/lib/bazamizOl';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const hozir = Date.now();
  const o = await bazamizniOl(hozir);
  const tana = o === null
    ? { olchov: null }
    : {
        olchov: {
          tovar: typeof o.qiymat.tovar === 'number' ? o.qiymat.tovar : null,
          olchandi: o.qiymat.olchandi ?? null,
          yoshMs: Math.max(0, hozir - o.vaqt),
        },
      };
  return new Response(JSON.stringify(tana), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
