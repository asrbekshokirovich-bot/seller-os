// Payme Subscribe integratsiyasi.
//
// Oqim:
//   1. `/tolov/boshla` → paymeCheckoutUrl() → Payme checkout sahifasi URL
//   2. Mijoz karta maʼlumotini kiritadi → Payme toʻlovni yechadi
//   3. Payme webhook yuboradi → `/tolov/webhook` → paymeWebhookTekshir()
//
// Muhit oʻzgaruvchilari:
//   PAYME_MERCHANT_ID  — Payme bergan merchant identifikatori
//   PAYME_MERCHANT_KEY — Webhook imzosini tekshirish uchun maxfiy kalit
//   PAYMENTS_LIVE      — "1" boʻlsa jonli, aks holda sandbox
//
// Hujjat: https://developer.help.paycom.uz

import { createHmac } from 'node:crypto';

const PAYME_CHECKOUT_LIVE = 'https://checkout.paycom.uz';
const PAYME_CHECKOUT_TEST = 'https://checkout.test.paycom.uz';

interface PaymeCheckoutParams {
  merchantId: string;
  paymentId: number;
  summaTiyin: number;
  sandbox: boolean;
  returnUrl?: string | undefined;
}

// Payme checkout URL yasaydi.
//
// Payme checkout sahifasi Base64-kodlangan parametrlarni qabul qiladi.
// Mijoz shu URL ga yoʻnaltiriladi va karta maʼlumotini kiritadi.
export function paymeCheckoutUrl(p: PaymeCheckoutParams): string {
  const host = p.sandbox ? PAYME_CHECKOUT_TEST : PAYME_CHECKOUT_LIVE;

  const params: Record<string, string> = {
    m: p.merchantId,
    // Payme summa TIYINDA kutadi (1 soʻm = 100 tiyin).
    'ac.payment_id': String(p.paymentId),
    a: String(p.summaTiyin),
  };

  if (p.returnUrl) {
    params['ct'] = '15000';
    params['cr'] = p.returnUrl;
  }

  const encoded = Buffer.from(
    Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join(';'),
  ).toString('base64');

  return `${host}/${encoded}`;
}

// Payme webhook imzosini tekshiradi.
//
// Payme webhook soʻrovlari Basic Auth bilan keladi:
//   Authorization: Basic base64("Paycom:" + merchantKey)
//
// Bu funksiya Authorization headerini tekshiradi.
export function paymeWebhookTekshir(
  authHeader: string | undefined,
  merchantKey: string,
): boolean {
  if (!authHeader || !authHeader.startsWith('Basic ')) return false;

  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
  // Format: "Paycom:{merchantKey}"
  const [login, key] = decoded.split(':');
  if (login !== 'Paycom') return false;

  return key === merchantKey;
}

// Payme webhook tanasidan holat va payment_id ajratadi.
//
// Payme JSON-RPC formatida yuboradi:
//   { method: "...", params: { account: { payment_id: "..." }, ... } }
//
// Toʻlov holatlari:
//   PerformTransaction → toʻlov muvaffaqiyatli (tolangan)
//   CancelTransaction  → bekor qilingan (qaytarildi)
//   CreateTransaction  → yaratilgan (hali yechilmagan — kutmoqda)
export function paymeWebhookParse(tana: Record<string, unknown>): {
  paymentId: number;
  holat: 'kutmoqda' | 'tolangan' | 'qaytarildi';
  externalId: string | null;
  rpcId: unknown;
  method: string;
} | null {
  const method = tana.method as string | undefined;
  if (!method) return null;

  const params = tana.params as Record<string, unknown> | undefined;
  if (!params) return null;

  const account = params.account as Record<string, unknown> | undefined;
  const paymentId = Number(account?.payment_id ?? params?.payment_id);
  if (!Number.isInteger(paymentId) || paymentId <= 0) return null;

  const externalId = (params.id as string) ?? null;

  let holat: 'kutmoqda' | 'tolangan' | 'qaytarildi';
  switch (method) {
    case 'PerformTransaction':
      holat = 'tolangan';
      break;
    case 'CancelTransaction':
      holat = 'qaytarildi';
      break;
    case 'CreateTransaction':
    case 'CheckPerformTransaction':
    case 'CheckTransaction':
      holat = 'kutmoqda';
      break;
    default:
      holat = 'kutmoqda';
  }

  return { paymentId, holat, externalId, rpcId: tana.id, method };
}

// Payme webhook ga JSON-RPC javob formatlaydi.
export function paymeJavob(rpcId: unknown, natija: Record<string, unknown>): Record<string, unknown> {
  return { jsonrpc: '2.0', id: rpcId, result: natija };
}

export function paymeXato(rpcId: unknown, code: number, message: string): Record<string, unknown> {
  return { jsonrpc: '2.0', id: rpcId, error: { code, message: { uz: message, ru: message, en: message } } };
}

// Payme Subscribe uchun karta tokenidan pul yechish (oylik avtomatik).
//
// Bu funksiya hozircha TAYYORLAB QOʻYILGAN — haqiqiy Subscribe API
// merchant akkaunti tasdiqlangandan keyin yoqiladi.
//
// Subscribe oqimi:
//   1. Birinchi toʻlov — checkout orqali (yuqoridagi URL)
//   2. Payme karta tokenini saqlaydi
//   3. Har oyda backend `receipts.create` + `receipts.pay` chaqiradi
//      (merchant_key bilan autentifikatsiya)
//
// Hozir faqat checkout oqimi tayyor. Subscribe (avtomatik yechish)
// merchant key kelgach qoʻshiladi.
export async function paymeSubscribeYechish(p: {
  merchantId: string;
  merchantKey: string;
  paymentId: number;
  summaTiyin: number;
  sandbox: boolean;
}): Promise<{ ok: boolean; xato?: string; transactionId?: string }> {
  const host = p.sandbox ? PAYME_CHECKOUT_TEST : PAYME_CHECKOUT_LIVE;
  const auth = Buffer.from(`Paycom:${p.merchantKey}`).toString('base64');

  // 1. Receipt yaratish
  const receiptJavob = await fetch(`${host}/api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify({
      id: Date.now(),
      method: 'receipts.create',
      params: {
        amount: p.summaTiyin,
        account: { payment_id: String(p.paymentId) },
      },
    }),
  });

  const receiptData = await receiptJavob.json() as Record<string, unknown>;
  if (receiptData.error) {
    return { ok: false, xato: `Payme receipt xatosi: ${JSON.stringify(receiptData.error)}` };
  }

  const result = receiptData.result as Record<string, unknown> | undefined;
  const receiptId = result?._id as string | undefined;
  if (!receiptId) {
    return { ok: false, xato: 'Payme receipt ID topilmadi' };
  }

  // 2. Receipt ni toʻlash (karta tokeni bilan)
  const payJavob = await fetch(`${host}/api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify({
      id: Date.now(),
      method: 'receipts.pay',
      params: { id: receiptId },
    }),
  });

  const payData = await payJavob.json() as Record<string, unknown>;
  if (payData.error) {
    return { ok: false, xato: `Payme tolov xatosi: ${JSON.stringify(payData.error)}` };
  }

  return { ok: true, transactionId: receiptId };
}

// HMAC-SHA1 imzo hisoblash (ba'zi Payme endpointlari uchun).
export function paymeHmac(data: string, key: string): string {
  return createHmac('sha1', key).update(data).digest('hex');
}
