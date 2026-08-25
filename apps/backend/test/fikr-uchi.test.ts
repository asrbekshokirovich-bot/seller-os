/**
 * `/fikr` va `/darvoza` uchlari.
 *
 * NEGA BU MUHIM. B2 darvozasi "3 begona sotuvchi «mantiqli» dedi"
 * degan DALILGA tayanadi. Dalil notoʻgʻri yigʻilsa, darvoza
 * yolgʻon ochiladi — bu esa mahsulotni tekshirilmagan holda
 * oldinga oʻtkazish demak.
 *
 * Eng nozik joyi: "javob bermadi" va "yoʻq" ni ARALASHTIRMASLIK.
 * `mantiqli` maydoni boʻlmasa u `null` boʻlib ketishi kerak,
 * `false` emas — aks holda jim ketgan odam "mantiqsiz" deb
 * sanalardi.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { build } from '../src/app.js';

const KALITLAR = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
const OLDINGI = new Map<string, string | undefined>();
const HAQIQIY_FETCH = globalThis.fetch;

beforeEach(() => {
  for (const nom of KALITLAR) {
    OLDINGI.set(nom, process.env[nom]);
    delete process.env[nom];
  }
});

afterEach(() => {
  for (const nom of KALITLAR) {
    const eski = OLDINGI.get(nom);
    if (eski === undefined) delete process.env[nom];
    else process.env[nom] = eski;
  }
  globalThis.fetch = HAQIQIY_FETCH;
});

/** Bazani oʻrniga qoʻyamiz va RPC ga ketgan argumentlarni ushlaymiz. */
function bazaniQoy(javob: unknown) {
  const chaqiruvlar: Chaqiruv[] = [];
  process.env.SUPABASE_URL = 'https://soxta.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'soxta-kalit';
  globalThis.fetch = vi.fn(async (url: unknown, sozlama: unknown) => {
    const nom = String(url).split('/rpc/')[1] ?? '';
    const s = sozlama as { body?: string };
    chaqiruvlar.push({ nom, arg: JSON.parse(s.body ?? '{}') });
    return new Response(JSON.stringify(javob), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return chaqiruvlar;
}

type Chaqiruv = { nom: string; arg: Record<string, unknown> };

/** Birinchi RPC chaqiruvi. Umuman boʻlmasa test yiqiladi. */
function birinchi(chaqiruvlar: Chaqiruv[]): Chaqiruv {
  const c = chaqiruvlar[0];
  if (c === undefined) throw new Error('RPC umuman chaqirilmadi');
  return c;
}

async function fikr(
  payload: Record<string, unknown>,
  sessiya: string | null = 'sessiya-1',
) {
  const app = build();
  const res = await app.inject({
    method: 'POST',
    url: '/fikr',
    payload,
    headers: sessiya === null ? {} : { 'x-sessiya': sessiya },
  });
  await app.close();
  return res;
}

describe('/fikr', () => {
  it('sessiyasiz yozilmaydi — 401', async () => {
    const chaqiruvlar = bazaniQoy({ saqlandi: true });
    const res = await fikr({ mantiqli: true }, null);
    expect(res.statusCode).toBe(401);
    // Baza umuman bezovta qilinmaydi.
    expect(chaqiruvlar).toHaveLength(0);
  });

  it('"ha" yoziladi', async () => {
    const chaqiruvlar = bazaniQoy({ saqlandi: true });
    const res = await fikr({ mantiqli: true, matn: 'toʻgʻri koʻrindi', turkum: 77 });
    expect(res.statusCode).toBe(200);
    expect(birinchi(chaqiruvlar).nom).toBe('so_fikr_yoz');
    expect(birinchi(chaqiruvlar).arg).toMatchObject({
      p_token: 'sessiya-1',
      p_mantiqli: true,
      p_matn: 'toʻgʻri koʻrindi',
      p_turkum: 77,
    });
  });

  it('"yoʻq" ham yoziladi — `false` yoʻqolib ketmaydi', async () => {
    const chaqiruvlar = bazaniQoy({ saqlandi: true });
    await fikr({ mantiqli: false });
    expect(birinchi(chaqiruvlar).arg.p_mantiqli).toBe(false);
  });

  /*
   * ENG MUHIM TEKSHIRUV. Javob bermaslik — fikr EMAS.
   * `false` boʻlib ketsa, jim ketgan odam darvozada
   * "mantiqsiz" deb sanalardi.
   */
  it('maydon yoʻq boʻlsa `null` — `false` EMAS', async () => {
    const chaqiruvlar = bazaniQoy({ saqlandi: true });
    await fikr({ matn: 'shunchaki izoh' });
    expect(birinchi(chaqiruvlar).arg.p_mantiqli).toBeNull();
  });

  it('"true" matni mantiqli boʻlib qolmaydi', async () => {
    const chaqiruvlar = bazaniQoy({ saqlandi: true });
    await fikr({ mantiqli: 'true' });
    expect(birinchi(chaqiruvlar).arg.p_mantiqli).toBeNull();
  });

  it('qadam berilmasa 3 — fikr tovar roʻyxati haqida', async () => {
    const chaqiruvlar = bazaniQoy({ saqlandi: true });
    await fikr({ mantiqli: true });
    expect(birinchi(chaqiruvlar).arg.p_qadam).toBe(3);
    expect(birinchi(chaqiruvlar).arg.p_turkum).toBeNull();
  });

  it('baza ulanmagan boʻlsa 503 — "saqlandi" deb aldanmaydi', async () => {
    const res = await fikr({ mantiqli: true });
    expect(res.statusCode).toBe(503);
    expect(res.json().xato).toBe('baza javob bermadi');
  });

  it('sessiya topilmasa 401', async () => {
    bazaniQoy({ xato: 'sessiya topilmadi' });
    const res = await fikr({ mantiqli: true });
    expect(res.statusCode).toBe(401);
  });
});

describe('/darvoza', () => {
  async function darvoza() {
    const app = build();
    const res = await app.inject({ method: 'GET', url: '/darvoza' });
    await app.close();
    return res;
  }

  it('hisob bazadan keladi', async () => {
    bazaniQoy({ javob_bergan: 3, mantiqli: 3, mantiqsiz: 0, kerak: 3, ochiq: true });
    const j = (await darvoza()).json();
    expect(j.b2.ochiq).toBe(true);
    expect(j.b2.mantiqli).toBe(3);
  });

  /*
   * Baza javob bermasa darvoza OCHIQ deb koʻrsatilmaydi.
   * "Nol dalil" — "yetarli dalil" degani emas.
   */
  it('baza javob bermasa oʻlchov yoʻq deyiladi', async () => {
    const j = (await darvoza()).json();
    expect(j.olchov_yoq).toBe(true);
    expect(j.b2).toBeUndefined();
  });
});
