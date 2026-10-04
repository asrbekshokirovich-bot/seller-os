/**
 * Faktlar — ODAM kiritadigan bilim (`selleros.fakt`, 0056).
 *
 * Ssenariy "{fakt: kargo stavkasi}" deydi: kargo stavkasi, muddati,
 * YATT narxi kabi raqamlar kod ichida turmaydi, oʻlchanmaydi ham —
 * ularni nazoratchi kiritadi, manbasi va sanasi bilan. Bu modul faqat
 * OʻQIYDI va tarjima qiladi: `null` qiymat "bilmaymiz" (QOIDALAR §4),
 * nol emas, standart qiymat emas.
 *
 * 2026-09-28 holati: kargo hamkori YOʻQ (nazoratchi). Hamma kargo
 * kaliti boʻsh. Shuning uchun `kargoStavkasi()` `tanlovBor: false`
 * va `izoh` bilan qaytadi — suhbat buni ochiq aytadi, "kargo tekin"
 * yoki oʻylab topilgan son koʻrsatmaydi.
 */

export interface FaktQatori {
  qiymat: unknown;
  birlik: string | null;
  manba: string | null;
  olchandi: string | null;
  izoh: string | null;
}

export type Faktlar = Record<string, FaktQatori>;

export const KARGO_KALITLARI = [
  'kargo.hamkor',
  'kargo.avia.usd_kg', 'kargo.avia.kun',
  'kargo.quruqlik.usd_kg', 'kargo.quruqlik.kun',
  'kargo.usd_m3', 'kargo.min_usd',
] as const;

function matn(x: unknown): string | null {
  return typeof x === 'string' && x.trim() !== '' ? x.trim() : null;
}

/** `so_fakt_oqi` javobi → faktlar. Buzuq shakl — boʻsh (bilmaymiz). */
export function faktlarniOqi(json: unknown): Faktlar {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) return {};
  const f: Faktlar = {};
  for (const [kalit, q] of Object.entries(json as Record<string, unknown>)) {
    const o = q !== null && typeof q === 'object' ? (q as Record<string, unknown>) : {};
    f[kalit] = {
      qiymat: 'qiymat' in o ? o.qiymat : null,
      birlik: matn(o.birlik),
      manba: matn(o.manba),
      olchandi: matn(o.olchandi),
      izoh: matn(o.izoh),
    };
  }
  return f;
}

/** Son fakt. Matn koʻrinishidagi son ham qabul qilinadi; boʻsh — null. */
/**
 * Son matnda — minglik guruhlar bilan: 440000 → "440 000" (sayt
 * kartalaridagi `son()` bilan bir xil koʻrinish; chatdagi gap va karta
 * bir xil yozsin). Kasr qismi oʻzgarmaydi. LLM darvozasi (`tekshiruv.ts`)
 * guruhlangan sonni bitta son deb oʻqiydi.
 */
export function minglik(n: number): string {
  return String(n).replace(/^(-?\d+)/, (b) => b.replace(/\B(?=(\d{3})+(?!\d))/g, ' '));
}

