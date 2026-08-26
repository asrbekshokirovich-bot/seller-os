import { describe, expect, it } from 'vitest';
import { bojxonaQqs, kargoNarxi, tannarxHisobi, type TannarxKirishi } from '../src/tannarx.js';

/**
 * Sonlar SINOV uchun, stavka sifatida emas.
 *
 * Haqiqiy boj, QQS va komissiya huquqiy hujjatdan olinadi va
 * `tannarx.ts` da yozilmagan. Bu yerdagi 10/12/15 — hisobning
 * oʻzini tekshirish uchun tanlangan qulay sonlar.
 */
const TOLIQ: TannarxKirishi = {
  sotuvNarxiSom: 100_000,
  xitoyNarxiYuan: 20,
  kursSomPerYuan: 1_750,
  weightG: 500,
  volumeMl: 2_000,
  kargo: { somPerKg: 30_000, somPerM3: 4_000_000 },
  boj: { bojFoizi: 10, qqsFoizi: 12 },
  komissiyaFoizi: 15,
};

describe('kargoNarxi — ogʻirlik yoki hajm, qaysi biri QIMMAT', () => {
  it('ogʻir va kichik tovar ogʻirligi boʻyicha', () => {
    // 2 kg × 30 000 = 60 000 · 0.001 m³ × 4 000 000 = 4 000
    const k = kargoNarxi(2_000, 1_000, TOLIQ.kargo);
    expect(k).toEqual({ som: 60_000, asos: 'ogirlik' });
  });

  /*
   * Yengil, lekin katta quti — sohaning odatiy tuzogʻi. Ogʻirlik
   * boʻyicha deyarli tekin chiqadi, aslida esa konteynerning
   * joyini egallaydi.
   */
  it('yengil va katta tovar hajmi boʻyicha', () => {
    // 0.1 kg × 30 000 = 3 000 · 0.05 m³ × 4 000 000 = 200 000
    const k = kargoNarxi(100, 50_000, TOLIQ.kargo);
    expect(k).toEqual({ som: 200_000, asos: 'hajm' });
  });

  it('bitta oʻlchov yoʻq boʻlsa — `null`, arzoni olinmaydi', () => {
    expect(kargoNarxi(null, 1_000, TOLIQ.kargo)).toBeNull();
    expect(kargoNarxi(500, null, TOLIQ.kargo)).toBeNull();
    expect(kargoNarxi(500, 1_000, { somPerKg: null, somPerM3: 4_000_000 })).toBeNull();
    expect(kargoNarxi(500, 1_000, { somPerKg: 30_000, somPerM3: null })).toBeNull();
  });

  it('nol ogʻirlik javob, yoʻqlik emas', () => {
    expect(kargoNarxi(0, 0, TOLIQ.kargo)).toEqual({ som: 0, asos: 'ogirlik' });
  });
});

describe('bojxonaQqs', () => {
  it('boj tovar+kargo dan, QQS esa boj ustiga', () => {
    // asos 100 000 · boj 10% = 10 000 · QQS 12% × 110 000 = 13 200
    expect(bojxonaQqs(60_000, 40_000, { bojFoizi: 10, qqsFoizi: 12 })).toBe(23_200);
  });

  it('stavka yoʻq boʻlsa — `null`, nol emas', () => {
    expect(bojxonaQqs(60_000, 40_000, { bojFoizi: null, qqsFoizi: 12 })).toBeNull();
    expect(bojxonaQqs(60_000, 40_000, { bojFoizi: 10, qqsFoizi: null })).toBeNull();
  });

  it('nol stavka — haqiqiy javob', () => {
    expect(bojxonaQqs(60_000, 40_000, { bojFoizi: 0, qqsFoizi: 0 })).toBe(0);
  });
});

