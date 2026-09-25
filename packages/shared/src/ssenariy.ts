/**
 * Suhbat ssenariysi — HOLAT MASHINASI.
 *
 * Nazoratchi topshirig'i (2026-09-25): ssenariy sun'iy intellektga
 * joylashsin, bir vaqtda BITTA savol, javob kelgach keyingisi.
 *
 * NEGA KOD, PROMPT EMAS (QOIDALAR.md, 3-bo'lim: "tavsiyani KOD
 * beradi, AI faqat tushuntiradi"). Savollar tartibini, tarmoqlanishni
 * va "keyin nima" ni shu fayl hal qiladi — deterministik. LLM ga
 * ikkita ish qoladi: tayyor jumlani odamdek aytish va obunachining
 * erkin matnini tushunish. Ikkalasi ham bo'lmasa (kalit yo'q, model
 * yiqildi) oqim TO'XTAMAYDI: har qadamda tayyor o'zbekcha jumla bor.
 *
 * ZANJIR UZILMASLIGI — asosiy talab. Har holatdan chiqish yo'li
 * bitta va aniq: `keyingi()` HAR DOIM nimadir qaytaradi — savol, kod
 * harakati, yoki "bu qadam hali qurilmagan" degan ochiq javob. Jim
 * qolish yo'q.
 *
 * NAVBAT BUZILMAYDI. `javobniQabulQil` faqat KUTILAYOTGAN savolga
 * javob oladi. Boshqa savolga javob kelsa — rad etiladi va sababi
 * aytiladi. Aks holda ikki savolga bir vaqtda javob berilib, holat
 * chalkashib ketardi.
 *
 * BO'SH JAVOB NOL EMAS (QOIDALAR.md, 4-bo'lim). "O'tkazib yuborish"
 * `null` yozadi. `Number("")` nolga teng — shuning uchun bo'shlik
 * ALOHIDA tekshiriladi. Byudjetda nol "pulim yo'q" degan javob,
 * `null` esa "aytmadi".
 *
 * 12 QADAM. Bugun 1–5 qurilgan (5 — Xitoydan topish, 2026-09-25).
 * 6–12 ro'yxatda TURADI va mashina ularga yetganda "tez orada" deb
 * ROSTINI aytadi — bu ham zanjirning bir bo'g'ini: obunachi yo'l
 * qayerda tugaganini va nima kelishini biladi.
 */

import type { ProfilJavoblari } from './profil.js';
import type { XitoyTovar } from './xitoy.js';

// ==================================================================== turlar

export type SuhbatSavolTuri = 'tanlov' | 'kopTanlov' | 'son' | 'matn';

export interface SuhbatVarianti {
  qiymat: string | number;
  nom: string;
}

export interface SuhbatSavoli {
  /** Barqaror id — bazada va mijozda shu bilan ataladi. */
  id: string;
  qadam: number;
  /** Menejerning gapi. Tayyor, o'zbekcha. LLM buni ODAMDEK aytishi mumkin, lekin MA'NOSINI o'zgartira olmaydi. */
  matn: string;
  turi: SuhbatSavolTuri;
  variantlar: readonly SuhbatVarianti[];
  /** "O'zim yozaman" — erkin qiymat qabul qilinadimi. */
  erkin: boolean;
  /** O'tkazib yuborish mumkinmi. Mumkin bo'lsa javob `null` bo'ladi. */
  otkazishMumkin: boolean;
  /** Bu javob profilning qaysi maydoniga tushadi (bo'lsa). */
  profilMaydoni: keyof ProfilJavoblari | null;
}

/** Kod bajaradigan harakat — deterministik hisob. LLM chaqirmaydi. */
export type KodHarakati = 'yonalishlar' | 'tovarlar' | 'tannarx' | 'xitoy';

export type Keyingi =
  | { tur: 'savol'; savol: SuhbatSavoli }
  | { tur: 'kod'; harakat: KodHarakati; qadam: number }
  /** Tashqi ish (1688 qidiruvi) tugashini kutamiz — mijoz `tekshir` bilan soʻrab turadi. */
  | { tur: 'kutish'; qadam: number; matn: string; boshlandi: string | null }
  | { tur: 'tezOrada'; qadam: number; nom: string; matn: string };

/**
 * Yo'l holati — bitta obunachining suhbatdagi o'rni.
 *
 * `javoblar` — savol id → javob (null = o'tkazib yuborilgan).
 * `natijalar` — kod harakatlari natijasi (yo'nalishlar ro'yxati va
 * h.k.); keyingi savollarning VARIANTLARI shundan yasaladi.
 */
export interface YolHolati {
  javoblar: Record<string, unknown>;
  natijalar: Partial<Record<KodHarakati, unknown>>;
}

// ==================================================================== qadamlar

