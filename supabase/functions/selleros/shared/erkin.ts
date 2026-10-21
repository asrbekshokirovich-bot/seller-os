/**
 * Erkin savollarga tayyor javoblar va LLM uchun bilim.
 *
 * Mijoz savolga javob oʻrniga boshqa narsa yozadi — "bu nima?", "qancha
 * turadi?", "1688 nima?" (nazoratchi, 2026-10-05). LLM boʻlmasa ham koʻp
 * soʻraladigan savollarga ANIQ javob berilishi kerak. Javoblar KODDAGI
 * maʼlumotdan yasaladi (tarif narxlari, qadamlar roʻyxati) — toʻqilmaydi
 * (QOIDALAR.md, 4-boʻlim). Mos javob yoʻq boʻlsa — `null`, taxmin yoʻq.
 *
 * LLM ham shu faktlarni oladi (`erkinBilimi`): undan tashqari narsa
 * yozsa yoki raqam qoʻshsa, tekshiruv uni tashlaydi (`suhbat.ts`).
 */

import { minglik } from './fakt.ts';
import { SUHBAT_QADAMLARI } from './ssenariy.ts';
import { REJA_QADAMI } from './tarif.ts';
import { TARIF_NARXI } from './tolov.ts';

export interface TayyorJavob { uz: string; ru: string }

const NARX = minglik(TARIF_NARXI.pro ?? 0);
const BEPUL = REJA_QADAMI.bepul;

