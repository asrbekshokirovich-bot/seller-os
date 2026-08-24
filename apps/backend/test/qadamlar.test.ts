/**
 * Usta 2- va 3-qadam testlari.
 *
 * Bu bosqichda mahsulot "tug'iladi": foydalanuvchi yo'nalish tanlaydi
 * va nechta tovar olishni biladi. Shuning uchun eng ko'p tekshiriladigan
 * narsa — tizim TAXMIN qilmasligi. Ma'lumot yo'q bo'lsa jim turishi
 * kerak, chunki bu yerdagi xato odamning pulini yo'qotadi.
 */

import { describe, expect, it } from 'vitest';
import { miqdor, THRESHOLDS, yonalishlar, type TurkumNomzodi } from '@selleros/shared';

const U = THRESHOLDS.usta;
const TOLIQ_MAVSUM = Array(12).fill(1.0);

function turkum(u: Partial<TurkumNomzodi> = {}): TurkumNomzodi {
  return {
    categoryId: 1,
    name: 'Sinov turkumi',
    bozorHajmi30k: 1000,
    sotuvchiSoni: 20,
    top3Ulush: 30,
    optimalKirishSom: 5_000_000,
    talablar: { markirovka: false, sertifikat: false, haftalar: null },
    mavsumiylik: TOLIQ_MAVSUM,
    ...u,
  };
}

describe('2-qadam — yo\'nalishlar', () => {
  it('ball bo\'yicha tartiblaydi', () => {
    const n = yonalishlar([
      turkum({ categoryId: 1, name: 'Qiyin', top3Ulush: 95, sotuvchiSoni: 3 }),
      turkum({ categoryId: 2, name: 'Ochiq', top3Ulush: 20, sotuvchiSoni: 12 }),
    ], 10_000_000, null, 6);
    expect(n.royxat[0]!.name).toBe('Ochiq');
  });

  it('eng ko\'pi bilan 5 ta beradi', () => {
    const kop = Array.from({ length: 12 }, (_, i) =>
      turkum({ categoryId: i + 1, name: `T${i}` }));
    expect(yonalishlar(kop, 10_000_000, null, 6).royxat.length).toBe(U.maxYonalish);
  });

  it('byudjet yetadimi — aniq aytiladi', () => {
    const oz = yonalishlar([turkum({ optimalKirishSom: 20_000_000 })], 5_000_000, null, 6);
    expect(oz.royxat[0]!.yetadi).toBe(false);
    const kop = yonalishlar([turkum({ optimalKirishSom: 3_000_000 })], 5_000_000, null, 6);
    expect(kop.royxat[0]!.yetadi).toBe(true);
  });

  it('OPTIMAL SUMMA BILINMASA — "yetadi" null, "yetmaydi" EMAS', () => {
    // "Yetmaydi" deb aytish odamni yaxshi yo'nalishdan qaytarardi.
    const n = yonalishlar([turkum({ optimalKirishSom: null })], 5_000_000, null, 6);
    expect(n.royxat[0]!.yetadi).toBeNull();
  });

  it('BYUDJET AYTILMAGAN bo\'lsa ham yo\'nalish beriladi', () => {
    // 4-savol ixtiyoriy. Javob bermagan odam ham yo'nalish ko'rishi
    // kerak — faqat "yetadimi" degan javob bo'lmaydi.
    const n = yonalishlar([turkum()], null, null, 6);
    expect(n.royxat.length).toBe(1);
    expect(n.royxat[0]!.yetadi).toBeNull();
  });

  it('MA\'LUMOTI YETMAGAN turkum ro\'yxatga chiqmaydi va sanaladi', () => {
    const yomon = turkum({
      categoryId: 9, bozorHajmi30k: null, top3Ulush: null,
      sotuvchiSoni: null, talablar: { markirovka: null, sertifikat: null, haftalar: null },
      mavsumiylik: null,
    });
    const n = yonalishlar([turkum(), yomon], 5_000_000, null, 6);
    expect(n.royxat.map((r) => r.categoryId)).not.toContain(9);
    expect(n.baholanmadi).toBe(1);
  });

  it('profil mos kelsa ball ko\'tariladi', () => {
    const avtosiz = yonalishlar([turkum({ name: 'Avto ehtiyot qismlar' })], null, null, 6);
    const avtoli = yonalishlar([turkum({ name: 'Avto ehtiyot qismlar' })], null, ['avto'], 6);
    expect(avtoli.royxat[0]!.ball.value!).toBeGreaterThan(avtosiz.royxat[0]!.ball.value!);
  });

  it('natija BARQAROR — bir xil kirish, bir xil tartib', () => {
    const kirish = [turkum({ categoryId: 2 }), turkum({ categoryId: 1 })];
    const a = yonalishlar(kirish, 5_000_000, null, 6).royxat.map((r) => r.categoryId);
    const b = yonalishlar(kirish, 5_000_000, null, 6).royxat.map((r) => r.categoryId);
    expect(a).toEqual(b);
  });
});

