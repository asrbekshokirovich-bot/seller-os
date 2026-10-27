/**
 * `shaxsiyniYashir` — AI ga ketadigan matndan ism va telefon olib tashlanadi.
 *
 * NEGA BU TEST BOR (2026-10-21). Nazoratchi: «LLM mijozning shaxsiy maʼlumotini savoldan
 * ajratib olsin» — ism/telefon savolida gapni endi AI oʻqiydi. Keyingi xabarlarda esa
 * telefon AI ga ketmasligi kerak (maxfiylik sahifasi shuni vaʼda qiladi). Ilgari faqat
 * saqlangan shakl («+998901234567») va «+998…» yashirilardi — mijoz yozgan
 * «90 123 45 67» tarixda qolib ketardi.
 */

import { describe, expect, it } from 'vitest';
import { mijozHolati, shaxsiyniYashir, suhbatTarixi } from '../src/yordamchi.js';
import type { YolHolati } from '../src/ssenariy.js';

const H: YolHolati = { javoblar: { ism: 'Aziz Karimov', telefon: '+998901234567' }, natijalar: {} };

describe('shaxsiyniYashir', () => {
  it.each([
    ['raqamim 90 123 45 67', 'raqamim …'],
    ['+998 (90) 123-45-67 ga qoʻngʻiroq qiling', '… ga qoʻngʻiroq qiling'],
    ['901234567', '…'],
    ['+998901234567', '…'],
    ['998 90 123 45 67 shu', '… shu'],
  ])('telefon har qanday yozilishda yashiriladi: %s', (kirish, chiqish) => {
    expect(shaxsiyniYashir(kirish, H)).toBe(chiqish);
  });

  it('ism va familiya yashiriladi, qolgan gap qoladi', () => {
    expect(shaxsiyniYashir('Salom, men Aziz Karimov, bu bepulmi?', H)).toBe('Salom, men … …, bu bepulmi?');
  });

  it('summa va boshqa sonlar tegilmaydi — telefon emas', () => {
    expect(shaxsiyniYashir('60 000 000 soʻm bilan boshlayman, 3 yil sotganman', H)).toBe('60 000 000 soʻm bilan boshlayman, 3 yil sotganman');
    expect(shaxsiyniYashir('120 000 000 soʻm, 30000000, 5 000 000, tovar 2367334, 22.10.2026', H))
      .toBe('120 000 000 soʻm, 30000000, 5 000 000, tovar 2367334, 22.10.2026');
    // Ajratmasiz 9 xonali summa — oxiri 5 ta nol: telefon emas.
    expect(shaxsiyniYashir('byudjet 150000000, yoki 125000000, eng koʻpi 900000000', H))
      .toBe('byudjet 150000000, yoki 125000000, eng koʻpi 900000000');
  });

  /*
   * 2026-10-26: ism va telefon yoʻnalishdan keyin soʻraladi — mijoz raqamini birinchi gapidayoq
   * yozishi mumkin, u hali saqlanmagan. Shuning uchun telefon shaklidagi HAR qanday raqam yashiriladi
   * (ilgari faqat saqlangani: «boshqa raqam» tegilmasdi).
   */
  it('saqlanmagan raqam ham — oʻzbek mobil shaklidagi har qanday raqam yashiriladi', () => {
    const bosh: YolHolati = { javoblar: {}, natijalar: {} };
    for (const r of ['90 765 43 21', '(90) 765-43-21', '907654321', '90-765-43-21']) {
      expect(shaxsiyniYashir(`raqamim ${r}, kiyim sotaman`, bosh), r).toBe('raqamim …, kiyim sotaman');
    }
    expect(shaxsiyniYashir('boshqa raqam: 90 765 43 21', H)).toBe('boshqa raqam: …');
  });

  it('telefon saqlanmagan boʻlsa ham «+998…» yashiriladi', () => {
    const h: YolHolati = { javoblar: { ism: 'Aziz' }, natijalar: {} };
    expect(shaxsiyniYashir('mana +998 90 765 43 21', h)).toBe('mana …');
  });

  it('ism/telefon qadamidagi SAVOLGA yordamchi javobi tarixda qoladi — AI unga qayta javob bermasin', () => {
    const t = suhbatTarixi([
      { rol: 'menejer', matn: 'Telefon raqamingizni yozing', savolId: 'telefon' },
      { rol: 'obunachi', matn: 'raqamni nimaga soʻrayapsiz?' },
      { rol: 'menejer', matn: 'Bogʻlanish uchun, Aziz.', savolId: 'telefon', javob: { erkin: true, manba: 'ai' } },
      { rol: 'obunachi', matn: '90 123 45 67', savolId: 'telefon' },
    ], H);
    expect(t).toBe('Mijoz: raqamni nimaga soʻrayapsiz?\nYordamchi: Bogʻlanish uchun, ….');
  });

  it('holatdagi tajriba matnidan ham telefon yashiriladi (2026-10-26: birinchi gapda ham yoziladi)', () => {
    const h: YolHolati = { javoblar: { uzum_dokoni: 'bozorda kiyim sotganman, raqamim 90 765 43 21' }, natijalar: {} };
    const m = mijozHolati(h, 1);
    expect(m).toMatch(/«bozorda kiyim sotganman, raqamim …»/);
    expect(m).not.toMatch(/765/);
  });

  it('suhbatTarixi shu bilan yashiradi; ism/telefon savollari tarixga kirmaydi', () => {
    const t = suhbatTarixi([
      { rol: 'menejer', matn: 'Ismingiz va telefoningiz?', savolId: 'ism' },
      { rol: 'obunachi', matn: 'Aziz Karimov, 90 123 45 67', savolId: 'ism' },
      { rol: 'obunachi', matn: 'Aziz deb chaqiring, raqam 90 123 45 67 edi' },
    ], H);
    expect(t).toBe('Mijoz: … deb chaqiring, raqam … edi');
  });
});
