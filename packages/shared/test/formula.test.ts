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

  it('versiya yozib qaytariladi — tavsiya logi uchun', () => {
    expect(score({ talab: 1 }, 5).version).toBe(FORMULA_VERSION);
  });
});
