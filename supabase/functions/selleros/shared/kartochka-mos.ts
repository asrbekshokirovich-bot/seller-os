/**
 * KARTOCHKA MATNI — OʻZBEKCHA VA RUSCHA BIR XIL MAʼNODAMI (nazoratchi, 2026-11-05, ikkinchi koʻrik,
 * 4-taklif).
 *
 * Koʻrikda AI oʻzbekcha nomga «qalin tagliksiz» (qalin tagi yoʻq), ruschasiga esa «на толстой
 * подошве» (qalin tagli) deb yozdi — mijoz shuni Uzumga qoʻysa, xaridor chalgʻiydi. Kod qoidalari
 * (`kartochkaTekshir`) maʼnoni koʻrmaydi, shuning uchun tez model (Haiku) ikki tilni solishtiradi:
 * farq boʻlsa — sababi bilan matn qayta yoziladi. Tekshiruv ishlamasa matn oʻtadi (yoʻl toʻxtamaydi).
 */

import type { KartochkaMatni } from './kartochka-matn.ts';

export interface KartochkaMosligi {
  mos: boolean;
  /** Farq boʻlsa — qaysi qismda va nima (oʻzbekcha, qisqa); mos boʻlsa boʻsh. */
  farq: string;
}

export const KARTOCHKA_MOS_KORSATMA = [
  'Sen tarjima tekshiruvchisisan. Senga Uzum tovar kartochkasining oʻzbekcha va ruscha matni beriladi: nom, qisqa tavsif va toʻliq tavsif.',
  'Ikki til bir xil MAʼNONI aytadimi — shuni tekshir: tovar turi, material, rang, oʻlcham, xususiyat (masalan «qalin tagli» va «qalin tagliksiz» — qarama-qarshi), kim uchun, nechta.',
  'Uslub, soʻz tartibi, sinonim va kichik qoʻshimcha soʻzlar farq emas. Faqat xaridorni chalgʻitadigan maʼno farqini hisobga ol.',
  'Javob — JSON: {"mos": true yoki false, "farq": "..."}. Farq boʻlsa — qaysi qismda va nima farq qilishini oʻzbekcha bitta qisqa gap bilan yoz; mos boʻlsa "farq": "".',
].join('\n');

export const KARTOCHKA_MOS_SXEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { mos: { type: 'boolean' }, farq: { type: 'string' } },
  required: ['mos', 'farq'],
} as const;

/** Model uchun matn: uch qism, har biri ikki tilda. */
export function kartochkaMosMatni(m: KartochkaMatni): string {
  return [
    `NOM (oʻzbekcha): ${m.nomUz}`, `NOM (ruscha): ${m.nomRu}`,
    `QISQA (oʻzbekcha): ${m.qisqaUz}`, `QISQA (ruscha): ${m.qisqaRu}`,
    `TAVSIF (oʻzbekcha): ${m.tavsifUz}`, `TAVSIF (ruscha): ${m.tavsifRu}`,
  ].join('\n');
}

/** Model javobi. Buzuq JSON yoki `mos` boolean emas — `null` (tekshirilmadi deb hisoblanadi). */
export function kartochkaMosniOqi(javob: string): KartochkaMosligi | null {
  let j: unknown;
  try {
    j = JSON.parse(javob.replace(/^```(?:json)?\s*|\s*```$/gu, ''));
  } catch {
    return null;
  }
  const o = j as { mos?: unknown; farq?: unknown } | null;
  if (typeof o?.mos !== 'boolean') return null;
  if (o.mos) return { mos: true, farq: '' };
  const farq = typeof o.farq === 'string' ? o.farq.replace(/\s+/gu, ' ').trim().slice(0, 300) : '';
  return { mos: false, farq: farq || 'maʼno farqi bor' };
}
