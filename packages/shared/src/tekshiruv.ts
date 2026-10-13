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
 *
 * KIRILL VA RUS (2026-10-13). Yordamchi endi mijoz yozgan tilda javob
 * beradi (nazoratchi): oʻzbek kirill va rus. Darvoza faqat lotinni bilsa,
 * "10 млн" 10 deb (erkin sanoq), "двадцать процентов" esa umuman son
 * emas deb oʻqilardi — manbasiz raqam darvozadan oʻtib ketardi. Endi
 * kirill koʻpaytuvchilar, oʻzbek kirill va rus son-soʻzlari, kirill
 * birliklari va kafolat iboralari ham tanilad.
 */

/** Raqamdan keyingi koʻpaytuvchi (lotin, oʻzbek kirill, rus). */
function kopaytuvchi(soz: string | undefined): number | undefined {
  if (!soz) return undefined;
  const s = soz.toLowerCase();
  if (/^(ming|минг|тыс)/u.test(s)) return 1_000;
  if (/^(mln|million|млн|миллион)/u.test(s)) return 1_000_000;
  if (/^(mlrd|milliard|млрд|миллиард)/u.test(s)) return 1_000_000_000;
  return undefined;
}

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

/** O\u02bbzbek kirill son-so\u02bbzlari (qo\u02bbshimchasiz). \u00ab\u044e\u0437\u00bb \u2014 lotindagi \u00abyuz\u00bb kabi ko\u02bbpaytiradi. */
const KIR_SON = new Map<string, number>([
  ['\u043d\u043e\u043b', 0], ['\u0431\u0438\u0440', 1], ['\u0438\u043a\u043a\u0438', 2], ['\u0443\u0447', 3], ['\u0442\u045e\u0440\u0442', 4], ['\u0442\u0443\u0440\u0442', 4], ['\u0431\u0435\u0448', 5], ['\u043e\u043b\u0442\u0438', 6], ['\u0435\u0442\u0442\u0438', 7],
  ['\u0441\u0430\u043a\u043a\u0438\u0437', 8], ['\u0442\u045e\u049b\u049b\u0438\u0437', 9], ['\u0442\u0443\u043a\u043a\u0438\u0437', 9], ['\u045e\u043d', 10], ['\u0443\u043d', 10], ['\u0439\u0438\u0433\u0438\u0440\u043c\u0430', 20], ['\u045e\u0442\u0442\u0438\u0437', 30], ['\u0443\u0442\u0442\u0438\u0437', 30],
  ['\u049b\u0438\u0440\u049b', 40], ['\u043a\u0438\u0440\u043a', 40], ['\u044d\u043b\u043b\u0438\u043a', 50], ['\u043e\u043b\u0442\u043c\u0438\u0448', 60], ['\u0435\u0442\u043c\u0438\u0448', 70], ['\u0441\u0430\u043a\u0441\u043e\u043d', 80], ['\u0442\u045e\u049b\u0441\u043e\u043d', 90], ['\u0442\u0443\u043a\u0441\u043e\u043d', 90],
]);
const KIR_KOP = new Map<string, number>([
  ['\u044e\u0437', 100], ['\u043c\u0438\u043d\u0433', 1_000], ['\u043c\u0438\u043b\u043b\u0438\u043e\u043d', 1_000_000], ['\u043c\u043b\u043d', 1_000_000], ['\u043c\u0438\u043b\u043b\u0438\u0430\u0440\u0434', 1_000_000_000], ['\u043c\u043b\u0440\u0434', 1_000_000_000],
]);

