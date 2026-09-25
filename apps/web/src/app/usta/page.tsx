'use client';

/**
 * Usta — `/usta`.
 *
 * 2026-09-25 gacha bu fayl uch savollik forma va natija kartalari
 * edi (2 000 qator). Nazoratchi topshirigʻi bilan u SUHBAT ga
 * almashdi: savol tartibini server (`/suhbat`) beradi, sahifa
 * chizadi. Eski oqim `git` tarixida (commit `8f73693` gacha).
 *
 * Nega alohida fayl: `Suhbat.tsx` sof mijoz komponenti; bu yerda
 * faqat marshrut turadi.
 */

import Suhbat from './Suhbat';

export default function Usta() {
  return <Suhbat />;
}
