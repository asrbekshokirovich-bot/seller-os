/**
 * 11 va 12-qadam kod harakatlari — `sotuv`, `hisobot`, `hisobotHisob`,
 * `hisobotYakun` (`suhbatKodHarakatlari`). Baza soxta: `so_sotuv_kuzat`
 * (kuzatuvga qoʻshish), `so_sotuv_holati` (kunlik tarix), `so_fakt_oqi`,
 * `so_ochiq_ish_yoz`. Tarmoq kerak emas.
 */

import { describe, expect, it } from 'vitest';
import type {
  HisobotHisobNatijasi, HisobotNatijasi, HisobotYakunNatijasi, SotuvNatijasi, YolHolati,
} from '@selleros/shared';
import { suhbatKodHarakatlari } from '../src/suhbat-kod.js';

const F = (qiymat: unknown, manba = 'manba') => ({ qiymat, birlik: null, manba, olchandi: '2026-09-30', izoh: null });
const FAKT = {
  'bhm.som': F(440_000), 'soliq.aylanma_foiz': F(1, 'PQ-247'), 'soliq.ijtimoiy_oy_bhm': F(1), 'soliq.tolov_kuni': F(15),
  'soliq.agent': F('Javobgarlik soliq agentida'), 'soliq.aylanma.hisobot_davri': F('chorak'), 'soliq.aylanma.hisobot_kun': F(15),
  'soliq.portal.url': F('https://my3.soliq.uz'), 'uzum.hisobot.komissioner_kun': F(19),
};

const kun = (sana: string, narx: number, zaxira: number, sotildi: number | null, sharh = 3) =>
  ({ sana, narx, zaxira, sharh, reyting: 4.5, sotildi, daromad: sotildi === null ? null : sotildi * narx });

/** Oʻz kartochka 5001 (raqobatchi 100 ning nusxasi), raqobatchi 100 narxi tushgan. */
const HOLATI = [
  { externalId: 5001, kuzatuvda: true, topildi: true, title: 'Mening sumkam', kunlar: [
    kun('2026-09-28', 120_000, 30, null), kun('2026-09-29', 120_000, 20, 10, 3), kun('2026-09-30', 120_000, 5, 15, 5),
  ] },
  { externalId: 100, kuzatuvda: true, topildi: true, title: 'Raqobatchi sumka', kunlar: [
    kun('2026-09-29', 110_000, 50, 1), kun('2026-09-30', 100_000, 49, 1),
  ] },
  { externalId: 200, kuzatuvda: true, topildi: true, title: 'Gʻilof', kunlar: [kun('2026-09-30', 30_000, 10, 0)] },
];

function holatYasa(javoblar: Record<string, unknown> = {}, natijalar: Record<string, unknown> = {}): YolHolati {
  return {
    javoblar: { tovarlar: [100, 200], 'uzum_havola:100': 'https://uzum.uz/uz/product/mening-sumkam-5001', 'uzum_havola:200': null, ...javoblar },
    natijalar: {
      buyurtma: { olchov_yoq: false, qatorlar: [
        { productId: 100, title: 'Sumka', miqdor: 30, holat: 'tayyor', narxYuan: 27, sourceId: 'A1' },
        { productId: 200, title: 'Gʻilof', miqdor: 10, holat: 'tayyor', narxYuan: 5, sourceId: 'B2' },
      ] },
      ...natijalar,
    },
  };
}

function soxtaBaza(q: { holati?: unknown; kuzat?: unknown; fakt?: unknown; ochiq?: unknown } = {}) {
  const chaqiruvlar: Array<{ nom: string; arg: Record<string, unknown> }> = [];
  let id = 80;
  const rpc = async <T>(nom: string, arg: unknown): Promise<T | null> => {
    const a = arg as Record<string, unknown>;
    chaqiruvlar.push({ nom, arg: a });
    if (nom === 'so_sotuv_kuzat') return (q.kuzat === undefined ? { qoshildi: 1, bor: 0 } : q.kuzat) as T;
    if (nom === 'so_sotuv_holati') return (q.holati === undefined ? HOLATI : q.holati) as T;
    if (nom === 'so_fakt_oqi') return (q.fakt === undefined ? FAKT : q.fakt) as T;
    if (nom === 'so_ochiq_ish_yoz') { id += 1; return (q.ochiq === undefined ? { id, yangi: true } : q.ochiq) as T; }
    return null;
  };
  return { rpc, chaqiruvlar, kim: (nom: string) => chaqiruvlar.filter((c) => c.nom === nom).map((c) => c.arg) };
}

