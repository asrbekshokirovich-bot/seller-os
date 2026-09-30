/**
 * 11-qadam — Sotuv boshlandi: sotuvchining OʻZ kartochkasi kuzatuvi va signallar.
 *
 * Nazoratchi ssenariysi (11-qadam): "Bugun: {sotilgan} dona, oʻlchangan.
 * Zaxira: {zaxira}. Shu tezlikda {kun} kunga yetadi. Bu bashorat emas,
 * hozirgi tezlik." Signallar: zaxira 20 % dan tushsa — yana buyurtma
 * (5-qadamga qaytadi, sotuvchi maʼlum); yangi sharh; raqobatchi narxi.
 * "Ombor nazorati va bozor tahlili xizmatlari bu yerda menyu bandi emas,
 * signal sifatida yashaydi."
 *
 * OʻLCHOV MANBASI. Sotuvchi kartochka havolasini beradi → tovar
 * `selleros.tracked_product` ga qoʻshiladi (`so_sotuv_kuzat`, 0061) →
 * skreyper kuniga 3 marta narx, zaxira, reyting va sharhlar sonini yozadi
 * (`product_daily`) → `so_rollup_sales` sotuvni ZAXIRA KAMAYISHIDAN
 * hisoblaydi (`stock_delta_v2`, aniqlik "approx"). Uzum buyurtma sonini
 * bermaydi — shuning uchun hammasi taxmin va shunday aytiladi. Birinchi
 * sotuv raqami kamida ikki zaxira oʻlchovidan keyin chiqadi.
 *
 * Bu modul sof: RPC javobini oʻqiydi va raqam yasaydi. Matnni `ssenariy.ts` yozadi.
 */

/** Ssenariy: "zaxirasi 20 % dan tushdi" — boshlangʻich (eng katta oʻlchangan) zaxiraga nisbatan. */
export const ZAXIRA_SIGNAL_ULUSH = 0.2;
/** Boshlangʻich zaxira shundan kam boʻlsa ulush signali maʼnosiz (1 donadan 0 ga — 100 %). */
export const ZAXIRA_SIGNAL_MIN = 5;
/** "Hozirgi tezlik" — oxirgi shuncha kundagi oʻrtacha sotuv (oʻlchangan kunlar). */
export const TEZLIK_OYNA_KUN = 7;
/** Raqobatchi narxi shuncha foizdan koʻp tushsa — signal (kichik tebranish shovqin). */
export const NARX_SIGNAL_FOIZ = 3;
/** Skreyper jadvali (Toshkent vaqti) — .github/workflows/skreyper.yml, cron 0 4,12,20 UTC. */
export const KUZATUV_VAQTLARI = '09:00, 17:00, 01:00';

/**
 * Uzum kartochka havolasidan (yoki sof raqamdan) tovar ID. Haqiqiy shakl
 * `uzum.uz/uz/product/<slug>-<id>` (kengaytma 0.1.3 da oʻlchangan);
 * `uzum.uz/product/<id>` ham. Boshqa sayt — `null`.
 */
export function uzumMahsulotId(x: unknown): number | null {
  if (typeof x === 'number') return Number.isSafeInteger(x) && x > 0 && x < 1e11 ? x : null;
  if (typeof x !== 'string') return null;
  const t = x.trim();
  if (/^\d{3,11}$/.test(t)) return Number(t);
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
  } catch {
    return null;
  }
  const h = u.hostname.toLowerCase();
  if (h !== 'uzum.uz' && !h.endsWith('.uzum.uz')) return null;
  const m = u.pathname.match(/\/product\/(?:[^/]*?-)?(\d+)\/?$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isSafeInteger(n) && n > 0 && n < 1e11 ? n : null;
}

export interface KunlikQator {
  sana: string;
  narx: number | null;
  zaxira: number | null;
  sharh: number | null;
  reyting: number | null;
  /** Shu kuni sotildi (zaxira kamayishidan). `null` — hisoblab boʻlmadi (oʻlchov yetmadi). */
  sotildi: number | null;
  daromad: number | null;
}

