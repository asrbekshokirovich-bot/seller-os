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

import { boshlangichHolat, keyingi } from '@selleros/shared';
import Suhbat from './Suhbat';
import type { Keyingi } from './suhbatYordam';

/**
 * Yangi mijozga salom va birinchi savol — sahifa bilan birga (ikkinchi koʻrik, 9-taklif): ular har doim
 * bir xil. Build paytida hisoblanadi; server javobi orqada kelib oʻrnini oladi.
 */
const BOSHLANGICH = JSON.parse(JSON.stringify(keyingi(boshlangichHolat()))) as Keyingi;

export default function Usta() {
  return <Suhbat til="uz" boshlangich={BOSHLANGICH} />;
}
