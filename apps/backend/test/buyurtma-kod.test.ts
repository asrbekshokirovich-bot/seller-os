/**
 * 6-qadam kod harakatlari — `suhbatKodHarakatlari(...).buyurtma(holat)` va
 * `.ochiqIsh(holat)`, hamda 4-qadam `tannarx` ning fakt kargosi.
 *
 * Nazoratchi (2026-09-28): kargo hamkori YOʻQ. Demak asosiy holat —
 * `selleros.fakt` da hamma kargo kaliti NULL: varaqa yasaladi, kargo
 * "kiritilmagan" deb turadi, nol yoki taxmin chiqmaydi. Fakt toʻldirilgan
 * holat ham tekshiriladi (raqamlar test uchun, fakt emas). Baza soxta
 * (`rpc`), CBU soxta (`fetch`). Tarmoqqa chiqilmaydi.
 */

import { describe, expect, it } from 'vitest';
import type { BuyurtmaNatijasi, OchiqIshNatijasi, YolHolati } from '@selleros/shared';
import { suhbatKodHarakatlari } from '../src/suhbat-kod.js';

const CNY = [{ Ccy: 'CNY', Nominal: '1', Rate: '1762.49', Date: '25.09.2026' }];
const USD = [{ Ccy: 'USD', Nominal: '1', Rate: '12650', Date: '28.09.2026' }];

/** 0056 dan keyingi holat: kalitlar bor, qiymat NULL. */
const FAKT_BOSH = Object.fromEntries(
  ['kargo.hamkor', 'kargo.avia.usd_kg', 'kargo.avia.kun', 'kargo.quruqlik.usd_kg', 'kargo.quruqlik.kun', 'kargo.usd_m3', 'kargo.min_usd']
    .map((k) => [k, { qiymat: null, birlik: 'x', manba: null, olchandi: null, izoh: null }]),
);
/** Nazoratchi toʻldirgan holat (misol). */
const FAKT_TOLIQ = {
  'kargo.hamkor':          { qiymat: 'Hamkor X', birlik: 'matn', manba: 'shartnoma', olchandi: '2026-09-28', izoh: null },
  'kargo.avia.usd_kg':     { qiymat: 8, birlik: 'USD/kg', manba: 'Hamkor X', olchandi: '2026-09-28', izoh: null },
  'kargo.avia.kun':        { qiymat: 12, birlik: 'kun', manba: 'Hamkor X', olchandi: '2026-09-28', izoh: null },
  'kargo.quruqlik.usd_kg': { qiymat: 3, birlik: 'USD/kg', manba: 'Hamkor X', olchandi: '2026-09-28', izoh: null },
  'kargo.quruqlik.kun':    { qiymat: 30, birlik: 'kun', manba: 'Hamkor X', olchandi: '2026-09-28', izoh: null },
  'kargo.usd_m3':          { qiymat: null, birlik: 'USD/m3', manba: null, olchandi: null, izoh: null },
  'kargo.min_usd':         { qiymat: null, birlik: 'USD', manba: null, olchandi: null, izoh: null },
};

const TAKLIF = (sourceId: string, narxYuan: number) => ({
  sourceId, title: `1688 ${sourceId}`, narxYuan, rasmUrl: null, moq: 2, reyting: 4.5, manba: '1688',
  manzil: `https://detail.1688.com/offer/${sourceId}.html`, oxshashlikOrni: 1, dropshipNarxYuan: null, buyurtmalar: 10,
  zavod: true, superZavod: false, sotuvchi: null, joy: null, dokonYili: 5, narxSom: null, chegaradaMi: null,
});

