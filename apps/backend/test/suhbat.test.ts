/**
 * Suhbat orkestratori — soxta baza va soxta kod bilan.
 *
 * Tekshiriladigan narsa: bitta turnda nima YOZILADI va nima
 * QAYTADI. Baza yo'q — `rpc` soxta, xotirada. Kod harakatlari ham
 * soxta: ular deterministik hisob, o'z testlari bor.
 *
 * Eng muhim holatlar:
 *   - javob → kod harakati → keyingi savol, BITTA turnda, bitta yozuv
 *   - navbat buzilsa hech narsa yozilmaydi
 *   - LLM raqam qo'shsa — kod jumlasi ketadi (tekshiruv ishlaydi)
 *   - LLM yiqilsa — oqim to'xtamaydi
 */

import { describe, expect, it } from 'vitest';
import {
  boshlangichHolat, suhbatBoshdan, suhbatOqi, suhbatTurn,
  type SuhbatBogliqliklari, type YolHolati,
} from '@selleros/shared';

const YONALISHLAR = { olchov_yoq: false, royxat: [
  { categoryId: 11, name: 'Quloqchinlar', yetadi: true, ball: { value: 72 } },
] };
const TOVARLAR = { olchov_yoq: false, royxat: [
  { nomzod: { productId: 100, title: 'Quloqchin A', narxSom: 95000, rasmUrl: 'https://images.uzum.uz/aaa/t_product_540_high.jpg' }, miqdor: { dona: 30, hisob: '30 kun = 30' } },
], chiqarildi: [] };
const RASM = 'https://images.uzum.uz/aaa/t_product_540_high.jpg';
const XITOY = { olchov_yoq: false, kurs: { somPerYuan: 1762.49, sana: '25.09.2026', manba: 'CBU' }, qatorlar: [{
  productId: 100, title: 'Quloqchin A', rasmUrl: RASM,
  chegaraSom: 60_000, yetishmaydi: ['kargo'], holat: 'topildi', sabab: null, jami: 680,
  takliflar: [{ sourceId: '983093623752', title: 'T', narxYuan: 27, rasmUrl: 'https://cbu01.alicdn.com/a.jpg', moq: 1, reyting: 4.15, manba: '1688',
    manzil: null, oxshashlikOrni: 1, dropshipNarxYuan: null, buyurtmalar: 88655, zavod: true, superZavod: false, sotuvchi: null, joy: null, dokonYili: 12,
    narxSom: 47_587, chegaradaMi: true }],
  keshdan: false, tashlandi: 0,
}], kutilmoqda: null };
const BUYURTMA = { olchov_yoq: false, qatorlar: [{ productId: 100, title: 'Quloqchin A', sourceId: '983093623752', xitoyTitle: 'T', manzil: null, miqdor: 30, narxYuan: 27, narxSom: 47_587, jamiYuan: 810, jamiSom: 1_427_610, weightG: null, kargoSom: null, kargoIzoh: 'kargo hamkori, kargo stavkasi kiritilmagan', holat: 'tayyor' }],
  jami: { yuan: 810, som: 1_427_610, kargoSom: null, dona: 30, tayyor: 1, tanlanmagan: 0 },
  kargo: { hamkor: null, avia: null, quruqlik: null, usdM3: null, minUsd: null, tanlovBor: false, izoh: 'kargo hamkori, kargo stavkasi kiritilmagan' },
  kurs: { cny: { somPerYuan: 1762.49, valyuta: 'CNY', sana: '25.09.2026', manba: 'CBU' }, usd: null }, izoh: 'varaqa' };
