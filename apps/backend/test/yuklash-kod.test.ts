/**
 * 10-qadam kod harakatlari — `suhbatKodHarakatlari(...).yuklash(holat)` va
 * `.yuklashYakun(holat)`.
 *
 * `yuklash`: qabul (0058) va surat/kartochka (0059) faktlarini BITTA
 * soʻrovda oʻqiydi, varaqadan tovarlar roʻyxatini (qadoq tavsiyasi bilan)
 * yasaydi. `yuklashYakun`: kartochka, qadoq, yetkazma, taymslot va
 * topshirish javoblarini ochiq ish qiladi (keyin — kutyapman, boshqacha —
 * tekshirish, topshirildi — Uzum qabulini kutish, muddat faktdan). Baza soxta.
 */

import { describe, expect, it } from 'vitest';
import type { QabulYakunNatijasi, YolHolati, YuklashNatijasi } from '@selleros/shared';
import { suhbatKodHarakatlari } from '../src/suhbat-kod.js';
import { QABUL_FAKT, SURAT_FAKT } from './fixtures/uzum-faktlar.js';

const BUYURTMA = { olchov_yoq: false, qatorlar: [
  { productId: 100, title: 'Ayollar sumkasi, katta', miqdor: 30, holat: 'tayyor' },
  { productId: 200, title: 'Telefon gʻilofi', miqdor: 10, holat: 'tayyor' },
  { productId: 300, title: 'Quloqchin', miqdor: 5, holat: 'tanlanmagan' },
] };

function holatYasa(q: Partial<YolHolati['javoblar']> = {}, natijalar: Partial<YolHolati['natijalar']> = {}): YolHolati {
  return {
    javoblar: { byudjet: 10_000_000, uzum_dokoni: 'yoq', tovarlar: [100, 200, 300], 'miqdor:100': 30, 'miqdor:200': 10, ...q },
    natijalar: { buyurtma: BUYURTMA, ...natijalar },
  };
}

function soxtaBaza(q: { fakt?: unknown; ochiq?: unknown } = {}) {
  const chaqiruvlar: Array<{ nom: string; arg: Record<string, unknown> }> = [];
  let id = 40;
  const rpc = async <T>(nom: string, arg: unknown): Promise<T | null> => {
    const a = arg as Record<string, unknown>;
    chaqiruvlar.push({ nom, arg: a });
    if (nom === 'so_fakt_oqi') return (q.fakt === undefined ? { ...QABUL_FAKT, ...SURAT_FAKT } : q.fakt) as T;
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
    yuklash: (h: YolHolati) => k.yuklash(h) as Promise<YuklashNatijasi>,
    yuklashYakun: (h: YolHolati) => k.yuklashYakun(h) as Promise<QabulYakunNatijasi>,
  };
}

