/**
 * Bosh sahifa uchun Edge Function maʼlumoti — keshi bilan: bugungi namuna yoʻnalishlar
 * (`/bosh-namuna`) va tarif cheklovi (`/tarif`). Yoʻl `bazamizOl.ts` dagidek:
 *
 *   - oxirgi MUVAFFAQIYATLI javob saqlanadi va muddati ichida qayta soʻralmaydi;
 *   - Edge javob bermasa — eski qiymat qoladi (yoʻq boʻlsa `null`), sahifa yiqilmaydi;
 *   - sahifa `kutishMs` dan ortiq kutmaydi: soʻrov `kechroq` ga beriladi (sahifada —
 *     `after`), keyingi tashrif tayyor qiymatni oladi.
 *
 * Faqat serverda chaqiriladi: kalit brauzerga tushmaydi.
 */

import { boshNamunaOqi, type BoshNamuna } from '@selleros/shared';

/** Fondagi soʻrov ham cheksiz osilib turmasin (funksiya vaqti va puli). */
const SOROV_MS = 30_000;

export interface KeshliOluvchi<T> {
  /** `null` — hech qachon olinmagan. */
  ol(hozir: number): Promise<T | null>;
  kutibOl(hozir: number, kutishMs: number, kechroq: (sorov: Promise<unknown>) => void): Promise<T | null>;
}

/** `yol` dan JSON oladi, `oqi` tekshiradi (`null` — yaroqsiz, eski qiymat qoladi), `yangiMs` keshlaydi. */
export function keshliOluvchi<T>(yol: string, oqi: (j: unknown) => T | null, yangiMs: number): KeshliOluvchi<T> {
  let oxirgi: { qiymat: T; vaqt: number } | null = null;
  let jarayonda: Promise<T | null> | null = null;

  function ol(hozir: number): Promise<T | null> {
    if (oxirgi !== null && hozir - oxirgi.vaqt < yangiMs) return Promise.resolve(oxirgi.qiymat);
    const api = process.env.SELLEROS_API_URL ?? '';
    const kalit = process.env.SELLEROS_API_KEY ?? '';
    if (!api || !kalit) return Promise.resolve(oxirgi?.qiymat ?? null);
    if (jarayonda) return jarayonda;
    jarayonda = (async () => {
      try {
        const r = await fetch(`${api}${yol}`, {
          headers: { Authorization: `Bearer ${kalit}` },
          cache: 'no-store',
          signal: AbortSignal.timeout(SOROV_MS),
        });
        const q = r.ok ? oqi(await r.json()) : null;
        if (q !== null) oxirgi = { qiymat: q, vaqt: hozir };
        return oxirgi?.qiymat ?? null;
      } catch {
        return oxirgi?.qiymat ?? null;
      } finally {
        jarayonda = null;
      }
    })();
    return jarayonda;
  }

  async function kutibOl(hozir: number, kutishMs: number, kechroq: (sorov: Promise<unknown>) => void): Promise<T | null> {
    const olish = ol(hozir);
    let taymer: ReturnType<typeof setTimeout> | undefined;
    const muddat = new Promise<'muddat'>((r) => { taymer = setTimeout(() => r('muddat'), kutishMs); });
    const natija = await Promise.race([olish, muddat]);
    clearTimeout(taymer);
    if (natija !== 'muddat') return natija;
    kechroq(olish);
    return oxirgi?.qiymat ?? null;
  }

  return { ol, kutibOl };
}

/** Bugungi namuna — bazadagi nomzodlar kuniga bir necha marta yangilanadi, bir soat yetadi. */
export const boshNamuna = keshliOluvchi<BoshNamuna>(
  '/bosh-namuna',
  (j) => ((j as { olchov_yoq?: unknown } | null)?.olchov_yoq === false
    ? boshNamunaOqi((j as { namuna?: unknown }).namuna)
    : null),
  60 * 60 * 1000,
);

/**
 * Tarif cheklovi yoqilganmi (`TARIF_CHEKLOVI`, Edge muhiti). Bosh sahifadagi «Hozir hammasi
 * bepul» shunga bogʻliq: cheklov yoqilsa sahifa oʻzi «1–5 qadam bepul» ga oʻtadi. Muddat
 * qisqa (10 daqiqa) — yoqilgach eski vaʼda uzoq turmasin. Olinmasa — `null` (sahifa ikkala
 * holatda ham rost boʻlgan matnni koʻrsatadi).
 */
export const boshTarif = keshliOluvchi<{ cheklov: boolean }>(
  '/tarif',
  (j) => {
    const c = (j as { cheklov_yoqilgan?: unknown } | null)?.cheklov_yoqilgan;
    return typeof c === 'boolean' ? { cheklov: c } : null;
  },
  10 * 60 * 1000,
);
