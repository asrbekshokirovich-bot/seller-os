/**
 * Interfeys tili — web (`apps/web/src/lib/til.ts`) bilan bir xil usul:
 * `tr(uz, ru)`, ikkala matn bitta qatorda yonma-yon.
 *
 * CHEGARA: backend yozgan matnlar (savol, tuzoq sababi, hisob izohi)
 * oʻzbekcha keladi — ularni tarjima qilish backend ishi (BACKLOG).
 */

export type Til = 'uz' | 'ru';

export type Tr = (uz: string, ru: string) => string;

export function tarjima(til: Til): Tr {
  return (uz, ru) => (til === 'ru' ? ru : uz);
}
