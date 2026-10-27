/**
 * CBU kursi — oʻqish va olish.
 *
 * Namuna JONLI oʻlchov: `cbu.uz/uz/arkhiv-kursov-valyut/json/CNY/`
 * 2026-09-25 da aynan shuni qaytardi. Tarmoqqa chiqilmaydi.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { brauzerKursi, cbuKursiniOqi, cbuManzili, kursniOl } from '@selleros/shared';

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
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const yiqil = (async () => { throw new Error('ENOTFOUND'); }) as unknown as typeof fetch;
    expect(await kursniOl(yiqil)).toBeNull();
    const xato = (async () => new Response('x', { status: 503 })) as unknown as typeof fetch;
    expect(await kursniOl(xato)).toBeNull();
  });

  /*
   * 2026-10-27: 22-oktyabrdan beri Edge dan kurs olinmayapti (noutbukdan olinadi), lekin sababi
   * hech qayerda koʻrinmas edi — `catch {}` yutib yuborardi. Endi har yiqilishning sababi logda.
   */
  afterEach(() => { vi.restoreAllMocks(); });
  it('olinmasa — sababi va vaqti logda: tarmoq xatosi, HTTP holati, toʻsish sahifasi (JSON emas)', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await kursniOl((async () => { throw Object.assign(new Error('connection reset'), { name: 'TypeError' }); }) as unknown as typeof fetch, 'USD');
    await kursniOl((async () => new Response('Forbidden', { status: 403 })) as unknown as typeof fetch);
    await kursniOl((async () => new Response('<html>\n  <title>Access denied</title>', { status: 200 })) as unknown as typeof fetch);
    await kursniOl((async () => new Response('[]', { status: 200 })) as unknown as typeof fetch);
    const q = log.mock.calls.map((c) => String(c[0]));
    expect(q).toHaveLength(4);
    expect(q[0]).toMatch(/^kurs: CBU USD olinmadi — TypeError: connection reset \(\d+ ms\)$/);
    expect(q[1]).toMatch(/^kurs: CBU CNY olinmadi — HTTP 403: Forbidden \(\d+ ms\)$/);
    expect(q[2]).toMatch(/^kurs: CBU CNY olinmadi — JSON emas: <html> <title>Access denied<\/title> \(\d+ ms\)$/);
    expect(q[3]).toMatch(/javob shakli kutilmagan: \[\]/);
  });

  it('olinsa — log yoʻq', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await kursniOl((async () => new Response(JSON.stringify(CBU), { status: 200 })) as unknown as typeof fetch);
    expect(log).not.toHaveBeenCalled();
  });
});

/*
 * 2026-10-27: cbu.uz serverlarimizga javob bermaydi — kursni mijoz brauzeri oladi va suhbat
 * soʻroviga qoʻshadi. Bu mijoz yuborgan qiymat: shakli, oqilona chegarasi va sanasi tekshiriladi;
 * oʻtmasa — null (server CBU ga oʻzi urinadi).
 */
describe('brauzerKursi', () => {
  const BUGUN = new Date('2026-10-27T10:00:00Z');
  const USD = { Ccy: 'USD', Rate: '11861.96', Nominal: '1', Date: '27.10.2026' };
  const CNY = { Ccy: 'CNY', Rate: '1663.05', Nominal: '1', Date: '27.10.2026' };

  it('toʻgʻri qatorlar — CBU kursi (manba CBU)', () => {
    expect(brauzerKursi({ USD, CNY }, BUGUN)).toEqual({
      USD: { somPerYuan: 11861.96, valyuta: 'USD', sana: '27.10.2026', manba: 'CBU' },
      CNY: { somPerYuan: 1663.05, valyuta: 'CNY', sana: '27.10.2026', manba: 'CBU' },
    });
  });

  it('yoʻq, buzuq yoki notoʻgʻri valyuta — null (otmaydi)', () => {
    for (const x of [undefined, null, 'USD', 42, [], { USD: 'x' }, { USD: { ...USD, Ccy: 'CNY' } }]) {
      expect(brauzerKursi(x, BUGUN), JSON.stringify(x)).toEqual({ USD: null, CNY: null });
    }
    // Bittasi toʻgʻri — oʻshasi.
    expect(brauzerKursi({ CNY }, BUGUN).USD).toBeNull();
    expect(brauzerKursi({ CNY }, BUGUN).CNY?.somPerYuan).toBe(1663.05);
  });

  it('oqilona chegaradan tashqari — null (USD 8–20 ming, CNY 1–3 ming soʻm); Nominal hisobga olinadi', () => {
    expect(brauzerKursi({ USD: { ...USD, Rate: '7999' } }, BUGUN).USD).toBeNull();
    expect(brauzerKursi({ USD: { ...USD, Rate: '20001' } }, BUGUN).USD).toBeNull();
    expect(brauzerKursi({ CNY: { ...CNY, Rate: '999' } }, BUGUN).CNY).toBeNull();
    expect(brauzerKursi({ CNY: { ...CNY, Rate: '3001' } }, BUGUN).CNY).toBeNull();
    expect(brauzerKursi({ CNY: { ...CNY, Rate: '16630.5', Nominal: '10' } }, BUGUN).CNY?.somPerYuan).toBeCloseTo(1663.05, 6);
  });

  it('sana: bugundan 7 kun oldin — ertagacha (Toshkent); eskirgan yoki uzoq kelajak — null', () => {
    const sana = (d: string) => brauzerKursi({ USD: { ...USD, Date: d } }, BUGUN).USD?.sana ?? null;
    expect(sana('20.10.2026')).toBe('20.10.2026');
    expect(sana('19.10.2026')).toBeNull();
    expect(sana('28.10.2026')).toBe('28.10.2026');
    expect(sana('29.10.2026')).toBeNull();
    expect(sana('2026-10-27')).toBeNull();
    // Toshkentda yarim tun oʻtgan (UTC 19:30 — Toshkent 00:30, 28-oktyabr): ertangi sana — bugun.
    expect(brauzerKursi({ USD: { ...USD, Date: '29.10.2026' } }, new Date('2026-10-27T19:30:00Z')).USD?.sana).toBe('29.10.2026');
  });
});
