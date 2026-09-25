/**
 * TEKSHIRUV \u2014 LLM jumlasi yuborilishidan oldingi darvoza.
 *
 * Bu mahsulotda LLM tavsiya BERMAYDI (QOIDALAR.md, 3-bo'lim). U kod
 * yozgan tayyor jumlani odamdek qayta aytadi. Xavf shu yerda: qayta
 * aytganda u RAQAM QO'SHISHI mumkin \u2014 "taxminan 30% marja", "kuniga
 * 50 dona" \u2014 va bu raqam hech qayerdan kelmagan bo'ladi. Obunachi
 * esa uni o'lchov deb o'qiydi.
 *
 * Qoida: LLM matnidagi HAR raqam ruxsat hovuzida bo'lishi SHART.
 * Hovuz \u2014 kod yozgan jumla, kod natijasi, va obunachining o'z xabari.
 * Bo'lmasa LLM matni TASHLANADI va kodning jumlasi o'zi ketadi. Ya'ni
 * yiqilish holati ham xavfsiz: eng yomoni \u2014 jumla biroz quruq chiqadi.
 *
 * Ikkinchi darvoza \u2014 TAQIQ leksikasi: kafolat, "albatta sotiladi",
 * "daromadingiz bo'ladi". QOIDALAR.md 4-bo'lim: "kafolat so'zi taqiq".
 *
 * O'zbekcha son-so'zlar ham songa aylantiriladi ("yigirma ming" =
 * 20000): aks holda raqamni so'z bilan yozish darvozani chetlab
 * o'tish yo'li bo'lardi. Bu jonli o'lchangan teshik (zumsavdo,
 * 2026-09-22).
 */

const KOP = new Map<string, number>([
  ['ming', 1_000], ['mingta', 1_000],
  ['mln', 1_000_000], ['million', 1_000_000],
  ['mlrd', 1_000_000_000], ['milliard', 1_000_000_000],
]);

const SOZ_BIR = new Map<string, number>([
  ['nol', 0], ['bir', 1], ['ikki', 2], ['uch', 3], ['tort', 4], ['besh', 5],
  ['olti', 6], ['yetti', 7], ['sakkiz', 8], ['toqqiz', 9],
]);
const SOZ_ON = new Map<string, number>([
  ['on', 10], ['yigirma', 20], ['ottiz', 30], ['qirq', 40], ['ellik', 50],
  ['oltmish', 60], ['yetmish', 70], ['sakson', 80], ['toqson', 90],
]);
const SOZ_KOP = new Map<string, number>([
  ['yuz', 100], ['ming', 1_000], ['million', 1_000_000], ['mln', 1_000_000],
  ['milliard', 1_000_000_000], ['mlrd', 1_000_000_000],
]);

