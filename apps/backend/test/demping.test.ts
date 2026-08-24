/**
 * 3-tuzoq testlari — demping.
 *
 * Tuzoqning mohiyati: tovar eng ko'p sotilayotganlar ro'yxatida
 * turadi, ya'ni "ishlayapti" degan xulosa o'zi kelib chiqadi. Aslida
 * katta o'yinchi zararga sotib bozorni siqib turgan bo'lishi mumkin.
 */

import { describe, expect, it } from 'vitest';
import { demping, THRESHOLDS, type Flag, type Tannarx } from '@selleros/shared';

/** Sog'lom tannarx: 30% marja. */
const SOGLOM: Tannarx = {
  sotuvNarxi: 100_000, xitoyNarxi: 40_000, kargo: 10_000,
  bojxonaQqs: 5_000, komissiya: 15_000,
};

function bayroq(n: ReturnType<typeof demping>): Flag {
  expect(n).not.toBeNull();
  expect(n).not.toHaveProperty('missing');
  return n as Flag;
}

describe('bayroq qo\'yilmaydi', () => {
  it('sog\'lom marja — tuzoq yo\'q', () => {
    expect(demping(SOGLOM)).toBeNull();
  });

  it('chegaraning aynan o\'zi — hali tuzoq emas', () => {
    const chegara = THRESHOLDS.dumping.minMarginPercent;
    const t: Tannarx = {
      sotuvNarxi: 100, xitoyNarxi: 100 - chegara,
      kargo: 0, bojxonaQqs: 0, komissiya: 0,
    };
    expect(demping(t)).toBeNull();
  });
});

describe('bayroq qo\'yiladi', () => {
  it('past marja — block', () => {
    const n = bayroq(demping({ ...SOGLOM, xitoyNarxi: 68_000 }));  // marja 2%
    expect(n.kind).toBe('dumping');
    // TUZOQLAR.md §3 `block` deb belgilaydi: bu tizim $1 000 bilan
    // boshlayotgan odam uchun va unga zararli bozorni ko'rsatib
    // bo'lmaydi.
    expect(n.severity).toBe('block');
    expect(n.evidence.marja_foiz).toBe(2);
  });

  it('ZARAR — matn boshqacha va aniq summa aytiladi', () => {
    const n = bayroq(demping({ ...SOGLOM, xitoyNarxi: 90_000 }));
    expect(n.reason).toContain('zarar');
    // Har donada 20 000 so'm yo'qotiladi.
    expect(n.evidence.sof_foyda_som).toBe(-20_000);
  });

  it('dalilda chegara ham bo\'ladi', () => {
    const n = bayroq(demping({ ...SOGLOM, xitoyNarxi: 70_000 }));
    expect(n.evidence.chegara_foiz).toBe(THRESHOLDS.dumping.minMarginPercent);
  });
});

describe('ma\'lumot yetishmasa', () => {
  it('XITOY NARXI YO\'Q — baholanmadi, "tuzoq yo\'q" EMAS', () => {
    // 4-qadam o'tilmagan bo'lsa tannarx noma'lum. Uni "tuzoq yo'q"
    // deb o'qish xavfli: tovar tekshirilmagan holda tavsiyaga
    // chiqib ketardi.
    const n = demping({ ...SOGLOM, xitoyNarxi: null });
    expect(n).toEqual({ kind: 'baholanmadi', missing: ['xitoyNarxi'] });
  });

  it('bir necha maydon yo\'q — hammasi ro\'yxatda', () => {
    const n = demping({ ...SOGLOM, kargo: null, komissiya: null });
    expect(n).toEqual({ kind: 'baholanmadi', missing: ['kargo', 'komissiya'] });
  });
});
