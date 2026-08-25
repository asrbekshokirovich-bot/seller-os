/**
 * Usta 2- va 3-qadam — yoʻnalish tanlash va tovar rejasi.
 *
 * Reja, 2-boʻlim: "Sarmoya Ustasi — 6 qadamli yoʻl".
 *
 * Bu yerdagi hamma narsa DETERMINISTIK. AI bu hisoblarga aralashmaydi
 * — u faqat natijani oʻzbekchada tushuntiradi (FORMULA.md, 1-qoida).
 * Shuning uchun bu fayl AI kalitisiz ham toʻliq ishlaydi va testlari
 * ham AI'siz yashil boʻladi.
 */

import { kirish, mavsum, profil, raqobat, talab, type KirishTalabi } from './qismlar.js';
import { score, type Parts, type Score } from './formula.js';
import { THRESHOLDS } from './thresholds.js';
import type { Flag } from './traps.js';
import type { TovarHolati } from './filtrlar/turlar.js';

const U = THRESHOLDS.usta;

/** 2-qadam uchun turkum nomzodi — bazadan oʻlchangan holda keladi. */
/**
 * `so_yonalish_nomzodlari()` javobi.
 *
 * Massiv emas, OBYEKT — ataylab. Kesh oldindan hisoblanadi, yaʼni u
 * eskirishi mumkin, va eskirganini foydalanuvchi bilishi kerak.
 * Massiv qaytarilsa buni aytadigan joy qolmasdi: boʻsh massiv
 * "sizga mos yoʻnalish yoʻq" degan DAʼVOga oʻxshab koʻrinardi,
 * holbuki javob "hali hisoblanmadi" (QOIDALAR.md, 4-qoida).
 */
export interface NomzodJavobi {
  /** Kesh oxirgi marta qachon hisoblangan. Boʻsh boʻlsa `null`. */
  hisoblandi: string | null;
  /** Necha soat oldin. Boʻsh boʻlsa `null`. */
  yoshi_soat: number | null;
  royxat: TurkumNomzodi[];
}

/**
 * Kesh shundan keyin ESKI hisoblanadi (soat).
 *
 * Perepis 6 soatda bir aylanadi, yangilash esa skreyper bilan birga
 * kuniga uch marta ketadi. Yaʼni normal holatda yosh 8 soatdan
 * oshmaydi. 24 soat — "jadval ishlamay qolgan" chegarasi, "biroz
 * eskirgan" emas.
 *
 * Eskirgan kesh JAVOBNI TOʻXTATMAYDI: kechagi raqam bugungi
 * tavsiyani deyarli oʻzgartirmaydi, va "hech narsa" dan koʻra
 * "kechagi maʼlumot" foydaliroq. Lekin u AYTILADI.
 */
export const KESH_ESKI_SOAT = 24;

export interface TurkumNomzodi {
  categoryId: number;
  name: string;
  /**
   * Turkumning talab oʻlchovi. Kattaroq — koʻproq talab.
   *
   * BIRLIK ATAYLAB AYTILMAGAN va bu muhim. FORMULA.md "30 kunlik
   * sotuv (dona)" deydi, lekin bugun bunday maʼlumot YOʻQ: sotuv
   * tarixi 3 kunlik va `sales_estimates` boʻsh.
   *
   * Hozircha oʻrniga perepisdagi haftalik xaridorlar yigʻindisi
   * ishlatiladi — u 1 251 527 tovarda oʻlchangan va butun katalogni
   * qamraydi. `talab` balli PERSENTIL boʻlgani uchun bu toʻgʻri
   * ishlaydi: turkumlarni tartiblash uchun har qanday monoton talab
   * oʻlchovi bir xil natija beradi.
   *
   * Nomi shu sababdan "bozorHajmi30k" emas: raqamni bor narsasidan
   * boshqa nom bilan atash — ertami-kechmi kimdir uni dona deb
   * oʻqiydi va notoʻgʻri hisob chiqaradi.
   *
   * 30 kunlik haqiqiy sotuv yigʻilgach shu maydonga oʻsha qoʻyiladi
   * va tartib oʻzgarmaydi — faqat aniqroq boʻladi.
   */
  talabOlchovi: number | null;
  sotuvchiSoni: number | null;
  top3Ulush: number | null;
  /** `category_requirements.optimal_entry_uzs`. */
  optimalKirishSom: number | null;
  talablar: KirishTalabi;
  mavsumiylik: number[] | null;
}

