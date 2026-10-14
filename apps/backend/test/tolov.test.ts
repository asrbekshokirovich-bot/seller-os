/**
 * Obuna toʻlovi — Payme Merchant API va Click SHOP API (0067; nazoratchi 2026-10-14:
 * "149 000 soʻm/oy, faqat Payme/Click").
 *
 * NEGA BU TESTLAR BOR. Bu uchlar pul oladi va obunani ochadi. Eski kod (Fastify)
 * Payme ga doim «allow» derdi, summani tekshirmasdi va imzosiz uchdan obuna yozardi.
 * Bu yerda: kalit/imzo tekshiruvi, summa tiyinda, xato kodlari protokoldagidek,
 * bazaga aynan nima ketishi. Holat mashinasi (12 soat, takror, qaytarish) — SQL da,
 * PGlite bilan alohida sinalgan (scratchpad `pglite-sinov/tolov.mjs`).
 */

import { describe, expect, it } from 'vitest';
import {
  clickCheckoutUrl, clickIshla, md5, OBUNA_NARXI, paymeCheckoutUrl, paymeIshla, tolovniBoshla, tolovSozlamasi,
  type TolovSozlamasi,
} from '@selleros/shared';
import { build } from '../src/app.js';

/** Soxta baza: chaqiruvlar yoziladi, javoblar oldindan berilgan. */
function rpcSoxta(javoblar: Record<string, unknown>) {
  const chaqiruvlar: Array<{ nom: string; arg: Record<string, unknown> }> = [];
  const rpc = async <T>(nom: string, arg: Record<string, unknown>): Promise<T | null> => {
    chaqiruvlar.push({ nom, arg });
    return (nom in javoblar ? javoblar[nom] : null) as T | null;
  };
  return { rpc, chaqiruvlar };
}

// ==================================================================== Payme

const KALIT = 'payme-sinov-kaliti-36-belgi-xxxxxxxxxxx';
const AUTH = `Basic ${btoa(`Paycom:${KALIT}`)}`;
const sorov = (method: string, params: Record<string, unknown>, id: unknown = 7) => JSON.stringify({ method, params, id });
const SUMMA = OBUNA_NARXI * 100;

describe('Payme — avtorizatsiya va soʻrov shakli', () => {
  it('kalit sozlanmagan yoki notoʻgʻri — -32504; login tekshirilmaydi, kalit tekshiriladi', async () => {
    const b = rpcSoxta({ so_payme_tekshir: { ok: true } });
    const q = sorov('CheckPerformTransaction', { amount: SUMMA, account: { order_id: '5' } });
    expect((await paymeIshla(b.rpc, AUTH, q, { kalit: null })).error?.code).toBe(-32504);
    expect((await paymeIshla(b.rpc, `Basic ${btoa('Paycom:boshqa')}`, q, { kalit: KALIT })).error?.code).toBe(-32504);
    expect((await paymeIshla(b.rpc, null, q, { kalit: KALIT })).error?.code).toBe(-32504);
    expect((await paymeIshla(b.rpc, `Bearer ${KALIT}`, q, { kalit: KALIT })).error?.code).toBe(-32504);
    expect(b.chaqiruvlar).toHaveLength(0);
    const r = await paymeIshla(b.rpc, `Basic ${btoa(`boshqa-login:${KALIT}`)}`, q, { kalit: KALIT });
    expect(r).toEqual({ id: 7, result: { allow: true } });
  });

  it('JSON emas — -32700 (kalit toʻgʻri boʻlsa); usulsiz — -32600; notanish usul — -32601 va nomi', async () => {
    const b = rpcSoxta({});
    expect((await paymeIshla(b.rpc, AUTH, '{buzuq', { kalit: KALIT })).error?.code).toBe(-32700);
    expect((await paymeIshla(b.rpc, 'Basic eA==', '{buzuq', { kalit: KALIT })).error?.code).toBe(-32504);
    expect((await paymeIshla(b.rpc, AUTH, JSON.stringify({ id: 3 }), { kalit: KALIT }))).toMatchObject({ id: 3, error: { code: -32600 } });
    const n = await paymeIshla(b.rpc, AUTH, sorov('Yoq', {}), { kalit: KALIT });
    expect(n.error).toMatchObject({ code: -32601, data: 'Yoq', message: { uz: 'Metod topilmadi' } });
    // Kassa kaliti faqat Supabase sirida — API orqali almashtirilmaydi.
    expect((await paymeIshla(b.rpc, AUTH, sorov('ChangePassword', { password: 'x' }), { kalit: KALIT })).error?.code).toBe(-32504);
    expect(b.chaqiruvlar).toHaveLength(0);
  });
});

