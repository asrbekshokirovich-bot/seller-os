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
 * 11 — Sotuv boshlandi, 2026-09-30: sotuvchining oʻz kartochkasi kuzatuvga
 * qoʻshiladi (`so_sotuv_kuzat`, 0061), skreyper kuniga 3 marta oʻlchaydi,
 * signallar (zaxira 20 % dan tushdi → yana buyurtma, yangi sharh,
 * raqobatchi narxi) — `sotuv.ts`; 12 — Hisobot: oy yakuni, soliq (0057,
 * 0060), deklaratsiya qadam kartalari, keyingi oy rejasi → 11 ga qaytish.
 * Endi 12 qadamning hammasi qurilgan; yoʻl oyma-oy aylanadi (11 ↔ 12) va
 * "yana buyurtma" 6-qadamdan yangi partiyani boshlaydi (5-qadam tanlovi
 * saqlanadi — sotuvchi maʼlum).
 */

import type { ProfilJavoblari } from './profil.ts';
import type { XitoyTovar } from './xitoy.ts';
import { minglik, type KargoStavkasi } from './fakt.ts';
import type { Kurs } from './kurs.ts';
import { SHAHARLAR } from './savollar.ts';
import type { OylikSoliq, RasmiyFaktlar } from './rasmiy.ts';
import type { QabulFaktlar, QadoqQoidasi } from './qabul.ts';
import { STUDIYA_CHIQISH, type SuratNomzodi, type SuratTalablari } from './studiya.ts';
import { KUZATUV_VAQTLARI, uzumMahsulotId, type OzHolat, type RaqobatchiHolat, type SotuvSignali } from './sotuv.ts';
import { oldingiOy, oyNomi, sanaMatni, type HisobotFaktlar, type OyHisobi } from './hisobot.ts';
import { matndanSon, valyutami } from './tekshiruv.ts';

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
  | 'studiya' | 'studiya_yakun' | 'yuklash' | 'yuklash_yakun'
  | 'sotuv' | 'hisobot' | 'hisobot_hisob' | 'hisobot_yakun'
  | 'usta_fikri';

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
  /**
   * Kod natijalari (`KodHarakati` kalitlari) va aylanish holati: `partiya`
   * (nechanchi partiya, 11-qadam "yana buyurtma"), `oldingi_partiyalar`,
   * `oylar` (12-qadam arxivi).
   */
  natijalar: Partial<Record<KodHarakati | 'partiya' | 'oldingi_partiyalar' | 'oylar', unknown>>;
}

// ==================================================================== qadamlar

/** `ru` — sayt rus tilida boʻlganda yon menyu, sarlavha va Obuna roʻyxatidagi nom. */
export const SUHBAT_QADAMLARI = [
  { n: 1, nom: 'Tanishuv', ru: 'Знакомство', qurilgan: true },
  { n: 2, nom: 'Yoʻnalish', ru: 'Направление', qurilgan: true },
  { n: 3, nom: 'Tovar va miqdor', ru: 'Товар и количество', qurilgan: true },
  { n: 4, nom: 'Tannarx', ru: 'Себестоимость', qurilgan: true },
  { n: 5, nom: 'Xitoydan topish', ru: 'Поиск в Китае', qurilgan: true },
  { n: 6, nom: 'Buyurtma va kargo', ru: 'Заказ и карго', qurilgan: true },
  { n: 7, nom: 'Rasmiylashtirish', ru: 'Оформление', qurilgan: true },
  { n: 8, nom: 'Qabul', ru: 'Приёмка', qurilgan: true },
  { n: 9, nom: 'Studiya', ru: 'Студия', qurilgan: true },
  { n: 10, nom: 'Yuklash', ru: 'Загрузка', qurilgan: true },
  { n: 11, nom: 'Sotuv boshlandi', ru: 'Старт продаж', qurilgan: true },
  { n: 12, nom: 'Hisobot', ru: 'Отчёт', qurilgan: true },
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
  /** Roʻyxatda qolgan (bloklamaydigan) tuzoq bayroqlari — ogohlantirish. */
  bayroqlar?: unknown[];
  /** Maʼlumot yetmagani uchun baholanmagan filtrlar. */
  baholanmadi?: unknown[];
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
  return x === null ? 'faktda yoʻq' : `${minglik(x)} soʻm`;
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
  /**
   * Qatorlar buyurtma varaqasidan (`true`) yoki — varaqada tayyor qator yoʻq
   * boʻlsa — tanlangan tovarlardan (`false`). `false` da chat "Varaqada N
   * dona" demaydi. Eski natijalarda yoʻq — varaqa deb olinadi.
   */
  varaqadan?: boolean;
  izoh: string;
}