/** 5-qadam tugagan holat: 100 — taklif tanlangan, 200 — oʻtkazilgan, 300 — qidirilmagan. */
function holatYasa(q: Partial<YolHolati['javoblar']> = {}, natijalar: Partial<YolHolati['natijalar']> = {}): YolHolati {
  return {
    javoblar: {
      byudjet: 10_000_000, uzum_dokoni: 'yoq', yonalish: 11, tovarlar: [100, 200, 300],
      'miqdor:100': 30, 'miqdor:200': 10, 'miqdor:300': 5, marja: 30, xitoy_tasdiq: 'ha',
      'xitoy_tanlov:100': '983093623752', 'xitoy_tanlov:200': null, ...q,
    },
    natijalar: {
      tovarlar: { royxat: [
        { nomzod: { productId: 100, title: 'Quloqchin A', narxSom: 95_000, komissiyaFoizi: 10, weightG: 120, volumeMl: 500 }, miqdor: null },
        { nomzod: { productId: 200, title: 'Quloqchin B', narxSom: 80_000, komissiyaFoizi: 10, weightG: null, volumeMl: null }, miqdor: null },
        { nomzod: { productId: 300, title: 'Quloqchin C', narxSom: 50_000, komissiyaFoizi: 10, weightG: 900, volumeMl: null }, miqdor: null },
      ] },
      xitoy: {
        olchov_yoq: false,
        kurs: { somPerYuan: 1762.49, sana: '25.09.2026', manba: 'CBU' },
        qatorlar: [
          { productId: 100, holat: 'topildi', takliflar: [TAKLIF('983093623752', 27), TAKLIF('969462626480', 35)] },
          { productId: 200, holat: 'topildi', takliflar: [TAKLIF('111', 5)] },
          { productId: 300, holat: 'qidirilmadi', sabab: 'rasm yoʻq', takliflar: [] },
        ],
        kutilmoqda: null,
      },
      ...natijalar,
    },
  };
}

function soxtaBaza(q: { fakt?: unknown; ochiq?: unknown } = {}) {
  const chaqiruvlar: Array<{ nom: string; arg: Record<string, unknown> }> = [];
  const rpc = async <T>(nom: string, arg: unknown): Promise<T | null> => {
    const a = arg as Record<string, unknown>;
    chaqiruvlar.push({ nom, arg: a });
    if (nom === 'so_fakt_oqi') return (q.fakt === undefined ? FAKT_BOSH : q.fakt) as T;
    if (nom === 'so_ochiq_ish_yoz') return (q.ochiq === undefined ? { id: 7, yangi: true, muddat: a.p_muddat } : q.ochiq) as T;
    return null;
  };
  return { rpc, chaqiruvlar, nomlar: () => chaqiruvlar.map((c) => c.nom) };
}

/** Soxta CBU: valyuta URL dan. `yiqil` — hamma soʻrov yiqiladi. */
function soxtaFetch(q: { yiqil?: boolean } = {}) {
  const urllar: string[] = [];
  const f = (async (kirish: string | URL | Request) => {
    const url = String(kirish);
    urllar.push(url);
    if (q.yiqil) throw new Error('tarmoq yoʻq');
    if (url.includes('cbu.uz') && url.includes('/USD/')) return new Response(JSON.stringify(USD), { status: 200 });
    if (url.includes('cbu.uz') && url.includes('/CNY/')) return new Response(JSON.stringify(CNY), { status: 200 });
    throw new Error(`kutilmagan URL: ${url}`);
  }) as unknown as typeof fetch;
  return { fetch: f, urllar };
}

const HOZIR = () => new Date('2026-09-28T10:00:00.000Z');

interface TannarxQ {
  qatorlar: Array<{ productId: number; yetishmaydi: string[]; kargoYoli: string | null; chegaraSom: number | null }>;
}

