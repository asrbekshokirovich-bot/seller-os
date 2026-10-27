/**
 * «Sotuvchi koʻzoynagi» sof funksiyalari: havoladan tovar id, soʻraladigan
 * bolak, taqqoslash savati, sayt havolasi.
 */

import { describe, expect, it } from 'vitest';
import {
  BELGI_BOLAGI, TAQQOS_MAX, engKopTurkumlar, hrefdanId, minglik, qisqaSana, royxatSahifasimi, savatdanOl, savatgaQosh, soraladiganlar, somQisqa,
  taqqosManzili, turkumIdsi,
} from '../src/koz';

describe('hrefdanId', () => {
  it('haqiqiy Uzum shakllari (oʻlchangan 2026-09-29)', () => {
    expect(hrefdanId('/uz/product/futbolkalar-erkaklar-uchun-2355174')).toBe(2355174);
    expect(hrefdanId('https://uzum.uz/ru/product/termos-1978350?skuId=123')).toBe(1978350);
    expect(hrefdanId('/product/1978350')).toBe(1978350);
    expect(hrefdanId('https://www.uzum.uz/uz/product/x-5/')).toBe(5);
  });
  it('boshqa sayt, katalog, notoʻgʻri — null', () => {
    expect(hrefdanId('https://evil.example/uz/product/a-5')).toBeNull();
    expect(hrefdanId('/uz/category/termoslar-11931')).toBeNull();
    expect(hrefdanId('/uz/product/')).toBeNull();
    expect(hrefdanId('')).toBeNull();
    expect(hrefdanId(null)).toBeNull();
    expect(hrefdanId('javascript:alert(1)')).toBeNull();
  });
});

describe('soraladiganlar', () => {
  it('keshdagilar va takrorlar tashlanadi, bolak chegarasi', () => {
    expect(soraladiganlar([1, 2, 2, 3], (id) => id === 2)).toEqual([1, 3]);
    const kop = Array.from({ length: 250 }, (_, i) => i + 1);
    expect(soraladiganlar(kop, () => false)).toHaveLength(BELGI_BOLAGI);
  });
});

describe('taqqoslash savati', () => {
  it('qoʻshadi, takrorlamaydi, toʻlsa — toldi (eskisi chiqmaydi)', () => {
    let s = savatgaQosh([], { id: 1, nom: 'A' }).savat;
    s = savatgaQosh(s, { id: 1, nom: 'A' }).savat;
    expect(s).toEqual([{ id: 1, nom: 'A' }]);
    for (let i = 2; i <= TAQQOS_MAX; i++) s = savatgaQosh(s, { id: i, nom: String(i) }).savat;
    const r = savatgaQosh(s, { id: 99, nom: 'X' });
    expect(r.toldi).toBe(true);
    expect(r.savat.map((x) => x.id)).toEqual([1, 2, 3, 4, 5]);
    expect(savatdanOl(r.savat, 3).map((x) => x.id)).toEqual([1, 2, 4, 5]);
  });
});

describe('taqqosManzili', () => {
  it('token hash da (serverga ketmaydi)', () => {
    expect(taqqosManzili('https://zumsavdo.vercel.app', [1, 2], 'abc.def_123-xyz0'))
      .toBe('https://zumsavdo.vercel.app/taqqos?ids=1,2#sessiya=abc.def_123-xyz0&kengaytma=1');
    expect(taqqosManzili('https://zumsavdo.vercel.app', [7], null)).toBe('https://zumsavdo.vercel.app/taqqos?ids=7');
  });
});

describe('qisqaSana', () => {
  it('YYYY-MM-DD → DD.MM', () => {
    expect(qisqaSana('2026-10-20')).toBe('20.10');
    expect(qisqaSana(null)).toBeNull();
  });
});

