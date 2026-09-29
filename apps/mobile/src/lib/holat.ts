/**
 * Suhbat tarixidan chiqariladigan koʻrinishlar — sof funksiyalar.
 *
 * Bosh sahifa, "Suhbatlar" va "Yuklar" ekranlari oʻz maʼlumotini
 * YANGIDAN hisoblamaydi: ular suhbatda kod allaqachon bergan natijani
 * (`rol: 'kod'` xabarlari) qayta koʻrsatadi. Yangi raqam oʻylab
 * topilmaydi — tarixda yoʻq narsa ekranda ham yoʻq.
 */

import type { BuyurtmaNatija, BuyurtmaQatori, Keyingi, RasmiyNatija, Savol, Xabar } from './turlar';

/** Savol pufagi alohida chiziladimi (server uni tarixga hali yozmagan boʻlsa). */
export function savolKorsatilsinmi(xabarlar: readonly Xabar[], savol: Savol | null): boolean {
  if (savol === null) return false;
  const oxirgi = xabarlar[xabarlar.length - 1];
  return !(oxirgi?.rol === 'menejer' && oxirgi.savolId === savol.id);
}

/** "Tez orada" matni alohida chiziladimi. */
export function tezOradaKorsatilsinmi(xabarlar: readonly Xabar[], keyingi: Keyingi | null): boolean {
  if (keyingi?.tur !== 'tezOrada') return false;
  const oxirgi = xabarlar[xabarlar.length - 1];
  return !(oxirgi?.rol === 'menejer' && oxirgi.matn === keyingi.matn);
}

/** Kod xabaridan keyingi obunachi javobi — tarixda nima tanlangani. */
export function tarixdagiTanlov(xabarlar: readonly Xabar[], kodIdx: number, savolId: string): Array<string | number> {
  for (let j = kodIdx + 1; j < xabarlar.length; j++) {
    const x = xabarlar[j]!;
    if (x.rol !== 'obunachi' || x.savolId !== savolId) continue;
    if (Array.isArray(x.javob)) return x.javob as Array<string | number>;
    if (typeof x.javob === 'string' || typeof x.javob === 'number') return [x.javob];
  }
  return [];
}

/** Shu savolId li oxirgi kod xabarining indeksi; yoʻq — `-1`. */
export function oxirgiKodIdx(xabarlar: readonly Xabar[], savolId: string): number {
  for (let i = xabarlar.length - 1; i >= 0; i--) {
    if (xabarlar[i]!.rol === 'kod' && xabarlar[i]!.savolId === savolId) return i;
  }
  return -1;
}

/** Oxirgi obunachi javobi (masalan, `buyurtma_raqami`). Oʻtkazilgan — `null`. */
export function oxirgiJavob(xabarlar: readonly Xabar[], savolId: string): unknown {
  for (let i = xabarlar.length - 1; i >= 0; i--) {
    const x = xabarlar[i]!;
    if (x.rol === 'obunachi' && x.savolId === savolId) return x.javob ?? null;
  }
  return null;
}

/** Roʻyxatda koʻrsatish uchun oxirgi menejer/kod jumlasi. */
export function oxirgiJumla(xabarlar: readonly Xabar[]): string | null {
  for (let i = xabarlar.length - 1; i >= 0; i--) {
    const x = xabarlar[i]!;
    if ((x.rol === 'menejer' || x.rol === 'kod') && x.matn.trim()) return x.matn.trim();
  }
  return null;
}

/**
 * Faol savdoning nomi — obunachi oʻzi tanlagan narsa: avval tovarlar,
 * boʻlmasa yoʻnalish. Hech narsa tanlanmagan — `null` (ekran "Yangi
 * savdo" deydi). Matn serverning oʻz yozuvidan, qayta tuzilmaydi.
 */
export function savdoNomi(xabarlar: readonly Xabar[]): string | null {
  for (const id of ['tovarlar', 'yonalish']) {
    for (let i = xabarlar.length - 1; i >= 0; i--) {
      const x = xabarlar[i]!;
      if (x.rol === 'obunachi' && x.savolId === id && x.javob !== null && x.matn.trim()) return x.matn.trim();
    }
  }
  return null;
}

/**
 * Yuk kartasi — 6-qadam buyurtma varaqasidan.
 *
 * Tizim buyurtma BERMAYDI va yukni KUZATMAYDI (kargo hamkori yoʻq,
 * dizayn/HOLAT.md 9-band). Shuning uchun karta faqat varaqadagi
 * narsani koʻrsatadi: tovar, miqdor, narx va obunachi kiritgan raqam.
 * Yuk qayerdaligi — `null` ("kuzatuv tez orada"), taxmin qilinmaydi.
 */
export interface YukKartasi {
  qator: BuyurtmaQatori;
  buyurtmaRaqami: string | null;
}

export function yukKartalari(xabarlar: readonly Xabar[]): YukKartasi[] {
  const i = oxirgiKodIdx(xabarlar, 'buyurtma');
  if (i < 0) return [];
  const n = (xabarlar[i]!.javob ?? {}) as BuyurtmaNatija;
  const raqam = oxirgiJavob(xabarlar, 'buyurtma_raqami');
  const buyurtmaRaqami = typeof raqam === 'string' && raqam.trim() ? raqam.trim() : null;
  return (n.qatorlar ?? [])
    .filter((q) => q.holat === 'tayyor')
    .map((qator) => ({ qator, buyurtmaRaqami }));
}

/** Varaqa matni — agentga yuborish uchun. Hamma raqam natijadan (web bilan bir xil). */
export function varaqaMatni(n: BuyurtmaNatija): string {
  const q = (n.qatorlar ?? []).filter((x) => x.holat === 'tayyor');
  const satrlar = q.map((x, i) =>
    `${i + 1}. ${x.xitoyTitle ?? x.title} — ${x.miqdor ?? '?'} dona × ¥${x.narxYuan ?? '?'}${x.jamiYuan !== null ? ` = ¥${x.jamiYuan}` : ''}${x.manzil ? `\n   ${x.manzil}` : ''}`);
  const j = n.jami;
  return ['Buyurtma varaqasi (ZumSavdo)', ...satrlar, j ? `Jami: ${j.dona ?? '?'} dona, ¥${j.yuan ?? '?'}` : '']
    .filter(Boolean).join('\n');
}

/** Uzum komissioneri rekvizitlari — nusxalash uchun (web bilan bir xil). */
export function rekvizitMatni(n: RasmiyNatija): string | null {
  const k = n.faktlar?.uzum.komissioner;
  if (!k) return null;
  return [
    `STIR: ${k.stir ?? '—'}`, `Nom: ${k.nom ?? '—'}`, `MFO: ${k.mfo ?? '—'}`, `Hisob: ${k.hisob ?? '—'}`,
    `Muddat: ${k.muddatYil !== null ? `${k.muddatYil} yil` : '—'}`, 'ONKM + Marketplace',
  ].join('\n');
}

/** Faqat http(s) havola ochiladi — provayder bergan boshqa sxema emas. */
export function havolami(s: string | null | undefined): s is string {
  return typeof s === 'string' && /^https?:\/\//i.test(s);
}
