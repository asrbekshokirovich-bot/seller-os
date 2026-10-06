/**
 * Suhbat ssenariysi — holat mashinasi testlari.
 *
 * Eng muhim ikki narsa:
 *   1. NAVBAT. Bir vaqtda bitta savol; boshqa savolga javob rad
 *      etiladi. Bu nazoratchi topshirig'ining o'zi.
 *   2. ZANJIR UZILMAYDI. Har holatdan `keyingi()` nimadir qaytaradi —
 *      qurilmagan qadamga yetganda ham jim qolmaydi, "tez orada" deydi.
 *
 * Bo'sh javob nol emas (QOIDALAR.md, 4-bo'lim) — alohida tekshiriladi.
 */

import { describe, expect, it } from 'vitest';
import {
  boshlangichHolat, deklaratsiyaQadamlari, faktlarniOqi, hisobotFaktlari, javobniQabulQil, joriyQadam, keyingi,
  kutilayotganHarakat, natijaniYoz, oyHisobi, qabulFaktlari, rasmiyFaktlari, SHAHARLAR, sotuvTovarlari, SUHBAT_QADAMLARI,
  suratTalablari, tushuntir, yiqilganNatija, type KodHarakati, type YolHolati,
} from '@selleros/shared';

const YONALISHLAR = {
  olchov_yoq: false,
  royxat: [
    { categoryId: 11, name: 'Quloqchinlar', yetadi: true, ball: { value: 72 } },
    { categoryId: 22, name: 'Soatlar', yetadi: false, ball: { value: 61 } },
  ],
};
const TOVARLAR = {
  olchov_yoq: false,
  royxat: [
    { nomzod: { productId: 100, title: 'Quloqchin A', rasmUrl: 'https://images.uzum.uz/aaa/t_product_540_high.jpg' }, miqdor: { dona: 30, hisob: 'oyiga ~600 · 5% · 30 kun = 30' } },
    { nomzod: { productId: 200, title: 'Quloqchin B' }, miqdor: null, miqdorSababi: 'Sotuv hali oʻlchanmagan.' },
  ],
  chiqarildi: [{ title: 'Brend X', sabab: 'yopiq brend' }],
};
/** 5-qadam natijasi — `suhbat-kod.ts` shakli; raqamlar provayder hujjat namunasi + CBU 2026-09-25. */
const TAKLIF = {
  title: '狗狗牵引绳防爆冲一体式', rasmUrl: 'https://cbu01.alicdn.com/a.jpg', reyting: 4.15, manba: '1688' as const,
  manzil: 'https://detail.1688.com/offer/1.html', oxshashlikOrni: 1, dropshipNarxYuan: null, buyurtmalar: 88655,
  zavod: true, superZavod: false, sotuvchi: null, joy: null, dokonYili: 12,
};
const XITOY = {
  olchov_yoq: false,
  kurs: { somPerYuan: 1762.49, sana: '25.09.2026', manba: 'CBU' },
  qatorlar: [{
    productId: 100, title: 'Quloqchin A', rasmUrl: 'https://images.uzum.uz/aaa/t_product_540_high.jpg',
    chegaraSom: 60_000, yetishmaydi: ['kargo'], holat: 'topildi' as const, sabab: null, jami: 680,
    takliflar: [
      { ...TAKLIF, sourceId: '983093623752', narxYuan: 27, moq: 1, narxSom: 47_587, chegaradaMi: true },
      { ...TAKLIF, sourceId: '969462626480', narxYuan: 80, moq: 2, narxSom: 140_999, chegaradaMi: false },
    ],
    keshdan: false, tashlandi: 0,
  }],
  kutilmoqda: null,
};
/** 6-qadam natijasi — kargo hamkori YOʻQ holati (2026-09-28). */
const KARGO_YOQ = { hamkor: null, avia: null, quruqlik: null, usdM3: null, minUsd: null, tanlovBor: false, izoh: 'kargo hamkori, kargo stavkasi kiritilmagan' };
const BUYURTMA = {
  olchov_yoq: false,
  qatorlar: [{ productId: 100, title: 'Quloqchin A', sourceId: '983093623752', xitoyTitle: '狗狗牵引绳', manzil: 'https://detail.1688.com/offer/1.html',
    miqdor: 30, narxYuan: 27, narxSom: 47_587, jamiYuan: 810, jamiSom: 1_427_610, weightG: 120, kargoSom: null, kargoIzoh: 'kargo hamkori, kargo stavkasi kiritilmagan', holat: 'tayyor' as const }],
  jami: { yuan: 810, som: 1_427_610, kargoSom: null, dona: 30, tayyor: 1, tanlanmagan: 0 },
  kargo: KARGO_YOQ,
  kurs: { cny: { somPerYuan: 1762.49, valyuta: 'CNY', sana: '25.09.2026', manba: 'CBU' }, usd: null },
  izoh: 'varaqa',
};
const AVIA = { yol: 'avia' as const, usdKg: 8, kun: 12, somPerKg: 101_200, manba: 'Hamkor X', olchandi: '2026-09-28' };
const QURUQLIK = { yol: 'quruqlik' as const, usdKg: 3, kun: 30, somPerKg: 37_950, manba: 'Hamkor X', olchandi: '2026-09-28' };
const BUYURTMA_KARGO = { ...BUYURTMA, kargo: { hamkor: 'Hamkor X', avia: AVIA, quruqlik: QURUQLIK, usdM3: null, minUsd: null, tanlovBor: true, izoh: null } };
const OCHIQ = { olchov_yoq: false, id: 1, yangi: true, tur: 'kutyapman' as const, muddat: null, izoh: 'ochiq ish' };
/** 7-qadam: 0057 seed qisqasi (docs/RASMIYLASHTIRISH-FAKTLAR.md). */
const FQ = (qiymat: unknown, manba = 'manba') => ({ qiymat, birlik: null, manba, olchandi: '2026-09-28', izoh: null });
const RASMIY_SEED = {
  'bhm.som': FQ(440_000, 'PF-115'), 'yatt.boj.shaxsan_bhm': FQ(1, 'soliq 50017'), 'yatt.boj.onlayn_bhm': FQ(0.9, 'soliq 50017'),
  'yatt.royxat.url': FQ('https://new.birdarcha.uz/'), 'yatt.royxat.muddat_daqiqa': FQ(30), 'yatt.xodim_max': FQ(5),
  'soliq.aylanma_foiz': FQ(1, 'PQ-247'), 'soliq.aylanma_chegara_som': FQ(1_000_000_000), 'soliq.ijtimoiy_oy_bhm': FQ(1),
  'soliq.tolov_kuni': FQ(15), 'soliq.rejim_tugaydi': FQ('2030-12-31'),
  'bank.royxat': FQ([{ nom: 'TBC Bank (TBC Biznes)', onlayn: true, ochish_som: 0, oylik_som: 0 }, { nom: 'Hamkorbank', ochish_som: 0, oylik_som: 220_000 }]),
  'uzum.kabinet.url': FQ('https://seller.uzum.uz/seller/signup'), 'uzum.qollanma.url': FQ('https://seller.uzum.uz/manual/uz/4.start-working/'),
  'uzum.komissioner.stir': FQ('309376127'), 'uzum.komissioner.nom': FQ('«Uzum market» MCHJ XK'), 'uzum.komissioner.mfo': FQ('00974'),
  'uzum.komissioner.hisob': FQ('20208000005504983001'), 'uzum.komissioner.muddat_yil': FQ(5), 'uzum.faollashtirish_kun': FQ(2),
  'uzum.qollab_quvvatlash.url': FQ('https://t.me/umarket_business_bot'), 'uzum.tolov.standart': FQ('2 haftada 1 marta, 0 %'),
};
const RASMIY = {
  olchov_yoq: false, kabinetBor: false, faktlar: rasmiyFaktlari(faktlarniOqi(RASMIY_SEED)), partiyaSotuvSom: 2_850_000,
  soliq: { ijtimoiySom: 440_000, aylanmaSom: 28_500, jamiSom: 468_500, sotuvSom: 2_850_000, yetishmaydi: [] }, izoh: 'rasmiy',
};
const YAKUN = { olchov_yoq: false, yozildi: [], izoh: 'yakun' };
/** 8-qadam: 0058 seed qisqasi (Uzum qoʻllanmasi 6/14-bob). */
const QABUL_SEED = {
  'uzum.qabul.ombor.manzil': FQ('Toshkent, Sergeli, Xonabod 2/2', 'seller.uzum.uz/manual 6.6'), 'uzum.qabul.ombor.soat': FQ('06:00–00:00'),
  'uzum.qabul.qaytarish.manzil': FQ('Nilufar 77/7'), 'uzum.qabul.qaytarish.soat': FQ('09:00–21:00'),
  'uzum.qabul.muddat_kun_max': FQ(7), 'uzum.qabul.tafovut_som': FQ(2500), 'uzum.qabul.taqiq_jarima_som': FQ(5_000_000),
  'uzum.qabul.taymslot.ozgartirish_max': FQ(3), 'uzum.qabul.taymslot.bekor_soat': FQ(48),
  'uzum.qabul.yetkazma.sku_max': FQ(100), 'uzum.qabul.yetkazma.akt_nusxa': FQ(2), 'uzum.qabul.quti_toliqlik': FQ('kamida 2/3'),
  'uzum.qabul.yorliq': FQ({ kod: 'EAN-13 yoki Uzum QR', tavsiya: '58×40 mm' }),
  'uzum.qabul.qadoq': FQ([{ kalit_sozlar: ['sumka'], tur: 'Sumka / aksessuar', usul: 'Individual paket', belgilar: '—' }]),
  'uzum.qabul.qadoq_umumiy': FQ('Zavod qutisi + strech'),
  'uzum.qabul.logistika.url': FQ('https://logistics.uzum.uz'), 'uzum.qabul.logistika.quti_kg_max': FQ(20), 'uzum.qabul.logistika.oldin_kun': FQ(2),
  'uzum.qabul.qollanma.url': FQ('https://seller.uzum.uz/manual/uz/6.product-preparation/'),
};
const QABUL = {
  olchov_yoq: false, faktlar: qabulFaktlari(faktlarniOqi(QABUL_SEED)),
  qatorlar: [{ productId: 100, title: 'Quloqchin A', miqdor: 30, qadoq: null }], jamiDona: 30, izoh: 'qabul',
};
const QABUL_YAKUN = { olchov_yoq: false, yozildi: [], izoh: 'qabul yakun' };
/** 9-qadam: 0059 seed qisqasi (Uzum qoʻllanmasi 5.7). */
const FS = (qiymat: unknown) => FQ(qiymat, 'seller.uzum.uz/manual/uz/5.product-creation (5.7)');
const SURAT_SEED = {
  'uzum.surat.format': FS('JPEG, JPG, WebP, PNG'), 'uzum.surat.min_eni': FS(750), 'uzum.surat.min_boyi': FS(1000),
  'uzum.surat.nisbat': FS('vertikal 3:4'), 'uzum.surat.max_mb': FS(5), 'uzum.surat.tovar_ulush_min': FS(50),
  'uzum.surat.qoidalar': FS(['Birinchi surat — old tomon', 'Matn faqat oʻzbek yoki rus tilida']),
  'uzum.kartochka.qoidalar': FS(['Nom va tavsif ikki tilda', 'VGT oʻlchanadi', 'Stop-soʻzlar yoʻq']),
};
const TALABLAR = suratTalablari(faktlarniOqi(SURAT_SEED));
const SURAT = (manba: '1688-tanlov' | '1688-galereya' | '1688-oxshash', n: number) => ({
  manba, asl: `https://cbu01.alicdn.com/${n}.jpg`, sayt: '1688', eni: null, boyi: null, nom: null,
  url: `https://studiya.example/?r=auto&src=${n}&s=x`,
});
const STUDIYA = {
  olchov_yoq: false, talablar: TALABLAR, sozlangan: true, chiqishMos: true, kutilmoqda: null, izoh: 'studiya',
  qatorlar: [{ productId: 100, title: 'Quloqchin A', galereya: 'olindi' as const, galereyaSabab: null, video: null,
    suratlar: [SURAT('1688-tanlov', 1), SURAT('1688-galereya', 2), SURAT('1688-galereya', 3), SURAT('1688-oxshash', 4)] }],
};
const STUDIYA_KUTISH = { ...STUDIYA, qatorlar: [], kutilmoqda: { boshlandi: '2026-09-29T09:00:00.000Z', runId: 'T1', kutilgan: [{ productId: 100, offerId: '983093623752' }], tayyor: [] } };
const STUDIYA_YAKUN = { olchov_yoq: false, yozildi: [], izoh: 'studiya yakun' };
const YUKLASH = {
  olchov_yoq: false, faktlar: qabulFaktlari(faktlarniOqi(QABUL_SEED)), talablar: TALABLAR,
  qatorlar: [{ productId: 100, title: 'Quloqchin A', miqdor: 30, qadoq: null }], jamiDona: 30, izoh: 'yuklash',
};
const YUKLASH_YAKUN = { olchov_yoq: false, yozildi: [], izoh: 'yuklash yakun' };
/** 11-qadam: oʻz kartochka 5001 (raqobatchi 100 ning nusxasi) — uchta signal. */
const OZ = { externalId: 5001, holat: 'olchandi' as const, sana: '2026-09-30', bugunSotildi: 3, tezlik: 2.5, tezlikKun: 4, zaxira: 4, zaxiraKun: 1,
  boshlangichZaxira: 30, zaxiraUlush: 0.13, narx: 99_000, sharh: 7, reyting: 4.6, yangiSharh: 1, oyDona: 26, oySom: 2_574_000, olchovKun: 5 };
const SOTUV = {
  olchov_yoq: false, sana: '2026-09-30', oy: '2026-09', partiya: 1, kuzatuv: { qoshildi: 1, bor: 0 }, kuzatuvXato: null,
  qatorlar: [{ productId: 100, title: 'Quloqchin A', miqdor: 30, ozId: 5001, xaridYuan: 27, partiya: 1, oz: OZ,
    raqobatchi: { productId: 100, sana: '2026-09-30', narx: 95_000, oldingiNarx: 100_000, tushdiFoiz: 5 } }],
  signallar: [
    { id: 'zaxira:100:p1', tur: 'zaxira' as const, productId: 100, zaxira: 4, ulush: 0.13, kun: 1 },
    { id: 'narx:100:2026-09-30:95000', tur: 'narx' as const, productId: 100, narx: 95_000, oldingiNarx: 100_000, foiz: 5, sana: '2026-09-30', ozNarx: 99_000 },
    { id: 'sharh:100:7', tur: 'sharh' as const, productId: 100, yangi: 1, jami: 7, reyting: 4.6 },
  ],
  jami: { bugunDona: 3, oyDona: 26, oySom: 2_574_000 }, izoh: 'sotuv',
};
const SOTUV_JIM = { ...SOTUV, signallar: [] };
/** 12-qadam: 0057 + 0060 faktlari. */
const HISOBOT_F = hisobotFaktlari(faktlarniOqi({
  ...RASMIY_SEED, 'soliq.agent': FQ('Javobgarlik soliq agentida'), 'soliq.aylanma.hisobot_davri': FQ('chorak'),
  'soliq.aylanma.hisobot_kun': FQ(15), 'soliq.portal.url': FQ('https://my3.soliq.uz'), 'uzum.hisobot.komissioner_kun': FQ(19),
}));
const HISOBOT = { olchov_yoq: false, oy: '2026-09', tugagan: true, faktlar: HISOBOT_F, olchovSotuv: 2_574_000, olchovDona: 26, olchovKun: 30, oyKunlari: 30,
  qatorlar: [{ productId: 100, title: 'Quloqchin A', oyDona: 26, oySom: 2_574_000 }], izoh: 'hisobot' };
const HISOB = oyHisobi({ oy: '2026-09', kabinetSotuv: 2_600_000, olchovSotuv: 2_574_000, komissiya: 400_000, f: HISOBOT_F });
const HISOBOT_HISOB = { ...HISOB, tugagan: true, qamrov: null, faktlar: HISOBOT_F, qadamlar: deklaratsiyaQadamlari(HISOB, HISOBOT_F), izoh: 'hisob' };
const HISOBOT_YAKUN = { olchov_yoq: false, yozildi: [], reja: ['«Quloqchin A»: kuniga ~2.5 dona, zaxira 1 kunga yetadi.'], izoh: 'yakun' };

/** Javob beradi va qabul qilinganini tekshiradi. */
function javob(h: YolHolati, id: string, q: unknown): YolHolati {
  const n = javobniQabulQil(h, id, q);
  expect(n.xato, `${id}: ${n.xato}`).toBeNull();
  return n.holat;
}

