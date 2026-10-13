/**
 * JAVOB BAHOSI — 👍/👎 (nazoratchi, 2026-10-13: "Ha, boʻlsin").
 *
 * Mijoz yordamchining erkin javobiga (`suhbat.ts`, `{erkin: true, manba}`
 * belgili xabar) baho beradi — qaysi javoblar yomon chiqqanini koʻrib,
 * tuzatib boramiz.
 *
 * MATNGA ISHONILMAYDI. Sahifa baholangan javob matnini yuboradi; server
 * uni mijozning OʻZ suhbatidan qidiradi (`so_suhbat_oqi`). Topilmasa — baho
 * yozilmaydi: begona matnni "baholab" bazaga tiqib boʻlmaydi. Hodisaga matn
 * emas, xabar raqami (`seq`), baho, manba va savol id si yoziladi (`events`,
 * `so_hodisa_yoz`, 0047) — matnning oʻzi suhbat jurnalida allaqachon bor.
 * Mijoz fikrini oʻzgartirsa — yangi hodisa; hisobda shu xabarning oxirgisi.
 */

type Rpc = <T>(nom: string, arg: unknown) => Promise<T | null>;

interface JurnalXabari { seq: number; rol: string; matn: string; savolId?: string | null; javob?: unknown }

/** Javob matni chegarasi — LLM javobi (2048 token) bundan uzun boʻlmaydi. */
const MATN_MAX = 8_000;

/** `POST /baho` — `{matn, baho: 'yaxshi' | 'yomon'}`. Javob: HTTP holat va tana. */
export async function javobniBahola(
  rpc: Rpc, token: string, tana: Record<string, unknown>,
): Promise<{ status: number; tana: Record<string, unknown> }> {
  const baho = tana.baho === 'yaxshi' || tana.baho === 'yomon' ? tana.baho : null;
  const matn = typeof tana.matn === 'string' && tana.matn.length <= MATN_MAX ? tana.matn : null;
  if (baho === null || !matn) return { status: 400, tana: { xato: 'baho yoki javob matni notoʻgʻri' } };

  const o = await rpc<{ xato?: string; xabarlar?: JurnalXabari[] }>('so_suhbat_oqi', { p_token: token });
  if (o === null) return { status: 503, tana: { xato: 'baza javob bermadi' } };
  if (o.xato) return { status: 401, tana: { xato: o.xato } };

  // Oxiridan: bir xil matnli javob ikki marta boʻlsa — eng yangisi.
  const x = [...(o.xabarlar ?? [])].reverse()
    .find((m) => m.rol === 'menejer' && m.matn === matn && (m.javob as { erkin?: unknown } | null)?.erkin === true);
  if (!x) return { status: 404, tana: { xato: 'baholanadigan javob topilmadi' } };

  const manba = (x.javob as { manba?: unknown }).manba;
  const y = await rpc<{ xato?: string }>('so_hodisa_yoz', {
    p_token: token,
    p_nom: 'javob_baho',
    p_props: { seq: x.seq, baho, manba: typeof manba === 'string' ? manba : null, savolId: x.savolId ?? null },
  });
  if (y === null) return { status: 503, tana: { xato: 'baza javob bermadi' } };
  if (y.xato) return { status: 401, tana: { xato: y.xato } };
  return { status: 200, tana: { ok: true } };
}
