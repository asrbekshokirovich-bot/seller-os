import { describe, it, expect } from 'vitest';
import {
  tarifNarxi,
  obunaMuddati,
  OBUNA_NARXI,
  TARIF_NARXI,
  YILLIK_NARX,
} from '../src/tolov.js';

describe('Obuna narxi (nazoratchi, 2026-10-14: bitta reja — 149 000 soʻm/oy)', () => {
  it('oylik — faqat pro, 149 000; biznes sotilmaydi', () => {
    expect(OBUNA_NARXI).toBe(149_000);
    expect(TARIF_NARXI).toEqual({ pro: 149_000 });
    expect(tarifNarxi('pro', 'oylik')).toBe(149_000);
    expect(tarifNarxi('biznes', 'oylik')).toBeNull();
  });

  it('yillik tarif hozir sotilmaydi — narxi berilmagan', () => {
    expect(YILLIK_NARX).toEqual({});
    expect(tarifNarxi('pro', 'yillik')).toBeNull();
  });

  it('notanish reja null qaytaradi', () => {
    expect(tarifNarxi('noma', 'oylik')).toBeNull();
    expect(tarifNarxi('noma', 'yillik')).toBeNull();
  });

  it('obuna muddati — 30 kun (yillik yoʻq)', () => {
    expect(obunaMuddati(149_000)).toBe(30);
    expect(obunaMuddati(990_000)).toBe(30);
    expect(obunaMuddati(500_000)).toBe(30);
  });
});
