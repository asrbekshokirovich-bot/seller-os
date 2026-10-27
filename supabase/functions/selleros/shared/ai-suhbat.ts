/**
 * AI SUHBAT — suhbatni AI olib boradi, 12 qadam saqlanadi.
 *
 * Nazoratchi (2026-10-19): "LLM butun sayt uchun ishlasin, mijoz faqat yozganda
 * emas"; tanlovi — hamma xabarni AI yozsin, mijoz javobini AI tushunsin,
 * natijalarni AI tushuntirsin; "AI toʻliq erkin, lekin 12 ta qadam qolsin";
 * model — Opus 5.5. Ilgari AI faqat mijoz savol yozganda ishlardi, qolgani
 * kod qoliplari edi: «potinka sotganman» soʻzlar roʻyxatida yoʻq — soha
 * belgilanmadi; 2-qadam xulosasi tanlangan sohani emas, «Sumkalar» ni
 * maqtadi.
 *
 * Turn ikki chaqiruvda (`suhbat.ts`):
 *  1. TUSHUN — mijoz YOZGAN gapdan javoblar: joriy savolga va tanishuvning
 *     keyingi savollariga, qiziqish uchun taklif, gapda savol bormi. Qiymatni
 *     KOD tekshiradi (`javobniQabulQil`) — notoʻgʻrisi rad, sababi bilan.
 *     Tugma bosilsa — bu chaqiruv yoʻq.
 *  2. YOZ — mijozga xabar: munosabat (va savoliga javob), yangi natijalar
 *     izohi shu mijozga, keyingi savol oʻz soʻzi bilan. Raqamlar faqat
 *     natija, faktlar va holatdan — darvoza (`tekshir`) tekshiradi.
 * AI yiqilsa — chat toʻxtamaydi, lekin TAYYOR JAVOB YOʻQ (nazoratchi, 2026-10-26: «AI hamma
 * joyda javob bersin, tayyor javoblar shartmas»): AI vaqt qolguncha qayta urinadi (`suhbat.ts`),
 * baribir yozolmasa — qisqa uzr (`aiUzr`) va savolning oʻzi.
 *
 * Bu modul SOF: koʻrsatma, soʻrov matni, JSON sxema va javobni oʻqish.
 */

import type { KodHarakati, SuhbatSavoli } from './ssenariy.ts';
import { tushuntir } from './ssenariy.ts';
import type { TovarTavsiyasi, Yonalish } from './qadamlar.ts';
import { tovarSatri, yonalishSatri } from './yordamchi.ts';
import type { Yozuv } from './yozuv.ts';

/** Bitta savolga AI ajratgan javob. */
export interface AiJavob {
  savol_id: string;
  /** Tanlov — [variant qiymati]; koʻp tanlov — bir nechta; son — [mijoz iborasi]; matn — [matn]. */
  qiymatlar: string[];
  /** Mijoz bu savolni oʻtkazib yubormoqchi. */
  otkazish: boolean;
}

export interface AiTushuncha {
  javoblar: AiJavob[];
  /** Qiziqish savoli uchun oldindan belgilash (soha qiymatlari) — mijoz oʻzi tanlamagan boʻlsa. */
  taklif_qiziqish: string[];
  /** Gapda savol, xavotir yoki tushunmovchilik bor. */
  savol_bor: boolean;
}

export interface AiTushunSorovi {
  /** Joriy savol va tanishuvning keyingi javobsiz savollari (qiziqish, byudjet, ism, tajriba — `kelgusiTanishuvSavollari`), tartibi bilan. */
  savollar: SuhbatSavoli[];
  /**
   * Mijoz yozgani (500 belgigacha). Ism/telefon savolida — ism va telefon ham shu yerda
   * (nazoratchi, 2026-10-21: «LLM shaxsiy maʼlumotni savoldan ajratib olsin»). Faqat Claude:
   * `ai` faqat Anthropic kaliti bilan ulanadi, Gemini ga bu yoʻl yoʻq.
   */
  xabar: string;
  /** Mijoz holati — shaxsiy maʼlumotsiz. */
  holat: string;
  /** Oxirgi xabarlar — shaxsiy maʼlumotsiz. */
  tarix: string;
}