const OCHIQ = { olchov_yoq: false, id: 1, yangi: true, tur: 'kutyapman', muddat: null, izoh: 'ochiq ish' };
/** 7-qadam: faktlar boʻsh (savol matnlari "faktda yoʻq" deydi), kabinet yoʻq. */
const MANBASIZ = { manba: null, olchandi: null };
const RASMIY_N = {
  olchov_yoq: false, kabinetBor: false, partiyaSotuvSom: null,
  faktlar: {
    bhmSom: null,
    yatt: { bojShaxsanSom: null, bojOnlaynSom: null, royxatUrl: null, muddatDaqiqa: null, xodimMax: null, ...MANBASIZ },
    soliq: { aylanmaFoiz: null, aylanmaChegaraSom: null, ijtimoiyOySom: null, tolovKuni: null, rejimTugaydi: null, ...MANBASIZ },
    banklar: [], bankTashlandi: 0,
    uzum: { kabinetUrl: null, qollanmaUrl: null, komissioner: { stir: null, nom: null, mfo: null, hisob: null, muddatYil: null }, faollashtirishKun: null, qollabQuvvatlashUrl: null, tolovStandart: null, ...MANBASIZ },
    yetishmaydi: ['BHM'],
  },
  soliq: { ijtimoiySom: null, aylanmaSom: null, jamiSom: null, sotuvSom: null, yetishmaydi: ['ijtimoiy soliq'] },
  izoh: 'rasmiy',
};
const YAKUN_N = { olchov_yoq: false, yozildi: [], izoh: 'yakun' };
/** 8-qadam: faktlar boʻsh (savol matnlari "faktda yoʻq" deydi). */
const QABUL_N = {
  olchov_yoq: false, jamiDona: 30, izoh: 'qabul',
  faktlar: {
    ombor: { manzil: null, soat: null }, qaytarish: { manzil: null, soat: null },
    muddatKunMax: null, tafovutSom: null, taqiqJarimaSom: null,
    taymslot: { ozgartirishMax: null, bekorSoat: null }, yetkazma: { skuMax: null, aktNusxa: null, qutiToliqlik: null },
    yorliq: {}, qadoq: [], qadoqTashlandi: 0, qadoqUmumiy: null,
    logistika: { url: null, qutiKgMax: null, oldinKun: null }, qollanmaUrl: null, manba: null, olchandi: null,
    yetishmaydi: ['ombor manzili'],
  },
  qatorlar: [{ productId: 100, title: 'Quloqchin A', miqdor: 30, qadoq: null }],
};
const QABUL_YAKUN_N = { olchov_yoq: false, yozildi: [], izoh: 'qabul yakun' };
/** Yurish boshlandi — natija hali yoʻq. */
const XITOY_KUTISH = { ...XITOY, qatorlar: [], kutilmoqda: { runId: 'HG7ML7M8z78YcAPEB', boshlandi: '2026-09-25T20:00:00.000Z', rasmlar: [{ productId: 100, rasmUrl: RASM }] } };

/** Xotiradagi soxta baza — so_suhbat_* RPC lari. */
function soxtaBaza(boshlangich: YolHolati | null = null) {
  const jurnal: unknown[] = [];
  let holat: YolHolati | null = boshlangich;
  let profil: Record<string, unknown> = {};
  const rpc = async <T>(nom: string, arg: unknown): Promise<T | null> => {
    const a = arg as Record<string, unknown>;
    if (a.p_token !== 'tok') return { xato: 'sessiya topilmadi' } as T;
    if (nom === 'so_suhbat_oqi') return { holat, qadam: null, xabarlar: jurnal } as T;
    if (nom === 'so_suhbat_yoz') {
      jurnal.push(...(a.p_xabarlar as unknown[]));
      holat = a.p_holat as YolHolati;
      if (a.p_profil) profil = { ...profil, ...(a.p_profil as Record<string, unknown>) };
      return { yozildi: (a.p_xabarlar as unknown[]).length } as T;
    }
    if (nom === 'so_suhbat_boshdan') { holat = boshlangichHolat(); return { tozalandi: true } as T; }
    return null;
  };
  return { rpc, jurnal, holat: () => holat, profil: () => profil };
}

