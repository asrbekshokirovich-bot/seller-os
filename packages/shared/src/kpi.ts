/**
 * KPI paneli — reja, 8-boʻlim: "Birinchi kundan oʻlchanadigan raqamlar".
 *
 * Rejadagi jadval oʻn bitta raqamni sanaydi va ularning beshtasi
 * darvozaga (pilot gate) bogʻlangan. Shu paytgacha bu raqamlarni
 * koʻrsatadigan joy yoʻq edi.
 *
 * ENG MUHIM QOIDA SHU FAYLDA. Oʻlchanmagan KPI **nol emas**
 * (QOIDALAR.md, 4-qoida). Toʻlov oqimi ulanmagani uchun "bepul →
 * pullik 0%" deb yozish — mahsulot haqidagi DAʼVO boʻlardi,
 * holbuki bu kodning holati. Shuning uchun har oʻlchanmagan qator
 * `qiymat: null` va SABAB bilan qaytadi.
 *
 * Ikkinchi qoida: kichik namuna. Uchta odamning bittasi 3-qadamga
 * yetsa bu "33%" emas, "3 tadan 1 tasi". Foiz koʻrsatiladi, lekin
 * `holat` `namuna-kichik` boʻladi va darvoza uni "yomon" deb
 * hisoblamaydi.
 */

/** Kunlik qamrov shundan past boʻlmasin (%). Reja, 8-boʻlim. */
export const QAMROV_ENG_KAM = 95;
/** Skreyper xato darajasi shundan yuqori boʻlmasin (%). */
export const XATO_ENG_KOP = 2;

/**
 * Foizni "yaxshi/yomon" deb baholash uchun eng kam kuzatuv soni.
 *
 * 20 — TAXMIN, oʻlchov emas. Pilot boshlangach namuna hajmi shundan
 * ancha katta boʻladi va bu chegara faqat birinchi kunlarni qoplaydi.
 */
export const NAMUNA_ENG_KAM = 20;

export type KpiKalit =
  | 'usta_3_qadam' | 'tavsiya_qabul' | 'bepul_pullik' | 'ketish' | 'ai_xarajat'
  | 'malumot_yoshi'
  | 'skreyper_qamrovi' | 'skreyper_xatosi' | 'tuzoq_testi' | 'eval'
  | 'qadam_tezligi' | 'avtoyechish';

/**
 * Maʼlumot shuncha soatdan eski boʻlsa — yiqilish.
 *
 * Supurish kuniga uch marta (04, 12, 20 UTC), yaʼni sogʻlom
 * holatda yosh 8 soatdan oshmaydi. 12 — bitta supurish
 * oʻtkazib yuborilishiga chidam, ikkitasiga emas.
 *
 * GitHub jadvali kafolatlangan emas: bugun 12:00 dagi supurish
 * 58 daqiqa kechikdi. Shuning uchun chegara jadvalning oʻziga
 * emas, natijaga bogʻlangan.
 */
export const YOSH_ENG_KOP_SOAT = 12;

export interface KpiMaqsad {
  /** `yuqori` — koʻp boʻlgani yaxshi; `past` — kam; `yoq` — maqsadsiz. */
  yonalish: 'yuqori' | 'past' | 'yoq';
  chegara: number | null;
  /** Rejada qanday yozilgan boʻlsa shunday. */
  matn: string;
}

export type KpiHolat = 'yaxshi' | 'yomon' | 'olchanmadi' | 'namuna-kichik' | 'maqsadsiz';

export interface Kpi {
  kalit: KpiKalit;
  nom: string;
  guruh: 'mahsulot' | 'texnik';
  /** `null` — oʻlchanmadi. NOL EMAS. */
  qiymat: number | null;
  birlik: 'foiz' | 'soniya' | 'soat';
  maqsad: KpiMaqsad;
  holat: KpiHolat;
  /** `qiymat === null` boʻlganda — nega. Aks holda `null`. */
  sabab: string | null;
  /**
   * Oʻlchandi, lekin bir narsa hisobga kirmadi — shu haqda ogohlik.
   * Sabab bilan aralashtirilmaydi: sabab "nega raqam yoʻq", bu esa
   * "raqam bor, lekin toʻliq emas".
   */
  ogoh?: string;
  /** Foiz nechta kuzatuvdan chiqdi. `null` — namuna tushunchasi yoʻq. */
  namuna: number | null;
}