const JAVOBLAR: Record<string, TayyorJavob> = {
  xizmat: {
    uz: 'ZumSavdo — Uzumda birinchi partiyani sotishgacha boʻlgan yoʻlda yordamchi. 12 qadamda: yoʻnalish va tovar tanlash '
      + '(Uzum bazasidan, 8 ta tuzoq-filtr bilan), tannarx va chegara narx, Xitoydan (1688) topish, buyurtma, rasmiylashtirish, '
      + 'qabul, studiya, yuklash, sotuv kuzatuvi va oy hisoboti. Raqamlarni kod hisoblaydi, qaror — sizniki.',
    ru: 'ZumSavdo — помощник на пути к первой партии на Uzum. За 12 шагов: выбор направления и товара (по базе Uzum, '
      + '8 фильтров-ловушек), себестоимость и предельная цена, поиск в Китае (1688), заказ, оформление, приёмка, студия, '
      + 'загрузка, отслеживание продаж и отчёт за месяц. Цифры считает код, решение — за вами.',
  },
  // Tarif cheklovi yoqilgan (obuna darvozasi, 2026-10-14): 1–5 bepul, 6-qadamdan obuna.
  tarif: {
    uz: `1–${BEPUL}-qadamlar (yoʻnalish, tovar, tannarx, Xitoydan topish) — bepul. ${BEPUL + 1}-qadamdan (buyurtma va kargo) `
      + `boshlab — obuna: ${NARX} soʻm/oy, Payme yoki Click orqali. Batafsil: «Profilim» → «Rejalarni solishtirish».`,
    ru: `Шаги 1–${BEPUL} (направление, товар, себестоимость, поиск в Китае) — бесплатно. С шага ${BEPUL + 1} (заказ и карго) `
      + `— подписка: ${NARX} сум/мес, через Payme или Click. Подробнее: «Мой профиль» → «Сравнить тарифы».`,
  },
  qadamlar: {
    uz: `Yoʻl 12 qadam: ${SUHBAT_QADAMLARI.map((q) => `${q.n}. ${q.nom}`).join(', ')}. `
      + 'Qaysi qadamda ekaningiz chap menyuda (telefonda — ☰ ichida) koʻrinadi.',
    ru: `Путь из 12 шагов: ${SUHBAT_QADAMLARI.map((q) => `${q.n}. ${q.ru}`).join(', ')}. `
      + 'Текущий шаг виден в меню слева (на телефоне — под ☰).',
  },
  // «1688 nima?» ga avval taʼrif (jonli oʻlchov, 2026-10-14: faqat 5-qadam tasvirlanardi).
  xitoy: {
    uz: '1688 — Xitoyning ulgurji savdo sayti: zavod va ulgurji sotuvchilar narxlari. 5-qadamda tovaringiz rasmi '
      + 'boʻyicha 1688 dan oʻxshash takliflar qidiriladi: narxi soʻmga oʻgiriladi (CBU kursi) va 4-qadamdagi chegara '
      + 'narx bilan solishtiriladi. Buyurtmani biz bermaymiz — 6-qadamda buyurtma varaqasi tayyorlanadi, uni '
      + 'agentingizga yuborasiz.',
    ru: '1688 — китайский оптовый сайт: цены заводов и оптовиков. На 5-м шаге по фото вашего товара ищутся похожие '
      + 'предложения на 1688: цена переводится в сумы (курс ЦБ) и сравнивается с предельной ценой из 4-го шага. '
      + 'Заказ мы не оформляем — на 6-м шаге готовится лист заказа для вашего агента.',
  },
  // «Siz odammisiz yoki robot?» — rostini aytadi (nazoratchi, 2026-10-13: «odam emasman»).
  kim: {
    uz: 'Men ZumSavdo dasturining yordamchisiman — odam emasman. Savollaringizga Uzum qoʻllanmasi va ZumSavdo '
      + 'maʼlumotlari asosida javob beraman; bilmagan narsamni toʻqimayman. Hisob-kitobni dastur qiladi, qaror — sizniki.',
    ru: 'Я помощник программы ZumSavdo — не человек. Отвечаю по руководству Uzum и данным ZumSavdo; чего не знаю — '
      + 'не выдумываю. Расчёты делает программа, решение — за вами.',
  },
  kafolat: {
    uz: 'Foyda kafolatlanmaydi: raqamlar Uzum bazasidagi oʻlchov va taxmin, har birining manbasi koʻrsatiladi. Qaror — sizniki.',
    ru: 'Прибыль не гарантируется: цифры — замеры и оценки по базе Uzum, у каждой указан источник. Решение — за вами.',
  },
  kirish: {
    uz: 'Roʻyxatdan oʻtish shart emas: suhbat shu brauzerga bogʻlangan. Telefon (SMS) va Telegram orqali kirish hali '
      + 'ulanmagan — ulanganda boshqa qurilmada ham davom etish mumkin boʻladi.',
    ru: 'Регистрироваться не нужно: чат привязан к этому браузеру. Вход по телефону (SMS) и через Telegram ещё не '
      + 'подключён — после подключения можно будет продолжить на другом устройстве.',
  },
  aloqa: {
    uz: 'Hozircha savollaringizga shu chatda javob beraman. Har qadamda nima qilish kerakligini shu yerda koʻrsataman.',
    ru: 'Пока отвечаю на вопросы здесь, в чате. На каждом шаге покажу, что нужно сделать.',
  },
  // Tayyor savol «Misol bilan tushuntirasizmi?» (nazoratchi, 2026-10-13). Raqam — faqat qadam raqamlari.
  misol: {
    uz: 'Masalan, siz kanstovar sotmoqchisiz. 2-qadamda Uzumdagi kanstovar yoʻnalishlarini «imkoniyat bahosi» bilan '
      + 'koʻrasiz va bittasini tanlaysiz — masalan, bloknotlar. 3-qadamda shu yoʻnalishda koʻp sotilayotgan tovarlarni '
      + 'koʻrib, birinchi partiyani belgilaysiz. 4-qadamda bitta tovar uchun Xitoyda qanchagacha toʻlash mumkinligini '
      + '(chegara narx) hisoblaymiz, 5-qadamda 1688 dan oʻxshash takliflarni topamiz. Keyin buyurtma, rasmiylashtirish, '
      + 'qabul, suratlar va Uzumga yuklash — har birida nima qilishni shu yerda koʻrsataman.',
    ru: 'Например, вы хотите продавать канцтовары. На 2-м шаге увидите направления канцтоваров на Uzum с «оценкой '
      + 'возможности» и выберете одно — например, блокноты. На 3-м шаге посмотрите товары, которые в этом направлении '
      + 'хорошо продаются, и определите первую партию. На 4-м шаге посчитаем, сколько максимум можно платить в Китае '
      + 'за единицу (предельная цена), на 5-м — найдём похожие предложения на 1688. Дальше заказ, оформление, приёмка, '
      + 'фото и загрузка на Uzum — на каждом шаге покажу, что делать.',
  },
  // Maxfiylik sahifasidagi gap bilan bir xil. 2026-10-21 dan (nazoratchi): AI suhbatda ism va telefonni
  // yozilgan gapdan sunʼiy intellekt ajratib oladi; keyingi xabarlarda telefon unga yuborilmaydi.
  // Provayder nomi yozilmaydi: 2026-10-19 da Gemini dan Claude ga oʻtildi va bu gap eskirgan edi (jonli sinov, 10-20).
  maxfiylik: {
    uz: 'Ism va telefon raqamingiz faqat siz bilan bogʻlanish uchun soʻraladi va boshqa hech kimga berilmaydi. '
      + 'Ularni yozganingizdan sunʼiy intellekt ajratib olishi mumkin — keyingi xabarlarda telefon raqamingiz unga '
      + 'yuborilmaydi. Batafsil — «Maxfiylik siyosati» sahifasida.',
    ru: 'Имя и номер телефона нужны только для связи с вами и никому не передаются. Их из вашего сообщения может '
      + 'выделить искусственный интеллект — в следующих сообщениях номер телефона ему не отправляется. '
      + 'Подробнее — в «Политике конфиденциальности».',
  },
};