export interface QabulYakunNatijasi {
  olchov_yoq: boolean;
  sabab?: string;
  yozildi: Array<{ tur: 'kutyapman' | 'tekshirish' | 'tolov'; sabab: string; muddat: string | null; id: number | null; yangi: boolean }>;
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
  /** `QabulQadamNatijasi.varaqadan` bilan bir xil maʼno. */
  varaqadan?: boolean;
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

// ---- 11-qadam natijasi: sotuv. `suhbat-kod.ts` yasaydi, raqamlar `sotuv.ts` dan.

export interface SotuvTovari {
  /** 3-qadamda tanlangan (raqobatchi) Uzum tovari — partiya shu asosda. */
  productId: number;
  title: string;
  miqdor: number | null;
  /** Sotuvchining oʻz kartochkasi (havoladan). `null` — hali chiqmagan yoki havola berilmagan. */
  ozId: number | null;
  oz: OzHolat | null;
  raqobatchi: RaqobatchiHolat | null;
  /** Oldingi xarid: 1688 narxi (¥) — "yana buyurtma" matni uchun. */
  xaridYuan: number | null;
  /** Tovar oxirgi marta olingan partiya — zaxira signali shu partiyada bir marta. */
  partiya: number;
}

export interface SotuvNatijasi {
  olchov_yoq: boolean;
  sabab?: string;
  /** Hisoblangan sana (ISO) va oy (YYYY-MM). */
  sana: string;
  oy: string;
  partiya: number;
  qatorlar: SotuvTovari[];
  signallar: SotuvSignali[];
  /** `so_sotuv_kuzat` javobi; qoʻshilmagan boʻlsa `null` va `kuzatuvXato`. */
  kuzatuv: { qoshildi: number; bor: number } | null;
  kuzatuvXato: string | null;
  jami: { bugunDona: number | null; oyDona: number | null; oySom: number | null };
  izoh: string;
}

// ---- 12-qadam natijalari: hisobot.

export interface HisobotNatijasi {
  olchov_yoq: boolean;
  sabab?: string;
  oy: string;
  /** Hisobot oyi tugaganmi (joriy oydan oldingi). `false` — joriy oy, hozirgacha. */
  tugagan: boolean;
  faktlar: HisobotFaktlar;
  olchovSotuv: number | null;
  olchovDona: number | null;
  /** Shu oyda sotuvi oʻlchangan kunlar (tovarlar ichida eng koʻpi); oʻlchov yoʻq — `null`. */
  olchovKun: number | null;
  /** Oydagi kunlar (joriy oy — bugungacha). */
  oyKunlari: number | null;
  qatorlar: Array<{ productId: number; title: string; oyDona: number | null; oySom: number | null; olchovKun: number }>;
  izoh: string;
}

export interface HisobotHisobNatijasi extends OyHisobi {
  tugagan: boolean;
  /** Taxmin oyning bir qismidan boʻlsa — necha kundan nechtasi oʻlchangan. */
  qamrov: { kun: number; jami: number } | null;
  /**
   * 7-qadamdagi huquqiy shakl (`huquqiy_shakl` javobi: yatt, mchj, oz_band,
   * yoq); soʻralmagan boʻlsa (Uzum kabineti bor) `null`. Soliq hisobi YATT
   * uchun — boshqa shaklga bu ochiq aytiladi.
   */
  shakl?: string | null;
  faktlar: HisobotFaktlar;
  /** Deklaratsiya qadam kartalari (7-qadamdagidek) — hamma raqam faktdan. */
  qadamlar: string[];
  izoh: string;
}

export interface HisobotYakunNatijasi {
  olchov_yoq: boolean;
  sabab?: string;
  yozildi: Array<{ tur: string; sabab: string; muddat: string | null; id: number | null; yangi: boolean }>;
  /** Keyingi oy rejasi — har tovar uchun bitta jumla. */
  reja: string[];
  izoh: string;
}

/** Oʻlchov oyni toʻliq qoplamasa — necha kundan nechtasi; qoplasa yoki nomaʼlum — `null`. */
export function hisobotQamrovi(hn: Pick<HisobotNatijasi, 'olchovKun' | 'oyKunlari'>): { kun: number; jami: number } | null {
  const kun = hn.olchovKun ?? null;
  const jami = hn.oyKunlari ?? null;
  return kun !== null && jami !== null && kun < jami ? { kun, jami } : null;
}

function qamrovMatni(q: { kun: number; jami: number } | null | undefined): string {
  return q ? `${q.jami} kundan ${q.kun} kuni oʻlchangan` : '';
}

function sotuvNatija(h: YolHolati): SotuvNatijasi | null {
  const n = h.natijalar.sotuv as SotuvNatijasi | undefined;
  return n ?? null;
}

/** Partiya tovarlari: varaqadagi tayyor qatorlar, boʻlmasa 3-qadam tanlovi. */
function partiyaTovarlari(h: YolHolati): Array<{ productId: number; title: string }> {
  const bn = h.natijalar.buyurtma as { qatorlar?: Array<{ productId: number; title: string; holat: string }> } | undefined;
  const tayyor = (bn?.qatorlar ?? []).filter((q) => q.holat === 'tayyor');
  if (tayyor.length) return tayyor.map((q) => ({ productId: q.productId, title: q.title }));
  const tanlangan = Array.isArray(h.javoblar['tovarlar']) ? (h.javoblar['tovarlar'] as unknown[]).map(Number).filter(Number.isInteger) : [];
  const tn = h.natijalar.tovarlar as { royxat?: Array<{ nomzod: { productId: number; title: string } }> } | undefined;
  return tanlangan.map((id) => ({ productId: id, title: tn?.royxat?.find((x) => x.nomzod.productId === id)?.nomzod.title ?? `#${id}` }));
}

/**
 * "Yana buyurtma" paytida yopilgan partiya (`natijalar.oldingi_partiyalar`).
 * `sana` — qayta buyurtma kuni; `zaxira`/`tezlik` — oʻsha paytdagi oʻz
 * kartochka oʻlchovi (tovar id → qiymat).
 */
interface PartiyaArxivi {
  partiya: number;
  sana: string | null;
  buyurtma: unknown;
  zaxira?: Record<string, number | null>;
  tezlik?: Record<string, number | null>;
}

function partiyaArxivi(h: YolHolati): PartiyaArxivi[] {
  return Array.isArray(h.natijalar.oldingi_partiyalar) ? (h.natijalar.oldingi_partiyalar as PartiyaArxivi[]) : [];
}

/** Nechanchi partiya (1 dan): 11-qadamda har "yana buyurtma" bittaga oshiradi. */
export function partiyaRaqami(h: YolHolati): number {
  const p = Number(h.natijalar.partiya ?? 1);
  return Number.isInteger(p) && p >= 1 ? p : 1;
}

type VaraqaQatori = { productId: number; title: string; miqdor: number | null; narxYuan?: number | null; holat: string };

function tayyorQatorlar(buyurtma: unknown): VaraqaQatori[] {
  const q = (buyurtma as { qatorlar?: unknown } | null | undefined)?.qatorlar;
  return Array.isArray(q) ? (q as VaraqaQatori[]).filter((x) => x.holat === 'tayyor') : [];
}

/** 11-qadam tovari: oxirgi olingan partiyasi va (qayta buyurtma boʻlsa) oʻsha kun va zaxira. */
export interface SotuvTovarAsosi {
  productId: number;
  title: string;
  miqdor: number | null;
  xaridYuan: number | null;
  partiya: number;
  qayta: { sana: string; zaxira: number | null } | null;
}

/**
 * 11-qadam tovarlari — hozirgi va oldingi partiyalar: qayta buyurtmada
 * olinmagan tovar ham Uzumda sotilishda davom etadi va kuzatiladi.
 */
export function sotuvTovarlari(h: YolHolati): SotuvTovarAsosi[] {
  const arxiv = partiyaArxivi(h);
  const natija = new Map<number, SotuvTovarAsosi>();
  const qosh = (qatorlar: VaraqaQatori[], partiya: number) => {
    // Partiya p (≥ 2) ni p−1 partiyaning arxiv yozuvi (qayta buyurtma kuni) boshlagan.
    const boshlagan = partiya >= 2 ? arxiv.find((a) => a.partiya === partiya - 1) ?? null : null;
    for (const q of qatorlar) {
      natija.set(q.productId, {
        productId: q.productId, title: q.title,
        miqdor: typeof q.miqdor === 'number' ? q.miqdor : null,
        xaridYuan: typeof q.narxYuan === 'number' ? q.narxYuan : null,
        partiya,
        qayta: boshlagan?.sana ? { sana: boshlagan.sana, zaxira: boshlagan.zaxira?.[String(q.productId)] ?? null } : null,
      });
    }
  };
  for (const a of arxiv) qosh(tayyorQatorlar(a.buyurtma), a.partiya);
  qosh(tayyorQatorlar(h.natijalar.buyurtma), partiyaRaqami(h));
  if (natija.size === 0) {
    for (const t of partiyaTovarlari(h)) {
      const m = h.javoblar[`miqdor:${t.productId}`];
      natija.set(t.productId, { ...t, miqdor: typeof m === 'number' && m > 0 ? m : null, xaridYuan: null, partiya: partiyaRaqami(h), qayta: null });
    }
  }
  return [...natija.values()];
}

/** Qayta buyurtma tovari (6-qadam, partiya ≥ 2): oldingi miqdor va oʻlchangan tezlik. */
export interface QaytaTovar {
  productId: number;
  title: string;
  oldingi: number | null;
  tezlik: number | null;
}

/** Qayta buyurtmaga tovarlar: 5-qadamda 1688 taklifi tanlanganlari (sotuvchi maʼlum). */
export function qaytaTovarlar(h: YolHolati): QaytaTovar[] {
  const arxiv = partiyaArxivi(h);
  const oxirgi = arxiv[arxiv.length - 1] ?? null;
  return tanlanganTovarlar(h)
    .filter((id) => { const t = h.javoblar[`xitoy_tanlov:${id}`]; return t !== null && t !== undefined; })
    .map((id) => {
      let oldingi: number | null = null;
      for (let i = arxiv.length - 1; i >= 0 && oldingi === null; i--) {
        const q = tayyorQatorlar(arxiv[i]!.buyurtma).find((x) => x.productId === id);
        if (q && typeof q.miqdor === 'number' && q.miqdor > 0) oldingi = q.miqdor;
      }
      const m = h.javoblar[`miqdor:${id}`];
      if (oldingi === null && typeof m === 'number' && m > 0) oldingi = m;
      const tz = oxirgi?.tezlik?.[String(id)];
      return { productId: id, title: tovarNomi(h, id), oldingi, tezlik: typeof tz === 'number' && tz > 0 ? tz : null };
    });
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
/**
 * B2 darvozasi — Usta haqidagi fikr (nazoratchi qarori, 2026-10-06: "a").
 * Reja: "begona 3 sotuvchi Ustadan mustaqil oʻtadi va «mantiqli» deydi".
 * Chat buni soʻramas edi va /olchov dagi darvoza hech qachon ochilmasdi.
 * Endi 4-qadamdan keyin (tovar, miqdor va chegara narx koʻrilgach) BIR
 * MARTA soʻraladi; oʻtkazib yuborish mumkin — yoʻlni toʻxtatmaydi.
 */
export const USTA_FIKRI: readonly SuhbatVarianti[] = [
  { qiymat: 'ha', nom: 'Ha, mantiqli' },
  { qiymat: 'yoq', nom: 'Yoʻq, nimadir notoʻgʻri' },
];
export const SIGNAL_ZAXIRA: readonly SuhbatVarianti[] = [
  { qiymat: 'yana', nom: 'Ha, yana buyurtma' },
  { qiymat: 'yoq', nom: 'Hozircha yoʻq' },
];
/**
 * 1688 sotuvchisi nomaʼlum tovar (5-qadamda taklif tanlanmagan) zaxirasi —
 * «Ha, yana buyurtma» taklif qilinmaydi: qayta buyurtma faqat sotuvchisi
 * maʼlum tovarlarni oladi va boshqa tovarga burilib ketardi.
 */
const ZAXIRA_OZIM: readonly SuhbatVarianti[] = [{ qiymat: 'ozim', nom: 'Tushunarli' }];
/** Boʻsh natija (2/3-qadam) va kutilmagan xato — kod harakatini qayta chaqirish. */
const QAYTA_URINISH: SuhbatVarianti = { qiymat: 'qayta', nom: 'Qayta urinish' };
const BOSHQA_YONALISH: SuhbatVarianti = { qiymat: 'boshqa', nom: 'Boshqa yoʻnalish' };
export const SIGNAL_NARX: readonly SuhbatVarianti[] = [
  { qiymat: 'tegmaymiz', nom: 'Tegmaymiz' },
  { qiymat: 'tushiraman', nom: 'Tushiraman' },
];
export const SIGNAL_SHARH: readonly SuhbatVarianti[] = [
  { qiymat: 'javob', nom: 'Javob yozaman' },
  { qiymat: 'keyin', nom: 'Keyinroq' },
];
export const DEKLARATSIYA: readonly SuhbatVarianti[] = [
  { qiymat: 'tayyorlaymiz', nom: 'Tayyorlaymiz' },
  { qiymat: 'keyin', nom: 'Keyinroq' },
];
export const DEKLARATSIYA_QADAM: readonly SuhbatVarianti[] = [
  { qiymat: 'bajardim', nom: 'Bajardim' },
  { qiymat: 'keyin', nom: 'Keyinroq' },
  { qiymat: 'boshqacha', nom: 'Sayt boshqacha' },
];
export const YANGI_OY: readonly SuhbatVarianti[] = [
  { qiymat: 'boshlaymiz', nom: 'Boshlaymiz' },
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

/**
 * Tafovut jarimasi gapi: "har birlik uchun 2 500 soʻm jarima". Fakt yoʻq —
 * gap butunicha boshqacha ("faktda yoʻq har birlik" kabi chala gap emas).
 */
function tafovutMatni(x: number | null): string {
  return x === null ? 'jarimasi faktda yoʻq' : `har birlik uchun ${minglik(x)} soʻm jarima`;
}

/** Qabul roʻyxati qayerdan: varaqa yoki (varaqa boʻsh boʻlsa) tanlangan tovarlar. */
function donaManbasi(n: { varaqadan?: boolean; jamiDona: number | null }): string {
  const dona = n.jamiDona !== null ? `${minglik(n.jamiDona)} dona` : 'dona soni yoʻq';
  return n.varaqadan === false ? `tanlangan tovarlar boʻyicha ${dona}` : `varaqada ${dona}`;
}

function yukKeldiMatni(n: QabulQadamNatijasi): string {
  return n.varaqadan === false
    ? `Yuk keldimi? Buyurtma varaqasi boʻsh — ${donaManbasi(n)} (${n.qatorlar.length} tovar).`
    : `Yuk keldimi? Varaqada ${n.jamiDona !== null ? `${minglik(n.jamiDona)} dona` : 'dona soni yoʻq'} (${n.qatorlar.length} tovar).`;
}
function yukKutishMatni(n: QabulQadamNatijasi): string {
  const y = n.faktlar.yorliq;
  return `Kelguncha tayyorlab turing: yorliq printeri yoki oddiy printer (yorliq ${y.tavsiya ?? 'oʻlchami faktda yoʻq'}, kod: ${y.kod ?? 'faktda yoʻq'}), qadoq materiallari (${n.faktlar.qadoqUmumiy ?? 'qoida faktda yoʻq'}). Yuk kelganda «Keldi» ni bosing.`;
}
function yukMosMatni(n: QabulQadamNatijasi): string {
  return `Sanang va koʻzdan kechiring: ${donaManbasi(n)}. Nuqsonli yoki qadogʻi buzilgan tovarni Uzum qabul qilmaydi (tafovut — ${tafovutMatni(n.faktlar.tafovutSom)}). Hammasi mosmi?`;
}
// Fakt yoʻq boʻlsa gap butunicha boshqacha quriladi: "quti faktda yoʻq gacha",
// "aktini faktda yoʻq chop eting" kabi chala gap chiqmasin (tekshiruv, 2026-10-05).
function qadoqMatni(n: { faktlar: QabulFaktlar }): string {
  const y = n.faktlar.yorliq;
  const quti = n.faktlar.yetkazma.qutiToliqlik;
  return `Har tovarga yorliq: ${y.kod ?? 'faktda yoʻq'}; oʻlcham ${y.tavsiya ?? 'faktda yoʻq'}. ${quti ? `Quti ${quti} toʻlsin.` : 'Quti toʻliqligi faktda yoʻq.'} Tovarlaringiz boʻyicha qadoq tavsiyasi yuqoridagi kartada. Qadoq va yorliqlar tayyormi?`;
}
function yetkazishMatni(n: { faktlar: QabulFaktlar }): string {
  const f = n.faktlar;
  const shart = [
    f.logistika.qutiKgMax !== null ? `quti ${minglik(f.logistika.qutiKgMax)} kg gacha` : 'quti ogʻirligi faktda yoʻq',
    f.logistika.oldinKun !== null ? `taymslotdan ${minglik(f.logistika.oldinKun)} kun oldin` : 'qancha oldin — faktda yoʻq',
    'pullik',
  ].join(', ');
  return `Ombor: ${f.ombor.manzil ?? 'manzil faktda yoʻq'}, ${f.ombor.soat ?? 'soat faktda yoʻq'}. Viloyatdan — Uzum logistikasi: ${f.logistika.url ?? 'manzil faktda yoʻq'} (${shart}). Qanday yetkazasiz?`;
}
function taymslotMatni(n: { faktlar: QabulFaktlar }): string {
  const f = n.faktlar;
  const sku = f.yetkazma.skuMax !== null ? `${minglik(f.yetkazma.skuMax)} SKU gacha` : 'SKU chegarasi faktda yoʻq';
  const akt = f.yetkazma.aktNusxa !== null ? `yuborish aktini ${minglik(f.yetkazma.aktNusxa)} nusxada chop eting` : 'yuborish aktini chop eting (nusxa soni faktda yoʻq)';
  const ozgartirish = f.taymslot.ozgartirishMax !== null
    ? `Taymslotni ${minglik(f.taymslot.ozgartirishMax)} marta gacha oʻzgartirish mumkin` : 'Taymslotni necha marta oʻzgartirish mumkinligi faktda yoʻq';
  const bekor = f.taymslot.bekorSoat !== null ? `bekor qilish — ${minglik(f.taymslot.bekorSoat)} soat oldin` : 'bekor qilish muddati faktda yoʻq';
  return `Kabinetda «Yetkazmalar → Yaratish»: tovarlar (${sku}), tannarx, dona, taymslot; ${akt}. ${ozgartirish}, ${bekor}. Yaratdingizmi?`;
}
function topshirishMatni(n: { faktlar: QabulFaktlar }): string {
  const f = n.faktlar;
  const muddat = f.muddatKunMax !== null ? `Qabul ${minglik(f.muddatKunMax)} kun gacha choʻzilishi mumkin` : 'Qabul muddati faktda yoʻq';
  return `Omborga topshirdingizmi? ${muddat}; tafovut (kam, ortiqcha, aralash, yorliqsiz) — ${tafovutMatni(f.tafovutSom)}.`;
}

function suratSoni(n: StudiyaNatijasi): number {
  return n.qatorlar.reduce((sum, q) => sum + q.suratlar.length, 0);
}

function studiyaTayyorMatni(n: StudiyaNatijasi): string {
  const jami = suratSoni(n);
  // Surat yoʻq — "keraklilarini yuklab oling" va «Yetarli» taklif qilinmaydi.
  if (!jami) return 'Surat topilmadi — kartochka uchun suratni oʻzingiz olishingiz kerak. Nima qilamiz?';
  const holat = n.sozlangan ? `oq fonda, 3:4 (${STUDIYA_CHIQISH.eni}×${STUDIYA_CHIQISH.boyi})` : 'asl holida — studiya xizmati hali ulanmagan';
  return `Jami ${minglik(jami)} ta surat tayyorlandi — ${holat}. Keraklilarini belgilab yuklab oling: faqat siz buyurtma qilgan rang va variant; birinchisi — tovarning old tomoni; xitoycha yozuvli yoki boshqa doʻkon belgisi bor suratni tanlamang. Yetarlimi?`;
}

function kartochkaMatni(n: YuklashNatijasi): string {
  const t = n.talablar;
  const talab = t.minEni !== null && t.minBoyi !== null ? `kamida ${t.minEni}×${t.minBoyi}` : 'ruxsat faktda yoʻq';
  const qoidalar = t.kartochkaQoidalari.length ? `${t.kartochkaQoidalari.length} ta qoida` : 'qoidalar faktda yoʻq';
  return `Uzum kabinetida har tovar uchun kartochka yarating: nom, tavsif, xususiyatlar, VGT (oʻlcham va vazn) va 9-qadam suratlari — birinchisi tovarning old tomoni. Surat talabi: ${talab}, ${t.nisbat ?? 'nisbat faktda yoʻq'}, ${t.maxMb !== null ? `${t.maxMb} MB gacha` : 'hajm faktda yoʻq'}. Kartochka qoidalari (${qoidalar}) yuqoridagi kartada. Yaratdingizmi?`;
}

const som = (x: number | null | undefined): string => (x === null || x === undefined ? 'oʻlchanmagan' : `${minglik(Math.round(x))} soʻm`);

function qaytaMiqdorMatni(t: QaytaTovar, partiya: number): string {
  const oldin = t.oldingi !== null ? `Oldingi safar ${minglik(t.oldingi)} dona olgansiz` : 'Oldingi miqdor yozilmagan';
  const tez = t.tezlik !== null ? `; oʻz kartochkangiz tezligi — kuniga ~${minglik(t.tezlik)} dona (zaxira kamayishidan)` : '';
  return `«${t.title}» — ${partiya}-partiya. ${oldin}${tez}. Bu safar nechta olasiz? 0 — bu safar olmayman; oʻtkazsangiz — oldingidek.`;
}

function qaytaMiqdorVariantlari(t: QaytaTovar): SuhbatVarianti[] {
  const v: SuhbatVarianti[] = [];
  if (t.tezlik !== null) {
    for (const kun of [30, 60]) {
      const dona = Math.ceil(t.tezlik * kun);
      if (!v.some((x) => x.qiymat === dona)) v.push({ qiymat: dona, nom: `${kun} kunlik — ${minglik(dona)} dona` });
    }
  }
  if (t.oldingi !== null && !v.some((x) => x.qiymat === t.oldingi)) v.push({ qiymat: t.oldingi, nom: `Oldingidek — ${minglik(t.oldingi)} dona` });
  v.push({ qiymat: 0, nom: 'Bu safar olmayman' });
  return v;
}

function havolaMatni(t: { title: string }): string {
  return `«${t.title}» Uzumda sotuvga chiqdimi? Oʻz kartochkangiz havolasini yuboring (uzum.uz/…/product/…) — kuzatuvga qoʻshaman: narx, zaxira va sotuvni kuniga 3 marta oʻlchayman. Hali chiqmagan boʻlsa — oʻtkazib yuboring.`;
}

function sotuvTovarNomi(sn: SotuvNatijasi, productId: number): string {
  return sn.qatorlar.find((q) => q.productId === productId)?.title ?? `#${productId}`;
}

/** Qayta buyurtma shu tovarni oladimi: faqat 5-qadamda 1688 taklifi tanlangan (sotuvchi maʼlum) tovar. */
function qaytaOlinadimi(h: YolHolati, productId: number): boolean {
  return qaytaTovarlar(h).some((t) => t.productId === productId);
}

function signalMatni(sg: SotuvSignali, sn: SotuvNatijasi, h: YolHolati): string {
  const nom = sotuvTovarNomi(sn, sg.productId);
  if (sg.tur === 'zaxira') {
    // "13 % ga tushdi" — "13 % ga kamaydi" deb oʻqiladi; aslida 13 % QOLGAN.
    // Zaxira 0 — "0 % ga tushdi, 0 kunga yetadi" emas, "tugadi".
    const qoldi = sg.zaxira === 0
      ? `«${nom}» zaxirasi tugadi (0 dona).`
      : `«${nom}» zaxirasidan ${Math.round(sg.ulush * 100)} % qoldi — ${minglik(sg.zaxira)} dona${sg.kun === null ? '' : sg.kun === 0 ? ', shu tezlikda bir kunga ham yetmaydi' : `, shu tezlikda ${minglik(sg.kun)} kunga yetadi`}.`;
    if (!qaytaOlinadimi(h, sg.productId)) {
      return `${qoldi} 1688 sotuvchisi maʼlum emas (5-qadamda taklif tanlanmagan) — yangi partiyani oʻzingiz buyurtma qilasiz.`;
    }
    const xarid = sn.qatorlar.find((q) => q.productId === sg.productId)?.xaridYuan ?? null;
    return `${qoldi} Yangi partiya buyurtma qilamizmi?${xarid !== null ? ` Oxirgi safar 1688 da ¥${minglik(xarid)} dan olgansiz — sotuvchi maʼlum, yoʻl qisqa.` : ''}`;
  }
  if (sg.tur === 'narx') {
    return `Raqobatchi («${nom}») narxini ${minglik(sg.narx)} soʻmga tushirdi (oldin ${minglik(sg.oldingiNarx)}, −${sg.foiz} %), oʻlchangan ${sanaMatni(sg.sana)}. Sizniki: ${som(sg.ozNarx)}. Tegmaymiz yoki tushiramiz?`;
  }
  return `«${nom}» ga yangi sharh: ${minglik(sg.yangi)} ta (jami ${minglik(sg.jami)})${sg.reyting !== null ? `, oʻrtacha baho ${sg.reyting}` : ''}. Javob yozamizmi?`;
}

function signalVariantlari(sg: SotuvSignali, h: YolHolati): readonly SuhbatVarianti[] {
  if (sg.tur === 'zaxira') return qaytaOlinadimi(h, sg.productId) ? SIGNAL_ZAXIRA : ZAXIRA_OZIM;
  return sg.tur === 'narx' ? SIGNAL_NARX : SIGNAL_SHARH;
}

/** "Bugun" faqat oʻlchov bugungi boʻlsa; aks holda oʻlchov kuni aytiladi (QOIDALAR §4: har raqam yonida davr). */
function oxirgiKun(sn: SotuvNatijasi, olchangan: SotuvTovari[]): string {
  const sanalar = [...new Set(olchangan.map((q) => q.oz?.sana).filter((x): x is string => typeof x === 'string'))];
  if (sanalar.length !== 1) return 'Oxirgi oʻlchovlarda';
  return sanalar[0] === sn.sana ? 'Bugun' : `${sanaMatni(sanalar[0]!)} kuni`;
}

function sotuvHolatMatni(sn: SotuvNatijasi): string {
  // Oʻlchov oʻqilmadi / kuzatuvga qoʻshilmadi — "qoʻshildi, birinchi oʻlchov
  // keyingi aylanishda" deyilmaydi (tekshiruv, 2026-10-05).
  if (sn.olchov_yoq) {
    return `Sotuv oʻlchovini oʻqiy olmadim (${sn.sabab ?? 'baza javob bermadi'}) — bu "sotuv yoʻq" degani emas. «Yangilash» ni keyinroq bosing. Oy yakunida — «Oy hisoboti».`;
  }
  const ozlar = sn.qatorlar.filter((q) => q.oz !== null);
  const olchangan = ozlar.filter((q) => q.oz?.holat === 'olchandi');
  if (ozlar.length === 0) {
    return 'Kartochka havolasi berilmagan — kuzatadigan narsa yoʻq. Kartochka Uzumda chiqqach «Havola qoʻshish» ni bosing. Oy yakunida — «Oy hisoboti».';
  }
  if (olchangan.length === 0) {
    if (sn.kuzatuvXato) {
      return `Kartochkani kuzatuvga qoʻsha olmadim (${sn.kuzatuvXato}). «Yangilash» ni bosib qayta urinib koʻring.`;
    }
    return `Kartochkalar kuzatuvga qoʻshildi (${ozlar.length} ta). Birinchi oʻlchov tizimning keyingi aylanishida (kuniga 3 marta: ${KUZATUV_VAQTLARI}, Toshkent), sotuv raqami — ikki oʻlchovdan keyin. Ertaga «Yangilash» ni bosing.`;
  }
  const j = sn.jami;
  const zaxiralar = olchangan.map((q) => q.oz?.zaxira ?? null).filter((x): x is number => x !== null);
  const zaxira = zaxiralar.length ? `${minglik(zaxiralar.reduce((s, x) => s + x, 0))} dona` : 'oʻlchanmagan';
  const tez = olchangan.filter((q) => q.oz?.zaxiraKun !== null).sort((a, b) => (a.oz?.zaxiraKun ?? 0) - (b.oz?.zaxiraKun ?? 0))[0];
  // Tezlik 0 — oxirgi kunlarda sotuv yoʻq (oy boshidagi sotuv yashirilmaydi); null — oʻlchov yetmaydi.
  const nolTezlik = olchangan.filter((q) => q.oz?.tezlik === 0);
  const kun = tez?.oz?.zaxiraKun;
  const kunGapi = kun !== undefined && kun !== null
    // Zaxira kuni 0 — "0 kunga yetadi" emas.
    ? ` Shu tezlikda ${olchangan.length > 1 ? `eng oldin «${tez!.title}» ` : ''}${kun === 0 ? 'bir kunga ham yetmaydi' : `${minglik(kun)} kunga yetadi`}. Bu bashorat emas, hozirgi tezlik.`
    : nolTezlik.length
      ? ` Oxirgi ${Math.max(...nolTezlik.map((q) => q.oz?.tezlikKun ?? 0))} oʻlchangan kunda sotuv qayd etilmadi${j.oyDona ? ` (shu oy jami ${minglik(j.oyDona)} dona)` : ''} — zaxira necha kunga yetishini hisoblab boʻlmaydi.`
      : ' Sotuv tezligi ikki zaxira oʻlchovidan keyin chiqadi.';
  const bugun = j.bugunDona === null
    ? 'Bugungi sotuv hali hisoblanmadi (ikki zaxira oʻlchovi kerak).'
    : `${oxirgiKun(sn, olchangan)}: ${minglik(j.bugunDona)} dona, oʻlchangan (zaxira kamayishidan).`;
  const kuzatuvXato = sn.kuzatuvXato ? ` Yangi kartochkani kuzatuvga qoʻsha olmadim (${sn.kuzatuvXato}).` : '';
  return `${bugun} Zaxira: ${zaxira}.${kunGapi}${kuzatuvXato} Oy yakunida — «Oy hisoboti».`;
}

function sotuvHolatVariantlari(sn: SotuvNatijasi, h: YolHolati): SuhbatVarianti[] {
  const v: SuhbatVarianti[] = [{ qiymat: 'yangila', nom: 'Yangilash' }];
  const havolasiz = sotuvTovarlari(h).some((t) => h.javoblar[`uzum_havola:${t.productId}`] === null);
  if (havolasiz || sn.qatorlar.some((q) => q.ozId === null)) v.push({ qiymat: 'havola', nom: 'Havola qoʻshish' });
  // Zaxira signaliga «Hozircha yoʻq» deyilgan boʻlsa u signal (shu partiyada)
  // qayta soʻralmaydi — qayta buyurtma yoʻli shu yerda qoladi, aks holda
  // yoʻl berk edi (tekshiruv, 2026-10-05).
  const rad = Object.entries(h.javoblar).some(([id, q]) => id.startsWith('signal:zaxira:') && q === 'yoq');
  if (rad && qaytaTovarlar(h).length > 0) v.push({ qiymat: 'yana', nom: 'Yana buyurtma' });
  v.push({ qiymat: 'hisobot', nom: 'Oy hisoboti' });
  return v;
}

function oySotuvMatni(hn: HisobotNatijasi): string {
  const k = hn.faktlar.komissionerKun;
  const davr = hn.tugagan === false ? `${oyNomi(hn.oy)}, hozirgacha — oy hali tugamagan` : oyNomi(hn.oy);
  const q = qamrovMatni(hisobotQamrovi(hn));
  // Tushum nomaʼlum (narxsiz kun bor) — "taxminan oʻlchanmagan" emas.
  const tushum = hn.olchovSotuv !== null ? `taxminan ${som(hn.olchovSotuv)}` : 'tushum hisoblanmadi — ayrim kunlarda narx oʻlchanmagan';
  const olchov = hn.olchovDona === null
    ? 'Bu oy uchun oʻlchovimiz yoʻq.'
    : `Oʻlchovimiz boʻyicha: ${minglik(hn.olchovDona)} dona, ${tushum} (zaxira kamayishidan${q ? `; ${q} — qisman` : ''}).`;
  // "Taxmin bilan hisoblayman" — faqat taxmin uchun oʻlchangan tushum boʻlsa:
  // u boʻlmasa hisob sotuvsiz qoladi (vaʼda kod bajarmaydigan boʻlmasin).
  const otkazish = hn.olchovSotuv !== null
    ? 'Bilmasangiz — oʻtkazib yuboring, taxmin bilan hisoblayman.'
    : 'Bilmasangiz — oʻtkazib yuboring: oʻlchangan tushum yoʻq, aylanma soligʻi hisoblanmaydi.';
  return `Oy hisoboti (${davr}). ${olchov} Aniq summa — Uzum kabinetidagi komissioner hisobotida${k !== null ? ` (keyingi oyning ${k}-sanasigacha tayyor boʻladi)` : ''}. Hisobotdagi SOTUV summasini yozing — soliq xaridor toʻlagan toʻliq narxdan olinadi. ${otkazish}`;
}

/** Soliq summasi — hisoblanmagan boʻlsa "hisoblanmadi" (soliq oʻlchanmaydi, hisoblanadi). */
function soliqSom(x: number | null): string {
  return x === null ? 'hisoblanmadi' : som(x);
}

/**
 * Soliq hisobi YATT uchun. 7-qadamda boshqa shakl aytilgan boʻlsa — ochiq
 * aytiladi; `nomalumHam` — shakl soʻralmagan (Uzum kabineti bor) holat ham.
 */
function shaklIzohi(shakl: unknown, nomalumHam: boolean): string {
  if (shakl === 'mchj' || shakl === 'oz_band') {
    return ` Bu hisob YATT uchun — siz «${shakl === 'mchj' ? 'MChJ' : 'oʻzini oʻzi band'}» dedingiz, soliq boshqacha boʻlishi mumkin: buxgalter bilan tekshiring.`;
  }
  return nomalumHam && shakl !== 'yatt' && shakl !== 'yoq' ? ' Boshqa huquqiy shakl (MChJ, oʻzini oʻzi band) boʻlsa soliq boshqacha.' : '';
}

function deklaratsiyaMatni(n: HisobotHisobNatijasi, shakl: unknown): string {
  const f = n.faktlar.soliq;
  const q = qamrovMatni(n.qamrov);
  const manba = n.sotuvManbasi === 'olchov' ? ` (taxmin${q ? `, ${q}` : ''})` : '';
  const bosh = n.tugagan === false ? `${oyNomi(n.oy)} hali tugamagan — hozirgacha hisob.` : `Oy tugadi (${oyNomi(n.oy)}).`;
  // Sof manfiy — zarar: 0 qilib yashirilmaydi.
  const sof = n.sofSom === null ? 'hisoblanmadi' : n.sofSom < 0 ? `−${som(-n.sofSom)} (zarar)` : som(n.sofSom);
  // Fakt yoʻq boʻlsa gap butunicha boshqacha ("foiz faktda yoʻq aylanmadan — oʻlchanmagan" emas).
  const aylanma = f.aylanmaFoiz !== null ? `${f.aylanmaFoiz} % aylanmadan — ${soliqSom(n.soliq.aylanmaSom)}` : 'aylanma soligʻi foizi faktda yoʻq';
  const ijtimoiy = n.soliq.ijtimoiySom !== null ? `ijtimoiy soliq ${som(n.soliq.ijtimoiySom)}` : 'ijtimoiy soliq miqdori faktda yoʻq';
  // Bu muddat — ijtimoiy soliq toʻlovi muddati; shunday aytiladi (deklaratsiya muddati emas).
  const muddat = n.ijtimoiyMuddat ? `Ijtimoiy soliq muddati — ${sanaMatni(n.ijtimoiyMuddat)} gacha.` : 'Ijtimoiy soliq muddati faktda yoʻq.';
  return `${bosh} Sotuv ${som(n.sotuvSom)}${manba}, komissiya ${n.komissiyaSom !== null ? som(n.komissiyaSom) : 'yozilmagan'}, sof ${sof}. Soliq: YATT uchun ${aylanma}; ${ijtimoiy}.${shaklIzohi(shakl, true)} ${muddat} Deklaratsiyani tayyorlaymizmi?`;
}

/** Ochiq ishlar yakuni — 8/9/10-qadamlar uchun bir xil jumla. */
function ochiqIshlarMatni(n: QabulYakunNatijasi, bosqich: string): string {
  const y = n.yozildi ?? [];
  const royxat = y.map((x) => `${x.sabab}${x.muddat ? ` (${sanaMatni(x.muddat)} gacha)` : ''}`).join('; ');
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
  return `${nom} — ${y.kun !== null ? `${y.kun} kun, ` : ''}$${y.usdKg}/kg${y.somPerKg !== null ? ` (≈ ${minglik(y.somPerKg)} soʻm/kg)` : ''}`;
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
  return `¥${minglik(t.narxYuan)}`
    + (t.narxSom !== null ? ` ≈ ${minglik(t.narxSom)} soʻm` : '')
    + ` · MOQ ${t.moq !== null && t.moq !== undefined ? minglik(t.moq) : '—'}`
    + (t.superZavod === true ? ' · super zavod' : t.zavod === true ? ' · zavod' : '')
    + (t.chegaradaMi === true ? ' · chegarada' : t.chegaradaMi === false ? ' · chegaradan yuqori' : '');
}

/**
 * Chegara kamchiligi izohi — raqam yonida yuradi (QOIDALAR §4). "…siz"
 * qoʻshimchasi roʻyxatga yopishtirilmaydi ("Uzum logistikasi, kargosiz").
 */
function chegaraIzohi(q: XitoyQatori): string {
  return q.yetishmaydi.length ? ` (chegaraga kirmagan: ${q.yetishmaydi.join(', ')} — haqiqiysi pastroq)` : '';
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

/** Har kod harakati qaysi qadamda. */
const HARAKAT_QADAMI: Readonly<Record<KodHarakati, number>> = {
  yonalishlar: 2, tovarlar: 3, tannarx: 4, xitoy: 5, buyurtma: 6, ochiq_ish: 6, rasmiy: 7, rasmiy_yakun: 7,
  qabul: 8, qabul_yakun: 8, studiya: 9, studiya_yakun: 9, yuklash: 10, yuklash_yakun: 10,
  sotuv: 11, hisobot: 12, hisobot_hisob: 12, hisobot_yakun: 12,
  usta_fikri: 4,
};

/**
 * Kod harakati KUTILMAGAN tarzda yiqilganda (`suhbat.ts` dagi `bajar()`)
 * yoziladigan natija. U oddiy "oʻlchov yoʻq" natijasi EMAS: unda harakat
 * natijasining maydonlari yoʻq. Ilgari `{ olchov_yoq, sabab }` yozilardi va
 * matn quruvchilar (`kargo`, `faktlar`, `qatorlar`…) TypeError otardi —
 * masalan 6-qadamda shahar javobidan keyin chat har turn 500 qaytarib,
 * abadiy toʻxtab qolardi (tekshiruv, 2026-10-05). Endi `keyingi()` bunday
 * natijani koʻrsa «Qayta urinish» savolini beradi.
 */
export function yiqilganNatija(): { olchov_yoq: true; yiqildi: true; sabab: string } {
  return { olchov_yoq: true, yiqildi: true, sabab: 'hisobda kutilmagan xato' };
}

/** `yiqilganNatija()` shakli; eski sessiyalarda — "hisob yiqildi: …" sababi bilan yozilgani. */
function yiqildimi(n: unknown): boolean {
  if (n === null || typeof n !== 'object') return false;
  const o = n as { yiqildi?: unknown; sabab?: unknown };
  return o.yiqildi === true || (typeof o.sabab === 'string' && o.sabab.startsWith('hisob yiqildi'));
}

/** Yiqilgan natijasi holatda turgan kod harakati (boʻlsa). */
function yiqilganHarakat(h: YolHolati): KodHarakati | null {
  for (const harakat of Object.keys(HARAKAT_QADAMI) as KodHarakati[]) {
    if (yiqildimi(h.natijalar[harakat])) return harakat;
  }
  return null;
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
  // Kod harakati kutilmaganda yiqilgan — oʻsha qadamda «Qayta urinish»: matn
  // quruvchilar yiqilmaydi, yoʻl berk qolmaydi (xom xato logda, chatda emas).
  const yiqilgan = yiqilganHarakat(h);
  if (yiqilgan !== null) {
    return { tur: 'savol', savol: savol(`xato_qayta:${yiqilgan}`, HARAKAT_QADAMI[yiqilgan],
      'Hisoblashda kutilmagan xato boʻldi — bu natija emas, nosozlik. Qayta urinib koʻramizmi?',
      'tanlov', { variantlar: [QAYTA_URINISH] }) };
  }

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
    // Vaʼda yoʻq: doʻkon nomi boʻyicha sotuv raqamlari kodda koʻrsatilmaydi
    // (oʻz sotuvi 11-qadamda kartochka havolasidan oʻlchanadi).
    return { tur: 'savol', savol: savol('dokon_nomi', 1,
      'Doʻkoningiz nomi qanday?',
      'matn', { erkin: true, otkazishMumkin: true }) };
  }

  // ---------------------------------------------------------- 2. Yo'nalish
  const yn = yonalishlarNatija(h);
  if (yn === null) return { tur: 'kod', harakat: 'yonalishlar', qadam: 2 };
  const yonalishlar = yn.royxat ?? [];
  if (!berilgan(h, 'yonalish')) {
    // "Byudjetingiz bilan boshlash mumkin" deyilmaydi: roʻyxatda byudjet
    // yetmaydigan (yoki byudjet aytilmagan) yoʻnalish ham bor — bu kod
    // xulosasida aytiladi. Roʻyxat boʻsh — «Qayta urinish»: ilgari "keyinroq
    // qayta urinib koʻramiz" deyilardi, lekin hech narsa qayta urinmasdi.
    return { tur: 'savol', savol: savol('yonalish', 2,
      yonalishlar.length
        ? 'Ball boʻyicha baholangan yoʻnalishlar shular — yuqorisi birinchi turibdi. Qaysi birini olamiz?'
        : `Yoʻnalishlarni hozir koʻrsata olmayman: ${yn.sabab ?? 'oʻlchov yoʻq'}. «Qayta urinish» ni bosing.`,
      'tanlov', {
        variantlar: yonalishlar.length ? yonalishlar.map((y) => ({ qiymat: y.categoryId, nom: y.name })) : [QAYTA_URINISH],
        otkazishMumkin: yonalishlar.length === 0,
      }) };
  }

  // ---------------------------------------------------------- 3. Tovar va miqdor
  const tn = tovarlarNatija(h);
  if (tn === null) return { tur: 'kod', harakat: 'tovarlar', qadam: 3 };
  const tovarlar = tn.royxat ?? [];
  if (!berilgan(h, 'tovarlar')) {
    // Roʻyxat boʻsh — berk yoʻl emas: qayta urinish yoki boshqa yoʻnalish
    // (ilgari faqat «Oʻtkazib yuborish» bor edi va yoʻl boʻsh davom etardi).
    if (tovarlar.length === 0) {
      return { tur: 'savol', savol: savol('tovarlar', 3,
        `Bu yoʻnalishda tovar roʻyxatini bera olmayman: ${tn.sabab ?? 'oʻlchov yoʻq'}. Qayta urinamizmi yoki boshqa yoʻnalish tanlaysizmi?`,
        'tanlov', { variantlar: [QAYTA_URINISH, BOSHQA_YONALISH], otkazishMumkin: true }) };
    }
    return { tur: 'savol', savol: savol('tovarlar', 3,
      'Birinchi partiyada aynan nima sotasiz? Bular shu yoʻnalishdagi tovarlar — bir nechtasini belgilang.',
      'kopTanlov', {
        variantlar: tovarlar.map((t) => ({ qiymat: t.nomzod.productId, nom: t.nomzod.title })),
      }) };
  }
  for (const id of tanlanganTovarlar(h)) {
    const sid = `miqdor:${id}`;
    if (berilgan(h, sid)) continue;
    const t = tovarlar.find((x) => x.nomzod.productId === id);
    const nom = t?.nomzod.title ?? `#${id}`;
    const m = t?.miqdor ?? null;
    const variantlar: SuhbatVarianti[] = m
      ? [{ qiymat: m.dona, nom: `30 kunlik zaxira — ${minglik(m.dona)} dona` },
         { qiymat: m.dona * 2, nom: `60 kunlik — ${minglik(m.dona * 2)} dona` }]
      : [];
    // Nom «…» ichida (boshqa savollardagidek; eslatmada ham nom qoladi), sabab —
    // alohida gap: "(Sotuv hali oʻlchanmagan.)." kabi qavs ichida nuqta yoʻq.
    return { tur: 'savol', savol: savol(sid, 3,
      m
        ? `«${nom}»: ${m.hisob}. Birinchi partiya uchun nechta olasiz?`
        : `«${nom}»: miqdorni hisoblab bera olmadim. ${t?.miqdorSababi ?? 'Sotuv oʻlchanmagan.'} Oʻzingiz nechta olmoqchisiz?`,
      'son', { variantlar, erkin: true, otkazishMumkin: true }) };
  }

  // ---------------------------------------------------------- 4. Tannarx
  if (!berilgan(h, 'marja')) {
    return { tur: 'savol', savol: savol('marja', 4,
      tanlanganTovarlar(h).length
        ? 'Roʻyxat tayyor. Endi har tovarga Xitoyda maksimum qancha toʻlash mumkinligini hisoblaymiz. Qancha marja bilan sotmoqchisiz?'
        : 'Tovar tanlanmadi, shuning uchun chegara narx hisoblanmaydi. Qancha marja bilan sotmoqchisiz?',
      'son', { variantlar: MARJA_TUGMALARI, erkin: true }) };
  }
  if (h.natijalar.tannarx === undefined) return { tur: 'kod', harakat: 'tannarx', qadam: 4 };
  if (!berilgan(h, 'xitoy_tasdiq')) {
    // "Chegara narxlar tayyor" — faqat haqiqatan hisoblangan boʻlsa (komissiya
    // kelmagan tovarda chegara yoʻq — jonli holat, 2026-09-25).
    const tq = (h.natijalar.tannarx as { qatorlar?: Array<{ chegaraSom?: number | null }> } | null)?.qatorlar;
    const jami = Array.isArray(tq) ? tq.length : 0;
    const bor = Array.isArray(tq) ? tq.filter((q) => typeof q.chegaraSom === 'number').length : 0;
    return { tur: 'savol', savol: savol('xitoy_tasdiq', 4,
      bor > 0 && bor === jami
        ? 'Chegara narxlar tayyor. Shu chegaralar bilan Xitoydan qidiramizmi?'
        : bor > 0
          ? `Chegara narx ${bor} ta tovarda tayyor, ${jami - bor} tasida hisoblanmadi. Xitoydan qidiramizmi?`
          : 'Chegara narxni hisoblab boʻlmadi — 1688 takliflari chegarasiz, faqat narxi bilan koʻrsatiladi. Xitoydan qidiramizmi?',
      'tanlov', { variantlar: [
        { qiymat: 'ha', nom: 'Ha, Xitoydan topamiz' },
        { qiymat: 'miqdor', nom: 'Miqdorni oʻzgartiraman' },
        { qiymat: 'marja', nom: 'Marjani oʻzgartiraman' },
      ] }) };
  }

  // ---------------------------------------------------------- B2: Usta haqidagi fikr
  //
  // «Ha, Xitoydan topamiz» dan keyin, 1688 qidiruvidan OLDIN — faqat
  // qidiruv natijasi hali yoʻq boʻlsa. Qidiruvdan oʻtib ketgan eski
  // sessiyalarga soʻralmaydi (yoʻl orqaga qaytmasin); «Qayta qidirish»
  // natijani oʻchirganda ham qayta soʻralmaydi — javob holatda turadi.
  if (h.natijalar.xitoy === undefined) {
    if (!berilgan(h, 'usta_fikri')) {
      return { tur: 'savol', savol: savol('usta_fikri', 4,
        'Xitoydan qidirishdan oldin bitta savol: shu paytgacha — yoʻnalish, tovar, miqdor va chegara narx — Usta mantiqli tuyuldimi? Javobingiz Ustani yaxshilashga yordam beradi; xohlamasangiz — oʻtkazib yuboring.',
        'tanlov', { variantlar: USTA_FIKRI, otkazishMumkin: true }) };
    }
    if (h.javoblar['usta_fikri'] !== null) {
      if (!berilgan(h, 'usta_fikri_izoh')) {
        return { tur: 'savol', savol: savol('usta_fikri_izoh', 4,
          h.javoblar['usta_fikri'] === 'yoq'
            ? 'Rahmat. Nima notoʻgʻri yoki tushunarsiz boʻldi? Bir-ikki soʻz bilan yozing — tuzatamiz. Xohlamasangiz — oʻtkazib yuboring.'
            : 'Rahmat! Nima yoqdi yoki nima yetishmadi? Bir-ikki soʻz bilan yozib qoldiring — yoki oʻtkazib yuboring.',
          'matn', { erkin: true, otkazishMumkin: true }) };
      }
      if (h.natijalar.usta_fikri === undefined) return { tur: 'kod', harakat: 'usta_fikri', qadam: 4 };
    }
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
    // Chegara va kurs bor boʻlsa takliflar "chegarada" boʻyicha oldinga
    // tartiblangan (`suhbat-kod.ts`) — ular "eng oʻxshash" emas, shunday aytiladi.
    const tartiblangan = q.chegaraSom !== null && xn.kurs !== null;
    return { tur: 'savol', savol: savol(sid, 5,
      `«${q.title}»: 1688 dan ${minglik(q.jami ?? q.takliflar.length)} ta topildi, `
        + (tartiblangan
          ? `${q.takliflar.length} tasi koʻrsatildi, ${sigadi} tasi chegara narxga sigʻadi${sigadi ? ' va roʻyxat boshida turibdi' : ''}${chegaraIzohi(q)}`
          : `eng oʻxshash ${q.takliflar.length} tasi koʻrsatildi`)
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
    // Doimiy sabab (kalit yoʻq, tarif yopiq, rasm berilmagan) — qayta qidirish
    // xuddi shu natijani beradi: taklif qilinmaydi, rostini aytamiz.
    const doimiy = qidirilmagan.every((q) => /^(provayder kaliti yoʻq|tarif:|rasm yoʻq)/u.test(q.sabab ?? ''));
    const davom = { qiymat: 'davom', nom: 'Shusiz davom etamiz' };
    return { tur: 'savol', savol: savol('xitoy_qayta', 5,
      doimiy
        ? `${qidirilmagan.length} ta tovar qidirilmadi (${sabablar}). Bu sabab bilan qayta urinish natija bermaydi — shusiz davom etamiz.`
        : `${qidirilmagan.length} ta tovar qidirilmadi (${sabablar}). Qayta urinib koʻramizmi?`,
      'tanlov', { variantlar: doimiy ? [davom] : [{ qiymat: 'qayta', nom: 'Qayta qidirish' }, davom] }) };
  }

  // ---------------------------------------------------------- 6. Buyurtma va kargo
  //
  // Ssenariy: "Sotib olganingiz: jadval… Yuk holati… Kargo hamkori aytgan
  // muddat…" → shahar → (tanlov boʻlsa) avia/quruqlik → "Yuk kelganda
  // oʻzim aytaman… Boshlaymizmi?" → ochiq ish. Nazoratchi (2026-09-28):
  // kargo hamkori YOʻQ — stavkalar `fakt` dan; boʻlmasa rostini aytamiz.
  // Buyurtmani tizim BERMAYDI: varaqa yasaladi, obunachi uni agentga
  // yuboradi, raqamini qaytarib kiritadi.
  // Qayta buyurtma (11-qadam «Ha, yana buyurtma»): miqdor har tovar uchun
  // qayta soʻraladi — endi oʻz kartochka tezligi oʻlchangan. 0 — bu safar
  // olmayman; oʻtkazilsa — oldingidek.
  const partiya = partiyaRaqami(h);
  if (partiya > 1 && buyurtmaNatija(h) === null) {
    for (const t of qaytaTovarlar(h)) {
      const sid = `partiya_miqdor:${t.productId}`;
      if (berilgan(h, sid)) continue;
      return { tur: 'savol', savol: savol(sid, 6, qaytaMiqdorMatni(t, partiya), 'son', { variantlar: qaytaMiqdorVariantlari(t), erkin: true, otkazishMumkin: true }) };
    }
  }
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
    // "Keyin soʻrayman" deyilmaydi — bu savol qayta soʻralmaydi.
    return { tur: 'savol', savol: savol('buyurtma_raqami', 6,
      'Buyurtma varaqasini agentga yoki kargo hamkoriga yuborib, buyurtma yoki kuzatuv raqamini olgan boʻlsangiz — shu yerga yozing. Hali boʻlmasa oʻtkazib yuboring.',
      'matn', { erkin: true, otkazishMumkin: true }) };
  }
  if (!berilgan(h, 'dokon_tayyorlash')) {
    // Kod bajarmaydigan vaʼda yoʻq: eslatma mexanizmi yoʻq (yuk kelganini
    // obunachi aytadi), yuk kelgan kuni sotish ham boʻlmaydi — undan keyin
    // suratlar, kartochka va ombor qabuli bor (tekshiruv, 2026-10-05).
    return { tur: 'savol', savol: savol('dokon_tayyorlash', 6,
      'Kelguncha doʻkonni tayyorlaymiz. Yuk kelganini oʻzingiz aytasiz («Keldi» tugmasi) — eslatma hali yoʻq. Yuk kelgach suratlar, kartochka va omborga topshirish qoladi. Boshlaymizmi?',
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
    // Surat yoʻq — «Yetarli, yuklab oldim» taklif qilinmaydi.
    const variantlar = suratSoni(stn) ? STUDIYA_TAYYOR : STUDIYA_TAYYOR.filter((v) => v.qiymat !== 'tayyor');
    return { tur: 'savol', savol: savol('studiya_tayyor', 9, studiyaTayyorMatni(stn), 'tanlov', { variantlar, otkazishMumkin: true }) };
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

  // ---------------------------------------------------------- 11. Sotuv boshlandi
  //
  // Ssenariy: "Bugun: {sotilgan} dona, oʻlchangan. Zaxira: {zaxira}. Shu
  // tezlikda {kun} kunga yetadi. Bu bashorat emas, hozirgi tezlik." +
  // signallar. Oʻlchov — sotuvchining oʻz kartochkasi (havola → kuzatuv).
  // Yoʻl bu yerda aylanadi: «Yangilash» — yangi oʻlchov, «Oy hisoboti» — 12.
  for (const t of sotuvTovarlari(h)) {
    const sid = `uzum_havola:${t.productId}`;
    if (!berilgan(h, sid)) {
      return { tur: 'savol', savol: savol(sid, 11, havolaMatni(t), 'matn', { erkin: true, otkazishMumkin: true }) };
    }
  }
  const sn = sotuvNatija(h);
  if (sn === null) return { tur: 'kod', harakat: 'sotuv', qadam: 11 };
  for (const sg of sn.signallar) {
    const sid = `signal:${sg.id}`;
    if (!berilgan(h, sid)) {
      return { tur: 'savol', savol: savol(sid, 11, signalMatni(sg, sn, h), 'tanlov', { variantlar: signalVariantlari(sg, h) }) };
    }
  }
  if (!berilgan(h, 'sotuv_holat')) {
    return { tur: 'savol', savol: savol('sotuv_holat', 11, sotuvHolatMatni(sn), 'tanlov', { variantlar: sotuvHolatVariantlari(sn, h) }) };
  }

  // ---------------------------------------------------------- 12. Hisobot
  //
  // Ssenariy: "Oy tugadi. Sotuv, komissiya, sof. Soliq … Muddat … gacha.
  // Deklaratsiyani tayyorlaymizmi?" → qadam kartalari → "Keyingi oy rejasi"
  // → 11 ga qaytish. Aniq summa — kabinetdagi komissioner hisobotidan
  // (sotuvchi yozadi); tizim oʻlchovdan taxmin beradi. Bu soliq maslahati emas.
  const hn = h.natijalar.hisobot as HisobotNatijasi | undefined;
  if (hn === undefined) {
    // Qaysi oy: sotuvchi oy oxirida ham, keyingi oy boshida ham bosadi —
    // tugagan oyni ham, joriy oyni ham taklif qilamiz, oʻzi tanlaydi.
    if (!berilgan(h, 'hisobot_oy')) {
      const oldin = oldingiOy(sn.oy);
      return { tur: 'savol', savol: savol('hisobot_oy', 12,
        `Qaysi oy uchun hisobot? ${oyNomi(oldin)} — tugagan oy; ${oyNomi(sn.oy)} — hozirgacha, oy hali tugamagan.`,
        'tanlov', { variantlar: [
          { qiymat: oldin, nom: `${oyNomi(oldin)} — tugagan` },
          { qiymat: sn.oy, nom: `${oyNomi(sn.oy)} — hozirgacha` },
        ] }) };
    }
    return { tur: 'kod', harakat: 'hisobot', qadam: 12 };
  }
  if (!berilgan(h, 'oy_sotuv')) {
    return { tur: 'savol', savol: savol('oy_sotuv', 12, oySotuvMatni(hn), 'son', { erkin: true, otkazishMumkin: true }) };
  }
  if (!berilgan(h, 'oy_komissiya')) {
    return { tur: 'savol', savol: savol('oy_komissiya', 12,
      'Shu hisobotdagi Uzum komissiyasi va logistika yigʻimi jami qancha? Sof tushumni shundan hisoblayman. Bilmasangiz — oʻtkazib yuboring.',
      'son', { erkin: true, otkazishMumkin: true }) };
  }
  const hh = h.natijalar.hisobot_hisob as HisobotHisobNatijasi | undefined;
  if (hh === undefined) return { tur: 'kod', harakat: 'hisobot_hisob', qadam: 12 };
  if (!berilgan(h, 'deklaratsiya')) {
    return { tur: 'savol', savol: savol('deklaratsiya', 12, deklaratsiyaMatni(hh, h.javoblar['huquqiy_shakl']), 'tanlov', { variantlar: DEKLARATSIYA, otkazishMumkin: true }) };
  }
  if (h.javoblar['deklaratsiya'] === 'tayyorlaymiz' && !berilgan(h, 'deklaratsiya_qadam')) {
    return { tur: 'savol', savol: savol('deklaratsiya_qadam', 12,
      `${hh.faktlar.portalUrl ? `${hh.faktlar.portalUrl} ga` : 'Soliq portaliga'} E-imzo bilan kiring. Qadamlar kartada — har birini bajaring va «Bajardim» ni bosing. Sayt boshqacha boʻlsa — «Sayt boshqacha», nazoratchi tekshiradi.`,
      'tanlov', { variantlar: DEKLARATSIYA_QADAM, otkazishMumkin: true }) };
  }
  if (h.natijalar.hisobot_yakun === undefined) return { tur: 'kod', harakat: 'hisobot_yakun', qadam: 12 };
  return { tur: 'savol', savol: savol('yangi_oy', 12,
    'Keyingi oy rejasi tayyor (yuqorida). Yangi oyni boshlaymizmi? Sotuv kuzatuvi davom etadi, oy oxirida yana hisobot qilamiz.',
    'tanlov', { variantlar: YANGI_OY }) };
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
      // Matn ("10 mln", "5 000 000 soʻm") ham qabul qilinadi — sayt ham, API ham.
      // Misol savolga mos: marja va miqdorda "10 mln" misoli chalgʻitardi.
      const pul = !(s.id === 'marja' || s.id.startsWith('miqdor:') || s.id.startsWith('partiya_miqdor:'));
      const misol = s.id === 'marja' ? '30' : pul ? '10 000 000 yoki 10 mln' : '50';
      const xatoSon = `Bitta son yozing — masalan: ${misol}.`;
      if (typeof xom === 'boolean') return { holat: h, xato: xatoSon, profil: null };
      // Valyuta ("5000$", "5 ming dollar") soʻm deb olinmaydi — soʻmda soʻraladi.
      if (pul && typeof xom === 'string' && valyutami(xom)) {
        return { holat: h, xato: `Summani soʻmda yozing — masalan: ${misol}.`, profil: null };
      }
      const n = typeof xom === 'string' ? matndanSon(xom) : Number(xom);
      if (n === null || !Number.isFinite(n) || n < 0) return { holat: h, xato: xatoSon, profil: null };
      // Marja 100 % va undan katta — chegara umuman hisoblanmaydi (ilgari
      // "marja yetishmaydi" deb chiqardi); qabul paytida rad etiladi.
      if (s.id === 'marja' && n >= 100) return { holat: h, xato: 'Marja 0 dan 99 % gacha boʻlsin — masalan: 30.', profil: null };
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
      // Uzum kartochka havolasi — qabul PAYTIDA tekshiriladi; raqobatchi
      // (3-qadam) tovari yuborilsa rad etiladi: uning sotuvi sizniki emas.
      if (s.id.startsWith('uzum_havola:')) {
        const id = uzumMahsulotId(t);
        if (id === null) {
          return { holat: h, xato: 'Uzum kartochka havolasini yuboring: uzum.uz/…/product/… (brauzer manzil satridan nusxalang). Hali chiqmagan boʻlsa — oʻtkazib yuboring.', profil: null };
        }
        if (String(id) === s.id.slice('uzum_havola:'.length)) {
          return { holat: h, xato: 'Bu 3-qadamda tanlangan raqobatchi tovari. Oʻzingizning kartochkangiz havolasini yuboring — u sizning doʻkoningiz nomi bilan chiqadi.', profil: null };
        }
        qiymat = t.slice(0, 500);
        break;
      }
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

  // Kutilmagan xatodan keyin «Qayta urinish» — yiqilgan natija oʻchadi, kod yana bajariladi.
  if (s.id.startsWith('xato_qayta:') && qiymat === 'qayta') {
    const yangi = { ...holat.javoblar };
    delete yangi[s.id];
    const natijalar = { ...holat.natijalar };
    delete natijalar[s.id.slice('xato_qayta:'.length) as KodHarakati];
    return { holat: { javoblar: yangi, natijalar }, xato: null, profil: null };
  }

  // Boʻsh roʻyxat (2/3-qadam): «Qayta urinish» — natija oʻchadi, kod yana
  // hisoblaydi; «Boshqa yoʻnalish» — yoʻnalish tanlovi qayta ochiladi.
  if ((s.id === 'yonalish' || s.id === 'tovarlar') && (qiymat === 'qayta' || qiymat === 'boshqa')) {
    const yangi = { ...holat.javoblar };
    delete yangi[s.id];
    const natijalar = { ...holat.natijalar };
    if (s.id === 'yonalish') delete natijalar.yonalishlar;
    else {
      delete natijalar.tovarlar;
      if (qiymat === 'boshqa') delete yangi['yonalish'];
    }
    return { holat: { javoblar: yangi, natijalar }, xato: null, profil: null };
  }

  // "Miqdorni o'zgartiraman" — 3-qadamdagi miqdor javoblari ochiladi.
  // 5-qadam javoblari va natijasi ham tozalanadi: ular eski miqdor va
  // eski chegaraga bogʻliq edi. «Marjani oʻzgartiraman» — marja savoli
  // qayta ochiladi (ilgari marjani oʻzgartirib boʻlmasdi).
  if (s.id === 'xitoy_tasdiq' && (qiymat === 'miqdor' || qiymat === 'marja')) {
    const yangi = { ...holat.javoblar };
    if (qiymat === 'marja') delete yangi['marja'];
    else {
      for (const id of Object.keys(yangi)) {
        if (id.startsWith('miqdor:') || id.startsWith('rasm:') || id.startsWith('xitoy_tanlov:')) delete yangi[id];
      }
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
  // 11-qadam «Yangilash» — sotuv natijasi tozalanadi, `sotuv` kodi yana
  // oʻlchaydi. «Havola qoʻshish» — oʻtkazib yuborilgan havolalar qayta soʻraladi.
  // «Oy hisoboti» — javob QOLADI, sotuv baribir qayta oʻlchanadi: hisobot oyi
  // va "tugaganmi" eski natijaning sanasidan olinmasin (oy oxirida koʻrilgan
  // holat bilan keyingi oy bosilsa — tugagan oy "hozirgacha" deb chiqardi).
  if (s.id === 'sotuv_holat' && (qiymat === 'yangila' || qiymat === 'havola' || qiymat === 'hisobot')) {
    const yangi = { ...holat.javoblar };
    if (qiymat !== 'hisobot') delete yangi['sotuv_holat'];
    if (qiymat === 'havola') {
      for (const [id, v] of Object.entries(yangi)) if (id.startsWith('uzum_havola:') && v === null) delete yangi[id];
    }
    const natijalar = { ...holat.natijalar };
    delete natijalar.sotuv;
    return { holat: { javoblar: yangi, natijalar }, xato: null, profil: null };
  }

  // "Ha, yana buyurtma" (11-qadam signali yoki holat menyusidagi «Yana
  // buyurtma») — ikkinchi aylanish: 5-qadam tanlovi (sotuvchi),
  // rasmiylashtirish, suratlar va kartochka SAQLANADI; varaqa, qabul,
  // yetkazma va oy hisoboti qaytadan. Oldingi varaqa arxivga.
  if ((s.id.startsWith('signal:zaxira:') || s.id === 'sotuv_holat') && qiymat === 'yana') {
    const yangi = { ...holat.javoblar };
    for (const id of ['buyurtma_raqami', 'dokon_tayyorlash', 'kargo_yol', 'yuk_keldi', 'yuk_kutish', 'yuk_mos', 'yuk_izoh',
      'qadoq_tayyor', 'yetkazish', 'taymslot', 'topshirildi', 'sotuv_holat', 'hisobot_oy', 'oy_sotuv', 'oy_komissiya', 'deklaratsiya',
      'deklaratsiya_qadam', 'yangi_oy']) delete yangi[id];
    for (const id of Object.keys(yangi)) if (id.startsWith('partiya_miqdor:')) delete yangi[id];
    const natijalar = { ...holat.natijalar };
    const partiya = partiyaRaqami(holat);
    // Arxivga oʻsha kungi oʻlchov ham yoziladi: tezlik — keyingi miqdor
    // taklifi uchun, zaxira — yangi partiya omborga tushganini bilish uchun.
    const sn = natijalar.sotuv as SotuvNatijasi | undefined;
    const zaxira: Record<string, number | null> = {};
    const tezlik: Record<string, number | null> = {};
    for (const q of sn?.qatorlar ?? []) {
      zaxira[String(q.productId)] = q.oz?.zaxira ?? null;
      tezlik[String(q.productId)] = q.oz?.tezlik ?? null;
    }
    const yozuv: PartiyaArxivi = { partiya, sana: sn?.sana ?? null, buyurtma: natijalar.buyurtma ?? null, zaxira, tezlik };
    natijalar.oldingi_partiyalar = [...partiyaArxivi(holat), yozuv];
    natijalar.partiya = partiya + 1;
    for (const k of ['buyurtma', 'ochiq_ish', 'qabul', 'qabul_yakun', 'yuklash_yakun', 'sotuv', 'hisobot', 'hisobot_hisob', 'hisobot_yakun'] as const) delete natijalar[k];
    return { holat: { javoblar: yangi, natijalar }, xato: null, profil: null };
  }

  // "Yangi oy" (12-qadam) — oy hisoboti arxivga, 11-qadam yangi oy bilan.
  if (s.id === 'yangi_oy' && qiymat === 'boshlaymiz') {
    const yangi = { ...holat.javoblar };
    for (const id of ['sotuv_holat', 'hisobot_oy', 'oy_sotuv', 'oy_komissiya', 'deklaratsiya', 'deklaratsiya_qadam', 'yangi_oy']) delete yangi[id];
    const natijalar = { ...holat.natijalar };
    const arxiv = Array.isArray(natijalar.oylar) ? natijalar.oylar : [];
    const hh = natijalar.hisobot_hisob as HisobotHisobNatijasi | undefined;
    if (hh) natijalar.oylar = [...arxiv, { oy: hh.oy, sotuvSom: hh.sotuvSom, komissiyaSom: hh.komissiyaSom, sofSom: hh.sofSom, soliq: hh.soliq }];
    for (const k of ['sotuv', 'hisobot', 'hisobot_hisob', 'hisobot_yakun'] as const) delete natijalar[k];
    return { holat: { javoblar: yangi, natijalar }, xato: null, profil: null };
  }

  if (s.id === 'studiya_tayyor' && qiymat === 'qayta') {
    const yangi = { ...holat.javoblar };
    delete yangi['studiya_tayyor'];
    const natijalar = { ...holat.natijalar };
    delete natijalar.studiya;
    return { holat: { javoblar: yangi, natijalar }, xato: null, profil: null };
  }

  if (s.id === 'xitoy_qayta' && qiymat === 'qayta') {
    const yangi = { ...holat.javoblar };
    // Faqat qidirilmagan tovarlarning tanlovi ochiladi: topilib, taklifi
    // tanlangan tovar qayta soʻralmaydi (natija 72 soatlik keshdan qaytadi).
    const xn = holat.natijalar.xitoy as XitoyNatijasi | undefined;
    for (const q of xn?.qatorlar ?? []) if (q.holat === 'qidirilmadi') delete yangi[`xitoy_tanlov:${q.productId}`];
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
  // Kutilmagan xato — natija shakli yoʻq; quyidagi quruvchilar unga tegmaydi.
  if (yiqildimi(natija)) return 'Hisoblashda kutilmagan xato boʻldi — bu natija emas, nosozlik. Qayta urinib koʻrish mumkin.';
  if (harakat === 'usta_fikri') {
    const n = natija as { olchov_yoq?: boolean; sabab?: string } | null;
    return n?.olchov_yoq
      ? `Fikringizni yoza olmadim (${n.sabab ?? 'baza javob bermadi'}) — lekin yoʻl davom etadi.`
      : 'Fikringiz yozildi — rahmat. Endi Xitoydan qidiramiz.';
  }
  if (harakat === 'yonalishlar') {
    const n = natija as YonalishlarNatijasi;
    if (n.olchov_yoq || !n.royxat?.length) {
      return `Yoʻnalishlarni hozir hisoblab bera olmadim: ${n.sabab ?? 'oʻlchov yoʻq'}. Bu "sizga mos yoʻnalish yoʻq" degani emas — hisob hali yoʻq.`;
    }
    const eng = n.royxat[0]!;
    const yetadi = n.royxat.filter((y) => y.yetadi === true).length;
    // `false` — byudjet MAʼLUM va yetmaydi; `null` — bilmaymiz. Ikkisi bitta
    // "hali aytib boʻlmaydi" boʻlib qolmaydi (QOIDALAR.md, 4-boʻlim).
    const yetmaydi = n.royxat.filter((y) => y.yetadi === false).length;
    const ball = eng.ball?.value ?? null;
    const byudjet = yetadi
      ? `${yetadi} tasiga byudjetingiz yetadi${yetmaydi ? `, ${yetmaydi} tasiga yetmaydi` : ''}.`
      : yetmaydi === n.royxat.length
        ? 'Byudjetingiz bu yoʻnalishlarning hech biriga tavsiya etilgan kirish summasiga yetmaydi.'
        : yetmaydi
          ? `${yetmaydi} tasiga byudjetingiz yetmaydi, qolganlari uchun hali aytib boʻlmaydi.`
          : 'Byudjet yetadimi — hali aytib boʻlmaydi.';
    return `${n.royxat.length} ta yoʻnalish baholandi. Eng yuqori ball — "${eng.name}"${ball !== null ? `, ${ball} ball` : ''}. `
      + byudjet
      + ' Tanlov sizniki: ball tartib beradi, qaror bermaydi.';
  }
  if (harakat === 'tovarlar') {
    const n = natija as TovarlarNatijasi;
    if (n.olchov_yoq || !n.royxat?.length) {
      return `Bu yoʻnalishda tovar roʻyxatini bera olmadim: ${n.sabab ?? 'oʻlchov yoʻq'}.`;
    }
    // "8 ta tuzoq-filtrdan oʻtdi" deyilmaydi: maʼlumot yetmay baholanmagan
    // filtr "oʻtdi" emas (QOIDALAR.md, 8-boʻlim), sotuvi oʻlchanmagan tovar
    // "oʻlchangan" emas.
    const r = n.royxat;
    const chiq = n.chiqarildi?.length ?? 0;
    const ogoh = r.filter((t) => (t.bayroqlar?.length ?? 0) > 0).length;
    const baholanmadi = r.filter((t) => (t.baholanmadi?.length ?? 0) > 0).length;
    const olchangan = r.filter((t) => t.miqdor !== null).length;
    return `${r.length} ta tovar roʻyxatga chiqdi: 8 ta tuzoq-filtrning hech biri ularni toʻxtatmadi`
      + (ogoh ? `, ${ogoh} tasida ogohlantirish bor` : '')
      + (baholanmadi ? `, ${baholanmadi} tasida ayrim filtrlar maʼlumot yetmagani uchun baholanmadi` : '')
      + '.'
      + (chiq ? ` ${chiq} tasi tuzoq sababli roʻyxatdan chiqarildi — sababi har birida yozilgan.` : '')
      + (olchangan ? ` ${olchangan} tasida sotuv zaxira kamayishidan oʻlchangan — bu taxmin, Uzum sotuv sonini bermaydi.` : '')
      + (olchangan < r.length ? ` ${r.length - olchangan} tasida sotuv hali oʻlchanmagan — miqdorni oʻzingiz yozasiz.` : '');
  }
  if (harakat === 'qabul') {
    const n = natija as QabulQadamNatijasi;
    if (n.olchov_yoq) return `Qabul faktlarini bera olmadim: ${n.sabab ?? 'oʻlchov yoʻq'}. Bu "qoida yoʻq" degani EMAS — raqamlar yoʻq.`;
    const f = n.faktlar;
    const yetishmaydi = f.yetishmaydi.length ? ` Faktda yoʻq: ${f.yetishmaydi.join(', ')}.` : '';
    const manba = f.manba ? ` Manba: ${f.manba}${f.olchandi ? ` (${sanaMatni(f.olchandi)})` : ''}.` : '';
    return `Qabul roʻyxati tayyor: ${n.qatorlar.length} ta tovar${n.jamiDona !== null ? `, ${minglik(n.jamiDona)} dona` : ''}. Yuk kelganda sanang va koʻzdan kechiring: kam yoki nuqsonli boʻlsa agentga daʼvo uchun yozib qoʻyamiz. Nuqsonli tovarni Uzumga yubormang — omborda aniqlangan har muammo (nuqson, kam, ortiqcha, yorliqsiz): ${tafovutMatni(f.tafovutSom)}.${yetishmaydi}${manba}`;
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
    const qabul = f.muddatKunMax !== null ? `qabul ${minglik(f.muddatKunMax)} kun gacha` : 'qabul muddati faktda yoʻq';
    return `Yuklash: ${n.qatorlar.length} ta tovar${n.jamiDona !== null ? `, ${minglik(n.jamiDona)} dona` : ''}. Avval kartochka (${n.talablar.kartochkaQoidalari.length} ta qoida), keyin qadoq (${qadoqli} tasiga Uzum jadvalidan qoida), yorliq, yetkazma akti va taymslot. Ombor: ${f.ombor.manzil ?? 'manzil faktda yoʻq'} (${f.ombor.soat ?? 'soat faktda yoʻq'}); ${qabul}, tafovut — ${tafovutMatni(f.tafovutSom)}.`
      + (yetishmaydi.length ? ` Faktda yoʻq: ${yetishmaydi.join(', ')}.` : '')
      + (f.manba ? ` Manba: ${f.manba}${f.olchandi ? ` (${sanaMatni(f.olchandi)})` : ''}.` : '');
  }
  if (harakat === 'yuklash_yakun') return ochiqIshlarMatni(natija as QabulYakunNatijasi, 'Yuklash');
  if (harakat === 'sotuv') {
    const n = natija as SotuvNatijasi;
    if (n.olchov_yoq) return `Sotuv oʻlchovini oʻqiy olmadim: ${n.sabab ?? 'oʻlchov yoʻq'}. Bu "sotuv yoʻq" degani EMAS.`;
    const ozlar = n.qatorlar.filter((q) => q.ozId !== null);
    const olchangan = ozlar.filter((q) => q.oz?.holat === 'olchandi');
    const kuz = n.kuzatuv
      ? ` Kuzatuvda: ${ozlar.length} ta kartochka${n.kuzatuv.qoshildi ? ` (${n.kuzatuv.qoshildi} tasi yangi qoʻshildi)` : ''}.`
      : n.kuzatuvXato ? ` Kuzatuvga qoʻshib boʻlmadi: ${n.kuzatuvXato}.` : '';
    const sig = n.signallar.length ? ` Signallar: ${n.signallar.length} ta.` : ' Signal yoʻq.';
    if (ozlar.length === 0) return `Sotuv: kartochka havolasi yoʻq — oʻz sotuvingizni kuzata olmayman.${sig}`;
    if (olchangan.length === 0) return `Sotuv:${kuz} Hali oʻlchanmagan — tizim kuniga 3 marta oʻlchaydi (${KUZATUV_VAQTLARI}), sotuv raqami ikki oʻlchovdan keyin chiqadi.${sig}`;
    const bugun = n.jami.bugunDona === null ? 'hisoblanmagan' : `${minglik(n.jami.bugunDona)} dona`;
    // Tushum nomaʼlum (narxsiz kun) — "taxminan oʻlchanmagan" emas.
    const oy = n.jami.oyDona === null
      ? 'hisoblanmagan'
      : `${minglik(n.jami.oyDona)} dona${n.jami.oySom !== null ? `, taxminan ${som(n.jami.oySom)}` : ' (tushum hisoblanmadi — ayrim kunlarda narx oʻlchanmagan)'}`;
    return `Sotuv (${sanaMatni(n.sana)}):${kuz} ${oxirgiKun(n, olchangan)} ${bugun}, shu oy ${oy} — zaxira kamayishidan (Uzum buyurtma sonini bermaydi).${sig}`;
  }
  if (harakat === 'hisobot') {
    const n = natija as HisobotNatijasi;
    if (n.olchov_yoq) return `Hisobot faktlarini oʻqiy olmadim: ${n.sabab ?? 'oʻlchov yoʻq'}.`;
    const y = n.faktlar.yetishmaydi.length ? ` Faktda yoʻq: ${n.faktlar.yetishmaydi.join(', ')}.` : '';
    const q = qamrovMatni(hisobotQamrovi(n));
    const olchov = n.olchovDona === null
      ? 'bu oy uchun oʻlchovimiz yoʻq'
      : `oʻlchovimiz boʻyicha ${minglik(n.olchovDona)} dona, ${n.olchovSotuv !== null ? `taxminan ${som(n.olchovSotuv)}` : 'tushum hisoblanmadi (ayrim kunlarda narx oʻlchanmagan)'}${q ? ` (${q} — qisman)` : ''}`;
    return `Oy hisoboti (${oyNomi(n.oy)}${n.tugagan === false ? ', hozirgacha' : ''}): ${olchov}. Aniq raqamni Uzum komissioner hisobotidan olamiz.${y}`;
  }
  if (harakat === 'hisobot_hisob') {
    const n = natija as HisobotHisobNatijasi;
    const s = n.soliq;
    const q = qamrovMatni(n.qamrov);
    return `Hisob: sotuv ${som(n.sotuvSom)}${n.sotuvManbasi === 'olchov' ? ` (taxmin${q ? `, ${q}` : ''})` : ''}, aylanma soligʻi ${soliqSom(s.aylanmaSom)}, ijtimoiy soliq ${s.ijtimoiySom !== null ? som(s.ijtimoiySom) : 'faktda yoʻq'}${s.jamiSom !== null ? ` — jami ${som(s.jamiSom)}` : ''}. Soliq bazasi — xaridor toʻlagan toʻliq narx, komissiya chegirilmaydi. Bu soliq maslahati emas.`
      + (n.faktlar.agent ? ` Aylanma soligʻi: ${n.faktlar.agent} — komissioner hisobotida ushlab qolinganini tekshiring.` : '')
      // MChJ / oʻzini oʻzi band — YATT soligʻi indamay yuklanmaydi.
      + shaklIzohi(n.shakl, false);
  }
  if (harakat === 'hisobot_yakun') {
    const n = natija as HisobotYakunNatijasi;
    const ochiq = ochiqIshlarMatni({ olchov_yoq: n.olchov_yoq, ...(n.sabab ? { sabab: n.sabab } : {}), yozildi: n.yozildi, izoh: n.izoh } as QabulYakunNatijasi, 'Hisobot');
    return `${ochiq} Keyingi oy rejasi: ${n.reja.length ? n.reja.join(' ') : 'tovar yoʻq.'}`;
  }
  if (harakat === 'rasmiy') {
    const n = natija as RasmiyNatijasi;
    if (n.olchov_yoq) {
      return `Rasmiylashtirish faktlarini bera olmadim: ${n.sabab ?? 'oʻlchov yoʻq'}. Bu "kerak emas" degani EMAS — raqamlar yoʻq.`;
    }
    const f = n.faktlar;
    const s = n.soliq;
    // Bu YATT soligʻi (huquqiy shakl hali soʻralmagan) — shunday aytiladi; yil kodga yozilmaydi.
    const soliq = `YATT uchun majburiy soliq: ijtimoiy ${somMatni(s.ijtimoiySom)} har oy (sotuv boʻlmasa ham)`
      + (f.soliq.aylanmaFoiz !== null ? `, aylanmadan ${f.soliq.aylanmaFoiz} %` : ', aylanma foizi faktda yoʻq')
      + (s.aylanmaSom !== null && n.partiyaSotuvSom !== null ? ` — partiyangiz (${minglik(n.partiyaSotuvSom)} soʻm) sotilsa ≈ ${minglik(s.aylanmaSom)} soʻm` : '')
      + '.';
    const manbalar = [...new Set([f.soliq.manba, f.yatt.manba].filter((x): x is string => x !== null))];
    const manba = manbalar.length ? ` Manba: ${manbalar.join('; ')}${f.soliq.olchandi ? ` (oʻlchandi ${sanaMatni(f.soliq.olchandi)})` : ''}.` : '';
    const yetishmaydi = f.yetishmaydi.length ? ` Faktda yoʻq: ${f.yetishmaydi.join(', ')} — nazoratchi kiritadi.` : '';
    if (n.kabinetBor) {
      return `Rasmiylashtirish sizda bor — 1-qadamda Uzum kabineti bor dedingiz. ${soliq}${manba}${yetishmaydi}`;
    }
    return `Rasmiylashtirish uchun uchta narsa: YATT (onlayn ${somMatni(f.yatt.bojOnlaynSom)}, shaxsan ${somMatni(f.yatt.bojShaxsanSom)}), biznes hisob raqami (${f.banklar.length} ta bank taqqoslandi) va Uzum kabineti (faollashtirish ${f.uzum.faollashtirishKun !== null ? `${f.uzum.faollashtirishKun} kun` : 'muddati faktda yoʻq'}). ${soliq}${manba}${yetishmaydi} Bu soliq yoki yuridik maslahat emas — raqamlar manbadan.`;
  }
  if (harakat === 'rasmiy_yakun') {
    const n = natija as RasmiyYakunNatijasi;
    const y = n.yozildi ?? [];
    const royxat = y.map((x) => `${x.sabab}${x.muddat ? ` (${sanaMatni(x.muddat)} gacha)` : ''}`).join('; ');
    if (n.olchov_yoq) return `Ochiq ishlarni yozishda xato: ${n.sabab ?? 'baza javob bermadi'}${y.length ? `; roʻyxat: ${royxat}` : ''}.`;
    if (y.length === 0) return 'Rasmiylashtirish boʻyicha ochiq ish yoʻq — hammasi tayyor.';
    const tekshirish = y.some((x) => x.tur === 'tekshirish');
    return `Ochiq ishlar yozildi (${y.length}): ${royxat}.${tekshirish ? ' "Sayt boshqacha" belgilaganingiz nazoratchiga tekshirish uchun ketdi.' : ''}`;
  }
  if (harakat === 'buyurtma') {
    const n = natija as BuyurtmaNatijasi;
    const q = n.qatorlar ?? [];
    // Tayyor qator yoʻq — "varaqa tayyor: 0 ta tovar" emas, yasalmadi.
    if ((n.olchov_yoq && q.length === 0) || n.jami?.tayyor === 0) {
      return `Buyurtma varaqasini yasay olmadim: ${n.sabab ?? 'oʻlchov yoʻq'}.`;
    }
    const j = n.jami;
    const kargo = n.kargo.izoh
      ? ` Kargo: ${n.kargo.izoh} — kargo narxi hisobga kirmadi, jami shunga koʻra PASTROQ koʻrinadi.`
      : (j.kargoSom !== null ? ` Kargo (ogʻirlik boʻyicha, ${n.kargo.hamkor ?? 'hamkor'}): ${minglik(j.kargoSom)} soʻm.` : ' Kargo: ogʻirlik oʻlchanmagan tovarlar bor — hisobga kirmadi.');
    return `Buyurtma varaqasi tayyor: ${j.tayyor} ta tovar`
      + (j.dona !== null ? `, ${minglik(j.dona)} dona` : '')
      + (j.yuan !== null ? `, jami ¥${minglik(j.yuan)}` : '')
      + (j.som !== null ? ` (≈ ${minglik(j.som)} soʻm, CBU ${n.kurs.cny?.sana ?? ''})` : '')
      + (j.tanlanmagan ? `; ${j.tanlanmagan} ta tovarda 1688 taklifi tanlanmagan — varaqaga kirmadi` : '')
      + '.' + kargo + ' Buyurtmani tizim bermaydi: varaqani agent yoki kargo hamkoriga yuborasiz.';
  }
  if (harakat === 'ochiq_ish') {
    const n = natija as OchiqIshNatijasi;
    if (n.olchov_yoq) return `Kutish ishini yozib qoʻya olmadim: ${n.sabab ?? 'baza javob bermadi'}. Yuk kelganda oʻzingiz aytasiz.`;
    // Muddat yoʻqligi sababi aniq emas (hamkor yoʻq yoki yoʻl kuni kiritilmagan) —
    // umumiy, rost gap; yuk kelganini har holda obunachi aytadi (eslatma yoʻq).
    return n.muddat
      ? `Yuk kelishini kutamiz: taxminan ${sanaMatni(n.muddat)} (hamkor oʻrtacha muddati, vaʼda emas). Kelganda oʻzingiz xabar bering; kelguncha doʻkonni tayyorlaymiz.`
      : 'Yuk kelishini kutamiz. Muddatni ayta olmayman — kargo muddati faktda yoʻq. Kelganda oʻzingiz xabar bering; kelguncha doʻkonni tayyorlaymiz.';
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
      ? ` Kurs: ${n.kurs.manba}, 1 yuan = ${minglik(n.kurs.somPerYuan)} soʻm (${n.kurs.sana}).`
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
  // Chegarasi yoʻq tovar "yetishmagan qism bor" (yaʼni pastroq) deb atalmaydi —
  // unda chegara umuman yoʻq; "pastroq" gapi faqat hisoblangan qatorda kamchilik boʻlsa.
  const hisoblanmadi = q.filter((x) => x.chegaraSom === null);
  const sabablar = [...new Set(hisoblanmadi.flatMap((x) => x.yetishmaydi ?? []))].join(', ');
  const kamchilik = q.some((x) => x.chegaraSom !== null && (x.yetishmaydi?.length ?? 0) > 0);
  return `${bor} ta tovar uchun Xitoydagi chegara narx hisoblandi.`
    + (hisoblanmadi.length ? ` ${hisoblanmadi.length} tasida chegara hisoblanmadi${sabablar ? ` (${sabablar})` : ''}.` : '')
    + (kamchilik ? ' Yetishmagan qism roʻyxatda — u hisobga kirmagan, demak haqiqiy chegara pastroq.' : '');
}
