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
 * 12 QADAM. Bugun 1–10 qurilgan (2026-09-29: 8 — Qabul (Xitoydan kelgan
 * yuk), 9 — Studiya (oq fonli suratlar: tanlangan 1688 taklif galereyasi, Cloudflare),
 * 10 — Yuklash (kartochka + omborga topshirish); tartib Uzum jarayoniga
 * moslab tuzatildi — yetkazma faqat kartochkadan keyin; faktlar 0058/0059;
 * 5 — Xitoydan topish, 2026-09-25;
 * 6 — Buyurtma va kargo, 2026-09-28: kargo hamkori YOʻQ, stavkalar
 * `fakt` dan; 7 — Rasmiylashtirish, 2026-09-28: YATT/soliq/bank/Uzum
 * raqamlari `fakt` dan (0057), manba va sana bilan, davlat sayti
 * oʻzgarsa "sayt boshqacha" tugmasi tekshirish ishi yozadi).
 * 11–12 ro'yxatda TURADI va mashina ularga yetganda "tez orada" deb
 * ROSTINI aytadi — bu ham zanjirning bir bo'g'ini: obunachi yo'l
 * qayerda tugaganini va nima kelishini biladi.
 */

import type { ProfilJavoblari } from './profil.js';
import type { XitoyTovar } from './xitoy.js';
import type { KargoStavkasi } from './fakt.js';
import type { Kurs } from './kurs.js';
import { SHAHARLAR } from './savollar.js';
import type { OylikSoliq, RasmiyFaktlar } from './rasmiy.js';
import type { QabulFaktlar, QadoqQoidasi } from './qabul.js';
import { STUDIYA_CHIQISH, type SuratNomzodi, type SuratTalablari } from './studiya.js';

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
export type KodHarakati = 'yonalishlar' | 'tovarlar' | 'tannarx' | 'xitoy' | 'buyurtma' | 'ochiq_ish' | 'rasmiy' | 'rasmiy_yakun' | 'qabul' | 'qabul_yakun'
  | 'studiya' | 'studiya_yakun' | 'yuklash' | 'yuklash_yakun';

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
  { n: 6, nom: 'Buyurtma va kargo', qurilgan: true },
  { n: 7, nom: 'Rasmiylashtirish', qurilgan: true },
  { n: 8, nom: 'Qabul', qurilgan: true },
  { n: 9, nom: 'Studiya', qurilgan: true },
  { n: 10, nom: 'Yuklash', qurilgan: true },
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

// ---- 6-qadam natijasi: buyurtma varaqasi. `suhbat-kod.ts` yasaydi, UI chizadi.

export interface BuyurtmaQatori {
  productId: number;
  title: string;
  /** 5-qadamda tanlangan 1688 taklifi. `null` — tanlanmagan/oʻtkazilgan. */
  sourceId: string | null;
  xitoyTitle: string | null;
  manzil: string | null;
  miqdor: number | null;
  narxYuan: number | null;
  narxSom: number | null;
  jamiYuan: number | null;
  jamiSom: number | null;
  weightG: number | null;
  /** Bir dona uchun kargo, soʻm — fakt stavkasi bilan; boʻlmasa `null`. */
  kargoSom: number | null;
  kargoIzoh: string | null;
  holat: 'tayyor' | 'tanlanmagan';
}

export interface BuyurtmaNatijasi {
  olchov_yoq: boolean;
  sabab?: string;
  qatorlar: BuyurtmaQatori[];
  jami: {
    yuan: number | null;
    som: number | null;
    kargoSom: number | null;
    dona: number | null;
    tayyor: number;
    tanlanmagan: number;
  };
  kargo: KargoStavkasi;
  kurs: { cny: Kurs | null; usd: Kurs | null };
  izoh: string;
}

export interface OchiqIshNatijasi {
  olchov_yoq: boolean;
  sabab?: string;
  id: number | null;
  yangi: boolean;
  tur: 'kutyapman';
  /** ISO sana; `null` — muddat nomaʼlum (kargo muddati yoʻq). */
  muddat: string | null;
  izoh: string;
}

function buyurtmaNatija(h: YolHolati): BuyurtmaNatijasi | null {
  const n = h.natijalar.buyurtma as BuyurtmaNatijasi | undefined;
  return n ?? null;
}

// ---- 7-qadam natijalari: rasmiylashtirish faktlari va ochiq ishlar. `suhbat-kod.ts` yasaydi.

export interface RasmiyNatijasi {
  olchov_yoq: boolean;
  sabab?: string;
  faktlar: RasmiyFaktlar;
  /** 1-qadamda "sotyapman" / "kabinet_bor" — YATT, bank, kabinet allaqachon bor. */
  kabinetBor: boolean;
  /** 4-qadam partiyasi: sotuv narxi × miqdor yigʻindisi; biror qatorda yoʻq boʻlsa null. */
  partiyaSotuvSom: number | null;
  soliq: OylikSoliq;
  izoh: string;
}

export interface RasmiyYakunNatijasi {
  olchov_yoq: boolean;
  sabab?: string;
  yozildi: Array<{ tur: 'kutyapman' | 'tekshirish'; sabab: string; muddat: string | null; id: number | null; yangi: boolean }>;
  izoh: string;
}

function rasmiyNatija(h: YolHolati): RasmiyNatijasi | null {
  const n = h.natijalar.rasmiy as RasmiyNatijasi | undefined;
  return n ?? null;
}

/** 1-qadam javobi: Uzum kabineti allaqachon bor — u bu yoʻlni oʻtgan, savol berilmaydi. */
export function kabinetBormi(h: YolHolati): boolean {
  const q = h.javoblar['uzum_dokoni'];
  return q === 'sotyapman' || q === 'kabinet_bor';
}

