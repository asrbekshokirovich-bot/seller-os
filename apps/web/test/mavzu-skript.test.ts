import { describe, expect, it } from 'vitest';
import { MAVZU_SKRIPTI } from '../src/lib/mavzu-skript';

/**
 * Bosh skript (ikkinchi koʻrik, 9-taklif): yangi mijozga salom sahifa HTMLida keladi; suhbati bor mijozda
 * (`zs-suhbat-bor`) yoki kengaytmada (`#sessiya=`) chizishdan oldin `data-suhbat-bor` qoʻyiladi — CSS salomni yashiradi.
 */
describe('bosh skript — data-suhbat-bor', () => {
  it('suhbati bor mijozda yoki kengaytmada qoʻyadi, yangi mijozda — yoʻq; xotira yopiq boʻlsa — yiqilmaydi', () => {
    const g = globalThis as Record<string, unknown>;
    const eski = { document: g.document, localStorage: Object.getOwnPropertyDescriptor(g, 'localStorage'), location: g.location };
    const ishlat = (bor: boolean | 'xato', hash = ''): boolean => {
      const attr: Record<string, string> = {};
      g.document = {
        documentElement: { setAttribute: (k: string, v: string) => { attr[k] = v; }, lang: '' },
        cookie: '', querySelector: () => null, createElement: () => ({}), head: { appendChild: () => {} },
      };
      Object.defineProperty(g, 'localStorage', {
        configurable: true,
        value: { getItem: (k: string) => { if (bor === 'xato') throw new Error('yopiq'); return k === 'zs-suhbat-bor' && bor ? '1' : null; } },
      });
      g.location = { hash };
      new Function(MAVZU_SKRIPTI)();
      return 'data-suhbat-bor' in attr;
    };
    try {
      expect(ishlat(false)).toBe(false);
      expect(ishlat(true)).toBe(true);
      expect(ishlat(false, '#sessiya=abc&kengaytma=1')).toBe(true);
      expect(ishlat('xato')).toBe(false);
    } finally {
      g.document = eski.document;
      g.location = eski.location;
      if (eski.localStorage) Object.defineProperty(g, 'localStorage', eski.localStorage);
      else delete g.localStorage;
    }
  });
});
