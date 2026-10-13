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
  suhbatTurn,
  type ErkinSorov, type SuhbatBogliqliklari, type YolHolati,
} from '@selleros/shared';

function soxtaBaza(boshlangich: YolHolati | null = null) {
  const jurnal: Array<{ rol: string; matn: string }> = [];
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

function bogliq(b: ReturnType<typeof soxtaBaza>, erkinLlm?: SuhbatBogliqliklari['erkinLlm']): SuhbatBogliqliklari {
  return { rpc: b.rpc, kod: KOD_YOQ as SuhbatBogliqliklari['kod'], ...(erkinLlm ? { erkinLlm } : {}) };
}

/** Byudjet savoli turgan holat (2026-10-12: avval ism, telefon, tajriba; dollar kursi olingan). */
const BYUDJET_HOLATI: YolHolati = { javoblar: { ism: 'Aziz Karimov', telefon: '+998901234567', uzum_dokoni: 'yoq', qiziqish: ['bilmayman'] }, natijalar: { kurs: KURS } };
/** Tajriba savoli (`uzum_dokoni`) turgan holat. */
const TAJRIBA_HOLATI: YolHolati = { javoblar: { ism: 'Aziz Karimov', telefon: '+998901234567' }, natijalar: {} };

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
    expect(b.jurnal.map((x) => x.rol)).toEqual(['obunachi', 'menejer']);
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
    expect(r.xabarlar[1]!.matn).toMatch(/99 000/);
    expect(r.xabarlar[1]!.matn).toMatch(/Hozirgi savol/);
    expect(b.holat()?.javoblar['byudjet']).toBeUndefined();
  });

  it('ruscha yozsa — ruscha shablon', async () => {
    const b = soxtaBaza(BYUDJET_HOLATI);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', matn: 'что это?' });
    expect(r.xato).toBeUndefined();
    expect(r.xabarlar[1]!.matn).toMatch(/[А-Яа-я]/);
  });

  it('LLM javobi tekshiruvdan oʻtsa — u ketadi; LLM joriy savol va sababni oladi', async () => {
    const b = soxtaBaza(BYUDJET_HOLATI);
    let kelgan: ErkinSorov | null = null;
    const r = await suhbatTurn(bogliq(b, async (k) => { kelgan = k; return 'Assalomu alaykum! Avval byudjetni aniqlaylik — qancha ajratasiz?'; }), 'tok',
      { savolId: 'byudjet', matn: 'salom' });
    expect(r.xabarlar[1]!.matn).toBe('Assalomu alaykum! Avval byudjetni aniqlaylik — qancha ajratasiz?');
    expect(kelgan!.xabar).toBe('salom');
    expect(kelgan!.savol).toMatch(/qancha/i);
    expect(kelgan!.variantlar.length).toBeGreaterThan(0);
  });

  it('LLM oʻzidan RAQAM qoʻshsa — shablon ketadi', async () => {
    const b = soxtaBaza(BYUDJET_HOLATI);
    const r = await suhbatTurn(bogliq(b, async () => 'Koʻpchilik 25 mln bilan boshlaydi.'), 'tok', { savolId: 'byudjet', matn: 'qancha kerak?' });
    expect(r.xabarlar[1]!.matn).not.toMatch(/25 mln/);
  });

  it('LLM yiqilsa — shablon ketadi, oqim toʻxtamaydi', async () => {
    const b = soxtaBaza(BYUDJET_HOLATI);
    const r = await suhbatTurn(bogliq(b, async () => { throw new Error('tarmoq'); }), 'tok', { savolId: 'byudjet', matn: 'salom' });
    expect(r.xato).toBeUndefined();
    expect(r.xabarlar[1]!.matn.length).toBeGreaterThan(10);
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
    const r = await suhbatTurn(bogliq(soxtaBaza(BYUDJET_HOLATI)), 'tok', { savolId: 'byudjet', matn: 'obuna qancha turadi' });
    const m = r.xabarlar[1]!.matn;
    expect(m).toMatch(/^Summani yozing — masalan: 30 mln yoki 3000 \$\. Tariflar:/);
    const s = await suhbatTurn(bogliq(soxtaBaza(BYUDJET_HOLATI)), 'tok', { savolId: 'byudjet', matn: 'soliq toʻlovi qachon?' });
    expect(s.xabarlar[1]!.matn).not.toMatch(/Tariflar/);
  });
});

