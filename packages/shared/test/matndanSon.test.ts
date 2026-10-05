/**
 * «Oʻzim yozaman» maydonidagi son.
 *
 * NEGA BU TESTLAR BOR. Son soʻraladigan savollarda (byudjet, miqdor,
 * marja, oy sotuvi…) maydon `type="number"` edi: brauzer harf ham, boʻsh
 * joy ham yozdirmasdi — "10 mln", "5 000 000" yozib boʻlmasdi, server
 * esa faqat toza raqamni qabul qilardi (nazoratchi, 2026-10-05: "chatga
 * faqat son yozib boʻlyapti, harf yozib boʻlmayapti"). Endi odam qanday
 * yozsa shunday oʻqiladi — lekin TAXMIN qilinmaydi: ikki son yoki son
 * yoʻq boʻlsa `null`, obunachidan aniq son soʻraladi.
 */

import { describe, expect, it } from 'vitest';
import { matndanSon } from '../src/tekshiruv';

describe('matndanSon', () => {
  it('toza va guruhlangan raqam', () => {
    expect(matndanSon('5000000')).toBe(5_000_000);
    expect(matndanSon('5 000 000')).toBe(5_000_000);
    expect(matndanSon('5 000 000')).toBe(5_000_000);
    expect(matndanSon('5.000.000')).toBe(5_000_000);
    expect(matndanSon('5,000,000')).toBe(5_000_000);
    expect(matndanSon('  30  ')).toBe(30);
  });

  it('birlik soʻzlari tashlanadi', () => {
    expect(matndanSon('5 000 000 soʻm')).toBe(5_000_000);
    expect(matndanSon("10 000 000 so'm")).toBe(10_000_000);
    expect(matndanSon('7 500 000 сум')).toBe(7_500_000);
    expect(matndanSon('20%')).toBe(20);
    expect(matndanSon('12,5 %')).toBe(12.5);
    expect(matndanSon('30 dona')).toBe(30);
    expect(matndanSon('30 ta')).toBe(30);
    expect(matndanSon('40 шт')).toBe(40);
  });

  it('mln / ming / mlrd — oʻzbekcha va ruscha', () => {
    expect(matndanSon('10 mln')).toBe(10_000_000);
    expect(matndanSon('10mln')).toBe(10_000_000);
    expect(matndanSon('1,5 mln')).toBe(1_500_000);
    expect(matndanSon('1.5 mlrd')).toBe(1_500_000_000);
    expect(matndanSon('500 ming')).toBe(500_000);
    expect(matndanSon('10 млн')).toBe(10_000_000);
    expect(matndanSon('500 тыс')).toBe(500_000);
    expect(matndanSon('2 миллиона')).toBe(2_000_000);
  });

  it('kasr (marja)', () => {
    expect(matndanSon('12.5')).toBe(12.5);
    expect(matndanSon('12,5')).toBe(12.5);
  });

  it('soʻz bilan yozilgan son', () => {
    expect(matndanSon('oʻn million')).toBe(10_000_000);
    expect(matndanSon('yigirma')).toBe(20);
  });

  it('taxmin qilinmaydi: son yoʻq, ikki son, oraliq, manfiy — null', () => {
    expect(matndanSon('')).toBeNull();
    expect(matndanSon('   ')).toBeNull();
    expect(matndanSon('bilmayman')).toBeNull();
    expect(matndanSon('abc')).toBeNull();
    expect(matndanSon('5-10 mln')).toBeNull();
    expect(matndanSon('5 yoki 10 mln')).toBeNull();
    expect(matndanSon('-3')).toBeNull();
  });

  it('valyuta va "yarim" — soʻmga oʻgirilmaydi, yarim hisoblanmaydi: null', () => {
    // Tekshiruv (2026-10-05): "5000$" va "5 ming dollar" 5 000 soʻm, "yarim
    // million" esa 1 000 000 boʻlib JIMGINA yozilardi.
    for (const t of ['5000$', '$5000', '5 ming dollar', '100 €', '10 000 usd', '5 тысяч долларов', '100 евро']) {
      expect(matndanSon(t), t).toBeNull();
    }
    for (const t of ['yarim million', 'yarim mln', 'bir yarim mln', 'полмиллиона', 'пол миллиона', 'полтора миллиона']) {
      expect(matndanSon(t), t).toBeNull();
    }
    expect(matndanSon('10 mln')).toBe(10_000_000);
    expect(matndanSon('1,5 mln')).toBe(1_500_000);
  });
});
