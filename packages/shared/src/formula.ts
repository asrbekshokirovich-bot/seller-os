/**
 * Ball tizimi — vaznlar va hisob.
 *
 * FORMULA.md shu faylga ishora qiladi. Jadval va kod bir-biriga mos
 * bo'lishi SHART — testda tekshiriladi.
 *
 * Ball DETERMINISTIK: bir xil kirish → har doim bir xil natija.
 * LLM ballga aralashmaydi (QOIDALAR.md, 3-bo'lim).
 */

export const FORMULA_VERSION = 'v0';

export const PARTS = ['talab', 'marja', 'raqobat', 'kirish', 'mavsum', 'profil'] as const;
export type Part = (typeof PARTS)[number];

/** FORMULA.md dagi jadval bilan bir xil. */
export const WEIGHTS: Record<Part, number> = {
  talab: 25,
  marja: 25,
  raqobat: 20,
  kirish: 10,
  mavsum: 10,
  profil: 10,
};

/**
 * Qism ballari. `null` — "hisoblab bo'lmadi", nol emas.
 *
 * Farqi muhim: nol "yomon" degani, `null` "bilmayman" degani. Ularni
 * aralashtirsak, ma'lumot yetishmagan tovar yomon tovarga o'xshab qoladi.
 */
export type Parts = Partial<Record<Part, number | null>>;

export interface Score {
  /** 0–100. Hisoblab bo'lmasa `null`. */
  value: number | null;
  /** "Nega bu tovar?" tugmasi shuni ochadi. */
  breakdown: Array<{ part: Part; score: number | null; weight: number; used: boolean }>;
  /** Nechta qism hisoblanmagan. */
  missing: number;
  version: string;
}

/**
 * Ballni hisoblaydi.
 *
 * `null` qism vazndan ham chiqariladi — nol deb sanalmaydi. Agar
 * `maxNullParts` dan ko'pi yo'q bo'lsa, natija `null`: tovarni hali
 * baholab bo'lmaydi va u tavsiyaga chiqmaydi.
 */
export function score(parts: Parts, maxNullParts: number): Score {
  const breakdown = PARTS.map((part) => {
    const raw = parts[part];
    const value = typeof raw === 'number' ? clamp(raw) : null;
    return { part, score: value, weight: WEIGHTS[part], used: value !== null };
  });

  const missing = breakdown.filter((b) => !b.used).length;
  if (missing > maxNullParts) {
    return { value: null, breakdown, missing, version: FORMULA_VERSION };
  }

  const used = breakdown.filter((b) => b.used);
  const weightSum = used.reduce((a, b) => a + b.weight, 0);
  if (weightSum === 0) {
    return { value: null, breakdown, missing, version: FORMULA_VERSION };
  }

  const total = used.reduce((a, b) => a + (b.score as number) * b.weight, 0);
  return {
    value: Math.round((total / weightSum) * 100) / 100,
    breakdown,
    missing,
    version: FORMULA_VERSION,
  };
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, n));
}
