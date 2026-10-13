/**
 * LLM adapteri — ikki ish: kod jumlasini odamdek aytish va erkin savolga javob.
 *
 * LLM hisob qilmaydi, ball qoʻymaydi, savol tartibini tanlamaydi (QOIDALAR.md,
 * 3-boʻlim). (1) `odamlashtir`: kod yozgan oʻzbekcha jumlani maʼnosini va
 * raqamlarini oʻzgartirmasdan, iliq va qisqa qilib qayta aytadi. (2)
 * `erkinJavobBer`: mijoz savol bersa yoki tushunmasa — faktlar, mijoz holati
 * va suhbat bilan aniq javob va umumiy maslahat beradi (nazoratchi qarori,
 * 2026-10-13). Ikkalasining natijasi ham `tekshiruv.ts` darvozasidan oʻtadi:
 * manbasiz raqam yoki kafolat boʻlsa — tashlanadi.
 *
 * Shuning uchun bu fayl juda kichik va provayderga bog'lanmagan:
 * `fetch` bor joyda (Node, Deno) ishlaydi. Kalit `env` dan keladi,
 * kodda hech qachon turmaydi.
 *
 * Provayder: Gemini (bepul daraja, function calling shart emas — biz
 * asbob chaqirmaymiz). Model nomi env dan (`LLM_MODEL`); bo'lmasa `gemini-3.8-flash`.
 *
 * 2.5 → 3.5 (2026-10-06): yangi kalit bilan `gemini-2.5-flash` 404 qaytardi —
 * "no longer available to new users"; Google yangi loyihalarga 3.5/3.8 ni
 * beradi. Gemini 3.x da harorat (temperature) oʻzgartirilmaydi — rasmiy
 * tavsiya: standart qiymat; "oʻylash" `thinkingLevel` bilan beriladi.
 *
 * 3.5 → 3.8 (2026-10-14): rasmiy modellar roʻyxatida `gemini-3.5-flash` yoʻq
 * (faqat `gemini-3.5-flash-lite`); yangi loyihalarga «3.5 Flash-Lite yoki 3.8
 * Flash» tavsiya qilinadi. Eski nom har soʻrovga 429 RESOURCE_EXHAUSTED
 * qaytarardi (jonli jurnal, 40 savol sinovi) — AI umuman javob bermasdi.
 * Bepul limit har model uchun alohida; `gemini-3.8-flash` — barqaror, eng yangi.
 *
 * ZAXIRA MODEL (2026-10-14): bepul darajada `gemini-3.8-flash` koʻp soʻrovga
 * 503 "high demand" qaytardi (5 savoldan 4 tasi javobsiz qoldi). 503 yoki 429
 * kelsa yoki asosiy model vaqtning 70 % ida ulgurmasa — oʻsha vaqt chegarasi
 * ichida BIR MARTA zaxira model bilan qayta soʻraladi (`LLM_ZAXIRA_MODEL`;
 * boʻlmasa `gemini-3.5-flash-lite` — rasmiy roʻyxatda bor, limiti alohida,
 * tezroq). Boshqa xatoda (kalit, 404) qayta soʻralmaydi.
 *
 * Har yiqilish `null` qaytaradi va bu XATO EMAS: kalit yo'q, tarmoq
 * yo'q, model 429 dedi — hammasida oqim to'xtamaydi.
 */

import type { KartochkaMatni } from './kartochka-matn.js';

export interface LlmSozlama {
  kalit: string | null | undefined;
  model?: string | null | undefined;
  /** 503/429 da bir marta shu model bilan qayta soʻraladi. Berilmasa — `ZAXIRA_MODEL`; boʻsh satr — zaxirasiz. */
  zaxiraModel?: string | null | undefined;
  /** Bir chaqiruv uchun chegara, ms. Edge Function vaqt chegarasi bor. */
  vaqtMs?: number;
  fetchFn?: typeof fetch;
}