/** Rejadagi maqsadlar — bitta joyda. */
export const KPI_MAQSAD: Readonly<Record<KpiKalit, KpiMaqsad>> = {
  usta_3_qadam: { yonalish: 'yuqori', chegara: 60, matn: '≥60%' },
  tavsiya_qabul: { yonalish: 'yoq', chegara: null, matn: 'kuzatiladi, oʻrganiladi' },
  bepul_pullik: { yonalish: 'yuqori', chegara: 5, matn: '≥5%' },
  // Rejada "<6–8%". Darvoza uchun boʻsh tomoni olindi: qatʼiy 6 ni
  // qoʻysak, rejaning oʻzi ruxsat bergan oraliq "yomon" boʻlib
  // koʻrinardi. 6 — intilish, 8 — yiqilish chizigʻi.
  ketish: { yonalish: 'past', chegara: 8, matn: '<6–8%' },
  ai_xarajat: { yonalish: 'past', chegara: 8, matn: 'tarif narxining <8% i' },
  malumot_yoshi: {
    yonalish: 'past', chegara: YOSH_ENG_KOP_SOAT, matn: `<${YOSH_ENG_KOP_SOAT} soat`,
  },
  skreyper_qamrovi: { yonalish: 'yuqori', chegara: QAMROV_ENG_KAM, matn: '≥95%' },
  skreyper_xatosi: { yonalish: 'past', chegara: XATO_ENG_KOP, matn: '<2%' },
  tuzoq_testi: { yonalish: 'yuqori', chegara: 100, matn: '100% ushlanadi' },
  eval: { yonalish: 'yuqori', chegara: 90, matn: '≥90%' },
  qadam_tezligi: { yonalish: 'past', chegara: 3, matn: '<2–3 soniya' },
  avtoyechish: { yonalish: 'yuqori', chegara: 90, matn: '≥90%' },
};

/** `so_kpi_xom()` javobi — faqat XOM sanoqlar, hech qanday baho yoʻq. */
export interface KpiXom {
  usta: {
    /** 1-qadam savollariga javob bergan (profil qatori bor) odamlar. */
    boshladi: number;
    /** Ulardan 3-qadam tavsiyasi yozilganlari. */
    uchinchi_qadam: number;
    /**
     * 3-qadamga yetgan, lekin profili yoʻq odamlar.
     *
     * Nisbatga kirmaydi — maxrajda ular yoʻq. Lekin yoʻqolmaydi
     * ham: noldan katta boʻlsa 3-qadam profilsiz ochilayotgan
     * boʻladi va nisbat oqimni toʻliq qoplamaydi.
     */
    uchinchi_profilsiz: number;
  };
  tavsiya: {
    jami: number;
    /**
     * Tanlangan tovar soni. Hozir `null`: tanlash hodisasi hech
     * qayerda yozilmaydi (`events` boʻsh).
     */
    qabul: number | null;
  };
  obuna: {
    /** 30 kunlik oynasi YOPILGAN foydalanuvchilar (kohort maxraji). */
    kohort: number;
    /** Ulardan 30 kun ichida pullik rejaga oʻtganlari. */
    pullik_30kun: number;
    /** Toʻlov davri tugagan obunalar va ulardan bekor qilinganlari. */
    davr_tugadi: number;
    davr_ketdi: number;
  };
  tolov: { qatorlar: number };
  ai: { qatorlar: number; xarajat_usd: number | null };
  hodisa: { qatorlar: number };
}

/** Sifat panelidan keladigan ikkita texnik raqam. */
export interface KpiSifat {
  coverage_percent: number | null;
  error_percent: number | null;
  /** Oxirgi supurish tugagan payt (ISO). `null` — hech qachon. */
  last_sweep_at?: string | null;
}

const NOM: Readonly<Record<KpiKalit, string>> = {
  usta_3_qadam: 'Ustani boshlash → 3-qadamgacha yetish',
  tavsiya_qabul: 'Tavsiyani qabul qilish (tovar tanlandi)',
  bepul_pullik: 'Bepul → pullik (30 kun ichida)',
  ketish: 'Mijoz ketishi (toʻlov davriga nisbatan)',
  ai_xarajat: 'AI xarajat / mijoz',
  malumot_yoshi: 'Maʼlumot yoshi (oxirgi supurishdan beri)',
  skreyper_qamrovi: 'Skreyper qamrovi (kunlik yangilanish)',
  skreyper_xatosi: 'Skreyper xato darajasi',
  tuzoq_testi: 'Tuzoq testi (20→40+ tovar)',
  eval: 'Eval (100 savol)',
  qadam_tezligi: 'Usta qadam yuklanishi / chat javobi',
  avtoyechish: 'Avtoyechish muvaffaqiyati (jonli rejimda)',
};

