/**
 * Faktlar — odam kiritadigan bilim (0056).
 *
 * Kargo stavkasi: boʻsh boʻlsa "kiritilmagan" (nol emas), bor boʻlsa USD
 * kursi bilan soʻmga oʻgiriladi, arzon yoʻl tanlanadi, bir dona uchun
 * kargo ogʻirlik (va boʻlsa hajm) boʻyicha chiqadi. Tarmoqqa chiqilmaydi.
 */

import { describe, expect, it } from 'vitest';
import {
  arzonYol, faktlarniOqi, faktMatn, faktSon, KARGO_KALITLARI, kargoSomBirDona, kargoStavkasi,
} from '@selleros/shared';

const QATOR = { birlik: null, manba: null, olchandi: null, izoh: null };
/** 0056 dan keyingi holat: hamma kargo kaliti bor, qiymati NULL. */
const BOSH = Object.fromEntries(KARGO_KALITLARI.map((k) => [k, { ...QATOR, qiymat: null, birlik: 'x' }]));
/** Nazoratchi toʻldirgan holat (misol raqamlar — test uchun, fakt emas). */
const TOLIQ = {
  'kargo.hamkor':          { ...QATOR, qiymat: 'Hamkor X', manba: 'shartnoma', olchandi: '2026-09-28' },
  'kargo.avia.usd_kg':     { ...QATOR, qiymat: 8, birlik: 'USD/kg', manba: 'Hamkor X', olchandi: '2026-09-28' },
  'kargo.avia.kun':        { ...QATOR, qiymat: '12', birlik: 'kun', manba: 'Hamkor X', olchandi: '2026-09-28' },
  'kargo.quruqlik.usd_kg': { ...QATOR, qiymat: 3, birlik: 'USD/kg', manba: 'Hamkor X', olchandi: '2026-09-28' },
  'kargo.quruqlik.kun':    { ...QATOR, qiymat: 30, birlik: 'kun', manba: 'Hamkor X', olchandi: '2026-09-28' },
  'kargo.usd_m3':          { ...QATOR, qiymat: 250, birlik: 'USD/m3', manba: 'Hamkor X', olchandi: '2026-09-28' },
  'kargo.min_usd':         { ...QATOR, qiymat: null, birlik: 'USD' },
};
const USD = 12_650;

describe('faktlarniOqi / faktSon / faktMatn', () => {
  it('buzuq shakl — boʻsh (bilmaymiz), otmaydi', () => {
    expect(faktlarniOqi(null)).toEqual({});
    expect(faktlarniOqi([1, 2])).toEqual({});
    expect(faktlarniOqi('x')).toEqual({});
    expect(faktlarniOqi({ 'a': 5 })).toEqual({ a: { qiymat: null, birlik: null, manba: null, olchandi: null, izoh: null } });
  });
  it('qator maydonlari tozalanadi; son matn koʻrinishida ham oʻqiladi, boʻsh — null', () => {
    const f = faktlarniOqi({
      'kargo.avia.usd_kg': { qiymat: '8.5', birlik: ' USD/kg ', manba: '', olchandi: '2026-09-28', izoh: null },
      'kargo.hamkor': { qiymat: '  Hamkor X ' },
      'x.matn': { qiymat: 'abc' },
      'x.nol': { qiymat: 0 },
    });
    expect(f['kargo.avia.usd_kg']).toEqual({ qiymat: '8.5', birlik: 'USD/kg', manba: null, olchandi: '2026-09-28', izoh: null });
    expect(faktSon(f, 'kargo.avia.usd_kg')).toBe(8.5);
    expect(faktSon(f, 'x.matn')).toBeNull();
    expect(faktSon(f, 'x.nol')).toBe(0);
    expect(faktSon(f, 'yoq')).toBeNull();
    expect(faktMatn(f, 'kargo.hamkor')).toBe('Hamkor X');
    expect(faktMatn(f, 'x.nol')).toBeNull();
  });
});

