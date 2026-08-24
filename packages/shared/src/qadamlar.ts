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

const U = THRESHOLDS.usta;

/** 2-qadam uchun turkum nomzodi — bazadan oʻlchangan holda keladi. */
export interface TurkumNomzodi {
  categoryId: number;
  name: string;
  /** 30 kunlik turkum sotuvi (dona). */
  bozorHajmi30k: number | null;
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
    bozorHajmi30k: number | null;
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
      .map((x) => x.bozorHajmi30k)
      .filter((x): x is number => x !== null);

    const qismlar: Parts = {
      talab: talab(n.bozorHajmi30k, hammaHajm, THRESHOLDS.data.minDaysForDemand),
      // Marja 4-qadamda hisoblanadi — hozir maʼlum emas.
      marja: null,
      raqobat: raqobat(n.top3Ulush, n.sotuvchiSoni),
      kirish: kirish(n.talablar),
      mavsum: mavsum(n.mavsumiylik, oy),
      profil: profil(profilSohalari, n.name),
    };

    const ball = score(qismlar, THRESHOLDS.data.maxNullParts);
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
        bozorHajmi30k: n.bozorHajmi30k,
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
