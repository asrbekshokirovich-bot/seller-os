/**
 * `/usta` ning ruscha nusxasi. `next.config.mjs` dagi rewrite `so_til=ru`
 * cookie bilan kelgan `/usta` soʻrovini shu yerga buradi (manzil satrida
 * `/usta` qoladi). Statik — xuddi oʻzbekchasi kabi (`../page.tsx`).
 */

import type { Metadata } from 'next';
import { boshlangichHolat, keyingi } from '@selleros/shared';
import Suhbat from '../Suhbat';
import type { Keyingi } from '../suhbatYordam';

export const metadata: Metadata = {
  title: 'ZumSavdo — Помощник',
  description: 'Выберите по цифрам, что продавать на Uzum.',
};

/** Yangi mijozga salom darhol (9-taklif) — oʻzbekchasi bilan bir xil savol, matni ruscha (`savol.ru`). */
const BOSHLANGICH = JSON.parse(JSON.stringify(keyingi(boshlangichHolat()))) as Keyingi;

export default function UstaRu() {
  return <Suhbat til="ru" boshlangich={BOSHLANGICH} />;
}