const GURUH: Readonly<Record<KpiKalit, Kpi['guruh']>> = {
  usta_3_qadam: 'mahsulot', tavsiya_qabul: 'mahsulot', bepul_pullik: 'mahsulot',
  ketish: 'mahsulot', ai_xarajat: 'mahsulot',
  malumot_yoshi: 'texnik',
  skreyper_qamrovi: 'texnik', skreyper_xatosi: 'texnik', tuzoq_testi: 'texnik',
  eval: 'texnik', qadam_tezligi: 'texnik', avtoyechish: 'texnik',
};

/** Oʻlchangan qator. */
function olchandi(kalit: KpiKalit, qiymat: number, namuna: number | null,
                  birlik: Kpi['birlik'] = 'foiz'): Kpi {
  const maqsad = KPI_MAQSAD[kalit];
  return {
    kalit, nom: NOM[kalit], guruh: GURUH[kalit],
    qiymat, birlik, maqsad, sabab: null, namuna,
    holat: baho(qiymat, maqsad, namuna),
  };
}

/** Oʻlchanmagan qator — sababi bilan. */
function yoq(kalit: KpiKalit, sabab: string, birlik: Kpi['birlik'] = 'foiz'): Kpi {
  return {
    kalit, nom: NOM[kalit], guruh: GURUH[kalit],
    qiymat: null, birlik, maqsad: KPI_MAQSAD[kalit],
    holat: 'olchanmadi', sabab, namuna: null,
  };
}

function baho(qiymat: number, maqsad: KpiMaqsad, namuna: number | null): KpiHolat {
  if (maqsad.yonalish === 'yoq' || maqsad.chegara === null) return 'maqsadsiz';
  // Kichik namuna baholanmaydi: uchta odamdan chiqqan foiz darvozani
  // ochishga ham, yopishga ham yaramaydi.
  if (namuna !== null && namuna < NAMUNA_ENG_KAM) return 'namuna-kichik';
  const yaxshi = maqsad.yonalish === 'yuqori'
    ? qiymat >= maqsad.chegara
    : qiymat <= maqsad.chegara;
  return yaxshi ? 'yaxshi' : 'yomon';
}

const foiz = (qism: number, jami: number): number =>
  Math.round((qism / jami) * 1000) / 10;

/**
 * Xom sanoqlardan KPI jadvalini yigʻadi.
 *
 * `xom === null` — baza javob bermadi. Bu holda ham jadval TOʻLIQ
 * qaytadi, faqat hamma qatori "oʻlchanmadi": panelda yoʻqolib
 * ketgan qator "hammasi joyida" boʻlib koʻrinadi.
 */
