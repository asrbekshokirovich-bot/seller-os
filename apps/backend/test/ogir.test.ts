/**
 * 7-tuzoq: ogʻir / katta hajmli tovar.
 *
 * Bu filtr `block` QOʻYMAYDI — sababi kodda yozilgan: bloklash
 * qarori marjaga bogʻliq, marja esa Xitoy narxini talab qiladi va u
 * 4-qadamda keladi. Ogʻirlikning oʻzi tovarni yomon qilmaydi.
 */

import { describe, expect, it } from 'vitest';
import { ogir, THRESHOLDS } from '@selleros/shared';

const H = THRESHOLDS.heavy;

describe('ogir', () => {
  it('yengil tovarda bayroq yoʻq', () => {
    expect(ogir({ weightG: 500, volumeMl: 1000, oversized: null })).toBeNull();
  });

  it('chegaradagi ogʻirlik bayroq beradi', () => {
    const n = ogir({ weightG: H.heavyGrams, volumeMl: null, oversized: null });
    expect(n?.kind).toBe('heavy');
    expect(n).toMatchObject({ severity: 'warn' });
  });

  it('chegaradan bir gramm past — bayroq yoʻq', () => {
    expect(ogir({ weightG: H.heavyGrams - 1, volumeMl: null, oversized: null })).toBeNull();
  });

  it('hajm ham mustaqil sabab', () => {
    const n = ogir({ weightG: 100, volumeMl: H.bulkyVolumeMl, oversized: null });
    expect(n?.kind).toBe('heavy');
  });

  it('sabab matnida kargo aytiladi', () => {
    // Foydalanuvchi NEGA ekanini bilishi kerak, "ogʻir" soʻzi kifoya emas.
    const n = ogir({ weightG: 8000, volumeMl: null, oversized: null });
    expect((n as { reason: string }).reason).toMatch(/[Kk]argo/);
    expect((n as { reason: string }).reason).toContain('8.0 kg');
  });

  it('HAMMASI nomaʼlum boʻlsa — baholanmadi', () => {
    expect(ogir({ weightG: null, volumeMl: null, oversized: null }))
      .toMatchObject({ kind: 'baholanmadi', missing: ['weightG', 'volumeMl', 'oversized'] });
  });

  it('bittasi maʼlum boʻlsa yetadi', () => {
    // Uzum hajmni bermaydi. Ogʻirlik bor boʻlsa baholash mumkin —
    // "hajm yoʻq" deb butun filtrni oʻchirib qoʻyish notoʻgʻri.
    expect(ogir({ weightG: 200, volumeMl: null, oversized: null })).toBeNull();
  });

  /*
   * `oversized` — Uzumning oʻz belgisi.
   *
   * NEGA MUHIM. `volumeMl` hech qachon kelmaydi (Uzumda bunday
   * maydon yoʻq), yaʼni "katta hajm" tarmogʻi bir marta ham
   * ishlamagan. Jonli tekshirildi: 7 ta muzlatgichda `true`,
   * 7 ta yengil tovarda `false`.
   */
  describe('Uzumning «katta hajmli» belgisi', () => {
    it('ogʻirlik yoʻq boʻlsa ham bayroq beradi', () => {
      const n = ogir({ weightG: null, volumeMl: null, oversized: true });
      expect(n?.kind).toBe('heavy');
      expect((n as { reason: string }).reason).toContain('katta hajmli');
    });

    it('kilogramm TOʻQILMAYDI — Uzum litrni aytmaydi', () => {
      const n = ogir({ weightG: null, volumeMl: null, oversized: true });
      expect((n as { reason: string }).reason).not.toMatch(/\d+\.\d kg/);
      expect((n as { evidence: Record<string, unknown> }).evidence.ogirlikGramm)
        .toBeUndefined();
    });

    /*
     * ENG MUHIM. `false` — "katta emas" degani, "ogʻir emas"
     * degani EMAS: 6 kg li ixcham tovar ham `false` boʻladi.
     * Shuning uchun u ogʻirlik oʻrnini bosmaydi.
     */
    it('`false` ogʻirlik oʻrnini BOSMAYDI — baholanmadi qoladi', () => {
      expect(ogir({ weightG: null, volumeMl: null, oversized: false }))
        .toMatchObject({ kind: 'baholanmadi' });
    });

    it('ogʻirlik bor boʻlsa ikkalasi ham sababda koʻrinadi', () => {
      const n = ogir({ weightG: 20_000, volumeMl: null, oversized: true });
      const r = (n as { reason: string }).reason;
      expect(r).toContain('20.0 kg');
      expect(r).toContain('katta hajmli');
    });

    it('yengil, lekin Uzum katta desa — baribir bayroq', () => {
      const n = ogir({ weightG: 900, volumeMl: null, oversized: true });
      expect(n?.kind).toBe('heavy');
    });

    it('yengil va Uzum katta demasa — bayroq yoʻq', () => {
      expect(ogir({ weightG: 900, volumeMl: null, oversized: false })).toBeNull();
    });
  });
});
