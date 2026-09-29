/**
 * 7-qadam kod harakatlari — `suhbatKodHarakatlari(...).rasmiy(holat)` va
 * `.rasmiyYakun(holat)`.
 *
 * `rasmiy`: faktlarni (`so_fakt_oqi`) oʻqiydi, 4-qadam partiyasidan soliqni
 * hisoblaydi, 1-qadamdagi "Uzum kabineti bor" javobini hisobga oladi.
 * `rasmiyYakun`: "keyin / kutyapman / boshqacha" javoblarini ochiq ish qilib
 * yozadi (`so_ochiq_ish_yoz`), "boshqacha" — eskirgan fakt belgisi (tekshirish).
 * Baza soxta, tarmoqqa chiqilmaydi.
 */

import { describe, expect, it } from 'vitest';
import type { RasmiyNatijasi, RasmiyYakunNatijasi, YolHolati } from '@selleros/shared';
import { suhbatKodHarakatlari } from '../src/suhbat-kod.js';

const Q = (qiymat: unknown, manba = 'manba') => ({ qiymat, birlik: null, manba, olchandi: '2026-09-28', izoh: null });
/** 0057 seed qisqasi — rasmiy.test.ts dagi bilan bir xil raqamlar. */
const FAKT = {
  'bhm.som': Q(440_000, 'PF-115'),
  'yatt.boj.shaxsan_bhm': Q(1), 'yatt.boj.onlayn_bhm': Q(0.9), 'yatt.royxat.url': Q('https://new.birdarcha.uz/'),
  'yatt.royxat.muddat_daqiqa': Q(30), 'yatt.xodim_max': Q(5),
  'soliq.aylanma_foiz': Q(1, 'PQ-247'), 'soliq.aylanma_chegara_som': Q(1_000_000_000), 'soliq.ijtimoiy_oy_bhm': Q(1),
  'soliq.tolov_kuni': Q(15), 'soliq.rejim_tugaydi': Q('2030-12-31'),
  'bank.royxat': Q([{ nom: 'TBC Bank (TBC Biznes)', onlayn: true, ochish_som: 0, oylik_som: 0 }, { nom: 'Hamkorbank', ochish_som: 0, oylik_som: 220_000 }]),
  'uzum.kabinet.url': Q('https://seller.uzum.uz/seller/signup'), 'uzum.qollanma.url': Q('https://seller.uzum.uz/manual/uz/4.start-working/'),
  'uzum.komissioner.stir': Q('309376127'), 'uzum.komissioner.nom': Q('«Uzum market» MCHJ XK'), 'uzum.komissioner.mfo': Q('00974'),
  'uzum.komissioner.hisob': Q('20208000005504983001'), 'uzum.komissioner.muddat_yil': Q(5), 'uzum.faollashtirish_kun': Q(2),
  'uzum.qollab_quvvatlash.url': Q('https://t.me/umarket_business_bot'), 'uzum.tolov.standart': Q('2 haftada 1 marta, 0 %'),
};

function holatYasa(q: Partial<YolHolati['javoblar']> = {}, natijalar: Partial<YolHolati['natijalar']> = {}): YolHolati {
  return {
    javoblar: { byudjet: 10_000_000, uzum_dokoni: 'yoq', yonalish: 11, tovarlar: [100, 200], 'miqdor:100': 30, 'miqdor:200': 10, marja: 30, ...q },
    natijalar: {
      tannarx: { qatorlar: [
        { productId: 100, sotuvNarxiSom: 95_000, miqdor: 30, chegaraSom: 5_000, yetishmaydi: ['kargo'] },
        { productId: 200, sotuvNarxiSom: 80_000, miqdor: 10, chegaraSom: null, yetishmaydi: ['komissiya'] },
      ] },
      ...natijalar,
    },
  };
}

function soxtaBaza(q: { fakt?: unknown; ochiq?: unknown } = {}) {
  const chaqiruvlar: Array<{ nom: string; arg: Record<string, unknown> }> = [];
  let id = 10;
  const rpc = async <T>(nom: string, arg: unknown): Promise<T | null> => {
    const a = arg as Record<string, unknown>;
    chaqiruvlar.push({ nom, arg: a });
    if (nom === 'so_fakt_oqi') return (q.fakt === undefined ? FAKT : q.fakt) as T;
    if (nom === 'so_ochiq_ish_yoz') { id += 1; return (q.ochiq === undefined ? { id, yangi: true, muddat: a.p_muddat } : q.ochiq) as T; }
    return null;
  };
  return { rpc, chaqiruvlar, ochiq: () => chaqiruvlar.filter((c) => c.nom === 'so_ochiq_ish_yoz').map((c) => c.arg) };
}

