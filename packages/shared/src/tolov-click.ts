/**
 * CLICK SHOP API — Click bizni chaqiradi: Prepare (`action=0`) va Complete
 * (`action=1`), `application/x-www-form-urlencoded`; javob — JSON. Nazoratchi
 * (2026-10-14): "149 000 soʻm/oy, faqat Payme/Click".
 *
 * Hujjat: docs.click.uz — «SHOP API: requests», «errors».
 *  - Imzo: md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id
 *    [+ merchant_prepare_id — faqat Complete da] + amount + action + sign_time).
 *    `amount` — Click yuborgan XOM matn (rasmiy namunadagidek).
 *  - `merchant_trans_id` — buyurtma raqami (`payments.id`); `merchant_prepare_id` —
 *    bizning tranzaksiya raqamimiz (butun son).
 *  - Takroriy soʻrovlar, summa tekshiruvi va obuna — bazada (0067).
 */

type Rpc = <T>(nom: string, arg: Record<string, unknown>) => Promise<T | null>;

export interface ClickSozlama {
  /** `service_id` (Click kabineti). `null` — ulanmagan. */
  xizmatId: string | null;
  /** `SECRET_KEY` (Click kabineti). `null` — ulanmagan. */
  maxfiyKalit: string | null;
}

export interface ClickJavob {
  click_trans_id?: string;
  merchant_trans_id?: string;
  merchant_prepare_id?: number;
  merchant_confirm_id?: number;
  error: number;
  error_note: string;
}

/** Click xato kodlari (docs.click.uz/shop-api/errors) — matni rasmiy. */
const IZOH: Record<number, string> = {
  0: 'Success',
  [-1]: 'SIGN CHECK FAILED!',
  [-2]: 'Incorrect parameter amount',
  [-3]: 'Action not found',
  [-4]: 'Already paid',
  [-5]: 'User does not exist',
  [-6]: 'Transaction does not exist',
  [-7]: 'Failed to update user',
  [-8]: 'Error in request from click',
  [-9]: 'Transaction cancelled',
};

/** Baza sababi → Click xato kodi. */
const BAZA_KODI: Record<string, number> = {
  buyurtma_yoq: -5, summa: -2, tolangan: -4, bekor: -9, band: -8, tranzaksiya_yoq: -6,
};

/** Soʻm matni ("149000", "149000.00") → tiyin. Ikki xonadan koʻp kasr yoki manfiy — `null`. */
function tiyinga(summa: string): number | null {
  const m = /^(\d{1,12})(?:\.(\d{1,2}))?$/u.exec(summa);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
}

const raqam = (x: string | null): number | null => (x !== null && /^\d{1,15}$/u.test(x) ? Number(x) : null);

