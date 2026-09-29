/**
 * 8-qadam faktlari — `qabulFaktlari`, `qadoqQoidalari`, `qadoqTavsiyasi`.
 *
 * Raqamlar 0058 seed (Uzum qoʻllanmasi 6- va 14-bob, 2026-09-28/29).
 * Fakt boʻlmasa null va `yetishmaydi`; qadoq mos kelmasa null (umumiy
 * qoida alohida), "kerak emas" emas. Tarmoqqa chiqilmaydi.
 */

import { describe, expect, it } from 'vitest';
import { faktlarniOqi, QABUL_KALITLARI, qabulFaktlari, qadoqQoidalari, qadoqTavsiyasi, nomniTekisla } from '@selleros/shared';

const Q = (qiymat: unknown, manba = 'seller.uzum.uz/manual/uz/6.product-preparation') => ({ qiymat, birlik: null, manba, olchandi: '2026-09-28', izoh: null });

export const QABUL_SEED = {
  'uzum.qabul.ombor.manzil': Q('Toshkent, Sergeli, Xonabod 2/2'),
  'uzum.qabul.ombor.soat': Q('har kuni 06:00–00:00'),
  'uzum.qabul.qaytarish.manzil': Q('Toshkent, Eski Sergeli, Nilufar 77/7'),
  'uzum.qabul.qaytarish.soat': Q('09:00–21:00'),
  'uzum.qabul.muddat_kun_max': Q(7, 'Oferta 4.6'),
  'uzum.qabul.tafovut_som': Q(2500),
  'uzum.qabul.taqiq_jarima_som': Q(5_000_000, 'Oferta 4.17'),
  'uzum.qabul.taymslot.ozgartirish_max': Q(3),
  'uzum.qabul.taymslot.bekor_soat': Q(48),
  'uzum.qabul.yetkazma.sku_max': Q(100),
  'uzum.qabul.yetkazma.akt_nusxa': Q(2),
  'uzum.qabul.quti_toliqlik': Q('kamida 2/3'),
  'uzum.qabul.yorliq': Q({ kod: 'EAN-13 yoki Uzum QR', tavsiya: '58×40 mm', min: '40×30 mm', dpi: '203–300', bosh: '' }),
  'uzum.qabul.qadoq': Q([
    { kalit_sozlar: ['kiyim', 'futbolka', 'koʻylak'], tur: 'Kiyim-kechak', usul: 'Individual shaffof paket', belgilar: '—' },
    { kalit_sozlar: ['shampun', "bo'yoq", 'suyuq'], tur: 'Suyuqlik', usul: 'Termousadka + quti, boʻgʻzi yuqoriga', belgilar: 'Yuqori' },
    { kalit_sozlar: ['sumka', 'ryukzak'], tur: 'Sumka / aksessuar', usul: 'Individual paket', belgilar: '—' },
  ]),
  'uzum.qabul.qadoq_umumiy': Q('Zavod qutisi + strech; qutisiz kichik — kuryer paketi'),
  'uzum.qabul.logistika.url': Q('https://logistics.uzum.uz', 'seller.uzum.uz/manual/uz/12.logistics'),
  'uzum.qabul.logistika.quti_kg_max': Q(20),
  'uzum.qabul.logistika.oldin_kun': Q(2),
  'uzum.qabul.qollanma.url': Q('https://seller.uzum.uz/manual/uz/6.product-preparation/'),
};