describe('byudjet bo\'lish taklifi', () => {
  it('byudjet ancha katta bo\'lsa taklif beriladi', () => {
    const n = yonalishlar(
      [turkum({ categoryId: 1, optimalKirishSom: 2_000_000 }),
       turkum({ categoryId: 2, optimalKirishSom: 2_000_000 })],
      10_000_000, null, 6);   // 5 barobar
    expect(n.bolishTaklifi).not.toBeNull();
    expect(n.bolishTaklifi!.nechta).toBeGreaterThanOrEqual(2);
    expect(n.bolishTaklifi!.sabab).toContain('barobar');
  });

  it('byudjet mos bo\'lsa taklif yo\'q', () => {
    const n = yonalishlar(
      [turkum({ categoryId: 1 }), turkum({ categoryId: 2 })],
      5_000_000, null, 6);   // 1 barobar
    expect(n.bolishTaklifi).toBeNull();
  });

  it('bitta yo\'nalish bo\'lsa bo\'lib bo\'lmaydi', () => {
    const n = yonalishlar([turkum({ optimalKirishSom: 1_000_000 })], 50_000_000, null, 6);
    expect(n.bolishTaklifi).toBeNull();
  });

  it('taklif MAJBURIY emas — ro\'yxat baribir to\'liq qoladi', () => {
    const n = yonalishlar(
      [turkum({ categoryId: 1, optimalKirishSom: 1_000_000 }),
       turkum({ categoryId: 2, optimalKirishSom: 1_000_000 })],
      10_000_000, null, 6);
    expect(n.royxat.length).toBe(2);
  });
});

describe('3-qadam — miqdor', () => {
  it('rejadagi misolni aynan takrorlaydi', () => {
    // "oyiga ~600 dona sotiladi, yangi sotuvchi ~5% oladi → 30 dona"
    const m = miqdor(600)!;
    expect(m.dona).toBe(30);
  });

  it('HISOB OCHIQ — har ko\'paytuvchi matnda ko\'rinadi', () => {
    // "Tizim shunday dedi" degan javob ishonch bermaydi.
    const m = miqdor(600)!;
    expect(m.hisob).toContain('600');
    expect(m.hisob).toContain('5%');
    expect(m.hisob).toContain('30 kunlik');
  });

  it('SOTUV BILINMASA null — taxminiy miqdor aytilmaydi', () => {
    // Taxmin odamni ortiqcha tovar sotib olishga olib borishi mumkin.
    expect(miqdor(null)).toBeNull();
  });

  it('kichik bozorda ham kamida 1 dona', () => {
    expect(miqdor(1)!.dona).toBe(1);
  });

  it('zaxira kuni ko\'paysa miqdor ham ko\'payadi', () => {
    expect(miqdor(600, 5, 90)!.dona).toBe(90);
  });
});
