/**
 * Xato ishlovchisi.
 *
 * Ilgari uch ichida xato otsa, Fastify 500 qaytarardi va iz faqat
 * jurnalda qolardi. Endi xato Sentry ga ketadi va javobda hodisa
 * raqami boʻladi — foydalanuvchi shu raqamni aytsa, aynan oʻsha
 * xatoni topamiz.
 *
 * ENG MUHIM SHART: kuzatuv mahsulotni yiqitmasligi kerak. Sentry
 * oʻchgan boʻlsa ham foydalanuvchi javob olishi shart.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { build } from '../src/app.js';

const KALITLAR = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SENTRY_DSN'] as const;
const OLDINGI = new Map<string, string | undefined>();

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
});

/** Ataylab yiqiladigan uch — xato ishlovchisini sinash uchun. */
function sinovIlovasi() {
  const app = build();
  app.get('/sinov-yiqilish', async () => {
    throw new Error('ataylab yiqildi');
  });
  return app;
}

describe('xato ishlovchisi', () => {
  it('muhit tozalangan — test tashqi xizmatga tegmaydi', () => {
    expect(process.env.SENTRY_DSN).toBeUndefined();
  });

  it('xato 500 va HODISA RAQAMI bilan qaytadi', async () => {
    const app = sinovIlovasi();
    const res = await app.inject({ method: 'GET', url: '/sinov-yiqilish' });
    await app.close();

    expect(res.statusCode).toBe(500);
    const j = res.json();
    expect(j.xato).toBe('ichki xato');
    expect(j.hodisa).toMatch(/^[0-9a-f]{32}$/);
  });

  /*
   * Xato matni foydalanuvchiga koʻrsatilmaydi: unda fayl yoʻli,
   * jadval nomi yoki ichki tuzilma boʻlishi mumkin.
   */
  it('xatoning ichki matni javobda chiqmaydi', async () => {
    const app = sinovIlovasi();
    const res = await app.inject({ method: 'GET', url: '/sinov-yiqilish' });
    await app.close();
    expect(res.body).not.toContain('ataylab yiqildi');
  });

  it('har xato boshqa raqam oladi', async () => {
    const app = sinovIlovasi();
    const a = (await app.inject({ method: 'GET', url: '/sinov-yiqilish' })).json();
    const b = (await app.inject({ method: 'GET', url: '/sinov-yiqilish' })).json();
    await app.close();
    expect(a.hodisa).not.toBe(b.hodisa);
  });

  /*
   * Sentry manzili YOLGʻON boʻlsa ham javob kelishi kerak.
   * Kuzatuv vositasi mahsulot oqimiga aralashmaydi.
   */
  it('yolgʻon DSN bilan ham javob keladi', async () => {
    process.env.SENTRY_DSN = 'https://kalit@127.0.0.1:1/4507';
    const app = sinovIlovasi();
    const res = await app.inject({ method: 'GET', url: '/sinov-yiqilish' });
    await app.close();
    expect(res.statusCode).toBe(500);
    expect(res.json().hodisa).toMatch(/^[0-9a-f]{32}$/);
  });

  it('ishlaydigan uchlar tegilmaydi', async () => {
    const app = sinovIlovasi();
    const res = await app.inject({ method: 'GET', url: '/health' });
    await app.close();
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });
});
