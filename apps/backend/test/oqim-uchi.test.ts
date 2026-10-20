/**
 * `/suhbat` va `/yordamchi` OQIM bilan — Fastify orqali, baza va Claude soxta (2026-10-20,
 * nazoratchi: «matn yozilgan sari chiqib borsin»).
 *
 * NEGA BU TESTLAR BOR. Butun yoʻl bir joyda tekshiriladi: sayt `{oqim: true}` yuboradi →
 * Claude javobi boʻlaklab keladi → AI yozayotgan xabar `qism` hodisasi boʻlib darhol chiqadi →
 * oxirida `tayyor` — oqimsiz javobning AYNAN oʻzi. Sessiya xatosi oqim boʻlmaydi: oddiy JSON
 * va 401 (sayt vositachisi shunda yangi sessiya ochadi).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { keyingi, sseOqi, type YolHolati } from '@selleros/shared';
import { build } from '../src/app.js';

const KALITLAR = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'CLAUDE_MODEL', 'AI_SUHBAT'] as const;
const OLDINGI = new Map<string, string | undefined>();
const HAQIQIY_FETCH = globalThis.fetch;

beforeEach(() => {
  for (const nom of KALITLAR) {
    OLDINGI.set(nom, process.env[nom]);
    delete process.env[nom];
  }
});

afterEach(() => {
  for (const nom of KALITLAR) {
    const eski = OLDINGI.get(nom);
    if (eski === undefined) delete process.env[nom];
    else process.env[nom] = eski;
  }
  globalThis.fetch = HAQIQIY_FETCH;
  vi.restoreAllMocks();
});

/** Tajriba savoli turgan holat: tugma bosilsa keyingisi — qiziqish (kod harakatisiz). */
const TAJRIBA: YolHolati = { javoblar: { ism: 'Aziz', telefon: '+998901234567' }, natijalar: {} };

/** Anthropic oqimi (SSE): matn boʻlaklari bitta matn blokida. */
function claudeOqimi(bolaklar: string[]): Response {
  const h: Array<Record<string, unknown>> = [
    { type: 'message_start', message: {
      id: 'msg_s', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5', content: [], stop_reason: null, stop_sequence: null,
      usage: { input_tokens: 100, output_tokens: 1 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    ...bolaklar.map((text) => ({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } })),
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 30 } },
    { type: 'message_stop' },
  ];
  return new Response(h.map((x) => `event: ${String(x.type)}\ndata: ${JSON.stringify(x)}\n\n`).join(''), {
    status: 200, headers: { 'content-type': 'text/event-stream' },
  });
}

/**
 * Baza va Claude — soxta. `oqi` — `so_suhbat_oqi` javobi; Claude ga ketgan soʻrovlar yoziladi.
 * Claude oqim soʻrasa — boʻlaklab, soʻramasa — bitta JSON.
 */
