/**
 * 7-qadam — Rasmiylashtirish: YATT, soliq, bank hisobi, Uzum kabineti.
 *
 * Bu modul FAQAT faktlarni oʻqiydi va tarjima qiladi. Davlat boji, soliq
 * foizi, bank tarifi, Uzum rekvizitlari — birortasi kodda turmaydi:
 * hammasi `selleros.fakt` da `bhm.*`, `yatt.*`, `soliq.*`, `bank.*`,
 * `uzum.*` kalitlari bilan, manbasi va oʻlchangan sanasi bilan (0057,
 * docs/RASMIYLASHTIRISH-FAKTLAR.md). Fakt boʻlmasa `null` — "bilmaymiz"
 * (QOIDALAR §4), va `yetishmaydi` roʻyxatida nomi turadi.
 *
 * NEGA. Davlat saytlari, tariflar va BHM oʻzgaradi (BHM 2026-09-01 da
 * 412 000 → 440 000). Raqam kodda tursa eskiradi va hech kim sezmaydi;
 * faktda tursa nazoratchi bir qatorni tuzatadi, kod oʻzgarmaydi.
 */

import { faktMatn, faktSon, type Faktlar } from './fakt.js';

export const RASMIY_KALITLARI = [
  'bhm.som',
  'yatt.boj.shaxsan_bhm', 'yatt.boj.onlayn_bhm', 'yatt.royxat.url', 'yatt.royxat.muddat_daqiqa', 'yatt.xodim_max',
  'soliq.aylanma_foiz', 'soliq.aylanma_chegara_som', 'soliq.ijtimoiy_oy_bhm', 'soliq.tolov_kuni', 'soliq.rejim_tugaydi',
  'bank.royxat',
  'uzum.kabinet.url', 'uzum.qollanma.url', 'uzum.komissioner.stir', 'uzum.komissioner.nom', 'uzum.komissioner.mfo',
  'uzum.komissioner.hisob', 'uzum.komissioner.muddat_yil', 'uzum.faollashtirish_kun', 'uzum.qollab_quvvatlash.url',
  'uzum.tolov.standart',
] as const;

export interface Manba {
  manba: string | null;
  olchandi: string | null;
}

export interface YattFakti extends Manba {
  /** Davlat boji, shaxsan (DXM), soʻm — BHM × koeffitsient. */
  bojShaxsanSom: number | null;
  /** Davlat boji, onlayn, soʻm. */
  bojOnlaynSom: number | null;
  royxatUrl: string | null;
  muddatDaqiqa: number | null;
  xodimMax: number | null;
}

export interface SoliqFakti extends Manba {
  /** Aylanma soligʻi, foiz (2026–2030: 1). */
  aylanmaFoiz: number | null;
  /** Shu aylanmadan oshsa QQS + foyda soligʻi, soʻm/yil. */
  aylanmaChegaraSom: number | null;
  /** Ijtimoiy soliq, oyiga, soʻm — BHM × koeffitsient. Daromad boʻlmasa ham. */
  ijtimoiyOySom: number | null;
  /** Oyning shu kunigacha toʻlanadi. */
  tolovKuni: number | null;
  /** Maxsus rejim tugash sanasi (ISO). */
  rejimTugaydi: string | null;
}

export interface BankQatori {
  nom: string;
  /** Hisob toʻliq onlayn ochiladimi. `null` — oʻlchanmagan. */
  onlayn: boolean | null;
  ochishSom: number | null;
  oylikSom: number | null;
  izoh: string | null;
  manba: string | null;
  olchandi: string | null;
}

export interface UzumKabinetFakti extends Manba {
  kabinetUrl: string | null;
  qollanmaUrl: string | null;
  /** my3.soliq.uz da komissioner sifatida qoʻshish rekvizitlari. */
  komissioner: {
    stir: string | null;
    nom: string | null;
    mfo: string | null;
    hisob: string | null;
    muddatYil: number | null;
  };
  faollashtirishKun: number | null;
  qollabQuvvatlashUrl: string | null;
  tolovStandart: string | null;
}

