/**
 * Ball qismlarini hisoblash — FORMULA.md ning "Har qismning hisobi".
 *
 * Nega bu fayl kerak edi. `formula.ts` da ballni QOʻSHADIGAN dvigatel
 * bor, lekin qismlarni HISOBLAYDIGAN kod yoʻq edi. Yaʼni dvigatelga
 * hech qachon hech narsa berilmagan va ball hech qachon
 * hisoblanmagan.
 *
 * Har funksiya sof: kirish → chiqish, yon taʼsirsiz. Testda ham,
 * ishlab chiqarishda ham bir xil.
 *
 * UMUMIY QOIDA: kirish maʼlumoti yetishmasa `null` qaytariladi, NOL
 * emas. Nol "yomon" degan javob, `null` esa "bilmayman". Aralashtirsak,
 * maʼlumoti yigʻilmagan tovar yomon tovarga oʻxshab qoladi va
 * roʻyxatning tubiga tushib ketadi — u yerdan uni hech kim koʻrmaydi
 * (QOIDALAR.md, 4-qoida).
 */

import { THRESHOLDS } from './thresholds.ts';

const F = THRESHOLDS.formula;

function qis(n: number): number {
  return Math.min(100, Math.max(0, n));
}

/**
 * Talab oʻlchovi qayerdan kelgani.
 *
 * `stok-farqi` — sotuv ikki oʻlchov orasidagi stok kamayishidan
 * chiqarilgan. Bitta nuqtadan farq chiqmaydi, shuning uchun kun soni
 * SHART.
 *
 * `togridan-togri` — platformaning oʻzi aytgan raqam (perepisdagi
 * haftalik xaridorlar). U bitta oʻlchovda ham toʻliq: kun sharti bu
 * yerga umuman tegishli emas.
 *
 * Nega ikkita nom kerak. Ilgari chaqiruvchi kun oʻrniga chegaraning
 * OʻZINI (`minDaysForDemand`) uzatib, shartni jimgina chetlab
 * oʻtgan edi — tekshiruv bor koʻrinardi, lekin hech qachon ishlamasdi.
 * Shart qoʻllanmasa, buni kirishni soxtalashtirib emas, OCHIQ aytish
 * kerak (QOIDALAR.md, 8-boʻlim).
 */
export type TalabManbasi = 'stok-farqi' | 'togridan-togri';

/**
 * 1. Talab — turkum ichidagi oʻrni.
 *
 * Tovarning sotuvi shu turkumdagi boshqalar bilan solishtiriladi.
 * Mutlaq son emas, PERSENTIL: "100 dona" bir turkumda koʻp,
 * boshqasida hech narsa. Shu sababdan oʻlchov birligi muhim emas —
 * monoton boʻlsa kifoya.
 *
 * `stok-farqi` da oʻlchov kuni yetarli boʻlmasa `null`.
 */
export function talab(
  sotuv30k: number | null,
  turkumSotuvlari: number[] | null,
  olchanganKun: number | null,
  manba: TalabManbasi = 'stok-farqi',
): number | null {
  if (sotuv30k === null) return null;
  if (manba === 'stok-farqi') {
    if (olchanganKun === null) return null;
    if (olchanganKun < THRESHOLDS.data.minDaysForDemand) return null;
  }
  if (!turkumSotuvlari || turkumSotuvlari.length === 0) return null;

  const pastroq = turkumSotuvlari.filter((x) => x < sotuv30k).length;
  const teng = turkumSotuvlari.filter((x) => x === sotuv30k).length;
  // Teng qiymatlar yarmi hisobga olinadi — aks holda bir xil sotuvli
  // tovarlar persentilda sakrab ketardi.
  return qis((100 * (pastroq + teng / 2)) / turkumSotuvlari.length);
}

/** Bitta donaning tannarx tarkibi. Har biri soʻmda. */
export interface Tannarx {
  sotuvNarxi: number | null;
  xitoyNarxi: number | null;
  kargo: number | null;
  bojxonaQqs: number | null;
  komissiya: number | null;
}

/** Marja foizi — ball emas, xom foiz. Tuzoq filtrlariga ham kerak. */
export function marjaFoizi(t: Tannarx): number | null {
  const { sotuvNarxi, xitoyNarxi, kargo, bojxonaQqs, komissiya } = t;
  if (
    sotuvNarxi === null || xitoyNarxi === null || kargo === null ||
    bojxonaQqs === null || komissiya === null
  ) return null;
  if (sotuvNarxi <= 0) return null;
  const sof = sotuvNarxi - xitoyNarxi - kargo - bojxonaQqs - komissiya;
  return (100 * sof) / sotuvNarxi;
}

/**
 * 2. Marja — sof foyda ulushi.
 *
 * Chiziqli: `marginFloorPercent` da 0, `marginTargetPercent` da 100.
 * Xitoy narxi boʻlmasa (4-qadam oʻtilmagan) — `null`.
 *
 * Manfiy marja ham 0 beradi, lekin bu tuzoq filtriga alohida signal:
 * ball nolga tushishi "yomon" deydi, demping bayrogʻi esa "bu narxda
 * hech kim foyda koʻrmayapti" deb SABABINI aytadi.
 */
export function marja(t: Tannarx): number | null {
  const foiz = marjaFoizi(t);
  if (foiz === null) return null;
  const { marginFloorPercent: pol, marginTargetPercent: nishon } = F;
  return qis((100 * (foiz - pol)) / (nishon - pol));
}

