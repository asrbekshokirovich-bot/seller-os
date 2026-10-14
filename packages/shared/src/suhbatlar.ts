/**
 * «SUHBATLARIM» — mijozning oldingi suhbatlari.
 *
 * Nazoratchi (2026-10-14): "mijoz kirib oldingi yozishgan chatini ham topishi
 * kerak … suhbatlarim degan tugma boʻladi, ichida oldin yozishilgan chatlar".
 * Ilgari «Boshidan boshlash» eski suhbatni ekrandan butunlay olib tashlardi —
 * jurnalda qolsa ham mijoz uni qayta koʻra olmasdi.
 *
 * Suhbatlar jurnaldan «Boshidan boshlash» belgilari bilan ajratiladi (0066).
 * Bu modul bazadagi qatorni chatdagi kartaga aylantiradi va uchta amalni
 * beradi: roʻyxat, bitta suhbatni oʻqish, eski suhbatga qaytish (davom
 * ettirish). Ism va telefon brauzerga KETMAYDI: kartada faqat mavzu (turkum
 * yoki soha), qadam, sana va xabarlar soni.
 */

import { BILMAYMAN } from './soha.js';
import type { SuhbatBogliqliklari, SuhbatJavobi } from './suhbat.js';
import { suhbatOqi } from './suhbat.js';

/** `so_suhbatlar` qatori (0066). */
export interface SuhbatQatori {
  boshi: number;
  oxiri: number;
  soni: number;
  /** Mijoz yozgan (bosgan) javoblar soni — 0 boʻlsa, eski suhbat roʻyxatga chiqmaydi. */
  yozgan: number;
  boshlandi: string;
  yangilandi: string;
  joriy: boolean;
  /** Holati saqlanganmi — davom ettirish shunga bogʻliq (2026-10-14 gacha boshlanganlarda yoʻq). */
  holatBor: boolean;
  qadam: number | null;
  javoblar: Record<string, unknown> | null;
  turkum: string | null;
}

/** Suhbat mavzusi: tanlangan turkum yoki qiziqqan sohalar; hali yoʻq — `null`. */
export type SuhbatMavzusi = { tur: 'turkum'; nom: string } | { tur: 'soha'; sohalar: string[] } | null;

/** Chatdagi «Suhbatlarim» kartasi. */
export interface SuhbatKartasi {
  boshi: number;
  oxiri: number;
  mavzu: SuhbatMavzusi;
  qadam: number | null;
  /** Oxirgi xabar vaqti (ISO). */
  sana: string;
  xabarlar: number;
  joriy: boolean;
  /** Eski suhbat va holati saqlangan — «Davom ettirish» tugmasi chiqadi. */
  davomEtsaBoladi: boolean;
}

/** `so_suhbat_bolagi` xabari — faqat oʻqish uchun. */
export interface SuhbatBolagiXabari {
  seq: number;
  rol: 'obunachi' | 'menejer' | 'kod';
  matn: string;
  savolId: string | null;
  at: string;
}

function mavzusi(q: SuhbatQatori): SuhbatMavzusi {
  if (typeof q.turkum === 'string' && q.turkum.trim()) return { tur: 'turkum', nom: q.turkum.trim() };
  const qiziqish = q.javoblar?.['qiziqish'];
  const sohalar = Array.isArray(qiziqish) ? qiziqish.map(String).filter((s) => s !== BILMAYMAN) : [];
  return sohalar.length ? { tur: 'soha', sohalar } : null;
}

/** Bazadagi qator → karta. Ism, telefon va boshqa javoblar kartaga oʻtmaydi. */
export function suhbatKartasi(q: SuhbatQatori): SuhbatKartasi {
  const qadam = typeof q.qadam === 'number' && q.qadam >= 1 && q.qadam <= 12 ? q.qadam : null;
  return {
    boshi: q.boshi,
    oxiri: q.oxiri,
    mavzu: mavzusi(q),
    qadam,
    sana: q.yangilandi,
    xabarlar: q.soni,
    joriy: q.joriy,
    davomEtsaBoladi: !q.joriy && q.holatBor,
  };
}

/**
 * Roʻyxat — eng yangisi oldin. Mijoz hech narsa yozmagan eski suhbat (faqat
 * salomlashish turgan) chiqmaydi: u «suhbat» emas, bosilgan «Boshidan boshlash».
 */
export function suhbatlarRoyxati(qatorlar: readonly SuhbatQatori[]): SuhbatKartasi[] {
  return qatorlar.filter((q) => q.joriy || q.yozgan > 0).map(suhbatKartasi);
}

/** Mijozning suhbatlari. */
export async function suhbatlarOqi(d: Pick<SuhbatBogliqliklari, 'rpc'>, token: string): Promise<{ suhbatlar: SuhbatKartasi[] } | { xato: string }> {
  const r = await d.rpc<{ xato?: string; suhbatlar?: SuhbatQatori[] }>('so_suhbatlar', { p_token: token });
  if (r === null) return { xato: 'baza javob bermadi' };
  if (r.xato) return { xato: r.xato };
  return { suhbatlar: suhbatlarRoyxati(Array.isArray(r.suhbatlar) ? r.suhbatlar : []) };
}

/** Bitta suhbat xabarlari (oʻqish uchun). `boshi`/`oxiri` — kartadagi chegaralar. */
export async function suhbatBolagi(
  d: Pick<SuhbatBogliqliklari, 'rpc'>, token: string, boshi: number, oxiri: number,
): Promise<{ xabarlar: SuhbatBolagiXabari[] } | { xato: string }> {
  if (!Number.isSafeInteger(boshi) || !Number.isSafeInteger(oxiri) || boshi < 1 || oxiri < boshi) {
    return { xato: 'suhbat chegarasi notoʻgʻri' };
  }
  const r = await d.rpc<{ xato?: string; xabarlar?: SuhbatBolagiXabari[] }>('so_suhbat_bolagi', {
    p_token: token, p_boshi: boshi, p_oxiri: oxiri,
  });
  if (r === null) return { xato: 'baza javob bermadi' };
  if (r.xato) return { xato: r.xato };
  return { xabarlar: Array.isArray(r.xabarlar) ? r.xabarlar : [] };
}

/**
 * Eski suhbatga qaytish: hozirgi suhbat «Suhbatlarim»ga oʻtadi (holati bilan),
 * eski suhbat davom etadi. Muvaffaqiyatli boʻlsa — yangi holat (`suhbatOqi`):
 * sahifa chatni shu bilan almashtiradi.
 */
export async function suhbatQaytar(
  d: Pick<SuhbatBogliqliklari, 'rpc' | 'darvoza'>, token: string, boshi: number,
): Promise<(SuhbatJavobi & { tarix?: unknown }) | { xato: string }> {
  if (!Number.isSafeInteger(boshi) || boshi < 1) return { xato: 'suhbat topilmadi' };
  const r = await d.rpc<{ xato?: string }>('so_suhbat_qaytar', { p_token: token, p_boshi: boshi });
  if (r === null) return { xato: 'baza javob bermadi' };
  if (r.xato) return { xato: r.xato };
  return suhbatOqi(d, token);
}