describe('kargoStavkasi', () => {
  it('0056 holati (hamma NULL) — hamkor yoʻq, yoʻl yoʻq, tanlov yoʻq, izoh rost', () => {
    const k = kargoStavkasi(faktlarniOqi(BOSH), USD);
    expect(k).toEqual({ hamkor: null, avia: null, quruqlik: null, usdM3: null, minUsd: null, tanlovBor: false, izoh: 'kargo hamkori, kargo stavkasi kiritilmagan' });
    // Kalitlar umuman yoʻq boʻlsa ham xuddi shu — nol paydo boʻlmaydi.
    expect(kargoStavkasi({}, null)).toEqual(k);
  });
  it('toʻliq — ikkala yoʻl soʻmda, muddat bilan, tanlov bor, izoh yoʻq', () => {
    const k = kargoStavkasi(faktlarniOqi(TOLIQ), USD);
    expect(k.hamkor).toBe('Hamkor X');
    expect(k.avia).toEqual({ yol: 'avia', usdKg: 8, kun: 12, somPerKg: 101_200, manba: 'Hamkor X', olchandi: '2026-09-28' });
    expect(k.quruqlik).toEqual({ yol: 'quruqlik', usdKg: 3, kun: 30, somPerKg: 37_950, manba: 'Hamkor X', olchandi: '2026-09-28' });
    expect(k.usdM3).toBe(250);
    expect(k.minUsd).toBeNull();
    expect(k.tanlovBor).toBe(true);
    expect(k.izoh).toBeNull();
  });
  it('stavka bor, USD kursi yoʻq — soʻm null, izohda "USD kursi"', () => {
    const k = kargoStavkasi(faktlarniOqi(TOLIQ), null);
    expect(k.avia?.somPerKg).toBeNull();
    expect(k.avia?.usdKg).toBe(8);
    expect(k.izoh).toBe('USD kursi kiritilmagan');
  });
  it('faqat bitta yoʻl — tanlov yoʻq, lekin stavka bor (izoh null)', () => {
    const faqatAvia = Object.fromEntries(Object.entries(TOLIQ).filter(([k]) => k !== 'kargo.quruqlik.usd_kg'));
    const k = kargoStavkasi(faktlarniOqi(faqatAvia), USD);
    expect(k.avia?.usdKg).toBe(8);
    expect(k.quruqlik).toBeNull();
    expect(k.tanlovBor).toBe(false);
    expect(k.izoh).toBeNull();
  });
  it('nol yoki manfiy stavka — yoʻl yoʻq (nol kargo degani emas)', () => {
    const k = kargoStavkasi(faktlarniOqi({ ...TOLIQ, 'kargo.avia.usd_kg': { ...QATOR, qiymat: 0 } }), USD);
    expect(k.avia).toBeNull();
    expect(k.quruqlik?.usdKg).toBe(3);
  });
});

describe('arzonYol / kargoSomBirDona', () => {
  const toliq = kargoStavkasi(faktlarniOqi(TOLIQ), USD);
  it('arzon yoʻl — 1 kg boʻyicha; yoʻl boʻlmasa null', () => {
    expect(arzonYol(toliq)?.yol).toBe('quruqlik');
    expect(arzonYol(kargoStavkasi({}, USD))).toBeNull();
  });
  it('ogʻirlik boʻyicha: 120 g × 37 950 soʻm/kg = 4 554 soʻm', () => {
    expect(kargoSomBirDona(toliq.quruqlik, 120)).toEqual({ som: 4554, asos: 'ogirlik', hajmHisobgaKirdi: false });
  });
  it('hajm ham berilsa qimmati olinadi (FORMULA.md)', () => {
    const q = { usdM3: 250, kursUsd: USD };
    // 1 l: 0.001 m³ × 250 × 12 650 = 3 163 < 4 554 → ogʻirlik, hajm hisobga kirdi.
    expect(kargoSomBirDona(toliq.quruqlik, 120, { ...q, volumeMl: 1000 })).toEqual({ som: 4554, asos: 'ogirlik', hajmHisobgaKirdi: true });
    // 20 l: 63 250 > 4 554 → hajm.
    expect(kargoSomBirDona(toliq.quruqlik, 120, { ...q, volumeMl: 20_000 })).toEqual({ som: 63_250, asos: 'hajm', hajmHisobgaKirdi: true });
  });
  it('ogʻirlik yoʻq, yoʻl yoʻq, soʻm stavkasi yoʻq, manfiy — null (bilmayman)', () => {
    expect(kargoSomBirDona(toliq.quruqlik, null)).toBeNull();
    expect(kargoSomBirDona(null, 120)).toBeNull();
    expect(kargoSomBirDona({ ...toliq.quruqlik!, somPerKg: null }, 120)).toBeNull();
    expect(kargoSomBirDona(toliq.quruqlik, -1)).toBeNull();
  });
});