/** Bitta Click soʻrovi (Prepare yoki Complete). Javob — HTTP 200, JSON. */
export async function clickIshla(rpc: Rpc, forma: URLSearchParams, s: ClickSozlama): Promise<ClickJavob> {
  const ol = (k: string): string | null => forma.get(k);
  const clickId = ol('click_trans_id') ?? '';
  const buyurtmaMatn = ol('merchant_trans_id') ?? '';
  const javob = (error: number, qosh: Partial<ClickJavob> = {}): ClickJavob => ({
    click_trans_id: clickId, merchant_trans_id: buyurtmaMatn, ...qosh, error, error_note: IZOH[error] ?? IZOH[-8]!,
  });

  if (!s.xizmatId || !s.maxfiyKalit) return javob(-8);
  const amal = ol('action');
  if (amal !== '0' && amal !== '1') return javob(-3);
  const summaMatn = ol('amount');
  const vaqt = ol('sign_time');
  const imzo = ol('sign_string');
  const xizmat = ol('service_id');
  const tayyorId = ol('merchant_prepare_id');
  if (summaMatn === null || vaqt === null || imzo === null || xizmat === null || (amal === '1' && tayyorId === null)) return javob(-8);

  const kutilgan = md5(clickId + xizmat + s.maxfiyKalit + buyurtmaMatn + (amal === '1' ? tayyorId : '') + summaMatn + amal + vaqt);
  if (imzo.toLowerCase() !== kutilgan || xizmat !== s.xizmatId) return javob(-1);

  const summa = tiyinga(summaMatn);
  if (summa === null || summa <= 0) return javob(-2);
  const click = raqam(clickId);
  if (click === null) return javob(-8);
  const buyurtma = raqam(buyurtmaMatn);
  if (buyurtma === null) return javob(-5);
  const clickXato = Number(ol('error') ?? '0');

  if (amal === '0') {
    // Click oʻz tomonida xato bilan yuborsa — tayyorlanmaydi.
    if (clickXato < 0) return javob(-9);
    const r = await rpc<{ prepare_id?: number; xato?: string }>('so_click_tayyorla', { p_click_id: click, p_buyurtma: buyurtma, p_summa_tiyin: summa });
    if (r === null) return javob(-7);
    if (r.xato || typeof r.prepare_id !== 'number') return javob(BAZA_KODI[r.xato ?? ''] ?? -7);
    return javob(0, { merchant_prepare_id: r.prepare_id });
  }

  const tayyor = raqam(tayyorId);
  if (tayyor === null) return javob(-6);
  const r = await rpc<{ confirm_id?: number; xato?: string }>('so_click_yakunla', {
    p_click_id: click, p_prepare_id: tayyor, p_buyurtma: buyurtma, p_summa_tiyin: summa,
    p_click_xato: Number.isFinite(clickXato) ? Math.trunc(clickXato) : 0,
  });
  if (r === null) return javob(-7);
  if (r.xato || typeof r.confirm_id !== 'number') return javob(BAZA_KODI[r.xato ?? ''] ?? -7);
  return javob(0, { merchant_confirm_id: r.confirm_id });
}

/** Click toʻlov sahifasi: my.click.uz/services/pay — `transaction_param` — buyurtma raqami. */
export function clickCheckoutUrl(k: { xizmatId: string; merchantId: string; buyurtma: number; summaSom: number; qaytish: string | null }): string {
  const q = new URLSearchParams({
    service_id: k.xizmatId, merchant_id: k.merchantId, amount: `${k.summaSom}.00`, transaction_param: String(k.buyurtma),
  });
  if (k.qaytish) q.set('return_url', k.qaytish);
  return `https://my.click.uz/services/pay?${q.toString()}`;
}

/**
 * MD5 (RFC 1321), kichik harfli hex. Edge (Deno) WebCrypto da MD5 yoʻq, `node:crypto`
 * esa brauzer toʻplamiga tushmasin (`@selleros/shared` sahifada ham ishlatiladi).
 */
export function md5(matn: string): string {
  const b = new TextEncoder().encode(matn);
  const bloklar = ((b.length + 8) >>> 6) + 1;
  const w = new Uint32Array(bloklar * 16);
  for (let i = 0; i < b.length; i++) w[i >> 2] = (w[i >> 2] ?? 0) | (b[i]! << ((i % 4) * 8));
  w[b.length >> 2] = (w[b.length >> 2] ?? 0) | (0x80 << ((b.length % 4) * 8));
  w[bloklar * 16 - 2] = (b.length * 8) >>> 0;
  w[bloklar * 16 - 1] = Math.floor((b.length * 8) / 0x100000000);
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let blok = 0; blok < bloklar; blok++) {
    let a = a0, bb = b0, c = c0, d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) { f = (bb & c) | (~bb & d); g = i; }
      else if (i < 32) { f = (d & bb) | (~d & c); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = bb ^ c ^ d; g = (3 * i + 5) % 16; }
      else { f = c ^ (bb | ~d); g = (7 * i) % 16; }
      const s = S[(i >> 4) * 4 + (i % 4)]!;
      const t = (a + (f >>> 0) + K[i]! + w[blok * 16 + g]!) >>> 0;
      a = d; d = c; c = bb;
      bb = (bb + (((t << s) | (t >>> (32 - s))) >>> 0)) >>> 0;
    }
    a0 = (a0 + a) >>> 0; b0 = (b0 + bb) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0;
  }
  return [a0, b0, c0, d0]
    .map((x) => [0, 8, 16, 24].map((k) => ((x >>> k) & 0xff).toString(16).padStart(2, '0')).join(''))
    .join('');
}
