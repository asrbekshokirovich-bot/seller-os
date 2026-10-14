/**
 * PAYME MERCHANT API — Payme bizni chaqiradi (JSON-RPC 2.0). Nazoratchi
 * (2026-10-14): "149 000 soʻm/oy, faqat Payme/Click".
 *
 * Hujjat: developer.help.paycom.uz — «Протокол Merchant API», «Методы Merchant API».
 *  - Javob DOIM HTTP 200; xato — `error: {code, message: {ru, uz, en}, data?}`.
 *  - Avtorizatsiya: `Authorization: Basic base64(login:kalit)` — kassa kaliti
 *    (sinovda TEST_KEY). Login tekshirilmaydi: sir — kalit.
 *  - Summa — TIYIN. Buyurtma — `account.order_id` (`payments.id`).
 *  - 12 soatlik muddat, takroriy soʻrovlar va obuna — bazada (0067): bu modul
 *    soʻrovni tekshiradi va baza javobini Payme tiliga oʻgiradi.
 */

type Rpc = <T>(nom: string, arg: Record<string, unknown>) => Promise<T | null>;

export interface PaymeSozlama {
  /** Kassa kaliti (jonli KEY yoki sinov TEST_KEY). `null` — ulanmagan: hamma soʻrov rad. */
  kalit: string | null;
  /**
   * Fiskal chek (`detail`) — IKPU va qadoq kodi berilsa (buxgalter aytadi).
   * Berilmasa — `detail` yuborilmaydi.
   */
  chek?: { ikpu: string; paketKodi: string; qqsFoiz: number; nom: string } | null;
}

export interface PaymeXato {
  code: number;
  message: { ru: string; uz: string; en: string };
  data?: string;
}

export interface PaymeJavob {
  id: unknown;
  result?: Record<string, unknown>;
  error?: PaymeXato;
}

/** Kod va uch tildagi xabar. -31050…-31099 — buyurtma (account) xatolari: `data` — maydon nomi. */
const XATO: Record<string, [number, string, string, string]> = {
  parse: [-32700, 'Ошибка разбора JSON', 'JSON oʻqilmadi', 'JSON parse error'],
  avtorizatsiya: [-32504, 'Недостаточно привилегий', 'Ruxsat yoʻq', 'Insufficient privileges'],
  sorov: [-32600, 'Неверный запрос', 'Soʻrov notoʻgʻri', 'Invalid request'],
  metod: [-32601, 'Метод не найден', 'Metod topilmadi', 'Method not found'],
  tizim: [-32400, 'Системная ошибка', 'Tizim xatosi', 'System error'],
  summa: [-31001, 'Неверная сумма', 'Summa notoʻgʻri', 'Incorrect amount'],
  topilmadi: [-31003, 'Транзакция не найдена', 'Tranzaksiya topilmadi', 'Transaction not found'],
  holat: [-31008, 'Невозможно выполнить операцию', 'Amalni bajarib boʻlmaydi', 'Unable to perform operation'],
  buyurtma_yoq: [-31050, 'Заказ не найден', 'Buyurtma topilmadi', 'Order not found'],
  buyurtma_yopiq: [-31051, 'Заказ уже оплачен или отменён', 'Buyurtma toʻlangan yoki bekor qilingan', 'Order already paid or cancelled'],
  band: [-31052, 'Заказ ожидает оплаты другой транзакцией', 'Buyurtma boshqa toʻlovni kutmoqda', 'Order is awaiting another transaction'],
};

function xato(id: unknown, kalit: string, data?: string): PaymeJavob {
  const [code, ru, uz, en] = XATO[kalit] ?? XATO.tizim!;
  return { id, error: { code, message: { ru, uz, en }, ...(data !== undefined ? { data } : {}) } };
}

/** Bazadagi sabab → Payme xatosi. CreateTransaction da «band» — -31008 (Payme sinov sahifasi shuni kutadi). */
function bazaXatosi(id: unknown, sabab: string, metod: 'tekshir' | 'yarat'): PaymeJavob {
  if (sabab === 'band' && metod === 'yarat') return xato(id, 'holat');
  if (sabab === 'buyurtma_yoq' || sabab === 'buyurtma_yopiq' || sabab === 'band') return xato(id, sabab, 'order_id');
  if (sabab === 'summa' || sabab === 'holat' || sabab === 'topilmadi') return xato(id, sabab);
  return xato(id, 'tizim');
}

/** `Basic base64(login:kalit)` — kalit qismi teng boʻlsa. */
function ruxsatBor(sarlavha: string | null, kalit: string): boolean {
  const m = /^Basic\s+([A-Za-z0-9+/=]+)$/u.exec((sarlavha ?? '').trim());
  if (!m) return false;
  let ochiq: string;
  try { ochiq = atob(m[1]!); } catch { return false; }
  const i = ochiq.indexOf(':');
  return i >= 0 && ochiq.slice(i + 1) === kalit;
}

const butun = (x: unknown): number | null => (typeof x === 'number' && Number.isSafeInteger(x) ? x : null);
const musbat = (x: unknown): number | null => { const n = butun(x); return n !== null && n > 0 ? n : null; };

