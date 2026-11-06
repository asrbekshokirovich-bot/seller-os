import { describe, expect, it } from 'vitest';
import { TURKUM_RU, turkumRu } from '../src/turkum-ru.js';

describe('turkum nomlari ruscha (ikkinchi koʻrik, 12-taklif)', () => {
  it('340 ta turkum, hammasi kirillcha, oʻzbekcha harf yoʻq', () => {
    const qiymatlar = Object.values(TURKUM_RU);
    expect(qiymatlar).toHaveLength(340);
    for (const q of qiymatlar) {
      expect(q).toMatch(/[а-яё]/iu);
      expect(q).not.toMatch(/[ʻʼ']|oʻ|gʻ/u);
    }
  });

  it('ikki maʼnoli nomlar yoʻl boʻyicha: erkaklar «Ko\'ylaklar» — rubashki, qizlar — platya; notanish — null', () => {
    expect(turkumRu(344)).toBe('Кроссовки');
    expect(turkumRu(121)).toBe('Рубашки');
    expect(turkumRu(109)).toBe('Платья');
    expect(turkumRu(45)).toBe('Мягкие игрушки');
    expect(turkumRu(999999)).toBeNull();
    expect(turkumRu(null)).toBeNull();
  });
});
