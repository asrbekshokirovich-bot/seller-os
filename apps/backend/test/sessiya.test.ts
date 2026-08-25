/**
 * Sessiya va profil uchlari.
 *
 * Eng muhim tekshiruv — TOKENSIZ soʻrov profilga tegmasligi.
 * Sessiya tokeni yagona himoya: u boʻlmasa yoki notoʻgʻri boʻlsa,
 * uch boshqa odamning javoblarini bermasligi kerak.
 *
 * Muhit oʻzgaruvchilari ataylab tozalanadi (QOIDALAR.md §8-e).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { build } from '../src/app.js';

const KALITLAR = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
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

async function soraw(
  method: 'GET' | 'POST',
  url: string,
  sarlavha: Record<string, string> = {},
  payload?: Record<string, unknown>,
) {
  const app = build();
  const res = await app.inject(
    payload === undefined
      ? { method, url, headers: sarlavha }
      : { method, url, headers: sarlavha, payload },
  );
  await app.close();
  return res;
}

describe('/profil — tokensiz', () => {
  it('GET tokensiz 401', async () => {
    const res = await soraw('GET', '/profil');
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ xato: expect.stringContaining('token') });
  });

  it('POST tokensiz 401 — javob SAQLANMAYDI', async () => {
    const res = await soraw('POST', '/profil', {}, { profil: { city: 'Toshkent' } });
    expect(res.statusCode).toBe(401);
  });

  it('boʻsh token ham rad etiladi', async () => {
    // `''` — mavjud sarlavha, lekin qiymatsiz. Uni "bor" deb
    // qabul qilsak, bazaga boʻsh token bilan soʻrov ketardi.
    const res = await soraw('GET', '/profil', { 'x-sessiya': '' });
    expect(res.statusCode).toBe(401);
  });
});

describe('/sessiya', () => {
  it('baza ulanmagan boʻlsa 503 — jimgina boʻsh token bermaydi', async () => {
    // Boʻsh token qaytarsak, mijoz uni haqiqiy deb saqlab qoʻyardi
    // va keyingi har soʻrov 401 bilan qaytardi. Sabab esa
    // koʻrinmasdi.
    const res = await soraw('POST', '/sessiya', {}, {});
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ xato: expect.any(String) });
  });
});
