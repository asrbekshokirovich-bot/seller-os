/**
 * Bosh sahifadan chatga birinchi xabar (`lib/bosh-xabar.ts`) — nazoratchi, 2026-10-28.
 *
 * NEGA BU TESTLAR BOR. Bosh sahifadagi tanlov chatga bitta gap boʻlib ketadi: soha nomlari
 * chatdagidek (AI aniq tanisin), pul chatdagi tugmalar bilan bir xil yozilsin. Matn bir marta
 * oʻqiladi va oʻchadi (sahifa yangilansa qayta yuborilmaydi), eskirgani yuborilmaydi, xotira
 * yopiq boʻlsa sahifa yiqilmaydi.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BYUDJET_TUGMALARI } from '@selleros/shared';
import {
  BOSH_XABAR_MAX, boshXabarMatni, pulMatni,
} from '../src/lib/bosh-xabar';

function xotira() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
    m,
  };
}

beforeEach(() => { vi.stubGlobal('sessionStorage', xotira()); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('pulMatni', () => {
  it('chatdagi pul tugmalari bilan bir xil yozuv', () => {
    for (const t of BYUDJET_TUGMALARI) expect(pulMatni(Number(t.qiymat), 'uz')).toBe(t.nom);
    expect(pulMatni(30_000_000, 'ru')).toBe('30 млн сум');
    expect(pulMatni(2_500_000, 'uz')).toBe('2,5 mln soʻm');
  });
});

describe('boshXabarMatni', () => {
  it('sohalar chatdagi nomlari bilan, oʻz tartibida; pul; oʻzi yozgani — bitta gap', () => {
    expect(boshXabarMatni(['bolalar', 'kiyim'], 30_000_000, '', 'uz'))
      .toBe('Kiyim va poyabzal, Bolalar tovarlari. Byudjet: 30 mln soʻm');
    expect(boshXabarMatni(['uy'], null, '  ayollar uchun   idishlar ', 'uz'))
      .toBe('Uy-roʻzgʻor va maishiy texnika. ayollar uchun idishlar');
    expect(boshXabarMatni([], 10_000_000, '', 'ru')).toBe('Бюджет: 10 млн сум');
    expect(boshXabarMatni(['gozallik'], 5_000_000, '', 'ru')).toBe('Красота и уход. Бюджет: 5 млн сум');
  });

  it('«Bilmayman» — chatdagi tugma matni, boshqa sohalar qoʻshilmaydi', () => {
    expect(boshXabarMatni(['bilmayman', 'kiyim'], 70_000_000, '', 'uz'))
      .toBe('Bilmayman — eng yaxshilarini koʻrsating. Byudjet: 70 mln soʻm');
  });

  it('hech narsa yoʻq — `null`; begona soha id si tashlanadi; uzun matn — chegaragacha', () => {
    expect(boshXabarMatni([], null, '   ', 'uz')).toBeNull();
    expect(boshXabarMatni(['begona'], null, '', 'uz')).toBeNull();
    expect(boshXabarMatni([], null, 'a'.repeat(900), 'uz')).toHaveLength(BOSH_XABAR_MAX);
  });
});

