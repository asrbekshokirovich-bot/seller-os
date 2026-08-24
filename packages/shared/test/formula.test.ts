import { describe, expect, it } from 'vitest';
import { PARTS, WEIGHTS, score, FORMULA_VERSION } from '../src/formula.js';
import { THRESHOLDS } from '../src/thresholds.js';

const MAX_NULL = THRESHOLDS.data.maxNullParts;

describe('ball tizimi', () => {
  it('hamma qism 100 bo\'lsa ball 100', () => {
    const parts = Object.fromEntries(PARTS.map((p) => [p, 100]));
    expect(score(parts, MAX_NULL).value).toBe(100);
  });

  it('deterministik: bir xil kirish → bir xil natija', () => {
    const parts = { talab: 80, marja: 40, raqobat: 60, kirish: 90, mavsum: 50, profil: 70 };
    const a = score(parts, MAX_NULL);
    const b = score(parts, MAX_NULL);
    expect(a.value).toBe(b.value);
  });

  it('null qism vazndan CHIQARILADI, nol deb sanalmaydi', () => {
    // Faqat `talab` bor va u 100. Agar null lar nol deb sanalsa ball
    // 25 chiqardi; to'g'ri javob — 100.
    const withNulls = score({ talab: 100 }, 5);
    expect(withNulls.value).toBe(100);
  });

  it('juda ko\'p qism yo\'q bo\'lsa ball hisoblanmaydi', () => {
    const result = score({ talab: 100 }, MAX_NULL);
    expect(result.value).toBeNull();
    expect(result.missing).toBe(5);
  });

  it('chegaradan tashqari qiymat 0–100 ga siqiladi', () => {
    expect(score({ talab: 500, marja: 100, raqobat: 100, kirish: 100, mavsum: 100, profil: 100 }, MAX_NULL).value)
      .toBe(100);
    expect(score({ talab: -50, marja: 0, raqobat: 0, kirish: 0, mavsum: 0, profil: 0 }, MAX_NULL).value)
      .toBe(0);
  });

  it('breakdown har qism uchun vazn va ishlatilganini beradi', () => {
    const r = score({ talab: 50 }, 5);
    expect(r.breakdown).toHaveLength(PARTS.length);
    expect(r.breakdown.find((b) => b.part === 'talab')).toMatchObject({ used: true, weight: WEIGHTS.talab });
    expect(r.breakdown.find((b) => b.part === 'marja')).toMatchObject({ used: false });
  });

  // "Qo'llanmaydi" va "yo'q" — ikki BOSHQA holat. Aralashtirsak
  // 2-qadam tuzilishi bo'yicha imkonsiz bo'ladi: marja u yerda hech
  // qachon ma'lum emas, ya'ni chegara doim bitta kamroq bo'lardi.
  describe('qo\'llanmaydigan qism', () => {
    it('YO\'Q hisobiga KIRMAYDI', () => {
      // talab bor, marja qo'llanmaydi, qolgan 4 tasi yo'q emas.
      const r = score(
        { talab: 100, raqobat: 50, kirish: 50, mavsum: 50, profil: 50 },
        0,
        ['marja'],
      );
      expect(r.missing).toBe(0);
      expect(r.notApplicable).toBe(1);
      expect(r.value).not.toBeNull();
    });

    it('vazndan chiqariladi — nol deb sanalmaydi', () => {
      // marja chiqarilsa: qolgan hamma qism 100 → ball 100.
      // Agar nol deb sanalsa 75 chiqardi.
      const r = score(
        { talab: 100, raqobat: 100, kirish: 100, mavsum: 100, profil: 100 },
        0,
        ['marja'],
      );
      expect(r.value).toBe(100);
    });

    it('breakdown da KO\'RINADI, applicable: false bilan', () => {
      // "Nega bu ball?" savoliga to'liq javob berish uchun qism
      // ro'yxatdan yo'qolmasligi kerak.
      const r = score({ talab: 100 }, 5, ['marja']);
      const m = r.breakdown.find((b) => b.part === 'marja');
      expect(m).toMatchObject({ applicable: false, used: false, weight: WEIGHTS.marja });
      const t = r.breakdown.find((b) => b.part === 'talab');
      expect(t).toMatchObject({ applicable: true, used: true });
    });

    it('qiymat berilsa ham ISHLATILMAYDI', () => {
      // Kimdir 2-qadamda marja qiymatini uzatib yuborsa, u jimgina
      // ballga qo'shilib ketmasligi kerak: bosqich uni bilmaydi.
      const chetda = score({ talab: 100, marja: 0 }, 5, ['marja']);
      const oddiy = score({ talab: 100 }, 5, ['marja']);
      expect(chetda.value).toBe(oddiy.value);
      expect(chetda.breakdown.find((b) => b.part === 'marja')?.score).toBeNull();
    });

    it('chetlatilmagan qismning YO\'Qligini yashirmaydi', () => {
      // marja chetda, lekin qolgan 4 tasi haqiqatan yo'q → 4 > 2.
      const r = score({ talab: 100 }, 2, ['marja']);
      expect(r.missing).toBe(4);
      expect(r.value).toBeNull();
    });

    it('ro\'yxat bo\'sh bo\'lsa eski xulq saqlanadi', () => {
      const a = score({ talab: 100, raqobat: 50 }, 5);
      const b = score({ talab: 100, raqobat: 50 }, 5, []);
      expect(a).toEqual(b);
      expect(a.notApplicable).toBe(0);
    });
  });

  it('versiya yozib qaytariladi — tavsiya logi uchun', () => {
    expect(score({ talab: 1 }, 5).version).toBe(FORMULA_VERSION);
  });
});
