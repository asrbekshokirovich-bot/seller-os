/**
 * `/xitoy-qidiruv` uchi — Fastify orqali (Edge Function dagi bilan bir xil).
 *
 * ASINXRON: `{rasmUrl}` — yurishni boshlaydi (202 + runId); `{runId, rasmUrl}`
 * — tekshiradi (202 kutilmoqda / 200 natija / 502 xato). Provayder
 * (Apify) 30–90 s ishlaydi, chaqiruvchi shu uchni qayta-qayta soʻraydi.
 *
 * Muhit ataylab tozalanadi va tozalangani tekshiriladi (QOIDALAR §8-e).
 * Baza SOXTA: `SUPABASE_URL` sinov manzilga qoʻyiladi va `fetch`
 * `/rest/v1/rpc/<nom>` ni xotiradagi jadval bilan javoblaydi; Apify ham
 * soxta (holatni test boshqaradi).
 *
 * Eng muhim tekshiruvlar (2026-09-25 tekshiruvidan):
 *   - sanoq kelmasa (baza yoʻq / sessiya notoʻgʻri) provayder CHAQIRILMAYDI;
 *   - band qilish yurish boshlanishidan OLDIN, yiqilsa qaytariladi;
 *   - RISK_CONTROL / oʻqilmagan kartalar — 502 + qaytarish, keshga tushmaydi;
 *   - 0 ta — javob (200, izoh, keshlanadi).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { build } from '../src/app.js';

const F = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/apify-1688-rasm.json'), 'utf8')) as {
  boshlandi: unknown; ishlayapti: unknown; tugadi: unknown; yiqildi: unknown;
  kalit_notogri: unknown; balans: unknown; natijalar: unknown[];
};

const KALITLAR = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'XITOY_API_KEY', 'TARIF_CHEKLOVI'] as const;
const OLDINGI = new Map<string, string | undefined>();
const ASL_FETCH = globalThis.fetch;
const BAZA = 'http://soxta.supabase.sinov';
const UZUM_A = 'https://images.uzum.uz/aaa/t_product_540_high.jpg';
const UZUM_B = 'https://images.uzum.uz/bbb/original.jpg';
const UZUM_C = 'https://images.uzum.uz/ccc/original.jpg';
const RUN = 'HG7ML7M8z78YcAPEB';

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

interface Soxta {
  soni: number;
  jami: number;
  kesh: Record<string, unknown[]>;
  yozilgan: Array<{ hash: string; natijalar: unknown[] }>;
  chaqiruvlar: string[];
  provayder: string[];
  /** Apify soxtasi: holat javobi va boshlash javobi. */
  apify: { boshlash: unknown; holat: unknown; natijalar: unknown };
  /** Yurish boshlash tanasi (imagesBase64 / imageUrls) va CDN yuklashlari. */
  yurishTanasi: Record<string, unknown> | null;
  cdn: string[];
}

