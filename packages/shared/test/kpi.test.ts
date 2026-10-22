import { describe, expect, it } from 'vitest';
import {
  KPI_MAQSAD, NAMUNA_ENG_KAM, YOSH_ENG_KOP_SOAT, aiXarajati, kpiXulosa, kpilar,
  type AiMuhit, type Kpi, type KpiKalit, type KpiXom,
} from '../src/kpi.js';

/** Toʻlov ham, AI ham ulanmagan holat — bugungi haqiqiy holat. */
const XOM: KpiXom = {
  usta: { boshladi: 3, uchinchi_qadam: 0, uchinchi_profilsiz: 1 },
  tavsiya: { jami: 27, qabul: null },
  obuna: { kohort: 0, pullik_30kun: 0, davr_tugadi: 0, davr_ketdi: 0 },
  tolov: { qatorlar: 0 },
  ai: { qatorlar: 0, xarajat_usd: null },
  hodisa: { qatorlar: 0 },
};

const ol = (q: Kpi[], k: KpiKalit): Kpi => {
  const t = q.find((x) => x.kalit === k);
  if (!t) throw new Error(`KPI yoʻq: ${k}`);
  return t;
};

describe('kpilar — oʻlchanmagan KPI nol emas', () => {
  it('rejadagi oʻn bitta KPI ham qaytadi', () => {
    expect(kpilar(XOM, null)).toHaveLength(Object.keys(KPI_MAQSAD).length);
  });

  /*
   * Eng muhim tekshiruv. Toʻlov oqimi hech qachon ishlamagan
   * boʻlsa "konversiya 0%" mahsulot haqidagi DAʼVO boʻlardi,
   * holbuki bu kodning holati (QOIDALAR.md, 4-qoida).
   */
  it('toʻlov oqimi yoʻqda konversiya va ketish 0% emas, `null`', () => {
    const q = kpilar(XOM, null);
    for (const k of ['bepul_pullik', 'ketish'] as const) {
      expect(ol(q, k).qiymat, k).toBeNull();
      expect(ol(q, k).holat, k).toBe('olchanmadi');
      expect(ol(q, k).sabab, k).toContain('payments');
    }
  });

  it('AI ulanmaganda xarajat 0 emas, `null`', () => {
    expect(ol(kpilar(XOM, null), 'ai_xarajat').qiymat).toBeNull();
  });

  it('tanlash hodisasi yozilmasa qabul foizi `null`', () => {
    expect(ol(kpilar(XOM, null), 'tavsiya_qabul').qiymat).toBeNull();
  });

  it('har `null` qatorda sabab bor, har raqamli qatorda yoʻq', () => {
    for (const k of kpilar(XOM, { coverage_percent: 96, error_percent: 0.4 })) {
      if (k.qiymat === null) expect(k.sabab, k.kalit).toBeTruthy();
      else expect(k.sabab, k.kalit).toBeNull();
    }
  });

  it('baza javob bermasa ham jadval toʻliq qaytadi — qator yoʻqolmaydi', () => {
    const q = kpilar(null, null);
    expect(q).toHaveLength(Object.keys(KPI_MAQSAD).length);
    expect(q.every((k) => k.qiymat === null)).toBe(true);
  });
});

