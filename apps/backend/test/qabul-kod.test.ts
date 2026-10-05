/**
 * 8-qadam kod harakatlari — `suhbatKodHarakatlari(...).qabul(holat)` va
 * `.qabulYakun(holat)`.
 *
 * `qabul`: faktlarni oʻqiydi (`so_fakt_oqi`), 6-qadam varaqasidan tekshiruv
 * roʻyxatini yasaydi (tovar, dona, qadoq tavsiyasi). `qabulYakun`: faqat
 * kam/nuqsonli yuk — tekshirish ishi (agentga daʼvo). Qadoq, yetkazma va
 * topshirish 10-qadamga koʻchdi (tartib tuzatildi, 2026-09-29) —
 * `yuklash-kod.test.ts`. Baza soxta.
 */

import { describe, expect, it } from 'vitest';
import type { QabulQadamNatijasi, QabulYakunNatijasi, YolHolati } from '@selleros/shared';
import { suhbatKodHarakatlari } from '../src/suhbat-kod.js';
import { QABUL_FAKT } from './fixtures/uzum-faktlar.js';

const BUYURTMA = { olchov_yoq: false, qatorlar: [
  { productId: 100, title: 'Ayollar sumkasi, katta', miqdor: 30, holat: 'tayyor' },
  { productId: 200, title: 'Telefon gʻilofi', miqdor: 10, holat: 'tayyor' },
  { productId: 300, title: 'Quloqchin', miqdor: 5, holat: 'tanlanmagan' },
] };

function holatYasa(q: Partial<YolHolati['javoblar']> = {}, natijalar: Partial<YolHolati['natijalar']> = {}): YolHolati {
  return {
    javoblar: { byudjet: 10_000_000, uzum_dokoni: 'yoq', tovarlar: [100, 200, 300], 'miqdor:100': 30, 'miqdor:200': 10, 'miqdor:300': 5, ...q },
    natijalar: { buyurtma: BUYURTMA, ...natijalar },
  };
}

function soxtaBaza(q: { fakt?: unknown; ochiq?: unknown } = {}) {
  const chaqiruvlar: Array<{ nom: string; arg: Record<string, unknown> }> = [];
  let id = 20;
  const rpc = async <T>(nom: string, arg: unknown): Promise<T | null> => {
    const a = arg as Record<string, unknown>;
    chaqiruvlar.push({ nom, arg: a });
    if (nom === 'so_fakt_oqi') return (q.fakt === undefined ? QABUL_FAKT : q.fakt) as T;
    if (nom === 'so_ochiq_ish_yoz') { id += 1; return (q.ochiq === undefined ? { id, yangi: true } : q.ochiq) as T; }
    return null;
  };
  return { rpc, chaqiruvlar, ochiq: () => chaqiruvlar.filter((c) => c.nom === 'so_ochiq_ish_yoz').map((c) => c.arg) };
}

const HOZIR = () => new Date('2026-09-29T09:00:00.000Z');

function kod(b: ReturnType<typeof soxtaBaza>, sessiya = true) {
  const k = suhbatKodHarakatlari(b.rpc, () => ({ bayroqlar: [], baholanmadi: [] }), () => 9,
    sessiya ? { kalit: 'KALIT', fetch: (async () => { throw new Error('tarmoq yoʻq'); }) as unknown as typeof fetch, token: 'tok', tarifCheklovi: false, hozir: HOZIR } : null);
  return {
    qabul: (h: YolHolati) => k.qabul(h) as Promise<QabulQadamNatijasi>,
    qabulYakun: (h: YolHolati) => k.qabulYakun(h) as Promise<QabulYakunNatijasi>,
  };
}

