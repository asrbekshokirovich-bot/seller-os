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
 * `claude-opus-5-5`). Opus 5.5 da fikrlash oʻchmaydi — chuqurligi `effort`
 * (`LlmChaqiruvi.kuch`): chat javobi tez va arzon boʻlsin — `low`, kartochka matni — `medium`.
 * Rad etilsa (`refusal`) — server tomonda `fallbacks: 'default'` uni boshqa
 * modelda qayta bajaradi; baribir rad boʻlsa — `null` (kod javobi ketadi).
 * Tizim koʻrsatmasi har chaqiruvda bir xil — keshlanadi (`cache_control`).
 *
 * Har yiqilish `null` va bu XATO EMAS: kalit yoʻq, tarmoq yoʻq, limit
 * tugagan — oqim toʻxtamaydi. Logda — faqat sababi (kalit ham, matn ham emas).
 */

import Anthropic from '@anthropic-ai/sdk';
import type { LlmChaqiruvi, LlmProvayder } from './llm.js';

export const CLAUDE_MODELI = 'claude-opus-5-5';

export interface ClaudeSozlama {
  kalit: string | null | undefined;
  /** `CLAUDE_MODEL` env; boʻsh boʻlsa — `CLAUDE_MODELI`. */
  model?: string | null | undefined;
  /** Testlar uchun — soxta tarmoq. */
  fetchFn?: typeof fetch;
}

/** Anthropic kaliti: `sk-ant-` va harf, raqam, `_`, `-`. */
const KALIT_SHAKLI = /sk-ant-[A-Za-z0-9_-]+/;

/**
 * Sirdan faqat kalitning oʻzi (jonli, 2026-10-19: sirga butun buyruq qoʻyilgan edi —
 * `curl https://api.anthropic.com/… --header "x-api-key: sk-ant-…"`; SDK uni sarlavhaga
 * qoʻydi va soʻrov `TypeError` bilan yiqildi). Matn ichida kalit boʻlsa — oʻsha;
 * boʻlmasa, ichida boʻsh joy boʻlsa — kalit emas (`null`); aks holda — matnning oʻzi.
 */
export function kalitniAjrat(xom: string | null | undefined): string | null {
  const t = String(xom ?? '').trim();
  if (!t) return null;
  const k = KALIT_SHAKLI.exec(t);
  if (k) return k[0];
  return /\s/.test(t) ? null : t;
}

/**
 * Logga ketadigan matndan sirlarni olib tashlaydi. Jonli (2026-10-19): `fetch` ning
 * TypeError matni notoʻgʻri sarlavha QIYMATINI — kalitni — oʻz ichiga olgan edi va u
 * logga tushdi. Endi har qanday xato matni shundan oʻtadi.
 */
export function sirsiz(matn: string): string {
  return matn
    .replace(new RegExp(KALIT_SHAKLI.source, 'g'), 'sk-ant-***')
    .replace(/(x-api-key|authorization)["'\s:=]+[^\s"',]+/gi, '$1: ***');
}

/** Kalit boʻlmasa — `null`: provayder yoʻq (Gemini yoki kod javobi ishlaydi). */
export function claudeProvayderi(s: ClaudeSozlama): LlmProvayder | null {
  const kalit = kalitniAjrat(s.kalit);
  if (!kalit) {
    // Sir bor-u, ichida kalit topilmadi — sababi logda (qiymati emas).
    if (s.kalit?.trim()) console.warn('llm: ANTHROPIC_API_KEY ichida kalit topilmadi — faqat sk-ant-… qiymatini qoʻying');
    return null;
  }
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
        // Chat — `low` (tez); kartochka matni — `medium` (`c.kuch`). JSON kerak boʻlsa — sxema bilan.
        output_config: {
          effort: c.kuch ?? 'low',
          ...(c.json ? { format: { type: 'json_schema' as const, schema: c.json } } : {}),
        },
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
      // Sababi logda — faqat `sirsiz` dan oʻtgan matn (kalit hech qachon logga tushmasin), qisqa;
      // stek yozilmaydi (unda ham xato matni takrorlanadi).
      if (e instanceof Anthropic.APIError) {
        console.warn(`llm ${c.belgi} (${model}): HTTP ${e.status ?? '?'} ${sirsiz(String(e.message)).slice(0, 160)}`);
      } else {
        const x = e as Error | undefined;
        console.warn(`llm ${c.belgi} (${model}): ${x?.name ?? 'xato'}: ${sirsiz(String(x?.message ?? '')).slice(0, 160)}`);
      }
      return null;
    } finally {
      clearTimeout(soat);
    }
  };
}
