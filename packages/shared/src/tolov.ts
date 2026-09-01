// Toʻlov tizimi — B3 (pilotga tayyor).

// Tarif narxlari (soʻm). Pilot: birinchi oy bepul (trial).
export const TARIF_NARXI: Record<string, number> = {
  pro: 99_000,
  biznes: 299_000,
};

// Toʻlov holatlari
export type TolovHolati = 'kutmoqda' | 'tolangan' | 'rad' | 'qaytarildi';

// Toʻlov provayderi
export type Provayder = 'payme' | 'click' | 'nasiya';

// Toʻlov soʻrovi
export interface TolovSorov {
  userId: string;
  provayder: Provayder;
  reja: 'pro' | 'biznes';
  // Sandbox rejimida haqiqiy pul yechilmaydi.
  sandbox: boolean;
}

// Toʻlov natijasi
export interface TolovNatija {
  paymentId: string;
  // Provayder tomonidan beriladigan URL — foydalanuvchi shu yerga yoʻnaltiriladi.
  checkoutUrl: string | null;
  sandbox: boolean;
}

// Webhook kirishi — provayder yuboradi
export interface WebhookKirishi {
  provayder: Provayder;
  externalId: string;
  holat: TolovHolati;
  summaSom: number;
  // Provayder imzosi — tekshirilmasa webhook soxta boʻlishi mumkin.
  imzo: string;
}

// Dunning holati
export type DunningHolat = 'faol' | 'qayta_urinish' | 'imtiyoz' | 'pasaytirildi';

// Dunning chegaralari (kunlarda)
export const DUNNING = {
  // Birinchi qayta urinish — 1 kun keyin.
  birinchiUrinishKun: 1,
  // Ikkinchi qayta urinish — 3 kun keyin.
  ikkinchiUrinishKun: 3,
  // Uchinchi (oxirgi) qayta urinish — 7 kun keyin.
  uchinchiUrinishKun: 7,
  // Imtiyoz muddati (kun). Shu davomida xizmat ishlaydi, lekin
  // "toʻlov kutilmoqda" deb koʻrsatiladi.
  imtiyozKun: 3,
  // Imtiyozdan keyin yumshoq pasaytirish: pro → bepul. Hech narsa
  // oʻchirilmaydi — faqat qadam cheklanadi.
  maxUrinish: 3,
} as const;

// Dunning qarorini hisoblaydi: hozirgi obuna holatidan keying qadamni chiqaradi.
export function dunningQarori(
  retryCount: number,
  status: string,
  endsAt: string | null,
  hozir: Date,
): DunningHolat {
  // Faol va muddati tugamagan — hech narsa qilish kerak emas.
  if (status === 'active' || status === 'trial') {
    if (endsAt === null) return 'faol';
    if (new Date(endsAt).getTime() > hozir.getTime()) return 'faol';
  }

  // Grace muddatida — hali xizmat ishlaydi, lekin ogohlantirish bor.
  if (status === 'grace') return 'imtiyoz';

  // Qayta urinish chegarasiga yetmagan — yana urinish.
  if (retryCount < DUNNING.maxUrinish) return 'qayta_urinish';

  // Hammasi tugadi — yumshoq pasaytirish.
  return 'pasaytirildi';
}

// Keyingi qayta urinish vaqtini hisoblaydi.
export function keyingiUrinish(retryCount: number, hozir: Date): Date {
  const kunlar = retryCount === 0
    ? DUNNING.birinchiUrinishKun
    : retryCount === 1
      ? DUNNING.ikkinchiUrinishKun
      : DUNNING.uchinchiUrinishKun;
  const vaqt = new Date(hozir);
  vaqt.setDate(vaqt.getDate() + kunlar);
  return vaqt;
}

// Payme imzosini tekshiradi (sandbox rejimi).
// Haqiqiy imzo provayderdan olindi va muhit oʻzgaruvchisida turadi.
export function imzoTekshir(
  _provayder: Provayder,
  _tana: string,
  imzo: string,
  maxfiyKalit: string,
): boolean {
  // Sandbox rejimida imzo "test" boʻladi.
  if (imzo === 'test' && maxfiyKalit === 'test') return true;
  // Haqiqiy imzo — HMAC SHA-256. Provayder hujjatiga qarab.
  // Hozircha faqat sandbox tayyor.
  return false;
}
