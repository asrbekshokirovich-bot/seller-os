/**
 * Oʻzbek kirill yozuvi (nazoratchi, 2026-10-13: "mijoz qaysi tilda yozsa —
 * oʻsha tilda"). Ilgari har qanday kirill matn ruscha deb olinardi:
 * «Пул қачон тушади?» ga ruscha shablon chiqardi va bilim bazasi savolni
 * tanimasdi.
 */

import { describe, expect, it } from 'vitest';
import { apostrofTozala, kirillUlushi, kirilmi, lotinga, ozbekKirilmi, ruschami, tushunishUchun, yozuvi } from '../src/yozuv';

describe('yozuv — oʻzbek kirill', () => {
  it('oʻzbek kirill, rus va lotin farqlanadi', () => {
    expect(ozbekKirilmi('Пул қачон тушади?')).toBe(true);
    // ў/қ/ғ/ҳ siz ham — oʻzbekcha soʻzlar boʻyicha.
    expect(ozbekKirilmi('бу нима')).toBe(true);
    expect(ozbekKirilmi('канча туради')).toBe(true);
    expect(ruschami('Когда придут деньги?')).toBe(true);
    expect(ozbekKirilmi('Когда придут деньги?')).toBe(false);
    expect(ruschami('Сколько стоит товар?')).toBe(true);
    expect(kirilmi('pul qachon tushadi')).toBe(false);
    expect(ruschami('pul qachon tushadi')).toBe(false);
  });

  it('lotinga: harflar, «е» qoidasi, bosh harf, tutuq belgisi', () => {
    expect(lotinga('Пул қачон тушади?')).toBe('Pul qachon tushadi?');
    expect(lotinga('етти')).toBe('yetti');
    expect(lotinga('келди')).toBe('keldi');
    expect(lotinga('Ўзбекистон')).toBe('Oʻzbekiston');
    expect(lotinga('ғишт')).toBe('gʻisht');
    expect(lotinga('Шаҳар')).toBe('Shahar');
    expect(lotinga('маъно')).toBe('maʼno');
    expect(lotinga('uzum.uz 10 млн')).toBe('uzum.uz 10 mln');
  });

  it('yozuvi va kirill ulushi — javob mijoz tilidami (jonli oʻlchov, 2026-10-14)', () => {
    expect(yozuvi('Какие документы нужны?')).toBe('ru');
    expect(yozuvi('Пул қачон тушади?')).toBe('uz-kirill');
    expect(yozuvi('Pul qachon tushadi?')).toBe('uz');
    expect(kirillUlushi('Для продажи на Uzum нужен паспорт')).toBeGreaterThan(0.5);
    expect(kirillUlushi('Uzumda savdo qilish uchun YATT guvohnomasi kerak')).toBe(0);
    expect(kirillUlushi('123 — 5 250')).toBe(0);
  });

  it('apostrofTozala (11-taklif, 2026-11-04): oʻ/gʻ — ʻ, qolgani — tutuq ʼ; kirill va manzil — oʻzicha', () => {
    expect(apostrofTozala("Natijalaringizni saqlab qo'yishim uchun ma'lumot kerak")).toBe('Natijalaringizni saqlab qoʻyishim uchun maʼlumot kerak');
    expect(apostrofTozala('G‘alaba, o’zbek, Toshkent`da')).toBe('Gʻalaba, oʻzbek, Toshkentʼda');
    // Allaqachon toʻgʻri — oʻzgarmaydi; tutuq belgisi oʻ/gʻ da boʻlsa — ʻ ga.
    expect(apostrofTozala('oʻzbek maʼlumot')).toBe('oʻzbek maʼlumot');
    expect(apostrofTozala('boʼlsa')).toBe('boʻlsa');
    // Soʻz oxiri va qoʻshtirnoq oʻrnidagi apostrof — tegilmaydi.
    expect(apostrofTozala("'Ha' deb yozing")).toBe("'Ha' deb yozing");
    // Manzil ichida — tegilmaydi; kirill matn — tegilmaydi.
    expect(apostrofTozala("Bu yerda: https://uzum.uz/o'z?x=1 — o'qing")).toBe("Bu yerda: https://uzum.uz/o'z?x=1 — oʻqing");
    expect(apostrofTozala("Это д'Артаньян")).toBe("Это д'Артаньян");
    expect(apostrofTozala('')).toBe('');
  });

  it('tushunish uchun: faqat oʻzbek kirill oʻgiriladi, ruscha va lotin — oʻzicha', () => {
    expect(tushunishUchun('Бу нима?')).toBe('Bu nima?');
    expect(tushunishUchun('Что это?')).toBe('Что это?');
    expect(tushunishUchun('bu nima?')).toBe('bu nima?');
  });
});
