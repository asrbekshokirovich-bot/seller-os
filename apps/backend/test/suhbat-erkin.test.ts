/**
 * Erkin xabar — obunachi savolga JAVOB EMAS, boshqa narsa yozdi.
 *
 * NEGA BU TESTLAR BOR. Nazoratchi (2026-10-05): "kirgan mijoz boshqa
 * narsa ham yozishi mumkin". Ilgari yozilgan matn faqat kutilayotgan
 * savolga javob sifatida olinardi: "salom" yoki "bu nima?" yozilsa —
 * quruq xato ("son kutilgan edi"), matn chatda ham qolmasdi.
 *
 * Endi: yozilgan matn javob sifatida oʻtsa — qabul; savol boʻlsa yoki
 * oʻtmasa — ERKIN XABAR: obunachi matni va menejer javobi chatga
 * yoziladi, yoʻl holati OʻZGARMAYDI, joriy savol eslatiladi. Javobni LLM
 * yozadi, lekin tekshiruvdan oʻtmasa (raqam qoʻshsa, kafolat yozsa) yoki
 * LLM boʻlmasa — kod shabloni ketadi. Tugma (savolId + javob) va
 * eskirgan savol avvalgidek xato beradi.
 */

import { describe, expect, it } from 'vitest';
import {
  boshlangichHolat, keyingi, suhbatTurn,
  type SuhbatBogliqliklari, type YolHolati,
} from '@selleros/shared';

function soxtaBaza(boshlangich: YolHolati | null = null, { savolYozilgan = true } = {}) {
  // Joriy savol jurnalda bor — hayotda u oldingi turnda yozilgan. Birinchi tashrifda
  // (`savolYozilgan: false`) yoʻq: erkin javob oldidan savolning oʻzi yoziladi.
  const k = keyingi(boshlangich ?? boshlangichHolat());
  const jurnal: Array<{ rol: string; matn: string; savolId?: string }> =
    savolYozilgan && k.tur === 'savol' ? [{ rol: 'menejer', matn: k.savol.matn, savolId: k.savol.id }] : [];
  let holat: YolHolati | null = boshlangich;
  let yozuvlar = 0;
  const rpc = async <T>(nom: string, arg: unknown): Promise<T | null> => {
    const a = arg as Record<string, unknown>;
    if (a.p_token !== 'tok') return { xato: 'sessiya topilmadi' } as T;
    if (nom === 'so_suhbat_oqi') return { holat, qadam: null, xabarlar: jurnal } as T;
    if (nom === 'so_suhbat_yoz') {
      yozuvlar++;
      jurnal.push(...(a.p_xabarlar as Array<{ rol: string; matn: string }>));
      holat = a.p_holat as YolHolati;
      return { yozildi: (a.p_xabarlar as unknown[]).length } as T;
    }
    return null;
  };
  return { rpc, jurnal, holat: () => holat, yozuvlar: () => yozuvlar };
}

const KURS = { olchov_yoq: false, usd: { somPerYuan: 12_650, valyuta: 'USD', sana: '12.10.2026', manba: 'CBU' } };

/** Kod: dollar kursi va yoʻnalishlar — soxta (byudjet qabul qilingach chaqiriladi); qolgani chaqirilmasligi kerak. */
const KOD_YOQ = new Proxy({}, {
  get: (_, nom) => (nom === 'kurs' ? async () => KURS
    : nom === 'yonalishlar' ? async () => ({ olchov_yoq: false, royxat: [{ categoryId: 11, name: 'Quloqchinlar' }] })
      : async () => { throw new Error('bu testda kod chaqirilmasligi kerak'); }),
});

function bogliq(b: ReturnType<typeof soxtaBaza>): SuhbatBogliqliklari {
  return { rpc: b.rpc, kod: KOD_YOQ as SuhbatBogliqliklari['kod'] };
}

