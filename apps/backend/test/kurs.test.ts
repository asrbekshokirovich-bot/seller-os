/**
 * CBU kursi — oʻqish va olish.
 *
 * Namuna JONLI oʻlchov: `cbu.uz/uz/arkhiv-kursov-valyut/json/CNY/`
 * 2026-09-25 da aynan shuni qaytardi. Tarmoqqa chiqilmaydi.
 */

import { describe, expect, it } from 'vitest';
import { cbuKursiniOqi, cbuManzili, kursniOl } from '@selleros/shared';

const CBU = [{
  id: 1, Code: '156', Ccy: 'CNY', CcyNm_RU: 'Юань', CcyNm_UZ: 'Xitoy yuani',
  Nominal: '1', Rate: '1762.49', Diff: '1.17', Date: '25.09.2026',
}];

describe('cbuKursiniOqi', () => {
  it('jonli namuna: 1 yuan = 1762.49 soʻm, sana bilan', () => {
    expect(cbuKursiniOqi(CBU)).toEqual({ somPerYuan: 1762.49, valyuta: 'CNY', sana: '25.09.2026', manba: 'CBU' });
  });
  it('Nominal 10 boʻlsa boʻlinadi', () => {
    expect(cbuKursiniOqi([{ ...CBU[0], Nominal: '10', Rate: '17624.9' }])?.somPerYuan).toBeCloseTo(1762.49, 6);
  });
  it('boʻsh, boshqa valyuta, boʻsh Rate, nol Rate, sanasiz — null (nol EMAS)', () => {
    expect(cbuKursiniOqi([])).toBeNull();
    expect(cbuKursiniOqi(null)).toBeNull();
    expect(cbuKursiniOqi([{ ...CBU[0], Ccy: 'USD' }])).toBeNull();
    expect(cbuKursiniOqi([{ ...CBU[0], Rate: '' }])).toBeNull();
    expect(cbuKursiniOqi([{ ...CBU[0], Rate: '0' }])).toBeNull();
    expect(cbuKursiniOqi([{ ...CBU[0], Date: '' }])).toBeNull();
  });
});

describe('kursniOl', () => {
  it('CBU manzilini soʻraydi va oʻqiydi', async () => {
    const urllar: string[] = [];
    const f = (async (u: string | URL | Request) => { urllar.push(String(u)); return new Response(JSON.stringify(CBU), { status: 200 }); }) as unknown as typeof fetch;
    expect(await kursniOl(f)).toEqual({ somPerYuan: 1762.49, valyuta: 'CNY', sana: '25.09.2026', manba: 'CBU' });
    expect(urllar).toEqual([cbuManzili('CNY')]);
  });
  it('USD ham: alohida manzil, Ccy boʻyicha ajratiladi', async () => {
    const USD = [{ Ccy: 'USD', Nominal: '1', Rate: '12650.11', Date: '26.09.2026' }];
    const f = (async (u: string | URL | Request) => new Response(JSON.stringify(String(u).includes('/USD/') ? USD : CBU), { status: 200 })) as unknown as typeof fetch;
    expect(await kursniOl(f, 'USD')).toEqual({ somPerYuan: 12650.11, valyuta: 'USD', sana: '26.09.2026', manba: 'CBU' });
    expect(cbuKursiniOqi(CBU, 'USD')).toBeNull();
  });
  it('tarmoq yiqilsa yoki HTTP xato — null, otmaydi', async () => {
    const yiqil = (async () => { throw new Error('ENOTFOUND'); }) as unknown as typeof fetch;
    expect(await kursniOl(yiqil)).toBeNull();
    const xato = (async () => new Response('x', { status: 503 })) as unknown as typeof fetch;
    expect(await kursniOl(xato)).toBeNull();
  });
});
