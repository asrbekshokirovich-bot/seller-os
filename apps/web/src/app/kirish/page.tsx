/**
 * Kirish — `/kirish`. Dizayn: `dizayn/ZumSavdo-Veb.html`, w2 va w3.
 *
 * Jonli son (kuzatilayotgan tovarlar) serverda qoʻyiladi — bosh sahifa
 * bilan bir kesh (`bazamizOl.ts`), brauzerda sakramaydi.
 */

import type { Metadata } from 'next';
import { after } from 'next/server';
import { bazamizniKutibOl } from '@/lib/bazamizOl';
import { tarjima } from '@/lib/til';
import { serverTili } from '@/lib/til-server';
import Kirish from './Kirish';

export const dynamic = 'force-dynamic';

/** Sarlavha va tavsif — sahifa tilida (`so_til` cookie). */
export async function generateMetadata(): Promise<Metadata> {
  const tr = tarjima(await serverTili());
  return {
    title: tr('ZumSavdo — Kirish', 'ZumSavdo — Вход'),
    description: tr(
      'Suhbatingiz hisobingizga bogʻlanadi va istalgan qurilmada ochiladi.',
      'Чат привяжется к аккаунту и откроется на любом устройстве.',
    ),
  };
}

export default async function Page() {
  // Baza sekin boʻlsa sahifa 4 s dan ortiq kutmaydi (`bazamizniKutibOl`).
  const o = await bazamizniKutibOl(Date.now(), 4000, (sorov) => after(() => sorov));
  return <Kirish tovar={o && typeof o.qiymat.tovar === 'number' ? o.qiymat.tovar : null} til={await serverTili()} />;
}