/** Shu turnda chiqqan kod natijasi — AI izohlashi uchun matn (raqamlari bilan). */
export interface AiNatija { harakat: KodHarakati; matn: string }

export interface AiYozSorovi {
  /** Mijoz yozgani yoki bosgan tugmasi nomi; `null` — mijoz hech narsa yubormadi (natija oʻzi keldi) yoki shaxsiy. */
  mijoz: string | null;
  /** Tugma bosdi (`true`) yoki yozdi. */
  tanlov: boolean;
  /** Qabul qilingan javoblar: «savol» → «javob». */
  qabul: string[];
  /** Qabul qilinmaganlar: «savol» — sabab. */
  rad: string[];
  /**
   * Mijoz keyingi savollarga ham javob berdi — eslab qolindi: oʻsha savol kelganda soʻralmaydi,
   * shu javob olinadi («savol» → javob).
   */
  eslab: string[];
  /** Mijoz gapida savol bor. */
  savolBor: boolean;
  /** Faktlar (`bilim.ts`). */
  bilim: string | null;
  /** Savolga bazadagi javob — boʻlsa. */
  tayyor: string | null;
  /** Shu turnda chiqqan natijalar. */
  natijalar: AiNatija[];
  /** Keyingi savol (tugmalari bilan) yoki `null`. */
  keyingi: SuhbatSavoli | null;
  /** Keyingi savol boʻlmasa — kod jumlasi (kutish). */
  keyingiMatn: string | null;
  holat: string;
  tarix: string;
  til: Yozuv;
  /**
   * Bugun (Toshkent, `kk.oo.yyyy`) — muddatlar haqida rost gapirsin: oʻtgan sanaga «… gacha» demasin
   * (jonli sinov, 2026-10-20: 20-oktyabrda «15.10.2026 gacha toʻlang»).
   */
  bugun: string;
  /** Oldingi javob darvozadan oʻtmadi — nima uchun. */
  tuzat: string | null;
  /**
   * Mijozning ismi (familiyasiz, telefonsiz) — unga ismi bilan murojaat qilsin, robotdek emas
   * (nazoratchi, 2026-10-21). Nomaʼlum boʻlsa — yoʻq.
   */
  ism?: string | null;
}

/** AI yozgan xabar uch qismda; boʻsh qism — `''`. */
export interface AiYozuv { oldin: string; izoh: string; savol: string }

/**
 * AI baribir yozolmaganda (tarmoq, vaqt, darvoza) — yagona tayyor gap: qisqa uzr (2026-10-26).
 * Tayyor javob emas: savolga javob bermaydi, faqat rostini aytadi. `qabul` — mijoz javobi
 * yozib olindi (uzr faqat savoli uchun).
 */
export function aiUzr(til: Yozuv, qabul = false): string {
  if (til === 'ru') {
    return qabul
      ? 'Ваш ответ записал. Извините, на вопрос сейчас ответить не получилось — спросите ещё раз чуть позже.'
      : 'Извините, сейчас не получилось ответить — напишите ещё раз чуть позже.';
  }
  if (til === 'uz-kirill') {
    return qabul
      ? 'Жавобингизни ёзиб олдим. Кечирасиз, саволингизга ҳозир жавоб ёза олмадим — бироздан кейин қайта сўранг.'
      : 'Кечирасиз, ҳозир жавоб ёза олмадим — бироздан кейин қайта ёзинг.';
  }
  return qabul
    ? 'Javobingizni yozib oldim. Kechirasiz, savolingizga hozir javob yoza olmadim — birozdan keyin qayta soʻrang.'
    : 'Kechirasiz, hozir javob yoza olmadim — birozdan keyin qayta yozing.';
}

