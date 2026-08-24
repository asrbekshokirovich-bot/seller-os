/**
 * Savollar bilan qolgan kod SINXRONMI.
 *
 * Bu testning butun mavjud sababi bitta jim nosozlik: forma savol
 * beradi, foydalanuvchi javob yozadi, javob bazaga tushadi — va ball
 * hech qachon oʻzgarmaydi, chunki qiymat nomi hisob kutgan nomga
 * toʻgʻri kelmaydi. Hech qayerda xato boʻlmaydi. Hech kim sezmaydi.
 *
 * Aynan shu naqsh (QOIDALAR.md §8): "hech narsa boʻlmadi" va
 * "hammasi joyida" bir xil koʻrinadi.
 */

import { describe, expect, it } from 'vitest';
import { SAVOLLAR, SOHALAR, SHAHARLAR } from '../src/savollar.js';
import { bosProfil, profilOqi } from '../src/profil.js';
import { SOHA_TURKUM } from '../src/qismlar.js';

describe('savollar', () => {
  it('hujjatdagi 12 savolning hammasi bor', () => {
    expect(SAVOLLAR).toHaveLength(12);
    expect(SAVOLLAR.map((s) => s.raqam)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12]);
  });

  it('har PROFIL MAYDONIGA bitta savol toʻgʻri keladi', () => {
    // Maydonsiz savol — javob hech qayerga yozilmaydi.
    // Savolsiz maydon — u hech qachon toʻlmaydi.
    const maydonlar = Object.keys(bosProfil()).sort();
    const savolMaydonlari = SAVOLLAR.map((s) => s.maydon).sort();
    expect(savolMaydonlari).toEqual(maydonlar);
  });

  it('SOHA qiymatlari ball hisobi kutgan kalitlar bilan bir xil', () => {
    // Forma "kiyim" yozadi, `profil()` qismi `SOHA_TURKUM.kiyim` ni
    // qidiradi. Nomlar ajralsa ball JIMGINA neytral qolaveradi.
    const formadan = SOHALAR.map((s) => s.qiymat).sort();
    const hisobda = Object.keys(SOHA_TURKUM).sort();
    expect(formadan).toEqual(hisobda);
  });

  it('har savolda matn va "nega" bor', () => {
    // "Nega bu savol?" javobsiz qolsa foydalanuvchi shaxsiy
    // maʼlumotini nima uchun berayotganini bilmaydi.
    for (const s of SAVOLLAR) {
      expect(s.matn.length, `${s.raqam}-savol matni`).toBeGreaterThan(10);
      expect(s.nega.length, `${s.raqam}-savol "nega" si`).toBeGreaterThan(20);
    }
  });

  it('tanlovli savollarda variant bor, boshqalarida yoʻq', () => {
    for (const s of SAVOLLAR) {
      const kerak = s.turi === 'kop' || s.turi === 'bitta';
      expect(Boolean(s.variantlar?.length), `${s.raqam}-savol`).toBe(kerak);
    }
  });

  it('variant qiymatlari `profilOqi` dan OʻTADI', () => {
    // Eng muhim tekshiruv: formadagi har variant qabul qilinishi
    // kerak. Bittasi roʻyxatdan tushib qolsa `royxatdan()` uni
    // `null` qiladi — yaʼni javob berilgan, lekin saqlanmagan.
    for (const s of SAVOLLAR) {
      for (const v of s.variantlar ?? []) {
        const xom =
          s.turi === 'kop' ? { [s.maydon]: [v.qiymat] } : { [s.maydon]: v.qiymat };
        const oqildi = profilOqi(xom)[s.maydon];
        expect(oqildi, `${s.raqam}-savol, "${v.qiymat}"`).not.toBeNull();
      }
    }
  });

  it('shahar roʻyxatida takror yoʻq', () => {
    expect(new Set(SHAHARLAR).size).toBe(SHAHARLAR.length);
  });
});