export interface RasmiyFaktlar {
  bhmSom: number | null;
  yatt: YattFakti;
  soliq: SoliqFakti;
  banklar: BankQatori[];
  /** Bank roʻyxatidan buzuq (nomsiz) qatorlar soni — yashirilmaydi. */
  bankTashlandi: number;
  uzum: UzumKabinetFakti;
  /** Qaysi faktlar kiritilmagan — odam tilida. Boʻsh — hammasi bor. */
  yetishmaydi: string[];
}

function manba(f: Faktlar, kalit: string): Manba {
  const q = f[kalit];
  return { manba: q?.manba ?? null, olchandi: q?.olchandi ?? null };
}

function manzil(x: string | null): string | null {
  return x !== null && /^https?:\/\/\S+$/i.test(x) ? x : null;
}

function butun(x: number | null): number | null {
  return x === null ? null : Math.round(x);
}

/** Bir qatorning manbasi boʻlmasa — kalit boʻyicha umumiy manba. */
function bankQatori(x: unknown, umumiy: Manba): BankQatori | null {
  if (x === null || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const nom = typeof o.nom === 'string' && o.nom.trim() !== '' ? o.nom.trim() : null;
  if (nom === null) return null;
  const son = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
  const matn = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
  return {
    nom,
    onlayn: typeof o.onlayn === 'boolean' ? o.onlayn : null,
    ochishSom: son(o.ochish_som),
    oylikSom: son(o.oylik_som),
    izoh: matn(o.izoh),
    manba: matn(o.manba) ?? umumiy.manba,
    olchandi: matn(o.olchandi) ?? umumiy.olchandi,
  };
}

/** `bank.royxat` (jsonb massiv) → qatorlar. Buzuq qatorlar tashlanadi va sanaladi. */
export function bankRoyxati(qiymat: unknown, umumiy: Manba): { banklar: BankQatori[]; tashlandi: number } {
  if (!Array.isArray(qiymat)) return { banklar: [], tashlandi: 0 };
  const banklar: BankQatori[] = [];
  let tashlandi = 0;
  for (const x of qiymat) {
    const q = bankQatori(x, umumiy);
    if (q === null) tashlandi += 1; else banklar.push(q);
  }
  return { banklar, tashlandi };
}

/** Fakt roʻyxatidan 7-qadam faktlari. Hech narsa oʻylab topilmaydi. */
export function rasmiyFaktlari(f: Faktlar): RasmiyFaktlar {
  const bhmSom = faktSon(f, 'bhm.som');
  const bhmBilan = (kalit: string): number | null => {
    const k = faktSon(f, kalit);
    return bhmSom === null || k === null ? null : butun(bhmSom * k);
  };
  const yatt: YattFakti = {
    bojShaxsanSom: bhmBilan('yatt.boj.shaxsan_bhm'),
    bojOnlaynSom: bhmBilan('yatt.boj.onlayn_bhm'),
    royxatUrl: manzil(faktMatn(f, 'yatt.royxat.url')),
    muddatDaqiqa: faktSon(f, 'yatt.royxat.muddat_daqiqa'),
    xodimMax: faktSon(f, 'yatt.xodim_max'),
    ...manba(f, 'yatt.boj.onlayn_bhm'),
  };
  const soliq: SoliqFakti = {
    aylanmaFoiz: faktSon(f, 'soliq.aylanma_foiz'),
    aylanmaChegaraSom: faktSon(f, 'soliq.aylanma_chegara_som'),
    ijtimoiyOySom: bhmBilan('soliq.ijtimoiy_oy_bhm'),
    tolovKuni: faktSon(f, 'soliq.tolov_kuni'),
    rejimTugaydi: faktMatn(f, 'soliq.rejim_tugaydi'),
    ...manba(f, 'soliq.aylanma_foiz'),
  };
  const { banklar, tashlandi } = bankRoyxati(f['bank.royxat']?.qiymat, manba(f, 'bank.royxat'));
  const uzum: UzumKabinetFakti = {
    kabinetUrl: manzil(faktMatn(f, 'uzum.kabinet.url')),
    qollanmaUrl: manzil(faktMatn(f, 'uzum.qollanma.url')),
    komissioner: {
      stir: faktMatn(f, 'uzum.komissioner.stir'),
      nom: faktMatn(f, 'uzum.komissioner.nom'),
      mfo: faktMatn(f, 'uzum.komissioner.mfo'),
      hisob: faktMatn(f, 'uzum.komissioner.hisob'),
      muddatYil: faktSon(f, 'uzum.komissioner.muddat_yil'),
    },
    faollashtirishKun: faktSon(f, 'uzum.faollashtirish_kun'),
    qollabQuvvatlashUrl: manzil(faktMatn(f, 'uzum.qollab_quvvatlash.url')),
    tolovStandart: faktMatn(f, 'uzum.tolov.standart'),
    ...manba(f, 'uzum.komissioner.stir'),
  };

  const yetishmaydi: string[] = [];
  if (bhmSom === null) yetishmaydi.push('BHM');
  if (yatt.bojOnlaynSom === null && yatt.bojShaxsanSom === null) yetishmaydi.push('YATT davlat boji');
  if (yatt.royxatUrl === null) yetishmaydi.push('YATT roʻyxat manzili');
  if (soliq.aylanmaFoiz === null) yetishmaydi.push('aylanma soligʻi foizi');
  if (soliq.ijtimoiyOySom === null) yetishmaydi.push('ijtimoiy soliq');
  if (banklar.length === 0) yetishmaydi.push('bank roʻyxati');
  if (uzum.kabinetUrl === null) yetishmaydi.push('Uzum kabinet manzili');
  if (uzum.komissioner.stir === null || uzum.komissioner.mfo === null || uzum.komissioner.hisob === null) {
    yetishmaydi.push('Uzum komissioner rekvizitlari');
  }
  return { bhmSom, yatt, soliq, banklar, bankTashlandi: tashlandi, uzum, yetishmaydi };
}

export interface OylikSoliq {
  /** Har oy, sotuv boʻlmasa ham. */
  ijtimoiySom: number | null;
  /** `sotuvSom` × foiz. Sotuv nomaʼlum — `null`. */
  aylanmaSom: number | null;
  jamiSom: number | null;
  /** Hisobga olingan sotuv (4-qadam partiyasi), soʻm. */
  sotuvSom: number | null;
  yetishmaydi: string[];
}

/**
 * Majburiy soliq: ijtimoiy (har oy) + aylanma (sotuvdan). Soliq bazasi —
 * xaridor toʻlagan TOʻLIQ narx, Uzum komissiyasi chegirilmaydi
 * (docs/RASMIYLASHTIRISH-FAKTLAR.md, 3-boʻlim). Biror boʻlak yoʻq — `null`.
 */
export function oylikSoliq(s: SoliqFakti, sotuvSom: number | null): OylikSoliq {
  const yetishmaydi: string[] = [];
  const ijtimoiySom = s.ijtimoiyOySom;
  if (ijtimoiySom === null) yetishmaydi.push('ijtimoiy soliq');
  let aylanmaSom: number | null = null;
  if (s.aylanmaFoiz === null) yetishmaydi.push('aylanma soligʻi foizi');
  else if (sotuvSom === null || !Number.isFinite(sotuvSom) || sotuvSom < 0) yetishmaydi.push('sotuv summasi');
  else aylanmaSom = Math.round((sotuvSom * s.aylanmaFoiz) / 100);
  const jamiSom = ijtimoiySom !== null && aylanmaSom !== null ? ijtimoiySom + aylanmaSom : null;
  return { ijtimoiySom, aylanmaSom, jamiSom, sotuvSom: sotuvSom !== null && Number.isFinite(sotuvSom) && sotuvSom >= 0 ? sotuvSom : null, yetishmaydi };
}