export const AI_TUSHUN_SXEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    javoblar: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          savol_id: { type: 'string' },
          qiymatlar: { type: 'array', items: { type: 'string' } },
          otkazish: { type: 'boolean' },
        },
        required: ['savol_id', 'qiymatlar', 'otkazish'],
        additionalProperties: false,
      },
    },
    taklif_qiziqish: { type: 'array', items: { type: 'string' } },
    savol_bor: { type: 'boolean' },
  },
  required: ['javoblar', 'taklif_qiziqish', 'savol_bor'],
  additionalProperties: false,
};

export const AI_YOZ_SXEMA: Record<string, unknown> = {
  type: 'object',
  properties: { oldin: { type: 'string' }, izoh: { type: 'string' }, savol: { type: 'string' } },
  required: ['oldin', 'izoh', 'savol'],
  additionalProperties: false,
};

export const AI_TUSHUN_KORSATMA = [
  'Sen ZumSavdo yordamchisining «tushunish» qismisan. Mijoz chatda yozgan gapni oʻqib, SAVOLLARga mos javoblarni',
  'ajratasan. Javobni keyin dastur tekshiradi va saqlaydi — sen faqat mijoz AYTGANINI ber, oʻzingdan qoʻshma.',
  '',
  'QOIDALAR:',
  '- Faqat SAVOLLAR roʻyxatidagi savol_id lar. Mijoz qaysi savolga javob bergan boʻlsa — oʻshalarni ber; aytmaganini qoʻshma.',
  '- tanlov: qiymatlar = [mos variant qiymati]. Mos variant boʻlmasa va savolga oʻzi yozsa boʻlsa — mijozning oʻz',
  'soʻzlari bilan qisqa javob (masalan, tajriba savoliga: «Instagramda potinka sotganman»).',
  '- kopTanlov: qiymatlar = mos variant qiymatlari (bir nechta boʻlishi mumkin).',
  '- son: qiymatlar = [mijoz aytgan son iborasi, aynan] — masalan «70 mln», «5000 $», «60 ta». Hisoblama, oʻgirma.',
  '- matn: qiymatlar = [mijoz gapidagi tegishli qism].',
  '- ism (ism-familiya va telefon): qiymatlar = [mijoz yozgan ism-familiyasi va/yoki telefon raqami — oʻzi yozganicha,',
  'bitta qatorda, masalan «Aziz Karimov, +998 90 123 45 67»]. Salomlashish, savol va boshqa gaplarni QOʻSHMA',
  '(«Salom, men Aziz, 90 123 45 67, bu bepulmi?» → «Aziz, 90 123 45 67», savol_bor: true). Ism ham, raqam ham',
  'yoʻq boʻlsa — javob qilma.',
  '- telefon: qiymatlar = [mijoz yozgan telefon raqami, aynan]. Raqam yoʻq boʻlsa — javob qilma.',
  '- Faqat taxmin yoki savol shaklida aytilgan qiymat («70 mln yetadimi?», «kiyim sotsam boʻladimi?», «80 mlnmi yoki',
  '100 mi?») — JAVOB EMAS: javoblarga qoʻshma, savol_bor: true.',
  '- Mijoz savolni oʻtkazmoqchi boʻlsa («bilmayman», «keyin», «oʻtkazib yubor») va savol oʻtkazib boʻladigan boʻlsa —',
  'otkazish: true, qiymatlar boʻsh. Lekin variantlarda «Bilmayman» kabi variant boʻlsa — oʻshani tanla. Aks holda otkazish: false.',
  '- taklif_qiziqish: «qiziqish» savoli roʻyxatda boʻlsa va mijoz gapidan qaysi sohaga yaqinligi koʻrinsa (masalan',
  '«potinka sotganman» → kiyim, «telefon gʻiloflari» → elektronika) — oʻsha savol variantlaridagi soha qiymatlari.',
  'Mijoz sohani oʻzi aniq tanlamagan boʻlsa — «qiziqish» ga javob qilma, faqat taklif. Aks holda boʻsh roʻyxat.',
  '- savol_bor: mijoz biror narsa soʻradi, tushunmaganini aytdi, xavotirini aytdi yoki maslahat soʻradi (javob bilan',
  'birga boʻlsa ham) — true.',
  '- Mijoz shevada, ruscha, lotin yoki kirillda, xato bilan yozishi mumkin («potinka», «vapshe», «telfon») — maʼnosini tushun.',
].join('\n');

