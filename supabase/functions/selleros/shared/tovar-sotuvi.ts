/**
 * Tovar sotuvi — Uzumdagi istalgan tirik tovarning oxirgi 30 kuni (2026-10-21).
 *
 * Nazoratchi qarori («Sotuvchi koʻzoynagi», 2026-10-21): Chrome kengaytmasi
 * Uzum roʻyxatida har tovar tagida sotuvni koʻrsatadi (A — kartochka belgisi,
 * bepul), tovar sahifasida pasport (C) va taqqoslash jadvali (D) — obunada.
 *
 * MANBA. ZumSavdo yigʻuvchisi (VPS) butun katalogni har kuni oʻlchaydi
 * (~700 ming tovar/kun) va kuniga bir marta har tirik tovar uchun 30 kunlik
 * qatorni `zumsavdo.tovar_30kun` ga yozadi (zumsavdo `ingest/xulosa.mjs`).
 * Qatorda oʻlchovning oʻzi bor; sotuv SHU MODULDA hisoblanadi — formula
 * oʻzgarsa bazani qayta yozish shart emas. Modul sof.
 *
 * NEGA TOZALANADI (FORMULA.md, «Tovar sotuvi»). Faqat qoldiq kamayishini
 * sanash adashtiradi. Oʻlchandi (Termoslar, 21.09–20.10.2026): «eng koʻp
 * sotilgan» 8 tovardan 7 tasi sotuvchi zaxirani BIR KUNDA yuzlab donaga
 * kamaytirgan (oʻchirgan, koʻchirgan) — sotuv emas; «Termos KINSDA»: hisob
 * boʻyicha 713 dona, Uzumning oʻz belgisi esa haftasiga 1 kishi. Shuning
 * uchun bitta kundagi kamayish chegaralanadi va raqam uch belgi bilan
 * solishtiriladi: qoldiq kamayishi, Uzumning «N kishi shu hafta sotib oldi»
 * belgisi, yangi sharhlar. Belgi faqat CHEGARANI KENGAYTIRADI (koʻp xaridor
 * boʻlsa katta kun ham sanaladi) — uning maʼnosi tasdiqlanmagan
 * (`qadamlar.ts`, MIQDOR_UCHUN_MANBA), raqamning oʻrnini bosmaydi.
 *
 * NOL VA CHIZIQCHA (QOIDALAR.md, 4-boʻlim). `sotilmadi` — oʻlchandi, sotuv
 * yoʻq; `kam`/`olchanmagan` — javob yoʻq, raqam koʻrsatilmaydi.
 */

import { minglik } from './fakt.ts';
import { UZUM_LOGISTIKA } from './tannarx.ts';

export const OYNA_KUN = 30;
export const TOVAR_SOTUVI_VERSIYASI = 'tovar-sotuvi-v1';

/** Shundan kam kun sotuvi maʼlum boʻlsa — raqam koʻrsatilmaydi («hali kam oʻlchandi»). */
export const KAM_OLCHOV_KUN = 7;
/** Ishonch «yuqori» — kamida shuncha maʼlum kun. */
export const YUQORI_ISHONCH_KUN = 20;
/** Ishonch «oʻrta» — kamida shuncha; kami — «past». */
export const ORTA_ISHONCH_KUN = 14;
/**
 * Bir kunda sotuv deb sanaladigan eng koʻp kamayish:
 * `max(mutlaq, nisbiy × p75, ⌈belgiKoef × eng katta belgi / 7⌉, ⌈sharhKoef × yangi sharh / oʻlchangan kun⌉)`.
 * p75 — shu tovarning maʼlum kunlaridagi kamayishning 75-persentili (odatiy
 * yaxshi kun). Belgi va sharh chegarani faqat KENGAYTIRADI: koʻp xaridori
 * bor tovarning katta kuni (aksiya) sanalsin. `sharhKoef` = 30: sharhni
 * taxminan har 10-xaridor yozadi deb olinadi (taxmin, oʻlchanmagan), ustiga
 * 3 barobar zaxira. Oʻlchandi (jonli 1334924, BB krem): 30 kunda +214 sharh,
 * sharhsiz chegara uning aksiya kunlarini (437 dan 135 tasini) kesardi.
 * Chegaradan oshgan kun «zaxira tuzatish» boʻlishi mumkin va sanalmaydi.
 */
export const KUNLIK_CHEGARA = { mutlaq: 10, nisbiy: 5, belgiKoef: 3, sharhKoef: 30 } as const;
/** Oyiga shuncha va koʻp — «sotilyapti» (yashil). */
export const YASHIL_OYIGA = 30;
/** Oxirgi shuncha oʻlchangan kun qoldiq 0 — «tugagan». */
export const TUGAGAN_KUN = 3;
/**
 * Ziddiyat — raqam ishonchsiz, kartochkada «Sotuv aniq emas»:
 * (a) bizning raqam Uzum belgisidan `koef` barobar (va kamida `qoshimcha`
 *     dona) katta, yangi sharh esa yoʻq;
 * (b) belgi oyiga kamida `belgiMin` deydi, qoldiq esa deyarli kamaymaydi
 *     (raqam belgining 1/koef qismidan kam) — sotuvchi qoldiqni yangilamayotgan
 *     boʻlishi mumkin (jonli tanlovda 78 tadan 9 tasi);
 * (c) qoldiq kamayishining yarmidan koʻpi kesilgan (kamida `kesilganMin`
 *     dona) va qolganini hech bir belgi tasdiqlamaydi — «Termos KINSDA»
 *     (713 dona, belgi haftasiga 1) kabi.
 * `belgiMin` 100: kichik belgida (haftasiga ~8) farq maʼnosiz va kartochkalar
 * «aniq emas» bilan toʻlib ketardi (jonli: 30 boʻlganda 78 tadan 16 tasi).
 */
