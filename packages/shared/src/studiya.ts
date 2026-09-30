/**
 * 9-qadam — Studiya: tovar suratlari OQ FONDA, Uzum talabiga moslab.
 *
 * NAZORATCHI QARORI (2026-09-29):
 *   - fonni Cloudflare Images (`segment=foreground`, BiRefNet) olib tashlaydi;
 *   - "hamma rasm kesilishi shart emas" — foni allaqachon oq surat faqat
 *     3:4 ga keltiriladi, kesilmaydi (Worker oʻzi aniqlaydi);
 *   - manba: 1688 (tanlangan taklif + oʻxshash takliflar) VA internet
 *     (Google Lens teskari qidiruvi) — "iloji boricha studiyaga ishi tushmasin".
 *
 * Bu modul: surat talablari faktlari (`uzum.surat.*`, 0059), nomzodlarni
 * yigʻish va saralash, Google Lens (Apify) soʻrovi va javobini oʻqish,
 * Worker manzilini HMAC bilan imzolash. Rasmga tegmaydi — piksel ishi
 * Worker da (`apps/studiya-worker`).
 *
 * QOIDALAR §4: fakt yoʻq — `null` va `yetishmaydi`; taxmin yoʻq.
 */

import { faktMatn, faktSon, type Faktlar } from './fakt.js';
import { APIFY_MANZIL, type ProvayderSorovi } from './xitoy.js';

// ==================================================================== surat talablari (faktlar)

export const SURAT_KALITLARI = [
  'uzum.surat.format', 'uzum.surat.min_eni', 'uzum.surat.min_boyi', 'uzum.surat.nisbat', 'uzum.surat.max_mb',
  'uzum.surat.tovar_ulush_min', 'uzum.surat.qoidalar', 'uzum.surat.fotostudiya', 'uzum.surat.qollanma.url',
  'uzum.kartochka.qoidalar', 'uzum.kartochka.qollanma.url',
] as const;

export interface SuratTalablari {
  format: string | null;
  minEni: number | null;
  minBoyi: number | null;
  nisbat: string | null;
  maxMb: number | null;
  /** Tovar kadrning shuncha foizidan koʻpini egallashi kerak. */
  tovarUlushMin: number | null;
  qoidalar: string[];
  fotostudiya: string | null;
  qollanmaUrl: string | null;
  kartochkaQoidalari: string[];
  kartochkaQollanmaUrl: string | null;
  manba: string | null;
  olchandi: string | null;
  yetishmaydi: string[];
}

function manzil(x: string | null): string | null {
  return x !== null && /^https?:\/\/\S+$/i.test(x) ? x : null;
}

function matnlar(x: unknown): string[] {
  return Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string' && s.trim() !== '').map((s) => s.trim()) : [];
}

export function suratTalablari(f: Faktlar): SuratTalablari {
  const q = f['uzum.surat.min_eni'];
  const t: SuratTalablari = {
    format: faktMatn(f, 'uzum.surat.format'),
    minEni: faktSon(f, 'uzum.surat.min_eni'),
    minBoyi: faktSon(f, 'uzum.surat.min_boyi'),
    nisbat: faktMatn(f, 'uzum.surat.nisbat'),
    maxMb: faktSon(f, 'uzum.surat.max_mb'),
    tovarUlushMin: faktSon(f, 'uzum.surat.tovar_ulush_min'),
    qoidalar: matnlar(f['uzum.surat.qoidalar']?.qiymat),
    fotostudiya: faktMatn(f, 'uzum.surat.fotostudiya'),
    qollanmaUrl: manzil(faktMatn(f, 'uzum.surat.qollanma.url')),
    kartochkaQoidalari: matnlar(f['uzum.kartochka.qoidalar']?.qiymat),
    kartochkaQollanmaUrl: manzil(faktMatn(f, 'uzum.kartochka.qollanma.url')),
    manba: q?.manba ?? null,
    olchandi: q?.olchandi ?? null,
    yetishmaydi: [],
  };
  if (t.minEni === null || t.minBoyi === null) t.yetishmaydi.push('surat ruxsati');
  if (t.nisbat === null) t.yetishmaydi.push('surat nisbati');
  if (t.maxMb === null) t.yetishmaydi.push('surat hajmi');
  if (t.qoidalar.length === 0) t.yetishmaydi.push('surat qoidalari');
  if (t.kartochkaQoidalari.length === 0) t.yetishmaydi.push('kartochka qoidalari');
  return t;
}

/**
 * Studiya chiqishi: 1200 × 1600 JPEG (3:4), oq fon, tovar ichki qutida
 * (har tomonda 48 px). Uzum minimumidan (750 × 1000) katta — moderator
 * "sovunlangan" deb qaytarmasin. Oʻzgartirilsa `apps/studiya-worker/src/yadro.ts`
 * dagi `CHIQISH` ham oʻzgaradi (test ikkalasini solishtiradi).
 */
