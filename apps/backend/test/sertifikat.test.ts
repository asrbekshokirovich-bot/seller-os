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
import { tovarniTekshir } from '../src/tahlil.js';

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

  it('BILINGAN TALAB bilinmagan maydon tufayli YOʻQOLMAYDI', () => {
    // Markirovka aniq kerak, sertifikat holati tekshirilmagan.
    // Avval bu holat butunlay jim qolardi: funksiya ikkala maydonni
    // ham talab qilgani uchun foydalanuvchi hech narsa koʻrmasdi.
    // Yaʼni bilgan narsamizni bilmaganimiz tufayli yashirardik.
    const n = bayroq(sertifikat(talab({ markingRequired: true, certificateRequired: null })));
    expect(n.kind).toBe('certification');
    expect(n.reason).toContain('markirovka');
    expect(n.evidence.sertifikat).toBe('tekshirilmagan');
  });

  it('tekshirilmagan maydon matnda ochiq aytiladi', () => {
    const n = bayroq(sertifikat(talab({ certificateRequired: true, markingRequired: null })));
    expect(n.reason).toContain('markirovka holati tekshirilmagan');
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

/**
 * 5-tuzoq UCHGA ULANDI (2026-08-26).
 *
 * Filtr yozilgan va sinalgan edi, lekin ishlab chiqarish kodi uni
 * hech qachon chaqirmasdi — chunki maʼlumot yoʻq edi va u har
 * tovarda "baholanmadi" deb shovqin qoʻshardi.
 *
 * Endi maʼlumot bor (VMQ 502, 4-ilova), yaʼni sabab yoʻqoldi.
 */
describe('tovarniTekshir — 5-tuzoq ulangan', () => {
  const asos = {
    productId: 1, title: 'Parfyum', brand: null,
    soldUnits30d: null, sotuvManbasi: null,
  } as unknown as Parameters<typeof tovarniTekshir>[0];

  it('sertifikat talabi bayroq beradi', () => {
    const n = tovarniTekshir({
      ...asos,
      certificateRequired: true,
      talabManbasi: 'VMQ 502, 14.08.2024 (lex.uz/docs/-7080176), 4-ilova, 15-band',
    }, { oy: 6 });
    const b = n.bayroqlar.find((x) => x.kind === 'certification');
    expect(b, 'sertifikat bayrogʻi berilmadi').toBeDefined();
    expect(b?.severity).toBe('note');
    expect(b?.reason).toContain('sertifikat');
  });

  /*
   * MANBASIZ QATORGA TAYANILMAYDI. Huquqiy talab oʻzgaradi va
   * qayerdan olingani bilinmasa uni qayta tekshirib boʻlmaydi.
   */
  it('manba boʻlmasa baholanmaydi', () => {
    const n = tovarniTekshir({ ...asos, certificateRequired: true }, { oy: 6 });
    expect(n.bayroqlar.find((x) => x.kind === 'certification')).toBeUndefined();
    expect(n.baholanmadi.find((x) => x.filtr === 'certification')?.missing)
      .toContain('source');
  });

  it('talab yoʻq — bayroq ham yoʻq, baholanmadi ham yoʻq', () => {
    const n = tovarniTekshir({
      ...asos,
      markingRequired: false,
      certificateRequired: false,
      talabManbasi: 'VMQ 502, 4-ilova — roʻyxatda yoʻq',
    }, { oy: 6 });
    expect(n.bayroqlar.find((x) => x.kind === 'certification')).toBeUndefined();
    expect(n.baholanmadi.find((x) => x.filtr === 'certification')).toBeUndefined();
  });
});