export interface Yonalish {
  categoryId: number;
  name: string;
  ball: Score;
  /** Byudjet shu turkumga yetadimi. `null` — optimal summa bilinmaydi. */
  yetadi: boolean | null;
  optimalKirishSom: number | null;
  /** Foydalanuvchiga koʻrsatiladigan raqamlar. */
  dalil: {
    talabOlchovi: number | null;
    sotuvchiSoni: number | null;
    top3Ulush: number | null;
  };
}

export interface YonalishNatijasi {
  royxat: Yonalish[];
  /**
   * Byudjet katta boʻlsa — bir necha yoʻnalishga boʻlish taklifi.
   * `null` — taklif yoʻq.
   */
  bolishTaklifi: { nechta: number; sabab: string } | null;
  /** Nechta nomzod baholanmadi va nega. */
  baholanmadi: number;
}

/**
 * 2-qadam: yoʻnalish tanlash.
 *
 * Nomzodlar ballanadi va eng yaxshilari qaytariladi. Ball
 * `FORMULA.md` boʻyicha, lekin bu bosqichda TURKUM darajasida:
 * `marja` hali hisoblanmaydi (Xitoy narxi 4-qadamda keladi),
 * shuning uchun u `null` boʻladi va vazndan chiqadi.
 *
 * Tanlovni foydalanuvchi qiladi — tizim faqat tartiblaydi va
 * sabablarni koʻrsatadi (reja, 2-qadam).
 */
/**
 * 2-qadamda hisoblanMAYdigan qismlar.
 *
 * `marja` uchun Xitoy narxi kerak, u esa 4-qadamda keladi. Ya'ni bu
 * "ma'lumot yetishmadi" emas, bosqichlar tartibi. Farqi hal qiluvchi:
 * agar uni "yo'q" deb sanasak, 2-qadam tuzilishi bo'yicha imkonsiz
 * bo'lardi — bitta qism DOIM yo'q, ya'ni chegara doim bitta kamroq.
 *
 * Ro'yxat qisqa bo'lishi shart. Bu yerga qism qo'shish — uni ballga
 * ta'sirsiz qilish demak, ya'ni tekshiruvni yumshatishning eng oson
 * yo'li. `kirish` va `mavsum` shu sababdan bu yerda YO'Q: ular
 * bugun bo'sh, lekin bo'sh bo'lgani "qo'llanmaydi" degani emas.
 */
export const QADAM2_QOLLANMAYDI = ['marja'] as const;

export function yonalishlar(
  nomzodlar: TurkumNomzodi[],
  byudjetSom: number | null,
  profilSohalari: string[] | null,
  oy: number,
): YonalishNatijasi {
  const baholangan: Yonalish[] = [];
  let baholanmadi = 0;

  for (const n of nomzodlar) {
    // Turkum ichida "talab" — turkumning oʻzi qancha sotayotgani.
    // Boshqa turkumlar bilan solishtiriladi.
    const hammaHajm = nomzodlar
      .map((x) => x.talabOlchovi)
      .filter((x): x is number => x !== null);

    const qismlar: Parts = {
      // Perepis "haftalik xaridorlar" ni Uzum oʻzi aytadi — stok
      // farqidan chiqarilmagan, shuning uchun kun sharti yoʻq.
      talab: talab(n.talabOlchovi, hammaHajm, null, 'togridan-togri'),
      raqobat: raqobat(n.top3Ulush, n.sotuvchiSoni),
      kirish: kirish(n.talablar),
      mavsum: mavsum(n.mavsumiylik, oy),
      profil: profil(profilSohalari, n.name),
    };

    const ball = score(qismlar, THRESHOLDS.data.maxNullParts, QADAM2_QOLLANMAYDI);
    if (ball.value === null) { baholanmadi++; continue; }

    baholangan.push({
      categoryId: n.categoryId,
      name: n.name,
      ball,
      yetadi:
        byudjetSom === null || n.optimalKirishSom === null
          ? null
          : byudjetSom >= n.optimalKirishSom,
      optimalKirishSom: n.optimalKirishSom,
      dalil: {
        talabOlchovi: n.talabOlchovi,
        sotuvchiSoni: n.sotuvchiSoni,
        top3Ulush: n.top3Ulush,
      },
    });
  }

  // Ball boʻyicha, teng boʻlsa id boʻyicha — natija barqaror boʻlsin.
  baholangan.sort((a, b) =>
    (b.ball.value as number) - (a.ball.value as number) || a.categoryId - b.categoryId);

  const royxat = baholangan.slice(0, U.maxYonalish);

  return { royxat, bolishTaklifi: bolishTaklifi(royxat, byudjetSom), baholanmadi };
}