export const STUDIYA_CHIQISH = { eni: 1200, boyi: 1600, chet: 48, sifat: 90 } as const;

/** Chiqish fakt talabiga mosmi: ruxsat ≥ minimum va nisbat aynan 3:4. Fakt yoʻq — `null`. */
export function chiqishTalabgaMosmi(t: SuratTalablari): boolean | null {
  if (t.minEni === null || t.minBoyi === null) return null;
  return STUDIYA_CHIQISH.eni >= t.minEni && STUDIYA_CHIQISH.boyi >= t.minBoyi
    && STUDIYA_CHIQISH.eni * 4 === STUDIYA_CHIQISH.boyi * 3;
}

// ==================================================================== nomzodlar

export type SuratManbasi = '1688-tanlov' | '1688-oxshash' | 'internet';

export interface SuratNomzodi {
  manba: SuratManbasi;
  /** Asl rasm manzili (toʻliq oʻlcham). */
  asl: string;
  /** Qayerdan: "1688" yoki sayt nomi (internet). */
  sayt: string | null;
  eni: number | null;
  boyi: number | null;
  nom: string | null;
}

/**
 * Surat olinmaydigan saytlar. `uzum.uz` — Uzum 2.12: boshqa Uzum doʻkoni
 * suv belgisi boʻlgan surat shikoyatda HUJJATSIZ bloklanadi; bundan
 * tashqari bu raqobatchining ishi.
 */
export const TAQIQLANGAN_SAYTLAR: readonly string[] = ['uzum.uz'];

export function saytNomi(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h.startsWith('www.') ? h.slice(4) : h;
  } catch {
    return null;
  }
}

export function taqiqlanganmi(url: string | null | undefined): boolean {
  const h = saytNomi(url);
  if (h === null) return false;
  return TAQIQLANGAN_SAYTLAR.some((d) => h === d || h.endsWith(`.${d}`));
}

function httpManzil(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const t = x.trim();
  if (t.length > 2048 || !/^https?:\/\/\S+$/i.test(t)) return null;
  return t.startsWith('//') ? `https:${t}` : t;
}

/**
 * alicdn eskiz qoʻshimchalari olib tashlanadi — toʻliq oʻlcham:
 * `…cib.jpg_220x220.jpg` → `…cib.jpg`, `…cib.jpg_.webp` → `…cib.jpg`,
 * `…_sum.jpg` → `….jpg`. Boshqa manzillar oʻzgarmaydi.
 */
