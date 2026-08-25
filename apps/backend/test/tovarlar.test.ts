/**
 * 3-qadam — tovar roʻyxati va miqdor.
 *
 * Ikkita qoida tekshiriladi va ikkalasi ham odamning pulini himoya
 * qiladi:
 *
 *   1. `block` darajali tuzoq tovarni roʻyxatdan CHIQARADI — lekin
 *      jimgina emas, sababi bilan.
 *   2. Miqdor FAQAT oʻlchangan sotuvdan hisoblanadi. Perepis
 *      taxminidan hisoblansa, odam tasdiqlanmagan raqamga qarab
 *      partiya sotib olardi.
 */

import { describe, expect, it } from 'vitest';
import { THRESHOLDS, tovarlar, type Flag, type TovarNomzodi } from '@selleros/shared';

function tovar(u: Partial<TovarNomzodi> = {}): TovarNomzodi {
  return {
    productId: 1, title: 'Sinov tovari', brand: null,
    sellersCount: null, sellersStableDays: null,
    brandAgeDays: null, brandSellersCount: null, shopOfficial: null,
    soldUnits30d: 600, categoryMedianUnits30d: 300,
    sotuvManbasi: 'olchandi', olchanganKun: 30,
    shopName: 'Sinov doʻkoni', narxSom: 100_000, qoldiq: 40,
    reyting: 4.7, sharhSoni: 120,
    ...u,
  };
}

const toza = () => ({ bayroqlar: [] as Flag[], baholanmadi: [] });

const bayroq = (severity: Flag['severity'], reason: string): Flag =>
  ({ kind: 'closed_brand', severity, reason, evidence: { x: 1 } });

describe('3-qadam — tovarlar', () => {
  it('miqdorni rejadagi formula boʻyicha hisoblaydi', () => {
    // Reja: "oyiga ~600 dona sotiladi, yangi sotuvchi odatda ~5%
    // oladi → 30 kunlik zaxira = 30 dona".
    const r = tovarlar([tovar({ soldUnits30d: 600 })], toza);
    expect(r.royxat[0]!.miqdor?.dona).toBe(30);
    expect(r.royxat[0]!.miqdorSababi).toBeNull();
  });

  it('hisob KOʻRINADI — "tizim shunday dedi" emas', () => {
    const r = tovarlar([tovar({ soldUnits30d: 600 })], toza);
    const h = r.royxat[0]!.miqdor!.hisob;
    expect(h).toContain('600');
    expect(h).toContain(`${THRESHOLDS.usta.yangiSotuvchiUlushi}%`);
    expect(h).toContain(`${THRESHOLDS.usta.zaxiraKun} kunlik`);
  });

  describe('miqdor faqat OʻLCHANGAN sotuvdan', () => {
    it('perepis taxminidan miqdor hisoblanmaydi', () => {
      // Raqam koʻrsatiladi (tartiblash uchun kerak), lekin undan
      // "shuncha dona oling" degan tavsiya CHIQMAYDI.
      const r = tovarlar(
        [tovar({ soldUnits30d: 17_286, sotuvManbasi: 'taxmin', olchanganKun: 1 })],
        toza,
      );
      expect(r.royxat[0]!.miqdor).toBeNull();
      expect(r.royxat[0]!.miqdorSababi).toMatch(/1 kun bor/);
      expect(r.royxat[0]!.miqdorSababi).toMatch(/taxmin/);
      // Raqamning oʻzi yoʻqolmaydi.
      expect(r.royxat[0]!.nomzod.soldUnits30d).toBe(17_286);
    });

    it('sotuv umuman oʻlchanmagan boʻlsa boshqa sabab', () => {
      const r = tovarlar([tovar({ soldUnits30d: null, sotuvManbasi: null })], toza);
      expect(r.royxat[0]!.miqdor).toBeNull();
      expect(r.royxat[0]!.miqdorSababi).toBe('Sotuv hali oʻlchanmagan.');
    });

    it('NOL sotuv — javob, miqdor 1 dona', () => {
      // 0 oʻlchangani "sotilmaydi" degan JAVOB. `null` dan farqli.
      const r = tovarlar([tovar({ soldUnits30d: 0 })], toza);
      expect(r.royxat[0]!.miqdor?.dona).toBe(1);
      expect(r.royxat[0]!.miqdorSababi).toBeNull();
    });
  });

  describe('tuzoq filtrlari roʻyxatdan OLDIN', () => {
    it('block bayrogʻi tovarni chiqaradi — SABABI bilan', () => {
      const r = tovarlar([tovar()], () => ({
        bayroqlar: [bayroq('block', 'Bu brendni faqat egasi sotadi')],
        baholanmadi: [],
      }));
      expect(r.royxat).toHaveLength(0);
      expect(r.chiqarildi).toEqual([
        { productId: 1, title: 'Sinov tovari', sabab: 'Bu brendni faqat egasi sotadi' },
      ]);
    });

    it('warn bayrogʻi chiqarmaydi — ogohlantirish bilan qoladi', () => {
      const r = tovarlar([tovar()], () => ({
        bayroqlar: [bayroq('warn', 'Mavsum tugashiga oz qoldi')],
        baholanmadi: [],
      }));
      expect(r.royxat).toHaveLength(1);
      expect(r.chiqarildi).toHaveLength(0);
      expect(r.royxat[0]!.bayroqlar[0]!.severity).toBe('warn');
    });

    it('baholanmagan filtrlar YASHIRILMAYDI', () => {
      // Filtr "bilmadim" desa, buni koʻrsatish kerak: aks holda
      // tekshirilmagan tovar tekshirilganga oʻxshab qoladi.
      const r = tovarlar([tovar()], () => ({
        bayroqlar: [],
        baholanmadi: [{ filtr: 'closed_brand', missing: ['brand'] }],
      }));
      expect(r.royxat[0]!.baholanmadi).toEqual([
        { filtr: 'closed_brand', missing: ['brand'] },
      ]);
    });
  });

  it('boʻsh kirish — boʻsh natija, xato emas', () => {
    expect(tovarlar([], toza)).toEqual({ royxat: [], chiqarildi: [] });
  });
});
