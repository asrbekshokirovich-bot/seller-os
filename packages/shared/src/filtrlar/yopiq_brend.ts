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
 * va **brend darajasidagi yopiqlik** koʻrsatadi: agar sotuv katta
 * boʻlsa-yu, ikki oy davomida hech kim kirmagan boʻlsa va brendning
 * BUTUN assortimenti bitta doʻkonda boʻlsa — demak kira olmaganlar,
 * xohlamaganlar emas.
 *
 * Avval beshinchi signal "sotuvchi rasmiy brend doʻkonimi" edi. U olib
 * tashlandi: Uzum `official` maydonini toʻldirmaydi (turlar.ts ga qarang),
 * shuning uchun u signal hech qachon yonmasdi va butun filtrni oʻlik
 * qilib qoʻyardi. Oʻrniga bazada haqiqatan bor boʻlgan oʻlchov qoʻyildi.
 *
 * "Brend yangi emas" signali IKKI yoʻl bilan isbotlanadi va bittasi
 * yetarli:
 *   1. oʻz tariximiz — sotuvchilar soni 60 kun oʻzgarmagan;
 *   2. brendning sharhlar yigʻindisi — sharh faqat sotuvdan keyin
 *      paydo boʻladi va yoʻqolmaydi, yaʼni orqaga qarab toʻplangan
 *      tarix. Uzum uni birinchi kuniyoq beradi.
 *
 * Ikkinchisi shunchaki "vaqt yoʻq" degani uchun qoʻshilgani yoʻq. U
 * xatoni ham topdi: VITACCI 224 mahsulot / 3 sharh bilan bizning
 * dastlabki roʻyxatimizda "yopiq brend" deb turgan edi. Aslida u yangi
 * brend — yaʼni aynan yaxshi imkoniyat, tuzoq emas.
 *
 * NEGA `sellersCount` SoʻRALMAYDI. Avval "shu tovarni nechta doʻkon
 * sotadi" alohida signal edi. U ortiqcha: filtr brend nomi tovar nomida
 * boʻlishini talab qiladi, demak tovar shu brendniki; brendni ≤2 doʻkon
 * sotsa, uni ham ≤2 doʻkon sotadi. Ikkita saqlangan shart uchinchisini
 * mantiqan keltirib chiqaradi.
 *
 * Bu shunchaki soddalashtirish emas. `sellersCount` doʻkonlar aro tovar
 * moslashni talab qiladi — u hali yoʻq, va u boʻlmagani uchun filtr
 * haqiqiy maʼlumotda hech qachon javob bermasdi.
 *
 * `block` beriladi: bunday tovar tavsiyaga umuman chiqmasligi kerak.
 */
export function yopiqBrend(t: TovarHolati): Flag | Baholanmadi | null {
  const c = THRESHOLDS.closedBrand;

  const missing: string[] = [];
  if (t.brandSellersCount === null) missing.push('brandSellersCount');
  if (t.soldUnits30d === null) missing.push('soldUnits30d');
  if (t.categoryMedianUnits30d === null) missing.push('categoryMedianUnits30d');
  // "Yangi emas" ni ikki yoʻldan biri isbotlaydi. Ikkalasi ham yoʻq
  // boʻlsagina baholay olmaymiz.
  if (t.sellersStableDays === null && t.brandReviews === null) {
    missing.push('sellersStableDays yoki brandReviews');
  }
  if (missing.length) return { kind: 'baholanmadi', missing };

  const sold = t.soldUnits30d as number;
  const median = t.categoryMedianUnits30d as number;

  const brendDokonlari = t.brandSellersCount as number;

  // Brend yangi emas — ikki dalildan biri yetarli.
  const tarixdan = t.sellersStableDays !== null && t.sellersStableDays >= c.stableDays;
  const sharhdan = t.brandReviews !== null && t.brandReviews >= c.minBrandReviews;
  const yangiEmas = tarixdan || sharhdan;
  // Brendning butun assortimenti bir-ikki doʻkonda toʻplangan.
  const brendYopiq = brendDokonlari <= c.maxBrandSellers;
  const brendNomda = brendTovarNomida(t.brand, t.title);
  // Mediana nol boʻlsa boʻlish mumkin emas; bunday turkumda "katta sotuv"
  // degan tushuncha ham yoʻq.
  const kattaSotuv = median > 0 && sold >= median * c.highSalesMultiple;

  const hammasi = yangiEmas && brendYopiq && brendNomda && kattaSotuv;
  if (!hammasi) return null;

  return {
    kind: 'closed_brand',
    severity: 'block',
    reason:
      'Bu brendni faqat egasi sotadi — bu imkoniyat emas, yopiq eshik. ' +
      `Sotuv katta, lekin hech kim kira olmagan: brendning butun ` +
      `assortimentini ${brendDokonlari} ta doʻkon sotadi.`,
    evidence: {
      yangi_emasligi: tarixdan
        ? `sotuvchilar soni ${t.sellersStableDays} kun oʻzgarmagan`
        : `brendda ${t.brandReviews} ta sharh toʻplangan`,
      brendni_sotuvchi_dokonlar: brendDokonlari,
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