export const SUHBAT_QADAMLARI = [
  { n: 1, nom: 'Tanishuv', qurilgan: true },
  { n: 2, nom: 'Yoʻnalish', qurilgan: true },
  { n: 3, nom: 'Tovar va miqdor', qurilgan: true },
  { n: 4, nom: 'Tannarx', qurilgan: true },
  { n: 5, nom: 'Xitoydan topish', qurilgan: true },
  { n: 6, nom: 'Buyurtma va kargo', qurilgan: false },
  { n: 7, nom: 'Rasmiylashtirish', qurilgan: false },
  { n: 8, nom: 'Qabul', qurilgan: false },
  { n: 9, nom: 'Studiya', qurilgan: false },
  { n: 10, nom: 'Yuklash', qurilgan: false },
  { n: 11, nom: 'Sotuv boshlandi', qurilgan: false },
  { n: 12, nom: 'Hisobot', qurilgan: false },
] as const;

/**
 * Byudjet tezkor tugmalari — ANIQ SON, oraliq emas.
 *
 * Nazoratchi qarori (docs/1-QADAM-SAVOLLAR.md): byudjet aniq summa.
 * Oraliq ("10–30 mln") yozilsa ball uni qaysi son deb olishini
 * taxmin qilishi kerak bo'lardi. Har tugma oraliqning PASTKI
 * chegarasini yozadi — "kamida shuncha bor" degan rost javob.
 */
export const BYUDJET_TUGMALARI: readonly SuhbatVarianti[] = [
  { qiymat: 5_000_000, nom: '5 mln soʻm' },
  { qiymat: 10_000_000, nom: '10 mln soʻm' },
  { qiymat: 30_000_000, nom: '30 mln soʻm' },
  { qiymat: 70_000_000, nom: '70 mln soʻm' },
];

export const UZUM_DOKONI = [
  { qiymat: 'sotyapman', nom: 'Ha, sotyapman' },
  { qiymat: 'kabinet_bor', nom: 'Kabinet bor, hali sotmaganman' },
  { qiymat: 'yoq', nom: 'Yoʻq' },
] as const;

export const MARJA_TUGMALARI: readonly SuhbatVarianti[] = [
  { qiymat: 20, nom: '20%' },
  { qiymat: 30, nom: '30%' },
  { qiymat: 50, nom: '50%' },
];

// ==================================================================== natija shakllari
// Mashina kod natijalaridan faqat VARIANT yasash uchun o'qiydi.
// Shuning uchun turlar tor: nomi va id si yetadi.

interface YonalishQisqa {
  categoryId: number;
  name: string;
  yetadi?: boolean | null;
  ball?: { value: number | null };
}
interface YonalishlarNatijasi {
  royxat?: YonalishQisqa[];
  olchov_yoq?: boolean;
  sabab?: string;
}
interface TovarQisqa {
  nomzod: { productId: number; title: string; narxSom?: number | null; rasmUrl?: string | null };
  miqdor: { dona: number; hisob: string } | null;
  miqdorSababi?: string | null;
}
interface TovarlarNatijasi {
  royxat?: TovarQisqa[];
  chiqarildi?: Array<{ title: string; sabab: string }>;
  olchov_yoq?: boolean;
  sabab?: string;
}

function yonalishlarNatija(h: YolHolati): YonalishlarNatijasi | null {
  const n = h.natijalar.yonalishlar as YonalishlarNatijasi | undefined;
  return n ?? null;
}
function tovarlarNatija(h: YolHolati): TovarlarNatijasi | null {
  const n = h.natijalar.tovarlar as TovarlarNatijasi | undefined;
  return n ?? null;
}

// ---- 5-qadam natijasi. Shakl `suhbat-kod.ts` da yasaladi, UI shuni chizadi.

/** 1688 taklifi + soʻmga oʻgirilgani va chegaraga nisbati (kurs bilan). */
export interface XitoyTaklif extends XitoyTovar {
  /** `narxYuan × kurs`, yaxlitlangan. Kurs boʻlmasa `null`. */
  narxSom: number | null;
  /** `narxSom ≤ chegaraSom`. Ikkisidan biri boʻlmasa `null` — "bilmayman". */
  chegaradaMi: boolean | null;
}

