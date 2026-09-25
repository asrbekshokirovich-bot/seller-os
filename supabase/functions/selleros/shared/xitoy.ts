/**
 * Xitoydan topish — B4 (Usta 4-qadam) va suhbatning 5-qadami.
 *
 * Rasm-qidiruv: Uzumdagi tovar rasmi → 1688.com dan oʻxshash tovarlar.
 *
 * PROVAYDER — TMAPI (tmapi.top), 2026-09-25 da ulandi. Hujjatning
 * Markdown eksportidan (tmapi.top/docs/ali/search/search-items-by-image-url.md
 * va docs/ali/tool-apis/image-url-convert.md):
 *
 *   GET  https://api.tmapi.top/1688/search/image?img_url=…&page_size=20&sort=…
 *   POST https://api.tmapi.top/1688/tools/image/convert_url   {url}
 *   sarlavha: `apikey: <kalit>`
 *
 * Faqat Ali-platforma rasmi (alicdn) toʻgʻridan-toʻgʻri qidiriladi.
 * Boshqa rasm — Uzum CDN ham — avval `convert_url` bilan oʻgiriladi va
 * qaytgan yoʻl (`/search/imgextra/….jpg`) `img_url` ga beriladi.
 *
 * Oʻlchandi (2026-09-25): hujjat `http://` yozadi, `https://` ham
 * ishlaydi — kalitsiz soʻrov 401 `{"code":4011,"message":"no API key
 * found in request"}` qaytardi. Shuning uchun https.
 *
 * BU MODUL `fetch` NI HAM, MUHITNI HAM BILMAYDI. Ikkalasi argument
 * bilan keladi — Edge Function, Fastify va test bir xil kodni
 * chaqiradi, kalit esa faqat chaqiruvchida (QOIDALAR §3: sirlar env da).
 *
 * JIM OʻLIM YOʻQ (QOIDALAR §8). Provayder xatosi `xato` bilan qaytadi,
 * boʻsh roʻyxat bilan EMAS. Nol natija — bu JAVOB ("1688 oʻxshashini
 * topmadi") va u `xato: null` bilan ajralib turadi. Ilgari bu yerda
 * kalit borligida ham izohsiz boʻsh roʻyxat qaytar edi — yaʼni
 * "qidirilmadi" va "topilmadi" bir xil koʻrinardi.
 */

/** 1688 dan topilgan tovar. Hamma raqam provayder javobidan, hech narsa hisoblanmaydi. */
export interface XitoyTovar {
  /** Provayder bergan ID (`item_id`). */
  sourceId: string;
  title: string;
  /** Yuan narx (`price`; "27.00" → 27). */
  narxYuan: number;
  /** Rasm URL (`img`, alicdn). */
  rasmUrl: string;
  /** Minimal buyurtma miqdori (`moq`). */
  moq: number;
  /** Sotuvchi reytingi 0–5 (`shop_info.score_info.composite_score`). `null` — yoʻq. */
  reyting: number | null;
  /** Provayder nomi. */
  manba: '1688' | 'alibaba';
  /** 1688 sahifasi (`product_url`). */
  manzil: string | null;
  /** Sotilgan dona (`sale_info.sale_quantity_int`). Davri provayderda yozilmagan. */
  sotilgan: number | null;
  /** Buyurtmalar soni (`sale_info.orders_count`). */
  buyurtmalar: number | null;
  /** Ishlab chiqaruvchi zavodmi (`shop_info.is_factory`). */
  zavod: boolean | null;
  /** Sotuvchi kompaniya (`shop_info.company_name`). */
  sotuvchi: string | null;
  /** Joylashuvi (`shop_info.location`, "广东 东莞市"). */
  joy: string | null;
  /** Doʻkon 1688 da necha yil (`shop_info.shop_years`). */
  dokonYili: number | null;
  /** Takroriy xarid ulushi, % (`item_repurchase_rate` "54%" → 54). */
  takrorXaridFoizi: number | null;
  /** Reklama oʻrni (`is_ad`) — tartib pul bilan olingan boʻlishi mumkin. */
  reklama: boolean | null;
}

export const TMAPI_MANZIL = 'https://api.tmapi.top';