/**
 * 3. Raqobat (teskari) — kirish qanchalik qiyin.
 *
 * `100 − (konsentratsiya × 0.7 + zichlik × 0.3)` (FORMULA.md).
 *
 * Konsentratsiya — top-3 ulushi. Zichlik — sotuvchilar soni,
 * `crowdedSellers` da 100 ga toʻyinadi.
 *
 * Ikkalasi ham kerak, chunki ular boshqa narsani oʻlchaydi. 3 ta
 * sotuvchi va top-3 = 100% degani monopoliya: zichlik past, lekin
 * kirish qiyin. 50 ta sotuvchi va top-3 = 20% degani ochiq bozor:
 * konsentratsiya past, lekin olomon.
 */
export function raqobat(
  top3Ulush: number | null,
  sotuvchiSoni: number | null,
): number | null {
  if (top3Ulush === null || sotuvchiSoni === null) return null;
  const konsentratsiya = qis(top3Ulush);
  const zichlik = qis((100 * sotuvchiSoni) / F.crowdedSellers);
  return qis(100 - (konsentratsiya * 0.7 + zichlik * 0.3));
}

/** Turkumga kirish talablari — `category_requirements` dan. */
export interface KirishTalabi {
  markirovka: boolean | null;
  sertifikat: boolean | null;
  haftalar: number | null;
}

/**
 * 4. Kirish qiyinligi (teskari).
 *
 * 100 dan boshlanadi, har toʻsiq pasaytiradi.
 *
 * Markirovka yoki sertifikat holati BILINMASA — `null`. Ularni
 * "kerak emas" deb olish eng qimmat xato boʻlardi: odam sota
 * olmaydigan tovarga butun partiya pulini tikadi. Bu qaror
 * `sertifikat.ts` filtri bilan bir xil.
 *
 * Kutish haftalari bilinmasa ball baribir hisoblanadi — u faqat
 * aniqlikni oshiradi, yoʻqligi esa xavfli emas.
 */
export function kirish(t: KirishTalabi): number | null {
  if (t.markirovka === null || t.sertifikat === null) return null;
  let ball = 100;
  if (t.markirovka) ball -= F.entryMarkingPenalty;
  if (t.sertifikat) ball -= F.entryCertificatePenalty;
  if (t.haftalar !== null && t.haftalar > 0) {
    ball -= Math.min(t.haftalar, F.entryMaxWeeks) * F.entryWeekPenalty;
  }
  return qis(ball);
}

/**
 * 5. Mavsum — hozirgi oyga moslik.
 *
 * `seasonality` — 12 ta koeffitsient, yanvardan dekabrgacha.
 * Koeffitsient 1.0 oʻrtacha oyni bildiradi.
 *
 * `oy` 1–12. Massiv 12 elementdan boʻlmasa `null`: yarim toʻldirilgan
 * massivdan hisoblangan ball notoʻgʻri boʻladi va buni hech narsa
 * koʻrsatmaydi.
 */
export function mavsum(koeffitsientlar: number[] | null, oy: number): number | null {
  if (!koeffitsientlar || koeffitsientlar.length !== 12) return null;
  if (!Number.isInteger(oy) || oy < 1 || oy > 12) return null;
  const koef = koeffitsientlar[oy - 1];
  if (typeof koef !== 'number' || !Number.isFinite(koef) || koef < 0) return null;
  return qis((koef / F.seasonNeutralCoefficient) * 100);
}

/**
 * Profil sohalarini turkum nomiga bogʻlaydigan jadval.
 *
 * v0 — qoʻlda tuzilgan va ataylab kichik. Har qator "shu sohada
 * tajriba yoki tanish yetkazuvchi bor" degan foydani beradi.
 *
 * Kengaytirish oson, lekin buni oʻlchovsiz kengaytirmaslik kerak:
 * har yangi qator tavsiyani siljitadi va uni pilot maʼlumotisiz
 * tekshirib boʻlmaydi.
 */
export const SOHA_TURKUM: Record<string, string[]> = {
  avto: ['avto', 'moto', 'shina', 'ehtiyot qism'],
  kiyim: ['kiyim', 'poyabzal', 'trikotaj', 'ust-bosh'],
  bolalar: ['bola', 'chaqaloq', 'oʻyinchoq', "o'yinchoq"],
  elektronika: ['telefon', 'kompyuter', 'noutbuk', 'audio', 'gadjet'],
  maishiy: ['maishiy', 'texnika', 'oshxona', 'muzlatgich'],
  qurilish: ['qurilish', 'asbob', 'santexnika', 'elektr'],
  kosmetika: ['kosmetika', 'parfyum', 'goʻzallik', "go'zallik"],
  sport: ['sport', 'fitnes', 'velosiped', 'turizm'],
  dala: ['bogʻ', "bog'", 'dala', 'urugʻ', "urug'", 'oʻgʻit', "o'g'it"],
};

/**
 * 6. Profil mosligi.
 *
 * Neytraldan boshlanadi va har moslik uni koʻtaradi. Pasaytirmaydi:
 * "bu sohada tajribangiz yoʻq" degani "bu tovar yomon" degani emas.
 *
 * Profil boʻsh boʻlsa neytral qaytadi, `null` emas — chunki bu
 * "bilmayman" emas, "moslik yoʻq" degan haqiqiy javob. Foydalanuvchi
 * savollarga javob bermagan boʻlsa ham tavsiya berilishi kerak.
 */
export function profil(
  sohalar: string[] | null,
  turkumNomi: string | null,
): number {
  if (!sohalar || sohalar.length === 0 || !turkumNomi) return F.profileNeutral;
  const nom = turkumNomi.toLowerCase();
  let mosliklar = 0;
  for (const soha of sohalar) {
    const kalitlar = SOHA_TURKUM[soha.toLowerCase()];
    if (!kalitlar) continue;
    if (kalitlar.some((k) => nom.includes(k))) mosliklar++;
  }
  return qis(F.profileNeutral + mosliklar * F.profileMatchBonus);
}
