/**
 * LLM adapteri — Claude (Anthropic) orqali: AI suhbat (tushunish va yozish, `ai-suhbat.ts`),
 * «Savol bering» oynasi (`sahifa-yordamchi.ts`) va kartochka matni (`kartochka-matn.ts`).
 *
 * LLM hisob qilmaydi, ball qoʻymaydi, savol tartibini tanlamaydi (QOIDALAR.md, 3-boʻlim).
 * Har javob `tekshiruv.ts` darvozasidan oʻtadi: manbasiz raqam yoki kafolat boʻlsa — qayta.
 *
 * PROVAYDER — faqat Claude (`LlmSozlama.provayder`, `llm-claude.ts`, `ANTHROPIC_API_KEY`;
 * 2026-10-19 dan). 2026-10-27/28 (nazoratchi, 4-taklif: «eski Gemini yoʻllari olib tashlanadi»):
 * Gemini va eski yoʻllar — kod jumlasini qayta aytish (`odamlashtir`), erkin javob va javobga
 * munosabat LLM lari — olib tashlandi: bularning hammasini AI suhbat qiladi. Kalit boʻlmasa —
 * AI yoʻq: suhbat kod jumlalari va bazadagi javoblar bilan ishlaydi.
 *
 * Har yiqilish `null` qaytaradi va bu XATO EMAS: kalit yoʻq, tarmoq yoʻq, limit tugagan —
 * oqim toʻxtamaydi.
 */

import type { KartochkaMatni } from './kartochka-matn.ts';
import {
  AI_TUSHUN_KORSATMA, AI_TUSHUN_SXEMA, AI_YOZ_KORSATMA, AI_YOZ_SXEMA, aiTushunchaniOqi, aiTushunMatni, aiYozMatni, aiYozuvniOqi,
  aiYozuvQismi, type AiTushuncha, type AiTushunSorovi, type AiYozSorovi, type AiYozuv, type AiYozuvQismi,
} from './ai-suhbat.ts';
import { SAHIFA_KORSATMA, sahifaSoroviMatni, type SahifaSorovi } from './sahifa-yordamchi.ts';

export interface LlmSozlama {
  /** Claude provayderi (`llm-claude.ts`, `claudeProvayderi`). `null` — kalit yoʻq: AI ishlamaydi. */
  provayder: LlmProvayder | null;
  /** Bir chaqiruv uchun chegara, ms. Edge Function vaqt chegarasi bor. */
  vaqtMs?: number;
  /** Har javob sarfi shu yerga (`aiSarfYozuvchi` — soʻrov sessiyasi bilan). */
  sarf?: ((s: LlmSarfi) => void) | undefined;
}

/** Provayderga bitta chaqiruv: koʻrsatma, matn va qanday javob kerakligi. */
export interface LlmChaqiruvi {
  /** Tizim koʻrsatmasi — bir turdagi har chaqiruvda bir xil (keshlanadi). */
  korsatma: string;
  /** Faktlar, holat, savol — har chaqiruvda boshqa. */
  matn: string;
  /** Log va sarf belgisi: `ai-tushun`, `ai-yoz`, `sahifa`, `kartochka`. */
  belgi: string;
  /** Javob shu JSON sxemaga mos boʻlsin; `null` — oddiy matn. */
  json: Record<string, unknown> | null;
  /** Vaqt chegarasi, ms. */
  vaqtMs: number;
  /**
   * Qancha oʻylasin: `low` — chat (tez, arzon), `medium` — kartochka matni (Uzum qoidalari koʻp).
   * Berilmasa — `low`.
   */
  kuch?: 'low' | 'medium';
  /**
   * Javob yozilgan sari (2026-10-20, nazoratchi: «matn yozilgan sari chiqib borsin»): shu paytgacha
   * yozilgan matn — har safar boshidan. Qisqarsa — model almashdi, qaytadan yozilyapti. Bu QORALAMA:
   * darvozadan hali oʻtmagan.
   */
  qism?: ((matn: string) => void) | undefined;
  /** Javob kelgach — sarf (token, narx); `ai_usage` ga yoziladi (`aiSarfYozuvchi`). */
  sarf?: ((s: LlmSarfi) => void) | undefined;
}

/** Bitta chaqiruv — javob matni yoki `null` (ishlamadi; oqim toʻxtamaydi). */
export type LlmProvayder = (c: LlmChaqiruvi) => Promise<string | null>;

/**
 * Bitta model urinishining sarfi (2026-10-22, nazoratchi: «AI xarajatini tuzat» — `ai_usage`
 * shu kungacha boʻsh edi, panel «AI ulanmagan» derdi, AI esa ishlab turardi). Provayder
 * javob kelgach `sarf` ga beradi; rad etilib boshqa modelga oʻtilsa — har urinish alohida.
 */
export interface LlmSarfi {
  /** `LlmChaqiruvi.belgi` — nima uchun: `ai-yoz`, `sahifa`, `kartochka`… */
  belgi: string;
  /** Shu urinishni bajargan model. */
  model: string;
  /** Keshdan tashqari kirish tokenlari. */
  kirish: number;
  chiqish: number;
  keshOqildi: number;
  keshYozildi: number;
  /** Taxminiy narx, $ (roʻyxat narxi boʻyicha). Narxi nomaʼlum model — `null`, taxmin qilinmaydi. */
  narxUsd: number | null;
}

