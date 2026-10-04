import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { MAVZU_SKRIPTI } from '@/lib/mavzu-skript';
import './shriftlar.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZumSavdo — Usta',
  description: 'Uzumda nima sotishni raqamlar bilan tanlang.',
};

/*
 * Lotin toʻplamlari birinchi chizishda kerak — oldindan yuklanadi, aks
 * holda sarlavha avval zaxira shriftda chiqib, keyin "sakrardi".
 * Kirill toʻplamlari — til ruscha boʻlsa head skripti oldindan yuklaydi
 * (`mavzu-skript.ts`); qolganlari (math…) `unicode-range` boʻyicha kerak
 * boʻlganda yuklanadi.
 */
const OLDINDAN = ['/fonts/onest-latin.woff2', '/fonts/onest-latin-ext.woff2', '/fonts/unbounded-latin.woff2'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  for (const f of OLDINDAN) preload(f, { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
  // `data-mavzu` va `lang` ni skript chizishdan oldin moslaydi — React farqni koʻrib xato bermasin (`suppressHydrationWarning`).
  return (
    <html lang="uz" data-mavzu="tungi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MAVZU_SKRIPTI }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