/**
 * Byudjet eng yaxshi yoʻnalishning optimal kirish summasidan ancha
 * katta boʻlsa — boʻlishni taklif qilamiz.
 *
 * Bu MAJBURIYAT emas. Butun pulni bitta tor turkumga tiqish zaxirani
 * oʻldiradi: tovar sekin ketsa pul qotib qoladi va ikkinchi urinish
 * uchun hech narsa qolmaydi.
 */
function bolishTaklifi(
  royxat: Yonalish[],
  byudjetSom: number | null,
): { nechta: number; sabab: string } | null {
  if (byudjetSom === null || royxat.length < 2) return null;
  const eng = royxat[0];
  if (!eng || eng.optimalKirishSom === null || eng.optimalKirishSom <= 0) return null;

  const nisbat = byudjetSom / eng.optimalKirishSom;
  if (nisbat < U.bolishChegarasi) return null;

  const nechta = Math.min(Math.floor(nisbat), U.maxBolinma, royxat.length);
  if (nechta < 2) return null;

  return {
    nechta,
    sabab:
      `Byudjetingiz "${eng.name}" uchun kerak summadan ` +
      `${nisbat.toFixed(1)} barobar katta. Butun pulni bitta yoʻnalishga ` +
      `tikish oʻrniga ${nechta} tasiga boʻlish xavfni kamaytiradi.`,
  };
}

/**
 * Birinchi partiya miqdori.
 *
 * Reja: "oyiga ~600 dona sotiladi, yangi sotuvchi odatda ~5% oladi →
 * 30 kunlik zaxira = 30 dona".
 *
 *   miqdor = oylikSotuv × ulush% × (zaxiraKun / 30)
 *
 * Hisob ATAYLAB ochiq: foydalanuvchi har bir koʻpaytuvchini koʻradi.
 * "Tizim shunday dedi" degan javob ishonch bermaydi — raqam
 * koʻrsatilishi kerak.
 *
 * Oylik sotuv bilinmasa `null`: taxminiy miqdor aytish odamni
 * ortiqcha tovar sotib olishga olib borishi mumkin.
 */
export function miqdor(
  oylikSotuv: number | null,
  ulushFoiz: number = U.yangiSotuvchiUlushi,
  zaxiraKun: number = U.zaxiraKun,
): { dona: number; hisob: string } | null {
  if (oylikSotuv === null || oylikSotuv < 0) return null;
  const bizniki = (oylikSotuv * ulushFoiz) / 100;
  const dona = Math.max(1, Math.round((bizniki * zaxiraKun) / 30));
  return {
    dona,
    hisob:
      `oyiga ~${Math.round(oylikSotuv)} dona sotiladi · ` +
      `yangi sotuvchi odatda ~${ulushFoiz}% oladi → oyiga ~${Math.round(bizniki)} dona · ` +
      `${zaxiraKun} kunlik zaxira = ${dona} dona`,
  };
}

// ====================================================================
// 3-QADAM — TOVAR ROʻYXATI
// ====================================================================

/** `so_tovar_royxati()` qaytaradigan bitta tovar. */
export interface TovarNomzodi extends TovarHolati {
  /** Sotuv raqami qayerdan: oʻlchangan qoldiq farqi yoki perepis taxmini. */
  sotuvManbasi: 'olchandi' | 'taxmin' | null;
  /** Qoldiq necha kun oʻlchangan. */
  olchanganKun: number | null;
  shopName: string | null;
  narxSom: number | null;
  qoldiq: number | null;
  reyting: number | null;
  sharhSoni: number | null;
}

export interface TovarTavsiyasi {
  nomzod: TovarNomzodi;
  /** Nechta olish. `null` — hisoblab boʻlmadi. */
  miqdor: { dona: number; hisob: string } | null;
  /** Miqdor hisoblanmagan boʻlsa — nega. */
  miqdorSababi: string | null;
  /** Tuzoq bayroqlari. Boʻsh boʻlishi mumkin. */
  bayroqlar: Flag[];
  /** Baholab boʻlmagan filtrlar va yetishmagan maydonlar. */
  baholanmadi: Array<{ filtr: string; missing: string[] }>;
}

