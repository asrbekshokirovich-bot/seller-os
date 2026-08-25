/**
 * "Bazamizda bugun" raqamlarini statik sahifaga qoʻyish.
 *
 * NEGA BU QATʼIY. Sahifadagi sarlavha "Har bir raqam oʻlchangan"
 * deb turadi va odam bu raqamlarga qarab qaror qabul qiladi.
 * Yaʼni eskirgan raqam — shunchaki nomukammallik emas, daʼvoning
 * oʻzini yolgʻonga aylantiradi.
 *
 * Shuning uchun UCH holat aniq ajratilgan va hech biri ikkinchisiga
 * oʻxshamaydi:
 *
 *   yangi    — jonli oʻlchov, bir soatdan yosh
 *   eskirgan — oxirgi muvaffaqiyatli oʻlchov, YOSHI bilan aytiladi
 *   yoʻq     — hech qachon olinmagan: raqam oʻrnida chiziqcha
 *
 * Statik faylda RAQAM UMUMAN YOʻQ. Ilgari u yerda "zaxira" deb
 * qoʻlda yozilgan sonlar turardi; bir kunda ular 322 099 taga
 * eskirdi va baza javob bermaganda YANGI boʻlib koʻrinardi.
 * Endi `qurish.mjs` belgilangan joyda raqam qolsa qurishni
 * toʻxtatadi.
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
  /** Baza oʻlchagan sana (`YYYY-MM-DD`, Toshkent). */
  olchandi?: string;
}

/** Oʻlchov va u QACHON olingani. */
export interface Olchov {
  qiymat: Bazamiz;
  /** Soʻrov muvaffaqiyatli boʻlgan payt (ms). */
  vaqt: number;
}

/** Shu yoshdan katta oʻlchov "yangi" deb atalmaydi. */
export const YANGI_MS = 60 * 60 * 1000;

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
 * Oʻlchov yoshini odam tilida aytadi.
 *
 * Aniqlik ATAYLAB pastroq: "2 soat oldin" yetarli, "2 soat 14
 * daqiqa" esa aniqlik taassurotini beradi va u bu yerda ortiqcha.
 */
export function yosh(ms: number): string {
  const daqiqa = Math.floor(ms / 60_000);
  if (daqiqa < 1) return 'hozirgina';
  if (daqiqa < 60) return `${daqiqa} daqiqa oldin`;
  const soat = Math.floor(daqiqa / 60);
  if (soat < 24) return `${soat} soat oldin`;
  const kun = Math.floor(soat / 24);
  return `${kun} kun oldin`;
}

/**
 * Raqamlar ostidagi jumla.
 *
 * Har uch holatda BOSHQACHA yoziladi. Eskirgan oʻlchov "bugungi"
 * deb koʻrsatilmaydi va uning yoshi yashirilmaydi.
 */
export function holatMatni(o: Olchov | null, hozir: number): string {
  if (o === null) {
    return 'Raqamlar hozir olinmadi — bazaga ulanib boʻlmadi. '
      + 'Eski raqam koʻrsatilmaydi.';
  }
  const qari = hozir - o.vaqt;
  if (qari < YANGI_MS) {
    return `${o.qiymat.olchandi ?? ''} holatiga. `.trimStart()
      + 'Raqamlar bazadan olinadi va har kuni oʻzgaradi.';
  }
  return `Bu raqamlar ${yosh(qari)} oʻlchangan`
    + `${o.qiymat.olchandi ? ` (${o.qiymat.olchandi})` : ''}. `
    + 'Bazaga hozir ulanib boʻlmadi, shuning uchun yangilanmadi.';
}

/**
 * Hamma raqamni va holat jumlasini qoʻyadi.
 *
 * `null` — hech qachon oʻlchov olinmagan. Unda raqamlar
 * CHIZIQCHA boʻlib qoladi: notoʻgʻri son yoʻqligidan qimmat.
 */
export function bazamizniQoy(
  matn: string,
  o: Olchov | null,
  hozir: number,
): string {
  let n = qoy(matn, 'holat', holatMatni(o, hozir));
  if (o === null) return n;
  const b = o.qiymat;
  if (typeof b.tovar === 'number') n = qoy(n, 'tovar', son(b.tovar));
  if (typeof b.dokon === 'number') n = qoy(n, 'dokon', son(b.dokon));
  if (typeof b.turkum === 'number') n = qoy(n, 'turkum', son(b.turkum));
  if (typeof b.kunlik === 'number') n = qoy(n, 'kunlik', son(b.kunlik));
  return n;
}
