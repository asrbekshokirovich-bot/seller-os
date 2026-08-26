import { describe, expect, it } from 'vitest';
import {
  aylanmaKun, bojxonaQqs, kargoNarxi, olchamIshonchlimi, saqlashSom,
  tannarxHisobi, UZUM_SAQLASH, type TannarxKirishi,
} from '../src/tannarx.js';

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
  // 30 kunlik aylanma — bepul davr ichida, saqlash haqi 0.
  aylanmaKun: 30,
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
      komissiyaFoizi: null, aylanmaKun: null,
    });
    expect(n.yetishmaydi).toEqual([
      'sotuvNarxiSom', 'xitoyNarxiYuan', 'kursSomPerYuan',
      'weightG', 'volumeMl', 'kargo.somPerKg', 'kargo.somPerM3',
      'boj.bojFoizi', 'boj.qqsFoizi', 'komissiyaFoizi', 'aylanmaKun',
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

describe('olchamIshonchlimi — ogʻirlik va hajm zid boʻlsa', () => {
  /*
   * Uchala son ham JONLI bazadan olingan (2026-08-26), toʻqilgan
   * emas. Shuning uchun ular chegara tanlashning oqlanishi ham.
   */
  it('25 g li koʻylak 122 500 ml da — ishonchsiz', () => {
    expect(olchamIshonchlimi(25, 122_500)).toBe(false);
  });

  it('12 kg li mashinacha 5 ml da — ishonchsiz', () => {
    expect(olchamIshonchlimi(12_000, 5)).toBe(false);
  });

  it('5 g li qalam 612 ml qutida — ISHONCHLI, qadoq havodan iborat', () => {
    expect(olchamIshonchlimi(5, 612)).toBe(true);
  });

  it('64 kg li muzlatgich 675 l — ishonchli', () => {
    expect(olchamIshonchlimi(64_000, 675_000)).toBe(true);
  });

  it('bittasi yoʻq boʻlsa — `null`, `true` EMAS', () => {
    // Yoʻq maʼlumotni "toʻgʻri" deb belgilash aynan shu qorovul
    // qarshi turadigan xato.
    expect(olchamIshonchlimi(null, 1_000)).toBeNull();
    expect(olchamIshonchlimi(500, null)).toBeNull();
  });

  it('nol hajm — oʻlchov emas, ishonchsiz', () => {
    expect(olchamIshonchlimi(500, 0)).toBe(false);
  });
});

describe('tannarxHisobi — zid oʻlchov RAQAMGA aylanmaydi', () => {
  const ZID: TannarxKirishi = { ...TOLIQ, weightG: 25, volumeMl: 122_500 };

  it('kargo ham, Uzum logistikasi ham `null`', () => {
    const n = tannarxHisobi(ZID);
    expect(n.tannarx.kargo).toBeNull();
    expect(n.tannarx.uzumLogistika).toBeNull();
    expect(n.kargoAsosi).toBeNull();
  });

  it('sabab nomi bilan aytiladi va foyda koʻrsatilmaydi', () => {
    const n = tannarxHisobi(ZID);
    expect(n.yetishmaydi).toContain('olcham — ogʻirlik va hajm bir-biriga zid');
    expect(n.sofFoydaSom).toBeNull();
  });

  it('QOROVUL: zid oʻlchovda logistika 5 250 dan OSHIB ketardi', () => {
    /*
     * Qorovulsiz 122 500 ml → 5 250 + 121 × 250 = 35 500 soʻm.
     * Yaʼni koʻylakning marjasi 30 ming soʻmga pasayib
     * koʻrsatilardi va foydali tovar zararli boʻlib chiqardi.
     * Shu qator oʻsha xato qaytib kelsa yiqiladi.
     */
    const n = tannarxHisobi(ZID);
    expect(n.tannarx.uzumLogistika).not.toBe(35_500);
    expect(n.tannarx.uzumLogistika).toBeNull();
  });

  it('oʻlchov mos boʻlsa hisob ishlaydi — qorovul ortiqcha ushlamaydi', () => {
    const n = tannarxHisobi(TOLIQ);
    expect(n.yetishmaydi).toEqual([]);
    expect(n.tannarx.uzumLogistika).toBe(5_500);
    expect(n.sofFoydaSom).not.toBeNull();
  });
});

describe('aylanmaKun — Uzumning 6.7 dagi taʼrifi', () => {
  it('qoldiq / kunlik sotuv', () => {
    // 300 dona qoldiq, kuniga 5 ta sotiladi → 60 kun.
    expect(aylanmaKun(300, 5)).toBe(60);
  });

  it('sotuv NOL boʻlsa — `null`, cheksizlik EMAS', () => {
    /*
     * Nolga boʻlish cheksizlik berardi, u esa cheksiz saqlash
     * haqiga aylanib har qanday tovarni "zararli" deb koʻrsatardi.
     * "15 kun ichida sotilmadi" — "hech qachon sotilmaydi" emas.
     */
    expect(aylanmaKun(300, 0)).toBeNull();
  });

  it('qoldiq oʻlchanmagan boʻlsa — `null`', () => {
    expect(aylanmaKun(null, 5)).toBeNull();
  });
});

describe('saqlashSom — Uzum ombori tarifi (6.7)', () => {
  it('aylanma 60 kungacha — BEPUL, va bu oʻlchangan nol', () => {
    expect(saqlashSom({ volumeMl: 5_000, aylanmaKun: 60 })).toBe(0);
    expect(saqlashSom({ volumeMl: 5_000, aylanmaKun: 10 })).toBe(0);
  });

  it('61—180 kun: litr uchun kuniga 12 soʻm', () => {
    // 5 litr × 12 soʻm = 60 soʻm/kun, toʻlanadigan kun 120 − 60 = 60.
    expect(saqlashSom({ volumeMl: 5_000, aylanmaKun: 120 })).toBe(60 * 60);
  });

  it('181—360 kun: 18 soʻm', () => {
    // 2 litr × 18 = 36 soʻm/kun × (200 − 60) = 5 040.
    expect(saqlashSom({ volumeMl: 2_000, aylanmaKun: 200 })).toBe(36 * 140);
  });

  it('361 kundan yuqori: 24 soʻm', () => {
    expect(saqlashSom({ volumeMl: 1_000, aylanmaKun: 400 })).toBe(24 * 340);
  });

  it('imtiyozli turkumda tarif past', () => {
    const odatiy = saqlashSom({ volumeMl: 2_000, aylanmaKun: 200 });
    const imtiyoz = saqlashSom({ volumeMl: 2_000, aylanmaKun: 200, imtiyozli: true });
    expect(imtiyoz).toBeLessThan(odatiy!);
    expect(imtiyoz).toBe(28 * 140); // 2 litr × 14 soʻm
  });

  it('kunlik shift 5 000 soʻmdan oshmaydi', () => {
    /*
     * 675 litrlik muzlatgich: 675 × 12 = 8 100 soʻm/kun boʻlardi,
     * lekin qoidada bir tovarga kunlik shift 5 000 soʻm.
     */
    const n = saqlashSom({ volumeMl: 675_000, aylanmaKun: 120 });
    expect(n).toBe(UZUM_SAQLASH.kunlikShiftOdatiy * 60);
  });

  it('hajm yoki aylanma yoʻq boʻlsa — `null`, nol EMAS', () => {
    // Nol "saqlash tekin" degan daʼvo boʻlardi.
    expect(saqlashSom({ volumeMl: null, aylanmaKun: 120 })).toBeNull();
    expect(saqlashSom({ volumeMl: 5_000, aylanmaKun: null })).toBeNull();
  });
});

describe('tannarxHisobi — saqlash haqi foydadan chiqariladi', () => {
  it('sekin sotiladigan tovarda foyda KAMAYADI', () => {
    const tez = tannarxHisobi({ ...TOLIQ, aylanmaKun: 30 });
    const sekin = tannarxHisobi({ ...TOLIQ, aylanmaKun: 300 });
    expect(tez.tannarx.saqlash).toBe(0);
    expect(sekin.tannarx.saqlash).toBeGreaterThan(0);
    expect(sekin.sofFoydaSom!).toBeLessThan(tez.sofFoydaSom!);
  });

  it('aylanma oʻlchanmagan boʻlsa — sabab nomi bilan aytiladi', () => {
    const n = tannarxHisobi({ ...TOLIQ, aylanmaKun: null });
    expect(n.yetishmaydi).toContain('aylanmaKun');
    expect(n.tannarx.saqlash).toBeNull();
    expect(n.sofFoydaSom).toBeNull();
  });

  it('QOROVUL: saqlash hisobga kirmasa marja oshib koʻrsatilardi', () => {
    /*
     * 2 litrlik tovar, aylanma 300 kun → 2 × 18 × 240 = 8 640 soʻm.
     * Bu 100 000 soʻmlik tovarda 8,6 punkt marja. Saqlash qatori
     * hisobdan tushib qolsa shu sinov yiqiladi.
     */
    const n = tannarxHisobi({ ...TOLIQ, aylanmaKun: 300 });
    expect(n.tannarx.saqlash).toBe(18 * 2 * 240);
  });
});