export interface TovarKuzatuvi {
  externalId: number;
  kuzatuvda: boolean;
  /** `false` — hali bir marta ham oʻlchanmagan (bu "sotuv yoʻq" EMAS). */
  topildi: boolean;
  title: string | null;
  /** Sana boʻyicha oʻsib boruvchi. */
  kunlar: KunlikQator[];
}

function son(x: unknown): number | null {
  if (typeof x === 'number') return Number.isFinite(x) ? x : null;
  if (typeof x === 'string' && x.trim() !== '' && Number.isFinite(Number(x))) return Number(x);
  return null;
}

/** `so_sotuv_holati` javobi → kuzatuvlar. Buzuq qator tashlanadi. */
export function kuzatuvlarniOqi(json: unknown): TovarKuzatuvi[] {
  if (!Array.isArray(json)) return [];
  const natija: TovarKuzatuvi[] = [];
  for (const x of json) {
    if (x === null || typeof x !== 'object') continue;
    const q = x as Record<string, unknown>;
    const id = son(q.externalId);
    if (id === null) continue;
    const kunlar = (Array.isArray(q.kunlar) ? q.kunlar : [])
      .filter((k): k is Record<string, unknown> => k !== null && typeof k === 'object' && typeof (k as Record<string, unknown>).sana === 'string')
      .map((k) => ({
        sana: String(k.sana).slice(0, 10),
        narx: son(k.narx), zaxira: son(k.zaxira), sharh: son(k.sharh), reyting: son(k.reyting),
        sotildi: son(k.sotildi), daromad: son(k.daromad),
      }))
      .sort((a, b) => a.sana.localeCompare(b.sana));
    natija.push({ externalId: id, kuzatuvda: q.kuzatuvda === true, topildi: q.topildi === true, title: typeof q.title === 'string' ? q.title : null, kunlar });
  }
  return natija;
}

/** Shu oy (`YYYY-MM`) oʻlchangan kunlardagi sotuv — dona va tushum (taxmin). Oʻlchangan kun yoʻq — `null`. */
export function oyYigindisi(k: TovarKuzatuvi | null, oy: string): { dona: number | null; som: number | null } {
  const kunlar = (k?.kunlar ?? []).filter((x) => x.sotildi !== null && x.sana.startsWith(oy));
  if (!kunlar.length) return { dona: null, som: null };
  return {
    dona: kunlar.reduce((s, x) => s + (x.sotildi ?? 0), 0),
    som: Math.round(kunlar.reduce((s, x) => s + (x.daromad ?? (x.sotildi !== null && x.narx !== null ? x.sotildi * x.narx : 0)), 0)),
  };
}

export interface OzHolat {
  externalId: number;
  /** `kutilmoqda` — kuzatuvga qoʻshildi, hali oʻlchanmagan. */
  holat: 'olchandi' | 'kutilmoqda';
  sana: string | null;
  bugunSotildi: number | null;
  /** Kuniga oʻrtacha (oxirgi `TEZLIK_OYNA_KUN` oʻlchangan kun). */
  tezlik: number | null;
  tezlikKun: number;
  zaxira: number | null;
  /** Shu tezlikda zaxira necha kunga yetadi. Tezlik 0 yoki yoʻq — `null`. */
  zaxiraKun: number | null;
  /**
   * Kuzatuv davridagi eng katta zaxira — "boshlangʻich". Qayta buyurtmadan
   * keyin — yangi partiya omborga tushgandan beri; hali tushmagan — `null`.
   */
  boshlangichZaxira: number | null;
  zaxiraUlush: number | null;
  narx: number | null;
  sharh: number | null;
  reyting: number | null;
  /** Oxirgi oʻlchovda qoʻshilgan sharhlar soni. */
  yangiSharh: number;
  /** Shu oy (YYYY-MM) sotilgan dona va tushum (taxmin). */
  oyDona: number | null;
  oySom: number | null;
  olchovKun: number;
}

/**
 * Sotuvchining oʻz kartochkasi holati. `oy` — `YYYY-MM`.
 *
 * `qayta` — tovar qayta buyurtma qilingan boʻlsa: buyurtma sanasi va
 * oʻshandagi zaxira. Boshlangʻich zaxira — shu sanadan keyingi eng katta
 * oʻlchov, faqat zaxira oʻshandagidan OSHGAN boʻlsa (yangi partiya
 * omborga tushgan). Aks holda `null`: eski qoldiq tugayotgani uchun
 * "yana buyurtma" ikkinchi marta soʻralmaydi.
 */