/** Hujjatdagi `sort` qiymatlari. */
export const XITOY_TARTIB = ['default', 'sales', 'price_up', 'price_down'] as const;
export type XitoyTartib = (typeof XITOY_TARTIB)[number];

/** Hujjatdagi `page_size` chegarasi: "Default value: 20. Max: 20." */
export const XITOY_SAHIFA_MAX = 20;

/**
 * Provayder xato kodlari — hujjatdagi "Response Example" boʻlimidan.
 * Obunachi koʻradigan matn; raqamning oʻzi ham qaytariladi.
 */
export const TMAPI_KOD_IZOHI: Readonly<Record<number, string>> = {
  417: 'provayder maʼlumot ololmadi — qayta urinib koʻring',
  422: 'soʻrov parametri notoʻgʻri',
  439: 'provayder obunasi tugagan yoki balans yetarli emas',
  499: 'provayder javob bermadi (60 s)',
  500: 'provayder ichki xatosi',
  503: 'provayder parallel soʻrov chegarasi — biroz kutib qayta urinish kerak',
  4011: 'API kalit yuborilmadi',
};

/** Rasm oʻgirishsiz qidirsa boʻladimi — Ali CDN yoki allaqachon oʻgirilgan yoʻl. */
export function aliRasmimi(url: string): boolean {
  if (url.startsWith('/search/imgextra/')) return true;
  try {
    const h = new URL(url).hostname.toLowerCase();
    return /(^|\.)(alicdn\.com|1688\.com|alibaba\.com|aliexpress-media\.com)$/.test(h);
  } catch {
    return false;
  }
}

export interface ProvayderSorovi {
  url: string;
  init: { method: 'GET' | 'POST'; headers: Record<string, string>; body?: string };
}

/** `convert_url` soʻrovi — Ali boʻlmagan rasm uchun. */
export function rasmOgirishSorovi(kalit: string, rasmUrl: string): ProvayderSorovi {
  return {
    url: `${TMAPI_MANZIL}/1688/tools/image/convert_url`,
    init: {
      method: 'POST',
      headers: { apikey: kalit, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: rasmUrl, search_api_endpoint: '/search/image' }),
    },
  };
}

/** `search/image` soʻrovi. `imgUrl` — alicdn URL yoki oʻgirilgan yoʻl. */
export function rasmQidiruvSorovi(
  kalit: string,
  imgUrl: string,
  q: { sahifaHajmi?: number; tartib?: XitoyTartib } = {},
): ProvayderSorovi {
  const hajm = Math.min(XITOY_SAHIFA_MAX, Math.max(1, Math.trunc(q.sahifaHajmi ?? XITOY_SAHIFA_MAX)));
  const p = new URLSearchParams({
    img_url: imgUrl,
    page: '1',
    page_size: String(hajm),
    sort: q.tartib ?? 'default',
  });
  return {
    url: `${TMAPI_MANZIL}/1688/search/image?${p.toString()}`,
    init: { method: 'GET', headers: { apikey: kalit } },
  };
}

// ==================================================================== javobni oʻqish

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

/** "54%" → 54. Foizsiz matn ham son boʻlsa qabul qilinadi. */
function foiz(x: unknown): number | null {
  if (typeof x !== 'string') return son(x);
  return son(x.replace('%', '').trim());
}

type Xom = Record<string, unknown>;
const obyekt = (x: unknown): Xom => (x !== null && typeof x === 'object' && !Array.isArray(x) ? (x as Xom) : {});

/**
 * Bitta `items[]` elementi → `XitoyTovar`. `null` — koʻrsatib
 * boʻlmaydigan element (id, nom, narx yoki rasm yoʻq); u sanaladi,
 * jimgina tashlanmaydi.
 */
