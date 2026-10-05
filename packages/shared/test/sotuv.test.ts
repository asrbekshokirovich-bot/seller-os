/**
 * 11-qadam sof funksiyalari (`src/sotuv.ts`): havoladan tovar ID,
 * RPC javobini oʻqish, oʻz kartochka holati (bugun, tezlik, zaxira necha
 * kunga yetadi, oy yigʻindisi), raqobatchi narxi, signallar, keyingi oy rejasi.
 */

import { describe, expect, it } from 'vitest';
import {
  keyingiOyRejasi, kuzatuvlarniOqi, NARX_SIGNAL_FOIZ, oyYigindisi, ozHolati, raqobatchiHolati, sotuvSignallari, uzumMahsulotId,
  ZAXIRA_SIGNAL_ULUSH, type TovarKuzatuvi,
} from '../src/index.js';

const kun = (sana: string, q: Partial<{ narx: number; zaxira: number; sharh: number; reyting: number; sotildi: number | null; daromad: number | null }>) => ({
  sana, narx: q.narx ?? 100_000, zaxira: q.zaxira ?? null, sharh: q.sharh ?? null, reyting: q.reyting ?? null,
  sotildi: q.sotildi === undefined ? null : q.sotildi, daromad: q.daromad === undefined ? null : q.daromad,
});

describe('uzumMahsulotId', () => {
  it('haqiqiy shakllar: /uz/product/<slug>-<id>, /ru/…, /product/<id>, sof raqam, protokolsiz', () => {
    expect(uzumMahsulotId('https://uzum.uz/uz/product/ayollar-sumkasi-katta-2367334')).toBe(2367334);
    expect(uzumMahsulotId('https://uzum.uz/ru/product/sumka-2367334?skuId=123')).toBe(2367334);
    expect(uzumMahsulotId('https://uzum.uz/product/2367334/')).toBe(2367334);
    expect(uzumMahsulotId('uzum.uz/uz/product/x-2838215')).toBe(2838215);
    expect(uzumMahsulotId(' 2838215 ')).toBe(2838215);
    expect(uzumMahsulotId(2838215)).toBe(2838215);
  });
  it('boshqa sayt, katalog sahifasi, buzuq matn — null', () => {
    expect(uzumMahsulotId('https://wildberries.uz/catalog/2367334')).toBeNull();
    expect(uzumMahsulotId('https://uzum.uz/uz/category/sumkalar-11770')).toBeNull();
    expect(uzumMahsulotId('https://evil.com/?u=uzum.uz/product/1')).toBeNull();
    expect(uzumMahsulotId('salom')).toBeNull();
    expect(uzumMahsulotId('12')).toBeNull();
    expect(uzumMahsulotId(null)).toBeNull();
  });
});

describe('kuzatuvlarniOqi', () => {
  it('RPC javobi → saralangan kunlar; buzuq qator tashlanadi', () => {
    const k = kuzatuvlarniOqi([
      { externalId: 5, kuzatuvda: true, topildi: true, title: 'A', kunlar: [
        { sana: '2026-09-30', narx: 98010, zaxira: 0, sharh: 77, reyting: 4.8, sotildi: 1, daromad: 98010 },
        { sana: '2026-09-29', narx: '98010', zaxira: 1, sharh: 77, reyting: 4.8, sotildi: 3, daromad: null },
        { narx: 1 },
      ] },
      { externalId: 'yomon' },
      null,
    ]);
    expect(k).toHaveLength(1);
    expect(k[0]!.kunlar.map((x) => x.sana)).toEqual(['2026-09-29', '2026-09-30']);
    expect(k[0]!.kunlar[0]!.narx).toBe(98010);
    expect(kuzatuvlarniOqi(null)).toEqual([]);
  });
});