function muhit(q: { bazaBor?: boolean; soni?: number; jami?: number; kesh?: Record<string, unknown[]>; apify?: Partial<Soxta['apify']> } = {}): Soxta {
  const b: Soxta = {
    soni: q.soni ?? 0, jami: q.jami ?? 0, kesh: q.kesh ?? {}, yozilgan: [], chaqiruvlar: [], provayder: [],
    apify: { boshlash: F.boshlandi, holat: F.ishlayapti, natijalar: F.natijalar, ...(q.apify ?? {}) },
    yurishTanasi: null, cdn: [],
  };
  if (q.bazaBor !== false) {
    process.env.SUPABASE_URL = BAZA;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'SOXTA-SERVICE';
  }
  globalThis.fetch = (async (kirish: string | URL | Request, init?: RequestInit) => {
    const url = String(kirish);
    const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json' } });
    if (url.startsWith(BAZA)) {
      const nom = url.slice(url.lastIndexOf('/') + 1);
      const tana = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
      b.chaqiruvlar.push(nom + (tana.p_oshir === true ? ':oshir' : tana.p_qaytar === true ? ':qaytar' : ''));
      if (nom === 'so_obuna') return json({ obuna: null });
      if (nom === 'so_xitoy_limit') {
        if (tana.p_token !== 'tok') return json({ xato: 'sessiya topilmadi' });
        if (tana.p_qaytar === true) { b.soni = Math.max(0, b.soni - 1); b.jami = Math.max(0, b.jami - 1); return json({ soni: b.soni, jami: b.jami, ruxsat: true }); }
        if (tana.p_oshir === true) {
          const lim = tana.p_limit as number | null | undefined;
          const um = tana.p_umumiy_limit as number | null | undefined;
          if ((typeof um === 'number' && b.jami >= um) || (typeof lim === 'number' && b.soni >= lim)) return json({ soni: b.soni, jami: b.jami, ruxsat: false });
          b.soni += 1; b.jami += 1;
          return json({ soni: b.soni, jami: b.jami, ruxsat: true });
        }
        return json({ soni: b.soni, jami: b.jami, ruxsat: true });
      }
      if (nom === 'so_xitoy_kesh_ol') {
        const k = b.kesh[String(tana.p_rasm_hash)];
        return json(k ? { topildi: true, natijalar: k, manba: '1688' } : { topildi: false });
      }
      if (nom === 'so_xitoy_kesh_yoz') { b.yozilgan.push({ hash: String(tana.p_rasm_hash), natijalar: tana.p_natijalar as unknown[] }); return json({ id: 1 }); }
      return json({ xato: `soxta bazada yoʻq: ${nom}` }, 404);
    }
    if (url.includes('api.apify.com')) {
      b.provayder.push(url);
      if (url.endsWith('/runs')) { b.yurishTanasi = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>; return json(b.apify.boshlash, 201); }
      if (url.includes('/dataset/items')) return json(b.apify.natijalar);
      if (url.includes('/actor-runs/')) return json(b.apify.holat);
    }
    // Uzum CDN: rasm baytlari (WebP) — uch uni yuklab base64 qiladi.
    if (url.startsWith('https://images.uzum.uz/')) {
      b.cdn.push(url);
      return new Response(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20]), { status: 200, headers: { 'Content-Type': 'image/webp' } });
    }
    throw new Error(`kutilmagan URL: ${url}`);
  }) as unknown as typeof fetch;
  return b;
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

describe('/xitoy-qidiruv — kirish tekshiruvi', () => {
  it('tokensiz 401, hech qayerga soʻrov ketmaydi', async () => {
    const b = muhit();
    const res = await sora({ productId: 1 }, null);
    expect(res.statusCode).toBe(401);
    expect(b.chaqiruvlar).toEqual([]);
    expect(b.provayder).toEqual([]);
  });
  it('rasmUrl http(s) boʻlmasa 400; runId shakli buzuq boʻlsa 400', async () => {
    const b = muhit();
    expect((await sora({ productId: 1, rasmUrl: 'javascript:alert(1)' })).statusCode).toBe(400);
    expect((await sora({ runId: 'x y/../z', rasmUrl: UZUM_A })).statusCode).toBe(400);
    expect(b.provayder).toEqual([]);
  });
});

describe('/xitoy-qidiruv — sanoq OʻLCHOV, nol emas', () => {
  it('baza ulanmagan — 503, provayder chaqirilmaydi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit({ bazaBor: false });
    const res = await sora({ productId: 1, rasmUrl: UZUM_A });
    expect(res.statusCode).toBe(503);
    expect(b.provayder).toEqual([]);
  });
  it('notoʻgʻri sessiya — 401, provayder chaqirilmaydi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit();
    const res = await sora({ productId: 1, rasmUrl: UZUM_A }, 'yomon-token');
    expect(res.statusCode).toBe(401);
    expect(b.provayder).toEqual([]);
  });
  it('shaxsiy limit tugagan (bepul: 3) — 429', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit({ soni: 3 });
    const res = await sora({ productId: 1, rasmUrl: UZUM_A });
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ sabab: 'shaxsiy', qolgan: 0 });
    expect(b.provayder).toEqual([]);
  });
  it('umumiy kunlik shift tugagan — 429 "umumiy"', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit({ jami: 200 });
    const res = await sora({ productId: 1, rasmUrl: UZUM_A });
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ sabab: 'umumiy' });
    expect(b.provayder).toEqual([]);
  });
});

