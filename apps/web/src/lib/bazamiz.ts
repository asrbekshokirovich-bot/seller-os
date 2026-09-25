/**
 * "Bazamiz" oʻlchovi — toza yordamchilar (tarmoqsiz).
 *
 * NEGA BU QATʼIY. Bosh sahifada "N tovar kuzatilmoqda" deb turadi va
 * odam bu raqamga qarab qaror qabul qiladi. Yaʼni eskirgan raqam —
 * shunchaki nomukammallik emas, daʼvoning oʻzini yolgʻonga aylantiradi.
 *
 * Shuning uchun UCH holat aniq ajratilgan va hech biri ikkinchisiga
 * oʻxshamaydi:
 *
 *   yangi    — jonli oʻlchov, bir soatdan yosh
 *   eskirgan — oxirgi muvaffaqiyatli oʻlchov, YOSHI bilan aytiladi
 *   yoʻq     — hech qachon olinmagan: raqam oʻrnida chiziqcha
 *
 * Ilgari bosh sahifa statik HTML edi va raqam unga matn almashtirish
 * bilan qoʻyilardi (`qoy`, `bazamizniQoy`). 2026-09-24 dan u React
 * sahifa — raqam oddiy prop, almashtirish kerak emas. Tarmoq qismi
 * `bazamizOl.ts` da; bu fayl brauzerda ham ishlaydi.
 */

import { tarjima, type Til } from './til';

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
 * Oʻlchov yoshini odam tilida aytadi.
 *
 * Aniqlik ATAYLAB pastroq: "2 soat oldin" yetarli, "2 soat 14
 * daqiqa" esa aniqlik taassurotini beradi va u bu yerda ortiqcha.
 */
export function yosh(ms: number, til: Til = 'uz'): string {
  const tr = tarjima(til);
  const daqiqa = Math.floor(ms / 60_000);
  if (daqiqa < 1) return tr('hozirgina', 'только что');
  // Ruschada qisqartma ("мин.", "ч.", "дн.") — son bilan kelishik
  // shakllari (минута/минуты/минут) kerak boʻlmaydi.
  if (daqiqa < 60) return tr(`${daqiqa} daqiqa oldin`, `${daqiqa} мин. назад`);
  const soat = Math.floor(daqiqa / 60);
  if (soat < 24) return tr(`${soat} soat oldin`, `${soat} ч. назад`);
  const kun = Math.floor(soat / 24);
  return tr(`${kun} kun oldin`, `${kun} дн. назад`);
}

/**
 * Raqamlar ostidagi jumla.
 *
 * Har uch holatda BOSHQACHA yoziladi. Eskirgan oʻlchov "bugungi"
 * deb koʻrsatilmaydi va uning yoshi yashirilmaydi.
 */
export function holatMatni(o: Olchov | null, hozir: number, til: Til = 'uz'): string {
  const tr = tarjima(til);
  if (o === null) {
    return tr(
      'Raqamlar hozir olinmadi — bazaga ulanib boʻlmadi. Eski raqam koʻrsatilmaydi.',
      'Цифры сейчас не получены — база недоступна. Старые цифры не показываем.',
    );
  }
  const qari = hozir - o.vaqt;
  if (qari < YANGI_MS) {
    return tr(
      `${o.qiymat.olchandi ?? ''} holatiga. `.trimStart()
        + 'Raqamlar bazadan olinadi va har kuni oʻzgaradi.',
      `${o.qiymat.olchandi ? `По состоянию на ${o.qiymat.olchandi}. ` : ''}`
        + 'Цифры берутся из базы и меняются каждый день.',
    );
  }
  const sana = o.qiymat.olchandi ? ` (${o.qiymat.olchandi})` : '';
  return tr(
    `Bu raqamlar ${yosh(qari)} oʻlchangan${sana}. `
      + 'Bazaga hozir ulanib boʻlmadi, shuning uchun yangilanmadi.',
    `Эти цифры измерены ${yosh(qari, 'ru')}${sana}. `
      + 'База сейчас недоступна, поэтому они не обновлены.',
  );
}
