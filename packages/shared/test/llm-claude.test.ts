/**
 * Claude (Anthropic) provayderi — rasmiy SDK orqali bitta chaqiruv.
 *
 * NEGA BU TESTLAR BOR. Nazoratchi (2026-10-19): "Anthropic kaliti bor — shuni
 * ulaymiz, Gemini ga muhtoj boʻlmaymiz". Soʻrov shakli (model, tizim keshi,
 * effort, zaxira modeli, JSON sxema) va har xil yiqilishda `null` qaytishi
 * (chat toʻxtamaydi — kod javobi ketadi) shu yerda tekshiriladi. Tarmoq — soxta.
 */

import { describe, expect, it } from 'vitest';
import { CLAUDE_MODELI, claudeProvayderi } from '../src/llm-claude';
import { erkinJavobBer, kartochkaYozBer, KARTOCHKA_KORSATMA, MUNOSABAT_KORSATMA, munosabatBer, odamlashtir } from '../src/llm';

interface Yozuv { url: string; tana: Record<string, unknown>; sarlavha: Headers }

/** Messages API javobi (SDK shu shaklni kutadi). */
function javob(content: unknown[], stop_reason = 'end_turn', model = CLAUDE_MODELI) {
  return {
    id: 'msg_sinov', type: 'message', role: 'assistant', model, content, stop_reason, stop_sequence: null,
    usage: { input_tokens: 120, output_tokens: 30, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  };
}
const MATN = (t: string) => javob([{ type: 'text', text: t }]);

/** Har chaqiruvga navbatdagi javob (oxirgisi takrorlanadi); soʻrovlar yoziladi. */
function soxtaFetch(javoblar: Array<{ status?: number; json: unknown }>, y: Yozuv[]): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    y.push({ url: String(url), tana: JSON.parse(String(init?.body)), sarlavha: new Headers(init?.headers) });
    const j = javoblar[Math.min(y.length - 1, javoblar.length - 1)]!;
    return new Response(JSON.stringify(j.json), { status: j.status ?? 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
}

const MUNOSABAT = {
  savol: 'Oldin savdo qilganmisiz?', xabar: 'oldin sotganman maishiy texnika', tushunilgan: null, tayyor: null, bilim: null,
  holat: '- Hozir: 1-qadam.', tarix: '', keyingi: null, til: 'uz' as const, tuzat: null, savolBor: false,
};

describe('Claude provayderi', () => {
  it('kalit yoʻq yoki boʻsh — provayder yoʻq (Gemini yoki kod javobi ishlaydi)', () => {
    expect(claudeProvayderi({ kalit: undefined })).toBeNull();
    expect(claudeProvayderi({ kalit: '  \n' })).toBeNull();
  });

  it('soʻrov: model, kalit sarlavhada, tizim koʻrsatmasi keshlanadi, effort low, rad etilsa — zaxira modeli', async () => {
    const y: Yozuv[] = [];
    const provayder = claudeProvayderi({ kalit: ' sk-ant-sinov \n', fetchFn: soxtaFetch([{ json: MATN('Tajribangiz asqotadi.') }], y) });
    const r = await munosabatBer({ kalit: null, provayder }, MUNOSABAT);
    expect(r).toBe('Tajribangiz asqotadi.');
    expect(y).toHaveLength(1);
    expect(y[0]!.url).toMatch(/\/v1\/messages/);
    expect(y[0]!.sarlavha.get('x-api-key')).toBe('sk-ant-sinov');
    expect(y[0]!.sarlavha.get('anthropic-beta')).toMatch(/server-side-fallback-2026-07-01/);
    const t = y[0]!.tana;
    expect(t.model).toBe('claude-opus-5-5');
    expect(t.system).toEqual([{ type: 'text', text: MUNOSABAT_KORSATMA, cache_control: { type: 'ephemeral' } }]);
    expect(t.output_config).toEqual({ effort: 'low' });
    // Javob qisqa; fikrlash ham shu chegaraga kiradi.
    expect(t.max_tokens).toBe(4_000);
    expect(t.fallbacks).toBe('default');
    expect(t.thinking).toBeUndefined();
    expect((t.messages as Array<{ role: string; content: string }>)[0]).toMatchObject({ role: 'user' });
    expect((t.messages as Array<{ content: string }>)[0]!.content).toMatch(/ODAM YOZDI: oldin sotganman maishiy texnika$/);
  });

  it('fikr bloki oldin kelsa ham — faqat matn bloklari olinadi (fikr matni javobga aralashmaydi)', async () => {
    const y: Yozuv[] = [];
    const provayder = claudeProvayderi({
      kalit: 'k',
      fetchFn: soxtaFetch([{ json: javob([{ type: 'thinking', thinking: 'ICHKI FIKR', signature: 'imzo' }, { type: 'text', text: 'Salom,' }, { type: 'text', text: ' xush kelibsiz.' }]) }], y),
    });
    expect(await odamlashtir({ kalit: null, provayder }, 'Qancha pul ajratasiz?')).toBe('Salom, xush kelibsiz.');
  });

  it('kartochka — JSON sxema bilan (structured outputs), effort medium; javob maydonlarga ajraladi', async () => {
    const y: Yozuv[] = [];
    const M = { nom_uz: 'Gel ruchka koʻk', nom_ru: 'Гелевая ручка синяя', qisqa_uz: 'q', qisqa_ru: 'к', tavsif_uz: 't', tavsif_ru: 'т' };
    const provayder = claudeProvayderi({ kalit: 'k', fetchFn: soxtaFetch([{ json: MATN(JSON.stringify(M)) }], y) });
    const r = await kartochkaYozBer({ kalit: null, provayder }, { namuna: 'Gel ruchka 0,5 mm', turkum: 'Ruchkalar', xitoy: '中性笔' });
    expect(r).toEqual({ nomUz: M.nom_uz, nomRu: M.nom_ru, qisqaUz: 'q', qisqaRu: 'к', tavsifUz: 't', tavsifRu: 'т' });
    const t = y[0]!.tana as { system: Array<{ text: string }>; output_config: { effort: string; format: { type: string; schema: { required: string[]; additionalProperties: boolean } } } };
    expect(t.system[0]!.text).toBe(KARTOCHKA_KORSATMA);
    expect(t.output_config.effort).toBe('medium');
    expect((y[0]!.tana as { max_tokens: number }).max_tokens).toBe(8_000);
    expect(t.output_config.format.type).toBe('json_schema');
    expect(t.output_config.format.schema.required).toEqual(['nom_uz', 'nom_ru', 'qisqa_uz', 'qisqa_ru', 'tavsif_uz', 'tavsif_ru']);
    expect(t.output_config.format.schema.additionalProperties).toBe(false);
  });

  it('rad etildi (zaxira modeli ham) yoki max_tokens da kesildi — null: chala javob chiqmaydi', async () => {
    for (const sabab of ['refusal', 'max_tokens']) {
      const provayder = claudeProvayderi({ kalit: 'k', fetchFn: soxtaFetch([{ json: javob([{ type: 'text', text: 'chala' }], sabab) }], []) });
      expect(await munosabatBer({ kalit: null, provayder }, MUNOSABAT), sabab).toBeNull();
    }
  });

  it('notoʻgʻri soʻrov yoki kalit (400/401) — null, qayta soʻralmaydi; band (529) — bir marta qayta', async () => {
    for (const status of [400, 401]) {
      const y: Yozuv[] = [];
      const provayder = claudeProvayderi({ kalit: 'k', fetchFn: soxtaFetch([{ status, json: { type: 'error', error: { type: 'x', message: 'yoʻq' } } }], y) });
      expect(await munosabatBer({ kalit: null, provayder }, MUNOSABAT), String(status)).toBeNull();
      expect(y, String(status)).toHaveLength(1);
    }
    const y: Yozuv[] = [];
    const provayder = claudeProvayderi({
      kalit: 'k',
      fetchFn: soxtaFetch([{ status: 529, json: { type: 'error', error: { type: 'overloaded_error', message: 'band' } } }, { json: MATN('Ikkinchisida chiqdi.') }], y),
    });
    expect(await munosabatBer({ kalit: null, provayder }, MUNOSABAT)).toBe('Ikkinchisida chiqdi.');
    expect(y).toHaveLength(2);
  });

  it('vaqt chegarasi tugasa — null (chat kutib qolmaydi)', async () => {
    const osilgan = ((_: unknown, init?: RequestInit) => new Promise((_y, rad) => {
      init?.signal?.addEventListener('abort', () => rad(new DOMException('uzildi', 'AbortError')));
    })) as unknown as typeof fetch;
    const provayder = claudeProvayderi({ kalit: 'k', fetchFn: osilgan });
    const boshi = Date.now();
    expect(await erkinJavobBer({ kalit: null, provayder, vaqtMs: 150 },
      { savol: 'S', variantlar: [], xabar: 'X', sabab: null, tayyor: null, bilim: 'B' })).toBeNull();
    expect(Date.now() - boshi).toBeLessThan(3_000);
  });

  it('CLAUDE_MODEL bilan boshqa model', async () => {
    const y: Yozuv[] = [];
    const provayder = claudeProvayderi({ kalit: 'k', model: ' claude-sonnet-5-5 ', fetchFn: soxtaFetch([{ json: MATN('ok') }], y) });
    await odamlashtir({ kalit: null, provayder }, 'x');
    expect(y[0]!.tana.model).toBe('claude-sonnet-5-5');
  });
});

describe('provayder tanlovi (llm.ts)', () => {
  it('provayder berilsa — Gemini chaqirilmaydi; har ish oʻz vaqt chegarasi va koʻrsatmasi bilan', async () => {
    const chaqiruvlar: Array<{ belgi: string; vaqtMs: number; json: unknown; korsatma: string }> = [];
    const provayder = async (c: { belgi: string; vaqtMs: number; json: unknown; korsatma: string }) => {
      chaqiruvlar.push(c);
      return c.belgi === 'kartochka'
        ? JSON.stringify({ nom_uz: 'a', nom_ru: 'б', qisqa_uz: 'a', qisqa_ru: 'б', tavsif_uz: 'a', tavsif_ru: 'б' })
        : 'javob';
    };
    let gemini = 0;
    const fetchFn = (async () => { gemini++; return new Response('{}'); }) as unknown as typeof fetch;
    const s = { kalit: 'AIza-gemini', fetchFn, provayder };
    await odamlashtir(s, 'x');
    await erkinJavobBer(s, { savol: 'S', variantlar: [], xabar: 'X', sabab: null, tayyor: null, bilim: 'B' });
    await munosabatBer(s, MUNOSABAT);
    await kartochkaYozBer(s, { namuna: 'n', turkum: null, xitoy: null });
    expect(gemini).toBe(0);
    expect(chaqiruvlar.map((c) => [c.belgi, c.vaqtMs, c.json === null])).toEqual([
      ['odamlashtir', 8_000, true], ['erkin', 25_000, true], ['munosabat', 12_000, true], ['kartochka', 30_000, false],
    ]);
    expect(chaqiruvlar[2]!.korsatma).toBe(MUNOSABAT_KORSATMA);
  });

  it('provayder yiqilsa (istisno) — null, oqim toʻxtamaydi', async () => {
    const provayder = async () => { throw new Error('tarmoq'); };
    expect(await munosabatBer({ kalit: null, provayder }, MUNOSABAT)).toBeNull();
  });
});
