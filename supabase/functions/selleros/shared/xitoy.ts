/**
 * Xitoydan topish — B4 (Usta 4-qadam) va suhbatning 5-qadami.
 *
 * Rasm-qidiruv: Uzumdagi tovar rasmi → 1688.com dan oʻxshash tovarlar.
 *
 * PROVAYDER — Apify aktori `crawleast/1688-image-search-scraper`
 * (nazoratchi qarori, 2026-09-25: TMAPI oʻrniga — kichik hajmda bepul
 * reja ($5/oy) yetadi). Oʻlchandi, aktorning ochiq taʼrifidan
 * (api.apify.com/v2/acts/crawleast~1688-image-search-scraper, build
 * ONMAZKhWDbBJ6nnHA, dataset sxemasi):
 *
 *   narx: $0.005 bir rasm qidiruvi (≥1 natija boʻlsa) + $0.01 bir yurish;
 *         0 ta natija, yiqilgan yuklash, risk-control — pulsiz.
 *   kirish: {imageUrls[], maxImages, maxResultsPerImage(1–20),
 *            enrichDetails, maxTotalChargeUsd}
 *   chiqish (dataset): har rasm uchun bitta qator
 *     {type:'imageResult', queryImage:{url}, status:'OK'|'RISK_CONTROL'|…,
 *      matchCount, results:[karta…], error?}
 *     karta: offerId, similarityRank, title, priceYuan, consignPriceYuan,
 *            moq, bookedCount, supplier{name,city,province,yearsOnPlatform,
 *            compositeScore,isFactory,isSuperFactory}, imageUrl, detailUrl
 *   API: POST /v2/acts/{aktor}/runs (201 {data:{id,status,defaultDatasetId}}),
 *        GET /v2/actor-runs/{id} ({data:{status}}),
 *        GET /v2/actor-runs/{id}/dataset/items?clean=true (massiv);
 *        xato: {error:{type,message}} — 401 invalid-token, 402 balans.
 *
 * NEGA ASINXRON. Bitta qidiruv 30–90 soniya (README). Chat soʻrovi
 * Vercel'da 10 soniyada uziladi, Edge Function ham cheklangan. Shuning
 * uchun: `xitoyQidiruvniBoshla` yurishni boshlaydi va `runId` qaytaradi,
 * `xitoyQidiruvniTekshir` holatni soʻraydi va tugagach natijani oʻqiydi.
 * Chaqiruvchi (chat, kengaytma) `runId` ni saqlab, vaqti-vaqti bilan
 * tekshiradi. Bir yurishga bir nechta rasm sigʻadi (bitta $0.01).
 *
 * BU MODUL `fetch` NI HAM, MUHITNI HAM BILMAYDI. Ikkalasi argument
 * bilan keladi — Edge Function, Fastify va test bir xil kodni
 * chaqiradi, kalit esa faqat chaqiruvchida (QOIDALAR §3: sirlar env da).
 *
 * JIM OʻLIM YOʻQ (QOIDALAR §8). Provayder xatosi `xato` bilan qaytadi,
 * boʻsh roʻyxat bilan EMAS. Nol natija — bu JAVOB ("1688 oʻxshashini
 * topmadi") va u `xato: null` bilan ajralib turadi. Kartalar kelib,
 * birortasi oʻqilmasa — bu ham XATO (javob shakli oʻzgargan), javob emas.
 *
 * RASM BASE64 BILAN (2026-09-26). Jonli oʻlchov: 1688 ning oʻz JPEG
 * rasmi URL bilan → 20 ta natija; Uzum rasmi URL bilan → 0 ta (ikki
 * tovar). Uzum CDN faqat WebP beradi (`.jpg` nomiga qaramay, `Accept`
 * ga qaramay; JPEG varianti yoʻq — serverdan oʻlchandi). Shuning uchun
 * rasm avval BIZ tomonda yuklanadi (`rasmYuklovchi`) va aktorga
 * `imagesBase64` bilan beriladi — 1688 rasmni Uzum CDN dan oʻzi
 * olishiga bogʻliq qolmaymiz. Natija rasmga `queryImage.sha256Prefix16`
 * (biz hisoblagan SHA-256 bilan solishtiriladi) yoki `img-N` tartib
 * raqami bilan bogʻlanadi. Aktor tashxisi (`imageType`, `imageBytes`,
 * `fetchChannel`) javobga chiqadi — 0 natijaning sababi koʻrinsin.
 *
 * WEBP → JPEG (2026-09-26, jonli oʻlchov): oʻsha Uzum rasmi base64 WebP
 * bilan → 0 ta; JPEG qilib (weserv.nl proksi) → 20 ta, aynan oʻsha tovar.
 * Yaʼni 1688 WebP ni qabul qilmaydi. Endi yuklangan rasm WebP boʻlsa
 * ochiq rasm-proksi (`images.weserv.nl`, `output=jpg`) orqali JPEG
 * olinadi; proksi yiqilsa WebP bilan davom etiladi va `ogirildi:false`
 * + tashxis rostini aytadi. Kesh kaliti — asl Uzum URL.
 */

