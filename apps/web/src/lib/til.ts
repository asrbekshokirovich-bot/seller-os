/**
 * Interfeys tili — oʻzbekcha (standart) va ruscha.
 *
 * Nazoratchi qarori (2026-09-25): «Profilim» da til tanlanadi, ruscha
 * qoʻshiladi. Tanlov brauzerda (`so_til`) saqlanadi — mavzu bilan bir
 * xil yoʻl; bosh sahifa uni faqat oʻqiydi.
 *
 * NEGA LUGʻAT EMAS, `tr(uz, ru)`. Ikkala matn bitta qatorda yonma-yon
 * turadi: oʻzbekchasi oʻzgarsa, ruschasi koʻz oldida — alohida
 * lugʻatda esa u jimgina eskirib qolardi.
 *
 * Bu fayl `'use client'` EMAS va React ga tegmaydi: server sahifa
 * (`page.tsx`) ham `Til` turini ishlatadi.
 *
 * CHEGARA: backend yozgan matnlar (tuzoq sababi, "nega hisoblanmadi",
 * miqdor hisobi) hozircha oʻzbekcha keladi — ular API javobida tayyor
 * matn boʻlib turadi. Ularni tarjima qilish — backend ishi (BACKLOG).
 */

export type Til = 'uz' | 'ru';

/** `tr('Salom', 'Привет')` — joriy tildagi matn. */
export type Tr = (uz: string, ru: string) => string;

export function tarjima(til: Til): Tr {
  return (uz, ru) => (til === 'ru' ? ru : uz);
}

const KALIT = 'so_til';

/** Saqlangan til. Oʻqib boʻlmasa (xususiy oyna va h.k.) — `null`. */
export function saqlanganTil(): Til | null {
  try {
    const s = localStorage.getItem(KALIT);
    return s === 'uz' || s === 'ru' ? s : null;
  } catch {
    return null;
  }
}

/** Tanlovni eslab qoladi va `<html lang>` ni moslaydi (ekran oʻquvchi uchun). */
export function tilniSaqla(til: Til): void {
  try { localStorage.setItem(KALIT, til); } catch { /* saqlanmadi — bu xato emas */ }
  tilniQoy(til);
}

export function tilniQoy(til: Til): void {
  document.documentElement.lang = til;
}
