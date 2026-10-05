/**
 * Bosh sahifa misol kartasi: million soʻm bir xona kasr bilan.
 *
 * `toFixed(1)` 10 950 000 ni «10,9» qilardi va kartada «20,9 − 10,9 = 9,9»
 * chiqardi. Koʻrsatilgan raqamlar oʻzaro qoʻshilishi kerak.
 */

import { describe, expect, it } from 'vitest';
import { mlnKasr } from '../src/lib/mln';

describe('mlnKasr', () => {
  it('yarmi yuqoriga yaxlitlanadi', () => {
    expect(mlnKasr(10_950_000)).toBe('11,0');
    expect(mlnKasr(50_000)).toBe('0,1');
    expect(mlnKasr(49_999)).toBe('0,0');
    expect(mlnKasr(0)).toBe('0,0');
  });
  it('misol kartasining raqamlari', () => {
    expect(mlnKasr(26_700_000)).toBe('26,7');
    expect(mlnKasr(5_835_000)).toBe('5,8');
    expect(mlnKasr(20_865_000)).toBe('20,9');
    expect(mlnKasr(9_915_000)).toBe('9,9');
  });
  it('kartada koʻrsatilgan raqamlar oʻzaro qoʻshiladi', () => {
    // BoshSahifa.tsx dagi MISOL: 300 dona × 89 000, sarmoya 36 500/dona, Uzum 19 450/dona.
    const tushum = 89_000 * 300;
    const uzum = 19_450 * 300;
    const sarmoya = 36_500 * 300;
    const son = (s: string) => Number(s.replace(',', '.'));
    const sof = son(mlnKasr(tushum - uzum));
    expect(son(mlnKasr(tushum)) - son(mlnKasr(uzum))).toBeCloseTo(sof, 5);
    expect(sof - son(mlnKasr(sarmoya))).toBeCloseTo(son(mlnKasr(tushum - uzum - sarmoya)), 5);
  });
});
