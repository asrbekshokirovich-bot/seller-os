/**
 * LLM adapteri — FAQAT jumlani odamdek aytish uchun.
 *
 * Bu mahsulotda LLM tavsiya bermaydi, hisob qilmaydi, savol tartibini
 * tanlamaydi (QOIDALAR.md, 3-bo'lim). Unga bitta ish beriladi: kod
 * yozgan o'zbekcha jumlani ma'nosini va raqamlarini o'zgartirmasdan,
 * iliq va qisqa qilib qayta aytish. Natija `tekshiruv.ts` darvozasidan
 * o'tadi; o'tmasa kodning jumlasi ketadi.
 *
 * Shuning uchun bu fayl juda kichik va provayderga bog'lanmagan:
 * `fetch` bor joyda (Node, Deno) ishlaydi. Kalit `env` dan keladi,
 * kodda hech qachon turmaydi.
 *
 * Provayder: Gemini (bepul daraja, function calling shart emas — biz
 * asbob chaqirmaymiz). Model nomi env dan (`LLM_MODEL`); bo'lmasa `gemini-3.5-flash`.
 *
 * 2.5 → 3.5 (2026-10-06): yangi kalit bilan `gemini-2.5-flash` 404 qaytardi —
 * "no longer available to new users"; Google yangi loyihalarga 3.5/3.8 ni
 * beradi. Gemini 3.x da harorat (temperature) oʻzgartirilmaydi — rasmiy
 * tavsiya: standart qiymat; "oʻylash" `thinkingLevel` bilan beriladi.
 *
 * Har yiqilish `null` qaytaradi va bu XATO EMAS: kalit yo'q, tarmoq
 * yo'q, model 429 dedi — hammasida oqim to'xtamaydi.
 */

export interface LlmSozlama {
  kalit: string | null | undefined;
  model?: string | null | undefined;
  /** Bir chaqiruv uchun chegara, ms. Edge Function vaqt chegarasi bor. */
  vaqtMs?: number;
  fetchFn?: typeof fetch;
}

const KORSATMA =
  'Sen ZumSavdo menejerisan. Quyida KOD yozgan o\'zbekcha jumla bor. Uni odamdek, ' +
  'iliq va qisqa qilib qayta ayt. QOIDALAR: ma\'nosini o\'zgartirma; birorta raqam ' +
  'QO\'SHMA va olib tashlama; kafolat, va\'da, bashorat yozma; "AI", "model", "tizim" ' +
  'so\'zlarini ishlatma; salomlashishni takrorlama; faqat jumlaning o\'zini qaytar, ' +
  'izohsiz. Jumla allaqachon yaxshi bo\'lsa — o\'zini qaytar.';

/**
 * Erkin xabar: obunachi savolga javob oʻrniga boshqa narsa yozdi (savol,
 * salom, notoʻgʻri javob). Javob `tekshiruv.ts` darvozasidan oʻtadi —
 * oʻtmasa kod shabloni ketadi (`suhbat.ts`, `erkinJavob`).
 */
const ERKIN_KORSATMA =
  'Sen ZumSavdo menejerisan: odamga Uzumda birinchi partiyani sotishgacha boʻlgan yoʻlda ' +
  'yordam berasan. Unga savol berilgan, u esa javob oʻrniga boshqa narsa yozdi (savol, salom, ' +
  'shubha yoki notoʻgʻri javob). Qisqa (1–3 jumla), iliq va aniq javob ber, keyin joriy savolni ' +
  'bir jumlada eslat. QOIDALAR: tovar, yoʻnalish, narx, miqdorni TAVSIYA QILMA — buni kod ' +
  'hisoblaydi; matnda berilmagan raqam, foiz, summa yoki muddat YOZMA; kafolat, vaʼda, bashorat ' +
  'yozma; faqat berilgan FAKTLARdan foydalan, "tayyor javob" berilgan boʻlsa — uni oʻz soʻzing bilan ayt; ' +
  'bilmasang yoki mavzudan tashqari boʻlsa — ochiq ayt; "AI", "model", "tizim" soʻzlarini ' +
  'ishlatma; odam qaysi tilda yozgan boʻlsa (oʻzbek yoki rus), oʻsha tilda javob ber; faqat javob ' +
  'matnini qaytar, izohsiz.';

/** Gemini — bitta chaqiruv. Yiqilsa `null` va logda faqat sababi (kalit ham, matn ham emas). */
async function gemini(s: LlmSozlama, korsatma: string, matn: string, belgi: string, fikr: 'minimal' | 'low'): Promise<string | null> {
  // Sirni nusxalashda qolgan boʻsh joy/yangi qator kalitni buzmasin.
  const kalit = s.kalit?.trim();
  if (!kalit || !matn.trim()) return null;
  const model = s.model?.trim() || 'gemini-3.5-flash';
  const f = s.fetchFn ?? fetch;
  const nazorat = new AbortController();
  const t = setTimeout(() => nazorat.abort(), s.vaqtMs ?? 8_000);
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
          // `minimal` (tez), erkin javob — `low`. 2.x modellar `thinkingLevel`
          // ni bilmaydi (rad etadi) — ularga yuborilmaydi.
          generationConfig: {
            maxOutputTokens: 2048,
            ...(/^gemini-[12]\./.test(model) ? {} : { thinkingConfig: { thinkingLevel: fikr } }),
          },
        }),
        signal: nazorat.signal,
      },
    );
    if (!r.ok) {
      // Sababi logda (masalan "API key not valid", "model not found") — Gemini xato
      // matnida kalit qaytmaydi; shunday boʻlsa ham 160 belgidan oshmaydi.
      const x = (await r.json().catch(() => null)) as { error?: { status?: string; message?: string } } | null;
      console.warn(`llm ${belgi}: HTTP ${r.status} ${x?.error?.status ?? ''} ${String(x?.error?.message ?? '').slice(0, 160)}`);
      return null;
    }
    const j = (await r.json()) as {
      candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
    };
    const chiqdi = (j.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '').join('').trim();
    if (!chiqdi) console.warn(`llm ${belgi}: boʻsh javob (${j.candidates?.[0]?.finishReason ?? 'nomzod yoʻq'})`);
    return chiqdi || null;
  } catch (e) {
    console.warn(`llm ${belgi}: ${(e as Error)?.name ?? 'xato'}`);
    return null;
  } finally {
    clearTimeout(t);
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
  k: { savol: string; variantlar: string[]; xabar: string; sabab: string | null; tayyor: string | null; bilim: string },
): Promise<string | null> {
  const matn = [
    `Joriy savol: ${k.savol}`,
    `Variantlar: ${k.variantlar.length ? k.variantlar.join('; ') : 'yoʻq (erkin javob)'}`,
    k.sabab ? `Javob qabul qilinmadi: ${k.sabab}` : null,
    k.tayyor ? `Tayyor javob: ${k.tayyor}` : null,
    k.bilim,
    `Odam yozdi: ${k.xabar}`,
  ].filter(Boolean).join('\n');
  return gemini(s, ERKIN_KORSATMA, matn, 'erkin', 'low');
}