export interface XitoyQatori {
  productId: number;
  title: string;
  rasmUrl: string | null;
  chegaraSom: number | null;
  /**
   * 4-qadam chegarasiga KIRMAGAN qismlar (kargo, logistika…). Boʻsh
   * emas — chegara toʻliq emas, haqiqiysi pastroq; "chegarada" belgisi
   * shu izoh bilan oʻqilishi kerak (tekshiruv, 2026-09-25).
   */
  yetishmaydi: string[];
  /**
   * `topildi` — qidiruv boʻldi, taklif bor. `topilmadi` — qidiruv BOʻLDI,
   * 1688 hech narsa bermadi (bu javob). `qidirilmadi` — qidiruv
   * boʻlmadi, sababi `sabab` da. Uchalasi ATAYLAB farqlanadi (QOIDALAR §8).
   */
  holat: 'topildi' | 'topilmadi' | 'qidirilmadi';
  sabab: string | null;
  /** Provayder aytgan umumiy son. */
  jami: number | null;
  takliflar: XitoyTaklif[];
  /** 72 soatlik keshdan olindi — narxlar shuncha eski boʻlishi mumkin. */
  keshdan: boolean;
  /** Oʻqib boʻlmagan kartalar — koʻrsatilmadi, lekin yashirilmadi. */
  tashlandi: number;
  /** Aktor tashxisi ("rasm: webp, 234 KB, yuklandi: direct") — 0 natijada sabab koʻrinsin. */
  tashxis: string | null;
}

export interface XitoyNatijasi {
  olchov_yoq: boolean;
  sabab?: string;
  kurs: { somPerYuan: number; sana: string; manba: string } | null;
  qatorlar: XitoyQatori[];
  /**
   * Yurish boshlangan, natija hali yoʻq. `keyingi()` shunda `kutish`
   * qaytaradi; chat `tekshir` bilan soʻrab turadi, `suhbat-kod` holatni
   * yangilaydi. `urinish` — tarmoq xatosi bilan tugagan tekshiruvlar.
   */
  kutilmoqda: {
    runId: string;
    boshlandi: string;
    /** `sha256` — rasm base64 bilan yuborilgan boʻlsa (natijani bogʻlash uchun). */
    rasmlar: Array<{ productId: number; rasmUrl: string; sha256?: string | null; usul?: 'base64' | 'url' }>;
    urinish?: number;
  } | null;
  izoh?: string;
}

function xitoyNatija(h: YolHolati): XitoyNatijasi | null {
  const n = h.natijalar.xitoy as XitoyNatijasi | undefined;
  return n ?? null;
}

/** Faqat http(s) manzil — obunachi yozgan matn ham, baza ham shu elakdan oʻtadi. */
export function httpsManzilmi(x: unknown): x is string {
  return typeof x === 'string' && /^https?:\/\/\S+$/i.test(x.trim());
}

/** Tovarning bazadagi rasmi (`so_tovar_royxati.rasmUrl`). Boʻlmasa `null`. */
function tovarRasmiBazadan(h: YolHolati, id: number): string | null {
  const t = tovarlarNatija(h)?.royxat?.find((x) => x.nomzod.productId === id);
  const r = t?.nomzod.rasmUrl;
  return httpsManzilmi(r) ? r : null;
}

function tovarNomi(h: YolHolati, id: number): string {
  return tovarlarNatija(h)?.royxat?.find((x) => x.nomzod.productId === id)?.nomzod.title ?? `#${id}`;
}

/** Tanlov tugmasi matni — hamma raqam taklifning oʻzidan. */
function taklifNomi(t: XitoyTaklif): string {
  return `¥${t.narxYuan}`
    + (t.narxSom !== null ? ` ≈ ${t.narxSom} soʻm` : '')
    + ` · MOQ ${t.moq ?? '—'}`
    + (t.superZavod === true ? ' · super zavod' : t.zavod === true ? ' · zavod' : '')
    + (t.chegaradaMi === true ? ' · chegarada' : t.chegaradaMi === false ? ' · chegaradan yuqori' : '');
}

/** Chegara kamchiligi izohi — raqam yonida yuradi (QOIDALAR §4). */
function chegaraIzohi(q: XitoyQatori): string {
  return q.yetishmaydi.length ? ` (chegara ${q.yetishmaydi.join(', ')}siz hisoblangan — haqiqiysi pastroq)` : '';
}

// ==================================================================== savollar

function savol(
  id: string,
  qadam: number,
  matn: string,
  turi: SuhbatSavolTuri,
  q: Partial<Omit<SuhbatSavoli, 'id' | 'qadam' | 'matn' | 'turi'>> = {},
): SuhbatSavoli {
  return {
    id, qadam, matn, turi,
    variantlar: q.variantlar ?? [],
    erkin: q.erkin ?? false,
    otkazishMumkin: q.otkazishMumkin ?? false,
    profilMaydoni: q.profilMaydoni ?? null,
  };
}

export function boshlangichHolat(): YolHolati {
  return { javoblar: {}, natijalar: {} };
}

/** Javob berilganmi (o'tkazib yuborilgan ham "berilgan" — `null`). */
function berilgan(h: YolHolati, id: string): boolean {
  return Object.prototype.hasOwnProperty.call(h.javoblar, id);
}