const HOZIR = () => new Date('2026-09-30T12:00:00.000Z');

function kod(b: ReturnType<typeof soxtaBaza>, sessiya = true) {
  const k = suhbatKodHarakatlari(b.rpc, () => ({ bayroqlar: [], baholanmadi: [] }), () => 9,
    sessiya ? { kalit: null, fetch: (async () => { throw new Error('tarmoq yoʻq'); }) as unknown as typeof fetch, token: 'tok', tarifCheklovi: false, hozir: HOZIR } : null);
  return {
    sotuv: (h: YolHolati) => k.sotuv(h) as Promise<SotuvNatijasi>,
    hisobot: (h: YolHolati) => k.hisobot(h) as Promise<HisobotNatijasi>,
    hisobotHisob: (h: YolHolati) => k.hisobotHisob(h) as Promise<HisobotHisobNatijasi>,
    hisobotYakun: (h: YolHolati) => k.hisobotYakun(h) as Promise<HisobotYakunNatijasi>,
  };
}

describe('sotuv (11-qadam)', () => {
  it('havoladagi oʻz kartochka kuzatuvga qoʻshiladi; oʻlchov, raqobatchi, signallar, jami', async () => {
    const b = soxtaBaza();
    const n = await kod(b).sotuv(holatYasa());
    expect(b.kim('so_sotuv_kuzat')).toEqual([{ p_token: 'tok', p_external_ids: [5001] }]);
    expect(b.kim('so_sotuv_holati')).toEqual([{ p_external_ids: [5001, 100, 200], p_kun: 45 }]);
    expect(n).toMatchObject({ olchov_yoq: false, sana: '2026-09-30', oy: '2026-09', partiya: 1, kuzatuv: { qoshildi: 1, bor: 0 }, kuzatuvXato: null });
    const s = n.qatorlar[0]!;
    expect(s).toMatchObject({ productId: 100, ozId: 5001, xaridYuan: 27 });
    expect(s.oz).toMatchObject({ holat: 'olchandi', bugunSotildi: 15, zaxira: 5, tezlik: 12.5, zaxiraKun: 0, zaxiraUlush: 0.17, yangiSharh: 2 });
    expect(s.raqobatchi).toMatchObject({ narx: 100_000, oldingiNarx: 110_000, tushdiFoiz: 9.1 });
    expect(n.qatorlar[1]).toMatchObject({ productId: 200, ozId: null, oz: null });
    expect(n.signallar.map((x) => x.id)).toEqual(['zaxira:100:p1', 'narx:100:2026-09-30:100000', 'sharh:100:5']);
    expect(n.jami).toEqual({ bugunDona: 15, oyDona: 25, oySom: 3_000_000 });
  });

  it('ikkinchi partiya — zaxira signali yangi id bilan; havola yoʻq — kuzatuvga soʻrov ketmaydi', async () => {
    const n = await kod(soxtaBaza()).sotuv(holatYasa({}, { partiya: 2 }));
    expect(n.signallar[0]!.id).toBe('zaxira:100:p2');
    const b = soxtaBaza();
    const n2 = await kod(b).sotuv(holatYasa({ 'uzum_havola:100': null }));
    expect(b.kim('so_sotuv_kuzat')).toEqual([]);
    expect(n2.qatorlar.every((q) => q.oz === null)).toBe(true);
    expect(n2.jami).toEqual({ bugunDona: null, oyDona: null, oySom: null });
  });

  it('qayta buyurtmadan keyin: eski qoldiq tugayotgani uchun zaxira signali YOʻQ, yangi partiya tushgach — bor; olinmagan tovar ham kuzatuvda', async () => {
    // 1-partiya: 100 va 200; 2-partiya (29-sentyabrda buyurtma, oʻshanda zaxira 20): faqat 100.
    const arxiv = [{ partiya: 1, sana: '2026-09-29', buyurtma: holatYasa().natijalar.buyurtma, zaxira: { 100: 20, 200: null }, tezlik: { 100: 10, 200: null } }];
    const h = holatYasa({ 'uzum_havola:200': 'https://uzum.uz/uz/product/gilof-200' }, {
      partiya: 2, oldingi_partiyalar: arxiv,
      buyurtma: { olchov_yoq: false, qatorlar: [{ productId: 100, title: 'Sumka', miqdor: 60, holat: 'tayyor', narxYuan: 26, sourceId: 'A1' }] },
    });
    const n = await kod(soxtaBaza()).sotuv(h);
    expect(n.qatorlar.map((q) => [q.productId, q.partiya, q.miqdor, q.xaridYuan])).toEqual([[100, 2, 60, 26], [200, 1, 10, 5]]);
    expect(n.qatorlar[0]!.oz).toMatchObject({ zaxira: 5, boshlangichZaxira: null, zaxiraUlush: null });
    expect(n.signallar.map((x) => x.tur)).toEqual(['narx', 'sharh']);
    // Yangi partiya omborga tushdi (5 → 60), keyin 10 ga tushdi — signal 2-partiya id si bilan.
    const keldi = HOLATI.map((x) => (x.externalId === 5001
      ? { ...x, kunlar: [...x.kunlar, kun('2026-10-10', 120_000, 60, null), kun('2026-10-20', 120_000, 10, 50)] } : x));
    const n2 = await kod(soxtaBaza({ holati: keldi })).sotuv(h);
    expect(n2.qatorlar[0]!.oz).toMatchObject({ boshlangichZaxira: 60, zaxiraUlush: 0.17 });
    expect(n2.signallar[0]!.id).toBe('zaxira:100:p2');
  });

  it('hali oʻlchanmagan kartochka — kutilmoqda (sotuv yoʻq EMAS); kuzatuv xatosi aytiladi', async () => {
    const n = await kod(soxtaBaza({ holati: [], kuzat: { xato: 'bitta sessiya 20 tagacha tovar kuzata oladi' } })).sotuv(holatYasa());
    expect(n.qatorlar[0]!.oz).toMatchObject({ holat: 'kutilmoqda', bugunSotildi: null });
    expect(n.kuzatuv).toBeNull();
    expect(n.kuzatuvXato).toBe('bitta sessiya 20 tagacha tovar kuzata oladi');
    expect(n.signallar).toEqual([]);
  });

  it('baza javob bermadi — olchov_yoq sabab bilan; sessiya yoʻq — kuzatuvga qoʻshilmaydi', async () => {
    const n = await kod(soxtaBaza({ holati: null })).sotuv(holatYasa());
    expect(n).toMatchObject({ olchov_yoq: true, sabab: 'oʻlchov oʻqilmadi (baza javob bermadi)' });
    const b = soxtaBaza();
    const s = await kod(b, false).sotuv(holatYasa());
    expect(s.kuzatuvXato).toBe('sessiya yoʻq');
    expect(b.kim('so_sotuv_kuzat')).toEqual([]);
  });
});

