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

import { OBUNA_NARXI } from './tolov.js';

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
  ai: {
    qatorlar: number;
    xarajat_usd: number | null;
    /*
     * 0071 dan (2026-10-22). Eski bazada bu maydonlar yoʻq — kod ikkala shaklni ham
     * oʻqiydi (QOIDALAR §8-h).
     */
    oxirgi?: string | null;
    bugun?: AiDavr;
    kun7?: AiDavr;
    kun30?: AiDavr & {
      /** Narxi nomaʼlum (model narx roʻyxatida yoʻq) chaqiruvlar — `usd` ga kirmagan. */
      narxsiz: number;
      /** Sessiyasi bor mijozlar soni. */
      mijoz: number;
      /** Sessiyasiz soʻrovlar (bosh sahifadagi savol) xarajati. */
      mehmon_usd: number | null;
    };
    /** Maqsad (`ai-yoz`, `sahifa`, `kartochka`…) boʻyicha, 30 kun. */
    maqsad_30kun?: Record<string, AiDavr>;
    /** Oxirgi 7 kunda mijozlar yozgan xabarlar — yozuv singanini sezish uchun. */
    xabar_7kun?: number;
  };
  hodisa: { qatorlar: number };
}

/** Bir davrdagi AI chaqiruvlari. `usd` — narxi maʼlumlari yigʻindisi; qator yoʻq — `null`. */
export interface AiDavr { chaqiruv: number; usd: number | null }

/** AI xarajati uchun bazadan tashqaridagi maʼlumot. */
export interface AiMuhit {
  /** `/health` dagidek: Anthropic kaliti — `claude`, faqat Gemini — `gemini`, hech biri — `null`. */
  provayder: 'claude' | 'gemini' | null;
  /** 1 dollar necha soʻm (CBU); olinmasa — `null`. */
  somPerUsd: number | null;
  /** Kurs sanasi (CBU, "22.10.2026"). */
  kursSanasi?: string | null;
}

/** Sifat panelidan keladigan ikkita texnik raqam. */
export interface KpiSifat {
  coverage_percent: number | null;
  error_percent: number | null;
  /** Oxirgi supurish tugagan payt (ISO). `null` — hech qachon. */
  last_sweep_at?: string | null;
}

/** Javob vaqti — backenddan xotira ichida oʻlchanadi. */
export interface KpiTezlik {
  /** P95 javob vaqti (soniyalarda). `null` — oʻlchov yoʻq. */
  soniya: number | null;
  /** Nechta soʻrovdan oʻlchandi. */
  namuna: number;
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
  tezlik: KpiTezlik | null = null,
  ai: AiMuhit | null = null,
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

    q.push(aiXarajatQatori(xom.ai, ai));
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
  q.push(tezlik === null || tezlik.soniya === null
    ? yoq('qadam_tezligi', 'soʻrov vaqti oʻlchanmaydi — javob vaqti hech qayerga yozilmaydi', 'soniya')
    : olchandi('qadam_tezligi', tezlik.soniya, tezlik.namuna, 'soniya'));
  q.push(yoq('avtoyechish', 'jonli rejim yoqilmagan — avtoyechish oqimi yoʻq'));

  return q;
}

/**
 * «AI xarajat / mijoz» (2026-10-22: `ai_usage` endi toʻladi, 0071). Oxirgi 30 kunda bir mijozga
 * oʻrtacha AI xarajati — oylik obuna narxining (`OBUNA_NARXI`) necha foizi; reja: <8%.
 *
 * Suratga sessiyasiz soʻrovlar (bosh sahifadagi «Savol bering») xarajati ham kiradi — uni ham
 * toʻlovchi mijozlar qoplaydi; maxraj — sessiyasi bor mijozlar. Narx taxminiy: roʻyxat narxi
 * boʻyicha (`llm-claude.ts`); kurs — CBU.
 */
function aiXarajatQatori(x: KpiXom['ai'], m: AiMuhit | null): Kpi {
  if (m?.provayder === 'gemini') return yoq('ai_xarajat', 'Gemini (bepul daraja) ishlayapti — uning sarfi yozilmaydi');
  if (m !== null && m.provayder === null) return yoq('ai_xarajat', 'AI kaliti yoʻq — AI ishlamayapti');
  const oy = x.kun30;
  if (!oy) {
    return yoq('ai_xarajat', x.qatorlar === 0
      ? 'AI xarajati yozilmayapti — `ai_usage` boʻsh'
      : 'baza eski shaklda — 0071 qoʻllanmagan');
  }
  const k = oy.chaqiruv === 0
    ? yoq('ai_xarajat', 'oxirgi 30 kunda AI chaqiruvi yozilmagan')
    : oy.mijoz === 0
      ? yoq('ai_xarajat', 'AI ni faqat sessiyasiz mehmonlar ishlatgan — mijozga boʻlib boʻlmaydi')
      : oy.usd === null
        ? yoq('ai_xarajat', 'birorta chaqiruvning narxi maʼlum emas')
        : !m?.somPerUsd
          ? yoq('ai_xarajat', 'dollar kursi olinmadi (CBU) — soʻmga oʻgirib boʻlmadi')
          : olchandi('ai_xarajat', foiz((oy.usd / oy.mijoz) * m.somPerUsd, OBUNA_NARXI), oy.mijoz);
  const ogoh = aiOgohlar(x, m);
  return ogoh.length ? { ...k, ogoh: ogoh.join('; ') } : k;
}