/** Rus son-so\u02bbzlari (asosiy kelishiklar bilan) \u2014 hammasi qo\u02bbshiladi: \u00ab\u0434\u0432\u0435\u0441\u0442\u0438 \u043f\u044f\u0442\u044c\u0434\u0435\u0441\u044f\u0442\u00bb = 250. */
const RU_SON = new Map<string, number>([
  ['\u043d\u043e\u043b\u044c', 0], ['\u043e\u0434\u0438\u043d', 1], ['\u043e\u0434\u043d\u0430', 1], ['\u043e\u0434\u043d\u043e', 1], ['\u043e\u0434\u043d\u043e\u0433\u043e', 1], ['\u043e\u0434\u043d\u043e\u0439', 1], ['\u0434\u0432\u0430', 2], ['\u0434\u0432\u0435', 2], ['\u0434\u0432\u0443\u0445', 2],
  ['\u0442\u0440\u0438', 3], ['\u0442\u0440\u0435\u0445', 3], ['\u0447\u0435\u0442\u044b\u0440\u0435', 4], ['\u0447\u0435\u0442\u044b\u0440\u0435\u0445', 4], ['\u043f\u044f\u0442\u044c', 5], ['\u043f\u044f\u0442\u0438', 5], ['\u0448\u0435\u0441\u0442\u044c', 6], ['\u0448\u0435\u0441\u0442\u0438', 6],
  ['\u0441\u0435\u043c\u044c', 7], ['\u0441\u0435\u043c\u0438', 7], ['\u0432\u043e\u0441\u0435\u043c\u044c', 8], ['\u0432\u043e\u0441\u044c\u043c\u0438', 8], ['\u0434\u0435\u0432\u044f\u0442\u044c', 9], ['\u0434\u0435\u0432\u044f\u0442\u0438', 9], ['\u0434\u0435\u0441\u044f\u0442\u044c', 10], ['\u0434\u0435\u0441\u044f\u0442\u0438', 10],
  ['\u043e\u0434\u0438\u043d\u043d\u0430\u0434\u0446\u0430\u0442\u044c', 11], ['\u0434\u0432\u0435\u043d\u0430\u0434\u0446\u0430\u0442\u044c', 12], ['\u0442\u0440\u0438\u043d\u0430\u0434\u0446\u0430\u0442\u044c', 13], ['\u0447\u0435\u0442\u044b\u0440\u043d\u0430\u0434\u0446\u0430\u0442\u044c', 14], ['\u043f\u044f\u0442\u043d\u0430\u0434\u0446\u0430\u0442\u044c', 15],
  ['\u0448\u0435\u0441\u0442\u043d\u0430\u0434\u0446\u0430\u0442\u044c', 16], ['\u0441\u0435\u043c\u043d\u0430\u0434\u0446\u0430\u0442\u044c', 17], ['\u0432\u043e\u0441\u0435\u043c\u043d\u0430\u0434\u0446\u0430\u0442\u044c', 18], ['\u0434\u0435\u0432\u044f\u0442\u043d\u0430\u0434\u0446\u0430\u0442\u044c', 19],
  ['\u0434\u0432\u0430\u0434\u0446\u0430\u0442\u044c', 20], ['\u0434\u0432\u0430\u0434\u0446\u0430\u0442\u0438', 20], ['\u0442\u0440\u0438\u0434\u0446\u0430\u0442\u044c', 30], ['\u0442\u0440\u0438\u0434\u0446\u0430\u0442\u0438', 30], ['\u0441\u043e\u0440\u043e\u043a', 40], ['\u0441\u043e\u0440\u043e\u043a\u0430', 40],
  ['\u043f\u044f\u0442\u044c\u0434\u0435\u0441\u044f\u0442', 50], ['\u043f\u044f\u0442\u0438\u0434\u0435\u0441\u044f\u0442\u0438', 50], ['\u0448\u0435\u0441\u0442\u044c\u0434\u0435\u0441\u044f\u0442', 60], ['\u0448\u0435\u0441\u0442\u0438\u0434\u0435\u0441\u044f\u0442\u0438', 60], ['\u0441\u0435\u043c\u044c\u0434\u0435\u0441\u044f\u0442', 70], ['\u0441\u0435\u043c\u0438\u0434\u0435\u0441\u044f\u0442\u0438', 70],
  ['\u0432\u043e\u0441\u0435\u043c\u044c\u0434\u0435\u0441\u044f\u0442', 80], ['\u0432\u043e\u0441\u044c\u043c\u0438\u0434\u0435\u0441\u044f\u0442\u0438', 80], ['\u0434\u0435\u0432\u044f\u043d\u043e\u0441\u0442\u043e', 90], ['\u0434\u0435\u0432\u044f\u043d\u043e\u0441\u0442\u0430', 90],
  ['\u0441\u0442\u043e', 100], ['\u0441\u0442\u0430', 100], ['\u0434\u0432\u0435\u0441\u0442\u0438', 200], ['\u0434\u0432\u0443\u0445\u0441\u043e\u0442', 200], ['\u0442\u0440\u0438\u0441\u0442\u0430', 300], ['\u0442\u0440\u0435\u0445\u0441\u043e\u0442', 300], ['\u0447\u0435\u0442\u044b\u0440\u0435\u0441\u0442\u0430', 400],
  ['\u043f\u044f\u0442\u044c\u0441\u043e\u0442', 500], ['\u043f\u044f\u0442\u0438\u0441\u043e\u0442', 500], ['\u0448\u0435\u0441\u0442\u044c\u0441\u043e\u0442', 600], ['\u0441\u0435\u043c\u044c\u0441\u043e\u0442', 700], ['\u0432\u043e\u0441\u0435\u043c\u044c\u0441\u043e\u0442', 800], ['\u0434\u0435\u0432\u044f\u0442\u044c\u0441\u043e\u0442', 900],
  ['\u043f\u043e\u043b\u0442\u043e\u0440\u0430', 1.5], ['\u043f\u043e\u043b\u0442\u043e\u0440\u044b', 1.5],
]);

