/**
 * Usta uchun sarlavha va brauzer paneli rangi.
 *
 * Shriftlar ildiz layoutda (`../shriftlar.css`) — hamma sahifa uchun bitta.
 * Sahifa ikki statik nusxa (`page.tsx` — oʻzbekcha, `ru/page.tsx` —
 * ruscha); ikkalasi uchun umumiy metadata shu yerda.
 */

import type { Metadata, Viewport } from 'next';

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
  themeColor: '#13100C',
};

export default function UstaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