export interface TovarNatijasi {
  royxat: TovarTavsiyasi[];
  /** `block` darajali tuzoq tufayli roʻyxatga chiqmagan tovarlar. */
  chiqarildi: Array<{ productId: number; title: string; sabab: string }>;
}

/**
 * MIQDOR FAQAT OʻLCHANGAN SOTUVDAN hisoblanadi.
 *
 * Perepisdagi `buyers_per_week` raqami tartiblash uchun yaraydi
 * (persentil monoton oʻlchovga bogʻliq), lekin MUTLAQ miqdor uchun
 * yaramaydi — uning maʼnosi tasdiqlanmagan.
 *
 * Oʻlchov (2026-08-25, 1,47 mln tovar): Galaxy A16 uchun
 * `buyers_per_week = 23 954`. Bu haftasiga deganda yiliga 1,2 mln
 * dona boʻladi — Oʻzbekiston bozorida bitta model uchun imkonsiz.
 * Sharh/xaridor nisbati ham barqaror emas (0.167 → 0.346 → 0.115),
 * yaʼni "haftalik" ham, "jami" ham deb tasdiqlab boʻlmaydi.
 *
 * Shu raqamdan "shuncha dona sotib oling" degan tavsiya chiqarish —
 * odamning pulini tasdiqlanmagan maydonga tikish. Qoldiq farqi esa
 * bizning oʻlchovimiz va u tekshirilishi mumkin.
 */
const MIQDOR_UCHUN_MANBA = 'olchandi';

/**
 * 3-qadam: turkum ichidagi tovarlar va har biriga miqdor.
 *
 * TUZOQ FILTRLARI ROʻYXATDAN OLDIN ishlaydi (reja, 2-boʻlim, 3-qadam:
 * "Roʻyxatga chiqishdan OLDIN har tovar hiyla-filtrlardan oʻtadi").
 * `block` darajali bayroq tovarni roʻyxatdan butunlay chiqaradi va
 * sababi bilan `chiqarildi` ga yoziladi — jimgina yoʻqolmaydi.
 */
export function tovarlar(
  nomzodlar: TovarNomzodi[],
  tekshir: (t: TovarHolati) => {
    bayroqlar: Flag[];
    baholanmadi: Array<{ filtr: string; missing: string[] }>;
  },
): TovarNatijasi {
  const royxat: TovarTavsiyasi[] = [];
  const chiqarildi: TovarNatijasi['chiqarildi'] = [];

  for (const n of nomzodlar) {
    const { bayroqlar, baholanmadi } = tekshir(n);

    const toxtatuvchi = bayroqlar.find((b) => b.severity === 'block');
    if (toxtatuvchi) {
      chiqarildi.push({
        productId: n.productId,
        title: n.title,
        sabab: toxtatuvchi.reason,
      });
      continue;
    }

    const { son, sabab } = sotuvOlchovi(n);
    royxat.push({
      nomzod: n,
      miqdor: son === null ? null : miqdor(son),
      miqdorSababi: sabab,
      bayroqlar,
      baholanmadi,
    });
  }

  return { royxat, chiqarildi };
}

/** Miqdor uchun ishlatiladigan sotuv soni va — boʻlmasa — sababi. */
function sotuvOlchovi(n: TovarNomzodi): { son: number | null; sabab: string | null } {
  if (n.soldUnits30d === null) {
    return { son: null, sabab: 'Sotuv hali oʻlchanmagan.' };
  }
  if (n.sotuvManbasi !== MIQDOR_UCHUN_MANBA) {
    const kun = n.olchanganKun ?? 0;
    const kerak = THRESHOLDS.data.minDaysForDemand;
    return {
      son: null,
      sabab:
        `Sotuv qoldiq farqidan hali oʻlchanmagan — ${kun} kun bor, ` +
        `${kerak} kun kerak. Koʻrsatilgan raqam Uzumning oʻz koʻrsatkichidan ` +
        'olingan taxmin: tartiblash uchun yetadi, miqdor hisoblash uchun emas.',
    };
  }
  return { son: n.soldUnits30d, sabab: null };
}
