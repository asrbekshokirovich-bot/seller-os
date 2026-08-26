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

import type { Tannarx } from './qismlar.ts';
import { marjaFoizi } from './qismlar.ts';

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
  /**
   * Omborda aylanma, kun. `aylanmaKun()` bilan hisoblanadi va
   * oʻlchangan qoldiq/sotuvdan keladi.
   *
   * `null` boʻlsa saqlash haqi hisoblanmaydi va shu aytiladi —
   * nolga tushirilmaydi.
   */
  aylanmaKun: number | null;
  /** Imtiyozli saqlash turkumi (6.7). Bilinmasa `false`. */
  imtiyozliSaqlash?: boolean;
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
  bojxonaQqs: null, komissiya: null, uzumLogistika: null, saqlash: null,
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

/**
 * Uzum ombori saqlash tarifi — 2026-yil 1-iyundan.
 *
 * Manba: seller.uzum.uz/manual/uz/6.product-preparation, 6.7-boʻlim.
 * Logistika boʻlimida (3.2) bu raqam YOʻQ — men avval oʻsha yerni
 * qarab "qoʻllanmada yozilmagan" degan xulosa chiqargan edim.
 * Xato: u butunlay boshqa boʻlimda turadi.
 *
 * Yigʻim AYLANMAGA qarab oʻzgaradi: tovar qancha sekin sotilsa,
 * shuncha qimmat. Aynan shuning uchun u tannarxda kerak —
 * sekin sotiladigan katta tovar marjani jimgina yeb qoʻyadi.
 */
export const UZUM_SAQLASH = {
  /** Shu kundan past aylanmada saqlash BEPUL. */
  bepulAylanmaKun: 60,
  /**
   * Litr uchun kunlik soʻm, aylanma oraligʻiga qarab.
   * `gacha` — shu kungacha (shu kun ichida) shu tarif.
   */
  bosqichlar: [
    { gacha: 180, odatiy: 12, imtiyozli: 12 },
    { gacha: 360, odatiy: 18, imtiyozli: 14 },
    { gacha: Infinity, odatiy: 24, imtiyozli: 18 },
  ],
  /** Bir tovar uchun kunlik yuqori chegara. */
  kunlikShiftOdatiy: 5_000,
  kunlikShiftImtiyozli: 3_000,
} as const;

/**
 * Aylanma — tovar omborda oʻrtacha necha kun turadi.
 *
 * Uzumning oʻz taʼrifi (6.7):
 *
 *   Aylanma kunlarining soni =
 *     oxirgi 15 kun ichidagi oʻrtacha kunlik qoldiq (dona)
 *     / oxirgi 15 kun ichidagi oʻrtacha kunlik savdo (dona)
 *
 * SOTUV NOL BOʻLSA — `null`, cheksizlik EMAS. Nolga boʻlish
 * matematik jihatdan cheksizlik beradi, lekin maʼnosi boshqa:
 * "15 kun ichida sotilmadi" degani "hech qachon sotilmaydi"
 * degani emas. Cheksiz aylanma esa cheksiz saqlash haqiga
 * aylanardi va tovar borib turib zararli deb koʻrsatilardi.
 */
export function aylanmaKun(
  ortachaQoldiq: number | null,
  ortachaKunlikSotuv: number | null,
): number | null {
  const q = son(ortachaQoldiq);
  const st = son(ortachaKunlikSotuv);
  if (q === null || st === null || st <= 0) return null;
  return q / st;
}

/**
 * Bir dona tovarning saqlash haqi.
 *
 * BU OʻLCHOV EMAS, MODEL. Uzum yigʻimni har kuni omborda qolgan
 * HAR BIR donadan oladi. Bitta donaning umri davomida toʻlaydigan
 * summasini shunday baholaymiz:
 *
 *   toʻlanadigan kun = aylanma − 60 (bepul davr)
 *   bir dona uchun   = litr × kunlik tarif × toʻlanadigan kun
 *
 * Yaʼni "bu dona omborda aylanma qancha boʻlsa shuncha kun
 * turadi" deb olinadi. Bu taxminiy, lekin kam baholaydigan
 * tomonga emas: haqiqiy oʻrtacha turish vaqti aylanmadan
 * kichikroq boʻlishi mumkin.
 *
 * Modelligi YASHIRILMAYDI — interfeysda "hisoblandi" deb turadi.
 */
