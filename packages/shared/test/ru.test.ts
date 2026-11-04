/**
 * Rus tili — javob tugmalari (nazoratchi, 2026-11-04, 4-taklif: «sahifa ruscha boʻlsa — hammasi
 * ruscha»). Ssenariyga yangi tugma qoʻshilsa va lugʻatda ruschasi boʻlmasa — shu test yiqiladi:
 * rus sahifasida yana oʻzbekcha tugma chiqib qolmasin.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ruschaVariantlar, variantRu, VARIANT_RU } from '../src/ru.js';
import { SAVDO_SOHALARI } from '../src/soha.js';
import { SHAHARLAR } from '../src/savollar.js';

const SSENARIY = readFileSync(new URL('../src/ssenariy.ts', import.meta.url), 'utf-8');

describe('rus tili: javob tugmalari', () => {
  it('ssenariydagi har bir tugma nomi (`nom: \'…\'`) lugʻatda bor — qadam nomlaridan tashqari', () => {
    const nomlar = [...SSENARIY.matchAll(/\bnom: '([^']+)'/gu)].map((m) => m[1]!);
    expect(nomlar.length).toBeGreaterThan(80);
    const qadamlar = [...SSENARIY.matchAll(/\{ n: \d+, nom: '([^']+)'/gu)].map((m) => m[1]!);
    const yoq = nomlar.filter((n) => !qadamlar.includes(n) && variantRu(n) === undefined);
    expect(yoq).toEqual([]);
  });

  it('sohalar va shaharlar ruscha', () => {
    for (const s of SAVDO_SOHALARI) expect(VARIANT_RU[s.nom]).toBe(s.ru);
    for (const s of SHAHARLAR) expect(variantRu(s)).toMatch(/^[А-ЯЁ]/u);
  });

  it('sonli shablonlar: son oʻzicha, soʻzlar ruscha; nomaʼlum nom — tarjimasiz', () => {
    expect(variantRu('30 kunlik zaxira — 17 dona')).toBe('Запас на 30 дней — 17 шт');
    expect(variantRu('60 kunlik — 1 200 dona')).toBe('На 60 дней — 1 200 шт');
    expect(variantRu('Oldingidek — 40 dona')).toBe('Как в прошлый раз — 40 шт');
    expect(variantRu('Krossovkalar')).toBeUndefined();
    expect(variantRu('Hali bilmayman')).toBe('Пока не знаю');
  });

  it('ruschaVariantlar: ruschasi bor boʻlsa — tegilmaydi; yoʻq boʻlsa — qoʻshiladi; maʼlumot nomi — oʻzicha', () => {
    const v = ruschaVariantlar([
      { qiymat: 1, nom: 'Keyinroq' },
      { qiymat: 2, nom: 'Keyinroq', ru: 'Потом' },
      { qiymat: 3, nom: 'Krossovkalar' },
    ]);
    expect(v).toEqual([
      { qiymat: 1, nom: 'Keyinroq', ru: 'Позже' },
      { qiymat: 2, nom: 'Keyinroq', ru: 'Потом' },
      { qiymat: 3, nom: 'Krossovkalar' },
    ]);
  });
});
