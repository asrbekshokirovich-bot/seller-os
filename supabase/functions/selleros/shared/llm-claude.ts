/**
 * CLAUDE (Anthropic) — LLM provayderi.
 *
 * Nazoratchi (2026-10-19): "menda Anthropic API kaliti bor — shuni ZumSavdo ga
 * ulaymiz, Gemini ga muhtoj boʻlmaymiz" (2026-10-28 dan Gemini butunlay olib tashlandi). `llm.ts` dagi koʻrsatmalar, darvoza
 * (`tekshiruv.ts`) va kod shablonlari oʻzgarmaydi — bu fayl faqat BITTA
 * chaqiruvni rasmiy Anthropic SDK bilan bajaradi (`LlmProvayder`).
 *
 * `index.ts` dan EKSPORT QILINMAYDI: sayt (`apps/web`) shared paketni brauzerga
 * ham oladi — SDK u yerga tushmasin. Uni faqat serverlar (Edge, Fastify)
 * toʻgʻridan-toʻgʻri import qiladi; Edge nusxasida `npm:` bilan
 * (`supabase/functions/tayyorlash.mjs`).
 *
 * Sozlama: kalit — `ANTHROPIC_API_KEY`, model — `CLAUDE_MODEL` (boʻlmasa
 * `claude-sonnet-5-5`). Fikrlash moslashuvchan (`thinking` yuborilmaydi) — chuqurligi `effort`
 * (`LlmChaqiruvi.kuch`): chat javobi tez va arzon boʻlsin — `low` (oddiy gapda oʻylamay
 * yozadi), kartochka matni — `medium`.
 * Rad etilsa (`refusal`) — server tomonda `fallbacks: 'default'` uni boshqa
 * modelda qayta bajaradi; baribir rad boʻlsa — `null` (kod javobi ketadi).
 * Tizim koʻrsatmasi har chaqiruvda bir xil — keshlanadi (`cache_control`).
 *
 * OPUS 5.5 → SONNET 5.5 (nazoratchi, 2026-10-20: «tezroq va arzonroq»): Sonnet 5.5 —
 * $2/$10 (Opus 5.5 dan arzon), chat va matn yozishda tezroq; soʻrov shakli oʻsha (effort,
 * JSON sxema, `fallbacks: 'default'`). Opus kerak boʻlsa — `CLAUDE_MODEL=claude-opus-5-5`.
 *
 * TUSHUNISH — HAIKU 5.5 (2026-10-26, nazoratchi: «AI hamma joyda», taklif 2 va 4 — tezroq,
 * arzonroq): mijoz gapidan javoblarni ajratish (JSON) — `CLAUDE_TUSHUN_MODELI`, Sonnet dan bir
 * necha baravar tez va 20 baravar arzon; yozish Sonnet 5.5 da qoladi. `CLAUDE_TUSHUN_MODEL`
 * bilan almashadi. Haiku 5.5 da server zaxirasi yoʻq — unga `fallbacks` yuborilmaydi.
 *
 * OQIM (2026-10-20, «matn yozilgan sari chiqib borsin»): `c.qism` berilsa — javob
 * `messages.stream` bilan keladi va har boʻlakda shu paytgacha yozilgan matn `qism` ga
 * beriladi. Oxirida — xuddi oqimsizdagi kabi tekshiriladi (rad, chegara). Rad etilib boshqa
 * modelga oʻtilsa (`fallback` bloki) — qoralama boshidan: oldingi model yozgani tashlanadi.
 *
 * Har yiqilish `null` va bu XATO EMAS: kalit yoʻq, tarmoq yoʻq, limit
 * tugagan — oqim toʻxtamaydi. Logda — faqat sababi (kalit ham, matn ham emas).
 *
 * SARF (2026-10-22, nazoratchi: «AI xarajatini tuzat»): har javobdan keyin tokenlar va
 * taxminiy narx `c.sarf` ga beriladi (`ai_usage`, 0072) — rad etilgani va kesilgani ham, ular
 * ham pul turadi. Narx — roʻyxat narxi boʻyicha (`NARXLAR`); aniq hisob — Anthropic Console →
 * Usage. Vaqt tugab uzilgan soʻrovning sarfi kelmaydi — u yozilmaydi (kam uchraydi).
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.133.0';
import type { LlmChaqiruvi, LlmProvayder, LlmSarfi } from './llm.ts';

export const CLAUDE_MODELI = 'claude-sonnet-5-5';
/** Tushunish (AI suhbat, JSON) uchun standart model — tez va arzon (2026-10-26). */
export const CLAUDE_TUSHUN_MODELI = 'claude-haiku-5-5';

