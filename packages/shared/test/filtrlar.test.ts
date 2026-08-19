import { describe, expect, it } from 'vitest';
import { brendTovarNomida, yopiqBrend } from '../src/filtrlar/yopiq_brend.js';
import { MIN_SOTUVCHI, monopoliya } from '../src/filtrlar/monopoliya.js';
import type { TovarHolati, TurkumHolati } from '../src/filtrlar/turlar.js';

/** Yopiq brendning barcha belgilariga ega tovar. */
const YOPIQ: TovarHolati = {
  productId: 1,
  title: 'Nike Air Max krossovka',
  brand: 'Nike',
  sellersCount: 1,
  sellersStableDays: 90,
  shopOfficial: true,
  soldUnits30d: 600,
  categoryMedianUnits30d: 100,
};

describe('1-tuzoq: yopiq brend', () => {
  it('hamma belgi birga kelsa — BLOCK', () => {
    const f = yopiqBrend(YOPIQ);
    expect(f).toMatchObject({ kind: 'closed_brand', severity: 'block' });
  });

  it('sababi raqam bilan tushuntiriladi', () => {
    const f = yopiqBrend(YOPIQ) as { evidence: Record<string, unknown> };
    // Sababsiz bayroq ishonchni yo'qotadi.
    expect(f.evidence.sotuvchilar).toBe(1);
    expect(f.evidence.barqaror_kun).toBe(90);
    expect(f.evidence.sotuv_30k).toBe(600);
  });

  it('YANGI tovar yopiq brend deb belgilanmaydi', () => {
    // Bitta sotuvchi, katta sotuv — lekin hali 5 kunlik. Bu aynan
    // yaxshi imkoniyat bo'lishi mumkin, tuzoq emas.
    expect(yopiqBrend({ ...YOPIQ, sellersStableDays: 5 })).toBeNull();
  });

  it('rasmiy do\'kon bo\'lmasa — tuzoq emas', () => {
    expect(yopiqBrend({ ...YOPIQ, shopOfficial: false })).toBeNull();
  });

  it('sotuv o\'rtachadan past bo\'lsa — tuzoq emas', () => {
    // Kam sotiladigan tovarda bitta sotuvchi bo'lishi tabiiy.
    expect(yopiqBrend({ ...YOPIQ, soldUnits30d: 120 })).toBeNull();
  });

  it('ko\'p sotuvchi bo\'lsa — tuzoq emas', () => {
    expect(yopiqBrend({ ...YOPIQ, sellersCount: 9 })).toBeNull();
  });

  it('ma\'lumot yetishmasa BAHOLANMADI — tuzoq emas deb aytmaydi', () => {
    const r = yopiqBrend({ ...YOPIQ, sellersCount: null, soldUnits30d: null });
    expect(r).toMatchObject({ kind: 'baholanmadi' });
    expect((r as { missing: string[] }).missing).toContain('sellersCount');
  });

  it('turkum medianasi nol bo\'lsa bo\'linmaydi', () => {
    expect(yopiqBrend({ ...YOPIQ, categoryMedianUnits30d: 0 })).toBeNull();
  });
});

describe('brend nomi tovar nomida', () => {
  it('so\'z sifatida uchrasa — ha', () => {
    expect(brendTovarNomida('Nike', 'Nike Air Max')).toBe(true);
    expect(brendTovarNomida('nike', 'Yangi NIKE krossovka')).toBe(true);
  });

  it('boshqa so\'zning ichida bo\'lsa — yo\'q', () => {
    // "Nikelli" — bu Nike emas. Oddiy `includes` bunda yanglishardi.
    expect(brendTovarNomida('Nike', 'Nikelli sim 3 metr')).toBe(false);
  });

  it('brend yo\'q bo\'lsa — yo\'q', () => {
    expect(brendTovarNomida(null, 'Nike Air')).toBe(false);
    expect(brendTovarNomida('', 'Nike Air')).toBe(false);
  });
});

describe('6-tuzoq: monopoliya', () => {
  const TURKUM: TurkumHolati = {
    categoryId: 1,
    name: 'Krossovkalar',
    top3SharePercent: 85,
    measuredSellers: 40,
  };

  it('top-3 ulushi chegaradan yuqori bo\'lsa — WARN', () => {
    expect(monopoliya(TURKUM)).toMatchObject({ kind: 'monopoly', severity: 'warn' });
  });

  it('BLOCK emas — foydalanuvchi bilib turib kirishi mumkin', () => {
    const f = monopoliya(TURKUM) as { severity: string };
    expect(f.severity).not.toBe('block');
  });

  it('ulush past bo\'lsa — tuzoq emas', () => {
    expect(monopoliya({ ...TURKUM, top3SharePercent: 40 })).toBeNull();
  });

  it('OZ SOTUVCHI O\'LCHANGAN BO\'LSA — baholanmaydi', () => {
    // Bu xato zumsavdo da amalda uchragan: turkumda 3 ta do'kon
    // o'lchangan edi va top-3 ulushi tabiiy ravishda 100% chiqdi.
    // Bu monopoliya emas, o'lchov yupqaligi.
    const r = monopoliya({ ...TURKUM, top3SharePercent: 100, measuredSellers: 3 });
    expect(r).toMatchObject({ kind: 'baholanmadi' });
  });

  it('chegara sotuvchi sonida ishlaydi', () => {
    expect(monopoliya({ ...TURKUM, measuredSellers: MIN_SOTUVCHI })).toMatchObject({
      kind: 'monopoly',
    });
    expect(monopoliya({ ...TURKUM, measuredSellers: MIN_SOTUVCHI - 1 })).toMatchObject({
      kind: 'baholanmadi',
    });
  });
});
