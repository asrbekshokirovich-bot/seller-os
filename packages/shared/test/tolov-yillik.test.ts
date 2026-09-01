import { describe, it, expect } from 'vitest';
import {
  tarifNarxi,
  obunaMuddati,
  TARIF_NARXI,
  YILLIK_NARX,
} from '../src/tolov.js';

describe('Yillik tarif', () => {
  it('oylik narx eski qiymatga teng', () => {
    expect(tarifNarxi('pro', 'oylik')).toBe(99_000);
    expect(tarifNarxi('biznes', 'oylik')).toBe(299_000);
  });

  it('yillik narx 10 oylik', () => {
    expect(tarifNarxi('pro', 'yillik')).toBe(990_000);
    expect(tarifNarxi('biznes', 'yillik')).toBe(2_990_000);
  });

  it('notanish reja null qaytaradi', () => {
    expect(tarifNarxi('noma', 'oylik')).toBeNull();
    expect(tarifNarxi('noma', 'yillik')).toBeNull();
  });

  it('obuna muddati: oylik → 30 kun', () => {
    expect(obunaMuddati(99_000)).toBe(30);
    expect(obunaMuddati(299_000)).toBe(30);
  });

  it('obuna muddati: yillik → 365 kun', () => {
    expect(obunaMuddati(990_000)).toBe(365);
    expect(obunaMuddati(2_990_000)).toBe(365);
  });

  it('obuna muddati: notanish summa → 30 kun', () => {
    expect(obunaMuddati(500_000)).toBe(30);
  });

  it('eski TARIF_NARXI oʻzgarmagan', () => {
    expect(TARIF_NARXI).toEqual({ pro: 99_000, biznes: 299_000 });
  });

  it('YILLIK_NARX toʻgʻri', () => {
    expect(YILLIK_NARX).toEqual({ pro: 990_000, biznes: 2_990_000 });
  });
});