/** Kod harakatlari — natijalar 6-qadam turlariga keltirilgan (deps `unknown` qaytaradi). */
function kod(b: ReturnType<typeof soxtaBaza>, f: typeof fetch | null = soxtaFetch().fetch) {
  const k = suhbatKodHarakatlari(b.rpc, () => ({ bayroqlar: [], baholanmadi: [] }), () => 9,
    f === null ? null : { kalit: 'KALIT', fetch: f, token: 'tok', tarifCheklovi: false, hozir: HOZIR });
  return {
    buyurtma: (h: YolHolati) => k.buyurtma(h) as Promise<BuyurtmaNatijasi>,
    ochiqIsh: (h: YolHolati) => k.ochiqIsh(h) as Promise<OchiqIshNatijasi>,
    tannarx: (h: YolHolati) => k.tannarx(h) as Promise<TannarxQ>,
  };
}

const qator = (n: BuyurtmaNatijasi, id: number) => n.qatorlar.find((x) => x.productId === id)!;

describe('buyurtma — kargo hamkori YOʻQ (0056 holati)', () => {
  it('varaqa: tanlangan taklif yuan+soʻm, oʻtkazilgan va qidirilmagan "tanlanmagan", kargo kiritilmagan', async () => {
    const b = soxtaBaza(); const s = soxtaFetch();
    const n = await kod(b, s.fetch).buyurtma(holatYasa());
    expect(n.olchov_yoq).toBe(false);
    expect(n.qatorlar.map((q) => q.holat)).toEqual(['tayyor', 'tanlanmagan', 'tanlanmagan']);
    expect(qator(n, 100)).toMatchObject({
      sourceId: '983093623752', xitoyTitle: '1688 983093623752', manzil: 'https://detail.1688.com/offer/983093623752.html',
      miqdor: 30, narxYuan: 27, narxSom: 47_587, jamiYuan: 810, jamiSom: 1_427_610, weightG: 120,
      kargoSom: null, kargoIzoh: 'kargo hamkori, kargo stavkasi kiritilmagan',
    });
    // Oʻtkazilgan tovar: 1688 da taklif bor edi, lekin tanlanmagan — varaqaga kirmaydi, sonlari null.
    expect(qator(n, 200)).toMatchObject({ sourceId: null, narxYuan: null, jamiSom: null, miqdor: 10, holat: 'tanlanmagan' });
    expect(n.jami).toEqual({ yuan: 810, som: 1_427_610, kargoSom: null, dona: 30, tayyor: 1, tanlanmagan: 2 });
    expect(n.kargo.tanlovBor).toBe(false);
    expect(n.kargo.izoh).toBe('kargo hamkori, kargo stavkasi kiritilmagan');
    // CNY kursi 5-qadam natijasidan — CBU ga faqat USD uchun chiqiladi.
    expect(n.kurs.cny).toEqual({ somPerYuan: 1762.49, valyuta: 'CNY', sana: '25.09.2026', manba: 'CBU' });
    expect(n.kurs.usd?.somPerYuan).toBe(12_650);
    expect(s.urllar).toEqual(['https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/']);
    expect(b.nomlar()).toEqual(['so_fakt_oqi']);
    expect(b.chaqiruvlar[0]!.arg.p_kalitlar).toContain('kargo.avia.usd_kg');
    expect(n.izoh).toMatch(/Tizim buyurtma bermaydi/);
  });

  it('fakt oʻqilmadi (baza null) — "kiritilmagan" EMAS, "oʻqilmadi"', async () => {
    const b = soxtaBaza({ fakt: null });
    const n = await kod(b).buyurtma(holatYasa());
    expect(n.kargo.izoh).toBe('fakt roʻyxati oʻqilmadi (baza javob bermadi)');
    expect(qator(n, 100).kargoIzoh).toBe('fakt roʻyxati oʻqilmadi (baza javob bermadi)');
  });

  it('5-qadam kursi yoʻq va CBU yiqilsa — soʻm null, yuan turadi (nol emas)', async () => {
    const b = soxtaBaza(); const s = soxtaFetch({ yiqil: true });
    const h = holatYasa();
    (h.natijalar.xitoy as { kurs: unknown }).kurs = null;
    const n = await kod(b, s.fetch).buyurtma(h);
    expect(qator(n, 100)).toMatchObject({ narxYuan: 27, narxSom: null, jamiYuan: 810, jamiSom: null });
    expect(n.jami.som).toBeNull();
    expect(n.jami.yuan).toBe(810);
    expect(n.kurs).toEqual({ cny: null, usd: null });
  });

  it('hech bir taklif tanlanmagan — olchov_yoq, sabab; tovar yoʻq — boshqa sabab', async () => {
    const b = soxtaBaza();
    const n1 = await kod(b).buyurtma(holatYasa({ 'xitoy_tanlov:100': null }));
    expect(n1.olchov_yoq).toBe(true);
    expect(n1.sabab).toBe('1688 taklifi tanlanmagan');
    expect(n1.jami.tayyor).toBe(0);
    const n2 = await kod(b).buyurtma(holatYasa({ tovarlar: [] }));
    expect(n2.olchov_yoq).toBe(true);
    expect(n2.sabab).toBe('tovar tanlanmagan');
    expect(n2.qatorlar).toEqual([]);
  });

  it('miqdor yoʻq — jami null, narx bor', async () => {
    const n = await kod(soxtaBaza()).buyurtma(holatYasa({ 'miqdor:100': null }));
    expect(qator(n, 100)).toMatchObject({ miqdor: null, narxYuan: 27, jamiYuan: null, jamiSom: null });
    expect(n.jami.dona).toBeNull();
  });
});