describe('/xitoy-qidiruv — boshlash', () => {
  it('kalit yoʻq — izoh bilan 200, band qilinmaydi', async () => {
    const b = muhit();
    const res = await sora({ productId: 1, rasmUrl: UZUM_A });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ natijalar: [], izoh: expect.stringMatching(/provayder.*kalit/) });
    expect(b.soni).toBe(0);
  });
  it('rasm yoʻq — izoh "rasm kelmadi", provayder chaqirilmaydi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit();
    const res = await sora({ productId: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ natijalar: [], izoh: expect.stringMatching(/rasm/i) });
    expect(b.provayder).toEqual([]);
  });
  it('kesh bor — darhol 200 keshdan, provayder va band yoʻq', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit({ kesh: { [UZUM_A]: [{ sourceId: '1', title: 'Keshdagi', narxYuan: 10, rasmUrl: null, moq: 2 }] } });
    const res = await sora({ productId: 1, rasmUrl: UZUM_A });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ keshdan: true, natijalar: [{ title: 'Keshdagi' }] });
    expect(b.provayder).toEqual([]);
    expect(b.soni).toBe(0);
  });
  it('yurish boshlanadi: rasm CDN dan yuklanib base64 bilan ketadi; 202 + runId, band 1, kesh yozilmaydi, kalit sizmaydi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit();
    const res = await sora({ productId: 1, rasmUrl: UZUM_A });
    expect(res.statusCode).toBe(202);
    expect(res.json()).toMatchObject({ kutilmoqda: true, runId: RUN, rasmUrl: UZUM_A, usul: 'base64', rasmTuri: 'webp', rasmBayt: 16, izoh: expect.stringMatching(/qidirilmoqda/) });
    expect(b.cdn).toEqual([UZUM_A]);
    expect((b.yurishTanasi?.imagesBase64 as unknown[]).length).toBe(1);
    expect(b.yurishTanasi?.imageUrls).toBeUndefined();
    expect(b.provayder.length).toBe(1);
    expect(b.provayder[0]).toMatch(/\/runs$/);
    expect(b.chaqiruvlar.indexOf('so_xitoy_limit:oshir')).toBeGreaterThan(-1);
    expect(b.soni).toBe(1);
    expect(b.yozilgan).toEqual([]);
    expect(res.body).not.toContain('SINOV');
    expect(res.body).not.toContain('SOXTA-SERVICE');
  });
  it('boshlash yiqilsa (balans) — 502, band QAYTARILADI', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit({ apify: { boshlash: F.balans } });
    const res = await sora({ productId: 1, rasmUrl: UZUM_A });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ xato: expect.stringMatching(/provayder:.*balans/) });
    expect(b.chaqiruvlar).toContain('so_xitoy_limit:qaytar');
    expect(b.soni).toBe(0);
  });
  it('band rad etilsa (poyga) — 429, provayder chaqirilmaydi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit({ soni: 2 });
    globalThis.fetch = ((f) => (async (kirish: string | URL | Request, init?: RequestInit) => {
      if (String(kirish).endsWith('/so_xitoy_limit') && String(init?.body ?? '').includes('"p_oshir":true')) b.soni = 3;
      return f(kirish, init);
    }) as unknown as typeof fetch)(globalThis.fetch);
    const res = await sora({ productId: 1, rasmUrl: UZUM_A });
    expect(res.statusCode).toBe(429);
    expect(b.provayder).toEqual([]);
  });
});

