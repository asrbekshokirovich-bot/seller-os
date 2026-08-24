/**
 * Ball qismlari testlari.
 *
 * Ikkita narsa tekshiriladi va ikkinchisi muhimroq:
 *   1. hisob to'g'rimi
 *   2. ma'lumot yetishmasa `null` qaytadimi — NOL emas
 *
 * Ikkinchisi butun kunning darsi. Nol "yomon" degan javob, `null`
 * "bilmayman". Aralashtirsak, ma'lumoti yig'ilmagan tovar yomon
 * tovarga o'xshab ro'yxat tubiga tushadi va uni hech kim ko'rmaydi.
 */

import { describe, expect, it } from 'vitest';
import {
  kirish, marja, marjaFoizi, mavsum, profil, raqobat, talab,
  THRESHOLDS, type Tannarx,
} from '@selleros/shared';

const TANNARX: Tannarx = {
  sotuvNarxi: 100_000, xitoyNarxi: 40_000, kargo: 10_000,
  bojxonaQqs: 5_000, komissiya: 15_000,
};

describe('talab', () => {
  const turkum = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  it('turkum ichidagi o\'rnini foizda beradi', () => {
    expect(talab(100, turkum, 30)).toBe(95);  // eng yuqorisi
    expect(talab(10, turkum, 30)).toBe(5);    // eng pasti
    expect(talab(55, turkum, 30)).toBe(50);   // o'rtasi
  });

  it('O\'LCHOV KUNI YETMASA null — nol emas', () => {
    // Sotuv stok farqidan chiqadi. Bitta nuqtadan farq chiqmaydi,
    // ya'ni "0 dona sotildi" degan xulosa asossiz bo'lardi.
    expect(talab(100, turkum, THRESHOLDS.data.minDaysForDemand - 1)).toBeNull();
    expect(talab(100, turkum, 0)).toBeNull();
    expect(talab(100, turkum, null)).toBeNull();
  });

  it('turkum bo\'sh bo\'lsa null — solishtirish uchun narsa yo\'q', () => {
    expect(talab(100, [], 30)).toBeNull();
    expect(talab(100, null, 30)).toBeNull();
  });

  it('sotuv null bo\'lsa null', () => {
    expect(talab(null, turkum, 30)).toBeNull();
  });

  it('HAQIQIY NOL sotuv — nol bo\'lib qoladi, null emas', () => {
    // 0 dona sotilgani o'lchangan bo'lsa, bu javob.
    expect(talab(0, turkum, 30)).toBe(0);
  });

  // Kun sharti ilgari chaqiruvchi chegaraning OʻZINI uzatishi bilan
  // chetlab oʻtilgan edi. Endi chetlash OCHIQ — va faqat oʻzi
  // uchun.
  describe('oʻlchov manbasi', () => {
    const turkum2 = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    it('togridan-togri: kun soni SOʻRALMAYDI', () => {
      expect(talab(100, turkum2, null, 'togridan-togri')).toBe(95);
      expect(talab(100, turkum2, 0, 'togridan-togri')).toBe(95);
    });

    it('togridan-togri boʻlsa ham oʻlchovsiz ball yoʻq', () => {
      expect(talab(null, turkum2, 30, 'togridan-togri')).toBeNull();
      expect(talab(100, [], 30, 'togridan-togri')).toBeNull();
    });

    it('sukut boʻyicha stok-farqi — shart KUCHDA qoladi', () => {
      // Yangi parametr eski chaqiruvlarni yumshatib yubormasligi kerak.
      expect(talab(100, turkum2, 1)).toBeNull();
      expect(talab(100, turkum2, 1, 'stok-farqi')).toBeNull();
    });
  });

});

describe('marja', () => {
  it('foizni to\'g\'ri hisoblaydi', () => {
    // 100 000 − 40 000 − 10 000 − 5 000 − 15 000 = 30 000 → 30%
    expect(marjaFoizi(TANNARX)).toBe(30);
  });

  it('chiziqli: polda 0, nishonda 100', () => {
    const { marginFloorPercent: pol, marginTargetPercent: nishon } = THRESHOLDS.formula;
    const bilan = (foiz: number) => marja({
      ...TANNARX, sotuvNarxi: 100, xitoyNarxi: 100 - foiz,
      kargo: 0, bojxonaQqs: 0, komissiya: 0,
    });
    expect(bilan(pol)).toBe(0);
    expect(bilan(nishon)).toBe(100);
    expect(bilan(nishon + 20)).toBe(100);  // yuqorisi qisiladi
  });

  it('XITOY NARXI YO\'Q BO\'LSA null — 4-qadam o\'tilmagan', () => {
    expect(marja({ ...TANNARX, xitoyNarxi: null })).toBeNull();
    expect(marjaFoizi({ ...TANNARX, kargo: null })).toBeNull();
  });

  it('manfiy marja 0 beradi — bu javob, null emas', () => {
    const zarar = marja({ ...TANNARX, xitoyNarxi: 90_000 });
    expect(zarar).toBe(0);
  });
});