describe('buyurtma — fakt toʻldirilgan (hamkor bor)', () => {
  it('kargo ogʻirlik boʻyicha, tanlangan yoʻl; ogʻirliksiz tovar — null', async () => {
    const b = soxtaBaza({ fakt: FAKT_TOLIQ });
    const n = await kod(b).buyurtma(holatYasa({ 'xitoy_tanlov:200': '111', kargo_yol: 'avia' }));
    expect(n.kargo.tanlovBor).toBe(true);
    expect(n.kargo.izoh).toBeNull();
    expect(n.kargo.hamkor).toBe('Hamkor X');
    // 120 g × $8 × 12 650 = 12 144 soʻm / dona.
    expect(qator(n, 100)).toMatchObject({ kargoSom: 12_144, kargoIzoh: 'ogʻirlik boʻyicha, avia' });
    // 200: ogʻirlik oʻlchanmagan — kargo null, sababi yozilgan.
    expect(qator(n, 200)).toMatchObject({ holat: 'tayyor', narxYuan: 5, kargoSom: null, kargoIzoh: 'ogʻirlik oʻlchanmagan' });
    // Jami kargo — bitta tovarda null bor → jami null (yashirin nol yoʻq).
    expect(n.jami.kargoSom).toBeNull();
  });

  it('yoʻl tanlanmagan — arzoni (quruqlik); jami kargo hammasi bor boʻlsa yigʻiladi', async () => {
    const b = soxtaBaza({ fakt: FAKT_TOLIQ });
    const n = await kod(b).buyurtma(holatYasa());
    // 120 g × $3 × 12 650 = 4 554 soʻm / dona; × 30 = 136 620.
    expect(qator(n, 100)).toMatchObject({ kargoSom: 4554, kargoIzoh: 'ogʻirlik boʻyicha, quruqlik' });
    expect(n.jami.kargoSom).toBe(136_620);
  });
});

