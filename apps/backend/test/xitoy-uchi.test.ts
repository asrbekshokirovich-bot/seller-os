/**
 * `/xitoy-qidiruv` uchi — Fastify orqali (Edge Function dagi bilan bir xil).
 *
 * Muhit ataylab tozalanadi va tozalangani tekshiriladi (QOIDALAR §8-e).
 * Baza SOXTA: `SUPABASE_URL` sinov manzilga qoʻyiladi va `fetch`
 * `/rest/v1/rpc/<nom>` ni xotiradagi jadval bilan javoblaydi — yaʼni
 * test oʻz shartini oʻzi qoʻyadi, muhitdan meros olmaydi.
 *
 * Eng muhim tekshiruvlar (2026-09-25 tekshiruvidan):
 *   - sanoq kelmasa (baza yoʻq / sessiya notoʻgʻri) provayder CHAQIRILMAYDI —
 *     "nomaʼlum" nol emas;
 *   - band qilish provayderdan OLDIN, yiqilsa qaytariladi;
 *   - provayder yiqilganda boʻsh roʻyxat emas, `xato` bilan 502;
 *   - oʻqilmagan elementlar "topilmadi" boʻlib keshga tushmaydi.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { build } from '../src/app.js';

const F = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/tmapi-1688-rasm.json'), 'utf8')) as {
  muvaffaqiyat: { data: { items: unknown[] } } & Record<string, unknown>; ogirish: unknown; balans: unknown;
};

const KALITLAR = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'XITOY_API_KEY', 'TARIF_CHEKLOVI'] as const;
const OLDINGI = new Map<string, string | undefined>();
const ASL_FETCH = globalThis.fetch;
const BAZA = 'http://soxta.supabase.sinov';
const UZUM_RASM = 'https://images.uzum.uz/abc/t_product_540_high.jpg';

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

interface SoxtaBaza {
  /** `tok` — haqiqiy sessiya; boshqasi "sessiya topilmadi". */
  soni: number;
  jami: number;
  kesh: Record<string, unknown[]>;
  yozilgan: Array<{ hash: string; natijalar: unknown[] }>;
  chaqiruvlar: string[];
  provayder: string[];
}

/**
 * Soxta baza + soxta provayder — bitta `fetch`.
 * `bazaBor=false` — Supabase ga soʻrov umuman ketmaydi (URL yoʻq).
 */
function muhit(provayderJavoblari: Record<string, unknown>, q: { bazaBor?: boolean; soni?: number; jami?: number; kesh?: Record<string, unknown[]> } = {}): SoxtaBaza {
  const b: SoxtaBaza = { soni: q.soni ?? 0, jami: q.jami ?? 0, kesh: q.kesh ?? {}, yozilgan: [], chaqiruvlar: [], provayder: [] };
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
    b.provayder.push(url);
    const k = Object.keys(provayderJavoblari).find((x) => url.includes(x));
    if (!k) throw new Error(`kutilmagan URL: ${url}`);
    return json(provayderJavoblari[k]);
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

const PROVAYDER = { 'convert_url': F.ogirish, 'search/image?': F.muvaffaqiyat };

describe('/xitoy-qidiruv — kirish tekshiruvi', () => {
  it('tokensiz 401, hech qayerga soʻrov ketmaydi', async () => {
    const b = muhit(PROVAYDER);
    const res = await sora({ productId: 1 }, null);
    expect(res.statusCode).toBe(401);
    expect(b.chaqiruvlar).toEqual([]);
    expect(b.provayder).toEqual([]);
  });

  it('rasmUrl http(s) boʻlmasa 400', async () => {
    const b = muhit(PROVAYDER);
    const res = await sora({ productId: 1, rasmUrl: 'javascript:alert(1)' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ xato: expect.stringMatching(/http/) });
    expect(b.provayder).toEqual([]);
  });
});

describe('/xitoy-qidiruv — sanoq OʻLCHOV, nol emas', () => {
  it('baza ulanmagan — 503, provayder chaqirilmaydi (ilgari "0 ishlatilgan" deb oʻtardi)', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit(PROVAYDER, { bazaBor: false });
    const res = await sora({ productId: 1, rasmUrl: UZUM_RASM });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ xato: expect.stringMatching(/limit oʻlchanmadi|baza/) });
    expect(b.provayder).toEqual([]);
  });

  it('notoʻgʻri sessiya — 401, provayder chaqirilmaydi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit(PROVAYDER);
    const res = await sora({ productId: 1, rasmUrl: UZUM_RASM }, 'yomon-token');
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ xato: 'sessiya topilmadi' });
    expect(b.provayder).toEqual([]);
  });

  it('shaxsiy limit tugagan (bepul: 3) — 429, provayder chaqirilmaydi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit(PROVAYDER, { soni: 3 });
    const res = await sora({ productId: 1, rasmUrl: UZUM_RASM });
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ sabab: 'shaxsiy', qolgan: 0 });
    expect(b.provayder).toEqual([]);
  });

  it('umumiy kunlik shift tugagan — 429 "umumiy", provayder chaqirilmaydi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit(PROVAYDER, { soni: 0, jami: 200 });
    const res = await sora({ productId: 1, rasmUrl: UZUM_RASM });
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ xato: expect.stringMatching(/umumiy/), sabab: 'umumiy' });
    expect(b.provayder).toEqual([]);
  });
});

