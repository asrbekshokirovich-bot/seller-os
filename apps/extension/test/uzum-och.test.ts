/**
 * «Uzumda ochish» (0.5.0): panel faqat Uzumning tovar va turkum sahifalarini ochadi, koʻpi bilan 3 ta.
 * Begona sayt, http, boshqa yoʻl, login maʼlumotli manzil, notoʻgʻri xabar turi — ochilmaydi.
 */

import { describe, expect, it } from 'vitest';
import { UZUM_OCH_XABARI, uzumOchishManzillari } from '../src/uzum-och';

const xabar = (urllar: unknown) => ({ tur: UZUM_OCH_XABARI, urllar });

describe('uzumOchishManzillari', () => {
  it('tovar va turkum sahifalari — ochiladi, parametrlari saqlanadi', () => {
    expect(uzumOchishManzillari(xabar([
      'https://uzum.uz/uz/product/412970',
      'https://uzum.uz/uz/category/14237?sorting=orders&ordering=descending&filters=filter%3DRV-0%3A100000~200000',
    ]))).toEqual([
      'https://uzum.uz/uz/product/412970',
      'https://uzum.uz/uz/category/14237?sorting=orders&ordering=descending&filters=filter%3DRV-0%3A100000~200000',
    ]);
  });

  it('koʻpi bilan 3 ta, takror — bir marta', () => {
    const u = (i: number) => `https://uzum.uz/uz/product/${i}`;
    expect(uzumOchishManzillari(xabar([u(1), u(1), u(2), u(3), u(4)]))).toEqual([u(1), u(2), u(3)]);
  });

  it('begona va xavfli manzillar ochilmaydi', () => {
    expect(uzumOchishManzillari(xabar([
      'http://uzum.uz/uz/product/1', 'https://uzum.uz.evil.com/uz/product/1', 'https://evil.com/uz/product/1',
      'https://uzum.uz/uz/cart', 'https://user:p@uzum.uz/uz/product/1', 'javascript:alert(1)', 42,
    ]))).toBeNull();
  });

  it('notoʻgʻri xabar — null', () => {
    expect(uzumOchishManzillari({ tur: 'boshqa', urllar: ['https://uzum.uz/uz/product/1'] })).toBeNull();
    expect(uzumOchishManzillari(null)).toBeNull();
    expect(uzumOchishManzillari(xabar('https://uzum.uz/uz/product/1'))).toBeNull();
  });
});
