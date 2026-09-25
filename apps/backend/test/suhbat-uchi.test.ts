/**
 * `/suhbat` uchi — Fastify orqali.
 *
 * Eng muhim tekshiruv — TOKENSIZ soʻrov hech narsaga tegmasligi.
 * Muhit oʻzgaruvchilari ataylab tozalanadi va tozalangani
 * tekshiriladi (QOIDALAR.md §8-e): baza YOʻQ holatda uch "baza javob
 * bermadi" deyishi kerak, boʻsh roʻyxat emas.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { build } from '../src/app.js';

const KALITLAR = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY'] as const;
const OLDINGI = new Map<string, string | undefined>();

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
});

async function soraw(
  method: 'GET' | 'POST',
  sarlavha: Record<string, string> = {},
  payload?: Record<string, unknown>,
) {
  const app = build();
  const res = await app.inject(
    payload === undefined
      ? { method, url: '/suhbat', headers: sarlavha }
      : { method, url: '/suhbat', headers: sarlavha, payload },
  );
  await app.close();
  return res;
}

describe('/suhbat — tokensiz', () => {
  it('GET tokensiz 401', async () => {
    const res = await soraw('GET');
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ xato: expect.stringMatching(/token/) });
  });
  it('POST tokensiz 401 va hech narsa yozilmaydi', async () => {
    const res = await soraw('POST', {}, { savolId: 'byudjet', javob: 1 });
    expect(res.statusCode).toBe(401);
  });
});

describe('/suhbat — baza ulanmagan', () => {
  it('GET token bilan → 503 "baza javob bermadi", boʻsh roʻyxat EMAS', async () => {
    const res = await soraw('GET', { 'x-sessiya': 'sinov-token' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ xato: 'baza javob bermadi' });
  });
  it('POST token bilan → 503, xabarlar boʻsh, yozildi false', async () => {
    const res = await soraw('POST', { 'x-sessiya': 'sinov-token' }, { savolId: 'byudjet', javob: 5_000_000 });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ xato: 'baza javob bermadi', xabarlar: [], yozildi: false });
  });
});
