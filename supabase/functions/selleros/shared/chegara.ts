/**
 * 4-qadam — Xitoydagi CHEGARA narx.
 *
 * `tannarx.ts` Xitoy narxidan FOYDANI chiqaradi. 4-qadamda esa
 * teskari savol turadi: "shu sotuv narxi va shu marja bilan Xitoyda
 * MAKSIMUM qancha to'lash mumkin?" Javob 5-qadamda 1688 ni filtrlash
 * chegarasi bo'ladi — ikki qadamni bitta zanjir qiladigan narsa shu.
 *
 *   chegara = sotuv_narxi × (1 − marja%) − komissiya − uzum_logistikasi − kargo
 *
 * Hamma qism SO'MDA. Xitoy narxi yuanda kelsa 5-qadam kursni
 * qo'llaydi — bu yerda emas, chunki kurs o'lchov, taxmin emas.
 *
 * YETISHMAGAN QISM TO'QILMAYDI (QOIDALAR.md, 4-bo'lim). Kargo
 * stavkasi bo'lmasa chegara kargo SIZ hisoblanadi va `yetishmaydi`
 * ro'yxatida "kargo" turadi — obunachi buni ko'radi va chegara
 * aslida PASTROQ ekanini biladi. Komissiya bo'lmasa hisob umuman
 * qaytmaydi: u eng katta chegirma va usiz raqam yolg'on bo'lardi.
 */

export interface ChegaraKirishi {
  sotuvNarxiSom: number | null;
  marjaFoizi: number | null;
  komissiyaFoizi: number | null;
  /** Uzum ombordan xaridorgacha yig'imi, so'm (FORMULA.md 2-bo'lim). */
  uzumLogistikaSom: number | null;
  /** Xitoydan omborgacha, 1 dona uchun, so'm. Bo'lmasa `null`. */
  kargoSom: number | null;
}

export interface ChegaraNatijasi {
  /** Xitoyda 1 dona uchun maksimal narx, so'm. `null` — hisoblab bo'lmadi. */
  chegaraSom: number | null;
  /** Hisobga KIRMAGAN qismlar — obunachiga ko'rsatiladi. */
  yetishmaydi: string[];
  /** Ochiq hisob — odam o'qiydigan qator. */
  hisob: string | null;
}

export function chegaraNarxi(k: ChegaraKirishi): ChegaraNatijasi {
  const yetishmaydi: string[] = [];
  if (k.sotuvNarxiSom === null || k.sotuvNarxiSom <= 0) yetishmaydi.push('sotuv narxi');
  if (k.marjaFoizi === null || k.marjaFoizi < 0 || k.marjaFoizi >= 100) yetishmaydi.push('marja');
  if (k.komissiyaFoizi === null) yetishmaydi.push('komissiya');
  if (yetishmaydi.length) return { chegaraSom: null, yetishmaydi, hisob: null };

  const sotuv = k.sotuvNarxiSom as number;
  const marja = k.marjaFoizi as number;
  const komissiya = Math.round(sotuv * (k.komissiyaFoizi as number) / 100);
  const logistika = k.uzumLogistikaSom ?? 0;
  if (k.uzumLogistikaSom === null) yetishmaydi.push('Uzum logistikasi');
  const kargo = k.kargoSom ?? 0;
  if (k.kargoSom === null) yetishmaydi.push('kargo');

  const chegara = Math.max(0, Math.round(sotuv * (1 - marja / 100) - komissiya - logistika - kargo));
  const hisob =
    `${sotuv} soʻm × (1 − ${marja}%) − komissiya ${komissiya}` +
    (k.uzumLogistikaSom !== null ? ` − logistika ${logistika}` : '') +
    (k.kargoSom !== null ? ` − kargo ${kargo}` : '') +
    ` = ${chegara} soʻm`;
  return { chegaraSom: chegara, yetishmaydi, hisob };
}
