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
import { ERKIN_BILIM, tayyorJavob } from '../src/erkin';
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
    expect(j?.uz).toContain(minglik(TARIF_NARXI.biznes!));
    expect(j?.uz).toMatch(/ulanmagan/);
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

  it('tovar narxi — tarif EMAS; salom va boshqa — null', () => {
    expect(tayyorJavob('tovar narxi qancha?')).toBeNull();
    expect(tayyorJavob('salom')).toBeNull();
    expect(tayyorJavob('asdfgh')).toBeNull();
  });

  it('LLM bilimida narxlar va qadamlar bor (raqam tekshiruvi ularni ruxsat qiladi)', () => {
    expect(ERKIN_BILIM).toContain(minglik(TARIF_NARXI.pro!));
    expect(ERKIN_BILIM).toMatch(/Hisobot/);
  });
});
