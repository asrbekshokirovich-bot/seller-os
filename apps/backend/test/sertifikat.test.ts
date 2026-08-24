/**
 * 5-tuzoq testlari.
 *
 * Markazda bitta savol: ma'lumot yo'q bo'lsa filtr nima deydi?
 *
 * To'g'ri javob — "bilmayman". Noto'g'ri javob — "kerak emas". Bu
 * ikkisi baza darajasida ham aralashib turgan edi: ustunlar
 * `boolean NOT NULL` bo'lgan, jadval esa bo'sh — ya'ni HAR turkum
 * "sertifikat kerak emas" deb ko'rinardi.
 *
 * Xatoning narxi simmetrik emas. Talab borligini aytmasak, odam sota
 * olmaydigan tovarga butun partiya pulini tikadi. Bekorga aytsak, u
 * bir marta ortiqcha tekshiradi.
 */

import { describe, expect, it } from 'vitest';
import { sertifikat, type Flag, type KirishTalablari } from '@selleros/shared';

/** Natijani bayroq deb o'qiydi. Bayroq bo'lmasa test shu yerda yiqiladi. */
function bayroq(n: ReturnType<typeof sertifikat>): Flag {
  expect(n).not.toBeNull();
  expect(n).not.toHaveProperty('missing');
  return n as Flag;
}

function talab(u: Partial<KirishTalablari> = {}): KirishTalablari {
  return {
    categoryId: 1,
    markingRequired: false,
    certificateRequired: false,
    entryCostUzs: null,
    entryWeeks: null,
    source: 'sinov',
    ...u,
  };
}

describe('bilinmagan holat', () => {
  it('MARKIROVKA null — "kerak emas" EMAS, baholanmadi', () => {
    const n = sertifikat(talab({ markingRequired: null }));
    expect(n).toEqual({ kind: 'baholanmadi', missing: ['markingRequired'] });
  });

  it('SERTIFIKAT null — baholanmadi', () => {
    const n = sertifikat(talab({ certificateRequired: null }));
    expect(n).toEqual({ kind: 'baholanmadi', missing: ['certificateRequired'] });
  });

  it('ikkalasi ham null — ikkalasi ham ro\'yxatda', () => {
    const n = sertifikat(talab({ markingRequired: null, certificateRequired: null }));
    expect(n).toEqual({
      kind: 'baholanmadi',
      missing: ['markingRequired', 'certificateRequired'],
    });
  });

  it('MANBASIZ QATOR ham baholanmadi', () => {
    // Huquqiy talab o'zgaradi. Qayerdan olingani bilinmasa, uni qayta
    // tekshirib bo'lmaydi — ya'ni unga tayanib bo'lmaydi.
    const n = sertifikat(talab({ markingRequired: true, source: null }));
    expect(n).toEqual({ kind: 'baholanmadi', missing: ['source'] });
  });
});

describe('talab yo\'q', () => {
  it('ikkalasi false va manba bor — bayroq yo\'q', () => {
    expect(sertifikat(talab())).toBeNull();
  });
});

describe('talab bor', () => {
  it('markirovka kerak — note, block emas', () => {
    const n = bayroq(sertifikat(talab({ markingRequired: true })));
    expect(n.kind).toBe('certification');
    // Bloklamaydi: talab bor degani "kirmang" degani emas. Tayyor
    // sotuvchi uchun bu hatto afzallik — raqobat kamroq.
    expect(n.severity).toBe('note');
    expect(n.reason).toContain('markirovka');
    expect(n.reason).not.toContain('sertifikat');
  });

  it('ikkalasi kerak — ikkalasi ham matnda', () => {
    const n = bayroq(sertifikat(talab({ markingRequired: true, certificateRequired: true })));
    expect(n.reason).toContain('markirovka + sertifikat');
  });

  it('xarajat va muddat bo\'lsa — matnda ko\'rinadi', () => {
    const n = bayroq(sertifikat(talab({
      certificateRequired: true, entryCostUzs: 3_000_000, entryWeeks: 6,
    })));
    expect(n.evidence.xarajat_som).toBe(3_000_000);
    expect(n.evidence.hafta).toBe(6);
    expect(n.reason).toContain('6 hafta');
  });

  it('XARAJAT NULL — nol deb yozilmaydi', () => {
    // "0 so'm, 0 hafta" degan xabar "arzon va tez" degan taassurot
    // beradi, holbuki aslida "bilmaymiz".
    const n = bayroq(sertifikat(talab({ certificateRequired: true })));
    expect(n.reason).not.toContain('0 soʻm');
    expect(n.reason).toContain('oʻlchanmagan');
    expect(n.evidence.xarajat_som).toBeUndefined();
  });

  it('dalilda manba doim bo\'ladi', () => {
    const n = bayroq(sertifikat(talab({ markingRequired: true, source: 'asilbelgi' })));
    expect(n.evidence.manba).toBe('asilbelgi');
  });
});