/** Byudjet savoli turgan holat (2026-10-26: qiziqishdan keyin; dollar kursi olingan). */
const BYUDJET_HOLATI: YolHolati = { javoblar: { ism: 'Aziz Karimov', telefon: '+998901234567', qiziqish: ['bilmayman'] }, natijalar: { kurs: KURS } };
const YONALISHLAR_N = { olchov_yoq: false, royxat: [{ categoryId: 11, name: 'Quloqchinlar' }] };
/** Ism savoli — yoʻnalish tanlangach (2026-10-26). */
const ISM_HOLATI: YolHolati = { javoblar: { qiziqish: ['bilmayman'], byudjet: 10_000_000, yonalish: 11 }, natijalar: { kurs: KURS, yonalishlar: YONALISHLAR_N } };
/** Tajriba savoli (`uzum_dokoni`) — tovar va miqdordan keyin, tannarxdan oldin (2026-10-26). */
const TAJRIBA_HOLATI: YolHolati = {
  javoblar: { ...ISM_HOLATI.javoblar, ism: 'Aziz Karimov', telefon: '+998901234567', tovarlar: [100], 'miqdor:100': 30 },
  natijalar: {
    ...ISM_HOLATI.natijalar,
    tovarlar: { olchov_yoq: false, royxat: [{ nomzod: { productId: 100, title: 'Quloqchin A' }, miqdor: { dona: 30, hisob: 'oyiga ~600 dona sotiladi' } }] },
  },
};