function bogliq(b: ReturnType<typeof soxtaBaza>, llm?: SuhbatBogliqliklari['llm']): SuhbatBogliqliklari {
  return {
    rpc: b.rpc,
    kod: {
      yonalishlar: async () => YONALISHLAR,
      tovarlar: async () => TOVARLAR,
      tannarx: async () => ({ hisoblandi: true }),
      // Birinchi chaqiruv yurishni boshlaydi (kutilmoqda), tekshiruvda tugaydi.
      xitoy: async (h: YolHolati) => ((h.natijalar.xitoy as { kutilmoqda?: unknown } | undefined)?.kutilmoqda ? XITOY : XITOY_KUTISH),
      buyurtma: async () => BUYURTMA,
      ochiqIsh: async () => OCHIQ,
      rasmiy: async () => RASMIY_N,
      rasmiyYakun: async () => YAKUN_N,
      qabul: async () => QABUL_N,
      qabulYakun: async () => QABUL_YAKUN_N,
    },
    ...(llm ? { llm } : {}),
  };
}

describe('suhbatOqi', () => {
  it('birinchi tashrif: holat yo\'q, birinchi savol byudjet', async () => {
    const b = soxtaBaza();
    const r = await suhbatOqi(bogliq(b), 'tok');
    if ('xato' in r && !('keyingi' in r)) throw new Error(r.xato);
    expect(r.keyingi.tur).toBe('savol');
    if (r.keyingi.tur === 'savol') expect(r.keyingi.savol.id).toBe('byudjet');
    expect(r.qadam).toBe(1);
  });
  it('noto\'g\'ri token — xato, hech narsa emas', async () => {
    const r = await suhbatOqi(bogliq(soxtaBaza()), 'yomon');
    expect('xato' in r && r.xato).toMatch(/sessiya/);
  });
});

