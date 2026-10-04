/**
 * Server sahifalar uchun til: `so_til` cookie (`tilniSaqla` yozadi).
 *
 * Sahifa darhol toʻgʻri tilda chiziladi — brauzerda keyin oʻgirilsa,
 * rus tilini tanlagan odam avval oʻzbekcha matnni koʻrardi (miltillash).
 * Cookie yoʻq boʻlsa — oʻzbekcha (standart); brauzer xotirasida boshqa
 * til boʻlsa, sahifa uni oʻqib cookie ni ham yozadi (bir martalik).
 */

import { cookies } from 'next/headers';
import { TIL_COOKIE, type Til } from './til';

export async function serverTili(): Promise<Til> {
  return (await cookies()).get(TIL_COOKIE)?.value === 'ru' ? 'ru' : 'uz';
}
