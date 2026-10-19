/**
 * SAVDO_SOHALARI — yoʻnalishlarni mijozning qiziqishi boʻyicha guruhlash.
 *
 * Nazoratchi (2026-10-13): "faqat sumka, krossovka, quloqchinlarni
 * chiqarib beryapti — kirgan mijoz «faqat shularni sotsam boʻlarkan»
 * deb chiqib ketadi". Sabab: 2-qadam 300 turkumning eng yuqori balli 5
 * tasini koʻrsatardi, mijozning tajribasi va qiziqishi hisobga
 * olinmasdi — hamma bir xil roʻyxat koʻrardi. Holbuki 300 tadan 95 tasi
 * 60+ ball oladi (1-oʻrin 78, «Ruchkalar» 70).
 *
 * Qaror (nazoratchi, 2026-10-13): tajribadan keyin «Qaysi sohada?» savoli
 * (bir nechta tanlash mumkin); roʻyxat aralash — qiziqishi boʻyicha va
 * boshqa sohalardan; «Yana koʻrsatish» va istalgan tovar nomi bilan
 * qidiruv.
 *
 * Turkum → soha kalit soʻzlar bilan (tartib muhim: aniqrogʻi oldin).
 * Hamma qoida sof funksiya; 300 nomzodning har biri `soha.test.ts` da
 * tekshiriladi (bazadagi haqiqiy nomlar).
 */

export const SAVDO_SOHALARI = [
  { id: 'kiyim', nom: 'Kiyim va poyabzal', ru: 'Одежда и обувь' },
  { id: 'gozallik', nom: 'Goʻzallik va parvarish', ru: 'Красота и уход' },
  // «Maishiy texnika» (changyutgich, sovutgich, dazmol…) shu sohada — nomida ham (nazoratchi, 2026-10-15).
  { id: 'uy', nom: 'Uy-roʻzgʻor va maishiy texnika', ru: 'Дом и бытовая техника' },
  { id: 'bolalar', nom: 'Bolalar tovarlari', ru: 'Детские товары' },
  { id: 'elektronika', nom: 'Elektronika', ru: 'Электроника' },
  { id: 'kanstovar', nom: 'Kanstovar va kitob', ru: 'Канцтовары и книги' },
  { id: 'aksessuar', nom: 'Aksessuar va zargarlik', ru: 'Аксессуары и украшения' },
  { id: 'sport', nom: 'Sport', ru: 'Спорт' },
  { id: 'avto', nom: 'Avto tovarlar', ru: 'Автотовары' },
] as const;

export type SohaId = (typeof SAVDO_SOHALARI)[number]['id'];
/** Turkum hech bir sohaga tushmasa (oziq-ovqat, asbob, uy hayvonlari…). */
export type TurkumSohasi = SohaId | 'boshqa';

/** «Bilmayman» — qiziqish yoʻq: roʻyxat hamma sohadan aralash. */
export const BILMAYMAN = 'bilmayman';

/** Soha nomi (oʻzbekcha); `boshqa` — "Boshqa". */
export function sohaNomi(id: string): string {
  return SAVDO_SOHALARI.find((s) => s.id === id)?.nom ?? 'Boshqa';
}

/**
 * Har sohaga nimalar kiradi — kuzatuvimizdagi Uzum yoʻnalishlaridan (`so_yonalish_nomzodlari`,
 * 300 ta, 2026-10-19) misollar. Nazoratchi sinovi: «gozallik va parvarish qanday tovarlar»
 * savoliga AI aniq tovar sanay olmadi — bilimda yoʻq edi. Endi AI ham, bazaviy javob ham shundan.
 */
