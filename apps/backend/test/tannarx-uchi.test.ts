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
    // 23 400 emas: Uzum marketpleys logistikasi (5 500) ham
    // chiqariladi. Eski raqam shu xarajatni tashlab ketgani uchun
    // foydani OSHIB koʻrsatardi.
    expect(j.sofFoydaSom).toBe(23_400 - 5_500);
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
    expect(j.sofFoydaSom).toBe(23_400 - 5_500);
  });

  it('zararli tovarda manfiy foyda yashirilmaydi', async () => {
    const j = (await soraw({ ...TOLIQ, sotuvNarxiSom: 40_000 })).json();
    expect(j.sofFoydaSom).toBeLessThan(0);
    expect(j.olchov_yoq).toBe(false);
  });
});

/**
 * 3-tuzoq (demping) — uchga ulandi.
 *
 * Filtr yozilgan, sinalgan va hujjatlangan edi, lekin ishlab
 * chiqarish kodi uni HECH QACHON chaqirmasdi. Bu B1 tekshiruvi
 * ochgan naqshning uchinchi marta takrorlanishi: kutubxona
 * toʻgʻri, mahsulot esa yoʻq.
 */
describe('/tannarx — demping filtri', () => {
  it('marja yetarli boʻlsa bayroq yoʻq', async () => {
    const j = (await soraw(TOLIQ)).json();
    // TOʻLIQ da marja 23.4% — chegaradan yuqori.
    expect(j.demping.bayroq).toBeNull();
    expect(j.demping.baholanmadi).toBeNull();
  });

  it('zarariga sotilsa BLOCK qaytadi', async () => {
    const j = (await soraw({ ...TOLIQ, sotuvNarxiSom: 40_000 })).json();
    expect(j.demping.bayroq).toMatchObject({ kind: 'dumping', severity: 'block' });
    expect(j.demping.bayroq.reason).toMatch(/zarar/i);
  });

  /*
   * Maʼlumot yetmasa JIM QOLMAYDI. "Demping yoʻq" deb koʻrsatish
   * tekshirilmagan daʼvo boʻlardi — va u aynan eng xavfli
   * tovarlarda chiqardi.
   */
  it('kirish yetmasa nima yetishmagani aytiladi', async () => {
    const j = (await soraw({})).json();
    expect(j.demping.bayroq).toBeNull();
    expect(j.demping.baholanmadi).toContain('sotuvNarxi');
  });
});

/**
 * Uzum MARKETPLEYS logistikasi — ilgari hisobda umuman yoʻq edi.
 *
 * Bu `kargo` dan boshqa xarajat: kargo Xitoydan omborgacha, bu esa
 * ombordan XARIDORGACHA. Uni tashlab qoʻyganimiz uchun har bir
 * marja 5 250 — 50 000 soʻmga OSHIB koʻrsatilardi — yaʼni
 * foydasiz tovar foydali boʻlib chiqardi.
 *
 * Tarif: seller.uzum.uz/manual/uz/3.tariffs, 2026-06-01 dan.
 */
describe('/tannarx — Uzum logistika yigʻimi', () => {
  it('1 litrgacha — 5 250 soʻm', async () => {
    const j = (await soraw({ ...TOLIQ, volumeMl: 900 })).json();
    expect(j.tannarx.uzumLogistika).toBe(5_250);
  });

  it('har qoʻshimcha litr — 250 soʻm', async () => {
    // 2 000 ml = 2 litr → 5 250 + 250
    const j = (await soraw({ ...TOLIQ, volumeMl: 2_000 })).json();
    expect(j.tannarx.uzumLogistika).toBe(5_500);
  });

  it('boʻlmagan litr yuqoriga yaxlitlanadi', async () => {
    // 1 001 ml ham 2 litr deb sanaladi.
    const j = (await soraw({ ...TOLIQ, volumeMl: 1_001 })).json();
    expect(j.tannarx.uzumLogistika).toBe(5_500);
  });

  it('yuqori chegara 50 000 soʻm', async () => {
    const j = (await soraw({ ...TOLIQ, volumeMl: 900_000 })).json();
    expect(j.tannarx.uzumLogistika).toBe(50_000);
  });

  /*
   * Uzum qoidasida "oʻlchamsiz tovar — 50 000 soʻm" bandi bor,
   * lekin u sotuvchi oʻlchamni koʻrsatmagani uchun JARIMA. Bizning
   * hisobimizda hajm nomaʼlum boʻlsa javob "bilmayman" boʻlishi
   * kerak: eng yomon holatni taxmin qilsak, foydali tovar zararli
   * boʻlib chiqardi.
   */
  it('hajm oʻlchanmagan boʻlsa — `null`, 50 000 EMAS', async () => {
    const j = (await soraw({ ...TOLIQ, volumeMl: null })).json();
    expect(j.tannarx.uzumLogistika).toBeNull();
    expect(j.yetishmaydi).toContain('volumeMl');
  });

  it('yigʻim foydadan CHIQARILADI', async () => {
    const bilan = (await soraw({ ...TOLIQ, volumeMl: 900 })).json();
    // 900 ml = 1 litr → 5 250.
    expect(bilan.sofFoydaSom).toBe(23_400 - 5_250);
  });
});