describe('tannarx — fakt kargosi chegaraga kiradi', () => {
  it('fakt boʻsh — chegara kargosiz, yetishmaydi da "kargo", kargoYoli null', async () => {
    const n = await kod(soxtaBaza()).tannarx(holatYasa());
    const q = n.qatorlar.find((x) => x.productId === 100)!;
    expect(q.yetishmaydi).toContain('kargo');
    expect(q.kargoYoli).toBeNull();
  });
  it('fakt toʻliq — arzon yoʻl kargosi chegaraga kiradi, "kargo" yetishmaydi dan chiqadi, chegara pastroq', async () => {
    const bosh = await kod(soxtaBaza()).tannarx(holatYasa());
    const n = await kod(soxtaBaza({ fakt: FAKT_TOLIQ })).tannarx(holatYasa());
    const q = n.qatorlar.find((x) => x.productId === 100)!;
    expect(q.kargoYoli).toBe('quruqlik');
    expect(q.yetishmaydi).not.toContain('kargo');
    const oldin = bosh.qatorlar.find((x) => x.productId === 100)!.chegaraSom;
    if (oldin !== null && q.chegaraSom !== null) expect(q.chegaraSom).toBeLessThan(oldin);
    // Ogʻirliksiz tovar — kargo yoʻq, "kargo" yetishmaydi da qoladi.
    const q200 = n.qatorlar.find((x) => x.productId === 200)!;
    expect(q200.yetishmaydi).toContain('kargo');
    expect(q200.kargoYoli).toBeNull();
  });
});

describe('ochiqIsh', () => {
  it('muddat yoʻq (kargo kun yoʻq) — p_muddat null, props bilan yoziladi', async () => {
    const b = soxtaBaza();
    const h = holatYasa({ shahar: 'Toshkent', buyurtma_raqami: 'ORD-1', dokon_tayyorlash: 'boshlaymiz' });
    const n = await kod(b).ochiqIsh(h);
    expect(n).toMatchObject({ olchov_yoq: false, id: 7, yangi: true, tur: 'kutyapman', muddat: null });
    const c = b.chaqiruvlar.find((x) => x.nom === 'so_ochiq_ish_yoz')!;
    expect(c.arg).toMatchObject({ p_token: 'tok', p_tur: 'kutyapman', p_sabab: 'yuk kelishi', p_muddat: null,
      p_props: { shahar: 'Toshkent', kargo_yol: null, buyurtma_raqami: 'ORD-1' } });
    expect(n.izoh).toMatch(/Eslatma mexanizmi hali yoʻq/);
  });

  it('kargo kun bor — muddat = bugun + kun (UTC sana)', async () => {
    const b = soxtaBaza();
    const bn: Partial<BuyurtmaNatijasi> = { kargo: {
      hamkor: 'Hamkor X', avia: { yol: 'avia', usdKg: 8, kun: 12, somPerKg: 101_200, manba: null, olchandi: null },
      quruqlik: { yol: 'quruqlik', usdKg: 3, kun: 30, somPerKg: 37_950, manba: null, olchandi: null },
      usdM3: null, minUsd: null, tanlovBor: true, izoh: null,
    } };
    const h = holatYasa({ kargo_yol: 'quruqlik' }, { buyurtma: bn });
    const n = await kod(b).ochiqIsh(h);
    expect(n.muddat).toBe('2026-10-28');
    expect(b.chaqiruvlar.find((x) => x.nom === 'so_ochiq_ish_yoz')!.arg.p_muddat).toBe('2026-10-28');
    const n2 = await kod(b).ochiqIsh(holatYasa({ kargo_yol: 'avia' }, { buyurtma: bn }));
    expect(n2.muddat).toBe('2026-10-10');
  });

  it('baza xato yoki null, sessiya yoʻq — olchov_yoq sabab bilan, otmaydi', async () => {
    expect(await kod(soxtaBaza({ ochiq: { xato: 'sessiya topilmadi' } })).ochiqIsh(holatYasa()))
      .toMatchObject({ olchov_yoq: true, sabab: 'sessiya topilmadi', id: null } satisfies Partial<OchiqIshNatijasi>);
    expect(await kod(soxtaBaza({ ochiq: null })).ochiqIsh(holatYasa())).toMatchObject({ olchov_yoq: true, sabab: 'baza javob bermadi' });
    expect(await kod(soxtaBaza(), null).ochiqIsh(holatYasa())).toMatchObject({ olchov_yoq: true, sabab: 'sessiya yoʻq' });
  });
});
