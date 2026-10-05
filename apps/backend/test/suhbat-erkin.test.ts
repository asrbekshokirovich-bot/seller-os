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
  boshlangichHolat, suhbatTurn,
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

const KOD_YOQ = new Proxy({}, { get: () => async () => { throw new Error('bu testda kod chaqirilmasligi kerak'); } });

function bogliq(b: ReturnType<typeof soxtaBaza>, erkinLlm?: SuhbatBogliqliklari['erkinLlm']): SuhbatBogliqliklari {
  return { rpc: b.rpc, kod: KOD_YOQ as SuhbatBogliqliklari['kod'], ...(erkinLlm ? { erkinLlm } : {}) };
}

describe('erkin xabar', () => {
  it('son savoliga "10 mln" — JAVOB sifatida qabul qilinadi', async () => {
    const b = soxtaBaza();
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', matn: '10 mln' });
    expect(r.xato).toBeUndefined();
    expect(b.holat()!.javoblar['byudjet']).toBe(10_000_000);
    if (r.keyingi.tur !== 'savol') throw new Error();
    expect(r.keyingi.savol.id).toBe('uzum_dokoni');
  });

  it('son savoliga "salom" — erkin xabar: xato emas, holat oʻzgarmaydi, savol eslatiladi', async () => {
    const b = soxtaBaza();
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', matn: 'salom' });
    expect(r.xato).toBeUndefined();
    expect(r.xabarlar.map((x) => x.rol)).toEqual(['obunachi', 'menejer']);
    expect(r.xabarlar[0]!.matn).toBe('salom');
    expect(r.xabarlar[1]!.matn).toMatch(/alaykum/i);
    expect(r.xabarlar[1]!.matn).toMatch(/qancha/);
    if (r.keyingi.tur !== 'savol') throw new Error();
    expect(r.keyingi.savol.id).toBe('byudjet');
    expect(b.holat()?.javoblar['byudjet']).toBeUndefined();
    expect(b.jurnal.map((x) => x.rol)).toEqual(['obunachi', 'menejer']);
  });

  it('savol ("bu nima?") — javob sifatida OLINMAYDI, menejer javob beradi', async () => {
    const h = { ...boshlangichHolat(), javoblar: { byudjet: 10_000_000 } };
    const b = soxtaBaza(h);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', matn: 'bu nima?' });
    expect(r.xato).toBeUndefined();
    expect(r.xabarlar[0]!.matn).toBe('bu nima?');
    expect(b.holat()!.javoblar['uzum_dokoni']).toBeUndefined();
    if (r.keyingi.tur !== 'savol') throw new Error();
    expect(r.keyingi.savol.id).toBe('uzum_dokoni');
  });

  it('variantli savolga notoʻgʻri matn — sababi bilan javob (shablon)', async () => {
    const h = { ...boshlangichHolat(), javoblar: { byudjet: 10_000_000 } };
    const b = soxtaBaza(h);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', matn: 'xxx' });
    expect(r.xato).toBeUndefined();
    expect(r.xabarlar[1]!.matn).toMatch(/variant/i);
  });

  it('variant nomini yozsa ("ha", "yoʻq") — oʻsha variant tanlanadi', async () => {
    const h = { ...boshlangichHolat(), javoblar: { byudjet: 10_000_000 } };
    const b = soxtaBaza(h);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', matn: 'ha' });
    expect(r.xato).toBeUndefined();
    expect(b.holat()!.javoblar['uzum_dokoni']).toBe('sotyapman');
    const b2 = soxtaBaza(h);
    await suhbatTurn(bogliq(b2), 'tok', { savolId: 'uzum_dokoni', matn: "Yo'q" });
    expect(b2.holat()!.javoblar['uzum_dokoni']).toBe('yoq');
  });

  it('shablon sababi bosh harf va nuqta bilan ("Variantlardan birini tanlang.")', async () => {
    const h = { ...boshlangichHolat(), javoblar: { byudjet: 10_000_000 } };
    const b = soxtaBaza(h);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', matn: 'xxx' });
    expect(r.xabarlar[1]!.matn).toMatch(/^Variantlardan birini tanlang. Hozirgi savol/);
  });

  it('koʻp soʻraladigan savol ("obuna qancha turadi") — koddagi tayyor javob + joriy savol', async () => {
    const b = soxtaBaza();
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', matn: 'obuna qancha turadi' });
    expect(r.xato).toBeUndefined();
    expect(r.xabarlar[1]!.matn).toMatch(/99 000/);
    expect(r.xabarlar[1]!.matn).toMatch(/Hozirgi savol/);
    expect(b.holat()?.javoblar['byudjet']).toBeUndefined();
  });

  it('ruscha yozsa — ruscha shablon', async () => {
    const b = soxtaBaza();
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', matn: 'что это?' });
    expect(r.xato).toBeUndefined();
    expect(r.xabarlar[1]!.matn).toMatch(/[А-Яа-я]/);
  });

  it('LLM javobi tekshiruvdan oʻtsa — u ketadi; LLM joriy savol va sababni oladi', async () => {
    const b = soxtaBaza();
    let kelgan: ErkinSorov | null = null;
    const r = await suhbatTurn(bogliq(b, async (k) => { kelgan = k; return 'Assalomu alaykum! Avval byudjetni aniqlaylik — qancha ajratasiz?'; }), 'tok',
      { savolId: 'byudjet', matn: 'salom' });
    expect(r.xabarlar[1]!.matn).toBe('Assalomu alaykum! Avval byudjetni aniqlaylik — qancha ajratasiz?');
    expect(kelgan!.xabar).toBe('salom');
    expect(kelgan!.savol).toMatch(/qancha/);
    expect(kelgan!.variantlar.length).toBeGreaterThan(0);
  });

  it('LLM oʻzidan RAQAM qoʻshsa — shablon ketadi', async () => {
    const b = soxtaBaza();
    const r = await suhbatTurn(bogliq(b, async () => 'Koʻpchilik 25 mln bilan boshlaydi.'), 'tok', { savolId: 'byudjet', matn: 'qancha kerak?' });
    expect(r.xabarlar[1]!.matn).not.toMatch(/25 mln/);
  });

  it('LLM yiqilsa — shablon ketadi, oqim toʻxtamaydi', async () => {
    const b = soxtaBaza();
    const r = await suhbatTurn(bogliq(b, async () => { throw new Error('tarmoq'); }), 'tok', { savolId: 'byudjet', matn: 'salom' });
    expect(r.xato).toBeUndefined();
    expect(r.xabarlar[1]!.matn.length).toBeGreaterThan(10);
  });

  it('TUGMA (savolId + javob) notoʻgʻri boʻlsa — avvalgidek xato, hech narsa yozilmaydi', async () => {
    const b = soxtaBaza();
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
    const b = soxtaBaza();
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'byudjet', matn: 'a'.repeat(2000) });
    expect(r.xabarlar[0]!.matn.length).toBeLessThanOrEqual(501);
  });
});