/**
 * Kartochka matni (10-qadam, «Kartochka matnini yozib ber»; nazoratchi,
 * 2026-10-13). Javob — faqat JSON. Natija `kartochka-matn.ts` da Uzum
 * qoidalari va raqam darvozasidan oʻtadi; oʻtmasa sababi bilan qayta soʻraladi.
 */
export const KARTOCHKA_KORSATMA = [
  'Sen Uzum marketpleysi uchun tovar kartochkasi matnini yozasan. Sotuvchi tovarni Xitoydan (1688) olib kelib Uzumda',
  'sotmoqchi. Senga yoʻnalish nomi, Uzumdagi oʻxshash (namuna) tovar nomi va 1688 taklifi nomi (xitoycha) beriladi.',
  'Namuna nomini nusxalama — undan va 1688 nomidan tovar nima ekanini tushunib, oʻz matningni yoz.',
  '',
  'UZUM QOIDALARI (qoʻllanma 5.1):',
  '- Nom sxemasi: tovar turi + brend + model + muhim tavsif; kamida 3 soʻz. Brend yoki model nomaʼlum boʻlsa — ularsiz',
  'yoz, oʻylab topma.',
  '- Har maydon ikki tilda: oʻzbek (lotin yozuvi) va rus (kirill).',
  '- Taqiqlangan: aksiya, bepul, buyurtma berish, sotib olish, keshbek, yangilik/new, asl nusxa/original, sotuv/sale,',
  'chegirma, trend, top, xit, «eng arzon», «eng yaxshi», «1-raqamli» va har qanday qiyosiy maqtov; emoji, KATTA HARFLAR,',
  '«!!!»; sharh, reyting, buyurtmalar soni, kontakt, havola.',
  '- Nomda faqat: harf, raqam, boʻsh joy va , . : ; - – ( ) / “ ” % x * belgilari («» ishlatma).',
  '- Raqam (oʻlcham, hajm, dona, foiz) FAQAT berilgan nomlardan. Raqam yoki xususiyat nomaʼlum boʻlsa — yozma, oʻylab topma.',
  '- Qisqa tavsif — 1 jumla. Tavsif — 3–5 jumla: tovar nima, kim uchun, qanday ishlatiladi. Vaʼda va kafolat yoʻq.',
  '',
  'JAVOB faqat JSON, izohsiz:',
  '{"nom_uz": "...", "nom_ru": "...", "qisqa_uz": "...", "qisqa_ru": "...", "tavsif_uz": "...", "tavsif_ru": "..."}',
].join('\n');

/** Kartochka javobi sxemasi — Claude javobni aynan shunga moslaydi (structured outputs). */
const KARTOCHKA_SXEMA: Record<string, unknown> = {
  type: 'object',
  properties: Object.fromEntries(['nom_uz', 'nom_ru', 'qisqa_uz', 'qisqa_ru', 'tavsif_uz', 'tavsif_ru'].map((k) => [k, { type: 'string' }])),
  required: ['nom_uz', 'nom_ru', 'qisqa_uz', 'qisqa_ru', 'tavsif_uz', 'tavsif_ru'],
  additionalProperties: false,
};

/** Bitta chaqiruv — provayder (Claude) orqali; provayder yoʻq yoki matn boʻsh — `null`. */
async function chaqir(
  s: LlmSozlama, korsatma: string, matn: string, belgi: string,
  json: Record<string, unknown> | null = null, kuch: 'low' | 'medium' = 'low', qism?: (matn: string) => void,
): Promise<string | null> {
  if (!s.provayder || !matn.trim()) return null;
  return s.provayder({
    korsatma, matn, belgi, json, vaqtMs: s.vaqtMs ?? 8_000, kuch, ...(qism ? { qism } : {}), ...(s.sarf ? { sarf: s.sarf } : {}),
  }).catch(() => null);
}

/**
 * `ai_usage` yozuvchisi (0072, `so_ai_sarf_yoz`) — bitta soʻrov uchun: sarf qaysi mijozniki
 * ekani sessiya tokenidan topiladi (sessiyasiz — `null`, masalan bosh sahifadagi savol).
 * Javobni KUTTIRMAYDI: yozish `fonda` ga beriladi (Edge — `EdgeRuntime.waitUntil`). Hech qachon
 * otmaydi; yozilmasa — logda sababi: xarajat jimgina yoʻqolmasin (QOIDALAR §8).
 */
