/**
 * `/xitoy-qidiruv` uchi — Fastify orqali (Edge Function dagi bilan bir xil).
 *
 * Muhit ataylab tozalanadi va tozalangani tekshiriladi (QOIDALAR §8-e).
 * Baza YOʻQ: `rpc` `null` qaytaradi — limit 0, kesh yoʻq. Shunda uch
 * provayderga boradi (kalit boʻlsa) yoki sababini aytadi.
 *
 * Eng muhim tekshiruv: provayder yiqilganda uch BOʻSH ROʻYXAT emas,
 * `xato` bilan 502 qaytaradi. Ilgari kalit borligida ham izohsiz boʻsh
 * roʻyxat qaytar edi — "qidirilmadi" bilan "topilmadi" bir xil edi.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { build } from '../src/app.js';

const F = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/tmapi-1688-rasm.json'), 'utf8')) as {
  muvaffaqiyat: unknown; ogirish: unknown; balans: unknown;
};

const KALITLAR = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'XITOY_API_KEY', 'TARIF_CHEKLOVI'] as const;
const OLDINGI = new Map<string, string | undefined>();
const ASL_FETCH = globalThis.fetch;

beforeEach(() => {
  for (const nom of KALITLAR) {
    OLDINGI.set(nom, process.env[nom]);
    delete process.env[nom];
    expect(process.env[nom]).toBeUndefined();
  }
});

afterEach(() => {
  for (const nom of KALITLAR) {
    const eski = OLDINGI.get(nom);
    if (eski === undefined) delete process.env[nom];
    else process.env[nom] = eski;
  }
  globalThis.fetch = ASL_FETCH;
});

/** Faqat provayderga ketadigan soʻrovlarni ushlaydi; boshqa URL — xato. */
function provayderniSoxtala(javoblar: Record<string, unknown>) {
  const urllar: string[] = [];
  globalThis.fetch = (async (kirish: string | URL | Request) => {
    const url = String(kirish);
    urllar.push(url);
    const k = Object.keys(javoblar).find((x) => url.includes(x));
    if (!k) throw new Error(`kutilmagan URL: ${url}`);
    return new Response(JSON.stringify(javoblar[k]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as unknown as typeof fetch;
  return urllar;
}

async function sora(payload: Record<string, unknown>, token: string | null = 'tok') {
  const app = build();
  const res = await app.inject({
    method: 'POST', url: '/xitoy-qidiruv',
    headers: token ? { 'x-sessiya': token } : {},
    payload,
  });
  await app.close();
  return res;
}

describe('/xitoy-qidiruv', () => {
  it('tokensiz 401, provayderga hech narsa ketmaydi', async () => {
    const urllar = provayderniSoxtala({});
    const res = await sora({ productId: 1 }, null);
    expect(res.statusCode).toBe(401);
    expect(urllar).toEqual([]);
  });

  it('kalit yoʻq — izoh bilan, boʻsh roʻyxat "topilmadi" emas', async () => {
    const urllar = provayderniSoxtala({});
    const res = await sora({ productId: 1, rasmUrl: 'https://images.uzum.uz/abc/t_product_540_high.jpg' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ natijalar: [], izoh: expect.stringMatching(/provayder.*kalit/) });
    expect(urllar).toEqual([]);
  });

  it('kalit bor, rasm yoʻq — izoh "rasm kelmadi", provayder chaqirilmaydi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const urllar = provayderniSoxtala({});
    const res = await sora({ productId: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ natijalar: [], izoh: expect.stringMatching(/rasm/i) });
    expect(urllar).toEqual([]);
  });

  it('kalit bor, Uzum rasmi — oʻgirish + qidiruv, natijalar va limit', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const urllar = provayderniSoxtala({ 'convert_url': F.ogirish, 'search/image?': F.muvaffaqiyat });
    const res = await sora({ productId: 1, rasmUrl: 'https://images.uzum.uz/abc/t_product_540_high.jpg' });
    expect(res.statusCode).toBe(200);
    const j = res.json() as { natijalar: unknown[]; manba: string; jami: number; limit: { limit: number; qolgan: number }; keshdan: boolean };
    expect(j.natijalar.length).toBe(2);
    expect(j.manba).toBe('1688');
    expect(j.jami).toBe(680);
    expect(j.keshdan).toBe(false);
    // Baza yoʻq: sanoq RPC null qaytaradi, shunda mahalliy +1 bilan hisoblanadi.
    expect(j.limit.qolgan).toBe(j.limit.limit - 1);
    expect(urllar.filter((u) => u.includes('api.tmapi.top')).length).toBe(2);
    // Kalit javobga sizmaydi.
    expect(res.body).not.toContain('SINOV');
  });

  it('provayder 439 — 502 va xato, boʻsh roʻyxat EMAS', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    provayderniSoxtala({ 'search/image?': F.balans });
    const res = await sora({ productId: 1, rasmUrl: 'https://cbu01.alicdn.com/x.jpg' });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ natijalar: [], xato: expect.stringMatching(/provayder:.*(balans|obuna)/) });
  });

  it('0 ta natija — 200, izoh bilan (bu javob, nosozlik emas)', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    provayderniSoxtala({ 'search/image?': { code: 200, msg: 'success', data: { total_count: 0, items: [] } } });
    const res = await sora({ productId: 1, rasmUrl: 'https://cbu01.alicdn.com/x.jpg' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ natijalar: [], manba: '1688', jami: 0, izoh: expect.stringMatching(/1688/) });
  });
});
