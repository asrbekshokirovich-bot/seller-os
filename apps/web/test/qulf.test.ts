/**
 * Panel qulfi.
 *
 * Eng muhim tekshiruv — KALITSIZ HOLAT. `PANEL_KALITI` boʻsh
 * boʻlsa panel hech kimga ochilmasligi kerak: sozlash esdan chiqsa
 * ichki raqamlar omma uchun ochilib ketardi.
 *
 * Muhit oʻzgaruvchisi ataylab tozalanadi (QOIDALAR.md §8-e).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PANEL_COOKIE, kalit, togrimi, xesh } from '../src/lib/qulf';

const OLDINGI: { qiymat: string | undefined } = { qiymat: undefined };

beforeEach(() => {
  OLDINGI.qiymat = process.env.PANEL_KALITI;
  delete process.env.PANEL_KALITI;
});

afterEach(() => {
  if (OLDINGI.qiymat === undefined) delete process.env.PANEL_KALITI;
  else process.env.PANEL_KALITI = OLDINGI.qiymat;
});

describe('kalit', () => {
  it('sozlanmagan boʻlsa boʻsh — panel yopiq holatdan boshlanadi', () => {
    expect(kalit()).toBe('');
  });

  it('sozlangani oʻqiladi', () => {
    process.env.PANEL_KALITI = 'sir';
    expect(kalit()).toBe('sir');
  });
});

describe('togrimi', () => {
  it('bir xil sir — toʻgʻri', () => {
    expect(togrimi('sir-123', 'sir-123')).toBe(true);
  });

  it('boshqa sir — notoʻgʻri', () => {
    expect(togrimi('sir-124', 'sir-123')).toBe(false);
  });

  /*
   * Boʻsh qiymat HECH QACHON ochmaydi. Aks holda `PANEL_KALITI`
   * sozlanmagan holatda boʻsh cookie panelni ochib yuborardi.
   */
  it('boʻsh kalit hech qachon ochmaydi', () => {
    expect(togrimi('', '')).toBe(false);
    expect(togrimi('nimadir', '')).toBe(false);
    expect(togrimi('', 'nimadir')).toBe(false);
  });

  it('uzunligi boshqa sir — notoʻgʻri, va yiqilmaydi', () => {
    expect(togrimi('qisqa', 'ancha-uzunroq-sir')).toBe(false);
  });
});

describe('xesh', () => {
  it('cookie da kalitning OʻZI turmaydi', () => {
    const k = 'juda-maxfiy-kalit';
    expect(xesh(k)).not.toBe(k);
    expect(xesh(k)).toHaveLength(64);
  });

  it('bir xil kirish — bir xil xesh', () => {
    expect(xesh('a')).toBe(xesh('a'));
    expect(xesh('a')).not.toBe(xesh('b'));
  });

  it('cookie nomi oʻzgarmas — brauzerdagi eski cookie yoʻqolmasin', () => {
    expect(PANEL_COOKIE).toBe('so_panel');
  });
});
