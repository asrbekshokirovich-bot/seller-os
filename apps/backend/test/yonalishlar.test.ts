/**
 * `/yonalishlar` — 2-qadam uchi.
 *
 * Eng muhim tekshiruv bitta: baza ulanmagan boʻlsa uch BOʻSH ROʻYXAT
 * qaytarmasligi kerak. Boʻsh roʻyxat "sizga mos yoʻnalish yoʻq" degan
 * daʼvo, ulanmaganlik esa "bilmayman" — bu ikki xil javob va
 * foydalanuvchi uchun farqi katta (QOIDALAR.md, 4-qoida).
 *
 * SUPABASE_* oʻzgaruvchilari test ichida ATAYLAB tozalanadi.
 *
 * Birinchi variant buni qilmagan edi va test "oʻtdi" — lekin
 * ulanmagani uchun emas, muhitdagi kalitlar BOSHQA loyihaga ishora
 * qilgani uchun: soʻrov 404 olgan va uch "baza javob bermadi" degan.
 * Yaʼni test oʻzi tekshiraman degan narsani tekshirmagan va toʻgʻri
 * ulangan muhitda yiqilardi. Testni muhitga bogʻlab qoʻyish —
 * yashirin nosozlikning eng koʻp uchraydigan yoʻli.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { build } from '../src/app.js';

const OLDINGI = {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

beforeEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

afterEach(() => {
  if (OLDINGI.url === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = OLDINGI.url;
  if (OLDINGI.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = OLDINGI.key;
});

async function sora(tana?: Record<string, unknown>) {
  const app = build();
  // `exactOptionalPropertyTypes` yoqilgan: `payload: undefined`
  // uzatib boʻlmaydi, maydonning oʻzi boʻlmasligi kerak.
  const res = await app.inject(
    tana === undefined
      ? { method: 'POST', url: '/yonalishlar' }
      : { method: 'POST', url: '/yonalishlar', payload: tana },
  );
  await app.close();
  return res;
}

describe('/yonalishlar', () => {
  it('muhit haqiqatan tozalangan — test oʻz shartini oʻzi qoʻyadi', () => {
    expect(process.env.SUPABASE_URL).toBeUndefined();
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  it('baza ulanmagan boʻlsa OʻLCHOV YOʻQ deydi, boʻsh roʻyxat emas', async () => {
    const res = await sora({ profil: {} });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ olchov_yoq: true });
    expect(res.json().royxat).toBeUndefined();
  });

  it('tanasiz soʻrov ham yiqilmaydi', async () => {
    const res = await sora();
    expect(res.statusCode).toBe(200);
  });

  it('notoʻgʻri profil maydonlari xatoga olib kelmaydi', async () => {
    // Forma har qanday axlatni yuborishi mumkin; `profilOqi` uni
    // `null` ga aylantiradi, uch esa 500 bermasligi kerak.
    const res = await sora({ profil: { budgetUzs: 'ha', experience: 7, city: 42 } });
    expect(res.statusCode).toBe(200);
  });
});
