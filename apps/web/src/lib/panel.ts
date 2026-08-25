/**
 * Oʻlchov paneliga kirish qulfi.
 *
 * NEGA QULF BOR. Panel foydalanuvchi sonini, konversiyani va
 * obuna holatini koʻrsatadi — bular ichki biznes raqamlari.
 * Ochiq qoldirilsa istalgan odam `/olchov` ni ochib koʻrardi.
 *
 * QULF YOPIQ HOLATDAN BOSHLANADI. `PANEL_KALITI` sozlanmagan
 * boʻlsa panel hech kimga ochilmaydi va sababini AYTADI. Teskarisi
 * — kalit yoʻqligida ochiq qolish — eng yomon yechim boʻlardi:
 * sozlash esdan chiqsa panel jimgina omma uchun ochilib ketardi.
 *
 * Cookie da kalitning OʻZI emas, `sha256` i turadi. Kirish huquqi
 * baribir shu bilan beriladi, lekin sir brauzerda yotmaydi —
 * bir xil parolni boshqa joyda ishlatgan odamni himoya qiladi.
 *
 * Sof qism (`kalit`, `xesh`, `togrimi`) `lib/qulf.ts` da: bu fayl
 * `next/headers` ni chaqiradi va oddiy Node testida yuklanmaydi.
 */

import { cookies } from 'next/headers';
import { PANEL_COOKIE, kalit, togrimi, xesh } from './qulf';

/** Panel holati — sahifa shu uchtasidan birini koʻrsatadi. */
export type PanelHolati = 'ochiq' | 'kalit-kerak' | 'sozlanmagan';

export async function holat(): Promise<PanelHolati> {
  const k = kalit();
  if (!k) return 'sozlanmagan';
  const c = (await cookies()).get(PANEL_COOKIE)?.value ?? '';
  return togrimi(c, xesh(k)) ? 'ochiq' : 'kalit-kerak';
}