export function ozHolati(
  k: TovarKuzatuvi | null, externalId: number, oy: string, qayta: { sana: string; zaxira: number | null } | null = null,
): OzHolat {
  const kunlar = k?.kunlar ?? [];
  const oxirgi = kunlar[kunlar.length - 1] ?? null;
  const sotuvli = kunlar.filter((x) => x.sotildi !== null);
  const oyna = sotuvli.slice(-TEZLIK_OYNA_KUN);
  const tezlik = oyna.length ? oyna.reduce((s, x) => s + (x.sotildi ?? 0), 0) / oyna.length : null;
  const zaxira = oxirgi?.zaxira ?? null;
  const zaxiralar = (qayta === null ? kunlar : kunlar.filter((x) => x.sana >= qayta.sana))
    .map((x) => x.zaxira).filter((x): x is number => x !== null);
  const eng = zaxiralar.length ? Math.max(...zaxiralar) : null;
  const boshlangichZaxira = eng !== null && (qayta === null || qayta.zaxira === null || eng > qayta.zaxira) ? eng : null;
  const sharhli = kunlar.filter((x) => x.sharh !== null);
  const yangiSharh = sharhli.length >= 2 ? Math.max(0, (sharhli[sharhli.length - 1]!.sharh ?? 0) - (sharhli[sharhli.length - 2]!.sharh ?? 0)) : 0;
  const shuOy = oyYigindisi(k, oy);
  return {
    externalId,
    holat: kunlar.length ? 'olchandi' : 'kutilmoqda',
    sana: oxirgi?.sana ?? null,
    bugunSotildi: oxirgi?.sotildi ?? null,
    tezlik: tezlik === null ? null : Math.round(tezlik * 10) / 10,
    tezlikKun: oyna.length,
    zaxira,
    zaxiraKun: tezlik !== null && tezlik > 0 && zaxira !== null ? Math.floor(zaxira / tezlik) : null,
    boshlangichZaxira,
    zaxiraUlush: boshlangichZaxira !== null && boshlangichZaxira >= ZAXIRA_SIGNAL_MIN && zaxira !== null
      ? Math.round((zaxira / boshlangichZaxira) * 100) / 100 : null,
    narx: oxirgi?.narx ?? null,
    sharh: oxirgi?.sharh ?? null,
    reyting: oxirgi?.reyting ?? null,
    yangiSharh,
    oyDona: shuOy.dona,
    oySom: shuOy.som,
    olchovKun: kunlar.length,
  };
}

export interface RaqobatchiHolat {
  productId: number;
  sana: string | null;
  narx: number | null;
  /** Oxirgi narxdan oldingi boshqa narx (oxirgi oʻzgarishgacha). */
  oldingiNarx: number | null;
  /** Narx tushgan boʻlsa — foiz; oshgan yoki oʻzgarmagan — `null`. */
  tushdiFoiz: number | null;
}

/** Raqobatchi (3-qadamda tanlangan Uzum tovari) narxi — oxirgi oʻzgarish. */
export function raqobatchiHolati(k: TovarKuzatuvi | null, productId: number): RaqobatchiHolat {
  const narxli = (k?.kunlar ?? []).filter((x) => x.narx !== null);
  const oxirgi = narxli[narxli.length - 1] ?? null;
  let oldingiNarx: number | null = null;
  if (oxirgi) {
    for (let i = narxli.length - 2; i >= Math.max(0, narxli.length - 8); i--) {
      if (narxli[i]!.narx !== oxirgi.narx) { oldingiNarx = narxli[i]!.narx; break; }
    }
  }
  const narx = oxirgi?.narx ?? null;
  const tushdiFoiz = narx !== null && oldingiNarx !== null && oldingiNarx > 0 && narx < oldingiNarx
    ? Math.round(((oldingiNarx - narx) / oldingiNarx) * 1000) / 10 : null;
  return { productId, sana: oxirgi?.sana ?? null, narx, oldingiNarx, tushdiFoiz };
}

