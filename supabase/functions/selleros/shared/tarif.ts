/**
 * Tarif rejalari va ular ochadigan qadamlar.
 *
 * Reja (B3): "Tarif limitlari: Bepulda Usta 2-qadamgacha, pullikda
 * toʻliq — pilot sinovi uchun flag bilan almashtiriladigan".
 *
 * Shu sababdan bu yerda faqat QOIDA turadi, uni yoqish-oʻchirish
 * emas: cheklovni ishga solish-solmaslikni backend flagi hal qiladi
 * (`TARIF_CHEKLOVI`). Qoida esa flagdan qatʼi nazar bir xil, va
 * testlari flagsiz yashil.
 *
 * TOʻLOV OQIMI HALI YOʻQ. Payme/Click tasdiqni kutmoqda, yaʼni
 * hozir hech kim `bepul` dan chiqa olmaydi. Kod shundan oldin
 * yozildi ataylab: toʻlov kalitini kutib turgan joyda cheklov
 * mantigʻi shoshib yozilsa, u tekshirilmagan holda jonli oqimga
 * tushadi.
 */

/** Rejalar. Bazadagi `subscriptions.plan` matni shularga oʻgiriladi. */
export type Reja = 'bepul' | 'pro' | 'biznes';

/**
 * Reja qaysi qadamgacha ochadi (1–6).
 *
 * `bepul: 2` — yoʻnalishlar koʻrinadi, tovar roʻyxati koʻrinmaydi.
 * Nega aynan shu chegara: 2-qadam qiymatni KOʻRSATADI (sizga mana
 * shu yoʻnalishlar mos), 3-qadam esa uni ISHLATIB boʻladigan qilib
 * beradi (aynan qaysi tovar, qancha miqdorda). Odam toʻlashdan
 * oldin nima sotib olayotganini koʻrishi kerak.
 */
export const REJA_QADAMI: Readonly<Record<Reja, number>> = {
  bepul: 2,
  pro: 6,
  biznes: 6,
};

/** Bazadagi `subscriptions.status` qiymatlaridan qaysilari rejani BERADI. */
const TIRIK_HOLAT: readonly string[] = ['trial', 'active', 'grace'];

/** `subscriptions` qatorining KPI va cheklov uchun kerakli qismi. */
export interface ObunaXom {
  plan: string | null;
  status: string | null;
  /** `null` — muddatsiz. */
  ends_at: string | null;
}

export interface RejaNatijasi {
  reja: Reja;
  /** Bazada nima yozilgani — oʻgirilgandan keyin ham koʻrinib tursin. */
  xomReja: string | null;
  /**
   * Bazadagi reja nomi tanilmadi va `bepul` ga tushirildi.
   *
   * Jimgina tushirilmaydi: bitta harf xatosi toʻlagan mijozni
   * bepulga aylantirib qoʻyishi mumkin, va buni koʻrsatadigan
   * joy boʻlishi shart.
   */
  tanilmadi: boolean;
  /** Nega shu reja chiqdi — `/tarif` javobida koʻrsatiladi. */
  sabab: 'obuna-yoq' | 'obuna-tugagan' | 'holat-nofaol' | 'reja-tanilmadi' | 'obuna-tirik';
}

const BEPUL = (
  sabab: RejaNatijasi['sabab'],
  xomReja: string | null,
  tanilmadi = false,
): RejaNatijasi => ({ reja: 'bepul', xomReja, tanilmadi, sabab });

/**
 * Obuna qatoridan amaldagi rejani chiqaradi.
 *
 * Qator YOʻQ boʻlishi odatiy hol — hamma shundan boshlanadi.
 * Shuning uchun bu holat xato emas, `bepul`.
 */
export function reja(obuna: ObunaXom | null, hozir: Date): RejaNatijasi {
  if (obuna === null) return BEPUL('obuna-yoq', null);

  const xom = obuna.plan;
  if (obuna.status === null || !TIRIK_HOLAT.includes(obuna.status)) {
    return BEPUL('holat-nofaol', xom);
  }
  if (obuna.ends_at !== null && new Date(obuna.ends_at).getTime() <= hozir.getTime()) {
    return BEPUL('obuna-tugagan', xom);
  }
  if (xom === null || !(xom in REJA_QADAMI)) {
    return BEPUL('reja-tanilmadi', xom, true);
  }
  return { reja: xom as Reja, xomReja: xom, tanilmadi: false, sabab: 'obuna-tirik' };
}

/** Shu reja shu qadamni ochadimi. */
export function qadamOchiq(r: Reja, qadam: number): boolean {
  return qadam <= REJA_QADAMI[r];
}

/** Qadamni ochadigan eng arzon rejalar — "nima kerak" deb koʻrsatish uchun. */
export function kerakliRejalar(qadam: number): Reja[] {
  return (Object.keys(REJA_QADAMI) as Reja[]).filter((r) => qadamOchiq(r, qadam));
}