describe('ozHolati', () => {
  const k: TovarKuzatuvi = { externalId: 9, kuzatuvda: true, topildi: true, title: 'Sumka', kunlar: [
    kun('2026-09-25', { zaxira: 30, sharh: 2 }),
    kun('2026-09-26', { zaxira: 28, sharh: 2, sotildi: 2, daromad: 200_000 }),
    kun('2026-09-27', { zaxira: 24, sharh: 3, sotildi: 4, daromad: 400_000 }),
    kun('2026-09-28', { zaxira: 24, sharh: 3, sotildi: 0 }),
    kun('2026-10-01', { zaxira: 20, sharh: 5, reyting: 4.6, sotildi: 4, daromad: null }),
  ] };
  it('bugun, tezlik (oʻlchangan kunlar), zaxira kunlari, boshlangʻich, ulush, yangi sharh, oy yigʻindisi', () => {
    const o = ozHolati(k, 9, '2026-10');
    expect(o).toMatchObject({ holat: 'olchandi', sana: '2026-10-01', bugunSotildi: 4, zaxira: 20, boshlangichZaxira: 30, narx: 100_000, sharh: 5, reyting: 4.6, yangiSharh: 2, olchovKun: 5 });
    expect(o.tezlik).toBe(2.5);
    expect(o.tezlikKun).toBe(4);
    expect(o.zaxiraKun).toBe(8);
    expect(o.zaxiraUlush).toBe(0.67);
    expect(o.oyDona).toBe(4);
    expect(o.oySom).toBe(400_000);
    const sent = ozHolati(k, 9, '2026-09');
    expect(sent.oyDona).toBe(6);
    expect(sent.oySom).toBe(600_000);
  });
  it('oʻlchov yoʻq — kutilmoqda, hammasi null (nol emas)', () => {
    const o = ozHolati(null, 9, '2026-10');
    expect(o).toMatchObject({ holat: 'kutilmoqda', bugunSotildi: null, tezlik: null, zaxira: null, zaxiraKun: null, oyDona: null, oySom: null });
  });
  it('sotuv 0 — tezlik 0, zaxira kunlari nomaʼlum (cheksiz emas)', () => {
    const o = ozHolati({ ...k, kunlar: [kun('2026-10-01', { zaxira: 10, sotildi: 0 })] }, 9, '2026-10');
    expect(o.tezlik).toBe(0);
    expect(o.zaxiraKun).toBeNull();
  });
  it('oyYigindisi: faqat shu oy oʻlchangan kunlari (soni bilan); daromad yoʻq — sotildi × narx; kun yoʻq — null', () => {
    // 25-sentyabr — birinchi oʻlchov (sotuv hisoblanmaydi), shuning uchun 3 kun.
    expect(oyYigindisi(k, '2026-09')).toEqual({ dona: 6, som: 600_000, kun: 3 });
    expect(oyYigindisi(k, '2026-10')).toEqual({ dona: 4, som: 400_000, kun: 1 });
    expect(oyYigindisi(k, '2026-08')).toEqual({ dona: null, som: null, kun: 0 });
    expect(oyYigindisi(null, '2026-09')).toEqual({ dona: null, som: null, kun: 0 });
  });
  it('oyYigindisi: narxi ham, daromadi ham yoʻq kun — tushum null (nol deb qoʻshilmaydi), dona sanaladi', () => {
    // Tekshiruv (2026-10-05): bunday kun tushumga 0 soʻm boʻlib qoʻshilardi —
    // oy summasi (va 12-qadam taxmini, aylanma soligʻi) jimgina kam chiqardi.
    const narxsiz: TovarKuzatuvi = { ...k, kunlar: [
      kun('2026-09-29', { zaxira: 10, sotildi: 2, daromad: 200_000 }),
      { sana: '2026-09-30', narx: null, zaxira: 7, sharh: null, reyting: null, sotildi: 3, daromad: null },
    ] };
    expect(oyYigindisi(narxsiz, '2026-09')).toEqual({ dona: 5, som: null, kun: 2 });
  });
  it('qayta buyurtma: yangi partiya omborga tushmaguncha boshlangʻich yoʻq (eski qoldiq signal bermaydi)', () => {
    const tarix: TovarKuzatuvi = { ...k, kunlar: [
      kun('2026-09-01', { zaxira: 30 }), kun('2026-09-20', { zaxira: 5, sotildi: 2 }),
      kun('2026-09-21', { zaxira: 3, sotildi: 2 }), kun('2026-09-25', { zaxira: 1, sotildi: 2 }),
    ] };
    const qayta = { sana: '2026-09-20', zaxira: 5 };
    // Buyurtmadan keyin qoldiq 5 → 1: boshlangʻich yoʻq, ulush yoʻq.
    expect(ozHolati(tarix, 9, '2026-09', qayta)).toMatchObject({ boshlangichZaxira: null, zaxiraUlush: null, zaxira: 1 });
    // Qayta buyurtmasiz — eski boshlangʻich 30.
    expect(ozHolati(tarix, 9, '2026-09').boshlangichZaxira).toBe(30);
    // Yangi partiya tushdi (1 → 40), keyin sotildi: boshlangʻich 40, ulush 0.5.
    const keldi = { ...tarix, kunlar: [...tarix.kunlar, kun('2026-10-20', { zaxira: 40 }), kun('2026-10-25', { zaxira: 20, sotildi: 20 })] };
    expect(ozHolati(keldi, 9, '2026-10', qayta)).toMatchObject({ boshlangichZaxira: 40, zaxiraUlush: 0.5 });
    // Oʻshandagi zaxira nomaʼlum — sanadan keyingi eng katta oʻlchov.
    expect(ozHolati(tarix, 9, '2026-09', { sana: '2026-09-20', zaxira: null }).boshlangichZaxira).toBe(5);
  });
});

