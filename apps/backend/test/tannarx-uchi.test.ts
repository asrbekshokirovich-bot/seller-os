/**
 * `/tannarx` uchi.
 *
 * Uch bazaga tegmaydi — hisob sof. Shuning uchun muhit
 * oʻzgaruvchilari kerak emas, lekin baribir tozalanadi
 * (QOIDALAR.md §8-e): bir marta test haqiqiy bazaga soʻrov
 * yuborib "oʻtdi" degan yolgʻon natija bergan edi.
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

async function soraw(payload: Record<string, unknown>) {
  const app = build();
  const res = await app.inject({ method: 'POST', url: '/tannarx', payload });
  await app.close();
  return res;
}

const TOLIQ = {
  sotuvNarxiSom: 100_000,
  xitoyNarxiYuan: 20,
  kursSomPerYuan: 1_750,
  weightG: 500,
  volumeMl: 2_000,
  kargo: { somPerKg: 30_000, somPerM3: 4_000_000 },
  boj: { bojFoizi: 10, qqsFoizi: 12 },
  komissiyaFoizi: 15,
};

describe('/tannarx', () => {
  it('toʻliq kirishda foyda va marja qaytadi', async () => {
    const res = await soraw(TOLIQ);
    expect(res.statusCode).toBe(200);
    const j = res.json();
    expect(j.olchov_yoq).toBe(false);
    expect(j.sofFoydaSom).toBe(23_400);
    expect(j.kargoAsosi).toBe('ogirlik');
    expect(j.yetishmaydi).toEqual([]);
  });

  it('boʻsh tanada hech narsa toʻqilmaydi — hamma kirish sanaladi', async () => {
    const j = (await soraw({})).json();
    expect(j.olchov_yoq).toBe(true);
    expect(j.sofFoydaSom).toBeNull();
    expect(j.yetishmaydi.length).toBe(10);
  });

  /*
   * `Number("")` NOLGA teng. Boʻsh maydon nolga aylansa, kargo
   * "tekin" boʻlib chiqadi va foyda oshib koʻrinadi — odam zarar
   * keltiradigan tovarni foydali deb sotib olardi.
   */
  it('boʻsh satr NOLGA aylanmaydi', async () => {
    const j = (await soraw({ ...TOLIQ, kargo: { somPerKg: '', somPerM3: '' } })).json();
    expect(j.tannarx.kargo).toBeNull();
    expect(j.sofFoydaSom).toBeNull();
    expect(j.yetishmaydi).toContain('kargo.somPerKg');
  });

  it('matn qiymat ham rad etiladi', async () => {
    const j = (await soraw({ ...TOLIQ, kursSomPerYuan: 'oʻn ming' })).json();
    expect(j.tannarx.xitoyNarxi).toBeNull();
    expect(j.yetishmaydi).toContain('kursSomPerYuan');
  });

  it('raqamli satr qabul qilinadi — forma matn yuboradi', async () => {
    const j = (await soraw({ ...TOLIQ, xitoyNarxiYuan: '20' })).json();
    expect(j.sofFoydaSom).toBe(23_400);
  });

  it('zararli tovarda manfiy foyda yashirilmaydi', async () => {
    const j = (await soraw({ ...TOLIQ, sotuvNarxiSom: 40_000 })).json();
    expect(j.sofFoydaSom).toBeLessThan(0);
    expect(j.olchov_yoq).toBe(false);
  });
});
