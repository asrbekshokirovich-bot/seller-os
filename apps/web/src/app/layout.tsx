import type { Metadata } from 'next';
import { preload } from 'react-dom';
import './shriftlar.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZumSavdo — Usta',
  description: 'Uzumda nima sotishni raqamlar bilan tanlang.',
};

/*
 * Lotin toʻplamlari birinchi chizishda kerak — oldindan yuklanadi, aks
 * holda sarlavha avval zaxira shriftda chiqib, keyin "sakrardi".
 * Qolgan toʻplamlar (kirill, math…) `unicode-range` boʻyicha kerak
 * boʻlganda yuklanadi.
 */
const OLDINDAN = ['/fonts/onest-latin.woff2', '/fonts/onest-latin-ext.woff2', '/fonts/unbounded-latin.woff2'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  for (const f of OLDINDAN) preload(f, { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
