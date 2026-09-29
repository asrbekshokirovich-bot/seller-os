/**
 * Studiya Worker — sof yadro va `fetch` ishlovchisi (soxta Cloudflare Images bilan).
 *
 * Tekshiriladi: imzo shared bilan bir xil; oq chet ulushi; imzosiz/notoʻgʻri
 * soʻrov rad etiladi (Cloudflare limiti sarflanmaydi); `auto` oq fonli rasmni
 * KESMAYDI (pad), rangli fonni kesadi (segment); chiqish 3:4 va toʻgʻri
 * sarlavhalar. Tarmoqqa chiqilmaydi.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { STUDIYA_CHIQISH, studiyaImzosi, studiyaManzili } from '@selleros/shared';
import worker from '../src/index.js';
import { CHIQISH, OQ_CHEGARA, ZOND, imzo, manbaManzilimi, oqChetUlushi, oqPikselmi, rejimmi, tengmi } from '../src/yadro.js';

const KALIT = 'sinov-kaliti-0123456789abcdef';
const SRC = 'https://cbu01.alicdn.com/img/ibank/O1CN01vGCPtN22CzDpG7RBW_!!2210992147085-0-cib.jpg';

/** 48 × 48 RGB: chet `chet` rangida, ichi qizil. */
function zond(chet: [number, number, number]): Uint8Array {
  const px = new Uint8Array(ZOND * ZOND * 3);
  for (let y = 0; y < ZOND; y++) {
    for (let x = 0; x < ZOND; x++) {
      const i = (y * ZOND + x) * 3;
      const chetda = x < 2 || x >= ZOND - 2 || y < 2 || y >= ZOND - 2;
      const [r, g, b] = chetda ? chet : [200, 20, 20];
      px[i] = r; px[i + 1] = g; px[i + 2] = b;
    }
  }
  return px;
}

/** Soxta Images binding: transform zanjirini yozib boradi. */
function soxtaImages(zondPx: Uint8Array) {
  const zanjirlar: Array<{ transformlar: unknown[]; chiqish: unknown }> = [];
  const binding = {
    info: vi.fn(async () => ({ format: 'image/jpeg', fileSize: 1234, width: 1500, height: 1500 })),
    input: vi.fn(() => {
      const transformlar: unknown[] = [];
      const t = {
        transform(x: unknown) { transformlar.push(x); return t; },
        draw() { return t; },
        async output(o: { format: string }) {
          zanjirlar.push({ transformlar, chiqish: o });
          const baytlar = o.format === 'rgb' ? zondPx : new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
          return {
            image: () => new Response(baytlar).body,
            contentType: () => (o.format === 'rgb' ? 'application/octet-stream' : o.format),
            response: (opt?: { headers?: Record<string, string> }) => new Response(baytlar, { headers: opt?.headers ?? {} }),
          };
        },
      };
      return t;
    }),
    text: vi.fn(),
    hosted: {},
  };
  return { binding, zanjirlar };
}

const ctx = { waitUntil: () => {}, passThroughOnException: () => {}, props: {} } as unknown as ExecutionContext;

async function sorov(q: Record<string, string>, env: Record<string, unknown>): Promise<Response> {
  const u = new URL('https://selleros-studiya.test/');
  for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
  return worker.fetch(new Request(u.toString()), env as never, ctx);
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('yadro', () => {
  it('chiqish shared bilan bir xil va 3:4', () => {
    expect(CHIQISH).toEqual(STUDIYA_CHIQISH);
    expect(CHIQISH.eni * 4).toBe(CHIQISH.boyi * 3);
  });
  it('imzo shared studiyaImzosi bilan aynan bir xil; manzil ichidagi imzo ham', async () => {
    const a = await imzo(KALIT, 'auto', SRC);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await studiyaImzosi(KALIT, 'auto', SRC)).toBe(a);
    expect(await imzo(KALIT, 'cut', SRC)).not.toBe(a);
    const m = new URL(await studiyaManzili('https://w.test/', KALIT, SRC));
    expect(m.searchParams.get('src')).toBe(SRC);
    expect(m.searchParams.get('r')).toBe('auto');
    expect(m.searchParams.get('s')).toBe(a);
  });
  it('oqPikselmi / oqChetUlushi', () => {
    expect(oqPikselmi(255, 255, 255)).toBe(true);
    expect(oqPikselmi(240, 236, 250)).toBe(true);
    expect(oqPikselmi(231, 255, 255)).toBe(false);
    expect(oqPikselmi(250, 230, 250)).toBe(false);
    expect(oqChetUlushi(zond([255, 255, 255]), ZOND, ZOND)).toBe(1);
    expect(oqChetUlushi(zond([30, 120, 200]), ZOND, ZOND)).toBe(0);
    expect(oqChetUlushi(new Uint8Array(10), ZOND, ZOND)).toBe(0);
    expect(OQ_CHEGARA).toBeGreaterThan(0.5);
  });
  it('tengmi, rejimmi, manbaManzilimi', () => {
    expect(tengmi('abc', 'abc')).toBe(true);
    expect(tengmi('abc', 'abd')).toBe(false);
    expect(tengmi('abc', 'ab')).toBe(false);
    expect(['auto', 'pad', 'cut', 'x', null].map(rejimmi)).toEqual([true, true, true, false, false]);
    expect(manbaManzilimi('https://a.b/c.jpg')).toBe(true);
    expect(manbaManzilimi('javascript:alert(1)')).toBe(false);
    expect(manbaManzilimi(`https://a.b/${'x'.repeat(2050)}`)).toBe(false);
  });
});

