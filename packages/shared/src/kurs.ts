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

/** Brauzer CBU dan olgan kurslar — tekshirilgan; yoʻq yoki oʻtmagan valyuta — `null`. */
export type BrauzerKurslari = Readonly<Record<Valyuta, Kurs | null>>;

/** Oqilona chegara, 1 birlik necha soʻm: bundan tashqarisi — xato yoki soxta, qabul qilinmaydi. */
const BRAUZER_CHEGARA: Readonly<Record<Valyuta, readonly [number, number]>> = {
  USD: [8_000, 20_000],
  CNY: [1_000, 3_000],
};

/**
 * BRAUZER YUBORGAN KURS (2026-10-27). cbu.uz 22-oktyabrdan beri serverlarimizga (Supabase Edge,
 * Vercel) javob bermaydi — Edge logi: «TimeoutError … 4004 ms», Vercel orqali ham 502. Mijoz
 * brauzeriga esa ochiq (`Access-Control-Allow-Origin: *`). Shuning uchun suhbat sahifasi CBU
 * qatorlarini (`{USD: {Ccy, Rate, Nominal, Date}, CNY: …}`) oʻzi oladi va soʻrovga qoʻshadi.
 *
 * Bu mijoz yuborgan qiymat — shuning uchun tekshiriladi: CBU shakli (`cbuKursiniOqi`), oqilona
 * chegara (`BRAUZER_CHEGARA`) va sana (Toshkent boʻyicha bugundan 7 kun oldin — ertagacha; CBU
 * ertangi kursni kechqurun eʼlon qiladi). Oʻtmasa — `null`: server CBU ga oʻzi urinadi. Kurs faqat
 * shu mijozning oʻz hisob-kitobiga ketadi — boshqa hech kimga taʼsir qilmaydi.
 */
export function brauzerKursi(x: unknown, bugun: Date = new Date()): BrauzerKurslari {
  const q = x !== null && typeof x === 'object' ? (x as Record<string, unknown>) : {};
  const bitta = (v: Valyuta): Kurs | null => {
    const k = cbuKursiniOqi([q[v]], v);
    if (k === null) return null;
    const [kam, kop] = BRAUZER_CHEGARA[v];
    if (k.somPerYuan < kam || k.somPerYuan > kop) return null;
    const s = /^(\d{2})\.(\d{2})\.(\d{4})$/u.exec(k.sana);
    if (!s) return null;
    const kun = Date.UTC(Number(s[3]), Number(s[2]) - 1, Number(s[1])) / 86_400_000;
    // Toshkent (UTC+5) boʻyicha bugungi kun raqami.
    const bugunKun = Math.floor((bugun.getTime() + 5 * 3_600_000) / 86_400_000);
    return kun >= bugunKun - 7 && kun <= bugunKun + 1 ? k : null;
  };
  return { USD: bitta('USD'), CNY: bitta('CNY') };
}