describe('kpilar — kichik namuna', () => {
  it('namuna chegaradan kichik boʻlsa "yomon" deb belgilanmaydi', () => {
    const k = ol(kpilar(XOM, null), 'usta_3_qadam');
    expect(k.qiymat).toBe(0);
    expect(k.namuna).toBe(3);
    expect(k.holat).toBe('namuna-kichik');
  });

  it('namuna yetarli boʻlsa maqsad boʻyicha baholanadi', () => {
    const kop = (boshladi: number, uchinchi: number): KpiXom =>
      ({ ...XOM, usta: { boshladi, uchinchi_qadam: uchinchi, uchinchi_profilsiz: 0 } });

    const yomon = ol(kpilar(kop(NAMUNA_ENG_KAM, 5), null), 'usta_3_qadam');
    expect(yomon.qiymat).toBe(25);
    expect(yomon.holat).toBe('yomon');

    const yaxshi = ol(kpilar(kop(NAMUNA_ENG_KAM, 15), null), 'usta_3_qadam');
    expect(yaxshi.qiymat).toBe(75);
    expect(yaxshi.holat).toBe('yaxshi');
  });

  /*
   * 3-qadamga profilsiz yetgan odam nisbatga kirmaydi, lekin
   * jimgina yoʻqolmaydi ham: `/tovarlar` profil talab qilmaydi
   * va bu nisbatning toʻliq emasligini bildiradi.
   */
  it('profilsiz 3-qadam ogohlantirish sifatida koʻrinadi', () => {
    expect(ol(kpilar(XOM, null), 'usta_3_qadam').ogoh).toContain('profilsiz');
    const toza = { ...XOM, usta: { ...XOM.usta, uchinchi_profilsiz: 0 } };
    expect(ol(kpilar(toza, null), 'usta_3_qadam').ogoh).toBeUndefined();
  });
});

describe('kpilar — texnik qatorlar', () => {
  it('sifat hisoboti boʻlsa qamrov va xato oʻlchanadi', () => {
    const q = kpilar(XOM, { coverage_percent: 96.2, error_percent: 0.4 });
    expect(ol(q, 'skreyper_qamrovi').holat).toBe('yaxshi');
    expect(ol(q, 'skreyper_xatosi').holat).toBe('yaxshi');
  });

  it('chegaradan chiqsa "yomon"', () => {
    const q = kpilar(XOM, { coverage_percent: 80, error_percent: 5 });
    expect(ol(q, 'skreyper_qamrovi').holat).toBe('yomon');
    expect(ol(q, 'skreyper_xatosi').holat).toBe('yomon');
  });

  it('CI da oʻlchanadigan KPI lar "yashil" deb koʻrsatilmaydi', () => {
    const q = kpilar(XOM, { coverage_percent: 99, error_percent: 0 });
    for (const k of ['tuzoq_testi', 'eval'] as const) {
      expect(ol(q, k).qiymat, k).toBeNull();
      expect(ol(q, k).sabab, k).toContain('CI');
    }
  });
});

describe('kpiXulosa', () => {
  it('nechtasi oʻlchandi va nechtasi yomon', () => {
    const q = kpilar(XOM, { coverage_percent: 96, error_percent: 0.4 });
    const x = kpiXulosa(q);
    expect(x.jami).toBe(q.length);
    expect(x.olchandi).toBe(3); // usta_3_qadam + qamrov + xato
    expect(x.yomon).toBe(0);
  });
});

/**
 * Maʼlumot yoshi — panelning koʻr nuqtasi.
 *
 * NEGA BU QATOR BOR. Qolgan texnik KPI lar OXIRGI supurish haqida
 * gapiradi. Supurish umuman toʻxtab qolsa, qamrov 99.9% va xato
 * 0% boʻlib TURAVERADI — panel benuqson koʻrinadi, maʼlumot esa
 * jimgina eskiradi. Bugun 12:00 dagi supurish 58 daqiqa kechikdi
 * va buni faqat qoʻlda qarab bildim.
 */