/** 3-qadam miqdor savoli turgan holat: tugmalar «30 kunlik zaxira — 45 dona», «60 kunlik — 90 dona». */
const MIQDOR_HOLATI: YolHolati = {
  javoblar: { byudjet: 10_000_000, uzum_dokoni: 'yoq', yonalish: 11, tovarlar: [100] },
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
    const b3 = soxtaBaza();
    await suhbatTurn(bogliq(b3), 'tok', { savolId: 'byudjet', matn: '10 mln' });
    expect(b3.holat()!.javoblar['byudjet']).toBe(10_000_000);
  });

  it('F24: eslatmada tovar nomi qoladi (uzun savoldan faqat soʻroq jumla olinsa ham)', async () => {
    const r = await suhbatTurn(bogliq(soxtaBaza(MIQDOR_HOLATI)), 'tok', { savolId: 'miqdor:100', matn: 'nima qilay?' });
    expect(r.xabarlar[1]!.matn).toMatch(/Hozirgi savol: ««Quloqchin A» — Birinchi partiya uchun nechta olasiz\?»/);
  });

  it('F24: "hisob…" salomlashish emas — "Vaalaykum assalom" deyilmaydi', async () => {
    const h = { ...boshlangichHolat(), javoblar: { byudjet: 10_000_000 } };
    const r = await suhbatTurn(bogliq(soxtaBaza(h)), 'tok', { savolId: 'uzum_dokoni', matn: 'hisob raqamim bor' });
    expect(r.xabarlar[1]!.matn).not.toMatch(/alaykum/i);
    const s = await suhbatTurn(bogliq(soxtaBaza(h)), 'tok', { savolId: 'uzum_dokoni', matn: 'hi!' });
    expect(s.xabarlar[1]!.matn).toMatch(/^Vaalaykum assalom!/);
  });

  it('F24: ruscha shablonda sabab ham ruscha — oʻzbekcha gap aralashmaydi', async () => {
    const h = { ...boshlangichHolat(), javoblar: { byudjet: 10_000_000 } };
    const r = await suhbatTurn(bogliq(soxtaBaza(h)), 'tok', { savolId: 'uzum_dokoni', matn: 'ааа' });
    expect(r.xabarlar[1]!.matn).toMatch(/^Не получилось принять ответ: Выберите один из вариантов\./);
    expect(r.xabarlar[1]!.matn).not.toMatch(/Variantlardan/);
  });

  it('F25: javob oʻtmasa VA tayyor javob bor — avval sabab, keyin tayyor javob; boshqa mavzu tarifga burilmaydi', async () => {
    const r = await suhbatTurn(bogliq(soxtaBaza()), 'tok', { savolId: 'byudjet', matn: 'obuna qancha turadi' });
    const m = r.xabarlar[1]!.matn;
    expect(m).toMatch(/^Bitta son yozing — masalan: 10 000 000 yoki 10 mln\. Tariflar:/);
    const s = await suhbatTurn(bogliq(soxtaBaza()), 'tok', { savolId: 'byudjet', matn: 'soliq toʻlovi qachon?' });
    expect(s.xabarlar[1]!.matn).not.toMatch(/Tariflar/);
  });
});
