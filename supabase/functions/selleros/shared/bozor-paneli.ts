/**
 * Bozor paneli — Uzum turkumining 30 kunlik manzarasi (B, 2026-10-26).
 *
 * Nazoratchi qarori («Sotuvchi koʻzoynagi», 2-bosqich, 2026-10-26): Uzum
 * turkum yoki qidiruv sahifasida — shu turkum boʻyicha talab (oyiga necha
 * dona sotiladi), taklif (nechta tovar va doʻkon), narx zinapoyasi (sotuv
 * qaysi narxda koʻp) va raqobat (talabning qancha qismi eng katta doʻkonlarda).
 *
 * YANGI SOTUV FORMULASI YOʻQ. Har tovar sotuvi — `tovar-sotuvi.ts`
 * (`sotuvBahosi`, FORMULA.md «Tovar sotuvi», tasdiqlangan 2026-10-26); panel
 * kartochka belgilaridagi oʻsha raqamlarni turkum boʻyicha qoʻshadi va
 * guruhlaydi. Shuning uchun panel jami sahifadagi belgilar bilan bir xil
 * hisobda: odam ikkalasini solishtiradi — farq qilsa ishonch yoʻqoladi.
 * Guruhlash qoidalari (pogʻonalar, raqobat darajasi, «yangi») — FORMULA.md
 * «Bozor paneli», `bozor-paneli-v1`.
 *
 * NOL VA CHIZIQCHA (QOIDALAR.md, 4-boʻlim). Talabga faqat raqami bor tovar
 * kiradi. «Sotuv aniq emas» (ziddiyat) tovar raqami ishonchsiz — qoʻshilmaydi;
 * hali kam oʻlchangan tovar — raqamsiz. Ikkalasi alohida sanaladi va panelda
 * yoziladi: «talab ≈ N» shu tovarlarsiz ekani koʻrinsin.
 *
 * Modul sof: qatorlar kiradi, panel chiqadi. Bazani `so_bozor_qatorlar`
 * (migratsiya 0074) oʻqiydi, Edge `/kengaytma/bozor` chaqiradi.
 */

import { minglik } from './fakt.ts';
import {
  oynaKuni, sotuvBahosi, tovar30KunOqi, TOVAR_SOTUVI_VERSIYASI, YASHIL_OYIGA,
  type Ishonch, type SotuvBahosi, type Tovar30Kun,
} from './tovar-sotuvi.ts';

export const BOZOR_PANELI_VERSIYASI = 'bozor-paneli-v1';

/** Bir turkumdan eng koʻp qator (eng katta turkum 2026-10-26 da ~15 ming tovar). */
export const BOZOR_MAX_QATOR = 20_000;
/** Narx zinapoyasi: eng koʻp pogʻona (narx kvintillari). */
export const ZINA_POGONA = 5;
/**
 * Pogʻonada kamida shuncha raqamli tovar: kam tovarli turkumda pogʻonalar
 * kamayadi (30 ta tovar — 3 pogʻona), «1 tovarga eng koʻp» belgisi ham
 * shundan kam tovarli pogʻonaga qoʻyilmaydi — 2–3 tovarning tasodifi
 * «eng yaxshi narx» boʻlib koʻrinmasin.
 */
export const ZINA_KAM_TOVAR = 10;
/** Raqobat: eng katta 3 doʻkonning talabdagi ulushi, %. `ochiq` dan kam — ochiq, `qattiq` va koʻp — qattiq. */
export const RAQOBAT = { ochiq: 30, qattiq: 60 } as const;
/**
 * «Yangi» tovar: oxirgi `kun` kunda Uzumga qoʻyilgan (tovar raqami shu kungi
 * eng katta raqamdan katta — `zumsavdo.market_day.id_frontier`). `yaxshi` —
 * oyiga shuncha va koʻp. Chegara kuni `eskiKun` dan eski boʻlsa (oʻlchov
 * toʻxtagan) — «yangi» koʻrsatilmaydi: «oxirgi 60 kun» deb 4 oylik tovarni
 * aytib qoʻymaylik.
 */
export const YANGI = { kun: 60, yaxshi: 10, eskiKun: 90 } as const;
/** Raqamli tovar shundan kam — panel «maʼlumot kam» deydi, xulosa chiqarmaydi. */
export const BOZOR_KAM_TOVAR = 10;
/** Yaxshi sotilgan (oyiga ≥ `YASHIL_OYIGA`) shuncha tovar tugagan boʻlsa — «talab bor, tovar yetmayapti». */
export const TUGAGAN_BOZOR = 3;
export const TOP_TOVAR = 5;

