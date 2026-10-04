/**
 * Bosh sahifa va Kirish baza oʻlchovini KUTIB QOLMAYDI.
 *
 * NEGA BU TESTLAR BOR. Sahifa `bazamizniOl` ni vaqt chegarasiz kutardi.
 * Sovuq Edge Function 1,85 mln qatorni sanab 20–30 s javob bergan
 * (2026-10-04 oʻlchov) — shuncha vaqt bosh sahifa oq turardi. Endi
 * sahifa belgilangan muddatdan ortiq kutmaydi: oxirgi maʼlum qiymat
 * (yoki `null` — sahifa chiziqcha koʻrsatadi) bilan chiziladi, soʻrov
 * esa fonda tugab keshni toʻldiradi.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const HOZIR = 1_800_000_000_000;
const JAVOB = { bazamiz: { tovar: 3_020_064, dokon: 90_000, olchandi: '2026-10-04' } };

type Modul = typeof import('../src/lib/bazamizOl');

/** Har test — toza modul (modul darajasidagi kesh boʻsh). */
async function yukla(): Promise<Modul> {
  vi.resetModules();
  return import('../src/lib/bazamizOl');
}

/** `ms` dan keyin JAVOB qaytaradigan soxta `fetch`. */
function sekinFetch(ms: number) {
  return vi.fn(() => new Promise<Response>((r) => {
    setTimeout(() => r(new Response(JSON.stringify(JAVOB), { status: 200 })), ms);
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('SELLEROS_API_URL', 'https://api.sinov');
  vi.stubEnv('SELLEROS_API_KEY', 'sinov-kalit');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('bazamizniKutibOl', () => {
  it('oʻlchov tez kelsa — oʻsha qaytadi, fonga hech narsa berilmaydi', async () => {
    vi.stubGlobal('fetch', sekinFetch(100));
    const m = await yukla();
    const kechroq = vi.fn();
    const p = m.bazamizniKutibOl(HOZIR, 2500, kechroq);
    await vi.advanceTimersByTimeAsync(100);
    const o = await p;
    expect(o?.qiymat.tovar).toBe(3_020_064);
    expect(kechroq).not.toHaveBeenCalled();
  });

  it('sekin boʻlsa — muddatda null qaytadi, soʻrov fonda tugab keshni toʻldiradi', async () => {
    const fetch = sekinFetch(20_000);
    vi.stubGlobal('fetch', fetch);
    const m = await yukla();
    const kechroq = vi.fn();
    const p = m.bazamizniKutibOl(HOZIR, 2500, kechroq);
    await vi.advanceTimersByTimeAsync(2500);
    expect(await p).toBeNull();
    expect(kechroq).toHaveBeenCalledTimes(1);

    // Fondagi soʻrov tugadi — keyingi tashrif raqamni darhol oladi, qayta soʻramaydi.
    await vi.advanceTimersByTimeAsync(17_500);
    await kechroq.mock.calls[0]![0];
    const keyin = await m.bazamizniKutibOl(HOZIR + 1000, 2500, vi.fn());
    expect(keyin?.qiymat.tovar).toBe(3_020_064);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('sekin boʻlsa va eski oʻlchov bor — eskisi (yoshi bilan) qaytadi, null emas', async () => {
    vi.stubGlobal('fetch', sekinFetch(10));
    const m = await yukla();
    const birinchi = m.bazamizniKutibOl(HOZIR, 2500, vi.fn());
    await vi.advanceTimersByTimeAsync(10);
    expect((await birinchi)?.vaqt).toBe(HOZIR);

    // Bir soatdan keyin kesh eskirgan, yangi soʻrov sekin.
    vi.stubGlobal('fetch', sekinFetch(20_000));
    const keyin = m.bazamizniKutibOl(HOZIR + 2 * 60 * 60 * 1000, 2500, vi.fn());
    await vi.advanceTimersByTimeAsync(2500);
    const o = await keyin;
    expect(o?.qiymat.tovar).toBe(3_020_064);
    expect(o?.vaqt).toBe(HOZIR);
  });

  it('bir vaqtdagi tashriflar bitta soʻrovni boʻlishadi', async () => {
    const fetch = sekinFetch(20_000);
    vi.stubGlobal('fetch', fetch);
    const m = await yukla();
    const a = m.bazamizniKutibOl(HOZIR, 2500, vi.fn());
    const b = m.bazamizniKutibOl(HOZIR, 2500, vi.fn());
    await vi.advanceTimersByTimeAsync(2500);
    await Promise.all([a, b]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