function savolId(h: YolHolati): string {
  const k = keyingi(h);
  if (k.tur !== 'savol') throw new Error(`savol kutilgan edi, keldi: ${k.tur}`);
  return k.savol.id;
}

describe('ssenariy — 12 qadam', () => {
  it('12 qadam, hammasi qurilgan', () => {
    expect(SUHBAT_QADAMLARI.length).toBe(12);
    expect(SUHBAT_QADAMLARI.filter((q) => q.qurilgan).map((q) => q.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});

describe('1-qadam — Tanishuv', () => {
  it('birinchi savol byudjet, 1-qadam', () => {
    const k = keyingi(boshlangichHolat());
    expect(k.tur).toBe('savol');
    if (k.tur === 'savol') {
      expect(k.savol.id).toBe('byudjet');
      expect(k.savol.qadam).toBe(1);
      expect(k.savol.variantlar.length).toBeGreaterThan(0);
    }
  });

  it('NAVBAT: boshqa savolga javob rad etiladi', () => {
    const n = javobniQabulQil(boshlangichHolat(), 'uzum_dokoni', 'yoq');
    expect(n.xato).toMatch(/navbat/);
    expect(n.holat.javoblar).toEqual({});
  });

  it('byudjet tugmalari ANIQ son yozadi, oraliq emas', () => {
    const k = keyingi(boshlangichHolat());
    if (k.tur !== 'savol') throw new Error();
    for (const v of k.savol.variantlar) expect(typeof v.qiymat).toBe('number');
  });

  it("BO'SH byudjet null, NOL esa javob", () => {
    const bosh = javobniQabulQil(boshlangichHolat(), 'byudjet', '');
    expect(bosh.xato).toBeNull();
    expect(bosh.holat.javoblar['byudjet']).toBeNull();
    expect(bosh.profil).toEqual({ budgetUzs: null });

    const nol = javobniQabulQil(boshlangichHolat(), 'byudjet', 0);
    expect(nol.holat.javoblar['byudjet']).toBe(0);
    expect(nol.profil).toEqual({ budgetUzs: 0 });
  });

  it('byudjet: matn va manfiy son rad etiladi', () => {
    expect(javobniQabulQil(boshlangichHolat(), 'byudjet', 'abc').xato).not.toBeNull();
    expect(javobniQabulQil(boshlangichHolat(), 'byudjet', -5).xato).not.toBeNull();
    expect(javobniQabulQil(boshlangichHolat(), 'byudjet', true).xato).not.toBeNull();
  });

  it("'sotyapman' desa do'kon nomi so'raladi; 'yoq' desa so'ralmaydi", () => {
    let h = javob(boshlangichHolat(), 'byudjet', 10_000_000);
    const sot = javobniQabulQil(h, 'uzum_dokoni', 'sotyapman');
    expect(sot.profil).toEqual({ hasUzumShop: true });
    expect(savolId(sot.holat)).toBe('dokon_nomi');

    const yoq = javobniQabulQil(h, 'uzum_dokoni', 'yoq');
    expect(yoq.profil).toEqual({ hasUzumShop: false });
    expect(keyingi(yoq.holat)).toEqual({ tur: 'kod', harakat: 'yonalishlar', qadam: 2 });
    h = yoq.holat;
    expect(joriyQadam(h)).toBe(2);
  });

  it('uzum_dokoni: variantdan tashqari qiymat rad etiladi', () => {
    const h = javob(boshlangichHolat(), 'byudjet', 10_000_000);
    expect(javobniQabulQil(h, 'uzum_dokoni', 'balki').xato).not.toBeNull();
  });
});

function tanishuvTugadi(): YolHolati {
  let h = javob(boshlangichHolat(), 'byudjet', 10_000_000);
  h = javob(h, 'uzum_dokoni', 'yoq');
  return h;
}

describe("2-qadam — Yo'nalish", () => {
  it('kod natijasi kelgach variantlar undan yasaladi', () => {
    const h = natijaniYoz(tanishuvTugadi(), 'yonalishlar', YONALISHLAR);
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error();
    expect(k.savol.id).toBe('yonalish');
    expect(k.savol.variantlar.map((v) => v.nom)).toEqual(['Quloqchinlar', 'Soatlar']);
    expect(k.savol.otkazishMumkin).toBe(false);
  });

  it("ro'yxatda yo'q yo'nalish rad etiladi", () => {
    const h = natijaniYoz(tanishuvTugadi(), 'yonalishlar', YONALISHLAR);
    expect(javobniQabulQil(h, 'yonalish', 999).xato).not.toBeNull();
  });

  it("o'lchov yo'q bo'lsa savol turadi, o'tkazish mumkin, 'yo'q' DEMAYDI", () => {
    const h = natijaniYoz(tanishuvTugadi(), 'yonalishlar', { olchov_yoq: true, sabab: 'baza javob bermadi' });
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error();
    expect(k.savol.otkazishMumkin).toBe(true);
    expect(k.savol.matn).toMatch(/baza javob bermadi/);
    expect(tushuntir('yonalishlar', { olchov_yoq: true, sabab: 'x' })).toMatch(/hisob hali yoʻq/);
  });

  it('tushuntirishdagi raqamlar natijaning o‘zidan', () => {
    const m = tushuntir('yonalishlar', YONALISHLAR);
    expect(m).toMatch(/2 ta yoʻnalish/);
    expect(m).toMatch(/Quloqchinlar/);
    expect(m).toMatch(/72 ball/);
    expect(m).toMatch(/1 tasiga byudjetingiz yetadi/);
  });
});

function yonalishTanlandi(): YolHolati {
  const h = natijaniYoz(tanishuvTugadi(), 'yonalishlar', YONALISHLAR);
  return javob(h, 'yonalish', 11);
}

describe('3-qadam — Tovar va miqdor', () => {
  it("yo'nalishdan keyin tovarlar kodi, keyin ko'p tanlov", () => {
    let h = yonalishTanlandi();
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'tovarlar', qadam: 3 });
    h = natijaniYoz(h, 'tovarlar', TOVARLAR);
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error();
    expect(k.savol.id).toBe('tovarlar');
    expect(k.savol.turi).toBe('kopTanlov');
  });

  it("har tanlangan tovar uchun miqdor NAVBAT bilan so'raladi", () => {
    let h = natijaniYoz(yonalishTanlandi(), 'tovarlar', TOVARLAR);
    h = javob(h, 'tovarlar', [100, 200]);
    expect(savolId(h)).toBe('miqdor:100');
    const k1 = keyingi(h);
    if (k1.tur !== 'savol') throw new Error();
    expect(k1.savol.variantlar.map((v) => v.qiymat)).toEqual([30, 60]);
    expect(k1.savol.matn).toMatch(/30 kun = 30/);

    expect(javobniQabulQil(h, 'miqdor:200', 5).xato).toMatch(/navbat/);

    h = javob(h, 'miqdor:100', 30);
    expect(savolId(h)).toBe('miqdor:200');
    const k2 = keyingi(h);
    if (k2.tur !== 'savol') throw new Error();
    // Miqdor hisoblanmagan — variant yo'q, sabab aytilgan, o'zi yozadi.
    expect(k2.savol.variantlar).toEqual([]);
    expect(k2.savol.matn).toMatch(/oʻlchanmagan/);
    h = javob(h, 'miqdor:200', 12);
    expect(savolId(h)).toBe('marja');
    expect(joriyQadam(h)).toBe(4);
  });

  it("bo'sh ko'p tanlov rad etiladi (ro'yxat bo'lmasa emas)", () => {
    const h = natijaniYoz(yonalishTanlandi(), 'tovarlar', TOVARLAR);
    expect(javobniQabulQil(h, 'tovarlar', []).xato).not.toBeNull();
    expect(javobniQabulQil(h, 'tovarlar', [999]).xato).not.toBeNull();
  });

  it('tushuntirish chiqarilganlarni yashirmaydi', () => {
    expect(tushuntir('tovarlar', TOVARLAR)).toMatch(/1 tasi tuzoq sababli/);
  });
});

function tovarlarTanlandi(): YolHolati {
  let h = natijaniYoz(yonalishTanlandi(), 'tovarlar', TOVARLAR);
  h = javob(h, 'tovarlar', [100]);
  h = javob(h, 'miqdor:100', 30);
  return h;
}

describe('4-qadam — Tannarx va zanjir oxiri', () => {
  it('marja → tannarx kodi → tasdiq → 5-qadam xitoy kodi', () => {
    let h = javob(tovarlarTanlandi(), 'marja', 30);
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'tannarx', qadam: 4 });
    h = natijaniYoz(h, 'tannarx', { hisoblandi: true });
    expect(savolId(h)).toBe('xitoy_tasdiq');
    h = javob(h, 'xitoy_tasdiq', 'ha');
    // B2 fikri (2026-10-06) — oʻtkazib yuborilsa toʻgʻri qidiruvga.
    expect(savolId(h)).toBe('usta_fikri');
    h = javob(h, 'usta_fikri', null);
    // Rasm bazada bor (fikstura) — savolsiz to'g'ri qidiruvga.
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'xitoy', qadam: 5 });
    expect(joriyQadam(h)).toBe(5);
  });

  it("'miqdorni o'zgartiraman' — miqdor savollari qayta ochiladi, tannarx o'chadi", () => {
    let h = javob(tovarlarTanlandi(), 'marja', 30);
    h = natijaniYoz(h, 'tannarx', { hisoblandi: true });
    h = javob(h, 'xitoy_tasdiq', 'miqdor');
    expect(savolId(h)).toBe('miqdor:100');
    expect(h.natijalar.tannarx).toBeUndefined();
    expect(h.javoblar['marja']).toBe(30);
  });

  it('marja erkin son qabul qiladi', () => {
    expect(javobniQabulQil(tovarlarTanlandi(), 'marja', 35).xato).toBeNull();
  });
});

describe('zanjir hech qayerda uzilmaydi', () => {
  it("har holatda keyingi() nimadir qaytaradi va savol matni bo'sh emas", () => {
    let h = boshlangichHolat();
    const korilgan: string[] = [];
    for (let i = 0; i < 90; i++) {
      const k = keyingi(h);
      korilgan.push(k.tur === 'savol' ? k.savol.id : k.tur);
      if (k.tur === 'tezOrada') throw new Error('tez orada: hamma qadam qurilgan boʻlishi kerak');
      // Oy aylanishining oxiri — "yangi oy" savoli; undan keyin 11-qadam qaytadan.
      if (k.tur === 'savol' && k.savol.id === 'yangi_oy') break;
      if (k.tur === 'kod') {
        h = natijaniYoz(h, k.harakat,
          k.harakat === 'yonalishlar' ? YONALISHLAR
            : k.harakat === 'tovarlar' ? TOVARLAR
              : k.harakat === 'xitoy' ? XITOY
                : k.harakat === 'buyurtma' ? BUYURTMA
                  : k.harakat === 'ochiq_ish' ? OCHIQ
                    : k.harakat === 'rasmiy' ? RASMIY
                      : k.harakat === 'rasmiy_yakun' ? YAKUN
                        : k.harakat === 'qabul' ? QABUL
                          : k.harakat === 'qabul_yakun' ? QABUL_YAKUN
                            : k.harakat === 'studiya' ? STUDIYA
                              : k.harakat === 'studiya_yakun' ? STUDIYA_YAKUN
                                : k.harakat === 'yuklash' ? YUKLASH
                                  : k.harakat === 'yuklash_yakun' ? YUKLASH_YAKUN
                                    : k.harakat === 'sotuv' ? SOTUV
                                      : k.harakat === 'hisobot' ? HISOBOT
                                        : k.harakat === 'hisobot_hisob' ? HISOBOT_HISOB
                                          : k.harakat === 'hisobot_yakun' ? HISOBOT_YAKUN : { ok: true });
        continue;
      }
      if (k.tur === 'kutish') throw new Error('kutish: bu yoʻlda kutilmagan');
      expect(k.savol.matn.trim().length).toBeGreaterThan(5);
      const s = k.savol;
      // Aylanmaydigan javoblar: oʻz kartochka havolasi, «Oy hisoboti», «Hozircha yoʻq».
      const q = s.id.startsWith('uzum_havola:') ? 'https://uzum.uz/uz/product/mening-quloqchinim-5001'
        : s.id === 'sotuv_holat' ? 'hisobot'
          : s.id.startsWith('signal:zaxira:') ? 'yoq'
            : s.turi === 'kopTanlov' ? [s.variantlar[0]!.qiymat]
              : s.variantlar.length ? s.variantlar[0]!.qiymat
                : s.turi === 'son' ? 7 : 'sinov';
      h = javob(h, s.id, q);
    }
    expect(korilgan[korilgan.length - 1]).toBe('yangi_oy');
    expect(korilgan).toEqual(expect.arrayContaining(['uzum_havola:100', 'signal:zaxira:100:p1', 'sotuv_holat', 'oy_sotuv', 'deklaratsiya_qadam']));
    // Hech bir savol ikki marta so'ralmagan.
    const savollar = korilgan.filter((x) => !['kod', 'tezOrada'].includes(x));
    expect(new Set(savollar).size).toBe(savollar.length);
  });
});

describe('tushuntir — tannarx rostini aytadi', () => {
  it('hech narsa hisoblanmasa "hisoblandi" DEMAYDI, sababini aytadi', () => {
    const m = tushuntir('tannarx', { olchov_yoq: true, qatorlar: [
      { chegaraSom: null, yetishmaydi: ['komissiya'] },
      { chegaraSom: null, yetishmaydi: ['komissiya', 'kargo'] },
    ] });
    expect(m).not.toMatch(/hisoblandi\./);
    expect(m).toMatch(/komissiya, kargo yetishmaydi/);
    expect(m).toMatch(/foyda yoʻq" degani EMAS/);
  });
  it('qisman hisoblansa sonini va yetishmaganini aytadi', () => {
    const m = tushuntir('tannarx', { qatorlar: [
      { chegaraSom: 50_000, yetishmaydi: ['kargo'] },
      { chegaraSom: null, yetishmaydi: ['komissiya'] },
    ] });
    expect(m).toMatch(/1 ta tovar uchun/);
    // Chegarasi umuman yoʻq tovar "yetishmagan qism bor" (yaʼni pastroq) deb atalmaydi.
    expect(m).toMatch(/1 tasida chegara hisoblanmadi \(komissiya\)/);
    expect(m).toMatch(/haqiqiy chegara pastroq/);
  });
});

function tasdiqlandi(): YolHolati {
  let h = javob(tovarlarTanlandi(), 'marja', 30);
  h = natijaniYoz(h, 'tannarx', { hisoblandi: true });
  h = javob(h, 'xitoy_tasdiq', 'ha');
  // B2 fikri oʻtkazib yuborilgan — 5-qadam testlari fikrsiz yoʻlni sinaydi.
  return javob(h, 'usta_fikri', null);
}

describe('B2 — Usta haqidagi fikr, 4-qadamdan keyin (nazoratchi qarori, 2026-10-06)', () => {
  function haDeyildi(): YolHolati {
    let h = javob(tovarlarTanlandi(), 'marja', 30);
    h = natijaniYoz(h, 'tannarx', { hisoblandi: true });
    return javob(h, 'xitoy_tasdiq', 'ha');
  }

  it('«Ha, Xitoydan topamiz» dan keyin — fikr savoli: «Ha» / «Yoʻq», oʻtkazish mumkin, 4-qadam', () => {
    const k = keyingi(haDeyildi());
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.id).toBe('usta_fikri');
    expect(k.savol.qadam).toBe(4);
    expect(k.savol.turi).toBe('tanlov');
    expect(k.savol.otkazishMumkin).toBe(true);
    expect(k.savol.variantlar.map((v) => v.qiymat)).toEqual(['ha', 'yoq']);
    expect(k.savol.matn).toMatch(/mantiqli/);
  });

  it('«Ha, mantiqli» → izoh (ixtiyoriy) → fikr yoziladi (kod) → keyin 1688', () => {
    let h = javob(haDeyildi(), 'usta_fikri', 'ha');
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.id).toBe('usta_fikri_izoh');
    expect(k.savol.turi).toBe('matn');
    expect(k.savol.otkazishMumkin).toBe(true);
    expect(k.savol.qadam).toBe(4);
    h = javob(h, 'usta_fikri_izoh', 'Hammasi tushunarli');
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'usta_fikri', qadam: 4 });
    h = natijaniYoz(h, 'usta_fikri', { olchov_yoq: false, yozildi: true });
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'xitoy', qadam: 5 });
  });

  it('«Yoʻq» — izoh nima notoʻgʻri ekanini soʻraydi; izohsiz ham fikr yoziladi', () => {
    let h = javob(haDeyildi(), 'usta_fikri', 'yoq');
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).toMatch(/notoʻgʻri|tushunarsiz/);
    h = javob(h, 'usta_fikri_izoh', null);
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'usta_fikri', qadam: 4 });
  });

  it('oʻtkazib yuborilsa — izoh ham, yozuv ham yoʻq: toʻgʻri 1688 ga', () => {
    const h = javob(haDeyildi(), 'usta_fikri', null);
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'xitoy', qadam: 5 });
  });

  it('1688 qidiruvidan oʻtib ketgan eski sessiyaga soʻralmaydi — yoʻl orqaga qaytmaydi', () => {
    const h = natijaniYoz(haDeyildi(), 'xitoy', XITOY);
    expect(savolId(h)).toBe('xitoy_tanlov:100');
  });

  it('«Qayta qidirish» (1688 natijasi oʻchadi) — fikr qayta soʻralmaydi', () => {
    let h = javob(haDeyildi(), 'usta_fikri', 'ha');
    h = javob(h, 'usta_fikri_izoh', null);
    h = natijaniYoz(h, 'usta_fikri', { olchov_yoq: false, yozildi: true });
    const bosh = { ...XITOY, olchov_yoq: true, qatorlar: [{ ...XITOY.qatorlar[0]!, holat: 'qidirilmadi' as const, sabab: 'provayder: balans', takliflar: [] }] };
    h = javob(natijaniYoz(h, 'xitoy', bosh), 'xitoy_qayta', 'qayta');
    expect(h.natijalar.xitoy).toBeUndefined();
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'xitoy', qadam: 5 });
  });

  it('kod xulosasi: yozildi — rahmat; yozilmadi — sabab, yoʻl davom etadi', () => {
    expect(tushuntir('usta_fikri', { olchov_yoq: false, yozildi: true })).toMatch(/Fikringiz yozildi/);
    expect(tushuntir('usta_fikri', { olchov_yoq: true, sabab: 'baza javob bermadi' })).toMatch(/yoza olmadim \(baza javob bermadi\)/);
  });
});

