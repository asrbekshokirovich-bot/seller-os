/**
 * Tanishuv javoblari: ism-familiya, telefon, byudjet.
 *
 * NEGA BU TESTLAR BOR. Nazoratchi sinovi (2026-10-12): "Hozir 100 mln
 * pulim bor, lekin 70 mln bilan boshlamoqchiman" deb yozilganda chat
 * "bitta son yozing" deb qayta soʻrardi. Byudjet endi soʻmda ham,
 * dollarda ham; ism va telefon har yangi suhbat boshida soʻraladi.
 */

import { describe, expect, it } from 'vitest';
import { byudjetMatni, byudjetniOqi, ismniOqi, mlnMatni, telefonKorinishi, telefonniOqi } from '../src/tanishuv';

const KURS = 12_650;
const som = (matn: string, kurs: number | null = KURS) => {
  const r = byudjetniOqi(matn, kurs);
  if ('xato' in r) throw new Error(`${matn}: ${r.xato}`);
  return r;
};
const xato = (matn: string, kurs: number | null = KURS) => {
  const r = byudjetniOqi(matn, kurs);
  if (!('xato' in r)) throw new Error(`${matn}: xato kutilgan edi, keldi ${r.som}`);
  return r.xato;
};

describe('byudjetniOqi — boshlash summasi', () => {
  it('nazoratchi misoli: "100 mln bor, LEKIN 70 mln bilan" → 70 mln, qayta soʻralmaydi', () => {
    expect(som('hozir 100 mln pulim bor lekin 70 mln bilan boshlamoqchiman')).toEqual({ som: 70_000_000, usd: null });
    expect(som('Hozir 100 mln pulim bor, 70 mln bilan boshlayman')).toEqual({ som: 70_000_000, usd: null });
    expect(som('70 mln bilan boshlayman, jami 100 mln bor')).toEqual({ som: 70_000_000, usd: null });
    expect(som('100 mln bor, ammo 70 mlnni ishlataman').som).toBe(70_000_000);
    expect(som('есть 100 млн, но начну с 70 млн').som).toBe(70_000_000);
  });

  it('oddiy shakllar', () => {
    expect(som('70 mln').som).toBe(70_000_000);
    expect(som('70 000 000').som).toBe(70_000_000);
    expect(som('70 000 000 soʻm').som).toBe(70_000_000);
    expect(som('1,5 mln').som).toBe(1_500_000);
    expect(som('yarim mln').som).toBe(500_000);
    expect(som('1 yarim mln').som).toBe(1_500_000);
    expect(som('yetmish million').som).toBe(70_000_000);
    expect(som('0').som).toBe(0);
    expect(som('pulim yoʻq').som).toBe(0);
  });

  it('dollar — CBU kursi bilan soʻmga; dollar summasi saqlanadi', () => {
    expect(som('5000 dollar')).toEqual({ som: 63_250_000, usd: 5000 });
    expect(som('$5 000')).toEqual({ som: 63_250_000, usd: 5000 });
    expect(som('5k $')).toEqual({ som: 63_250_000, usd: 5000 });
    expect(som('5 ming dollar')).toEqual({ som: 63_250_000, usd: 5000 });
    expect(som('5000 долларов').usd).toBe(5000);
    expect(xato('5000 dollar', null)).toMatch(/kursini/);
    expect(xato('100 €')).toMatch(/Yevro/);
  });

  it('oraliq — pastki chegara; pul boʻlmagan sonlar (yil, dona) hisobga kirmaydi', () => {
    expect(som('5-10 mln').som).toBe(5_000_000);
    expect(som('5 mln dan 10 mln gacha').som).toBe(5_000_000);
    expect(som('2 ta doʻkonim bor, 30 mln bilan boshlayman').som).toBe(30_000_000);
    expect(som('2024 yildan beri savdo qilaman, 50 mln').som).toBe(50_000_000);
  });

  it('taxmin qilinmaydi: ishorasiz ikki summa, birliksiz kichik son — sababi aytiladi', () => {
    expect(xato('50 yoki 70 mln')).toMatch(/Bir nechta summa yozdingiz \(50, 70 mln\)/);
    expect(xato('70')).toBe('«70» — 70 mln soʻmmi yoki 70 $ mi? Birligi bilan yozing: 70 mln yoki 70 $.');
    expect(xato('5000')).toMatch(/dollarmi/);
    expect(xato('-5 mln')).toMatch(/manfiy/);
    expect(xato('bilmayman')).toMatch(/Summani yozing/);
  });

  it('chatdagi koʻrinish', () => {
    expect(byudjetMatni(70_000_000, null)).toBe('70 000 000 soʻm');
    expect(byudjetMatni(63_250_000, 5000)).toBe('$5 000 (≈ 63,3 mln soʻm)');
    expect(byudjetMatni(null, null)).toBe('Oʻtkazib yuborildi');
    expect(mlnMatni(12_650_000)).toBe('12,7 mln soʻm');
    expect(mlnMatni(500_000)).toBe('500 000 soʻm');
  });
});

