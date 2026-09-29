/**
 * SellerOS Studiya — Cloudflare Worker (9-qadam).
 *
 *   GET /?r=auto|pad|cut&src=<rasm manzili>&s=<imzo>
 *     → 1200 × 1600 JPEG (3:4), oq fon, tovar markazda; Uzum talabiga mos
 *       (≥ 750 × 1000, 3:4, ≤ 5 MB — `uzum.surat.*` faktlari, 0059).
 *   GET /salomat → {"ok":true}
 *
 * REJIM (nazoratchi 2026-09-29: "hamma rasm kesilishi shart emas"):
 *   auto — rasmning 48 × 48 xom nusxasi olinadi; chet halqasining ≥ 90 % i oq
 *          boʻlsa `pad` (fon allaqachon oq — faqat qirqish va 3:4), aks holda `cut`;
 *   pad  — oq chet qirqiladi, 1104 × 1504 ichiga sigʻdiriladi, 48 px oq chet;
 *   cut  — `segment=foreground` (BiRefNet, Workers AI) fonni shaffof qiladi,
 *          shaffof chet qirqiladi, keyin `pad` dagidek oq fonga qoʻyiladi.
 *   Tovarning oʻzi (rang, yorugʻlik) oʻzgartirilmaydi — Uzum 5.7: filtr va
 *   chalgʻituvchi sunʼiy intellekt tasviri taqiqlanadi; segmentatsiya faqat
 *   fonni olib tashlaydi.
 *
 * IMZO: `s` = HMAC-SHA256(STUDIYA_KALIT, `${r}\n${src}`). Imzosiz yoki
 * notoʻgʻri — 403: Worker begona rasm uchun Cloudflare Images limitini
 * (Free: oyiga 5 000 unique transformations) sarflamaydi. Imzoni Supabase
 * Edge Function beradi (`studiyaManzili`, `packages/shared/src/studiya.ts`).
 *
 * KESH: natija Cache API da (30 kun) — takror koʻrish yangi oʻzgartirish
 * emas. Cloudflare bir xil (manba + parametr) ni oyiga bir marta hisoblaydi.
 */

import { CHIQISH, OQ_CHEGARA, ZOND, imzo, manbaManzilimi, oqChetUlushi, rejimmi, tengmi } from './yadro.js';

export interface Env {
  IMAGES: ImagesBinding;
  STUDIYA_KALIT?: string;
}

/** Manba rasmining eng katta hajmi — Images binding chegarasi. */
const MANBA_MAX_BAYT = 20 * 1024 * 1024;

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Expose-Headers': 'X-Studiya-Rejim, X-Studiya-Oq, X-Studiya-Manba',
};

function xato(status: number, xabar: string, kod?: number): Response {
  return new Response(JSON.stringify({ xato: xabar, ...(kod !== undefined ? { kod } : {}) }), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function keshOmbori(): Cache | null {
  const c = (globalThis as { caches?: CacheStorage & { default?: Cache } }).caches;
  return c?.default ?? null;
}

async function ishla(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'GET') return xato(405, 'faqat GET');

  const u = new URL(req.url);
  if (u.pathname === '/salomat') {
    return new Response(JSON.stringify({ ok: true, kalit: Boolean(env.STUDIYA_KALIT) }), {
      headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const r = u.searchParams.get('r') ?? 'auto';
  const src = u.searchParams.get('src');
  const s = u.searchParams.get('s') ?? '';
  if (!rejimmi(r)) return xato(400, 'r: auto, pad yoki cut boʻlishi kerak');
  if (!manbaManzilimi(src)) return xato(400, 'src: http(s) manzil, 2 048 belgigacha');
  if (!env.STUDIYA_KALIT) return xato(503, 'STUDIYA_KALIT sozlanmagan');
  if (!tengmi(s, await imzo(env.STUDIYA_KALIT, r, src))) return xato(403, 'imzo notoʻgʻri');

  const kesh = keshOmbori();
  const keshKaliti = new Request(u.toString(), { method: 'GET' });
  if (kesh) {
    const bor = await kesh.match(keshKaliti);
    if (bor) return bor;
  }

  let manba: Response;
  try {
    manba = await fetch(src, {
      headers: { Accept: 'image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8', 'User-Agent': 'Mozilla/5.0 (compatible; SellerOS-Studiya/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    return xato(502, `manba yuklanmadi: ${String((e as Error)?.message ?? e).slice(0, 120)}`);
  }
  if (!manba.ok) return xato(502, `manba HTTP ${manba.status}`);
  const turi = manba.headers.get('content-type') ?? '';
  if (turi && !/^image\//i.test(turi) && !/octet-stream/i.test(turi)) return xato(415, `manba rasm emas (${turi.slice(0, 60)})`);
  const baytlar = new Uint8Array(await manba.arrayBuffer());
  if (baytlar.length === 0) return xato(502, 'manba boʻsh');
  if (baytlar.length > MANBA_MAX_BAYT) return xato(413, 'manba 20 MB dan katta');
  const oqim = (): ReadableStream<Uint8Array> => new Response(baytlar).body as ReadableStream<Uint8Array>;

  try {
    const info = await env.IMAGES.info(oqim());
    const olcham = 'width' in info && info.width && info.height ? `${info.width}x${info.height}` : 'nomaʼlum';

    let rejim: 'pad' | 'cut' = r === 'pad' ? 'pad' : 'cut';
    let oq: number | null = null;
    if (r === 'auto') {
      const zond = await env.IMAGES.input(oqim())
        .transform({ width: ZOND, height: ZOND, fit: 'squeeze' })
        .output({ format: 'rgb' });
      const px = new Uint8Array(await new Response(zond.image()).arrayBuffer());
      oq = oqChetUlushi(px, ZOND, ZOND);
      rejim = oq >= OQ_CHEGARA ? 'pad' : 'cut';
    }

    let t = env.IMAGES.input(oqim());
    t = rejim === 'cut'
      ? t.transform({ segment: 'foreground' }).transform({ trim: 'border' })
      : t.transform({ trim: { border: { color: '#FFFFFF', tolerance: 225, keep: 0 } } });
    t = t
      .transform({ width: CHIQISH.eni - 2 * CHIQISH.chet, height: CHIQISH.boyi - 2 * CHIQISH.chet, fit: 'pad', background: '#FFFFFF' })
      .transform({ border: { color: '#FFFFFF', width: CHIQISH.chet } });
    const natija = await t.output({ format: 'image/jpeg', quality: CHIQISH.sifat, background: '#FFFFFF' });

    const javob = natija.response({
      headers: {
        ...CORS,
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=2592000, immutable',
        'Content-Disposition': 'inline; filename="selleros-studiya.jpg"',
        'X-Studiya-Rejim': rejim,
        'X-Studiya-Manba': olcham,
        ...(oq !== null ? { 'X-Studiya-Oq': oq.toFixed(3) } : {}),
      },
    });
    if (kesh) ctx.waitUntil(kesh.put(keshKaliti, javob.clone()));
    return javob;
  } catch (e) {
    const kod = (e as { code?: unknown })?.code;
    const xabar = String((e as Error)?.message ?? e).slice(0, 200);
    // 9412 — kirish rasm emas; boshqa kodlar (limit va h.k.) — Cloudflare xabari bilan.
    return xato(kod === 9412 ? 415 : 502, `Cloudflare Images: ${xabar}`, typeof kod === 'number' ? kod : undefined);
  }
}

export default {
  fetch: ishla,
} satisfies ExportedHandler<Env>;