describe('5-qadam — Xitoydan topish', () => {
  it('rasmsiz tovar: avval rasm manzili soʻraladi (matn, oʻtkazish mumkin), keyin kod', () => {
    let h = natijaniYoz(yonalishTanlandi(), 'tovarlar', TOVARLAR);
    h = javob(h, 'tovarlar', [100, 200]);
    h = javob(h, 'miqdor:100', 30);
    h = javob(h, 'miqdor:200', 12);
    h = javob(h, 'marja', 30);
    h = natijaniYoz(h, 'tannarx', { hisoblandi: true });
    h = javob(h, 'xitoy_tasdiq', 'ha');
    h = javob(h, 'usta_fikri', null);
    // 100 da rasm bor, 200 da yo'q — faqat 200 uchun so'raladi.
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.id).toBe('rasm:200');
    expect(k.savol.qadam).toBe(5);
    expect(k.savol.turi).toBe('matn');
    expect(k.savol.otkazishMumkin).toBe(true);
    expect(k.savol.matn).toMatch(/Quloqchin B/);
    expect(k.savol.matn).toMatch(/qidirilmaydi/);
    h = javob(h, 'rasm:200', null);
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'xitoy', qadam: 5 });
  });

  it('natija kelgach topilgan tovar uchun tanlov NAVBAT bilan; variant — provayder id, matnda raqamlar taklifdan', () => {
    let h = natijaniYoz(tasdiqlandi(), 'xitoy', XITOY);
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.id).toBe('xitoy_tanlov:100');
    expect(k.savol.turi).toBe('tanlov');
    expect(k.savol.otkazishMumkin).toBe(true);
    expect(k.savol.matn).toMatch(/1688 dan 680 ta topildi, 2 tasi koʻrsatildi, 1 tasi chegara narxga sigʻadi va roʻyxat boshida turibdi \(chegaraga kirmagan: kargo — haqiqiysi pastroq\)/);
    expect(k.savol.variantlar.map((v) => v.qiymat)).toEqual(['983093623752', '969462626480']);
    expect(k.savol.variantlar[0]!.nom).toMatch(/¥27 ≈ 47 587 soʻm · MOQ 1 · zavod · chegarada/);
    expect(k.savol.variantlar[1]!.nom).toMatch(/chegaradan yuqori/);
    expect(javobniQabulQil(h, 'xitoy_tanlov:100', 'yoq-id').xato).not.toBeNull();
    h = javob(h, 'xitoy_tanlov:100', '983093623752');
    // Tanlov tugadi — 6-qadam: buyurtma varaqasi kodi.
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'buyurtma', qadam: 6 });
    expect(joriyQadam(h)).toBe(6);
  });

  it('kurs boʻlmasa "sigʻadi" soni aytilmaydi; oʻtkazib yuborish ham qabul', () => {
    const kurssiz = { ...XITOY, kurs: null, qatorlar: [{ ...XITOY.qatorlar[0]!, yetishmaydi: [], takliflar: XITOY.qatorlar[0]!.takliflar.map((t) => ({ ...t, narxSom: null, chegaradaMi: null })) }] };
    let h = natijaniYoz(tasdiqlandi(), 'xitoy', kurssiz);
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).not.toMatch(/sigʻadi/);
    expect(k.savol.variantlar[0]!.nom).toBe('¥27 · MOQ 1 · zavod');
    h = javob(h, 'xitoy_tanlov:100', null);
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'buyurtma', qadam: 6 });
  });

  it('topilmadi (javob) — tanlov soʻralmaydi, toʻgʻri 6-qadam', () => {
    const bosh = { ...XITOY, qatorlar: [{ ...XITOY.qatorlar[0]!, holat: 'topilmadi' as const, jami: 0, takliflar: [] }] };
    const h = natijaniYoz(tasdiqlandi(), 'xitoy', bosh);
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'buyurtma', qadam: 6 });
  });

  it('qidirilmadi — "qayta qidiramizmi?" savoli; "qayta" natijani tozalab kodni qayta chaqiradi; "davom" — 6-qadam', () => {
    const bosh = { ...XITOY, olchov_yoq: true, qatorlar: [{ ...XITOY.qatorlar[0]!, holat: 'qidirilmadi' as const, sabab: 'provayder: balans', takliflar: [] }] };
    let h = natijaniYoz(tasdiqlandi(), 'xitoy', bosh);
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.id).toBe('xitoy_qayta');
    expect(k.savol.matn).toMatch(/1 ta tovar qidirilmadi \(provayder: balans\)/);
    expect(k.savol.variantlar.map((v) => v.qiymat)).toEqual(['qayta', 'davom']);
    const qayta = javob(h, 'xitoy_qayta', 'qayta');
    expect(qayta.natijalar.xitoy).toBeUndefined();
    expect(keyingi(qayta)).toEqual({ tur: 'kod', harakat: 'xitoy', qadam: 5 });
    h = javob(h, 'xitoy_qayta', 'davom');
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'buyurtma', qadam: 6 });
  });

  it('kutilmoqda — `kutish` qaytadi (kod EMAS), savol yoʻq', () => {
    const kut = { ...XITOY, qatorlar: [], kutilmoqda: { runId: 'HG7ML7M8z78YcAPEB', boshlandi: '2026-09-25T20:00:00.000Z', rasmlar: [{ productId: 100, rasmUrl: 'https://images.uzum.uz/aaa/t_product_540_high.jpg' }] } };
    const h = natijaniYoz(tasdiqlandi(), 'xitoy', kut);
    const k = keyingi(h);
    expect(k.tur).toBe('kutish');
    if (k.tur === 'kutish') { expect(k.qadam).toBe(5); expect(k.matn).toMatch(/1 ta rasm/); expect(k.boshlandi).toBe('2026-09-25T20:00:00.000Z'); }
    expect(joriyQadam(h)).toBe(5);
    expect(javobniQabulQil(h, 'xitoy_tanlov:100', 'x').xato).toMatch(/savol kutilmayapti/);
    expect(tushuntir('xitoy', kut)).toMatch(/qidirilmoqda \(1 ta rasm\)/);
  });

  it('rasm manzili: http(s) boʻlmasa rad (savol qayta), uzun manzil kesilmaydi', () => {
    let h = natijaniYoz(yonalishTanlandi(), 'tovarlar', TOVARLAR);
    h = javob(h, 'tovarlar', [200]);
    h = javob(h, 'miqdor:200', 12);
    h = javob(h, 'marja', 30);
    h = natijaniYoz(h, 'tannarx', { hisoblandi: true });
    h = javob(h, 'xitoy_tasdiq', 'ha');
    h = javob(h, 'usta_fikri', null);
    expect(savolId(h)).toBe('rasm:200');
    expect(javobniQabulQil(h, 'rasm:200', 'rasm.jpg').xato).toMatch(/http\(s\)/);
    expect(javobniQabulQil(h, 'rasm:200', 'javascript:alert(1)').xato).toMatch(/http\(s\)/);
    const uzun = 'https://images.uzum.uz/' + 'a'.repeat(400) + '/original.jpg';
    const q = javobniQabulQil(h, 'rasm:200', uzun);
    expect(q.xato).toBeNull();
    expect(q.holat.javoblar['rasm:200']).toBe(uzun);
    expect(javobniQabulQil(h, 'rasm:200', 'https://a/' + 'x'.repeat(3000)).xato).toMatch(/uzun/);
  });

  it("'miqdorni oʻzgartiraman' 5-qadam javoblari va natijasini ham tozalaydi", () => {
    let h = natijaniYoz(tasdiqlandi(), 'xitoy', XITOY);
    h = javob(h, 'xitoy_tanlov:100', '983093623752');
    // Yo'lni boshidan: tasdiq savoliga qaytish uchun holatni qayta yasaymiz.
    const h2: YolHolati = { javoblar: { ...h.javoblar }, natijalar: { ...h.natijalar } };
    delete h2.javoblar['xitoy_tasdiq'];
    const q = javobniQabulQil(h2, 'xitoy_tasdiq', 'miqdor');
    expect(q.xato).toBeNull();
    expect(Object.keys(q.holat.javoblar).some((k) => k.startsWith('xitoy_tanlov:') || k.startsWith('rasm:') || k.startsWith('miqdor:'))).toBe(false);
    expect(q.holat.natijalar.xitoy).toBeUndefined();
    expect(q.holat.natijalar.tannarx).toBeUndefined();
  });

  it('tushuntir(xitoy): faqat QIDIRILGANLAR sanaladi, qidirilmagani sababi bilan, kesh va kurs sanasi', () => {
    const n = { ...XITOY, qatorlar: [
      XITOY.qatorlar[0]!,
      { ...XITOY.qatorlar[0]!, productId: 200, title: 'B', holat: 'topilmadi' as const, jami: 0, takliflar: [], keshdan: true },
      { ...XITOY.qatorlar[0]!, productId: 300, title: 'C', holat: 'qidirilmadi' as const, sabab: 'rasm yoʻq', takliflar: [] },
    ] };
    const m = tushuntir('xitoy', n);
    expect(m).toMatch(/^2 ta tovar uchun 1688 qidirildi \(1 tasi qidirilmadi: rasm yoʻq\): 1 tasida taklif bor \(2 ta koʻrsatildi, 1 tasi chegara narxga sigʻadi\), 1 tasida oʻxshash topilmadi\./);
    expect(m).toMatch(/1 tasi 72 soatlik keshdan/);
    expect(m).toMatch(/1 yuan = 1 762.49 soʻm \(25.09.2026\)/);
    expect(m).not.toMatch(/kafolat/i);
  });

  it('tushuntir(xitoy): hech biri qidirilmasa "Xitoyda yoʻq" DEMAYDI — real shakl bilan ham (har tovar qidirilmadi)', () => {
    expect(tushuntir('xitoy', { olchov_yoq: true, sabab: 'provayder kaliti yoʻq', kurs: null, qatorlar: [], kutilmoqda: null })).toMatch(/qidiruv boʻlmadi/);
    const hammasi = { ...XITOY, olchov_yoq: true, kurs: null, qatorlar: [
      { ...XITOY.qatorlar[0]!, holat: 'qidirilmadi' as const, sabab: 'provayder kaliti yoʻq', takliflar: [] },
      { ...XITOY.qatorlar[0]!, productId: 200, holat: 'qidirilmadi' as const, sabab: 'provayder kaliti yoʻq', takliflar: [] },
    ] };
    const m = tushuntir('xitoy', hammasi);
    expect(m).toMatch(/Xitoydan qidira olmadim \(2 ta tovar\): provayder kaliti yoʻq/);
    expect(m).not.toMatch(/qidirildi/);
    expect(m).not.toMatch(/Kurs olinmadi/);
    expect(tushuntir('xitoy', { ...XITOY, kurs: null })).toMatch(/Kurs olinmadi/);
  });
});

function xitoyTanlandi(): YolHolati {
  const h = natijaniYoz(tasdiqlandi(), 'xitoy', XITOY);
  return javob(h, 'xitoy_tanlov:100', '983093623752');
}

describe('6-qadam — Buyurtma va kargo (hamkor yoʻq)', () => {
  it('varaqa kodi → shahar (tanlov + oʻzim yozaman, profil city) → kargo yoʻli SOʻRALMAYDI → raqam → boshlaymiz → ochiq ish → 7 "tez orada"', () => {
    let h = xitoyTanlandi();
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'buyurtma', qadam: 6 });
    h = natijaniYoz(h, 'buyurtma', BUYURTMA);
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.id).toBe('shahar');
    expect(k.savol.qadam).toBe(6);
    // Profil roʻyxati bilan bir xil shaharlar; "Boshqa" yoʻq — erkin matn bor.
    expect(k.savol.variantlar.map((v) => v.qiymat)).toEqual(SHAHARLAR.filter((s) => s !== 'Boshqa'));
    expect(k.savol.variantlar[0]!.qiymat).toBe('Toshkent');
    expect(k.savol.erkin).toBe(true);
    const q = javobniQabulQil(h, 'shahar', 'Buxoro');
    expect(q.xato).toBeNull();
    expect(q.profil).toEqual({ city: 'Buxoro' });
    h = q.holat;
    // Kargo hamkori yoʻq — avia/quruqlik savoli yoʻq, toʻgʻri raqam savoli.
    expect(savolId(h)).toBe('buyurtma_raqami');
    const kr = keyingi(h);
    if (kr.tur === 'savol') { expect(kr.savol.turi).toBe('matn'); expect(kr.savol.otkazishMumkin).toBe(true); }
    h = javob(h, 'buyurtma_raqami', null);
    expect(savolId(h)).toBe('dokon_tayyorlash');
    h = javob(h, 'dokon_tayyorlash', 'boshlaymiz');
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'ochiq_ish', qadam: 6 });
    h = natijaniYoz(h, 'ochiq_ish', OCHIQ);
    // 6-qadam tugadi — 7-qadam: rasmiylashtirish faktlari kodi.
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'rasmiy', qadam: 7 });
    expect(joriyQadam(h)).toBe(7);
  });

  it('kargo stavkalari boʻlsa — avia/quruqlik savoli, raqamlar faktdan', () => {
    let h = natijaniYoz(xitoyTanlandi(), 'buyurtma', BUYURTMA_KARGO);
    h = javob(h, 'shahar', 'Toshkent');
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.id).toBe('kargo_yol');
    expect(k.savol.matn).toMatch(/Avia — 12 kun, \$8\/kg \(≈ 101 200 soʻm\/kg\)\. Quruqlik — 30 kun, \$3\/kg/);
    expect(k.savol.matn).toMatch(/vaʼda emas/);
    expect(k.savol.variantlar.map((v) => v.qiymat)).toEqual(['avia', 'quruqlik']);
    h = javob(h, 'kargo_yol', 'quruqlik');
    expect(savolId(h)).toBe('buyurtma_raqami');
  });

  it('buyurtma raqami saqlanadi (matn), 200 belgigacha', () => {
    let h = natijaniYoz(xitoyTanlandi(), 'buyurtma', BUYURTMA);
    h = javob(h, 'shahar', 'Toshkent');
    h = javob(h, 'buyurtma_raqami', ' 1688-ORD-2026-0001 ');
    expect(h.javoblar['buyurtma_raqami']).toBe('1688-ORD-2026-0001');
  });

  it('tushuntir(buyurtma): sonlar natijadan, kargo yoʻqligi yashirilmaydi, "tizim buyurtma bermaydi"', () => {
    const m = tushuntir('buyurtma', BUYURTMA);
    expect(m).toMatch(/1 ta tovar, 30 dona, jami ¥810 \(≈ 1 427 610 soʻm, CBU 25.09.2026\)/);
    expect(m).toMatch(/Kargo: kargo hamkori, kargo stavkasi kiritilmagan — kargo narxi hisobga kirmadi/);
    expect(m).toMatch(/tizim bermaydi/);
    expect(tushuntir('buyurtma', { ...BUYURTMA, olchov_yoq: true, sabab: '1688 taklifi tanlanmagan', qatorlar: [], jami: { ...BUYURTMA.jami, tayyor: 0 } })).toMatch(/yasay olmadim: 1688 taklifi tanlanmagan/);
    const tanlanmagan = { ...BUYURTMA, jami: { ...BUYURTMA.jami, tanlanmagan: 1 } };
    expect(tushuntir('buyurtma', tanlanmagan)).toMatch(/1 ta tovarda 1688 taklifi tanlanmagan/);
  });

  it('tushuntir(ochiq_ish): muddat yoʻq — rostini aytadi; bor — vaʼda emas deydi', () => {
    expect(tushuntir('ochiq_ish', OCHIQ)).toMatch(/Muddatni ayta olmayman/);
    expect(tushuntir('ochiq_ish', { ...OCHIQ, muddat: '2026-10-28' })).toMatch(/taxminan 28\.10\.2026 \(hamkor oʻrtacha muddati, vaʼda emas\)/);
    expect(tushuntir('ochiq_ish', { ...OCHIQ, olchov_yoq: true, sabab: 'baza javob bermadi' })).toMatch(/yozib qoʻya olmadim/);
  });
});

