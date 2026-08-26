/**
 * Tannarx — 1 dona tovarning haqiqiy narxi (reja B4).
 *
 * FORMULA.md, 2-boʻlim:
 *
 *   sof_foyda_1_dona = sotuv_narxi
 *                    − xitoy_narxi
 *                    − kargo(ogʻirlik, hajm)
 *                    − bojxona/QQS
 *                    − platforma_komissiyasi
 *
 * `qismlar.ts` da `Tannarx` turi va `marjaFoizi()` bor edi, lekin
 * uch qismni — kargo, bojxona/QQS va komissiyani — HECH NARSA
 * hisoblamasdi. Ular tayyor son sifatida kutilardi va hech kim
 * bermasdi, yaʼni `marja` doim `null` edi.
 *
 * Shu fayl oʻsha uch sonni chiqaradi.
 *
 * =====================================================================
 * BU HISOB TASDIQLANMAGAN — NAZORATCHIGA SAVOL
 * =====================================================================
 *
 * Ikki narsa huquqiy masala va men uni oʻlchay olmayman:
 *
 *  1. STAVKALAR. Boj foizi tovar kodiga (TIF TN) qarab oʻzgaradi,
 *     QQS va Uzum komissiyasi ham hujjatdan olinishi kerak. Ular bu
 *     yerda YOZILMAGAN — kirish sifatida keladi va boʻlmasa `null`
 *     qaytadi.
 *
 *  2. BOJ QAYSI SUMMADAN OLINADI. Bu yerda odatiy zanjir olingan:
 *     boj (xitoy narxi + kargo) dan, QQS esa (xitoy narxi + kargo +
 *     boj) dan. Zanjir toʻgʻriligini huquqiy hujjat tasdiqlashi
 *     kerak.
 *
 * Nega baribir yozildi: hisob bir joyda, ochiq va testlangan
 * boʻlsin. Stavka kelganda faqat son almashadi, mantiq emas.
 * Nima toʻqib qoʻyilmaydi — har yetishmagan kirish nomi bilan
 * `yetishmaydi` da qaytadi (QOIDALAR.md, 4-qoida).
 */

import type { Tannarx } from './qismlar.js';
import { marjaFoizi } from './qismlar.js';

/**
 * Kargo tarifi.
 *
 * Yuk tashuvchi ogʻirlik va hajmdan QAYSI BIRI QIMMAT boʻlsa
 * shuni oladi — bu sohaning odatiy qoidasi. Yengil, lekin katta
 * quti (yostiq, oʻyinchoq) ogʻirligi boʻyicha deyarli tekin
 * chiqardi, aslida esa u konteynerning joyini egallaydi.
 */
export interface KargoTarifi {
  somPerKg: number | null;
  somPerM3: number | null;
}

/** Bojxona stavkalari, foizda. */
export interface Boj {
  /** Import boji, %. Tovar kodiga qarab oʻzgaradi. */
  bojFoizi: number | null;
  /** QQS, %. */
  qqsFoizi: number | null;
}

export interface TannarxKirishi {
  /** Uzumdagi sotuv narxi (soʻm) — bizda oʻlchangan. */
  sotuvNarxiSom: number | null;
  /** 1688 dagi narx (yuan). 4-qadamda keladi. */
  xitoyNarxiYuan: number | null;
  /** Yuan → soʻm kursi. Yashirin oʻgirish boʻlmasin. */
  kursSomPerYuan: number | null;
  weightG: number | null;
  volumeMl: number | null;
  kargo: KargoTarifi;
  boj: Boj;
  /** Platforma komissiyasi, %. */
  komissiyaFoizi: number | null;
}