describe('Payme — usullar', () => {
  it('CheckPerformTransaction: summa tiyinda va buyurtma bazaga; xatolar — protokol kodlari', async () => {
    const q = (amount: unknown, account: unknown) => sorov('CheckPerformTransaction', { amount, account });
    const b = rpcSoxta({ so_payme_tekshir: { ok: true } });
    expect(await paymeIshla(b.rpc, AUTH, q(SUMMA, { order_id: '42' }), { kalit: KALIT })).toEqual({ id: 7, result: { allow: true } });
    expect(b.chaqiruvlar).toEqual([{ nom: 'so_payme_tekshir', arg: { p_buyurtma: 42, p_summa_tiyin: SUMMA } }]);
    expect((await paymeIshla(b.rpc, AUTH, q(0, { order_id: '42' }), { kalit: KALIT })).error?.code).toBe(-31001);
    expect((await paymeIshla(b.rpc, AUTH, q(1.5, { order_id: '42' }), { kalit: KALIT })).error?.code).toBe(-31001);
    expect((await paymeIshla(b.rpc, AUTH, q(SUMMA, { order_id: 'abc' }), { kalit: KALIT })).error).toMatchObject({ code: -31050, data: 'order_id' });
    expect((await paymeIshla(b.rpc, AUTH, q(SUMMA, {}), { kalit: KALIT })).error).toMatchObject({ code: -31050, data: 'order_id' });
    for (const [sabab, kod] of [['summa', -31001], ['buyurtma_yoq', -31050], ['buyurtma_yopiq', -31051], ['band', -31052]] as const) {
      const x = await paymeIshla(rpcSoxta({ so_payme_tekshir: { xato: sabab } }).rpc, AUTH, q(SUMMA, { order_id: 42 }), { kalit: KALIT });
      expect(x.error?.code, sabab).toBe(kod);
    }
    expect((await paymeIshla(rpcSoxta({}).rpc, AUTH, q(SUMMA, { order_id: 42 }), { kalit: KALIT })).error?.code).toBe(-32400);
  });

  it('CheckPerformTransaction: fiskal chek — IKPU berilganda, summa bilan', async () => {
    const b = rpcSoxta({ so_payme_tekshir: { ok: true } });
    const chek = { ikpu: '10399002001000000', paketKodi: '1545643', qqsFoiz: 0, nom: 'ZumSavdo obunasi — 1 oy' };
    const r = await paymeIshla(b.rpc, AUTH, sorov('CheckPerformTransaction', { amount: SUMMA, account: { order_id: '1' } }), { kalit: KALIT, chek });
    expect(r.result).toEqual({ allow: true, detail: { receipt_type: 0, items: [{ title: chek.nom, price: SUMMA, count: 1, code: chek.ikpu, package_code: chek.paketKodi, vat_percent: 0 }] } });
  });

  it('CreateTransaction: bazaga id, vaqt, summa, buyurtma; «band» — -31008; natija maydonlari', async () => {
    const q = sorov('CreateTransaction', { id: 'abc123', time: 1_700_000, amount: SUMMA, account: { order_id: '9' } });
    const b = rpcSoxta({ so_payme_yarat: { create_time: 111, transaction: '5', state: 1 } });
    expect(await paymeIshla(b.rpc, AUTH, q, { kalit: KALIT })).toEqual({ id: 7, result: { create_time: 111, transaction: '5', state: 1 } });
    expect(b.chaqiruvlar[0]).toEqual({ nom: 'so_payme_yarat', arg: { p_id: 'abc123', p_time: 1_700_000, p_summa_tiyin: SUMMA, p_buyurtma: 9 } });
    expect((await paymeIshla(rpcSoxta({ so_payme_yarat: { xato: 'band' } }).rpc, AUTH, q, { kalit: KALIT })).error?.code).toBe(-31008);
    expect((await paymeIshla(rpcSoxta({ so_payme_yarat: { xato: 'holat' } }).rpc, AUTH, q, { kalit: KALIT })).error?.code).toBe(-31008);
    expect((await paymeIshla(rpcSoxta({ so_payme_yarat: { xato: 'buyurtma_yopiq' } }).rpc, AUTH, q, { kalit: KALIT })).error).toMatchObject({ code: -31051, data: 'order_id' });
    expect((await paymeIshla(b.rpc, AUTH, sorov('CreateTransaction', { time: 1, amount: SUMMA, account: { order_id: '9' } }), { kalit: KALIT })).error?.code).toBe(-32600);
  });

  it('Perform, Check, Cancel, GetStatement — bazadagi javob oʻzgarmay; topilmadi — -31003', async () => {
    const bajar = { transaction: '5', perform_time: 222, state: 2 };
    const b = rpcSoxta({ so_payme_bajar: bajar, so_payme_holat: { state: 2 }, so_payme_bekor: { state: -2 }, so_payme_royxat: { transactions: [{ id: 'abc' }] } });
    expect(await paymeIshla(b.rpc, AUTH, sorov('PerformTransaction', { id: 'abc' }), { kalit: KALIT })).toEqual({ id: 7, result: bajar });
    expect((await paymeIshla(b.rpc, AUTH, sorov('CheckTransaction', { id: 'abc' }), { kalit: KALIT })).result).toEqual({ state: 2 });
    expect((await paymeIshla(b.rpc, AUTH, sorov('CancelTransaction', { id: 'abc', reason: 5 }), { kalit: KALIT })).result).toEqual({ state: -2 });
    expect((await paymeIshla(b.rpc, AUTH, sorov('CancelTransaction', { id: 'abc' }), { kalit: KALIT })).error?.code).toBe(-32600);
    expect((await paymeIshla(b.rpc, AUTH, sorov('GetStatement', { from: 1, to: 2 }), { kalit: KALIT })).result).toEqual({ transactions: [{ id: 'abc' }] });
    expect(b.chaqiruvlar.map((c) => [c.nom, c.arg])).toEqual([
      ['so_payme_bajar', { p_id: 'abc' }], ['so_payme_holat', { p_id: 'abc' }], ['so_payme_bekor', { p_id: 'abc', p_sabab: 5 }],
      ['so_payme_royxat', { p_dan: 1, p_gacha: 2 }],
    ]);
    const yoq = rpcSoxta({ so_payme_bajar: { xato: 'topilmadi' }, so_payme_holat: { xato: 'topilmadi' }, so_payme_bekor: { xato: 'topilmadi' } });
    for (const m of ['PerformTransaction', 'CheckTransaction']) {
      expect((await paymeIshla(yoq.rpc, AUTH, sorov(m, { id: 'x' }), { kalit: KALIT })).error?.code, m).toBe(-31003);
    }
    expect((await paymeIshla(yoq.rpc, AUTH, sorov('CancelTransaction', { id: 'x', reason: 1 }), { kalit: KALIT })).error?.code).toBe(-31003);
    expect((await paymeIshla(rpcSoxta({ so_payme_bajar: { xato: 'holat' } }).rpc, AUTH, sorov('PerformTransaction', { id: 'x' }), { kalit: KALIT })).error?.code).toBe(-31008);
  });

  it('toʻlov sahifasi: base64 parametrlar; sinovda — test.paycom.uz; «;» li qaytish manzili qoʻshilmaydi', () => {
    const jonli = paymeCheckoutUrl({ merchantId: 'm1', buyurtma: 7, summaTiyin: SUMMA, qaytish: 'https://zumsavdo.vercel.app/usta', sinov: false });
    expect(jonli.startsWith('https://checkout.paycom.uz/')).toBe(true);
    expect(atob(jonli.split('/').pop()!)).toBe(`m=m1;ac.order_id=7;a=${SUMMA};l=uz;c=https://zumsavdo.vercel.app/usta`);
    const sinov = paymeCheckoutUrl({ merchantId: 'm1', buyurtma: 7, summaTiyin: SUMMA, qaytish: 'https://x.uz/a;b', sinov: true });
    expect(sinov.startsWith('https://test.paycom.uz/')).toBe(true);
    expect(atob(sinov.split('/').pop()!)).toBe(`m=m1;ac.order_id=7;a=${SUMMA};l=uz`);
  });
});

