/**
 * 10-qadam — «Kartochka matnini yozib ber» (nazoratchi, 2026-10-13; 6-imkoniyat).
 *
 * Matnni LLM yozadi, lekin Uzum qoidalari va raqamlar KOD bilan tekshiriladi:
 * stop-soʻz, emoji, CAPS, kontakt, til/yozuv, nom ≥ 3 soʻz, manbasiz raqam.
 * Oʻtmasa — sababi bilan bir marta qayta; baribir oʻtmasa yoki LLM yoʻq —
 * matn emas, qolip (toʻqilgan matn chiqmaydi).
 */

import { describe, expect, it } from 'vitest';
import {
  kartochkaManbalari, kartochkaTekshir,
  type KartochkaMatni, type KartochkaMatniNatijasi, type YolHolati,
} from '@selleros/shared';
import { suhbatKodHarakatlari, type XitoyBogliqligi } from '../src/suhbat-kod.js';

const MANBA = ['Gel ruchka 0,5 mm, 12 dona, koʻk', 'Ruchkalar', '中性笔 0.5mm 12支 蓝色'];

const YAXSHI: KartochkaMatni = {
  nomUz: 'Gel ruchka koʻk, 0,5 mm, 12 dona',
  nomRu: 'Гелевая ручка синяя, 0,5 мм, 12 штук',
  qisqaUz: 'Koʻk siyohli gel ruchkalar toʻplami — maktab va ofis uchun.',
  qisqaRu: 'Набор гелевых ручек с синими чернилами для школы и офиса.',
  tavsifUz: 'Toʻplamda 12 dona gel ruchka bor. Siyohi koʻk, chizigʻi ingichka va tekis. Maktab, oliy taʼlim va ofis uchun qulay.',
  tavsifRu: 'В наборе 12 гелевых ручек. Синие чернила, тонкая и ровная линия. Удобно для школы, учёбы и офиса.',
};

describe('kartochkaTekshir — Uzum qoidalari (qoʻllanma 5.1)', () => {
  it('toʻgʻri matn oʻtadi (raqamlar manbada bor)', () => {
    expect(kartochkaTekshir(YAXSHI, MANBA)).toEqual([]);
  });

  it.each([
    [{ nomUz: 'Gel ruchka koʻk — eng yaxshi tanlov' }, /qiyosiy maqtov/],
    [{ qisqaUz: 'Aksiya! Sotib oling.' }, /aksiya/],
    [{ qisqaRu: 'Хит продаж, скидка 20%' }, /stop-soʻz|chegirma/],
    [{ nomUz: 'Gel ruchka 🔥 koʻk siyohli' }, /emoji/],
    [{ nomUz: 'GEL RUCHKA KOʻK SIYOHLI 12 DONA' }, /CAPS/],
    [{ qisqaUz: 'Ajoyib ruchka!!' }, /takroriy belgilar/],
    [{ tavsifUz: 'Savollar boʻlsa: +998 90 123 45 67' }, /kontakt yoki havola/],
    [{ tavsifRu: 'Подробнее на uzum.uz' }, /kontakt yoki havola/],
    [{ tavsifUz: 'Yuqori reytingli ruchka.' }, /sharh, reyting/],
    [{ nomUz: 'Гелевая ручка синяя крупная' }, /lotin yozuvida/],
    [{ nomRu: 'Gel ruchka koʻk siyohli' }, /rus tilida/],
    [{ nomUz: 'Gel ruchka' }, /kamida 3 soʻz/],
    [{ nomUz: 'Gel ruchka «Koʻk» siyohli' }, /ruxsat etilmagan belgi/],
    [{ tavsifUz: 'Toʻplamda 24 dona ruchka bor.' }, /manbada yoʻq raqamlar: 24/],
    [{ tavsifRu: 'Гарантия качества на ручки.' }, /vaʼda: kafolat/],
    [{ qisqaUz: ' ' }, /qisqa tavsif \(oʻzbekcha\) boʻsh/],
  ])('rad: %o', (buzuq, kutilgan) => {
    const m = kartochkaTekshir({ ...YAXSHI, ...buzuq }, MANBA);
    expect(m.join(' | ')).toMatch(kutilgan);
  });

  it('«topish», «sotuvchi», «yangi» — stop-soʻz emas', () => {
    expect(kartochkaTekshir({ ...YAXSHI, tavsifUz: 'Uni topish oson, sotuvchi har kuni joʻnatadi. Yangi qadoqda.' }, MANBA)).toEqual([]);
  });
});