const KORSATMA =
  'Sen ZumSavdo yordamchisisan. Quyida KOD yozgan o\'zbekcha jumla bor. Uni odamdek, ' +
  'iliq va qisqa qilib qayta ayt. QOIDALAR: ma\'nosini o\'zgartirma; birorta raqam ' +
  'QO\'SHMA va olib tashlama; kafolat, va\'da, bashorat yozma; "AI", "model", "tizim" ' +
  'so\'zlarini ishlatma; salomlashishni takrorlama; sodda, kundalik so\'zlashuv tilida yoz — ' +
  'kitobiy so\'z ishlatma; faqat jumlaning o\'zini qaytar, izohsiz. Jumla allaqachon sodda va ' +
  'tushunarli bo\'lsa — o\'zini qaytar.';

/**
 * Erkin xabar: obunachi savolga javob oʻrniga savol berdi, tushunmadi yoki
 * maslahat soʻradi. Javob `tekshiruv.ts` darvozasidan oʻtadi — oʻtmasa bir
 * marta qayta soʻraladi, keyin kod shabloni ketadi (`suhbat.ts`, `erkinJavob`).
 *
 * MASLAHAT BERADI (nazoratchi qarori, 2026-10-13; QOIDALAR.md, 3-boʻlim):
 * birinchi marta kirgan mijoz har savoliga aniq javob va sodda yoʻl olishi
 * kerak. Ilgari "tovar, yoʻnalish, narx, miqdorni tavsiya qilma" deyilgan
 * edi — "80 mln bilan boshlaymi yoki 100 mi?" kabi savol javobsiz qolardi.
 * Endi umumiy, ehtiyotkor maslahat beradi; raqamni esa faqat faktlar,
 * mijoz holati va suhbatdan oladi (darvoza buni tekshiradi), foyda vaʼda
 * qilmaydi, qaror mijozda qoladi.
 *
 * FEʼL-ATVOR (nazoratchi tanlovi, 2026-10-13 kechqurun, koʻrgazma sahifasidan
 * keyin): doʻstona ohang; javob HAR DOIM batafsil; soʻralmasa ham maslahat
 * va ogohlantirish beradi; mijoz qaysi tilda va yozuvda yozsa (oʻzbek lotin,
 * oʻzbek kirill, rus) — oʻshanda javob; aniq bilmasa — ochiq aytib, raqamsiz
 * umumiy maslahat beradi. Bazaviy javob (`tayyor`) berilsa — maʼnosi va
 * raqamlari saqlanadi, faqat oʻz soʻzi bilan batafsilroq aytiladi.
 */