/** 6-qadam tugagan holat (ochiq ish yozilgan). */
function rasmiyBoshi(): YolHolati {
  let h = natijaniYoz(xitoyTanlandi(), 'buyurtma', BUYURTMA);
  h = javob(h, 'shahar', 'Toshkent');
  h = javob(h, 'buyurtma_raqami', null);
  h = javob(h, 'dokon_tayyorlash', 'boshlaymiz');
  return natijaniYoz(h, 'ochiq_ish', OCHIQ);
}

describe('7-qadam — Rasmiylashtirish (hamma raqam faktdan)', () => {
  it('kod rasmiy → huquqiy_shakl → (yoʻq) yatt_ochish → bank_hisobi → uzum_kabinet → kod rasmiy_yakun → 8 "tez orada"', () => {
    let h = rasmiyBoshi();
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'rasmiy', qadam: 7 });
    h = natijaniYoz(h, 'rasmiy', RASMIY);
    expect(savolId(h)).toBe('huquqiy_shakl');
    const k0 = keyingi(h);
    if (k0.tur === 'savol') expect(k0.savol.variantlar.map((v) => v.qiymat)).toEqual(['yatt', 'mchj', 'oz_band', 'yoq']);
    h = javob(h, 'huquqiy_shakl', 'yoq');
    const k1 = keyingi(h);
    if (k1.tur !== 'savol') throw new Error(k1.tur);
    expect(k1.savol.id).toBe('yatt_ochish');
    expect(k1.savol.qadam).toBe(7);
    expect(k1.savol.otkazishMumkin).toBe(true);
    // Raqamlar faktdan: 0,9 × 440 000 = 396 000; 1 × 440 000; 30 daqiqa.
    expect(k1.savol.matn).toMatch(/onlayn https:\/\/new\.birdarcha\.uz\/ \(davlat boji 396 000 soʻm\)/);
    expect(k1.savol.matn).toMatch(/shaxsan \(440 000 soʻm\), taxminan 30 daqiqa/);
    expect(k1.savol.variantlar.map((v) => v.qiymat)).toEqual(['ochdim', 'keyin', 'boshqacha']);
    h = javob(h, 'yatt_ochish', 'ochdim');
    const k2 = keyingi(h);
    if (k2.tur !== 'savol') throw new Error(k2.tur);
    expect(k2.savol.id).toBe('bank_hisobi');
    expect(k2.savol.matn).toMatch(/2 ta bank taqqoslandi, 1 tasida ochish ham, oylik xizmat ham bepul/);
    expect(k2.savol.matn).toMatch(/shaxsiy karta boʻlmaydi/);
    h = javob(h, 'bank_hisobi', 'bor');
    const k3 = keyingi(h);
    if (k3.tur !== 'savol') throw new Error(k3.tur);
    expect(k3.savol.id).toBe('uzum_kabinet');
    expect(k3.savol.matn).toMatch(/https:\/\/seller\.uzum\.uz\/seller\/signup/);
    expect(k3.savol.matn).toMatch(/taxminan 2 kun/);
    h = javob(h, 'uzum_kabinet', 'faol');
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'rasmiy_yakun', qadam: 7 });
    h = natijaniYoz(h, 'rasmiy_yakun', YAKUN);
    // 7-qadam tugadi — 8-qadam: qabul faktlari kodi.
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'qabul', qadam: 8 });
    expect(joriyQadam(h)).toBe(8);
  });

  it('YATT bor — yatt_ochish soʻralmaydi, toʻgʻri bank savoli', () => {
    let h = natijaniYoz(rasmiyBoshi(), 'rasmiy', RASMIY);
    h = javob(h, 'huquqiy_shakl', 'yatt');
    expect(savolId(h)).toBe('bank_hisobi');
  });

  it('1-qadamda Uzum kabineti bor — birorta rasmiy savol yoʻq, toʻgʻri yakun kodi', () => {
    const asos = rasmiyBoshi();
    // 'kabinet_bor' — 1-qadamda qoʻshimcha savol (dokon_nomi) uygʻotmaydi.
    const h0: YolHolati = { ...asos, javoblar: { ...asos.javoblar, uzum_dokoni: 'kabinet_bor' } };
    const h = natijaniYoz(h0, 'rasmiy', { ...RASMIY, kabinetBor: true });
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'rasmiy_yakun', qadam: 7 });
    expect(keyingi(natijaniYoz(h, 'rasmiy_yakun', YAKUN))).toEqual({ tur: 'kod', harakat: 'qabul', qadam: 8 });
  });

  it('fakt yoʻq — savol matni "faktda yoʻq" deydi, taxmin yoki nol yoʻq', () => {
    let h = natijaniYoz(rasmiyBoshi(), 'rasmiy', { ...RASMIY, faktlar: rasmiyFaktlari({}) });
    h = javob(h, 'huquqiy_shakl', 'yoq');
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).toMatch(/onlayn \(manzil faktda yoʻq\) \(davlat boji faktda yoʻq\)/);
    expect(k.savol.matn).toMatch(/muddati faktda yoʻq/);
    expect(k.savol.matn).not.toMatch(/\b0 soʻm/);
    h = javob(h, 'yatt_ochish', 'boshqacha');
    const kb = keyingi(h);
    if (kb.tur !== 'savol') throw new Error(kb.tur);
    expect(kb.savol.matn).toMatch(/Bank roʻyxati faktda yoʻq/);
  });

  it('tushuntir(rasmiy): raqamlar va manbalar natijadan; kabinet bor — qisqa; olchov_yoq — sabab', () => {
    const m = tushuntir('rasmiy', RASMIY);
    expect(m).toMatch(/YATT \(onlayn 396 000 soʻm, shaxsan 440 000 soʻm\), biznes hisob raqami \(2 ta bank taqqoslandi\) va Uzum kabineti \(faollashtirish 2 kun\)/);
    expect(m).toMatch(/ijtimoiy 440 000 soʻm har oy \(sotuv boʻlmasa ham\), aylanmadan 1 % — partiyangiz \(2 850 000 soʻm\) sotilsa ≈ 28 500 soʻm/);
    expect(m).toMatch(/Manba: PQ-247; soliq 50017 \(oʻlchandi 28\.09\.2026\)/);
    expect(m).toMatch(/maslahat emas/);
    expect(tushuntir('rasmiy', { ...RASMIY, kabinetBor: true })).toMatch(/^Rasmiylashtirish sizda bor — 1-qadamda Uzum kabineti bor dedingiz/);
    expect(tushuntir('rasmiy', { ...RASMIY, olchov_yoq: true, sabab: 'fakt roʻyxati oʻqilmadi (baza javob bermadi)' })).toMatch(/bera olmadim: fakt roʻyxati oʻqilmadi/);
    const kam = tushuntir('rasmiy', { ...RASMIY, faktlar: rasmiyFaktlari({}), soliq: { ijtimoiySom: null, aylanmaSom: null, jamiSom: null, sotuvSom: null, yetishmaydi: ['ijtimoiy soliq'] } });
    expect(kam).toMatch(/Faktda yoʻq: BHM, YATT davlat boji/);
    expect(kam).not.toMatch(/\b0 soʻm/);
  });

  it('tushuntir(rasmiy_yakun): yozilganlar roʻyxati; boʻsh — "hammasi tayyor"; xato — sabab', () => {
    expect(tushuntir('rasmiy_yakun', YAKUN)).toBe('Rasmiylashtirish boʻyicha ochiq ish yoʻq — hammasi tayyor.');
    const y = { ...YAKUN, yozildi: [
      { tur: 'tekshirish', sabab: 'rasmiy: YATT roʻyxat sayti boshqacha', muddat: null, id: 3, yangi: true },
      { tur: 'kutyapman', sabab: 'Uzum kabinet faollashuvi', muddat: '2026-09-30', id: 4, yangi: true },
    ] };
    expect(tushuntir('rasmiy_yakun', y)).toMatch(/Ochiq ishlar yozildi \(2\): rasmiy: YATT roʻyxat sayti boshqacha; Uzum kabinet faollashuvi \(30\.09\.2026 gacha\)\. "Sayt boshqacha"/);
    expect(tushuntir('rasmiy_yakun', { ...y, olchov_yoq: true, sabab: 'sessiya topilmadi' })).toMatch(/xato: sessiya topilmadi; roʻyxat:/);
    // "Sayt boshqacha" jumlasi faqat tekshirish ishi bor boʻlsa — belgilamagan odamga "belgiladingiz" deyilmaydi.
    const faqatKutish = { ...YAKUN, yozildi: [{ tur: 'kutyapman', sabab: 'YATT ochilishi', muddat: null, id: 6, yangi: true }] };
    expect(tushuntir('rasmiy_yakun', faqatKutish)).toBe('Ochiq ishlar yozildi (1): YATT ochilishi.');
  });
});

/** 7-qadam tugagan holat (rasmiy yakuni yozilgan, kabinet 1-qadamda yoʻq). */
function qabulBoshi(): YolHolati {
  let h = natijaniYoz(rasmiyBoshi(), 'rasmiy', RASMIY);
  h = javob(h, 'huquqiy_shakl', 'yatt');
  h = javob(h, 'bank_hisobi', 'bor');
  h = javob(h, 'uzum_kabinet', 'faol');
  return natijaniYoz(h, 'rasmiy_yakun', YAKUN);
}

describe('8-qadam — Qabul (Xitoydan kelgan yuk; hamma raqam faktdan)', () => {
  it('kod qabul → yuk_keldi → yuk_mos → kod qabul_yakun → 9-qadam studiya kodi', () => {
    let h = qabulBoshi();
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'qabul', qadam: 8 });
    h = natijaniYoz(h, 'qabul', QABUL);
    const k1 = keyingi(h);
    if (k1.tur !== 'savol') throw new Error(k1.tur);
    expect(k1.savol.id).toBe('yuk_keldi');
    expect(k1.savol.qadam).toBe(8);
    expect(k1.savol.matn).toBe('Yuk keldimi? Varaqada 30 dona (1 tovar).');
    expect(k1.savol.variantlar.map((v) => v.qiymat)).toEqual(['keldi', 'hali_yoq']);
    h = javob(h, 'yuk_keldi', 'keldi');
    const k2 = keyingi(h);
    if (k2.tur !== 'savol') throw new Error(k2.tur);
    expect(k2.savol.id).toBe('yuk_mos');
    expect(k2.savol.matn).toMatch(/varaqada 30 dona.*tafovut — har birlik uchun 2 500 soʻm jarima/);
    h = javob(h, 'yuk_mos', 'mos');
    // Tartib tuzatildi: qadoq/yetkazma endi 10-qadamda — kartochkadan keyin.
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'qabul_yakun', qadam: 8 });
    h = natijaniYoz(h, 'qabul_yakun', QABUL_YAKUN);
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'studiya', qadam: 9 });
    expect(joriyQadam(h)).toBe(9);
  });

  it('yuk hali kelmagan — suhbat «Keldi» tugmasida turadi; bosilgach davom etadi', () => {
    let h = natijaniYoz(qabulBoshi(), 'qabul', QABUL);
    h = javob(h, 'yuk_keldi', 'hali_yoq');
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.id).toBe('yuk_kutish');
    expect(k.savol.matn).toMatch(/yorliq 58×40 mm, kod: EAN-13 yoki Uzum QR.*Zavod qutisi \+ strech.*«Keldi» ni bosing/);
    expect(k.savol.variantlar.map((v) => v.qiymat)).toEqual(['keldi']);
    expect(k.savol.otkazishMumkin).toBe(false);
    h = javob(h, 'yuk_kutish', 'keldi');
    expect(savolId(h)).toBe('yuk_mos');
  });

  it('kam / nuqsonli — izoh savoli (oʻtkazish mumkin), keyin qabul yakuni; mos — izoh soʻralmaydi', () => {
    let h = natijaniYoz(qabulBoshi(), 'qabul', QABUL);
    h = javob(h, 'yuk_keldi', 'keldi');
    h = javob(h, 'yuk_mos', 'kam');
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.id).toBe('yuk_izoh');
    expect(k.savol.turi).toBe('matn');
    expect(k.savol.otkazishMumkin).toBe(true);
    h = javob(h, 'yuk_izoh', ' 3 ta sumka yetishmadi ');
    expect(h.javoblar['yuk_izoh']).toBe('3 ta sumka yetishmadi');
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'qabul_yakun', qadam: 8 });
  });

  it('fakt yoʻq — matnlar "faktda yoʻq" deydi, nol yoʻq', () => {
    let h = natijaniYoz(qabulBoshi(), 'qabul', { ...QABUL, faktlar: qabulFaktlari({}), qatorlar: [{ productId: 100, title: 'A', miqdor: null, qadoq: null }], jamiDona: null });
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).toBe('Yuk keldimi? Varaqada dona soni yoʻq (1 tovar).');
    h = javob(h, 'yuk_keldi', 'keldi');
    const km = keyingi(h);
    if (km.tur !== 'savol') throw new Error(km.tur);
    expect(km.savol.matn).toMatch(/dona soni yoʻq.*tafovut — jarimasi faktda yoʻq/);
    expect(km.savol.matn).not.toMatch(/\b0 /);
  });

  it('tushuntir(qabul / qabul_yakun): raqamlar natijadan, manba bilan', () => {
    expect(tushuntir('qabul', QABUL)).toBe('Qabul roʻyxati tayyor: 1 ta tovar, 30 dona. Yuk kelganda sanang va koʻzdan kechiring: kam yoki nuqsonli boʻlsa agentga daʼvo uchun yozib qoʻyamiz. Nuqsonli tovarni Uzumga yubormang — omborda aniqlangan har muammo (nuqson, kam, ortiqcha, yorliqsiz): har birlik uchun 2 500 soʻm jarima. Manba: seller.uzum.uz/manual 6.6 (28.09.2026).');
    expect(tushuntir('qabul', { ...QABUL, olchov_yoq: true, sabab: 'fakt roʻyxati oʻqilmadi (baza javob bermadi)' })).toMatch(/bera olmadim: fakt roʻyxati oʻqilmadi/);
    expect(tushuntir('qabul_yakun', QABUL_YAKUN)).toBe('Qabul boʻyicha ochiq ish yoʻq — hammasi tayyor.');
    const y = { ...QABUL_YAKUN, yozildi: [{ tur: 'tekshirish', sabab: 'qabul: yuk kam keldi — 3 ta', muddat: null, id: 1, yangi: true }] };
    expect(tushuntir('qabul_yakun', y)).toBe('Ochiq ishlar yozildi (1): qabul: yuk kam keldi — 3 ta. Tekshirish belgilari nazoratchiga ketdi.');
  });
});

/** 8-qadam tugagan holat (yuk mos, qabul yakuni yozilgan). */
function studiyaBoshi(): YolHolati {
  let h = natijaniYoz(qabulBoshi(), 'qabul', QABUL);
  h = javob(h, 'yuk_keldi', 'keldi');
  h = javob(h, 'yuk_mos', 'mos');
  return natijaniYoz(h, 'qabul_yakun', QABUL_YAKUN);
}

