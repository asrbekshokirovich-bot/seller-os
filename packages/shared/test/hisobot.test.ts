/**
 * 12-qadam sof funksiyalari (`src/hisobot.ts`): faktlar (0057, 0060), keyingi
 * oy sanasi, oy hisobi (kabinet summasi ustun, taxmin — zaxira), soliq
 * bazasi toʻliq sotuv, deklaratsiya qadamlari faktdan.
 */

import { describe, expect, it } from 'vitest';
import {
  deklaratsiyaQadamlari, hisobotFaktlari, hisobotMuddati, keyingiOySanasi, oldingiOy, oyHisobi, oyKaliti, oyKunSoni, oyNomi,
  sanaMatni, toshkentSanasi,
} from '../src/index.js';

const F = (qiymat: unknown, manba = 'manba') => ({ qiymat, birlik: null, manba, olchandi: '2026-09-30', izoh: null });
const FAKT = {
  'bhm.som': F(440_000), 'soliq.aylanma_foiz': F(1, 'PQ-247'), 'soliq.ijtimoiy_oy_bhm': F(1), 'soliq.tolov_kuni': F(15),
  'soliq.agent': F('Toʻlov tashkiloti orqali tushgan daromad boʻyicha javobgarlik soliq agentida'),
  'soliq.aylanma.hisobot_davri': F('chorak'), 'soliq.aylanma.hisobot_kun': F(15),
  'soliq.portal.url': F('https://my3.soliq.uz'), 'uzum.hisobot.komissioner_kun': F(19),
};

describe('hisobotFaktlari', () => {
  it('toʻliq faktlar — yetishmaydi boʻsh; ijtimoiy soliq BHM × koeffitsient', () => {
    const f = hisobotFaktlari(FAKT);
    expect(f.yetishmaydi).toEqual([]);
    expect(f.soliq).toMatchObject({ aylanmaFoiz: 1, ijtimoiyOySom: 440_000, tolovKuni: 15 });
    expect(f).toMatchObject({ aylanmaDavri: 'chorak', aylanmaKun: 15, portalUrl: 'https://my3.soliq.uz', komissionerKun: 19 });
  });
  it('fakt yoʻq — null va yetishmaydi', () => {
    const f = hisobotFaktlari({});
    expect(f.portalUrl).toBeNull();
    expect(f.yetishmaydi).toEqual(expect.arrayContaining(['aylanma soligʻi foizi', 'ijtimoiy soliq', 'soliq portali', 'komissioner hisoboti muddati']));
  });
});

describe('sanalar', () => {
  it('oyKaliti va sana — Toshkent vaqti (UTC+5): 1-oktabr 01:00 — allaqachon oktabr', () => {
    // Tekshiruv (2026-10-05): UTC boʻyicha olinardi — har oyning 1-kuni
    // 00:00–05:00 da tugagan oy "hozirgacha, hali tugamagan" deb chiqardi.
    expect(oyKaliti(new Date('2026-09-30T20:00:00Z'))).toBe('2026-10');
    expect(oyKaliti(new Date('2026-09-30T18:59:59Z'))).toBe('2026-09');
    expect(toshkentSanasi(new Date('2026-09-30T20:00:00Z'))).toBe('2026-10-01');
    expect(toshkentSanasi(new Date('2026-09-28T10:00:00Z'), 30)).toBe('2026-10-28');
  });
  it('sanaMatni: ISO → KK.OO.YYYY (CBU kursi sanasi bilan bir xil koʻrinish); boshqa matn — oʻzi', () => {
    expect(sanaMatni('2026-10-15')).toBe('15.10.2026');
    expect(sanaMatni('2026-10-15T10:00:00.000Z')).toBe('15.10.2026');
    expect(sanaMatni('25.09.2026')).toBe('25.09.2026');
  });
  it('keyingi oy sanasi (dekabr → yanvar, qisqa oy)', () => {
    expect(keyingiOySanasi('2026-09', 15)).toBe('2026-10-15');
    expect(keyingiOySanasi('2026-12', 19)).toBe('2027-01-19');
    expect(keyingiOySanasi('2027-01', 31)).toBe('2027-02-28');
    expect(keyingiOySanasi('2026-09', null)).toBeNull();
    expect(keyingiOySanasi('buzuq', 15)).toBeNull();
  });
  it('oy nomi va oldingi oy (yanvar → dekabr); buzuq kalit — oʻzi', () => {
    expect(oyNomi('2026-09')).toBe('2026-yil sentyabr');
    expect(oyNomi('2027-01')).toBe('2027-yil yanvar');
    expect(oyNomi('2026-13')).toBe('2026-13');
    expect(oldingiOy('2026-10')).toBe('2026-09');
    expect(oldingiOy('2027-01')).toBe('2026-12');
    expect(oldingiOy('buzuq')).toBe('buzuq');
    expect([oyKunSoni('2026-09'), oyKunSoni('2026-08'), oyKunSoni('2028-02'), oyKunSoni('buzuq')]).toEqual([30, 31, 29, null]);
  });
});

