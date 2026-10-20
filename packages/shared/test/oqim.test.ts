/**
 * OQIM (SSE) — server javobni boʻlaklab yuboradi, sahifa darhol chizadi (nazoratchi,
 * 2026-10-20: «matn yozilgan sari chiqib borsin»).
 *
 * NEGA BU TESTLAR BOR. (1) Hodisa chiqmasa oqim boshlanMASLIGI kerak: sessiya xatosi oddiy
 * JSON va 401 boʻlib qolsin — sayt vositachisi shunda yangi sessiya ochadi. (2) Oxirgi hodisa
 * — oqimsiz javobning aynan oʻzi. (3) Brauzer boʻlaklari istalgan joyda (UTF-8 harf oʻrtasida
 * ham) uzilishi mumkin — oʻquvchi baribir toʻliq hodisalarni beradi.
 */

import { describe, expect, it, vi } from 'vitest';
import { oqimmi, oqimYokiNatija, siyrak, sseKadr, sseOqi } from '../src/oqim';

/** Oqimni oxirigacha oʻqib, hodisalarini qaytaradi. */
async function hammasi(oqim: ReadableStream<Uint8Array>): Promise<Array<[string, unknown]>> {
  const h: Array<[string, unknown]> = [];
  await sseOqi(oqim, (nom, q) => h.push([nom, q]));
  return h;
}

/** Matnni baytlarga boʻlib (har biri `n` bayt) oqim qiladi — brauzer boʻlaklari kabi. */
function bolakli(matn: string, n: number): ReadableStream<Uint8Array> {
  const b = new TextEncoder().encode(matn);
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (let i = 0; i < b.length; i += n) c.enqueue(b.slice(i, i + n));
      c.close();
    },
  });
}

describe('oqimYokiNatija', () => {
  it('hodisa chiqmasa — oqim yoʻq, natijaning oʻzi (oddiy JSON javob qaytariladi)', async () => {
    const g = await oqimYokiNatija(async () => ({ xato: 'sessiya topilmadi', xabarlar: [] }));
    expect(g).toEqual({ natija: { xato: 'sessiya topilmadi', xabarlar: [] } });
  });

  it('hodisa chiqsa — oqim: oldin yigʻilganlari, keyin qolganlari, oxirida tayyor (natija)', async () => {
    let davom: () => void = () => {};
    const kut = new Promise<void>((r) => { davom = r; });
    const g = await oqimYokiNatija(async (yubor) => {
      yubor('holat', { holat: 'tushunmoqda' });
      yubor('holat', { holat: 'yozmoqda' });
      await kut;
      yubor('qism', { oldin: 'Sal', izoh: '', savol: '' });
      return { xabarlar: [{ rol: 'menejer', matn: 'Salom' }], qadam: 1 };
    });
    expect('oqim' in g).toBe(true);
    if (!('oqim' in g)) return;
    davom();
    expect(await hammasi(g.oqim)).toEqual([
      ['holat', { holat: 'tushunmoqda' }],
      ['holat', { holat: 'yozmoqda' }],
      ['qism', { oldin: 'Sal', izoh: '', savol: '' }],
      ['tayyor', { xabarlar: [{ rol: 'menejer', matn: 'Salom' }], qadam: 1 }],
    ]);
  });

  it('hodisadan OLDIN otsa — xato shu yerdan otiladi (Edge 500 qaytaradi)', async () => {
    await expect(oqimYokiNatija(async () => { throw new Error('baza'); })).rejects.toThrow('baza');
  });

  it('oqim boshlangach otsa — xato hodisasi (ushlanmagan rad yoʻq) va oqim yopiladi', async () => {
    const ushlanmagan = vi.fn();
    process.on('unhandledRejection', ushlanmagan);
    try {
      const g = await oqimYokiNatija(async (yubor) => {
        yubor('holat', { holat: 'yozmoqda' });
        await new Promise((r) => setTimeout(r, 5));
        throw new Error('ichida yiqildi');
      }, { xatoQiymati: (e) => ({ xato: 'ichki xato', sabab: (e as Error).message }) });
      if (!('oqim' in g)) throw new Error('oqim kutilgan edi');
      expect(await hammasi(g.oqim)).toEqual([
        ['holat', { holat: 'yozmoqda' }],
        ['xato', { xato: 'ichki xato', sabab: 'ichida yiqildi' }],
      ]);
      await new Promise((r) => setTimeout(r, 10));
      expect(ushlanmagan).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', ushlanmagan);
    }
  });

  it('jim paytda ping izohi ketadi (proksi uzmasin), oʻquvchi uni tashlaydi', async () => {
    const g = await oqimYokiNatija(async (yubor) => {
      yubor('holat', { holat: 'yozmoqda' });
      await new Promise((r) => setTimeout(r, 60));
      return { ok: true };
    }, { pingMs: 15 });
    if (!('oqim' in g)) throw new Error('oqim kutilgan edi');
    const xom = await new Response(g.oqim).text();
    expect(xom).toMatch(/: ping\n\n/);
    // Boshida ~1 KB izoh — Safari kabi brauzerlar birinchi boʻlakni ushlab turmasin.
    expect(xom.indexOf('event: holat')).toBeGreaterThan(1024);
    expect(await hammasi(bolakli(xom, 7))).toEqual([['holat', { holat: 'yozmoqda' }], ['tayyor', { ok: true }]]);
  });

  it('mijoz uzilsa (cancel) — ish baribir oxirigacha bajariladi (turn jurnalga yoziladi)', async () => {
    let tugadi = false;
    const g = await oqimYokiNatija(async (yubor) => {
      yubor('holat', { holat: 'yozmoqda' });
      await new Promise((r) => setTimeout(r, 20));
      yubor('qism', { oldin: 'x', izoh: '', savol: '' });
      tugadi = true;
      return { ok: true };
    });
    if (!('oqim' in g)) throw new Error('oqim kutilgan edi');
    await g.oqim.cancel();
    await new Promise((r) => setTimeout(r, 40));
    expect(tugadi).toBe(true);
  });
});