/**
 * Sayt tugma va boʻlim nomlari — AI ularni oʻzidan tarjima qilmasin (jonli sinov, 2026-10-20: rus
 * javobida «Профилим» → «Рејаларни солиштириш» chiqdi; sahifada esa «Мой профиль» → «Сравнить тарифы»).
 * Javob variantlari (tugmalar) serverdan — rus sahifasida ham oʻzbekcha.
 */
export const SAYT_NOMLARI = [
  '- Sayt tugma va boʻlim nomlarini aynan shunday yoz (rus tilida javob bersang — qavs ichidagisini): «Davom etish»',
  '(«Продолжить»), «Oʻtkazib yuborish» («Пропустить»), «Profilim» («Мой профиль»), «Rejalarni solishtirish»',
  '(«Сравнить тарифы»), «Boshidan boshlash» («Начать заново»), «Suhbatlarim» («Мои чаты»), «Suhbatni boshlash»',
  '(«Начать чат»). Javob variantlari (tugmalar) nomi ikkala tilda ham oʻzbekcha koʻrinadi — ularni aynan, tarjima qilmay yoz.',
].join('\n');

export const AI_YOZ_KORSATMA = [
  'Sen «ZumSavdo yordamchisi»san: Uzumda birinchi marta sotuvchi boʻlayotgan odamni 12 qadamli yoʻl boʻyicha olib',
  'borasan — nima sotishni tanlashdan tortib Xitoydan olib kelib Uzumda sotishgacha. Suhbatni sen olib borasan: erkin,',
  'jonli, doʻstona — tajribali maslahatchi kabi. Lekin qadamlar tartibini, savollarni va raqamlarni dastur beradi:',
  'har javobingda keyingi savolni berishing shart.',
  '',
  'Javobni JSON da uch qism bilan yoz — har qism chatda alohida pufak, boʻsh qism chiqmaydi:',
  '- oldin: mijoz SAVOL bergan, xavotir yoki tushunmovchilik bildirgan boʻlsa — avval shunga aniq javob (FAKTLAR, TAYYOR',
  'JAVOB, MIJOZ HOLATIdan; savolini eʼtiborsiz qoldirma). QABUL QILINMADI boʻlsa — nimasi tushunarsiz ekanini muloyim ayt.',
  'Yozgan gapida muhim narsa boʻlsa (tajribasi, rejasi, qiyinchiligi) — unga qisqa, iliq munosabat. ESLAB QOLINDI boʻlsa —',
  'buni qisqa ayt (masalan: «Pulni ham yozib qoʻydim — keyin qayta soʻramayman»). Oddiy tugma bosilgan yoki mijoz',
  'shaxsiy maʼlumotini bergan va aytadigan muhim gap boʻlmasa — boʻsh qoldir: qisqa rahmat yoki bogʻlovchi gapni',
  '«savol» boshida ayt.',
  '- izoh: YANGI NATIJALAR boʻlsa — ularni shu mijozga tushuntir: nima chiqdi, unga qaysi biri koʻproq mos va nega',
  '(tajribasi, qiziqqan sohasi, puli bilan bogʻlab). Asosiylarini nomi va raqami bilan ayt; hammasini sanab oʻtirma —',
  'kartalar ekranda turibdi. Natija boʻlmasa — boʻsh.',
  '- savol: KEYINGI SAVOLni oʻz soʻzing bilan ber (oldiga qisqa bogʻlovchi gap qoʻshsang boʻladi): maʼnosi, shartlari va',
  'misollari saqlansin; tugmalar pastda turibdi — ularni sanab oʻtirma. KEYINGI SAVOL boʻlmasa — KEYINGI QADAM',
  'matnining maʼnosini ayt.',
  '',
  'USLUB: doʻstona, «siz» bilan; jonli va sodda, kitobiy soʻzsiz; har qism odatda 1–4 jumla (savolga javob — 6 jumlagacha).',
  'Mijoz qaysi tilda va yozuvda yozgan boʻlsa (oʻzbek lotin, oʻzbek kirill yoki rus) — butun javob oʻshanda.',
  '',
  'QOIDALAR:',
  '- Raqam (summa, foiz, ball, dona, muddat, sotuv) faqat YANGI NATIJALAR, MIJOZ HOLATI, FAKTLAR, TAYYOR JAVOB, KEYINGI',
  'SAVOL yoki mijoz gapidan. Yangi raqam oʻylab topma, hisoblama, yaxlitlama; raqamni soʻz bilan ham yozma.',
  '- Foyda, sotuv yoki daromad vaʼda qilma; «kafolat» («кафолат», «гарантия») soʻzi yoʻq. Qaror mijozniki.',
  '- Roʻyxatda yoʻq tovar yoki yoʻnalishni oʻzingdan taklif qilma.',
  '- QABUL QILINMADI boʻlsa — KEYINGI SAVOL oʻsha savolning oʻzi: uni qayta soʻra.',
  '- Savolni oʻtkazib yuborish haqida FAQAT uning tavsifida «oʻtkazib yuborsa boʻladi» deyilgan boʻlsa gapir. Aks holda',
  'oʻtkazish haqida umuman gapirma (na «mumkin», na «shart» deb): «Oʻtkazib yuborish» tugmasi yoki boshqa yoʻl vaʼda qilma.',
  '- Ichki boʻlim nomlari (FAKTLAR, MIJOZ HOLATI, TAYYOR JAVOB, YANGI NATIJALAR, SUHBAT) mijozga aytilmaydi. Bilmagan',
  'narsangni «bu haqda aniq maʼlumotim yoʻq» deb ayt. SUHBATda javob bergan savolingga qayta javob berma.',
  '- Muddat yoki sana BUGUNdan oldin boʻlsa — «… gacha» dema: muddati oʻtganini ochiq ayt.',
  '- «AI», «model», «sunʼiy intellekt», «tizim» soʻzlari yoʻq; mijoz «robotmisiz?» desa — «ZumSavdo dasturining',
  'yordamchisiman, odam emasman».',
  '- Mijoz salom bermagan boʻlsa salom bilan boshlama. Markdown, sarlavha, yulduzcha, roʻyxat belgisi yoʻq.',
  SAYT_NOMLARI,
].join('\n');