const HOZIR = () => new Date('2026-09-28T10:00:00.000Z');

function kod(b: ReturnType<typeof soxtaBaza>, sessiya = true) {
  const k = suhbatKodHarakatlari(b.rpc, () => ({ bayroqlar: [], baholanmadi: [] }), () => 9,
    sessiya ? { kalit: 'KALIT', fetch: (async () => { throw new Error('tarmoq yoʻq'); }) as unknown as typeof fetch, token: 'tok', tarifCheklovi: false, hozir: HOZIR } : null);
  return {
    rasmiy: (h: YolHolati) => k.rasmiy(h) as Promise<RasmiyNatijasi>,
    rasmiyYakun: (h: YolHolati) => k.rasmiyYakun(h) as Promise<RasmiyYakunNatijasi>,
  };
}

describe('rasmiy', () => {
  it('faktlar toʻliq: boj, soliq, banklar, Uzum; partiya sotuvi 4-qadamdan, 1 % undan; kabinet yoʻq', async () => {
    const b = soxtaBaza();
    const n = await kod(b).rasmiy(holatYasa());
    expect(n.olchov_yoq).toBe(false);
    expect(n.kabinetBor).toBe(false);
    expect(n.faktlar.bhmSom).toBe(440_000);
    expect(n.faktlar.yatt.bojOnlaynSom).toBe(396_000);
    expect(n.faktlar.banklar.map((x) => x.nom)).toEqual(['TBC Bank (TBC Biznes)', 'Hamkorbank']);
    expect(n.faktlar.uzum.komissioner.hisob).toBe('20208000005504983001');
    // 95 000 × 30 + 80 000 × 10 = 3 650 000; 1 % = 36 500; + ijtimoiy 440 000.
    expect(n.partiyaSotuvSom).toBe(3_650_000);
    expect(n.soliq).toEqual({ ijtimoiySom: 440_000, aylanmaSom: 36_500, jamiSom: 476_500, sotuvSom: 3_650_000, yetishmaydi: [] });
    expect(n.faktlar.yetishmaydi).toEqual([]);
    expect(b.chaqiruvlar[0]!.nom).toBe('so_fakt_oqi');
    expect(b.chaqiruvlar[0]!.arg.p_kalitlar).toContain('uzum.komissioner.stir');
    expect(n.izoh).toMatch(/manba/i);
  });

  it('1-qadamda "sotyapman" yoki "kabinet_bor" — kabinetBor true', async () => {
    expect((await kod(soxtaBaza()).rasmiy(holatYasa({ uzum_dokoni: 'sotyapman' }))).kabinetBor).toBe(true);
    expect((await kod(soxtaBaza()).rasmiy(holatYasa({ uzum_dokoni: 'kabinet_bor' }))).kabinetBor).toBe(true);
  });

  it('partiya toʻliq emas (narx yoki miqdor yoʻq) — sotuv null, aylanma null, ijtimoiy turadi', async () => {
    const h = holatYasa({}, { tannarx: { qatorlar: [{ productId: 100, sotuvNarxiSom: null, miqdor: 30 }] } });
    const n = await kod(soxtaBaza()).rasmiy(h);
    expect(n.partiyaSotuvSom).toBeNull();
    expect(n.soliq).toMatchObject({ ijtimoiySom: 440_000, aylanmaSom: null, jamiSom: null });
  });

  it('fakt oʻqilmadi (baza null) — olchov_yoq "oʻqilmadi"; boʻsh roʻyxat — "kiritilmagan"', async () => {
    const n1 = await kod(soxtaBaza({ fakt: null })).rasmiy(holatYasa());
    expect(n1.olchov_yoq).toBe(true);
    expect(n1.sabab).toBe('fakt roʻyxati oʻqilmadi (baza javob bermadi)');
    const n2 = await kod(soxtaBaza({ fakt: {} })).rasmiy(holatYasa());
    expect(n2.olchov_yoq).toBe(true);
    expect(n2.sabab).toMatch(/kiritilmagan \(0057/);
    expect(n2.faktlar.yetishmaydi.length).toBeGreaterThan(5);
  });

  it('qisman faktlar (BHM yoʻq) — olchov_yoq emas, yetishmaydi bilan', async () => {
    const bhmsiz = Object.fromEntries(Object.entries(FAKT).filter(([k]) => k !== 'bhm.som'));
    const n = await kod(soxtaBaza({ fakt: bhmsiz })).rasmiy(holatYasa());
    expect(n.olchov_yoq).toBe(false);
    expect(n.faktlar.yetishmaydi).toEqual(['BHM', 'YATT davlat boji', 'ijtimoiy soliq']);
    expect(n.soliq.ijtimoiySom).toBeNull();
  });
});

describe('rasmiyYakun', () => {
  const RASMIY = { olchov_yoq: false, faktlar: { uzum: { faollashtirishKun: 2 } } };

  it('boshqacha → tekshirish; keyin → kutyapman muddatsiz; Uzum kutyapman → muddat = bugun + 2 kun', async () => {
    const b = soxtaBaza();
    const h = holatYasa({ huquqiy_shakl: 'yoq', yatt_ochish: 'boshqacha', bank_hisobi: 'keyin', uzum_kabinet: 'kutyapman' }, { rasmiy: RASMIY });
    const n = await kod(b).rasmiyYakun(h);
    expect(n.olchov_yoq).toBe(false);
    expect(n.yozildi.map((y) => [y.tur, y.sabab, y.muddat, y.yangi])).toEqual([
      ['tekshirish', 'rasmiy: YATT roʻyxat sayti boshqacha', null, true],
      ['kutyapman', 'bank hisobi ochilishi', null, true],
      ['kutyapman', 'Uzum kabinet faollashuvi', '2026-09-30', true],
    ]);
    expect(b.ochiq()).toHaveLength(3);
    expect(b.ochiq()[0]).toMatchObject({ p_token: 'tok', p_tur: 'tekshirish', p_sabab: 'rasmiy: YATT roʻyxat sayti boshqacha', p_muddat: null, p_props: { savolId: 'yatt_ochish', javob: 'boshqacha' } });
    expect(b.ochiq()[2]).toMatchObject({ p_tur: 'kutyapman', p_muddat: '2026-09-30', p_props: { savolId: 'uzum_kabinet', javob: 'kutyapman' } });
  });

  it('oʻtkazilgan (null) javob — "keyin" kabi kutyapman; hammasi tayyor — hech narsa yozilmaydi', async () => {
    const b = soxtaBaza();
    const n = await kod(b).rasmiyYakun(holatYasa({ huquqiy_shakl: 'yoq', yatt_ochish: null, bank_hisobi: 'bor', uzum_kabinet: 'faol' }, { rasmiy: RASMIY }));
    expect(n.yozildi.map((y) => y.sabab)).toEqual(['YATT ochilishi']);
    const n2 = await kod(soxtaBaza()).rasmiyYakun(holatYasa({ huquqiy_shakl: 'yatt', bank_hisobi: 'ochdim', uzum_kabinet: 'faol' }, { rasmiy: RASMIY }));
    expect(n2).toMatchObject({ olchov_yoq: false, yozildi: [] });
    // 1-qadamda kabinet bor — savollar boʻlmagan, hech narsa yozilmaydi.
    const n3 = await kod(soxtaBaza()).rasmiyYakun(holatYasa({ uzum_dokoni: 'sotyapman' }, { rasmiy: RASMIY }));
    expect(n3.yozildi).toEqual([]);
  });

  it('faollashtirish kuni faktda yoʻq — Uzum kutish muddatsiz; sessiya yoʻq yoki baza xato — olchov_yoq', async () => {
    const n = await kod(soxtaBaza()).rasmiyYakun(holatYasa({ huquqiy_shakl: 'yatt', bank_hisobi: 'bor', uzum_kabinet: 'kutyapman' }, { rasmiy: { olchov_yoq: false, faktlar: { uzum: { faollashtirishKun: null } } } }));
    expect(n.yozildi).toEqual([expect.objectContaining({ tur: 'kutyapman', sabab: 'Uzum kabinet faollashuvi', muddat: null })]);
    expect(await kod(soxtaBaza(), false).rasmiyYakun(holatYasa())).toMatchObject({ olchov_yoq: true, sabab: 'sessiya yoʻq', yozildi: [] });
    const x = await kod(soxtaBaza({ ochiq: { xato: 'sessiya topilmadi' } })).rasmiyYakun(holatYasa({ huquqiy_shakl: 'yatt', bank_hisobi: 'keyin', uzum_kabinet: 'faol' }, { rasmiy: RASMIY }));
    expect(x.olchov_yoq).toBe(true);
    expect(x.sabab).toBe('sessiya topilmadi');
    expect(x.yozildi).toEqual([expect.objectContaining({ sabab: 'bank hisobi ochilishi', id: null, yangi: false })]);
  });
});
