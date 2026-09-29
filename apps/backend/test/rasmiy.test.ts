/**
 * 7-qadam faktlari — `rasmiyFaktlari`, `bankRoyxati`, `oylikSoliq`.
 *
 * Raqamlar 0057 migratsiyasidagi oʻlchovlar (docs/RASMIYLASHTIRISH-FAKTLAR.md,
 * 2026-09-28). Fakt boʻlmasa null va `yetishmaydi` — nol emas, taxmin emas.
 * Tarmoqqa chiqilmaydi.
 */

import { describe, expect, it } from 'vitest';
import { bankRoyxati, faktlarniOqi, oylikSoliq, RASMIY_KALITLARI, rasmiyFaktlari } from '@selleros/shared';

const Q = (qiymat: unknown, manba = 'manba', olchandi = '2026-09-28') => ({ qiymat, birlik: null, manba, olchandi, izoh: null });

/** 0057 seed bilan bir xil qiymatlar. */
export const RASMIY_FAKT = {
  'bhm.som': Q(440_000, 'PF-115'),
  'yatt.boj.shaxsan_bhm': Q(1, 'soliq 50017'),
  'yatt.boj.onlayn_bhm': Q(0.9, 'soliq 50017'),
  'yatt.royxat.url': Q('https://new.birdarcha.uz/'),
  'yatt.royxat.muddat_daqiqa': Q(30, 'unamoliya.uz'),
  'yatt.xodim_max': Q(5),
  'soliq.aylanma_foiz': Q(1, 'PQ-247'),
  'soliq.aylanma_chegara_som': Q(1_000_000_000),
  'soliq.ijtimoiy_oy_bhm': Q(1),
  'soliq.tolov_kuni': Q(15),
  'soliq.rejim_tugaydi': Q('2030-12-31'),
  'bank.royxat': Q([
    { nom: 'Kapitalbank (Uzum Business ilovasi)', onlayn: true, ochish_som: 0, oylik_som: null, izoh: '3 oy bepul', manba: 'gazeta.uz', olchandi: '2026-09-28' },
    { nom: 'TBC Bank (TBC Biznes)', onlayn: true, ochish_som: 0, oylik_som: 0, izoh: 'Basic bepul' },
    { nom: 'Anorbank (Anor Business)', onlayn: true, ochish_som: 0, oylik_som: 0 },
    { nom: 'Hamkorbank', onlayn: null, ochish_som: 0, oylik_som: 220_000 },
  ], 'FAKTLAR.md 4-boʻlim'),
  'uzum.kabinet.url': Q('https://seller.uzum.uz/seller/signup'),
  'uzum.qollanma.url': Q('https://seller.uzum.uz/manual/uz/4.start-working/'),
  'uzum.komissioner.stir': Q('309376127', 'seller.uzum.uz/manual 4.2'),
  'uzum.komissioner.nom': Q('«Uzum market» MCHJ XK'),
  'uzum.komissioner.mfo': Q('00974'),
  'uzum.komissioner.hisob': Q('20208000005504983001'),
  'uzum.komissioner.muddat_yil': Q(5),
  'uzum.faollashtirish_kun': Q(2),
  'uzum.qollab_quvvatlash.url': Q('https://t.me/umarket_business_bot'),
  'uzum.tolov.standart': Q('2 haftada 1 marta, 0 %'),
};

