/**
 * 1688 nomlari — oʻzbekcha (nazoratchi, 2026-11-04, 7-taklif). Model javobi tekshiriladi: soni,
 * uzunligi, xitoycha harf va asl nomda yoʻq raqam — oʻtmagan nom tashlanadi (xitoychasi qoladi).
 */

import { describe, expect, it } from 'vitest';
import { xitoyNomlariniOqi, xitoyNomMatni } from '../src/xitoy-nom.js';

const ASL = ['2026新款男士运动鞋 38-46码', '女士手提包 大容量', '儿童玩具车'];

describe('xitoyNomlariniOqi', () => {
  it('toʻgʻri javob — tozalangan nomlar, tartibi bilan; apostrof — oʻzbekcha', () => {
    const j = JSON.stringify({ nomlar: ['Erkaklar sport krossovkasi, 38-46', ' «Ayollar qoʻl sumkasi, katta» ', "Bolalar o'yinchoq mashinasi"] });
    expect(xitoyNomlariniOqi(j, ASL)).toEqual(['Erkaklar sport krossovkasi, 38-46', 'Ayollar qoʻl sumkasi, katta', 'Bolalar oʻyinchoq mashinasi']);
  });

  it('asl nomda yoʻq raqam, xitoycha harf, juda qisqa yoki uzun nom — tashlanadi (null), qolganlari qoladi', () => {
    const j = JSON.stringify({ nomlar: ['Krossovka 2027 yangi', 'Sumka 女士', 'a'.repeat(81)] });
    expect(xitoyNomlariniOqi(j, ASL)).toEqual([null, null, null]);
    expect(xitoyNomlariniOqi(JSON.stringify({ nomlar: ['Krossovka', 'S', 'Mashina'] }), ASL)).toEqual(['Krossovka', null, 'Mashina']);
    // Asl nomdagi raqam — oʻtadi.
    expect(xitoyNomlariniOqi(JSON.stringify({ nomlar: ['Krossovka 2026', 'Sumka', 'Mashina'] }), ASL)?.[0]).toBe('Krossovka 2026');
  });

  it('soni boshqa, JSON buzuq yoki nomlar roʻyxat emas — hammasi null', () => {
    expect(xitoyNomlariniOqi(JSON.stringify({ nomlar: ['Bitta'] }), ASL)).toBeNull();
    expect(xitoyNomlariniOqi('{nomlar: [', ASL)).toBeNull();
    expect(xitoyNomlariniOqi(JSON.stringify({ nomlar: 'Krossovka' }), ASL)).toBeNull();
    // ```json … ``` oʻrami — oʻqiladi.
    expect(xitoyNomlariniOqi('```json\n{"nomlar": ["A1x", "Sumka", "Mashina"]}\n```', ['A1x', 'b', 'c'])).toEqual(['A1x', 'Sumka', 'Mashina']);
  });

  it('modelga matn — raqamlangan asl nomlar va soni', () => {
    expect(xitoyNomMatni(['a', 'b'])).toBe('NOMLAR (2 ta):\n1. a\n2. b');
  });
});
