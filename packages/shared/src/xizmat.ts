/**
 * Xizmat oqimi — B5.
 *
 * Uch xizmat turi:
 *   - start-paket: yangi sotuvchi uchun — tovar topish + birinchi partiya
 *   - kalit-taxtida: toʻliq xizmat — tovar topishdan mahsulot joylashgacha
 *   - kartochka: faqat AI kartochka (nom + tavsif + SEO + infografika)
 *
 * Ariza = buyurtma. Foydalanuvchi "buyurtma bering" bosadi →
 * nazoratchiga soʻrov tushadi → nazoratchi qabul/rad qiladi.
 *
 * 5-qadam ARIZA REJIMIDA: foydalanuvchi koʻradi, lekin toʻgʻridan-toʻgʻri
 * hech narsa bajarmaydi — faqat ariza qoldiradi.
 */

export type XizmatTuri = 'start-paket' | 'kalit-taxtida' | 'kartochka';

export type ArizaHolati = 'yangi' | 'qabul' | 'jarayonda' | 'tayyor' | 'rad';

export interface XizmatNarxi {
  turi: XizmatTuri;
  narxSom: number;
  tavsif: string;
}

export const XIZMAT_NARXLARI: readonly XizmatNarxi[] = [
  {
    turi: 'start-paket',
    narxSom: 1_500_000,
    tavsif: 'Tovar topish + birinchi partiya yoʻlga qoʻyish',
  },
  {
    turi: 'kalit-taxtida',
    narxSom: 5_000_000,
    tavsif: 'Tovar topishdan mahsulot joylashgacha toʻliq xizmat',
  },
  {
    turi: 'kartochka',
    narxSom: 200_000,
    tavsif: 'AI kartochka: nom + tavsif + SEO + infografika (uz/ru)',
  },
] as const;

export interface ArizaSorov {
  turi: XizmatTuri;
  categoryId?: number;
  productId?: number;
  izoh?: string;
}

export interface ArizaJavob {
  arizaId: number;
  holat: ArizaHolati;
}

export function xizmatNarxi(turi: XizmatTuri): number {
  return XIZMAT_NARXLARI.find((x) => x.turi === turi)?.narxSom ?? 0;
}