export function faktSon(f: Faktlar, kalit: string): number | null {
  const q = f[kalit]?.qiymat;
  if (typeof q === 'number') return Number.isFinite(q) ? q : null;
  if (typeof q === 'string' && q.trim() !== '') {
    const n = Number(q);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function faktMatn(f: Faktlar, kalit: string): string | null {
  return matn(f[kalit]?.qiymat);
}

export type KargoYol = 'avia' | 'quruqlik';

export interface KargoYoli {
  yol: KargoYol;
  usdKg: number;
  /** Oʻrtacha muddat, kun. `null` — kiritilmagan. */
  kun: number | null;
  /** `usdKg × USD kursi`, yaxlitlangan. Kurs boʻlmasa `null`. */
  somPerKg: number | null;
  manba: string | null;
  olchandi: string | null;
}

export interface KargoStavkasi {
  hamkor: string | null;
  avia: KargoYoli | null;
  quruqlik: KargoYoli | null;
  usdM3: number | null;
  minUsd: number | null;
  /** Ikkala yoʻl ham kiritilgan — obunachidan soʻrash mumkin. */
  tanlovBor: boolean;
  /** Nima yetishmayotgani, odam tilida. Toʻliq boʻlsa `null`. */
  izoh: string | null;
}

/** Fakt roʻyxatidan kargo stavkasi. USD kursi soʻmga oʻgirish uchun (yoʻq boʻlsa faqat USD). */
export function kargoStavkasi(f: Faktlar, kursUsd: number | null): KargoStavkasi {
  const yol = (nom: KargoYol): KargoYoli | null => {
    const usdKg = faktSon(f, `kargo.${nom}.usd_kg`);
    if (usdKg === null || usdKg <= 0) return null;
    const q = f[`kargo.${nom}.usd_kg`];
    return {
      yol: nom,
      usdKg,
      kun: faktSon(f, `kargo.${nom}.kun`),
      somPerKg: kursUsd === null ? null : Math.round(usdKg * kursUsd),
      manba: q?.manba ?? null,
      olchandi: q?.olchandi ?? null,
    };
  };
  const avia = yol('avia');
  const quruqlik = yol('quruqlik');
  const hamkor = faktMatn(f, 'kargo.hamkor');
  const yetishmaydi: string[] = [];
  if (hamkor === null) yetishmaydi.push('kargo hamkori');
  if (avia === null && quruqlik === null) yetishmaydi.push('kargo stavkasi');
  else if (kursUsd === null) yetishmaydi.push('USD kursi');
  return {
    hamkor, avia, quruqlik,
    usdM3: faktSon(f, 'kargo.usd_m3'),
    minUsd: faktSon(f, 'kargo.min_usd'),
    tanlovBor: avia !== null && quruqlik !== null,
    izoh: yetishmaydi.length ? `${yetishmaydi.join(', ')} kiritilmagan` : null,
  };
}

/** Kiritilgan yoʻllardan arzoni (1 kg boʻyicha). Hech biri yoʻq — `null`. */
export function arzonYol(k: KargoStavkasi): KargoYoli | null {
  const bor = [k.avia, k.quruqlik].filter((y): y is KargoYoli => y !== null);
  if (bor.length === 0) return null;
  return bor.reduce((a, b) => (b.usdKg < a.usdKg ? b : a));
}

/**
 * Bir dona uchun kargo, soʻm — OGʻIRLIK boʻyicha. Hajm stavkasi (`usd_m3`)
 * va hajm ham boʻlsa qimmati olinadi (FORMULA.md: yuk tashuvchi qimmatini
 * oladi). Ogʻirlik yoki soʻm stavkasi boʻlmasa `null` — "bilmayman".
 */
export function kargoSomBirDona(
  yol: KargoYoli | null,
  weightG: number | null,
  q: { volumeMl?: number | null; usdM3?: number | null; kursUsd?: number | null } = {},
): { som: number; asos: 'ogirlik' | 'hajm'; hajmHisobgaKirdi: boolean } | null {
  if (yol === null || yol.somPerKg === null) return null;
  if (weightG === null || !Number.isFinite(weightG) || weightG < 0) return null;
  const ogirlikdan = Math.round((weightG / 1000) * yol.somPerKg);
  const hajmSom = q.usdM3 != null && q.kursUsd != null && q.volumeMl != null && q.volumeMl >= 0
    ? Math.round((q.volumeMl / 1_000_000) * q.usdM3 * q.kursUsd)
    : null;
  if (hajmSom !== null && hajmSom > ogirlikdan) return { som: hajmSom, asos: 'hajm', hajmHisobgaKirdi: true };
  return { som: ogirlikdan, asos: 'ogirlik', hajmHisobgaKirdi: hajmSom !== null };
}
