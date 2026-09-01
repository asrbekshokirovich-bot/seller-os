import { describe, it, expect } from 'vitest';
import { kartochkaLimitTekshir, KARTOCHKA_LIMIT } from '../src/kartochka.js';

describe('Kartochka limit', () => {
  it('bepul rejada limit 0', () => {
    const n = kartochkaLimitTekshir(0, 'bepul');
    expect(n.ruxsat).toBe(false);
    expect(n.limit).toBe(0);
  });

  it('pro rejada 5 ta ruxsat', () => {
    const n = kartochkaLimitTekshir(0, 'pro');
    expect(n.ruxsat).toBe(true);
    expect(n.qolgan).toBe(5);
    expect(n.limit).toBe(5);
  });

  it('pro rejada 5 ishlatilgan → ruxsat yoʻq', () => {
    const n = kartochkaLimitTekshir(5, 'pro');
    expect(n.ruxsat).toBe(false);
    expect(n.qolgan).toBe(0);
  });

  it('biznes rejada 20 ta ruxsat', () => {
    const n = kartochkaLimitTekshir(0, 'biznes');
    expect(n.ruxsat).toBe(true);
    expect(n.qolgan).toBe(20);
    expect(n.limit).toBe(20);
  });

  it('biznes rejada 15 ishlatilgan → 5 qolgan', () => {
    const n = kartochkaLimitTekshir(15, 'biznes');
    expect(n.ruxsat).toBe(true);
    expect(n.qolgan).toBe(5);
  });

  it('limitlar KARTOCHKA_LIMIT dan keladi', () => {
    expect(KARTOCHKA_LIMIT.bepulKunlik).toBe(0);
    expect(KARTOCHKA_LIMIT.proKunlik).toBe(5);
    expect(KARTOCHKA_LIMIT.biznesKunlik).toBe(20);
  });
});