export function saqlashSom(k: {
  volumeMl: number | null;
  aylanmaKun: number | null;
  /** Imtiyozli turkum (6.7 dagi past tarif). Bilinmasa `false`. */
  imtiyozli?: boolean;
}): number | null {
  const ml = son(k.volumeMl);
  const kun = son(k.aylanmaKun);
  if (ml === null || kun === null) return null;

  const toladiganKun = kun - UZUM_SAQLASH.bepulAylanmaKun;
  // Bepul davrga tushdi — bu OʻLCHANGAN nol, "bilmayman" emas.
  if (toladiganKun <= 0) return 0;

  const imtiyozli = k.imtiyozli === true;
  const bosqich = UZUM_SAQLASH.bosqichlar.find((b) => kun <= b.gacha)
    ?? UZUM_SAQLASH.bosqichlar[UZUM_SAQLASH.bosqichlar.length - 1]!;
  const tarif = imtiyozli ? bosqich.imtiyozli : bosqich.odatiy;

  // Litr yuqoriga yaxlitlanadi — logistika yigʻimidagi bilan bir xil.
  const litr = Math.max(1, Math.ceil(ml / 1000));
  const shift = imtiyozli
    ? UZUM_SAQLASH.kunlikShiftImtiyozli
    : UZUM_SAQLASH.kunlikShiftOdatiy;
  const kunlik = Math.min(litr * tarif, shift);
  return kunlik * toladiganKun;
}

/**
 * Chakana tovar uchun fizik jihatdan mumkin boʻlgan zichlik, g/ml.
 *
 * NEGA KERAK. Ogʻirlik va hajmni sotuvchi Uzumga QOʻLDA yozadi va
 * ikkalasi bir-biriga zid chiqishi mumkin. Oʻlchangan namunalar:
 *
 *   "To'q ko'k mini ko'ylak"      25 g  →  122 500 ml   (0,0002)
 *   "Radio boshqariladigan ..." 12 000 g →       5 ml   (2 400)
 *
 * Ikkalasi ham imkonsiz. Lekin ikkalasi ham hisobga jimgina kiradi:
 * birinchisida Uzum logistikasi 5 250 oʻrniga 35 750 soʻm chiqadi
 * (foydali tovar zararli koʻrinadi), ikkinchisida esa teskarisi.
 *
 * CHEGARALAR FOIZDAN EMAS, FIZIKADAN olingan:
 *
 *   past   0,005 g/ml = 5 kg/m³ — koʻpikli plastmassadan (11–30)
 *                       ham yengil. Qadoq bunchalik yengil boʻlmaydi.
 *   baland 4 g/ml     — shishadan (2,5) va alyuminiydan (2,7) zich.
 *                       Faqat quyma metall shundan oshadi, u ham
 *                       qadoqsiz joʻnatilmaydi.
 *
 * Oraliq ATAYLAB keng: chegara ichidagi shubhali qiymatni qoldirish,
 * haqiqiy qiymatni tashlab yuborishdan yaxshiroq. Oʻlchangan
 * namunada 720 juftlikdan 11 tasi (1,5%) chetda qoldi.
 */
export const ZICHLIK_ORALIGI = { past: 0.005, baland: 4 } as const;

/**
 * Ogʻirlik va hajm bir-biriga mos keladimi.
 *
 * `null` — TEKSHIRIB BOʻLMADI (biri yoki ikkalasi yoʻq). Bu "mos"
 * degani emas: yoʻq maʼlumotni "toʻgʻri" deb belgilash aynan shu
 * fayl qarshi turadigan xato.
 */
