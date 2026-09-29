import { describe, expect, it } from 'vitest';
import { mln, raqam, somda, son, YOQ } from '../src/lib/format';
import {
  havolami, oxirgiJumla, rekvizitMatni, savdoNomi, savolKorsatilsinmi, tarixdagiTanlov,
  tezOradaKorsatilsinmi, varaqaMatni, yukKartalari,
} from '../src/lib/holat';
import type { BuyurtmaNatija, Savol, Xabar } from '../src/lib/turlar';

const savol: Savol = { id: 'byudjet', qadam: 1, matn: 'Qancha?', turi: 'son', variantlar: [], erkin: true, otkazishMumkin: true };

describe('format — yoʻq qiymat chiziqcha, nol emas', () => {
  it('null → chiziqcha, 0 → "0"', () => {
    expect(raqam(null)).toBe(YOQ);
    expect(raqam(undefined)).toBe(YOQ);
    expect(raqam(0)).toBe('0');
    expect(somda(null, 'soʻm')).toBe(YOQ);
    expect(somda(0, 'soʻm')).toBe('0 soʻm');
    expect(mln(null)).toBe(YOQ);
  });

  it('minglik boʻsh joy bilan ajratiladi', () => {
    expect(son(3020056)).toBe('3 020 056');
    expect(mln(16_400_000)).toBe('16,4');
  });
});

describe('savol pufagi', () => {
  it('tarixda yoʻq savol alohida chiziladi', () => {
    expect(savolKorsatilsinmi([], savol)).toBe(true);
  });

  it('server allaqachon yozgan savol ikki marta chizilmaydi', () => {
    const x: Xabar[] = [{ rol: 'menejer', matn: 'Qancha?', savolId: 'byudjet' }];
    expect(savolKorsatilsinmi(x, savol)).toBe(false);
    expect(savolKorsatilsinmi(x, null)).toBe(false);
  });

  it('"tez orada" matni ham takrorlanmaydi', () => {
    const k = { tur: 'tezOrada' as const, qadam: 8, nom: 'Qabul', matn: 'tez orada' };
    expect(tezOradaKorsatilsinmi([], k)).toBe(true);
    expect(tezOradaKorsatilsinmi([{ rol: 'menejer', matn: 'tez orada' }], k)).toBe(false);
  });
});

describe('tarixdan chiqariladigan koʻrinishlar', () => {
  const tarix: Xabar[] = [
    { rol: 'kod', matn: 'Yoʻnalishlar', savolId: 'yonalishlar', javob: {} },
    { rol: 'obunachi', matn: 'Sumkalar', savolId: 'yonalish', javob: 10087 },
    { rol: 'kod', matn: 'Tovarlar', savolId: 'tovarlar', javob: {} },
    { rol: 'obunachi', matn: 'Sumka A, Sumka B', savolId: 'tovarlar', javob: [1, 2] },
    { rol: 'menejer', matn: 'Marja qancha?', savolId: 'marja' },
  ];

  it('kartadagi tanlov keyingi obunachi javobidan olinadi', () => {
    expect(tarixdagiTanlov(tarix, 0, 'yonalish')).toEqual([10087]);
    expect(tarixdagiTanlov(tarix, 2, 'tovarlar')).toEqual([1, 2]);
    expect(tarixdagiTanlov(tarix, 4, 'tovarlar')).toEqual([]);
  });

  it('savdo nomi — avval tovarlar, keyin yoʻnalish; hech narsa — null', () => {
    expect(savdoNomi(tarix)).toBe('Sumka A, Sumka B');
    expect(savdoNomi(tarix.slice(0, 2))).toBe('Sumkalar');
    expect(savdoNomi([])).toBeNull();
  });

  it('oʻtkazib yuborilgan tanlov nom boʻlmaydi', () => {
    expect(savdoNomi([{ rol: 'obunachi', matn: 'Oʻtkazildi', savolId: 'yonalish', javob: null }])).toBeNull();
  });

  it('oxirgi jumla — menejer yoki kod', () => {
    expect(oxirgiJumla(tarix)).toBe('Marja qancha?');
    expect(oxirgiJumla([])).toBeNull();
  });
});

describe('yuk kartalari — faqat varaqadagi narsa', () => {
  const varaqa: BuyurtmaNatija = {
    qatorlar: [
      { productId: 1, title: 'A', sourceId: 's1', xitoyTitle: 'A-cn', manzil: 'https://detail.1688.com/offer/1.html', miqdor: 40, narxYuan: 27, narxSom: 48060, jamiYuan: 1080, jamiSom: 1922400, weightG: null, kargoSom: null, kargoIzoh: null, holat: 'tayyor' },
      { productId: 2, title: 'B', sourceId: null, xitoyTitle: null, manzil: null, miqdor: 4, narxYuan: null, narxSom: null, jamiYuan: null, jamiSom: null, weightG: null, kargoSom: null, kargoIzoh: null, holat: 'tanlanmagan' },
    ],
    jami: { yuan: 1080, som: 1922400, kargoSom: null, dona: 40, tayyor: 1, tanlanmagan: 1 },
  };

  it('varaqa yoʻq — karta yoʻq', () => {
    expect(yukKartalari([])).toEqual([]);
  });

  it('tanlanmagan qator chiqmaydi, buyurtma raqami obunachidan', () => {
    const k = yukKartalari([
      { rol: 'kod', matn: 'Varaqa', savolId: 'buyurtma', javob: varaqa },
      { rol: 'obunachi', matn: 'LP-1', savolId: 'buyurtma_raqami', javob: ' LP-1 ' },
    ]);
    expect(k).toHaveLength(1);
    expect(k[0]!.qator.productId).toBe(1);
    expect(k[0]!.buyurtmaRaqami).toBe('LP-1');
  });

  it('raqam oʻtkazilgan boʻlsa — null, oʻylab topilmaydi', () => {
    const k = yukKartalari([
      { rol: 'kod', matn: 'Varaqa', savolId: 'buyurtma', javob: varaqa },
      { rol: 'obunachi', matn: 'Oʻtkazildi', savolId: 'buyurtma_raqami', javob: null },
    ]);
    expect(k[0]!.buyurtmaRaqami).toBeNull();
  });

  it('varaqa matnida faqat tayyor qatorlar va natijadagi raqamlar', () => {
    const m = varaqaMatni(varaqa);
    expect(m).toContain('A-cn — 40 dona × ¥27 = ¥1080');
    expect(m).toContain('https://detail.1688.com/offer/1.html');
    expect(m).not.toContain('B —');
    expect(m).toContain('Jami: 40 dona, ¥1080');
  });
});

describe('havola va rekvizit', () => {
  it('faqat http(s) havola ochiladi', () => {
    expect(havolami('https://1688.com')).toBe(true);
    expect(havolami('javascript:alert(1)')).toBe(false);
    expect(havolami(null)).toBe(false);
  });

  it('rekvizit yoʻq maydonni chiziqcha bilan yozadi', () => {
    const r = rekvizitMatni({
      faktlar: {
        uzum: { komissioner: { stir: '123', nom: null, mfo: null, hisob: null, muddatYil: null } },
      },
    } as never);
    expect(r).toContain('STIR: 123');
    expect(r).toContain('Nom: —');
    expect(rekvizitMatni({})).toBeNull();
  });
});
