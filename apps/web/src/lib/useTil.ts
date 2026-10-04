/**
 * Til holati sahifalar uchun (bosh, Kirish, Usta).
 *
 * Boshlanishi SERVERDAN (`so_til` cookie: bosh sahifa va Kirish —
 * `serverTili`, Usta — `next.config.mjs` dagi rewrite) — sahifa darhol
 * shu tilda chiziladi, brauzerda keyin almashib miltillamaydi. Brauzer
 * xotirasida boshqa til boʻlsa (cookie paydo boʻlishidan oldin tanlangan
 * yoki kengaytma ramkasi) — oʻsha olinadi va cookie yoziladi: keyingi
 * ochilishda server ham biladi.
 */

import { useLayoutEffect, useState } from 'react';
import { saqlanganTil, tilCookiesi, tilniQoy, tilniSaqla, type Til } from './til';

export function useTil(boshTil: Til): [Til, (t: Til) => void] {
  const [til, setTil] = useState<Til>(boshTil);
  useLayoutEffect(() => {
    const t = saqlanganTil();
    if (t && t !== boshTil) {
      setTil(t);
      tilCookiesi(t);
    }
    tilniQoy(t ?? boshTil);
  }, [boshTil]);
  const tanla = (t: Til) => {
    setTil(t);
    tilniSaqla(t);
  };
  return [til, tanla];
}
