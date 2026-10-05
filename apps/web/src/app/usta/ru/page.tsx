/**
 * `/usta` ning ruscha nusxasi. `next.config.mjs` dagi rewrite `so_til=ru`
 * cookie bilan kelgan `/usta` soʻrovini shu yerga buradi (manzil satrida
 * `/usta` qoladi). Statik — xuddi oʻzbekchasi kabi (`../page.tsx`).
 */

import type { Metadata } from 'next';
import Suhbat from '../Suhbat';

export const metadata: Metadata = {
  title: 'ZumSavdo — Мастер',
  description: 'Выберите по цифрам, что продавать на Uzum.',
};

export default function UstaRu() {
  return <Suhbat til="ru" />;
}
