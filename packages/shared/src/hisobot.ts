/**
 * 12-qadam — Hisobot: oy yakuni, soliq va keyingi oy rejasi.
 *
 * Nazoratchi ssenariysi (12-qadam): "Oy tugadi. Sotuv {summa}, komissiya
 * {summa}, sof {summa}. Soliq: YATT uchun {fakt: stavka} aylanmadan,
 * {summa}. Muddat {fakt: sana} gacha. Deklaratsiyani tayyorlaymizmi?" →
 * qadam kartalari (7-qadamdagidek) → "Keyingi oy rejasi" → 11-qadamga qaytish.
 *
 * RAQAMLAR MANBASI. Sotuv va komissiyaning aniq summasi — Uzum
 * kabinetidagi komissioner hisobotida (soliq hisobotining asos hujjati,
 * qoʻllanma 3.3). Tizim oʻz oʻlchovidan (11-qadam: zaxira kamayishi ×
 * narx) TAXMIN beradi va sotuvchidan hisobotdagi summani soʻraydi. Soliq
 * foizi, ijtimoiy soliq, muddatlar — `selleros.fakt` dan (0057, 0060).
 *
 * SOLIQ AGENTI (2026, OʻRQ-1108, SK 461): toʻlov tashkiloti yoki raqamli
 * platforma orqali tushgan daromad boʻyicha aylanma soligʻi va hisobot
 * javobgarligi soliq agentida. Uzum sotuvchisi uchun agent kimligi —
 * `[TASDIQ]`; shuning uchun tizim "toʻlaysiz" demaydi, "komissioner
 * hisobotida ushlab qolinganini tekshiring" deydi. Bu soliq maslahati emas.
 */

import { faktMatn, faktSon, minglik, type Faktlar } from './fakt.js';
import { oylikSoliq, rasmiyFaktlari, type OylikSoliq, type SoliqFakti } from './rasmiy.js';

export const HISOBOT_KALITLARI = [
  'bhm.som', 'soliq.aylanma_foiz', 'soliq.aylanma_chegara_som', 'soliq.ijtimoiy_oy_bhm', 'soliq.tolov_kuni', 'soliq.rejim_tugaydi',
  'soliq.agent', 'soliq.aylanma.hisobot_davri', 'soliq.aylanma.hisobot_kun', 'soliq.portal.url', 'uzum.hisobot.komissioner_kun',
] as const;

export interface HisobotFaktlar {
  soliq: SoliqFakti;
  /** Soliq agenti qoidasi (matn). */
  agent: string | null;
  /** Aylanma soligʻi hisoboti davri, oʻzi topshirsa ("chorak" / "oy"). */
  aylanmaDavri: string | null;
  /** Davrdan keyingi oyning shu sanasigacha. */
  aylanmaKun: number | null;
  portalUrl: string | null;
  /** Uzum komissioner hisoboti oyning shu sanasigacha tayyor. */
  komissionerKun: number | null;
  yetishmaydi: string[];
}

function manzil(x: string | null): string | null {
  return x !== null && /^https?:\/\/\S+$/i.test(x) ? x : null;
}

export function hisobotFaktlari(f: Faktlar): HisobotFaktlar {
  const soliq = rasmiyFaktlari(f).soliq;
  const h: HisobotFaktlar = {
    soliq,
    agent: faktMatn(f, 'soliq.agent'),
    aylanmaDavri: faktMatn(f, 'soliq.aylanma.hisobot_davri'),
    aylanmaKun: faktSon(f, 'soliq.aylanma.hisobot_kun'),
    portalUrl: manzil(faktMatn(f, 'soliq.portal.url')),
    komissionerKun: faktSon(f, 'uzum.hisobot.komissioner_kun'),
    yetishmaydi: [],
  };
  if (soliq.aylanmaFoiz === null) h.yetishmaydi.push('aylanma soligʻi foizi');
  if (soliq.ijtimoiyOySom === null) h.yetishmaydi.push('ijtimoiy soliq');
  if (soliq.tolovKuni === null) h.yetishmaydi.push('toʻlov kuni');
  if (h.agent === null) h.yetishmaydi.push('soliq agenti qoidasi');
  if (h.portalUrl === null) h.yetishmaydi.push('soliq portali');
  if (h.komissionerKun === null) h.yetishmaydi.push('komissioner hisoboti muddati');
  return h;
}

/** `YYYY-MM` — hisobot oyi (UTC). */
export function oyKaliti(d: Date): string {
  return d.toISOString().slice(0, 7);
}

const OYLAR = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'] as const;

/** `YYYY-MM` → "2026-yil sentyabr". Kalit notoʻgʻri boʻlsa — oʻzi. */
export function oyNomi(oy: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(oy);
  const n = m ? Number(m[2]) : 0;
  return m && n >= 1 && n <= 12 ? `${m[1]}-yil ${OYLAR[n - 1]}` : oy;
}

/** Oydagi kunlar soni (`YYYY-MM`). Kalit notoʻgʻri boʻlsa — `null`. */
export function oyKunSoni(oy: string): number | null {
  const m = /^(\d{4})-(\d{2})$/.exec(oy);
  const n = m ? Number(m[2]) : 0;
  return m && n >= 1 && n <= 12 ? new Date(Date.UTC(Number(m[1]), n, 0)).getUTCDate() : null;
}

/** Oldingi oy kaliti (`YYYY-MM`). Kalit notoʻgʻri boʻlsa — oʻzi. */
export function oldingiOy(oy: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(oy);
  if (!m) return oy;
  const y = Number(m[1]);
  const n = Number(m[2]);
  return n === 1 ? `${y - 1}-12` : `${y}-${String(n - 1).padStart(2, '0')}`;
}

