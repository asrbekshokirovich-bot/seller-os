/**
 * SAHIFA YORDAMCHISI — saytning har sahifasida AI (nazoratchi, 2026-10-19:
 * "LLM butun sayt uchun ishlasin, mijoz faqat yozganda emas"; tanlovi — «Har
 * sahifada AI yordamchi»).
 *
 * Bosh sahifa, kirish, maxfiylik va «Rejalar» da pastki burchakda «Savol bering»:
 * odam istalgan savolni yozadi — yordamchi shu sahifani bilgan holda javob beradi.
 * 12 qadamli suhbat (`suhbat.ts`) bu emas: bu yerda holat oʻzgarmaydi, hech narsa
 * yozilmaydi — faqat savol-javob.
 *
 * Raqam faqat faktlardan (`bilim.ts`), bazaviy javobdan va (sessiya boʻlsa)
 * mijoz holatidan — darvoza (`tekshir`) tekshiradi; oʻtmasa — sababi bilan bir
 * marta qayta, keyin bazaviy javob yoki umumiy gap. AI yoʻq yoki yiqilsa ham
 * javob bor. Ism va telefon yuborilmaydi (`mijozHolati` ularni olmaydi).
 */

import { tayyorJavob } from './erkin.ts';
import { yordamchiBilimi } from './bilim.ts';
import { bilimJavobi } from './bilim-javob.ts';
import { tekshir } from './tekshiruv.ts';
import { kirillUlushi, ruschami, tushunishUchun, yozuvi, type Yozuv } from './yozuv.ts';
import { SAYT_NOMLARI } from './ai-suhbat.ts';

export type Sahifa = 'bosh' | 'kirish' | 'maxfiylik' | 'obuna';
export const SAHIFALAR: readonly Sahifa[] = ['bosh', 'kirish', 'maxfiylik', 'obuna'];

/** Sahifa nima haqida — AI javobni shunga bogʻlasin. */
export const SAHIFA_TAVSIFI: Record<Sahifa, string> = {
  bosh: 'Bosh sahifa: ZumSavdo nima qilishi, 12 qadamli yoʻl (nima sotishni tanlashdan Uzumda sotishgacha), bazada nechta '
    + 'tovar kuzatilayotgani. «Suhbatni boshlash» tugmasi yordamchi suhbatini ochadi — u yerda 12 qadam bilan olib boriladi.',
  kirish: 'Kirish sahifasi: suhbatni hisobga bogʻlab, istalgan qurilmada ochish. Kirmasa ham yordamchidan foydalanish mumkin '
    + '(suhbat shu brauzerda saqlanadi).',
  maxfiylik: 'Maxfiylik sahifasi: ZumSavdo qanday maʼlumot yigʻadi, kimga yuboradi (sunʼiy intellekt, surat xizmati), '
    + 'qancha saqlaydi va qanday oʻchirtirish mumkin.',
  obuna: '«Rejalar» sahifasi: obuna narxi va nima berishi, toʻlov (Payme, Click). Hozir hamma qadam bepul boʻlsa — faktlarda '
    + 'shunday yozilgan. Odam ALLAQACHON yordamchi suhbatida (bu sahifa suhbat ichida ochilgan): suhbatni boshlashni taklif '
    + 'qilma — tepadagi orqaga tugmasi bilan suhbatga qaytadi.',
};

export interface SahifaXabari { rol: 'mijoz' | 'yordamchi'; matn: string }

/** AI ga bitta soʻrov. */
export interface SahifaSorovi {
  savol: string;
  sahifa: Sahifa;
  /** Shu oynadagi oldingi savol-javoblar (oxirgi 6 tasi). */
  tarix: SahifaXabari[];
  /** Mijoz suhbatda qayerda — sessiya boʻlsa (`mijozHolati`, shaxsiy maʼlumotsiz). */
  holat: string | null;
  bilim: string;
  /** Bazadagi tayyor javob — boʻlsa. */
  tayyor: string | null;
  til: Yozuv;
  tuzat: string | null;
}

export type SahifaManba = 'ai' | 'baza' | 'shablon';
export interface SahifaJavobi { matn: string; manba: SahifaManba }

