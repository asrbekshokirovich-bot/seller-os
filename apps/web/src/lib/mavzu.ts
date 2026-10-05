/**
 * Mavzu (yorugʻ / tungi) — hamma sahifa uchun bitta joyda.
 *
 * Tanlov brauzerda (`so_mavzu`) saqlanadi: bosh sahifada tanlansa, Usta
 * va Kirish ham shunday ochiladi. Standart — tungi (nazoratchi qarori,
 * 2026-09-24). Oʻqib yoki yozib boʻlmasa (xususiy oyna) — jim, standart.
 *
 * MILTILLAMASIN: ranglar `<html data-mavzu>` ga bogʻlangan va bu atributni
 * ildiz layoutdagi kichik skript (`mavzu-skript.ts`) sahifa chizilishidan
 * OLDIN qoʻyadi. React holati faqat tugmalar uchun; rang undan kutmaydi.
 * Shu sababli yorugʻ mavzudagi odam avval qorani koʻrmaydi, tungi
 * sahifada esa brauzerning oq aylantirish chizigʻi va oq fon chiqmaydi.
 */

import { useLayoutEffect, useState } from 'react';
import { MAVZU_KALIT as KALIT, PANEL_RANGI } from './mavzu-skript';

export type Mavzu = 'tungi' | 'yorug';

function oqi(): Mavzu {
  try {
    const s = localStorage.getItem(KALIT);
    if (s === 'yorug' || s === 'tungi') return s;
  } catch { /* saqlangan qiymat yoʻq — bu xato emas */ }
  return 'tungi';
}

function qoy(m: Mavzu) {
  document.documentElement.setAttribute('data-mavzu', m);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PANEL_RANGI[m]);
}

export function useMavzu(): [Mavzu, (m: Mavzu) => void] {
  const [mavzu, setMavzu] = useState<Mavzu>('tungi');
  // Chizishdan oldin: holat tugmalar uchun moslanadi; atribut qayta qoʻyiladi
  // (dev rejimdagi Strict Mode qayta oʻrnatishda React uni tozalaydi).
  useLayoutEffect(() => {
    const m = oqi();
    qoy(m);
    setMavzu(m);
  }, []);
  const tanla = (m: Mavzu) => {
    setMavzu(m);
    qoy(m);
    try { localStorage.setItem(KALIT, m); } catch { /* jim */ }
  };
  return [mavzu, tanla];
}