/** Savol tavsifi — AI uchun: id, qadam, turi, matni, variantlari (qiymat = nom). */
export function savolTavsifi(s: SuhbatSavoli, n: number | null = null): string {
  const bosh = `${n !== null ? `${n}) ` : ''}id: ${s.id} (${s.qadam}-qadam), turi: ${s.turi}`
    // Oʻtkazib boʻlmasligi bu yerda YOZILMAYDI: jonli sinovda (2026-10-21) AI uni har savol
    // oxiriga «Bu savolga javob berish shart» deb qoʻsha boshladi — robotdek. Qoida koʻrsatmada.
    + `${s.erkin ? ', oʻzi yozsa ham boʻladi' : ''}${s.otkazishMumkin ? ', oʻtkazib yuborsa boʻladi' : ''}`;
  const variantlar = s.variantlar.length
    ? `\n   Variantlar: ${s.variantlar.slice(0, 40).map((v) => `${v.qiymat} = «${v.nom}»`).join('; ')}`
    : '';
  const tanlangan = s.tanlangan?.length ? `\n   Oldindan belgilangan: ${s.tanlangan.join(', ')}` : '';
  return `${bosh}\n   Savol: ${s.matn}${variantlar}${tanlangan}`;
}

/** TUSHUN soʻrovi matni. */
export function aiTushunMatni(k: AiTushunSorovi): string {
  return [
    k.holat ? `MIJOZ HOLATI:\n${k.holat}` : null,
    k.tarix ? `\nSUHBAT (oxirgi xabarlar):\n${k.tarix}` : null,
    `\nSAVOLLAR:\n${k.savollar.map((s, i) => savolTavsifi(s, i + 1)).join('\n')}`,
    `\nMIJOZ YOZDI: ${k.xabar}`,
  ].filter(Boolean).join('\n');
}

