import { describe, expect, it } from 'vitest';
import { REJA_QADAMI, darvozaHolati, kerakliRejalar, qadamOchiq, reja } from '../src/tarif.js';

const HOZIR = new Date('2026-08-25T00:00:00Z');

describe('reja — obuna qatoridan amaldagi tarif', () => {
  it('obuna yoʻq — bepul, va bu xato emas', () => {
    const n = reja(null, HOZIR);
    expect(n.reja).toBe('bepul');
    expect(n.sabab).toBe('obuna-yoq');
    expect(n.tanilmadi).toBe(false);
  });

  it('tirik obuna rejani beradi', () => {
    for (const status of ['trial', 'active', 'grace']) {
      const n = reja({ plan: 'pro', status, ends_at: null }, HOZIR);
      expect(n.reja, status).toBe('pro');
      expect(n.sabab, status).toBe('obuna-tirik');
    }
  });

  it('bekor qilingan yoki toʻxtatilgan obuna reja bermaydi', () => {
    for (const status of ['cancelled', 'paused']) {
      expect(reja({ plan: 'pro', status, ends_at: null }, HOZIR).reja).toBe('bepul');
    }
  });

  it('muddati oʻtgan obuna reja bermaydi', () => {
    const n = reja({ plan: 'pro', status: 'active', ends_at: '2026-08-24T00:00:00Z' }, HOZIR);
    expect(n.reja).toBe('bepul');
    expect(n.sabab).toBe('obuna-tugagan');
  });

  it('muddati kelajakda boʻlsa reja beradi', () => {
    const n = reja({ plan: 'pro', status: 'active', ends_at: '2026-09-01T00:00:00Z' }, HOZIR);
    expect(n.reja).toBe('pro');
  });

  /*
   * Tanilmagan reja jimgina bepulga tushmaydi.
   *
   * Bitta harf xatosi (`Pro`, `pro `) toʻlagan mijozni bepulga
   * aylantirib qoʻyishi mumkin. Shuning uchun `tanilmadi` bayrogʻi
   * bor va `/tarif` uni koʻrsatadi.
   */
  it('tanilmagan reja nomi bayroq bilan bepulga tushadi', () => {
    const n = reja({ plan: 'Pro', status: 'active', ends_at: null }, HOZIR);
    expect(n.reja).toBe('bepul');
    expect(n.tanilmadi).toBe(true);
    expect(n.xomReja).toBe('Pro');
  });
});

describe('qadamOchiq', () => {
  it('bepul 5-qadamgacha (Xitoydan topish), obuna 12-qadamgacha — nazoratchi, 2026-10-14', () => {
    expect(qadamOchiq('bepul', 5)).toBe(true);
    expect(qadamOchiq('bepul', 6)).toBe(false);
    expect(qadamOchiq('pro', 6)).toBe(true);
    expect(qadamOchiq('pro', 12)).toBe(true);
    expect(qadamOchiq('biznes', 12)).toBe(true);
  });

  it('kerakliRejalar 6-qadam uchun bepulni sanamaydi, 5-qadam uchun sanaydi', () => {
    const r = kerakliRejalar(6);
    expect(r).not.toContain('bepul');
    expect(r).toContain('pro');
    expect(kerakliRejalar(5)).toContain('bepul');
  });

  it('har reja kamida 1-qadamni ochadi', () => {
    for (const [r, qadam] of Object.entries(REJA_QADAMI)) {
      expect(qadam, r).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('darvozaHolati — so_obuna javobidan (obuna darvozasi, 2026-10-14)', () => {
  const H = new Date('2026-10-14T00:00:00Z');
  it('baza javob bermasa yoki xato — nomaʼlum (toʻlov soʻralmaydi); narx oʻtadi', () => {
    expect(darvozaHolati(null, H, 149_000)).toEqual({ holat: 'nomalum', narxSom: 149_000 });
    expect(darvozaHolati({ xato: 'sessiya topilmadi' }, H, 1)).toEqual({ holat: 'nomalum', narxSom: 1 });
  });

  it('obuna yoʻq, tugagan yoki nofaol — yoq; tirik — faol', () => {
    expect(darvozaHolati({ obuna: null }, H, 1).holat).toBe('yoq');
    expect(darvozaHolati({}, H, 1).holat).toBe('yoq');
    expect(darvozaHolati({ obuna: { plan: 'pro', status: 'active', ends_at: '2026-11-14T00:00:00Z' } }, H, 1).holat).toBe('faol');
    expect(darvozaHolati({ obuna: { plan: 'pro', status: 'active', ends_at: '2026-10-13T00:00:00Z' } }, H, 1).holat).toBe('yoq');
    expect(darvozaHolati({ obuna: { plan: 'pro', status: 'cancelled', ends_at: null } }, H, 1).holat).toBe('yoq');
    expect(darvozaHolati({ obuna: { plan: 'biznes', status: 'grace', ends_at: null } }, H, 1).holat).toBe('faol');
    // Tanilmagan reja nomi — bepul (reja() buni `tanilmadi` bilan koʻrsatadi).
    expect(darvozaHolati({ obuna: { plan: 'Pro', status: 'active', ends_at: null } }, H, 1).holat).toBe('yoq');
  });
});
