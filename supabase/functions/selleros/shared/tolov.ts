// Toʻlov tizimi — B3 (pilotga tayyor), B5 (yillik tarif).

import { clickCheckoutUrl } from './tolov-click.ts';
import { paymeCheckoutUrl, type PaymeSozlama } from './tolov-payme.ts';

// Obuna narxi, soʻm/oy. Nazoratchi (2026-10-14): bitta reja — 149 000 soʻm/oy;
// 1–5-qadamlar bepul, 6–12-qadamlar obuna bilan (`tarif.ts`).
export const OBUNA_NARXI = 149_000;
/** Bir toʻlov — shuncha kun obuna. */
export const OBUNA_KUN = 30;

// Sotiladigan reja bitta — `pro` («Obuna»). Bazadagi eski `biznes` qatori ham
// yoʻlni ochadi (`tarif.ts`), lekin u sotilmaydi.
export const TARIF_NARXI: Record<string, number> = {
  pro: OBUNA_NARXI,
};

// Yillik tarif hozir SOTILMAYDI: nazoratchi (2026-10-14) faqat oylik narx berdi.
// Eski yillik narxlar (990 000 / 2 990 000) 99 000 lik oylikdan hisoblangan edi.
export const YILLIK_NARX: Record<string, number> = {};

export const YILLIK_TEJASH_OY = 2;

// Toʻlov summasidan obuna muddatini aniqlaydi (kun).
export function obunaMuddati(summaSom: number): number {
  const yillikNarxlar = Object.values(YILLIK_NARX);
  if (yillikNarxlar.includes(summaSom)) return 365;
  return 30;
}

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

// Provayder imzosini tekshiradi.
//
// Payme: Basic Auth (Paycom:{key}) — backend/payme.ts da tekshiriladi.
// Click: MD5 hash — backend/click.ts da tekshiriladi.
//
// Bu funksiya umumiy tekshiruv — sandbox va eski format uchun.
export function imzoTekshir(
  _provayder: Provayder,
  _tana: string,
  imzo: string,
  maxfiyKalit: string,
): boolean {
  if (imzo === 'test' && maxfiyKalit === 'test') return true;
  return imzo === maxfiyKalit;
}

// ---------------------------------------------------------------- Payme va Click (0067, 2026-10-14)

type Rpc = <T>(nom: string, arg: Record<string, unknown>) => Promise<T | null>;

/** Toʻlov sozlamalari — muhit oʻzgaruvchilaridan (Supabase sirlari; nazoratchi kiritadi). Yoʻq — `null`. */
export interface TolovSozlamasi {
  /** `PAYMENTS_LIVE=1` — jonli; aks holda sinov (Payme — test.paycom.uz va TEST_KEY). */
  jonli: boolean;
  /** Toʻlovdan keyin qaytish manzili (`TOLOV_QAYTISH_URL`). */
  qaytish: string;
  payme: { merchantId: string | null; kalit: string | null; chek: NonNullable<PaymeSozlama['chek']> | null };
  click: { xizmatId: string | null; merchantId: string | null; maxfiyKalit: string | null };
}

export function tolovSozlamasi(env: (k: string) => string | undefined): TolovSozlamasi {
  const e = (k: string): string | null => {
    const v = env(k)?.trim();
    return v ? v : null;
  };
  const jonli = e('PAYMENTS_LIVE') === '1';
  const ikpu = e('PAYME_IKPU');
  const paketKodi = e('PAYME_PAKET_KODI');
  return {
    jonli,
    qaytish: e('TOLOV_QAYTISH_URL') ?? 'https://zumsavdo.vercel.app/usta',
    payme: {
      merchantId: e('PAYME_MERCHANT_ID'),
      kalit: jonli ? e('PAYME_KEY') : e('PAYME_TEST_KEY'),
      chek: ikpu && paketKodi
        ? { ikpu, paketKodi, qqsFoiz: Number(e('PAYME_QQS_FOIZ') ?? '0') || 0, nom: 'ZumSavdo obunasi — 1 oy' }
        : null,
    },
    click: { xizmatId: e('CLICK_SERVICE_ID'), merchantId: e('CLICK_MERCHANT_ID'), maxfiyKalit: e('CLICK_SECRET_KEY') },
  };
}

/**
 * Obuna toʻlovini boshlash: buyurtma (`so_tolov_buyurtma`, 0067) va provayder sahifasi
 * manzili. Narx — `OBUNA_NARXI`, mijoz bermaydi. Provayder sozlanmagan boʻlsa — 503
 * «toʻlov ulanmagan», buyurtma yozilmaydi. Click — faqat jonli rejimda: uning sinov
 * muhiti yoʻq, sahifasida haqiqiy pul yechiladi.
 */
export async function tolovniBoshla(
  rpc: Rpc, token: string, provayder: unknown, s: TolovSozlamasi,
): Promise<{ status: number; tana: Record<string, unknown> }> {
  if (provayder !== 'payme' && provayder !== 'click') return { status: 400, tana: { xato: 'notanish provayder' } };
  const tayyor = provayder === 'payme'
    ? s.payme.merchantId !== null && s.payme.kalit !== null
    : s.jonli && s.click.xizmatId !== null && s.click.merchantId !== null && s.click.maxfiyKalit !== null;
  if (!tayyor) return { status: 503, tana: { xato: 'toʻlov ulanmagan' } };
  const b = await rpc<{ xato?: string; id?: number }>('so_tolov_buyurtma', {
    p_token: token, p_provayder: provayder, p_reja: 'pro', p_summa_som: OBUNA_NARXI, p_kun: OBUNA_KUN, p_sandbox: !s.jonli,
  });
  if (b === null) return { status: 503, tana: { xato: 'baza javob bermadi' } };
  if (b.xato || typeof b.id !== 'number') {
    return { status: /sessiya/u.test(b.xato ?? '') ? 401 : 400, tana: { xato: b.xato ?? 'buyurtma yozilmadi' } };
  }
  const checkoutUrl = provayder === 'payme'
    ? paymeCheckoutUrl({ merchantId: s.payme.merchantId!, buyurtma: b.id, summaTiyin: OBUNA_NARXI * 100, qaytish: s.qaytish, sinov: !s.jonli })
    : clickCheckoutUrl({ xizmatId: s.click.xizmatId!, merchantId: s.click.merchantId!, buyurtma: b.id, summaSom: OBUNA_NARXI, qaytish: s.qaytish });
  return { status: 200, tana: { checkoutUrl, buyurtma: b.id, sinov: !s.jonli } };
}
