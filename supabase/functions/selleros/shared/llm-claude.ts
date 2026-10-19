/**
 * CLAUDE (Anthropic) — LLM provayderi.
 *
 * Nazoratchi (2026-10-19): "menda Anthropic API kaliti bor — shuni ZumSavdo ga
 * ulaymiz, Gemini ga muhtoj boʻlmaymiz". `llm.ts` dagi koʻrsatmalar, darvoza
 * (`tekshiruv.ts`) va kod shablonlari oʻzgarmaydi — bu fayl faqat BITTA
 * chaqiruvni rasmiy Anthropic SDK bilan bajaradi (`LlmProvayder`).
 *
 * `index.ts` dan EKSPORT QILINMAYDI: sayt (`apps/web`) shared paketni brauzerga
 * ham oladi — SDK u yerga tushmasin. Uni faqat serverlar (Edge, Fastify)
 * toʻgʻridan-toʻgʻri import qiladi; Edge nusxasida `npm:` bilan
 * (`supabase/functions/tayyorlash.mjs`).
 *
 * Sozlama: kalit — `ANTHROPIC_API_KEY`, model — `CLAUDE_MODEL` (boʻlmasa
 * `claude-opus-5-5`). Opus 5.5 da fikrlash oʻchmaydi — chuqurligi `effort`:
 * chat javobi tez va arzon boʻlsin — `low`, kartochka matni — `medium`.
 * Rad etilsa (`refusal`) — server tomonda `fallbacks: 'default'` uni boshqa
 * modelda qayta bajaradi; baribir rad boʻlsa — `null` (kod javobi ketadi).
 * Tizim koʻrsatmasi har chaqiruvda bir xil — keshlanadi (`cache_control`).
 *
 * Har yiqilish `null` va bu XATO EMAS: kalit yoʻq, tarmoq yoʻq, limit
 * tugagan — oqim toʻxtamaydi. Logda — faqat sababi (kalit ham, matn ham emas).
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.133.0';
import type { LlmChaqiruvi, LlmProvayder } from './llm.ts';

export const CLAUDE_MODELI = 'claude-opus-5-5';

export interface ClaudeSozlama {
  kalit: string | null | undefined;
  /** `CLAUDE_MODEL` env; boʻsh boʻlsa — `CLAUDE_MODELI`. */
  model?: string | null | undefined;
  /** Testlar uchun — soxta tarmoq. */
  fetchFn?: typeof fetch;
}

/** Kalit boʻlmasa — `null`: provayder yoʻq (Gemini yoki kod javobi ishlaydi). */
export function claudeProvayderi(s: ClaudeSozlama): LlmProvayder | null {
  // Sirni nusxalashda qolgan boʻsh joy/yangi qator kalitni buzmasin.
  const kalit = s.kalit?.trim();
  if (!kalit) return null;
  const model = s.model?.trim() || CLAUDE_MODELI;
  // Bitta qayta urinish (429/5xx, tarmoq) — umumiy vaqt chegarasi ichida (`signal`).
  const mijoz = new Anthropic({ apiKey: kalit, maxRetries: 1, ...(s.fetchFn ? { fetch: s.fetchFn } : {}) });

  return async (c: LlmChaqiruvi): Promise<string | null> => {
    const nazorat = new AbortController();
    const soat = setTimeout(() => nazorat.abort(), c.vaqtMs);
    try {
      const r = await mijoz.beta.messages.create({
        model,
        // Javoblar qisqa; fikrlash ham shu chegaraga kiradi — kartochka JSON i uzunroq.
        max_tokens: c.json ? 8_000 : 4_000,
        system: [{ type: 'text', text: c.korsatma, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: c.matn }],
        output_config: c.json
          ? { effort: 'medium', format: { type: 'json_schema', schema: c.json } }
          : { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      }, { signal: nazorat.signal, timeout: c.vaqtMs });
      // Rad etildi (zaxira modeli ham) yoki chegaraga yetib kesildi — chala javob chiqmaydi.
      // Sarf (token, $) — Anthropic Console → Usage da; bu yerda faqat muammo logga.
      if (r.stop_reason === 'refusal' || r.stop_reason === 'max_tokens') {
        console.warn(`llm ${c.belgi} (${r.model}): ${r.stop_reason}`);
        return null;
      }
      const matn = r.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('').trim();
      return matn || null;
    } catch (e) {
      // Sababi logda (holat kodi va turi) — Anthropic xato matnida kalit qaytmaydi; baribir qisqa.
      if (e instanceof Anthropic.APIError) {
        console.warn(`llm ${c.belgi} (${model}): HTTP ${e.status ?? '?'} ${String(e.message).slice(0, 160)}`);
      } else {
        // Muhit xatosi (jonli, 2026-10-19: Supabase Edge da `TypeError` — matnsiz logdan sababi koʻrinmadi):
        // nomi, matni va ikki stek qatori.
        const x = e as Error | undefined;
        const stek = String(x?.stack ?? '').split('\n').slice(1, 3).map((q) => q.trim()).join(' | ');
        console.warn(`llm ${c.belgi} (${model}): ${x?.name ?? 'xato'}: ${String(x?.message ?? '').slice(0, 200)} @ ${stek.slice(0, 300)}`);
      }
      return null;
    } finally {
      clearTimeout(soat);
    }
  };
}
