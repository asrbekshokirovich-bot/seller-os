/**
 * Erkin savollarga tayyor javoblar (LLM boʻlmasa ham).
 *
 * NEGA BU TESTLAR BOR. Nazoratchi (2026-10-05): "chatga mijoz har xil narsa
 * yozishi mumkin, savol soʻrashi mumkin". Erkin xabarga ilgari faqat
 * "hozir aniq javob bera olmayman" deyilardi. Endi koʻp soʻraladigan
 * savollarga koddagi HAQIQIY maʼlumotdan javob beriladi (tarif narxlari,
 * qadamlar roʻyxati) — toʻqilmaydi. Mos kelmasa — `null` (taxmin yoʻq).
 */

import { describe, expect, it } from 'vitest';
import { erkinBilimi, tayyorJavob } from '../src/erkin';
import { TARIF_NARXI } from '../src/tolov';
import { minglik } from '../src/fakt';

describe('tayyorJavob', () => {
  it('xizmat haqida', () => {
    expect(tayyorJavob('bu nima?')?.uz).toMatch(/ZumSavdo/);
    expect(tayyorJavob('Qanday ishlaydi')?.uz).toMatch(/12 qadam/);
    expect(tayyorJavob('что это за сервис?')?.ru).toMatch(/ZumSavdo/);
  });

  it('tarif va toʻlov — narxlar koddan', () => {
    const j = tayyorJavob('obuna qancha turadi?');
    expect(j?.uz).toContain(minglik(TARIF_NARXI.pro!));
    // Bitta reja (nazoratchi, 2026-10-14): 1–5 bepul, 6-qadamdan obuna; Biznes sotilmaydi.
    expect(j?.uz).toMatch(/^1–5-qadamlar \(yoʻnalish, tovar, tannarx, Xitoydan topish\) — bepul\. 6-qadamdan/);
    expect(j?.uz).not.toMatch(/Biznes|ulanmagan/);
    expect(tayyorJavob("to'lov qanday qilinadi?")?.uz).toMatch(/Payme/);
    expect(tayyorJavob('сколько стоит подписка?')?.ru).toContain(minglik(TARIF_NARXI.pro!));
  });

  it('qadamlar, 1688, kafolat, kirish, aloqa', () => {
    const q = tayyorJavob('qadamlar nechta?');
    expect(q?.uz).toMatch(/12/);
    expect(q?.uz).toMatch(/Tanishuv/);
    expect(tayyorJavob('1688 nima?')?.uz).toMatch(/1688/);
    expect(tayyorJavob('Xitoydan qanday topasiz?')?.uz).toMatch(/1688/);
    expect(tayyorJavob('foyda kafolatmi?')?.uz).toMatch(/kafolatlanmaydi/);
    expect(tayyorJavob('qanday royxatdan otaman?')?.uz).toMatch(/brauzer/);
    expect(tayyorJavob('operator bilan gaplashsam boʻladimi?')?.uz).toMatch(/chat/);
  });

  it('boshqa mavzu (soliq, logistika, bank, yuk kelishi) — tarif / kafolat / 1688 javobi BERILMAYDI', () => {
    // Tekshiruv (2026-10-05): "soliq toʻlovi", "pullikmi", "bepulmi" ZumSavdo
    // tarifiga, "daromad soligʻi" kafolatga, "Xitoydan qachon keladi" 1688
    // qidiruviga burilib ketardi.
    for (const t of ['soliq toʻlovi qachon?', 'Uzum logistikasi pullikmi?', 'bank hisobini ochish bepulmi?',
      'daromad soligʻi qancha?', 'Xitoydan qachon keladi?', 'налог на прибыль какой?']) {
      expect(tayyorJavob(t), t).toBeNull();
    }
    // ZumSavdo mavzusi (obuna) boshqa soʻz bilan kelsa ham tanilaveradi.
    expect(tayyorJavob('obunani bank kartasi bilan toʻlasa boʻladimi?')?.uz).toMatch(/Payme/);
  });

  it('«Siz odammisiz?» — rostini aytadi; "odam bilan gaplashsam" — aloqa; "robot changyutgich" — bu emas (2026-10-14)', () => {
    for (const t of ['Siz odammisiz yoki robot?', 'robotmisiz?', 'siz botmisiz', 'sunʼiy intellektmisiz?']) {
      expect(tayyorJavob(t)?.uz, t).toMatch(/^Men ZumSavdo dasturining yordamchisiman — odam emasman/);
    }
    expect(tayyorJavob('Вы бот или человек?')?.ru).toMatch(/^Я помощник программы ZumSavdo — не человек/);
    expect(tayyorJavob('Odam bilan gaplashsam boʻladimi?')?.uz).toMatch(/chatda/);
    expect(tayyorJavob('Robot changyutgich sotsam boʻladimi?')?.uz ?? '').not.toMatch(/odam emasman/);
  });

  it('«1688 nima?» — avval taʼrif, keyin 5-qadam (jonli oʻlchov, 2026-10-14)', () => {
    expect(tayyorJavob('1688 nima?')?.uz).toMatch(/^1688 — Xitoyning ulgurji savdo sayti: zavod va ulgurji sotuvchilar narxlari\. 5-qadamda/);
    expect(tayyorJavob('что такое 1688?')?.ru).toMatch(/^1688 — китайский оптовый сайт/);
  });

  it('tovar narxi — tarif EMAS; salom va boshqa — null', () => {
    expect(tayyorJavob('tovar narxi qancha?')).toBeNull();
    expect(tayyorJavob('salom')).toBeNull();
    expect(tayyorJavob('asdfgh')).toBeNull();
  });

  it('LLM bilimida narxlar va qadamlar bor (raqam tekshiruvi ularni ruxsat qiladi)', () => {
    expect(erkinBilimi()).toContain(minglik(TARIF_NARXI.pro!));
    expect(erkinBilimi()).toMatch(/Hisobot/);
  });

  it('tarif cheklovi OʻCHIQ — «hozir hamma qadamlar bepul», «1–2-qadam» deyilmaydi (2026-10-13)', () => {
    expect(tayyorJavob('Bu bepulmi?', false)!.uz).toMatch(/^Hozir hamma qadamlar bepul ochiq/);
    expect(tayyorJavob('Это бесплатно?', false)!.ru).toMatch(/^Сейчас все шаги открыты бесплатно/);
    expect(tayyorJavob('Bu bepulmi?', false)!.uz).not.toMatch(/1–2-qadam/);
    expect(erkinBilimi(false)).toMatch(/Hozir hamma qadamlar bepul ochiq/);
    expect(erkinBilimi(false)).not.toMatch(/1–2-qadam/);
    // Toʻlov ulangach nima boʻlishi ham rost aytiladi — 6-qadamdan obuna.
    expect(tayyorJavob('Bu bepulmi?', false)!.uz).toMatch(/6-qadamdan obuna — 149 000 soʻm\/oy/);
    // Cheklov yoqilgan yoki nomaʼlum — 1–5 bepul, 6-qadamdan obuna.
    expect(tayyorJavob('Bu bepulmi?', true)!.uz).toMatch(/^1–5-qadamlar/);
    expect(tayyorJavob('Bu bepulmi?')!.uz).toMatch(/^1–5-qadamlar/);
  });
});
