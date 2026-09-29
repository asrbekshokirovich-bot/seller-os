/**
 * Studiya Worker yadrosi — SOF funksiyalar (Cloudflare API siz), testlanadi.
 *
 * `imzo` — `packages/shared/src/studiya.ts` dagi `studiyaImzosi` bilan AYNAN
 * bir xil (test ikkalasini solishtiradi). Worker `@selleros/shared` ni
 * import qilmaydi: bundle kichik boʻlsin va Worker mustaqil joylansin.
 */

/** Chiqish: 1200 × 1600 JPEG (3:4), har tomonda 48 px oq chet. `STUDIYA_CHIQISH` bilan bir xil. */
export const CHIQISH = { eni: 1200, boyi: 1600, chet: 48, sifat: 90 } as const;

/** Chet piksellarining shuncha ulushi oq boʻlsa — fon oq, kesish shart emas. */
export const OQ_CHEGARA = 0.9;

/** Tekshiruv uchun kichik nusxa oʻlchami (xom RGB: 48 × 48 × 3 = 6 912 bayt). */
export const ZOND = 48;

export type Rejim = 'auto' | 'pad' | 'cut';

/** "Oq" piksel: eng qorongʻi kanal ≥ 232 va kanallar farqi ≤ 18 (JPEG shovqini, yengil soya). */
export function oqPikselmi(r: number, g: number, b: number): boolean {
  const mn = Math.min(r, g, b);
  const mx = Math.max(r, g, b);
  return mn >= 232 && mx - mn <= 18;
}

/**
 * Chet halqasidagi (`qalinlik` px) oq piksellar ulushi, 0…1.
 * `px` — xom RGB (`kanal` = 3) yoki RGBA (`kanal` = 4), qatorma-qator.
 * Maʼlumot yetmasa 0 (ya'ni "oq emas" — kesiladi; bu xavfsiz tomon).
 */
export function oqChetUlushi(px: Uint8Array, eni: number, boyi: number, qalinlik = 2, kanal = 3): number {
  if (eni <= 0 || boyi <= 0 || px.length < eni * boyi * kanal) return 0;
  let jami = 0;
  let oq = 0;
  for (let y = 0; y < boyi; y++) {
    for (let x = 0; x < eni; x++) {
      if (x >= qalinlik && x < eni - qalinlik && y >= qalinlik && y < boyi - qalinlik) continue;
      const i = (y * eni + x) * kanal;
      jami += 1;
      if (oqPikselmi(px[i]!, px[i + 1]!, px[i + 2]!)) oq += 1;
    }
  }
  return jami === 0 ? 0 : oq / jami;
}

function hex(b: ArrayBuffer): string {
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** HMAC-SHA256(kalit, `${rejim}\n${src}`), hex. */
export async function imzo(kalit: string, rejim: Rejim, src: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(kalit), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(`${rejim}\n${src}`)));
}

/** Doimiy vaqtli taqqoslash — imzoni belgima-belgi taxmin qilib boʻlmasin. */
export function tengmi(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let farq = 0;
  for (let i = 0; i < a.length; i++) farq |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return farq === 0;
}

export function rejimmi(x: string | null): x is Rejim {
  return x === 'auto' || x === 'pad' || x === 'cut';
}

/** Manba manzili: faqat http(s), 2 048 belgigacha. */
export function manbaManzilimi(x: string | null): x is string {
  return typeof x === 'string' && x.length <= 2048 && /^https?:\/\/\S+$/i.test(x);
}