/** `account.order_id` → buyurtma raqami (`payments.id`). */
function buyurtmaRaqami(account: unknown): number | null {
  if (account === null || typeof account !== 'object') return null;
  const v = (account as Record<string, unknown>).order_id;
  const s = typeof v === 'number' ? String(v) : typeof v === 'string' ? v.trim() : '';
  if (!/^\d{1,15}$/u.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
}

const tid = (x: unknown): string | null => (typeof x === 'string' && x.length > 0 && x.length <= 64 ? x : null);

/**
 * Bitta Payme soʻrovi. `tana` — xom matn (JSON boʻlmasligi ham mumkin),
 * `sarlavha` — Payme yuborgan `Authorization`. Javob — HTTP 200 da qaytariladi.
 */
export async function paymeIshla(rpc: Rpc, sarlavha: string | null, tana: string, s: PaymeSozlama): Promise<PaymeJavob> {
  let o: Record<string, unknown> | null;
  try {
    const x: unknown = JSON.parse(tana);
    o = x !== null && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : null;
  } catch {
    return s.kalit && ruxsatBor(sarlavha, s.kalit) ? xato(null, 'parse') : xato(null, 'avtorizatsiya');
  }
  const id = o?.id ?? null;
  if (!s.kalit || !ruxsatBor(sarlavha, s.kalit)) return xato(id, 'avtorizatsiya');
  if (o === null || typeof o.method !== 'string' || o.params === null || typeof o.params !== 'object') return xato(id, 'sorov');
  const p = o.params as Record<string, unknown>;

  switch (o.method) {
    case 'CheckPerformTransaction': {
      const summa = musbat(p.amount);
      if (summa === null) return xato(id, 'summa');
      const buyurtma = buyurtmaRaqami(p.account);
      if (buyurtma === null) return xato(id, 'buyurtma_yoq', 'order_id');
      const r = await rpc<{ ok?: boolean; xato?: string }>('so_payme_tekshir', { p_buyurtma: buyurtma, p_summa_tiyin: summa });
      if (r === null) return xato(id, 'tizim');
      if (r.xato) return bazaXatosi(id, r.xato, 'tekshir');
      return { id, result: { allow: true, ...(s.chek ? { detail: chekTafsiloti(s.chek, summa) } : {}) } };
    }
    case 'CreateTransaction': {
      const t = tid(p.id);
      const vaqt = butun(p.time);
      if (t === null || vaqt === null) return xato(id, 'sorov');
      const summa = musbat(p.amount);
      if (summa === null) return xato(id, 'summa');
      const buyurtma = buyurtmaRaqami(p.account);
      if (buyurtma === null) return xato(id, 'buyurtma_yoq', 'order_id');
      const r = await rpc<{ xato?: string; create_time?: number; transaction?: string; state?: number }>(
        'so_payme_yarat', { p_id: t, p_time: vaqt, p_summa_tiyin: summa, p_buyurtma: buyurtma });
      if (r === null) return xato(id, 'tizim');
      if (r.xato) return bazaXatosi(id, r.xato, 'yarat');
      return { id, result: { create_time: r.create_time, transaction: r.transaction, state: r.state } };
    }
    case 'PerformTransaction':
    case 'CheckTransaction': {
      const t = tid(p.id);
      if (t === null) return xato(id, 'sorov');
      const r = await rpc<Record<string, unknown> & { xato?: string }>(
        o.method === 'PerformTransaction' ? 'so_payme_bajar' : 'so_payme_holat', { p_id: t });
      if (r === null) return xato(id, 'tizim');
      if (r.xato) return bazaXatosi(id, r.xato, 'tekshir');
      return { id, result: r };
    }
    case 'CancelTransaction': {
      const t = tid(p.id);
      const sabab = butun(p.reason);
      if (t === null || sabab === null) return xato(id, 'sorov');
      const r = await rpc<Record<string, unknown> & { xato?: string }>('so_payme_bekor', { p_id: t, p_sabab: sabab });
      if (r === null) return xato(id, 'tizim');
      if (r.xato) return bazaXatosi(id, r.xato, 'tekshir');
      return { id, result: r };
    }
    case 'GetStatement': {
      const dan = butun(p.from);
      const gacha = butun(p.to);
      if (dan === null || gacha === null) return xato(id, 'sorov');
      const r = await rpc<{ transactions?: unknown[] }>('so_payme_royxat', { p_dan: dan, p_gacha: gacha });
      if (r === null || !Array.isArray(r.transactions)) return xato(id, 'tizim');
      return { id, result: { transactions: r.transactions } };
    }
    // Kassa kaliti faqat Supabase sirida turadi — Payme uni API orqali almashtira olmaydi.
    case 'ChangePassword':
      return xato(id, 'avtorizatsiya');
    default:
      return { id, error: { ...xato(id, 'metod').error!, data: o.method } };
  }
}

/** Fiskal chek: bitta qator — obuna, 1 dona, summa toʻliq. */
function chekTafsiloti(c: NonNullable<PaymeSozlama['chek']>, summaTiyin: number): Record<string, unknown> {
  return {
    receipt_type: 0,
    items: [{ title: c.nom, price: summaTiyin, count: 1, code: c.ikpu, package_code: c.paketKodi, vat_percent: c.qqsFoiz }],
  };
}

/**
 * Payme toʻlov sahifasi (GET): `<host>/base64("m=…;ac.order_id=…;a=…;l=…;c=…")`.
 * Sinovda — test.paycom.uz. Qaytish manzilida `;` boʻlsa u qoʻshilmaydi (ajratgich).
 */
export function paymeCheckoutUrl(k: {
  merchantId: string; buyurtma: number; summaTiyin: number; qaytish: string | null; sinov: boolean; til?: 'uz' | 'ru';
}): string {
  const q = [`m=${k.merchantId}`, `ac.order_id=${k.buyurtma}`, `a=${k.summaTiyin}`, `l=${k.til ?? 'uz'}`];
  if (k.qaytish && !k.qaytish.includes(';')) q.push(`c=${k.qaytish}`);
  return `${k.sinov ? 'https://test.paycom.uz' : 'https://checkout.paycom.uz'}/${btoa(q.join(';'))}`;
}