describe('sseOqi', () => {
  const KADRLAR = [
    sseKadr('qism', { oldin: 'Oʻzbekcha: shoʻx, gʻoz 😀 va "qoʻshtirnoq"\nyangi qator', izoh: '', savol: '' }),
    ': izoh qatori\n\n',
    sseKadr('qayta', {}),
    'event: buzuq\ndata: {bu json emas\n\n',
    sseKadr('tayyor', { xabarlar: [], qadam: 3 }),
  ].join('');

  it('har qanday boʻlaklashda (1 bayt ham — harf va emoji oʻrtasida) — bir xil hodisalar', async () => {
    const kutilgan = await hammasi(bolakli(KADRLAR, KADRLAR.length));
    expect(kutilgan).toEqual([
      ['qism', { oldin: 'Oʻzbekcha: shoʻx, gʻoz 😀 va "qoʻshtirnoq"\nyangi qator', izoh: '', savol: '' }],
      ['qayta', {}],
      ['tayyor', { xabarlar: [], qadam: 3 }],
    ]);
    for (const n of [1, 2, 3, 5, 17, 64]) expect(await hammasi(bolakli(KADRLAR, n)), String(n)).toEqual(kutilgan);
  });

  it('CRLF qatorlar va data: dan keyin boʻshliqsiz ham oʻqiladi', async () => {
    expect(await hammasi(bolakli('event: a\r\ndata:{"x":1}\r\n\r\n', 3))).toEqual([['a', { x: 1 }]]);
  });

  it('oxirgi kadr toʻliq kelmasa — u berilmaydi (chala hodisa yoʻq)', async () => {
    expect(await hammasi(bolakli(`${sseKadr('qism', { oldin: 'a' })}event: tayyor\ndata: {"qadam"`, 4))).toEqual([['qism', { oldin: 'a' }]]);
  });
});

describe('siyrak', () => {
  it('birinchisi darhol, keyingilari ms da bittadan — oxirgisi yoʻqolmaydi', async () => {
    vi.useFakeTimers();
    try {
      const chiqdi: number[] = [];
      const f = siyrak((x: number) => chiqdi.push(x), 100);
      f(1);
      f(2);
      f(3);
      expect(chiqdi).toEqual([1]);
      vi.advanceTimersByTime(100);
      expect(chiqdi).toEqual([1, 3]);
      vi.advanceTimersByTime(500);
      f(4);
      expect(chiqdi).toEqual([1, 3, 4]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('bekor — kutayotgani chiqmaydi (qoralama olib tashlandi)', () => {
    vi.useFakeTimers();
    try {
      const chiqdi: number[] = [];
      const f = siyrak((x: number) => chiqdi.push(x), 100);
      f(1);
      f(2);
      f.bekor();
      vi.advanceTimersByTime(300);
      expect(chiqdi).toEqual([1]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('oqimmi', () => {
  it('faqat text/event-stream', () => {
    const r = (t: string | null) => ({ headers: { get: () => t } });
    expect(oqimmi(r('text/event-stream; charset=utf-8'))).toBe(true);
    expect(oqimmi(r('application/json; charset=utf-8'))).toBe(false);
    expect(oqimmi(r(null))).toBe(false);
  });
});