describe('raqobatchiHolati va signallar', () => {
  const r = (narxlar: number[]): TovarKuzatuvi => ({ externalId: 1, kuzatuvda: true, topildi: true, title: 'R',
    kunlar: narxlar.map((n, i) => kun(`2026-09-${String(20 + i).padStart(2, '0')}`, { narx: n })) });
  it('oxirgi oʻzgarishdagi tushish foizi; oshsa yoki oʻzgarmasa null', () => {
    expect(raqobatchiHolati(r([100_000, 100_000, 95_000]), 1)).toMatchObject({ narx: 95_000, oldingiNarx: 100_000, tushdiFoiz: 5 });
    expect(raqobatchiHolati(r([95_000, 100_000]), 1).tushdiFoiz).toBeNull();
    expect(raqobatchiHolati(r([100_000, 100_000]), 1)).toMatchObject({ oldingiNarx: null, tushdiFoiz: null });
    expect(raqobatchiHolati(null, 1)).toMatchObject({ narx: null, tushdiFoiz: null });
  });
  it('signallar: zaxira < 20 % (tovar partiyasi boʻyicha id), narx ≥ 3 % tushsa, yangi sharh', () => {
    const oz = ozHolati({ externalId: 9, kuzatuvda: true, topildi: true, title: 'S', kunlar: [
      kun('2026-09-29', { zaxira: 30, sharh: 4 }), kun('2026-09-30', { zaxira: 3, sharh: 6, reyting: 4.5, sotildi: 27 }),
    ] }, 9, '2026-09');
    const raq = raqobatchiHolati(r([100_000, 96_000]), 7);
    const s = sotuvSignallari([{ productId: 7, partiya: 2, oz, raqobatchi: raq }]);
    expect(s.map((x) => x.id)).toEqual(['zaxira:7:p2', 'narx:7:2026-09-21:96000', 'sharh:7:6']);
    expect(s[0]).toMatchObject({ tur: 'zaxira', zaxira: 3, ulush: 0.1 });
    expect(s[1]).toMatchObject({ tur: 'narx', foiz: 4, ozNarx: 100_000 });
    expect(s[2]).toMatchObject({ tur: 'sharh', yangi: 2, jami: 6, reyting: 4.5 });
    expect(ZAXIRA_SIGNAL_ULUSH).toBe(0.2);
    expect(NARX_SIGNAL_FOIZ).toBe(3);
  });
  it('narx signali id si — narx OʻZGARGAN kun: bir xil tushish keyingi kunlarda qayta soʻralmaydi', () => {
    // Tekshiruv (2026-10-05): id oxirgi oʻlchov kuni bilan edi — 100 000 → 95 000
    // tushishi har «Yangilash» da (7 kungacha) yangi savol boʻlib qaytardi.
    const kunlar = [100_000, 95_000, 95_000, 95_000].map((n, i) => kun(`2026-10-0${i + 1}`, { narx: n }));
    const idlar = [2, 3, 4].map((n) => {
      const raq = raqobatchiHolati({ externalId: 1, kuzatuvda: true, topildi: true, title: 'R', kunlar: kunlar.slice(0, n) }, 7);
      return sotuvSignallari([{ productId: 7, partiya: 1, oz: null, raqobatchi: raq }]).map((x) => x.id);
    });
    expect(idlar).toEqual([['narx:7:2026-10-02:95000'], ['narx:7:2026-10-02:95000'], ['narx:7:2026-10-02:95000']]);
  });
  it('kichik boshlangʻich zaxira (< 5) yoki kichik tushish (< 3 %) — signal yoʻq', () => {
    const oz = ozHolati({ externalId: 9, kuzatuvda: true, topildi: true, title: 'S', kunlar: [kun('2026-09-29', { zaxira: 3 }), kun('2026-09-30', { zaxira: 0 })] }, 9, '2026-09');
    expect(sotuvSignallari([{ productId: 7, partiya: 1, oz, raqobatchi: raqobatchiHolati(r([100_000, 98_000]), 7) }])).toEqual([]);
  });
});

