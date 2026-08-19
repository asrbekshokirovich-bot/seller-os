/**
 * Sifat hisoboti — yigʻuvchi ishlayaptimi.
 *
 * Nega kerak: yigʻuvchi jimgina ishlamay qolsa buni hech narsa
 * koʻrsatmaydi. Baza eski maʻlumot bilan toʻgʻridek turaveradi va
 * tavsiyalar eskirgan raqamdan chiqaveradi — bu eng yomon holat, chunki
 * u xato kabi koʻrinmaydi.
 */

export interface Sifat {
  platform: string;
  last_sweep_at: string | null;
  /** `null` — hali oʻlchov yoʻq. Nol EMAS: nol "qamrov 0%" degan daʻvo. */
  coverage_percent: number | null;
  error_percent: number | null;
  requested: number | null;
  found: number | null;
  /** Boʻsh id lar. Bular xato emas — id fazosining ~70% i boʻsh. */
  missing: number | null;
  errors: number | null;
  stopped_reason: string | null;
  measured_today: number;
  has_data: boolean;
}

/** Chegaralar — reja 8-boʻlim, "Texnik KPI lar". */
export const KPI = {
  /** Kunlik yangilanish qamrovi shundan past boʻlmasin. */
  minCoveragePercent: 95,
  /** Xato darajasi shundan yuqori boʻlmasin. */
  maxErrorPercent: 2,
} as const;

export type Holat = 'yaxshi' | 'ogohlantirish' | 'yomon' | 'olchov_yoq';

/**
 * Raqamlardan bitta holat chiqaradi.
 *
 * Maʻlumot yoʻq boʻlsa "yaxshi" ham, "yomon" ham deyilmaydi —
 * `olchov_yoq` alohida holat. Aks holda ishga tushmagan yigʻuvchi
 * "hammasi joyida" boʻlib koʻrinardi.
 */
export function holat(s: Sifat): Holat {
  if (!s.has_data || s.coverage_percent === null) return 'olchov_yoq';
  if (s.stopped_reason) return 'yomon';
  if (s.error_percent !== null && s.error_percent > KPI.maxErrorPercent) return 'yomon';
  if (s.coverage_percent < KPI.minCoveragePercent) return 'ogohlantirish';
  return 'yaxshi';
}
