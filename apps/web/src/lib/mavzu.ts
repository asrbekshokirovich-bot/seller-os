/**
 * Mavzu (yorugʻ / tungi) — hamma sahifa uchun bitta joyda.
 *
 * Tanlov brauzerda (`so_mavzu`) saqlanadi: bosh sahifada tanlansa, Usta
 * va Kirish ham shunday ochiladi. Standart — tungi (nazoratchi qarori,
 * 2026-09-24). Oʻqib yoki yozib boʻlmasa (xususiy oyna) — jim, standart.
 */

import { useEffect, useState } from 'react';

export type Mavzu = 'tungi' | 'yorug';

const KALIT = 'so_mavzu';

export function useMavzu(): [Mavzu, (m: Mavzu) => void] {
  const [mavzu, setMavzu] = useState<Mavzu>('tungi');
  useEffect(() => {
    try {
      const s = localStorage.getItem(KALIT);
      if (s === 'yorug' || s === 'tungi') setMavzu(s);
    } catch { /* saqlangan qiymat yoʻq — bu xato emas */ }
  }, []);
  const tanla = (m: Mavzu) => {
    setMavzu(m);
    try { localStorage.setItem(KALIT, m); } catch { /* jim */ }
  };
  return [mavzu, tanla];
}
