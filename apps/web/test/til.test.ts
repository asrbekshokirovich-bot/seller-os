/**
 * Ruscha son bilan kelishik: «3 020 064 товаров» emas, «товара».
 */

import { describe, expect, it } from 'vitest';
import { ruShakl } from '../src/lib/til';

const TOVAR = ['товар', 'товара', 'товаров'] as const;

describe('ruShakl', () => {
  it('1, 21, 101 — birlik', () => {
    expect(ruShakl(1, TOVAR)).toBe('товар');
    expect(ruShakl(21, TOVAR)).toBe('товар');
    expect(ruShakl(101, TOVAR)).toBe('товар');
  });
  it('2–4 bilan tugasa — «товара»', () => {
    expect(ruShakl(2, TOVAR)).toBe('товара');
    expect(ruShakl(3_020_064, TOVAR)).toBe('товара');
    expect(ruShakl(1_850_863, TOVAR)).toBe('товара');
  });
  it('0, 5–9, 11–14 — «товаров»', () => {
    expect(ruShakl(0, TOVAR)).toBe('товаров');
    expect(ruShakl(5, TOVAR)).toBe('товаров');
    expect(ruShakl(11, TOVAR)).toBe('товаров');
    expect(ruShakl(112, TOVAR)).toBe('товаров');
    expect(ruShakl(3_020_056, TOVAR)).toBe('товаров');
  });
  it('son yoʻq (chiziqcha) yoki kasr — koʻplik', () => {
    expect(ruShakl(null, TOVAR)).toBe('товаров');
    expect(ruShakl(2.5, TOVAR)).toBe('товаров');
  });
});
