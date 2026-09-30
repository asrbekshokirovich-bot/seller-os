/**
 * 9-qadam — Studiya: tovar suratlari OQ FONDA, Uzum talabiga moslab.
 *
 * NAZORATCHI QARORI (2026-09-29):
 *   - fonni Cloudflare Images (`segment=foreground`, BiRefNet) olib tashlaydi;
 *   - "hamma rasm kesilishi shart emas" — foni allaqachon oq surat faqat
 *     3:4 ga keltiriladi, kesilmaydi (Worker oʻzi aniqlaydi);
 *   - "iloji boricha studiyaga ishi tushmasin" — sotuvchi suratga olmasin.
 *
 * MANBA — SOTUVCHI OLADIGAN TOVARNING OʻZ SURATLARI (2026-09-30).
 * Tanlangan 1688 taklifining toʻliq tafsiloti (`offerIds` rejimi) uning
 * GALEREYASINI beradi — aynan shu tovar, turli burchakdan. Yetmasa —
 * oʻxshash 1688 takliflarining asosiy suratlari.
 *
 * NEGA INTERNET (Google Lens) EMAS. Jonli sinov (2026-09-30, ikki sumka):
 * "oʻxshash suratlar" (`visual_matches`) BOSHQA tovarlarni berdi —
 * Jacquemus, Louis Vuitton, Tod's, Coach sumkalari, hatto qizil gilamdagi
 * aktrisa surati. Bunday surat kartochkada chalgʻituvchi (Uzum 5.7) va
 * brend/mualliflik huquqini buzadi. "Aynan bir xil surat" (`exact_matches`)
 * esa toʻliq suratni umuman bermaydi (aktor hujjati: `image` — null).
 *
 * Bu modul: surat talablari faktlari (`uzum.surat.*`, 0059), taklif
 * tafsiloti soʻrovi va javobini oʻqish, nomzodlarni saralash, Worker
 * manzilini HMAC bilan imzolash. Rasmga tegmaydi — piksel ishi Worker da
 * (`apps/studiya-worker`).
 *
 * QOIDALAR §4: fakt yoʻq — `null` va `yetishmaydi`; taxmin yoʻq.
 */

import { faktMatn, faktSon, type Faktlar } from './fakt.ts';
import { APIFY_AKTOR, APIFY_MANZIL, type ProvayderSorovi } from './xitoy.ts';

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

/**
 * `1688-tanlov` — siz tanlagan taklifning asosiy surati; `1688-galereya` —
 * oʻsha taklifning qolgan suratlari (aynan shu tovar); `1688-oxshash` —
 * boshqa 1688 sotuvchisining oʻxshash taklifi (tovar bir xilligini tekshiring).
 */
export type SuratManbasi = '1688-tanlov' | '1688-galereya' | '1688-oxshash';

export interface SuratNomzodi {
  manba: SuratManbasi;
  /** Asl rasm manzili (toʻliq oʻlcham). */
  asl: string;
  /** Qayerdan: bugun doim "1688". */
  sayt: string | null;
  eni: number | null;
  boyi: number | null;
  nom: string | null;
}

/**
 * Surat olinmaydigan saytlar. `uzum.uz` — Uzum 2.12: boshqa Uzum doʻkoni
 * suv belgisi boʻlgan surat shikoyatda HUJJATSIZ bloklanadi; bundan
 * tashqari bu raqobatchining ishi. Manbalar bugun faqat 1688 — bu himoya.
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
  const toliq = t.startsWith('//') ? `https:${t}` : t;
  if (toliq.length > 2048 || !/^https?:\/\/\S+$/i.test(toliq)) return null;
  return toliq;
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

/**
 * Takrorni topish kaliti. Bitta 1688 surati turli yoʻl bilan keladi
 * (`…/img/ibank/O1CN01…jpg` va `…/O1CN01…jpg`) — alicdn da fayl nomi
 * yagona, shuning uchun kalit — fayl nomi. Boshqa saytda — toʻliq manzil.
 */
