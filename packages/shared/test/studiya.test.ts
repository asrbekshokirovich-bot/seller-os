/**
 * 9-qadam sof funksiyalari (`src/studiya.ts`): surat talablari faktdan,
 * alicdn toʻliq oʻlcham manzili va takror kaliti, 1688 taklif tafsiloti
 * (galereya) soʻrovi va javobini oʻqish, nomzodlar tartibi, Worker imzosi.
 */

import { describe, expect, it } from 'vitest';
import {
  aslRasmManzili, chiqishTalabgaMosmi, galereyaRasmlari, rasmKaliti, saytNomi, STUDIYA_CHIQISH, STUDIYA_NOMZOD_MAX,
  studiyaImzosi, studiyaManzili, studiyaNomzodlari, suratTalablari, tafsilotByudjetiUsd, tafsilotKeshKaliti,
  tafsilotlarniOqi, tafsilotSorovi, taqiqlanganmi, TAFSILOT_YURISH_MAX,
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
  });
  it('rasmKaliti: bitta 1688 fayli turli yoʻl bilan kelsa — bitta kalit; boshqa sayt — toʻliq manzil', () => {
    const a = rasmKaliti('https://cbu01.alicdn.com/img/ibank/O1CN01DCGQ_!!22-0-cib.jpg_220x220.jpg');
    expect(a).toBe('alicdn:o1cn01dcgq_!!22-0-cib.jpg');
    expect(rasmKaliti('https://cbu01.alicdn.com/O1CN01DCGQ_!!22-0-cib.jpg')).toBe(a);
    expect(rasmKaliti('https://shop.example/a.jpg?x=1')).toBe('https://shop.example/a.jpg?x=1');
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

describe('1688 taklif tafsiloti (galereya)', () => {
  it('soʻrov: 5-qadam aktori, offerIds rejimi, takrorsiz, faqat raqam, byudjet ≥ 0.04', () => {
    const s = tafsilotSorovi('K', ['999873037622', ' 864681386790 ', '999873037622', 'abc', '12']);
    expect(s.url).toBe('https://api.apify.com/v2/acts/crawleast~1688-image-search-scraper/runs?timeout=300');
    expect(s.init.headers.Authorization).toBe('Bearer K');
    expect(JSON.parse(s.init.body!)).toEqual({ offerIds: ['999873037622', '864681386790'], maxTotalChargeUsd: 0.04 });
    expect(tafsilotByudjetiUsd(1)).toBe(0.04);
    expect(tafsilotByudjetiUsd(20)).toBe(0.07);
    const kop = tafsilotSorovi('K', Array.from({ length: 30 }, (_, i) => String(100000 + i)));
    expect(JSON.parse(kop.init.body!).offerIds).toHaveLength(TAFSILOT_YURISH_MAX);
    expect(tafsilotKeshKaliti('999873037622')).toBe('1688-tafsilot:999873037622');
  });
  it('oʻqish: oxirgi offerIdsResult qatori; galereya toʻliq oʻlchamda, takrorsiz; video; sifat', () => {
    const r = tafsilotlarniOqi([
      { type: 'offerIdsResult', requested: 1, delivered: 0, products: [] },
      { type: 'offerIdsResult', requested: 2, delivered: 2, products: [
        { offerId: '999873037622', dataQuality: 'full', videoUrl: 'https://cloud.video.taobao.com/v.mp4', images: [
          'https://cbu01.alicdn.com/img/ibank/O1CN01aa_!!1-0-cib.jpg', 'https://cbu01.alicdn.com/img/ibank/O1CN01aa_!!1-0-cib.jpg_220x220.jpg',
          '//cbu01.alicdn.com/img/ibank/O1CN01bb_!!1-0-cib.jpg', 'javascript:alert(1)', 7, 'https://images.uzum.uz/x.jpg',
        ] },
        { offerId: 864681386790, dataQuality: 'minimal', images: null, videoUrl: null },
        { title: 'offerId yoʻq' },
      ] },
    ]);
    expect(r.xato).toBeNull();
    expect(r.tafsilotlar).toEqual([
      { offerId: '999873037622', sifat: 'full', video: 'https://cloud.video.taobao.com/v.mp4',
        rasmlar: ['https://cbu01.alicdn.com/img/ibank/O1CN01aa_!!1-0-cib.jpg', 'https://cbu01.alicdn.com/img/ibank/O1CN01bb_!!1-0-cib.jpg'] },
      { offerId: '864681386790', sifat: 'minimal', video: null, rasmlar: [] },
    ]);
  });
  it('xato: roʻyxat emas; tafsilot qatori yoʻq', () => {
    expect(tafsilotlarniOqi({ error: 'x' }).xato).toBe('provayder javobi roʻyxat emas');
    expect(tafsilotlarniOqi([{ type: 'imageResult' }]).xato).toBe('provayder tafsilot qatorini bermadi');
    expect(galereyaRasmlari(Array.from({ length: 20 }, (_, i) => `https://cbu01.alicdn.com/O1CN${i}.jpg`))).toHaveLength(12);
  });
});

describe('studiyaNomzodlari', () => {
  const t = (n: number) => ({ rasmUrl: `https://cbu01.alicdn.com/o${n}.jpg`, title: `T${n}` });
  const g = (n: number) => `https://cbu01.alicdn.com/img/ibank/g${n}.jpg`;

  it('tartib: tanlov → oʻsha taklif galereyasi → oʻxshash takliflar; shift 8', () => {
    const r = studiyaNomzodlari({ tanlov: t(0), galereya: [g(1), g(2), g(3)], oxshash: [t(1), t(2), t(3), t(4), t(5), t(6)] });
    expect(r).toHaveLength(STUDIYA_NOMZOD_MAX);
    expect(r.map((x) => [x.manba, x.asl.replace(/^.*\//, '')])).toEqual([
      ['1688-tanlov', 'o0.jpg'], ['1688-galereya', 'g1.jpg'], ['1688-galereya', 'g2.jpg'], ['1688-galereya', 'g3.jpg'],
      ['1688-oxshash', 'o1.jpg'], ['1688-oxshash', 'o2.jpg'], ['1688-oxshash', 'o3.jpg'], ['1688-oxshash', 'o4.jpg'],
    ]);
    expect(r[0]).toMatchObject({ sayt: '1688', nom: 'T0' });
    expect(r[1]!.nom).toBe('T0');
  });
  it('galereyadagi tanlov surati (boshqa yoʻl bilan) takrorlanmaydi; Uzum surati olinmaydi; boʻsh — boʻsh', () => {
    const r = studiyaNomzodlari({
      tanlov: { rasmUrl: 'https://cbu01.alicdn.com/O1CN01aa_!!1-0-cib.jpg_220x220.jpg', title: null },
      galereya: ['https://cbu01.alicdn.com/img/ibank/O1CN01aa_!!1-0-cib.jpg', 'https://images.uzum.uz/x.jpg', g(9)],
      oxshash: [{ rasmUrl: null, title: null }],
    });
    expect(r.map((x) => [x.manba, x.asl])).toEqual([
      ['1688-tanlov', 'https://cbu01.alicdn.com/O1CN01aa_!!1-0-cib.jpg'],
      ['1688-galereya', 'https://cbu01.alicdn.com/img/ibank/g9.jpg'],
    ]);
    expect(studiyaNomzodlari({ tanlov: null, galereya: [], oxshash: [] })).toEqual([]);
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
