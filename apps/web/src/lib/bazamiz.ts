/**
 * "Bazamizda bugun" raqamlarini statik sahifaga qoʻyish.
 *
 * Sahifa dizayn vositasidan chiqqan tayyor HTML. Raqamlar unda
 * `data-bazamiz="kalit"` bilan belgilangan; bu yerda oʻsha
 * belgilarning ICHI almashtiriladi.
 *
 * Alohida fayl, `route.ts` ichida emas: Next marshrut faylidan
 * faqat HTTP usullarini eksport qilishga ruxsat beradi, yaʼni
 * yordamchilarni u yerdan sinab boʻlmasdi.
 */

export interface Bazamiz {
  tovar?: number;
  dokon?: number;
  turkum?: number;
  kunlik?: number;
  olchandi?: string;
}

/** `1850863` → `1 850 863`. Dizaynda ajratgich — oddiy boʻshliq. */
export function son(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * `data-bazamiz="kalit"` elementining ichini almashtiradi.
 *
 * Belgi topilmasa matn OʻZGARMASDAN qaytadi. Bu holat qurish
 * paytida ham tekshiriladi (`qurish.mjs`, `bazamizBelgilari`),
 * yaʼni belgi yoʻqolsa sayt umuman qurilmaydi.
 */
export function qoy(matn: string, kalit: string, qiymat: string): string {
  const naqsh = new RegExp(
    `(<(\\w+)[^>]*data-bazamiz="${kalit}"[^>]*>)([^<]*)(</\\2>)`,
  );
  return matn.replace(naqsh, (_, ochilish, __, ___, yopilish) =>
    `${ochilish}${qiymat}${yopilish}`);
}

/**
 * Hamma raqamni qoʻyadi.
 *
 * `null` — baza javob bermadi. Unda matn oʻzgarmaydi va sahifa
 * QURISH PAYTIDAGI raqamlar bilan chiqadi, oʻz sanasi bilan.
 * Nol koʻrsatilmaydi: sotuv sahifasidagi "0 tovar" nosozlikni
 * mahsulot haqidagi yolgʻonga aylantirardi.
 */
export function bazamizniQoy(matn: string, b: Bazamiz | null): string {
  if (b === null) return matn;
  let n = matn;
  if (typeof b.tovar === 'number') n = qoy(n, 'tovar', son(b.tovar));
  if (typeof b.dokon === 'number') n = qoy(n, 'dokon', son(b.dokon));
  if (typeof b.turkum === 'number') n = qoy(n, 'turkum', son(b.turkum));
  if (typeof b.kunlik === 'number') n = qoy(n, 'kunlik', son(b.kunlik));
  if (typeof b.olchandi === 'string') n = qoy(n, 'olchandi', b.olchandi);
  return n;
}
