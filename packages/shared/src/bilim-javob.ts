/**
 * BILIMDAN JAVOB — sunʼiy intellekt (LLM) ishlamasa ham koʻp soʻraladigan
 * savolga ANIQ javob.
 *
 * Jonli sinov (2026-10-13): Gemini kalitining bepul limiti tugagan edi
 * (HTTP 429), va 33 savoldan 22 tasiga "Bu savolingizga hozir aniq javob
 * bera olmayman" chiqdi — "ball nima?", "pul qachon tushadi?", "sertifikat
 * kerakmi?" kabi savollarga ham. Holbuki javob bilim bazasida bor
 * (`bilim.ts`, `uzum-bilim.ts`). Bu yerda savol kalit soʻzlari boʻyicha
 * mavzu topiladi va javob shu bilimdan YIGʻILADI — toʻqilmaydi, raqam
 * qoʻshilmaydi; Uzum faktlari manbasi bilan qoladi.
 *
 * LLM ishlasa u asosiy (toʻliq kontekst bilan); bu — zaxira yoʻli.
 */

import { LUGAT, MASLAHAT } from './bilim.js';
import type { Yonalish } from './qadamlar.js';
import type { YolHolati } from './ssenariy.js';
import { UZUM_BILIMI } from './uzum-bilim.js';
import { ekrandagiYonalishlar, yonalishSatri } from './yordamchi.js';

