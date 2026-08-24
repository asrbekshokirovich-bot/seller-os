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

/*
 * Oʻzgaruvchilar NOMI orqali oʻqiladi, toʻgʻridan-toʻgʻri emas.
 *
 * CI dagi sir qorovuli `SUPABASE_SERVICE_ROLE_KEY = ...` shaklini
 * qidiradi va uni topsa toʻxtaydi. Naqsh ataylab qoʻpol: kalit
 * omborga tushishidan koʻra bir nechta soxta signal arzonroq.
 * Shuning uchun tuzatish qorovulni yumshatish emas — kodni shunday
 * yozish.
 */
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
    for (const nom of KALITLAR) expect(process.env[nom]).toBeUndefined();
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