export function rasmKaliti(url: string): string {
  const asl = aslRasmManzili(url);
  if (!/alicdn\.com\//i.test(asl)) return asl;
  const nom = asl.split(/[?#]/)[0]!.split('/').pop();
  return nom ? `alicdn:${nom.toLowerCase()}` : asl;
}

// ==================================================================== 1688 taklif tafsiloti (galereya)

/**
 * Taklif tafsiloti — `crawleast~1688-image-search-scraper` ning `offerIds`
 * rejimi (5-qadam aktori): rasm qidiruvisiz, maʼlum taklif raqamlari
 * boʻyicha toʻliq tafsilot; yurishda 400 tagacha. Narx — yetkazilgan har
 * tafsilot $0.003, yetkazilmagani bepul (aktor README va dataset sxemasi,
 * build 0.3.30, oʻlchandi 2026-09-30). Aktor kiritmasida `maxTotalChargeUsd` ≥ 0.04.
 */
export const TAFSILOT_NARX_USD = 0.003;
export const TAFSILOT_BYUDJET_MIN_USD = 0.04;
/** Bitta yurishda koʻpi bilan shuncha taklif (xarajat shifti; suhbatda tovar kam boʻladi). */
export const TAFSILOT_YURISH_MAX = 20;
/** Bitta taklifdan olinadigan galereya suratlari chegarasi. */
export const GALEREYA_MAX = 12;

export function tafsilotByudjetiUsd(soni: number): number {
  const n = Math.max(0, Math.trunc(soni));
  return Math.max(TAFSILOT_BYUDJET_MIN_USD, Math.round((0.01 + TAFSILOT_NARX_USD * n) * 1000) / 1000);
}

export function tafsilotSorovi(kalit: string, offerIds: string[]): ProvayderSorovi {
  const ids = [...new Set(offerIds.map((x) => String(x).trim()).filter((x) => /^\d{5,20}$/.test(x)))].slice(0, TAFSILOT_YURISH_MAX);
  return {
    url: `${APIFY_MANZIL}/acts/${APIFY_AKTOR}/runs?timeout=300`,
    init: {
      method: 'POST',
      headers: { Authorization: `Bearer ${kalit}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerIds: ids, maxTotalChargeUsd: tafsilotByudjetiUsd(ids.length) }),
    },
  };
}

/** 72 soatlik kesh (`selleros.xitoy_kesh`) kaliti — 1688 qidiruvi natijalari bilan aralashmaydi. */
export function tafsilotKeshKaliti(offerId: string): string {
  return `1688-tafsilot:${offerId}`;
}

export interface TaklifTafsiloti {
  offerId: string;
  /** Taklif galereyasi — toʻliq oʻlcham, takrorsiz, `GALEREYA_MAX` gacha. */
  rasmlar: string[];
  /** Taklif videosi (boʻlsa). */
  video: string | null;
  /** Aktor: `full` / `partial` / `minimal`. */
  sifat: 'full' | 'partial' | 'minimal' | null;
}

export interface TafsilotOqish {
  tafsilotlar: TaklifTafsiloti[];
  xato: string | null;
}

function obyekt(x: unknown): Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {};
}

/** Galereya roʻyxati: faqat http(s), toʻliq oʻlcham, takrorsiz, Uzum saytidan emas. */
export function galereyaRasmlari(xom: unknown, max = GALEREYA_MAX): string[] {
  if (!Array.isArray(xom)) return [];
  const natija: string[] = [];
  const korilgan = new Set<string>();
  for (const x of xom) {
    const u = httpManzil(x);
    if (u === null || taqiqlanganmi(u)) continue;
    const asl = aslRasmManzili(u);
    const k = rasmKaliti(asl);
    if (korilgan.has(k)) continue;
    korilgan.add(k);
    natija.push(asl);
    if (natija.length >= max) break;
  }
  return natija;
}

/**
 * Dataset: bitta `{type:"offerIdsResult", requested, delivered, products:[…]}`
 * qatori; har `products[]` — toʻliq tafsilot (`offerId`, `images`,
 * `videoUrl`, `dataQuality`, …). Bir nechta qator boʻlsa — oxirgisi.
 */
export function tafsilotlarniOqi(json: unknown): TafsilotOqish {
  if (!Array.isArray(json)) return { tafsilotlar: [], xato: 'provayder javobi roʻyxat emas' };
  const qator = [...json].reverse().map(obyekt).find((q) => q.type === 'offerIdsResult');
  if (!qator) return { tafsilotlar: [], xato: 'provayder tafsilot qatorini bermadi' };
  const tafsilotlar: TaklifTafsiloti[] = [];
  for (const p of Array.isArray(qator.products) ? qator.products : []) {
    const d = obyekt(p);
    const id = typeof d.offerId === 'string' || typeof d.offerId === 'number' ? String(d.offerId) : null;
    if (id === null) continue;
    const sifat = d.dataQuality === 'full' || d.dataQuality === 'partial' || d.dataQuality === 'minimal' ? d.dataQuality : null;
    tafsilotlar.push({ offerId: id, rasmlar: galereyaRasmlari(d.images), video: httpManzil(d.videoUrl), sifat });
  }
  return { tafsilotlar, xato: null };
}

// ==================================================================== saralash

/** Bir tovarga koʻpi bilan shuncha surat (Cloudflare oylik bepul limiti: har surat 1–2 oʻzgartirish). */
export const STUDIYA_NOMZOD_MAX = 8;

export interface Taklif1688 {
  rasmUrl: string | null;
  title: string | null;
}

/**
 * Nomzodlar tartibi: tanlangan taklifning asosiy surati → oʻsha taklif
 * galereyasi (aynan shu tovar) → joy qolsa oʻxshash 1688 takliflari.
 * Takror (turli manzilli bir xil fayl) va Uzum surati olinmaydi.
 */
export function studiyaNomzodlari(
  q: { tanlov: Taklif1688 | null; galereya: string[]; oxshash: Taklif1688[] },
  max = STUDIYA_NOMZOD_MAX,
): SuratNomzodi[] {
  const natija: SuratNomzodi[] = [];
  const korilgan = new Set<string>();
  const qosh = (manba: SuratManbasi, url: unknown, nom: string | null): void => {
    const u = httpManzil(url);
    if (u === null || natija.length >= max || taqiqlanganmi(u)) return;
    const asl = aslRasmManzili(u);
    const k = rasmKaliti(asl);
    if (korilgan.has(k)) return;
    korilgan.add(k);
    natija.push({ manba, asl, sayt: '1688', eni: null, boyi: null, nom });
  };
  if (q.tanlov) qosh('1688-tanlov', q.tanlov.rasmUrl, q.tanlov.title);
  for (const r of q.galereya) qosh('1688-galereya', r, q.tanlov?.title ?? null);
  for (const t of q.oxshash) qosh('1688-oxshash', t.rasmUrl, t.title);
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