/** 10-qadamdagi holat: varaqada 2 tovar, ikkinchisiga 1688 taklifi tanlangan. */
const H: YolHolati = {
  javoblar: { yonalish: 7, tovarlar: [100, 200], 'xitoy_tanlov:200': 'X2', kartochka_matni: 1 },
  natijalar: {
    yonalishlar: { olchov_yoq: false, royxat: [{ categoryId: 7, name: 'Ruchkalar' }] },
    buyurtma: { qatorlar: [{ productId: 100, title: 'Gel ruchka 0,5 mm, 12 dona, koʻk', holat: 'tayyor' }, { productId: 200, title: 'Marker 6 rang', holat: 'tayyor' }, { productId: 300, title: 'Tayyor emas', holat: 'chegaradan_qimmat' }] },
    xitoy: { olchov_yoq: false, kurs: null, kutilmoqda: null, qatorlar: [{ productId: 200, takliflar: [{ sourceId: 'X1', title: '别的' }, { sourceId: 'X2', title: '记号笔 6色' }] }] },
  },
};

describe('kartochkaManbalari — holatdan', () => {
  it('varaqadagi tayyor tovarlar; turkum — yoʻnalish; xitoy — tanlangan 1688 taklifi nomi', () => {
    expect(kartochkaManbalari(H)).toEqual([
      { productId: 100, namuna: 'Gel ruchka 0,5 mm, 12 dona, koʻk', turkum: 'Ruchkalar', xitoy: null },
      { productId: 200, namuna: 'Marker 6 rang', turkum: 'Ruchkalar', xitoy: '记号笔 6色' },
    ]);
  });
});

function kodLlm(llm: XitoyBogliqligi['kartochkaLlm'] | null) {
  const rpc = async <T>(): Promise<T | null> => null;
  return suhbatKodHarakatlari(rpc, () => ({ bayroqlar: [], baholanmadi: [] }), () => 10, {
    kalit: null, fetch, token: 't', tarifCheklovi: false, ...(llm ? { kartochkaLlm: llm } : {}),
  });
}

describe('kod kartochka_matni — LLM + qoida tekshiruvi', () => {
  it('birinchi matn qoidadan oʻtmasa — sababi bilan qayta soʻraladi; toʻgʻrisi qabul qilinadi', async () => {
    const tuzatlar: Array<string | null | undefined> = [];
    const n = await kodLlm(async (k) => {
      tuzatlar.push(k.tuzat);
      return k.tuzat ? YAXSHI : { ...YAXSHI, qisqaUz: 'Eng arzon ruchka — aksiya!' };
    }).kartochkaMatni({ ...H, natijalar: { ...H.natijalar, buyurtma: { qatorlar: [{ productId: 100, title: 'Gel ruchka 0,5 mm, 12 dona, koʻk', holat: 'tayyor' }] } } }) as KartochkaMatniNatijasi;
    expect(n.olchov_yoq).toBe(false);
    expect(n.sorov).toBe(1);
    expect(n.qatorlar[0]!.matn).toEqual(YAXSHI);
    expect(tuzatlar[0]).toBeNull();
    expect(tuzatlar[1]).toMatch(/qiyosiy maqtov.*aksiya|aksiya.*qiyosiy maqtov/);
  });

  it('baribir oʻtmasa — matn yoʻq (qolip), muammolar aytiladi; LLM yiqilsa yoki ulanmagan boʻlsa — matn yoʻq', async () => {
    const yomon = await kodLlm(async () => ({ ...YAXSHI, tavsifUz: 'Toʻplamda 24 dona.' })).kartochkaMatni(H) as KartochkaMatniNatijasi;
    expect(yomon.qatorlar.map((q) => q.matn)).toEqual([null, null]);
    expect(yomon.qatorlar[0]!.muammolar.join(' ')).toMatch(/manbada yoʻq raqamlar: 24/);
    const yiqildi = await kodLlm(async () => { throw new Error('tarmoq'); }).kartochkaMatni(H) as KartochkaMatniNatijasi;
    expect(yiqildi.qatorlar.map((q) => [q.matn, q.muammolar])).toEqual([[null, []], [null, []]]);
    const ulanmagan = await kodLlm(null).kartochkaMatni(H) as KartochkaMatniNatijasi;
    expect(ulanmagan.qatorlar).toHaveLength(2);
    expect(ulanmagan.qatorlar.every((q) => q.matn === null)).toBe(true);
  });

  it('tanlangan tovar yoʻq — oʻlchov yoʻq, sabab bilan', async () => {
    const n = await kodLlm(null).kartochkaMatni({ javoblar: {}, natijalar: {} }) as KartochkaMatniNatijasi;
    expect(n).toMatchObject({ olchov_yoq: true, sabab: 'tanlangan tovar topilmadi', qatorlar: [] });
  });
});