export function aiSarfYozuvchi(
  rpc: <T>(nom: string, arg: unknown) => Promise<T | null>,
  token: string | null,
  fonda: (p: Promise<unknown>) => void = (p) => { void p; },
): (s: LlmSarfi) => void {
  return (s) => {
    fonda(rpc<{ yozildi?: boolean }>('so_ai_sarf_yoz', {
      p_token: token || null,
      p_model: s.model,
      p_maqsad: s.belgi,
      p_kirish: s.kirish,
      p_chiqish: s.chiqish,
      p_kesh_oqildi: s.keshOqildi,
      p_kesh_yozildi: s.keshYozildi,
      p_narx_usd: s.narxUsd,
    }).then(
      (n) => { if (n?.yozildi !== true) console.warn(`ai sarfi yozilmadi (${s.belgi}, ${s.model}): baza javob bermadi`); },
      (e) => console.warn(`ai sarfi yozilmadi (${s.belgi}, ${s.model}): ${(e as Error)?.name ?? 'xato'}`),
    ));
  };
}

/**
 * Kartochka matni (`kartochka-matn.ts`). `null` — ishlamadi yoki JSON buzuq:
 * qolip koʻrsatiladi. Maydonlar faqat satr boʻlsa qabul qilinadi.
 */
export async function kartochkaYozBer(
  s: LlmSozlama,
  k: { namuna: string; turkum: string | null; xitoy: string | null; tuzat?: string | null },
): Promise<KartochkaMatni | null> {
  const matn = [
    `YOʻNALISH (Uzum turkumi): ${k.turkum ?? 'nomaʼlum'}`,
    `UZUMDAGI NAMUNA TOVAR NOMI: ${k.namuna}`,
    `1688 TAKLIFI NOMI (xitoycha): ${k.xitoy ?? 'yoʻq'}`,
    k.tuzat ? `OLDINGI MATNING QAYTARILDI: ${k.tuzat}. Shularsiz qayta yoz.` : null,
  ].filter(Boolean).join('\n');
  const javob = await chaqir({ ...s, vaqtMs: s.vaqtMs ?? 30_000 }, KARTOCHKA_KORSATMA, matn, 'kartochka', KARTOCHKA_SXEMA, 'medium');
  if (!javob) return null;
  try {
    const j = JSON.parse(javob.replace(/^```(?:json)?\s*|\s*```$/gu, '')) as Record<string, unknown>;
    const m = {
      nomUz: j.nom_uz, nomRu: j.nom_ru, qisqaUz: j.qisqa_uz, qisqaRu: j.qisqa_ru, tavsifUz: j.tavsif_uz, tavsifRu: j.tavsif_ru,
    };
    if (!Object.values(m).every((v) => typeof v === 'string' && v.trim())) return null;
    return Object.fromEntries(Object.entries(m).map(([kk, v]) => [kk, (v as string).trim()])) as unknown as KartochkaMatni;
  } catch {
    console.warn('llm kartochka: JSON emas');
    return null;
  }
}

/**
 * AI SUHBAT — mijoz yozgan gapni tushunish (`ai-suhbat.ts`): qaysi savolga qanday javob,
 * qiziqish taklifi, gapda savol bormi. `null` — ishlamadi yoki JSON buzuq: kod oʻzi tushunadi.
 */
export async function aiTushunBer(s: LlmSozlama, k: AiTushunSorovi): Promise<AiTushuncha | null> {
  const javob = await chaqir({ ...s, vaqtMs: s.vaqtMs ?? 20_000 }, AI_TUSHUN_KORSATMA, aiTushunMatni(k), 'ai-tushun', AI_TUSHUN_SXEMA);
  if (!javob) return null;
  const t = aiTushunchaniOqi(javob);
  if (!t) console.warn('llm ai-tushun: JSON shakli buzuq');
  return t;
}

/**
 * AI SUHBAT — mijozga xabar (`ai-suhbat.ts`): munosabat va savoliga javob, yangi natijalar
 * izohi, keyingi savol. `null` — ishlamadi yoki JSON buzuq: kod qoliplari ketadi.
 */
export async function aiYozBer(s: LlmSozlama, k: AiYozSorovi, qism?: (y: AiYozuvQismi) => void): Promise<AiYozuv | null> {
  // Oqim: yozilayotgan JSON dan shu paytgacha yozilgan uch qism (`aiYozuvQismi`) — qoralama.
  const javob = await chaqir({ ...s, vaqtMs: s.vaqtMs ?? 30_000 }, AI_YOZ_KORSATMA, aiYozMatni(k), 'ai-yoz', AI_YOZ_SXEMA,
    'low', qism ? (xom) => qism(aiYozuvQismi(xom)) : undefined);
  if (!javob) return null;
  const y = aiYozuvniOqi(javob);
  if (!y) console.warn('llm ai-yoz: JSON shakli buzuq');
  return y;
}

/**
 * Sahifa yordamchisi (`sahifa-yordamchi.ts`): bosh sahifa, kirish, maxfiylik, «Rejalar» dagi
 * «Savol bering» oynasi. Oddiy matn; `null` — ishlamadi (bazaviy javob ketadi).
 */
export async function sahifaJavobBer(s: LlmSozlama, k: SahifaSorovi, qism?: (matn: string) => void): Promise<string | null> {
  return chaqir({ ...s, vaqtMs: s.vaqtMs ?? 25_000 }, SAHIFA_KORSATMA, sahifaSoroviMatni(k), 'sahifa', null, 'low', qism);
}
