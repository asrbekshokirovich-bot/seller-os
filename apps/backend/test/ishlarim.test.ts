/**
 * «Ishlarim» (ikkinchi koʻrik K2, 0083) — Fastify uchlari Edge bilan bir xil javob beradi.
 *
 * Sof qism (`ishlarimOqi`, `ishHolatiniYoz`, `ishNomi`) — `packages/shared/test/ishlarim.test.ts`;
 * SQL — `supabase/test/ishlarim.test.ts` (PGlite). Bu yerda: tokensiz — 401, baza ulanmagan — 503
 * (boʻsh roʻyxat EMAS), notoʻgʻri belgi — 400 va bazaga bormaydi.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { build } from '../src/app.js';

describe('/ishlarim uchi — Fastify', () => {
  const KALITLAR = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
  const OLDINGI = new Map<string, string | undefined>();
  beforeEach(() => { for (const k of KALITLAR) { OLDINGI.set(k, process.env[k]); delete process.env[k]; } });
  afterEach(() => { for (const k of KALITLAR) { const e = OLDINGI.get(k); if (e === undefined) delete process.env[k]; else process.env[k] = e; } });

  async function sora(method: 'GET' | 'POST', sarlavha: Record<string, string> = {}, payload?: Record<string, unknown>) {
    const app = build();
    const res = await app.inject({ method, url: '/ishlarim', headers: sarlavha, ...(payload ? { payload } : {}) });
    await app.close();
    return res;
  }

  it('tokensiz — 401 (roʻyxat ham, belgi ham)', async () => {
    expect((await sora('GET')).statusCode).toBe(401);
    expect((await sora('POST', {}, { id: 1, bajarildi: true })).statusCode).toBe(401);
  });

  it('baza ulanmagan — 503 «baza javob bermadi» (boʻsh roʻyxat EMAS)', async () => {
    const r = await sora('GET', { 'x-sessiya': 'sinov' });
    expect(r.statusCode).toBe(503);
    expect(r.json()).toEqual({ xato: 'baza javob bermadi' });
    expect((await sora('POST', { 'x-sessiya': 'sinov' }, { id: 1, bajarildi: true })).statusCode).toBe(503);
  });

  it('notoʻgʻri belgi — 400 (bazaga bormasdan)', async () => {
    for (const tana of [{ id: 'bir', bajarildi: true }, { id: 1 }, { id: 0, bajarildi: false }]) {
      const r = await sora('POST', { 'x-sessiya': 'sinov' }, tana);
      expect(r.statusCode).toBe(400);
      expect(r.json()).toEqual({ xato: 'id va bajarildi kerak' });
    }
  });
});
