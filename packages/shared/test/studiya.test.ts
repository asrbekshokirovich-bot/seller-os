/**
 * 9-qadam sof funksiyalari (`src/studiya.ts`): surat talablari faktdan,
 * alicdn toʻliq oʻlcham manzili, Google Lens javobini oʻqish (Uzum saytidan,
 * kichik va takror suratlar tashlanadi), nomzodlar tartibi, Worker imzosi.
 */

import { describe, expect, it } from 'vitest';
import {
  aslRasmManzili, chiqishTalabgaMosmi, lensBoshlashSorovi, lensKeshKaliti, lensNatijalariniOqi, saytNomi,
  STUDIYA_CHIQISH, STUDIYA_NOMZOD_MAX, studiyaImzosi, studiyaManzili, studiyaNomzodlari, suratTalablari,
  taqiqlanganmi, type SuratNomzodi,
} from '../src/index.js';

const F = (qiymat: unknown) => ({ qiymat, birlik: null, manba: 'seller.uzum.uz/manual/uz/5.product-creation (5.7)', olchandi: '2026-09-29', izoh: null });

describe('suratTalablari', () => {
  it('toʻliq faktlar — raqamlar, roʻyxatlar, manba; yetishmaydi boʻsh; chiqish 1200×1600 talabga mos', () => {
    const t = suratTalablari({
      'uzum.surat.format': F('JPEG, JPG, WebP, PNG'), 'uzum.surat.min_eni': F(750), 'uzum.surat.min_boyi': F(1000),
      'uzum.surat.nisbat': F('vertikal 3:4'), 'uzum.surat.max_mb': F(5), 'uzum.surat.tovar_ulush_min': F(50),
      'uzum.surat.qoidalar': F(['a', ' b ', '', 7]), 'uzum.surat.qollanma.url': F('https://seller.uzum.uz/manual/uz/5.product-creation/'),
      'uzum.kartochka.qoidalar': F(['k']), 'uzum.kartochka.qollanma.url': F('javascript:alert(1)'),
    });
    expect(t).toMatchObject({ format: 'JPEG, JPG, WebP, PNG', minEni: 750, minBoyi: 1000, nisbat: 'vertikal 3:4', maxMb: 5, tovarUlushMin: 50 });
    expect(t.qoidalar).toEqual(['a', 'b']);
    expect(t.kartochkaQoidalari).toEqual(['k']);
    expect(t.kartochkaQollanmaUrl).toBeNull();
    expect(t.manba).toMatch(/5\.7/);
    expect(t.yetishmaydi).toEqual([]);
    expect(chiqishTalabgaMosmi(t)).toBe(true);
    expect(STUDIYA_CHIQISH.eni * 4).toBe(STUDIYA_CHIQISH.boyi * 3);
  });
  it('fakt yoʻq — null va "yetishmaydi", nol yoʻq; mosligi nomaʼlum', () => {
    const t = suratTalablari({});
    expect([t.minEni, t.minBoyi, t.maxMb, t.nisbat]).toEqual([null, null, null, null]);
    expect(t.yetishmaydi).toEqual(['surat ruxsati', 'surat nisbati', 'surat hajmi', 'surat qoidalari', 'kartochka qoidalari']);
    expect(chiqishTalabgaMosmi(t)).toBeNull();
    expect(chiqishTalabgaMosmi({ ...t, minEni: 2000, minBoyi: 1000 })).toBe(false);
  });
});

describe('manzillar', () => {
  it('aslRasmManzili: alicdn eskiz qoʻshimchalari olinadi, boshqalar tegmaydi', () => {
    expect(aslRasmManzili('https://cbu01.alicdn.com/img/ibank/O1CN01x_!!22-0-cib.jpg_220x220.jpg')).toBe('https://cbu01.alicdn.com/img/ibank/O1CN01x_!!22-0-cib.jpg');
    expect(aslRasmManzili('https://cbu01.alicdn.com/img/a.jpg_.webp')).toBe('https://cbu01.alicdn.com/img/a.jpg');
    expect(aslRasmManzili('https://cbu01.alicdn.com/img/a_sum.jpg')).toBe('https://cbu01.alicdn.com/img/a.jpg');
    expect(aslRasmManzili('https://example.com/a.jpg_220x220.jpg')).toBe('https://example.com/a.jpg_220x220.jpg');
    expect(lensKeshKaliti('https://cbu01.alicdn.com/img/a.jpg_220x220.jpg')).toBe('lens:https://cbu01.alicdn.com/img/a.jpg');
  });
  it('saytNomi / taqiqlanganmi: uzum.uz va uning subdomenlari taqiqlangan', () => {
    expect(saytNomi('https://www.Amazon.com/x')).toBe('amazon.com');
    expect(saytNomi('buzuq')).toBeNull();
    expect(taqiqlanganmi('https://uzum.uz/uz/product/x')).toBe(true);
    expect(taqiqlanganmi('https://images.uzum.uz/a.jpg')).toBe(true);
    expect(taqiqlanganmi('https://notuzum.uz/a.jpg')).toBe(false);
    expect(taqiqlanganmi(null)).toBe(false);
  });
});