// ==================================================================== Click

const SIR = 'click-sir';
const XIZMAT = '11111';

/** Imzolangan Click formasi (rasmiy formula, `amount` — xom matn). */
function clickForma(q: Record<string, string>): URLSearchParams {
  const f: Record<string, string> = { click_trans_id: '987654', service_id: XIZMAT, click_paydoc_id: '1', merchant_trans_id: '42', amount: '149000.00',
    action: '0', error: '0', error_note: 'Success', sign_time: '2026-10-14 12:00:00', ...q };
  const imzo = md5(`${f.click_trans_id}${f.service_id}${SIR}${f.merchant_trans_id}${f.action === '1' ? f.merchant_prepare_id ?? '' : ''}${f.amount}${f.action}${f.sign_time}`);
  return new URLSearchParams({ ...f, sign_string: q.sign_string ?? imzo });
}

describe('Click — imzo va forma', () => {
  it('MD5 — rasmiy namunalar', () => {
    expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect(md5('abc')).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(md5('The quick brown fox jumps over the lazy dog')).toBe('9e107d9d372bb6826bd81d3542a419d6');
    expect(md5('1234567890'.repeat(8))).toBe('57edf4a22be3c955ac49da2e2107b67a');
  });

  it('sozlanmagan — -8; notanish amal — -3; imzo yoki service_id notoʻgʻri — -1; bazaga bormaydi', async () => {
    const b = rpcSoxta({ so_click_tayyorla: { prepare_id: 1 } });
    expect((await clickIshla(b.rpc, clickForma({}), { xizmatId: null, maxfiyKalit: SIR })).error).toBe(-8);
    expect((await clickIshla(b.rpc, clickForma({ action: '5' }), { xizmatId: XIZMAT, maxfiyKalit: SIR })).error).toBe(-3);
    expect((await clickIshla(b.rpc, clickForma({ sign_string: 'deadbeef' }), { xizmatId: XIZMAT, maxfiyKalit: SIR })).error).toBe(-1);
    expect((await clickIshla(b.rpc, clickForma({ service_id: '22222' }), { xizmatId: XIZMAT, maxfiyKalit: SIR })).error).toBe(-1);
    expect((await clickIshla(b.rpc, clickForma({}), { xizmatId: XIZMAT, maxfiyKalit: 'boshqa' })).error).toBe(-1);
    const r = await clickIshla(b.rpc, clickForma({}), { xizmatId: XIZMAT, maxfiyKalit: SIR });
    expect(r).toEqual({ click_trans_id: '987654', merchant_trans_id: '42', merchant_prepare_id: 1, error: 0, error_note: 'Success' });
    expect(b.chaqiruvlar).toEqual([{ nom: 'so_click_tayyorla', arg: { p_click_id: 987654, p_buyurtma: 42, p_summa_tiyin: SUMMA } }]);
  });

  it('summa tiyinga (kasr bilan); notoʻgʻri summa — -2; buyurtma raqam emas — -5; Click xatosi — -9, bazasiz', async () => {
    const b = rpcSoxta({ so_click_tayyorla: { prepare_id: 1 } });
    await clickIshla(b.rpc, clickForma({ amount: '149000.5' }), { xizmatId: XIZMAT, maxfiyKalit: SIR });
    expect(b.chaqiruvlar[0]!.arg.p_summa_tiyin).toBe(14_900_050);
    expect((await clickIshla(b.rpc, clickForma({ amount: '1.234' }), { xizmatId: XIZMAT, maxfiyKalit: SIR })).error).toBe(-2);
    expect((await clickIshla(b.rpc, clickForma({ amount: '-5' }), { xizmatId: XIZMAT, maxfiyKalit: SIR })).error).toBe(-2);
    expect((await clickIshla(b.rpc, clickForma({ merchant_trans_id: 'x1' }), { xizmatId: XIZMAT, maxfiyKalit: SIR })).error).toBe(-5);
    const oldin = b.chaqiruvlar.length;
    expect((await clickIshla(b.rpc, clickForma({ error: '-5017' }), { xizmatId: XIZMAT, maxfiyKalit: SIR })).error).toBe(-9);
    expect(b.chaqiruvlar).toHaveLength(oldin);
  });

  it('Prepare: baza sababi → Click kodi; baza javob bermasa — -7', async () => {
    for (const [sabab, kod] of [['buyurtma_yoq', -5], ['summa', -2], ['tolangan', -4], ['bekor', -9], ['band', -8]] as const) {
      const r = await clickIshla(rpcSoxta({ so_click_tayyorla: { xato: sabab } }).rpc, clickForma({}), { xizmatId: XIZMAT, maxfiyKalit: SIR });
      expect([r.error, r.error_note], sabab).toEqual([kod, expect.any(String)]);
    }
    expect((await clickIshla(rpcSoxta({}).rpc, clickForma({}), { xizmatId: XIZMAT, maxfiyKalit: SIR })).error).toBe(-7);
  });

  it('Complete: imzoda prepare_id bor; natija — confirm_id; Click xatosi bazaga oʻtadi; sabablar — kodlar', async () => {
    const b = rpcSoxta({ so_click_yakunla: { confirm_id: 77 } });
    const f = clickForma({ action: '1', merchant_prepare_id: '77' });
    expect(await clickIshla(b.rpc, f, { xizmatId: XIZMAT, maxfiyKalit: SIR }))
      .toEqual({ click_trans_id: '987654', merchant_trans_id: '42', merchant_confirm_id: 77, error: 0, error_note: 'Success' });
    expect(b.chaqiruvlar[0]).toEqual({ nom: 'so_click_yakunla', arg: { p_click_id: 987654, p_prepare_id: 77, p_buyurtma: 42, p_summa_tiyin: SUMMA, p_click_xato: 0 } });
    // Imzo prepare_id siz hisoblangan boʻlsa — rad.
    const prepareSiz = clickForma({ action: '1', merchant_prepare_id: '77' });
    prepareSiz.set('sign_string', md5('987654' + XIZMAT + SIR + '42' + '149000.00' + '1' + '2026-10-14 12:00:00'));
    expect((await clickIshla(b.rpc, prepareSiz, { xizmatId: XIZMAT, maxfiyKalit: SIR })).error).toBe(-1);
    await clickIshla(b.rpc, clickForma({ action: '1', merchant_prepare_id: '77', error: '-5017' }), { xizmatId: XIZMAT, maxfiyKalit: SIR });
    expect(b.chaqiruvlar.at(-1)!.arg.p_click_xato).toBe(-5017);
    for (const [sabab, kod] of [['tranzaksiya_yoq', -6], ['tolangan', -4], ['bekor', -9], ['summa', -2]] as const) {
      const r = await clickIshla(rpcSoxta({ so_click_yakunla: { xato: sabab } }).rpc, f, { xizmatId: XIZMAT, maxfiyKalit: SIR });
      expect(r.error, sabab).toBe(kod);
    }
  });

  it('toʻlov sahifasi: my.click.uz, summa N.NN, transaction_param — buyurtma', () => {
    const u = new URL(clickCheckoutUrl({ xizmatId: '1', merchantId: '2', buyurtma: 42, summaSom: OBUNA_NARXI, qaytish: 'https://zumsavdo.vercel.app/usta' }));
    expect(u.origin + u.pathname).toBe('https://my.click.uz/services/pay');
    expect(Object.fromEntries(u.searchParams)).toEqual({ service_id: '1', merchant_id: '2', amount: '149000.00', transaction_param: '42', return_url: 'https://zumsavdo.vercel.app/usta' });
  });
});

