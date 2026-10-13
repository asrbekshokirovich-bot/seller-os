/**
 * TANISHUV — 1-qadam javoblarini oʻqish: ism-familiya, telefon, byudjet.
 *
 * Nazoratchi qarori (2026-10-12): har yangi suhbat avval ism-familiya va
 * telefonni soʻraydi, keyin savdo tajribasini, keyin qancha pul bilan
 * boshlashni — soʻmda yoki dollarda. Sinovda "Hozir 100 mln pulim bor,
 * lekin 70 mln bilan boshlamoqchiman" deb yozilganda chat "bitta son
 * yozing" deb qayta soʻrardi: matnda ikki son bor edi. Endi gapdagi
 * BOSHLASH summasi olinadi (zid bogʻlovchi, "bilan boshlayman" kabi
 * ishoralar), dollar CBU kursi bilan soʻmga oʻgiriladi.
 *
 * TAXMIN YOʻQ. Ishora boʻlmasa ("50 yoki 70 mln"), birlik aytilmasa
 * ("70" — mln soʻmmi, dollarmi?) — nega tushunilmagani aniq aytiladi va
 * qisqa savol beriladi. Hammasi sof funksiya: server ham, test ham shu.
 */

import { raqamlar, tozala } from './tekshiruv.ts';

const guruh = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/gu, ' ');

// ==================================================================== ism-familiya

/** Ism emas, gap boʻlagi: "Mening ismim …", "Salom, men …", "Меня зовут …". */
const ISM_EMAS = new Set([
  'salom', 'assalom', 'assalomu', 'alaykum', 'aleykum', 'mening', 'meni', 'men', 'ismim', 'ism', 'ismi', 'familiyam',
  'familiya', 'familiyasi', 'sharifim', 'sharif', 'va', 'bu', 'здравствуйте', 'привет', 'меня', 'зовут', 'моё', 'мое',
  'моя', 'имя', 'фамилия', 'я', 'и', 'это',
]);