export interface BozorKirishi {
  kategoriya: number;
  nom: string | null;
  qatorlar: readonly Tovar30Kun[];
  /** Doʻkon nomlari (id → nom). */
  dokonlar: ReadonlyMap<number, string>;
  /** «Yangi» chegarasi: shu kungi eng katta tovar raqami. `null` — nomaʼlum. */
  yangiChegara: { sana: string; id: number } | null;
  /** Turkumda `BOZOR_MAX_QATOR` dan koʻp tovar — qolgani hisoblanmadi. */
  kesildi: boolean;
}

export interface ZinaPogonasi {
  /** Pastki chegara, soʻm (kiradi); `null` — eng arzon pogʻona. */
  dan: number | null;
  /** Yuqori chegara (kirmaydi); `null` — eng qimmat pogʻona. */
  gacha: number | null;
  /** Qisqa yozuv: «< 50 ming», «50–100 ming», «≥ 250 ming». */
  yorliq: string;
  /** Raqamli tovarlar (ziddiyatsiz). */
  tovar: number;
  /** Ulardan oyiga kamida 1 dona sotilgani. */
  sotilgan: number;
  /** Oyiga jami, dona. */
  talab: number;
  /** 1 tovarga oyiga, dona. */
  birga: number;
  /** 1 tovarga eng koʻp sotuv shu pogʻonada (kamida `ZINA_KAM_TOVAR` tovar). */
  eng: boolean;
}

export interface BozorDokoni { id: number; nom: string | null; oyiga: number; ulush: number }

export interface BozorTovari {
  productId: number;
  nom: string | null;
  oyiga: number;
  narx: number | null;
  ishonch: Ishonch | null;
}

export type RaqobatDarajasi = 'ochiq' | 'orta' | 'qattiq';

export interface BozorPaneli {
  kategoriya: number;
  nom: string | null;
  /** Maʼlumot qaysi kun holatiga. */
  sana: string | null;
  oyna: { dan: string; gacha: string } | null;
  /** Taklif: bazadagi faol tovarlar (oxirgi 7 kunda oʻlchangan) va ularning doʻkonlari. */
  taklif: { tovar: number; dokon: number };
  /**
   * Talab: raqamli tovarlarning oyiga jami. `raqamli` — hisobga kirgan tovar,
   * `raqamsiz` — hali kam oʻlchangan, `ziddiyat` — raqami ishonchsiz (kirmadi).
   * `aylanma` — oyiga × hozirgi narx (soʻm, foyda emas); narxsiz — `null`.
   */
  talab: { oyiga: number; raqamli: number; raqamsiz: number; ziddiyat: number; aylanma: number | null };
  /** Oyiga kamida 1 dona sotilgan raqamli tovarlar; `ulush` — raqamlilarga nisbatan, %. */
  sotilgan: { soni: number; ulush: number | null };
  raqobat: { top3: number | null; daraja: RaqobatDarajasi | null; sotganDokon: number; dokonlar: BozorDokoni[] };
  zina: ZinaPogonasi[];
  yangi: { dan: string; soni: number; yaxshi: number; talabUlush: number | null } | null;
  /** Oxirgi kunlarda tugagan tovarlar; `yaxshiSotilgan` — ulardan oyiga ≥ `YASHIL_OYIGA` sotilgani. */
  tugagan: { soni: number; yaxshiSotilgan: number };
  top: BozorTovari[];
  xulosa: string[];
  kesildi: boolean;
  versiya: string;
  tovarSotuviVersiyasi: string;
}

// ====================================================================
// NARX ZINAPOYASI
// ====================================================================

/** Yumaloq narx qadamlari (× 10ⁿ): 50 ming, 60 ming, 80 ming, 100 ming, 150 ming… */
const YUMALOQ = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10] as const;

/** Eng yaqin yumaloq narx (log masofada): 89 500 → 100 000, 133 900 → 150 000. */
function yumaloq(n: number): number {
  const d = 10 ** Math.floor(Math.log10(n));
  const m = n / d;
  let eng: number = YUMALOQ[0];
  for (const y of YUMALOQ) if (Math.abs(Math.log(m / y)) < Math.abs(Math.log(m / eng))) eng = y;
  return Math.round(eng * d);
}