/** Ko'p tanlovda tanlangan tovar id lari. */
function tanlanganTovarlar(h: YolHolati): number[] {
  const q = h.javoblar['tovarlar'];
  return Array.isArray(q) ? q.map(Number).filter(Number.isInteger) : [];
}

/**
 * KEYINGI HARAKAT — mashinaning yuragi.
 *
 * Tartib qat'iy va yuqoridan pastga o'qiladi: birinchi javobsiz
 * savol yoki bajarilmagan kod harakati qaytadi. Hamma narsa
 * bajarilgan bo'lsa — keyingi qadam; u qurilmagan bo'lsa — "tez
 * orada", sababi bilan.
 */
export function keyingi(h: YolHolati): Keyingi {
  // ---------------------------------------------------------- 1. Tanishuv
  if (!berilgan(h, 'byudjet')) {
    return { tur: 'savol', savol: savol('byudjet', 1,
      'Salom. Men sizning menejeringizman — birgalikda Uzumda birinchi partiyangizni sotamiz. Boshlaymiz: birinchi partiyaga qancha pul ajratasiz?',
      'son', { variantlar: BYUDJET_TUGMALARI, erkin: true, otkazishMumkin: true, profilMaydoni: 'budgetUzs' }) };
  }
  if (!berilgan(h, 'uzum_dokoni')) {
    return { tur: 'savol', savol: savol('uzum_dokoni', 1,
      'Uzumda doʻkoningiz bormi?',
      'tanlov', { variantlar: UZUM_DOKONI, profilMaydoni: 'hasUzumShop' }) };
  }
  if (h.javoblar['uzum_dokoni'] === 'sotyapman' && !berilgan(h, 'dokon_nomi')) {
    return { tur: 'savol', savol: savol('dokon_nomi', 1,
      'Doʻkoningiz nomi qanday? Keyin oʻz sotuvingiz raqamlarini ham koʻrsata olaman.',
      'matn', { erkin: true, otkazishMumkin: true }) };
  }

  // ---------------------------------------------------------- 2. Yo'nalish
  const yn = yonalishlarNatija(h);
  if (yn === null) return { tur: 'kod', harakat: 'yonalishlar', qadam: 2 };
  const yonalishlar = yn.royxat ?? [];
  if (!berilgan(h, 'yonalish')) {
    return { tur: 'savol', savol: savol('yonalish', 2,
      yonalishlar.length
        ? 'Byudjetingiz bilan boshlash mumkin boʻlgan yoʻnalishlar shular. Ball yuqori boʻlgani birinchi turibdi — qaysi birini olamiz?'
        : `Yoʻnalishlarni hozir koʻrsata olmayman: ${yn.sabab ?? 'oʻlchov yoʻq'}. Keyinroq qayta urinib koʻramiz.`,
      'tanlov', {
        variantlar: yonalishlar.map((y) => ({ qiymat: y.categoryId, nom: y.name })),
        otkazishMumkin: yonalishlar.length === 0,
      }) };
  }

  // ---------------------------------------------------------- 3. Tovar va miqdor
  const tn = tovarlarNatija(h);
  if (tn === null) return { tur: 'kod', harakat: 'tovarlar', qadam: 3 };
  const tovarlar = tn.royxat ?? [];
  if (!berilgan(h, 'tovarlar')) {
    return { tur: 'savol', savol: savol('tovarlar', 3,
      tovarlar.length
        ? 'Birinchi partiyada aynan nima sotasiz? Bular shu yoʻnalishda oʻlchangan tovarlar — bir nechtasini belgilang.'
        : `Bu yoʻnalishda tovar roʻyxatini bera olmayman: ${tn.sabab ?? 'oʻlchov yoʻq'}.`,
      'kopTanlov', {
        variantlar: tovarlar.map((t) => ({ qiymat: t.nomzod.productId, nom: t.nomzod.title })),
        otkazishMumkin: tovarlar.length === 0,
      }) };
  }
  for (const id of tanlanganTovarlar(h)) {
    const sid = `miqdor:${id}`;
    if (berilgan(h, sid)) continue;
    const t = tovarlar.find((x) => x.nomzod.productId === id);
    const nom = t?.nomzod.title ?? `#${id}`;
    const m = t?.miqdor ?? null;
    const variantlar: SuhbatVarianti[] = m
      ? [{ qiymat: m.dona, nom: `30 kunlik zaxira — ${m.dona} dona` },
         { qiymat: m.dona * 2, nom: `60 kunlik — ${m.dona * 2} dona` }]
      : [];
    return { tur: 'savol', savol: savol(sid, 3,
      m
        ? `${nom}: ${m.hisob}. Birinchi partiya uchun nechta olasiz?`
        : `${nom}: miqdorni hisoblab bera olmadim (${t?.miqdorSababi ?? 'sotuv oʻlchanmagan'}). Oʻzingiz nechta olmoqchisiz?`,
      'son', { variantlar, erkin: true, otkazishMumkin: true }) };
  }

  // ---------------------------------------------------------- 4. Tannarx
  if (!berilgan(h, 'marja')) {
    return { tur: 'savol', savol: savol('marja', 4,
      'Roʻyxat tayyor. Endi har tovarga Xitoyda maksimum qancha toʻlash mumkinligini hisoblaymiz. Qancha marja bilan sotmoqchisiz?',
      'son', { variantlar: MARJA_TUGMALARI, erkin: true }) };
  }
  if (h.natijalar.tannarx === undefined) return { tur: 'kod', harakat: 'tannarx', qadam: 4 };
  if (!berilgan(h, 'xitoy_tasdiq')) {
    return { tur: 'savol', savol: savol('xitoy_tasdiq', 4,
      'Chegara narxlar tayyor. Shu chegaralar bilan Xitoydan qidiramizmi?',
      'tanlov', { variantlar: [
        { qiymat: 'ha', nom: 'Ha, Xitoydan topamiz' },
        { qiymat: 'miqdor', nom: 'Miqdorni oʻzgartiraman' },
      ] }) };
  }

  // ---------------------------------------------------------- 5. Xitoydan topish
  //
  // Bu yerga faqat `xitoy_tasdiq === 'ha'` bilan kelinadi: 'miqdor'
  // `yoz()` da tasdiqni oʻchirib 3-qadamga qaytaradi.
  //
  // Provayder RASM boʻyicha qidiradi. Rasm bazada boʻlmasa (0054
  // qoʻllanmagan yoki tovar ogʻir soʻrovda oʻlchanmagan) obunachidan
  // soʻraladi — oʻtkazib yuborish mumkin, unda tovar qidirilmaydi va
  // natijada shunday deb yoziladi.
  for (const id of tanlanganTovarlar(h)) {
    if (tovarRasmiBazadan(h, id) !== null) continue;
    const sid = `rasm:${id}`;
    if (berilgan(h, sid)) continue;
    return { tur: 'savol', savol: savol(sid, 5,
      `«${tovarNomi(h, id)}» uchun rasm bazada hali yoʻq, 1688 esa rasm boʻyicha qidiradi. Uzum sahifasida tovar rasmiga oʻng tugma → «Rasm manzilini nusxalash» va shu yerga qoʻying (http(s):// bilan). Oʻtkazib yuborsangiz bu tovar Xitoyda qidirilmaydi.`,
      'matn', { erkin: true, otkazishMumkin: true }) };
  }
  const xn = xitoyNatija(h);
  if (xn === null) return { tur: 'kod', harakat: 'xitoy', qadam: 5 };
  // Yurish boshlangan — natijani kutamiz. Bu kod harakati EMAS: kod
  // qayta-qayta chaqirilsa aylanib qolardi; chat `tekshir` bilan keladi.
  if (xn.kutilmoqda) {
    return { tur: 'kutish', qadam: 5, boshlandi: xn.kutilmoqda.boshlandi,
      matn: `1688 da qidirilmoqda (${xn.kutilmoqda.rasmlar.length} ta rasm) — odatda 1–2 daqiqa. Natija tayyor boʻlgach shu yerda koʻrinadi.` };
  }
  for (const q of xn.qatorlar ?? []) {
    if (q.holat !== 'topildi' || q.takliflar.length === 0) continue;
    const sid = `xitoy_tanlov:${q.productId}`;
    if (berilgan(h, sid)) continue;
    const sigadi = q.takliflar.filter((t) => t.chegaradaMi === true).length;
    return { tur: 'savol', savol: savol(sid, 5,
      `«${q.title}»: 1688 dan ${q.jami ?? q.takliflar.length} ta topildi, eng oʻxshash ${q.takliflar.length} tasi koʻrsatildi`
        + (q.chegaraSom !== null && xn.kurs !== null ? `, ${sigadi} tasi chegara narxga sigʻadi${chegaraIzohi(q)}` : '')
        + (q.keshdan ? ' (72 soatlik keshdan)' : '')
        + '. Qaysi birini olamiz? Raqamlar provayderdan, tanlov sizniki.',
      'tanlov', {
        variantlar: q.takliflar.map((t) => ({ qiymat: t.sourceId, nom: taklifNomi(t) })),
        otkazishMumkin: true,
      }) };
  }
  // Qidirilmagan tovar bor — qayta urinish taklif qilinadi. Usiz bu
  // qatorlar abadiy "qidirilmadi" boʻlib qolardi: faqat "boshdan"
  // (1–4-qadamni ham oʻchirib) yordam berardi (tekshiruv, 2026-09-25).
  const qidirilmagan = (xn.qatorlar ?? []).filter((q) => q.holat === 'qidirilmadi');
  if (qidirilmagan.length > 0 && !berilgan(h, 'xitoy_qayta')) {
    const sabablar = [...new Set(qidirilmagan.map((q) => q.sabab ?? 'sabab yozilmagan'))].join('; ');
    return { tur: 'savol', savol: savol('xitoy_qayta', 5,
      `${qidirilmagan.length} ta tovar qidirilmadi (${sabablar}). Qayta urinib koʻramizmi?`,
      'tanlov', { variantlar: [
        { qiymat: 'qayta', nom: 'Qayta qidirish' },
        { qiymat: 'davom', nom: 'Shusiz davom etamiz' },
      ] }) };
  }

  // ---------------------------------------------------------- 6+. Hali qurilmagan
  const q6 = SUHBAT_QADAMLARI[5];
  return {
    tur: 'tezOrada', qadam: q6.n, nom: q6.nom,
    matn: `Keyingi qadam — ${q6.nom}. Bu qism hali qurilmagan: kargo stavkasi bazada yoʻq, nazoratchi qarori kutilmoqda. Tayyor boʻlganda shu chatda oʻzim aytaman. Tanlovlaringiz va chegara narxlar saqlanib turadi.`,
  };
}

