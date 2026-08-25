/**
 * Usta uchun shriftlar.
 *
 * Dizayn qadogʻida ikkita shrift bor: Inter (154 marta) va
 * JetBrains Mono (72 marta). Boshqasini tanlash — dizayndan
 * chetga chiqish, shuning uchun aynan shu ikkitasi.
 *
 * Ular qurish paytida yuklab olinadi va oʻzimizdan beriladi:
 * ish vaqtida Google ga soʻrov ketmaydi.
 *
 * Sahifaning oʻzi `'use client'`, shrift esa server tomonda
 * yuklanishi kerak — shuning uchun alohida layout.
 */

import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ZumSavdo — Usta',
  description: 'Uzumda nima sotishni raqamlar bilan tanlang.',
};

export default function UstaLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${inter.variable} ${mono.variable}`}>{children}</div>;
}
