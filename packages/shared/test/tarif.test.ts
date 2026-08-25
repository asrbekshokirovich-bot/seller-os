import { describe, expect, it } from 'vitest';
import { REJA_QADAMI, kerakliRejalar, qadamOchiq, reja } from '../src/tarif.js';

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
  it('bepul 2-qadamgacha, pullik toʻliq — reja B3', () => {
    expect(qadamOchiq('bepul', 2)).toBe(true);
    expect(qadamOchiq('bepul', 3)).toBe(false);
    expect(qadamOchiq('pro', 3)).toBe(true);
    expect(qadamOchiq('pro', 6)).toBe(true);
  });

  it('kerakliRejalar 3-qadam uchun bepulni sanamaydi', () => {
    const r = kerakliRejalar(3);
    expect(r).not.toContain('bepul');
    expect(r).toContain('pro');
  });

  it('har reja kamida 1-qadamni ochadi', () => {
    for (const [r, qadam] of Object.entries(REJA_QADAMI)) {
      expect(qadam, r).toBeGreaterThanOrEqual(1);
    }
  });
});
