import { describe, expect, it, vi } from 'vitest';
import { envelope, manzil, tasodifiyId, xatoniYubor } from '../src/xatolik.js';

const DSN = 'https://abc123def456@o111222.ingest.sentry.io/4507';
const BELGI = { qism: 'edge', muhit: 'production', yol: '/kpi' };
const VAQT = new Date('2026-08-25T10:00:00.000Z');
const ID = '0123456789abcdef0123456789abcdef';

describe('manzil — DSN ni ajratish', () => {
  it('toʻgʻri DSN dan envelope manzili chiqadi', () => {
    const m = manzil(DSN);
    expect(m).not.toBeNull();
    expect(m?.kalit).toBe('abc123def456');
    expect(m?.loyiha).toBe('4507');
    expect(m?.url).toBe(
      'https://o111222.ingest.sentry.io/api/4507/envelope/'
      + '?sentry_key=abc123def456&sentry_version=7',
    );
  });

  /*
   * DSN yoʻqligi ODATIY hol: mahalliy ishlash, testlar, hali
   * sozlanmagan muhit. U xato emas va otmasligi kerak.
   */
  it('DSN yoʻq boʻlsa `null`, xato otmaydi', () => {
    expect(manzil(undefined)).toBeNull();
    expect(manzil(null)).toBeNull();
    expect(manzil('')).toBeNull();
  });

  it('notoʻgʻri DSN ham `null` — ilova ishga tushaveradi', () => {
    expect(manzil('bu umuman URL emas')).toBeNull();
    // Kalitsiz.
    expect(manzil('https://o1.ingest.sentry.io/4507')).toBeNull();
    // Loyiha id siz.
    expect(manzil('https://kalit@o1.ingest.sentry.io/')).toBeNull();
    // Loyiha id raqam emas.
    expect(manzil('https://kalit@o1.ingest.sentry.io/loyiha')).toBeNull();
  });
});

describe('envelope', () => {
  const qatorlar = (e: string) => e.split('\n').map((q) => JSON.parse(q));

  it('uch qatorli: sarlavha, tur, hodisa', () => {
    const q = qatorlar(envelope(new Error('sindi'), BELGI, VAQT, ID));
    expect(q).toHaveLength(3);
    expect(q[0]).toMatchObject({ event_id: ID, sent_at: VAQT.toISOString() });
    expect(q[1]).toEqual({ type: 'event' });
  });

  it('xato nomi va matni saqlanadi', () => {
    const q = qatorlar(envelope(new TypeError('x null'), BELGI, VAQT, ID));
    expect(q[2].exception.values[0]).toMatchObject({ type: 'TypeError', value: 'x null' });
  });

  it('qaysi qism va qaysi uch ekani belgilanadi', () => {
    const q = qatorlar(envelope(new Error('e'), BELGI, VAQT, ID));
    expect(q[2].tags).toMatchObject({ qism: 'edge', yol: '/kpi' });
    expect(q[2].environment).toBe('production');
    expect(q[2].transaction).toBe('/kpi');
  });

  /*
   * `throw "matn"` ham boʻladi — JS da istalgan qiymatni otish
   * mumkin. Bunda ham hodisa yasalishi kerak, aks holda eng
   * gʻalati xatolar aynan yoʻqolardi.
   */
  it('Error boʻlmagan qiymat ham yuboriladi', () => {
    const q = qatorlar(envelope('shunchaki matn', BELGI, VAQT, ID));
    expect(q[2].exception.values[0]).toMatchObject({
      type: 'Error', value: 'shunchaki matn',
    });
  });

  it('iz boʻlsa `extra` da saqlanadi', () => {
    const x = new Error('izli');
    const q = qatorlar(envelope(x, BELGI, VAQT, ID));
    expect(q[2].extra.stack).toContain('izli');
  });
});

describe('xatoniYubor', () => {
  it('DSN yoʻq boʻlsa soʻrov YUBORILMAYDI', async () => {
    const yuborgich = vi.fn();
    const natija = await xatoniYubor(new Error('e'), BELGI, undefined,
      yuborgich as unknown as typeof fetch, VAQT, ID);
    expect(natija).toBe(false);
    expect(yuborgich).not.toHaveBeenCalled();
  });

  it('DSN boʻlsa envelope yuboriladi', async () => {
    const yuborgich = vi.fn().mockResolvedValue({ ok: true });
    const natija = await xatoniYubor(new Error('e'), BELGI, DSN,
      yuborgich as unknown as typeof fetch, VAQT, ID);
    expect(natija).toBe(true);
    const [url, sozlama] = yuborgich.mock.calls[0];
    expect(url).toContain('/api/4507/envelope/');
    expect(sozlama.headers['Content-Type']).toBe('application/x-sentry-envelope');
    expect(String(sozlama.body).split('\n')).toHaveLength(3);
  });

  /*
   * ENG MUHIM TEKSHIRUV. Kuzatuv vositasi mahsulotni yiqitmasligi
   * kerak: Sentry oʻchgan boʻlsa ham foydalanuvchi soʻrovi
   * bajarilishi shart.
   */
  it('Sentry javob bermasa xato OTMAYDI', async () => {
    const yuborgich = vi.fn().mockRejectedValue(new Error('tarmoq yoʻq'));
    await expect(
      xatoniYubor(new Error('e'), BELGI, DSN,
        yuborgich as unknown as typeof fetch, VAQT, ID),
    ).resolves.toBe(false);
  });

  it('Sentry 4xx qaytarsa ham otmaydi', async () => {
    const yuborgich = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    await expect(
      xatoniYubor(new Error('e'), BELGI, DSN,
        yuborgich as unknown as typeof fetch, VAQT, ID),
    ).resolves.toBe(false);
  });
});

describe('tasodifiyId', () => {
  it('32 ta hex belgi', () => {
    expect(tasodifiyId()).toMatch(/^[0-9a-f]{32}$/);
  });

  it('har safar boshqacha', () => {
    expect(tasodifiyId()).not.toBe(tasodifiyId());
  });
});