export const HUQUQIY_SHAKL: readonly SuhbatVarianti[] = [
  { qiymat: 'yatt', nom: 'YATT bor' },
  { qiymat: 'mchj', nom: 'MChJ (firma) bor' },
  { qiymat: 'oz_band', nom: 'Oʻzini oʻzi band qilganman' },
  { qiymat: 'yoq', nom: 'Hech biri yoʻq' },
];
export const YATT_OCHISH: readonly SuhbatVarianti[] = [
  { qiymat: 'ochdim', nom: 'Ochdim, guvohnoma qoʻlimda' },
  { qiymat: 'keyin', nom: 'Keyinroq ochaman' },
  { qiymat: 'boshqacha', nom: 'Sayt boshqacha / bu tugma yoʻq' },
];
export const BANK_HISOBI: readonly SuhbatVarianti[] = [
  { qiymat: 'bor', nom: 'Biznes hisob raqamim bor' },
  { qiymat: 'ochdim', nom: 'Hozir ochdim' },
  { qiymat: 'keyin', nom: 'Keyinroq ochaman' },
  { qiymat: 'boshqacha', nom: 'Bank shartlari boshqacha' },
];
export const UZUM_KABINET: readonly SuhbatVarianti[] = [
  { qiymat: 'faol', nom: 'Kabinet faollashtirilgan' },
  { qiymat: 'kutyapman', nom: 'Ariza yubordim, kutyapman' },
  { qiymat: 'keyin', nom: 'Keyinroq' },
  { qiymat: 'boshqacha', nom: 'Sayt boshqacha / bu tugma yoʻq' },
];

/** Soʻm matni — fakt boʻlmasa shunday deyiladi, nol yozilmaydi. */
function somMatni(x: number | null): string {
  return x === null ? 'faktda yoʻq' : `${x} soʻm`;
}

function yattMatni(n: RasmiyNatijasi): string {
  const y = n.faktlar.yatt;
  return `Rasmiy maqom kerak. Eng oddiysi — YATT: onlayn ${y.royxatUrl ?? '(manzil faktda yoʻq)'} (davlat boji ${somMatni(y.bojOnlaynSom)}) yoki Davlat xizmatlari markazida shaxsan (${somMatni(y.bojShaxsanSom)}), ${y.muddatDaqiqa !== null ? `taxminan ${y.muddatDaqiqa} daqiqa` : 'muddati faktda yoʻq'}. Kerak: pasport yoki ID-karta va JShShIR. Ochdingizmi?`;
}

function bankMatni(n: RasmiyNatijasi): string {
  const b = n.faktlar.banklar;
  const bepul = b.filter((x) => x.ochishSom === 0 && x.oylikSom === 0).length;
  const jadval = b.length
    ? `${b.length} ta bank taqqoslandi${bepul ? `, ${bepul} tasida ochish ham, oylik xizmat ham bepul` : ''} — jadval yuqorida.`
    : 'Bank roʻyxati faktda yoʻq.';
  return `Uzum pulni faqat oʻz nomingizdagi biznes hisob raqamiga oʻtkazadi — shaxsiy karta boʻlmaydi. ${jadval} Hisob raqamingiz bormi?`;
}

function kabinetMatni(n: RasmiyNatijasi): string {
  const u = n.faktlar.uzum;
  return `Uzum kabineti: ${u.kabinetUrl ?? '(manzil faktda yoʻq)'} da roʻyxat, hujjatlar (guvohnoma + pasport), my3.soliq.uz da Uzumni komissioner qilib qoʻshish (rekvizitlar yuqoridagi kartada), keyin biznes-qoʻllab-quvvatlashga skrinshot — tekshiruv ${u.faollashtirishKun !== null ? `taxminan ${u.faollashtirishKun} kun` : 'muddati faktda yoʻq'}. Kabinet holati qanday?`;
}

// ---- 8-qadam natijalari: qabul (yuk tekshiruvi va omborga topshirish). `suhbat-kod.ts` yasaydi.

export interface QabulQatori {
  productId: number;
  title: string;
  miqdor: number | null;
  /** Uzum qadoq jadvalidan nom boʻyicha topilgan qoida; topilmasa `null` (umumiy qoida koʻrsatiladi). */
  qadoq: Pick<QadoqQoidasi, 'tur' | 'usul' | 'belgilar'> | null;
}

export interface QabulQadamNatijasi {
  olchov_yoq: boolean;
  sabab?: string;
  faktlar: QabulFaktlar;
  qatorlar: QabulQatori[];
  /** Varaqadagi jami dona; biror qatorda miqdor boʻlmasa `null`. */
  jamiDona: number | null;
  izoh: string;
}

export interface QabulYakunNatijasi {
  olchov_yoq: boolean;
  sabab?: string;
  yozildi: Array<{ tur: 'kutyapman' | 'tekshirish'; sabab: string; muddat: string | null; id: number | null; yangi: boolean }>;
  izoh: string;
}

function qabulNatija(h: YolHolati): QabulQadamNatijasi | null {
  const n = h.natijalar.qabul as QabulQadamNatijasi | undefined;
  return n ?? null;
}

// ---- 9-qadam natijalari: studiya (oq fonli suratlar). `suhbat-kod.ts` yasaydi.

export interface StudiyaSurati extends SuratNomzodi {
  /** Worker manzili (imzolangan; oq fon, 3:4). Studiya ulanmagan boʻlsa `null` — asl surat koʻrsatiladi. */
  url: string | null;
}

/**
 * Tanlangan 1688 taklifi galereyasi: `olindi` (provayderdan), `keshdan`
 * (72 soat), `olinmadi` (sabab bilan — kalit yoʻq, provayder bermadi),
 * `xato` (yurish yiqildi). "Olinmadi" bilan "xato" farqlanadi (QOIDALAR §8).
 */
export type GalereyaHolati = 'olindi' | 'keshdan' | 'olinmadi' | 'xato';

export interface StudiyaQatori {
  productId: number;
  title: string;
  suratlar: StudiyaSurati[];
  galereya: GalereyaHolati;
  galereyaSabab: string | null;
  /** Taklif videosi (1688) — Uzum MP4 video qabul qiladi; xitoycha yozuv/ovoz boʻlishi mumkin. */
  video: string | null;
}

