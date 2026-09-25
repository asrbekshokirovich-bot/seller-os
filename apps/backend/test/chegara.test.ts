/**
 * Chegara narx — 4-qadam.
 *
 * Asosiy xavf: yetishmagan qism NOL deb olinib, chegara OSHIB
 * ko'rsatilishi. Kargo bo'lmasa raqam baribir chiqadi, lekin
 * `yetishmaydi` da turadi; komissiya bo'lmasa — chiqmaydi.
 */

import { describe, expect, it } from 'vitest';
import { chegaraNarxi } from '@selleros/shared';

describe('chegaraNarxi', () => {
  it('to\'liq kirishda ochiq hisob', () => {
    const n = chegaraNarxi({ sotuvNarxiSom: 100_000, marjaFoizi: 30, komissiyaFoizi: 10, uzumLogistikaSom: 5_250, kargoSom: 4_000 });
    // 100000*0.7 = 70000 − 10000 − 5250 − 4000 = 50750
    expect(n.chegaraSom).toBe(50_750);
    expect(n.yetishmaydi).toEqual([]);
    expect(n.hisob).toMatch(/= 50750 soʻm/);
  });

  it('kargo yo\'q — hisoblanadi, lekin YETISHMAYDI da turadi', () => {
    const n = chegaraNarxi({ sotuvNarxiSom: 100_000, marjaFoizi: 30, komissiyaFoizi: 10, uzumLogistikaSom: 5_250, kargoSom: null });
    expect(n.chegaraSom).toBe(54_750);
    expect(n.yetishmaydi).toEqual(['kargo']);
    expect(n.hisob).not.toMatch(/kargo/);
  });

  it('komissiya yo\'q — hisob YO\'Q', () => {
    const n = chegaraNarxi({ sotuvNarxiSom: 100_000, marjaFoizi: 30, komissiyaFoizi: null, uzumLogistikaSom: null, kargoSom: null });
    expect(n.chegaraSom).toBeNull();
    expect(n.yetishmaydi).toContain('komissiya');
  });

  it('manfiy chiqsa nol — "Xitoyda tekin bo\'lsa ham foyda yo\'q"', () => {
    const n = chegaraNarxi({ sotuvNarxiSom: 10_000, marjaFoizi: 50, komissiyaFoizi: 30, uzumLogistikaSom: 5_250, kargoSom: 3_000 });
    expect(n.chegaraSom).toBe(0);
  });

  it('marja 100 va undan yuqori rad etiladi', () => {
    expect(chegaraNarxi({ sotuvNarxiSom: 1, marjaFoizi: 100, komissiyaFoizi: 1, uzumLogistikaSom: 0, kargoSom: 0 }).chegaraSom).toBeNull();
  });
});
