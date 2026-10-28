/**
 * `/hisob` va `/hisob-voronka` uchlari — bosh sahifa hisoblagichi (0076; nazoratchi,
 * 2026-10-28: «hisoblagich qoʻy»). Edge (`supabase/functions/selleros/index.ts`) xuddi shu
 * `shared/hisob.ts` ni chaqiradi.
 *
 * NEGA BU MUHIM. Hisoblagich ISMSIZ: uch sessiyasiz ochiq, bazaga faqat bosqich nomi va sinov
 * belgisi boradi. Tanada nima kelsa ham (matn, telefon) — bazaga ketmaydi. Begona nom esa
 * bazaga umuman yetmaydi.
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

type Chaqiruv = { nom: string; arg: Record<string, unknown> };

/** Bazani oʻrniga qoʻyamiz va RPC ga ketgan argumentlarni ushlaymiz. */
function bazaniQoy(javob: unknown) {
  const chaqiruvlar: Chaqiruv[] = [];
  process.env.SUPABASE_URL = 'https://soxta.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'soxta-kalit';
  globalThis.fetch = vi.fn(async (url: unknown, sozlama: unknown) => {
    const s = sozlama as { body?: string };
    chaqiruvlar.push({ nom: String(url).split('/rpc/')[1] ?? '', arg: JSON.parse(s.body ?? '{}') });
    return new Response(JSON.stringify(javob), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as unknown as typeof fetch;
  return chaqiruvlar;
}

describe('POST /hisob', () => {
  it('sessiyasiz ishlaydi; bazaga faqat nom va sinov belgisi boradi', async () => {
    const c = bazaniQoy({ ok: true });
    const app = build();
    const r = await app.inject({
      method: 'POST', url: '/hisob',
      payload: { nom: 'bosh_ochildi', sinov: true, matn: 'Aziz, 90 123 45 67' },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ ok: true });
    expect(c).toEqual([{ nom: 'so_hisob_yoz', arg: { p_nom: 'bosh_ochildi', p_sinov: true } }]);
    await app.close();
  });

  it('begona nom — 400, bazaga yetmaydi', async () => {
    const c = bazaniQoy({ ok: true });
    const app = build();
    const r = await app.inject({ method: 'POST', url: '/hisob', payload: { nom: 'javob_baho' } });
    expect(r.statusCode).toBe(400);
    expect(c).toHaveLength(0);
    await app.close();
  });

  it('baza sozlanmagan — 503 (yozildi deb aytilmaydi)', async () => {
    const app = build();
    const r = await app.inject({ method: 'POST', url: '/hisob', payload: { nom: 'bosh_ochildi' } });
    expect(r.statusCode).toBe(503);
    await app.close();
  });
});

describe('GET /hisob-voronka', () => {
  it('davr soʻrovdan; javob — bazadagi sanoq', async () => {
    const v = { kun: 7, boshlandi: '2026-10-28', sinov: 0, kunlar: [] };
    const c = bazaniQoy(v);
    const app = build();
    const r = await app.inject({ method: 'GET', url: '/hisob-voronka?kun=7' });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ olchov_yoq: false, voronka: v });
    expect(c).toEqual([{ nom: 'so_hisob_voronka', arg: { p_kun: 7 } }]);
    await app.close();
  });

  it('davr berilmasa — 14; baza sozlanmagan — oʻlchanmadi, nol emas', async () => {
    const c = bazaniQoy({});
    const app = build();
    await app.inject({ method: 'GET', url: '/hisob-voronka' });
    expect(c[0]!.arg).toEqual({ p_kun: 14 });
    await app.close();

    delete process.env.SUPABASE_URL;
    const app2 = build();
    const r = await app2.inject({ method: 'GET', url: '/hisob-voronka' });
    expect(r.statusCode).toBe(503);
    expect(r.json()).toEqual({ olchov_yoq: true, sabab: 'baza javob bermadi' });
    await app2.close();
  });
});
