/**
 * Kirish — `/kirish`. Dizayn: `dizayn/ZumSavdo-Veb.html`, w2 va w3.
 *
 * Jonli son (kuzatilayotgan tovarlar) serverda qoʻyiladi — bosh sahifa
 * bilan bir kesh (`bazamizOl.ts`), brauzerda sakramaydi.
 */

import type { Metadata, Viewport } from 'next';
import { bazamizniOl } from '@/lib/bazamizOl';
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
  const o = await bazamizniOl(Date.now());
  return <Kirish tovar={o && typeof o.qiymat.tovar === 'number' ? o.qiymat.tovar : null} til={await serverTili()} />;
}
