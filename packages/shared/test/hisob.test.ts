/**
 * Bosh sahifa hisoblagichi (`hisob.ts`) — nazoratchi, 2026-10-28: «hisoblagich qoʻy».
 *
 * NEGA BU TESTLAR BOR. Hisoblagich ismsiz: saytdan faqat bosqich NOMI keladi. Bu yerda:
 * begona nom bazaga bormaydi; sinov belgisi faqat aniq `true` boʻlsa; baza javob bermasa —
 * 503, nol emas; panel uchun oʻqishda hisoblagich ishga tushmagan kunlar NOL EMAS — `null`
 * (QOIDALAR §4), yigʻindi faqat oʻlchangan kunlardan; ulush nolga boʻlinmaydi.
 * Bazaning oʻzi (0076) — `supabase/test/bosh-hisob.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import { HISOB_NOMLARI, hisobNomimi, hisobniYoz, ulush, voronkaniOl, voronkaOqi, VORONKA_KUN } from '../src/hisob';

/** Soxta `rpc`: chaqiruvlarni yozadi, berilgan javobni qaytaradi. */
function soxta(javob: unknown) {
  const chaqiruvlar: Array<{ nom: string; arg: unknown }> = [];
  const rpc = async <T>(nom: string, arg: unknown): Promise<T | null> => {
    chaqiruvlar.push({ nom, arg });
    return javob as T | null;
  };
  return { rpc, chaqiruvlar };
}

describe('hisobNomimi', () => {
  it('faqat toʻrt nom, voronka tartibida', () => {
    expect(HISOB_NOMLARI).toEqual(['bosh_ochildi', 'bosh_boshladi', 'suhbat_birinchi_javob', 'suhbat_yonalish']);
    for (const n of HISOB_NOMLARI) expect(hisobNomimi(n), n).toBe(true);
    for (const n of ['javob_baho', 'BOSH_OCHILDI', '', ' bosh_ochildi', null, undefined, 1, {}]) {
      expect(hisobNomimi(n), String(n)).toBe(false);
    }
  });
});

describe('hisobniYoz — POST /hisob', () => {
  it('begona nom — 400, bazaga bormaydi', async () => {
    const s = soxta({ ok: true });
    expect(await hisobniYoz(s.rpc, { nom: 'javob_baho' })).toEqual({ status: 400, tana: { xato: 'nomaʼlum hisob' } });
    expect(await hisobniYoz(s.rpc, {})).toEqual({ status: 400, tana: { xato: 'nomaʼlum hisob' } });
    expect(s.chaqiruvlar).toHaveLength(0);
  });

  it('toʻgʻri nom — bazaga faqat nom va sinov belgisi; sinov faqat aniq `true`', async () => {
    const s = soxta({ ok: true });
    expect(await hisobniYoz(s.rpc, { nom: 'bosh_ochildi', sinov: true, matn: 'begona maydon' }))
      .toEqual({ status: 200, tana: { ok: true } });
    await hisobniYoz(s.rpc, { nom: 'bosh_boshladi', sinov: 'true' });
    await hisobniYoz(s.rpc, { nom: 'suhbat_yonalish' });
    expect(s.chaqiruvlar).toEqual([
      { nom: 'so_hisob_yoz', arg: { p_nom: 'bosh_ochildi', p_sinov: true } },
      { nom: 'so_hisob_yoz', arg: { p_nom: 'bosh_boshladi', p_sinov: false } },
      { nom: 'so_hisob_yoz', arg: { p_nom: 'suhbat_yonalish', p_sinov: false } },
    ]);
  });

  it('baza javob bermasa — 503; baza rad etsa — 400; chegara — 200 va `ok: false`', async () => {
    expect(await hisobniYoz(soxta(null).rpc, { nom: 'bosh_ochildi' }))
      .toEqual({ status: 503, tana: { xato: 'baza javob bermadi' } });
    expect(await hisobniYoz(soxta({ xato: 'nomaʼlum hisob' }).rpc, { nom: 'bosh_ochildi' }))
      .toEqual({ status: 400, tana: { xato: 'nomaʼlum hisob' } });
    expect(await hisobniYoz(soxta({ ok: false, sabab: 'chegara' }).rpc, { nom: 'bosh_ochildi' }))
      .toEqual({ status: 200, tana: { ok: false, sabab: 'chegara' } });
  });
});