export const ZIDDIYAT = { koef: 10, qoshimcha: 50, belgiMin: 100, kesilganMin: 50 } as const;

/** `zumsavdo.tovar_30kun` qatori (jadval ustunlari bilan bir xil) + RPC qoʻshimchasi. */
export interface Tovar30Kun {
  product_id: number;
  /** Oynaning oxirgi kuni (YYYY-MM-DD). */
  sana: string;
  olchangan_kun: number;
  qoldiq_oxirgi: number | null;
  tugagan_kun: number;
  tugaganiga: number;
  narx_oxirgi: number | null;
  narx_min: number | null;
  narx_max: number | null;
  /**
   * Kunlik qoldiq kamayishi, 30 ta, eskisi birinchi. Harakatsiz tovarda — `null`.
   * Element `null` — nomaʼlum (oʻlchanmagan yoki farqni olib boʻlmagan), nol emas.
   */
  sotildi: Array<number | null> | null;
  /** Bitmask (0-bit — eng eski kun): tovar oʻlchangan kunlar. Harakatsiz tovarda `null`. */
  olchangan_mask: number | null;
  /** Bitmask: qoldiq 0 boʻlgan kunlar. */
  tugagan_mask: number | null;
  /** Bitmask: SKU oʻlchanmagan, kamayish tovar qoldigʻi farqidan olingan kunlar. */
  qoldiqdan_mask: number | null;
  /** Kunlik narx — faqat narx oʻzgargan faol tovarda; aks holda `null` (`narx_oxirgi` yetadi). */
  narx: Array<number | null> | null;
  belgi: number | null;
  belgi_max: number | null;
  sharh_bosh: number | null;
  sharh: number | null;
  chegirma: number | null;
  kategoriya: number | null;
  dokon: number | null;
  nom: string | null;
  /** `selleros.uzum_komissiya` (FBO, chegirmadan keyin). */
  komissiya_foizi?: number | null;
  kategoriya_nomi?: string | null;
  /** Harakatsiz tovarda nom yozilmaydi — perepisdagi nom. */
  nom_perepis?: string | null;
}

function son(x: unknown): number | null {
  if (typeof x === 'number') return Number.isFinite(x) ? x : null;
  if (typeof x === 'string' && x.trim() !== '' && Number.isFinite(Number(x))) return Number(x);
  return null;
}
function massiv(x: unknown): Array<number | null> | null {
  if (!Array.isArray(x)) return null;
  if (x.length !== OYNA_KUN) return null;
  return x.map(son);
}
function matn(x: unknown): string | null {
  return typeof x === 'string' && x.trim() ? x : null;
}

/** RPC javobi → qatorlar. Buzuq qator (id yoki sana yoʻq) tashlanadi. */
export function tovar30KunOqi(json: unknown): Tovar30Kun[] {
  if (!Array.isArray(json)) return [];
  const natija: Tovar30Kun[] = [];
  for (const x of json) {
    if (x === null || typeof x !== 'object') continue;
    const q = x as Record<string, unknown>;
    const id = son(q.product_id);
    const sana = typeof q.sana === 'string' && /^\d{4}-\d{2}-\d{2}/.test(q.sana) ? q.sana.slice(0, 10) : null;
    if (id === null || sana === null) continue;
    natija.push({
      product_id: id,
      sana,
      olchangan_kun: son(q.olchangan_kun) ?? 0,
      qoldiq_oxirgi: son(q.qoldiq_oxirgi),
      tugagan_kun: son(q.tugagan_kun) ?? 0,
      tugaganiga: son(q.tugaganiga) ?? 0,
      narx_oxirgi: son(q.narx_oxirgi),
      narx_min: son(q.narx_min),
      narx_max: son(q.narx_max),
      sotildi: massiv(q.sotildi),
      olchangan_mask: son(q.olchangan_mask),
      tugagan_mask: son(q.tugagan_mask),
      qoldiqdan_mask: son(q.qoldiqdan_mask),
      narx: massiv(q.narx),
      belgi: son(q.belgi),
      belgi_max: son(q.belgi_max),
      sharh_bosh: son(q.sharh_bosh),
      sharh: son(q.sharh),
      chegirma: son(q.chegirma),
      kategoriya: son(q.kategoriya),
      dokon: son(q.dokon),
      nom: matn(q.nom),
      komissiya_foizi: son(q.komissiya_foizi),
      kategoriya_nomi: matn(q.kategoriya_nomi),
      nom_perepis: matn(q.nom_perepis),
    });
  }
  return natija;
}