describe('keyingiOyRejasi', () => {
  it('havolasiz, kutilmoqda, sotuvsiz va sotuvli tovar uchun bitta jumla', () => {
    const olchangan = ozHolati({ externalId: 9, kuzatuvda: true, topildi: true, title: 'S', kunlar: [kun('2026-09-29', { zaxira: 12, sotildi: 3 }), kun('2026-09-30', { zaxira: 9, sotildi: 3 })] }, 9, '2026-09');
    const sotuvsiz = ozHolati({ externalId: 8, kuzatuvda: true, topildi: true, title: 'T', kunlar: [kun('2026-09-30', { zaxira: 9, sotildi: 0 })] }, 8, '2026-09');
    const r = keyingiOyRejasi([
      { title: 'A', ozId: null, oz: null, raqobatchi: null },
      { title: 'B', ozId: 1, oz: ozHolati(null, 1, '2026-09'), raqobatchi: null },
      { title: 'C', ozId: 8, oz: sotuvsiz, raqobatchi: { productId: 3, sana: '2026-09-30', narx: 90_000, oldingiNarx: null, tushdiFoiz: null } },
      { title: 'D', ozId: 9, oz: olchangan, raqobatchi: null },
    ]);
    expect(r[0]).toMatch(/^«A»: kartochka havolasi yoʻq/);
    expect(r[1]).toMatch(/^«B»: kuzatuv endi boshlandi/);
    expect(r[2]).toBe('«C»: oxirgi 1 oʻlchangan kunda sotuv qayd etilmadi — narxingiz 100 000 soʻm, raqobatchi 90 000 soʻm; birinchi surat va nomni tekshiring.');
    expect(r[3]).toMatch(/^«D»: kuniga ~3 dona, zaxira 3 kunga yetadi/);
  });
  it('zaxira tugagan yoki oʻlchanmagan — "0 kunga yetadi" / "zaxira — kunga" yozilmaydi', () => {
    const tugadi = ozHolati({ externalId: 9, kuzatuvda: true, topildi: true, title: 'E', kunlar: [kun('2026-09-29', { zaxira: 6, sotildi: 3 }), kun('2026-09-30', { zaxira: 0, sotildi: 6 })] }, 9, '2026-09');
    expect(tugadi.zaxiraKun).toBe(0);
    const r = keyingiOyRejasi([
      { title: 'E', ozId: 9, oz: tugadi, raqobatchi: null },
      { title: 'F', ozId: 9, oz: { ...tugadi, zaxira: null, zaxiraKun: null }, raqobatchi: null },
    ]);
    expect(r[0]).toMatch(/^«E»: kuniga ~4\.5 dona, zaxira bir kunga ham yetmaydi/);
    expect(r[1]).toMatch(/^«F»: kuniga ~4\.5 dona; zaxira oʻlchanmagan/);
    expect(r.join(' ')).not.toMatch(/0 kunga|— kunga/);
  });
});
