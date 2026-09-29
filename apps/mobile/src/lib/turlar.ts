/**
 * `/suhbat` uchining javob SHAKLI — web (`apps/web/src/app/usta/Suhbat.tsx`)
 * bilan bir xil shartnoma.
 *
 * Bu yerda HECH NARSA hisoblanmaydi: ilova faqat chizadi va javobni
 * yuboradi. Savol tartibini server (`packages/shared/src/ssenariy.ts`)
 * hal qiladi — bot, kengaytma, sayt va ilova bitta manbadan oladi.
 *
 * Maydonlar `null` boʻlishi mumkin va bu MAʼNOLI: "oʻlchov yoʻq".
 * Ekranda u chiziqcha boʻlib chiqadi, nol emas (QOIDALAR.md, 4-boʻlim).
 */

export interface Variant { qiymat: string | number; nom: string }

export interface Savol {
  id: string;
  qadam: number;
  matn: string;
  turi: 'tanlov' | 'kopTanlov' | 'son' | 'matn';
  variantlar: Variant[];
  erkin: boolean;
  otkazishMumkin: boolean;
}

export type Keyingi =
  | { tur: 'savol'; savol: Savol }
  | { tur: 'kod'; harakat: string; qadam: number }
  | { tur: 'kutish'; qadam: number; matn: string; boshlandi: string | null }
  | { tur: 'tezOrada'; qadam: number; nom: string; matn: string };

export interface Xabar {
  rol: 'obunachi' | 'menejer' | 'kod';
  matn: string;
  savolId?: string;
  javob?: unknown;
  seq?: number;
}

export interface SuhbatJavobi {
  xato?: string;
  xabarlar: Xabar[];
  keyingi: Keyingi;
  qadam: number;
  yozildi: boolean;
  tarix?: Xabar[];
}

export interface BazamizJavobi {
  olchov_yoq?: boolean;
  bazamiz?: { dokon: number | null; tovar: number | null; turkum: number | null; olchandi: string | null } | null;
}

/* ------------------------------------------------------ kod kartalari */

export interface YonalishQatori {
  categoryId: number; name: string;
  ball: { value: number | null };
  yetadi: boolean | null;
  optimalKirishSom: number | null;
  dalil: { talabOlchovi: number | null; sotuvchiSoni: number | null; top3Ulush: number | null };
}

export interface TovarQatori {
  nomzod: {
    productId: number; title: string; shopName: string | null;
    narxSom: number | null; soldUnits30d: number | null;
    sotuvManbasi: 'olchandi' | 'taxmin' | null; olchanganKun: number | null;
    categoryMedianUnits30d?: number | null; reyting?: number | null; sharhSoni?: number | null;
    rasmUrl?: string | null;
  };
  miqdor: { dona: number; hisob: string } | null;
  miqdorSababi: string | null;
  bayroqlar: Array<{ kind: string; severity: string; reason: string }>;
}

export interface TannarxQatori {
  productId: number; title: string; sotuvNarxiSom: number | null; miqdor: number | null;
  marjaFoizi: number | null; chegaraSom: number | null; yetishmaydi: string[]; hisob: string | null;
}

export interface XitoyTaklif {
  sourceId: string; title: string; narxYuan: number; rasmUrl: string | null; moq: number | null;
  reyting: number | null; manzil: string | null; buyurtmalar: number | null; zavod: boolean | null;
  superZavod?: boolean | null; oxshashlikOrni?: number | null;
  narxSom: number | null; chegaradaMi: boolean | null;
}

export interface XitoyQatori {
  productId: number; title: string; rasmUrl: string | null; chegaraSom: number | null; yetishmaydi?: string[];
  holat: 'topildi' | 'topilmadi' | 'qidirilmadi'; sabab: string | null; jami: number | null;
  takliflar: XitoyTaklif[]; keshdan?: boolean; tashlandi?: number; tashxis?: string | null;
}

export interface XitoyKurs { somPerYuan: number; sana: string; manba: string }

export interface BuyurtmaQatori {
  productId: number; title: string; sourceId: string | null; xitoyTitle: string | null; manzil: string | null;
  miqdor: number | null; narxYuan: number | null; narxSom: number | null; jamiYuan: number | null; jamiSom: number | null;
  weightG: number | null; kargoSom: number | null; kargoIzoh: string | null; holat: 'tayyor' | 'tanlanmagan';
}

export interface BuyurtmaNatija {
  qatorlar?: BuyurtmaQatori[];
  jami?: { yuan: number | null; som: number | null; kargoSom: number | null; dona: number | null; tayyor: number; tanlanmagan: number };
  kargo?: { hamkor: string | null; izoh: string | null };
  kurs?: { cny: { sana: string; somPerYuan: number } | null; usd: { sana: string; somPerYuan: number } | null };
  izoh?: string;
}

export interface RasmiyManba { manba: string | null; olchandi: string | null }

export interface RasmiyNatija {
  olchov_yoq?: boolean; sabab?: string; kabinetBor?: boolean; partiyaSotuvSom?: number | null;
  faktlar?: {
    bhmSom: number | null;
    yatt: RasmiyManba & { bojShaxsanSom: number | null; bojOnlaynSom: number | null; royxatUrl: string | null; muddatDaqiqa: number | null; xodimMax: number | null };
    soliq: RasmiyManba & { aylanmaFoiz: number | null; aylanmaChegaraSom: number | null; ijtimoiyOySom: number | null; tolovKuni: number | null; rejimTugaydi: string | null };
    banklar: Array<RasmiyManba & { nom: string; onlayn: boolean | null; ochishSom: number | null; oylikSom: number | null; izoh: string | null }>;
    uzum: RasmiyManba & { kabinetUrl: string | null; qollanmaUrl: string | null; komissioner: { stir: string | null; nom: string | null; mfo: string | null; hisob: string | null; muddatYil: number | null }; faollashtirishKun: number | null; qollabQuvvatlashUrl: string | null; tolovStandart: string | null };
    yetishmaydi: string[];
  };
  soliq?: { ijtimoiySom: number | null; aylanmaSom: number | null; jamiSom: number | null; sotuvSom: number | null };
  izoh?: string;
}