function soxtalar(oqi: unknown, claudeMatni: string[]) {
  process.env.SUPABASE_URL = 'https://soxta.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'soxta-kalit';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-sinov';
  const claude: Array<Record<string, unknown>> = [];
  const yozildi: unknown[] = [];
  globalThis.fetch = vi.fn(async (url: unknown, sozlama: unknown) => {
    const u = String(url instanceof Request ? url.url : url);
    const tana = JSON.parse(String((sozlama as { body?: string } | undefined)?.body ?? '{}')) as Record<string, unknown>;
    if (u.includes('anthropic.com')) {
      claude.push(tana);
      if (tana.stream === true) return claudeOqimi(claudeMatni);
      return new Response(JSON.stringify({
        id: 'msg_s', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5', stop_reason: 'end_turn', stop_sequence: null,
        content: [{ type: 'text', text: claudeMatni.join('') }], usage: { input_tokens: 100, output_tokens: 30 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const nom = u.split('/rpc/')[1] ?? '';
    const json = (x: unknown) => new Response(JSON.stringify(x), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (nom === 'so_suhbat_oqi') return json(oqi);
    if (nom === 'so_suhbat_yoz') { yozildi.push(tana); return json({ yozildi: (tana.p_xabarlar as unknown[]).length }); }
    return json(null);
  }) as unknown as typeof fetch;
  return { claude, yozildi };
}

async function sora(url: string, payload: Record<string, unknown>, sessiya = 'sessiya-1') {
  const app = build();
  const res = await app.inject({ method: 'POST', url, payload, headers: { 'x-sessiya': sessiya } });
  await app.close();
  return res;
}

async function hodisalar(tana: string): Promise<Array<[string, unknown]>> {
  const h: Array<[string, unknown]> = [];
  await sseOqi(new Response(tana).body!, (nom, q) => h.push([nom, q]));
  return h;
}

const OQI = () => {
  const k = keyingi(TAJRIBA);
  return {
    holat: TAJRIBA, qadam: 1,
    xabarlar: k.tur === 'savol' ? [{ rol: 'menejer', matn: k.savol.matn, savolId: k.savol.id, seq: 1, at: '2026-10-20T08:00:00Z' }] : [],
  };
};
const BOLAKLAR = ['{"oldin":"","izoh":"","savol":"Qaysi so', 'ha sizga ', 'yaqin?"}'];

describe('/suhbat oqim bilan', () => {
  it('oqim: yozmoqda → qoralama boʻlaklari → tayyor; tayyor — oqimsiz javobning aynan oʻzi', async () => {
    soxtalar(OQI(), BOLAKLAR);
    const oddiy = await sora('/suhbat', { savolId: 'uzum_dokoni', javob: 'yoq' });
    expect(oddiy.statusCode).toBe(200);
    expect(oddiy.headers['content-type']).toMatch(/application\/json/);

    const s = soxtalar(OQI(), BOLAKLAR);
    const res = await sora('/suhbat', { savolId: 'uzum_dokoni', javob: 'yoq', oqim: true });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/event-stream/);
    expect(res.headers['cache-control']).toMatch(/no-transform/);
    expect(s.claude[0]!.stream).toBe(true);
    const h = await hodisalar(res.body);
    expect(h[0]).toEqual(['holat', { holat: 'yozmoqda' }]);
    // Qoralama siyrak (120 ms da bittadan): soxta Claude bir zumda yozadi — birinchisi darhol, oxirgisini
    // `tayyor` bosib ketishi mumkin. Har biri — yakuniy savolning boshi.
    const qismlar = h.filter(([n]) => n === 'qism').map(([, q]) => (q as { savol: string }).savol);
    expect(qismlar[0]).toBe('Qaysi so');
    for (const q of qismlar) expect('Qaysi soha sizga yaqin?'.startsWith(q)).toBe(true);
    expect(h.at(-1)).toEqual(['tayyor', oddiy.json()]);
    expect((oddiy.json() as { xabarlar: Array<{ matn: string }> }).xabarlar.at(-1)!.matn).toBe('Qaysi soha sizga yaqin?');
    // Jurnalga — bitta yozuv (oqim turnni ikki marta yozmaydi).
    expect(s.yozildi).toHaveLength(1);
  });

  it('sessiya topilmasa — oqim YOʻQ: oddiy JSON va 401', async () => {
    soxtalar({ xato: 'sessiya topilmadi' }, BOLAKLAR);
    const res = await sora('/suhbat', { savolId: 'uzum_dokoni', javob: 'yoq', oqim: true });
    expect(res.statusCode).toBe(401);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.json()).toMatchObject({ xato: 'sessiya topilmadi' });
  });
});

describe('/yordamchi oqim bilan', () => {
  it('javob yozilgan sari (`qism` — {matn}), oxirida tayyor — {matn, manba}', async () => {
    soxtalar(null, ['ZumSavdo — Uzumda ', 'birinchi marta sotuvchilar uchun yoʻl.']);
    const res = await sora('/yordamchi', { savol: 'ZumSavdo nima?', sahifa: 'bosh', oqim: true }, '');
    expect(res.headers['content-type']).toMatch(/^text\/event-stream/);
    const h = await hodisalar(res.body);
    expect(h[0]).toEqual(['qism', { matn: 'ZumSavdo — Uzumda' }]);
    expect(h.at(-1)).toEqual(['tayyor', { matn: 'ZumSavdo — Uzumda birinchi marta sotuvchilar uchun yoʻl.', manba: 'ai' }]);
  });

  it('oqim soʻralmasa — avvalgidek JSON', async () => {
    soxtalar(null, ['ZumSavdo — yoʻl.']);
    const res = await sora('/yordamchi', { savol: 'ZumSavdo nima?', sahifa: 'bosh' }, '');
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.json()).toEqual({ matn: 'ZumSavdo — yoʻl.', manba: 'ai' });
  });
});