/** 1688 dan topilgan tovar. Hamma raqam provayder javobidan, hech narsa hisoblanmaydi. */
export interface XitoyTovar {
  /** 1688 taklif IDsi (`offerId`). */
  sourceId: string;
  /** Xitoycha nom (`title`) — manba shu, tarjima emas. */
  title: string;
  /** Ulgurji narx, yuan (`priceYuan`). */
  narxYuan: number;
  /** Tovar rasmi (`imageUrl`). `null` — provayder bermadi; oʻrniga harf turadi. */
  rasmUrl: string | null;
  /** Minimal buyurtma miqdori (`moq`). `null` — provayder bermadi (nol EMAS). */
  moq: number | null;
  /** Sotuvchi umumiy balli (`supplier.compositeScore`). `null` — yoʻq. */
  reyting: number | null;
  manba: '1688';
  /** 1688 sahifasi (`detailUrl`), faqat http(s). */
  manzil: string | null;
  /** Rasmga oʻxshashlik oʻrni (`similarityRank`): 1 — eng yaqin. */
  oxshashlikOrni: number | null;
  /** Bir dona (dropship) narxi, yuan (`consignPriceYuan`). */
  dropshipNarxYuan: number | null;
  /** Buyurtmalar soni (`bookedCount`) — jami, davri provayderda yozilmagan. */
  buyurtmalar: number | null;
  /** Ishlab chiqaruvchi (`supplier.isFactory`). */
  zavod: boolean | null;
  /** 1688 "Super Factory" belgisi (`supplier.isSuperFactory`). */
  superZavod: boolean | null;
  /** Sotuvchi kompaniya (`supplier.name`, xitoycha). */
  sotuvchi: string | null;
  /** Joylashuvi (`supplier.province` + `city`). */
  joy: string | null;
  /** Sotuvchi 1688 da necha yil (`supplier.yearsOnPlatform`). */
  dokonYili: number | null;
}

export const APIFY_MANZIL = 'https://api.apify.com/v2';
export const APIFY_AKTOR = 'crawleast~1688-image-search-scraper';

/** Aktor chegaralari (README, 2026-09-25): 1–20 natija/rasm, 20 rasm/yurish. */
export const XITOY_SAHIFA_MAX = 20;
export const XITOY_RASM_MAX = 10;

/**
 * Narxlar — aktor taʼrifidan (`pricingInfos`, FREE tier), USD.
 * Byudjet shifti shundan yasaladi; provayder oʻzi ham shu shiftni
 * majburlaydi (`maxTotalChargeUsd`).
 */
export const APIFY_NARX = {
  qidiruvUsd: 0.005,
  yurishUsd: 0.01,
  /** Aktor qabul qiladigan eng kichik shift. */
  engKamShiftUsd: 0.04,
} as const;

/** Bir yurish uchun shift: rasmlar + yurish haqi, kichik zaxira bilan. */
export function yurishByudjetiUsd(rasmlarSoni: number): number {
  const hisob = APIFY_NARX.yurishUsd + rasmlarSoni * APIFY_NARX.qidiruvUsd + 0.01;
  return Math.max(APIFY_NARX.engKamShiftUsd, Math.round(hisob * 100) / 100);
}

/** Apify xato turlari — hujjatdan; matn obunachi uchun. */
export const APIFY_XATO_IZOHI: Readonly<Record<string, string>> = {
  'invalid-token': 'Apify kaliti notoʻgʻri',
  'token-not-found': 'Apify kaliti notoʻgʻri',
  'x402-payment-required': 'Apify balansi yetarli emas',
  'insufficient-credit': 'Apify balansi yetarli emas',
  'invalid-input': 'soʻrov kiritmasi notoʻgʻri',
  'record-not-found': 'yurish topilmadi',
  'actor-not-found': 'aktor topilmadi',
};

// ==================================================================== yordamchilar