export interface SahifaBogliqliklari {
  /** AI chaqiruvi (`llm.ts`, `sahifaJavobBer`); `null` — AI yoʻq. `vaqtMs` — shu chaqiruvga vaqt. */
  ai: ((k: SahifaSorovi, vaqtMs: number) => Promise<string | null>) | null;
  /** Saytda tarif cheklovi yoqilganmi — «Bu bepulmi?» rost javob olsin. */
  tarifCheklovi?: boolean;
}

export const SAHIFA_KORSATMA = [
  'Sen «ZumSavdo yordamchisi»san. ZumSavdo — Uzumda birinchi marta sotuvchi boʻlayotgan odamni 12 qadamli yoʻl boʻyicha',
  'olib boradigan dastur: nima sotishni tanlashdan tortib Xitoydan (1688) olib kelib Uzumda sotishgacha. Hozir odam saytning',
  'bir sahifasida turibdi va pastdagi «Savol bering» oynasida savol yozdi.',
  '',
  'VAZIFA:',
  '- Savolga aniq, doʻstona javob ber — FAKTLAR, TAYYOR JAVOB va (boʻlsa) MIJOZ HOLATIdan. Sahifaga oid savol boʻlsa — SAHIFAni hisobga ol.',
  '- Odam boshlamoqchi yoki tovar tanlashni soʻrasa — yordamchi suhbatini ochishni tavsiya qil: shu oynaning pastidagi',
  '«Yoʻlni boshlash» havolasi (rus tilida — «Начать путь»); u yerda tovar va raqamlar Uzum bazasidan hisoblanadi.',
  'Roʻyxatda yoʻq tovarni oʻzingdan taklif qilma.',
  '- Bilmasang — ochiq ayt va umumiy maslahat ber. Toʻqima.',
  '',
  'USLUB: «siz» bilan, sodda; 2–6 jumla, kerak boʻlsa 2 qisqa xatboshi. Odam qaysi tilda va yozuvda yozgan boʻlsa (oʻzbek',
  'lotin, oʻzbek kirill yoki rus) — oʻshanda javob ber.',
  '',
  'QOIDALAR:',
  '- Raqam (narx, foiz, muddat, dona) faqat FAKTLAR, TAYYOR JAVOB, MIJOZ HOLATI yoki odamning oʻz gapidan. Yangi raqam',
  'oʻylab topma, hisoblama; raqamni soʻz bilan ham yozma.',
  '- Foyda yoki sotuv vaʼda qilma; «kafolat» («кафолат», «гарантия») soʻzi yoʻq.',
  '- Savdoga aloqasiz savolga bir jumlada muloyim javob berib, nima bilan yordam bera olishingni ayt.',
  '- «AI», «model», «sunʼiy intellekt», «tizim» soʻzlari yoʻq; «robotmisiz?» — «ZumSavdo dasturining yordamchisiman, odam emasman».',
  '- Markdown, sarlavha, yulduzcha, roʻyxat belgisi yoʻq. Faqat javob matni.',
  SAYT_NOMLARI,
].join('\n');

/** AI soʻrovi matni. */
export function sahifaSoroviMatni(k: SahifaSorovi): string {
  return [
    `FAKTLAR:\n${k.bilim}`,
    `\nSAHIFA: ${SAHIFA_TAVSIFI[k.sahifa]}`,
    k.holat ? `\nMIJOZ HOLATI (u yordamchi suhbatida shu yerda):\n${k.holat}` : null,
    k.tarix.length
      ? `\nOLDINGI SAVOL-JAVOBLAR:\n${k.tarix.map((x) => `${x.rol === 'mijoz' ? 'Odam' : 'Yordamchi'}: ${x.matn}`).join('\n')}`
      : null,
    k.tayyor ? `\nTAYYOR JAVOB (maʼnosi va raqamlarini saqla, oʻz soʻzing bilan ayt): ${k.tayyor}` : null,
    k.til === 'ru' ? '\nJAVOB TILI: rus tili — butun javob faqat rus tilida.' : null,
    k.til === 'uz-kirill' ? '\nJAVOB TILI: oʻzbek tili, KIRILL yozuvida.' : null,
    k.tuzat ? `OLDINGI JAVOBING QAYTARILDI: ${k.tuzat} Shusiz qayta yoz.` : null,
    `\nODAM YOZDI: ${k.savol}`,
  ].filter(Boolean).join('\n');
}

