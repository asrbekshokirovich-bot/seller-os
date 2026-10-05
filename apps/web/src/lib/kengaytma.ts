/**
 * Kengaytma yon paneli: sahifalar orasidagi havolalar sessiya hash'ini olib yuradi.
 *
 * Panelda sayt ramkada ochiladi va cookie u yerda ishlamaydi — sessiya tokeni
 * manzil hash'ida keladi (`#sessiya=…&kengaytma=1`, `sessiya-sarlavha.ts`).
 * Odam esa faqat suhbatda qolmaydi: «Chiqish» bosh sahifaga, «Kirish» — /kirish
 * ga olib boradi, u yerda logotip va «Ustaga oʻtish» bor. Havola hash'siz
 * boʻlsa keyingi sahifa tokensiz ochiladi: ramkada cookie saqlanmagani uchun
 * server har soʻrovga YANGI sessiya ochadi va suhbat yoʻqolgandek koʻrinadi.
 *
 * Hash serverga ketmaydi — bu yerda u faqat havola oxiriga qoʻshiladi.
 * Oddiy saytda (tokensiz hash yoki hash yoʻq) havola oʻzgarmaydi.
 */

import { useSyncExternalStore } from 'react';
import { hashTokeni } from './sessiya-sarlavha';

/** Tokenli hash — oʻzi (olib yuriladi); aks holda boʻsh satr. */
export function kengaytmaHashi(hash: string): string {
  return hashTokeni(hash) === null ? '' : hash;
}

/**
 * Ichki havola manzili: kengaytmada tokenli hash bilan, oddiy saytda oʻzgarishsiz.
 * Oʻz `#` qismi bor manzil (sahifa ichidagi langar, `#yol`) tegilmaydi.
 */
export function hashBilan(href: string, hash: string): string {
  const h = kengaytmaHashi(hash);
  return h === '' || href.includes('#') ? href : href + h;
}

function hashniKuzat(yangilandi: () => void): () => void {
  window.addEventListener('hashchange', yangilandi);
  return () => window.removeEventListener('hashchange', yangilandi);
}

/** Joriy sahifaning tokenli hash'i. Serverda va oddiy saytda — boʻsh satr. */
export function useKengaytmaHashi(): string {
  return useSyncExternalStore(hashniKuzat, () => kengaytmaHashi(window.location.hash), () => '');
}
