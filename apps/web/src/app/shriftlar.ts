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
 */

import { Instrument_Sans, JetBrains_Mono } from 'next/font/google';

export const sans = Instrument_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

export const mono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});