export interface TannarxNatijasi {
  /** `qismlar.marja()` va demping filtri kutadigan shakl. */
  tannarx: Tannarx;
  /** Bir dona uchun sof foyda (soʻm). `null` — hisoblab boʻlmadi. */
  sofFoydaSom: number | null;
  marjaFoizi: number | null;
  /**
   * Kargo qaysi asosdan olindi — ogʻirlikdanmi yoki hajmdanmi.
   * Foydalanuvchiga koʻrsatiladi: "nega kargo shunchalik qimmat?"
   * degan savolga javob shu.
   */
  kargoAsosi: 'ogirlik' | 'hajm' | null;
  /** Hisoblanmagan kirishlar nomi. Boʻsh boʻlsa — hammasi bor. */
  yetishmaydi: string[];
}

const BOSH: Tannarx = {
  sotuvNarxi: null, xitoyNarxi: null, kargo: null,
  bojxonaQqs: null, komissiya: null, uzumLogistika: null,
};

/**
 * Uzum marketpleys logistika tarifi — 2026-yil 1-iyundan.
 *
 * Manba: seller.uzum.uz/manual/uz/3.tariffs (3.2-boʻlim).
 *
 * Bu `kargo` dan BOSHQA xarajat: kargo Xitoydan omborgacha, bu esa
 * ombordan XARIDORGACHA. Tannarx hisobida u umuman yoʻq edi va
 * shuning uchun har bir marja 5 250 — 50 000 soʻmga oshib
 * koʻrsatilardi.
 */
export const UZUM_LOGISTIKA = {
  /** Birinchi litrgacha. */
  birinchiLitrSom: 5_250,
  /** Har qoʻshimcha litr. */
  qoshimchaLitrSom: 250,
  /** Yuqori chegara — bundan oshmaydi. */
  engKopSom: 50_000,
} as const;

/**
 * Hajmga qarab Uzum logistika yigʻimi.
 *
 * `null` — hajm oʻlchanmagan. Uzum qoidasida "oʻlchamsiz tovar —
 * 50 000 soʻm" degan band bor, lekin uni bu yerda QOʻLLAMAYMIZ:
 * u sotuvchi oʻlchamni koʻrsatmagan holat uchun jarima. Bizning
 * hisobimizda hajm nomaʼlum boʻlsa, javob "bilmayman" boʻlishi
 * kerak — eng yomon holatni taxmin qilsak, foydali tovar
 * zararli boʻlib chiqardi.
 */
export function uzumLogistikaSom(volumeMl: number | null): number | null {
  const ml = son(volumeMl);
  if (ml === null) return null;
  const litr = Math.max(1, Math.ceil(ml / 1000));
  const som = UZUM_LOGISTIKA.birinchiLitrSom
    + (litr - 1) * UZUM_LOGISTIKA.qoshimchaLitrSom;
  return Math.min(som, UZUM_LOGISTIKA.engKopSom);
}