describe('/xitoy-qidiruv — provayder', () => {
  it('kalit yoʻq — izoh bilan, boʻsh roʻyxat "topilmadi" emas', async () => {
    const b = muhit(PROVAYDER);
    const res = await sora({ productId: 1, rasmUrl: UZUM_RASM });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ natijalar: [], izoh: expect.stringMatching(/provayder.*kalit/) });
    expect(b.provayder).toEqual([]);
    expect(b.soni).toBe(0);
  });

  it('kalit bor, rasm yoʻq — izoh "rasm kelmadi", provayder chaqirilmaydi, band qilinmaydi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit(PROVAYDER);
    const res = await sora({ productId: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ natijalar: [], izoh: expect.stringMatching(/rasm/i) });
    expect(b.provayder).toEqual([]);
    expect(b.soni).toBe(0);
  });

  it('Uzum rasmi: band → oʻgirish → qidiruv → kesh; sanoq 1, kalit sizmaydi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit(PROVAYDER);
    const res = await sora({ productId: 1, rasmUrl: UZUM_RASM });
    expect(res.statusCode).toBe(200);
    const j = res.json() as { natijalar: unknown[]; manba: string; jami: number; keshdan: boolean; limit: { qolgan: number; limit: number; umumiy: { ishlatilgan: number } } };
    expect(j.natijalar.length).toBe(2);
    expect(j.manba).toBe('1688');
    expect(j.jami).toBe(680);
    expect(j.keshdan).toBe(false);
    expect(j.limit.qolgan).toBe(j.limit.limit - 1);
    expect(j.limit.umumiy.ishlatilgan).toBe(1);
    // Tartib: sanoq oʻqildi → kesh → BAND → provayder (2 ta) → kesh yozildi.
    const bandIdx = b.chaqiruvlar.indexOf('so_xitoy_limit:oshir');
    expect(bandIdx).toBeGreaterThan(-1);
    expect(b.provayder.length).toBe(2);
    expect(b.yozilgan.length).toBe(1);
    expect(b.yozilgan[0]!.hash).toBe(UZUM_RASM);
    expect(b.soni).toBe(1);
    expect(res.body).not.toContain('SINOV');
    expect(res.body).not.toContain('SOXTA-SERVICE');
  });

  it('kesh bor — provayder chaqirilmaydi, band qilinmaydi, keshdan: true', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit(PROVAYDER, { kesh: { [UZUM_RASM]: [{ sourceId: '1', title: 'Keshdagi', narxYuan: 10, rasmUrl: 'https://cbu01.alicdn.com/a.jpg', moq: 2 }] } });
    const res = await sora({ productId: 1, rasmUrl: UZUM_RASM });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ keshdan: true, natijalar: [{ title: 'Keshdagi' }] });
    expect(b.provayder).toEqual([]);
    expect(b.soni).toBe(0);
  });

  it('provayder 439 — 502 va xato; band QAYTARILADI, kesh yozilmaydi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit({ 'search/image?': F.balans });
    const res = await sora({ productId: 1, rasmUrl: 'https://cbu01.alicdn.com/x.jpg' });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ natijalar: [], xato: expect.stringMatching(/provayder:.*(balans|obuna)/) });
    expect(b.chaqiruvlar).toContain('so_xitoy_limit:oshir');
    expect(b.chaqiruvlar).toContain('so_xitoy_limit:qaytar');
    expect(b.soni).toBe(0);
    expect(b.yozilgan).toEqual([]);
  });

  it('elementlar keldi, birortasi oʻqilmadi — 502, "topilmadi" EMAS, keshga tushmaydi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const asl = F.muvaffaqiyat.data.items[0] as Record<string, unknown>;
    const b = muhit({ 'search/image?': { code: 200, data: { total_count: 680, items: [{ ...asl, price: '', price_info: {} }] } } });
    const res = await sora({ productId: 1, rasmUrl: 'https://cbu01.alicdn.com/x.jpg' });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ xato: expect.stringMatching(/oʻqilmadi/) });
    expect(b.yozilgan).toEqual([]);
    expect(b.soni).toBe(0);
  });

  it('0 ta natija — 200, izoh bilan (bu javob): keshga yoziladi, sanoq 1', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit({ 'search/image?': { code: 200, msg: 'success', data: { total_count: 0, items: [] } } });
    const res = await sora({ productId: 1, rasmUrl: 'https://cbu01.alicdn.com/x.jpg' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ natijalar: [], manba: '1688', jami: 0, izoh: expect.stringMatching(/1688/) });
    expect(b.yozilgan.length).toBe(1);
    expect(b.soni).toBe(1);
  });

  it('band qilish rad etilsa (poyga: boshqa soʻrov oldin oldi) — 429, provayder chaqirilmaydi', async () => {
    process.env.XITOY_API_KEY = 'SINOV';
    const b = muhit(PROVAYDER, { soni: 2 });
    // Birinchi oʻqishda 2 < 3 — oʻtadi; band qilishda soxta baza 3 ga yetgan deb rad etadi.
    const asl = b.soni;
    globalThis.fetch = ((f) => (async (kirish: string | URL | Request, init?: RequestInit) => {
      const url = String(kirish);
      if (url.endsWith('/so_xitoy_limit') && String(init?.body ?? '').includes('"p_oshir":true')) b.soni = 3;
      return f(kirish, init);
    }) as unknown as typeof fetch)(globalThis.fetch);
    const res = await sora({ productId: 1, rasmUrl: UZUM_RASM });
    expect(res.statusCode).toBe(429);
    expect(b.provayder).toEqual([]);
    expect(asl).toBe(2);
  });
});