const norm = (t: string) => String(t ?? '').normalize('NFC').toLowerCase()
  .replace(/[ʻʼ‘’`´]/gu, "'")
  .replace(/\s+/gu, ' ')
  .trim();

/** Lugʻatdagi yozuv (boshi boʻyicha). */
function lugat(bosh: string): string {
  return LUGAT.find((x) => x.startsWith(bosh)) ?? '';
}

/** Uzum faktlari — boʻlimi va (ixtiyoriy) matn filtri boʻyicha, "[Boʻlim] " siz, manbasi bilan. */
function uzum(bolim: string, filtr: RegExp | null = null, nechta = 2): string[] {
  return UZUM_BILIMI
    .filter((f) => f.startsWith(`[${bolim}`))
    .map((f) => f.replace(/^\[[^\]]*\]\s*/u, ''))
    .filter((f) => !filtr || filtr.test(f))
    .slice(0, nechta);
}

interface Mavzu {
  /** Faqat shu savolda (masalan, byudjet) — boʻlmasa hamma joyda. */
  savol?: string;
  re: RegExp;
  javob: () => string[];
}

/** Tartib muhim: aniqrogʻi oldin. */
const MAVZULAR: readonly Mavzu[] = [
  { savol: 'byudjet', re: /dollar|\$|долл|usd/u,
    javob: () => ['Ha: masalan «5000 $» deb yozing — Markaziy bank kursi bilan soʻmga oʻgiraman.'] },
  { savol: 'byudjet', re: /yetadimi|yetarlimi|yetarli|kam emasmi|хватит/u,
    javob: () => ['Qancha kerakligi yoʻnalish va tovarga bogʻliq: keyingi qadamda har yoʻnalish uchun «Pulingiz yetadi» yoki «yetmasligi mumkin» deb koʻrsataman.', MASLAHAT[0]!] },
  { savol: 'yonalish', re: /nega .*(sumka|krossovka|quloqchin|kiyim|boshqa)|men .*dedim|faqat .*(kerak|chiqar)/u,
    javob: () => ['Roʻyxatda siz tanlagan sohadan 4 ta va boshqa sohalardan eng yuqori baholi 2 ta yoʻnalish koʻrsatiladi — taqqoslash uchun. Faqat oʻz sohangiz kerak boʻlsa — pastga uning nomini yozing (masalan: kanstovar) yoki «Yana koʻrsatish» ni bosing.'] },
  { re: /qayerdan boshla|nimadan boshla|hech narsa(ni)? bilmayman|nima qilishim kerak|qanday boshla/u,
    javob: () => ['Hech narsa bilmasangiz ham boʻladi: men sizni 12 qadamda olib boraman — yoʻnalish va tovar tanlash, narxini hisoblash, Xitoydan topish, rasmiylashtirish va Uzumga chiqarishgacha. Hozir faqat pastdagi savolga javob bering, qolganini birga qilamiz.'] },
  { re: /(^|[^\p{L}])ball|imkoniyat baho|baho nima|baho degani/u, javob: () => [lugat('Imkoniyat bahosi')] },
  { re: /bozor ochiq|top.?3|ulush|yirik do'kon|bir necha do'kon/u, javob: () => [lugat('«Bozor ochiq»')] },
  { re: /mavsum|bir yil|yillik|o'tgan yil|сезон|за год/u,
    javob: () => ['Mavsum va yil boʻyicha sotuv hali yoʻq: Uzum sotuv tarixini bermaydi, biz kuzatuvni 2026-yil avgustda boshlaganmiz. Hozircha faqat oxirgi 30 kun — maʼlumot kunma-kun yigʻilyapti.'] },
  { re: /30 kun|sotildi degani|sotuv soni|qayerdan ol|qayerdan bil|откуда/u, javob: () => [lugat('Oxirgi 30 kunlik sotuv')] },
  { re: /tugagan|qoldiq/u,
    javob: () => [lugat('«Uzumda hozir tugagan»'), 'Bunday tovarga talab boʻlishi mumkin, lekin sotuvini oʻlchab boʻlmagan — bitta raqamga emas, boshqa kartalar bilan solishtirib qaror qiling.'] },
  { re: /tannarx|себестоим/u, javob: () => [lugat('Tannarx')] },
  { re: /chegara narx/u, javob: () => [lugat('Chegara narx')] },
  { re: /foyda|daromad|marja|прибыл|заработ/u,
    javob: () => ['Foyda oldindan vaʼda qilinmaydi: raqamlar Uzumdagi oʻlchov va taxmin.', lugat('Marja'), '4-qadamda tannarx va chegara narxni hisoblab koʻrsataman — qaror sizniki.'] },
  { re: /komissiya|комисс/u, javob: () => [lugat('Komissiya'), ...uzum('Komissiya', /^Komissiya va logistika yig‘imi/u, 1)] },
  { re: /pul qachon|qachon tushadi|pulni qachon|to'lov qachon|to'lovlar|выплат|когда деньги/u, javob: () => uzum('To‘lovlar', null, 3) },
  { re: /logistika|yetkazib berish haqi|dostavka haqi|логист/u, javob: () => uzum('Logistika', /^Logistika yig‘imi/u, 1) },
  { re: /saqlash|хранени/u, javob: () => uzum('Logistika', /saqlash/u, 2) },
  { re: /ro'yxatdan o't|registrats|регистрац|kabinet och|sotish uchun nima kerak|sotuvchi bo'lish/u,
    javob: () => [...uzum('Kim sotishi', /sotuvchi bo‘la oladi/u, 1), ...uzum('Ishni boshlash', /signup/u, 1), ...uzum('Kim sotishi', /^Hujjatlar/u, 1)] },
  { re: /yatt|yakka tartib|mchj|o'zini o'zi band|самозан|(^|[^\p{L}])ип([^\p{L}]|$)/u,
    javob: () => [...uzum('Kim sotishi', /sotuvchi bo‘la oladi|^Hujjatlar/u, 2), 'Qaysi shakl sizga mos — 7-qadamda (Rasmiylashtirish) soliq va xarajatlari bilan koʻrsataman.'] },
  { re: /sertifikat|markirovka|asl belgisi|сертифик|маркиров/u,
    javob: () => uzum('Sertifikat', /majburiy bo‘lsa|majburiy toifalar|Asl belgisi/u, 3) },
  { re: /kargo|cargo|карго/u, javob: () => [lugat('Kargo'), '6-qadamda buyurtma varaqasi va kargo yoʻli tayyorlanadi.'] },
  { re: /qaytar|возврат|vozvrat/u, javob: () => uzum('Qaytarish', null, 2) },
  { re: /reklama|aksiya|promokod|bust|реклам/u, javob: () => uzum('Reklama', null, 2) },
  { re: /jarima|shtraf|штраф/u, javob: () => uzum('Yangi sotuvchi', null, 2) },
  { re: /taqiqlan|sotish mumkin emas|sotib bo'lmaydi|запрещ/u, javob: () => uzum('Kim sotishi', /^Sotish taqiqlangan/u, 1) },
  { re: /(^|[^\p{L}])(fbo|fbs|dbs)([^\p{L}]|$)|ishlash model/u, javob: () => uzum('Ishlash modellari', null, 3) },
  { re: /omborga|ombor qayerda|fulfilment|склад/u, javob: () => uzum('Tovarni Uzum omboriga', null, 2) },
  { re: /qaysi(sini|birini)? tanla|qaysi biri yaxshi|qaysi soha yaxshi|nima sotsam|nimani sotsam|что лучше/u,
    javob: () => ['Kartalardagi «imkoniyat bahosi»ga qarang: baho qancha yuqori — boshlash shuncha osonroq.', MASLAHAT[2]!, 'Yakuniy tanlov — sizniki.'] },
];

/** Savolda tilga olingan, ekrandagi yoʻnalishlar ("ruchkalar bilan bloknotlarning farqi") — nomining birinchi soʻzi boʻyicha. */
function tilgaOlingan(t: string, h: YolHolati | null): Yonalish[] {
  if (!h) return [];
  const sozlar = t.split(/[^\p{L}']+/u)
    .map((w) => w.replace(/(larning|lardan|larni|larga|lari|lar|ning|ni|ga|dan)$/u, ''))
    .filter((w) => w.length >= 4);
  if (!sozlar.length) return [];
  return ekrandagiYonalishlar(h).filter((y) => {
    const bosh = norm(y.name).split(/[^\p{L}']+/u)[0] ?? '';
    return sozlar.some((w) => bosh.startsWith(w));
  }).slice(0, 3);
}

/**
 * Bilimdan javob (oʻzbekcha) yoki `null` — mos mavzu topilmadi. Ekrandagi
 * yoʻnalish tilga olinsa — uning kartasidagi maʼlumot (solishtirish uchun).
 */
export function bilimJavobi(matn: string, savolId: string, h: YolHolati | null = null): string | null {
  const t = norm(matn);
  if (!t) return null;
  const birinchi = MAVZULAR.filter((m) => !m.savol || m.savol === savolId).find((m) => m.re.test(t));
  // Savolga xos (byudjet, yoʻnalish) mavzu — birinchi; keyin tilga olingan kartalar; keyin umumiy mavzular.
  if (birinchi?.savol) return birinchi.javob().filter(Boolean).join(' ');
  const kartalar = tilgaOlingan(t, h);
  if (kartalar.length) {
    return `Kartalardagi maʼlumot: ${kartalar.map((y) => yonalishSatri(y)).join('; ')}. `
      + 'Baho qancha yuqori — boshlash shuncha osonroq; tanlov sizniki.';
  }
  return birinchi ? birinchi.javob().filter(Boolean).join(' ') : null;
}