export const SOHA_MISOLLARI: Readonly<Record<SohaId, string>> = {
  kiyim: 'futbolkalar, koʻylaklar, jinsi va shimlar, sviter va kardiganlar, qishki kurtkalar, ichki kiyim va pijamalar, '
    + 'paypoqlar, krossovka va kedalar, shlepanslar, uy shippaklari',
  gozallik: 'atirlar va parfyumlangan suv, lab boʻyogʻi, tonal krem va upa, kiprik tushi, yuz va qoʻl kremlari, zardob va '
    + 'niqoblar, shampun va balzamlar, dush geli va sovun, dezodorantlar, tish pastasi va choʻtkalari, soch quritgich va '
    + 'trimmerlar, prokladkalar',
  uy: 'idishlar toʻplami, kostryulka va tovalar, krujkalar, oshxona pichoqlari, konteyner va termoslar, sochiq va choyshab '
    + 'toʻplamlari, kir yuvish kukuni va kapsulalari, idish yuvish vositalari, shvabra va lattalar, organayzerlar, shamlar va '
    + 'dekor; maishiy texnika: changyutgichlar, dazmollar, elektr choynaklar, sovutgichlar, isitgichlar, havo namlagichlar',
  bolalar: 'yumshoq oʻyinchoqlar, qoʻgʻirchoqlar, oʻyinchoq mashinalar, radioboshqaruvli oʻyinchoqlar, pazl va stol oʻyinlari, '
    + 'oʻquv va STEM oʻyinchoqlari, aravachalar, tagliklar, emizgichlar, chaqaloq bodi va kombinezonlari',
  elektronika: 'smartfonlar, simsiz quloqchinlar, aqlli soatlar, telefon gʻiloflari va himoya oynalari, zaryadlovchi va kabellar, '
    + 'powerbanklar, portativ kolonkalar, noutbuk va planshetlar, sichqoncha va klaviaturalar, televizorlar, routerlar, '
    + 'fleshka va xotira kartalari',
  kanstovar: 'ruchka va qalamlar, daftar va bloknotlar, penallar, papkalar, stikerlar, boʻyoqlar va olmos mozaika; kitoblar: '
    + 'badiiy adabiyot, bolalar kitoblari, psixologiya va biznes, xorijiy til oʻrganish',
  aksessuar: 'sumka va ryukzaklar, hamyonlar, soatlar, uzuk, zirak va bilaguzuklar, marjon va zanjirlar, quyoshdan himoya '
    + 'koʻzoynaklari, kamarlar, roʻmol va sharflar, kepkalar, soch toʻgʻnagʻichlari',
  sport: 'futbol formasi va butsilar, sport butilka va sheykerlar (sport kiyimi — «Kiyim va poyabzal» da)',
  avto: 'avtomobil aromatizatorlari, avtomobil kolonkalari, brelok gʻiloflari va boshqa avto aksessuarlari',
};

/** «Goʻzallik va parvarish» sohasiga, masalan: … kiradi. */
export function sohaTarkibi(id: SohaId): string {
  return `«${sohaNomi(id)}» sohasiga, masalan: ${SOHA_MISOLLARI[id]} kiradi.`;
}