describe('fetch ishlovchisi', () => {
  it('imzo notoʻgʻri — 403, manba yuklanmaydi; kalit sozlanmagan — 503; src buzuq — 400', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const { binding } = soxtaImages(zond([255, 255, 255]));
    expect((await sorov({ r: 'auto', src: SRC, s: 'yolgon' }, { IMAGES: binding, STUDIYA_KALIT: KALIT })).status).toBe(403);
    expect((await sorov({ r: 'auto', src: SRC, s: 'x' }, { IMAGES: binding })).status).toBe(503);
    expect((await sorov({ r: 'auto', src: 'ftp://x', s: 'x' }, { IMAGES: binding, STUDIYA_KALIT: KALIT })).status).toBe(400);
    expect((await sorov({ r: 'boshqa', src: SRC, s: 'x' }, { IMAGES: binding, STUDIYA_KALIT: KALIT })).status).toBe(400);
    expect(f).not.toHaveBeenCalled();
    expect(binding.input).not.toHaveBeenCalled();
  });

  it('auto + oq fon → pad: segment YOʻQ, oq chet qirqiladi, 1104×1504 pad + 48 px chet, JPEG', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } })));
    const { binding, zanjirlar } = soxtaImages(zond([252, 252, 252]));
    const s = await imzo(KALIT, 'auto', SRC);
    const j = await sorov({ r: 'auto', src: SRC, s }, { IMAGES: binding, STUDIYA_KALIT: KALIT });
    expect(j.status).toBe(200);
    expect(j.headers.get('x-studiya-rejim')).toBe('pad');
    expect(j.headers.get('x-studiya-oq')).toBe('1.000');
    expect(j.headers.get('x-studiya-manba')).toBe('1500x1500');
    expect(j.headers.get('content-type')).toBe('image/jpeg');
    expect(j.headers.get('access-control-allow-origin')).toBe('*');
    expect(zanjirlar).toHaveLength(2);
    expect(zanjirlar[0]).toEqual({ transformlar: [{ width: 48, height: 48, fit: 'squeeze' }], chiqish: { format: 'rgb' } });
    expect(zanjirlar[1]!.transformlar).toEqual([
      { trim: { border: { color: '#FFFFFF', tolerance: 225, keep: 0 } } },
      { width: 1104, height: 1504, fit: 'pad', background: '#FFFFFF' },
      { border: { color: '#FFFFFF', width: 48 } },
    ]);
    expect(zanjirlar[1]!.chiqish).toEqual({ format: 'image/jpeg', quality: 90, background: '#FFFFFF' });
  });

  it('auto + rangli fon → cut: segment=foreground, keyin shaffof chet qirqiladi', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/webp' } })));
    const { binding, zanjirlar } = soxtaImages(zond([40, 90, 160]));
    const s = await imzo(KALIT, 'auto', SRC);
    const j = await sorov({ r: 'auto', src: SRC, s }, { IMAGES: binding, STUDIYA_KALIT: KALIT });
    expect(j.headers.get('x-studiya-rejim')).toBe('cut');
    expect(zanjirlar[1]!.transformlar.slice(0, 2)).toEqual([{ segment: 'foreground' }, { trim: 'border' }]);
  });

  it('r=pad — zond olinmaydi (bitta oʻzgartirish), X-Studiya-Oq yoʻq', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1]), { headers: { 'content-type': 'image/png' } })));
    const { binding, zanjirlar } = soxtaImages(zond([0, 0, 0]));
    const j = await sorov({ r: 'pad', src: SRC, s: await imzo(KALIT, 'pad', SRC) }, { IMAGES: binding, STUDIYA_KALIT: KALIT });
    expect(j.headers.get('x-studiya-rejim')).toBe('pad');
    expect(j.headers.get('x-studiya-oq')).toBeNull();
    expect(zanjirlar).toHaveLength(1);
  });

  it('manba xato: HTTP 404 — 502; rasm emas — 415; Images xatosi — kod bilan', async () => {
    const { binding } = soxtaImages(zond([255, 255, 255]));
    const s = await imzo(KALIT, 'auto', SRC);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('yoʻq', { status: 404 })));
    expect((await sorov({ r: 'auto', src: SRC, s }, { IMAGES: binding, STUDIYA_KALIT: KALIT })).status).toBe(502);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { headers: { 'content-type': 'text/html' } })));
    expect((await sorov({ r: 'auto', src: SRC, s }, { IMAGES: binding, STUDIYA_KALIT: KALIT })).status).toBe(415);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1]), { headers: { 'content-type': 'image/jpeg' } })));
    const buzuq = { ...binding, info: vi.fn(async () => { throw Object.assign(new Error('not an image'), { code: 9412 }); }) };
    const j = await sorov({ r: 'auto', src: SRC, s }, { IMAGES: buzuq, STUDIYA_KALIT: KALIT });
    expect(j.status).toBe(415);
    expect(await j.json()).toMatchObject({ kod: 9412 });
  });

  it('/salomat va OPTIONS', async () => {
    const { binding } = soxtaImages(zond([255, 255, 255]));
    const s = await worker.fetch(new Request('https://w.test/salomat'), { IMAGES: binding, STUDIYA_KALIT: KALIT } as never, ctx);
    expect(await s.json()).toEqual({ ok: true, kalit: true });
    const o = await worker.fetch(new Request('https://w.test/', { method: 'OPTIONS' }), { IMAGES: binding } as never, ctx);
    expect(o.status).toBe(204);
  });
});