describe('erkin xabar', () => {
  it('son savoliga "10 mln" — JAVOB sifatida qabul qilinadi', async () => {
    const b = soxtaBaza(BYUDJET_HOLATI);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', matn: '10 mln' });
    expect(r.xato).toBeUndefined();
    expect(b.holat()!.javoblar['byudjet']).toBe(10_000_000);
    expect(r.xabarlar[0]!.matn).toBe('10 mln soʻm');
    if (r.keyingi.tur !== 'savol') throw new Error();
    expect(r.keyingi.savol.id).toBe('yonalish');
  });

  it('son savoliga "salom" — erkin xabar: xato emas, holat oʻzgarmaydi, savol eslatiladi', async () => {
    const b = soxtaBaza(BYUDJET_HOLATI);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', matn: 'salom' });
    expect(r.xato).toBeUndefined();
    expect(r.xabarlar.map((x) => x.rol)).toEqual(['obunachi', 'menejer']);
    expect(r.xabarlar[0]!.matn).toBe('salom');
    expect(r.xabarlar[1]!.matn).toMatch(/alaykum/i);
    expect(r.xabarlar[1]!.matn).toMatch(/qancha/i);
    if (r.keyingi.tur !== 'savol') throw new Error();
    expect(r.keyingi.savol.id).toBe('byudjet');
    expect(b.holat()?.javoblar['byudjet']).toBeUndefined();
    // Jurnal: (avval yozilgan savol) + obunachi matni + menejer javobi.
    expect(b.jurnal.map((x) => x.rol)).toEqual(['menejer', 'obunachi', 'menejer']);
  });

  it('savol ("bu nima?") — javob sifatida OLINMAYDI, menejer javob beradi', async () => {
    const b = soxtaBaza(TAJRIBA_HOLATI);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', matn: 'bu nima?' });
    expect(r.xato).toBeUndefined();
    expect(r.xabarlar[0]!.matn).toBe('bu nima?');
    expect(b.holat()!.javoblar['uzum_dokoni']).toBeUndefined();
    if (r.keyingi.tur !== 'savol') throw new Error();
    expect(r.keyingi.savol.id).toBe('uzum_dokoni');
  });

  it('variantli savolga notoʻgʻri matn — sababi bilan javob (shablon)', async () => {
    const b = soxtaBaza(TAJRIBA_HOLATI);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', matn: 'xxx' });
    expect(r.xato).toBeUndefined();
    expect(r.xabarlar[1]!.matn).toMatch(/variant/i);
  });

  it('variant nomini yozsa ("ha", "yoʻq") — oʻsha variant tanlanadi', async () => {
    const b = soxtaBaza(TAJRIBA_HOLATI);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', matn: 'ha' });
    expect(r.xato).toBeUndefined();
    expect(b.holat()!.javoblar['uzum_dokoni']).toBe('sotyapman');
    const b2 = soxtaBaza(TAJRIBA_HOLATI);
    await suhbatTurn(bogliq(b2), 'tok', { savolId: 'uzum_dokoni', matn: "Yo'q" });
    expect(b2.holat()!.javoblar['uzum_dokoni']).toBe('yoq');
  });

  it('shablon sababi bosh harf va nuqta bilan ("Variantlardan birini tanlang.")', async () => {
    const b = soxtaBaza(TAJRIBA_HOLATI);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', matn: 'xxx' });
    expect(r.xabarlar[1]!.matn).toMatch(/^Variantlardan birini tanlang yoki nima sotganingizni bir-ikki soʻz bilan yozing\. Hozirgi savol/);
  });

  it('koʻp soʻraladigan savol ("obuna qancha turadi") — koddagi tayyor javob + joriy savol', async () => {
    const b = soxtaBaza(BYUDJET_HOLATI);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', matn: 'obuna qancha turadi' });
    expect(r.xato).toBeUndefined();
    expect(r.xabarlar[1]!.matn).toMatch(/149 000/);
    expect(r.xabarlar[1]!.matn).toMatch(/Hozirgi savol/);
    expect(b.holat()?.javoblar['byudjet']).toBeUndefined();
  });

  it('ruscha yozsa — ruscha shablon', async () => {
    const b = soxtaBaza(BYUDJET_HOLATI);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', matn: 'что это?' });
    expect(r.xato).toBeUndefined();
    expect(r.xabarlar[1]!.matn).toMatch(/[А-Яа-я]/);
  });

  it('TUGMA (savolId + javob) notoʻgʻri boʻlsa — avvalgidek xato, hech narsa yozilmaydi', async () => {
    const b = soxtaBaza(BYUDJET_HOLATI);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', javob: 'salom' });
    expect(r.xato).toBeTruthy();
    expect(b.yozuvlar()).toBe(0);
  });

  it('eskirgan savolId bilan matn — navbat xatosi, erkin xabar emas', async () => {
    const b = soxtaBaza();
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', matn: 'salom' });
    expect(r.xato).toMatch(/navbat/);
    expect(b.yozuvlar()).toBe(0);
  });

  it('juda uzun matn qisqartiriladi (500 belgi)', async () => {
    const b = soxtaBaza(BYUDJET_HOLATI);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', matn: 'a'.repeat(2000) });
    expect(r.xabarlar[0]!.matn.length).toBeLessThanOrEqual(501);
  });
});

/** 3-qadam miqdor savoli turgan holat: tugmalar «30 kunlik zaxira — 45 dona», «60 kunlik — 90 dona». */
const MIQDOR_HOLATI: YolHolati = {
  javoblar: { ism: 'Aziz Karimov', telefon: '+998901234567', byudjet: 10_000_000, uzum_dokoni: 'yoq', yonalish: 11, tovarlar: [100] },
  natijalar: {
    yonalishlar: { olchov_yoq: false, royxat: [{ categoryId: 11, name: 'Quloqchinlar' }] },
    tovarlar: { olchov_yoq: false, royxat: [{ nomzod: { productId: 100, title: 'Quloqchin A' }, miqdor: { dona: 45, hisob: 'oyiga ~900 dona sotiladi' } }] },
  },
};