describe('yuklash', () => {
  it('ikki fakt toʻplami bitta soʻrovda; talablar, qoidalar, qadoq tavsiyasi, dona', async () => {
    const b = soxtaBaza();
    const n = await kod(b).yuklash(holatYasa());
    expect(n.olchov_yoq).toBe(false);
    const soralgan = b.chaqiruvlar.filter((c) => c.nom === 'so_fakt_oqi');
    expect(soralgan).toHaveLength(1);
    expect(soralgan[0]!.arg.p_kalitlar).toEqual(expect.arrayContaining(['uzum.qabul.muddat_kun_max', 'uzum.surat.min_eni', 'uzum.kartochka.qoidalar']));
    expect(n.talablar).toMatchObject({ minEni: 750, minBoyi: 1000, nisbat: 'vertikal 3:4', maxMb: 5 });
    expect(n.talablar.kartochkaQoidalari).toHaveLength(2);
    expect(n.talablar.yetishmaydi).toEqual([]);
    expect(n.faktlar.ombor.manzil).toBe('Toshkent, Sergeli, Xonabod 2/2');
    expect(n.qatorlar.map((q) => [q.productId, q.miqdor, q.qadoq?.usul ?? null])).toEqual([[100, 30, 'Individual paket'], [200, 10, null]]);
    expect(n.jamiDona).toBe(40);
    expect(n.izoh).toMatch(/Kartochkani tizim yaratmaydi/);
  });
  it('fakt oʻqilmadi / kiritilmagan farqlanadi; faqat 0058 bor — ishlaydi, kartochka qoidalari "yetishmaydi"', async () => {
    expect(await kod(soxtaBaza({ fakt: null })).yuklash(holatYasa())).toMatchObject({ olchov_yoq: true, sabab: 'fakt roʻyxati oʻqilmadi (baza javob bermadi)' });
    const bosh = await kod(soxtaBaza({ fakt: {} })).yuklash(holatYasa());
    expect(bosh.olchov_yoq).toBe(true);
    expect(bosh.sabab).toMatch(/kiritilmagan \(0058\/0059/);
    const faqat58 = await kod(soxtaBaza({ fakt: QABUL_FAKT })).yuklash(holatYasa());
    expect(faqat58.olchov_yoq).toBe(false);
    expect(faqat58.talablar.minEni).toBeNull();
    expect(faqat58.talablar.yetishmaydi).toEqual(expect.arrayContaining(['surat ruxsati', 'kartochka qoidalari']));
  });
});

describe('yuklashYakun', () => {
  const YUKLASH = { olchov_yoq: false, faktlar: { muddatKunMax: 7 } };

  it('keyin — kutyapman; topshirdim — Uzum qabuli, muddat = bugun + 7 (faktdan)', async () => {
    const b = soxtaBaza();
    const h = holatYasa({ kartochka_yaratildi: 'yaratdim', qadoq_tayyor: 'keyin', yetkazish: 'ozim', taymslot: 'oldim', topshirildi: 'topshirdim' }, { yuklash: YUKLASH });
    const n = await kod(b).yuklashYakun(h);
    expect(n.olchov_yoq).toBe(false);
    expect(n.yozildi.map((y) => [y.tur, y.sabab, y.muddat])).toEqual([
      ['kutyapman', 'qadoq va yorliqlar', null],
      ['kutyapman', 'Uzum ombor qabuli', '2026-10-06'],
    ]);
    expect(b.ochiq()[1]).toMatchObject({ p_token: 'tok', p_tur: 'kutyapman', p_muddat: '2026-10-06', p_props: { savolId: 'topshirildi', javob: 'topshirdim' } });
  });
  it('boshqacha — tekshirish (yuklash: …); oʻtkazilgan (null) — kutyapman; kutyapman — qabul kutish', async () => {
    const n = await kod(soxtaBaza()).yuklashYakun(holatYasa({ kartochka_yaratildi: 'boshqacha', qadoq_tayyor: 'boshqacha', yetkazish: null, taymslot: 'boshqacha', topshirildi: 'kutyapman' }, { yuklash: YUKLASH }));
    expect(n.yozildi.map((y) => [y.tur, y.sabab])).toEqual([
      ['tekshirish', 'yuklash: kabinet (kartochka) boshqacha'],
      ['tekshirish', 'yuklash: qadoq qoʻllanmasi boshqacha'],
      ['kutyapman', 'omborga yetkazish usuli'],
      ['tekshirish', 'yuklash: yetkazma/taymslot boshqacha'],
      ['kutyapman', 'Uzum ombor qabuli'],
    ]);
  });
  it('kartochka keyin — kutyapman; muddat fakti yoʻq — null (nol emas); 8-qadam faktiga tushadi', async () => {
    const n = await kod(soxtaBaza()).yuklashYakun(holatYasa({ kartochka_yaratildi: 'keyin', qadoq_tayyor: 'tayyor', yetkazish: 'logistika', taymslot: 'oldim', topshirildi: 'topshirdim' }, { yuklash: { olchov_yoq: false, faktlar: { muddatKunMax: null } } }));
    expect(n.yozildi.map((y) => [y.sabab, y.muddat])).toEqual([['kartochka yaratish', null], ['Uzum ombor qabuli', null]]);
    const n2 = await kod(soxtaBaza()).yuklashYakun(holatYasa({ topshirildi: 'topshirdim' }, { qabul: { faktlar: { muddatKunMax: 3 } } }));
    expect(n2.yozildi).toEqual([expect.objectContaining({ sabab: 'Uzum ombor qabuli', muddat: '2026-10-02' })]);
  });
  it('sessiya yoʻq yoki baza xato — olchov_yoq sabab bilan', async () => {
    expect(await kod(soxtaBaza(), false).yuklashYakun(holatYasa())).toMatchObject({ olchov_yoq: true, sabab: 'sessiya yoʻq', yozildi: [] });
    const x = await kod(soxtaBaza({ ochiq: { xato: 'sessiya topilmadi' } })).yuklashYakun(holatYasa({ qadoq_tayyor: 'keyin' }, { yuklash: YUKLASH }));
    expect(x).toMatchObject({ olchov_yoq: true, sabab: 'sessiya topilmadi' });
    expect(x.yozildi).toEqual([expect.objectContaining({ sabab: 'qadoq va yorliqlar', id: null })]);
  });
});
