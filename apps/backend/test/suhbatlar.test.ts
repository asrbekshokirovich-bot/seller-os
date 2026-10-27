/**
 * «Suhbatlarim» — mijozning oldingi suhbatlari (nazoratchi, 2026-10-14: "mijoz
 * kirib oldingi yozishgan chatini ham topishi kerak").
 *
 * NEGA BU TESTLAR BOR. Ilgari «Boshidan boshlash» eski suhbatni ekrandan
 * butunlay olib tashlardi. Endi: roʻyxat (mavzu, qadam, sana — ism va telefon
 * EMAS), eski suhbatni oʻqish, holati saqlangan boʻlsa — davom ettirish. SQL
 * qismi (0066) PGlite da alohida sinalgan (scratchpad pglite-sinov).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  suhbatBoshdan, suhbatBolagi, suhbatKartasi, suhbatlarOqi, suhbatlarRoyxati, suhbatQaytar,
  type SuhbatBogliqliklari, type SuhbatQatori,
} from '@selleros/shared';
import { build } from '../src/app.js';

const Q = (q: Partial<SuhbatQatori>): SuhbatQatori => ({
  boshi: 1, oxiri: 10, soni: 10, yozgan: 3, boshlandi: '2026-10-13T08:00:00Z', yangilandi: '2026-10-13T09:00:00Z',
  joriy: false, holatBor: true, qadam: 4, javoblar: { ism: 'Aziz Karimov', telefon: '+998901234567' }, turkum: null, ...q,
});

describe('suhbatKartasi / suhbatlarRoyxati — sof', () => {
  it('mavzu: turkum → soha → yoʻq; qadam faqat 1–12; davom ettirish — eski va holati saqlangan', () => {
    expect(suhbatKartasi(Q({ turkum: ' Sumkalar ' }))).toMatchObject({ mavzu: { tur: 'turkum', nom: 'Sumkalar' }, qadam: 4, davomEtsaBoladi: true });
    expect(suhbatKartasi(Q({ javoblar: { qiziqish: ['kanstovar', 'bilmayman'] } })).mavzu).toEqual({ tur: 'soha', sohalar: ['kanstovar'] });
    expect(suhbatKartasi(Q({ javoblar: { qiziqish: ['bilmayman'] } })).mavzu).toBeNull();
    expect(suhbatKartasi(Q({ javoblar: null, qadam: 13 })).qadam).toBeNull();
    expect(suhbatKartasi(Q({ joriy: true })).davomEtsaBoladi).toBe(false);
    expect(suhbatKartasi(Q({ holatBor: false })).davomEtsaBoladi).toBe(false);
  });

  it('ism va telefon kartaga oʻtmaydi (brauzerga ketmaydi)', () => {
    const k = JSON.stringify(suhbatlarRoyxati([Q({ joriy: true }), Q({ boshi: 11, turkum: 'Sumkalar' })]));
    expect(k).not.toMatch(/Aziz|Karimov|998/);
  });

  it('mijoz hech narsa yozmagan eski suhbat chiqmaydi; hozirgisi — doim', () => {
    const r = suhbatlarRoyxati([Q({ boshi: 30, joriy: true, yozgan: 0 }), Q({ boshi: 20, yozgan: 0 }), Q({ boshi: 1, yozgan: 2 })]);
    expect(r.map((k) => k.boshi)).toEqual([30, 1]);
  });
});

/** Soxta baza: chaqiruvlar yoziladi, javoblar oldindan berilgan. */
function rpcSoxta(javoblar: Record<string, unknown>) {
  const chaqiruvlar: Array<{ nom: string; arg: Record<string, unknown> }> = [];
  const rpc = async <T>(nom: string, arg: unknown): Promise<T | null> => {
    chaqiruvlar.push({ nom, arg: arg as Record<string, unknown> });
    return (nom in javoblar ? javoblar[nom] : null) as T | null;
  };
  return { rpc, chaqiruvlar };
}

