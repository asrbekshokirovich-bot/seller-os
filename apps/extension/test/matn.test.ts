/**
 * Kengaytma matnlari: Uzum savat tugmasi (oʻzbekcha va ruscha) va xato matni.
 */

import { describe, expect, it } from 'vitest';
import { savatTugmasimi, xatoMatni } from '../src/matn';

describe('savatTugmasimi', () => {
  it('oʻzbekcha va ruscha Uzum tugmasi (oʻlchangan matn, 2026-10-05)', () => {
    expect(savatTugmasimi('Savatga qoʻshishErtaga yetkazib beramiz')).toBe(true);
    expect(savatTugmasimi('Добавить в корзинуДоставим завтра')).toBe(true);
    expect(savatTugmasimi('В КОРЗИНУ')).toBe(true);
  });
  it('boshqa tugmalar emas', () => {
    expect(savatTugmasimi('Savat')).toBe(false);
    expect(savatTugmasimi('Корзина')).toBe(false);
    expect(savatTugmasimi('Xitoydan top')).toBe(false);
    expect(savatTugmasimi('')).toBe(false);
  });
});

describe('xatoMatni', () => {
  it('kengaytma yangilangandan keyingi xato', () => {
    expect(xatoMatni(new Error('Extension context invalidated.'))).toBe('kengaytma yangilandi — sahifani yangilang (F5)');
  });
  it('tarmoq xatosi', () => {
    expect(xatoMatni(new TypeError('Failed to fetch'))).toBe('internetga ulanib boʻlmadi — qayta urinib koʻring');
    expect(xatoMatni('NetworkError when attempting to fetch resource.')).toBe('internetga ulanib boʻlmadi — qayta urinib koʻring');
  });
  it('boshqasi — umumiy oʻzbekcha matn, xom inglizcha matn chiqmaydi', () => {
    const m = xatoMatni(new Error('Cannot read properties of undefined'));
    expect(m).toBe('kutilmagan xato — sahifani yangilab, qayta urinib koʻring');
    expect(xatoMatni(undefined)).toBe(m);
    expect(xatoMatni(null)).toBe(m);
  });
});
