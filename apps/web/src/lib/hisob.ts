/**
 * Bosh sahifa hisoblagichi — brauzer tomoni (0076; qoidasi `@selleros/shared` `hisob.ts`).
 *
 * Nazoratchi (2026-10-28): «hisoblagich qoʻy». Toʻrt bosqich sanaladi: bosh sahifa ochildi,
 * «Boshlash» bosildi, chatda birinchi javob, yoʻnalishlar chiqdi. ISMSIZ: `/api/hisob` ga faqat
 * bosqich nomi ketadi — ism, telefon, matn, sessiya ketmaydi.
 *
 * SINOV. Sinovchi brauzerida manzilga bir marta `?sinov=1` qoʻshib ochiladi — brauzer eslab
 * qoladi va hisoblar `sinov` belgisi bilan ketadi: panelda sanalmaydi (`?sinov=0` — unutadi).
 *
 * Yuborish — `sendBeacon`: «Boshlash» bosilgach sahifa darhol almashadi, oddiy soʻrov uzilib
 * qolardi. Xatosi jim: hisoblagich sahifani hech qachon toʻxtatmaydi.
 */

import type { HisobNomi } from '@selleros/shared';

const SINOV_KALIT = 'zs-sinov';

/** Manzildagi `?sinov=1` / `?sinov=0` ni eslab qoladi. Javob — shu brauzer sinovchinikimi. */
export function sinovniOqi(qidiruv: string): boolean {
  const q = new URLSearchParams(qidiruv).get('sinov');
  try {
    if (q === '1') localStorage.setItem(SINOV_KALIT, '1');
    else if (q === '0') localStorage.removeItem(SINOV_KALIT);
  } catch { /* xotira yopiq — quyida manzilning oʻzi hal qiladi */ }
  return q === '1' || (q !== '0' && sinovmi());
}

export function sinovmi(): boolean {
  try {
    return localStorage.getItem(SINOV_KALIT) === '1';
  } catch {
    return false;
  }
}

/** Hisobni yuboradi. Sahifa yopilsa ham yetib boradi (`sendBeacon`), boʻlmasa — `fetch`. */
export function hisobla(nom: HisobNomi): void {
  const tana = JSON.stringify(sinovmi() ? { nom, sinov: true } : { nom });
  try {
    if (navigator.sendBeacon?.('/api/hisob', new Blob([tana], { type: 'application/json' }))) return;
  } catch { /* quyida fetch */ }
  try {
    void fetch('/api/hisob', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: tana, keepalive: true,
    }).catch(() => { /* jim */ });
  } catch { /* jim */ }
}

/**
 * Shu varaqda BIR MARTA (`sessionStorage`): sahifa yangilansa yoki orqaga qaytilsa qayta
 * sanalmaydi. Xotira yopiq boʻlsa (xususiy oyna) — baribir sanaladi.
 */
export function birMarta(nom: HisobNomi): void {
  const kalit = `zs-hisob:${nom}`;
  try {
    if (sessionStorage.getItem(kalit) === '1') return;
    sessionStorage.setItem(kalit, '1');
  } catch { /* xotira yopiq */ }
  hisobla(nom);
}