describe('erkin xabar — tekshiruv tuzatishlari (2026-10-05)', () => {
  it('F8: son savolida tugma matnini yozsa ("60 kunlik") — oʻsha tugma (90 dona), 60 EMAS; faqat raqam — oʻsha son', async () => {
    const b = soxtaBaza(MIQDOR_HOLATI);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'miqdor:100', matn: '60 kunlik' });
    expect(r.xato).toBeUndefined();
    expect(b.holat()!.javoblar['miqdor:100']).toBe(90);
    const b2 = soxtaBaza(MIQDOR_HOLATI);
    await suhbatTurn(bogliq(b2), 'tok', { savolId: 'miqdor:100', matn: '30' });
    expect(b2.holat()!.javoblar['miqdor:100']).toBe(30);
    const b3 = soxtaBaza(BYUDJET_HOLATI);
    await suhbatTurn(bogliq(b3), 'tok', { savolId: 'byudjet', matn: '10 mln' });
    expect(b3.holat()!.javoblar['byudjet']).toBe(10_000_000);
  });

  it('F24: eslatmada tovar nomi qoladi (uzun savoldan faqat soʻroq jumla olinsa ham)', async () => {
    const r = await suhbatTurn(bogliq(soxtaBaza(MIQDOR_HOLATI)), 'tok', { savolId: 'miqdor:100', matn: 'nima qilay?' });
    expect(r.xabarlar[1]!.matn).toMatch(/Hozirgi savol: ««Quloqchin A» — Birinchi partiya uchun nechta olasiz\?»/);
  });

  it('F24: "hisob…" salomlashish emas — "Vaalaykum assalom" deyilmaydi', async () => {
    const h = TAJRIBA_HOLATI;
    const r = await suhbatTurn(bogliq(soxtaBaza(h)), 'tok', { savolId: 'uzum_dokoni', matn: 'hisob raqamim bor' });
    expect(r.xabarlar[1]!.matn).not.toMatch(/alaykum/i);
    const s = await suhbatTurn(bogliq(soxtaBaza(h)), 'tok', { savolId: 'uzum_dokoni', matn: 'hi!' });
    expect(s.xabarlar[1]!.matn).toMatch(/^Vaalaykum assalom!/);
  });

  it('F24: ruscha shablonda sabab ham ruscha — oʻzbekcha gap aralashmaydi', async () => {
    const r = await suhbatTurn(bogliq(soxtaBaza(TAJRIBA_HOLATI)), 'tok', { savolId: 'uzum_dokoni', matn: 'ааа' });
    expect(r.xabarlar[1]!.matn).toMatch(/^Не получилось принять ответ: Выберите вариант или коротко напишите, что продавали\./);
    expect(r.xabarlar[1]!.matn).not.toMatch(/Variantlardan/);
  });

  it('F25: javob oʻtmasa VA tayyor javob bor — avval sabab, keyin tayyor javob; boshqa mavzu tarifga burilmaydi', async () => {
    const r = await suhbatTurn(bogliq(soxtaBaza(BYUDJET_HOLATI)), 'tok', { savolId: 'byudjet', matn: 'obuna narxi' });
    const m = r.xabarlar[1]!.matn;
    expect(m).toMatch(/^Summani yozing — masalan: 30 mln yoki 3000 \$\. 1–5-qadamlar/);
    // 2026-10-19: «obuna qancha turadi» — «?» siz ham SAVOL (soʻroq soʻzi gap ichida): sababsiz, darrov tayyor javob.
    const q = await suhbatTurn(bogliq(soxtaBaza(BYUDJET_HOLATI)), 'tok', { savolId: 'byudjet', matn: 'obuna qancha turadi' });
    expect(q.xabarlar[1]!.matn).toMatch(/^1–5-qadamlar/);
    const s = await suhbatTurn(bogliq(soxtaBaza(BYUDJET_HOLATI)), 'tok', { savolId: 'byudjet', matn: 'soliq toʻlovi qachon?' });
    expect(s.xabarlar[1]!.matn).not.toMatch(/obuna: 149 000/);
  });
});