export function olchamIshonchlimi(
  weightG: number | null,
  volumeMl: number | null,
): boolean | null {
  const g = son(weightG);
  const ml = son(volumeMl);
  if (g === null || ml === null) return null;
  // Nol hajm yoki nol ogʻirlik — oʻlchov emas, boʻsh maydon oʻrniga
  // yozilgan nol. Bu ham ishonchsiz.
  if (g === 0 || ml === 0) return false;
  const zichlik = g / ml;
  return zichlik >= ZICHLIK_ORALIGI.past && zichlik <= ZICHLIK_ORALIGI.baland;
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

  /*
   * OGʻIRLIK VA HAJM BIR-BIRIGA ZID BOʻLSA — IKKALASI HAM ISHLATILMAYDI.
   *
   * Qaysi biri notoʻgʻri ekanini bilib boʻlmaydi: 25 grammlik
   * koʻylak 122 litr qutida — ogʻirlik ham, hajm ham haqiqatga
   * oʻxshamaydi. Bittasini tanlab olish TAXMIN boʻlardi.
   *
   * Shuning uchun javob "bilmayman": kargo ham, Uzum logistikasi
   * ham `null`. Bu tovar uchun marja koʻrsatilmaydi va sabab
   * yoziladi — jimgina notoʻgʻri raqam koʻrsatishdan koʻra
   * "hisoblay olmadim" deyish arzon.
   */
  const olchamZid = olchamIshonchlimi(k.weightG, k.volumeMl) === false;
  if (olchamZid) yetishmaydi.push('olcham — ogʻirlik va hajm bir-biriga zid');

  if (son(k.kargo.somPerKg) === null) yetishmaydi.push('kargo.somPerKg');
  if (son(k.kargo.somPerM3) === null) yetishmaydi.push('kargo.somPerM3');
  const kg = olchamZid ? null : kargoNarxi(k.weightG, k.volumeMl, k.kargo);

  if (son(k.boj.bojFoizi) === null) yetishmaydi.push('boj.bojFoizi');
  if (son(k.boj.qqsFoizi) === null) yetishmaydi.push('boj.qqsFoizi');
  const bq = bojxonaQqs(xitoyNarxi, kg?.som ?? null, k.boj);

  const komF = son(k.komissiyaFoizi);
  if (komF === null) yetishmaydi.push('komissiyaFoizi');
  const komissiya = sotuvNarxi !== null && komF !== null
    ? (sotuvNarxi * komF) / 100
    : null;

  const uzumLog = olchamZid ? null : uzumLogistikaSom(k.volumeMl);

  /*
   * Saqlash haqi (6.7). Aylanma OʻLCHANADI — qoldiq va sotuv
   * bizda bor — lekin u kelajakka qaraydi, shuning uchun natija
   * "hisoblandi" deb belgilanadi, "oʻlchandi" deb emas.
   */
  if (son(k.aylanmaKun) === null) yetishmaydi.push('aylanmaKun');
  const saqlash = olchamZid ? null : saqlashSom({
    volumeMl: k.volumeMl,
    aylanmaKun: k.aylanmaKun,
    imtiyozli: k.imtiyozliSaqlash === true,
  });

  const tannarx: Tannarx = yetishmaydi.length > 0
    ? {
        ...BOSH, sotuvNarxi, xitoyNarxi, kargo: kg?.som ?? null,
        bojxonaQqs: bq, komissiya, uzumLogistika: uzumLog, saqlash,
      }
    : {
        sotuvNarxi, xitoyNarxi, kargo: kg?.som ?? null,
        bojxonaQqs: bq, komissiya, uzumLogistika: uzumLog, saqlash,
      };

  const foiz = marjaFoizi(tannarx);
  const sofFoydaSom = foiz === null || sotuvNarxi === null || xitoyNarxi === null
    || kg === null || bq === null || komissiya === null || uzumLog === null
    || saqlash === null
    ? null
    : sotuvNarxi - xitoyNarxi - kg.som - bq - komissiya - uzumLog - saqlash;

  return {
    tannarx,
    sofFoydaSom,
    marjaFoizi: foiz,
    kargoAsosi: kg?.asos ?? null,
    yetishmaydi,
  };
}