describe('malumot_yoshi', () => {
  const HOZIR = new Date('2026-08-25T12:00:00.000Z');
  const sifat = (soat: number) => ({
    coverage_percent: 99.9,
    error_percent: 0,
    last_sweep_at: new Date(HOZIR.getTime() - soat * 3_600_000).toISOString(),
  });

  it('yosh soatda oʻlchanadi', () => {
    const k = ol(kpilar(XOM, sifat(3), HOZIR), 'malumot_yoshi');
    expect(k.qiymat).toBe(3);
    expect(k.birlik).toBe('soat');
    expect(k.holat).toBe('yaxshi');
  });

  it('chegaradan katta yosh — YOMON', () => {
    const k = ol(kpilar(XOM, sifat(YOSH_ENG_KOP_SOAT + 1), HOZIR), 'malumot_yoshi');
    expect(k.holat).toBe('yomon');
  });

  it('chegaraning oʻzi hali yaxshi', () => {
    const k = ol(kpilar(XOM, sifat(YOSH_ENG_KOP_SOAT), HOZIR), 'malumot_yoshi');
    expect(k.holat).toBe('yaxshi');
  });

  /*
   * ENG MUHIM TEKSHIRUV. Supurish toʻxtasa ham qamrov va xato
   * yashil boʻlib qolaveradi — faqat shu qator qizaradi.
   */
  it('supurish toʻxtasa: qamrov yashil, yosh QIZIL', () => {
    const q = kpilar(XOM, sifat(48), HOZIR);
    expect(ol(q, 'skreyper_qamrovi').holat).toBe('yaxshi');
    expect(ol(q, 'skreyper_xatosi').holat).toBe('yaxshi');
    expect(ol(q, 'malumot_yoshi').holat).toBe('yomon');
  });

  it('sana yoʻq boʻlsa — oʻlchanmadi, NOL emas', () => {
    const k = ol(kpilar(XOM, { coverage_percent: 99, error_percent: 0 }, HOZIR), 'malumot_yoshi');
    expect(k.qiymat).toBeNull();
    expect(k.holat).toBe('olchanmadi');
    expect(k.sabab).toContain('sana yoʻq');
  });

  it('buzuq sana ham NOL boʻlmaydi', () => {
    const k = ol(kpilar(XOM, {
      coverage_percent: 99, error_percent: 0, last_sweep_at: 'sana emas',
    }, HOZIR), 'malumot_yoshi');
    expect(k.qiymat).toBeNull();
    expect(k.holat).toBe('olchanmadi');
  });
});

/*
 * AI XARAJAT (2026-10-22, nazoratchi: «AI xarajatini tuzat»). `ai_usage` yarim oy boʻsh turdi —
 * panel «AI ulanmagan» der edi, Claude esa har xabarni yozardi. 0071 dan: 30 kunda bir mijozga
 * oʻrtacha AI xarajati — oylik obuna narxining (149 000 soʻm) necha foizi; reja: <8%.
 */