export function tmapiTovarniOqi(xom: unknown): XitoyTovar | null {
  const t = obyekt(xom);
  const id = t.item_id;
  const sourceId = typeof id === 'number' || typeof id === 'string' ? String(id) : null;
  const title = matn(t.title);
  const narxYuan = son(t.price) ?? son(obyekt(t.price_info).sale_price);
  const rasmUrl = matn(t.img);
  if (sourceId === null || title === null || narxYuan === null || rasmUrl === null) return null;

  const sotuv = obyekt(t.sale_info);
  const dokon = obyekt(t.shop_info);
  const joy = Array.isArray(dokon.location) ? dokon.location.filter((x) => typeof x === 'string').join(' ') : '';
  return {
    sourceId,
    title,
    narxYuan,
    rasmUrl,
    // MOQ yoʻq boʻlsa 1 EMAS — hujjatda `moq` doim bor; boʻlmasa bu
    // "bilmayman" va bu yerda 1 deb yozish yolgʻon boʻlardi.
    moq: son(t.moq) ?? 0,
    reyting: son(obyekt(dokon.score_info).composite_score) ?? son(t.rating_star),
    manba: '1688',
    manzil: matn(t.product_url),
    sotilgan: son(sotuv.sale_quantity_int) ?? son(sotuv.sale_quantity),
    buyurtmalar: son(sotuv.orders_count),
    zavod: mantiq(dokon.is_factory),
    sotuvchi: matn(dokon.company_name) ?? matn(dokon.login_id),
    joy: joy === '' ? null : joy,
    dokonYili: son(dokon.shop_years),
    takrorXaridFoizi: foiz(t.item_repurchase_rate),
    reklama: mantiq(t.is_ad),
  };
}

export type TmapiOqish =
  | { ok: true; natijalar: XitoyTovar[]; jami: number | null; tashlandi: number }
  | { ok: false; kod: number | null; sabab: string };

/**
 * `search/image` javobi. `code !== 200` — xato, sababi bilan.
 * Elementlar oʻqiladi; oʻqib boʻlmaganlari `tashlandi` da sanaladi.
 */
export function tmapiJavobiniOqi(json: unknown): TmapiOqish {
  const j = obyekt(json);
  if (Object.keys(j).length === 0) return { ok: false, kod: null, sabab: 'provayder javobi JSON emas' };
  const kod = son(j.code);
  if (kod !== 200) {
    const xabar = matn(j.msg) ?? matn(j.message);
    const izoh = kod !== null ? TMAPI_KOD_IZOHI[kod] : undefined;
    return { ok: false, kod, sabab: `${izoh ?? xabar ?? 'nomaʼlum xato'} (kod ${kod ?? '?'})` };
  }
  const data = obyekt(j.data);
  const items = Array.isArray(data.items) ? data.items : [];
  const natijalar: XitoyTovar[] = [];
  let tashlandi = 0;
  for (const x of items) {
    const t = tmapiTovarniOqi(x);
    if (t === null) tashlandi += 1;
    else natijalar.push(t);
  }
  return { ok: true, natijalar, jami: son(data.total_count), tashlandi };
}

/** `convert_url` javobi → oʻgirilgan yoʻl. */
export function tmapiOgirishniOqi(json: unknown): { ok: true; yol: string } | { ok: false; sabab: string } {
  const j = obyekt(json);
  const kod = son(j.code);
  if (kod !== 200) {
    const izoh = kod !== null ? TMAPI_KOD_IZOHI[kod] : undefined;
    return { ok: false, sabab: `${izoh ?? matn(j.msg) ?? matn(j.message) ?? 'nomaʼlum xato'} (kod ${kod ?? '?'})` };
  }
  const yol = matn(obyekt(j.data).image_url);
  if (yol === null) return { ok: false, sabab: 'oʻgirilgan rasm yoʻli kelmadi' };
  return { ok: true, yol };
}

// ==================================================================== qidiruv

export interface XitoyProvayder {
  /** Faqat chaqiruvchidan (env). Modul uni hech qayerga yozmaydi. */
  kalit: string;
  fetch: typeof fetch;
  /** Bitta soʻrov uchun, ms. Hujjat 60 s tavsiya qiladi. */
  vaqtChegarasiMs?: number;
}

export interface XitoyQidiruvKirishi {
  rasmUrl: string;
  sahifaHajmi?: number;
  tartib?: XitoyTartib;
}

