'use client';

/**
 * Sahifalar orasidagi ichki havola — oddiy `<a>`, faqat kengaytma yon panelida
 * (`#sessiya=…`) manzilga tokenli hash qoʻshiladi va keyingi sahifa ham shu
 * sessiya bilan ochiladi (`lib/kengaytma.ts`). Oddiy saytda farqi yoʻq.
 */

import type { ComponentProps } from 'react';
import { hashBilan, useKengaytmaHashi } from '@/lib/kengaytma';

export function Havola({ href, onClick, ...qolgan }: ComponentProps<'a'> & { href: string }) {
  const hash = useKengaytmaHashi();
  return (
    <a
      {...qolgan}
      href={hashBilan(href, hash)}
      onClick={(e) => {
        onClick?.(e);
        // Sahifa ichidagi langar (`#yol`) kengaytmada manzildagi tokenni oʻchirib
        // yuborardi — oʻrniga oʻzimiz aylantiramiz, tokenli hash joyida qoladi.
        if (hash !== '' && href.startsWith('#') && !e.defaultPrevented) {
          e.preventDefault();
          document.getElementById(href.slice(1))?.scrollIntoView();
        }
      }}
    />
  );
}