describe('suhbatlarOqi / suhbatBolagi / suhbatQaytar — baza bilan', () => {
  it('roʻyxat: baza javob bermasa — xato (boʻsh roʻyxat EMAS); sessiya xatosi oʻtadi; aks holda kartalar', async () => {
    expect(await suhbatlarOqi(rpcSoxta({}), 't')).toEqual({ xato: 'baza javob bermadi' });
    expect(await suhbatlarOqi(rpcSoxta({ so_suhbatlar: { xato: 'sessiya topilmadi' } }), 't')).toEqual({ xato: 'sessiya topilmadi' });
    const r = await suhbatlarOqi(rpcSoxta({ so_suhbatlar: { suhbatlar: [Q({ joriy: true, turkum: 'Sumkalar' })] } }), 't');
    expect(r).toEqual({ suhbatlar: [expect.objectContaining({ boshi: 1, joriy: true, mavzu: { tur: 'turkum', nom: 'Sumkalar' } })] });
  });

  it('bitta suhbat: chegarasi notoʻgʻri — bazaga borilmaydi; toʻgʻrisi — xabarlar', async () => {
    const b = rpcSoxta({ so_suhbat_bolagi: { xabarlar: [{ seq: 1, rol: 'menejer', matn: 'Salom', savolId: 'ism', at: 'x' }] } });
    for (const [boshi, oxiri] of [[0, 5], [5, 4], [1.5, 3], [Number.NaN, 3]] as const) {
      expect(await suhbatBolagi(b, 't', boshi, oxiri)).toEqual({ xato: 'suhbat chegarasi notoʻgʻri' });
    }
    expect(b.chaqiruvlar).toHaveLength(0);
    expect(await suhbatBolagi(b, 't', 1, 5)).toEqual({ xabarlar: [expect.objectContaining({ matn: 'Salom' })] });
    expect(b.chaqiruvlar[0]).toEqual({ nom: 'so_suhbat_bolagi', arg: { p_token: 't', p_boshi: 1, p_oxiri: 5 } });
  });

  it('qaytish: bazadagi rad etish oʻtadi; muvaffaqiyatda — yangi holat (tarix va savol)', async () => {
    expect(await suhbatQaytar(rpcSoxta({}), 't', 0)).toEqual({ xato: 'suhbat topilmadi' });
    expect(await suhbatQaytar(rpcSoxta({ so_suhbat_qaytar: { xato: 'bu suhbatni faqat oʻqish mumkin' } }), 't', 5))
      .toEqual({ xato: 'bu suhbatni faqat oʻqish mumkin' });
    const b = rpcSoxta({
      so_suhbat_qaytar: { qaytdi: 5, nusxa: 2 },
      so_suhbat_oqi: { holat: { javoblar: { ism: 'Aziz Karimov', telefon: '+998901234567' }, natijalar: {} }, qadam: 1,
        xabarlar: [{ seq: 9, rol: 'kod', matn: 'Avvalgi suhbatga qaytildi', savolId: 'boshdan' }, { seq: 10, rol: 'obunachi', matn: 'Aziz Karimov', savolId: 'ism' }] },
    });
    const r = await suhbatQaytar(b, 't', 5);
    expect(b.chaqiruvlar.map((c) => c.nom)).toEqual(['so_suhbat_qaytar', 'so_suhbat_oqi']);
    if ('xato' in r && !('keyingi' in r)) throw new Error(r.xato);
    expect((r as { tarix: Array<{ matn: string }> }).tarix.map((x) => x.matn)).toEqual(['Aziz Karimov']);
    // Ism va telefon bor, qolgani yoʻq — birinchi savol (qiziqish, 2026-10-26 tartibi).
    expect(r.keyingi).toMatchObject({ tur: 'savol', savol: { id: 'qiziqish' } });
  });
});

describe('«Boshidan boshlash» — eski suhbat holati saqlanadi (davom ettirish uchun)', () => {
  const kod = new Proxy({}, { get: () => async () => { throw new Error('chaqirilmasligi kerak'); } }) as SuhbatBogliqliklari['kod'];

  it('belgida eski holat va qadam; yangi holat — boshlangʻich', async () => {
    const eski = { javoblar: { ism: 'Aziz Karimov', byudjet: 10_000_000 }, natijalar: {} };
    const b = rpcSoxta({ so_suhbat_oqi: { holat: eski, qadam: 2, xabarlar: [] }, so_suhbat_yoz: { yozildi: 2 } });
    const r = await suhbatBoshdan({ rpc: b.rpc, kod }, 't');
    expect(r.xato).toBeUndefined();
    const yoz = b.chaqiruvlar.find((c) => c.nom === 'so_suhbat_yoz')!.arg;
    expect((yoz.p_xabarlar as unknown[])[0]).toEqual({ rol: 'kod', matn: 'Yoʻl boshidan boshlandi', savolId: 'boshdan', javob: { holat: eski, qadam: 2 } });
    expect(yoz.p_holat).toEqual({ javoblar: {}, natijalar: {} });
  });

  it('holatni oʻqib boʻlmasa — boshidan boshlanmaydi (eski suhbat yoʻqolmasin)', async () => {
    const b = rpcSoxta({ so_suhbat_yoz: { yozildi: 2 } });
    const r = await suhbatBoshdan({ rpc: b.rpc, kod }, 't');
    expect(r).toMatchObject({ xato: 'baza javob bermadi', yozildi: false });
    expect(b.chaqiruvlar.map((c) => c.nom)).toEqual(['so_suhbat_oqi']);
  });
});

describe('/suhbatlar va /suhbat-bolagi uchlari — Fastify', () => {
  const KALITLAR = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
  const OLDINGI = new Map<string, string | undefined>();
  beforeEach(() => { for (const k of KALITLAR) { OLDINGI.set(k, process.env[k]); delete process.env[k]; } });
  afterEach(() => { for (const k of KALITLAR) { const e = OLDINGI.get(k); if (e === undefined) delete process.env[k]; else process.env[k] = e; } });

  async function sora(url: string, sarlavha: Record<string, string> = {}, method: 'GET' | 'POST' = 'GET', payload?: Record<string, unknown>) {
    const app = build();
    const res = await app.inject({ method, url, headers: sarlavha, ...(payload ? { payload } : {}) });
    await app.close();
    return res;
  }

  it('tokensiz — 401; baza ulanmagan — 503 (boʻsh roʻyxat EMAS); chegara notoʻgʻri — 400', async () => {
    expect((await sora('/suhbatlar')).statusCode).toBe(401);
    expect((await sora('/suhbat-bolagi?boshi=1&oxiri=2')).statusCode).toBe(401);
    const r = await sora('/suhbatlar', { 'x-sessiya': 'sinov' });
    expect(r.statusCode).toBe(503);
    expect(r.json()).toEqual({ xato: 'baza javob bermadi' });
    expect((await sora('/suhbat-bolagi?boshi=5&oxiri=1', { 'x-sessiya': 'sinov' })).statusCode).toBe(400);
    expect((await sora('/suhbat', { 'x-sessiya': 'sinov' }, 'POST', { qaytish: 5 })).statusCode).toBe(503);
  });
});
