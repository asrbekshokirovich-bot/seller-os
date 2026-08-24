/**
 * 1-qadam javoblari testlari.
 *
 * Deyarli hammasi bitta xato atrofida: bo'sh javob nolga yoki `false`
 * ga aylanmasligi kerak. Bu xato jimgina o'tadi — baza to'ldirilgan
 * ko'rinadi, xato faqat tavsiya noto'g'ri chiqqanda bilinadi, o'shanda
 * ham sababi topilmaydi.
 */

import { describe, expect, it } from 'vitest';
import {
  bosProfil,
  haYoqqa,
  javobSoni,
  KAPITAL_MUDDATI,
  profilOqi,
  royxatdan,
  royxatga,
  songa,
} from '@selleros/shared';

describe('songa — bo\'sh maydon nolga aylanmaydi', () => {
  it('BO\'SH SATR NOL EMAS, null', () => {
    // `Number("")` nolga teng. Aynan shu yerda "aytmadi" jimgina
    // "pulim yo'q" ga aylanardi.
    expect(songa('')).toBeNull();
    expect(songa('   ')).toBeNull();
  });

  it('null va undefined ham null', () => {
    expect(songa(null)).toBeNull();
    expect(songa(undefined)).toBeNull();
  });

  it('HAQIQIY NOL — nol bo\'lib qoladi', () => {
    // 0 javob: "hozircha pulim yo'q". Uni null ga aylantirsak,
    // teskari xato bo'lardi.
    expect(songa(0)).toBe(0);
    expect(songa('0')).toBe(0);
  });

  it('oddiy son o\'qiladi', () => {
    expect(songa('5000000')).toBe(5_000_000);
    expect(songa(12)).toBe(12);
  });

  it('manfiy va son bo\'lmagan qiymat null', () => {
    expect(songa(-1)).toBeNull();
    expect(songa('ko\'p')).toBeNull();
    expect(songa(true)).toBeNull();
  });
});

describe('haYoqqa — belgilanmagan katakcha "yo\'q" emas', () => {
  it('JAVOB BERILMASA null, false EMAS', () => {
    // Agar bu `false` qaytarsa, sertifikat bilan ishlagan odam
    // ishlamagan deb hisoblanadi va unga eng foydali yo'nalish
    // ko'rsatilmaydi.
    expect(haYoqqa(undefined)).toBeNull();
    expect(haYoqqa(null)).toBeNull();
    expect(haYoqqa('')).toBeNull();
    expect(haYoqqa('bilmayman')).toBeNull();
  });

  it('aniq "yo\'q" — false', () => {
    expect(haYoqqa(false)).toBe(false);
    expect(haYoqqa("yo'q")).toBe(false);
    expect(haYoqqa('yoq')).toBe(false);
  });

  it('aniq "ha" — true', () => {
    expect(haYoqqa(true)).toBe(true);
    expect(haYoqqa('ha')).toBe(true);
  });
});

describe('royxatdan — notanish qiymat jimgina o\'tmaydi', () => {
  it('ro\'yxatdagi qiymat o\'qiladi', () => {
    expect(royxatdan('6_oy', KAPITAL_MUDDATI)).toBe('6_oy');
  });

  it('notanish qiymat null — birinchisiga tushib qolmaydi', () => {
    expect(royxatdan('yarim_yil', KAPITAL_MUDDATI)).toBeNull();
    expect(royxatdan(7, KAPITAL_MUDDATI)).toBeNull();
  });
});

describe('royxatga — bo\'sh massiv va null farqlanadi', () => {
  it('BO\'SH MASSIV "hech qaysi", null "aytmadi"', () => {
    expect(royxatga([])).toEqual([]);
    expect(royxatga(undefined)).toBeNull();
  });

  it('bo\'sh satrlar tashlanadi', () => {
    expect(royxatga(['avto', '', '  ', 'kiyim'])).toEqual(['avto', 'kiyim']);
  });
});

describe('profilOqi', () => {
  it('BO\'SH FORMA — hamma maydon null', () => {
    const p = profilOqi({});
    expect(p).toEqual(bosProfil());
    expect(javobSoni(p)).toBe(0);
  });

  it('yarim to\'ldirilgan forma — faqat berilgani yoziladi', () => {
    const p = profilOqi({
      budgetUzs: '',          // bo'sh — null bo'lishi kerak, 0 emas
      hoursPerWeek: '10',
      certExperience: undefined, // javob yo'q — null, false emas
      hasUzumShop: 'ha',
      city: 'Toshkent',
    });
    expect(p.budgetUzs).toBeNull();
    expect(p.hoursPerWeek).toBe(10);
    expect(p.certExperience).toBeNull();
    expect(p.hasUzumShop).toBe(true);
    expect(p.city).toBe('Toshkent');
    expect(javobSoni(p)).toBe(3);
  });

  it('to\'liq forma — 12 javob', () => {
    const p = profilOqi({
      experience: ['avto'],
      familyField: ['dokon'],
      interest: ['kiyim'],
      budgetUzs: 5_000_000,
      capitalLock: '6_oy',
      hoursPerWeek: 20,
      city: 'Samarqand',
      onlineExperience: 'biroz',
      hasUzumShop: false,
      importedFromChina: true,
      certExperience: false,
      riskPreference: 'ehtiyotkor',
    });
    expect(javobSoni(p)).toBe(12);
    // `false` javob — u null EMAS va sanaladi.
    expect(p.hasUzumShop).toBe(false);
    expect(p.certExperience).toBe(false);
  });
});
