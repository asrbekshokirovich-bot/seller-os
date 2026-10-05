import type { Metadata, Viewport } from 'next';
import { preload } from 'react-dom';
import { MAVZU_SKRIPTI, PANEL_RANGI } from '@/lib/mavzu-skript';
import './shriftlar.css';
import './globals.css';

/*
 * Havola boshqa joyda ulashilganda (Telegram, Facebook, X) koʻrinadigan
 * karta. `og:title` / `og:description` har sahifaning oʻz sarlavha va
 * tavsifidan olinadi (Next ularni `openGraph` da berilmasa sahifanikidan
 * qoʻyadi); rasm — shu papkadagi `opengraph-image.png`. `metadataBase` —
 * rasm manzili toʻliq URL boʻlishi uchun.
 */
export const metadata: Metadata = {
  metadataBase: new URL('https://zumsavdo.vercel.app'),
  title: 'ZumSavdo — Usta',
  description: 'Uzumda nima sotishni raqamlar bilan tanlang.',
  openGraph: {
    type: 'website',
    siteName: 'ZumSavdo',
    locale: 'uz_UZ',
    alternateLocale: ['ru_RU'],
  },
  twitter: { card: 'summary_large_image' },
};

/*
 * Brauzer panelining rangi — hamma sahifa uchun (standart mavzu tungi).
 * Yorugʻ mavzuda head skripti uni chizishdan oldin almashtiradi.
 */
export const viewport: Viewport = {
  themeColor: PANEL_RANGI.tungi,
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