// ==================================================================== javob qabul

export interface QabulNatijasi {
  holat: YolHolati;
  /** `null` — qabul qilindi. Aks holda sabab, obunachiga ko'rsatiladi. */
  xato: string | null;
  /** Profilga yoziladigan maydon va qiymat (bo'lsa). */
  profil: Partial<ProfilJavoblari> | null;
}

/**
 * Javobni qabul qiladi. FAQAT kutilayotgan savolga.
 *
 * `undefined` / `''` / bo'sh massiv — o'tkazib yuborish; ruxsat bo'lsa
 * `null` yoziladi, bo'lmasa xato. Nol yoki `false` — JAVOB.
 */
export function javobniQabulQil(h: YolHolati, savolId: string, xom: unknown): QabulNatijasi {
  const k = keyingi(h);
  if (k.tur !== 'savol') {
    return { holat: h, xato: 'hozir savol kutilmayapti', profil: null };
  }
  const s = k.savol;
  if (s.id !== savolId) {
    return { holat: h, xato: `navbat buzildi: hozir "${s.id}" savoli kutilmoqda`, profil: null };
  }

  const bosh = xom === undefined || xom === null || xom === ''
    || (Array.isArray(xom) && xom.length === 0);
  if (bosh) {
    if (!s.otkazishMumkin) return { holat: h, xato: 'bu savolga javob kerak', profil: null };
    return yoz(h, s, null);
  }

  let qiymat: unknown;
  switch (s.turi) {
    case 'son': {
      if (typeof xom === 'boolean') return { holat: h, xato: 'son kutilgan edi', profil: null };
      const n = Number(xom);
      if (!Number.isFinite(n) || n < 0) return { holat: h, xato: 'son kutilgan edi', profil: null };
      if (!s.erkin && !s.variantlar.some((v) => Number(v.qiymat) === n)) {
        return { holat: h, xato: 'variantlardan birini tanlang', profil: null };
      }
      qiymat = n;
      break;
    }
    case 'tanlov': {
      const bor = s.variantlar.some((v) => String(v.qiymat) === String(xom));
      if (!bor && !s.erkin) return { holat: h, xato: 'variantlardan birini tanlang', profil: null };
      const v = s.variantlar.find((x) => String(x.qiymat) === String(xom));
      qiymat = v ? v.qiymat : String(xom);
      break;
    }
    case 'kopTanlov': {
      const royxat = Array.isArray(xom) ? xom : [xom];
      const ruxsat = new Set(s.variantlar.map((v) => String(v.qiymat)));
      const tanlangan = royxat.filter((x) => ruxsat.has(String(x)));
      if (!tanlangan.length) return { holat: h, xato: 'variantlardan kamida bittasini tanlang', profil: null };
      qiymat = tanlangan.map((x) => s.variantlar.find((v) => String(v.qiymat) === String(x))!.qiymat);
      break;
    }
    case 'matn': {
      const t = String(xom).trim();
      if (!t) return yoz(h, s, null);
      // Rasm manzili — qabul PAYTIDA tekshiriladi: notoʻgʻri matn jimgina
      // "rasm yoʻq" ga aylanmasin, savol qayta soʻralsin (tekshiruv,
      // 2026-09-25). Manzil kesilmaydi (200 belgi kesigi uni buzardi).
      if (s.id.startsWith('rasm:')) {
        if (t.length > 2048) return { holat: h, xato: 'manzil juda uzun (2048 belgidan koʻp)', profil: null };
        if (!httpsManzilmi(t)) {
          return { holat: h, xato: 'rasm manzili http(s):// bilan boshlanishi kerak — Uzum sahifasida rasmga oʻng tugma → «Rasm manzilini nusxalash». Yoki oʻtkazib yuboring.', profil: null };
        }
        qiymat = t;
        break;
      }
      qiymat = t.slice(0, 200);
      break;
    }
  }
  return yoz(h, s, qiymat);
}

