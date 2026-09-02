/**
 * Turkum bayrogʻi tovarlarga tarqatilishi.
 *
 * NEGA BU TEST BOR. 6-tuzoq (monopoliya) TURKUM darajasida
 * hisoblanadi, `selleros.product_flags` esa TOVAR boʻyicha yoziladi.
 * Ikkisi bogʻlanmagani uchun bayroq jadvalgacha hech qachon yetib
 * kelmagan: `turkumniTekshir` yozilgan, testi bor, `/tuzoqlar` uchida
 * koʻrinadi — va `product_flags` da `monopoly` turi BITTA ham yoʻq
 * edi (oʻlchandi 2026-09-02). QOIDALAR.md 8-boʻlimidagi naqsh.
 */

import { describe, expect, it } from 'vitest';
import type { TurkumHolati } from '@selleros/shared';
import { turkumBayroqlariniTarqat } from '../src/tahlil.js';

/** Chegaradan OʻTADIGAN turkum: top-3 ulushi 88%, qamrov toʻliq. */
const MONOPOL: TurkumHolati = {
  categoryId: 12,
  name: 'Daftar',
  top3SharePercent: 88,
  measuredSellers: 435,
  totalSellers: 435,
};

/** Chegaradan oʻtmaydigan turkum: ulush 30%. */
const TOZA: TurkumHolati = {
  categoryId: 34,
  name: 'Ilgaklar va tutqichlar',
  top3SharePercent: 30,
  measuredSellers: 811,
  totalSellers: 811,
};

const XARITA = [
  { productId: 101, categoryId: 12 },
  { productId: 102, categoryId: 12 },
  { productId: 201, categoryId: 34 },
];

describe('turkumBayroqlariniTarqat', () => {
  it('monopol turkumdagi HAR tovarga bayroq qoʻyiladi', () => {
    const natija = turkumBayroqlariniTarqat([MONOPOL, TOZA], XARITA);
    expect(natija.map((b) => b.productId).sort()).toEqual([101, 102]);
    expect(natija.every((b) => b.kind === 'monopoly')).toBe(true);
  });

  it('toza turkumdagi tovar bayroq olmaydi', () => {
    const natija = turkumBayroqlariniTarqat([MONOPOL, TOZA], XARITA);
    expect(natija.some((b) => b.productId === 201)).toBe(false);
  });

  it('bayroq TURKUMNIKI boʻlib qoladi — tovar ayblanmaydi', () => {
    // Matn ham, dalil ham turkum haqida. Tovarga koʻchirilganda
    // ular oʻzgarmasligi kerak: aks holda "bu tovar monopol" degan
    // maʼno paydo boʻlardi va u notoʻgʻri.
    const [b] = turkumBayroqlariniTarqat([MONOPOL], XARITA);
    expect(b!.reason).toContain('Kirish qiyin');
    expect(b!.evidence).toMatchObject({
      top3_ulush_foiz: 88,
      turkumdagi_sotuvchi: 435,
    });
    expect(b!.severity).toBe('warn');
  });

  it('bayroqli turkum yoʻq boʻlsa boʻsh roʻyxat', () => {
    expect(turkumBayroqlariniTarqat([TOZA], XARITA)).toEqual([]);
  });

  it('xaritada yoʻq turkum tashlab ketiladi, yiqilmaydi', () => {
    // Xarita va turkum roʻyxati ikki xil uchdan keladi va bir-biriga
    // toʻliq mos boʻlishi shart emas.
    const natija = turkumBayroqlariniTarqat([MONOPOL], [
      { productId: 999, categoryId: 77 },
    ]);
    expect(natija).toEqual([]);
  });

  it('baholanmagan turkum bayroq bermaydi', () => {
    // Qamrov yetarli emas — filtr "baholanmadi" deydi, "monopol
    // emas" demaydi. Ikkalasi bir xil koʻrinmasligi kerak.
    const kam: TurkumHolati = {
      categoryId: 55, name: 'Qoplamalar',
      top3SharePercent: 76, measuredSellers: 10, totalSellers: 2052,
    };
    expect(turkumBayroqlariniTarqat([kam], [
      { productId: 1, categoryId: 55 },
    ])).toEqual([]);
  });
});