/** Galereyasi tayyor tovar (kesh yoki provayderdan). */
export interface StudiyaTayyor {
  productId: number;
  galereya: GalereyaHolati;
  sabab: string | null;
  rasmlar: string[];
  video: string | null;
}

export interface StudiyaKutish {
  boshlandi: string;
  /** Bitta Apify yurishi (`offerIds` rejimi) — hamma taklif uchun. */
  runId: string;
  kutilgan: Array<{ productId: number; offerId: string }>;
  urinish?: number;
  tayyor: StudiyaTayyor[];
}

export interface StudiyaNatijasi {
  olchov_yoq: boolean;
  sabab?: string;
  qatorlar: StudiyaQatori[];
  /** Uzum surat talablari (0059). Baza javob bermasa `null`. */
  talablar: SuratTalablari | null;
  /** Cloudflare Worker ulanganmi (STUDIYA_URL + STUDIYA_KALIT). */
  sozlangan: boolean;
  /**
   * Studiya chiqishi (1200×1600, 3:4) fakt talabiga mosmi. `false` — Uzum
   * talabi oshgan: aytiladi va nazoratchiga tekshirish ishi yoziladi.
   * `null` — talab faktda yoʻq.
   */
  chiqishMos: boolean | null;
  kutilmoqda: StudiyaKutish | null;
  izoh: string;
}

// ---- 10-qadam natijasi: yuklash (kartochka + omborga topshirish).

export interface YuklashNatijasi {
  olchov_yoq: boolean;
  sabab?: string;
  faktlar: QabulFaktlar;
  talablar: SuratTalablari;
  qatorlar: QabulQatori[];
  jamiDona: number | null;
  izoh: string;
}

function studiyaNatija(h: YolHolati): StudiyaNatijasi | null {
  const n = h.natijalar.studiya as StudiyaNatijasi | undefined;
  return n ?? null;
}

function yuklashNatija(h: YolHolati): YuklashNatijasi | null {
  const n = h.natijalar.yuklash as YuklashNatijasi | undefined;
  return n ?? null;
}

/**
 * `tekshir` kelganda qaysi kod harakati tugashini kutyapmiz: 5-qadam (1688
 * qidiruvi) yoki 9-qadam (1688 taklif galereyasi). Hech biri — `null`.
 */
export function kutilayotganHarakat(h: YolHolati): KodHarakati | null {
  if ((h.natijalar.xitoy as { kutilmoqda?: unknown } | undefined)?.kutilmoqda) return 'xitoy';
  if ((h.natijalar.studiya as { kutilmoqda?: unknown } | undefined)?.kutilmoqda) return 'studiya';
  return null;
}

export const YUK_KELDI: readonly SuhbatVarianti[] = [
  { qiymat: 'keldi', nom: 'Keldi' },
  { qiymat: 'hali_yoq', nom: 'Hali kelmadi' },
];
export const YUK_KUTISH: readonly SuhbatVarianti[] = [{ qiymat: 'keldi', nom: 'Keldi' }];
export const YUK_MOS: readonly SuhbatVarianti[] = [
  { qiymat: 'mos', nom: 'Hammasi mos' },
  { qiymat: 'kam', nom: 'Kam keldi' },
  { qiymat: 'brak', nom: 'Nuqsonli bor' },
];
export const STUDIYA_TAYYOR: readonly SuhbatVarianti[] = [
  { qiymat: 'tayyor', nom: 'Yetarli, yuklab oldim' },
  { qiymat: 'kam', nom: 'Yetmadi — oʻzim suratga olaman' },
  { qiymat: 'qayta', nom: 'Qayta qidir' },
  { qiymat: 'keyin', nom: 'Keyinroq' },
];
export const KARTOCHKA_YARATILDI: readonly SuhbatVarianti[] = [
  { qiymat: 'yaratdim', nom: 'Yaratdim' },
  { qiymat: 'keyin', nom: 'Keyinroq' },
  { qiymat: 'boshqacha', nom: 'Kabinet boshqacha' },
];
export const QADOQ_TAYYOR: readonly SuhbatVarianti[] = [
  { qiymat: 'tayyor', nom: 'Tayyor' },
  { qiymat: 'keyin', nom: 'Keyinroq' },
  { qiymat: 'boshqacha', nom: 'Qoʻllanma boshqacha' },
];
export const YETKAZISH: readonly SuhbatVarianti[] = [
  { qiymat: 'ozim', nom: 'Oʻzim Toshkent omboriga olib boraman' },
  { qiymat: 'logistika', nom: 'Uzum logistikasi (BTP orqali, pullik)' },
  { qiymat: 'keyin', nom: 'Keyinroq' },
];
export const TAYMSLOT: readonly SuhbatVarianti[] = [
  { qiymat: 'oldim', nom: 'Yaratdim, taymslot oldim' },
  { qiymat: 'keyin', nom: 'Keyinroq' },
  { qiymat: 'boshqacha', nom: 'Kabinet boshqacha' },
];
export const TOPSHIRILDI: readonly SuhbatVarianti[] = [
  { qiymat: 'topshirdim', nom: 'Topshirdim' },
  { qiymat: 'kutyapman', nom: 'Taymslotni kutyapman' },
  { qiymat: 'keyin', nom: 'Keyinroq' },
  { qiymat: 'boshqacha', nom: 'Omborda boshqacha' },
];

/** Fakt boʻlmasa shunday deyiladi — nol yoki taxmin yozilmaydi. */
function faktYoki(x: string | number | null, birlik = ''): string {
  return x === null ? 'faktda yoʻq' : `${x}${birlik}`;
}

