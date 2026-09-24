/**
 * Usta uchun shriftlar.
 *
 * Yangi dizayn (`ZUMSavdo Chat.dc.html`, 2026-09-24 da nazoratchi
 * tasdiqlagan) ikkita shrift ishlatadi: Instrument Sans (matn) va
 * JetBrains Mono (raqamlar). Boshqasini tanlash — dizayndan chetga
 * chiqish, shuning uchun aynan shu ikkitasi.
 *
 * Ular qurish paytida yuklab olinadi va oʻzimizdan beriladi:
 * ish vaqtida Google ga soʻrov ketmaydi.
 *
 * `latin-ext` ATAYLAB: oʻzbek lotinidagi `oʻ` va `gʻ` belgisi
 * (U+02BB) va `ʼ` asosiy `latin` toʻplamida yoʻq — ularsiz har
 * "oʻ" boshqa shriftda chizilib, soʻz ichida sakrab turardi.
 *
 * Sahifaning oʻzi `'use client'`, shrift esa server tomonda
 * yuklanishi kerak — shuning uchun alohida layout.
 */

import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, JetBrains_Mono } from 'next/font/google';

const sans = Instrument_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ZumSavdo — Usta',
  description: 'Uzumda nima sotishni raqamlar bilan tanlang.',
};

/*
 * Standart mavzu — tungi (nazoratchi qarori, 2026-09-24). Brauzer
 * paneli ham shunga mos boʻlsin, aks holda telefonda tepada oq
 * chiziq qolardi.
 */
export const viewport: Viewport = {
  themeColor: '#0B0B0B',
};

export default function UstaLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${sans.variable} ${mono.variable}`}>{children}</div>;
}