describe('voronkaniOl — GET /hisob-voronka', () => {
  it('davr: berilmasa, boʻsh yoki butun son emas — standart 14', async () => {
    const s = soxta({});
    for (const k of [null, '', '  ', 'abc', '2.5']) await voronkaniOl(s.rpc, k);
    await voronkaniOl(s.rpc, '7');
    expect(s.chaqiruvlar.map((c) => (c.arg as { p_kun: number }).p_kun))
      .toEqual([VORONKA_KUN, VORONKA_KUN, VORONKA_KUN, VORONKA_KUN, VORONKA_KUN, 7]);
    expect(s.chaqiruvlar.every((c) => c.nom === 'so_hisob_voronka')).toBe(true);
  });

  it('baza javob bermasa — oʻlchanmadi (503), nol emas', async () => {
    expect(await voronkaniOl(soxta(null).rpc, null))
      .toEqual({ status: 503, tana: { olchov_yoq: true, sabab: 'baza javob bermadi' } });
    expect(await voronkaniOl(soxta({ kun: 1 }).rpc, null))
      .toEqual({ status: 200, tana: { olchov_yoq: false, voronka: { kun: 1 } } });
  });
});

describe('voronkaOqi — panel uchun', () => {
  const kun = (sana: string, ochdi: number, boshladi = 0, javob = 0, yonalish = 0) => ({ sana, ochdi, boshladi, javob, yonalish });

  it('hisoblagich boshlangan kundan oldin — `null` (oʻlchanmagan); yigʻindi faqat oʻlchanganlardan', () => {
    const v = voronkaOqi({
      kun: 3, boshlandi: '2026-10-28', sinov: 4,
      kunlar: [kun('2026-10-29', 10, 4, 3, 2), kun('2026-10-28', 6, 2, 1, 1), kun('2026-10-27', 0)],
    });
    expect(v).toEqual({
      kun: 3, boshlandi: '2026-10-28', sinov: 4,
      kunlar: [
        { sana: '2026-10-29', ochdi: 10, boshladi: 4, javob: 3, yonalish: 2 },
        { sana: '2026-10-28', ochdi: 6, boshladi: 2, javob: 1, yonalish: 1 },
        { sana: '2026-10-27', ochdi: null, boshladi: null, javob: null, yonalish: null },
      ],
      jami: { ochdi: 16, boshladi: 6, javob: 4, yonalish: 3 },
    });
  });

  it('hech narsa sanalmagan (`boshlandi: null`) — hamma kun va yigʻindi `null`, nol emas', () => {
    const v = voronkaOqi({ kun: 2, boshlandi: null, sinov: 0, kunlar: [kun('2026-10-29', 0), kun('2026-10-28', 0)] });
    expect(v!.kunlar.every((k) => k.ochdi === null && k.javob === null)).toBe(true);
    expect(v!.jami).toEqual({ ochdi: null, boshladi: null, javob: null, yonalish: null });
  });

  it('shakli buzuq — `null` (panel «olinmadi» deydi)', () => {
    const toza = { kun: 1, boshlandi: '2026-10-28', sinov: 0, kunlar: [kun('2026-10-28', 1)] };
    expect(voronkaOqi(toza)).not.toBeNull();
    for (const buzuq of [
      null, 'matn', [], { ...toza, kunlar: null }, { ...toza, kun: -1 }, { ...toza, sinov: '0' },
      { ...toza, boshlandi: '28.10.2026' }, { ...toza, kunlar: [kun('28.10.2026', 1)] },
      { ...toza, kunlar: [{ ...kun('2026-10-28', 1), javob: -1 }] }, { ...toza, kunlar: [{ sana: '2026-10-28' }] },
      { ...toza, kunlar: [kun('2026-10-28', 1.5)] }, { ...toza, kunlar: [null] },
    ]) {
      expect(voronkaOqi(buzuq), JSON.stringify(buzuq)).toBeNull();
    }
  });
});

describe('ulush', () => {
  it('butun foiz; nolga yoki yoʻqqa boʻlinmaydi', () => {
    expect(ulush(1, 4)).toBe(25);
    expect(ulush(1, 3)).toBe(33);
    expect(ulush(0, 5)).toBe(0);
    expect(ulush(3, 0)).toBeNull();
    expect(ulush(null, 5)).toBeNull();
    expect(ulush(2, null)).toBeNull();
  });
});
