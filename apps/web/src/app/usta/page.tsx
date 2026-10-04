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
 *
 * STATIK, ikki nusxa: bu — oʻzbekcha, `ru/page.tsx` — ruscha. `so_til=ru`
 * cookie bilan kelgan soʻrovni `next.config.mjs` dagi rewrite CDN da
 * ruschasiga buradi — sahifa darhol tanlangan tilda chiziladi. Cookie ni
 * shu yerda oʻqish sahifani dinamik qilib, har ochilishni AQSh dagi
 * funksiyaga yuborardi (2026-10-01 oʻlchov: statik ~0.5 s, dinamik 1 s+).
 */

import Suhbat from './Suhbat';

export default function Usta() {
  return <Suhbat til="uz" />;
}
