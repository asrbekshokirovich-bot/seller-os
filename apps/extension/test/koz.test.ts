/**
 * «Sotuvchi koʻzoynagi» sof funksiyalari: havoladan tovar id, soʻraladigan
 * bolak, taqqoslash savati, sayt havolasi.
 */

import { describe, expect, it } from 'vitest';
import { BELGI_BOLAGI, TAQQOS_MAX, hrefdanId, qisqaSana, savatdanOl, savatgaQosh, soraladiganlar, taqqosManzili } from '../src/koz';

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