export function kpilar(
  xom: KpiXom | null,
  sifat: KpiSifat | null,
  hozir: Date = new Date(),
): Kpi[] {
  const q: Kpi[] = [];

  if (xom === null) {
    q.push(yoq('usta_3_qadam', 'baza javob bermadi'));
    q.push(yoq('tavsiya_qabul', 'baza javob bermadi'));
    q.push(yoq('bepul_pullik', 'baza javob bermadi'));
    q.push(yoq('ketish', 'baza javob bermadi'));
    q.push(yoq('ai_xarajat', 'baza javob bermadi'));
  } else {
    const usta = xom.usta.boshladi === 0
      ? yoq('usta_3_qadam', 'Ustani boshlagan foydalanuvchi yoʻq')
      : olchandi('usta_3_qadam',
          foiz(xom.usta.uchinchi_qadam, xom.usta.boshladi), xom.usta.boshladi);
    if (xom.usta.uchinchi_profilsiz > 0) {
      usta.ogoh = `${xom.usta.uchinchi_profilsiz} ta foydalanuvchi 3-qadamga profilsiz yetgan `
        + '— ular nisbatga kirmaydi (`/tovarlar` profil talab qilmaydi)';
    }
    q.push(usta);

    q.push(xom.tavsiya.qabul === null
      ? yoq('tavsiya_qabul',
          'tanlash hodisasi yozilmaydi — `events` boʻsh, oqimda "tovar tanlandi" nuqtasi yoʻq')
      : olchandi('tavsiya_qabul',
          xom.tavsiya.jami === 0 ? 0 : foiz(xom.tavsiya.qabul, xom.tavsiya.jami),
          xom.tavsiya.jami));

    // Toʻlov oqimi hech qachon ishlamagan boʻlsa, konversiya va
    // ketish 0% emas: ular OʻLCHANMAGAN. 0% mijoz haqidagi daʼvo
    // boʻlardi, holbuki bu kodning holati.
    const tolovsiz = xom.tolov.qatorlar === 0;
    q.push(tolovsiz
      ? yoq('bepul_pullik', 'toʻlov oqimi hali ishlamagan (`payments` boʻsh) — 0% xulosa emas')
      : xom.obuna.kohort === 0
        ? yoq('bepul_pullik', '30 kunlik oynasi yopilgan foydalanuvchi yoʻq')
        : olchandi('bepul_pullik',
            foiz(xom.obuna.pullik_30kun, xom.obuna.kohort), xom.obuna.kohort));

    q.push(tolovsiz
      ? yoq('ketish', 'toʻlov davri boshlanmagan (`payments` boʻsh)')
      : xom.obuna.davr_tugadi === 0
        ? yoq('ketish', 'toʻlov davri tugagan obuna yoʻq')
        : olchandi('ketish',
            foiz(xom.obuna.davr_ketdi, xom.obuna.davr_tugadi), xom.obuna.davr_tugadi));

    q.push(xom.ai.qatorlar === 0
      ? yoq('ai_xarajat', 'AI ulanmagan — `ai_usage` boʻsh')
      // Foiz uchun maxraj — tarif narxi. Narx hali belgilanmagan
      // (toʻlov oqimi yoʻq), yaʼni sonni chiqarib boʻlmaydi.
      : yoq('ai_xarajat', 'tarif narxi belgilanmagan — foizning maxraji yoʻq'));
  }

  /*
   * MAʼLUMOT YOSHI — panelning eng muhim qatori.
   *
   * Qolgan texnik KPI lar OXIRGI supurish haqida gapiradi. Agar
   * supurish umuman toʻxtab qolsa, qamrov 99.9% va xato 0% boʻlib
   * TURAVERADI — panel benuqson koʻrinadi, maʼlumot esa jimgina
   * chiriydi. Bu qator aynan shu koʻr nuqtani yopadi.
   */
  const oxirgi = sifat?.last_sweep_at ?? null;
  const vaqt = oxirgi === null ? NaN : Date.parse(oxirgi);
  q.push(!Number.isFinite(vaqt)
    ? yoq('malumot_yoshi', 'supurish hech qachon tugamagan — sana yoʻq', 'soat')
    : olchandi(
        'malumot_yoshi',
        Math.round(((hozir.getTime() - vaqt) / 3_600_000) * 10) / 10,
        null,
        'soat',
      ));

  q.push(sifat === null || sifat.coverage_percent === null
    ? yoq('skreyper_qamrovi', 'sifat hisoboti boʻsh — supurish natijasi yoʻq')
    : olchandi('skreyper_qamrovi', sifat.coverage_percent, null));

  q.push(sifat === null || sifat.error_percent === null
    ? yoq('skreyper_xatosi', 'sifat hisoboti boʻsh — supurish natijasi yoʻq')
    : olchandi('skreyper_xatosi', sifat.error_percent, null));

  // Quyidagilar CI da oʻlchanadi va natijasi hech qayerga
  // yozilmaydi. "Yashil" deb koʻrsatish oson boʻlardi, lekin u
  // panelda oxirgi CI emas, oxirgi DEPLOY holatini anglatardi.
  q.push(yoq('tuzoq_testi', 'CI da oʻlchanadi (`tuzoqlar.test.ts`), ish vaqtida yozilmaydi'));
  q.push(yoq('eval', 'CI da oʻlchanadi (`eval.test.ts`), ish vaqtida yozilmaydi'));
  q.push(yoq('qadam_tezligi', 'soʻrov vaqti oʻlchanmaydi — javob vaqti hech qayerga yozilmaydi', 'soniya'));
  q.push(yoq('avtoyechish', 'jonli rejim yoqilmagan — avtoyechish oqimi yoʻq'));

  return q;
}

/** Panel sarlavhasi uchun qisqa hisob. */
export function kpiXulosa(qatorlar: readonly Kpi[]): {
  jami: number; olchandi: number; yaxshi: number; yomon: number;
} {
  return {
    jami: qatorlar.length,
    olchandi: qatorlar.filter((k) => k.qiymat !== null).length,
    yaxshi: qatorlar.filter((k) => k.holat === 'yaxshi').length,
    yomon: qatorlar.filter((k) => k.holat === 'yomon').length,
  };
}
