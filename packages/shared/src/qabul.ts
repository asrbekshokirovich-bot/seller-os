/**
 * 8-qadam — Qabul: yuk kelganda tekshirish va Uzum omboriga topshirish.
 *
 * Bu modul FAQAT faktlarni oʻqiydi va tarjima qiladi. Ombor manzili,
 * qabul muddati, tafovut jarimasi, yorliq oʻlchami, qadoq qoidalari,
 * logistika shartlari — birortasi kodda turmaydi: hammasi `selleros.fakt`
 * da `uzum.qabul.*` kalitlari bilan (0058), manbasi (Uzum qoʻllanmasi
 * 6- va 14-boblari, oferta) va oʻlchangan sanasi bilan. Fakt boʻlmasa
 * `null` — "bilmaymiz" (QOIDALAR §4), va `yetishmaydi` da nomi.
 *
 * Qadoq tavsiyasi — tovar NOMIni Uzum jadvalining kalit soʻzlari bilan
 * taqqoslash. Bu deterministik, lekin taxminiy: mos kelmasa umumiy
 * qoida koʻrsatiladi, "kerak emas" deyilmaydi.
 */

import { faktMatn, faktSon, type Faktlar } from './fakt.js';

export const QABUL_KALITLARI = [
  'uzum.qabul.ombor.manzil', 'uzum.qabul.ombor.soat',
  'uzum.qabul.qaytarish.manzil', 'uzum.qabul.qaytarish.soat',
  'uzum.qabul.muddat_kun_max', 'uzum.qabul.tafovut_som', 'uzum.qabul.taqiq_jarima_som',
  'uzum.qabul.taymslot.ozgartirish_max', 'uzum.qabul.taymslot.bekor_soat',
  'uzum.qabul.yetkazma.sku_max', 'uzum.qabul.yetkazma.akt_nusxa', 'uzum.qabul.quti_toliqlik',
  'uzum.qabul.yorliq', 'uzum.qabul.qadoq', 'uzum.qabul.qadoq_umumiy',
  'uzum.qabul.logistika.url', 'uzum.qabul.logistika.quti_kg_max', 'uzum.qabul.logistika.oldin_kun',
  'uzum.qabul.qollanma.url',
] as const;

export interface QadoqQoidasi {
  kalitSozlar: string[];
  tur: string;
  usul: string;
  /** Manipulyatsiya belgilari ("Yuqori", "Nozik"…); yoʻq — `null`. */
  belgilar: string | null;
}

export interface QabulFaktlar {
  ombor: { manzil: string | null; soat: string | null };
  qaytarish: { manzil: string | null; soat: string | null };
  /** Qabul shuncha kungacha choʻzilishi mumkin (oferta). */
  muddatKunMax: number | null;
  /** Har tafovutli birlik uchun, soʻm. */
  tafovutSom: number | null;
  taqiqJarimaSom: number | null;
  taymslot: { ozgartirishMax: number | null; bekorSoat: number | null };
  yetkazma: { skuMax: number | null; aktNusxa: number | null; qutiToliqlik: string | null };
  /** Yorliq talablari: kod, tavsiya, min, dpi… (kalit → matn). */
  yorliq: Record<string, string>;
  qadoq: QadoqQoidasi[];
  /** Buzuq qadoq qatorlari soni — yashirilmaydi. */
  qadoqTashlandi: number;
  qadoqUmumiy: string | null;
  logistika: { url: string | null; qutiKgMax: number | null; oldinKun: number | null };
  qollanmaUrl: string | null;
  manba: string | null;
  olchandi: string | null;
  yetishmaydi: string[];
}

function manzil(x: string | null): string | null {
  return x !== null && /^https?:\/\/\S+$/i.test(x) ? x : null;
}

function matnlar(x: unknown): Record<string, string> {
  if (x === null || typeof x !== 'object' || Array.isArray(x)) return {};
  const r: Record<string, string> = {};
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (typeof v === 'string' && v.trim() !== '') r[k] = v.trim();
  }
  return r;
}