/**
 * Boshqa mavzu belgilari: soliq, bank, Uzum, logistika, kargo, yuk kelishi…
 * Bunday savoldagi "toʻlov", "bepul", "pullik", "daromad", "Xitoy", "qadam"
 * ZumSavdo obunasi yoki 1688 qidiruvi haqida EMAS: "soliq toʻlovi qachon?"
 * tarif jadvalini, "daromad soligʻi" kafolat gapini, "Xitoydan qachon
 * keladi?" 1688 qidiruvini olardi (tekshiruv, 2026-10-05). Bunday matnga
 * umumiy soʻz boʻyicha tayyor javob berilmaydi.
 */
const BOSHQA_MAVZU = /soli[qg]|bank|hisob raqam|uzum|logist|kargo|bojxona|ombor|yetkaz|komissiya|ijtimoiy|deklaratsiya|yatt|mchj|kabinet|guvohnoma|kelad|keldi|kelish|yuk |налог|банк|логист|карго|склад|доставк|комисси|таможн/u;

/**
 * Tartib muhim: aniqrogʻi oldin ("1688 nima?" — xitoy, "xizmat" emas).
 * Har mavzuda ikki xil belgi: KUCHLI — faqat ZumSavdo (obunasi, 1688
 * qidiruvi) haqida boʻladi, doim ishlaydi; KUCHSIZ — umumiy soʻz, matnda
 * boshqa mavzu belgisi (`BOSHQA_MAVZU`) boʻlsa ishlamaydi.
 */
const KALITLAR: ReadonlyArray<[keyof typeof JAVOBLAR, RegExp | null, RegExp | null]> = [
  // "Odam bilan gaplashsam boʻladimi?" — bu emas (aloqa); faqat "siz odammisiz / botmisiz".
  ['kim', /odammisiz|odam emasmisiz|tirik odam(mi)?siz|robotmisiz|siz robot|botmisiz|siz bot(?!\p{L})|suniy intellektmisiz|siz suniy intellekt|вы (бот|робот|человек)|ты (бот|робот|человек)|это (бот|робот)|живой человек/u, null],
  ['kafolat', /kafolat|гарант/u, /foyda (bo|qil|ol|kor)|daromad (bo|qil|ol|kor|qancha)|zarar (qil|bo|kor)|yutqaz|прибыл|заработ|убыт/u],
  ['tarif', /obuna|tarif|payme|click|подписк|тариф/u, /pullik|bepul|tolov|xizmat(ingiz)? narxi|оплат|платн|бесплатн/u],
  ['xitoy', /1688/u, /xitoy|китай/u],
  ['qadamlar', null, /qadam|bosqich|шаг|этап/u],
  // «kirish» yolgʻiz emas: "kabinetga kirish" — Uzum haqida, ZumSavdo haqida emas.
  ['kirish', null, /royxatdan|login|parol|akkaunt|saytga kirish|tizimga kirish|войти в|регистрац|аккаунт|пароль/u],
  ['aloqa', null, /operator|odam bilan|admin|aloqa|boglan|qongiroq|оператор|человек|связат|позвон/u],
  // "Misol uchun 10 mln" — javob; faqat tushuntirishni soʻrasa ("misol bilan tushuntiring").
  ['misol', null, /misol bilan|misolda tushuntir|misol keltir|на примере|приведи\p{L}* пример/u],
  ['maxfiylik', null, /telefon raqamim|raqamim nima|raqamimni|telefonim|nomerim|malumotlarim|shaxsiy malumot|maxfiylik|номер телефона|мой номер|номер нужен|мои данные|конфиденц/u],
  ['xizmat', /zumsavdo/u, /bu nima|nima bu|nima qilasiz|nima qiladi|nimaga kerak|qanday ishlaydi|kimsiz|siz kim|что это|что за|как работает|кто вы|зачем/u],
];

