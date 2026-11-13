import type { MetadataRoute } from 'next';
// Nisbiy yoʻl — `@/` taxallusi vitest da yoʻq, test bu faylni toʻgʻridan-toʻgʻri oʻqiydi.
import { PANEL_RANGI } from '../lib/mavzu-skript';

/**
 * Veb-ilova manifesti — `/manifest.webmanifest` (Next.js uni `<head>` ga
 * oʻzi ulaydi).
 *
 * Android ilova (`apps/android` — saytni Chrome orqali manzil satrisiz,
 * toʻliq ekranda ochadi) va telefondagi «Bosh ekranga qoʻshish» nom, rang
 * va ikonkani shu yerdan oladi. Rang — sahifa fonining oʻzi (standart mavzu
 * yorugʻ, `mavzu-skript.ts`); ikonkalar — `icon.svg` dan chizilgan PNG lar
 * (`public/ilova/`). Android tomondagi nusxasi — `apps/android/twa-manifest.json`;
 * ikkalasi bir xilligini `test/ilova.test.ts` tekshiradi.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'ZumSavdo — Uzumda savdo yordamchisi',
    short_name: 'ZumSavdo',
    description: 'Uzumda nima sotishni raqamlar bilan tanlang.',
    lang: 'uz',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: PANEL_RANGI.yorug,
    theme_color: PANEL_RANGI.yorug,
    icons: [
      { src: '/ilova/ikonka-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/ilova/ikonka-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/ilova/ikonka-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
