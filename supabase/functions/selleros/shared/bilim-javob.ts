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

import { LUGAT, MASLAHAT } from './bilim.ts';
import type { Yonalish } from './qadamlar.ts';
import type { YolHolati } from './ssenariy.ts';
import { UZUM_BILIMI } from './uzum-bilim.ts';
import { ekrandagiYonalishlar, yonalishSatri } from './yordamchi.ts';

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
  /** Faqat shu savol(lar)da (masalan, byudjet; `miqdor:123` — `miqdor`) — boʻlmasa hamma joyda. */
  savol?: string | readonly string[];
  re: RegExp;
  /** Matnda shu boʻlsa — bu mavzu emas (masalan, pul haqidagi "qaysi biri"). */
  emas?: RegExp;
  javob: () => string[];
}

/** Pul haqidagi gap: summa, mln, soʻm, dollar — byudjet maslahati (`suhbat.ts`) uchun. */
export const PUL_GAPI = /\d|mln|million|ming|so'm|(^|[^\p{L}])som([^\p{L}]|$)|dollar|\$|pul|summa|byudjet|млн|сум|долл|деньг/u;

/** Tartib muhim: aniqrogʻi oldin. */
const MAVZULAR: readonly Mavzu[] = [
  { savol: 'byudjet', re: /dollar|\$|долл|usd/u,
    javob: () => ['Ha: masalan «5000 $» deb yozing — Markaziy bank kursi bilan soʻmga oʻgiraman.'] },
  { savol: 'byudjet', re: /yetadimi|yetarlimi|yetarli|kam emasmi|qancha kerak|qancha pul kerak|qanchadan boshla|сколько нужно|хватит/u,
    javob: () => ['Qancha kerakligi yoʻnalish va tovarga bogʻliq: keyingi qadamda har yoʻnalish uchun «Pulingiz yetadi» yoki «yetmasligi mumkin» deb koʻrsataman.', MASLAHAT[0]!] },
  { savol: 'qiziqish', re: /qaysi .*(yaxshi|tanla|oson|foydali|qulay)|qaysi biri|maslahat|nima sotsam|bilmasam|bilmayman/u,
    javob: () => [MASLAHAT[2]!, 'Bilmasangiz «Bilmayman» ni bosing — keyingi qadamda hamma sohadan eng yuqori baholi yoʻnalishlarni koʻrsataman, raqamlari bilan.'] },
  // Kartalar hali yoʻq qadamlarda soha/tovar solishtirish ("kanstovar bilan kiyimdan qaysi biri
  // osonroq?") — pul haqidagi "qaysi biri" (80 mln yoki 100 mln) bu yerga tushmaydi.
  { savol: ['uzum_dokoni', 'byudjet'], re: /qaysi .*(yaxshi|tanla|oson|foydali|qulay)|qaysi biri|nima sotsam/u, emas: PUL_GAPI,
    javob: () => [MASLAHAT[2]!, 'Qaysi biri osonroq ekanini raqam bilan Yoʻnalish qadamida koʻrsataman: har yoʻnalishda xaridor qanchalik koʻpligi va raqobat chiqadi.'] },
  { savol: 'yonalish', re: /nega .*(sumka|krossovka|quloqchin|kiyim|boshqa)|men .*dedim|faqat .*(kerak|chiqar)/u,
    javob: () => ['Roʻyxatda siz tanlagan sohadan 4 ta va boshqa sohalardan eng yuqori baholi 2 ta yoʻnalish koʻrsatiladi — taqqoslash uchun. Faqat oʻz sohangiz kerak boʻlsa — pastga uning nomini yozing (masalan: kanstovar) yoki «Yana koʻrsatish» ni bosing.'] },
  { re: /qayerdan boshla|nimadan boshla|hech narsa(ni)? bilmayman|nima qilishim kerak|qanday boshla|tajriba(m|si)? yo'q|tajribasiz/u,
    javob: () => ['Hech narsa bilmasangiz ham boʻladi: men sizni 12 qadamda olib boraman — yoʻnalish va tovar tanlash, narxini hisoblash, Xitoydan topish, rasmiylashtirish va Uzumga chiqarishgacha. Hozir faqat pastdagi savolga javob bering, qolganini birga qilamiz.'] },
  { re: /(^|[^\p{L}])ball|imkoniyat baho|baho nima|baho degani/u, javob: () => [lugat('Imkoniyat bahosi')] },
  // Raqamli javob (`erkin-malumot.ts`) bazadan oʻqiy olmasa — umumiysi.
  { re: /raqobat|konkurent|конкурен/u,
    javob: () => [lugat('«Bozor ochiq»'), 'Raqobat yoʻnalishga qarab har xil: 2-qadamda har yoʻnalish kartasida eng katta 3 doʻkon ulushi va sotuvchilar soni koʻrsatiladi.'] },
  { re: /bozor ochiq|top.?3|ulush|yirik do'kon|bir necha do'kon/u, javob: () => [lugat('«Bozor ochiq»')] },
  { re: /mavsum|bir yil|yillik|o'tgan yil|сезон|за год/u,
    javob: () => ['Mavsum va yil boʻyicha sotuv hali yoʻq: Uzum sotuv tarixini bermaydi, biz kuzatuvni 2026-yil avgustda boshlaganmiz. Hozircha faqat oxirgi 30 kun — maʼlumot kunma-kun yigʻilyapti.'] },
  { re: /30 kun|sotildi degani|sotuv soni|qayerdan ol|qayerdan bil|откуда/u, javob: () => [lugat('Oxirgi 30 kunlik sotuv')] },
  { re: /tugagan|qoldiq/u,
    javob: () => [lugat('«Uzumda hozir tugagan»'), 'Bunday tovarga talab boʻlishi mumkin, lekin sotuvini oʻlchab boʻlmagan — bitta raqamga emas, boshqa kartalar bilan solishtirib qaror qiling.'] },
  // Tayyor savol «Nechta olishim kerak?» (miqdor savoli, 2026-10-13) — raqamsiz: son tugmalarda.
  { savol: ['miqdor', 'partiya_miqdor'], re: /nechta ol|qancha ol(ay|ish|sam)|partiya(ni)? (qancha|nechta)|nechta (dona|buyurtma)/u,
    javob: () => ['Birinchi partiya miqdori faqat oʻlchangan sotuvdan hisoblanadi: tugmalarda necha kunlik zaxira ekani yozilgan.', MASLAHAT[1]!, MASLAHAT[6]!] },
  // «Uzumda doʻkon ochish bepulmi?» — "bepul" dagi "pul" byudjet maslahatini olardi (jonli oʻlchov, 2026-10-14).
  { re: /^(?=.*(bepul|pullik|tekin|pul ol|haq ol|to'lov ol|бесплатн|платн))(?=.*(do'kon|kabinet|akkaunt|ro'yxatdan|uzum|магазин|регистрац)).*/u,
    javob: () => ['Uzumning haqi sotuvdan olinadi:', ...uzum('Komissiya', /^Komissiya va logistika yig‘imi/u, 1),
      'Saqlash ham boshida bepul:', ...uzum('Logistika', /^Yangi SKU/u, 1),
      'Lekin oʻzingizning xarajatlaringiz boʻladi: YATT (yoki boshqa shakl) ochish, bank hisobi va soliq — 7-qadamda (Rasmiylashtirish) raqamlari bilan koʻrsataman.'] },
  // «Qancha vaqtda pul topaman?» — "pul" byudjet maslahatini olardi (2026-10-14); muddat vaʼda qilinmaydi.
  { re: /qancha vaqtda|necha (kun|hafta|oy)da (pul|foyda|daromad)|qachon (pul|foyda|daromad) (top|ko'r|qil|ol)|pul (topa|topish|ishlab|qaytar)|pulim (qachon )?qayt|(foyda|daromad) qachon|когда (окуп|заработ|будет прибыль)|как быстро (окуп|заработ)|через сколько/u,
    emas: /kelad|yetib kel|tushad|keltir|придет|придёт|приедет|доставк/u,
    javob: () => ['Aniq muddatni vaʼda qilmayman: bu tovaringiz qanchalik tez sotilishiga bogʻliq.',
      'Yoʻl shunday: tovar Xitoydan keladi, Uzum omboriga topshirasiz, sotiladi, keyin pul tushadi.',
      ...uzum('To‘lovlar', /^Pul tanlangan/u, 1), ...uzum('To‘lovlar', /^Yangi sotuvchilarga/u, 1), MASLAHAT[0]!] },
  { re: /tannarx|себестоим/u, javob: () => [lugat('Tannarx')] },
  { re: /chegara narx/u, javob: () => [lugat('Chegara narx')] },
  // «Daromad soligʻi qancha?» — soliq savoli (pastda), foyda emas.
  { re: /foyda|daromad|marja|прибыл|заработ/u, emas: /soli[qg]|налог/u,
    javob: () => ['Foyda oldindan vaʼda qilinmaydi: raqamlar Uzumdagi oʻlchov va taxmin.', lugat('Marja'), '4-qadamda tannarx va chegara narxni hisoblab koʻrsataman — qaror sizniki.'] },
  { re: /komissiya|комисс/u, javob: () => [lugat('Komissiya'), ...uzum('Komissiya', /^Komissiya va logistika yig‘imi/u, 1)] },
  { re: /pul qachon|qachon tushadi|pulni qachon|to'lov qachon|to'lovlar|pul (necha|qancha) (kun|vaqt)|necha kunda tushadi|выплат|когда деньги/u, javob: () => uzum('To‘lovlar', null, 3) },
  // «Xitoydan tovar necha kunda keladi?» — kargo muddati oʻlchanmagan (fakt yoʻq): raqamsiz.
  { re: /(necha|qancha) (kun|kunda|hafta|haftada|oy|oyda|vaqt|vaqtda) ?.{0,25}(kelad|yetib kel|yetkazil)|(kelad|yetib keladi|yetkaziladi)\p{L}*.{0,10}(necha|qancha)|сколько (дней|времени|ид[её]т|везут)|как долго (ид|вез|достав)|срок\p{L}* доставк/u,
    javob: () => ['Aniq kunini ayta olmayman — buni oʻlchamaganman: muddat kargo kompaniyasiga va yoʻlga bogʻliq.',
      'Avia — tezroq, lekin qimmatroq; quruqlik (avto yoki temir yoʻl) — sekinroq, lekin arzonroq. Bunga 1688 dagi sotuvchining tovarni joʻnatishi va bojxona ham qoʻshiladi.',
      'Aniq muddatni kargo kompaniyasidan soʻrang. 6-qadamda (Buyurtma va kargo) buyurtma varaqasini birga tayyorlaymiz.'] },
  { re: /logistika|yetkazib berish haqi|dostavka haqi|логист/u, javob: () => uzum('Logistika', /^Logistika yig‘imi/u, 1) },
  { re: /saqlash|хранени/u, javob: () => uzum('Logistika', /saqlash/u, 2) },
  // Soliq va bank — raqamli javob (`erkin-malumot.ts`, 7-qadam faktlari) bazadan oʻqiy olmasa — umumiysi.
  { re: /soli[qg]|налог/u,
    javob: () => ['Soliq rasmiylashtirish shakliga bogʻliq (YATT, oʻzini oʻzi band qilgan shaxs yoki MChJ): 7-qadamda (Rasmiylashtirish) soliq foizi va oylik majburiy toʻlovni rasmiy manbalari bilan koʻrsataman; aniq hisobni buxgalter bilan tekshiring.',
      ...uzum('Kim sotishi', /soliq va yuridik/u, 1), ...uzum('To‘lovlar', /^Komissioner hisoboti/u, 1)] },
  { re: /(?<!\p{L})bank|hisob ?raqam|банк|расч[её]тн/u,
    javob: () => [...uzum('Kim sotishi', /Bank hisob raqami/u, 1), ...uzum('To‘lovlar', /hisob raqam/u, 1),
      '7-qadamda (Rasmiylashtirish) banklarni ochish va oylik narxi bilan koʻrsataman.'] },
  { re: /ro'yxatdan o't|registrats|регистрац|kabinet och|sotish uchun nima kerak|sotuvchi bo'lish|qanday hujjat|hujjatlar kerak|какие документы|документы нужны|что нужно для продажи|как начать продавать/u,
    javob: () => [...uzum('Kim sotishi', /sotuvchi bo‘la oladi/u, 1), ...uzum('Ishni boshlash', /signup/u, 1), ...uzum('Kim sotishi', /^Hujjatlar/u, 1)] },
  { re: /yatt|yakka tartib|mchj|o'zini o'zi band|самозан|(^|[^\p{L}])ип([^\p{L}]|$)/u,
    javob: () => [...uzum('Kim sotishi', /sotuvchi bo‘la oladi|^Hujjatlar/u, 2), 'Qaysi shakl sizga mos — 7-qadamda (Rasmiylashtirish) soliq va xarajatlari bilan koʻrsataman.'] },
  { re: /sertifikat|markirovka|asl belgisi|сертифик|маркиров/u,
    javob: () => uzum('Sertifikat', /majburiy bo‘lsa|majburiy toifalar|Asl belgisi/u, 3) },
  // «Kartochkaga qanday rasm kerak?» — "rasmiylashtirish" emas: rasm/surat butun soʻz (qoʻshimchasi bilan).
  { re: /^(?=.*(?<!\p{L})(rasm|surat|foto|фото)\p{L}{0,6}(?!\p{L}))(?=.*(kartochka|карточк|kerak|talab|o'lcham|format|требован|размер|нужн)).*/u,
    javob: () => [...uzum('Tovar kartochkasi', /^Surat:/u, 1),
      '9-qadamda (Studiya) tanlangan 1688 taklifining suratlaridan kartochka uchun oq fonli suratlar tayyorlayman.'] },
  // Bojxona stavkasi oʻlchanmagan — raqamsiz, rasmiy manzil bilan.
  { re: /bojxona|растамож|таможн/u,
    javob: () => ['Bojxona toʻlovini raqam bilan ayta olmayman — buni oʻlchamaganman: u tovar turiga, qiymatiga va qanday olib kelinishiga bogʻliq.',
      'Rasmiy stavka va qoidalar — Bojxona qoʻmitasining rasmiy saytida (customs.uz).',
      'Tovarni kargo orqali olib kelsangiz, bojxona kargo narxiga kiradimi yoki yoʻqmi — kargo kompaniyasidan albatta soʻrang va tannarxga qoʻshing.'] },
  { re: /kargo|cargo|карго/u, javob: () => [lugat('Kargo'), '6-qadamda buyurtma varaqasi va kargo yoʻli tayyorlanadi.'] },
  { re: /qaytar|возврат|vozvrat/u, javob: () => uzum('Qaytarish', null, 2) },
  // «Sifatsiz tovar kelsa nima qilaman?» — Xitoydan kelgan yuk (8-qadam); xaridor qaytarsa — yuqoridagi mavzu.
  { re: /sifatsiz|nuqson|brak|yaroqsiz|singan|buzuq|buzilgan|shikast|kam keld|kam kels|chala kel|некачеств|брак|сломан|поврежд|недостач/u,
    javob: () => ['Yuk kelganda darhol tekshiring: 8-qadamda (Qabul) buyurtma varaqasi boʻyicha har bir tovarni sanab, koʻzdan kechirasiz. Kam yoki nuqsonli chiqsa — suratga olib qoʻying: men uni daʼvo uchun yozib qoʻyaman, daʼvoni esa yetkazib beruvchi yoki agentingizga qilasiz.',
      'Nuqsonli tovarni Uzum omboriga yubormang:', ...uzum('Tovarni Uzum omboriga', /muammoli dona/u, 1), MASLAHAT[1]!] },
  { re: /reklama|aksiya|promokod|bust|реклам/u, javob: () => uzum('Reklama', null, 2) },
  { re: /jarima|shtraf|штраф/u, javob: () => uzum('Yangi sotuvchi', null, 2) },
  { re: /taqiqlan|sotish mumkin emas|sotib bo'lmaydi|запрещ/u, javob: () => uzum('Kim sotishi', /^Sotish taqiqlangan/u, 1) },
  { re: /(^|[^\p{L}])(fbo|fbs|dbs)([^\p{L}]|$)|ishlash model/u, javob: () => uzum('Ishlash modellari', null, 3) },
  // «Сколько стоит доставка на склад Uzum?» — omborga olib borish va xaridorga yetkazish haqi.
  { re: /(доставк|yetkaz|olib bor|jo'nat|yubor)\p{L}*.{0,30}(склад|ombor)|(склад|ombor)\p{L}*.{0,30}(доставк|yetkaz|olib bor|jo'nat|yubor)/u,
    javob: () => [...uzum('Tovarni Uzum omboriga', /^Fulfilment/u, 1), ...uzum('Tovarni Uzum omboriga', /^Viloyatdan/u, 1),
      'Xaridorga yetkazish uchun esa Uzum har sotilgan donadan logistika yigʻimi oladi:', ...uzum('Logistika', /^Logistika yig‘imi/u, 1)] },
  // "omboriga" ham (jonli oʻlchov, 2026-10-14: «Uzum omboriga qanday topshiraman?» javobsiz qoldi).
  { re: /ombor(i)?ga|ombor(i)? qayerda|fulfilment|склад/u, javob: () => uzum('Tovarni Uzum omboriga', null, 2) },
  // «Uzumda eng koʻp nima sotiladi?» — raqamli javob (`erkin-malumot.ts`) bazadan oʻqiy olmasa.
  { re: /eng ko'p (nima |qaysi tovar |qanday tovar )?(sotil|sotad|xarid|olin)|ko'p sotiladigan|nima ko'p sotil|ommabop|xit tovar|самы[ейх] продаваем|что (больше|чаще) всего/u,
    javob: () => ['Buni taxmin bilan aytmayman: 2-qadamda (Yoʻnalish) har yoʻnalish uchun xaridor qanchalik koʻpligi va raqobat raqam bilan chiqadi.', MASLAHAT[6]!] },
  { re: /qaysi( biri| birini|sini| \p{L}+ni)? tanla|qaysi biri yaxshi|qaysi soha yaxshi|nima sotsam|nimani sotsam|что лучше/u,
    javob: () => ['Kartalardagi «imkoniyat bahosi»ga qarang: baho qancha yuqori — boshlash shuncha osonroq.', MASLAHAT[2]!, 'Yakuniy tanlov — sizniki.'] },
  // «Uzumda savdo qilish osonmi?» — umumiy; raqamlisi (raqobat manzarasi) — `erkin-malumot.ts`.
  { re: /(uzumda|uzum) (savdo|sotish|sotuv)\p{L}*.{0,20}(oson|qiyin)|savdo (qilish )?(oson|qiyin)/u,
    javob: () => ['Bu tanlagan yoʻnalishingiz va tayyorgarligingizga bogʻliq: raqobat kuchli joyda qiyinroq, bozor ochiq joyda osonroq.',
      'Ishning koʻpi tayyorgarlikda — yoʻnalish va tovar tanlash, tannarxni hisoblash, sifatli tovar va yaxshi kartochka; men shularni 12 qadamda siz bilan birga qilaman.', MASLAHAT[1]!] },
  // "kanstovar Uzumda yuradimi?" — taxmin bilan "ha" yoki "yoʻq" deyilmaydi: raqam keyingi qadamda.
  { re: /yuradimi|sotiladimi|talab bormi|xaridor bormi|o'tadimi|ketadimi|sotish (oson|qiyin)|sotsam bo'ladimi/u,
    javob: () => ['Buni taxmin bilan aytmayman: Yoʻnalish qadamida har yoʻnalish uchun xaridor qanchalik koʻpligi va raqobat raqam bilan chiqadi. Sohani tanlang — shu sohadagi eng yuqori baholilarini koʻrsataman.'] },
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
  // `miqdor:123` kabi idlar — oldingi qismi boʻyicha.
  const id = savolId.split(':')[0] ?? savolId;
  const birinchi = MAVZULAR
    .filter((m) => !m.savol || (typeof m.savol === 'string' ? m.savol === id : m.savol.includes(id)))
    .find((m) => m.re.test(t) && !m.emas?.test(t));
  // Savolga xos (byudjet, yoʻnalish) mavzu — birinchi; keyin tilga olingan kartalar; keyin umumiy mavzular.
  if (birinchi?.savol) return birinchi.javob().filter(Boolean).join(' ');
  // Byudjet savolida summa aytilgan ("80 mln yoki 100 mln, qaysi biri yaxshi?") — bu
  // umumiy mavzu emas: byudjet maslahati javob beradi (`suhbat.ts`), summalar tugma boʻladi.
  if (savolId === 'byudjet' && /\d|mln|million|ming|so'm|dollar|\$|млн|сум|долл/u.test(t)) return null;
  const kartalar = tilgaOlingan(t, h);
  if (kartalar.length) {
    return `Kartalardagi maʼlumot: ${kartalar.map((y) => yonalishSatri(y)).join('; ')}. `
      + 'Baho qancha yuqori — boshlash shuncha osonroq; tanlov sizniki.';
  }
  return birinchi ? birinchi.javob().filter(Boolean).join(' ') : null;
}