export type SotuvSignali =
  | { id: string; tur: 'zaxira'; productId: number; zaxira: number; ulush: number; kun: number | null }
  | { id: string; tur: 'narx'; productId: number; narx: number; oldingiNarx: number; foiz: number; sana: string; ozNarx: number | null }
  | { id: string; tur: 'sharh'; productId: number; yangi: number; jami: number; reyting: number | null };

/**
 * Signallar. ID lar takrorlanmaydi: zaxira — tovar partiyasi boʻyicha
 * (tovar oxirgi olingan partiyada bir marta soʻraladi), narx — sana va
 * narx boʻyicha, sharh — sharhlar soni boʻyicha. Javob berilgan signal
 * qayta soʻralmaydi.
 */
export function sotuvSignallari(
  qatorlar: Array<{ productId: number; partiya: number; oz: OzHolat | null; raqobatchi: RaqobatchiHolat | null }>,
): SotuvSignali[] {
  const s: SotuvSignali[] = [];
  for (const q of qatorlar) {
    const o = q.oz;
    if (o && o.zaxira !== null && o.zaxiraUlush !== null && o.zaxiraUlush < ZAXIRA_SIGNAL_ULUSH) {
      s.push({ id: `zaxira:${q.productId}:p${q.partiya}`, tur: 'zaxira', productId: q.productId, zaxira: o.zaxira, ulush: o.zaxiraUlush, kun: o.zaxiraKun });
    }
    const r = q.raqobatchi;
    if (r && r.narx !== null && r.oldingiNarx !== null && r.tushdiFoiz !== null && r.tushdiFoiz >= NARX_SIGNAL_FOIZ && r.sana) {
      s.push({ id: `narx:${q.productId}:${r.sana}:${r.narx}`, tur: 'narx', productId: q.productId, narx: r.narx, oldingiNarx: r.oldingiNarx, foiz: r.tushdiFoiz, sana: r.sana, ozNarx: o?.narx ?? null });
    }
    if (o && o.yangiSharh > 0 && o.sharh !== null) {
      s.push({ id: `sharh:${q.productId}:${o.sharh}`, tur: 'sharh', productId: q.productId, yangi: o.yangiSharh, jami: o.sharh, reyting: o.reyting });
    }
  }
  return s;
}

/**
 * Keyingi oy rejasi (12-qadam yakuni) — har tovar uchun bitta jumla,
 * hozirgi tezlik va zaxiradan. Bashorat emas: "shu tezlikda".
 */
export function keyingiOyRejasi(
  qatorlar: Array<{ title: string; ozId: number | null; oz: OzHolat | null; raqobatchi: RaqobatchiHolat | null }>,
): string[] {
  return qatorlar.map((q) => {
    if (q.ozId === null) return `«${q.title}»: kartochka havolasi yoʻq — sotuv kuzatilmayapti; kartochka chiqqach havolani yuboring.`;
    const o = q.oz;
    if (!o || o.holat === 'kutilmoqda') return `«${q.title}»: kuzatuv endi boshlandi — birinchi raqamlar keyingi kunlarda chiqadi.`;
    if (o.tezlik === null) return `«${q.title}»: sotuv tezligi hali hisoblanmadi — ikki zaxira oʻlchovidan keyin chiqadi.`;
    if (o.tezlik === 0) {
      const narx = o.narx !== null ? `narxingiz ${o.narx} soʻm` : 'narxingiz oʻlchanmagan';
      const raqobatchi = q.raqobatchi?.narx ? `, raqobatchi ${q.raqobatchi.narx} soʻm` : '';
      return `«${q.title}»: oxirgi ${o.tezlikKun} oʻlchangan kunda sotuv qayd etilmadi${o.oyDona ? ` (shu oy ${o.oyDona} dona)` : ''} — ${narx}${raqobatchi}; birinchi surat va nomni tekshiring.`;
    }
    return `«${q.title}»: kuniga ~${o.tezlik} dona, zaxira ${o.zaxiraKun ?? '—'} kunga yetadi — yangi partiya shu muddatdan oldin kelishi uchun 1688 va kargo muddatini hisoblab buyurtma bering.`;
  });
}
