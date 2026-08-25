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
    expect(ogir({ weightG: 500, volumeMl: 1000 })).toBeNull();
  });

  it('chegaradagi ogʻirlik bayroq beradi', () => {
    const n = ogir({ weightG: H.heavyGrams, volumeMl: null });
    expect(n?.kind).toBe('heavy');
    expect(n).toMatchObject({ severity: 'warn' });
  });

  it('chegaradan bir gramm past — bayroq yoʻq', () => {
    expect(ogir({ weightG: H.heavyGrams - 1, volumeMl: null })).toBeNull();
  });

  it('hajm ham mustaqil sabab', () => {
    const n = ogir({ weightG: 100, volumeMl: H.bulkyVolumeMl });
    expect(n?.kind).toBe('heavy');
  });

  it('sabab matnida kargo aytiladi', () => {
    // Foydalanuvchi NEGA ekanini bilishi kerak, "ogʻir" soʻzi kifoya emas.
    const n = ogir({ weightG: 8000, volumeMl: null });
    expect((n as { reason: string }).reason).toMatch(/[Kk]argo/);
    expect((n as { reason: string }).reason).toContain('8.0 kg');
  });

  it('IKKALASI ham nomaʼlum boʻlsa — baholanmadi', () => {
    expect(ogir({ weightG: null, volumeMl: null }))
      .toMatchObject({ kind: 'baholanmadi', missing: ['weightG', 'volumeMl'] });
  });

  it('bittasi maʼlum boʻlsa yetadi', () => {
    // Uzum hajmni bermaydi. Ogʻirlik bor boʻlsa baholash mumkin —
    // "hajm yoʻq" deb butun filtrni oʻchirib qoʻyish notoʻgʻri.
    expect(ogir({ weightG: 200, volumeMl: null })).toBeNull();
  });
});