/** Son yoki `null`. `Number("")` NOL — shuning uchun boʻshlik alohida. */
function son(x: unknown): number | null {
  if (typeof x === 'number') return Number.isFinite(x) ? x : null;
  if (typeof x !== 'string' || x.trim() === '') return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function matn(x: unknown): string | null {
  return typeof x === 'string' && x.trim() !== '' ? x : null;
}

function mantiq(x: unknown): boolean | null {
  return typeof x === 'boolean' ? x : null;
}

type Xom = Record<string, unknown>;
const obyekt = (x: unknown): Xom => (x !== null && typeof x === 'object' && !Array.isArray(x) ? (x as Xom) : {});

/**
 * Faqat http(s) manzil. Provayder javobi ISHONCHSIZ kirish: `javascript:`
 * yoki `data:` sxemali "manzil" kengaytmada havola boʻlib chizilsa, u
 * uzum.uz sahifasida kod boʻlib ishlardi (XSS). Sxema shu yerda, bitta
 * joyda kesiladi — chizuvchilar (kengaytma, web) unga tayanadi.
 */
function httpManzil(x: unknown): string | null {
  const m = matn(x);
  if (m === null) return null;
  // Protokolsiz manzil (`//cbu01.alicdn.com/…`) — CDN larda odatiy;
  // https bilan toʻldiriladi, tashlanmaydi.
  const toliq = m.startsWith('//') ? `https:${m}` : m;
  try {
    const u = new URL(toliq);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

/**
 * Tashqaridan kelgan rasm manzili (kengaytma, obunachi): faqat http(s),
 * 2048 belgigacha. U provayderga BIZNING kalit bilan ketadi va kesh
 * kaliti boʻladi — shuning uchun elak shu yerda, bitta joyda.
 */
export function rasmManzili(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const t = x.trim();
  if (t.length === 0 || t.length > 2048) return null;
  try {
    const u = new URL(t);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

// ==================================================================== rasm yuklash

/** Biz yuklab, base64 qilgan rasm. */
export interface YuklanganRasm {
  base64: string;
  fileName: string;
  /** Toʻliq SHA-256 (hex) — YUBORILGAN baytlarniki. Aktor `sha256Prefix16` — birinchi 16 belgi. */
  sha256: string;
  bayt: number;
  /** Sehrli baytlardan: jpeg / png / webp / null. */
  tur: 'jpeg' | 'png' | 'webp' | null;
  /** WebP dan JPEG ga proksi orqali oʻgirildi. */
  ogirildi: boolean;
}

/**
 * WebP → JPEG proksi manzili (images.weserv.nl, ochiq, kalitsiz).
 * `url=` sxemasiz beriladi (jonli oʻlchandi: `images.uzum.uz/...` →
 * image/jpeg, FFD8FF). Kenglik 800 — 1688 qidiruvi uchun yetarli,
 * hajm ~130 KB.
 */
export function weservJpegManzili(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    const sxemasiz = `${u.host}${u.pathname}${u.search}`;
    return `https://images.weserv.nl/?url=${encodeURIComponent(sxemasiz)}&output=jpg&w=800&q=85`;
  } catch {
    return null;
  }
}

export type RasmYuklovchi = (url: string) => Promise<YuklanganRasm | null>;

/** Rasm turi sehrli baytlardan — CDN nomiga ishonilmaydi (Uzum `.jpg` deb WebP beradi). */
export function rasmTuri(b: Uint8Array): YuklanganRasm['tur'] {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
    && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp';
  return null;
}

function base64ga(b: Uint8Array): string {
  let s = '';
  const BOLAK = 0x8000;
  for (let i = 0; i < b.length; i += BOLAK) s += String.fromCharCode(...b.subarray(i, i + BOLAK));
  return btoa(s);
}

async function sha256hex(b: Uint8Array): Promise<string> {
  const kopiya = new Uint8Array(b).buffer as ArrayBuffer;
  const h = await crypto.subtle.digest('SHA-256', kopiya);
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Rasm yuklovchi — `fetch` argument bilan. Chegara: aktor "~1 MB" deydi.
 * Yuklanmasa `null` — chaqiruvchi URL bilan davom etadi (rostini
 * `usul` bilan aytib). WebP kelsa `jpegManzili` orqali JPEG olinadi
 * (standart — weserv); olinmasa WebP ketadi, `ogirildi: false`.
 */
export function rasmYuklovchi(
  f: typeof fetch,
  q: { maxBayt?: number; vaqtMs?: number; jpegManzili?: ((url: string) => string | null) | null } = {},
): RasmYuklovchi {
  const maxBayt = q.maxBayt ?? 1_000_000;
  const jpegManzili = q.jpegManzili === undefined ? weservJpegManzili : q.jpegManzili;
  const yukla = async (u: string): Promise<Uint8Array | null> => {
    try {
      const r = await f(u, { signal: AbortSignal.timeout(q.vaqtMs ?? 15_000), headers: { Accept: 'image/*' } });
      if (!r.ok) return null;
      const b = new Uint8Array(await r.arrayBuffer());
      return b.length === 0 || b.length > maxBayt ? null : b;
    } catch {
      return null;
    }
  };
  return async (url) => {
    let b = await yukla(url);
    if (b === null) return null;
    let tur = rasmTuri(b);
    let ogirildi = false;
    if (tur === 'webp' && jpegManzili) {
      const jm = jpegManzili(url);
      const j = jm === null ? null : await yukla(jm);
      if (j !== null && rasmTuri(j) === 'jpeg') { b = j; tur = 'jpeg'; ogirildi = true; }
    }
    const sha256 = await sha256hex(b);
    return { base64: base64ga(b), fileName: `${sha256.slice(0, 16)}.${tur ?? 'bin'}`, sha256, bayt: b.length, tur, ogirildi };
  };
}

// ==================================================================== soʻrov yasash

/** Yurishga beriladigan rasm: URL, yoki biz yuklagan base64. */
export interface RasmKirishi {
  url: string;
  yuklangan?: YuklanganRasm | null;
}

export interface ProvayderSorovi {
  url: string;
  init: { method: 'GET' | 'POST'; headers: Record<string, string>; body?: string };
}

function sarlavhalar(kalit: string, json = false): Record<string, string> {
  return { Authorization: `Bearer ${kalit}`, ...(json ? { 'Content-Type': 'application/json' } : {}) };
}

/**
 * Yurishni boshlash: bir nechta rasm bitta yurishda (bitta yurish haqi).
 * Yuklangan rasm `imagesBase64` bilan, qolgani `imageUrls` bilan ketadi.
 */
export function qidiruvniBoshlashSorovi(
  kalit: string,
  rasmlar: RasmKirishi[],
  q: { sahifaHajmi?: number } = {},
): ProvayderSorovi {
  const hajm = Math.min(XITOY_SAHIFA_MAX, Math.max(1, Math.trunc(q.sahifaHajmi ?? XITOY_SAHIFA_MAX)));
  const tanlangan = rasmlar.slice(0, XITOY_RASM_MAX);
  const imageUrls = tanlangan.filter((r) => !r.yuklangan).map((r) => r.url);
  const imagesBase64 = tanlangan
    .filter((r): r is RasmKirishi & { yuklangan: YuklanganRasm } => !!r.yuklangan)
    .map((r) => ({ base64: r.yuklangan.base64, fileName: r.yuklangan.fileName }));
  return {
    url: `${APIFY_MANZIL}/acts/${APIFY_AKTOR}/runs`,
    init: {
      method: 'POST',
      headers: sarlavhalar(kalit, true),
      body: JSON.stringify({
        ...(imageUrls.length ? { imageUrls } : {}),
        ...(imagesBase64.length ? { imagesBase64 } : {}),
        maxImages: tanlangan.length,
        maxResultsPerImage: hajm,
        enrichDetails: false,
        maxTotalChargeUsd: yurishByudjetiUsd(tanlangan.length),
      }),
    },
  };
}

export function runHolatiSorovi(kalit: string, runId: string): ProvayderSorovi {
  return { url: `${APIFY_MANZIL}/actor-runs/${encodeURIComponent(runId)}`, init: { method: 'GET', headers: sarlavhalar(kalit) } };
}

export function runNatijasiSorovi(kalit: string, runId: string): ProvayderSorovi {
  return {
    url: `${APIFY_MANZIL}/actor-runs/${encodeURIComponent(runId)}/dataset/items?clean=true`,
    init: { method: 'GET', headers: sarlavhalar(kalit) },
  };
}

// ==================================================================== javobni oʻqish

/** Apify yurish holatlari (hujjat). */
export type ApifyRunHolati =
  | 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMING-OUT' | 'TIMED-OUT' | 'ABORTING' | 'ABORTED';

const YAKUNIY_XATO: ReadonlySet<string> = new Set(['FAILED', 'TIMING-OUT', 'TIMED-OUT', 'ABORTING', 'ABORTED']);

export type ApifyRunOqish =
  | { ok: true; runId: string; holat: string }
  | { ok: false; sabab: string };

/** `{data:{id,status}}` yoki `{error:{type,message}}`. */
export function apifyRunniOqi(json: unknown): ApifyRunOqish {
  const j = obyekt(json);
  const xato = obyekt(j.error);
  if (Object.keys(xato).length) {
    const tur = matn(xato.type);
    const izoh = tur !== null ? APIFY_XATO_IZOHI[tur] : undefined;
    return { ok: false, sabab: `${izoh ?? matn(xato.message) ?? 'nomaʼlum xato'}${tur ? ` (${tur})` : ''}` };
  }
  const d = obyekt(j.data);
  const runId = matn(d.id);
  const holat = matn(d.status);
  if (runId === null || holat === null) return { ok: false, sabab: 'provayder yurish maʼlumotini qaytarmadi' };
  return { ok: true, runId, holat };
}

/** Bitta qidiruv kartasi → `XitoyTovar`. `null` — koʻrsatib boʻlmaydi (id, nom, narx yoki manzil yoʻq); sanaladi. */
export function apifyKartaniOqi(xom: unknown): XitoyTovar | null {
  const k = obyekt(xom);
  const id = k.offerId;
  const sourceId = typeof id === 'number' || typeof id === 'string' ? String(id) : null;
  const title = matn(k.title);
  const narxYuan = son(k.priceYuan);
  const manzil = httpManzil(k.detailUrl);
  if (sourceId === null || title === null || narxYuan === null || manzil === null) return null;
  const s = obyekt(k.supplier);
  const joy = [matn(s.province), matn(s.city)].filter((x): x is string => x !== null).join(' ');
  return {
    sourceId,
    title,
    narxYuan,
    rasmUrl: httpManzil(k.imageUrl),
    moq: son(k.moq),
    reyting: son(s.compositeScore),
    manba: '1688',
    manzil,
    oxshashlikOrni: son(k.similarityRank),
    dropshipNarxYuan: son(k.consignPriceYuan),
    buyurtmalar: son(k.bookedCount),
    zavod: mantiq(s.isFactory),
    superZavod: mantiq(s.isSuperFactory),
    sotuvchi: matn(s.name),
    joy: joy === '' ? null : joy,
    dokonYili: son(s.yearsOnPlatform),
  };
}

/** Aktorning rasm haqidagi tashxisi (`queryImage`) — 0 natijaning sababi shu yerda koʻrinadi. */
export interface RasmTashxisi {
  manba: 'url' | 'base64' | null;
  /** Aktor aniqlagan tur (jpeg/png/webp). */
  tur: string | null;
  bayt: number | null;
  /** direct / proxy / none — rasm baytlari qanday olindi. */
  yuklash: string | null;
}

/** Odam oʻqiydigan tashxis: "rasm: webp, 234 KB, yuklandi: direct". */
export function tashxisMatni(t: RasmTashxisi | null): string | null {
  if (t === null) return null;
  const q: string[] = [];
  if (t.tur) q.push(t.tur);
  if (t.bayt !== null) q.push(`${Math.round(t.bayt / 1024)} KB`);
  if (t.yuklash) q.push(t.yuklash === 'none' ? 'yuklanmadi' : `yuklandi: ${t.yuklash}`);
  if (t.manba) q.push(t.manba === 'base64' ? 'biz yubordik' : 'URL');
  return q.length ? `rasm: ${q.join(', ')}` : null;
}

/** Bitta rasm uchun qidiruv natijasi. */
export interface RasmNatijasi {
  /** Yuborilgan rasm — kesh kaliti shu (URL, base64 boʻlsa ham asl URL). */
  rasmUrl: string;
  tashxis: RasmTashxisi | null;
  natijalar: XitoyTovar[];
  /** Provayder aytgan son (`matchCount`). */
  jami: number | null;
  /** Oʻqib boʻlmagan kartalar. */
  tashlandi: number;
  /** `null` — qidiruv BOʻLDI (0 ta ham javob). Matn — bu rasm uchun qidiruv boʻlmadi, sababi. */
  xato: string | null;
}

export type ApifyNatijaOqish =
  | { ok: true; rasmlar: RasmNatijasi[] }
  | { ok: false; sabab: string };

/** Yuborilgan rasmlar — natijani bogʻlash uchun: URL, va base64 boʻlsa SHA-256. */
export interface KirishRasmi {
  url: string;
  sha256?: string | null;
}

/**
 * Qator qaysi rasmga tegishli: `queryImage.url` (URL kirishi), yoki
 * `sha256Prefix16` (base64 — biz hisoblagan SHA bilan), yoki `img-N`
 * tartib raqami. Topilmasa `null`.
 */
function qatorRasmi(q: Xom, kirish: KirishRasmi[]): string | null {
  const url = matn(q.url);
  if (url !== null) return url;
  const sha = matn(q.sha256Prefix16);
  if (sha !== null) {
    const k = kirish.find((x) => typeof x.sha256 === 'string' && x.sha256.toLowerCase().startsWith(sha.toLowerCase()));
    if (k) return k.url;
  }
  const id = matn(q.id);
  const m = id === null ? null : /^img-(\d+)$/.exec(id);
  if (m) {
    const k = kirish[Number(m[1])];
    if (k) return k.url;
  }
  return null;
}

function qatorTashxisi(q: Xom): RasmTashxisi | null {
  if (Object.keys(q).length === 0) return null;
  const manba = q.source === 'url' || q.source === 'base64' ? q.source : null;
  return { manba, tur: matn(q.imageType), bayt: son(q.imageBytes), yuklash: matn(q.fetchChannel) };
}

/**
 * Dataset qatorlari → har rasm uchun bitta natija.
 *
 * Aktor tanlangan rejimda (enrichDetails=false) har rasm uchun bitta
 * `imageResult` yozadi; boyitilgan rejimda bir nechta "surat" yozadi va
 * OXIRGISI toʻliq — shuning uchun rasm boʻyicha oxirgi qator olinadi.
 * `kirish` — biz yuborgan rasmlar (base64 uchun bogʻlash shu orqali).
 */
export function apifyNatijalarniOqi(json: unknown, kirish: KirishRasmi[] = []): ApifyNatijaOqish {
  if (!Array.isArray(json)) {
    const xato = obyekt(obyekt(json).error);
    if (Object.keys(xato).length) {
      const r = apifyRunniOqi(json);
      return { ok: false, sabab: r.ok ? 'nomaʼlum xato' : r.sabab };
    }
    return { ok: false, sabab: 'provayder natija roʻyxatini qaytarmadi' };
  }
  const oxirgi = new Map<string, Xom>();
  for (const q of json) {
    const r = obyekt(q);
    if (r.type !== 'imageResult') continue;
    const rasm = qatorRasmi(obyekt(r.queryImage), kirish) ?? matn(obyekt(r.queryImage).id);
    if (rasm === null) continue;
    oxirgi.set(rasm, r);
  }
  const rasmlar: RasmNatijasi[] = [];
  for (const [rasmUrl, r] of oxirgi) {
    const holat = matn(r.status) ?? 'nomaʼlum';
    const jami = son(r.matchCount);
    const tashxis = qatorTashxisi(obyekt(r.queryImage));
    if (holat !== 'OK') {
      const izoh = matn(r.error);
      rasmlar.push({ rasmUrl, tashxis, natijalar: [], jami, tashlandi: 0, xato: `1688 qidiruvni bajarmadi (${holat}${izoh ? `: ${izoh}` : ''})` });
      continue;
    }
    const kartalar = Array.isArray(r.results) ? r.results : [];
    const natijalar: XitoyTovar[] = [];
    let tashlandi = 0;
    for (const k of kartalar) {
      const t = apifyKartaniOqi(k);
      if (t === null) tashlandi += 1;
      else natijalar.push(t);
    }
    natijalar.sort((a, b) => (a.oxshashlikOrni ?? 99) - (b.oxshashlikOrni ?? 99));
    // Kartalar keldi, birortasi oʻqilmadi — javob SHAKLI oʻzgargan, "yoʻq" emas.
    const xato = natijalar.length === 0 && tashlandi > 0
      ? `provayder ${tashlandi} ta karta berdi, birortasi oʻqilmadi (id, nom, narx yoki manzil yoʻq/notoʻgʻri) — javob shakli oʻzgargan boʻlishi mumkin`
      : null;
    rasmlar.push({ rasmUrl, tashxis, natijalar, jami, tashlandi, xato });
  }
  return { ok: true, rasmlar };
}

// ==================================================================== yurish

export interface XitoyProvayder {
  /** Apify API tokeni — faqat chaqiruvchidan (env). Modul uni hech qayerga yozmaydi. */
  kalit: string;
  fetch: typeof fetch;
  /** Bitta HTTP soʻrov uchun, ms. Bular tez chaqiruvlar (boshlash/holat/oʻqish). */
  vaqtChegarasiMs?: number;
}

async function provayderJson(
  p: XitoyProvayder,
  s: ProvayderSorovi,
): Promise<{ ok: true; json: unknown; status: number } | { ok: false; sabab: string }> {
  try {
    const r = await p.fetch(s.url, {
      ...s.init,
      signal: AbortSignal.timeout(p.vaqtChegarasiMs ?? 20_000),
    });
    let json: unknown = null;
    try { json = await r.json(); } catch { json = null; }
    if (json === null) return { ok: false, sabab: `provayder JSON qaytarmadi (HTTP ${r.status})` };
    return { ok: true, json, status: r.status };
  } catch (e) {
    return { ok: false, sabab: `provayderga ulanib boʻlmadi: ${String((e as Error)?.message ?? e)}` };
  }
}

/** Boshlangan yurishdagi rasm: qanday yuborildi va (base64 boʻlsa) SHA-256. */
export interface YuborilganRasm {
  url: string;
  usul: 'base64' | 'url';
  sha256: string | null;
  tur: YuklanganRasm['tur'];
  bayt: number | null;
  /** WebP dan JPEG ga oʻgirildi (proksi). */
  ogirildi: boolean;
}

/**
 * Yurishni boshlaydi. Hech qachon otmaydi. `runId` — keyin tekshirish
 * uchun; chaqiruvchi uni `rasmlar` bilan birga saqlaydi (holat/kesh):
 * natija shular orqali bogʻlanadi.
 *
 * `yukla` berilsa har rasm avval yuklanadi va base64 bilan ketadi;
 * yuklanmasa oʻsha rasm URL bilan ketadi (`usul` rostini aytadi).
 */
export async function xitoyQidiruvniBoshla(
  p: XitoyProvayder,
  k: { rasmlar: string[]; yukla?: RasmYuklovchi; sahifaHajmi?: number },
): Promise<{ runId: string; rasmlar: YuborilganRasm[]; xato: null } | { runId: null; xato: string }> {
  if (!p.kalit) return { runId: null, xato: 'provayder kaliti yoʻq' };
  const urllar = k.rasmlar.filter((r) => rasmManzili(r) !== null).slice(0, XITOY_RASM_MAX);
  if (urllar.length === 0) return { runId: null, xato: 'rasm manzili yoʻq' };
  const kirish: RasmKirishi[] = [];
  for (const url of urllar) {
    const yuklangan = k.yukla ? await k.yukla(url) : null;
    kirish.push({ url, yuklangan });
  }
  const sorov: { sahifaHajmi?: number } = {};
  if (k.sahifaHajmi !== undefined) sorov.sahifaHajmi = k.sahifaHajmi;
  const r = await provayderJson(p, qidiruvniBoshlashSorovi(p.kalit, kirish, sorov));
  if (!r.ok) return { runId: null, xato: r.sabab };
  const n = apifyRunniOqi(r.json);
  if (!n.ok) return { runId: null, xato: n.sabab };
  if (YAKUNIY_XATO.has(n.holat)) return { runId: null, xato: `yurish darhol toʻxtadi (${n.holat})` };
  return {
    runId: n.runId,
    xato: null,
    rasmlar: kirish.map((x) => ({
      url: x.url,
      usul: x.yuklangan ? 'base64' : 'url',
      sha256: x.yuklangan?.sha256 ?? null,
      tur: x.yuklangan?.tur ?? null,
      bayt: x.yuklangan?.bayt ?? null,
      ogirildi: x.yuklangan?.ogirildi ?? false,
    })),
  };
}

export type XitoyTekshiruv =
  | { holat: 'kutilmoqda'; runHolati: string }
  | { holat: 'tugadi'; rasmlar: RasmNatijasi[] }
  | { holat: 'xato'; xato: string; runHolati: string | null };

/**
 * Yurish holatini soʻraydi; tugagan boʻlsa natijani oʻqiydi.
 * Hech qachon otmaydi. Tarmoq xatosi — `xato` (chaqiruvchi keyinroq
 * qayta tekshirishi mumkin, yurish Apify'da davom etadi).
 */
export async function xitoyQidiruvniTekshir(p: XitoyProvayder, runId: string, kirish: KirishRasmi[] = []): Promise<XitoyTekshiruv> {
  if (!p.kalit) return { holat: 'xato', xato: 'provayder kaliti yoʻq', runHolati: null };
  const h = await provayderJson(p, runHolatiSorovi(p.kalit, runId));
  if (!h.ok) return { holat: 'xato', xato: h.sabab, runHolati: null };
  const r = apifyRunniOqi(h.json);
  if (!r.ok) return { holat: 'xato', xato: r.sabab, runHolati: null };
  if (YAKUNIY_XATO.has(r.holat)) return { holat: 'xato', xato: `yurish tugamadi (${r.holat})`, runHolati: r.holat };
  if (r.holat !== 'SUCCEEDED') return { holat: 'kutilmoqda', runHolati: r.holat };

  const n = await provayderJson(p, runNatijasiSorovi(p.kalit, runId));
  if (!n.ok) return { holat: 'xato', xato: n.sabab, runHolati: r.holat };
  const o = apifyNatijalarniOqi(n.json, kirish);
  if (!o.ok) return { holat: 'xato', xato: o.sabab, runHolati: r.holat };
  return { holat: 'tugadi', rasmlar: o.rasmlar };
}

// ==================================================================== limit va MOQ

/** Kunlik limit chegaralari. */
export const XITOY_LIMIT = {
  /** Kuniga shuncha qidiruv (bepul reja). */
  bepulKunlik: 3,
  /** Kuniga shuncha qidiruv (pro reja). */
  proKunlik: 30,
  /** Kuniga shuncha qidiruv (biznes reja). */
  biznesKunlik: 100,
  /** Kesh muddati (soat). Bir xil rasm uchun qayta soʻrov yuborilmaydi. */
  keshSoat: 72,
  /**
   * UMUMIY kunlik shift — hamma foydalanuvchi yigʻindisi. Sessiyalar
   * anonim va cheksiz ochiladi (BACKLOG), yaʼni shaxsiy limitning oʻzi
   * xarajatni cheklamaydi. Bu son operator tanlovi: kuniga 200 ta
   * qidiruv ≈ $1 (Apify FREE tier narxi bilan).
   */
  jamiKunlik: 200,
} as const;

export interface LimitNatijasi {
  ruxsat: boolean;
  qolgan: number;
  limit: number;
  /** Nega yopiq: shaxsiy (reja) yoki umumiy (kunlik shift). Ochiq boʻlsa `null`. */
  sabab: 'shaxsiy' | 'umumiy' | null;
  /** Bugungi umumiy sanoq va shift. `null` — oʻlchanmagan (0055 qoʻllanmagan). */
  umumiy: { ishlatilgan: number; limit: number } | null;
}

/**
 * Kunlik limitga yetganmi. `jami` — bugun HAMMA foydalanuvchi yigʻindisi
 * (0055 dan keladi); `null` boʻlsa umumiy shift tekshirilmaydi va bu
 * `umumiy: null` bilan koʻrinib turadi.
 */
export function limitTekshir(
  ishlatilgan: number,
  reja: 'bepul' | 'pro' | 'biznes',
  jami: number | null = null,
): LimitNatijasi {
  const limit = reja === 'biznes'
    ? XITOY_LIMIT.biznesKunlik
    : reja === 'pro'
      ? XITOY_LIMIT.proKunlik
      : XITOY_LIMIT.bepulKunlik;
  const shaxsiy = ishlatilgan < limit;
  const umumiyOchiq = jami === null || jami < XITOY_LIMIT.jamiKunlik;
  return {
    ruxsat: shaxsiy && umumiyOchiq,
    qolgan: Math.max(0, limit - ishlatilgan),
    limit,
    sabab: !shaxsiy ? 'shaxsiy' : !umumiyOchiq ? 'umumiy' : null,
    umumiy: jami === null ? null : { ishlatilgan: jami, limit: XITOY_LIMIT.jamiKunlik },
  };
}

/** `so_xitoy_limit` javobi (0046 → 0055). `ruxsat` faqat band qilishda keladi. */
export interface XitoyLimitJavobi {
  xato?: string;
  soni?: number;
  jami?: number;
  ruxsat?: boolean;
}

export type XitoyLimitHolati =
  | { ok: true; ishlatilgan: number; jami: number | null; ruxsat: boolean; natija: LimitNatijasi }
  | { ok: false; xato: string; kod: 401 | 503 };

/**
 * Sanoq javobini OʻLCHOV sifatida oʻqiydi. Kelmasa yoki xato boʻlsa —
 * "bilmayman", nol emas: chaqiruvchi toʻxtaydi. Tekshiruv (2026-09-25):
 * ilgari `soni ?? 0` notoʻgʻri token bilan ham pullik provayderni
 * chaqirtirardi.
 */
export function xitoyLimitHolati(j: XitoyLimitJavobi | null, reja: 'bepul' | 'pro' | 'biznes'): XitoyLimitHolati {
  if (j === null) return { ok: false, xato: 'baza javob bermadi — limit oʻlchanmadi', kod: 503 };
  if (j.xato) return { ok: false, xato: j.xato, kod: 401 };
  if (typeof j.soni !== 'number' || !Number.isFinite(j.soni)) {
    return { ok: false, xato: 'limit oʻlchanmadi — sanoq kelmadi', kod: 503 };
  }
  const jami = typeof j.jami === 'number' && Number.isFinite(j.jami) ? j.jami : null;
  return {
    ok: true, ishlatilgan: j.soni, jami,
    ruxsat: j.ruxsat !== false,
    natija: limitTekshir(j.soni, reja, jami),
  };
}

/**
 * MOQ byudjetga sigʻishini tekshiradi.
 *
 * MOQ (minimal buyurtma) va tovar narxi byudjetdan oshsa —
 * odam sotib ola olmaydi. Bu boʻlsa miqdor rejasi taklif qilinadi:
 * "Hozir 50 ta, keyingi oyda yana 50 ta".
 */
export interface MoqNatija {
  /** Bir martalik xarid summasi (yuan). */
  jamYuan: number;
  /** Soʻmda (kursga koʻra). */
  jamSom: number;
  /** Byudjetga sigʻadimi. */
  sigadi: boolean;
  /** Sigʻmasa — necha qismga boʻlish kerak. */
  qismSoni: number | null;
  /** Har qism miqdori. */
  qismMiqdori: number | null;
}

export function moqHisobi(
  moq: number,
  narxYuan: number,
  kursSomPerYuan: number,
  byudjetSom: number,
): MoqNatija {
  const jamYuan = moq * narxYuan;
  const jamSom = Math.round(jamYuan * kursSomPerYuan);
  const sigadi = jamSom <= byudjetSom;

  if (sigadi) {
    return { jamYuan, jamSom, sigadi, qismSoni: null, qismMiqdori: null };
  }

  // Bir qismga qancha sigʻadi
  const birQismMiqdori = Math.max(1, Math.floor(byudjetSom / (narxYuan * kursSomPerYuan)));
  const qismSoni = Math.ceil(moq / birQismMiqdori);

  return {
    jamYuan,
    jamSom,
    sigadi,
    qismSoni,
    qismMiqdori: birQismMiqdori,
  };
}