describe('hisobot (12-qadam)', () => {
  it('hisobot: faktlar va 11-qadam oʻlchovidan taxmin', async () => {
    const k = kod(soxtaBaza());
    const sn = await k.sotuv(holatYasa());
    const b = soxtaBaza();
    const hn = await kod(b).hisobot(holatYasa({}, { sotuv: sn }));
    // 5001: 28-sentyabr birinchi oʻlchov, 29 va 30 da sotuv hisoblangan — 30 kundan 2 kuni.
    expect(hn).toMatchObject({ olchov_yoq: false, oy: '2026-09', tugagan: false, olchovSotuv: 3_000_000, olchovDona: 25, olchovKun: 2, oyKunlari: 30 });
    // Tanlangan oy oʻlchovi qayta oʻqiladi — 62 kun (oldingi oy toʻliq kiradi).
    expect(b.kim('so_sotuv_holati')).toEqual([{ p_external_ids: [5001], p_kun: 62 }]);
    expect(hn.faktlar.yetishmaydi).toEqual([]);
    expect(hn.qatorlar).toEqual([
      { productId: 100, title: 'Sumka', oyDona: 25, oySom: 3_000_000, olchovKun: 2 },
      { productId: 200, title: 'Gʻilof', oyDona: null, oySom: null, olchovKun: 0 },
    ]);
  });

  it('tugagan oy tanlansa — oʻsha oy kunlari yigʻiladi; oʻlchov yoʻq — null (nol emas); hisob «tugagan» ni oladi', async () => {
    const k = kod(soxtaBaza());
    const sn = await k.sotuv(holatYasa());
    const avg = await k.hisobot(holatYasa({ hisobot_oy: '2026-08' }, { sotuv: sn }));
    expect(avg).toMatchObject({ oy: '2026-08', tugagan: true, olchovSotuv: null, olchovDona: null, olchovKun: null, oyKunlari: 31 });
    const avgustli = HOLATI.map((x) => (x.externalId === 5001 ? { ...x, kunlar: [kun('2026-08-30', 100_000, 40, 4), ...x.kunlar] } : x));
    const avg2 = await kod(soxtaBaza({ holati: avgustli })).hisobot(holatYasa({ hisobot_oy: '2026-08' }, { sotuv: sn }));
    expect(avg2).toMatchObject({ oy: '2026-08', olchovSotuv: 400_000, olchovDona: 4, olchovKun: 1, oyKunlari: 31 });
    // Summa yozilmasa taxmin — oyning 1 kunidan; bu hisobda aytiladi.
    const hh = await k.hisobotHisob(holatYasa({ oy_sotuv: null, oy_komissiya: null }, { hisobot: avg2 }));
    expect(hh).toMatchObject({ oy: '2026-08', tugagan: true, sotuvManbasi: 'olchov', sotuvSom: 400_000, qamrov: { kun: 1, jami: 31 }, ijtimoiyMuddat: '2026-09-15' });
    const hh2 = await k.hisobotHisob(holatYasa({ oy_sotuv: 500_000 }, { hisobot: { ...avg2, olchovKun: 31 } }));
    expect(hh2.qamrov).toBeNull();
  });

  it('hisobotHisob: kabinet summasi ustun, soliq toʻliq sotuvdan, qadam kartalari', async () => {
    const k = kod(soxtaBaza());
    const hn = await k.hisobot(holatYasa());
    const hh = await k.hisobotHisob(holatYasa({ oy_sotuv: 4_000_000, oy_komissiya: 600_000 }, { hisobot: hn }));
    expect(hh).toMatchObject({ oy: '2026-09', sotuvSom: 4_000_000, sotuvManbasi: 'kabinet', komissiyaSom: 600_000, sofSom: 3_400_000, ijtimoiyMuddat: '2026-10-15', komissionerSana: '2026-10-19' });
    expect(hh.soliq).toMatchObject({ aylanmaSom: 40_000, ijtimoiySom: 440_000, jamiSom: 480_000 });
    expect(hh.qadamlar).toHaveLength(5);
  });

  it('hisobotYakun: bajarilmagan — toʻlov va kutyapman ishlari, muddat bilan; reja har tovarga', async () => {
    const b = soxtaBaza();
    const k = kod(b);
    const sn = await k.sotuv(holatYasa());
    const hn = await k.hisobot(holatYasa({}, { sotuv: sn }));
    const hh = await k.hisobotHisob(holatYasa({ oy_sotuv: null, oy_komissiya: null }, { hisobot: hn }));
    const y = await k.hisobotYakun(holatYasa({ deklaratsiya: 'keyin' }, { sotuv: sn, hisobot: hn, hisobot_hisob: hh }));
    expect(y.yozildi.map((x) => [x.tur, x.sabab, x.muddat])).toEqual([
      ['tolov', 'ijtimoiy soliq (2026-09)', '2026-10-15'],
      ['kutyapman', 'oylik soliq hisoboti (2026-09)', '2026-10-15'],
    ]);
    expect(y.reja).toHaveLength(2);
    expect(y.reja[0]).toMatch(/^«Sumka»: kuniga ~12\.5 dona, zaxira 0 kunga yetadi/);
    expect(y.reja[1]).toMatch(/^«Gʻilof»: kartochka havolasi yoʻq/);
  });

  it('hisobotYakun: «Bajardim» — ochiq ish yoʻq; «Sayt boshqacha» — tekshirish; sessiya yoʻq — olchov_yoq', async () => {
    const hh = { oy: '2026-09', soliq: { ijtimoiySom: 440_000 }, ijtimoiyMuddat: '2026-10-15' };
    const tayyor = await kod(soxtaBaza()).hisobotYakun(holatYasa({ deklaratsiya: 'tayyorlaymiz', deklaratsiya_qadam: 'bajardim' }, { hisobot_hisob: hh }));
    expect(tayyor.yozildi).toEqual([]);
    const boshqa = await kod(soxtaBaza()).hisobotYakun(holatYasa({ deklaratsiya: 'tayyorlaymiz', deklaratsiya_qadam: 'boshqacha' }, { hisobot_hisob: hh }));
    expect(boshqa.yozildi.map((x) => x.tur)).toEqual(['tolov', 'kutyapman', 'tekshirish']);
    expect(await kod(soxtaBaza(), false).hisobotYakun(holatYasa())).toMatchObject({ olchov_yoq: true, sabab: 'sessiya yoʻq' });
  });
});
