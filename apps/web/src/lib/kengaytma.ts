/**
 * Kengaytma yon paneli: sessiya tokeni manzil hash'ida keladi, sahifa uni varaq
 * xotirasiga oʻtkazadi va MANZILDAN OLIB TASHLAYDI.
 *
 * Panelda sayt ramkada ochiladi va cookie u yerda ishlamaydi — token kengaytmadan
 * `#sessiya=…&kengaytma=1` boʻlib keladi (`sessiya-sarlavha.ts`), /taqqos ham
 * yangi varaqda shunday ochiladi. Odam esa faqat suhbatda qolmaydi: «Chiqish»
 * bosh sahifaga, «Kirish» — /kirish ga olib boradi, u yerda logotip va «Suhbatga
 * oʻtish» bor. Keyingi sahifa tokensiz qolsa, ramkada cookie saqlanmagani uchun
 * server har soʻrovga YANGI sessiya ochadi va suhbat yoʻqolgandek koʻrinadi.
 *
 * Shuning uchun token shu varaq xotirasida (`sessionStorage`) turadi — ramka
 * ichidagi hamma sahifaga umumiy. Manzilda esa qolmaydi (xavfsizlik tekshiruvi,
 * 2026-10-26): manzil satri, orqaga/oldinga tarixi, nusxalangan havola va
 * skrinshot orqali sessiya begonaga oʻtib ketardi. Xotira ishlamasa (maxfiy
 * rejim, bloklangan xotira) hash YAGONA nusxa — u joyida qoladi va havolalar
 * uni avvalgidek keyingi sahifaga olib yuradi.
 *
 * Hash serverga ketmaydi. Oddiy saytda (tokensiz hash yoki hash yoʻq) hech
 * narsa oʻzgarmaydi — cookie ishlaydi.
 */

import { useSyncExternalStore } from 'react';
import { hashTokeni } from './sessiya-sarlavha';

/** Varaq xotirasidagi kalit. */
const TOKEN_KALITI = 'zs_sessiya';
/** `replaceState` hech qanday hodisa chiqarmaydi — havolalarga oʻzimiz aytamiz. */
const HASH_TOZALANDI = 'zs-sessiya-hash-tozalandi';

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

/** Hash'dan sessiya qismlari (`sessiya=…`, `kengaytma=1`) olinadi; begona qism qoladi. */
export function tokensizHash(hash: string): string {
  const qolgan = hash.replace(/^#/, '').split('&').filter((q) => q !== '' && !/^(?:sessiya|kengaytma)=/.test(q));
  return qolgan.length === 0 ? '' : `#${qolgan.join('&')}`;
}

type Oyna = Pick<Window, 'location' | 'history' | 'sessionStorage' | 'dispatchEvent'>;

/**
 * Kengaytma sessiyasi tokeni: hash'da kelgan boʻlsa — xotiraga oʻtkazilib, manzildan
 * olinadi; boʻlmasa — xotiradagisi. Oddiy saytda `null`.
 *
 * Manzil faqat xotiraga yozilgani OʻQIB tekshirilgandan keyin tozalanadi: xotira
 * xatosiz «yozib» hech narsa saqlamasa ham token yoʻqolmaydi.
 */
export function kengaytmaTokeni(oyna: Oyna = window): string | null {
  const t = hashTokeni(oyna.location.hash);
  let saqlangan: string | null = null;
  try {
    const xotira = oyna.sessionStorage;
    if (t !== null) xotira.setItem(TOKEN_KALITI, t);
    saqlangan = xotira.getItem(TOKEN_KALITI);
  } catch { /* xotira yoʻq (maxfiy rejim) — hash yagona nusxa */ }
  if (t === null) return saqlangan;
  if (saqlangan === t) {
    // Keyingi navbatda: Next.js `replaceState` ni oʻz effektida — sahifa
    // effektlaridan KEYIN — oʻraydi. Undan oldin chaqirilsa routerda tokenli
    // manzil qolib, keyingi yangilanishda qayta yozilardi. `null` holat bilan
    // Next oʻz holatini oʻzi koʻchiradi va yangi manzilni oladi.
    setTimeout(() => {
      if (hashTokeni(oyna.location.hash) !== t) return;
      const { pathname, search, hash } = oyna.location;
      oyna.history.replaceState(null, '', pathname + search + tokensizHash(hash));
      oyna.dispatchEvent(new Event(HASH_TOZALANDI));
    }, 0);
  }
  return t;
}

/** Soʻrovga `x-sessiya` sarlavhasi — kengaytmada; oddiy saytda boʻsh (cookie). */
export function sessiyaSarlavhasi(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const t = kengaytmaTokeni();
  return t ? { 'x-sessiya': t } : {};
}

function hashniKuzat(yangilandi: () => void): () => void {
  window.addEventListener('hashchange', yangilandi);
  window.addEventListener(HASH_TOZALANDI, yangilandi);
  return () => {
    window.removeEventListener('hashchange', yangilandi);
    window.removeEventListener(HASH_TOZALANDI, yangilandi);
  };
}

/**
 * Joriy sahifaning tokenli hash'i — u faqat xotira ishlamaganda manzilda qoladi.
 * Serverda, oddiy saytda va token xotiraga oʻtgach — boʻsh satr.
 */
export function useKengaytmaHashi(): string {
  return useSyncExternalStore(hashniKuzat, () => kengaytmaHashi(window.location.hash), () => '');
}
