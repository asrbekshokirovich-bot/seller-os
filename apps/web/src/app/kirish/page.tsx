/**
 * Kirish — `/kirish`. Dizayn: `dizayn/ZumSavdo-Veb.html`, w2 va w3.
 *
 * Jonli son (kuzatilayotgan tovarlar) serverda qoʻyiladi — bosh sahifa
 * bilan bir kesh (`bazamizOl.ts`), brauzerda sakramaydi.
 */

import type { Metadata, Viewport } from 'next';
import { after } from 'next/server';
import { bazamizniKutibOl } from '@/lib/bazamizOl';
import { serverTili } from '@/lib/til-server';
import Kirish from './Kirish';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'ZumSavdo — Kirish',
  description: 'Suhbatingiz hisobingizga bogʻlanadi va istalgan qurilmada ochiladi.',
};

export const viewport: Viewport = {
  themeColor: '#13100C',
};

export default async function Page() {
  // Baza sekin boʻlsa sahifa 4 s dan ortiq kutmaydi (`bazamizniKutibOl`).
  const o = await bazamizniKutibOl(Date.now(), 4000, (sorov) => after(() => sorov));
  return <Kirish tovar={o && typeof o.qiymat.tovar === 'number' ? o.qiymat.tovar : null} til={await serverTili()} />;
}