describe('oyHisobi', () => {
  const f = hisobotFaktlari(FAKT);
  it('kabinet summasi ustun; soliq toʻliq sotuvdan (komissiya chegirilmaydi); muddatlar', () => {
    const h = oyHisobi({ oy: '2026-09', kabinetSotuv: 5_000_000, olchovSotuv: 4_000_000, komissiya: 900_000, f });
    expect(h).toMatchObject({ sotuvSom: 5_000_000, sotuvManbasi: 'kabinet', komissiyaSom: 900_000, sofSom: 4_100_000, ijtimoiyMuddat: '2026-10-15', komissionerSana: '2026-10-19' });
    expect(h.soliq).toMatchObject({ aylanmaSom: 50_000, ijtimoiySom: 440_000, jamiSom: 490_000 });
    expect(h.yetishmaydi).toEqual([]);
  });
  it('kabinet summasi yoʻq — taxmin; komissiya yoʻq — sof null (nol emas)', () => {
    const h = oyHisobi({ oy: '2026-09', kabinetSotuv: null, olchovSotuv: 1_234_567, komissiya: null, f });
    expect(h).toMatchObject({ sotuvSom: 1_234_567, sotuvManbasi: 'olchov', komissiyaSom: null, sofSom: null });
    expect(h.soliq.aylanmaSom).toBe(12_346);
    expect(h.yetishmaydi).toContain('komissiya summasi');
    const hech = oyHisobi({ oy: '2026-09', kabinetSotuv: 'x', olchovSotuv: null, komissiya: -5, f });
    expect(hech).toMatchObject({ sotuvSom: null, sotuvManbasi: null, komissiyaSom: null });
    expect(hech.soliq.aylanmaSom).toBeNull();
  });
  it('komissiya sotuvdan katta — sof MANFIY (zarar yashirilmaydi), 0 emas', () => {
    // Tekshiruv (2026-10-05): `Math.max(0, …)` zararni "sof 0 soʻm" qilib koʻrsatardi.
    expect(oyHisobi({ oy: '2026-09', kabinetSotuv: 100_000, olchovSotuv: null, komissiya: 150_000, f }).sofSom).toBe(-50_000);
  });
});

describe('hisobotMuddati — aylanma soligʻi hisoboti davri faktdan', () => {
  it('chorak: chorakdan keyingi oyning N-sanasi (avgust ham sentyabr ham — 3-chorak, 15-oktabr); oy: keyingi oy; fakt yoʻq — null', () => {
    const f = hisobotFaktlari(FAKT);
    expect(hisobotMuddati('2026-08', f)).toEqual({ davr: '2026-yil 3-chorak', muddat: '2026-10-15' });
    expect(hisobotMuddati('2026-09', f)).toEqual({ davr: '2026-yil 3-chorak', muddat: '2026-10-15' });
    expect(hisobotMuddati('2026-11', f)).toEqual({ davr: '2026-yil 4-chorak', muddat: '2027-01-15' });
    expect(hisobotMuddati('2026-08', { ...f, aylanmaDavri: 'oy' })).toEqual({ davr: '2026-yil avgust', muddat: '2026-09-15' });
    expect(hisobotMuddati('2026-08', hisobotFaktlari({}))).toEqual({ davr: '2026-yil avgust', muddat: null });
  });
});

describe('deklaratsiyaQadamlari', () => {
  it('beshta qadam, raqamlar va manzillar faktdan; tasdiqlanmagan qoida shunday aytiladi', () => {
    const f = hisobotFaktlari(FAKT);
    const q = deklaratsiyaQadamlari(oyHisobi({ oy: '2026-09', kabinetSotuv: 5_000_000, olchovSotuv: null, komissiya: null, f }), f);
    expect(q).toHaveLength(5);
    expect(q[0]).toMatch(/2026-yil sentyabr uchun komissioner hisobotini .*19\.10\.2026 gacha/);
    expect(q[1]).toMatch(/^https:\/\/my3\.soliq\.uz ga E-imzo/);
    expect(q[2]).toMatch(/Ijtimoiy soliq: 440 000 soʻm, 15\.10\.2026 gacha toʻlang/);
    expect(q[3]).toMatch(/^Aylanma soligʻi \(1 %\): 50 000 soʻm\. Toʻlov tashkiloti .* topshirasiz \(chorakdan keyingi oyning 15-sanasigacha — tasdiqlanishi kerak\)\.$/);
    // Kod bajarmaydigan vaʼda ("keyingi oy solishtiramiz") yoʻq.
    expect(q[4]).not.toMatch(/solishtiramiz/);
    const bosh = deklaratsiyaQadamlari(oyHisobi({ oy: '2026-09', kabinetSotuv: null, olchovSotuv: null, komissiya: null, f: hisobotFaktlari({}) }), hisobotFaktlari({}));
    expect(bosh[1]).toBe('Soliq portaliga E-imzo (ERI) bilan kiring (portal manzili faktda yoʻq).');
    // Fakt yoʻq boʻlsa ham gap butun: "muddat faktda yoʻq gacha", "(? %)" emas.
    expect(bosh[2]).toBe('Ijtimoiy soliq: miqdori faktda yoʻq, toʻlov muddati faktda yoʻq — sotuv boʻlmasa ham toʻlanadi.');
    expect(bosh[3]).toMatch(/^Aylanma soligʻi \(foizi faktda yoʻq\): hisoblanmadi\./);
    expect(bosh.join(' ')).not.toMatch(/\?|faktda yoʻq gacha/);
  });
});