describe('yordamchi har savolga javob beradi (nazoratchi, 2026-10-13)', () => {
  /** Nazoratchi sinovidagi aynan gap — maslahat soʻrovi, javob emas. */
  const MASLAHAT = '100 mln pulim bor birinchi 80 mln bsohlasammikan yoki 100 mln bilan nima maslahat berasan';

  it('LLM boʻlmasa ham — maslahat shabloni (raqamsiz) va summalar tugmasi', async () => {
    const b = soxtaBaza(BYUDJET_HOLATI);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', matn: MASLAHAT });
    expect(r.xabarlar[1]!.matn).toMatch(/^Maslahatim: hamma pulni birinchi partiyaga tikmang/);
    expect(r.xabarlar[1]!.matn).toMatch(/Hozirgi savol: «/);
    if (r.keyingi.tur !== 'savol') throw new Error(r.keyingi.tur);
    expect(r.keyingi.savol.variantlar[0]).toEqual({ qiymat: 80_000_000, nom: '80 mln soʻm' });
  });

  it.each([
    '70 mln bilan boshlasammi', '50 mln yetadimi', 'qaysi biri yaxshi', 'tushunmadim', 'kafolat bormi',
    '100 mln mi', 'shu bilan boshlasam boʻladimi', 'что лучше выбрать',
  ])('savol deb taniladi: «%s»', async (matn) => {
    const b = soxtaBaza(BYUDJET_HOLATI);
    await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', matn });
    expect(b.holat()!.javoblar['byudjet']).toBeUndefined();
  });

  it.each([
    ['hozir 100 mln pulim bor lekin 70 mln bilan boshlamoqchiman', 70_000_000],
    ['70 mln', 70_000_000],
    ['5000 $ bilan boshlayman', 63_250_000],
  ])('javob deb olinadi: «%s»', async (matn, som) => {
    const b = soxtaBaza(BYUDJET_HOLATI);
    await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', matn });
    expect(b.holat()!.javoblar['byudjet']).toBe(som);
  });

  it('byudjet savolida pulga aloqasiz savol — pul maslahati emas (jonli sinov, 2026-10-13)', async () => {
    const b = soxtaBaza(BYUDJET_HOLATI);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', matn: 'kanstovar bilan kiyimdan qaysi biri osonroq?' });
    expect(r.xabarlar[1]!.matn).not.toMatch(/^Maslahatim: hamma pulni/);
    expect(r.xabarlar[1]!.matn).toMatch(/Yoʻnalish qadamida koʻrsataman/);
  });

  it('ism va telefon savolida "…mi" bilan tugagan ism savol hisoblanmaydi', async () => {
    const b = soxtaBaza(ISM_HOLATI);
    await suhbatTurn(bogliq(b), 'tok', { savolId: 'ism', matn: 'Ilhom Hakimi' });
    expect(b.holat()!.javoblar['ism']).toBe('Ilhom Hakimi');
  });
});

describe('yordamchi asosi (nazoratchi tanlovi, 2026-10-13 kechqurun)', () => {
  it('erkin javob belgilanadi: manba — baza / shablon (👍/👎 shu xabarlarga; «ai» — AI suhbatda)', async () => {
    const r = await suhbatTurn(bogliq(soxtaBaza(BYUDJET_HOLATI)), 'tok', { savolId: 'byudjet', matn: 'pul qachon tushadi?' });
    expect(r.xabarlar[1]!.javob).toEqual({ erkin: true, manba: 'baza' });
    const s = await suhbatTurn(bogliq(soxtaBaza(BYUDJET_HOLATI)), 'tok', { savolId: 'byudjet', matn: 'ertaga ob-havo qanday?' });
    expect(s.xabarlar[1]!.javob).toEqual({ erkin: true, manba: 'shablon' });
    // Obunachi xabari belgisiz qoladi.
    expect(s.xabarlar[0]!.javob).toBeUndefined();
  });

  it('oʻzbek kirillda savol — lotinda tushuniladi, javob oʻzbekcha (ruscha emas)', async () => {
    const r = await suhbatTurn(bogliq(soxtaBaza(BYUDJET_HOLATI)), 'tok', { savolId: 'byudjet', matn: 'Пул қачон тушади?' });
    expect(r.xabarlar[0]!.matn).toBe('Пул қачон тушади?');
    expect(r.xabarlar[1]!.matn).toMatch(/to‘lov jadvali/);
    expect(r.xabarlar[1]!.matn).not.toMatch(/Сейчас вопрос/);
  });

  it('oʻzbek kirillda tugma nomi («ҳа») — oʻsha variant tanlanadi', async () => {
    const b = soxtaBaza(TAJRIBA_HOLATI);
    await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', matn: 'ҳа' });
    expect(b.holat()!.javoblar['uzum_dokoni']).toBe('sotyapman');
  });
});