describe('yordamchi har savolga javob beradi (nazoratchi, 2026-10-13)', () => {
  /** Nazoratchi sinovidagi aynan gap — maslahat soʻrovi, javob emas. */
  const MASLAHAT = '100 mln pulim bor birinchi 80 mln bsohlasammikan yoki 100 mln bilan nima maslahat berasan';

  it('maslahat soʻrovi javob deb olinmaydi: byudjet yozilmaydi, yordamchi javob beradi, summalar tugma boʻladi', async () => {
    const b = soxtaBaza(BYUDJET_HOLATI);
    let kelgan: ErkinSorov | null = null;
    const r = await suhbatTurn(bogliq(b, async (k) => {
      kelgan = k;
      return 'Hamma pulni birinchi partiyaga tikmaslik yaxshi: 80 mln bilan boshlab, qolganini zaxirada saqlasangiz xavf kamroq. Qaror sizniki — qaysi summa bilan boshlaymiz?';
    }), 'tok', { savolId: 'byudjet', matn: MASLAHAT });
    expect(r.xato).toBeUndefined();
    expect(b.holat()!.javoblar['byudjet']).toBeUndefined();
    expect(r.xabarlar.map((x) => x.rol)).toEqual(['obunachi', 'menejer']);
    expect(r.xabarlar[1]!.matn).toMatch(/80 mln bilan boshlab/);
    if (r.keyingi.tur !== 'savol') throw new Error(r.keyingi.tur);
    // Aytgan summalari — birinchi tugmalar (kichigi oldin); bosilsa oʻsha summa bilan boshlanadi.
    expect(r.keyingi.savol.variantlar.slice(0, 2)).toEqual([{ qiymat: 80_000_000, nom: '80 mln soʻm' }, { qiymat: 100_000_000, nom: '100 mln soʻm' }]);
    const r2 = await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', javob: 80_000_000 });
    expect(r2.xato).toBeUndefined();
    expect(b.holat()!.javoblar['byudjet']).toBe(80_000_000);
    // Yordamchi mijozni "koʻradi": bilim, holat, suhbat — ism va telefonsiz.
    expect(kelgan!.bilim).toMatch(/Hamma pulni birinchi partiyaga tikmang/);
    expect(kelgan!.holat).toMatch(/1-qadam «Tanishuv»/);
    expect(kelgan!.holat).toMatch(/Savdo tajribasi: Yoʻq, birinchi marta/);
    const yuborilgan = JSON.stringify(kelgan);
    expect(yuborilgan).not.toMatch(/Aziz|Karimov|998901234567/);
  });

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

  it('LLM manbasiz raqam yozsa — sababi bilan BIR MARTA qayta soʻraladi; toʻgʻri javob ketadi', async () => {
    const b = soxtaBaza(BYUDJET_HOLATI);
    const kelganlar: ErkinSorov[] = [];
    const r = await suhbatTurn(bogliq(b, async (k) => {
      kelganlar.push(k);
      return kelganlar.length === 1
        ? 'Koʻpchilik 25 mln bilan boshlaydi.'
        : 'Boshlash uchun qancha kerakligini keyingi qadamda har yoʻnalish uchun koʻrsataman. Qancha pul bilan boshlaymiz?';
    }), 'tok', { savolId: 'byudjet', matn: 'qancha kerak?' });
    expect(kelganlar).toHaveLength(2);
    expect(kelganlar[1]!.tuzat).toMatch(/25 mln/);
    expect(r.xabarlar[1]!.matn).toMatch(/^Boshlash uchun qancha kerakligini keyingi qadamda/);
  });

  it('ism va telefon savolida "…mi" bilan tugagan ism savol hisoblanmaydi', async () => {
    const b = soxtaBaza(null);
    await suhbatTurn(bogliq(b), 'tok', { savolId: 'ism', matn: 'Ilhom Hakimi' });
    expect(b.holat()!.javoblar['ism']).toBe('Ilhom Hakimi');
  });
});