describe('suhbatTurn', () => {
  it('byudjet javobi: obunachi xabari + keyingi savol, profil yoziladi', async () => {
    const b = soxtaBaza();
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', javob: 10_000_000 });
    expect(r.xato).toBeUndefined();
    expect(r.xabarlar.map((x) => x.rol)).toEqual(['obunachi', 'menejer']);
    expect(r.xabarlar[0]!.matn).toBe('10 mln soʻm');
    if (r.keyingi.tur !== 'savol') throw new Error();
    expect(r.keyingi.savol.id).toBe('uzum_dokoni');
    expect(b.profil()).toEqual({ budgetUzs: 10_000_000 });
    expect(b.jurnal.length).toBe(2);
  });

  it('erkin matn ham kutilayotgan savolga javob sifatida olinadi', async () => {
    const b = soxtaBaza();
    const r = await suhbatTurn(bogliq(b), 'tok', { matn: '7000000' });
    expect(r.xato).toBeUndefined();
    expect(b.holat()!.javoblar['byudjet']).toBe(7_000_000);
  });

  it('NAVBAT buzilsa: xato, jurnalga HECH NARSA yozilmaydi', async () => {
    const b = soxtaBaza();
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', javob: 'yoq' });
    expect(r.xato).toMatch(/navbat/);
    expect(b.jurnal.length).toBe(0);
    expect(r.yozildi).toBe(false);
  });

  it('kod harakati BITTA turnda bajariladi: uzum_dokoni → yonalishlar → yo\'nalish savoli', async () => {
    let h = boshlangichHolat();
    h = { ...h, javoblar: { byudjet: 10_000_000 } };
    const b = soxtaBaza(h);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', javob: 'yoq' });
    expect(r.xato).toBeUndefined();
    expect(r.xabarlar.map((x) => x.rol)).toEqual(['obunachi', 'kod', 'menejer']);
    expect(r.xabarlar[1]!.savolId).toBe('yonalishlar');
    expect(r.xabarlar[1]!.matn).toMatch(/1 ta yoʻnalish/);
    if (r.keyingi.tur !== 'savol') throw new Error();
    expect(r.keyingi.savol.id).toBe('yonalish');
    expect(r.keyingi.savol.variantlar[0]!.nom).toBe('Quloqchinlar');
    expect(r.qadam).toBe(2);
    expect(b.holat()!.natijalar.yonalishlar).toEqual(YONALISHLAR);
  });

  it('kod yiqilsa oqim to\'xtamaydi — "o\'lchov yo\'q" bilan davom etadi', async () => {
    const b = soxtaBaza({ javoblar: { byudjet: 1 }, natijalar: {} });
    const d = bogliq(b);
    d.kod.yonalishlar = async () => { throw new Error('baza uzildi'); };
    const r = await suhbatTurn(d, 'tok', { savolId: 'uzum_dokoni', javob: 'yoq' });
    expect(r.xato).toBeUndefined();
    expect(r.xabarlar[1]!.matn).toMatch(/hisoblab bera olmadim/);
    if (r.keyingi.tur !== 'savol') throw new Error();
    expect(r.keyingi.savol.otkazishMumkin).toBe(true);
  });

  it('LLM jumlani odamlashtiradi — raqam qo\'shmasa qabul', async () => {
    const b = soxtaBaza();
    const d = bogliq(b, async (m) => `Assalomu alaykum! ${m}`);
    const r = await suhbatTurn(d, 'tok', { savolId: 'byudjet', javob: 5_000_000 });
    expect(r.xabarlar[1]!.matn).toMatch(/^Assalomu alaykum/);
  });

  it('LLM RAQAM QO\'SHSA — kod jumlasi ketadi', async () => {
    const b = soxtaBaza();
    const d = bogliq(b, async () => 'Uzumda doʻkoningiz bormi? Odatda 350 ta sotuvchi bor.');
    const r = await suhbatTurn(d, 'tok', { savolId: 'byudjet', javob: 5_000_000 });
    expect(r.xabarlar[1]!.matn).toBe('Uzumda doʻkoningiz bormi?');
  });

  it('LLM KAFOLAT yozsa — kod jumlasi ketadi', async () => {
    const b = soxtaBaza();
    const d = bogliq(b, async () => 'Uzumda doʻkoningiz bormi? Kafolat beraman, ishlaydi.');
    const r = await suhbatTurn(d, 'tok', { savolId: 'byudjet', javob: 5_000_000 });
    expect(r.xabarlar[1]!.matn).toBe('Uzumda doʻkoningiz bormi?');
  });

  it('LLM yiqilsa — oqim to\'xtamaydi', async () => {
    const b = soxtaBaza();
    const d = bogliq(b, async () => { throw new Error('429'); });
    const r = await suhbatTurn(d, 'tok', { savolId: 'byudjet', javob: 5_000_000 });
    expect(r.xato).toBeUndefined();
    expect(r.xabarlar[1]!.matn).toBe('Uzumda doʻkoningiz bormi?');
  });

  it('to\'liq yo\'l: 1-qadamdan 6-qadam "tez orada" gacha, har turnda bitta savol', async () => {
    const b = soxtaBaza();
    const d = bogliq(b);
    const qadamlar: Array<{ savolId?: string; javob?: unknown }> = [
      { savolId: 'byudjet', javob: 10_000_000 },
      { savolId: 'uzum_dokoni', javob: 'yoq' },
      { savolId: 'yonalish', javob: 11 },
      { savolId: 'tovarlar', javob: [100] },
      { savolId: 'miqdor:100', javob: 30 },
      { savolId: 'marja', javob: 30 },
      { savolId: 'xitoy_tasdiq', javob: 'ha' },
    ];
    let oxirgi: Awaited<ReturnType<typeof suhbatTurn>> | null = null;
    for (const q of qadamlar) {
      oxirgi = await suhbatTurn(d, 'tok', q);
      expect(oxirgi.xato, `${q.savolId}: ${oxirgi.xato}`).toBeUndefined();
    }
    // Tasdiqdan keyin yurish boshlandi: kutish, menejer xabari bitta.
    expect(oxirgi!.keyingi.tur).toBe('kutish');
    expect(oxirgi!.qadam).toBe(5);
    expect(oxirgi!.xabarlar.map((x) => x.rol)).toEqual(['obunachi', 'menejer']);
    const jurnalOldin = b.jurnal.length;

    // tekshir: natija kelgach kod + menejer (tanlov savoli) yoziladi.
    const t = await suhbatTurn(d, 'tok', { tekshir: true });
    expect(t.xato).toBeUndefined();
    expect(t.xabarlar.map((x) => x.rol)).toEqual(['kod', 'menejer']);
    expect(t.xabarlar[0]!.matn).toMatch(/1 ta tovar uchun 1688 qidirildi: 1 tasida taklif bor/);
    if (t.keyingi.tur !== 'savol') throw new Error(t.keyingi.tur);
    expect(t.keyingi.savol.id).toBe('xitoy_tanlov:100');
    expect(b.jurnal.length).toBe(jurnalOldin + 2);

    // tekshir kutish yoʻq paytda — hech narsa yozilmaydi, oʻsha savol.
    const t2 = await suhbatTurn(d, 'tok', { tekshir: true });
    expect(t2.xabarlar).toEqual([]);
    expect(b.jurnal.length).toBe(jurnalOldin + 2);

    // 5-qadam tanlovi → 6-qadam: varaqa kodi + shahar savoli bitta turnda.
    const t6 = await suhbatTurn(d, 'tok', { savolId: 'xitoy_tanlov:100', javob: '983093623752' });
    expect(t6.xabarlar.map((x) => x.rol)).toEqual(['obunachi', 'kod', 'menejer']);
    expect(t6.xabarlar[1]!.savolId).toBe('buyurtma');
    expect(t6.xabarlar[1]!.matn).toMatch(/Buyurtma varaqasi tayyor: 1 ta tovar, 30 dona/);
    if (t6.keyingi.tur !== 'savol') throw new Error(t6.keyingi.tur);
    expect(t6.keyingi.savol.id).toBe('shahar');
    const t7 = await suhbatTurn(d, 'tok', { savolId: 'shahar', javob: 'Toshkent' });
    expect(b.profil().city).toBe('Toshkent');
    if (t7.keyingi.tur !== 'savol') throw new Error(t7.keyingi.tur);
    expect(t7.keyingi.savol.id).toBe('buyurtma_raqami');
    await suhbatTurn(d, 'tok', { savolId: 'buyurtma_raqami', javob: null });
    // 6-qadam yakuni → 7-qadam: ochiq ish kodi + rasmiy faktlar kodi + huquqiy shakl savoli bitta turnda.
    const t8 = await suhbatTurn(d, 'tok', { savolId: 'dokon_tayyorlash', javob: 'boshlaymiz' });
    expect(t8.xabarlar.map((x) => x.rol)).toEqual(['obunachi', 'kod', 'kod', 'menejer']);
    expect(t8.xabarlar[1]!.savolId).toBe('ochiq_ish');
    expect(t8.xabarlar[2]!.savolId).toBe('rasmiy');
    expect(t8.xabarlar[2]!.matn).toMatch(/Faktda yoʻq: BHM/);
    if (t8.keyingi.tur !== 'savol') throw new Error(t8.keyingi.tur);
    expect(t8.keyingi.savol.id).toBe('huquqiy_shakl');
    const t9 = await suhbatTurn(d, 'tok', { savolId: 'huquqiy_shakl', javob: 'yatt' });
    if (t9.keyingi.tur !== 'savol') throw new Error(t9.keyingi.tur);
    expect(t9.keyingi.savol.id).toBe('bank_hisobi');
    const t10 = await suhbatTurn(d, 'tok', { savolId: 'bank_hisobi', javob: 'bor' });
    if (t10.keyingi.tur !== 'savol') throw new Error(t10.keyingi.tur);
    expect(t10.keyingi.savol.id).toBe('uzum_kabinet');
    // 7-qadam yakuni → 8-qadam: rasmiy yakuni + qabul faktlari kodi + "yuk keldimi" bitta turnda.
    const t11 = await suhbatTurn(d, 'tok', { savolId: 'uzum_kabinet', javob: 'faol' });
    expect(t11.xabarlar.map((x) => x.rol)).toEqual(['obunachi', 'kod', 'kod', 'menejer']);
    expect(t11.xabarlar[1]!.savolId).toBe('rasmiy_yakun');
    expect(t11.xabarlar[2]!.savolId).toBe('qabul');
    expect(t11.xabarlar[2]!.matn).toMatch(/Qabul roʻyxati tayyor: 1 ta tovar, 30 dona/);
    if (t11.keyingi.tur !== 'savol') throw new Error(t11.keyingi.tur);
    expect(t11.keyingi.savol.id).toBe('yuk_keldi');
    for (const [savolId, javobQ, keyingiId] of [
      ['yuk_keldi', 'keldi', 'yuk_mos'], ['yuk_mos', 'mos', 'qadoq_tayyor'], ['qadoq_tayyor', 'tayyor', 'yetkazish'],
      ['yetkazish', 'ozim', 'taymslot'], ['taymslot', 'oldim', 'topshirildi'],
    ] as const) {
      const t = await suhbatTurn(d, 'tok', { savolId, javob: javobQ });
      if (t.keyingi.tur !== 'savol') throw new Error(`${savolId}: ${t.keyingi.tur}`);
      expect(t.keyingi.savol.id).toBe(keyingiId);
    }
    const oxir = await suhbatTurn(d, 'tok', { savolId: 'topshirildi', javob: 'topshirdim' });
    expect(oxir.xabarlar.map((x) => x.rol)).toEqual(['obunachi', 'kod', 'menejer']);
    expect(oxir.xabarlar[1]!.savolId).toBe('qabul_yakun');
    expect(oxir.keyingi.tur).toBe('tezOrada');
    expect(oxir.qadam).toBe(9);
    // Har menejer xabari savolId bilan (tez orada dan tashqari).
    const menejer = b.jurnal.filter((x) => (x as { rol: string }).rol === 'menejer');
    // 7 javob + tekshir + tanlov + shahar + raqam + boshlaymiz + shakl + bank + kabinet + 6 ta qabul savoli = har turnda bitta menejer gapi.
    expect(menejer.length).toBe(qadamlar.length + 14);
  });

  it('tekshir: yurish hali tugamagan — xabar yoʻq, jurnal oʻzgarmaydi, holat kutishda qoladi', async () => {
    const b = soxtaBaza({ javoblar: { byudjet: 1, uzum_dokoni: 'yoq', yonalish: 11, tovarlar: [100], 'miqdor:100': 30, marja: 30, xitoy_tasdiq: 'ha' },
      natijalar: { yonalishlar: YONALISHLAR, tovarlar: TOVARLAR, tannarx: { hisoblandi: true }, xitoy: XITOY_KUTISH } });
    const d = bogliq(b);
    d.kod.xitoy = async () => XITOY_KUTISH;
    const r = await suhbatTurn(d, 'tok', { tekshir: true });
    expect(r.xato).toBeUndefined();
    expect(r.xabarlar).toEqual([]);
    expect(r.keyingi.tur).toBe('kutish');
    expect(b.jurnal.length).toBe(0);
  });

  it('boshdan: holat tozalanadi, jurnal QOLADI', async () => {
    const b = soxtaBaza();
    await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', javob: 1 });
    const r = await suhbatBoshdan(bogliq(b), 'tok');
    expect(r.xato).toBeUndefined();
    expect(b.holat()).toEqual(boshlangichHolat());
    expect(b.jurnal.length).toBe(2);
  });
});
