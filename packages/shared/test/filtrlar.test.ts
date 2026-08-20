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
  brandAgeDays: 1100,
  brandSellersCount: 1,
  shopOfficial: null,
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
    expect(f.evidence.yangi_emasligi).toBe('sotuvchilar soni 90 kun oʻzgarmagan');
    expect(f.evidence.sotuv_30k).toBe(600);
  });

  it('YANGI tovar yopiq brend deb belgilanmaydi', () => {
    // Bitta sotuvchi, katta sotuv — lekin hali 5 kunlik va sharh ham
    // yo'q. Bu aynan yaxshi imkoniyat bo'lishi mumkin, tuzoq emas.
    expect(yopiqBrend({ ...YOPIQ, sellersStableDays: 5, brandAgeDays: 30 })).toBeNull();
  });

  it('tarix yo\'q bo\'lsa id soati yoshni isbotlaydi', () => {
    // Bazaga endi to'lgan. 60 kunlik o'z tariximiz yo'q, lekin brend
    // Uzumda 1100 kundan beri bor — id soati shuni ko'rsatadi.
    expect(yopiqBrend({ ...YOPIQ, sellersStableDays: null }))
      .toMatchObject({ kind: 'closed_brand' });
  });

  it('YANGI brend tuzoq deb belgilanmaydi', () => {
    // 1 do'kon, katta sotuv — lekin brend 30 kunlik. Hech kim kirishga
    // ulgurmagan; bu yopiq eshik emas, endi ochilgan eshik.
    expect(yopiqBrend({ ...YOPIQ, sellersStableDays: null, brandAgeDays: 30 })).toBeNull();
  });

  it('ikkala yosh dalili ham yo\'q bo\'lsa BAHOLANMADI', () => {
    const r = yopiqBrend({ ...YOPIQ, sellersStableDays: null, brandAgeDays: null });
    expect(r).toMatchObject({ kind: 'baholanmadi' });
  });

  it('brendni ko\'p do\'kon sotsa — tuzoq emas', () => {
    // Ochiq brend: assortiment 30 ta do'konda. Bitta tovarda sotuvchi
    // kam bo'lishi mumkin, lekin eshik yopiq emas.
    expect(yopiqBrend({ ...YOPIQ, brandSellersCount: 30 })).toBeNull();
  });

  it('Uzum bermaydigan `official` filtrni to\'xtatmaydi', () => {
    // Bu maydon amalda doim null. Agar u majburiy bo'lsa, filtr hech
    // qachon ishlamasdi va buni hech kim sezmasdi.
    expect(yopiqBrend({ ...YOPIQ, shopOfficial: null }))
      .toMatchObject({ kind: 'closed_brand' });
  });

  it('brend do\'konlari o\'lchanmagan bo\'lsa BAHOLANMADI', () => {
    const r = yopiqBrend({ ...YOPIQ, brandSellersCount: null });
    expect(r).toMatchObject({ kind: 'baholanmadi' });
    expect((r as { missing: string[] }).missing).toContain('brandSellersCount');
  });

  it('sotuv o\'rtachadan past bo\'lsa — tuzoq emas', () => {
    // Kam sotiladigan tovarda bitta sotuvchi bo'lishi tabiiy.
    expect(yopiqBrend({ ...YOPIQ, soldUnits30d: 120 })).toBeNull();
  });

  it('`sellersCount` javobga taʼsir qilmaydi', () => {
    // U ortiqcha: brend nomda + brendni 1 do'kon sotadi → tovarni ham
    // 1 do'kon sotadi. Filtr unga qaramaydi.
    expect(yopiqBrend({ ...YOPIQ, sellersCount: 9 }))
      .toMatchObject({ kind: 'closed_brand' });
    expect(yopiqBrend({ ...YOPIQ, sellersCount: null }))
      .toMatchObject({ kind: 'closed_brand' });
  });

  it('ma\'lumot yetishmasa BAHOLANMADI — tuzoq emas deb aytmaydi', () => {
    const r = yopiqBrend({ ...YOPIQ, brandSellersCount: null, soldUnits30d: null });
    expect(r).toMatchObject({ kind: 'baholanmadi' });
    expect((r as { missing: string[] }).missing).toContain('brandSellersCount');
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
    totalSellers: 40,
  };

  it('qamrov past bo\'lsa BAHOLANMADI — yolg\'on ogohlantirish bermaydi', () => {
    // Haqiqiy holat (2026-08-20): "Qoplamalar" turkumida 10 ta sotuvchi
    // o'lchangan, ular bo'yicha ulush 76%. Aslida 2 052 sotuvchi bor va
    // haqiqiy ulush 21%. Namuna konsentratsiyani oshirib ko'rsatadi.
    const r = monopoliya({ ...TURKUM, top3SharePercent: 76, measuredSellers: 10, totalSellers: 2052 });
    expect(r).toMatchObject({ kind: 'baholanmadi' });
  });

  it('turkumdagi sotuvchilar soni noma\'lum bo\'lsa BAHOLANMADI', () => {
    const r = monopoliya({ ...TURKUM, totalSellers: null });
    expect(r).toMatchObject({ kind: 'baholanmadi' });
    expect((r as { missing: string[] }).missing).toContain('totalSellers');
  });

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
    // `totalSellers` ham birga o'zgaradi: bu yerda sinalayotgani mutlaq
    // son chegarasi, qamrov emas. Qamrov alohida testda.
    expect(
      monopoliya({ ...TURKUM, measuredSellers: MIN_SOTUVCHI, totalSellers: MIN_SOTUVCHI }),
    ).toMatchObject({ kind: 'monopoly' });
    expect(
      monopoliya({
        ...TURKUM,
        measuredSellers: MIN_SOTUVCHI - 1,
        totalSellers: MIN_SOTUVCHI - 1,
      }),
    ).toMatchObject({ kind: 'baholanmadi' });
  });
});
