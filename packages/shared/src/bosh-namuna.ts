/**
 * BOSH SAHIFA NAMUNASI — bugungi bazadan haqiqiy yoʻnalishlar (nazoratchi, 2026-10-28:
 * «hammasini qil»; 2-taklif — «Misol foyda» oʻrniga bugungi haqiqiy raqamlar).
 *
 * NEGA. Bosh sahifada «Silikon gʻilof · ball 78 · sof foyda +9,0 mln» kartasi turardi —
 * oʻylab topilgan misol, kichkina «misol» belgisi bilan. Yangi odam uni «9 mln foyda
 * qilaman» degan vaʼda deb oʻqirdi; chatda boshqa raqam koʻrsa, ishonch ketardi.
 *
 * ENDI bosh sahifada 2-qadamning OʻZI: 30 mln soʻm bilan boshlaganda bugun turli sohalardagi
 * eng yuqori baholangan uch yoʻnalish — chatdagi kod bilan bir xil (`yonalishlar`, sohasiz:
 * har sohaning eng yaxshisi navbat bilan), sotuvchilar soni, katta doʻkonlar ulushi va Uzumdagi
 * rasmlari bilan. Foyda vaʼda qilinmaydi.
 *
 * Tavsiya JURNALGA yozilmaydi (`/yonalishlar` dan farqi): bu hech kimga berilgan tavsiya
 * emas — sahifadagi namuna. Sayt uni bir soat keshda saqlaydi.
 */

import { KESH_ESKI_SOAT, turkumRasmlari, yonalishlar, type NomzodJavobi, type TovarNomzodi } from './qadamlar.js';

type Rpc = <T>(nom: string, arg: unknown) => Promise<T | null>;

/** Namuna byudjeti — chatdagi «30 mln soʻm» tugmasi. */
export const NAMUNA_BYUDJET = 30_000_000;
export const NAMUNA_SONI = 3;

export interface NamunaYonalish {
  categoryId: number;
  name: string;
  /** Soha id (`soha.ts`) yoki `boshqa`. */
  soha: string;
  /** Imkoniyat bahosi, 0–100 (butun). `null` — baholanmagan. */
  ball: number | null;
  sotuvchiSoni: number | null;
  /** Eng katta 3 doʻkonning savdodagi ulushi, foizda. */
  top3Ulush: number | null;
  rasmlar: Array<{ url: string; nom: string }>;
}

export interface BoshNamuna {
  byudjet: number;
  /** Nomzodlar keshi qachon hisoblangan (ISO). */
  hisoblandi: string | null;
  kesh_eskirgan: boolean;
  royxat: NamunaYonalish[];
}

/** `GET /bosh-namuna` (Edge va Fastify bir xil). `oy` — Toshkent oyi (mavsum balli uchun). */
export async function boshNamunasi(
  rpc: Rpc, oy: number,
): Promise<{ status: number; tana: Record<string, unknown> }> {
  const kesh = await rpc<NomzodJavobi>('so_yonalish_nomzodlari', {});
  if (kesh === null) return { status: 503, tana: { olchov_yoq: true, sabab: 'baza javob bermadi' } };
  // Boʻsh roʻyxat «yoʻnalish yoʻq» emas — «hali hisoblanmadi» (QOIDALAR §4).
  if (!kesh.royxat?.length) return { status: 503, tana: { olchov_yoq: true, sabab: 'nomzodlar hali hisoblanmadi' } };

  const top = yonalishlar(kesh.royxat, NAMUNA_BYUDJET, null, oy, null).royxat.slice(0, NAMUNA_SONI);
  // Rasmlar — chatdagi kartadagidek (`/turkum-rasmlari`): turkumda eng koʻp sotilayotganlari.
  const tovarlar = await Promise.all(top.map((y) =>
    rpc<{ royxat?: TovarNomzodi[] }>('so_tovar_royxati', { p_category_external_id: y.categoryId, p_limit: 20 })));
  const namuna: BoshNamuna = {
    byudjet: NAMUNA_BYUDJET,
    hisoblandi: kesh.hisoblandi,
    kesh_eskirgan: kesh.yoshi_soat !== null && kesh.yoshi_soat > KESH_ESKI_SOAT,
    royxat: top.map((y, i) => ({
      categoryId: y.categoryId,
      name: y.name,
      soha: y.soha,
      ball: y.ball.value === null ? null : Math.round(y.ball.value),
      sotuvchiSoni: y.dalil.sotuvchiSoni,
      top3Ulush: y.dalil.top3Ulush,
      rasmlar: turkumRasmlari(tovarlar[i]?.royxat ?? [], 3),
    })),
  };
  return { status: 200, tana: { olchov_yoq: false, namuna } };
}

const sonmi = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const sonYokiNull = (x: unknown): number | null | undefined => (x === null ? null : sonmi(x) ? x : undefined);

/**
 * Saytda: Edge javobidagi namunani oʻqiydi. Shakli buzuq yoki roʻyxat boʻsh — `null`:
 * sahifa raqam toʻqimaydi, namuna oʻrnida halol izoh chiqadi.
 */
export function boshNamunaOqi(xom: unknown): BoshNamuna | null {
  if (typeof xom !== 'object' || xom === null) return null;
  const o = xom as Record<string, unknown>;
  if (!sonmi(o.byudjet) || !Array.isArray(o.royxat) || o.royxat.length === 0) return null;
  if (o.hisoblandi !== undefined && o.hisoblandi !== null && typeof o.hisoblandi !== 'string') return null;
  const royxat: NamunaYonalish[] = [];
  for (const x of o.royxat as unknown[]) {
    if (typeof x !== 'object' || x === null) return null;
    const y = x as Record<string, unknown>;
    const ball = sonYokiNull(y.ball);
    const sotuvchiSoni = sonYokiNull(y.sotuvchiSoni);
    const top3Ulush = sonYokiNull(y.top3Ulush);
    if (!sonmi(y.categoryId) || typeof y.name !== 'string' || y.name.trim() === '' || typeof y.soha !== 'string'
      || ball === undefined || sotuvchiSoni === undefined || top3Ulush === undefined) return null;
    const rasmlar = Array.isArray(y.rasmlar)
      ? (y.rasmlar as unknown[]).filter((r): r is { url: string; nom: string } =>
        typeof r === 'object' && r !== null && typeof (r as { url?: unknown }).url === 'string'
        && /^https:\/\//u.test((r as { url: string }).url) && typeof (r as { nom?: unknown }).nom === 'string')
        .slice(0, 3)
      : [];
    royxat.push({ categoryId: y.categoryId, name: y.name, soha: y.soha, ball, sotuvchiSoni, top3Ulush, rasmlar });
  }
  return {
    byudjet: o.byudjet,
    hisoblandi: typeof o.hisoblandi === 'string' ? o.hisoblandi : null,
    kesh_eskirgan: o.kesh_eskirgan === true,
    royxat,
  };
}