// ==================================================================== boshlash va sozlamalar

const SOZ = (q: Partial<TolovSozlamasi> = {}): TolovSozlamasi => ({
  jonli: false, qaytish: 'https://zumsavdo.vercel.app/usta',
  payme: { merchantId: 'm1', kalit: 'k', chek: null },
  click: { xizmatId: '1', merchantId: '2', maxfiyKalit: 's' }, ...q,
});

describe('tolovSozlamasi va tolovniBoshla', () => {
  it('sozlamalar: jonli — PAYME_KEY, sinov — PAYME_TEST_KEY; chek — IKPU va qadoq kodi ikkalasi boʻlsa', () => {
    const env = { PAYME_MERCHANT_ID: ' m1 ', PAYME_KEY: 'jonli', PAYME_TEST_KEY: 'sinov', CLICK_SERVICE_ID: '1', PAYME_IKPU: '103', PAYME_PAKET_KODI: '' } as Record<string, string>;
    expect(tolovSozlamasi((k) => env[k])).toMatchObject({ jonli: false, payme: { merchantId: 'm1', kalit: 'sinov', chek: null }, click: { xizmatId: '1', merchantId: null } });
    const j = tolovSozlamasi((k) => ({ ...env, PAYMENTS_LIVE: '1', PAYME_PAKET_KODI: '15' } as Record<string, string>)[k]);
    expect(j).toMatchObject({ jonli: true, payme: { kalit: 'jonli', chek: { ikpu: '103', paketKodi: '15', qqsFoiz: 0 } } });
    expect(j.qaytish).toBe('https://zumsavdo.vercel.app/usta');
  });

  it('notanish provayder — 400; sozlanmagan — 503 va buyurtma yozilmaydi; Click — faqat jonli', async () => {
    const b = rpcSoxta({ so_tolov_buyurtma: { id: 5 } });
    expect(await tolovniBoshla(b.rpc, 't', 'nasiya', SOZ())).toEqual({ status: 400, tana: { xato: 'notanish provayder' } });
    expect((await tolovniBoshla(b.rpc, 't', 'payme', SOZ({ payme: { merchantId: null, kalit: 'k', chek: null } }))).status).toBe(503);
    expect((await tolovniBoshla(b.rpc, 't', 'click', SOZ())).status).toBe(503);
    expect(b.chaqiruvlar).toHaveLength(0);
  });

  it('Payme sinovda: buyurtma 149 000 / 30 kun / sinov; sahifa — test.paycom.uz', async () => {
    const b = rpcSoxta({ so_tolov_buyurtma: { id: 5 } });
    const r = await tolovniBoshla(b.rpc, 't', 'payme', SOZ());
    expect(b.chaqiruvlar[0]).toEqual({ nom: 'so_tolov_buyurtma', arg: { p_token: 't', p_provayder: 'payme', p_reja: 'pro', p_summa_som: 149_000, p_kun: 30, p_sandbox: true } });
    expect(r.status).toBe(200);
    expect(r.tana).toMatchObject({ buyurtma: 5, sinov: true, checkoutUrl: expect.stringMatching(/^https:\/\/test\.paycom\.uz\//) });
    const c = await tolovniBoshla(rpcSoxta({ so_tolov_buyurtma: { id: 6 } }).rpc, 't', 'click', SOZ({ jonli: true }));
    expect(c.tana).toMatchObject({ buyurtma: 6, sinov: false, checkoutUrl: expect.stringMatching(/^https:\/\/my\.click\.uz\/services\/pay\?/) });
  });

  it('baza javob bermasa — 503; sessiya topilmasa — 401', async () => {
    expect((await tolovniBoshla(rpcSoxta({}).rpc, 't', 'payme', SOZ())).status).toBe(503);
    expect((await tolovniBoshla(rpcSoxta({ so_tolov_buyurtma: { xato: 'sessiya topilmadi' } }).rpc, 't', 'payme', SOZ())).status).toBe(401);
  });
});

describe('Fastify uchlari (Edge bilan bir xil)', () => {
  it('Payme — kalit sozlanmagan: HTTP 200 va -32504; Click — forma qabul qilinadi, sozlanmagan: -8; boshlash tokensiz — 401', async () => {
    const app = build();
    const p = await app.inject({ method: 'POST', url: '/tolov/payme', headers: { 'content-type': 'application/json' }, payload: sorov('CheckTransaction', { id: 'x' }) });
    expect(p.statusCode).toBe(200);
    expect(p.json()).toMatchObject({ id: 7, error: { code: -32504 } });
    const c = await app.inject({ method: 'POST', url: '/tolov/click', headers: { 'content-type': 'application/x-www-form-urlencoded' }, payload: clickForma({}).toString() });
    expect(c.statusCode).toBe(200);
    expect(c.json()).toMatchObject({ error: -8, click_trans_id: '987654' });
    expect((await app.inject({ method: 'POST', url: '/tolov/boshla', payload: { provayder: 'payme' } })).statusCode).toBe(401);
    // Eski imzosiz uch olib tashlangan.
    expect((await app.inject({ method: 'POST', url: '/tolov/webhook', payload: { paymentId: 1, holat: 'tolangan' } })).statusCode).toBe(404);
    await app.close();
  });
});
