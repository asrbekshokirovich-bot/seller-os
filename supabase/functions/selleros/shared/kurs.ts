/**
 * Yuan → soʻm kursi — Markaziy bank (CBU) ochiq JSON dan.
 *
 * NEGA KERAK. 5-qadam 1688 narxini (yuan) 4-qadamdagi chegara narx
 * (soʻm) bilan solishtiradi. Kurs OʻLCHOV, taxmin emas (chegara.ts
 * izohi) — u qayerdan kelgani va qaysi sanaga tegishli ekani javobda
 * turadi.
 *
 * MANBA. `https://cbu.uz/uz/arkhiv-kursov-valyut/json/CNY/` — kalitsiz,
 * ochiq. Oʻlchandi 2026-09-25:
 *
 *   [{"id":1,"Code":"156","Ccy":"CNY","CcyNm_UZ":"Xitoy yuani",
 *     "Nominal":"1","Rate":"1762.49","Diff":"1.17","Date":"25.09.2026"}]
 *
 * `Rate` `Nominal` dona uchun. Hozir 1, lekin baʼzi valyutalarda 10 yoki
 * 100 — shuning uchun boʻlinadi.
 *
 * OLINMASA `null`. Nol emas, kechagi qiymat emas: kurs boʻlmasa soʻmga
 * oʻgirilmaydi va bu ochiq aytiladi (QOIDALAR §4). Sababi — logda (2026-10-27:
 * 22-oktyabrdan beri Edge dan kurs olinmayapti, noutbukdan esa olinadi; sababi
 * hech qayerda koʻrinmas edi — QOIDALAR §8, jim oʻlim yoʻq).
 */

export type Valyuta = 'CNY' | 'USD';

/** CBU JSON manzili — valyuta boʻyicha. USD 6-qadam kargo stavkasi ($/kg) uchun. */
export function cbuManzili(valyuta: Valyuta = 'CNY'): string {
  return `https://cbu.uz/uz/arkhiv-kursov-valyut/json/${valyuta}/`;
}

export interface Kurs {
  /** 1 birlik valyuta necha soʻm (nomi tarixiy: CNY uchun yuan, USD uchun dollar). */
  somPerYuan: number;
  valyuta: Valyuta;
  /** CBU sanasi, "25.09.2026" shaklida — qaysi kunning kursi. */
  sana: string;
  manba: 'CBU';
}

function son(x: unknown): number | null {
  if (typeof x === 'number') return Number.isFinite(x) ? x : null;
  if (typeof x !== 'string' || x.trim() === '') return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/** CBU javobidan kurs. Shakl buzilsa `null` — soxta son emas. */
export function cbuKursiniOqi(json: unknown, valyuta: Valyuta = 'CNY'): Kurs | null {
  const royxat = Array.isArray(json) ? json : [];
  const q = royxat.find(
    (x): x is Record<string, unknown> => x !== null && typeof x === 'object' && (x as Record<string, unknown>).Ccy === valyuta,
  );
  if (!q) return null;
  const rate = son(q.Rate);
  const nominal = son(q.Nominal) ?? 1;
  const sana = typeof q.Date === 'string' && q.Date.trim() !== '' ? q.Date.trim() : null;
  if (rate === null || rate <= 0 || nominal <= 0 || sana === null) return null;
  return { somPerYuan: rate / nominal, valyuta, sana, manba: 'CBU' };
}

/** Kursni oladi. Hech qachon otmaydi; olinmasa `null`, sababi va vaqti — logda. */
export async function kursniOl(f: typeof fetch, valyuta: Valyuta = 'CNY', vaqtChegarasiMs = 10_000): Promise<Kurs | null> {
  const boshi = Date.now();
  const ayt = (sabab: string) => console.warn(`kurs: CBU ${valyuta} olinmadi — ${sabab} (${Date.now() - boshi} ms)`);
  try {
    const r = await f(cbuManzili(valyuta), { signal: AbortSignal.timeout(vaqtChegarasiMs) });
    const matn = await r.text();
    if (!r.ok) {
      ayt(`HTTP ${r.status}: ${birQator(matn)}`);
      return null;
    }
    let json: unknown;
    try {
      json = JSON.parse(matn);
    } catch {
      // Toʻsish sahifasi (HTML) kabi — boshini koʻrsatadi.
      ayt(`JSON emas: ${birQator(matn)}`);
      return null;
    }
    const k = cbuKursiniOqi(json, valyuta);
    if (k === null) ayt(`javob shakli kutilmagan: ${birQator(matn)}`);
    return k;
  } catch (e) {
    const x = e as Error | undefined;
    ayt(`${x?.name ?? 'xato'}: ${birQator(String(x?.message ?? ''))}`);
    return null;
  }
}

/** Logga — bir qatorda, 160 belgigacha. */
function birQator(t: string): string {
  return t.replace(/\s+/gu, ' ').trim().slice(0, 160);
}
