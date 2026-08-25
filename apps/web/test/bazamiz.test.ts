/**
 * "Bazamizda bugun" raqamlari.
 *
 * NEGA BU TESTLAR BOR. Toʻrtta raqam sotuv sahifasida qoʻlda
 * yozilgan edi va bir kunda 320 000 ga eskirdi (1 528 764 →
 * 1 850 863). Ustidagi sarlavha esa "Har bir raqam oʻlchangan"
 * deb turadi — yaʼni eskirgan raqam shunchaki xato emas, sahifa
 * daʼvosini yolgʻonga aylantiradi.
 */

import { describe, expect, it } from 'vitest';
import { bazamizniQoy, qoy, son } from '../src/lib/bazamiz';

const SAHIFA = `<div>
  <div data-bazamiz="tovar" style="font-size:34px">1 528 764</div>
  <div data-bazamiz="dokon" style="font-size:34px">82 684</div>
  <span data-bazamiz="olchandi">2026-08-24</span>
</div>`;

describe('son', () => {
  it('mingliklar boʻshliq bilan ajratiladi', () => {
    expect(son(1_850_863)).toBe('1 850 863');
    expect(son(85_866)).toBe('85 866');
    expect(son(5_315)).toBe('5 315');
  });

  it('kichik son oʻzgarmaydi', () => {
    expect(son(0)).toBe('0');
    expect(son(999)).toBe('999');
  });

  /*
   * Ajratgich — ODDIY boʻshliq, `toLocaleString` emas.
   *
   * `toLocaleString('uz-UZ')` muhitga qarab uzilmas boʻshliq
   * (U+00A0) yoki vergul beradi. Dizaynda oddiy boʻshliq va
   * sahifa monospace shrift bilan tekislangan.
   */
  it('uzilmas boʻshliq ishlatilmaydi', () => {
    expect(son(1_850_863)).not.toContain(' ');
  });
});

describe('qoy', () => {
  it('belgilangan elementning ichi almashadi', () => {
    const n = qoy(SAHIFA, 'tovar', '1 850 863');
    expect(n).toContain('>1 850 863</div>');
    expect(n).not.toContain('1 528 764');
  });

  it('atributlar saqlanadi — uslub yoʻqolmaydi', () => {
    const n = qoy(SAHIFA, 'tovar', '1');
    expect(n).toContain('data-bazamiz="tovar" style="font-size:34px"');
  });

  it('faqat oʻz belgisini tegadi', () => {
    const n = qoy(SAHIFA, 'tovar', '1');
    expect(n).toContain('>82 684</div>');
  });

  it('boshqa teg turi ham ishlaydi (`span`)', () => {
    const n = qoy(SAHIFA, 'olchandi', '2026-08-25');
    expect(n).toContain('>2026-08-25</span>');
  });

  /*
   * Belgi yoʻq boʻlsa MATN OʻZGARMAYDI va xato otilmaydi.
   * Bu holat qurish paytida tutiladi (`qurish.mjs`); bu yerda
   * sahifa yiqilmasligi kafolatlanadi.
   */
  it('belgi yoʻq boʻlsa matn buzilmaydi', () => {
    expect(qoy(SAHIFA, 'yoq_narsa', 'X')).toBe(SAHIFA);
  });
});

describe('bazamizniQoy', () => {
  it('hamma raqam almashadi', () => {
    const n = bazamizniQoy(SAHIFA, {
      tovar: 1_850_863, dokon: 85_866, olchandi: '2026-08-25',
    });
    expect(n).toContain('>1 850 863<');
    expect(n).toContain('>85 866<');
    expect(n).toContain('>2026-08-25<');
  });

  /*
   * ENG MUHIM TEKSHIRUV. Baza javob bermasa sahifa QURISH
   * PAYTIDAGI raqamlar bilan chiqadi — nol yoki chiziqcha bilan
   * emas. Sotuv sahifasidagi "0 tovar" nosozlikni mahsulot
   * haqidagi yolgʻonga aylantirardi.
   */
  it('baza javob bermasa zaxira raqamlar qoladi', () => {
    expect(bazamizniQoy(SAHIFA, null)).toBe(SAHIFA);
  });

  it('yarim javobda faqat kelgani almashadi', () => {
    const n = bazamizniQoy(SAHIFA, { tovar: 1_850_863 });
    expect(n).toContain('>1 850 863<');
    // Kelmagan maydon eski qiymatida qoladi, nolga aylanmaydi.
    expect(n).toContain('>82 684<');
  });

  it('nol ham qabul qilinadi — u haqiqiy oʻlchov boʻlishi mumkin', () => {
    // Kunlik oʻlchov nol boʻlishi mumkin (supurish hali
    // boshlanmagan). Bu `undefined` dan farq qiladi.
    const n = bazamizniQoy('<i data-bazamiz="kunlik">50 038</i>', { kunlik: 0 });
    expect(n).toContain('>0<');
  });
});