export function aslRasmManzili(url: string): string {
  if (!/alicdn\.com\//i.test(url)) return url;
  return url
    .replace(/(\.(?:jpe?g|png|webp))_(?:\d+x\d+[^/?#]*|\.webp|\.avif)$/i, '$1')
    .replace(/_sum(\.(?:jpe?g|png|webp))$/i, '$1');
}

function son(x: unknown): number | null {
  if (typeof x === 'number') return Number.isFinite(x) && x > 0 ? x : null;
  if (typeof x === 'string' && x.trim() !== '') {
    const n = Number(x);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

// ==================================================================== Google Lens (Apify)

/** Google Lens teskari qidiruvi — Apify aktori (oʻlchandi 2026-09-29, build 0.0.73). */
export const LENS_AKTOR = 'johnvc~google-lens-api';
/** Bitta rasmga shuncha oʻxshash natija. */
export const LENS_NATIJA_MAX = 20;
/** Yurish uchun xarajat shifti: $0.0003 × 20 + dataset + start ≈ $0.007. */
export const LENS_BYUDJET_USD = 0.02;
/** Internet suratining kichik tomoni shundan kam boʻlsa olinmaydi (1200 × 1600 ga choʻzilsa xira boʻladi). */
export const LENS_MIN_OLCHAM = 600;

/**
 * Lens natijalari `selleros.xitoy_kesh` da saqlanadi (72 soat) — kalit
 * `lens:` bilan boshlanadi, 1688 natijalari bilan aralashmaydi.
 */
export function lensKeshKaliti(rasmUrl: string): string {
  return `lens:${aslRasmManzili(rasmUrl)}`;
}

export function lensBoshlashSorovi(kalit: string, rasmUrl: string): ProvayderSorovi {
  return {
    url: `${APIFY_MANZIL}/acts/${LENS_AKTOR}/runs?maxTotalChargeUsd=${LENS_BYUDJET_USD}&timeout=180`,
    init: {
      method: 'POST',
      headers: { Authorization: `Bearer ${kalit}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: rasmUrl, search_type: 'visual_matches', max_results: LENS_NATIJA_MAX }),
    },
  };
}

export interface LensOqish {
  nomzodlar: SuratNomzodi[];
  /** Olinmagan qatorlar: manzilsiz, kichik, taqiqlangan saytdan yoki takror. */
  tashlandi: number;
  /** Aktor `resultType: "error"` qatori berdi. */
  xato: string | null;
}

/**
 * Lens dataset qatorlari → nomzodlar. Qator: `{position, title, source, url,
 * thumbnail, image, imageWidth, imageHeight}`; xato — `{resultType:"error", …}`.
 * Natijasiz qidiruv — boʻsh massiv (xato emas).
 */
export function lensNatijalariniOqi(json: unknown): LensOqish {
  const r: LensOqish = { nomzodlar: [], tashlandi: 0, xato: null };
  if (!Array.isArray(json)) return { ...r, xato: 'provayder javobi roʻyxat emas' };
  const korilgan = new Set<string>();
  for (const x of json) {
    const q = x !== null && typeof x === 'object' ? (x as Record<string, unknown>) : {};
    if (q.resultType === 'error') {
      const m = typeof q.message === 'string' ? q.message : typeof q.error === 'string' ? q.error : 'nomaʼlum xato';
      r.xato = r.xato ?? m.slice(0, 200);
      continue;
    }
    const image = httpManzil(q.image);
    const sahifa = httpManzil(q.url);
    if (image === null || taqiqlanganmi(image) || taqiqlanganmi(sahifa)) { r.tashlandi += 1; continue; }
    const eni = son(q.imageWidth);
    const boyi = son(q.imageHeight);
    if (eni !== null && boyi !== null && Math.min(eni, boyi) < LENS_MIN_OLCHAM) { r.tashlandi += 1; continue; }
    const asl = aslRasmManzili(image);
    if (korilgan.has(asl)) { r.tashlandi += 1; continue; }
    korilgan.add(asl);
    const source = typeof q.source === 'string' && q.source.trim() ? q.source.trim().slice(0, 80) : null;
    const nom = typeof q.title === 'string' && q.title.trim() ? q.title.trim().slice(0, 200) : null;
    r.nomzodlar.push({ manba: 'internet', asl, sayt: source ?? saytNomi(sahifa ?? image), eni, boyi, nom });
  }
  return r;
}

// ==================================================================== saralash

/** Bir tovarga koʻpi bilan shuncha surat (Cloudflare oylik bepul limiti: har surat 1–2 oʻzgartirish). */
export const STUDIYA_NOMZOD_MAX = 8;

export interface Taklif1688 {
  rasmUrl: string | null;
  title: string | null;
}

/**
 * Nomzodlar tartibi: tanlangan 1688 taklifi (sotuvchi aynan shuni oladi) →
 * internetdan 4 tagacha → oʻxshash 1688 takliflaridan 3 tagacha → qolgan
 * joy internet, keyin 1688 bilan toʻldiriladi. Takror manzil olinmaydi.
 */
export function studiyaNomzodlari(
  q: { tanlov: Taklif1688 | null; oxshash: Taklif1688[]; internet: SuratNomzodi[] },
  max = STUDIYA_NOMZOD_MAX,
): SuratNomzodi[] {
  const natija: SuratNomzodi[] = [];
  const korilgan = new Set<string>();
  const qosh = (n: SuratNomzodi | null): void => {
    if (n === null || natija.length >= max) return;
    const kalit = aslRasmManzili(n.asl);
    if (korilgan.has(kalit) || taqiqlanganmi(kalit)) return;
    korilgan.add(kalit);
    natija.push({ ...n, asl: kalit });
  };
  const bir1688 = (t: Taklif1688, manba: SuratManbasi): SuratNomzodi | null => {
    const u = httpManzil(t.rasmUrl);
    return u === null ? null : { manba, asl: u, sayt: '1688', eni: null, boyi: null, nom: t.title };
  };
  if (q.tanlov) qosh(bir1688(q.tanlov, '1688-tanlov'));
  q.internet.slice(0, 4).forEach(qosh);
  q.oxshash.slice(0, 3).forEach((t) => qosh(bir1688(t, '1688-oxshash')));
  q.internet.slice(4).forEach(qosh);
  q.oxshash.slice(3).forEach((t) => qosh(bir1688(t, '1688-oxshash')));
  return natija;
}

// ==================================================================== Worker manzili (HMAC)

export type StudiyaRejim = 'auto' | 'pad' | 'cut';

function hex(b: ArrayBuffer): string {
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Imzo: HMAC-SHA256(kalit, `${rejim}\n${src}`), hex. Worker xuddi shunday
 * hisoblaydi (`apps/studiya-worker/src/yadro.ts`) — imzosiz manzil ishlamaydi,
 * ya'ni Worker begona rasm uchun Cloudflare limitini sarflamaydi.
 */
export async function studiyaImzosi(kalit: string, rejim: StudiyaRejim, src: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(kalit), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(`${rejim}\n${src}`)));
}

export async function studiyaManzili(asos: string, kalit: string, src: string, rejim: StudiyaRejim = 'auto'): Promise<string> {
  const s = await studiyaImzosi(kalit, rejim, src);
  return `${asos.replace(/\/+$/, '')}/?r=${rejim}&src=${encodeURIComponent(src)}&s=${s}`;
}