describe('Google Lens', () => {
  it('soʻrov: aktor, xarajat shifti, vaqt, kirish', () => {
    const s = lensBoshlashSorovi('K', 'https://cbu01.alicdn.com/a.jpg');
    expect(s.url).toBe('https://api.apify.com/v2/acts/johnvc~google-lens-api/runs?maxTotalChargeUsd=0.02&timeout=180');
    expect(s.init.headers.Authorization).toBe('Bearer K');
    expect(JSON.parse(s.init.body!)).toEqual({ image_url: 'https://cbu01.alicdn.com/a.jpg', search_type: 'visual_matches', max_results: 20 });
  });
  it('oʻqish: yaxshi qator olinadi; manzilsiz, Uzum, kichik, takror tashlanadi; oʻlchami yoʻq qator olinadi', () => {
    const r = lensNatijalariniOqi([
      { title: 'Bag', source: 'Amazon.com', url: 'https://amazon.com/p', image: 'https://m.media-amazon.com/a.jpg', imageWidth: 1500, imageHeight: 1500 },
      { title: 'Bag', source: 'Amazon.com', url: 'https://amazon.com/q', image: 'https://m.media-amazon.com/a.jpg', imageWidth: '1500', imageHeight: '1500' },
      { title: 'Uzum', url: 'https://uzum.uz/uz/product/x-1', image: 'https://cdn.example/u.jpg', imageWidth: 1200, imageHeight: 1600 },
      { title: 'Kichik', url: 'https://x.com', image: 'https://x.com/k.jpg', imageWidth: 800, imageHeight: 500 },
      { title: 'Rasmsiz', url: 'https://x.com' },
      { title: 'Oʻlchamsiz', url: 'https://shop.example/p', image: 'https://shop.example/o.jpg' },
      null,
    ]);
    expect(r.xato).toBeNull();
    expect(r.tashlandi).toBe(5);
    expect(r.nomzodlar).toEqual([
      { manba: 'internet', asl: 'https://m.media-amazon.com/a.jpg', sayt: 'Amazon.com', eni: 1500, boyi: 1500, nom: 'Bag' },
      { manba: 'internet', asl: 'https://shop.example/o.jpg', sayt: 'shop.example', eni: null, boyi: null, nom: 'Oʻlchamsiz' },
    ]);
  });
  it('xato qatori — xato matni; roʻyxat emas — xato; boʻsh — natijasiz (xato emas)', () => {
    expect(lensNatijalariniOqi([{ resultType: 'error', message: 'quota' }]).xato).toBe('quota');
    expect(lensNatijalariniOqi({ error: 'x' }).xato).toBe('provayder javobi roʻyxat emas');
    expect(lensNatijalariniOqi([])).toEqual({ nomzodlar: [], tashlandi: 0, xato: null });
  });
});

describe('studiyaNomzodlari', () => {
  const i = (n: number): SuratNomzodi => ({ manba: 'internet', asl: `https://shop.example/${n}.jpg`, sayt: 'shop.example', eni: 1000, boyi: 1000, nom: null });
  const t = (n: number) => ({ rasmUrl: `https://cbu01.alicdn.com/o${n}.jpg`, title: `T${n}` });

  it('tartib: tanlov → internet (4) → oʻxshash (3) → qolgan internet → qolgan oʻxshash; shift 8', () => {
    const r = studiyaNomzodlari({ tanlov: t(0), oxshash: [t(1), t(2), t(3), t(4), t(5)], internet: [i(1), i(2), i(3), i(4), i(5), i(6)] });
    expect(r).toHaveLength(STUDIYA_NOMZOD_MAX);
    expect(r.map((x) => x.asl.replace(/^.*\//, ''))).toEqual(['o0.jpg', '1.jpg', '2.jpg', '3.jpg', '4.jpg', 'o1.jpg', 'o2.jpg', 'o3.jpg']);
    expect(r[0]).toMatchObject({ manba: '1688-tanlov', sayt: '1688', nom: 'T0' });
  });
  it('takror (eskiz bilan asl bir xil) va Uzum surati olinmaydi; kam boʻlsa qolgani bilan toʻladi', () => {
    const r = studiyaNomzodlari({
      tanlov: { rasmUrl: 'https://cbu01.alicdn.com/a.jpg_220x220.jpg', title: null },
      oxshash: [{ rasmUrl: 'https://cbu01.alicdn.com/a.jpg', title: null }, { rasmUrl: null, title: null }, t(9)],
      internet: [{ ...i(1), asl: 'https://images.uzum.uz/x.jpg' }],
    });
    expect(r.map((x) => [x.manba, x.asl])).toEqual([
      ['1688-tanlov', 'https://cbu01.alicdn.com/a.jpg'],
      ['1688-oxshash', 'https://cbu01.alicdn.com/o9.jpg'],
    ]);
    expect(studiyaNomzodlari({ tanlov: null, oxshash: [], internet: [] })).toEqual([]);
  });
});

describe('Worker imzosi', () => {
  it('HMAC-SHA256 hex, rejim va manba imzoga kiradi; manzil toʻgʻri kodlanadi', async () => {
    const a = await studiyaImzosi('k', 'auto', 'https://a.example/x.jpg?q=1&r=2');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await studiyaImzosi('k', 'pad', 'https://a.example/x.jpg?q=1&r=2')).not.toBe(a);
    expect(await studiyaImzosi('boshqa', 'auto', 'https://a.example/x.jpg?q=1&r=2')).not.toBe(a);
    const m = await studiyaManzili('https://w.example///', 'k', 'https://a.example/x.jpg?q=1&r=2');
    expect(m.startsWith('https://w.example/?r=auto&src=https%3A%2F%2Fa.example%2Fx.jpg%3Fq%3D1%26r%3D2&s=')).toBe(true);
    expect(new URL(m).searchParams.get('s')).toBe(a);
  });
});
