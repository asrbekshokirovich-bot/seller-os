/**
 * Usta uchun shriftlar va sarlavha.
 *
 * Shriftlar `../shriftlar.ts` da — bosh sahifa bilan bir xil.
 * Sahifaning oʻzi `'use client'`, shrift esa server tomonda
 * yuklanishi kerak — shuning uchun alohida layout.
 */

import type { Metadata, Viewport } from 'next';
import { mono, sans } from '../shriftlar';

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