/**
 * Roʻyxat narxi, $ / 1 mln token — platform.claude.com/docs/en/about-claude/pricing (oʻqildi
 * 2026-10-22). Kesh yozish — kirish narxining 1,25 baravari (5 daqiqalik kesh — bizning
 * `cache_control`), 1 soatligi — 2 baravari. Opus 5 va Opus 4.8 — rad etilganda zaxira model
 * (`fallbacks: 'default'`) boʻlishi mumkin. Roʻyxatda yoʻq model narxi TAXMIN QILINMAYDI.
 */
const NARXLAR: Readonly<Record<string, { kirish: number; chiqish: number; keshOqish: number }>> = {
  'claude-sonnet-5-5': { kirish: 2, chiqish: 10, keshOqish: 0.1 },
  // Haiku 5.5 — soʻrov 100 ming tokengacha boʻlsa (bizniki ~2 ming); uzunrogʻi $0,50 / $2,50 — bizda yoʻq.
  'claude-haiku-5-5': { kirish: 0.1, chiqish: 0.5, keshOqish: 0.01 },
  'claude-opus-5-5': { kirish: 4, chiqish: 20, keshOqish: 0.2 },
  'claude-opus-5': { kirish: 5, chiqish: 25, keshOqish: 0.5 },
  'claude-opus-4-8': { kirish: 5, chiqish: 25, keshOqish: 0.5 },
};

/**
 * Bitta urinishning taxminiy narxi, $ (6 xonagacha). Model nomi oxiridagi sana (`-20261001`)
 * hisobga olinmaydi. Narxi nomaʼlum model — `null`.
 */
export function claudeNarxi(
  model: string, t: { kirish: number; chiqish: number; keshOqildi: number; keshYozildi: number; kesh1Soat?: number },
): number | null {
  const n = NARXLAR[model.replace(/-\d{8}$/, '')];
  if (!n) return null;
  const soat = Math.min(t.kesh1Soat ?? 0, t.keshYozildi);
  // Token × ($ / 1 mln token) — millionning bir ulushi dollar (mikrodollar).
  const mikro = t.kirish * n.kirish + t.chiqish * n.chiqish + t.keshOqildi * n.keshOqish
    + (t.keshYozildi - soat) * n.kirish * 1.25 + soat * n.kirish * 2;
  return Math.round(mikro) / 1_000_000;
}

/** `usage` va uning `iterations` yozuvidagi tokenlar (SDK `BetaUsage`). */
interface Tokenlar {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_creation?: { ephemeral_1h_input_tokens?: number | null } | null;
}

/**
 * Javob sarfi — har model urinishi alohida. `usage.iterations` boʻlsa — u haqiqat manbai: rad
 * etilib boshqa modelga oʻtilganda yuqori `usage` faqat oxirgi urinishni qamraydi; modeli
 * yozilmagan urinish — soʻralgan model. Boʻlmasa — yuqori `usage` va javob modeli.
 */
function sarflar(
  r: { model: string; usage: Tokenlar & { iterations?: ReadonlyArray<Tokenlar & { model?: string | null }> | null } },
  soralgan: string, belgi: string,
): LlmSarfi[] {
  const urinishlar = r.usage.iterations?.length
    ? r.usage.iterations.map((t) => ({ t, model: t.model || soralgan }))
    : [{ t: r.usage as Tokenlar, model: r.model }];
  return urinishlar.map(({ t, model }) => {
    const tok = {
      kirish: t.input_tokens ?? 0, chiqish: t.output_tokens ?? 0,
      keshOqildi: t.cache_read_input_tokens ?? 0, keshYozildi: t.cache_creation_input_tokens ?? 0,
    };
    const narxUsd = claudeNarxi(model, { ...tok, kesh1Soat: t.cache_creation?.ephemeral_1h_input_tokens ?? 0 });
    if (narxUsd === null) console.warn(`llm ${belgi}: ${model} narxi roʻyxatda yoʻq — sarf narxsiz yoziladi`);
    return { belgi, model, ...tok, narxUsd };
  });
}

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