/**
 * Raqam bor, lekin toʻliq emas — yoki umuman yozilmayapti. Ikkinchisi — jim oʻlim qorovuli
 * (QOIDALAR §8): Claude ulangan, mijozlar yozyapti, sarf esa yozilmayapti. `ai_usage` aynan
 * shunday yarim oy boʻsh turgan — panel «AI ulanmagan» der edi, AI esa ishlab turardi.
 */
function aiOgohlar(x: KpiXom['ai'], m: AiMuhit | null): string[] {
  const narxsiz = x.kun30?.narxsiz ?? 0;
  const xabar = x.xabar_7kun ?? 0;
  return [
    narxsiz > 0 ? `${narxsiz} ta chaqiruvning narxi nomaʼlum (model narx roʻyxatida yoʻq) — hisobga kirmadi` : null,
    m?.provayder === 'claude' && x.kun7 && xabar > 0 && x.kun7.chaqiruv === 0
      ? `oxirgi 7 kunda mijozlar ${xabar} ta xabar yozgan, AI sarfi esa yozilmagan — yozuv ishlamayotgan `
        + 'boʻlishi mumkin (Edge logida «ai sarfi yozilmadi»)'
      : null,
  ].filter((s): s is string => s !== null);
}

/** AI maqsadi (`LlmChaqiruvi.belgi`) — panelda shu nom bilan. */
export const AI_MAQSAD_NOMI: Readonly<Record<string, string>> = {
  'ai-yoz': 'Suhbat — xabar yozish',
  'ai-tushun': 'Suhbat — javobni tushunish',
  erkin: 'Erkin savolga javob',
  munosabat: 'Javobga munosabat',
  sahifa: '«Savol bering» oynasi',
  kartochka: 'Kartochka matni (10-qadam)',
  odamlashtir: 'Jumlani qayta aytish',
};

/** `/olchov` dagi «AI xarajati» bloki — hisob (soʻmga oʻgirish) shu yerda, panel faqat chizadi. */
export interface AiXarajati {
  /** Chaqiruv yoʻq davr — $0 (oʻlchangan nol: chaqiruv sanaladi); narxi nomaʼlum — `null`. */
  davrlar: Array<{ nom: string; chaqiruv: number; usd: number | null; som: number | null }>;
  /** 30 kunda bir mijozga oʻrtacha; mijoz yoki narx yoʻq — `null`. */
  mijozBoshiga: { usd: number; som: number | null; mijoz: number } | null;
  /** Sessiyasiz soʻrovlar xarajati, 30 kun. */
  mehmonUsd: number | null;
  /** 30 kun, qimmatidan arzoniga. */
  maqsadlar: Array<{ maqsad: string; nom: string; chaqiruv: number; usd: number | null }>;
  ogoh: string[];
  oxirgi: string | null;
  kurs: { somPerUsd: number; sana: string | null } | null;
}

/** Eski baza shaklida (0071 gacha) — `null`: blok «oʻlchanmadi» deb chiqadi. */
export function aiXarajati(x: KpiXom['ai'] | null | undefined, m: AiMuhit | null): AiXarajati | null {
  if (!x?.bugun || !x.kun7 || !x.kun30) return null;
  // $0 — kurssiz ham 0 soʻm; boshqasi kurs boʻlsagina.
  const somga = (usd: number | null) =>
    (usd === null ? null : usd === 0 ? 0 : m?.somPerUsd ? Math.round(usd * m.somPerUsd) : null);
  const davr = (nom: string, d: AiDavr) => {
    const usd = d.chaqiruv === 0 ? 0 : d.usd;
    return { nom, chaqiruv: d.chaqiruv, usd, som: somga(usd) };
  };
  const oy = x.kun30;
  const boshiga = oy.mijoz > 0 && oy.usd !== null ? oy.usd / oy.mijoz : null;
  return {
    davrlar: [davr('Bugun', x.bugun), davr('7 kun', x.kun7), davr('30 kun', oy)],
    mijozBoshiga: boshiga === null ? null : { usd: boshiga, som: somga(boshiga), mijoz: oy.mijoz },
    mehmonUsd: oy.mehmon_usd,
    maqsadlar: Object.entries(x.maqsad_30kun ?? {})
      .map(([maqsad, d]) => ({ maqsad, nom: AI_MAQSAD_NOMI[maqsad] ?? maqsad, chaqiruv: d.chaqiruv, usd: d.usd }))
      .sort((a, b) => (b.usd ?? 0) - (a.usd ?? 0) || b.chaqiruv - a.chaqiruv),
    ogoh: aiOgohlar(x, m),
    oxirgi: x.oxirgi ?? null,
    kurs: m?.somPerUsd ? { somPerUsd: m.somPerUsd, sana: m.kursSanasi ?? null } : null,
  };
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