function yukKeldiMatni(n: QabulQadamNatijasi): string {
  return `Yuk keldimi? Varaqada ${n.jamiDona !== null ? `${n.jamiDona} dona` : 'dona soni yoʻq'} (${n.qatorlar.length} tovar).`;
}
function yukKutishMatni(n: QabulQadamNatijasi): string {
  const y = n.faktlar.yorliq;
  return `Kelguncha tayyorlab turing: yorliq printeri yoki oddiy printer (yorliq ${y.tavsiya ?? 'oʻlchami faktda yoʻq'}, kod: ${y.kod ?? 'faktda yoʻq'}), qadoq materiallari (${n.faktlar.qadoqUmumiy ?? 'qoida faktda yoʻq'}). Yuk kelganda «Keldi» ni bosing.`;
}
function yukMosMatni(n: QabulQadamNatijasi): string {
  return `Sanang va koʻzdan kechiring: varaqada ${n.jamiDona !== null ? `${n.jamiDona} dona` : 'dona soni yoʻq'}. Nuqsonli yoki qadogʻi buzilgan tovarni Uzum qabul qilmaydi (tafovut ${faktYoki(n.faktlar.tafovutSom, ' soʻm')} har birlik). Hammasi mosmi?`;
}
function qadoqMatni(n: { faktlar: QabulFaktlar }): string {
  const y = n.faktlar.yorliq;
  return `Har tovarga yorliq: ${y.kod ?? 'faktda yoʻq'}; oʻlcham ${y.tavsiya ?? 'faktda yoʻq'}. Quti ${n.faktlar.yetkazma.qutiToliqlik ?? 'toʻliqligi faktda yoʻq'} toʻlsin. Tovarlaringiz boʻyicha qadoq tavsiyasi yuqoridagi kartada. Qadoq va yorliqlar tayyormi?`;
}
function yetkazishMatni(n: { faktlar: QabulFaktlar }): string {
  const f = n.faktlar;
  return `Ombor: ${f.ombor.manzil ?? 'manzil faktda yoʻq'}, ${f.ombor.soat ?? 'soat faktda yoʻq'}. Viloyatdan — Uzum logistikasi: ${f.logistika.url ?? 'manzil faktda yoʻq'} (quti ${faktYoki(f.logistika.qutiKgMax, ' kg')} gacha, taymslotdan ${faktYoki(f.logistika.oldinKun, ' kun')} oldin, pullik). Qanday yetkazasiz?`;
}
function taymslotMatni(n: { faktlar: QabulFaktlar }): string {
  const f = n.faktlar;
  return `Kabinetda «Yetkazmalar → Yaratish»: tovarlar (${faktYoki(f.yetkazma.skuMax, ' SKU')} gacha), tannarx, dona, taymslot; yuborish aktini ${faktYoki(f.yetkazma.aktNusxa, ' nusxa')} chop eting. Taymslotni ${faktYoki(f.taymslot.ozgartirishMax, ' marta')} gacha oʻzgartirish mumkin, bekor qilish — ${faktYoki(f.taymslot.bekorSoat, ' soat')} oldin. Yaratdingizmi?`;
}
function topshirishMatni(n: { faktlar: QabulFaktlar }): string {
  const f = n.faktlar;
  return `Omborga topshirdingizmi? Qabul ${faktYoki(f.muddatKunMax, ' kun')} gacha choʻzilishi mumkin; tafovut (kam, ortiqcha, aralash, yorliqsiz) — ${faktYoki(f.tafovutSom, ' soʻm')} har birlik.`;
}

function studiyaTayyorMatni(n: StudiyaNatijasi): string {
  const jami = n.qatorlar.reduce((sum, q) => sum + q.suratlar.length, 0);
  const holat = n.sozlangan ? `oq fonda, 3:4 (${STUDIYA_CHIQISH.eni}×${STUDIYA_CHIQISH.boyi})` : 'asl holida — studiya xizmati hali ulanmagan';
  return `${jami ? `Jami ${jami} ta surat tayyorlandi — ${holat}` : 'Surat topilmadi'}. Keraklilarini belgilab yuklab oling: birinchisi — tovarning old tomoni; xitoycha yozuvli yoki boshqa doʻkon belgisi bor suratni tanlamang. Yetarlimi?`;
}

function kartochkaMatni(n: YuklashNatijasi): string {
  const t = n.talablar;
  const talab = t.minEni !== null && t.minBoyi !== null ? `kamida ${t.minEni}×${t.minBoyi}` : 'ruxsat faktda yoʻq';
  const qoidalar = t.kartochkaQoidalari.length ? `${t.kartochkaQoidalari.length} ta qoida` : 'qoidalar faktda yoʻq';
  return `Uzum kabinetida har tovar uchun kartochka yarating: nom, tavsif, xususiyatlar, VGT (oʻlcham va vazn) va 9-qadam suratlari — birinchisi tovarning old tomoni. Surat talabi: ${talab}, ${t.nisbat ?? 'nisbat faktda yoʻq'}, ${t.maxMb !== null ? `${t.maxMb} MB gacha` : 'hajm faktda yoʻq'}. Kartochka qoidalari (${qoidalar}) yuqoridagi kartada. Yaratdingizmi?`;
}

/** Ochiq ishlar yakuni — 8/9/10-qadamlar uchun bir xil jumla. */
function ochiqIshlarMatni(n: QabulYakunNatijasi, bosqich: string): string {
  const y = n.yozildi ?? [];
  const royxat = y.map((x) => `${x.sabab}${x.muddat ? ` (${x.muddat} gacha)` : ''}`).join('; ');
  if (n.olchov_yoq) return `Ochiq ishlarni yozishda xato: ${n.sabab ?? 'baza javob bermadi'}${y.length ? `; roʻyxat: ${royxat}` : ''}.`;
  if (y.length === 0) return `${bosqich} boʻyicha ochiq ish yoʻq — hammasi tayyor.`;
  const tekshirish = y.some((x) => x.tur === 'tekshirish');
  return `Ochiq ishlar yozildi (${y.length}): ${royxat}.${tekshirish ? ' Tekshirish belgilari nazoratchiga ketdi.' : ''}`;
}

/** Yuk keladigan shahar tugmalari — profil roʻyxati bilan bir xil (`savollar.ts`); "Boshqa" oʻrniga erkin matn. */
export const SHAHAR_TUGMALARI: readonly SuhbatVarianti[] = SHAHARLAR
  .filter((s) => s !== 'Boshqa')
  .map((s) => ({ qiymat: s, nom: s }));

