import { THRESHOLDS } from '../thresholds.js';
import type { Flag } from '../traps.js';
import type { Baholanmadi, TovarHolati } from './turlar.js';

/**
 * 1-tuzoq: yopiq brend.
 *
 * Nega jozibali: sotuvchi 1–2 ta, sotuv juda katta → "boʻsh maydon!"
 * Aslida brendni faqat egasi sotadi. Bu imkoniyat emas, yopiq eshik.
 *
 * Beshta signal BIRGA kelishi kerak. Bittasi yoki ikkitasi yetarli emas:
 * yangi, hali kimsa kirmagan tovar ham "bitta sotuvchi, katta sotuv"
 * boʻlishi mumkin — u esa aynan yaxshi imkoniyat. Farqni **barqarorlik**
 * va **rasmiy doʻkon** koʻrsatadi: agar sotuv katta boʻlsa-yu, ikki oy
 * davomida hech kim kirmagan boʻlsa va sotuvchi brendning oʻz doʻkoni
 * boʻlsa — demak kira olmaganlar, xohlamaganlar emas.
 *
 * `block` beriladi: bunday tovar tavsiyaga umuman chiqmasligi kerak.
 */
export function yopiqBrend(t: TovarHolati): Flag | Baholanmadi | null {
  const c = THRESHOLDS.closedBrand;

  const missing: string[] = [];
  if (t.sellersCount === null) missing.push('sellersCount');
  if (t.sellersStableDays === null) missing.push('sellersStableDays');
  if (t.shopOfficial === null) missing.push('shopOfficial');
  if (t.soldUnits30d === null) missing.push('soldUnits30d');
  if (t.categoryMedianUnits30d === null) missing.push('categoryMedianUnits30d');
  if (missing.length) return { kind: 'baholanmadi', missing };

  const sellers = t.sellersCount as number;
  const stable = t.sellersStableDays as number;
  const sold = t.soldUnits30d as number;
  const median = t.categoryMedianUnits30d as number;

  const kamSotuvchi = sellers <= c.maxSellers;
  const barqaror = stable >= c.stableDays;
  const rasmiy = t.shopOfficial === true;
  const brendNomda = brendTovarNomida(t.brand, t.title);
  // Mediana nol boʻlsa boʻlish mumkin emas; bunday turkumda "katta sotuv"
  // degan tushuncha ham yoʻq.
  const kattaSotuv = median > 0 && sold >= median * c.highSalesMultiple;

  const hammasi = kamSotuvchi && barqaror && rasmiy && brendNomda && kattaSotuv;
  if (!hammasi) return null;

  return {
    kind: 'closed_brand',
    severity: 'block',
    reason:
      'Bu brendni faqat egasi sotadi — bu imkoniyat emas, yopiq eshik. ' +
      `Sotuv katta, lekin ${stable} kundan beri hech kim kira olmagan.`,
    evidence: {
      sotuvchilar: sellers,
      barqaror_kun: stable,
      rasmiy_dokon: String(rasmiy),
      brend: t.brand ?? '—',
      sotuv_30k: sold,
      turkum_medianasi: median,
    },
  };
}

/**
 * Brend nomi tovar nomida uchraydimi.
 *
 * Oddiy `includes` yetarli emas: "Nike" va "nike air" bir xil, lekin
 * "Nikelli sim" — boshqa narsa. Shuning uchun soʻz chegarasi bilan.
 */
export function brendTovarNomida(brand: string | null, title: string): boolean {
  if (!brand) return false;
  const b = brand.trim().toLowerCase();
  if (b.length < 2) return false;
  const t = title.toLowerCase();
  const i = t.indexOf(b);
  if (i < 0) return false;
  const oldin = i === 0 ? ' ' : t[i - 1]!;
  const keyin = i + b.length >= t.length ? ' ' : t[i + b.length]!;
  return !/[\p{L}\p{N}]/u.test(oldin) && !/[\p{L}\p{N}]/u.test(keyin);
}