describe('AI xarajat / mijoz (0071)', () => {
  const HOZIR = new Date('2026-10-22T12:00:00Z');
  const CLAUDE: AiMuhit = { provayder: 'claude', somPerUsd: 12_800, kursSanasi: '22.10.2026' };
  type Oy = NonNullable<KpiXom['ai']['kun30']>;
  const AI = (oy: Partial<Oy> = {}, ortiq: Partial<KpiXom['ai']> = {}): KpiXom['ai'] => ({
    qatorlar: 400, xarajat_usd: 3.2, oxirgi: '2026-10-22T07:00:00Z',
    bugun: { chaqiruv: 40, usd: 0.32 },
    kun7: { chaqiruv: 200, usd: 1.6 },
    kun30: { chaqiruv: 400, usd: 3.2, narxsiz: 0, mijoz: 25, mehmon_usd: 0.2, ...oy },
    maqsad_30kun: {
      sahifa: { chaqiruv: 50, usd: 0.2 }, 'ai-yoz': { chaqiruv: 200, usd: 2.4 }, 'ai-tushun': { chaqiruv: 150, usd: 0.6 },
    },
    xabar_7kun: 180,
    ...ortiq,
  });
  const qator = (ai: KpiXom['ai'], m: AiMuhit | null = CLAUDE) => ol(kpilar({ ...XOM, ai }, null, HOZIR, null, m), 'ai_xarajat');

  it('oʻlchandi: $3,2 / 25 mijoz × 12 800 soʻm = 1 638 soʻm — 149 000 ning 1,1 %i, maqsadda', () => {
    const k = qator(AI());
    expect(k.qiymat).toBe(1.1);
    expect(k.holat).toBe('yaxshi');
    expect(k.namuna).toBe(25);
    expect(k.sabab).toBeNull();
    expect(k.ogoh).toBeUndefined();
  });

  it('mijozga $1 (12 800 soʻm) — 8,6 %: maqsaddan past', () => {
    const k = qator(AI({ usd: 25 }));
    expect(k.qiymat).toBe(8.6);
    expect(k.holat).toBe('yomon');
  });

  it('mijoz kam (3) — foiz bor, lekin «namuna kichik»: darvoza uni yomon demaydi', () => {
    expect(qator(AI({ mijoz: 3 })).holat).toBe('namuna-kichik');
  });

  it('oʻlchanmagan holatlar — `null` va sababi, nol emas', () => {
    const holatlar: Array<[KpiXom['ai'], AiMuhit | null, RegExp]> = [
      [{ qatorlar: 0, xarajat_usd: null }, CLAUDE, /`ai_usage` boʻsh/],
      [{ qatorlar: 12, xarajat_usd: 0.1 }, CLAUDE, /0071 qoʻllanmagan/],
      [AI(), { provayder: 'gemini', somPerUsd: 12_800 }, /Gemini/],
      [AI(), { provayder: null, somPerUsd: 12_800 }, /AI kaliti yoʻq/],
      [AI({ chaqiruv: 0, usd: null, mijoz: 0 }), CLAUDE, /30 kunda AI chaqiruvi yozilmagan/],
      [AI({ mijoz: 0 }), CLAUDE, /sessiyasiz mehmonlar/],
      [AI({ usd: null, narxsiz: 400 }), CLAUDE, /narxi maʼlum emas/],
      [AI(), { provayder: 'claude', somPerUsd: null }, /dollar kursi olinmadi/],
    ];
    for (const [ai, m, sabab] of holatlar) {
      const k = qator(ai, m);
      expect(k.qiymat, String(sabab)).toBeNull();
      expect(k.holat, String(sabab)).toBe('olchanmadi');
      expect(k.sabab, String(sabab)).toMatch(sabab);
    }
  });

  it('narxi nomaʼlum chaqiruv — raqam bor, lekin ogohlik bilan', () => {
    const k = qator(AI({ narxsiz: 7 }));
    expect(k.qiymat).toBe(1.1);
    expect(k.ogoh).toMatch(/7 ta chaqiruvning narxi nomaʼlum/);
  });

  /*
   * ENG MUHIM TEKSHIRUV — jim oʻlim qorovuli. Yozuv sinsa, 30 kunlik raqam bir necha kun
   * «maqsadda» boʻlib turaveradi; faqat shu ogohlik qizaradi.
   */
  it('Claude ulangan, mijozlar yozyapti, 7 kunda sarf yoʻq — «yozuv ishlamayotgan boʻlishi mumkin»', () => {
    const singan = AI({}, { kun7: { chaqiruv: 0, usd: null } });
    expect(qator(singan).ogoh).toMatch(/180 ta xabar yozgan, AI sarfi esa yozilmagan/);
    expect(qator(AI({ chaqiruv: 0, usd: null, mijoz: 0 }, { kun7: { chaqiruv: 0, usd: null } })).ogoh)
      .toMatch(/yozuv ishlamayotgan/);
    // Mijoz yozmagan boʻlsa — sarf yoʻqligi tabiiy.
    expect(qator(AI({}, { kun7: { chaqiruv: 0, usd: null }, xabar_7kun: 0 })).ogoh).toBeUndefined();
    // Sarf yozilyapti — ogohlik yoʻq.
    expect(qator(AI()).ogoh).toBeUndefined();
  });

  it('AI muhiti berilmasa (eski chaqiruvchi) — bazadagi raqam boʻyicha, kurssiz', () => {
    expect(qator(AI(), null).sabab).toMatch(/dollar kursi/);
  });
});