/** Rus ko\u02bbpaytuvchilari (so\u02bbz boshi bo\u02bbyicha: \u0442\u044b\u0441\u044f\u0447\u0430/\u0442\u044b\u0441\u044f\u0447\u0438/\u0442\u044b\u0441\u044f\u0447, \u043c\u0438\u043b\u043b\u0438\u043e\u043d/\u043c\u0438\u043b\u043b\u0438\u043e\u043d\u0430/\u043c\u0438\u043b\u043b\u0438\u043e\u043d\u043e\u0432\u2026). */
function ruKop(w: string): number | undefined {
  if (/^\u0442\u044b\u0441/u.test(w)) return 1_000;
  if (/^(\u043c\u043b\u043d|\u043c\u0438\u043b\u043b\u0438\u043e\u043d)/u.test(w)) return 1_000_000;
  if (/^(\u043c\u043b\u0440\u0434|\u043c\u0438\u043b\u043b\u0438\u0430\u0440\u0434)/u.test(w)) return 1_000_000_000;
  return undefined;
}

/**
 * Bitta so\u02bbzning son qiymati: `qosh` \u2014 qo\u02bbshiladi (bir, yigirma, \u0434\u0432\u0435\u0441\u0442\u0438),
 * `yuz` \u2014 oldingisini 100 ga ko\u02bbpaytiradi (o\u02bbzbekcha \u00abikki yuz\u00bb), `kop` \u2014
 * ming/million/milliard.
 */
function sozQiymati(tok: string): { tur: 'qosh' | 'yuz' | 'kop'; q: number } | null {
  const w = sozNorm(tok);
  if (SOZ_BIR.has(w)) return { tur: 'qosh', q: SOZ_BIR.get(w)! };
  if (SOZ_ON.has(w)) return { tur: 'qosh', q: SOZ_ON.get(w)! };
  if (SOZ_KOP.has(w)) return w === 'yuz' ? { tur: 'yuz', q: 100 } : { tur: 'kop', q: SOZ_KOP.get(w)! };
  const k = tok.toLowerCase().replace(/\u0451/gu, '\u0435');
  const kq = k.replace(/(\u043b\u0430\u0440\u0434\u0430\u043d|\u043b\u0430\u0440\u043d\u0438|\u043b\u0430\u0440\u0433\u0430|\u043b\u0430\u0440|\u0442\u0430|\u0434\u0430\u043d|\u0433\u0430|\u043d\u0438|\u0434\u0430|\u0434\u0438\u0440|\u0447\u0430|\u043b\u0430\u0431)$/u, '');
  if (KIR_SON.has(kq)) return { tur: 'qosh', q: KIR_SON.get(kq)! };
  if (KIR_KOP.has(kq)) return kq === '\u044e\u0437' ? { tur: 'yuz', q: 100 } : { tur: 'kop', q: KIR_KOP.get(kq)! };
  if (RU_SON.has(k)) return { tur: 'qosh', q: RU_SON.get(k)! };
  const rk = ruKop(k);
  return rk !== undefined ? { tur: 'kop', q: rk } : null;
}