export const ERKIN_KORSATMA = [
  'Sen «ZumSavdo yordamchisi»san: Uzumda birinchi marta sotuvchi boʻlayotgan odamga yoʻl koʻrsatasan — nima sotishni',
  'tanlashdan tortib Xitoydan olib kelish va Uzumda sotishgacha. Odam chatda bitta savolga javob berishi kerak edi,',
  'lekin oʻrniga savol berdi, tushunmadi yoki maslahat soʻradi.',
  '',
  'USLUB:',
  '- Doʻstona: iliq va samimiy, tajribali doʻst kabi; odamga «siz» deb murojaat qil; qoʻllab-quvvatla («xavotir olmang»,',
  '«birga hisoblaymiz»).',
  '- Batafsil: 4–8 jumla, 2–3 qisqa xatboshi (xatboshilar orasida boʻsh qator). Nima uchunligini ham tushuntir, kerak',
  'boʻlsa oddiy misol keltir. Atama ishlatsang — oddiy soʻz bilan tushuntir. Faqat salom yoki rahmatga — qisqa javob.',
  '- Til: odam qaysi tilda va qaysi yozuvda yozgan boʻlsa (oʻzbek lotin, oʻzbek kirill yoki rus) — butun javobni oʻsha',
  'tilda va oʻsha yozuvda yoz.',
  '',
  'VAZIFA:',
  '1. Savolga ANIQ javob ber — aynan shu odamga: MIJOZ HOLATI va SUHBATdan foydalan. TAYYOR JAVOB berilgan boʻlsa — uning',
  'maʼnosi va raqamlarini saqla, oʻz soʻzing bilan batafsilroq ayt.',
  '2. Maslahat soʻrasa — maslahat ber: umumiy va ehtiyotkor (masalan: zaxira qoldirish, kichik partiyadan boshlash,',
  'tushunadigan sohani tanlash). Variantlarni solishtir, lekin yakuniy qarorni odamga qoldir.',
  '3. Oʻzing ham maslahat ber: FAKTLAR yoki MIJOZ HOLATIda shu odamga tegishli xavf yoki foydali gap boʻlsa (brend,',
  'sertifikat, kuchli raqobat, hamma pulni bir joyga tikish) — soʻramasa ham bitta qisqa ogohlantirish yoki maslahat qoʻsh.',
  '4. Yoʻnalish yoki tovar haqida soʻrasa — MIJOZ HOLATIdagi kartalar va ularning bahosiga tayan; roʻyxatda yoʻq',
  'tovarni oʻzingdan taklif qilma — pastga tovar nomini yozib qidirish mumkinligini ayt.',
  '5. Aniq javobni bilmasang — buni ochiq ayt («aniq bilmayman»), keyin raqamsiz umumiy maslahat ber. Toʻqima.',
  '6. Oxirida joriy savolni bir jumlada eslat (tugmalar pastda turibdi).',
  '',
  'QOIDALAR:',
  '- Raqam (summa, foiz, muddat, dona) faqat FAKTLAR, TAYYOR JAVOB, MIJOZ HOLATI, SUHBAT yoki odamning oʻz xabaridan.',
  'Yangi raqam oʻylab topma va hisoblab chiqarma (ayirma ham, foiz ham); raqamni soʻz bilan ham yozma. Kerakli raqam',
  'yoʻq boʻlsa — "buni keyingi qadamda aniq hisoblaymiz" de.',
  '- Foyda, sotuv yoki daromad vaʼda qilma; "kafolat" («кафолат», «гарантия») soʻzini ishlatma.',
  '- Savdoga aloqasiz savolga bir-ikki jumlada muloyim javob berib, savolga qaytar.',
  '- "AI", "model", "sunʼiy intellekt", "tizim" soʻzlarini ishlatma. Lekin odam «siz odammisiz/robotmisiz?» desa —',
  'rostini ayt: «Men ZumSavdo dasturining yordamchisiman, odam emasman».',
  '- Salom bilan boshlama (odam salom bersa — qisqa alik ol).',
  '- Faqat javob matnini qaytar: markdown, sarlavha, yulduzcha, roʻyxat belgisi yoʻq.',
].join('\n');

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

export const ASOSIY_MODEL = 'gemini-3.8-flash';
/** Asosiy model band (503) yoki limiti tugagan (429) boʻlsa — shu bilan bir marta qayta. */
export const ZAXIRA_MODEL = 'gemini-3.5-flash-lite';

/**
 * Model qoʻllaydigan fikr darajasi. Rasmiy jadval (ai.google.dev/gemini-api/docs/thinking,
 * 2026-10-14): `gemini-3.8-flash` — faqat low/medium/high, `minimal` YOʻQ; Flash-Lite,
 * 3.6 Flash va 3 Flash preview — minimal ham. Notanish modelga `minimal` oʻrniga `low`.
 */
function fikrDarajasi(model: string, fikr: 'minimal' | 'low'): 'minimal' | 'low' {
  return fikr === 'minimal' && !/flash-lite|^gemini-3\.6-flash|^gemini-3-flash/.test(model) ? 'low' : fikr;
}