describe('aiXarajati — `/olchov` dagi «AI xarajati» bloki', () => {
  const CLAUDE: AiMuhit = { provayder: 'claude', somPerUsd: 12_800, kursSanasi: '22.10.2026' };
  const AI: KpiXom['ai'] = {
    qatorlar: 400, xarajat_usd: 3.2, oxirgi: '2026-10-22T07:00:00Z',
    bugun: { chaqiruv: 40, usd: 0.32 },
    kun7: { chaqiruv: 200, usd: 1.6 },
    kun30: { chaqiruv: 400, usd: 3.2, narxsiz: 0, mijoz: 25, mehmon_usd: 0.2 },
    maqsad_30kun: {
      sahifa: { chaqiruv: 50, usd: 0.2 }, 'ai-yoz': { chaqiruv: 200, usd: 2.4 }, yangi: { chaqiruv: 1, usd: 0.0001 },
    },
    xabar_7kun: 180,
  };

  it('davrlar — dollarda va soʻmda (CBU kursi bilan)', () => {
    const x = aiXarajati(AI, CLAUDE)!;
    expect(x.davrlar).toEqual([
      { nom: 'Bugun', chaqiruv: 40, usd: 0.32, som: 4096 },
      { nom: '7 kun', chaqiruv: 200, usd: 1.6, som: 20480 },
      { nom: '30 kun', chaqiruv: 400, usd: 3.2, som: 40960 },
    ]);
    expect(x.mijozBoshiga!.usd).toBeCloseTo(0.128, 9);
    expect(x.mijozBoshiga).toMatchObject({ som: 1638, mijoz: 25 });
    expect(x.mehmonUsd).toBe(0.2);
    expect(x.kurs).toEqual({ somPerUsd: 12_800, sana: '22.10.2026' });
    expect(x.oxirgi).toBe('2026-10-22T07:00:00Z');
    expect(x.ogoh).toEqual([]);
  });

  it('maqsadlar — qimmatidan arzoniga, oʻzbekcha nomi bilan; notanish maqsad — oʻz nomi bilan', () => {
    expect(aiXarajati(AI, CLAUDE)!.maqsadlar).toEqual([
      { maqsad: 'ai-yoz', nom: 'Suhbat — xabar yozish', chaqiruv: 200, usd: 2.4 },
      { maqsad: 'sahifa', nom: '«Savol bering» oynasi', chaqiruv: 50, usd: 0.2 },
      { maqsad: 'yangi', nom: 'yangi', chaqiruv: 1, usd: 0.0001 },
    ]);
  });

  it('chaqiruvsiz kun — $0 va 0 soʻm (kurssiz ham); kurs yoʻq — soʻm `null`, toʻqilmaydi', () => {
    const x = aiXarajati({ ...AI, bugun: { chaqiruv: 0, usd: null } }, { provayder: 'claude', somPerUsd: null })!;
    expect(x.davrlar[0]).toEqual({ nom: 'Bugun', chaqiruv: 0, usd: 0, som: 0 });
    expect(x.davrlar[1]).toEqual({ nom: '7 kun', chaqiruv: 200, usd: 1.6, som: null });
    expect(x.mijozBoshiga!.som).toBeNull();
    expect(x.kurs).toBeNull();
  });

  it('eski baza shakli (0071 gacha) yoki baza javob bermadi — `null`: blok «oʻlchanmadi» deydi', () => {
    expect(aiXarajati({ qatorlar: 0, xarajat_usd: null }, CLAUDE)).toBeNull();
    expect(aiXarajati(null, CLAUDE)).toBeNull();
  });

  it('jim oʻlim ogohligi blokda ham chiqadi', () => {
    expect(aiXarajati({ ...AI, kun7: { chaqiruv: 0, usd: null } }, CLAUDE)!.ogoh.join(' '))
      .toMatch(/yozuv ishlamayotgan/);
  });
});