/**
 * Pogʻona chegaralari — yumaloq narxlar, 10- va 90-persentil orasida
 * geometrik teng qadam bilan (kam tovarda — kamroq pogʻona). KVINTIL EMAS:
 * kvintilda har pogʻonada tovar soni oʻz-oʻzidan teng chiqadi va «taklif»
 * ustuni hech narsa aytmaydi (jonli «Shimlar», 2026-10-25: 33/35/40/32/34).
 * Yumaloq chegarada esa taklif ham, talab ham pogʻonadan pogʻonaga oʻzgaradi.
 * Pogʻonada narx qolmasa chegara tashlanadi (yaxlitlash ikki chegarani
 * birlashtirishi yoki oxirgisini hamma narxdan yuqori qilishi mumkin).
 */
export function zinaChegaralari(narxlar: readonly number[]): number[] {
  const s = narxlar.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  const pogona = Math.min(ZINA_POGONA, Math.floor(s.length / ZINA_KAM_TOVAR));
  if (pogona < 2) return [];
  const persentil = (q: number) => s[Math.floor(q * (s.length - 1))]!;
  const past = persentil(0.1), yuqori = persentil(0.9);
  if (!(yuqori > past)) return [];
  const nomzod: number[] = [];
  for (let i = 1; i < pogona; i++) nomzod.push(yumaloq(past * (yuqori / past) ** (i / pogona)));
  const natija: number[] = [];
  let oldingi = -Infinity;
  for (const c of nomzod) {
    if (c <= oldingi) continue;
    const pastda = s.some((n) => n >= oldingi && n < c);
    const yuqorida = s.some((n) => n >= c);
    if (pastda && yuqorida) {
      natija.push(c);
      oldingi = c;
    }
  }
  return natija;
}

