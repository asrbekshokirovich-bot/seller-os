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
 * asbob chaqirmaymiz). Model nomi env dan; bo'lmasa `gemini-2.5-flash`.
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
 * Jumlani qayta aytadi. `null` — ishlamadi, kod jumlasini ishlating.
 */
export async function odamlashtir(s: LlmSozlama, matn: string): Promise<string | null> {
  if (!s.kalit || !matn.trim()) return null;
  const model = s.model || 'gemini-2.5-flash';
  const f = s.fetchFn ?? fetch;
  const nazorat = new AbortController();
  const t = setTimeout(() => nazorat.abort(), s.vaqtMs ?? 8_000);
  try {
    const r = await f(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.kalit },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: KORSATMA }] },
          contents: [{ role: 'user', parts: [{ text: matn }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
        }),
        signal: nazorat.signal,
      },
    );
    if (!r.ok) return null;
    const j = (await r.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const chiqdi = (j.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '').join('').trim();
    return chiqdi || null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
