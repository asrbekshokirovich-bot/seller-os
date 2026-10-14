'use client';

/**
 * Obuna holati va toʻlovga oʻtish — «Obuna» ekrani, «Profilim» va chatdagi «Obuna»
 * savoli uchun bitta joyda (nazoratchi, 2026-10-14: 149 000 soʻm/oy, faqat Payme/Click).
 * Narx va buyurtma — serverda (`/api/tolov/boshla`); bu yerda faqat holat va yoʻnaltirish.
 */

import { useEffect, useState } from 'react';
import type { Reja } from '@selleros/shared';

export type Provayder = 'payme' | 'click';

export interface ObunaHolati {
  /** Amaldagi reja (`/api/tarif`). Bilinmaguncha — `bepul`. */
  joriy: Reja;
  /** Qaysi provayder sozlangan (`/api/tolov/holat`). Bilinmaguncha — `null`: toʻlov tugmasi oʻchiq. */
  ulangan: Record<Provayder, boolean> | null;
}

/** `sarlavha` — kengaytma rejimida sessiya tokeni (`x-sessiya`), saytda — boʻsh. */
export function useObunaHolati(sarlavha: () => Record<string, string>): ObunaHolati {
  const [holat, setHolat] = useState<ObunaHolati>({ joriy: 'bepul', ulangan: null });
  useEffect(() => {
    let tirik = true;
    void (async () => {
      const [tarif, tolov] = await Promise.all([
        fetch('/api/tarif', { cache: 'no-store', headers: sarlavha() }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/tolov/holat', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]) as [{ reja?: unknown } | null, { tolov?: { payme?: unknown; click?: unknown } } | null];
      if (!tirik) return;
      setHolat({
        joriy: tarif?.reja === 'pro' || tarif?.reja === 'biznes' ? tarif.reja : 'bepul',
        ulangan: tolov?.tolov ? { payme: tolov.tolov.payme === true, click: tolov.tolov.click === true } : null,
      });
    })();
    return () => { tirik = false; };
  }, [sarlavha]);
  return holat;
}

/**
 * Payme yoki Click sahifasiga oʻtish. Muvaffaqiyatda sahifa almashadi va `null` qaytadi;
 * boʻlmasa — sababi (`ulanmagan` — provayder sozlanmagan, `xato` — boshqa).
 */
export async function tolovgaOt(provayder: Provayder, sarlavha: Record<string, string>): Promise<'ulanmagan' | 'xato' | 'tarmoq' | null> {
  let r: Response;
  try {
    r = await fetch('/api/tolov/boshla', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...sarlavha },
      body: JSON.stringify({ provayder }),
    });
  } catch {
    return 'tarmoq';
  }
  const d = (await r.json().catch(() => null)) as { checkoutUrl?: unknown; xato?: unknown } | null;
  if (r.ok && typeof d?.checkoutUrl === 'string' && /^https:\/\//u.test(d.checkoutUrl)) {
    window.location.assign(d.checkoutUrl);
    return null;
  }
  return r.status === 503 && d?.xato === 'toʻlov ulanmagan' ? 'ulanmagan' : 'xato';
}