describe('9-qadam — Studiya (oq fonli suratlar)', () => {
  it('kod studiya → (1688 galereyasi) kutish → studiya_tayyor → kod studiya_yakun → 10-qadam yuklash kodi', () => {
    let h = studiyaBoshi();
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'studiya', qadam: 9 });
    const kutish = natijaniYoz(h, 'studiya', STUDIYA_KUTISH);
    const kk = keyingi(kutish);
    expect(kk).toMatchObject({ tur: 'kutish', qadam: 9, boshlandi: '2026-09-29T09:00:00.000Z' });
    if (kk.tur === 'kutish') expect(kk.matn).toMatch(/^1688 dan tovar suratlari olinmoqda \(1 ta tovar\)/);
    expect(kutilayotganHarakat(kutish)).toBe('studiya');
    h = natijaniYoz(h, 'studiya', STUDIYA);
    expect(kutilayotganHarakat(h)).toBeNull();
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.id).toBe('studiya_tayyor');
    expect(k.savol.qadam).toBe(9);
    expect(k.savol.matn).toMatch(/^Jami 4 ta surat tayyorlandi — oq fonda, 3:4 \(1200×1600\)\. .*birinchisi — tovarning old tomoni.*Yetarlimi\?$/);
    expect(k.savol.variantlar.map((v) => v.qiymat)).toEqual(['tayyor', 'kam', 'qayta', 'keyin']);
    expect(k.savol.otkazishMumkin).toBe(true);
    h = javob(h, 'studiya_tayyor', 'tayyor');
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'studiya_yakun', qadam: 9 });
    h = natijaniYoz(h, 'studiya_yakun', STUDIYA_YAKUN);
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'yuklash', qadam: 10 });
  });

  it('kutilayotganHarakat: 1688 yurishi birinchi, keyin studiya', () => {
    const h = natijaniYoz(natijaniYoz(studiyaBoshi(), 'studiya', STUDIYA_KUTISH), 'xitoy', { ...XITOY, kutilmoqda: { runId: 'X' } });
    expect(kutilayotganHarakat(h)).toBe('xitoy');
    expect(kutilayotganHarakat(boshlangichHolat())).toBeNull();
  });

  it('«Qayta qidir» — studiya natijasi va javobi tozalanadi, yana studiya kodi', () => {
    let h = natijaniYoz(studiyaBoshi(), 'studiya', STUDIYA);
    h = javob(h, 'studiya_tayyor', 'qayta');
    expect(h.javoblar['studiya_tayyor']).toBeUndefined();
    expect(h.natijalar.studiya).toBeUndefined();
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'studiya', qadam: 9 });
  });

  it('studiya ulanmagan yoki surat yoʻq — rostini aytadi', () => {
    const h = natijaniYoz(studiyaBoshi(), 'studiya', { ...STUDIYA, sozlangan: false });
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).toMatch(/^Jami 4 ta surat tayyorlandi — asl holida — studiya xizmati hali ulanmagan\./);
    const bosh = keyingi(natijaniYoz(studiyaBoshi(), 'studiya', { ...STUDIYA, qatorlar: [] }));
    if (bosh.tur !== 'savol') throw new Error(bosh.tur);
    // Surat yoʻq — "keraklilarini yuklab oling" va «Yetarli, yuklab oldim» taklif qilinmaydi.
    expect(bosh.savol.matn).toMatch(/^Surat topilmadi — kartochka uchun suratni oʻzingiz olishingiz kerak\./);
    expect(bosh.savol.matn).not.toMatch(/Keraklilarini belgilab/);
    expect(bosh.savol.variantlar.map((v) => v.qiymat)).toEqual(['kam', 'qayta', 'keyin']);
  });

  it('tushuntir(studiya): manbalar soni, oq fon qoidasi, qidirilmagan sabab, Uzum talabi faktdan', () => {
    expect(tushuntir('studiya', STUDIYA)).toBe('Studiya: 1 ta tovar uchun 4 ta surat (3 tasi siz tanlagan taklifdan, 1 tasi oʻxshash takliflardan). Har biri 1200×1600 (3:4), oq fonda: foni oq boʻlsa faqat moslanadi, boʻlmasa fon olib tashlanadi — tovarning oʻzi oʻzgarmaydi. Oʻxshash taklif surati boshqa sotuvchiniki — tovar aynan bir xilligini tekshiring. Uzum talabi: kamida 750×1000, vertikal 3:4, 5 MB gacha. Xitoycha yozuvli yoki boshqa doʻkon belgisi bor suratni tanlamang.');
    const olinmadi = { ...STUDIYA, sozlangan: false, talablar: null, qatorlar: [{ ...STUDIYA.qatorlar[0]!, galereya: 'olinmadi' as const, galereyaSabab: 'provayder kaliti yoʻq', suratlar: [SURAT('1688-tanlov', 1)] }] };
    expect(tushuntir('studiya', olinmadi)).toBe('Studiya: 1 ta tovar uchun 1 ta surat (1 tasi siz tanlagan taklifdan, 0 tasi oʻxshash takliflardan). Studiya xizmati hali ulanmagan — suratlar asl holida, fon oqlanmagan. 1 ta tovarda taklif galereyasi olinmadi: provayder kaliti yoʻq. Uzum surat talablari faktda yoʻq. Xitoycha yozuvli yoki boshqa doʻkon belgisi bor suratni tanlamang.');
    expect(tushuntir('studiya', { ...STUDIYA, chiqishMos: false })).toMatch(/5 MB gacha\. DIQQAT: studiya chiqishi \(1200×1600\) bu talabga mos emas — nazoratchiga yozildi\. Xitoycha/);
    expect(tushuntir('studiya', { ...STUDIYA, olchov_yoq: true, sabab: 'buyurtma varaqasida 1688 taklifi tanlangan tovar yoʻq' })).toBe('Studiya suratlarini tayyorlay olmadim: buyurtma varaqasida 1688 taklifi tanlangan tovar yoʻq.');
    expect(tushuntir('studiya_yakun', { ...STUDIYA_YAKUN, yozildi: [{ tur: 'kutyapman', sabab: 'studiya: oʻz suratlari (yetmadi)', muddat: null, id: 3, yangi: true }] }))
      .toBe('Ochiq ishlar yozildi (1): studiya: oʻz suratlari (yetmadi).');
    expect(tushuntir('studiya_yakun', STUDIYA_YAKUN)).toBe('Studiya boʻyicha ochiq ish yoʻq — hammasi tayyor.');
  });
});

/** 9-qadam tugagan holat. */
function yuklashBoshi(): YolHolati {
  let h = natijaniYoz(studiyaBoshi(), 'studiya', STUDIYA);
  h = javob(h, 'studiya_tayyor', 'tayyor');
  return natijaniYoz(h, 'studiya_yakun', STUDIYA_YAKUN);
}

describe('10-qadam — Yuklash (kartochka → omborga topshirish)', () => {
  it('kod yuklash → kartochka → qadoq → yetkazish → taymslot → topshirildi → kod yuklash_yakun → 11 "tez orada"', () => {
    let h = yuklashBoshi();
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'yuklash', qadam: 10 });
    h = natijaniYoz(h, 'yuklash', YUKLASH);
    const k1 = keyingi(h);
    if (k1.tur !== 'savol') throw new Error(k1.tur);
    expect(k1.savol.id).toBe('kartochka_yaratildi');
    expect(k1.savol.qadam).toBe(10);
    expect(k1.savol.matn).toMatch(/Surat talabi: kamida 750×1000, vertikal 3:4, 5 MB gacha\. Kartochka qoidalari \(3 ta qoida\)/);
    expect(k1.savol.variantlar.map((v) => v.qiymat)).toEqual(['yaratdim', 'keyin', 'boshqacha']);
    h = javob(h, 'kartochka_yaratildi', 'yaratdim');
    const k2 = keyingi(h);
    if (k2.tur !== 'savol') throw new Error(k2.tur);
    expect(k2.savol.id).toBe('qadoq_tayyor');
    expect(k2.savol.qadam).toBe(10);
    expect(k2.savol.matn).toMatch(/EAN-13 yoki Uzum QR; oʻlcham 58×40 mm\. Quti kamida 2\/3 toʻlsin/);
    h = javob(h, 'qadoq_tayyor', 'tayyor');
    const k3 = keyingi(h);
    if (k3.tur !== 'savol') throw new Error(k3.tur);
    expect(k3.savol.id).toBe('yetkazish');
    expect(k3.savol.matn).toMatch(/Ombor: Toshkent, Sergeli, Xonabod 2\/2, 06:00–00:00\. Viloyatdan — Uzum logistikasi: https:\/\/logistics\.uzum\.uz \(quti 20 kg gacha, taymslotdan 2 kun oldin, pullik\)/);
    h = javob(h, 'yetkazish', 'ozim');
    const k4 = keyingi(h);
    if (k4.tur !== 'savol') throw new Error(k4.tur);
    expect(k4.savol.id).toBe('taymslot');
    expect(k4.savol.matn).toMatch(/100 SKU gacha.*2 nusxa.*3 marta gacha.*48 soat oldin/);
    h = javob(h, 'taymslot', 'oldim');
    const k5 = keyingi(h);
    if (k5.tur !== 'savol') throw new Error(k5.tur);
    expect(k5.savol.id).toBe('topshirildi');
    expect(k5.savol.matn).toMatch(/Qabul 7 kun gacha.*har birlik uchun 2 500 soʻm jarima/);
    h = javob(h, 'topshirildi', 'topshirdim');
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'yuklash_yakun', qadam: 10 });
    h = natijaniYoz(h, 'yuklash_yakun', YUKLASH_YAKUN);
    const k11 = keyingi(h);
    if (k11.tur !== 'savol') throw new Error(k11.tur);
    expect(k11.savol.id).toBe('uzum_havola:100');
    expect(k11.savol.qadam).toBe(11);
    expect(joriyQadam(h)).toBe(11);
  });

  it('eski sessiya: 8-qadamda qadoq/yetkazma javob berilgan — 10-qadamda qayta soʻralmaydi', () => {
    let h = yuklashBoshi();
    h = { ...h, javoblar: { ...h.javoblar, qadoq_tayyor: 'tayyor', yetkazish: 'ozim', taymslot: 'oldim', topshirildi: 'topshirdim' } };
    h = natijaniYoz(h, 'yuklash', YUKLASH);
    expect(savolId(h)).toBe('kartochka_yaratildi');
    h = javob(h, 'kartochka_yaratildi', 'yaratdim');
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'yuklash_yakun', qadam: 10 });
  });

  it('fakt yoʻq — "faktda yoʻq", nol yoʻq', () => {
    let h = natijaniYoz(yuklashBoshi(), 'yuklash', { ...YUKLASH, faktlar: qabulFaktlari({}), talablar: suratTalablari({}) });
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).toMatch(/Surat talabi: ruxsat faktda yoʻq, nisbat faktda yoʻq, hajm faktda yoʻq\. Kartochka qoidalari \(qoidalar faktda yoʻq\)/);
    h = javob(h, 'kartochka_yaratildi', 'yaratdim');
    const kq = keyingi(h);
    if (kq.tur !== 'savol') throw new Error(kq.tur);
    expect(kq.savol.matn).toMatch(/yorliq: faktda yoʻq; oʻlcham faktda yoʻq\. Quti toʻliqligi faktda yoʻq/);
    expect(kq.savol.matn).not.toMatch(/\b0 /);
  });

  it('tushuntir(yuklash / yuklash_yakun)', () => {
    expect(tushuntir('yuklash', YUKLASH)).toBe('Yuklash: 1 ta tovar, 30 dona. Avval kartochka (3 ta qoida), keyin qadoq (0 tasiga Uzum jadvalidan qoida), yorliq, yetkazma akti va taymslot. Ombor: Toshkent, Sergeli, Xonabod 2/2 (06:00–00:00); qabul 7 kun gacha, tafovut — har birlik uchun 2 500 soʻm jarima. Manba: seller.uzum.uz/manual 6.6 (28.09.2026).');
    expect(tushuntir('yuklash', { ...YUKLASH, olchov_yoq: true, sabab: 'yuklash faktlari kiritilmagan (0058/0059 qoʻllanmagan)' })).toMatch(/bera olmadim: yuklash faktlari kiritilmagan/);
    const y = { ...YUKLASH_YAKUN, yozildi: [
      { tur: 'tekshirish', sabab: 'yuklash: kabinet (kartochka) boshqacha', muddat: null, id: 1, yangi: true },
      { tur: 'kutyapman', sabab: 'Uzum ombor qabuli', muddat: '2026-10-06', id: 2, yangi: true },
    ] };
    expect(tushuntir('yuklash_yakun', y)).toBe('Ochiq ishlar yozildi (2): yuklash: kabinet (kartochka) boshqacha; Uzum ombor qabuli (06.10.2026 gacha). Tekshirish belgilari nazoratchiga ketdi.');
    expect(tushuntir('yuklash_yakun', YUKLASH_YAKUN)).toBe('Yuklash boʻyicha ochiq ish yoʻq — hammasi tayyor.');
  });
});

/** 10-qadam tugagan holat (kartochka yaratildi, topshirildi). */
function sotuvBoshi(): YolHolati {
  let h = natijaniYoz(yuklashBoshi(), 'yuklash', YUKLASH);
  for (const [id, q] of [['kartochka_yaratildi', 'yaratdim'], ['qadoq_tayyor', 'tayyor'], ['yetkazish', 'ozim'], ['taymslot', 'oldim'], ['topshirildi', 'topshirdim']] as const) {
    h = javob(h, id, q);
  }
  return natijaniYoz(h, 'yuklash_yakun', YUKLASH_YAKUN);
}