/** YOZ soʻrovi matni. */
export function aiYozMatni(k: AiYozSorovi): string {
  return [
    k.bilim ? `FAKTLAR:\n${k.bilim}\n` : null,
    `BUGUN: ${k.bugun} (Toshkent vaqti).`,
    k.ism ? `MIJOZ ISMI: ${k.ism} (oʻrni kelganda shu ism bilan murojaat qil).` : null,
    `MIJOZ HOLATI:\n${k.holat}`,
    k.tarix ? `\nSUHBAT (oxirgi xabarlar):\n${k.tarix}` : null,
    k.mijoz !== null
      ? `\nMIJOZ ${k.tanlov ? 'TUGMANI BOSDI' : 'YOZDI'}: «${k.mijoz}»`
      : '\nMIJOZ hozir hech narsa yozmadi (natija tayyor boʻldi yoki u shaxsiy maʼlumotini berdi — u senga koʻrsatilmaydi).',
    k.qabul.length ? `QABUL QILINDI:\n${k.qabul.map((x) => `- ${x}`).join('\n')}` : null,
    k.rad.length ? `QABUL QILINMADI:\n${k.rad.map((x) => `- ${x}`).join('\n')}` : null,
    k.eslab.length
      ? `ESLAB QOLINDI (mijoz keyingi savollarga ham javob berdi — oʻsha savol kelganda soʻralmaydi, shu javob olinadi):\n${k.eslab.map((x) => `- ${x}`).join('\n')}`
      : null,
    k.savolBor ? 'MIJOZ GAPIDA SAVOL (yoki xavotir) BOR — «oldin» da avval unga javob ber.' : null,
    k.tayyor ? `TAYYOR JAVOB (savoliga; maʼnosi va raqamlarini saqla, oʻz soʻzing bilan ayt): ${k.tayyor}` : null,
    k.natijalar.length
      ? `\nYANGI NATIJALAR (ekranda kartalar boʻlib chiqadi):\n${k.natijalar.map((x) => `[${x.harakat}]\n${x.matn}`).join('\n\n')}`
      : '\nYANGI NATIJALAR: yoʻq.',
    k.keyingi ? `\nKEYINGI SAVOL:\n${savolTavsifi(k.keyingi)}` : null,
    !k.keyingi && k.keyingiMatn ? `\nKEYINGI QADAM (savol emas): ${k.keyingiMatn}` : null,
    k.til === 'ru' ? '\nJAVOB TILI: rus tili — butun javob faqat rus tilida.' : null,
    k.til === 'uz-kirill' ? '\nJAVOB TILI: oʻzbek tili, KIRILL yozuvida.' : null,
    k.tuzat ? `OLDINGI JAVOBING QAYTARILDI: ${k.tuzat} Shusiz qayta yoz.` : null,
  ].filter(Boolean).join('\n');
}

/**
 * Natija obyektining ixcham nusxasi — AI uchun: havola, rasm va kalitlar olib tashlanadi,
 * uzun matn qisqartiriladi, roʻyxatdan 8 tasi, 4 qavat chuqurlikkacha.
 */