/** Kichik harf, apostroflarsiz ("to'lov" → "tolov"), bitta boʻsh joy. */
function norm(t: string): string {
  return t.toLowerCase().replace(/['‘’ʻʼ`]/gu, '').replace(/\s+/gu, ' ').trim();
}

/**
 * Tarif cheklovi OʻCHIQ boʻlsa (`tarifCheklovi() === false`, Edge env) — hamma qadam
 * bepul ochiq. Ilgari «Bu bepulmi?» ga «Bepul — 1–2-qadam» deyilardi, holbuki
 * saytda hamma qadam ochiq edi (jonli tekshiruv, 2026-10-13: `cheklov_yoqilgan:
 * false`) — mijoz "2 qadamdan keyin pul soʻraladi" deb oʻylardi.
 */
const TARIF_OCHIQ: TayyorJavob = {
  uz: `Hozir hamma qadamlar bepul ochiq — toʻlov soʻralmaydi. Toʻlov (Payme, Click) ulangach: 1–${BEPUL}-qadamlar bepul `
    + `qoladi, ${BEPUL + 1}-qadamdan obuna — ${NARX} soʻm/oy. Batafsil: «Profilim» → «Rejalarni solishtirish».`,
  ru: `Сейчас все шаги открыты бесплатно — оплата не нужна. Когда подключим оплату (Payme, Click): шаги 1–${BEPUL} `
    + `останутся бесплатными, с шага ${BEPUL + 1} — подписка ${NARX} сум/мес. Подробнее: «Мой профиль» → «Сравнить тарифы».`,
};

/**
 * Koʻp soʻraladigan savolga tayyor javob (oʻzbek va rus). Mos kelmasa — `null`.
 * `tarifCheklovi` — saytda tarif cheklovi yoqilganmi (Edge env); `false` boʻlsa
 * tarif javobi «hozir hamma qadam bepul», nomaʼlum (`undefined`) — rejalar roʻyxati.
 */
export function tayyorJavob(matn: string, tarifCheklovi?: boolean): TayyorJavob | null {
  const t = norm(matn);
  const boshqa = BOSHQA_MAVZU.test(t);
  for (const [kalit, kuchli, kuchsiz] of KALITLAR) {
    if (kuchli?.test(t) || (!boshqa && kuchsiz?.test(t))) {
      return kalit === 'tarif' && tarifCheklovi === false ? TARIF_OCHIQ : JAVOBLAR[kalit]!;
    }
  }
  return null;
}

/** LLM uchun faktlar — u faqat shulardan foydalanadi; raqamlari tekshiruvda ruxsat etiladi. */
export function erkinBilimi(tarifCheklovi?: boolean): string {
  return [
    'ZumSavdo haqida faktlar (faqat shulardan foydalan):',
    `- ${JAVOBLAR.xizmat!.uz}`,
    `- Qadamlar: ${SUHBAT_QADAMLARI.map((q) => `${q.n}. ${q.nom}`).join(', ')}.`,
    `- ${(tarifCheklovi === false ? TARIF_OCHIQ : JAVOBLAR.tarif!).uz}`,
    `- ${JAVOBLAR.kirish!.uz}`,
    `- ${JAVOBLAR.xitoy!.uz}`,
    `- ${JAVOBLAR.kafolat!.uz}`,
  ].join('\n');
}
