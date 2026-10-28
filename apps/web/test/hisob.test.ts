/**
 * Bosh sahifa hisoblagichi — brauzer tomoni (`lib/hisob.ts`) va vositachi (`/api/hisob`).
 *
 * NEGA BU TESTLAR BOR (nazoratchi, 2026-10-28: «hisoblagich qoʻy»). Hisoblagich ISMSIZ va
 * sahifani hech qachon toʻxtatmasligi kerak. Bu yerda:
 *   - `?sinov=1` brauzerni eslab qoladi, hisoblar `sinov` bilan ketadi; `?sinov=0` — unutadi;
 *   - «bir marta» — shu varaqda qayta sanalmaydi; xotira yopiq boʻlsa ham sahifa yiqilmaydi;
 *   - `sendBeacon` boʻlmasa — `fetch` (keepalive);
 *   - vositachi: sessiya ochmaydi, Edge ga faqat nom va sinov belgisi ketadi; begona nom — 400.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { birMarta, hisobla, sinovmi, sinovniOqi } from '../src/lib/hisob';
import { POST } from '../src/app/api/hisob/route';

/** Soxta brauzer xotirasi (vitest node muhitida yoʻq). */
function xotira() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
  };
}

const YOPIQ = {
  getItem: () => { throw new Error('yopiq'); },
  setItem: () => { throw new Error('yopiq'); },
  removeItem: () => { throw new Error('yopiq'); },
};

/** `sendBeacon` ga ketgan tanalar. */
async function mayoqlar(beacon: ReturnType<typeof vi.fn>): Promise<unknown[]> {
  return Promise.all(beacon.mock.calls.map(async ([, b]) => JSON.parse(await (b as Blob).text())));
}

let beacon: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubGlobal('localStorage', xotira());
  vi.stubGlobal('sessionStorage', xotira());
  beacon = vi.fn(() => true);
  vi.stubGlobal('navigator', { sendBeacon: beacon });
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('sinov belgisi', () => {
  it('`?sinov=1` — eslab qolinadi; `?sinov=0` — unutiladi; boshqa manzil — eslangani', () => {
    expect(sinovmi()).toBe(false);
    expect(sinovniOqi('?sinov=1')).toBe(true);
    expect(sinovniOqi('')).toBe(true);
    expect(sinovmi()).toBe(true);
    expect(sinovniOqi('?sinov=0')).toBe(false);
    expect(sinovniOqi('?a=b')).toBe(false);
  });

  it('xotira yopiq — manzilning oʻzi hal qiladi, sahifa yiqilmaydi', () => {
    vi.stubGlobal('localStorage', YOPIQ);
    expect(sinovniOqi('?sinov=1')).toBe(true);
    expect(sinovniOqi('')).toBe(false);
    expect(sinovmi()).toBe(false);
  });
});

describe('hisobla', () => {
  it('`sendBeacon` bilan, JSON da faqat nom; sinovchida — `sinov: true`', async () => {
    hisobla('bosh_ochildi');
    sinovniOqi('?sinov=1');
    hisobla('bosh_boshladi');
    expect(beacon.mock.calls.map(([url]) => url)).toEqual(['/api/hisob', '/api/hisob']);
    expect(await mayoqlar(beacon)).toEqual([{ nom: 'bosh_ochildi' }, { nom: 'bosh_boshladi', sinov: true }]);
  });

  it('`sendBeacon` yoʻq yoki rad etsa — `fetch` (keepalive); fetch yiqilsa ham jim', async () => {
    const f = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', f);
    vi.stubGlobal('navigator', { sendBeacon: () => false });
    hisobla('suhbat_yonalish');
    vi.stubGlobal('navigator', {});
    hisobla('suhbat_birinchi_javob');
    expect(f).toHaveBeenCalledTimes(2);
    const [url, sozlama] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/hisob');
    expect(sozlama).toMatchObject({ method: 'POST', keepalive: true, body: JSON.stringify({ nom: 'suhbat_yonalish' }) });
    vi.stubGlobal('fetch', () => { throw new Error('tarmoq'); });
    expect(() => hisobla('bosh_ochildi')).not.toThrow();
  });
});

describe('birMarta', () => {
  it('shu varaqda bir marta; boshqa bosqich — alohida', () => {
    birMarta('bosh_ochildi');
    birMarta('bosh_ochildi');
    birMarta('bosh_boshladi');
    expect(beacon).toHaveBeenCalledTimes(2);
  });

  it('xotira yopiq — baribir sanaladi, yiqilmaydi', () => {
    vi.stubGlobal('sessionStorage', YOPIQ);
    expect(() => { birMarta('bosh_ochildi'); birMarta('bosh_ochildi'); }).not.toThrow();
    expect(beacon).toHaveBeenCalledTimes(2);
  });
});

describe('POST /api/hisob — vositachi', () => {
  const sorov = (tana: string) => new Request('https://sayt.test/api/hisob', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: 'so_sessiya=maxfiy' }, body: tana,
  });

  beforeEach(() => {
    vi.stubEnv('SELLEROS_API_URL', 'https://api.test');
    vi.stubEnv('SELLEROS_API_KEY', 'soxta-kalit');
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('Edge ga faqat nom va sinov belgisi; sessiya va cookie ketmaydi; javob 204', async () => {
    const f = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', f);
    const r = await POST(sorov(JSON.stringify({ nom: 'bosh_ochildi', matn: 'Aziz, 90 123 45 67' })));
    expect(r.status).toBe(204);
    const [url, sozlama] = f.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe('https://api.test/hisob');
    expect(JSON.parse(String(sozlama.body))).toEqual({ nom: 'bosh_ochildi', sinov: false });
    expect(sozlama.headers).toEqual({ Authorization: 'Bearer soxta-kalit', 'Content-Type': 'application/json' });
  });

  it('begona nom, buzuq yoki juda uzun tana — 400, Edge ga bormaydi', async () => {
    const f = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', f);
    for (const t of [JSON.stringify({ nom: 'javob_baho' }), 'json emas', JSON.stringify({ nom: 'bosh_ochildi', x: 'a'.repeat(2_000) })]) {
      expect((await POST(sorov(t))).status, t.slice(0, 30)).toBe(400);
    }
    expect(f).not.toHaveBeenCalled();
  });

  it('API sozlanmagan — 503; Edge javob bermasa — 502', async () => {
    vi.stubGlobal('fetch', async () => { throw new Error('tarmoq'); });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await POST(sorov(JSON.stringify({ nom: 'bosh_ochildi' })))).status).toBe(502);
    vi.stubEnv('SELLEROS_API_URL', '');
    expect((await POST(sorov(JSON.stringify({ nom: 'bosh_ochildi' })))).status).toBe(503);
  });
});