/** Keyingi oyning `kun`-sanasi (ISO). Kun yoʻq — `null`. Oyda shuncha kun boʻlmasa — oxirgi kun. */
export function keyingiOySanasi(oy: string, kun: number | null): string | null {
  if (kun === null || !Number.isFinite(kun) || !/^\d{4}-\d{2}$/.test(oy)) return null;
  const [y, m] = oy.split('-').map(Number) as [number, number];
  const yil = m === 12 ? y + 1 : y;
  const oyN = m === 12 ? 1 : m + 1;
  const oxirgi = new Date(Date.UTC(yil, oyN, 0)).getUTCDate();
  const k = Math.min(Math.max(1, Math.round(kun)), oxirgi);
  return `${yil}-${String(oyN).padStart(2, '0')}-${String(k).padStart(2, '0')}`;
}

export interface OyHisobi {
  oy: string;
  /** Sotuv (xaridor toʻlagan toʻliq narx) — sotuvchi yozgan yoki oʻlchovdan taxmin. */
  sotuvSom: number | null;
  sotuvManbasi: 'kabinet' | 'olchov' | null;
  /** Uzum komissiyasi va logistika — sotuvchi yozgan (kabinet hisobotidan). */
  komissiyaSom: number | null;
  /** Sof tushum = sotuv − komissiya. Ikkalasi boʻlmasa `null`. */
  sofSom: number | null;
  soliq: OylikSoliq;
  /** Ijtimoiy soliq toʻlov muddati (keyingi oyning `tolovKuni`-sanasi). */
  ijtimoiyMuddat: string | null;
  /** Uzum komissioner hisoboti tayyor boʻladigan sana (keyingi oy). */
  komissionerSana: string | null;
  yetishmaydi: string[];
}

function son(x: unknown): number | null {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null;
}

/**
 * Oy hisobi. `kabinetSotuv` — sotuvchi kabinet hisobotidan yozgan summa
 * (ustun); boʻlmasa `olchovSotuv` (taxmin). Soliq bazasi — toʻliq sotuv,
 * komissiya chegirilmaydi (buxgalter.uz text212712).
 */
export function oyHisobi(q: {
  oy: string; kabinetSotuv: unknown; olchovSotuv: unknown; komissiya: unknown; f: HisobotFaktlar;
}): OyHisobi {
  const kabinet = son(q.kabinetSotuv);
  const olchov = son(q.olchovSotuv);
  const sotuvSom = kabinet ?? olchov;
  const komissiyaSom = son(q.komissiya);
  const soliq = oylikSoliq(q.f.soliq, sotuvSom);
  const yetishmaydi = [...soliq.yetishmaydi];
  if (komissiyaSom === null) yetishmaydi.push('komissiya summasi');
  return {
    oy: q.oy,
    sotuvSom,
    sotuvManbasi: kabinet !== null ? 'kabinet' : olchov !== null ? 'olchov' : null,
    komissiyaSom,
    sofSom: sotuvSom !== null && komissiyaSom !== null ? Math.max(0, sotuvSom - komissiyaSom) : null,
    soliq,
    ijtimoiyMuddat: keyingiOySanasi(q.oy, q.f.soliq.tolovKuni),
    komissionerSana: keyingiOySanasi(q.oy, q.f.komissionerKun),
    yetishmaydi,
  };
}

/**
 * Deklaratsiya qadam kartalari (ssenariy: "my.soliq.uz ga kiring … 1-qadam
 * …", 7-qadamdagi kabi). Hamma raqam va manzil — faktdan; yoʻq boʻlsa
 * "faktda yoʻq". Tasdiqlanmagan qoida (hisobot davri) shunday aytiladi.
 */
export function deklaratsiyaQadamlari(h: OyHisobi, f: HisobotFaktlar): string[] {
  const s = h.soliq;
  const agent = f.agent ? ` ${f.agent}.` : '';
  const oziTopshirsa = f.aylanmaDavri && f.aylanmaKun !== null
    ? ` (${f.aylanmaDavri}dan keyingi oyning ${f.aylanmaKun}-sanasigacha — tasdiqlanishi kerak)` : '';
  return [
    `Uzum kabinetidan ${oyNomi(h.oy)} uchun komissioner hisobotini yuklab oling${h.komissionerSana ? ` (${h.komissionerSana} gacha tayyor boʻladi)` : ''} — soliq hisobotining asos hujjati.`,
    `${f.portalUrl ?? 'Soliq portali (manzil faktda yoʻq)'} ga E-imzo (ERI) bilan kiring.`,
    `Ijtimoiy soliq: ${s.ijtimoiySom !== null ? `${minglik(s.ijtimoiySom)} soʻm` : 'miqdor faktda yoʻq'} — ${h.ijtimoiyMuddat ?? 'muddat faktda yoʻq'} gacha toʻlang, sotuv boʻlmasa ham.`,
    `Aylanma soligʻi (${f.soliq.aylanmaFoiz ?? '?'} %): ${s.aylanmaSom !== null ? `${minglik(s.aylanmaSom)} soʻm` : 'hisoblanmadi'}.${agent} Komissioner hisobotida ushlab qolinganini tekshiring; ushlanmagan boʻlsa hisob-kitobni oʻzingiz topshirasiz${oziTopshirsa}.`,
    'Toʻlov kvitansiyasi va hisobotni saqlang — keyingi oy solishtiramiz.',
  ];
}