describe('rasmiyFaktlari', () => {
  it('kalitlar roʻyxati seed bilan bir xil', () => {
    expect([...RASMIY_KALITLARI].sort()).toEqual(Object.keys(RASMIY_FAKT).sort());
  });

  it('toʻliq faktlar: boj BHM dan hisoblanadi, soliq, banklar, Uzum rekvizitlari; yetishmaydi boʻsh', () => {
    const r = rasmiyFaktlari(faktlarniOqi(RASMIY_FAKT));
    expect(r.bhmSom).toBe(440_000);
    expect(r.yatt).toMatchObject({ bojShaxsanSom: 440_000, bojOnlaynSom: 396_000, royxatUrl: 'https://new.birdarcha.uz/', muddatDaqiqa: 30, xodimMax: 5, manba: 'soliq 50017', olchandi: '2026-09-28' });
    expect(r.soliq).toMatchObject({ aylanmaFoiz: 1, aylanmaChegaraSom: 1_000_000_000, ijtimoiyOySom: 440_000, tolovKuni: 15, rejimTugaydi: '2030-12-31', manba: 'PQ-247' });
    expect(r.banklar.map((b) => b.nom)).toEqual(['Kapitalbank (Uzum Business ilovasi)', 'TBC Bank (TBC Biznes)', 'Anorbank (Anor Business)', 'Hamkorbank']);
    // Qator manbasi yoʻq boʻlsa — kalitning umumiy manbasi.
    expect(r.banklar[1]).toMatchObject({ onlayn: true, ochishSom: 0, oylikSom: 0, izoh: 'Basic bepul', manba: 'FAKTLAR.md 4-boʻlim', olchandi: '2026-09-28' });
    expect(r.banklar[0]!.manba).toBe('gazeta.uz');
    expect(r.banklar[3]).toMatchObject({ onlayn: null, oylikSom: 220_000 });
    expect(r.bankTashlandi).toBe(0);
    expect(r.uzum).toMatchObject({
      kabinetUrl: 'https://seller.uzum.uz/seller/signup',
      komissioner: { stir: '309376127', nom: '«Uzum market» MCHJ XK', mfo: '00974', hisob: '20208000005504983001', muddatYil: 5 },
      faollashtirishKun: 2, qollabQuvvatlashUrl: 'https://t.me/umarket_business_bot', tolovStandart: '2 haftada 1 marta, 0 %',
    });
    expect(r.yetishmaydi).toEqual([]);
  });

  it('BHM yoʻq — boj va ijtimoiy soliq null (koeffitsient bor boʻlsa ham), yetishmaydi da nomi', () => {
    const bhmsiz = Object.fromEntries(Object.entries(RASMIY_FAKT).filter(([k]) => k !== 'bhm.som'));
    const r = rasmiyFaktlari(faktlarniOqi(bhmsiz));
    expect(r.bhmSom).toBeNull();
    expect(r.yatt.bojOnlaynSom).toBeNull();
    expect(r.soliq.ijtimoiyOySom).toBeNull();
    expect(r.yetishmaydi).toEqual(['BHM', 'YATT davlat boji', 'ijtimoiy soliq']);
  });

  it('boʻsh roʻyxat (0057 qoʻllanmagan) — hammasi null, yetishmaydi toʻliq', () => {
    const r = rasmiyFaktlari({});
    expect(r.banklar).toEqual([]);
    expect(r.uzum.komissioner.stir).toBeNull();
    expect(r.yetishmaydi).toEqual(['BHM', 'YATT davlat boji', 'YATT roʻyxat manzili', 'aylanma soligʻi foizi', 'ijtimoiy soliq', 'bank roʻyxati', 'Uzum kabinet manzili', 'Uzum komissioner rekvizitlari']);
  });

  it('manzil http(s) boʻlmasa — null (matn boʻlsa ham)', () => {
    const r = rasmiyFaktlari(faktlarniOqi({ ...RASMIY_FAKT, 'yatt.royxat.url': Q('birdarcha.uz'), 'uzum.kabinet.url': Q('javascript:alert(1)') }));
    expect(r.yatt.royxatUrl).toBeNull();
    expect(r.uzum.kabinetUrl).toBeNull();
    expect(r.yetishmaydi).toEqual(['YATT roʻyxat manzili', 'Uzum kabinet manzili']);
  });
});

describe('bankRoyxati', () => {
  it('massiv emas — boʻsh; nomsiz/buzuq qatorlar tashlanadi va sanaladi; manfiy son null', () => {
    const umumiy = { manba: 'M', olchandi: '2026-09-28' };
    expect(bankRoyxati(null, umumiy)).toEqual({ banklar: [], tashlandi: 0 });
    expect(bankRoyxati('x', umumiy)).toEqual({ banklar: [], tashlandi: 0 });
    const r = bankRoyxati([{ nom: 'A', ochish_som: -5, oylik_som: '10' }, { onlayn: true }, 7, null, { nom: ' ' }], umumiy);
    expect(r.tashlandi).toBe(4);
    expect(r.banklar).toEqual([{ nom: 'A', onlayn: null, ochishSom: null, oylikSom: null, izoh: null, manba: 'M', olchandi: '2026-09-28' }]);
  });
});

describe('oylikSoliq', () => {
  const soliq = rasmiyFaktlari(faktlarniOqi(RASMIY_FAKT)).soliq;
  it('ijtimoiy 440 000 + 1 % × 5 000 000 = 490 000', () => {
    expect(oylikSoliq(soliq, 5_000_000)).toEqual({ ijtimoiySom: 440_000, aylanmaSom: 50_000, jamiSom: 490_000, sotuvSom: 5_000_000, yetishmaydi: [] });
  });
  it('sotuv nomaʼlum — aylanma va jami null, ijtimoiy turadi (sotuv boʻlmasa ham toʻlanadi)', () => {
    expect(oylikSoliq(soliq, null)).toEqual({ ijtimoiySom: 440_000, aylanmaSom: null, jamiSom: null, sotuvSom: null, yetishmaydi: ['sotuv summasi'] });
  });
  it('foiz yoki BHM yoʻq — tegishli boʻlak null, yetishmaydi da', () => {
    expect(oylikSoliq({ ...soliq, aylanmaFoiz: null }, 5_000_000)).toMatchObject({ aylanmaSom: null, jamiSom: null, yetishmaydi: ['aylanma soligʻi foizi'] });
    expect(oylikSoliq({ ...soliq, ijtimoiyOySom: null }, 5_000_000)).toMatchObject({ ijtimoiySom: null, aylanmaSom: 50_000, jamiSom: null, yetishmaydi: ['ijtimoiy soliq'] });
  });
  it('yaxlitlash: 1 % × 3 650 000 = 36 500; kasr — Math.round', () => {
    expect(oylikSoliq(soliq, 3_650_000).aylanmaSom).toBe(36_500);
    expect(oylikSoliq(soliq, 1_234_567).aylanmaSom).toBe(12_346);
  });
});