/**
 * Javob matni — oxirgi `fallback` blokidan keyingi matn bloklari: undan oldingisi rad etgan
 * modelniki (chala, tashlanadi). `fallback` boʻlmasa — hamma matn bloki.
 */
export function javobMatni(bloklar: ReadonlyArray<{ type: string; text?: string }>): string | null {
  const boshi = bloklar.map((b) => b.type).lastIndexOf('fallback') + 1;
  const matn = bloklar.slice(boshi).flatMap((b) => (b.type === 'text' && typeof b.text === 'string' ? [b.text] : [])).join('').trim();
  return matn || null;
}

/** Kalit boʻlmasa — `null`: provayder yoʻq (AI ishlamaydi — kod javobi). */
export function claudeProvayderi(s: ClaudeSozlama): LlmProvayder | null {
  const kalit = kalitniAjrat(s.kalit);
  if (!kalit) {
    // Sir bor-u, ichida kalit topilmadi — sababi logda (qiymati emas).
    if (s.kalit?.trim()) console.warn('llm: ANTHROPIC_API_KEY ichida kalit topilmadi — faqat sk-ant-… qiymatini qoʻying');
    return null;
  }
  const model = s.model?.trim() || CLAUDE_MODELI;
  // Haiku 5.5 da server zaxirasi yoʻq: `fallbacks` u yerda foydasiz (roʻyxat bilan — 400).
  const zaxira = !/^claude-haiku-/.test(model);
  // Bitta qayta urinish (429/5xx, tarmoq) — umumiy vaqt chegarasi ichida (`signal`).
  const mijoz = new Anthropic({ apiKey: kalit, maxRetries: 1, ...(s.fetchFn ? { fetch: s.fetchFn } : {}) });

  return async (c: LlmChaqiruvi): Promise<string | null> => {
    const nazorat = new AbortController();
    const soat = setTimeout(() => nazorat.abort(), c.vaqtMs);
    const sorov = {
      model,
      // Javoblar qisqa; fikrlash ham shu chegaraga kiradi — kartochka JSON i uzunroq.
      max_tokens: c.json ? 8_000 : 4_000,
      system: [{ type: 'text' as const, text: c.korsatma, cache_control: { type: 'ephemeral' as const } }],
      messages: [{ role: 'user' as const, content: c.matn }],
      // Chat — `low` (tez); kartochka matni — `medium` (`c.kuch`). JSON kerak boʻlsa — sxema bilan.
      output_config: {
        effort: c.kuch ?? 'low',
        ...(c.json ? { format: { type: 'json_schema' as const, schema: c.json } } : {}),
      },
      ...(zaxira ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    };
    const sozlama = { signal: nazorat.signal, timeout: c.vaqtMs };
    try {
      let r: Anthropic.Beta.Messages.BetaMessage;
      if (c.qism) {
        const qism = c.qism;
        const oqim = mijoz.beta.messages.stream(sorov, sozlama);
        let yozildi = '';
        for await (const h of oqim) {
          if (h.type === 'content_block_start' && h.content_block.type === 'fallback') {
            // Rad etildi — keyingi model boshidan yozadi: qoralama ham boshidan.
            yozildi = '';
            qism('');
          } else if (h.type === 'content_block_delta' && h.delta.type === 'text_delta' && h.delta.text) {
            yozildi += h.delta.text;
            qism(yozildi);
          }
        }
        r = await oqim.finalMessage();
      } else {
        r = await mijoz.beta.messages.create(sorov, sozlama);
      }
      // Sarf — javob qanday boʻlishidan qatʼi nazar: rad etilgani va kesilgani ham pul turadi.
      // Yozuvdagi xato javobni buzmaydi.
      if (c.sarf) {
        try {
          for (const s of sarflar(r, model, c.belgi)) c.sarf(s);
        } catch (e) {
          console.warn(`llm ${c.belgi}: sarf yozilmadi — ${(e as Error)?.name ?? 'xato'}`);
        }
      }
      // Rad etildi (zaxira modeli ham) yoki chegaraga yetib kesildi — chala javob chiqmaydi.
      if (r.stop_reason === 'refusal' || r.stop_reason === 'max_tokens') {
        console.warn(`llm ${c.belgi} (${r.model}): ${r.stop_reason}`);
        return null;
      }
      return javobMatni(r.content);
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
