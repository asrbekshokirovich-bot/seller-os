/**
 * Bosh sahifadan chatga birinchi xabar (nazoratchi, 2026-10-28; 1-taklif — «birinchi 2 savol
 * bosh sahifaning oʻzida»).
 *
 * NEGA. Bosh sahifada «Yozing — topib beramiz» deyilardi, lekin qidiruv qutisi yozilmasdi —
 * u oddiy havola edi: bosilsa chat noldan, oʻz savolidan boshlanardi. Endi bosh sahifada soha
 * va pul tanlanadi (yoki oʻzi yoziladi), matn varaq xotirasiga (`sessionStorage`) tushadi;
 * chat ochilishi bilan uni OʻQIB OʻCHIRADI va birinchi xabar qilib yuboradi. AI bitta gapdan
 * soha va pulni tushunadi — yoʻnalishlar darhol chiqadi.
 *
 * MANZILGA (URL) YOZILMAYDI: matnda telefon boʻlishi mumkin, manzil esa brauzer tarixida va
 * server loglarida qoladi. Eski matn (10 daqiqadan oshgan) yuborilmaydi — boshqa safar chat
 * ochilsa, avvalgi tanlov oʻzidan-oʻzi ketmasin.
 */

import { BILMAYMAN, SAVDO_SOHALARI } from '@selleros/shared';
import type { Til } from './til';

export const BOSH_XABAR_KALIT = 'zs-bosh-xabar';
export const BOSH_XABAR_MUDDAT_MS = 10 * 60 * 1000;
/** Matn chegarasi — chatdagi yozish maydonidagidek (`maxLength={500}`). */
export const BOSH_XABAR_MAX = 500;

/** `30_000_000` → «30 mln soʻm» / «30 млн сум». */
export function pulMatni(som: number, til: Til): string {
  const mln = String(Math.round(som / 1e5) / 10).replace('.', ',');
  return til === 'ru' ? `${mln} млн сум` : `${mln} mln soʻm`;
}

/**
 * Tanlangan sohalar, pul va oʻzi yozgani — chatga ketadigan bitta gap. Sohalar chatdagi
 * nomlari bilan (AI ularni aniq taniydi); «Bilmayman» — chatdagi tugma matni. Hech narsa
 * tanlanmagan va yozilmagan — `null`.
 */
export function boshXabarMatni(sohalar: readonly string[], byudjet: number | null, ozi: string, til: Til): string | null {
  const qism: string[] = [];
  if (sohalar.includes(BILMAYMAN)) {
    qism.push(til === 'ru' ? 'Не знаю — покажите лучшие направления' : 'Bilmayman — eng yaxshilarini koʻrsating');
  } else {
    const nomlar = SAVDO_SOHALARI.filter((s) => sohalar.includes(s.id)).map((s) => (til === 'ru' ? s.ru : s.nom));
    if (nomlar.length) qism.push(nomlar.join(', '));
  }
  if (byudjet !== null) qism.push(til === 'ru' ? `Бюджет: ${pulMatni(byudjet, til)}` : `Byudjet: ${pulMatni(byudjet, til)}`);
  const t = ozi.trim().replace(/\s+/gu, ' ');
  if (t) qism.push(t);
  return qism.length ? qism.join('. ').slice(0, BOSH_XABAR_MAX) : null;
}

/** Bosh sahifada: matnni varaq xotirasiga qoʻyadi. Xotira yopiq — `false` (chat oddiy boshlanadi). */
export function boshXabarniSaqla(matn: string, hozir = Date.now()): boolean {
  try {
    sessionStorage.setItem(BOSH_XABAR_KALIT, JSON.stringify({ matn, vaqt: hozir }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Chat ochilganda: matnni oladi va OʻCHIRADI — sahifa yangilansa qayta yuborilmaydi. Yoʻq,
 * buzuq yoki eskirgan — `null`.
 */
export function boshXabarniOl(hozir = Date.now()): string | null {
  let xom: string | null;
  try {
    xom = sessionStorage.getItem(BOSH_XABAR_KALIT);
    if (xom !== null) sessionStorage.removeItem(BOSH_XABAR_KALIT);
  } catch {
    return null;
  }
  if (!xom) return null;
  try {
    const o = JSON.parse(xom) as { matn?: unknown; vaqt?: unknown };
    if (typeof o.matn !== 'string' || typeof o.vaqt !== 'number') return null;
    // Eskirgan yoki soati notoʻgʻri (kelajakdan) — yuborilmaydi.
    if (hozir - o.vaqt > BOSH_XABAR_MUDDAT_MS || o.vaqt - hozir > 60_000) return null;
    const t = o.matn.trim();
    return t ? t.slice(0, BOSH_XABAR_MAX) : null;
  } catch {
    return null;
  }
}
