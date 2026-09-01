// Click card_token integratsiyasi.
//
// Oqim:
//   1. `/tolov/boshla` → clickCheckoutUrl() → Click checkout sahifasi URL
//   2. Mijoz karta maʼlumotini kiritadi
//   3. Click ikkita webhook yuboradi:
//      a) Prepare — toʻlovni tayyorlash (baza tekshiruvi)
//      b) Complete — toʻlov yakunlandi
//   4. `/tolov/webhook/click` → clickImzoTekshir() → baza yangilanadi
//
// Muhit oʻzgaruvchilari:
//   CLICK_SERVICE_ID  — Click bergan xizmat identifikatori
//   CLICK_MERCHANT_ID — Click bergan merchant identifikatori
//   CLICK_SECRET_KEY  — Webhook imzosini tekshirish uchun maxfiy kalit
//   PAYMENTS_LIVE     — "1" boʻlsa jonli, aks holda sandbox
//
// Hujjat: https://docs.click.uz

import { createHash } from 'node:crypto';

const CLICK_CHECKOUT = 'https://my.click.uz/services/pay';

interface ClickCheckoutParams {
  serviceId: string;
  merchantId: string;
  paymentId: number;
  summaSom: number;
  returnUrl?: string | undefined;
}

// Click checkout URL yasaydi.
//
// Mijoz shu URL ga yoʻnaltiriladi — Click oʻz sahifasida karta
// maʼlumotini soʻraydi. Toʻlov tugagach `return_url` ga qaytaradi.
export function clickCheckoutUrl(p: ClickCheckoutParams): string {
  const params = new URLSearchParams({
    service_id: p.serviceId,
    merchant_id: p.merchantId,
    amount: String(p.summaSom),
    transaction_param: String(p.paymentId),
  });

  if (p.returnUrl) {
    params.set('return_url', p.returnUrl);
  }

  return `${CLICK_CHECKOUT}?${params.toString()}`;
}

// Click webhook imzosini tekshiradi.
//
// Click har bir webhook soʻrovida `sign_string` yuboradi:
//   MD5(click_trans_id + service_id + secret_key + merchant_trans_id + amount + action + sign_time)
//
// `action`: 0 = prepare, 1 = complete
export function clickImzoTekshir(
  params: ClickWebhookTana,
  secretKey: string,
): boolean {
  const hashInput = [
    params.click_trans_id,
    params.service_id,
    secretKey,
    params.merchant_trans_id,
    params.amount,
    params.action,
    params.sign_time,
  ].join('');

  const kutilgan = createHash('md5').update(hashInput).digest('hex');
  return kutilgan === params.sign_string;
}

// Click webhook tanasi.
//
// Click ikkita bosqichda webhook yuboradi:
//   action=0 (Prepare) — toʻlovni tekshirish, tayyorlash
//   action=1 (Complete) — toʻlov yakunlandi
export interface ClickWebhookTana {
  click_trans_id: number;
  service_id: number;
  click_paydoc_id: number;
  merchant_trans_id: string;
  amount: number;
  action: number;
  error: number;
  error_note: string;
  sign_time: string;
  sign_string: string;
  merchant_prepare_id?: number;
}

// Click webhook tanasidan holat va payment_id ajratadi.
export function clickWebhookParse(tana: ClickWebhookTana): {
  paymentId: number;
  holat: 'kutmoqda' | 'tolangan' | 'rad';
  externalId: string;
  action: 'prepare' | 'complete';
} | null {
  const paymentId = Number(tana.merchant_trans_id);
  if (!Number.isInteger(paymentId) || paymentId <= 0) return null;

  const externalId = String(tana.click_trans_id);
  const action = tana.action === 0 ? 'prepare' as const : 'complete' as const;

  let holat: 'kutmoqda' | 'tolangan' | 'rad';

  if (tana.error !== 0 && tana.error !== undefined) {
    holat = 'rad';
  } else if (action === 'complete') {
    holat = 'tolangan';
  } else {
    holat = 'kutmoqda';
  }

  return { paymentId, holat, externalId, action };
}

// Click Prepare javob formati.
export function clickPrepareJavob(p: {
  clickTransId: number;
  merchantTransId: string;
  merchantPrepareId: number;
  error: number;
  errorNote: string;
}): Record<string, unknown> {
  return {
    click_trans_id: p.clickTransId,
    merchant_trans_id: p.merchantTransId,
    merchant_prepare_id: p.merchantPrepareId,
    error: p.error,
    error_note: p.errorNote,
  };
}

// Click Complete javob formati.
export function clickCompleteJavob(p: {
  clickTransId: number;
  merchantTransId: string;
  merchantConfirmId: number;
  error: number;
  errorNote: string;
}): Record<string, unknown> {
  return {
    click_trans_id: p.clickTransId,
    merchant_trans_id: p.merchantTransId,
    merchant_confirm_id: p.merchantConfirmId,
    error: p.error,
    error_note: p.errorNote,
  };
}

// Click xato kodlari.
export const CLICK_XATO = {
  MUVAFFAQIYAT: 0,
  IMZO_XATO: -1,
  SUMMA_XATO: -2,
  ACTION_XATO: -3,
  ALLAQACHON_TOLANGAN: -4,
  FOYDALANUVCHI_TOPILMADI: -5,
  TRANZAKSIYA_TOPILMADI: -6,
  TOLOV_XATO: -7,
  BEKOR: -9,
} as const;