describe('birinchi tashrif — salomlashish yoʻqolmaydi (tayyor savollar sinovi, 2026-10-13)', () => {
  it('jurnalda joriy savol yoʻq boʻlsa — erkin javob oldidan savolning oʻzi yoziladi; keyingi safar qayta yozilmaydi', async () => {
    const b = soxtaBaza(null, { savolYozilgan: false });
    // Birinchi savol — qiziqish, salom bilan (2026-10-26).
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'qiziqish', matn: 'Bu bepulmi?' });
    expect(r.xabarlar.map((x) => x.rol)).toEqual(['menejer', 'obunachi', 'menejer']);
    expect(r.xabarlar[0]).toMatchObject({ savolId: 'qiziqish' });
    expect(r.xabarlar[0]!.matn).toMatch(/^Assalomu alaykum! Men ZumSavdo yordamchingizman/);
    expect(r.xabarlar[0]!.javob).toBeUndefined();
    // Qayta soʻraladigan savol — salomsiz (butun salom «Hozirgi savol: «…»» boʻlib qaytmaydi).
    expect(r.xabarlar[2]!.matn).not.toMatch(/Assalomu alaykum/);
    const r2 = await suhbatTurn(bogliq(b), 'tok', { savolId: 'qiziqish', matn: 'ZumSavdo nima qiladi?' });
    expect(r2.xabarlar.map((x) => x.rol)).toEqual(['obunachi', 'menejer']);
  });
});

describe('tarif cheklovi oʻchiq — «Bu bepulmi?» rost javob oladi (2026-10-13)', () => {
  it('cheklov oʻchiq: «hozir hamma qadamlar bepul»; yoqilgan: rejalar roʻyxati', async () => {
    const r = await suhbatTurn({ ...bogliq(soxtaBaza(BYUDJET_HOLATI)), tarifCheklovi: false }, 'tok', { savolId: 'byudjet', matn: 'Bu bepulmi?' });
    expect(r.xabarlar.at(-1)!.matn).toMatch(/Hozir hamma qadamlar bepul ochiq/);
    const y = await suhbatTurn({ ...bogliq(soxtaBaza(BYUDJET_HOLATI)), tarifCheklovi: true }, 'tok', { savolId: 'byudjet', matn: 'Bu bepulmi?' });
    expect(y.xabarlar.at(-1)!.matn).toMatch(/1–5-qadamlar \(yoʻnalish, tovar, tannarx, Xitoydan topish\) — bepul\. 6-qadamdan/);
  });
});