/**
 * Gemini — bitta chaqiruv (503/429 da — zaxira model bilan yana bir marta, oʻsha
 * vaqt chegarasi ichida). Yiqilsa `null` va logda faqat sababi (kalit ham, matn
 * ham emas). `json` — javob JSON boʻlsin.
 */
async function gemini(
  s: LlmSozlama, korsatma: string, matn: string, belgi: string, fikr: 'minimal' | 'low', json = false,
): Promise<string | null> {
  // Sirni nusxalashda qolgan boʻsh joy/yangi qator kalitni buzmasin.
  const kalit = s.kalit?.trim();
  if (!kalit || !matn.trim()) return null;
  const model = s.model?.trim() || ASOSIY_MODEL;
  const zaxira = s.zaxiraModel === undefined || s.zaxiraModel === null ? ZAXIRA_MODEL : s.zaxiraModel.trim();
  const zaxiraBor = Boolean(zaxira) && zaxira !== model;
  const jami = s.vaqtMs ?? 8_000;
  // Zaxira bor boʻlsa asosiy modelga vaqtning 70 % i: bepul darajada u 25 s ga ham ulgurmagan
  // holatlar bor (jonli oʻlchov, 2026-10-14: 5 urinishdan 3 tasi AbortError) — qolgan vaqtda zaxira.
  const boshi = Date.now();
  const birinchi = await vaqtBilan(zaxiraBor ? Math.round(jami * 0.7) : jami,
    (signal) => geminiSorov(s, kalit, model, korsatma, matn, belgi, fikr, json, signal));
  if (typeof birinchi === 'string' || birinchi === null) return birinchi;
  const qoldi = jami - (Date.now() - boshi);
  if (!zaxiraBor || qoldi < jami * 0.1) return null;
  console.warn(`llm ${belgi}: ${model} ${birinchi.status ? `HTTP ${birinchi.status}` : 'vaqt tugadi'} — zaxira ${zaxira}`);
  const ikkinchi = await vaqtBilan(qoldi, (signal) => geminiSorov(s, kalit, zaxira, korsatma, matn, belgi, fikr, json, signal));
  return typeof ikkinchi === 'string' ? ikkinchi : null;
}

/** `ish` ni `ms` gacha kutadi: tugasa — uning `signal` i bekor qilinadi (soʻrov uziladi). */
async function vaqtBilan<T>(ms: number, ish: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const nazorat = new AbortController();
  const t = setTimeout(() => nazorat.abort(), ms);
  try {
    return await ish(nazorat.signal);
  } finally {
    clearTimeout(t);
  }
}

/**
 * Bitta HTTP soʻrov. Matn — javob; `null` — yiqildi (qayta soʻralmaydi);
 * `{status}` — 503/429 (model band yoki limiti tugagan) yoki `0` — vaqt tugadi:
 * zaxira bilan soʻrash mumkin.
 */