/** Oynaning i-kuni (0 — eng eskisi). */
export function oynaKuni(sana: string, i: number): string {
  const t = Date.parse(`${sana}T00:00:00Z`) - (OYNA_KUN - 1 - i) * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

export type SotuvHolati = 'sotilyapti' | 'sekin' | 'sotilmadi' | 'tugagan' | 'ziddiyat' | 'kam' | 'olchanmagan';
export type Ishonch = 'yuqori' | 'orta' | 'past';

export interface KunSotuvi {
  sana: string;
  /** Oʻsha kuni sotuv deb sanalgan. `null` — nomaʼlum (oʻlchanmagan). */
  sanaldi: number | null;
  /** Qoldiq kamayishi (tozalashdan oldin). */
  kamaydi: number | null;
  /** Qoldiq 0 edi. `null` — oʻlchanmagan. */
  tugagan: boolean | null;
  narx: number | null;
}

export interface SotuvBahosi {
  productId: number;
  holat: SotuvHolati;
  /** `null` — raqam yoʻq (`kam`, `olchanmagan`). */
  ishonch: Ishonch | null;
  /** 30 kunga keltirilgan, tozalangan sotuv (dona). `null` — koʻrsatilmaydi. */
  oyiga: number | null;
  /** Sotuvi maʼlum kunlar. */
  malumKun: number;
  /** Oʻlchangan kunlar (qoldiq bor). */
  olchanganKun: number;
  oyna: { dan: string; gacha: string } | null;
  /** Tozalashdan oldingi kamayishlar yigʻindisi (maʼlum kunlar). */
  xom: number;
  /** Sanalmagan qism (zaxira tuzatish boʻlishi mumkin). */
  kesildi: number;
  kunlikChegara: number | null;
  /** SKU oʻlchovi yoʻq, sotuv tovar qoldigʻi farqidan olingan kunlar. */
  qoldiqdanKun: number;
  belgi: number | null;
  /** Uzum belgisi oyga: belgi × 30 / 7 (maʼnosi tasdiqlanmagan — faqat solishtirish uchun). */
  belgiOylik: number | null;
  sharh: number | null;
  sharhOsish: number | null;
  qoldiq: number | null;
  tugaganKun: number;
  tugaganiga: number;
  narx: { oxirgi: number | null; engKam: number | null; engKop: number | null };
  chegirma: number | null;
  /** Odam oʻqiydigan izohlar (nega raqam shunday). */
  sabablar: string[];
  /** Pasport grafigi uchun (faol tovarda). */
  kunlar: KunSotuvi[];
}

function bitBor(mask: number | null, i: number): boolean {
  return mask !== null && ((mask >>> i) & 1) === 1;
}
function bitlar(mask: number | null): number {
  let n = 0;
  for (let i = 0; i < OYNA_KUN; i++) if (bitBor(mask, i)) n += 1;
  return n;
}

function persentil75(qiymatlar: number[]): number {
  if (!qiymatlar.length) return 0;
  const s = [...qiymatlar].sort((a, b) => a - b);
  return s[Math.floor(0.75 * (s.length - 1))]!;
}

/** Bitta tovar. `t === null` — bazada qatori yoʻq: oʻlchanmagan (nol emas). */
export function sotuvBahosi(t: Tovar30Kun | null, productId: number): SotuvBahosi {
  const bosh: SotuvBahosi = {
    productId,
    holat: 'olchanmagan', ishonch: null, oyiga: null, malumKun: 0, olchanganKun: 0, oyna: null,
    xom: 0, kesildi: 0, kunlikChegara: null, qoldiqdanKun: 0,
    belgi: null, belgiOylik: null, sharh: null, sharhOsish: null, qoldiq: null,
    tugaganKun: 0, tugaganiga: 0, narx: { oxirgi: null, engKam: null, engKop: null }, chegirma: null,
    sabablar: [], kunlar: [],
  };
  if (t === null || t.olchangan_kun <= 0) return bosh;

  const b: SotuvBahosi = {
    ...bosh,
    olchanganKun: t.olchangan_kun,
    oyna: { dan: oynaKuni(t.sana, 0), gacha: t.sana },
    belgi: t.belgi,
    belgiOylik: t.belgi === null ? null : Math.round((t.belgi * OYNA_KUN) / 7),
    sharh: t.sharh,
    sharhOsish: t.sharh !== null && t.sharh_bosh !== null ? Math.max(0, t.sharh - t.sharh_bosh) : null,
    qoldiq: t.qoldiq_oxirgi,
    tugaganKun: t.tugagan_kun,
    tugaganiga: t.tugaganiga,
    chegirma: t.chegirma,
  };

  // Kunlik kamayish yigʻuvchida tayyor (SKU yigʻindisi, u yoʻq kuni — tovar qoldigʻi farqi).
  const faol = t.sotildi !== null && t.olchangan_mask !== null;
  const kunlik: Array<number | null> = [];
  if (faol) {
    for (let i = 0; i < OYNA_KUN; i++) {
      const olchandi = bitBor(t.olchangan_mask, i);
      const s = t.sotildi![i] ?? null;
      kunlik.push(olchandi && s !== null ? Math.max(0, s) : null);
    }
    b.qoldiqdanKun = bitlar(t.qoldiqdan_mask);
  } else {
    // Harakatsiz: 30 kunda kamayish ham, toʻldirish ham, qoldiq oʻzgarishi ham yoʻq — har oʻlchangan kun 0.
    for (let i = 0; i < t.olchangan_kun; i++) kunlik.push(0);
  }
  const malum = kunlik.filter((x): x is number => x !== null);
  b.malumKun = malum.length;
  b.xom = malum.reduce((s, x) => s + x, 0);

  const p75 = persentil75(malum);
  const chegara = Math.max(
    KUNLIK_CHEGARA.mutlaq,
    KUNLIK_CHEGARA.nisbiy * p75,
    Math.ceil((KUNLIK_CHEGARA.belgiKoef * (t.belgi_max ?? 0)) / 7),
    Math.ceil((KUNLIK_CHEGARA.sharhKoef * (b.sharhOsish ?? 0)) / Math.max(1, t.olchangan_kun)),
  );
  b.kunlikChegara = chegara;
  // Chegaradan oshgan kun BUTUNLAY sanalmaydi (chegaragacha qismi ham emas): «666 → 0 → 666»
  // kabi kunda haqiqiy sotuv yoʻq — chegarani sanasak, sotilmayotgan tovar «oyiga ~14 dona»
  // boʻlib chiqardi (jonli 1580691). Narxi — haqiqiy katta kun ham yoʻqoladi: raqam pastga
  // qiyshiq, yuqoriga emas (SXEMA.md, sales_estimates).
  const sanaldi = kunlik.map((x) => (x === null ? null : x > chegara ? 0 : x));
  const sanalganJami = sanaldi.reduce<number>((s, x) => s + (x ?? 0), 0);
  b.kesildi = b.xom - sanalganJami;
  if (b.malumKun >= KAM_OLCHOV_KUN) b.oyiga = Math.round((sanalganJami * OYNA_KUN) / b.malumKun);

  b.narx = {
    oxirgi: t.narx_oxirgi,
    engKam: t.narx_min ?? t.narx_oxirgi,
    engKop: t.narx_max ?? t.narx_oxirgi,
  };
  if (faol) {
    b.kunlar = Array.from({ length: OYNA_KUN }, (_, i) => {
      const olchandi = bitBor(t.olchangan_mask, i);
      return {
        sana: oynaKuni(t.sana, i),
        sanaldi: sanaldi[i] ?? null,
        kamaydi: kunlik[i] ?? null,
        tugagan: olchandi ? bitBor(t.tugagan_mask, i) : null,
        // Narx massivi faqat narx oʻzgarganda keladi; oʻzgarmagan — oʻlchangan har kunda oxirgi narx.
        narx: olchandi ? (t.narx ? t.narx[i] ?? null : t.narx_oxirgi) : null,
      };
    });
  }

  // ---- izohlar
  if (b.kesildi > 0) {
    const kesilgan = kunlik.filter((x): x is number => x !== null && x > chegara);
    b.sabablar.push(
      `${kesilgan.length === 1 ? 'Bir kunda' : `${kesilgan.length} kunda`} qoldiq keskin kamaygan ` +
      `(${kesilgan.length === 1 ? '' : 'eng kattasi '}${minglik(Math.max(...kesilgan))} dona) — sotuv deb sanalmadi: ` +
      'sotuvchi zaxirani oʻchirgan yoki koʻchirgan boʻlishi mumkin.',
    );
  }
  if (b.qoldiqdanKun > 0) {
    b.sabablar.push(`${b.qoldiqdanKun} kunda SKU qoldigʻi oʻlchanmagan — sotuv tovar qoldigʻi farqidan olindi (biroz kam chiqishi mumkin).`);
  }

  // ---- ziddiyat (ZIDDIYAT izohida (a), (b), (c))
  const sharhYoq = (b.sharhOsish ?? 0) === 0;
  const belgiMatni = b.belgi === null ? 'Uzum belgisi yoʻq' : `Uzum belgisi haftasiga ${minglik(b.belgi)} kishi`;
  const zidA = b.belgiOylik !== null && b.oyiga !== null
    && b.oyiga > Math.max(ZIDDIYAT.koef * b.belgiOylik, b.belgiOylik + ZIDDIYAT.qoshimcha) && sharhYoq;
  const zidB = b.belgiOylik !== null && b.belgiOylik >= ZIDDIYAT.belgiMin && b.oyiga !== null
    && b.oyiga < b.belgiOylik / ZIDDIYAT.koef && (t.qoldiq_oxirgi ?? 0) > 0 && t.tugaganiga < TUGAGAN_KUN;
  const zidC = b.xom > 0 && b.kesildi / b.xom > 0.5 && b.kesildi >= ZIDDIYAT.kesilganMin && sharhYoq
    && (b.belgiOylik === null || b.belgiOylik * 3 < b.kesildi);
  if (zidA) {
    b.sabablar.push(`Qoldiq oyiga ~${minglik(b.oyiga!)} dona sur'atda kamaygan, lekin ${belgiMatni} va yangi sharh yoʻq — bu sotuv emas boʻlishi mumkin.`);
  }
  if (zidB) {
    b.sabablar.push(`${belgiMatni}, qoldiq esa deyarli kamaymaydi — sotuvchi qoldiqni yangilamayotgan boʻlishi mumkin.`);
  }
  if (zidC && !zidA) {
    b.sabablar.push(`Qoldiq ${minglik(b.kesildi)} taga keskin kamaygan, lekin yangi sharh yoʻq, ${belgiMatni} — sotuv ekani tasdiqlanmadi.`);
  }
  const zid = zidA || zidB || zidC;

  // ---- holat
  if (t.tugaganiga >= TUGAGAN_KUN) {
    b.holat = 'tugagan';
    b.sabablar.push(
      `Oxirgi ${t.tugaganiga} oʻlchangan kunda qoldiq 0 — tovar tugagan.` +
      ((t.belgi ?? 0) > 0 ? ` Uzumdagi «${minglik(t.belgi!)} kishi shu hafta sotib oldi» yozuvi eskirgan.` : ''),
    );
  } else if (b.malumKun < KAM_OLCHOV_KUN) {
    b.holat = 'kam';
    b.oyiga = null;
  } else if (zid) {
    b.holat = 'ziddiyat';
  } else if ((b.oyiga ?? 0) >= YASHIL_OYIGA) {
    b.holat = 'sotilyapti';
  } else if ((b.oyiga ?? 0) >= 1) {
    b.holat = 'sekin';
  } else {
    b.holat = 'sotilmadi';
  }

  // ---- ishonch
  if (b.oyiga === null) {
    b.ishonch = null;
  } else {
    // Tasdiq: tozalangan raqam boshqa belgilar bilan mos keladimi. Belgi bor — 5 barobar
    // oraligʻida; yoʻq — kichik raqam yoki yangi sharh. Katta qismi kesilgan, lekin qolgani
    // tasdiqlangan tovar (jonli 3302715: bir kunda 710, qolgani belgi va +45 sharh bilan mos)
    // ishonchli; tasdiqsiz — yoʻq.
    const kesilganUlush = b.xom > 0 ? b.kesildi / b.xom : 0;
    const tasdiq = b.belgiOylik === null
      ? b.oyiga < YASHIL_OYIGA || (b.sharhOsish ?? 0) >= 1
      : b.belgiOylik === 0
        ? b.oyiga === 0
        : b.oyiga / b.belgiOylik >= 0.2 && b.oyiga / b.belgiOylik <= 5;
    if (zid || b.malumKun < ORTA_ISHONCH_KUN || (kesilganUlush > 0.5 && !tasdiq)) b.ishonch = 'past';
    else if (b.malumKun >= YUQORI_ISHONCH_KUN && tasdiq) b.ishonch = 'yuqori';
    else b.ishonch = 'orta';
  }
  return b;
}

// ====================================================================
// SOʻROV: tovar id lari
// ====================================================================

/** Bitta belgilar soʻrovida eng koʻp tovar (Uzum sahifasida 48–100 kartochka). */
export const BELGI_MAX = 100;

/**
 * Soʻrovdagi id lar: massiv yoki «1,2,3» matni; musbat butun, takrorsiz,
 * tartib saqlanadi. Boʻsh yoki `max` dan koʻp — `null` (400): jimgina
 * kesilsa, chaqiruvchi qolganlarini «oʻlchanmagan» deb oʻylardi.
 */
export function idlarniOqi(x: unknown, max: number): number[] | null {
  const xom = Array.isArray(x) ? x : typeof x === 'string' ? x.split(',') : null;
  if (xom === null) return null;
  const natija: number[] = [];
  for (const v of xom) {
    const n = typeof v === 'number' ? v : typeof v === 'string' && /^\s*\d{1,11}\s*$/.test(v) ? Number(v) : NaN;
    if (!Number.isSafeInteger(n) || n <= 0 || n >= 1e11) return null;
    if (!natija.includes(n)) natija.push(n);
  }
  return natija.length && natija.length <= max ? natija : null;
}

// ====================================================================
// A — KARTOCHKA BELGISI (bepul)
// ====================================================================

export interface KartochkaBelgisi {
  productId: number;
  /** yashil — sotilyapti; sariq — sekin yoki aniq emas; kulrang — sotuv yoʻq/tugagan; yoq — oʻlchanmagan. */
  rang: 'yashil' | 'sariq' | 'kulrang' | 'yoq';
  matn: string;
  /**
   * Rasm ustidagi kichik yozuv (kengaytma 0.3.0). Uzum toʻrida qator balandligi
   * qatʼiy (444 px, oʻlchandi 2026-10-21) — kartochka ostiga qoʻshilgan qator
   * keyingi qatorga toshardi; belgi rasm burchagida turadi, toʻliq matn — ustiga
   * kelganda. Qisqa boʻlsin: chapdan ~70 px, markazdagi «Reklama» ga yetmasin.
   */
  qisqa: string;
  izoh: string;
}

/** Rasm ustidagi qisqa yozuv. */
function qisqaYozuv(b: SotuvBahosi): string {
  switch (b.holat) {
    case 'sotilyapti':
    case 'sekin': return `≈ ${minglik(b.oyiga!)}/oy`;
    case 'ziddiyat': return 'aniq emas';
    case 'tugagan': return 'tugagan';
    case 'sotilmadi': return 'sotuv yoʻq';
    default: return '—';
  }
}

const ISHONCH_MATNI: Record<Ishonch, string> = { yuqori: 'ishonch yuqori', orta: 'ishonch oʻrta', past: 'ishonch past' };

export function kartochkaBelgisi(b: SotuvBahosi): KartochkaBelgisi {
  return { ...belgiAsosi(b), qisqa: qisqaYozuv(b) };
}

function belgiAsosi(b: SotuvBahosi): Omit<KartochkaBelgisi, 'qisqa'> {
  const id = b.productId;
  switch (b.holat) {
    case 'sotilyapti':
    case 'sekin': {
      const qism = [`${b.malumKun} kun oʻlchandi`];
      if (b.tugaganKun > 0) qism.push(`${b.tugaganKun} kuni tugagan`);
      qism.push(ISHONCH_MATNI[b.ishonch ?? 'past']);
      return {
        productId: id,
        // Yashil — «barqaror sotilyapti»: ishonchi past raqam (masalan, 10 kun oʻlchangan) yashil boʻlmaydi.
        rang: b.holat === 'sotilyapti' && b.ishonch !== 'past' ? 'yashil' : 'sariq',
        matn: `≈ ${minglik(b.oyiga!)} dona/oy`,
        izoh: qism.join(' · '),
      };
    }
    case 'ziddiyat':
      return { productId: id, rang: 'sariq', matn: 'Sotuv aniq emas', izoh: b.sabablar[b.sabablar.length - 1] ?? '' };
    case 'tugagan':
      return {
        productId: id, rang: 'kulrang', matn: 'Tugagan',
        izoh: `${b.tugaganiga} kundan beri qoldiq 0` + ((b.belgi ?? 0) > 0 ? ' · Uzum belgisi eskirgan' : ''),
      };
    case 'sotilmadi':
      // Uzum belgisi ham koʻrsatiladi: odam sahifada «N kishi shu hafta sotib oldi» ni koʻradi —
      // ikkalasi yonma-yon tursa, nega farq qilishini oʻzi koʻradi.
      return {
        productId: id, rang: 'kulrang', matn: 'Sotuv koʻrinmadi',
        izoh: `${b.malumKun} kunda qoldiq kamaymadi` + ((b.belgi ?? 0) > 0 ? ` · Uzum belgisi: haftasiga ${minglik(b.belgi!)}` : ''),
      };
    case 'kam':
      return { productId: id, rang: 'yoq', matn: '—', izoh: `hali ${b.olchanganKun} kun oʻlchandi` };
    default:
      return { productId: id, rang: 'yoq', matn: '—', izoh: 'oʻlchanmagan' };
  }
}

/**
 * Soʻralgan har id uchun belgi, soʻrov tartibida. Bazada qatori yoʻq id —
 * «oʻlchanmagan» (jimgina tushib qolmaydi). `sana` — maʼlumot qaysi kun
 * holatiga: kengaytma uni koʻrsatadi (eski raqam yangidek turmasin).
 */
export function kartochkaBelgilari(ids: readonly number[], qatorlar: readonly Tovar30Kun[]): {
  sana: string | null;
  versiya: string;
  belgilar: Array<KartochkaBelgisi & { kategoriya: number | null; kategoriyaNomi: string | null }>;
} {
  const boyicha = new Map(qatorlar.map((t) => [t.product_id, t]));
  const sanalar = qatorlar.map((t) => t.sana).sort();
  return {
    sana: sanalar.length ? sanalar[sanalar.length - 1]! : null,
    versiya: TOVAR_SOTUVI_VERSIYASI,
    // Turkum (2-bosqich): qidiruv sahifasida bozor paneli shu sahifadagi tovarlarning
    // eng koʻp turkumini oladi — manzilda turkum raqami yoʻq.
    belgilar: ids.map((id) => {
      const t = boyicha.get(id) ?? null;
      return { ...kartochkaBelgisi(sotuvBahosi(t, id)), kategoriya: t?.kategoriya ?? null, kategoriyaNomi: t?.kategoriya_nomi ?? null };
    }),
  };
}

// ====================================================================
// CHEGARA NARX — Xitoydan 1 dona (kargo bilan) shundan qimmat boʻlsa — zarar
// ====================================================================

export interface ChegaraHisobi {
  /** `null` — narx yoki komissiya yoʻq. */
  som: number | null;
  hisob: string | null;
  yetishmaydi: string[];
}

/**
 * Zararsizlik chegarasi: narx − komissiya − aylanma soligʻi − Uzum logistikasi.
 * Logistika hajmga bogʻliq, hajm esa nomaʼlum — eng kami (1 litrgacha,
 * `UZUM_LOGISTIKA`) olinadi va shunday yoziladi: chegara aslida shundan
 * PAST boʻlishi mumkin, yuqori emas.
 */
export function zararsizlikChegarasi(narx: number | null, komissiyaFoizi: number | null, soliqFoizi: number | null): ChegaraHisobi {
  const yetishmaydi: string[] = [];
  if (narx === null || narx <= 0) yetishmaydi.push('narx');
  if (komissiyaFoizi === null) yetishmaydi.push('komissiya');
  if (yetishmaydi.length) return { som: null, hisob: null, yetishmaydi };
  const komissiya = Math.round((narx! * komissiyaFoizi!) / 100);
  const soliq = soliqFoizi === null ? 0 : Math.round((narx! * soliqFoizi) / 100);
  if (soliqFoizi === null) yetishmaydi.push('soliq');
  const logistika = UZUM_LOGISTIKA.birinchiLitrSom;
  const som = Math.max(0, narx! - komissiya - soliq - logistika);
  const hisob =
    `${minglik(narx!)} − komissiya ${komissiyaFoizi}% (${minglik(komissiya)})` +
    (soliqFoizi !== null ? ` − soliq ${soliqFoizi}% (${minglik(soliq)})` : '') +
    ` − logistika kamida ${minglik(logistika)} = ${minglik(som)} soʻm`;
  return { som, hisob, yetishmaydi };
}

// ====================================================================
// C — TOVAR PASPORTI (obunada)
// ====================================================================

export interface Tekshiruv { nom: string; mos: boolean | null; matn: string }
export interface Fakt { nom: string; qiymat: string; izoh?: string; tur?: 'ogoh' | 'urgu' }

export interface TovarPasporti {
  productId: number;
  nom: string | null;
  kategoriyaNomi: string | null;
  belgi: KartochkaBelgisi;
  baho: SotuvBahosi;
  tekshiruv: Tekshiruv[];
  faktlar: Fakt[];
  chegara: ChegaraHisobi;
  komissiyaFoizi: number | null;
  versiya: string;
}

const sana2 = (s: string) => `${s.slice(8, 10)}.${s.slice(5, 7)}`;

export function tovarPasporti(t: Tovar30Kun | null, productId: number, opts: { soliqFoizi: number | null }): TovarPasporti {
  const b = sotuvBahosi(t, productId);
  const tekshiruv: Tekshiruv[] = [];
  if (b.oyiga !== null) {
    tekshiruv.push({
      nom: 'Qoldiq kamayishi', mos: b.xom > 0,
      matn: `${b.malumKun} kunda ${minglik(b.xom - b.kesildi)} dona` + (b.kesildi > 0 ? ` (${minglik(b.kesildi)} tasi sanalmadi)` : ''),
    });
    tekshiruv.push(b.belgi === null
      ? { nom: 'Uzum belgisi', mos: null, matn: 'Uzum xaridor sonini koʻrsatmaydi' }
      : { nom: 'Uzum belgisi', mos: b.holat !== 'ziddiyat', matn: `haftasiga ${minglik(b.belgi)} kishi` });
    tekshiruv.push(b.sharhOsish === null
      ? { nom: 'Yangi sharhlar', mos: null, matn: 'sharhlar oʻlchanmagan' }
      : { nom: 'Yangi sharhlar', mos: b.sharhOsish > 0, matn: `30 kunda +${minglik(b.sharhOsish)}` });
  }

  const faktlar: Fakt[] = [];
  const n = b.narx;
  if (n.oxirgi !== null) {
    faktlar.push(n.engKam !== null && n.engKop !== null && n.engKam !== n.engKop
      ? { nom: 'Narx, 30 kun', qiymat: `${minglik(n.engKam)} – ${minglik(n.engKop)} soʻm`, izoh: `hozir ${minglik(n.oxirgi)}` }
      : { nom: 'Narx, 30 kun', qiymat: `${minglik(n.oxirgi)} soʻm`, izoh: 'oʻzgarmagan' });
  }
  if (b.olchanganKun > 0) {
    faktlar.push({
      nom: 'Tugab qolgan kun', qiymat: `${b.tugaganKun} kun`,
      ...(b.qoldiq !== null ? { izoh: `hozir qoldiq ${minglik(b.qoldiq)} dona` } : {}),
      ...(b.tugaganKun >= 7 ? { tur: 'ogoh' as const } : {}),
    });
  }
  // Chegirma: Uzum «asl narx» koʻrsatadi; oyna ichida narx unga yaqinlashmagan boʻlsa — shubhali.
  if (b.chegirma !== null && b.chegirma >= 30 && n.oxirgi !== null && n.engKop !== null) {
    const asl = Math.round(n.oxirgi / (1 - b.chegirma / 100));
    if (n.engKop < asl * 0.9) {
      faktlar.push({
        nom: 'Chegirma shubhali', qiymat: `${b.chegirma}% («asl narx» ≈ ${minglik(asl)})`,
        izoh: `30 kunda narx ${minglik(n.engKop)} dan oshmagan`, tur: 'ogoh',
      });
    }
  }
  const komissiya = t?.komissiya_foizi ?? null;
  faktlar.push(komissiya === null
    ? { nom: 'Uzum komissiyasi', qiymat: '—', izoh: 'turkum jadvalda yoʻq' }
    : { nom: 'Uzum komissiyasi', qiymat: `${komissiya}%` + (n.oxirgi !== null ? ` ≈ ${minglik(Math.round((n.oxirgi * komissiya) / 100))} soʻm` : ''), izoh: 'Uzum jadvali, FBO' });
  const chegara = zararsizlikChegarasi(n.oxirgi, komissiya, opts.soliqFoizi);
  if (chegara.som !== null) {
    faktlar.push({ nom: 'Chegara narx', qiymat: `${minglik(chegara.som)} soʻm`, izoh: 'Xitoydan 1 dona + kargo shundan oshsa — zarar', tur: 'urgu' });
  }
  if (b.kunlar.length) {
    // Grafik ostidagi narx oʻzgarishlari — oxirgi uchtasi.
    // Oʻlchanmagan kun oraliqda boʻlsa ham oʻzgarish koʻrinsin — oldingi MAʼLUM narx bilan
    // solishtiriladi (jonli 1978350: 19.10 oʻlchanmagan, 20.10 dagi 35 990 → 38 990 tushib qolardi).
    const ozgarish: string[] = [];
    let oldingi: number | null = null;
    for (const k of b.kunlar) {
      if (k.narx === null) continue;
      if (oldingi !== null && k.narx !== oldingi) ozgarish.push(`${sana2(k.sana)}: ${minglik(oldingi)} → ${minglik(k.narx)}`);
      oldingi = k.narx;
    }
    if (ozgarish.length) faktlar.push({ nom: 'Narx oʻzgarishi', qiymat: ozgarish.slice(-3).join('; ') });
  }

  return {
    productId,
    nom: t?.nom ?? t?.nom_perepis ?? null,
    kategoriyaNomi: t?.kategoriya_nomi ?? null,
    belgi: kartochkaBelgisi(b),
    baho: b,
    tekshiruv,
    faktlar,
    chegara,
    komissiyaFoizi: komissiya,
    versiya: TOVAR_SOTUVI_VERSIYASI,
  };
}

// ====================================================================
// D — TAQQOSLASH JADVALI (obunada)
// ====================================================================

export const TAQQOS_MAX = 5;

export interface TaqqosQatori {
  kalit: string;
  nom: string;
  qiymatlar: string[];
  /** Eng yaxshisi (ustun indeksi). `null` — solishtirib boʻlmaydi yoki hammasi teng. */
  eng: number | null;
}

export interface TaqqosJadvali {
  ustunlar: Array<{ productId: number; nom: string | null; belgi: KartochkaBelgisi }>;
  qatorlar: TaqqosQatori[];
  xulosa: string[];
  versiya: string;
}

function engIndeks(qiymatlar: Array<number | null>, kattasi: boolean): number | null {
  const bor = qiymatlar.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => x.v !== null);
  if (bor.length < 2) return null;
  const eng = kattasi ? Math.max(...bor.map((x) => x.v)) : Math.min(...bor.map((x) => x.v));
  const shular = bor.filter((x) => x.v === eng);
  return shular.length === 1 ? shular[0]!.i : null;
}