describe('tannarxHisobi — toʻliq kirish', () => {
  const n = tannarxHisobi(TOLIQ);

  it('hech narsa yetishmaydi', () => {
    expect(n.yetishmaydi).toEqual([]);
  });

  it('sof foyda FORMULA.md dagi ayirma bilan bir xil', () => {
    // xitoy 35 000 · kargo: 0.5 kg → 15 000, 0.002 m³ → 8 000 ⇒ 15 000
    // boj asosi 50 000 → boj 5 000 → QQS 12% × 55 000 = 6 600 ⇒ 11 600
    // komissiya 15 000
    // Uzum logistikasi: 2 000 ml → 2 litr → 5 250 + 250 = 5 500
    // 100 000 − 35 000 − 15 000 − 11 600 − 15 000 − 5 500 = 17 900
    expect(n.tannarx.xitoyNarxi).toBe(35_000);
    expect(n.tannarx.kargo).toBe(15_000);
    expect(n.tannarx.bojxonaQqs).toBe(11_600);
    expect(n.tannarx.komissiya).toBe(15_000);
    expect(n.tannarx.uzumLogistika).toBe(5_500);
    expect(n.sofFoydaSom).toBe(17_900);
  });

  it('marja foizi sof foydadan chiqadi', () => {
    expect(n.marjaFoizi).toBeCloseTo(17.9, 5);
  });

  it('kargo qaysi asosdan olingani koʻrsatiladi', () => {
    expect(n.kargoAsosi).toBe('ogirlik');
  });
});

describe('tannarxHisobi — yetishmagan kirish NOLGA aylanmaydi', () => {
  /*
   * Eng qimmat xato shu boʻlardi. Yetishmagan kargo nolga
   * aylansa, foyda oshib koʻrinadi va odam zarar keltiradigan
   * tovarni foydali deb sotib oladi.
   */
  it('kargo tarifi yoʻq — foyda `null`, nol emas', () => {
    const n = tannarxHisobi({ ...TOLIQ, kargo: { somPerKg: null, somPerM3: null } });
    expect(n.tannarx.kargo).toBeNull();
    expect(n.sofFoydaSom).toBeNull();
    expect(n.marjaFoizi).toBeNull();
    expect(n.yetishmaydi).toContain('kargo.somPerKg');
  });

  it('Xitoy narxi yoʻq — 4-qadam oʻtilmagan (FORMULA.md, 2-boʻlim)', () => {
    const n = tannarxHisobi({ ...TOLIQ, xitoyNarxiYuan: null });
    expect(n.sofFoydaSom).toBeNull();
    expect(n.yetishmaydi).toContain('xitoyNarxiYuan');
  });

  it('kurs yoʻq — yuan jimgina soʻmga aylanmaydi', () => {
    const n = tannarxHisobi({ ...TOLIQ, kursSomPerYuan: null });
    expect(n.tannarx.xitoyNarxi).toBeNull();
    expect(n.yetishmaydi).toContain('kursSomPerYuan');
  });

  it('nol kurs ham qabul qilinmaydi — u tovarni tekin qilardi', () => {
    const n = tannarxHisobi({ ...TOLIQ, kursSomPerYuan: 0 });
    expect(n.tannarx.xitoyNarxi).toBeNull();
    expect(n.yetishmaydi).toContain('kursSomPerYuan');
  });

  it('har yetishmagan kirish NOMI bilan qaytadi', () => {
    const n = tannarxHisobi({
      sotuvNarxiSom: null, xitoyNarxiYuan: null, kursSomPerYuan: null,
      weightG: null, volumeMl: null,
      kargo: { somPerKg: null, somPerM3: null },
      boj: { bojFoizi: null, qqsFoizi: null },
      komissiyaFoizi: null,
    });
    expect(n.yetishmaydi).toEqual([
      'sotuvNarxiSom', 'xitoyNarxiYuan', 'kursSomPerYuan',
      'weightG', 'volumeMl', 'kargo.somPerKg', 'kargo.somPerM3',
      'boj.bojFoizi', 'boj.qqsFoizi', 'komissiyaFoizi',
    ]);
    expect(n.sofFoydaSom).toBeNull();
  });

  it('manfiy narx qabul qilinmaydi', () => {
    const n = tannarxHisobi({ ...TOLIQ, xitoyNarxiYuan: -5 });
    expect(n.yetishmaydi).toContain('xitoyNarxiYuan');
    expect(n.sofFoydaSom).toBeNull();
  });
});

describe('tannarxHisobi — zararli tovar', () => {
  /*
   * Manfiy foyda YASHIRILMAYDI. Aynan shu holatni demping filtri
   * bayroq qilib koʻtaradi (TUZOQLAR.md §3).
   */
  it('tannarx sotuv narxidan oshsa, foyda manfiy chiqadi', () => {
    const n = tannarxHisobi({ ...TOLIQ, sotuvNarxiSom: 40_000 });
    expect(n.sofFoydaSom).toBeLessThan(0);
    expect(n.marjaFoizi).toBeLessThan(0);
  });
});