describe('/xitoy-qidiruv — tekshirish (runId)', () => {
  it('RUNNING — 202 kutilmoqda, sanoq oʻzgarmaydi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit({ soni: 1 });
    const res = await sora({ runId: RUN, rasmUrl: UZUM_A });
    expect(res.statusCode).toBe(202);
    expect(res.json()).toMatchObject({ kutilmoqda: true, runId: RUN, runHolati: 'RUNNING' });
    expect(b.soni).toBe(1);
    expect(b.yozilgan).toEqual([]);
  });
  it('SUCCEEDED, natija bor — 200, oʻxshashlik tartibida, keshga yoziladi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit({ soni: 1, apify: { holat: F.tugadi } });
    const res = await sora({ runId: RUN, rasmUrl: UZUM_A });
    expect(res.statusCode).toBe(200);
    const j = res.json() as { natijalar: Array<{ sourceId: string }>; manba: string; jami: number; keshdan: boolean; limit: { qolgan: number } };
    expect(j.natijalar.map((t) => t.sourceId)).toEqual(['692120494348', '802207808750']);
    expect(j.manba).toBe('1688');
    expect(j.jami).toBe(2);
    expect(j.keshdan).toBe(false);
    expect(j.limit.qolgan).toBe(2);
    expect(b.yozilgan).toEqual([{ hash: UZUM_A, natijalar: expect.any(Array) }]);
    expect(b.soni).toBe(1);
  });
  it('SUCCEEDED, RISK_CONTROL — 502 xato, band qaytariladi, kesh yozilmaydi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit({ soni: 1, apify: { holat: F.tugadi } });
    const res = await sora({ runId: RUN, rasmUrl: UZUM_B });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ natijalar: [], xato: expect.stringMatching(/RISK_CONTROL/) });
    expect(b.soni).toBe(0);
    expect(b.yozilgan).toEqual([]);
  });
  it('SUCCEEDED, 0 ta — 200 izoh + tashxis bilan (javob), keshlanadi, band qoladi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit({ soni: 1, apify: { holat: F.tugadi } });
    const res = await sora({ runId: RUN, rasmUrl: UZUM_C });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ natijalar: [], manba: '1688', jami: 0, tashxis: 'rasm: webp, 195 KB, yuklandi: direct, URL', izoh: expect.stringMatching(/1688 .*webp/) });
    expect(b.yozilgan.length).toBe(1);
    expect(b.soni).toBe(1);
  });
  it('FAILED — 502, band qaytariladi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit({ soni: 1, apify: { holat: F.yiqildi } });
    const res = await sora({ runId: RUN, rasmUrl: UZUM_A });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ xato: expect.stringMatching(/FAILED/), qaytaUrinish: false });
    expect(b.soni).toBe(0);
  });
  it('holat soʻrovi tarmoqda yiqilsa — 502 "qaytaUrinish", band QAYTARILMAYDI', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit({ soni: 1 });
    globalThis.fetch = ((f) => (async (kirish: string | URL | Request, init?: RequestInit) => {
      if (String(kirish).includes('/actor-runs/')) throw new Error('ETIMEDOUT');
      return f(kirish, init);
    }) as unknown as typeof fetch)(globalThis.fetch);
    const res = await sora({ runId: RUN, rasmUrl: UZUM_A });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ qaytaUrinish: true });
    expect(b.soni).toBe(1);
  });
});

describe('/xitoy-qidiruv — rasm yuklanmasa', () => {
  it('CDN 404 bersa yurish URL bilan boshlanadi (usul: url), rostini aytadi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit();
    globalThis.fetch = ((f) => (async (kirish: string | URL | Request, init?: RequestInit) => {
      if (String(kirish).startsWith('https://images.uzum.uz/')) return new Response('yoq', { status: 404 });
      return f(kirish, init);
    }) as unknown as typeof fetch)(globalThis.fetch);
    const res = await sora({ productId: 1, rasmUrl: UZUM_A });
    expect(res.statusCode).toBe(202);
    expect(res.json()).toMatchObject({ usul: 'url', rasmTuri: null });
    expect(b.yurishTanasi?.imageUrls).toEqual([UZUM_A]);
    expect(b.yurishTanasi?.imagesBase64).toBeUndefined();
  });
});