const chiziq = (x: number | null, f: (n: number) => string = minglik) => (x === null ? '—' : f(x));

export function taqqosJadvali(
  tovarlar: Array<{ productId: number; t: Tovar30Kun | null }>,
  opts: { soliqFoizi: number | null },
): TaqqosJadvali {
  const pas = tovarlar.slice(0, TAQQOS_MAX).map(({ productId, t }) => tovarPasporti(t, productId, opts));
  const b = pas.map((p) => p.baho);
  const ishonchli = (x: SotuvBahosi) => (x.holat === 'ziddiyat' || x.ishonch === 'past' ? null : x.oyiga);
  const sotuv = b.map(ishonchli);
  const aylanma = b.map((x, i) => (sotuv[i] !== null && x.narx.oxirgi !== null ? sotuv[i]! * x.narx.oxirgi : null));
  const chegara = pas.map((p) => p.chegara.som);

  const qatorlar: TaqqosQatori[] = [
    { kalit: 'narx', nom: 'Narx, soʻm', qiymatlar: b.map((x) => chiziq(x.narx.oxirgi)), eng: null },
    {
      kalit: 'sotuv', nom: 'Oyiga sotuv, taxminiy',
      qiymatlar: b.map((x) => (x.oyiga === null ? '—' : `≈ ${minglik(x.oyiga)}${x.ishonch && x.ishonch !== 'yuqori' ? ` (${ISHONCH_MATNI[x.ishonch]})` : ''}`)),
      eng: engIndeks(sotuv, true),
    },
    {
      kalit: 'aylanma', nom: 'Oylik aylanma (foyda emas)',
      qiymatlar: aylanma.map((x) => chiziq(x, (n) => (n >= 1_000_000 ? `≈ ${(n / 1_000_000).toFixed(1).replace('.', ',')} mln` : `≈ ${minglik(n)}`))),
      eng: engIndeks(aylanma, true),
    },
    { kalit: 'sharh', nom: 'Yangi sharhlar, 30 kun', qiymatlar: b.map((x) => (x.sharhOsish === null ? '—' : `+${minglik(x.sharhOsish)}`)), eng: engIndeks(b.map((x) => x.sharhOsish), true) },
    { kalit: 'belgi', nom: 'Uzum belgisi, haftasiga', qiymatlar: b.map((x) => chiziq(x.belgi)), eng: engIndeks(b.map((x) => x.belgi), true) },
    { kalit: 'tugagan', nom: 'Tugab qolgan kunlar', qiymatlar: b.map((x) => (x.olchanganKun ? `${x.tugaganKun}` : '—')), eng: null },
    { kalit: 'komissiya', nom: 'Uzum komissiyasi', qiymatlar: pas.map((p) => (p.komissiyaFoizi === null ? '—' : `${p.komissiyaFoizi}%`)), eng: null },
    { kalit: 'chegara', nom: 'Chegara narx, 1 dona', qiymatlar: chegara.map((x) => chiziq(x)), eng: engIndeks(chegara, true) },
  ];

  const xulosa: string[] = [];
  const nomi = (i: number) => `${i + 1}-tovar`;
  const engSotuv = qatorlar[1]!.eng;
  const engChegara = qatorlar[7]!.eng;
  if (engSotuv !== null) xulosa.push(`Eng koʻp sotiladigani — ${nomi(engSotuv)}.`);
  if (engChegara !== null && engChegara !== engSotuv) {
    xulosa.push(`Har donadan eng koʻp pul qoldirishi mumkin boʻlgani — ${nomi(engChegara)}` +
      (engSotuv !== null && (sotuv[engChegara] ?? 0) < (sotuv[engSotuv] ?? 0) ? ', lekin u kamroq sotiladi.' : '.'));
  }
  const aniqEmas = b.map((x, i) => (sotuv[i] === null && x.oyiga !== null ? nomi(i) : null)).filter((x): x is string => x !== null);
  if (aniqEmas.length) xulosa.push(`${aniqEmas.join(', ')}: sotuv raqami ishonchsiz — solishtirishda hisobga olinmadi.`);
  xulosa.push('Xitoydagi narxini bilmaguncha foyda nomaʼlum — «Xitoydan top» bilan tekshiring. Qaror sizniki.');

  return {
    ustunlar: pas.map((p) => ({ productId: p.productId, nom: p.nom, belgi: p.belgi })),
    qatorlar,
    xulosa,
    versiya: TOVAR_SOTUVI_VERSIYASI,
  };
}