function yoz(h: YolHolati, s: SuhbatSavoli, qiymat: unknown): QabulNatijasi {
  const holat: YolHolati = { ...h, javoblar: { ...h.javoblar, [s.id]: qiymat } };

  // "Miqdorni o'zgartiraman" — 3-qadamdagi miqdor javoblari ochiladi.
  // 5-qadam javoblari va natijasi ham tozalanadi: ular eski miqdor va
  // eski chegaraga bogʻliq edi.
  if (s.id === 'xitoy_tasdiq' && qiymat === 'miqdor') {
    const yangi = { ...holat.javoblar };
    for (const id of Object.keys(yangi)) {
      if (id.startsWith('miqdor:') || id.startsWith('rasm:') || id.startsWith('xitoy_tanlov:')) delete yangi[id];
    }
    delete yangi['xitoy_tasdiq'];
    const natijalar = { ...holat.natijalar };
    delete natijalar.tannarx;
    delete natijalar.xitoy;
    return { holat: { javoblar: yangi, natijalar }, xato: null, profil: null };
  }

  // "Qayta qidirish" — 5-qadam natijasi va tanlovlari tozalanadi,
  // `keyingi()` yana `xitoy` kodini chaqiradi (kesh topilganlarni
  // qayta sotib olmaydi).
  if (s.id === 'xitoy_qayta' && qiymat === 'qayta') {
    const yangi = { ...holat.javoblar };
    for (const id of Object.keys(yangi)) if (id.startsWith('xitoy_tanlov:')) delete yangi[id];
    delete yangi['xitoy_qayta'];
    const natijalar = { ...holat.natijalar };
    delete natijalar.xitoy;
    return { holat: { javoblar: yangi, natijalar }, xato: null, profil: null };
  }

  let profil: Partial<ProfilJavoblari> | null = null;
  if (s.profilMaydoni === 'budgetUzs') profil = { budgetUzs: qiymat === null ? null : Number(qiymat) };
  if (s.profilMaydoni === 'hasUzumShop') {
    profil = { hasUzumShop: qiymat === null ? null : qiymat !== 'yoq' };
  }
  return { holat, xato: null, profil };
}

