/**
 * Yangi dizayn shriftlari — bosh sahifa va Usta uchun BITTA joyda.
 *
 * Ikkala sahifa ham `ZUMSavdo … .dc.html` dizaynidan (2026-09-24):
 * Instrument Sans (matn) va JetBrains Mono (raqamlar). Ikki joyda
 * alohida chaqirilsa, bir xil shrift ikki marta yuklanardi va biri
 * oʻzgarsa ikkinchisi eski qolardi.
 *
 * Qurish paytida yuklab olinadi va oʻzimizdan beriladi: ish vaqtida
 * Google ga soʻrov ketmaydi.
 *
 * `latin-ext` ATAYLAB: oʻzbek lotinidagi `oʻ`, `gʻ` (U+02BB) va `ʼ`
 * asosiy `latin` toʻplamida yoʻq — ularsiz har "oʻ" boshqa shriftda
 * chizilib, soʻz ichida sakrab turardi.
 *
 * KIRILL (ruscha, 2026-09-25). Instrument Sans da kirill harflari
 * YOʻQ. Shuning uchun ruscha matn uchun alohida shrift — Onest
 * (shunga yaqin geometrik grotesk) — FAQAT `cyrillic` toʻplami bilan.
 * CSS da u Instrument Sans dan OLDIN turadi (`var(--font-kirill),
 * var(--font-sans)`): uning `unicode-range` i faqat kirill, shuning
 * uchun lotin harflari baribir Instrument Sans ga oʻtadi.
 * `adjustFontFallback: false` ATAYLAB: aks holda Next unga Arial
 * asosidagi zaxira shrift qoʻshardi, u esa unicode-range siz — lotin
 * harflarini ham "ushlab" Instrument Sans ni butunlay yopib qoʻyardi.
 * JetBrains Mono da kirill bor — unga shunchaki toʻplam qoʻshildi.
 */

import { Instrument_Sans, JetBrains_Mono, Onest } from 'next/font/google';

export const sans = Instrument_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

export const kirill = Onest({
  subsets: ['cyrillic'],
  weight: ['400', '500', '600'],
  variable: '--font-kirill',
  display: 'swap',
  adjustFontFallback: false,
});

export const mono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});