describe('qabul', () => {
  it('varaqadagi tayyor tovarlar roʻyxati, dona yigʻindisi, qadoq tavsiyasi nom boʻyicha (mos kelmasa null)', async () => {
    const b = soxtaBaza();
    const n = await kod(b).qabul(holatYasa());
    expect(n.olchov_yoq).toBe(false);
    expect(n.qatorlar.map((q) => [q.productId, q.miqdor, q.qadoq?.tur ?? null])).toEqual([[100, 30, 'Sumka / aksessuar'], [200, 10, null]]);
    expect(n.jamiDona).toBe(40);
    expect(n.varaqadan).toBe(true);
    expect(n.faktlar.ombor.manzil).toBe('Toshkent, Sergeli, Xonabod 2/2');
    expect(n.faktlar.yetishmaydi).toEqual([]);
    expect(b.chaqiruvlar[0]!.arg.p_kalitlar).toContain('uzum.qabul.tafovut_som');
    expect(n.izoh).toMatch(/daʼvo/);
  });
  it('varaqa yoʻq — tovarlar javobidan roʻyxat (miqdor javoblari bilan), nomi bazadan', async () => {
    const h = holatYasa({}, { tovarlar: { royxat: [{ nomzod: { productId: 100, title: 'Ayollar sumkasi' } }, { nomzod: { productId: 200, title: 'Gʻilof' } }] } });
    delete h.natijalar.buyurtma;
    const n = await kod(soxtaBaza()).qabul(h);
    expect(n.qatorlar.map((q) => [q.productId, q.title, q.miqdor])).toEqual([[100, 'Ayollar sumkasi', 30], [200, 'Gʻilof', 10], [300, '#300', 5]]);
    expect(n.jamiDona).toBe(45);
    // Bu roʻyxat varaqadan EMAS — chat "Varaqada N dona" demasligi uchun belgi.
    expect(n.varaqadan).toBe(false);
  });
  it('miqdor yoʻq — jami null; fakt oʻqilmadi / kiritilmagan farqlanadi', async () => {
    const n0 = await kod(soxtaBaza()).qabul(holatYasa({}, { buyurtma: { ...BUYURTMA, qatorlar: [{ productId: 100, title: 'A', miqdor: null, holat: 'tayyor' }] } }));
    expect(n0.jamiDona).toBeNull();
    const n1 = await kod(soxtaBaza({ fakt: null })).qabul(holatYasa());
    expect(n1).toMatchObject({ olchov_yoq: true, sabab: 'fakt roʻyxati oʻqilmadi (baza javob bermadi)' });
    const n2 = await kod(soxtaBaza({ fakt: {} })).qabul(holatYasa());
    expect(n2.olchov_yoq).toBe(true);
    expect(n2.sabab).toMatch(/kiritilmagan \(0058/);
  });
});

describe('qabulYakun — faqat kam/nuqsonli yuk', () => {
  it('kam — tekshirish, izoh bilan; qadoq/yetkazma javoblari bu yerda YOZILMAYDI (10-qadam)', async () => {
    const b = soxtaBaza();
    const h = holatYasa({ yuk_keldi: 'keldi', yuk_mos: 'kam', yuk_izoh: '3 ta sumka yetishmadi', qadoq_tayyor: 'keyin', topshirildi: 'topshirdim' });
    const n = await kod(b).qabulYakun(h);
    expect(n.olchov_yoq).toBe(false);
    expect(n.yozildi.map((y) => [y.tur, y.sabab, y.muddat])).toEqual([
      ['tekshirish', 'qabul: yuk kam keldi — 3 ta sumka yetishmadi', null],
    ]);
    expect(b.ochiq()[0]).toMatchObject({ p_token: 'tok', p_tur: 'tekshirish', p_props: { savolId: 'yuk_mos', javob: 'kam' } });
  });
  it('brak (izohsiz) — "nuqsonli"; mos — boʻsh roʻyxat', async () => {
    const n = await kod(soxtaBaza()).qabulYakun(holatYasa({ yuk_keldi: 'keldi', yuk_mos: 'brak', yuk_izoh: null }));
    expect(n.yozildi.map((y) => [y.tur, y.sabab])).toEqual([['tekshirish', 'qabul: yuk nuqsonli']]);
    const n2 = await kod(soxtaBaza()).qabulYakun(holatYasa({ yuk_keldi: 'keldi', yuk_mos: 'mos' }));
    expect(n2).toMatchObject({ olchov_yoq: false, yozildi: [] });
  });
  it('sessiya yoʻq yoki baza xato — olchov_yoq sabab bilan, roʻyxat yashirilmaydi', async () => {
    expect(await kod(soxtaBaza(), false).qabulYakun(holatYasa())).toMatchObject({ olchov_yoq: true, sabab: 'sessiya yoʻq', yozildi: [] });
    const x = await kod(soxtaBaza({ ochiq: null })).qabulYakun(holatYasa({ yuk_keldi: 'keldi', yuk_mos: 'kam' }));
    expect(x.olchov_yoq).toBe(true);
    expect(x.sabab).toBe('baza javob bermadi');
    expect(x.yozildi).toEqual([expect.objectContaining({ sabab: 'qabul: yuk kam keldi', id: null, yangi: false })]);
  });
});