describe('raqobat (teskari)', () => {
  it('monopoliya: kam sotuvchi, yuqori ulush → past ball', () => {
    // 100 − (100×0.7 + 6×0.3) = 28.2
    expect(raqobat(100, 3)).toBeCloseTo(28.2, 1);
  });

  it('ochiq bozor: o\'rtacha sotuvchi, past ulush → yuqori ball', () => {
    // 100 − (30×0.7 + 20×0.3) = 73
    expect(raqobat(30, 10)).toBeCloseTo(73, 1);
  });

  it('olomon bozor ham ballni pasaytiradi', () => {
    expect(raqobat(20, 50)!).toBeLessThan(raqobat(20, 10)!);
  });

  it('ma\'lumot yo\'q bo\'lsa null', () => {
    expect(raqobat(null, 10)).toBeNull();
    expect(raqobat(50, null)).toBeNull();
  });
});

describe('kirish (teskari)', () => {
  it('to\'siq yo\'q — to\'liq ball', () => {
    expect(kirish({ markirovka: false, sertifikat: false, haftalar: null })).toBe(100);
  });

  it('har to\'siq pasaytiradi', () => {
    const m = kirish({ markirovka: true, sertifikat: false, haftalar: null })!;
    const s = kirish({ markirovka: false, sertifikat: true, haftalar: null })!;
    expect(m).toBeLessThan(100);
    expect(s).toBeLessThan(100);
    // Markirovka qimmatroq: u uzluksiz jarayon, sertifikat bir martalik.
    expect(m).toBeLessThan(s);
  });

  it('MARKIROVKA HOLATI BILINMASA null — "kerak emas" EMAS', () => {
    // Eng qimmat xato shu yerda bo'lardi: odam sota olmaydigan
    // tovarga butun partiya pulini tikadi.
    expect(kirish({ markirovka: null, sertifikat: false, haftalar: 2 })).toBeNull();
    expect(kirish({ markirovka: false, sertifikat: null, haftalar: 2 })).toBeNull();
  });

  it('kutish haftasi bilinmasa ball baribir hisoblanadi', () => {
    expect(kirish({ markirovka: false, sertifikat: false, haftalar: null })).toBe(100);
  });

  it('uzoq kutish to\'yinadi', () => {
    const uzoq = kirish({ markirovka: false, sertifikat: false, haftalar: 100 })!;
    const chegara = kirish({
      markirovka: false, sertifikat: false, haftalar: THRESHOLDS.formula.entryMaxWeeks,
    })!;
    expect(uzoq).toBe(chegara);
  });
});

describe('mavsum', () => {
  const yil = [0.5, 0.6, 0.8, 1.0, 1.2, 1.4, 1.5, 1.3, 1.0, 0.8, 0.6, 0.5];

  it('oyning koeffitsientini ballga aylantiradi', () => {
    expect(mavsum(yil, 4)).toBe(100);   // koef 1.0 → neytral oy
    expect(mavsum(yil, 1)).toBe(50);    // koef 0.5 → past mavsum
    expect(mavsum(yil, 7)).toBe(100);   // koef 1.5 → qisiladi
  });

  it('YARIM TO\'LDIRILGAN MASSIV null — hisoblanmaydi', () => {
    // 12 tadan kam bo'lsa qaysi oy qaysi ekani noma'lum. Undan
    // hisoblangan ball noto'g'ri bo'lardi va buni hech narsa
    // ko'rsatmasdi.
    expect(mavsum([1, 1, 1], 2)).toBeNull();
    expect(mavsum(null, 2)).toBeNull();
  });

  it('noto\'g\'ri oy null', () => {
    expect(mavsum(yil, 0)).toBeNull();
    expect(mavsum(yil, 13)).toBeNull();
  });
});

describe('profil', () => {
  it('moslik ballni ko\'taradi', () => {
    const neytral = THRESHOLDS.formula.profileNeutral;
    expect(profil(['avto'], 'Avto ehtiyot qismlar')).toBeGreaterThan(neytral);
    expect(profil(['kiyim'], 'Erkaklar kiyimi')).toBeGreaterThan(neytral);
  });

  it('moslik yo\'q bo\'lsa neytral — PASAYTIRMAYDI', () => {
    // "Bu sohada tajribangiz yo'q" degani "bu tovar yomon" degani emas.
    expect(profil(['avto'], 'Ayollar kosmetikasi')).toBe(THRESHOLDS.formula.profileNeutral);
  });

  it('PROFIL BO\'SH BO\'LSA ham ball beriladi, null emas', () => {
    // Savollarga javob bermagan odam ham tavsiya olishi kerak.
    expect(profil(null, 'Avto')).toBe(THRESHOLDS.formula.profileNeutral);
    expect(profil([], 'Avto')).toBe(THRESHOLDS.formula.profileNeutral);
  });

  it('bir necha moslik ko\'proq ko\'taradi', () => {
    const bitta = profil(['maishiy'], 'Maishiy texnika');
    const ikkita = profil(['maishiy', 'elektronika'], 'Maishiy texnika va gadjet');
    expect(ikkita).toBeGreaterThan(bitta);
  });

  it('notanish soha e\'tiborsiz qoldiriladi', () => {
    expect(profil(['bunday-soha-yoq'], 'Avto')).toBe(THRESHOLDS.formula.profileNeutral);
  });
});