/** Ota ismi qoʻshimchasi — kichik harf bilan qoladi ("Botir oʻgʻli"). */
const OTASINING = /^(o['ʻʼ‘’`]?g['ʻʼ‘’`]?li|qizi|оглы|кизи)$/iu;

/**
 * Ism-familiya. Kamida ikki soʻz (ism va familiya), raqamsiz, 60 belgigacha.
 * "aziz karimov" → "Aziz Karimov" (hammasi kichik yoki katta boʻlsa), aks
 * holda yozilgandek.
 */
export function ismniOqi(matn: string): { ism: string } | { xato: string } {
  const t = String(matn ?? '').normalize('NFC').trim();
  if (/\d/u.test(t)) return { xato: 'Ism va familiyani raqamsiz yozing — masalan: Aziz Karimov.' };
  if (/[@/\\]|https?:/iu.test(t)) return { xato: 'Ism va familiyangizni yozing — masalan: Aziz Karimov.' };
  const sozlar = [...t.matchAll(/[\p{L}'ʻʼ‘’`-]+/gu)].map((m) => m[0].replace(/^[-'ʻʼ‘’`]+|[-'ʻʼ‘’`]+$/gu, ''))
    .filter((s) => s.length > 0 && !ISM_EMAS.has(s.toLowerCase()));
  if (sozlar.length < 2) return { xato: 'Ism va familiyangizni birga yozing — masalan: Aziz Karimov.' };
  if (sozlar.length > 4 || sozlar.some((s) => [...s].filter((c) => /\p{L}/u.test(c)).length < 2)) {
    return { xato: 'Ism va familiyangizni yozing — masalan: Aziz Karimov.' };
  }
  const birga = sozlar.join(' ');
  const tekis = birga === birga.toLowerCase() || birga === birga.toUpperCase();
  const ism = sozlar
    .map((s) => (OTASINING.test(s) ? s.toLowerCase() : tekis ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s))
    .join(' ');
  if (ism.length > 60) return { xato: 'Juda uzun — faqat ism va familiyani yozing.' };
  return { ism };
}

// ==================================================================== telefon

/**
 * Telefon raqam → `+998901234567`. Oʻzbekiston raqami 9 xonali
 * ("90 123 45 67"), 998 bilan (12 xona) yoki eski "8 90 …" shaklida;
 * chet el raqami — faqat "+" yoki "00" bilan, 10–15 xona.
 */
export function telefonniOqi(matn: string): { telefon: string } | { xato: string } {
  const t = tozala(String(matn ?? '')).trim();
  const misol = 'Telefon raqamni toʻliq yozing — masalan: +998 90 123 45 67.';
  if (!t) return { xato: misol };
  const xalqaro = /^(\+|00)/u.test(t);
  let r = t.replace(/\D/gu, '');
  if (t.startsWith('00')) r = r.slice(2);
  if (r.length === 12 && r.startsWith('998') && /^[2-9]/u.test(r.slice(3))) return { telefon: `+${r}` };
  if (!xalqaro && r.length === 9 && /^[2-9]/u.test(r)) return { telefon: `+998${r}` };
  if (!xalqaro && r.length === 10 && r.startsWith('8') && /^[2-9]/u.test(r.slice(1))) return { telefon: `+998${r.slice(1)}` };
  if (xalqaro && r.length >= 10 && r.length <= 15 && !r.startsWith('998')) return { telefon: `+${r}` };
  if (r.length > 15) return { xato: 'Bitta telefon raqam yozing — masalan: +998 90 123 45 67.' };
  return { xato: misol };
}

/** `+998901234567` → `+998 90 123 45 67`; chet el raqami — oʻzicha. */
export function telefonKorinishi(telefon: string): string {
  const m = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/u.exec(telefon);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : telefon;
}

// ==================================================================== byudjet

/** Dollar tezkor tugmalari — soʻmdagi qiymati suhbat paytidagi CBU kursi bilan. */
export const BYUDJET_DOLLAR = [500, 1_000, 3_000, 5_000] as const;

export interface ByudjetJavobi {
  /** Soʻmda — 2-qadam shu bilan hisoblaydi. */
  som: number;
  /** Dollarda aytilgan boʻlsa — oʻsha summa (koʻrsatish uchun), aks holda `null`. */
  usd: number | null;
}

type Pul = 'som' | 'usd' | 'eur' | null;

interface Summa {
  qiymat: number;
  pul: Pul;
  /** Koʻpaytuvchi: 1 — yozilmagan ("70"), 1e6 — "70 mln". */
  kop: number;
  bosh: number;
  oxir: number;
}

const KOPAYTUVCHI: ReadonlyArray<[RegExp, number]> = [
  [/^(mlrd|milliard|млрд|миллиард)/iu, 1e9],
  [/^(mln|million|млн|миллион)/iu, 1e6],
  [/^(ming|тыс|k$|к$)/iu, 1e3],
];

const PUL_SOZI = '\\$|€|usd(?!\\p{L})|dollar\\p{L}*|доллар\\p{L}*|у\\.?\\s?е\\.?|evro\\p{L}*|yevro\\p{L}*|euro\\p{L}*|евро|eur(?!\\p{L})'
  + '|so[\'ʻʼ‘’`]?m\\p{L}*|sum(?!\\p{L})|сум\\p{L}*';

const SUMMA_RE = new RegExp(
  '(\\$|€)?[ \\t]*(\\d+(?:[ .,]\\d{3})*(?:[.,]\\d+)?)\\s*(yarim\\s*)?'
  + '(mlrd\\p{L}*|milliard\\p{L}*|mln\\.?|million\\p{L}*|ming\\p{L}*|k(?!\\p{L})|к(?!\\p{L})|тыс\\p{L}*\\.?|млн\\.?|млрд\\.?|миллион\\p{L}*|миллиард\\p{L}*)?'
  + `\\s*(${PUL_SOZI})?`,
  'giu',
);

function pulTuri(s: string): Pul {
  const t = s.toLowerCase();
  if (/\$|usd|dollar|доллар|у\.?\s?е/u.test(t)) return 'usd';
  if (/€|evro|yevro|euro|евро|eur/u.test(t)) return 'eur';
  if (/so['ʻʼ‘’`]?m|sum|сум/u.test(t)) return 'som';
  return null;
}

function kopayt(soz: string | undefined): number {
  if (!soz) return 1;
  const t = soz.toLowerCase();
  return KOPAYTUVCHI.find(([re]) => re.test(t))?.[1] ?? 1;
}

/** Matndagi raqamli summalar, joyi bilan. */
function summalar(s: string): Summa[] {
  const chiqdi: Summa[] = [];
  for (const m of s.matchAll(SUMMA_RE)) {
    const xom = m[2]!.replace(/(?<=\d)[ .,](?=\d{3}(?!\d))/gu, '').replace(',', '.');
    let q = Number(xom);
    if (!Number.isFinite(q)) continue;
    if (m[3]) q += 0.5;
    const kop = kopayt(m[4]);
    const bosh = m.index! + (m[0].length - m[0].trimStart().length);
    chiqdi.push({ qiymat: q * kop, pul: pulTuri(`${m[1] ?? ''} ${m[5] ?? ''}`), kop, bosh, oxir: m.index! + m[0].trimEnd().length });
  }
  // "yarim mln" — oldida son yoʻq.
  for (const m of s.matchAll(/(?<![\p{L}\d])yarim\s*(mlrd|milliard|mln|million|ming)\p{L}*/giu)) {
    if (/\d\s*$/u.test(s.slice(0, m.index))) continue; // "1 yarim mln" — yuqorida olindi
    const kop = kopayt(m[1]);
    const oxir = m.index! + m[0].length;
    const keyin = new RegExp(`^\\s*(${PUL_SOZI})`, 'iu').exec(s.slice(oxir))?.[1];
    chiqdi.push({ qiymat: 0.5 * kop, pul: keyin ? pulTuri(keyin) : null, kop, bosh: m.index!, oxir });
  }
  return chiqdi.sort((a, b) => a.bosh - b.bosh);
}

/** Pul emas: yil, dona, kun ("2024 yildan", "2 ta doʻkon", "30 kun"). */
function pulEmasmi(s: string, x: Summa): boolean {
  if (x.pul !== null) return false;
  return /^\s*-?\s*(yil|йил|year|год|ta(?!\p{L})|dona|kun|oy(?!\p{L})|hafta|%|foiz|шт|дн|мес|лет)/iu.test(s.slice(x.oxir, x.oxir + 12));
}

const ZID = /(?<!\p{L})(lekin|ammo|biroq|faqat|но|однако)(?!\p{L})/giu;
const BOSHLASH = /^[\s,.]*(bilan|dan\s+boshla|ga\s+boshla|ajrat|sarfla|tik|kirit|ishlat|boshla|начн|начать|вложу|вложить|потрач)/iu;
const BOR = /^[\s,.]*(pul\p{L}*\s+bor|bor(?!\p{L})|jamg|есть|имею|накоп)/iu;

function summaMatni(x: Summa): string {
  const son = x.qiymat >= 1e6 && x.qiymat % 1e5 === 0 ? `${String(x.qiymat / 1e6).replace('.', ',')} mln` : guruh(x.qiymat);
  return x.pul === 'usd' ? `${son} $` : son;
}

/** Ikki summa orasidagi "-" / "dan" — oraliq ("5-10 mln", "5 dan 10 mln gacha"). */
function oraliqmi(s: string, a: Summa, b: Summa): boolean {
  return /^\s*(-|dan|до|to)\s*$/iu.test(s.slice(a.oxir, b.bosh));
}

/**
 * Byudjet matnidan BOSHLASH summasi (soʻmda). `usdKurs` — 1 $ necha soʻm
 * (CBU); `null` — kurs olinmadi, dollar qabul qilinmaydi va shu aytiladi.
 */
export function byudjetniOqi(matn: string, usdKurs: number | null): ByudjetJavobi | { xato: string } {
  const s = tozala(String(matn ?? '')).normalize('NFC');
  let royxat = summalar(s).filter((x) => !pulEmasmi(s, x));

  if (royxat.length === 0) {
    // Soʻz bilan: "yetmish million", "besh ming dollar".
    const sozlar = raqamlar(s).filter((r) => r.qiymat > 0);
    if (sozlar.length === 1) {
      const q = sozlar[0]!.qiymat;
      royxat = [{ qiymat: q, pul: pulTuri(s), kop: q >= 1000 ? 1000 : 1, bosh: 0, oxir: s.length }];
    } else if (sozlar.length > 1) {
      return { xato: 'Qaysi summa bilan boshlaysiz? Bitta summa yozing — masalan: 30 mln yoki 3000 $.' };
    } else if (/pul\p{L}*\s+yo['ʻʼ‘’`]?q|нет\s+денег|денег\s+нет/iu.test(s)) {
      return { som: 0, usd: null };
    } else {
      return { xato: 'Summani yozing — masalan: 30 mln yoki 3000 $.' };
    }
  }

  // Manfiy: "-5 mln" (oraliq "5-10" emas).
  for (const x of royxat) {
    if (/(^|[^\d\s])\s*-\s*$/u.test(s.slice(0, x.bosh))) return { xato: 'Summa manfiy boʻlmaydi — masalan: 30 mln.' };
  }

  let x: Summa;
  if (royxat.length === 1) x = royxat[0]!;
  else if (royxat.length === 2 && oraliqmi(s, royxat[0]!, royxat[1]!)) {
    // Oraliq — pastki chegara (tugmalar ham "kamida shuncha" ni yozadi);
    // birligi yozilmagan boʻlsa — ikkinchisidan ("5-10 mln" → 5 mln).
    const [a, b] = royxat as [Summa, Summa];
    x = a.kop === 1 && b.kop > 1 ? { ...a, qiymat: a.qiymat * b.kop, kop: b.kop, pul: a.pul ?? b.pul } : { ...a, pul: a.pul ?? b.pul };
  } else {
    // Zid bogʻlovchidan keyingi summa: "100 mln bor, LEKIN 70 mln bilan".
    const zidlar = [...s.matchAll(ZID)];
    const songgi = zidlar.length ? zidlar[zidlar.length - 1]!.index! : -1;
    const keyin = songgi >= 0 ? royxat.filter((r) => r.bosh > songgi) : [];
    const boshlash = royxat.filter((r) => BOSHLASH.test(s.slice(r.oxir, r.oxir + 40))
      || /(?:^|\s)(с|со)\s*$/iu.test(s.slice(Math.max(0, r.bosh - 4), r.bosh)));
    const borlar = royxat.filter((r) => BOR.test(s.slice(r.oxir, r.oxir + 30)));
    const qolgan = royxat.filter((r) => !borlar.includes(r));
    if (keyin.length === 1) x = keyin[0]!;
    else if (boshlash.length === 1) x = boshlash[0]!;
    else if (borlar.length > 0 && qolgan.length === 1) x = qolgan[0]!;
    else {
      const nomlar = royxat.slice(0, 3).map(summaMatni).join(', ');
      return { xato: `Bir nechta summa yozdingiz (${nomlar}). Qaysi biri bilan boshlaymiz? Bittasini yozing.` };
    }
  }

  if (x.pul === 'eur') return { xato: 'Yevroni hisoblay olmayman — soʻmda yoki dollarda yozing (masalan: 30 mln yoki 3000 $).' };
  if (x.pul === 'usd') {
    if (usdKurs === null || !(usdKurs > 0)) return { xato: 'Dollar kursini hozir ololmadim — summani soʻmda yozing (masalan: 30 mln).' };
    if (x.qiymat > 10_000_000) return { xato: 'Summa juda katta — tekshirib qayta yozing.' };
    return { som: Math.round(x.qiymat * usdKurs), usd: x.qiymat };
  }
  // Birligi yoʻq kichik son: "70" — 70 mln soʻmmi yoki 70 $ mi? Taxmin qilinmaydi.
  if (x.pul === null && x.kop === 1 && x.qiymat > 0 && x.qiymat < 100_000) {
    const n = guruh(x.qiymat);
    return x.qiymat < 1000
      ? { xato: `«${n}» — ${n} mln soʻmmi yoki ${n} $ mi? Birligi bilan yozing: ${n} mln yoki ${n} $.` }
      : { xato: `«${n}» — dollarmi? Dollar boʻlsa «${n} $» deb, soʻm boʻlsa toʻliq yozing (masalan: 30 mln).` };
  }
  if (x.qiymat > 1e12) return { xato: 'Summa juda katta — tekshirib qayta yozing.' };
  return { som: Math.round(x.qiymat), usd: null };
}

/**
 * Matndagi hamma summa soʻmda (takrorsiz, kichigi oldin) — mijoz "80 mln
 * bilan boshlasammikan yoki 100 mln bilanmi?" deb maslahat soʻrasa, ular
 * javobdan keyin TUGMA boʻlib chiqadi: bittasini bossa — oʻsha summa bilan
 * boshlanadi (nazoratchi sinovi, 2026-10-13). Birligi yozilmagan kichik son
 * ("70") va yevro olinmaydi — taxmin yoʻq (`byudjetniOqi` bilan bir xil).
 */
export function byudjetSummalari(matn: string, usdKurs: number | null): ByudjetJavobi[] {
  const s = tozala(String(matn ?? '')).normalize('NFC');
  const chiqdi: ByudjetJavobi[] = [];
  for (const x of summalar(s).filter((y) => !pulEmasmi(s, y))) {
    if (x.pul === 'eur' || !(x.qiymat > 0)) continue;
    if (x.pul === 'usd') {
      if (usdKurs !== null && usdKurs > 0 && x.qiymat <= 10_000_000) chiqdi.push({ som: Math.round(x.qiymat * usdKurs), usd: x.qiymat });
      continue;
    }
    if (x.pul === null && x.kop === 1 && x.qiymat < 100_000) continue;
    if (x.qiymat <= 1e12) chiqdi.push({ som: Math.round(x.qiymat), usd: null });
  }
  return chiqdi
    .filter((a, i) => chiqdi.findIndex((b) => b.som === a.som) === i)
    .sort((a, b) => a.som - b.som)
    .slice(0, 3);
}

/** `12 650 000` → `12,7 mln soʻm`; milliondan kam — guruhlangan soʻm. */
export function mlnMatni(som: number): string {
  if (som >= 1e6) return `${String(Math.round(som / 1e5) / 10).replace('.', ',')} mln soʻm`;
  return `${guruh(Math.round(som))} soʻm`;
}

/** Byudjet javobi chatda: "70 000 000 soʻm" yoki "$5 000 (≈ 63,3 mln soʻm)". */
export function byudjetMatni(som: number | null, usd: number | null): string {
  if (som === null) return 'Oʻtkazib yuborildi';
  if (usd !== null) return `$${guruh(usd)} (≈ ${mlnMatni(som)})`;
  return `${guruh(som)} soʻm`;
}
