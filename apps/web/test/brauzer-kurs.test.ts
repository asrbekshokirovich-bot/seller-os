/**
 * CBU kursi — brauzerdan (2026-10-27).
 *
 * NEGA BU TEST BOR. cbu.uz serverlarimizga (Supabase Edge, Vercel) javob bermaydi — kursni
 * mijoz brauzeri oladi va suhbat soʻroviga qoʻshadi, server uni tekshiradi (`brauzerKursi`).
 * Bu yerda: faqat kerakli maydonlar ketadi, olinmasa `null` (otmaydi), kuniga bir marta olinadi.
 * Brauzer ↔ server zanjiri ham (sahifa yuborgani serverda qabul qilinadi). Tarmoqqa chiqilmaydi.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { brauzerKursi, cbuManzili } from '@selleros/shared';
import { cbuQatorlari } from '../src/lib/brauzer-kurs';

const USD = { id: 1, Code: '840', Ccy: 'USD', CcyNm_UZ: 'AQSH dollari', Nominal: '1', Rate: '11861.96', Diff: '-2.1', Date: '27.10.2026' };
const CNY = { id: 2, Code: '156', Ccy: 'CNY', CcyNm_UZ: 'Xitoy yuani', Nominal: '1', Rate: '1663.05', Diff: '0.4', Date: '27.10.2026' };
const BUGUN = new Date('2026-10-27T10:00:00Z');

/** sessionStorage — soxta (vitest node muhitida yoʻq). */
function soxtaXotira() {
  const m = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
  });
  return m;
}

function cbu(urllar: string[], holat: { USD?: unknown; CNY?: unknown } = { USD: [USD], CNY: [CNY] }): typeof fetch {
  return (async (u: string | URL | Request) => {
    urllar.push(String(u));
    const v = String(u).includes('/USD/') ? holat.USD : holat.CNY;
    if (v === undefined) throw new TypeError('Failed to fetch');
    return new Response(JSON.stringify(v), { status: 200 });
  }) as unknown as typeof fetch;
}

beforeEach(() => { soxtaXotira(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('cbuQatorlari', () => {
  it('USD va CNY — CBU manzilidan; serverga faqat Ccy, Rate, Nominal, Date ketadi', async () => {
    const urllar: string[] = [];
    const q = await cbuQatorlari(cbu(urllar), BUGUN);
    expect(q).toEqual({
      USD: { Ccy: 'USD', Rate: '11861.96', Nominal: '1', Date: '27.10.2026' },
      CNY: { Ccy: 'CNY', Rate: '1663.05', Nominal: '1', Date: '27.10.2026' },
    });
    expect(urllar.sort()).toEqual([cbuManzili('CNY'), cbuManzili('USD')]);
  });

  it('kuniga bir marta: ikkinchi chaqiruv — xotiradan, CBU ga soʻrov yoʻq; ertasi kuni — yana', async () => {
    const urllar: string[] = [];
    await cbuQatorlari(cbu(urllar), BUGUN);
    await cbuQatorlari(cbu(urllar), BUGUN);
    expect(urllar).toHaveLength(2);
    await cbuQatorlari(cbu(urllar), new Date('2026-10-28T10:00:00Z'));
    expect(urllar).toHaveLength(4);
  });

  it('bittasi olinmasa — borini beradi, lekin saqlamaydi (keyingi safar yana urinadi); ikkalasi ham — null', async () => {
    const urllar: string[] = [];
    expect(await cbuQatorlari(cbu(urllar, { USD: [USD] }), BUGUN)).toEqual({ USD: { Ccy: 'USD', Rate: '11861.96', Nominal: '1', Date: '27.10.2026' } });
    await cbuQatorlari(cbu(urllar, { USD: [USD] }), BUGUN);
    expect(urllar).toHaveLength(4);
    expect(await cbuQatorlari(cbu([], {}), BUGUN)).toBeNull();
    // Kutilmagan shakl ham — null, otmaydi.
    expect(await cbuQatorlari(cbu([], { USD: { xato: 1 }, CNY: [{ Ccy: 'EUR' }] }), BUGUN)).toBeNull();
  });

  it('xotira yopiq (maxfiy rejim) — baribir ishlaydi', async () => {
    vi.stubGlobal('sessionStorage', { getItem: () => { throw new Error('yopiq'); }, setItem: () => { throw new Error('yopiq'); } });
    expect((await cbuQatorlari(cbu([]), BUGUN))?.USD?.Rate).toBe('11861.96');
  });

  it('zanjir: sahifa yuborgan qatorlar serverda qabul qilinadi (brauzerKursi)', async () => {
    const q = await cbuQatorlari(cbu([]), BUGUN);
    const k = brauzerKursi(JSON.parse(JSON.stringify(q)), BUGUN);
    expect(k.USD).toEqual({ somPerYuan: 11861.96, valyuta: 'USD', sana: '27.10.2026', manba: 'CBU' });
    expect(k.CNY).toEqual({ somPerYuan: 1663.05, valyuta: 'CNY', sana: '27.10.2026', manba: 'CBU' });
  });
});
