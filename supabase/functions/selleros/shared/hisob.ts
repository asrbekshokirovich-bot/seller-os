/**
 * BOSH SAHIFA HISOBLAGICHI — ismsiz sanoq (nazoratchi, 2026-10-28: «hisoblagich qoʻy»).
 *
 * NEGA. Bosh sahifani nechta odam ochishi, nechtasi chatni boshlashi bilinmasdi. Chat
 * jadvallarida sinov sessiyalari aralash — haqiqiy mijozni ajratib boʻlmasdi. Bosh sahifa
 * yangilansa, «yaxshi boʻldimi?» degan savolga javob yoʻq edi.
 *
 * TOʻRT BOSQICH (voronka): bosh sahifa ochildi → «Boshlash» bosildi → chatda birinchi javob →
 * yoʻnalishlar chiqdi. Sayt brauzerdan `POST /hisob` ga faqat NOMNI yuboradi (va sinovchi
 * brauzeri ekanini). Bazada `events` ga `user_id` siz yoziladi (0076) — ism, telefon, IP,
 * sessiya YOZILMAYDI.
 *
 * Panel (/olchov) `GET /hisob-voronka` dan kunma-kun sanoqni oladi. Hisoblagich ishga tushgan
 * kundan oldingi kunlar NOL EMAS — oʻlchanmagan (QOIDALAR §4): `null`, panelda chiziqcha.
 */

type Rpc = <T>(nom: string, arg: unknown) => Promise<T | null>;

/** Bosqichlar tartibi — voronka tartibi ham shu. */
export const HISOB_NOMLARI = ['bosh_ochildi', 'bosh_boshladi', 'suhbat_birinchi_javob', 'suhbat_yonalish'] as const;
export type HisobNomi = (typeof HISOB_NOMLARI)[number];

export function hisobNomimi(x: unknown): x is HisobNomi {
  return typeof x === 'string' && (HISOB_NOMLARI as readonly string[]).includes(x);
}

/** `POST /hisob` — `{nom, sinov?}`. Javob: HTTP holat va tana (Edge va Fastify bir xil). */
export async function hisobniYoz(
  rpc: Rpc, tana: Record<string, unknown>,
): Promise<{ status: number; tana: Record<string, unknown> }> {
  if (!hisobNomimi(tana.nom)) return { status: 400, tana: { xato: 'nomaʼlum hisob' } };
  const n = await rpc<{ ok?: boolean; xato?: string; sabab?: string }>('so_hisob_yoz', {
    p_nom: tana.nom,
    p_sinov: tana.sinov === true,
  });
  if (n === null) return { status: 503, tana: { xato: 'baza javob bermadi' } };
  if (n.xato) return { status: 400, tana: { xato: n.xato } };
  // Daqiqalik chegaraga yetsa — yozilmadi, lekin bu xato emas (sahifa hech narsa koʻrsatmaydi).
  return { status: 200, tana: n.ok === true ? { ok: true } : { ok: false, sabab: n.sabab ?? null } };
}

/** Panel davri (kun) — standart va chegara bazadagidek (`so_hisob_voronka`: 1–90, standart 14). */
export const VORONKA_KUN = 14;

/** `GET /hisob-voronka?kun=N`. */
export async function voronkaniOl(
  rpc: Rpc, kunXom: string | null,
): Promise<{ status: number; tana: Record<string, unknown> }> {
  const kun = kunXom === null || kunXom.trim() === '' ? VORONKA_KUN : Number(kunXom);
  const v = await rpc<unknown>('so_hisob_voronka', { p_kun: Number.isInteger(kun) ? kun : VORONKA_KUN });
  if (v === null) return { status: 503, tana: { olchov_yoq: true, sabab: 'baza javob bermadi' } };
  return { status: 200, tana: { olchov_yoq: false, voronka: v } };
}

/** Bir kunlik sanoq. `null` — oʻsha kuni hisoblagich hali ishlamagan (nol emas). */
export interface VoronkaKuni {
  sana: string;
  ochdi: number | null;
  boshladi: number | null;
  javob: number | null;
  yonalish: number | null;
}

export interface Voronka {
  kun: number;
  /** Hisoblagich birinchi yozgan kun (`YYYY-MM-DD`). `null` — hali hech narsa sanalmagan. */
  boshlandi: string | null;
  /** Davrdagi sinov yozuvlari — sanoqqa kirmagan. */
  sinov: number;
  /** Bugundan orqaga. */
  kunlar: VoronkaKuni[];
  /** Oʻlchangan kunlar yigʻindisi; hech bir kun oʻlchanmagan boʻlsa — `null`. */
  jami: Omit<VoronkaKuni, 'sana'>;
}

const BOSQICHLAR = ['ochdi', 'boshladi', 'javob', 'yonalish'] as const;
const SANA = /^\d{4}-\d{2}-\d{2}$/;
const sanoqmi = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0;

/**
 * `so_hisob_voronka` javobini oʻqiydi. Shakli buzuq — `null`: panel «olinmadi» deydi,
 * boʻsh jadval emas (boʻsh jadval «hech kim kirmadi» degan daʼvo boʻlardi).
 */
export function voronkaOqi(xom: unknown): Voronka | null {
  if (typeof xom !== 'object' || xom === null) return null;
  const o = xom as Record<string, unknown>;
  const boshlandi = o.boshlandi === null || o.boshlandi === undefined ? null
    : typeof o.boshlandi === 'string' && SANA.test(o.boshlandi) ? o.boshlandi : undefined;
  if (boshlandi === undefined || !sanoqmi(o.kun) || !sanoqmi(o.sinov) || !Array.isArray(o.kunlar)) return null;

  const kunlar: VoronkaKuni[] = [];
  for (const k of o.kunlar as unknown[]) {
    if (typeof k !== 'object' || k === null) return null;
    const q = k as Record<string, unknown>;
    if (typeof q.sana !== 'string' || !SANA.test(q.sana) || !BOSQICHLAR.every((b) => sanoqmi(q[b]))) return null;
    // Hisoblagich ishga tushmagan kun — oʻlchanmagan (sanalar `YYYY-MM-DD`: matn tartibi = sana tartibi).
    const olchandi = boshlandi !== null && q.sana >= boshlandi;
    kunlar.push({
      sana: q.sana,
      ochdi: olchandi ? (q.ochdi as number) : null,
      boshladi: olchandi ? (q.boshladi as number) : null,
      javob: olchandi ? (q.javob as number) : null,
      yonalish: olchandi ? (q.yonalish as number) : null,
    });
  }

  const olchangan = kunlar.filter((k) => k.ochdi !== null);
  const yigindi = (b: (typeof BOSQICHLAR)[number]) => (olchangan.length
    ? olchangan.reduce((s, k) => s + (k[b] ?? 0), 0)
    : null);
  return {
    kun: o.kun,
    boshlandi,
    sinov: o.sinov,
    kunlar,
    jami: { ochdi: yigindi('ochdi'), boshladi: yigindi('boshladi'), javob: yigindi('javob'), yonalish: yigindi('yonalish') },
  };
}

/** Ulush, butun foizda: `qism / butun`. Biri yoʻq yoki butun nol — `null` (nol foiz emas). */
export function ulush(qism: number | null, butun: number | null): number | null {
  if (qism === null || butun === null || butun <= 0) return null;
  return Math.round((qism / butun) * 100);
}
