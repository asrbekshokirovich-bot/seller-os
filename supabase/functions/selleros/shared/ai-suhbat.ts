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
 * AI yiqilsa — kod qoliplari: chat toʻxtamaydi.
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
  /** Joriy savol va (1-qadamda) tanishuvning keyingi javobsiz savollari, tartibi bilan. */
  savollar: SuhbatSavoli[];
  /** Mijoz yozgani (500 belgigacha). */
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
  /** Oldingi javob darvozadan oʻtmadi — nima uchun. */
  tuzat: string | null;
}

/** AI yozgan xabar uch qismda; boʻsh qism — `''`. */
export interface AiYozuv { oldin: string; izoh: string; savol: string }

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

export const AI_YOZ_KORSATMA = [
  'Sen «ZumSavdo yordamchisi»san: Uzumda birinchi marta sotuvchi boʻlayotgan odamni 12 qadamli yoʻl boʻyicha olib',
  'borasan — nima sotishni tanlashdan tortib Xitoydan olib kelib Uzumda sotishgacha. Suhbatni sen olib borasan: erkin,',
  'jonli, doʻstona — tajribali maslahatchi kabi. Lekin qadamlar tartibini, savollarni va raqamlarni dastur beradi:',
  'har javobingda keyingi savolni berishing shart.',
  '',
  'Javobni JSON da uch qism bilan yoz — har qism chatda alohida pufak, boʻsh qism chiqmaydi:',
  '- oldin: mijoz SAVOL bergan, xavotir yoki tushunmovchilik bildirgan boʻlsa — avval shunga aniq javob (FAKTLAR, TAYYOR',
  'JAVOB, MIJOZ HOLATIdan; savolini eʼtiborsiz qoldirma). QABUL QILINMADI boʻlsa — nimasi tushunarsiz ekanini muloyim ayt.',
  'Yozgan gapida muhim narsa boʻlsa (tajribasi, rejasi, qiyinchiligi) — unga qisqa, iliq munosabat. Oddiy tugma',
  'bosilgan va aytadigan gap boʻlmasa — boʻsh qoldir.',
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
  '- «AI», «model», «sunʼiy intellekt», «tizim» soʻzlari yoʻq; mijoz «robotmisiz?» desa — «ZumSavdo dasturining',
  'yordamchisiman, odam emasman».',
  '- Mijoz salom bermagan boʻlsa salom bilan boshlama. Markdown, sarlavha, yulduzcha, roʻyxat belgisi yoʻq.',
].join('\n');

/** Savol tavsifi — AI uchun: id, qadam, turi, matni, variantlari (qiymat = nom). */
export function savolTavsifi(s: SuhbatSavoli, n: number | null = null): string {
  const bosh = `${n !== null ? `${n}) ` : ''}id: ${s.id} (${s.qadam}-qadam), turi: ${s.turi}`
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
    `MIJOZ HOLATI:\n${k.holat}`,
    k.tarix ? `\nSUHBAT (oxirgi xabarlar):\n${k.tarix}` : null,
    k.mijoz !== null
      ? `\nMIJOZ ${k.tanlov ? 'TUGMANI BOSDI' : 'YOZDI'}: «${k.mijoz}»`
      : '\nMIJOZ hozir hech narsa yozmadi (natija tayyor boʻldi yoki u shaxsiy maʼlumotini berdi — u senga koʻrsatilmaydi).',
    k.qabul.length ? `QABUL QILINDI:\n${k.qabul.map((x) => `- ${x}`).join('\n')}` : null,
    k.rad.length ? `QABUL QILINMADI:\n${k.rad.map((x) => `- ${x}`).join('\n')}` : null,
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
 * AI javobidan `javobniQabulQil` uchun qiymat. `undefined` — javob yoʻq (tashlanadi);
 * `null` — oʻtkazib yuborish.
 */
export function aiQiymat(s: SuhbatSavoli, j: AiJavob): unknown {
  if (j.otkazish) return s.otkazishMumkin ? null : undefined;
  const q = j.qiymatlar.map((x) => x.trim()).filter(Boolean);
  if (!q.length) return undefined;
  return s.turi === 'kopTanlov' ? q : q[0];
}
