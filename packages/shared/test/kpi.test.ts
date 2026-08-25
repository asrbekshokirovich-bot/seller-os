import { describe, expect, it } from 'vitest';
import {
  KPI_MAQSAD, NAMUNA_ENG_KAM, kpiXulosa, kpilar,
  type Kpi, type KpiKalit, type KpiXom,
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