describe('bozor paneli: turkum va sahifa (0.4.0)', () => {
  it('turkumIdsi — Uzum turkum manzili (oʻlchangan 2026-10-21)', () => {
    expect(turkumIdsi('/uz/category/termoslar-11931')).toBe(11931);
    expect(turkumIdsi('/ru/category/termosy-11931/')).toBe(11931);
    expect(turkumIdsi('/category/11931')).toBe(11931);
    expect(turkumIdsi('/uz/product/termos-1978350')).toBeNull();
    expect(turkumIdsi('/uz/search')).toBeNull();
    expect(turkumIdsi('/uz/category/')).toBeNull();
  });

  it('royxatSahifasimi — turkum va qidiruv, tovar sahifasi emas', () => {
    expect(royxatSahifasimi('/uz/category/termoslar-11931')).toBe(true);
    expect(royxatSahifasimi('/uz/search')).toBe(true);
    expect(royxatSahifasimi('/uz/product/termos-1978350')).toBe(false);
    expect(royxatSahifasimi('/uz/')).toBe(false);
  });

  it('engKopTurkumlar — koʻpidan ozigacha, nomi bilan, turkumsiz tovar sanalmaydi', () => {
    const t = [
      { kategoriya: 11931, kategoriyaNomi: 'Termoslar' }, { kategoriya: 11931 }, { kategoriya: 11931, kategoriyaNomi: 'Termoslar' },
      { kategoriya: 12000, kategoriyaNomi: 'Termokrujkalar' }, { kategoriya: 12000 },
      { kategoriya: 900 }, { kategoriya: null }, {}, { kategoriya: 0 },
    ];
    expect(engKopTurkumlar(t).map(({ id, nom, soni, yorliq }) => ({ id, nom, soni, yorliq }))).toEqual([
      { id: 11931, nom: 'Termoslar', soni: 3, yorliq: 'Termoslar' },
      { id: 12000, nom: 'Termokrujkalar', soni: 2, yorliq: 'Termokrujkalar' },
      { id: 900, nom: null, soni: 1, yorliq: 'Turkum 900' },
    ]);
    expect(engKopTurkumlar(t, 1)).toHaveLength(1);
    expect(engKopTurkumlar([])).toEqual([]);
  });

  it('bir xil nomli turkumlar — sahifadagi tovar nomlarining asosiy soʻzi bilan (jonli «Shimlar», 2026-10-27)', () => {
    const q = (kategoriya: number, nom: string) => ({ kategoriya, kategoriyaNomi: 'Shimlar', nom });
    const t = [
      q(13700, 'Qizlar shimi Playowo, choʻntakli, keng bichim'),
      q(13700, 'Qizlar uchun klyosh shimlar, qulay kundalik'),
      q(13700, 'Qizlar uchun maktab shimi, kuzgi qora palazzo'),
      q(10663, 'Ayollar uchun kargo shimlar'),
      q(10663, 'Ayollar shimi, keng, yozgi'),
      { kategoriya: 900, kategoriyaNomi: 'Losinalar va legginslar', nom: 'Qizlar uchun losinalar' },
    ];
    const r = engKopTurkumlar(t);
    expect(r.map((x) => x.yorliq)).toEqual(['Shimlar (Qizlar)', 'Shimlar (Ayollar)', 'Losinalar va legginslar']);
    expect(r[0]!.misollar).toEqual(['Qizlar shimi Playowo, choʻntakli, keng bichim', 'Qizlar uchun klyosh shimlar, qulay kundalik']);
  });

  it('ajratuvchi soʻz nomning istalgan joyida (jonli «shim»: erkaklar shimlari har xil soʻzdan boshlanadi)', () => {
    const q = (kategoriya: number, nom: string) => ({ kategoriya, kategoriyaNomi: 'Shimlar', nom });
    const r = engKopTurkumlar([
      q(1, 'Zamonaviy va qulay yozgi shimlar erkaklar uchun'),
      q(1, 'TERRA PRO erkaklar chinos shimi'),
      q(1, 'Klassik shim, erkaklar, qora'),
      q(2, 'Ayollar sport shimi, katta oʻlchamli'),
      q(2, 'Ayollar klassik shimi'),
    ]);
    expect(r.map((x) => x.yorliq)).toEqual(['Shimlar (Erkaklar)', 'Shimlar (Ayollar)']);
  });

  it('turkum nomining oʻzagi ajratuvchi emas («Shimlar (Shim)» boʻlmasin)', () => {
    const q = (kategoriya: number, nom: string) => ({ kategoriya, kategoriyaNomi: 'Shimlar', nom });
    const r = engKopTurkumlar([
      q(1, 'Erkaklar shimi, klassik'), q(1, 'Erkaklar chinos'),
      q(2, 'Shim keng, yozgi'), q(2, 'Shim paxta'), q(2, 'Shimi uzun'),
    ]);
    // Ikkinchisida «shim»/«shimi» dan boshqa umumiy soʻz yoʻq — u soʻzsiz yagona, oddiy nomi bilan.
    expect(r.map((x) => x.yorliq)).toEqual(['Shimlar', 'Shimlar (Erkaklar)']);
  });

  it('ajratuvchi soʻz topilmasa — tartib raqami; bittasi soʻzsiz qolsa — oddiy nomi', () => {
    const q = (kategoriya: number, nom: string) => ({ kategoriya, kategoriyaNomi: 'Futbolkalar', nom });
    // Ikkalasida ham «Erkaklar» — soʻz ajratmaydi.
    expect(engKopTurkumlar([q(1, 'Erkaklar futbolkasi'), q(1, 'Erkaklar polo'), q(2, 'Erkaklar sport')]).map((x) => x.yorliq))
      .toEqual(['Futbolkalar 1', 'Futbolkalar 2']);
    // Bittasida nom yoʻq (belgisiz kartochka): u soʻzsiz yagona — oddiy nomi bilan, ikkinchisi ajraladi.
    expect(engKopTurkumlar([q(1, 'Ayollar futbolkasi'), q(1, 'Ayollar top'), { kategoriya: 2, kategoriyaNomi: 'Futbolkalar' }]).map((x) => x.yorliq))
      .toEqual(['Futbolkalar (Ayollar)', 'Futbolkalar']);
  });

  it('somQisqa va minglik', () => {
    expect(somQisqa(745_595_910)).toBe('745,6 mln');
    expect(somQisqa(1_234_567_890)).toBe('1,2 mlrd');
    expect(somQisqa(950_000)).toBe('950 ming');
    expect(somQisqa(12_000_000)).toBe('12 mln');
    expect(minglik(5689)).toBe('5 689');
    expect(minglik(17300.4)).toBe('17 300');
  });
});