/** Kichik harf, apostroflar bitta shaklda ("o‘yinchoq" = "oʻyinchoq" = "o'yinchoq"). */
export function normla(t: string): string {
  return String(t ?? '').normalize('NFC').toLowerCase()
    .replace(/[ʻʼ‘’`´]/gu, "'")
    .replace(/[–—]/gu, '-')
    .replace(/\s+/gu, ' ')
    .trim();
}

/**
 * Aniq nomlar — kalit soʻz chalgʻitadigan turkumlar. Masalan «Lab uchun
 * qalamlar» kanstovar emas, «Qoplamalar» — telefon gʻiloflari,
 * «Sochiqlar» — sochga emas, uyga.
 */
const ANIQ: Readonly<Record<string, TurkumSohasi>> = {
  'qoplamalar': 'elektronika',
  'himoya shishalari va plyonkalar': 'elektronika',
  'aqlli soatlar': 'elektronika',
  'soat': 'aksessuar',
  'korrektorlar va konsilerlar': 'gozallik',
  'lab uchun qalamlar': 'gozallik',
  'kosmetika sumkalar': 'gozallik',
  'tonerlar': 'gozallik',
  'blesklar': 'gozallik',
  'upalar': 'gozallik',
  'tenlar': 'gozallik',
  'patchalar': 'gozallik',
  'miniatyuralar va tiqinlar': 'gozallik',
  "cho'tkalar va silikon сho'tk-shpatellar": 'gozallik',
  "cho'tkalar va silikon cho'tk-shpatellar": 'gozallik',
  'tana uchun massaj moslamalari': 'gozallik',
  'konditsionerlar va chayish vositalari': 'uy',
  'fonarlar va aksessuarlar': 'uy',
  'ofis kreslolari': 'uy',
  "suvenirlar va sovg'alar": 'uy',
  'havo sharlari va aksessuarlar': 'uy',
  'dekorativ nakleykalar': 'uy',
  'avtomobillar uchun kolonkalar': 'avto',
  'bodi va kombinezonlar': 'bolalar',
  'elektromobillar': 'bolalar',
  'shishalar va suv ichirgichlar': 'bolalar',
  'lepka uchun gips va massa': 'bolalar',
  'figurachalar va aksessuarlar': 'bolalar',
  'stol o\'yinlari': 'bolalar',
  'pazllar': 'bolalar',
  'olmos mozaikalar': 'kanstovar',
  "bo'yoqlar": 'kanstovar',
  "bo'yoqlar, pigmentlar": 'kanstovar',
  "bo'yash uchun rasmlar, naqshlar uchun to'plamlar": 'kanstovar',
  "qo'l ishlari uchun materiallar": 'kanstovar',
  'stikerlar': 'kanstovar',
  'otkritkalar': 'kanstovar',
  'bloklar': 'kanstovar',
  'muqaddas matnlar': 'kanstovar',
  'izohlar va talqinlar': 'kanstovar',
  "biznes ta'limi va karyerani rivojlantirish": 'kanstovar',
  'rezinkalar': 'aksessuar',
  'tasbehlar': 'aksessuar',
  'kalit ilgichlar': 'aksessuar',
  'sport kostyumlari': 'kiyim',
  'sport shimlari': 'kiyim',
};

/** Kalit soʻzlar — yuqoridan pastga, birinchi mosi. */
const QOIDALAR: ReadonlyArray<[TurkumSohasi, RegExp]> = [
  ['avto', /avto|moto|shina/u],
  ['uy', /kir yuvish|idish yuvish/u],
  ['aksessuar', /sumka|ryukzak|hamyon|uzuk|bilaguzuk|zirak|zanjir|marjon|kulon|taqinchoq|ko'zoynak|kamar|sharf|ro'mol|palantin|kepka|beysbol|to'g'nag'ich|obodok|tillaqosh|brelok/u],
  ['kanstovar', /ruchka|qalam|daftar|bloknot|penal|papka|kitob|adabiyot|roman|nasr|detektiv|fantastika|fentezi|sarguzasht|ertak|psixolog|falsafa|motivatsiya|kouching|dasturlash|tillarini|abituriyent|intellekt|kanst|manga/u],
  ['bolalar', /bola|chaqaloq|o'yinchoq|emizgich|aravach|taglik|qo'g'irchoq|boshqotirma|syujetli|rivojlantir|robototexnika|stem/u],
  ['elektronika', /telefon|smartfon|quloqchin|akustika|planshet|noutbuk|kompyuter|televizor|printer|router|mikrofon|sichqoncha|klaviatura|kabel|adapter|zaryad|akkumulyator|xotira karta|flesh|video/u],
  ['gozallik', /atir|parfyum|xushbo'y|krem|zardob|niqob|tonal|makiyaj|kiprik|(^|[^\p{L}])lab|podvodka|balzam|skrab|piling|sovun|(^|[^\p{L}])gel|sponj|dezodorant|antiperspirant|tush(?!\p{L})|tushlar|rumyana|bronzer|shampun|losyon|tonik|termal|tish|prokladka|tampon|quyoshdan himoya|(^|[^\p{L}])soch( |$)|soch uchun|soch quritgich|soch kesish|soch to'g'rila|trimmer|epilyator|ustara|taroq|(^|[^\p{L}])yuz|tana uchun|qo'l krem|yuvinish|dush|qosh|ko'z uchun/u],
  ['sport', /(^|[^\p{L}])sport|fitnes|futbol formasi|butsi|velosiped|turizm|yoga/u],
  ['kiyim', /kiyim|poyabzal|krossovka|keda|lofer|mokasin|baletka|bosonojka|shlepans|slans|shippak|futbolka|polo|longsliv|ko'ylak|libos|yubka|bluzka|shim|jinsi|kostyum|jemper|sviter|pullover|kardigan|kurtka|pijama|paypoq|trusik|byustgalter/u],
  ['uy', /maishiy|idish|likopcha|krujka|finjon|kostryulka|(^|[^\p{L}])tova|pichoq|oshxona|pishiriq|ziravor|konteyner|lanch|termos|dasturxon|sochiq|choyshab|yostiq|parda|gilam|dekor|sham|(^|[^\p{L}])gul|girlyand|quti|savat|organayzer|ilgak|tutqich|tozala|latta|gubka|shvabra|cho'tka|vanna|hojatxona|sovutgich|muzlatgich|changyutgich|dazmol|choynak|isitgich|namlagich|ventilyator|lampa|chiroq|kreslo/u],
];

/** Turkum nomidan soha. Topilmasa — `boshqa`. */
export function turkumSohasi(nom: string): TurkumSohasi {
  const t = normla(nom);
  const aniq = ANIQ[t];
  if (aniq) return aniq;
  for (const [soha, re] of QOIDALAR) if (re.test(t)) return soha;
  return 'boshqa';
}

/**
 * Qiziqish savoliga oʻzi yozgan matn → sohalar ("kanstovar sotmoqchiman",
 * "kosmetika va kiyim"). Soha nomi yoki undagi tovar soʻzi boʻyicha.
 * "Bilmayman" — `[BILMAYMAN]`. Hech narsa topilmasa — boʻsh.
 */
export function sohaniTop(matn: string): string[] {
  const t = normla(matn);
  if (!t) return [];
  if (/bilmayman|bilmadim|farqi yo'q|hammasi|не знаю|без разницы|любой/u.test(t)) return [BILMAYMAN];
  return sinonimSohalari(t);
}

/** Soha nomi va uning sinonimlari boʻyicha (`normla` dan oʻtgan matn). */
function sinonimSohalari(t: string): SohaId[] {
  const topildi = new Set<SohaId>();
  // Gapning ichida ham ishlaydi (tajriba savoliga yozilgan matn, 2026-10-15) — shuning
  // uchun: «pasport», «transport» — sport emas; «3 soat» — aksessuar emas; «kir yuvish
  // mashinasi», «avtomat» — avto emas; «maishiy texnika» — uy-roʻzgʻor (elektronika emas).
  const SINONIM: ReadonlyArray<[SohaId, RegExp]> = [
    ['kiyim', /kiyim|poyabzal|oyoq kiyim|одежд|обув/u],
    ['gozallik', /kosmetika|go'zallik|parvarish|atir|parfyum|космет|красот|парфюм/u],
    ['uy', /uy-ro'zg'or|uy ro'zg'or|ro'zg'or|maishiy|oshxona|idish|для дома|быт|посуд/u],
    ['bolalar', /bola|o'yinchoq|детск|игрушк/u],
    ['elektronika', /elektronika|telefon|gadjet|(?<!maishiy )texnika|электрон|телефон|гаджет/u],
    ['kanstovar', /kanstovar|kantstovar|kanselyar|ruchka|daftar|kitob|канц|книг/u],
    ['aksessuar', /aksessuar|zargar|taqinchoq|sumka|(?<!\d\s?)soat|аксессуар|украшен|сумк/u],
    ['sport', /(?<!\p{L})sport|fitnes|спорт/u],
    ['avto', /(?<!\p{L})avto(?!mat)|(?<!(?:yuvish|tikuv) )mashina|авто/u],
  ];
  for (const [soha, re] of SINONIM) if (re.test(t)) topildi.add(soha);
  return [...topildi];
}

/**
 * Tovar soʻzidan soha — `gapdagiSohalar` uchun. `sohaniTop` ga qoʻshilmaydi: u erkin
 * savol turini ham aniqlaydi va «Krossovka sotish osonmi?» butun kiyim sohasi haqida
 * emas, krossovka turkumlari haqida (`erkin-malumot.ts`). Soʻz boshi bilan: «mashina»
 * ichidagi «shina» avto emas.
 */
const TOVAR_SOZLARI: ReadonlyArray<[SohaId, RegExp]> = [
  // Oyoq kiyim (nazoratchi, 2026-10-19: «potinka sotganman» — soha belgilanmadi).
  ['kiyim', /krossovka|futbolka|ko'ylak|kurtka|jinsi|(?<!\p{L})shim|potinka|botinka|(?<!\p{L})etik(?!et)|tufli|poyabzal|shippak|кроссовк|футболк|плать|куртк|ботинк|туфл|сапог|обув/u],
  ['gozallik', /pomada|(?<!\p{L})krem|shampun|духи|помад|шампун/u],
  ['uy', /changyutgich|sovutgich|muzlatgich|dazmol|choynak|kir yuvish|gilam|parda|choyshab|sochiq|пылесос|холодильник|утюг|чайник/u],
  ['bolalar', /chaqaloq|aravacha|коляск/u],
  ['elektronika', /smartfon|noutbuk|kompyuter|quloqchin|naushnik|televizor|planshet|ноутбук|наушник|телевизор|смартфон|планшет/u],
  ['sport', /velosiped|samokat|trenajor|gantel|велосипед|самокат|тренажер|тренажёр/u],
  ['avto', /(?<!\p{L})shina|(?<!\p{L})шин/u],
];

/**
 * Gapdan sohalar (2026-10-15): soha nomi ham, tovar soʻzi ham — tajriba yoki qiziqish
 * savoliga yozilgan «velosiped sotganman», «krossovka sotmoqchiman», «oldin sotganman
 * maishiy texnika». «Bilmayman» kirmaydi. Tartib — `SAVDO_SOHALARI` dagi.
 */
export function gapdagiSohalar(matn: string): SohaId[] {
  const t = normla(matn);
  // «Bilmayman» boʻlsa ham gapdagi soha olinadi: «nima sotishni bilmayman, oldin kiyim sotganman».
  const topildi = new Set<SohaId>(sinonimSohalari(t));
  for (const [soha, re] of TOVAR_SOZLARI) if (re.test(t)) topildi.add(soha);
  return SAVDO_SOHALARI.map((s) => s.id).filter((id) => topildi.has(id));
}

/**
 * Qidiruv soʻzi turkum nomiga mosmi. Soʻz oxiridagi qoʻshimchalar
 * ("ruchkalar", "atirni") olib tashlanadi; 3 harfdan qisqa soʻz hisobga
 * olinmaydi. Ruscha keng tarqalgan soʻzlar oʻzbekchasiga oʻgiriladi.
 */
const RUSCHA: ReadonlyArray<[RegExp, string]> = [
  [/ручк/u, 'ruchka'], [/карандаш/u, 'qalam'], [/тетрад/u, 'daftar'], [/блокнот/u, 'bloknot'],
  [/книг/u, 'adabiyot'], [/игрушк/u, "o'yinchoq"], [/сумк/u, 'sumka'], [/кроссовк/u, 'krossovka'],
  [/наушник/u, 'quloqchin'], [/чехол|чехл/u, 'qoplama'], [/духи|парфюм/u, 'atir'], [/крем/u, 'krem'],
  [/шампун/u, 'shampun'], [/футболк/u, 'futbolka'], [/плать/u, "ko'ylak"], [/час/u, 'soat'],
  [/посуд/u, 'idish'], [/полотенц/u, 'sochiq'], [/телефон|смартфон/u, 'smartfon'], [/кольц/u, 'uzuk'],
];
const QOSHIMCHA = /(lari|larni|larga|larda|lar|ning|ni|ga|da|dan|cha|i)$/u;

function ildizlar(t: string): string[] {
  let s = normla(t);
  for (const [re, w] of RUSCHA) if (re.test(s)) s += ` ${w}`;
  // "g'ilof", "chexol" — telefon qoplamasi.
  if (/g'ilof|chexol/u.test(s)) s += ' qoplama';
  return [...new Set(s.split(/[^\p{L}']+/u)
    .map((w) => w.replace(/^'+|'+$/gu, ''))
    .map((w) => (w.length > 5 ? w.replace(QOSHIMCHA, '') : w))
    .filter((w) => w.length >= 3))];
}

/** Turkum nomi qidiruv soʻziga mosmi (soʻz boshi boʻyicha, 3+ harf). */
export function qidiruvMos(soz: string, turkumNomi: string): boolean {
  const izlar = ildizlar(soz);
  if (!izlar.length) return false;
  const nomSozlari = normla(turkumNomi).split(/[^\p{L}']+/u).filter(Boolean);
  return izlar.some((iz) => nomSozlari.some((n) => n.startsWith(iz) || (n.length >= 4 && iz.startsWith(n))));
}