describe('bazadagi raqam bilan javob va ruscha savol (jonli oʻlchov, 2026-10-14)', () => {
  /** Kod: `erkinMalumot` — soxta; qolgani `KOD_YOQ` dagidek. */
  function kodMalumot(f: NonNullable<SuhbatBogliqliklari['kod']['erkinMalumot']>): SuhbatBogliqliklari['kod'] {
    return new Proxy({}, {
      get: (_, nom) => (nom === 'erkinMalumot' ? f : (KOD_YOQ as Record<string | symbol, unknown>)[nom]),
    }) as SuhbatBogliqliklari['kod'];
  }

  it('soliq savoli — kod bazadan javob beradi (manba: baza); kodga savol turi va holat boradi', async () => {
    const turlar: string[] = [];
    const r = await suhbatTurn({
      rpc: soxtaBaza(BYUDJET_HOLATI).rpc,
      kod: kodMalumot(async (n, h) => {
        turlar.push(n.tur);
        expect(h.javoblar['qiziqish']).toEqual(['bilmayman']);
        return 'YATT uchun aylanma soligʻi — 1 %.';
      }),
    }, 'tok', { savolId: 'byudjet', matn: 'Soliq qancha toʻlayman?' });
    expect(turlar).toEqual(['soliq']);
    expect(r.xabarlar[1]!.matn).toMatch(/^YATT uchun aylanma soligʻi — 1 %\. Hozirgi savol: «/);
    expect(r.xabarlar[1]!.javob).toEqual({ erkin: true, manba: 'baza' });
  });

  it('roʻyxatli (koʻp qatorli) javobdan keyin eslatma alohida xatboshida; ruscha izoh ham', async () => {
    const kod = kodMalumot(async () => 'Taqqoslangan banklar:\n• A: bepul\n• B: bepul');
    const r = await suhbatTurn({ rpc: soxtaBaza(BYUDJET_HOLATI).rpc, kod }, 'tok', { savolId: 'byudjet', matn: 'Bank hisob raqami kerakmi?' });
    expect(r.xabarlar[1]!.matn).toMatch(/^Taqqoslangan banklar:\n• A: bepul\n• B: bepul\n\nHozirgi savol: «/);
    const ru = await suhbatTurn({ rpc: soxtaBaza(BYUDJET_HOLATI).rpc, kod }, 'tok', { savolId: 'byudjet', matn: 'Нужен банковский счёт?' });
    expect(ru.xabarlar[1]!.matn).toMatch(/^Подробный ответ пока есть только на узбекском:\n\nTaqqoslangan banklar:\n• A: bepul\n• B: bepul\n\nСейчас вопрос: «/);
  });

  it('kod maʼlumot topmasa yoki yiqilsa — bilim bazasining umumiy javobi; oqim toʻxtamaydi', async () => {
    for (const f of [async () => null, async () => { throw new Error('baza'); }]) {
      const r = await suhbatTurn({ rpc: soxtaBaza(BYUDJET_HOLATI).rpc, kod: kodMalumot(f) }, 'tok', { savolId: 'byudjet', matn: 'Soliq qancha toʻlayman?' });
      expect(r.xato).toBeUndefined();
      expect(r.xabarlar[1]!.matn).toMatch(/7-qadamda \(Rasmiylashtirish\) soliq foizi/);
    }
  });

  it('tayyor javobi bor savol — kodga (bazaga) borilmaydi', async () => {
    let chaqirildi = 0;
    const r = await suhbatTurn({ rpc: soxtaBaza(BYUDJET_HOLATI).rpc, kod: kodMalumot(async () => { chaqirildi++; return 'X'; }) },
      'tok', { savolId: 'byudjet', matn: 'ZumSavdo soliq hisoblaydimi?' });
    expect(chaqirildi).toBe(0);
    expect(r.xabarlar[1]!.matn).toMatch(/^ZumSavdo — Uzumda/);
  });

  it('ruscha savol, javobi faqat oʻzbekcha — LLM boʻlmasa izoh bilan oʻzbekchasi («точно не отвечу» emas)', async () => {
    const r = await suhbatTurn(bogliq(soxtaBaza(BYUDJET_HOLATI)), 'tok', { savolId: 'byudjet', matn: 'Какие документы нужны для продажи на Uzum?' });
    expect(r.xabarlar[1]!.matn).toMatch(/^Подробный ответ пока есть только на узбекском: .*Hujjatlar: YaTT.* Сейчас вопрос: «/s);
    expect(r.xabarlar[1]!.matn).not.toMatch(/точно не отвечу/);
    expect(r.xabarlar[1]!.javob).toEqual({ erkin: true, manba: 'baza' });
  });

});