export function ixcham(x: unknown, chuqurlik = 0): unknown {
  if (x === null || typeof x === 'number' || typeof x === 'boolean') return x;
  if (typeof x === 'string') return /^https?:\/\//iu.test(x) ? undefined : x.length > 120 ? `${x.slice(0, 120)}…` : x;
  if (chuqurlik >= 4) return undefined;
  if (Array.isArray(x)) return x.slice(0, 8).map((v) => ixcham(v, chuqurlik + 1)).filter((v) => v !== undefined);
  if (typeof x === 'object') {
    const r: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
      if (/url|rasm|havola|galereya|surat|token|kalit|imzo/iu.test(k)) continue;
      const q = ixcham(v, chuqurlik + 1);
      if (q !== undefined) r[k] = q;
    }
    return r;
  }
  return undefined;
}

/** Natija — AI izohlashi uchun: kod jumlasi va kartadagi asosiy maʼlumot. 4000 belgigacha. */
export function natijaTavsifi(harakat: KodHarakati, natija: unknown): string {
  // Natija shakli kutilmagan boʻlsa (eski yozuv) — kod xulosasisiz, faqat maʼlumot: turn yiqilmasin.
  const asos = ((): string => {
    try {
      return tushuntir(harakat, natija);
    } catch {
      return '';
    }
  })();
  const n = (natija ?? {}) as { royxat?: unknown };
  const royxat = Array.isArray(n.royxat) ? n.royxat : [];
  const yonalish = harakat === 'yonalishlar' || harakat === 'yonalish_yana' || harakat === 'yonalish_qidiruv';
  const qatorlar = yonalish
    ? (royxat as Yonalish[]).map((y) => `· ${yonalishSatri(y)}`)
    : harakat === 'tovarlar'
      ? (royxat as TovarTavsiyasi[]).slice(0, 12).map((t) => `· ${tovarSatri(t)}`)
      : [];
  const qolgan = !yonalish && harakat !== 'tovarlar' ? `Kartadagi maʼlumot: ${JSON.stringify(ixcham(natija))}` : null;
  return [asos ? `Dastur xulosasi: ${asos}` : null, ...qatorlar, qolgan].filter(Boolean).join('\n').slice(0, 4000);
}

/** ```json … ``` oʻramini olib tashlaydi (baʼzi modellar shunday qaytaradi). */
function jsonMatn(t: string): unknown {
  try {
    return JSON.parse(t.trim().replace(/^```(?:json)?\s*|\s*```$/gu, ''));
  } catch {
    return null;
  }
}

/** TUSHUN javobini oʻqiydi; shakli buzuq boʻlsa — `null`. */
export function aiTushunchaniOqi(t: string): AiTushuncha | null {
  const j = jsonMatn(t) as Partial<AiTushuncha> | null;
  if (!j || typeof j !== 'object' || !Array.isArray(j.javoblar) || typeof j.savol_bor !== 'boolean') return null;
  const javoblar = j.javoblar
    .filter((x): x is AiJavob => !!x && typeof x.savol_id === 'string' && Array.isArray(x.qiymatlar))
    .map((x) => ({ savol_id: x.savol_id, qiymatlar: x.qiymatlar.map(String), otkazish: x.otkazish === true }));
  return {
    javoblar,
    taklif_qiziqish: Array.isArray(j.taklif_qiziqish) ? j.taklif_qiziqish.map(String) : [],
    savol_bor: j.savol_bor,
  };
}

/** YOZ javobini oʻqiydi; shakli buzuq boʻlsa — `null`. */
export function aiYozuvniOqi(t: string): AiYozuv | null {
  const j = jsonMatn(t) as Partial<AiYozuv> | null;
  if (!j || typeof j !== 'object' || typeof j.savol !== 'string') return null;
  const str = (x: unknown) => (typeof x === 'string' ? x.trim() : '');
  return { oldin: str(j.oldin), izoh: str(j.izoh), savol: str(j.savol) };
}

