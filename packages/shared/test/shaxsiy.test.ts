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
import { shaxsiyniYashir, suhbatTarixi } from '../src/yordamchi.js';
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

  it('summa va boshqa raqamlar tegilmaydi — telefon emas', () => {
    expect(shaxsiyniYashir('60 000 000 soʻm bilan boshlayman, 3 yil sotganman', H)).toBe('60 000 000 soʻm bilan boshlayman, 3 yil sotganman');
    expect(shaxsiyniYashir('boshqa raqam: 90 765 43 21', H)).toBe('boshqa raqam: 90 765 43 21');
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

  it('suhbatTarixi shu bilan yashiradi; ism/telefon savollari tarixga kirmaydi', () => {
    const t = suhbatTarixi([
      { rol: 'menejer', matn: 'Ismingiz va telefoningiz?', savolId: 'ism' },
      { rol: 'obunachi', matn: 'Aziz Karimov, 90 123 45 67', savolId: 'ism' },
      { rol: 'obunachi', matn: 'Aziz deb chaqiring, raqam 90 123 45 67 edi' },
    ], H);
    expect(t).toBe('Mijoz: … deb chaqiring, raqam … edi');
  });
});