describe('11-qadam — Sotuv boshlandi (oʻz kartochka kuzatuvi, signallar)', () => {
  it('havola: notoʻgʻri — rad; raqobatchi (3-qadam) tovari — rad; oʻtkazish — null; toʻgʻri — kod sotuv', () => {
    const h = sotuvBoshi();
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).toMatch(/^«Quloqchin A» Uzumda sotuvga chiqdimi\? Oʻz kartochkangiz havolasini yuboring/);
    expect(javobniQabulQil(h, 'uzum_havola:100', 'salom').xato).toMatch(/Uzum kartochka havolasini yuboring/);
    expect(javobniQabulQil(h, 'uzum_havola:100', 'https://uzum.uz/uz/product/quloqchin-a-100').xato).toMatch(/raqobatchi tovari/);
    expect(javobniQabulQil(h, 'uzum_havola:100', '').holat.javoblar['uzum_havola:100']).toBeNull();
    const h2 = javob(h, 'uzum_havola:100', ' https://uzum.uz/uz/product/mening-quloqchinim-5001 ');
    expect(h2.javoblar['uzum_havola:100']).toBe('https://uzum.uz/uz/product/mening-quloqchinim-5001');
    expect(keyingi(h2)).toEqual({ tur: 'kod', harakat: 'sotuv', qadam: 11 });
  });

  it('signallar ketma-ket (matni ssenariydagidek), keyin holat savoli; «Yangilash» natijani tozalaydi', () => {
    let h = natijaniYoz(javob(sotuvBoshi(), 'uzum_havola:100', 'https://uzum.uz/uz/product/x-5001'), 'sotuv', SOTUV);
    const k1 = keyingi(h);
    if (k1.tur !== 'savol') throw new Error(k1.tur);
    expect(k1.savol.id).toBe('signal:zaxira:100:p1');
    // "13 % ga tushdi" — "13 % ga kamaydi" deb oʻqilardi; aslida 13 % QOLDI.
    expect(k1.savol.matn).toBe('«Quloqchin A» zaxirasidan 13 % qoldi — 4 dona, shu tezlikda 1 kunga yetadi. Yangi partiya buyurtma qilamizmi? Oxirgi safar 1688 da ¥27 dan olgansiz — sotuvchi maʼlum, yoʻl qisqa.');
    expect(k1.savol.variantlar.map((v) => v.qiymat)).toEqual(['yana', 'yoq']);
    h = javob(h, 'signal:zaxira:100:p1', 'yoq');
    const k2 = keyingi(h);
    if (k2.tur !== 'savol') throw new Error(k2.tur);
    expect(k2.savol.matn).toBe('Raqobatchi («Quloqchin A») narxini 95 000 soʻmga tushirdi (oldin 100 000, −5 %), oʻlchangan 30.09.2026. Sizniki: 99 000 soʻm. Tegmaymiz yoki tushiramiz?');
    h = javob(h, k2.savol.id, 'tegmaymiz');
    const k3 = keyingi(h);
    if (k3.tur !== 'savol') throw new Error(k3.tur);
    expect(k3.savol.matn).toBe('«Quloqchin A» ga yangi sharh: 1 ta (jami 7), oʻrtacha baho 4.6. Javob yozamizmi?');
    h = javob(h, k3.savol.id, 'keyin');
    const k4 = keyingi(h);
    if (k4.tur !== 'savol') throw new Error(k4.tur);
    expect(k4.savol.id).toBe('sotuv_holat');
    expect(k4.savol.matn).toBe('Bugun: 3 dona, oʻlchangan (zaxira kamayishidan). Zaxira: 4 dona. Shu tezlikda 1 kunga yetadi. Bu bashorat emas, hozirgi tezlik. Oy yakunida — «Oy hisoboti».');
    // Zaxira signaliga «Hozircha yoʻq» deyilgan — qayta buyurtma yoʻli shu menyuda qoladi.
    expect(k4.savol.variantlar.map((v) => v.qiymat)).toEqual(['yangila', 'yana', 'hisobot']);
    const y = javob(h, 'sotuv_holat', 'yangila');
    expect(y.natijalar.sotuv).toBeUndefined();
    expect(y.javoblar['sotuv_holat']).toBeUndefined();
    expect(y.javoblar['signal:zaxira:100:p1']).toBe('yoq');
    expect(keyingi(y)).toEqual({ tur: 'kod', harakat: 'sotuv', qadam: 11 });
  });

  it('havola oʻtkazilgan — «Havola qoʻshish» varianti; bosilsa havola qayta soʻraladi', () => {
    let h = javob(sotuvBoshi(), 'uzum_havola:100', null);
    h = natijaniYoz(h, 'sotuv', { ...SOTUV_JIM, qatorlar: [{ ...SOTUV.qatorlar[0]!, ozId: null, oz: null }], jami: { bugunDona: null, oyDona: null, oySom: null } });
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).toMatch(/^Kartochka havolasi berilmagan — kuzatadigan narsa yoʻq/);
    expect(k.savol.variantlar.map((v) => v.qiymat)).toEqual(['yangila', 'havola', 'hisobot']);
    const h2 = javob(h, 'sotuv_holat', 'havola');
    expect(Object.prototype.hasOwnProperty.call(h2.javoblar, 'uzum_havola:100')).toBe(false);
    const k2 = keyingi(h2);
    if (k2.tur !== 'savol') throw new Error(k2.tur);
    expect(k2.savol.id).toBe('uzum_havola:100');
  });

  it('oxirgi kunlarda sotuv yoʻq — oy boshidagi sotuv yashirilmaydi; tezlik yoʻq — "ikki oʻlchovdan keyin"', () => {
    const jim = { ...OZ, bugunSotildi: 0, tezlik: 0, tezlikKun: 7, zaxira: 7, zaxiraKun: null, oyDona: 3 };
    const h = natijaniYoz(javob(sotuvBoshi(), 'uzum_havola:100', '5001'), 'sotuv',
      { ...SOTUV_JIM, qatorlar: [{ ...SOTUV.qatorlar[0]!, oz: jim }], jami: { bugunDona: 0, oyDona: 3, oySom: 297_000 } });
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).toBe('Bugun: 0 dona, oʻlchangan (zaxira kamayishidan). Zaxira: 7 dona. Oxirgi 7 oʻlchangan kunda sotuv qayd etilmadi (shu oy jami 3 dona) — zaxira necha kunga yetishini hisoblab boʻlmaydi. Oy yakunida — «Oy hisoboti».');
    const h2 = natijaniYoz(javob(sotuvBoshi(), 'uzum_havola:100', '5001'), 'sotuv',
      { ...SOTUV_JIM, qatorlar: [{ ...SOTUV.qatorlar[0]!, oz: { ...jim, tezlik: null, tezlikKun: 0 } }] });
    const k2 = keyingi(h2);
    if (k2.tur !== 'savol') throw new Error(k2.tur);
    expect(k2.savol.matn).toMatch(/Sotuv tezligi ikki zaxira oʻlchovidan keyin chiqadi\./);
  });

  it('oʻlchov hali yoʻq — "kuzatuvga qoʻshildi, ertaga Yangilash" (sotuv yoʻq DEMAYDI)', () => {
    const h = natijaniYoz(javob(sotuvBoshi(), 'uzum_havola:100', '5001'), 'sotuv',
      { ...SOTUV_JIM, qatorlar: [{ ...SOTUV.qatorlar[0]!, oz: { ...OZ, holat: 'kutilmoqda' as const } }] });
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).toMatch(/^Kartochkalar kuzatuvga qoʻshildi \(1 ta\)\. Birinchi oʻlchov .*09:00, 17:00, 01:00.*«Yangilash» ni bosing\.$/);
  });

  it('«Ha, yana buyurtma» — ikkinchi partiya: miqdor oʻz tezligidan soʻraladi, 6-qadamdan qayta; sotuvchi, rasmiylashtirish, kartochka saqlanadi', () => {
    let h = natijaniYoz(javob(sotuvBoshi(), 'uzum_havola:100', '5001'), 'sotuv', SOTUV);
    const tanlov = h.javoblar['xitoy_tanlov:100'];
    h = javob(h, 'signal:zaxira:100:p1', 'yana');
    expect(h.natijalar.partiya).toBe(2);
    expect(h.natijalar.oldingi_partiyalar).toEqual([{ partiya: 1, sana: '2026-09-30', buyurtma: BUYURTMA, zaxira: { 100: 4 }, tezlik: { 100: 2.5 } }]);
    expect(h.natijalar.buyurtma).toBeUndefined();
    expect(h.natijalar.sotuv).toBeUndefined();
    expect(h.javoblar['xitoy_tanlov:100']).toBe(tanlov);
    expect(h.javoblar['kartochka_yaratildi']).toBe('yaratdim');
    expect(h.javoblar['uzum_havola:100']).toBe('5001');
    expect(h.javoblar['topshirildi']).toBeUndefined();
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.id).toBe('partiya_miqdor:100');
    expect(k.savol.qadam).toBe(6);
    expect(k.savol.matn).toBe('«Quloqchin A» — 2-partiya. Oldingi safar 30 dona olgansiz; oʻz kartochkangiz tezligi — kuniga ~2.5 dona (zaxira kamayishidan). Bu safar nechta olasiz? 0 — bu safar olmayman; oʻtkazsangiz — oldingidek.');
    expect(k.savol.variantlar.map((v) => v.qiymat)).toEqual([75, 150, 30, 0]);
    expect(javob(h, 'partiya_miqdor:100', 0).javoblar['partiya_miqdor:100']).toBe(0);
    h = javob(h, 'partiya_miqdor:100', 60);
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'buyurtma', qadam: 6 });
    // Ikkinchi aylanish qisqa: shahar va 7-qadam (rasmiylashtirish) qayta soʻralmaydi.
    h = natijaniYoz(h, 'buyurtma', { ...BUYURTMA, qatorlar: [{ ...BUYURTMA.qatorlar[0]!, miqdor: 60 }] });
    h = javob(h, 'buyurtma_raqami', 'YT-2');
    h = javob(h, 'dokon_tayyorlash', 'boshlaymiz');
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'ochiq_ish', qadam: 6 });
    h = natijaniYoz(h, 'ochiq_ish', OCHIQ);
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'qabul', qadam: 8 });
    // Uchinchi partiyada oldingi miqdor — ikkinchisiniki; partiya_miqdor javobi tozalanadi.
    const b2 = { ...BUYURTMA, qatorlar: [{ ...BUYURTMA.qatorlar[0]!, miqdor: 60 }] };
    let h2 = javob(sotuvBoshi(), 'uzum_havola:100', '5001');
    h2 = { javoblar: { ...h2.javoblar, 'partiya_miqdor:100': 60 }, natijalar: { ...h2.natijalar, partiya: 2, buyurtma: b2,
      oldingi_partiyalar: [{ partiya: 1, sana: '2026-09-30', buyurtma: BUYURTMA, zaxira: { 100: 4 }, tezlik: { 100: 2.5 } }] } };
    h2 = natijaniYoz(h2, 'sotuv', { ...SOTUV, partiya: 2, qatorlar: [{ ...SOTUV.qatorlar[0]!, partiya: 2 }], signallar: [{ ...SOTUV.signallar[0]!, id: 'zaxira:100:p2' }] });
    const h3 = javob(h2, 'signal:zaxira:100:p2', 'yana');
    expect(h3.natijalar.partiya).toBe(3);
    expect(Object.prototype.hasOwnProperty.call(h3.javoblar, 'partiya_miqdor:100')).toBe(false);
    const k3 = keyingi(h3);
    if (k3.tur !== 'savol') throw new Error(k3.tur);
    expect(k3.savol.matn).toMatch(/^«Quloqchin A» — 3-partiya\. Oldingi safar 60 dona olgansiz;/);
  });

  it('sotuvTovarlari: hamma partiyalar tovarlari — qayta olingani yangi partiya va buyurtma kuni bilan, olinmagani eskisi bilan', () => {
    const B200 = { ...BUYURTMA.qatorlar[0]!, productId: 200, title: 'Quloqchin B', miqdor: 10, narxYuan: 15 };
    const h: YolHolati = { javoblar: {}, natijalar: {
      partiya: 2,
      oldingi_partiyalar: [{ partiya: 1, sana: '2026-09-30', buyurtma: { ...BUYURTMA, qatorlar: [BUYURTMA.qatorlar[0]!, B200] }, zaxira: { 100: 4, 200: 9 }, tezlik: { 100: 2.5, 200: 0.5 } }],
      buyurtma: { ...BUYURTMA, qatorlar: [{ ...BUYURTMA.qatorlar[0]!, miqdor: 60 }] },
    } };
    expect(sotuvTovarlari(h)).toEqual([
      { productId: 100, title: 'Quloqchin A', miqdor: 60, xaridYuan: 27, partiya: 2, qayta: { sana: '2026-09-30', zaxira: 4 } },
      { productId: 200, title: 'Quloqchin B', miqdor: 10, xaridYuan: 15, partiya: 1, qayta: null },
    ]);
  });

  it('tushuntir(sotuv): oʻlchov manbasi va signallar soni; havola yoʻq; kuzatuv xatosi', () => {
    expect(tushuntir('sotuv', SOTUV)).toBe('Sotuv (30.09.2026): Kuzatuvda: 1 ta kartochka (1 tasi yangi qoʻshildi). Bugun 3 dona, shu oy 26 dona, taxminan 2 574 000 soʻm — zaxira kamayishidan (Uzum buyurtma sonini bermaydi). Signallar: 3 ta.');
    expect(tushuntir('sotuv', { ...SOTUV_JIM, qatorlar: [{ ...SOTUV.qatorlar[0]!, ozId: null, oz: null }] })).toBe('Sotuv: kartochka havolasi yoʻq — oʻz sotuvingizni kuzata olmayman. Signal yoʻq.');
    expect(tushuntir('sotuv', { ...SOTUV_JIM, kuzatuv: null, kuzatuvXato: 'sessiya yoʻq', qatorlar: [{ ...SOTUV.qatorlar[0]!, oz: { ...OZ, holat: 'kutilmoqda' as const } }] }))
      .toMatch(/Kuzatuvga qoʻshib boʻlmadi: sessiya yoʻq\. Hali oʻlchanmagan/);
    expect(tushuntir('sotuv', { ...SOTUV, olchov_yoq: true, sabab: 'oʻlchov oʻqilmadi (baza javob bermadi)' })).toMatch(/Bu "sotuv yoʻq" degani EMAS/);
  });
});

/** 11-qadam tugagan holat: signallar javob berilgan, «Oy hisoboti» bosilgan. */
function hisobotBoshi(): YolHolati {
  let h = natijaniYoz(javob(sotuvBoshi(), 'uzum_havola:100', '5001'), 'sotuv', SOTUV);
  for (const [id, q] of [['signal:zaxira:100:p1', 'yoq'], ['signal:narx:100:2026-09-30:95000', 'tegmaymiz'], ['signal:sharh:100:7', 'javob'], ['sotuv_holat', 'hisobot']] as const) {
    h = javob(h, id, q);
  }
  // «Oy hisoboti» sotuvni qayta oʻlchatadi — oy eski natijadan olinmaydi.
  h = natijaniYoz(h, 'sotuv', SOTUV);
  return javob(h, 'hisobot_oy', '2026-09');
}

