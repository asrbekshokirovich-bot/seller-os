/**
 * Panel qulfining sof qismi — Next ga bogʻliq emas.
 *
 * `lib/panel.ts` dan ajratilgan: u `next/headers` ni chaqiradi va
 * uni oddiy Node testida import qilib boʻlmaydi. Qaror mantiqi
 * (kalit toʻgʻrimi) esa aynan testlanishi kerak boʻlgan joy.
 */

import { createHash, timingSafeEqual } from 'node:crypto';

export const PANEL_COOKIE = 'so_panel';

/** Sozlangan kalit. Boʻsh boʻlsa panel yopiq. */
export function kalit(): string {
  return process.env.PANEL_KALITI ?? '';
}

export function xesh(matn: string): string {
  return createHash('sha256').update(matn).digest('hex');
}

/**
 * Ikki sirni solishtiradi.
 *
 * `===` emas: u birinchi farqda toʻxtaydi va javob vaqti orqali
 * "nechta harf toʻgʻri" degan maʼlumot sizib chiqadi. Uzunlik
 * baribir sizadi, mazmun esa yoʻq.
 */
export function togrimi(berilgan: string, kutilgan: string): boolean {
  if (!kutilgan || !berilgan) return false;
  const a = Buffer.from(berilgan, 'utf8');
  const b = Buffer.from(kutilgan, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
