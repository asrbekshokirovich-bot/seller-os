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
    expect(engKopTurkumlar(t)).toEqual([
      { id: 11931, nom: 'Termoslar', soni: 3 },
      { id: 12000, nom: 'Termokrujkalar', soni: 2 },
      { id: 900, nom: null, soni: 1 },
    ]);
    expect(engKopTurkumlar(t, 1)).toHaveLength(1);
    expect(engKopTurkumlar([])).toEqual([]);
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