/** Kargo yoʻli tugmasi matni — hamma raqam faktdan. */
function kargoYoliNomi(nom: string, y: NonNullable<KargoStavkasi['avia']>): string {
  return `${nom} — ${y.kun !== null ? `${y.kun} kun, ` : ''}$${y.usdKg}/kg${y.somPerKg !== null ? ` (≈ ${y.somPerKg} soʻm/kg)` : ''}`;
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

  // ---------------------------------------------------------- 6. Buyurtma va kargo
  //
  // Ssenariy: "Sotib olganingiz: jadval… Yuk holati… Kargo hamkori aytgan
  // muddat…" → shahar → (tanlov boʻlsa) avia/quruqlik → "Yuk kelganda
  // oʻzim aytaman… Boshlaymizmi?" → ochiq ish. Nazoratchi (2026-09-28):
  // kargo hamkori YOʻQ — stavkalar `fakt` dan; boʻlmasa rostini aytamiz.
  // Buyurtmani tizim BERMAYDI: varaqa yasaladi, obunachi uni agentga
  // yuboradi, raqamini qaytarib kiritadi.
  const bn = buyurtmaNatija(h);
  if (bn === null) return { tur: 'kod', harakat: 'buyurtma', qadam: 6 };
  if (!berilgan(h, 'shahar')) {
    return { tur: 'savol', savol: savol('shahar', 6,
      'Yuk qaysi shaharga keladi?',
      'tanlov', { variantlar: SHAHAR_TUGMALARI, erkin: true, profilMaydoni: 'city' }) };
  }
  if (bn.kargo.tanlovBor && bn.kargo.avia && bn.kargo.quruqlik && !berilgan(h, 'kargo_yol')) {
    return { tur: 'savol', savol: savol('kargo_yol', 6,
      `${kargoYoliNomi('Avia', bn.kargo.avia)}. ${kargoYoliNomi('Quruqlik', bn.kargo.quruqlik)}. Qaysi biri? Muddat — hamkorning oʻrtacha koʻrsatkichi, vaʼda emas.`,
      'tanlov', { variantlar: [
        { qiymat: 'avia', nom: kargoYoliNomi('Avia', bn.kargo.avia) },
        { qiymat: 'quruqlik', nom: kargoYoliNomi('Quruqlik', bn.kargo.quruqlik) },
      ] }) };
  }
  if (!berilgan(h, 'buyurtma_raqami')) {
    return { tur: 'savol', savol: savol('buyurtma_raqami', 6,
      'Buyurtma varaqasini agentga yoki kargo hamkoriga yuborib, buyurtma yoki kuzatuv raqamini olgan boʻlsangiz — shu yerga yozing. Hali boʻlmasa oʻtkazib yuboring, keyin soʻrayman.',
      'matn', { erkin: true, otkazishMumkin: true }) };
  }
  if (!berilgan(h, 'dokon_tayyorlash')) {
    return { tur: 'savol', savol: savol('dokon_tayyorlash', 6,
      'Yuk kelganda oʻzim aytaman. Kelguncha doʻkonni tayyorlaymiz, shunda yuk kelgan kuni sotishni boshlaysiz. Boshlaymizmi?',
      'tanlov', { variantlar: [{ qiymat: 'boshlaymiz', nom: 'Boshlaymiz' }] }) };
  }
  if (h.natijalar.ochiq_ish === undefined) return { tur: 'kod', harakat: 'ochiq_ish', qadam: 6 };

  // ---------------------------------------------------------- 7. Rasmiylashtirish
  //
  // Ssenariy: YATT → bank hisobi → Uzum kabineti. Hamma raqam `fakt` dan
  // (0057, docs/RASMIYLASHTIRISH-FAKTLAR.md). Davlat saytlari oʻzgaradi —
  // har savolda "sayt boshqacha / bu tugma yoʻq" varianti bor, u
  // `rasmiy_yakun` da tekshirish ishi boʻlib yoziladi (BACKLOG qarori,
  // 2026-09-25). 1-qadamda kabinet bor deganga savol berilmaydi.
  const rn = rasmiyNatija(h);
  if (rn === null) return { tur: 'kod', harakat: 'rasmiy', qadam: 7 };
  if (!kabinetBormi(h)) {
    if (!berilgan(h, 'huquqiy_shakl')) {
      return { tur: 'savol', savol: savol('huquqiy_shakl', 7,
        'Rasmiy maqomingiz bormi? Uzum Market YATT, MChJ yoki oʻzini oʻzi band qilgan shaxsni qabul qiladi.',
        'tanlov', { variantlar: HUQUQIY_SHAKL }) };
    }
    if (h.javoblar['huquqiy_shakl'] === 'yoq' && !berilgan(h, 'yatt_ochish')) {
      return { tur: 'savol', savol: savol('yatt_ochish', 7, yattMatni(rn), 'tanlov', { variantlar: YATT_OCHISH, otkazishMumkin: true }) };
    }
    if (!berilgan(h, 'bank_hisobi')) {
      return { tur: 'savol', savol: savol('bank_hisobi', 7, bankMatni(rn), 'tanlov', { variantlar: BANK_HISOBI, otkazishMumkin: true }) };
    }
    if (!berilgan(h, 'uzum_kabinet')) {
      return { tur: 'savol', savol: savol('uzum_kabinet', 7, kabinetMatni(rn), 'tanlov', { variantlar: UZUM_KABINET, otkazishMumkin: true }) };
    }
  }
  if (h.natijalar.rasmiy_yakun === undefined) return { tur: 'kod', harakat: 'rasmiy_yakun', qadam: 7 };

  // ---------------------------------------------------------- 8. Qabul (Xitoydan kelgan yuk)
  //
  // TARTIB TUZATILDI (nazoratchi 2026-09-29): Uzumda yetkazma (yorliq, akt,
  // taymslot) faqat KARTOCHKA yaratilgandan keyin mumkin, kartochkaga esa
  // surat kerak (qoʻllanma 6.3). Shuning uchun: 8 = yukni qabul qilish
  // (keldi, sanash, kam/nuqson), 9 = Studiya (surat), 10 = Yuklash
  // (kartochka + qadoq, yorliq, akt, taymslot, topshirish). Faktlar 0058.
  const qbn = qabulNatija(h);
  if (qbn === null) return { tur: 'kod', harakat: 'qabul', qadam: 8 };
  if (!berilgan(h, 'yuk_keldi')) {
    return { tur: 'savol', savol: savol('yuk_keldi', 8, yukKeldiMatni(qbn), 'tanlov', { variantlar: YUK_KELDI }) };
  }
  if (h.javoblar['yuk_keldi'] === 'hali_yoq' && !berilgan(h, 'yuk_kutish')) {
    return { tur: 'savol', savol: savol('yuk_kutish', 8, yukKutishMatni(qbn), 'tanlov', { variantlar: YUK_KUTISH }) };
  }
  if (!berilgan(h, 'yuk_mos')) {
    return { tur: 'savol', savol: savol('yuk_mos', 8, yukMosMatni(qbn), 'tanlov', { variantlar: YUK_MOS }) };
  }
  if ((h.javoblar['yuk_mos'] === 'kam' || h.javoblar['yuk_mos'] === 'brak') && !berilgan(h, 'yuk_izoh')) {
    return { tur: 'savol', savol: savol('yuk_izoh', 8,
      'Nima kam yoki nuqsonli? Qisqa yozing — agentga daʼvo uchun yozib qoʻyamiz.',
      'matn', { erkin: true, otkazishMumkin: true }) };
  }
  if (h.natijalar.qabul_yakun === undefined) return { tur: 'kod', harakat: 'qabul_yakun', qadam: 8 };

  // ---------------------------------------------------------- 9. Studiya
  //
  // Nazoratchi (2026-09-29): suratlar oq fonda, Uzumga moslab; manba — 1688
  // (tanlangan taklif galereyasi + oʻxshash takliflar), "iloji
  // boricha studiyaga ishi tushmasin"; foni allaqachon oq surat kesilmaydi
  // (Worker aniqlaydi). Tizim suratni Uzumga YUKLAMAYDI — sotuvchi yuklab
  // olib 10-qadamda kartochkaga qoʻyadi.
  const stn = studiyaNatija(h);
  if (stn === null) return { tur: 'kod', harakat: 'studiya', qadam: 9 };
  if (stn.kutilmoqda) {
    return { tur: 'kutish', qadam: 9, boshlandi: stn.kutilmoqda.boshlandi,
      matn: `1688 dan tovar suratlari olinmoqda (${stn.kutilmoqda.kutilgan.length} ta tovar) — odatda 20–60 soniya. Tayyor boʻlgach shu yerda koʻrinadi.` };
  }
  if (!berilgan(h, 'studiya_tayyor')) {
    return { tur: 'savol', savol: savol('studiya_tayyor', 9, studiyaTayyorMatni(stn), 'tanlov', { variantlar: STUDIYA_TAYYOR, otkazishMumkin: true }) };
  }
  if (h.natijalar.studiya_yakun === undefined) return { tur: 'kod', harakat: 'studiya_yakun', qadam: 9 };

  // ---------------------------------------------------------- 10. Yuklash
  //
  // Kartochka (qoʻllanma 5-bob, 0059) → qadoq va yorliq → yetkazish usuli →
  // yetkazma akti va taymslot → omborga topshirish (6/14-bob, 0058). Tizim
  // kartochka yaratmaydi — kabinetda sotuvchi yaratadi; biz qoidani va
  // raqamni beramiz. "Boshqacha" — tekshirish ishi (sayt oʻzgargan).
  const ykn = yuklashNatija(h);
  if (ykn === null) return { tur: 'kod', harakat: 'yuklash', qadam: 10 };
  if (!berilgan(h, 'kartochka_yaratildi')) {
    return { tur: 'savol', savol: savol('kartochka_yaratildi', 10, kartochkaMatni(ykn), 'tanlov', { variantlar: KARTOCHKA_YARATILDI, otkazishMumkin: true }) };
  }
  if (!berilgan(h, 'qadoq_tayyor')) {
    return { tur: 'savol', savol: savol('qadoq_tayyor', 10, qadoqMatni(ykn), 'tanlov', { variantlar: QADOQ_TAYYOR, otkazishMumkin: true }) };
  }
  if (!berilgan(h, 'yetkazish')) {
    return { tur: 'savol', savol: savol('yetkazish', 10, yetkazishMatni(ykn), 'tanlov', { variantlar: YETKAZISH, otkazishMumkin: true }) };
  }
  if (!berilgan(h, 'taymslot')) {
    return { tur: 'savol', savol: savol('taymslot', 10, taymslotMatni(ykn), 'tanlov', { variantlar: TAYMSLOT, otkazishMumkin: true }) };
  }
  if (!berilgan(h, 'topshirildi')) {
    return { tur: 'savol', savol: savol('topshirildi', 10, topshirishMatni(ykn), 'tanlov', { variantlar: TOPSHIRILDI, otkazishMumkin: true }) };
  }
  if (h.natijalar.yuklash_yakun === undefined) return { tur: 'kod', harakat: 'yuklash_yakun', qadam: 10 };

  // ---------------------------------------------------------- 11+. Hali qurilmagan
  const q11 = SUHBAT_QADAMLARI[10];
  return {
    tur: 'tezOrada', qadam: q11.n, nom: q11.nom,
    matn: `Keyingi qadam — ${q11.nom}: birinchi sotuvlar, narx va zaxira signallari. Bu qism hali qurilmagan. Tayyor boʻlganda shu chatda oʻzim aytaman. Kartochka va yetkazma javoblaringiz, ochiq ishlar saqlanib turadi.`,
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
  // "Qayta qidir" (9-qadam) — studiya natijasi va javobi tozalanadi,
  // `keyingi()` yana `studiya` kodini chaqiradi (galereya keshi 72 soat —
  // qayta pul olinmaydi).
  if (s.id === 'studiya_tayyor' && qiymat === 'qayta') {
    const yangi = { ...holat.javoblar };
    delete yangi['studiya_tayyor'];
    const natijalar = { ...holat.natijalar };
    delete natijalar.studiya;
    return { holat: { javoblar: yangi, natijalar }, xato: null, profil: null };
  }

  if (s.id === 'xitoy_qayta' && qiymat === 'qayta') {
    const yangi = { ...holat.javoblar };
    for (const id of Object.keys(yangi)) if (id.startsWith('xitoy_tanlov:')) delete yangi[id];
    delete yangi['xitoy_qayta'];
    const natijalar = { ...holat.natijalar };
    delete natijalar.xitoy;
    return { holat: { javoblar: yangi, natijalar }, xato: null, profil: null };
  }

  let profil: Partial<ProfilJavoblari> | null = null;
  if (s.profilMaydoni === 'city') profil = { city: qiymat === null ? null : String(qiymat).trim().slice(0, 100) };
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
  if (harakat === 'qabul') {
    const n = natija as QabulQadamNatijasi;
    if (n.olchov_yoq) return `Qabul faktlarini bera olmadim: ${n.sabab ?? 'oʻlchov yoʻq'}. Bu "qoida yoʻq" degani EMAS — raqamlar yoʻq.`;
    const f = n.faktlar;
    const yetishmaydi = f.yetishmaydi.length ? ` Faktda yoʻq: ${f.yetishmaydi.join(', ')}.` : '';
    const manba = f.manba ? ` Manba: ${f.manba}${f.olchandi ? ` (${f.olchandi})` : ''}.` : '';
    return `Qabul roʻyxati tayyor: ${n.qatorlar.length} ta tovar${n.jamiDona !== null ? `, ${n.jamiDona} dona` : ''}. Yuk kelganda sanang va koʻzdan kechiring: kam yoki nuqsonli boʻlsa agentga daʼvo uchun yozib qoʻyamiz. Nuqsonli tovarni Uzumga yubormang — omborda aniqlangan har muammo (brak, kam, ortiqcha, yorliqsiz) ${faktYoki(f.tafovutSom, ' soʻm')} har birlik.${yetishmaydi}${manba}`;
  }
  if (harakat === 'qabul_yakun') return ochiqIshlarMatni(natija as QabulYakunNatijasi, 'Qabul');
  if (harakat === 'studiya') {
    const n = natija as StudiyaNatijasi;
    if (n.kutilmoqda) return `1688 dan tovar suratlari olinmoqda (${n.kutilmoqda.kutilgan.length} ta tovar) — odatda 20–60 soniya.`;
    if (n.olchov_yoq) return `Studiya suratlarini tayyorlay olmadim: ${n.sabab ?? 'oʻlchov yoʻq'}.`;
    const q = n.qatorlar;
    const jami = q.reduce((sum, x) => sum + x.suratlar.length, 0);
    const oxshash = q.reduce((sum, x) => sum + x.suratlar.filter((y) => y.manba === '1688-oxshash').length, 0);
    const olinmadi = q.filter((x) => x.galereya === 'olinmadi' || x.galereya === 'xato');
    const sabablar = [...new Set(olinmadi.map((x) => x.galereyaSabab ?? 'sabab yozilmagan'))].join('; ');
    const t = n.talablar;
    const talab = t && t.minEni !== null && t.minBoyi !== null
      ? ` Uzum talabi: kamida ${t.minEni}×${t.minBoyi}, ${t.nisbat ?? 'nisbat faktda yoʻq'}${t.maxMb !== null ? `, ${t.maxMb} MB gacha` : ''}.`
      : ' Uzum surat talablari faktda yoʻq.';
    return `Studiya: ${q.length} ta tovar uchun ${jami} ta surat (${jami - oxshash} tasi siz tanlagan taklifdan, ${oxshash} tasi oʻxshash takliflardan).`
      + (n.sozlangan
        ? ` Har biri ${STUDIYA_CHIQISH.eni}×${STUDIYA_CHIQISH.boyi} (3:4), oq fonda: foni oq boʻlsa faqat moslanadi, boʻlmasa fon olib tashlanadi — tovarning oʻzi oʻzgarmaydi.`
        : ' Studiya xizmati hali ulanmagan — suratlar asl holida, fon oqlanmagan.')
      + (olinmadi.length ? ` ${olinmadi.length} ta tovarda taklif galereyasi olinmadi: ${sabablar}.` : '')
      + (oxshash ? ' Oʻxshash taklif surati boshqa sotuvchiniki — tovar aynan bir xilligini tekshiring.' : '')
      + talab
      + (n.chiqishMos === false ? ` DIQQAT: studiya chiqishi (${STUDIYA_CHIQISH.eni}×${STUDIYA_CHIQISH.boyi}) bu talabga mos emas — nazoratchiga yozildi.` : '')
      + ' Xitoycha yozuvli yoki boshqa doʻkon belgisi bor suratni tanlamang.';
  }
  if (harakat === 'studiya_yakun') return ochiqIshlarMatni(natija as QabulYakunNatijasi, 'Studiya');
  if (harakat === 'yuklash') {
    const n = natija as YuklashNatijasi;
    if (n.olchov_yoq) return `Yuklash faktlarini bera olmadim: ${n.sabab ?? 'oʻlchov yoʻq'}. Bu "qoida yoʻq" degani EMAS — raqamlar yoʻq.`;
    const f = n.faktlar;
    const qadoqli = n.qatorlar.filter((q) => q.qadoq !== null).length;
    const yetishmaydi = [...f.yetishmaydi, ...n.talablar.yetishmaydi];
    return `Yuklash: ${n.qatorlar.length} ta tovar${n.jamiDona !== null ? `, ${n.jamiDona} dona` : ''}. Avval kartochka (${n.talablar.kartochkaQoidalari.length} ta qoida), keyin qadoq (${qadoqli} tasiga Uzum jadvalidan qoida), yorliq, yetkazma akti va taymslot. Ombor: ${f.ombor.manzil ?? 'manzil faktda yoʻq'} (${f.ombor.soat ?? 'soat faktda yoʻq'}); qabul ${faktYoki(f.muddatKunMax, ' kun')} gacha, tafovut ${faktYoki(f.tafovutSom, ' soʻm')} har birlik.`
      + (yetishmaydi.length ? ` Faktda yoʻq: ${yetishmaydi.join(', ')}.` : '')
      + (f.manba ? ` Manba: ${f.manba}${f.olchandi ? ` (${f.olchandi})` : ''}.` : '');
  }
  if (harakat === 'yuklash_yakun') return ochiqIshlarMatni(natija as QabulYakunNatijasi, 'Yuklash');
  if (harakat === 'rasmiy') {
    const n = natija as RasmiyNatijasi;
    if (n.olchov_yoq) {
      return `Rasmiylashtirish faktlarini bera olmadim: ${n.sabab ?? 'oʻlchov yoʻq'}. Bu "kerak emas" degani EMAS — raqamlar yoʻq.`;
    }
    const f = n.faktlar;
    const s = n.soliq;
    const soliq = `Majburiy soliq (2026): ijtimoiy ${somMatni(s.ijtimoiySom)} har oy (sotuv boʻlmasa ham)`
      + (f.soliq.aylanmaFoiz !== null ? `, aylanmadan ${f.soliq.aylanmaFoiz} %` : ', aylanma foizi faktda yoʻq')
      + (s.aylanmaSom !== null && n.partiyaSotuvSom !== null ? ` — partiyangiz (${n.partiyaSotuvSom} soʻm) sotilsa ≈ ${s.aylanmaSom} soʻm` : '')
      + '.';
    const manbalar = [...new Set([f.soliq.manba, f.yatt.manba].filter((x): x is string => x !== null))];
    const manba = manbalar.length ? ` Manba: ${manbalar.join('; ')}${f.soliq.olchandi ? ` (oʻlchandi ${f.soliq.olchandi})` : ''}.` : '';
    const yetishmaydi = f.yetishmaydi.length ? ` Faktda yoʻq: ${f.yetishmaydi.join(', ')} — nazoratchi kiritadi.` : '';
    if (n.kabinetBor) {
      return `Rasmiylashtirish sizda bor — 1-qadamda Uzum kabineti bor dedingiz. ${soliq}${manba}${yetishmaydi}`;
    }
    return `Rasmiylashtirish uchun uchta narsa: YATT (onlayn ${somMatni(f.yatt.bojOnlaynSom)}, shaxsan ${somMatni(f.yatt.bojShaxsanSom)}), biznes hisob raqami (${f.banklar.length} ta bank taqqoslandi) va Uzum kabineti (faollashtirish ${f.uzum.faollashtirishKun !== null ? `${f.uzum.faollashtirishKun} kun` : 'muddati faktda yoʻq'}). ${soliq}${manba}${yetishmaydi} Bu soliq yoki yuridik maslahat emas — raqamlar manbadan.`;
  }
  if (harakat === 'rasmiy_yakun') {
    const n = natija as RasmiyYakunNatijasi;
    const y = n.yozildi ?? [];
    const royxat = y.map((x) => `${x.sabab}${x.muddat ? ` (${x.muddat} gacha)` : ''}`).join('; ');
    if (n.olchov_yoq) return `Ochiq ishlarni yozishda xato: ${n.sabab ?? 'baza javob bermadi'}${y.length ? `; roʻyxat: ${royxat}` : ''}.`;
    if (y.length === 0) return 'Rasmiylashtirish boʻyicha ochiq ish yoʻq — hammasi tayyor.';
    const tekshirish = y.some((x) => x.tur === 'tekshirish');
    return `Ochiq ishlar yozildi (${y.length}): ${royxat}.${tekshirish ? ' "Sayt boshqacha" belgilaganingiz nazoratchiga tekshirish uchun ketdi.' : ''}`;
  }
  if (harakat === 'buyurtma') {
    const n = natija as BuyurtmaNatijasi;
    const q = n.qatorlar ?? [];
    if (n.olchov_yoq && q.length === 0) {
      return `Buyurtma varaqasini yasay olmadim: ${n.sabab ?? 'oʻlchov yoʻq'}.`;
    }
    const j = n.jami;
    const kargo = n.kargo.izoh
      ? ` Kargo: ${n.kargo.izoh} — kargo narxi hisobga kirmadi, jami shunga koʻra PASTROQ koʻrinadi.`
      : (j.kargoSom !== null ? ` Kargo (ogʻirlik boʻyicha, ${n.kargo.hamkor ?? 'hamkor'}): ${j.kargoSom} soʻm.` : ' Kargo: ogʻirlik oʻlchanmagan tovarlar bor — hisobga kirmadi.');
    return `Buyurtma varaqasi tayyor: ${j.tayyor} ta tovar`
      + (j.dona !== null ? `, ${j.dona} dona` : '')
      + (j.yuan !== null ? `, jami ¥${j.yuan}` : '')
      + (j.som !== null ? ` (≈ ${j.som} soʻm, CBU ${n.kurs.cny?.sana ?? ''})` : '')
      + (j.tanlanmagan ? `; ${j.tanlanmagan} ta tovarda 1688 taklifi tanlanmagan — varaqaga kirmadi` : '')
      + '.' + kargo + ' Buyurtmani tizim bermaydi: varaqani agent yoki kargo hamkoriga yuborasiz.';
  }
  if (harakat === 'ochiq_ish') {
    const n = natija as OchiqIshNatijasi;
    if (n.olchov_yoq) return `Kutish ishini yozib qoʻya olmadim: ${n.sabab ?? 'baza javob bermadi'}. Yuk kelganda oʻzingiz aytasiz.`;
    return n.muddat
      ? `Yuk kelishini kutamiz: taxminan ${n.muddat} (hamkor oʻrtacha muddati, vaʼda emas). Kelguncha doʻkonni tayyorlaymiz.`
      : 'Yuk kelishini kutamiz. Muddatni ayta olmayman — kargo hamkori va stavkasi hali kiritilmagan. Kelganda oʻzingiz xabar bering; kelguncha doʻkonni tayyorlaymiz.';
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