/**
 * Sondan keyingi DA'VO birligi: "3 qadam" sanoq, "3% komissiya" da'vo.
 * Kirill birliklari ham: "3 \u043f\u0440\u043e\u0446\u0435\u043d\u0442\u0430", "5 \u0441\u045e\u043c", "10 \u0434\u043e\u043d\u0430".
 */
const DAVO_BIRLIK = /^[^0-9]{0,10}?(%|foiz|\u0444\u043e\u0438\u0437|\u043f\u0440\u043e\u0446\u0435\u043d\u0442|dona|\u0434\u043e\u043d\u0430|\u0448\u0442\u0443\u043a|\u0448\u0442|so[\u02bb'\u2018\u2019]?m\b|som\b|\u0441\u045e\u043c|\u0441\u0443\u043c|usd|dollar|\u0434\u043e\u043b\u043b\u0430\u0440|kg\b|\u043a\u0433|gramm|\u0433\u0440\u0430\u043c\u043c)/iu;

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

  // Ko\u02bbpaytuvchi: lotin, o\u02bbzbek kirill va rus ("10 mln", "10 \u043c\u043b\u043d", "5 \u0442\u044b\u0441\u044f\u0447", "3 \u043c\u0438\u043b\u043b\u0438\u043e\u043d\u0430").
  const re = /(\d+(?:[ .,]\d{3})*(?:[.,]\d+)?)\s*(mingta|ming|mln|million|mlrd|milliard|\u043c\u0438\u043d\u0433|\u043c\u043b\u043d|\u043c\u0438\u043b\u043b\u0438\u043e\u043d\p{L}*|\u043c\u043b\u0440\u0434|\u043c\u0438\u043b\u043b\u0438\u0430\u0440\u0434\p{L}*|\u0442\u044b\u0441\p{L}*)?/giu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const raw = m[1]!.replace(/(?<=\d)[ .,](?=\d{3}\b)/g, '').replace(',', '.');
    let q = Number(raw);
    if (!Number.isFinite(q)) continue;
    const kop = kopaytuvchi(m[2]);
    if (kop) q *= kop;
    chiqdi.push({ xom: m[0].trim(), qiymat: q, keyin: s.slice(re.lastIndex, re.lastIndex + 14) });
  }

  // So'z bilan yozilgan sonlar (lotin, o\u02bbzbek kirill, rus). Oldidan raqam
  // kelgan ketma-ketlik o'tkaziladi ("140 ming" ni yuqoridagi skaner oldi).
  const toks = [...s.matchAll(/[\p{L}'\u2018\u2019\u02bb\u02bc]+/gu)];
  let i = 0;
  while (i < toks.length) {
    let jami = 0, joriy = 0, olindi = false, j = i;
    const bosh = toks[i]!.index!;
    let oxir = bosh;
    while (j < toks.length) {
      const v = sozQiymati(toks[j]![0]);
      if (v === null) break;
      if (v.tur === 'qosh') joriy += v.q;
      else if (v.tur === 'yuz') joriy = (joriy || 1) * 100;
      else { jami += (joriy || 1) * v.q; joriy = 0; }
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

/** Javobdagi birlik soʻzlari — son emas, tashlanadi ("5 000 000 soʻm", "20%", "30 ta"). */
const BIRLIK = /so['\u2018\u2019\u02bb\u02bc]?m|сум|\bsum\b|foiz|%|dona|штук\p{L}*|шт\.?|\bta\b/giu;

/** Ruscha koʻpaytuvchilar — oʻzbekchasiga (rus tilidagi interfeysda "10 млн" yoziladi). */
const RUS_KOP: ReadonlyArray<[RegExp, string]> = [
  [/млрд\.?|миллиард\p{L}*/giu, ' mlrd'],
  [/млн\.?|миллион\p{L}*/giu, ' mln'],
  [/тыс\p{L}*\.?/giu, ' ming'],
];

/** Soʻmdan boshqa valyuta belgisi yoki nomi ("5000$", "5 ming dollar", "100 €", "10 000 usd"). */
export function valyutami(matn: string): boolean {
  return /[$€]|\busd\b|\beur\b|dollar|yevro|evro|доллар|евро/iu.test(String(matn ?? ''));
}

/**
 * «Oʻzim yozaman» maydonidagi javobdan BITTA son: "5 000 000", "10 mln",
 * "1,5 mlrd", "500 тыс", "20%", "oʻn million". Son soʻraladigan savollarda
 * maydon ilgari `type="number"` edi — harf ham, boʻsh joy ham yozib
 * boʻlmasdi (nazoratchi, 2026-10-05). Sayt ham, server ham shu funksiyani
 * ishlatadi.
 *
 * TAXMIN QILINMAYDI: son yoʻq, bir nechta son yoki oraliq/manfiy
 * ("5-10 mln", "-3") — `null`, obunachidan aniq son soʻraladi. Valyuta
 * ("5000$", "5 ming dollar") va "yarim" / "пол…" ham `null`: ilgari ular
 * jimgina 5 000 soʻm va 1 000 000 boʻlib yozilardi (tekshiruv, 2026-10-05).
 */
export function matndanSon(matn: string): number | null {
  let s = tozala(matn).trim();
  if (!s || s.includes('-')) return null;
  if (valyutami(s) || /yarim|(?:^|[^\p{L}])пол/iu.test(s)) return null;
  for (const [re, w] of RUS_KOP) s = s.replace(re, w);
  s = s.replace(BIRLIK, ' ');
  const r = raqamlar(s);
  if (r.length !== 1) return null;
  const q = r[0]!.qiymat;
  return Number.isFinite(q) && q >= 0 ? q : null;
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
  // O\u02bbzbek kirill va rus (2026-10-13: yordamchi mijoz tilida javob beradi). Kirillda `\b` ishlamaydi.
  { re: /\u043a\u0430\u0444\u043e\u043b\u0430\u0442|\u0433\u0430\u0440\u0430\u043d\u0442/iu, sabab: 'kafolat' },
  { re: /(\u0430\u043b\u0431\u0430\u0442\u0442\u0430|\u0430\u043d\u0438\u049b|\u0430\u043d\u0438\u043a)\s+(\u0441\u043e\u0442\u0438\u043b\u0430\u0434|\u0444\u043e\u0439\u0434\u0430)/iu, sabab: 'sotuvni aniq deb va\'da qildi' },
  { re: /\u0434\u0430\u0440\u043e\u043c\u0430\u0434\u0438\u043d\u0433\u0438\u0437\s+\u0431[\u045e\u0443]\u043b\u0430\u0434/iu, sabab: 'daromadni va\'da qildi' },
  { re: /(\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e|\u0442\u043e\u0447\u043d\u043e|\u043d\u0430\u0432\u0435\u0440\u043d\u044f\u043a\u0430)\s+(\u043f\u0440\u043e\u0434\u0430|\u043f\u0440\u0438\u0431\u044b\u043b|\u0437\u0430\u0440\u0430\u0431\u043e\u0442\u0430|\u043e\u043a\u0443\u043f)/iu, sabab: 'sotuvni aniq deb va\'da qildi' },
  { re: /(100|\u0441\u0442\u043e)\s*%\s*(\u0443\u0432\u0435\u0440\u0435\u043d|\u0433\u0430\u0440\u0430\u043d\u0442|\u0438\u0448\u043e\u043d\u0447)/iu, sabab: '100% ishonch' },
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