/**
 * Yozilayotgan AI xabari — qoralama (oqim, 2026-10-20): uch qismning shu paytgacha yozilgani.
 * Darvozadan oʻtmagan: oxirida tekshirilgan xabar (`AiYozuv`) uning oʻrnini oladi.
 */
export type AiYozuvQismi = AiYozuv;

/**
 * Chala JSON dan (`{"oldin":"Rahmat! Siz…`) shu paytgacha yozilgan qismlar: tugaganlari toʻliq,
 * yozilayotgani — shu joyigacha. Chala escape (`\`, `\u00`) va yarim emoji tashlanadi — keyingi
 * boʻlakda toʻliq keladi. Kutilmagan shakl — oʻsha joyda toʻxtaydi (bor qismlar qaytadi).
 */
export function aiYozuvQismi(xom: string): AiYozuvQismi {
  const q: AiYozuvQismi = { oldin: '', izoh: '', savol: '' };
  let i = xom.indexOf('{');
  if (i < 0) return q;
  i++;
  const bosh = () => { while (i < xom.length && /\s/.test(xom[i]!)) i++; };
  while (i < xom.length) {
    while (i < xom.length && /[\s,]/.test(xom[i]!)) i++;
    if (xom[i] !== '"') break;
    const kalit = jsonSatr(xom, i + 1);
    if (!kalit.tugadi) break;
    i = kalit.oxiri;
    bosh();
    if (xom[i] !== ':') break;
    i++;
    bosh();
    if (xom[i] !== '"') break;
    const qiymat = jsonSatr(xom, i + 1);
    if (kalit.qiymat === 'oldin' || kalit.qiymat === 'izoh' || kalit.qiymat === 'savol') q[kalit.qiymat] = qiymat.qiymat.trim();
    if (!qiymat.tugadi) break;
    i = qiymat.oxiri;
  }
  return q;
}

const JSON_ESCAPE: Record<string, string> = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '"': '"', '\\': '\\', '/': '/' };

/** JSON satri ochuvchi qoʻshtirnoqdan keyin (`boshi`): qiymati, tugagan joyi, yopildimi. */
function jsonSatr(t: string, boshi: number): { qiymat: string; oxiri: number; tugadi: boolean } {
  let s = '';
  let i = boshi;
  while (i < t.length) {
    const c = t[i]!;
    if (c === '"') return { qiymat: s, oxiri: i + 1, tugadi: true };
    if (c !== '\\') { s += c; i++; continue; }
    const e = t[i + 1];
    if (e === undefined) break;
    if (e === 'u') {
      const h = t.slice(i + 2, i + 6);
      if (h.length < 4) break;
      if (/^[0-9a-fA-F]{4}$/.test(h)) s += String.fromCharCode(parseInt(h, 16));
      i += 6;
      continue;
    }
    s += JSON_ESCAPE[e] ?? e;
    i += 2;
  }
  // Chala: emojining birinchi yarmi (yuqori surrogat) yolgʻiz qolmasin.
  const oxirgi = s.charCodeAt(s.length - 1);
  return { qiymat: oxirgi >= 0xd800 && oxirgi <= 0xdbff ? s.slice(0, -1) : s, oxiri: i, tugadi: false };
}

/**
 * AI javobidan `javobniQabulQil` uchun qiymat. `undefined` — javob yoʻq (tashlanadi);
 * `null` — oʻtkazib yuborish.
 */
export function aiQiymat(s: SuhbatSavoli, j: AiJavob): unknown {
  if (j.otkazish) return s.otkazishMumkin ? null : undefined;
  const q = j.qiymatlar.map((x) => x.trim()).filter(Boolean);
  if (!q.length) return undefined;
  return s.turi === 'kopTanlov' ? q : q[0];
}