describe('qabulFaktlari', () => {
  it('kalitlar seed bilan bir xil', () => {
    expect([...QABUL_KALITLARI].sort()).toEqual(Object.keys(QABUL_SEED).sort());
  });
  it('toʻliq faktlar oʻqiladi, yetishmaydi boʻsh, yorliqdagi boʻsh qiymat tashlanadi', () => {
    const r = qabulFaktlari(faktlarniOqi(QABUL_SEED));
    expect(r.ombor).toEqual({ manzil: 'Toshkent, Sergeli, Xonabod 2/2', soat: 'har kuni 06:00–00:00' });
    expect(r.muddatKunMax).toBe(7);
    expect(r.tafovutSom).toBe(2500);
    expect(r.taqiqJarimaSom).toBe(5_000_000);
    expect(r.taymslot).toEqual({ ozgartirishMax: 3, bekorSoat: 48 });
    expect(r.yetkazma).toEqual({ skuMax: 100, aktNusxa: 2, qutiToliqlik: 'kamida 2/3' });
    expect(r.yorliq).toEqual({ kod: 'EAN-13 yoki Uzum QR', tavsiya: '58×40 mm', min: '40×30 mm', dpi: '203–300' });
    expect(r.qadoq.length).toBe(3);
    expect(r.qadoq[1]).toEqual({ kalitSozlar: ['shampun', "bo'yoq", 'suyuq'], tur: 'Suyuqlik', usul: 'Termousadka + quti, boʻgʻzi yuqoriga', belgilar: 'Yuqori' });
    expect(r.qadoq[0]!.belgilar).toBeNull();
    expect(r.logistika).toEqual({ url: 'https://logistics.uzum.uz', qutiKgMax: 20, oldinKun: 2 });
    expect(r.qollanmaUrl).toBe('https://seller.uzum.uz/manual/uz/6.product-preparation/');
    expect(r.manba).toBe('seller.uzum.uz/manual/uz/6.product-preparation');
    expect(r.yetishmaydi).toEqual([]);
  });
  it('boʻsh roʻyxat (0058 qoʻllanmagan) — null, yetishmaydi toʻliq', () => {
    const r = qabulFaktlari({});
    expect(r.ombor.manzil).toBeNull();
    expect(r.yorliq).toEqual({});
    expect(r.qadoq).toEqual([]);
    expect(r.yetishmaydi).toEqual(['ombor manzili', 'qabul muddati', 'tafovut jarimasi', 'yorliq talablari', 'qadoq qoidalari', 'logistika manzili']);
  });
  it('logistika manzili http boʻlmasa null', () => {
    const r = qabulFaktlari(faktlarniOqi({ ...QABUL_SEED, 'uzum.qabul.logistika.url': Q('logistics.uzum.uz') }));
    expect(r.logistika.url).toBeNull();
    expect(r.yetishmaydi).toEqual(['logistika manzili']);
  });
});

describe('qadoqQoidalari / qadoqTavsiyasi', () => {
  it('buzuq qatorlar tashlanadi va sanaladi', () => {
    const r = qadoqQoidalari([{ tur: 'A', usul: 'B', kalit_sozlar: ['x'] }, { tur: 'nomsiz' }, { kalit_sozlar: [], tur: 'C', usul: 'D' }, 5]);
    expect(r.qadoq.length).toBe(1);
    expect(r.tashlandi).toBe(3);
    expect(qadoqQoidalari('x')).toEqual({ qadoq: [], tashlandi: 0 });
  });
  it('nom kalit soʻz bilan topiladi — apostrof va katta harf farqi yoʻq', () => {
    const q = qabulFaktlari(faktlarniOqi(QABUL_SEED)).qadoq;
    expect(qadoqTavsiyasi('Qizlar uchun zamonaviy FUTBOLKA', q)?.tur).toBe('Kiyim-kechak');
    expect(qadoqTavsiyasi('Devor boʻyoq 5 l', q)?.tur).toBe('Suyuqlik');
    expect(qadoqTavsiyasi('Ayollar sumkasi, katta', q)?.tur).toBe('Sumka / aksessuar');
    expect(qadoqTavsiyasi('Telefon gʻilofi', q)).toBeNull();
    expect(qadoqTavsiyasi('', q)).toBeNull();
    expect(nomniTekisla('  Oʻyinchoq  MASHINA ')).toBe("o'yinchoq mashina");
  });
});