describe('ismniOqi — ism va familiya', () => {
  it('ikki soʻz; harf oʻlchami tekislanadi; gap boʻlaklari tashlanadi', () => {
    expect(ismniOqi('Aziz Karimov')).toEqual({ ism: 'Aziz Karimov' });
    expect(ismniOqi('aziz karimov')).toEqual({ ism: 'Aziz Karimov' });
    expect(ismniOqi('AZIZ KARIMOV')).toEqual({ ism: 'Aziz Karimov' });
    expect(ismniOqi('Mening ismim Aziz Karimov')).toEqual({ ism: 'Aziz Karimov' });
    expect(ismniOqi('Salom, men Aziz Karimov')).toEqual({ ism: 'Aziz Karimov' });
    expect(ismniOqi('Меня зовут Азиз Каримов')).toEqual({ ism: 'Азиз Каримов' });
    expect(ismniOqi('Oʻktam Gʻaniyev')).toEqual({ ism: 'Oʻktam Gʻaniyev' });
    expect(ismniOqi('Karimov Aziz Botir oʻgʻli')).toEqual({ ism: 'Karimov Aziz Botir oʻgʻli' });
  });

  it('bitta soʻz, raqam, boʻsh — sababi bilan rad', () => {
    expect(ismniOqi('Aziz')).toEqual({ xato: 'Ism va familiyangizni birga yozing — masalan: Aziz Karimov.' });
    expect(ismniOqi('Aziz 123')).toMatchObject({ xato: expect.stringMatching(/raqamsiz/) });
    expect(ismniOqi('')).toMatchObject({ xato: expect.any(String) });
    expect(ismniOqi('a b')).toMatchObject({ xato: expect.any(String) });
  });
});

describe('telefonniOqi — telefon raqam', () => {
  it('Oʻzbekiston raqami har xil yozilsa ham bir xil boʻladi', () => {
    for (const t of ['+998 90 123 45 67', '901234567', '90-123-45-67', '(90) 123-45-67', '998901234567', '8 90 123 45 67', 'raqamim 90 123 45 67']) {
      expect(telefonniOqi(t), t).toEqual({ telefon: '+998901234567' });
    }
  });

  it('chet el raqami — faqat + yoki 00 bilan', () => {
    expect(telefonniOqi('+7 916 123 45 67')).toEqual({ telefon: '+79161234567' });
    expect(telefonniOqi('0012025550123')).toEqual({ telefon: '+12025550123' });
  });

  it('notoʻgʻri raqam — misol bilan rad', () => {
    expect(telefonniOqi('12345')).toMatchObject({ xato: expect.stringMatching(/\+998 90 123 45 67/) });
    expect(telefonniOqi('012345678')).toMatchObject({ xato: expect.any(String) });
    expect(telefonniOqi('90 123 45 67 yoki 93 123 45 67')).toMatchObject({ xato: expect.stringMatching(/Bitta/) });
    expect(telefonniOqi('')).toMatchObject({ xato: expect.any(String) });
  });

  it('koʻrinishi', () => {
    expect(telefonKorinishi('+998901234567')).toBe('+998 90 123 45 67');
    expect(telefonKorinishi('+79161234567')).toBe('+79161234567');
  });
});