/** Kod harakati natijasini holatga yozadi. */
export function natijaniYoz(h: YolHolati, harakat: KodHarakati, natija: unknown): YolHolati {
  return { ...h, natijalar: { ...h.natijalar, [harakat]: natija } };
}

/** Joriy qadam raqami — yon panel uchun. */
export function joriyQadam(h: YolHolati): number {
  const k = keyingi(h);
  if (k.tur === 'savol') return k.savol.qadam;
  return k.qadam;
}

// ==================================================================== tushuntirish

/**
 * Kod harakati natijasi uchun TAYYOR jumla.
 *
 * Bu LLM siz ham ishlaydigan matn. Undagi har raqam natijaning
 * o'zidan; hech narsa hisoblanmaydi, hech narsa taxmin qilinmaydi.
 * LLM bu jumlani odamdek qayta aytishi mumkin, lekin tekshiruv
 * darvozasi undagi raqamlar shu jumladagilar bilan bir xil bo'lishini
 * talab qiladi.
 */
export function tushuntir(harakat: KodHarakati, natija: unknown): string {
  if (harakat === 'yonalishlar') {
    const n = natija as YonalishlarNatijasi;
    if (n.olchov_yoq || !n.royxat?.length) {
      return `Yoʻnalishlarni hozir hisoblab bera olmadim: ${n.sabab ?? 'oʻlchov yoʻq'}. Bu "sizga mos yoʻnalish yoʻq" degani emas — hisob hali yoʻq.`;
    }
    const eng = n.royxat[0]!;
    const yetadi = n.royxat.filter((y) => y.yetadi === true).length;
    const ball = eng.ball?.value ?? null;
    return `${n.royxat.length} ta yoʻnalish baholandi. Eng yuqori ball — "${eng.name}"${ball !== null ? `, ${ball} ball` : ''}. `
      + (yetadi ? `${yetadi} tasiga byudjetingiz yetadi.` : 'Byudjet yetadimi — hali aytib boʻlmaydi.')
      + ' Tanlov sizniki: ball tartib beradi, qaror bermaydi.';
  }
  if (harakat === 'tovarlar') {
    const n = natija as TovarlarNatijasi;
    if (n.olchov_yoq || !n.royxat?.length) {
      return `Bu yoʻnalishda tovar roʻyxatini bera olmadim: ${n.sabab ?? 'oʻlchov yoʻq'}.`;
    }
    const chiq = n.chiqarildi?.length ?? 0;
    return `${n.royxat.length} ta tovar oʻlchangan va 8 ta tuzoq-filtrdan oʻtdi.`
      + (chiq ? ` ${chiq} tasi tuzoq sababli roʻyxatdan chiqarildi — sababi har birida yozilgan.` : '')
      + ' Sotuv raqamlari zaxira kamayishidan chiqarilgan taxmin, Uzum bermaydi.';
  }
  if (harakat === 'xitoy') {
    // Uch holat ATAYLAB alohida sanaladi: topildi / topilmadi (javob) /
    // qidirilmadi (sabab). "Xitoyda yoʻq" bilan "qidirilmadi" bir xil
    // koʻrinmasin. "Qidirildi" faqat haqiqatan qidirilganlar soni.
    const n = natija as XitoyNatijasi;
    const q = n.qatorlar ?? [];
    if (n.kutilmoqda) {
      return `1688 da qidirilmoqda (${n.kutilmoqda.rasmlar.length} ta rasm) — odatda 1–2 daqiqa.`;
    }
    const qidirilmadi = q.filter((x) => x.holat === 'qidirilmadi');
    const qidirilgan = q.filter((x) => x.holat !== 'qidirilmadi');
    const sabablar = [...new Set(qidirilmadi.map((x) => x.sabab ?? 'sabab yozilmagan'))].join('; ');
    if (qidirilgan.length === 0) {
      return `Xitoydan qidira olmadim${q.length ? ` (${q.length} ta tovar)` : ''}: ${sabablar || n.sabab || 'oʻlchov yoʻq'}. Bu "Xitoyda yoʻq" degani EMAS — qidiruv boʻlmadi.`;
    }
    const topildi = qidirilgan.filter((x) => x.holat === 'topildi');
    const topilmadi = qidirilgan.length - topildi.length;
    const takliflar = topildi.reduce((s, x) => s + x.takliflar.length, 0);
    const sigadi = topildi.reduce((s, x) => s + x.takliflar.filter((t) => t.chegaradaMi === true).length, 0);
    const keshdan = qidirilgan.filter((x) => x.keshdan).length;
    const tashlandi = qidirilgan.reduce((s, x) => s + x.tashlandi, 0);
    const kurs = n.kurs
      ? ` Kurs: ${n.kurs.manba}, 1 yuan = ${n.kurs.somPerYuan} soʻm (${n.kurs.sana}).`
      : ' Kurs olinmadi — narxlar faqat yuanda, chegaraga solishtirilmadi.';
    return `${qidirilgan.length} ta tovar uchun 1688 qidirildi`
      + (qidirilmadi.length ? ` (${qidirilmadi.length} tasi qidirilmadi: ${sabablar})` : '')
      + `: ${topildi.length} tasida taklif bor`
      + (topildi.length ? ` (${takliflar} ta koʻrsatildi${n.kurs ? `, ${sigadi} tasi chegara narxga sigʻadi` : ''})` : '')
      + (topilmadi ? `, ${topilmadi} tasida oʻxshash topilmadi` : '')
      + '.'
      + (keshdan ? ` ${keshdan} tasi 72 soatlik keshdan.` : '')
      + (tashlandi ? ` ${tashlandi} ta karta oʻqilmadi va koʻrsatilmadi.` : '')
      + kurs + ' Raqamlar provayderdan; buyurtmalar soni jami, davri yozilmagan.';
  }
  // tannarx — HISOBLANGANMI, rostini aytamiz. Jonli o'lchov (2026-09-25):
  // komissiya kelmagan tovarda chegara `null` edi, xabar esa "hisoblandi"
  // derdi. Nol/yo'q va "hisoblandi" bir xil ko'rinishi taqiqlangan.
  const n = natija as { qatorlar?: Array<{ chegaraSom: number | null; yetishmaydi?: string[] }> };
  const q = n.qatorlar ?? [];
  const bor = q.filter((x) => x.chegaraSom !== null).length;
  if (bor === 0) {
    const sabab = [...new Set(q.flatMap((x) => x.yetishmaydi ?? []))].join(', ');
    return `Chegara narxni hisoblab bera olmadim: ${sabab || 'kirish raqamlari'} yetishmaydi. Bu "foyda yoʻq" degani EMAS — hisob uchun raqam yoʻq.`;
  }
  return `${bor} ta tovar uchun Xitoydagi chegara narx hisoblandi.`
    + (bor < q.length ? ` ${q.length - bor} tasida yetishmagan qism bor.` : '')
    + ' Yetishmagan qism roʻyxatda — u hisobga kirmagan, demak haqiqiy chegara pastroq.';
}