describe('12-qadam — Hisobot (oy yakuni, soliq, keyingi oy)', () => {
  it('«Oy hisoboti» — avval qaysi oy: tugagan yoki joriy (hozirgacha); matnlar shunga qarab', () => {
    let h = natijaniYoz(javob(sotuvBoshi(), 'uzum_havola:100', '5001'), 'sotuv', SOTUV_JIM);
    h = javob(h, 'sotuv_holat', 'hisobot');
    // Avval sotuv qayta oʻlchanadi: oy (va «tugagan» belgisi) eski natijadan olinmaydi.
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'sotuv', qadam: 11 });
    h = natijaniYoz(h, 'sotuv', SOTUV_JIM);
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.id).toBe('hisobot_oy');
    expect(k.savol.qadam).toBe(12);
    expect(k.savol.variantlar).toEqual([{ qiymat: '2026-08', nom: '2026-yil avgust — tugagan' }, { qiymat: '2026-09', nom: '2026-yil sentyabr — hozirgacha' }]);
    expect(javobniQabulQil(h, 'hisobot_oy', '2026-07').xato).toBe('variantlardan birini tanlang');
    h = javob(h, 'hisobot_oy', '2026-09');
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'hisobot', qadam: 12 });
    h = natijaniYoz(h, 'hisobot', { ...HISOBOT, tugagan: false });
    const k2 = keyingi(h);
    if (k2.tur !== 'savol') throw new Error(k2.tur);
    expect(k2.savol.matn).toMatch(/^Oy hisoboti \(2026-yil sentyabr, hozirgacha — oy hali tugamagan\)\. /);
    h = javob(javob(h, 'oy_sotuv', null), 'oy_komissiya', null);
    const taxmin = oyHisobi({ oy: '2026-09', kabinetSotuv: null, olchovSotuv: 2_574_000, komissiya: null, f: HISOBOT_F });
    h = natijaniYoz(h, 'hisobot_hisob', { ...taxmin, tugagan: false, faktlar: HISOBOT_F, qadamlar: [], izoh: 'hisob' });
    const k3 = keyingi(h);
    if (k3.tur !== 'savol') throw new Error(k3.tur);
    expect(k3.savol.matn).toMatch(/^2026-yil sentyabr hali tugamagan — hozirgacha hisob\. Sotuv 2 574 000 soʻm \(taxmin\)/);
    expect(tushuntir('hisobot', { ...HISOBOT, tugagan: false })).toMatch(/^Oy hisoboti \(2026-yil sentyabr, hozirgacha\): /);
  });

  it('oʻlchov oyni toʻliq qoplamasa — "N kundan M kuni oʻlchangan, qisman"; oʻlchov yoʻq — "0 dona" DEMAYDI', () => {
    let h = hisobotBoshi();
    h = natijaniYoz(h, 'hisobot', { ...HISOBOT, oy: '2026-08', olchovSotuv: 0, olchovDona: 0, olchovKun: 4, oyKunlari: 31 });
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).toMatch(/^Oy hisoboti \(2026-yil avgust\)\. Oʻlchovimiz boʻyicha: 0 dona, taxminan 0 soʻm \(zaxira kamayishidan; 31 kundan 4 kuni oʻlchangan — qisman\)\. Aniq summa/);
    expect(tushuntir('hisobot', { ...HISOBOT, olchovSotuv: null, olchovDona: null, olchovKun: null }))
      .toBe('Oy hisoboti (2026-yil sentyabr): bu oy uchun oʻlchovimiz yoʻq. Aniq raqamni Uzum komissioner hisobotidan olamiz.');
    const bosh = natijaniYoz(hisobotBoshi(), 'hisobot', { ...HISOBOT, olchovSotuv: null, olchovDona: null, olchovKun: null });
    const k0 = keyingi(bosh);
    if (k0.tur !== 'savol') throw new Error(k0.tur);
    expect(k0.savol.matn).toMatch(/^Oy hisoboti \(2026-yil sentyabr\)\. Bu oy uchun oʻlchovimiz yoʻq\. Aniq summa/);
    h = javob(javob(h, 'oy_sotuv', null), 'oy_komissiya', null);
    const taxmin = oyHisobi({ oy: '2026-08', kabinetSotuv: null, olchovSotuv: 0, komissiya: null, f: HISOBOT_F });
    const hh = { ...taxmin, tugagan: true, qamrov: { kun: 4, jami: 31 }, faktlar: HISOBOT_F, qadamlar: [], izoh: 'hisob' };
    h = natijaniYoz(h, 'hisobot_hisob', hh);
    const k2 = keyingi(h);
    if (k2.tur !== 'savol') throw new Error(k2.tur);
    expect(k2.savol.matn).toMatch(/^Oy tugadi \(2026-yil avgust\)\. Sotuv 0 soʻm \(taxmin, 31 kundan 4 kuni oʻlchangan\), komissiya yozilmagan/);
    expect(tushuntir('hisobot_hisob', hh)).toMatch(/^Hisob: sotuv 0 soʻm \(taxmin, 31 kundan 4 kuni oʻlchangan\), aylanma/);
  });

  it('kod hisobot → oy_sotuv → oy_komissiya → kod hisobot_hisob → deklaratsiya → qadamlar → kod yakun → yangi oy', () => {
    let h = hisobotBoshi();
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'hisobot', qadam: 12 });
    h = natijaniYoz(h, 'hisobot', HISOBOT);
    const k1 = keyingi(h);
    if (k1.tur !== 'savol') throw new Error(k1.tur);
    expect(k1.savol.id).toBe('oy_sotuv');
    expect(k1.savol.turi).toBe('son');
    expect(k1.savol.matn).toBe('Oy hisoboti (2026-yil sentyabr). Oʻlchovimiz boʻyicha: 26 dona, taxminan 2 574 000 soʻm (zaxira kamayishidan). Aniq summa — Uzum kabinetidagi komissioner hisobotida (keyingi oyning 19-sanasigacha tayyor boʻladi). Hisobotdagi SOTUV summasini yozing — soliq xaridor toʻlagan toʻliq narxdan olinadi. Bilmasangiz — oʻtkazib yuboring, taxmin bilan hisoblayman.');
    h = javob(h, 'oy_sotuv', 2_600_000);
    h = javob(h, 'oy_komissiya', 400_000);
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'hisobot_hisob', qadam: 12 });
    h = natijaniYoz(h, 'hisobot_hisob', HISOBOT_HISOB);
    const k2 = keyingi(h);
    if (k2.tur !== 'savol') throw new Error(k2.tur);
    expect(k2.savol.id).toBe('deklaratsiya');
    expect(k2.savol.matn).toBe('Oy tugadi (2026-yil sentyabr). Sotuv 2 600 000 soʻm, komissiya 400 000 soʻm, sof 2 200 000 soʻm. Soliq: YATT uchun 1 % aylanmadan — 26 000 soʻm; ijtimoiy soliq 440 000 soʻm. Ijtimoiy soliq muddati — 15.10.2026 gacha. Deklaratsiyani tayyorlaymizmi?');
    h = javob(h, 'deklaratsiya', 'tayyorlaymiz');
    const k3 = keyingi(h);
    if (k3.tur !== 'savol') throw new Error(k3.tur);
    expect(k3.savol.id).toBe('deklaratsiya_qadam');
    expect(k3.savol.matn).toMatch(/^https:\/\/my3\.soliq\.uz ga E-imzo bilan kiring\./);
    expect(k3.savol.variantlar.map((v) => v.qiymat)).toEqual(['bajardim', 'keyin', 'boshqacha']);
    h = javob(h, 'deklaratsiya_qadam', 'bajardim');
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'hisobot_yakun', qadam: 12 });
    h = natijaniYoz(h, 'hisobot_yakun', HISOBOT_YAKUN);
    const k4 = keyingi(h);
    if (k4.tur !== 'savol') throw new Error(k4.tur);
    expect(k4.savol.id).toBe('yangi_oy');
    expect(joriyQadam(h)).toBe(12);
    const y = javob(h, 'yangi_oy', 'boshlaymiz');
    expect(y.natijalar.oylar).toEqual([{ oy: '2026-09', sotuvSom: 2_600_000, komissiyaSom: 400_000, sofSom: 2_200_000, soliq: HISOB.soliq }]);
    expect(y.natijalar.sotuv).toBeUndefined();
    expect(y.natijalar.hisobot_yakun).toBeUndefined();
    expect(y.javoblar['oy_sotuv']).toBeUndefined();
    expect(y.javoblar['hisobot_oy']).toBeUndefined();
    expect(y.javoblar['signal:zaxira:100:p1']).toBe('yoq');
    expect(keyingi(y)).toEqual({ tur: 'kod', harakat: 'sotuv', qadam: 11 });
  });

  it('deklaratsiya «Keyinroq» — qadamlar soʻralmaydi, yakun kodi; summa oʻtkazilsa taxmin deyiladi', () => {
    let h = natijaniYoz(hisobotBoshi(), 'hisobot', HISOBOT);
    h = javob(h, 'oy_sotuv', null);
    h = javob(h, 'oy_komissiya', null);
    const taxmin = oyHisobi({ oy: '2026-09', kabinetSotuv: null, olchovSotuv: 2_574_000, komissiya: null, f: HISOBOT_F });
    h = natijaniYoz(h, 'hisobot_hisob', { ...taxmin, tugagan: true, faktlar: HISOBOT_F, qadamlar: [], izoh: 'hisob' });
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).toMatch(/^Oy tugadi \(2026-yil sentyabr\)\. Sotuv 2 574 000 soʻm \(taxmin\), komissiya yozilmagan, sof hisoblanmadi\. Soliq: YATT uchun 1 % aylanmadan — 25 740 soʻm/);
    h = javob(h, 'deklaratsiya', 'keyin');
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'hisobot_yakun', qadam: 12 });
  });

  it('tushuntir(hisobot / hisobot_hisob / hisobot_yakun)', () => {
    expect(tushuntir('hisobot', HISOBOT)).toBe('Oy hisoboti (2026-yil sentyabr): oʻlchovimiz boʻyicha 26 dona, taxminan 2 574 000 soʻm. Aniq raqamni Uzum komissioner hisobotidan olamiz.');
    expect(tushuntir('hisobot_hisob', HISOBOT_HISOB)).toBe('Hisob: sotuv 2 600 000 soʻm, aylanma soligʻi 26 000 soʻm, ijtimoiy soliq 440 000 soʻm — jami 466 000 soʻm. Soliq bazasi — xaridor toʻlagan toʻliq narx, komissiya chegirilmaydi. Bu soliq maslahati emas. Aylanma soligʻi: Javobgarlik soliq agentida — komissioner hisobotida ushlab qolinganini tekshiring.');
    expect(tushuntir('hisobot_yakun', HISOBOT_YAKUN)).toBe('Hisobot boʻyicha ochiq ish yoʻq — hammasi tayyor. Keyingi oy rejasi: «Quloqchin A»: kuniga ~2.5 dona, zaxira 1 kunga yetadi.');
    const y = { ...HISOBOT_YAKUN, yozildi: [{ tur: 'tolov', sabab: 'ijtimoiy soliq (2026-09)', muddat: '2026-10-15', id: 1, yangi: true }] };
    expect(tushuntir('hisobot_yakun', y)).toMatch(/^Ochiq ishlar yozildi \(1\): ijtimoiy soliq \(2026-09\) \(15\.10\.2026 gacha\)\./);
  });
});

/**
 * Ssenariy tekshiruvi (2026-10-05) topgan kamchiliklar — har biri uchun
 * test. Raqam (F1…F25) — tekshiruv roʻyxatidagi tartib.
 */