export interface XitoyQidiruvNatijasi {
  natijalar: XitoyTovar[];
  manba: '1688' | null;
  /** Provayder aytgan umumiy son (`total_count`). */
  jami: number | null;
  /** Oʻqib boʻlmagan elementlar. */
  tashlandi: number;
  /** `null` — qidiruv BOʻLDI. Matn — qidiruv boʻlmadi, sababi shu. */
  xato: string | null;
  /** Ali boʻlmagan rasm uchun oʻgirilgan yoʻl; Ali rasmida `null`. */
  ogirilganRasm: string | null;
  vaqtMs: number;
}

async function provayderJson(
  p: XitoyProvayder,
  s: ProvayderSorovi,
): Promise<{ ok: true; json: unknown; status: number } | { ok: false; sabab: string }> {
  try {
    const r = await p.fetch(s.url, {
      ...s.init,
      signal: AbortSignal.timeout(p.vaqtChegarasiMs ?? 60_000),
    });
    let json: unknown = null;
    try { json = await r.json(); } catch { json = null; }
    if (json === null) return { ok: false, sabab: `provayder JSON qaytarmadi (HTTP ${r.status})` };
    return { ok: true, json, status: r.status };
  } catch (e) {
    return { ok: false, sabab: `provayderga ulanib boʻlmadi: ${String((e as Error)?.message ?? e)}` };
  }
}

/**
 * Rasm boʻyicha 1688 qidiruvi — oʻgirish (kerak boʻlsa) + qidiruv.
 *
 * Hech qachon otmaydi (throw). Har yiqilish `xato` matni bilan
 * qaytadi va `natijalar` boʻsh boʻladi; chaqiruvchi ikkalasini
 * FARQLAB koʻrsatishi shart.
 */
export async function xitoyQidir(p: XitoyProvayder, k: XitoyQidiruvKirishi): Promise<XitoyQidiruvNatijasi> {
  const bosh = Date.now();
  const tayyor = (q: Partial<XitoyQidiruvNatijasi>): XitoyQidiruvNatijasi => ({
    natijalar: [], manba: null, jami: null, tashlandi: 0, xato: null, ogirilganRasm: null,
    ...q,
    vaqtMs: Date.now() - bosh,
  });
  if (!p.kalit) return tayyor({ xato: 'provayder kaliti yoʻq' });
  if (!k.rasmUrl) return tayyor({ xato: 'rasm manzili yoʻq' });

  let imgUrl = k.rasmUrl;
  let ogirilganRasm: string | null = null;
  if (!aliRasmimi(k.rasmUrl)) {
    const o = await provayderJson(p, rasmOgirishSorovi(p.kalit, k.rasmUrl));
    if (!o.ok) return tayyor({ xato: `rasmni oʻgirib boʻlmadi: ${o.sabab}` });
    const y = tmapiOgirishniOqi(o.json);
    if (!y.ok) return tayyor({ xato: `rasmni oʻgirib boʻlmadi: ${y.sabab}` });
    imgUrl = y.yol;
    ogirilganRasm = y.yol;
  }

  const sorov: { sahifaHajmi?: number; tartib?: XitoyTartib } = {};
  if (k.sahifaHajmi !== undefined) sorov.sahifaHajmi = k.sahifaHajmi;
  if (k.tartib !== undefined) sorov.tartib = k.tartib;
  const r = await provayderJson(p, rasmQidiruvSorovi(p.kalit, imgUrl, sorov));
  if (!r.ok) return tayyor({ ogirilganRasm, xato: r.sabab });
  const n = tmapiJavobiniOqi(r.json);
  if (!n.ok) return tayyor({ ogirilganRasm, xato: n.sabab });
  return tayyor({ natijalar: n.natijalar, manba: '1688', jami: n.jami, tashlandi: n.tashlandi, ogirilganRasm });
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
} as const;

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

/** Kunlik limitga yetganmi tekshiradi. */
export function limitTekshir(
  ishlatilgan: number,
  reja: 'bepul' | 'pro' | 'biznes',
): { ruxsat: boolean; qolgan: number; limit: number } {
  const limit = reja === 'biznes'
    ? XITOY_LIMIT.biznesKunlik
    : reja === 'pro'
      ? XITOY_LIMIT.proKunlik
      : XITOY_LIMIT.bepulKunlik;
  return {
    ruxsat: ishlatilgan < limit,
    qolgan: Math.max(0, limit - ishlatilgan),
    limit,
  };
}
