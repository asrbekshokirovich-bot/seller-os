/**
 * Yoʻlning 12 qadami — `packages/shared/src/ssenariy.ts` dagi
 * `SUHBAT_QADAMLARI` ning NUSXASI.
 *
 * Nega nusxa. Shared paket importlarni `.js` kengaytmasi bilan yozadi
 * (Node ESM), Metro esa ularni `.ts` ga yechmaydi. Butun paketni
 * ilovaga tortish oʻrniga shu kichik roʻyxat koʻchirildi.
 *
 * Nusxa manbadan ajralib ketmasligini `apps/mobile/test/sinxron.test.ts`
 * tekshiradi — farq boʻlsa CI qizaradi (QOIDALAR.md §8: ikki nusxa
 * boʻlgan joyda ular albatta bir kun farq qiladi).
 */

export interface Qadam { n: number; nom: string; qurilgan: boolean }

export const QADAMLAR: readonly Qadam[] = [
  { n: 1, nom: 'Tanishuv', qurilgan: true },
  { n: 2, nom: 'Yoʻnalish', qurilgan: true },
  { n: 3, nom: 'Tovar va miqdor', qurilgan: true },
  { n: 4, nom: 'Tannarx', qurilgan: true },
  { n: 5, nom: 'Xitoydan topish', qurilgan: true },
  { n: 6, nom: 'Buyurtma va kargo', qurilgan: true },
  { n: 7, nom: 'Rasmiylashtirish', qurilgan: true },
  { n: 8, nom: 'Qabul', qurilgan: false },
  { n: 9, nom: 'Studiya', qurilgan: false },
  { n: 10, nom: 'Yuklash', qurilgan: false },
  { n: 11, nom: 'Sotuv boshlandi', qurilgan: false },
  { n: 12, nom: 'Hisobot', qurilgan: false },
];

export function qadamNomi(n: number): string {
  return QADAMLAR.find((q) => q.n === n)?.nom ?? '';
}