/** Savol uzunligi chegarasi. */
export const SAHIFA_SAVOL_MAX = 500;
/** Yordamchi javobi uzunligi chegarasi — undan uzun boʻlsa qisqaroq soʻraladi. */
const SAHIFA_JAVOB_MAX = 1_600;
/** AI chaqiruviga vaqt. */
const SAHIFA_AI_MS = 25_000;

/** Brauzerdan kelgan tarix — tekshirib, oxirgi 6 tasi, har biri 500 belgigacha. */
export function sahifaTarixi(x: unknown): SahifaXabari[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter((y): y is SahifaXabari => !!y && typeof y === 'object'
      && ((y as SahifaXabari).rol === 'mijoz' || (y as SahifaXabari).rol === 'yordamchi')
      && typeof (y as SahifaXabari).matn === 'string')
    .slice(-6)
    .map((y) => ({ rol: y.rol, matn: y.matn.slice(0, SAHIFA_SAVOL_MAX) }));
}

/**
 * Bitta savolga javob. AI boʻlsa — darvoza bilan (bir marta qayta); boʻlmasa yoki
 * oʻtmasa — bazadagi javob yoki umumiy gap. Hech qachon otmaydi.
 */
export async function sahifaJavobi(
  d: SahifaBogliqliklari,
  k: { savol: string; sahifa: Sahifa; tarix: SahifaXabari[]; holat: string | null; til?: 'uz' | 'ru' },
): Promise<SahifaJavobi> {
  const savol = k.savol.trim().slice(0, SAHIFA_SAVOL_MAX);
  const t = tushunishUchun(savol);
  const ruscha = ruschami(savol);
  const tj = tayyorJavob(t, d.tarifCheklovi);
  const baza = tj ? (ruscha ? tj.ru : tj.uz) : bilimJavobi(t, '', null);
  // Til — yozgan gapidan; aniq boʻlmasa (raqam, belgi) — sahifa tilidan.
  const yozuv = yozuvi(savol);
  const til: Yozuv = yozuv !== 'uz' ? yozuv : k.til === 'ru' && !/\p{Script=Latin}/u.test(savol) ? 'ru' : 'uz';
  if (d.ai) {
    const bilim = yordamchiBilimi(t, d.tarifCheklovi);
    const manba = {
      matnlar: [savol, bilim, baza ?? '', k.holat ?? '', SAHIFA_TAVSIFI[k.sahifa], ...k.tarix.map((x) => x.matn)],
      sonlar: [],
    };
    let tuzat: string | null = null;
    for (let urinish = 0; urinish < 2; urinish++) {
      const taklif: string | null = (await d.ai({
        savol, sahifa: k.sahifa, tarix: k.tarix, holat: k.holat, bilim, tayyor: baza, til, tuzat,
      }, SAHIFA_AI_MS).catch(() => null))?.trim() || null;
      if (!taklif) break;
      const tk = tekshir(taklif, manba);
      const tilMos: boolean = til === 'uz' || kirillUlushi(taklif) >= 0.5;
      const qisqa: boolean = taklif.length <= SAHIFA_JAVOB_MAX;
      if (tk.ok && tilMos && qisqa) return { matn: taklif, manba: 'ai' };
      tuzat = [
        tk.dalilsiz.length ? `bu raqamlar faktlarda yoʻq: ${tk.dalilsiz.join(', ')}.` : null,
        tk.taqiq.length ? `taqiqlangan gap: ${tk.taqiq.join(', ')}.` : null,
        tilMos ? null : til === 'ru' ? 'javob rus tilida emas — rus tilida yoz.' : 'javob kirill yozuvida emas — oʻzbek kirillda yoz.',
        qisqa ? null : 'juda uzun — qisqaroq yoz.',
      ].filter(Boolean).join(' ');
    }
  }
  if (baza) return { matn: baza, manba: 'baza' };
  return {
    manba: 'shablon',
    matn: til === 'ru'
      ? 'На этот вопрос сейчас точно не отвечу. Нажмите «Начать путь» внизу — в чате помощника пройдём путь по шагам, и там я подробно подскажу.'
      : 'Bu savolga hozir aniq javob bera olmayman. Pastdagi «Yoʻlni boshlash» ni bosing — yordamchi suhbatida yoʻlni qadamma-qadam '
        + 'oʻtamiz, u yerda batafsil yordam beraman.',
  };
}