/** 1 kasr xonasi, vergul bilan, «,0» siz: 1,3 · 12 · 4,7. */
function kasr(x: number): string {
  const r = Math.round(x * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace('.', ',');
}

/** Narx soʻzda, birliksiz: 900 · 47 ming · 1,3 mln. */
function narxSoni(n: number): { son: string; birlik: string } {
  if (n >= 1_000_000) return { son: kasr(n / 1_000_000), birlik: 'mln' };
  if (n >= 1000) return { son: kasr(n / 1000), birlik: 'ming' };
  return { son: String(n), birlik: '' };
}
const narxMatni = (n: number) => { const x = narxSoni(n); return x.birlik ? `${x.son} ${x.birlik}` : x.son; };

function oraliqMatni(a: number, b: number): string {
  const x = narxSoni(a), y = narxSoni(b);
  return x.birlik === y.birlik ? `${x.son}–${y.son}${y.birlik ? ` ${y.birlik}` : ''}` : `${narxMatni(a)} – ${narxMatni(b)}`;
}

function zinaYorligi(dan: number | null, gacha: number | null): string {
  if (dan === null && gacha !== null) return `< ${narxMatni(gacha)}`;
  if (gacha === null && dan !== null) return `≥ ${narxMatni(dan)}`;
  if (dan !== null && gacha !== null) return oraliqMatni(dan, gacha);
  return 'hamma narx';
}

/** Xulosa gapi uchun: «50 ming soʻmdan arzon», «50–100 ming soʻmlik», «250 ming soʻmdan qimmat». */
function pogonaIbora(p: Pick<ZinaPogonasi, 'dan' | 'gacha'>): string {
  if (p.dan === null && p.gacha !== null) return `${narxMatni(p.gacha)} soʻmdan arzon`;
  if (p.gacha === null && p.dan !== null) return `${narxMatni(p.dan)} soʻmdan qimmat`;
  if (p.dan !== null && p.gacha !== null) return `${oraliqMatni(p.dan, p.gacha)} soʻmlik`;
  return 'hamma';
}

export function narxZinasi(tovarlar: ReadonlyArray<{ narx: number | null; oyiga: number }>): ZinaPogonasi[] {
  const narxli = tovarlar.filter((t): t is { narx: number; oyiga: number } => t.narx !== null && t.narx > 0);
  const chegaralar = zinaChegaralari(narxli.map((t) => t.narx));
  if (!chegaralar.length) return [];
  const pogonalar: ZinaPogonasi[] = [null, ...chegaralar].map((dan, i) => {
    const gacha = chegaralar[i] ?? null;
    const ichida = narxli.filter((t) => (dan === null || t.narx >= dan) && (gacha === null || t.narx < gacha));
    const talab = ichida.reduce((s, t) => s + t.oyiga, 0);
    return {
      dan, gacha, yorliq: zinaYorligi(dan, gacha),
      tovar: ichida.length,
      sotilgan: ichida.filter((t) => t.oyiga >= 1).length,
      talab,
      birga: ichida.length ? talab / ichida.length : 0,
      eng: false,
    };
  });
  const loyiq = pogonalar.filter((p) => p.tovar >= ZINA_KAM_TOVAR && p.birga > 0);
  if (loyiq.length) {
    const eng = loyiq.reduce((a, b) => (b.birga > a.birga ? b : a));
    eng.eng = true;
  }
  return pogonalar;
}

// ====================================================================
// PANEL
// ====================================================================

const OYLAR = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
/** «2026-08-26» → «26-avgust». */
function kunOy(sana: string): string {
  return `${Number(sana.slice(8, 10))}-${OYLAR[Number(sana.slice(5, 7)) - 1] ?? sana.slice(5, 7)}`;
}
function kunlarFarqi(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}
const foiz = (x: number) => `${Math.round(x)} %`;

/** Talabga kiradimi: raqam bor va ishonchsiz emas (QOIDALAR, 4-boʻlim). */
function hisobda(b: SotuvBahosi): boolean {
  return b.oyiga !== null && b.holat !== 'ziddiyat';
}

export function bozorPaneli(k: BozorKirishi): BozorPaneli {
  const bahoLar = k.qatorlar.map((t) => ({ t, b: sotuvBahosi(t, t.product_id) }));
  const sanalar = k.qatorlar.map((t) => t.sana).sort();
  const sana = sanalar.length ? sanalar[sanalar.length - 1]! : null;
  const raqamli = bahoLar.filter((x) => hisobda(x.b));
  const oyiga = (x: { b: SotuvBahosi }) => x.b.oyiga ?? 0;
  const talabJami = raqamli.reduce((s, x) => s + oyiga(x), 0);
  const narxli = raqamli.filter((x) => x.t.narx_oxirgi !== null);
  const aylanma = narxli.length ? narxli.reduce((s, x) => s + oyiga(x) * x.t.narx_oxirgi!, 0) : null;
  const sotilganSoni = raqamli.filter((x) => oyiga(x) >= 1).length;

  // ---- raqobat: talab doʻkonlar boʻyicha
  const dokonOyiga = new Map<number, number>();
  for (const x of raqamli) {
    if (x.t.dokon === null || oyiga(x) <= 0) continue;
    dokonOyiga.set(x.t.dokon, (dokonOyiga.get(x.t.dokon) ?? 0) + oyiga(x));
  }
  const dokonTartib = [...dokonOyiga].sort((a, b) => b[1] - a[1]);
  const top3 = talabJami > 0 ? (dokonTartib.slice(0, 3).reduce((s, [, n]) => s + n, 0) * 100) / talabJami : null;
  const daraja: RaqobatDarajasi | null = top3 === null ? null : top3 < RAQOBAT.ochiq ? 'ochiq' : top3 >= RAQOBAT.qattiq ? 'qattiq' : 'orta';

  // ---- yangi tovarlar
  let yangi: BozorPaneli['yangi'] = null;
  if (k.yangiChegara && sana && kunlarFarqi(k.yangiChegara.sana, sana) <= YANGI.eskiKun) {
    const chegara = k.yangiChegara.id;
    const yangilar = bahoLar.filter((x) => x.t.product_id > chegara);
    const yangiRaqamli = yangilar.filter((x) => hisobda(x.b));
    yangi = {
      dan: k.yangiChegara.sana,
      soni: yangilar.length,
      yaxshi: yangiRaqamli.filter((x) => oyiga(x) >= YANGI.yaxshi).length,
      talabUlush: talabJami > 0 ? (yangiRaqamli.reduce((s, x) => s + oyiga(x), 0) * 100) / talabJami : null,
    };
  }

  const tugaganlar = bahoLar.filter((x) => x.b.holat === 'tugagan');
  const zina = narxZinasi(raqamli.map((x) => ({ narx: x.t.narx_oxirgi, oyiga: oyiga(x) })));
  const top: BozorTovari[] = raqamli
    .filter((x) => x.b.ishonch !== 'past' && oyiga(x) > 0)
    .sort((a, b) => oyiga(b) - oyiga(a))
    .slice(0, TOP_TOVAR)
    .map((x) => ({ productId: x.t.product_id, nom: x.t.nom ?? x.t.nom_perepis ?? null, oyiga: oyiga(x), narx: x.t.narx_oxirgi, ishonch: x.b.ishonch }));

  const panel: BozorPaneli = {
    kategoriya: k.kategoriya,
    nom: k.nom,
    sana,
    oyna: sana ? { dan: oynaKuni(sana, 0), gacha: sana } : null,
    taklif: { tovar: k.qatorlar.length, dokon: new Set(k.qatorlar.map((t) => t.dokon).filter((d) => d !== null)).size },
    talab: {
      oyiga: talabJami,
      raqamli: raqamli.length,
      raqamsiz: bahoLar.filter((x) => x.b.oyiga === null).length,
      ziddiyat: bahoLar.filter((x) => x.b.holat === 'ziddiyat').length,
      aylanma,
    },
    sotilgan: { soni: sotilganSoni, ulush: raqamli.length ? (sotilganSoni * 100) / raqamli.length : null },
    raqobat: {
      top3, daraja, sotganDokon: dokonTartib.length,
      dokonlar: dokonTartib.slice(0, 3).map(([id, n]) => ({ id, nom: k.dokonlar.get(id) ?? null, oyiga: n, ulush: (n * 100) / talabJami })),
    },
    zina,
    yangi,
    tugagan: { soni: tugaganlar.length, yaxshiSotilgan: tugaganlar.filter((x) => oyiga(x) >= YASHIL_OYIGA).length },
    top,
    xulosa: [],
    kesildi: k.kesildi,
    versiya: BOZOR_PANELI_VERSIYASI,
    tovarSotuviVersiyasi: TOVAR_SOTUVI_VERSIYASI,
  };
  panel.xulosa = bozorXulosasi(panel);
  return panel;
}

/**
 * Xulosa — kod yozadi (QOIDALAR: tavsiyani kod beradi, AI faqat tushuntiradi).
 * Faqat fakt va qoida; «buni soting» yoʻq — qaror odamniki.
 */
export function bozorXulosasi(p: BozorPaneli): string[] {
  const x: string[] = [];
  if (p.talab.raqamli < BOZOR_KAM_TOVAR) {
    x.push(p.talab.raqamli === 0
      ? 'Bu turkumda sotuvi oʻlchangan tovar hali yoʻq — bozor haqida xulosa chiqarib boʻlmaydi.'
      : `Bu turkumda sotuvi oʻlchangan tovar kam (${p.talab.raqamli} ta) — raqamlar tasodifiy boʻlishi mumkin.`);
    return x;
  }

  if (p.zina.length >= 2 && p.talab.oyiga > 0) {
    const engTalab = p.zina.reduce((a, b) => (b.talab > a.talab ? b : a));
    const engTovar = p.zina.reduce((a, b) => (b.tovar > a.tovar ? b : a));
    x.push(
      `Talab eng katta — ${pogonaIbora(engTalab)} tovarlarda: oyiga ≈ ${minglik(Math.round(engTalab.talab))} dona ` +
      `(${foiz((engTalab.talab * 100) / p.talab.oyiga)}).` +
      (engTovar === engTalab ? ` Tovar ham u yerda eng koʻp — ${minglik(engTalab.tovar)} ta.` : ''),
    );
    const engBirga = p.zina.find((z) => z.eng);
    if (engBirga && engBirga !== engTalab) {
      x.push(`1 tovarga eng koʻp sotuv — ${pogonaIbora(engBirga)} tovarlarda: oyiga ≈ ${kasr(engBirga.birga)} dona.`);
    }
  }

  const r = p.raqobat;
  if (r.top3 !== null) {
    const f = Math.round(r.top3);
    if (r.sotganDokon <= 3) {
      x.push(`Sotuv faqat ${r.sotganDokon} ta doʻkonda — bozor ular qoʻlida.`);
    } else if (r.daraja === 'ochiq') {
      x.push(`Bozor bitta doʻkon qoʻlida emas: eng katta 3 doʻkon ulushi ${f} foiz.`);
    } else if (r.daraja === 'orta') {
      x.push(`Eng katta 3 doʻkon talabning ${f} foizini oladi.`);
    } else {
      x.push(`Talabning ${f} foizi eng katta 3 doʻkonda — ular bilan raqobat qilish qiyin.`);
    }
  }

  if (p.yangi && p.yangi.soni >= 5) {
    x.push(p.yangi.yaxshi > 0
      ? `${kunOy(p.yangi.dan)}dan keyin qoʻyilgan ${minglik(p.yangi.soni)} tovardan ${minglik(p.yangi.yaxshi)} tasi oyiga ${YANGI.yaxshi} donadan koʻp sotilyapti.`
      : `${kunOy(p.yangi.dan)}dan keyin qoʻyilgan ${minglik(p.yangi.soni)} tovardan hech biri oyiga ${YANGI.yaxshi} donaga yetmagan.`);
  }

  // Bitta-ikkita tugagan tovar — tasodif (sotuvchi toʻldirishga ulgurmagan); bozor
  // haqidagi «tovar yetmayapti» gapi kamida `TUGAGAN_BOZOR` tadan keyin.
  if (p.tugagan.yaxshiSotilgan >= TUGAGAN_BOZOR) {
    x.push(`${minglik(p.tugagan.yaxshiSotilgan)} ta yaxshi sotilgan tovar oxirgi kunlarda tugab qolgan — talab bor, tovar yetmayapti.`);
  } else if (p.tugagan.yaxshiSotilgan > 0) {
    x.push(`Yaxshi sotilgan ${p.tugagan.yaxshiSotilgan} ta tovar oxirgi kunlarda tugab qolgan.`);
  }

  if (p.taklif.tovar > 0 && p.talab.raqamsiz / p.taklif.tovar >= 0.3) {
    x.push(`${minglik(p.talab.raqamsiz)} ta tovar hali kam oʻlchangan — ularning sotuvi talabga kirmadi.`);
  }
  if (p.kesildi) x.push(`Turkum juda katta — ${minglik(BOZOR_MAX_QATOR)} ta tovar hisoblandi, qolgani kirmadi.`);
  return x;
}

// ====================================================================
// SOʻROV: RPC javobi va qidiruv sahifasidagi turkum
// ====================================================================

/** `so_bozor_qatorlar` javobi → kirish. Buzuq javob — `null`. */
export function bozorKirishiniOqi(json: unknown): BozorKirishi | null {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) return null;
  const j = json as Record<string, unknown>;
  const kategoriya = typeof j.kategoriya === 'number' ? j.kategoriya : Number(j.kategoriya);
  if (!Number.isSafeInteger(kategoriya) || kategoriya <= 0) return null;
  const dokonlar = new Map<number, string>();
  if (Array.isArray(j.dokonlar)) {
    for (const d of j.dokonlar) {
      const q = d as { id?: unknown; nom?: unknown } | null;
      const id = Number(q?.id);
      if (Number.isSafeInteger(id) && typeof q?.nom === 'string' && q.nom.trim()) dokonlar.set(id, q.nom.trim());
    }
  }
  const yc = j.yangi_chegara as { sana?: unknown; id?: unknown } | null | undefined;
  const ycId = Number(yc?.id);
  const ycSana = typeof yc?.sana === 'string' && /^\d{4}-\d{2}-\d{2}/.test(yc.sana) ? yc.sana.slice(0, 10) : null;
  return {
    kategoriya,
    nom: typeof j.nom === 'string' && j.nom.trim() ? j.nom.trim() : null,
    qatorlar: tovar30KunOqi(j.qatorlar),
    dokonlar,
    yangiChegara: ycSana && Number.isSafeInteger(ycId) && ycId > 0 ? { sana: ycSana, id: ycId } : null,
    kesildi: j.kesildi === true,
  };
}

/** Turkum id: musbat butun son (`11931` yoki `"11931"`), aks holda `null`. */
export function turkumniOqi(x: unknown): number | null {
  const n = typeof x === 'number' ? x : typeof x === 'string' && /^\s*\d{1,11}\s*$/.test(x) ? Number(x) : NaN;
  return Number.isSafeInteger(n) && n > 0 && n < 1e11 ? n : null;
}