/** Musbat son boʻlsa oʻzini, aks holda `null`. Nol ham qabul qilinadi. */
function son(n: number | null): number | null {
  return n !== null && Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Kargo narxi — ogʻirlik va hajmdan qaysi biri qimmat boʻlsa.
 *
 * Ikkalasi ham kerak: bittasi boʻlmasa qaysi biri qimmatligini
 * aytib boʻlmaydi va arzonini olish — tannarxni pasaytirib
 * koʻrsatish demak.
 */
export function kargoNarxi(
  weightG: number | null,
  volumeMl: number | null,
  tarif: KargoTarifi,
): { som: number; asos: 'ogirlik' | 'hajm' } | null {
  const g = son(weightG);
  const ml = son(volumeMl);
  const perKg = son(tarif.somPerKg);
  const perM3 = son(tarif.somPerM3);
  if (g === null || ml === null || perKg === null || perM3 === null) return null;

  const ogirlikdan = (g / 1000) * perKg;
  const hajmdan = (ml / 1_000_000) * perM3;
  return ogirlikdan >= hajmdan
    ? { som: ogirlikdan, asos: 'ogirlik' }
    : { som: hajmdan, asos: 'hajm' };
}

/**
 * Bojxona toʻlovi: boj + QQS.
 *
 * Zanjir: boj (tovar + kargo) dan, QQS esa (tovar + kargo + boj)
 * dan. Yuqoridagi ogohlantirishga qarang — zanjir tasdiqlanmagan.
 */
export function bojxonaQqs(
  tovarSom: number | null,
  kargoSom: number | null,
  b: Boj,
): number | null {
  const tovar = son(tovarSom);
  const kargo = son(kargoSom);
  const bojF = son(b.bojFoizi);
  const qqsF = son(b.qqsFoizi);
  if (tovar === null || kargo === null || bojF === null || qqsF === null) return null;

  const asos = tovar + kargo;
  const boj = (asos * bojF) / 100;
  const qqs = ((asos + boj) * qqsF) / 100;
  return boj + qqs;
}

/**
 * Bir dona tovarning toʻliq tannarxi.
 *
 * Yetishmagan kirish NOLGA aylanmaydi. Nol "kargo tekin" degan
 * daʼvo boʻlardi va u foydani oshirib koʻrsatardi — yaʼni odam
 * zarar keltiradigan tovarni foydali deb sotib olardi.
 */
export function tannarxHisobi(k: TannarxKirishi): TannarxNatijasi {
  const yetishmaydi: string[] = [];

  const sotuvNarxi = son(k.sotuvNarxiSom);
  if (sotuvNarxi === null) yetishmaydi.push('sotuvNarxiSom');

  const yuan = son(k.xitoyNarxiYuan);
  if (yuan === null) yetishmaydi.push('xitoyNarxiYuan');
  const kurs = son(k.kursSomPerYuan);
  if (kurs === null || kurs === 0) yetishmaydi.push('kursSomPerYuan');
  const xitoyNarxi = yuan !== null && kurs !== null && kurs > 0 ? yuan * kurs : null;

  if (son(k.weightG) === null) yetishmaydi.push('weightG');
  if (son(k.volumeMl) === null) yetishmaydi.push('volumeMl');
  if (son(k.kargo.somPerKg) === null) yetishmaydi.push('kargo.somPerKg');
  if (son(k.kargo.somPerM3) === null) yetishmaydi.push('kargo.somPerM3');
  const kg = kargoNarxi(k.weightG, k.volumeMl, k.kargo);

  if (son(k.boj.bojFoizi) === null) yetishmaydi.push('boj.bojFoizi');
  if (son(k.boj.qqsFoizi) === null) yetishmaydi.push('boj.qqsFoizi');
  const bq = bojxonaQqs(xitoyNarxi, kg?.som ?? null, k.boj);

  const komF = son(k.komissiyaFoizi);
  if (komF === null) yetishmaydi.push('komissiyaFoizi');
  const komissiya = sotuvNarxi !== null && komF !== null
    ? (sotuvNarxi * komF) / 100
    : null;

  const uzumLog = uzumLogistikaSom(k.volumeMl);

  const tannarx: Tannarx = yetishmaydi.length > 0
    ? {
        ...BOSH, sotuvNarxi, xitoyNarxi, kargo: kg?.som ?? null,
        bojxonaQqs: bq, komissiya, uzumLogistika: uzumLog,
      }
    : {
        sotuvNarxi, xitoyNarxi, kargo: kg?.som ?? null,
        bojxonaQqs: bq, komissiya, uzumLogistika: uzumLog,
      };

  const foiz = marjaFoizi(tannarx);
  const sofFoydaSom = foiz === null || sotuvNarxi === null || xitoyNarxi === null
    || kg === null || bq === null || komissiya === null || uzumLog === null
    ? null
    : sotuvNarxi - xitoyNarxi - kg.som - bq - komissiya - uzumLog;

  return {
    tannarx,
    sofFoydaSom,
    marjaFoizi: foiz,
    kargoAsosi: kg?.asos ?? null,
    yetishmaydi,
  };
}