/** `uzum.qabul.qadoq` (jsonb massiv) → qoidalar. Nomsiz/usulsiz qator tashlanadi va sanaladi. */
export function qadoqQoidalari(qiymat: unknown): { qadoq: QadoqQoidasi[]; tashlandi: number } {
  if (!Array.isArray(qiymat)) return { qadoq: [], tashlandi: 0 };
  const qadoq: QadoqQoidasi[] = [];
  let tashlandi = 0;
  for (const x of qiymat) {
    const o = x !== null && typeof x === 'object' ? (x as Record<string, unknown>) : null;
    const tur = typeof o?.tur === 'string' ? o.tur.trim() : '';
    const usul = typeof o?.usul === 'string' ? o.usul.trim() : '';
    const sozlar = Array.isArray(o?.kalit_sozlar) ? o.kalit_sozlar.filter((s): s is string => typeof s === 'string' && s.trim() !== '').map((s) => s.trim()) : [];
    if (!tur || !usul || sozlar.length === 0) { tashlandi += 1; continue; }
    const belgilar = typeof o?.belgilar === 'string' && o.belgilar.trim() !== '' && o.belgilar.trim() !== '—' ? o.belgilar.trim() : null;
    qadoq.push({ kalitSozlar: sozlar, tur, usul, belgilar });
  }
  return { qadoq, tashlandi };
}

export function qabulFaktlari(f: Faktlar): QabulFaktlar {
  const { qadoq, tashlandi } = qadoqQoidalari(f['uzum.qabul.qadoq']?.qiymat);
  const q = f['uzum.qabul.ombor.manzil'];
  const r: QabulFaktlar = {
    ombor: { manzil: faktMatn(f, 'uzum.qabul.ombor.manzil'), soat: faktMatn(f, 'uzum.qabul.ombor.soat') },
    qaytarish: { manzil: faktMatn(f, 'uzum.qabul.qaytarish.manzil'), soat: faktMatn(f, 'uzum.qabul.qaytarish.soat') },
    muddatKunMax: faktSon(f, 'uzum.qabul.muddat_kun_max'),
    tafovutSom: faktSon(f, 'uzum.qabul.tafovut_som'),
    taqiqJarimaSom: faktSon(f, 'uzum.qabul.taqiq_jarima_som'),
    taymslot: { ozgartirishMax: faktSon(f, 'uzum.qabul.taymslot.ozgartirish_max'), bekorSoat: faktSon(f, 'uzum.qabul.taymslot.bekor_soat') },
    yetkazma: { skuMax: faktSon(f, 'uzum.qabul.yetkazma.sku_max'), aktNusxa: faktSon(f, 'uzum.qabul.yetkazma.akt_nusxa'), qutiToliqlik: faktMatn(f, 'uzum.qabul.quti_toliqlik') },
    yorliq: matnlar(f['uzum.qabul.yorliq']?.qiymat),
    qadoq,
    qadoqTashlandi: tashlandi,
    qadoqUmumiy: faktMatn(f, 'uzum.qabul.qadoq_umumiy'),
    logistika: {
      url: manzil(faktMatn(f, 'uzum.qabul.logistika.url')),
      qutiKgMax: faktSon(f, 'uzum.qabul.logistika.quti_kg_max'),
      oldinKun: faktSon(f, 'uzum.qabul.logistika.oldin_kun'),
    },
    qollanmaUrl: manzil(faktMatn(f, 'uzum.qabul.qollanma.url')),
    manba: q?.manba ?? null,
    olchandi: q?.olchandi ?? null,
    yetishmaydi: [],
  };
  if (r.ombor.manzil === null) r.yetishmaydi.push('ombor manzili');
  if (r.muddatKunMax === null) r.yetishmaydi.push('qabul muddati');
  if (r.tafovutSom === null) r.yetishmaydi.push('tafovut jarimasi');
  if (Object.keys(r.yorliq).length === 0) r.yetishmaydi.push('yorliq talablari');
  if (r.qadoq.length === 0) r.yetishmaydi.push('qadoq qoidalari');
  if (r.logistika.url === null) r.yetishmaydi.push('logistika manzili');
  return r;
}

/** Nom taqqoslash uchun: kichik harf, apostrof turlari bir xil, koʻp boʻshliq bitta. */
export function nomniTekisla(x: string): string {
  return x.toLowerCase().replace(/[ʻʼ’‘`´]/g, "'").replace(/\s+/g, ' ').trim();
}

/**
 * Tovar nomi boʻyicha qadoq qoidasi. Birinchi mos qoida; mos kelmasa `null`
 * (umumiy qoida alohida koʻrsatiladi — "qadoq kerak emas" degani EMAS).
 */
export function qadoqTavsiyasi(title: string, qoidalar: QadoqQoidasi[]): QadoqQoidasi | null {
  const nom = nomniTekisla(title);
  if (!nom) return null;
  for (const q of qoidalar) {
    if (q.kalitSozlar.some((s) => nom.includes(nomniTekisla(s)))) return q;
  }
  return null;
}