async function geminiSorov(
  s: LlmSozlama, kalit: string, model: string, korsatma: string, matn: string, belgi: string,
  fikr: 'minimal' | 'low', json: boolean, signal: AbortSignal,
): Promise<string | null | { status: number }> {
  const f = s.fetchFn ?? fetch;
  try {
    const r = await f(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': kalit },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: korsatma }] },
          contents: [{ role: 'user', parts: [{ text: matn }] }],
          // Ichki fikr tokenlari ham `maxOutputTokens` ga kiradi — chegara kichik
          // boʻlsa javob matni boʻsh qoladi. Fikr darajasi: qayta aytish —
          // `minimal` (tez; model qoʻllamasa `low`), erkin javob — `low`. 2.x modellar
          // `thinkingLevel` ni bilmaydi (rad etadi) — ularga yuborilmaydi.
          generationConfig: {
            maxOutputTokens: 2048,
            ...(json ? { responseMimeType: 'application/json' } : {}),
            ...(/^gemini-[12]\./.test(model) ? {} : { thinkingConfig: { thinkingLevel: fikrDarajasi(model, fikr) } }),
          },
        }),
        signal,
      },
    );
    if (!r.ok) {
      // Sababi logda (masalan "API key not valid", "model not found") — Gemini xato
      // matnida kalit qaytmaydi; shunday boʻlsa ham 160 belgidan oshmaydi.
      const x = (await r.json().catch(() => null)) as { error?: { status?: string; message?: string } } | null;
      console.warn(`llm ${belgi} (${model}): HTTP ${r.status} ${x?.error?.status ?? ''} ${String(x?.error?.message ?? '').slice(0, 160)}`);
      return r.status === 503 || r.status === 429 ? { status: r.status } : null;
    }
    const j = (await r.json()) as {
      candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
    };
    const chiqdi = (j.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '').join('').trim();
    if (!chiqdi) console.warn(`llm ${belgi}: boʻsh javob (${j.candidates?.[0]?.finishReason ?? 'nomzod yoʻq'})`);
    return chiqdi || null;
  } catch (e) {
    const nomi = (e as Error)?.name ?? 'xato';
    console.warn(`llm ${belgi} (${model}): ${nomi}`);
    return nomi === 'AbortError' ? { status: 0 } : null;
  }
}

/**
 * Jumlani qayta aytadi. `null` — ishlamadi, kod jumlasini ishlating.
 */
export async function odamlashtir(s: LlmSozlama, matn: string): Promise<string | null> {
  return gemini(s, KORSATMA, matn, 'odamlashtir', 'minimal');
}

/** Erkin xabarga javob. `null` — ishlamadi, kod shablonini ishlating. */
export async function erkinJavobBer(
  s: LlmSozlama,
  k: {
    savol: string; variantlar: string[]; xabar: string; sabab: string | null; tayyor: string | null; bilim: string;
    /** Mijoz holati (qadam, pul, qiziqish, ekrandagi kartalar) — shaxsiy maʼlumotsiz. */
    holat?: string;
    /** Oxirgi xabarlar — shaxsiy maʼlumotsiz. */
    tarix?: string;
    /** Oldingi urinish darvozadan oʻtmagan boʻlsa — nima uchun (qayta yozish uchun). */
    tuzat?: string | null;
  },
): Promise<string | null> {
  const matn = [
    'FAKTLAR:',
    k.bilim,
    k.holat ? `\nMIJOZ HOLATI:\n${k.holat}` : null,
    k.tarix ? `\nSUHBAT (oxirgi xabarlar):\n${k.tarix}` : null,
    `\nJORIY SAVOL: ${k.savol}`,
    `TUGMALAR: ${k.variantlar.length ? k.variantlar.join('; ') : 'yoʻq (odam oʻzi yozadi)'}`,
    k.sabab ? `ODAMNING JAVOBI QABUL QILINMADI: ${k.sabab}` : null,
    k.tayyor ? `TAYYOR JAVOB (maʼnosi va raqamlarini saqlab, oʻz soʻzing bilan batafsil ayt): ${k.tayyor}` : null,
    k.tuzat ? `OLDINGI JAVOBING QAYTARILDI: ${k.tuzat} Shusiz qayta yoz.` : null,
    `ODAM YOZDI: ${k.xabar}`,
  ].filter(Boolean).join('\n');
  // Bilim va holat bilan batafsil javob uzunroq oʻylanadi — chegara 25 soniya. 14 s da bepul
  // darajadagi `gemini-3.8-flash` ikki marta javobga ulgurmadi (jonli jurnal, 2026-10-14: AbortError).
  return gemini({ ...s, vaqtMs: s.vaqtMs ?? 25_000 }, ERKIN_KORSATMA, matn, 'erkin', 'low');
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
  const javob = await gemini({ ...s, vaqtMs: s.vaqtMs ?? 30_000 }, KARTOCHKA_KORSATMA, matn, 'kartochka', 'low', true);
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