describe('tekshiruv tuzatishlari (2026-10-05)', () => {
  it('F2: byudjet hech biriga yetmasa — "hali aytib boʻlmaydi" DEMAYDI; savol "byudjetingiz bilan boshlash mumkin" demaydi', () => {
    const yetmaydi = { ...YONALISHLAR, royxat: YONALISHLAR.royxat.map((y) => ({ ...y, yetadi: false })) };
    const m = tushuntir('yonalishlar', yetmaydi);
    expect(m).toMatch(/Byudjetingiz bu yoʻnalishlarning hech biriga tavsiya etilgan kirish summasiga yetmaydi\./);
    expect(m).not.toMatch(/hali aytib boʻlmaydi/);
    expect(tushuntir('yonalishlar', { ...YONALISHLAR, royxat: YONALISHLAR.royxat.map((y) => ({ ...y, yetadi: null })) })).toMatch(/Byudjet yetadimi — hali aytib boʻlmaydi/);
    expect(tushuntir('yonalishlar', YONALISHLAR)).toMatch(/1 tasiga byudjetingiz yetadi, 1 tasiga yetmaydi\./);
    const k = keyingi(natijaniYoz(tanishuvTugadi(), 'yonalishlar', yetmaydi));
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).not.toMatch(/Byudjetingiz bilan boshlash mumkin/);
  });

  it('F3: kod bajarmaydigan vaʼda yoʻq — "oʻzim aytaman", "yuk kelgan kuni sotish", "keyin soʻrayman", doʻkon nomi vaʼdasi', () => {
    let h = natijaniYoz(xitoyTanlandi(), 'buyurtma', BUYURTMA);
    h = javob(h, 'shahar', 'Toshkent');
    const kr = keyingi(h);
    if (kr.tur !== 'savol') throw new Error(kr.tur);
    expect(kr.savol.matn).not.toMatch(/keyin soʻrayman/);
    h = javob(h, 'buyurtma_raqami', null);
    const kd = keyingi(h);
    if (kd.tur !== 'savol') throw new Error(kd.tur);
    expect(kd.savol.id).toBe('dokon_tayyorlash');
    expect(kd.savol.matn).not.toMatch(/oʻzim aytaman|yuk kelgan kuni sotish/);
    expect(kd.savol.matn).toMatch(/eslatma hali yoʻq/);
    const sot = javobniQabulQil(javob(boshlangichHolat(), 'byudjet', 10_000_000), 'uzum_dokoni', 'sotyapman').holat;
    const kn = keyingi(sot);
    if (kn.tur !== 'savol') throw new Error(kn.tur);
    expect(kn.savol.id).toBe('dokon_nomi');
    expect(kn.savol.matn).not.toMatch(/raqamlarini/);
  });

  it('F3: oʻlchov yoʻq oyda "taxmin bilan hisoblayman" vaʼda qilinmaydi', () => {
    const k = keyingi(natijaniYoz(hisobotBoshi(), 'hisobot', { ...HISOBOT, olchovSotuv: null, olchovDona: null, olchovKun: null }));
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.id).toBe('oy_sotuv');
    expect(k.savol.matn).not.toMatch(/taxmin bilan hisoblayman/);
    expect(k.savol.matn).toMatch(/aylanma soligʻi hisoblanmaydi/);
  });

  it('F4: zaxira signaliga «Hozircha yoʻq» — holat menyusida «Yana buyurtma» qoladi (yoʻl berk emas)', () => {
    let h = natijaniYoz(javob(sotuvBoshi(), 'uzum_havola:100', '5001'), 'sotuv', SOTUV);
    for (const [id, q] of [['signal:zaxira:100:p1', 'yoq'], ['signal:narx:100:2026-09-30:95000', 'tegmaymiz'], ['signal:sharh:100:7', 'keyin']] as const) h = javob(h, id, q);
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.id).toBe('sotuv_holat');
    expect(k.savol.variantlar.find((v) => v.qiymat === 'yana')?.nom).toBe('Yana buyurtma');
    h = javob(h, 'sotuv_holat', 'yana');
    expect(h.natijalar.partiya).toBe(2);
    expect(h.natijalar.sotuv).toBeUndefined();
    expect(savolId(h)).toBe('partiya_miqdor:100');
  });

  it('F5: «Oy hisoboti» bosilganda sotuv qayta oʻlchanadi — oy eski (oʻtgan oydagi) natijadan olinmaydi', () => {
    const eski = natijaniYoz(javob(sotuvBoshi(), 'uzum_havola:100', '5001'), 'sotuv', { ...SOTUV_JIM, sana: '2026-08-31', oy: '2026-08' });
    const h = javob(eski, 'sotuv_holat', 'hisobot');
    expect(h.natijalar.sotuv).toBeUndefined();
    expect(h.javoblar['sotuv_holat']).toBe('hisobot');
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'sotuv', qadam: 11 });
    const k = keyingi(natijaniYoz(h, 'sotuv', { ...SOTUV_JIM, sana: '2026-10-02', oy: '2026-10' }));
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.variantlar.map((v) => v.qiymat)).toEqual(['2026-09', '2026-10']);
  });

  it('F6: marja 100 % va undan katta — rad (sabab bilan); «Marjani oʻzgartiraman» marjani qayta soʻraydi', () => {
    const h0 = tovarlarTanlandi();
    expect(javobniQabulQil(h0, 'marja', 150).xato).toBe('Marja 0 dan 99 % gacha boʻlsin — masalan: 30.');
    expect(javobniQabulQil(h0, 'marja', '100%').xato).toMatch(/0 dan 99 %/);
    let h = natijaniYoz(javob(h0, 'marja', 30), 'tannarx', { qatorlar: [{ chegaraSom: 50_000, yetishmaydi: ['kargo'] }] });
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.variantlar.map((v) => v.qiymat)).toEqual(['ha', 'miqdor', 'marja']);
    h = javob(h, 'xitoy_tasdiq', 'marja');
    expect(savolId(h)).toBe('marja');
    expect(h.natijalar.tannarx).toBeUndefined();
    expect(h.javoblar['miqdor:100']).toBe(30);
  });

  it('F7: chegara hisoblanmagan boʻlsa "Chegara narxlar tayyor" DEMAYDI; qisman — nechtasi aytiladi', () => {
    const asos = javob(tovarlarTanlandi(), 'marja', 30);
    const matn = (tannarx: unknown) => {
      const k = keyingi(natijaniYoz(asos, 'tannarx', tannarx));
      if (k.tur !== 'savol') throw new Error(k.tur);
      return k.savol.matn;
    };
    const hech = matn({ olchov_yoq: true, qatorlar: [{ chegaraSom: null, yetishmaydi: ['komissiya'] }] });
    expect(hech).not.toMatch(/Chegara narxlar tayyor/);
    expect(hech).toMatch(/^Chegara narxni hisoblab boʻlmadi/);
    expect(matn({ qatorlar: [{ chegaraSom: 50_000, yetishmaydi: [] }, { chegaraSom: null, yetishmaydi: ['komissiya'] }] }))
      .toMatch(/^Chegara narx 1 ta tovarda tayyor, 1 tasida hisoblanmadi\./);
    expect(matn({ qatorlar: [{ chegaraSom: 50_000, yetishmaydi: [] }] })).toMatch(/^Chegara narxlar tayyor\./);
    // Toʻliq hisoblangan, hech narsa yetishmaydi — "haqiqiy chegara pastroq" deyilmaydi.
    expect(tushuntir('tannarx', { qatorlar: [{ chegaraSom: 50_000, yetishmaydi: [] }] })).not.toMatch(/pastroq/);
  });

  it('F8: son xatosida misol savolga mos; valyuta — "soʻmda yozing"; "yarim" — taxmin qilinmaydi', () => {
    expect(javobniQabulQil(boshlangichHolat(), 'byudjet', '5000$').xato).toBe('Summani soʻmda yozing — masalan: 10 000 000 yoki 10 mln.');
    expect(javobniQabulQil(boshlangichHolat(), 'byudjet', 'yarim million').xato).toBe('Bitta son yozing — masalan: 10 000 000 yoki 10 mln.');
    expect(javobniQabulQil(tovarlarTanlandi(), 'marja', 'koʻp').xato).toBe('Bitta son yozing — masalan: 30.');
    const h = javob(natijaniYoz(yonalishTanlandi(), 'tovarlar', TOVARLAR), 'tovarlar', [100]);
    expect(javobniQabulQil(h, 'miqdor:100', 'bilmadim').xato).toBe('Bitta son yozing — masalan: 50.');
  });

  it('F9: yoʻnalish roʻyxati boʻsh — «Qayta urinish» kodni qayta chaqiradi ("keyinroq urinamiz" vaʼdasi yoʻq)', () => {
    const h = natijaniYoz(tanishuvTugadi(), 'yonalishlar', { olchov_yoq: true, sabab: 'baza javob bermadi' });
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.variantlar.map((v) => v.qiymat)).toEqual(['qayta']);
    expect(k.savol.matn).not.toMatch(/Keyinroq qayta urinib koʻramiz/);
    const q = javob(h, 'yonalish', 'qayta');
    expect(q.natijalar.yonalishlar).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(q.javoblar, 'yonalish')).toBe(false);
    expect(keyingi(q)).toEqual({ tur: 'kod', harakat: 'yonalishlar', qadam: 2 });
  });

  it('F9: tovar roʻyxati boʻsh — «Qayta urinish» / «Boshqa yoʻnalish»; oʻtkazilsa — "Roʻyxat tayyor" demaydi', () => {
    const h = natijaniYoz(yonalishTanlandi(), 'tovarlar', { olchov_yoq: true, sabab: 'turkumda oʻlchangan tovar yoʻq' });
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.id).toBe('tovarlar');
    expect(k.savol.turi).toBe('tanlov');
    expect(k.savol.variantlar.map((v) => v.qiymat)).toEqual(['qayta', 'boshqa']);
    const boshqa = javob(h, 'tovarlar', 'boshqa');
    expect(boshqa.natijalar.tovarlar).toBeUndefined();
    expect(savolId(boshqa)).toBe('yonalish');
    expect(keyingi(javob(h, 'tovarlar', 'qayta'))).toEqual({ tur: 'kod', harakat: 'tovarlar', qadam: 3 });
    const km = keyingi(javob(h, 'tovarlar', null));
    if (km.tur !== 'savol') throw new Error(km.tur);
    expect(km.savol.id).toBe('marja');
    expect(km.savol.matn).not.toMatch(/Roʻyxat tayyor/);
  });

  it('F9: varaqa boʻsh — "varaqa tayyor: 0 ta tovar" va "Varaqada N dona" DEMAYDI', () => {
    const bosh = { ...BUYURTMA, olchov_yoq: true, sabab: '1688 taklifi tanlanmagan',
      qatorlar: [{ ...BUYURTMA.qatorlar[0]!, holat: 'tanlanmagan' as const }],
      jami: { ...BUYURTMA.jami, yuan: null, som: null, dona: null, tayyor: 0, tanlanmagan: 1 } };
    expect(tushuntir('buyurtma', bosh)).toBe('Buyurtma varaqasini yasay olmadim: 1688 taklifi tanlanmagan.');
    let h = natijaniYoz(qabulBoshi(), 'qabul', { ...QABUL, varaqadan: false });
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).toBe('Yuk keldimi? Buyurtma varaqasi boʻsh — tanlangan tovarlar boʻyicha 30 dona (1 tovar).');
    h = javob(h, 'yuk_keldi', 'keldi');
    const km = keyingi(h);
    if (km.tur !== 'savol') throw new Error(km.tur);
    expect(km.savol.matn).toMatch(/^Sanang va koʻzdan kechiring: tanlangan tovarlar boʻyicha 30 dona\./);
  });

  it('F10: zaxira 0 — "tugadi"; "0 kunga yetadi" va "0 % ga tushdi" yozilmaydi', () => {
    const sg0 = { ...SOTUV.signallar[0]!, zaxira: 0, ulush: 0, kun: 0 };
    const k = keyingi(natijaniYoz(javob(sotuvBoshi(), 'uzum_havola:100', '5001'), 'sotuv', { ...SOTUV, signallar: [sg0] }));
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).toMatch(/^«Quloqchin A» zaxirasi tugadi \(0 dona\)\. Yangi partiya buyurtma qilamizmi\?/);
    expect(k.savol.matn).not.toMatch(/0 kunga|% ga tushdi/);
    const k2 = keyingi(natijaniYoz(javob(sotuvBoshi(), 'uzum_havola:100', '5001'), 'sotuv',
      { ...SOTUV_JIM, qatorlar: [{ ...SOTUV.qatorlar[0]!, oz: { ...OZ, zaxira: 2, zaxiraKun: 0 } }] }));
    if (k2.tur !== 'savol') throw new Error(k2.tur);
    expect(k2.savol.matn).toMatch(/Shu tezlikda bir kunga ham yetmaydi\./);
  });

  it('F11: 1688 sotuvchisi nomaʼlum tovarning zaxira signali — «Ha, yana buyurtma» (boshqa tovarga burilib ketadigan) taklif qilinmaydi', () => {
    const h0 = javob(sotuvBoshi(), 'uzum_havola:100', '5001');
    const k = keyingi(natijaniYoz({ ...h0, javoblar: { ...h0.javoblar, 'xitoy_tanlov:100': null } }, 'sotuv', SOTUV));
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.id).toBe('signal:zaxira:100:p1');
    expect(k.savol.variantlar.map((v) => v.qiymat)).toEqual(['ozim']);
    expect(k.savol.matn).toMatch(/1688 sotuvchisi maʼlum emas/);
    expect(k.savol.matn).not.toMatch(/buyurtma qilamizmi/);
  });

  it('F12: kuzatuvga qoʻshilmagan yoki oʻlchov oʻqilmagan — "qoʻshildi" / "birinchi oʻlchov" DEMAYDI', () => {
    const asos = javob(sotuvBoshi(), 'uzum_havola:100', '5001');
    const kutilmoqda = [{ ...SOTUV.qatorlar[0]!, oz: { ...OZ, holat: 'kutilmoqda' as const } }];
    const xato = keyingi(natijaniYoz(asos, 'sotuv', { ...SOTUV_JIM, kuzatuv: null, kuzatuvXato: 'baza javob bermadi', qatorlar: kutilmoqda }));
    if (xato.tur !== 'savol') throw new Error(xato.tur);
    expect(xato.savol.matn).toMatch(/^Kartochkani kuzatuvga qoʻsha olmadim \(baza javob bermadi\)\./);
    const oqilmadi = keyingi(natijaniYoz(asos, 'sotuv', { ...SOTUV_JIM, olchov_yoq: true, sabab: 'oʻlchov oʻqilmadi (baza javob bermadi)', qatorlar: kutilmoqda }));
    if (oqilmadi.tur !== 'savol') throw new Error(oqilmadi.tur);
    expect(oqilmadi.savol.matn).toMatch(/^Sotuv oʻlchovini oʻqiy olmadim/);
    expect(oqilmadi.savol.matn).not.toMatch(/qoʻshildi|Birinchi oʻlchov/);
  });

  it('F13: «Qayta qidirish» tanlangan taklifni oʻchirmaydi; doimiy sabab (kalit yoʻq) — faqat «Shusiz davom»', () => {
    const n = { ...XITOY, qatorlar: [XITOY.qatorlar[0]!, { ...XITOY.qatorlar[0]!, productId: 200, title: 'Quloqchin B', holat: 'qidirilmadi' as const, sabab: 'provayder: balans', takliflar: [] }] };
    let h = javob(natijaniYoz(tasdiqlandi(), 'xitoy', n), 'xitoy_tanlov:100', '983093623752');
    expect(savolId(h)).toBe('xitoy_qayta');
    h = javob(h, 'xitoy_qayta', 'qayta');
    expect(h.javoblar['xitoy_tanlov:100']).toBe('983093623752');
    expect(h.natijalar.xitoy).toBeUndefined();
    const doimiy = { ...XITOY, qatorlar: [{ ...XITOY.qatorlar[0]!, holat: 'qidirilmadi' as const, sabab: 'provayder kaliti yoʻq', takliflar: [] }] };
    const kd = keyingi(natijaniYoz(tasdiqlandi(), 'xitoy', doimiy));
    if (kd.tur !== 'savol') throw new Error(kd.tur);
    expect(kd.savol.variantlar.map((v) => v.qiymat)).toEqual(['davom']);
    expect(kd.savol.matn).toMatch(/qayta urinish natija bermaydi/);
  });

  it('F14: tovarlar xulosasi — "8 ta tuzoq-filtrdan oʻtdi" emas; oʻlchanmagan va baholanmagan sanaladi', () => {
    const m = tushuntir('tovarlar', { ...TOVARLAR, royxat: [...TOVARLAR.royxat,
      { nomzod: { productId: 300, title: 'C' }, miqdor: null, miqdorSababi: 'Sotuv hali oʻlchanmagan.', baholanmadi: [{ filtr: 'nakrutka', missing: ['sharhSoni'] }], bayroqlar: [] }] });
    expect(m).toMatch(/^3 ta tovar roʻyxatga chiqdi/);
    expect(m).not.toMatch(/tuzoq-filtrdan oʻtdi/);
    expect(m).toMatch(/1 tasida ayrim filtrlar maʼlumot yetmagani uchun baholanmadi/);
    expect(m).toMatch(/2 tasida sotuv hali oʻlchanmagan/);
    expect(m).toMatch(/1 tasi tuzoq sababli/);
  });

  it('F15: komissiya sotuvdan katta — sof manfiy (zarar) koʻrsatiladi, 0 emas', () => {
    const hisob = oyHisobi({ oy: '2026-09', kabinetSotuv: 100_000, olchovSotuv: null, komissiya: 150_000, f: HISOBOT_F });
    let h = natijaniYoz(hisobotBoshi(), 'hisobot', HISOBOT);
    h = javob(javob(h, 'oy_sotuv', 100_000), 'oy_komissiya', 150_000);
    const k = keyingi(natijaniYoz(h, 'hisobot_hisob', { ...hisob, tugagan: true, qamrov: null, faktlar: HISOBOT_F, qadamlar: [], izoh: 'hisob' }));
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).toMatch(/sof −50 000 soʻm \(zarar\)/);
  });

  it('F16: soliq matni huquqiy shaklni hisobga oladi — MChJ ga YATT soligʻi indamay yuklanmaydi', () => {
    const asos = hisobotBoshi();
    let h = natijaniYoz({ ...asos, javoblar: { ...asos.javoblar, huquqiy_shakl: 'mchj' } }, 'hisobot', HISOBOT);
    h = javob(javob(h, 'oy_sotuv', 2_600_000), 'oy_komissiya', 400_000);
    const k = keyingi(natijaniYoz(h, 'hisobot_hisob', HISOBOT_HISOB));
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).toMatch(/Bu hisob YATT uchun — siz «MChJ» dedingiz/);
    expect(tushuntir('hisobot_hisob', { ...HISOBOT_HISOB, shakl: 'mchj' })).toMatch(/siz «MChJ» dedingiz/);
    expect(tushuntir('rasmiy', RASMIY)).toMatch(/YATT uchun majburiy soliq: ijtimoiy 440 000 soʻm/);
    expect(tushuntir('rasmiy', RASMIY)).not.toMatch(/\(2026\)/);
  });

  it('F19: fakt yoʻq — gap buzilmaydi ("faktda yoʻq gacha", "faktda yoʻq chop eting", "… toʻlsin", "Soliq portali ga")', () => {
    let h = natijaniYoz(yuklashBoshi(), 'yuklash', { ...YUKLASH, faktlar: qabulFaktlari({}), talablar: suratTalablari({}) });
    const matnlar: string[] = [];
    for (const [id, q] of [['kartochka_yaratildi', 'yaratdim'], ['qadoq_tayyor', 'tayyor'], ['yetkazish', 'ozim'], ['taymslot', 'oldim'], ['topshirildi', 'topshirdim']] as const) {
      const k = keyingi(h);
      if (k.tur !== 'savol') throw new Error(k.tur);
      matnlar.push(k.savol.matn);
      h = javob(h, id, q);
    }
    const hammasi = matnlar.join(' ');
    expect(hammasi).not.toMatch(/faktda yoʻq (gacha|oldin|chop|har birlik|toʻlsin)/);
    expect(hammasi).toMatch(/Qabul muddati faktda yoʻq/);
    expect(hammasi).toMatch(/quti ogʻirligi faktda yoʻq/);
    const hisob = oyHisobi({ oy: '2026-09', kabinetSotuv: 2_600_000, olchovSotuv: null, komissiya: 400_000, f: hisobotFaktlari({}) });
    let d = natijaniYoz(hisobotBoshi(), 'hisobot', HISOBOT);
    d = natijaniYoz(javob(javob(d, 'oy_sotuv', 2_600_000), 'oy_komissiya', 400_000), 'hisobot_hisob',
      { ...hisob, tugagan: true, qamrov: null, faktlar: hisobotFaktlari({}), qadamlar: [], izoh: 'hisob' });
    const kd = keyingi(d);
    if (kd.tur !== 'savol') throw new Error(kd.tur);
    expect(kd.savol.matn).toMatch(/Soliq: YATT uchun aylanma soligʻi foizi faktda yoʻq; ijtimoiy soliq miqdori faktda yoʻq\. Ijtimoiy soliq muddati faktda yoʻq\./);
    const kq = keyingi(javob(d, 'deklaratsiya', 'tayyorlaymiz'));
    if (kq.tur !== 'savol') throw new Error(kq.tur);
    expect(kq.savol.matn).toMatch(/^Soliq portaliga E-imzo bilan kiring\./);
  });

  it('F20: sonlar guruhlanadi (¥ ham), sanalar bitta koʻrinishda (KK.OO.YYYY)', () => {
    expect(tushuntir('buyurtma', { ...BUYURTMA, jami: { ...BUYURTMA.jami, yuan: 22_500 } })).toMatch(/jami ¥22 500 /);
    const n = { ...XITOY, qatorlar: [{ ...XITOY.qatorlar[0]!, jami: 4000, takliflar: [{ ...XITOY.qatorlar[0]!.takliflar[0]!, narxYuan: 1250, moq: 1000 }] }] };
    const k = keyingi(natijaniYoz(tasdiqlandi(), 'xitoy', n));
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).toMatch(/1688 dan 4 000 ta topildi/);
    expect(k.savol.variantlar[0]!.nom).toMatch(/^¥1 250 ≈ .* · MOQ 1 000 · /);
  });

  it('F21: chegara izohi — "…siz" qoʻshimchasi roʻyxatga yopishmaydi; kursiz — "eng oʻxshash" tartib', () => {
    const n = { ...XITOY, qatorlar: [{ ...XITOY.qatorlar[0]!, yetishmaydi: ['Uzum logistikasi', 'kargo'] }] };
    const k = keyingi(natijaniYoz(tasdiqlandi(), 'xitoy', n));
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).toMatch(/\(chegaraga kirmagan: Uzum logistikasi, kargo — haqiqiysi pastroq\)/);
    expect(k.savol.matn).not.toMatch(/eng oʻxshash/);
    const kursiz = keyingi(natijaniYoz(tasdiqlandi(), 'xitoy', { ...XITOY, kurs: null }));
    if (kursiz.tur !== 'savol') throw new Error(kursiz.tur);
    expect(kursiz.savol.matn).toMatch(/1688 dan 680 ta topildi, eng oʻxshash 2 tasi koʻrsatildi\./);
  });

  it('F22: miqdor savolida sabab alohida gap; tushum nomaʼlum — "taxminan oʻlchanmagan" yozilmaydi', () => {
    const h = javob(natijaniYoz(yonalishTanlandi(), 'tovarlar', TOVARLAR), 'tovarlar', [200]);
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.matn).toBe('«Quloqchin B»: miqdorni hisoblab bera olmadim. Sotuv hali oʻlchanmagan. Oʻzingiz nechta olmoqchisiz?');
    const m = tushuntir('sotuv', { ...SOTUV, jami: { ...SOTUV.jami, oySom: null } });
    expect(m).not.toMatch(/taxminan oʻlchanmagan/);
    expect(m).toMatch(/shu oy 26 dona \(tushum hisoblanmadi — ayrim kunlarda narx oʻlchanmagan\)/);
  });

  it('F23: kod harakati yiqilsa — matn quruvchilar yiqilmaydi, «Qayta urinish» soʻraladi (yoʻl berk qolmaydi)', () => {
    const harakatlar: KodHarakati[] = ['yonalishlar', 'tovarlar', 'tannarx', 'xitoy', 'buyurtma', 'ochiq_ish', 'rasmiy', 'rasmiy_yakun',
      'qabul', 'qabul_yakun', 'studiya', 'studiya_yakun', 'yuklash', 'yuklash_yakun', 'sotuv', 'hisobot', 'hisobot_hisob', 'hisobot_yakun'];
    for (const harakat of harakatlar) expect(tushuntir(harakat, yiqilganNatija()), harakat).toMatch(/kutilmagan xato/);
    let h = natijaniYoz(xitoyTanlandi(), 'buyurtma', yiqilganNatija());
    const k = keyingi(h);
    if (k.tur !== 'savol') throw new Error(k.tur);
    expect(k.savol.id).toBe('xato_qayta:buyurtma');
    expect(k.savol.qadam).toBe(6);
    expect(k.savol.variantlar.map((v) => v.qiymat)).toEqual(['qayta']);
    h = javob(h, 'xato_qayta:buyurtma', 'qayta');
    expect(h.natijalar.buyurtma).toBeUndefined();
    expect(keyingi(h)).toEqual({ tur: 'kod', harakat: 'buyurtma', qadam: 6 });
    // Oldingi versiya yozgan "hisob yiqildi: …" natijasi ham ushlanadi (shahar savolidan keyin yiqilmaydi).
    const eski = natijaniYoz(rasmiyBoshi(), 'rasmiy', { olchov_yoq: true, sabab: 'hisob yiqildi: x is undefined' });
    const ke = keyingi(eski);
    if (ke.tur !== 'savol') throw new Error(ke.tur);
    expect(ke.savol.id).toBe('xato_qayta:rasmiy');
    expect(ke.savol.matn).not.toMatch(/x is undefined/);
    // "skreyper" — ichki soʻz, obunachiga chiqmaydi.
    expect(tushuntir('sotuv', { ...SOTUV_JIM, qatorlar: [{ ...SOTUV.qatorlar[0]!, oz: { ...OZ, holat: 'kutilmoqda' as const } }] })).not.toMatch(/skreyper/);
  });
});
