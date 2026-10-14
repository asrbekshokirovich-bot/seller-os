import { describe, it, expect } from 'vitest';
import {
  obunaMuddati,
  OBUNA_KUN,
  OBUNA_NARXI,
  TARIF_NARXI,
  YILLIK_NARX,
} from '../src/tolov.js';

describe('Obuna narxi (nazoratchi, 2026-10-14: bitta reja — 149 000 soʻm/oy)', () => {
  it('oylik — faqat pro, 149 000, 30 kun; biznes sotilmaydi', () => {
    expect(OBUNA_NARXI).toBe(149_000);
    expect(OBUNA_KUN).toBe(30);
    expect(TARIF_NARXI).toEqual({ pro: 149_000 });
    expect(TARIF_NARXI.biznes).toBeUndefined();
  });

  it('yillik tarif hozir sotilmaydi — narxi berilmagan', () => {
    expect(YILLIK_NARX).toEqual({});
  });

  it('obuna muddati — 30 kun (yillik yoʻq)', () => {
    expect(obunaMuddati(149_000)).toBe(30);
    expect(obunaMuddati(990_000)).toBe(30);
    expect(obunaMuddati(500_000)).toBe(30);
  });
});
