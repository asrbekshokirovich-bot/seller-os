/**
 * AI kartochka generatsiya — B5.
 *
 * Ikki model: arzon suhbatga, kuchli kartochkaga.
 *   - Kuchli model: nom, tavsif, SEO (uz/ru)
 *   - Infografika: HTML shablon → Chromium → PNG
 *
 * Hech narsa fabrikatsiya qilinmaydi: agar AI javob bermasa yoki
 * xato chiqsa — aniq xato qaytariladi, taxminiy matn yoʻq.
 */

export type KartochkaTili = 'uz' | 'ru';
export type KartochkaHolati = 'navbatda' | 'jarayonda' | 'tayyor' | 'xato';

export interface KartochkaKirish {
  productId: number;
  tovarNomi: string;
  turkumNomi: string;
  til: KartochkaTili;
  kalit_sozlar?: string[];
}

export interface KartochkaNatija {
  nom: string;
  tavsif: string;
  seoKalitSozlar: string[];
  qisqaTavsif: string;
}

export interface KartochkaIsh {
  id: number;
  holat: KartochkaHolati;
  kirish: KartochkaKirish;
  natija: KartochkaNatija | null;
  model: string | null;
  xato: string | null;
  tokenlar: { input: number; output: number; costUsd: number } | null;
}

export interface KartochkaSorov {
  productId: number;
  til: KartochkaTili;
  turkumNomi?: string;
  kalit_sozlar?: string[];
}

export const KARTOCHKA_LIMIT = {
  bepulKunlik: 0,
  proKunlik: 5,
  biznesKunlik: 20,
} as const;

export function kartochkaLimitTekshir(
  ishlatilgan: number,
  reja: 'bepul' | 'pro' | 'biznes',
): { ruxsat: boolean; qolgan: number; limit: number } {
  const limit = reja === 'biznes'
    ? KARTOCHKA_LIMIT.biznesKunlik
    : reja === 'pro'
      ? KARTOCHKA_LIMIT.proKunlik
      : KARTOCHKA_LIMIT.bepulKunlik;
  return {
    ruxsat: ishlatilgan < limit,
    qolgan: Math.max(0, limit - ishlatilgan),
    limit,
  };
}