/** Sondan keyingi DA'VO birligi: "3 qadam" sanoq, "3% komissiya" da'vo. */
const DAVO_BIRLIK = /^[^0-9]{0,10}?(%|foiz|dona|so[\u02bb'\u2018\u2019]?m\b|som\b|usd|dollar|kg\b|gramm)/i;

/** Ko'rinmas probel va tirelarni normallashtiradi. */
export function tozala(s: string): string {
  return String(s ?? '')
    .replace(/[\u00a0\u2007\u202f\u2009\u200a\u2060]/g, ' ')
    .replace(/[\u2012\u2013\u2014\u2015\u2212]/g, '-');
}

function sozNorm(w: string): string {
  return w.toLowerCase()
    .replace(/['\u2018\u2019\u02bb\u02bc`]/g, '')
    .replace(/(ta|dan|ga|ni|da|dir|cha|lab|larcha)$/u, '');
}

export interface Raqam { xom: string; qiymat: number; keyin: string }

/** Matndagi hamma raqam \u2014 raqamli ham, so'z bilan yozilgani ham. */
export function raqamlar(matn: string): Raqam[] {
  const s = tozala(matn);
  const chiqdi: Raqam[] = [];

  const re = /(\d+(?:[ .,]\d{3})*(?:[.,]\d+)?)\s*(ming|mingta|mln|million|mlrd|milliard)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const raw = m[1]!.replace(/(?<=\d)[ .,](?=\d{3}\b)/g, '').replace(',', '.');
    let q = Number(raw);
    if (!Number.isFinite(q)) continue;
    const kop = m[2] ? KOP.get(m[2].toLowerCase()) : undefined;
    if (kop) q *= kop;
    chiqdi.push({ xom: m[0].trim(), qiymat: q, keyin: s.slice(re.lastIndex, re.lastIndex + 14) });
  }

  // So'z bilan yozilgan sonlar. Oldidan raqam kelgan ketma-ketlik
  // o'tkaziladi ("140 ming" ni yuqoridagi skaner oldi).
  const toks = [...s.matchAll(/[\p{L}'\u2018\u2019\u02bb\u02bc]+/gu)];
  let i = 0;
  while (i < toks.length) {
    let jami = 0, joriy = 0, olindi = false, j = i;
    const bosh = toks[i]!.index!;
    let oxir = bosh;
    while (j < toks.length) {
      const w = sozNorm(toks[j]![0]);
      if (SOZ_BIR.has(w)) joriy += SOZ_BIR.get(w)!;
      else if (SOZ_ON.has(w)) joriy += SOZ_ON.get(w)!;
      else if (SOZ_KOP.has(w)) {
        const k = SOZ_KOP.get(w)!;
        if (k === 100) joriy = (joriy || 1) * 100;
        else { jami += (joriy || 1) * k; joriy = 0; }
      } else break;
      olindi = true;
      oxir = toks[j]!.index! + toks[j]![0].length;
      j++;
    }
    if (olindi) {
      const oldingi = s.slice(0, bosh).trimEnd().slice(-1);
      const q = jami + joriy;
      if (!/\d/.test(oldingi) && q > 0) {
        chiqdi.push({ xom: s.slice(bosh, oxir), qiymat: q, keyin: s.slice(oxir, oxir + 14) });
      }
      i = j;
    } else i++;
  }
  return chiqdi;
}

/** Yaxlitlashga chidamli tenglik: 0,5% yoki mutlaq 1. */
export function teng(a: number, b: number): boolean {
  if (a === b) return true;
  return Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.005);
}

/** Kichik sanoq (0..12) va 100 \u2014 da'vo birligi bo'lmasa erkin. */
export function erkin(q: number, keyin = ''): boolean {
  if (DAVO_BIRLIK.test(keyin)) return q === 100;
  return (Number.isInteger(q) && q >= 0 && q <= 12) || q === 100;
}

const TAQIQ: ReadonlyArray<{ re: RegExp; sabab: string }> = [
  { re: /\bkafolat/i, sabab: 'kafolat' },
  { re: /\b(albatta|aniq)\s+(sotilad|foyda)/i, sabab: 'sotuvni aniq deb va\'da qildi' },
  { re: /\bdaromadingiz\s+bo[\u02bb'\u2018\u2019]?lad/i, sabab: 'daromadni va\'da qildi' },
  { re: /\b(100|yuz)\s*%\s*(ishonch|kafolat)/i, sabab: '100% ishonch' },
];

export interface TekshiruvNatijasi {
  ok: boolean;
  /** Ruxsat hovuzida yo'q raqamlar (matndagi ko'rinishi). */
  dalilsiz: string[];
  /** Ishlatilgan taqiqlangan iboralar. */
  taqiq: string[];
}

/**
 * LLM matnini tekshiradi.
 *
 * @param matn     LLM yozgani
 * @param manbalar ruxsat hovuzi manbalari: kod jumlasi va boshqa matnlar,
 *                 hamda kod natijasidan olingan sonlar
 */
export function tekshir(
  matn: string,
  manbalar: { matnlar?: string[]; sonlar?: number[] } = {},
): TekshiruvNatijasi {
  const hovuz: number[] = [
    ...(manbalar.sonlar ?? []).filter(Number.isFinite),
    ...(manbalar.matnlar ?? []).flatMap((t) => raqamlar(t).map((r) => r.qiymat)),
  ];
  const dalilsiz: string[] = [];
  for (const r of raqamlar(matn)) {
    if (erkin(r.qiymat, r.keyin)) continue;
    if (hovuz.some((x) => teng(r.qiymat, x))) continue;
    dalilsiz.push(r.xom);
  }
  const taqiq = TAQIQ.filter((t) => t.re.test(matn)).map((t) => t.sabab);
  return { ok: dalilsiz.length === 0 && taqiq.length === 0, dalilsiz: [...new Set(dalilsiz)], taqiq };
}

/**
 * Natija obyektidagi O'LCHOV sonlarini yig'adi \u2014 identifikator va erkin
 * matn EMAS. `id`, `*Id`, `title`, `name` kabi kalitlar tashlanadi:
 * sarlavhadagi "5500 mAh" to'qilgan "5500 dona" ni oqlamasligi kerak.
 */
export function natijaSonlari(x: unknown, kalit: string | null = null, chiqdi: number[] = []): number[] {
  if (x === null || x === undefined) return chiqdi;
  if (kalit && /^(id|.*Id|.*_id|title|name|nom|sabab|reason|hisob|izoh|matn)$/i.test(kalit)) return chiqdi;
  if (typeof x === 'number' && Number.isFinite(x)) { chiqdi.push(x); return chiqdi; }
  if (typeof x === 'string') {
    const n = Number(x);
    if (x.trim() !== '' && Number.isFinite(n)) chiqdi.push(n);
    return chiqdi;
  }
  if (Array.isArray(x)) { for (const v of x) natijaSonlari(v, kalit, chiqdi); return chiqdi; }
  if (typeof x === 'object') {
    for (const [k, v] of Object.entries(x as Record<string, unknown>)) natijaSonlari(v, k, chiqdi);
  }
  return chiqdi;
}
