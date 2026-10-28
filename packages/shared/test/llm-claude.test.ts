/**
 * Claude (Anthropic) provayderi — rasmiy SDK orqali bitta chaqiruv.
 *
 * NEGA BU TESTLAR BOR. Nazoratchi (2026-10-19): "Anthropic kaliti bor — shuni
 * ulaymiz, Gemini ga muhtoj boʻlmaymiz". Soʻrov shakli (model, tizim keshi,
 * effort, zaxira modeli, JSON sxema) va har xil yiqilishda `null` qaytishi
 * (chat toʻxtamaydi — kod javobi ketadi) shu yerda tekshiriladi. Tarmoq — soxta.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { CLAUDE_MODELI, CLAUDE_TUSHUN_MODELI, claudeNarxi, claudeProvayderi, javobMatni, kalitniAjrat, sirsiz } from '../src/llm-claude';
import {
  aiSarfYozuvchi, aiTushunBer, aiYozBer, kartochkaYozBer, KARTOCHKA_KORSATMA,
  sahifaJavobBer, type LlmSarfi,
} from '../src/llm';
import { AI_TUSHUN_KORSATMA, AI_TUSHUN_SXEMA, AI_YOZ_SXEMA } from '../src/ai-suhbat';
import { SAHIFA_KORSATMA, type SahifaSorovi } from '../src/sahifa-yordamchi';

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

const SAHIFA: SahifaSorovi = {
  savol: 'oldin sotganman maishiy texnika', sahifa: 'bosh', tarix: [], holat: null, bilim: 'B', tayyor: null, til: 'uz', tuzat: null,
};

describe('Claude provayderi', () => {
  it('kalit yoʻq yoki boʻsh — provayder yoʻq (AI ishlamaydi — kod javobi)', () => {
    expect(claudeProvayderi({ kalit: undefined })).toBeNull();
    expect(claudeProvayderi({ kalit: '  \n' })).toBeNull();
  });

  it('soʻrov: model, kalit sarlavhada, tizim koʻrsatmasi keshlanadi, effort low, rad etilsa — zaxira modeli', async () => {
    const y: Yozuv[] = [];
    const provayder = claudeProvayderi({ kalit: ' sk-ant-sinov \n', fetchFn: soxtaFetch([{ json: MATN('Tajribangiz asqotadi.') }], y) });
    const r = await sahifaJavobBer({ provayder }, SAHIFA);
    expect(r).toBe('Tajribangiz asqotadi.');
    expect(y).toHaveLength(1);
    expect(y[0]!.url).toMatch(/\/v1\/messages/);
    expect(y[0]!.sarlavha.get('x-api-key')).toBe('sk-ant-sinov');
    expect(y[0]!.sarlavha.get('anthropic-beta')).toMatch(/server-side-fallback-2026-07-01/);
    const t = y[0]!.tana;
    // 2026-10-20: standart — Sonnet 5.5 (nazoratchi: «tezroq va arzonroq»).
    expect(t.model).toBe('claude-sonnet-5-5');
    expect(t.system).toEqual([{ type: 'text', text: SAHIFA_KORSATMA, cache_control: { type: 'ephemeral' } }]);
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
    expect(await sahifaJavobBer({ provayder }, { ...SAHIFA, savol: 'Qancha pul ajratasiz?' })).toBe('Salom, xush kelibsiz.');
  });

  it('kartochka — JSON sxema bilan (structured outputs), effort medium; javob maydonlarga ajraladi', async () => {
    const y: Yozuv[] = [];
    const M = { nom_uz: 'Gel ruchka koʻk', nom_ru: 'Гелевая ручка синяя', qisqa_uz: 'q', qisqa_ru: 'к', tavsif_uz: 't', tavsif_ru: 'т' };
    const provayder = claudeProvayderi({ kalit: 'k', fetchFn: soxtaFetch([{ json: MATN(JSON.stringify(M)) }], y) });
    const r = await kartochkaYozBer({ provayder }, { namuna: 'Gel ruchka 0,5 mm', turkum: 'Ruchkalar', xitoy: '中性笔' });
    expect(r).toEqual({ nomUz: M.nom_uz, nomRu: M.nom_ru, qisqaUz: 'q', qisqaRu: 'к', tavsifUz: 't', tavsifRu: 'т' });
    const t = y[0]!.tana as { system: Array<{ text: string }>; output_config: { effort: string; format: { type: string; schema: { required: string[]; additionalProperties: boolean } } } };
    expect(t.system[0]!.text).toBe(KARTOCHKA_KORSATMA);
    expect(t.output_config.effort).toBe('medium');
    expect((y[0]!.tana as { max_tokens: number }).max_tokens).toBe(8_000);
    expect(t.output_config.format.type).toBe('json_schema');
    expect(t.output_config.format.schema.required).toEqual(['nom_uz', 'nom_ru', 'qisqa_uz', 'qisqa_ru', 'tavsif_uz', 'tavsif_ru']);
    expect(t.output_config.format.schema.additionalProperties).toBe(false);
  });

  it('AI suhbat — JSON sxema bilan, lekin effort low (chat tez boʻlsin; medium faqat kartochkada)', async () => {
    const y: Yozuv[] = [];
    const provayder = claudeProvayderi({ kalit: 'k', fetchFn: soxtaFetch([{ json: MATN('{"oldin":"","izoh":"","savol":"Qaysi soha?"}') }], y) });
    const r = await aiYozBer({ provayder }, {
      mijoz: null, tanlov: false, qabul: [], rad: [], eslab: [], savolBor: false, bilim: null, tayyor: null, natijalar: [],
      keyingi: null, keyingiMatn: 'Kutamiz', holat: '-', tarix: '', til: 'uz', bugun: '20.10.2026', tuzat: null,
    });
    expect(r).toEqual({ oldin: '', izoh: '', savol: 'Qaysi soha?' });
    const t = y[0]!.tana as { output_config: { effort: string; format: { type: string; schema: unknown } }; max_tokens: number };
    expect(t.output_config.effort).toBe('low');
    expect(t.output_config.format).toEqual({ type: 'json_schema', schema: AI_YOZ_SXEMA });
    expect(t.max_tokens).toBe(8_000);
  });

  it('rad etildi (zaxira modeli ham) yoki max_tokens da kesildi — null: chala javob chiqmaydi', async () => {
    for (const sabab of ['refusal', 'max_tokens']) {
      const provayder = claudeProvayderi({ kalit: 'k', fetchFn: soxtaFetch([{ json: javob([{ type: 'text', text: 'chala' }], sabab) }], []) });
      expect(await sahifaJavobBer({ provayder }, SAHIFA), sabab).toBeNull();
    }
  });

  it('notoʻgʻri soʻrov yoki kalit (400/401) — null, qayta soʻralmaydi; band (529) — bir marta qayta', async () => {
    for (const status of [400, 401]) {
      const y: Yozuv[] = [];
      const provayder = claudeProvayderi({ kalit: 'k', fetchFn: soxtaFetch([{ status, json: { type: 'error', error: { type: 'x', message: 'yoʻq' } } }], y) });
      expect(await sahifaJavobBer({ provayder }, SAHIFA), String(status)).toBeNull();
      expect(y, String(status)).toHaveLength(1);
    }
    const y: Yozuv[] = [];
    const provayder = claudeProvayderi({
      kalit: 'k',
      fetchFn: soxtaFetch([{ status: 529, json: { type: 'error', error: { type: 'overloaded_error', message: 'band' } } }, { json: MATN('Ikkinchisida chiqdi.') }], y),
    });
    expect(await sahifaJavobBer({ provayder }, SAHIFA)).toBe('Ikkinchisida chiqdi.');
    expect(y).toHaveLength(2);
  });

  it('vaqt chegarasi tugasa — null (chat kutib qolmaydi)', async () => {
    const osilgan = ((_: unknown, init?: RequestInit) => new Promise((_y, rad) => {
      init?.signal?.addEventListener('abort', () => rad(new DOMException('uzildi', 'AbortError')));
    })) as unknown as typeof fetch;
    const provayder = claudeProvayderi({ kalit: 'k', fetchFn: osilgan });
    const boshi = Date.now();
    expect(await sahifaJavobBer({ provayder, vaqtMs: 150 }, SAHIFA)).toBeNull();
    expect(Date.now() - boshi).toBeLessThan(3_000);
  });

  it('tushunish — Haiku 5.5 (2026-10-26): JSON sxema, effort low; zaxira modeli yoʻq — fallbacks ham, beta sarlavha ham yuborilmaydi', async () => {
    expect(CLAUDE_TUSHUN_MODELI).toBe('claude-haiku-5-5');
    const y: Yozuv[] = [];
    const TUSHUNCHA = { javoblar: [{ savol_id: 'qiziqish', qiymatlar: ['kiyim'], otkazish: false }], taklif_qiziqish: [], savol_bor: false };
    const provayder = claudeProvayderi({
      kalit: 'k', model: CLAUDE_TUSHUN_MODELI,
      fetchFn: soxtaFetch([{ json: javob([{ type: 'text', text: JSON.stringify(TUSHUNCHA) }], 'end_turn', CLAUDE_TUSHUN_MODELI) }], y),
    });
    const r = await aiTushunBer({ provayder }, { savollar: [], xabar: 'kiyim sotaman', holat: '-', tarix: '' });
    expect(r).toEqual(TUSHUNCHA);
    const t = y[0]!.tana;
    expect(t.model).toBe('claude-haiku-5-5');
    expect(t.fallbacks).toBeUndefined();
    expect(y[0]!.sarlavha.get('anthropic-beta')).toBeNull();
    expect(t.system).toEqual([{ type: 'text', text: AI_TUSHUN_KORSATMA, cache_control: { type: 'ephemeral' } }]);
    expect(t.output_config).toEqual({ effort: 'low', format: { type: 'json_schema', schema: AI_TUSHUN_SXEMA } });
    expect(t.thinking).toBeUndefined();
  });

  it('CLAUDE_MODEL bilan boshqa model', async () => {
    const y: Yozuv[] = [];
    const provayder = claudeProvayderi({ kalit: 'k', model: ' claude-opus-5-5 ', fetchFn: soxtaFetch([{ json: MATN('ok') }], y) });
    await sahifaJavobBer({ provayder }, { ...SAHIFA, savol: 'x' });
    expect(y[0]!.tana.model).toBe('claude-opus-5-5');
  });
});

/** Anthropic oqimi (SSE): hodisalar `event:` + `data:` boʻlib, bitta javob tanasida. */
function sseJavob(hodisalar: Array<Record<string, unknown>>): Response {
  const matn = hodisalar.map((h) => `event: ${String(h.type)}\ndata: ${JSON.stringify(h)}\n\n`).join('');
  return new Response(matn, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}
const BOSHI = (model = CLAUDE_MODELI) => ({
  type: 'message_start',
  message: { ...javob([], null as unknown as string, model), stop_reason: null },
});
const MATN_BLOKI = (index: number, boLaklar: string[]) => [
  { type: 'content_block_start', index, content_block: { type: 'text', text: '' } },
  ...boLaklar.map((text) => ({ type: 'content_block_delta', index, delta: { type: 'text_delta', text } })),
  { type: 'content_block_stop', index },
];
const OXIRI = (stop_reason = 'end_turn') => [
  { type: 'message_delta', delta: { stop_reason, stop_sequence: null }, usage: { output_tokens: 40 } },
  { type: 'message_stop' },
];
const YOZ_SOROVI = {
  mijoz: null, tanlov: false, qabul: [], rad: [], eslab: [], savolBor: false, bilim: null, tayyor: null, natijalar: [],
  keyingi: null, keyingiMatn: 'Kutamiz', holat: '-', tarix: '', til: 'uz' as const, bugun: '20.10.2026', tuzat: null,
};

describe('oqim — matn yozilgan sari (2026-10-20)', () => {
  it('qism berilsa — stream: har boʻlakda shu paytgacha yozilgani; oxirida tekshirilgan JSON', async () => {
    const y: Yozuv[] = [];
    const bolaklar = ['{"oldin":"Rah', 'mat! Yaxshi', ' tanlov.","izoh":"","sa', 'vol":"Qaysi soha?"}'];
    const f = (async (url: string | URL | Request, init?: RequestInit) => {
      y.push({ url: String(url), tana: JSON.parse(String(init?.body)), sarlavha: new Headers(init?.headers) });
      return sseJavob([BOSHI(), ...MATN_BLOKI(0, bolaklar), ...OXIRI()]);
    }) as unknown as typeof fetch;
    const provayder = claudeProvayderi({ kalit: 'k', fetchFn: f });
    const qismlar: Array<{ oldin: string; izoh: string; savol: string }> = [];
    const r = await aiYozBer({ provayder }, YOZ_SOROVI, (q) => qismlar.push(q));
    expect(r).toEqual({ oldin: 'Rahmat! Yaxshi tanlov.', izoh: '', savol: 'Qaysi soha?' });
    expect(y[0]!.tana.stream).toBe(true);
    // Soʻrov shakli oqimsizdagi bilan bir xil: model, effort, sxema, zaxira.
    expect(y[0]!.tana.model).toBe('claude-sonnet-5-5');
    expect(y[0]!.tana.fallbacks).toBe('default');
    expect((y[0]!.tana.output_config as { effort: string }).effort).toBe('low');
    expect(qismlar.map((q) => q.oldin)).toEqual(['Rah', 'Rahmat! Yaxshi', 'Rahmat! Yaxshi tanlov.', 'Rahmat! Yaxshi tanlov.']);
    expect(qismlar.at(-1)).toEqual({ oldin: 'Rahmat! Yaxshi tanlov.', izoh: '', savol: 'Qaysi soha?' });
  });

  it('qism berilmasa — oddiy soʻrov (stream emas)', async () => {
    const y: Yozuv[] = [];
    const provayder = claudeProvayderi({ kalit: 'k', fetchFn: soxtaFetch([{ json: MATN('{"oldin":"","izoh":"","savol":"S?"}') }], y) });
    expect(await aiYozBer({ provayder }, YOZ_SOROVI)).toEqual({ oldin: '', izoh: '', savol: 'S?' });
    expect(y[0]!.tana.stream).toBeUndefined();
  });

  it('rad etilib boshqa modelga oʻtsa (fallback) — qoralama boshidan; javob — faqat keyingi model yozgani', async () => {
    const f = (async () => sseJavob([
      BOSHI(),
      ...MATN_BLOKI(0, ['{"oldin":"CHALA']),
      { type: 'content_block_start', index: 1, content_block: {
        type: 'fallback', from: { model: 'claude-sonnet-5-5' }, to: { model: 'claude-sonnet-5' }, trigger: { type: 'refusal' } } },
      { type: 'content_block_stop', index: 1 },
      ...MATN_BLOKI(2, ['{"oldin":"Yangi","izoh":"","savol":"S?"}']),
      ...OXIRI(),
    ])) as unknown as typeof fetch;
    const provayder = claudeProvayderi({ kalit: 'k', fetchFn: f });
    const qismlar: string[] = [];
    const r = await aiYozBer({ provayder }, YOZ_SOROVI, (q) => qismlar.push(q.oldin));
    expect(r).toEqual({ oldin: 'Yangi', izoh: '', savol: 'S?' });
    expect(qismlar).toEqual(['CHALA', '', 'Yangi']);
  });

  it('oqimda ham: rad etildi yoki max_tokens — null (qoralama keldi, lekin javob yoʻq)', async () => {
    for (const sabab of ['refusal', 'max_tokens']) {
      const f = (async () => sseJavob([BOSHI(), ...MATN_BLOKI(0, ['{"oldin":"chala']), ...OXIRI(sabab)])) as unknown as typeof fetch;
      const provayder = claudeProvayderi({ kalit: 'k', fetchFn: f });
      const qismlar: string[] = [];
      expect(await aiYozBer({ provayder }, YOZ_SOROVI, (q) => qismlar.push(q.oldin)), sabab).toBeNull();
      expect(qismlar, sabab).toEqual(['chala']);
    }
  });

  it('oqim oʻrtasida uzilsa — null (chat toʻxtamaydi, kod qolipi ketadi)', async () => {
    const f = (async () => {
      const kodla = new TextEncoder();
      const tana = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(kodla.encode(`event: message_start\ndata: ${JSON.stringify(BOSHI())}\n\n`));
          c.error(new TypeError('tarmoq uzildi'));
        },
      });
      return new Response(tana, { status: 200, headers: { 'content-type': 'text/event-stream' } });
    }) as unknown as typeof fetch;
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const provayder = claudeProvayderi({ kalit: 'k', fetchFn: f });
    expect(await aiYozBer({ provayder }, YOZ_SOROVI, () => undefined)).toBeNull();
    expect(log.mock.calls.flat().join(' ')).toMatch(/llm ai-yoz/);
  });

  it('sahifa yordamchisi (oddiy matn) — qismda matnning oʻzi', async () => {
    const f = (async () => sseJavob([BOSHI(), ...MATN_BLOKI(0, ['Salom! ', 'ZumSavdo — yoʻl.']), ...OXIRI()])) as unknown as typeof fetch;
    const provayder = claudeProvayderi({ kalit: 'k', fetchFn: f });
    const qismlar: string[] = [];
    const r = await sahifaJavobBer({ provayder }, {
      savol: 'Bu nima?', sahifa: 'bosh', tarix: [], holat: null, bilim: '', tayyor: null, til: 'uz', tuzat: null,
    }, (m) => qismlar.push(m));
    expect(r).toBe('Salom! ZumSavdo — yoʻl.');
    expect(qismlar).toEqual(['Salom! ', 'Salom! ZumSavdo — yoʻl.']);
  });

  it('javobMatni: oxirgi fallback dan keyingi matn bloklari; fallback yoʻq — hammasi', () => {
    expect(javobMatni([{ type: 'text', text: 'a' }, { type: 'thinking' }, { type: 'text', text: 'b' }])).toBe('ab');
    expect(javobMatni([{ type: 'text', text: 'rad' }, { type: 'fallback' }, { type: 'text', text: ' yangi ' }])).toBe('yangi');
    expect(javobMatni([{ type: 'thinking' }])).toBeNull();
  });
});

describe('provayder chaqiruvi (llm.ts)', () => {
  it('har ish oʻz vaqt chegarasi va koʻrsatmasi bilan; provayder yoʻq — chaqiruv yoʻq, null', async () => {
    const chaqiruvlar: Array<{ belgi: string; vaqtMs: number; json: unknown; korsatma: string }> = [];
    const provayder = async (c: { belgi: string; vaqtMs: number; json: unknown; korsatma: string }) => {
      chaqiruvlar.push(c);
      return c.belgi === 'kartochka'
        ? JSON.stringify({ nom_uz: 'a', nom_ru: 'б', qisqa_uz: 'a', qisqa_ru: 'б', tavsif_uz: 'a', tavsif_ru: 'б' })
        : 'javob';
    };
    await sahifaJavobBer({ provayder }, SAHIFA);
    await kartochkaYozBer({ provayder }, { namuna: 'n', turkum: null, xitoy: null });
    await aiTushunBer({ provayder }, { savollar: [], xabar: 'x', holat: '-', tarix: '' });
    expect(chaqiruvlar.map((c) => [c.belgi, c.vaqtMs, c.json === null])).toEqual([
      ['sahifa', 25_000, true], ['kartochka', 30_000, false], ['ai-tushun', 20_000, false],
    ]);
    expect(chaqiruvlar[0]!.korsatma).toBe(SAHIFA_KORSATMA);
    // Kalit yoʻq — provayder yoʻq: AI ishlamaydi, kod javobi (2026-10-28: Gemini olib tashlandi).
    expect(await sahifaJavobBer({ provayder: null }, SAHIFA)).toBeNull();
    expect(await kartochkaYozBer({ provayder: null }, { namuna: 'n', turkum: null, xitoy: null })).toBeNull();
  });

  it('provayder yiqilsa (istisno) — null, oqim toʻxtamaydi', async () => {
    const provayder = async () => { throw new Error('tarmoq'); };
    expect(await sahifaJavobBer({ provayder }, SAHIFA)).toBeNull();
  });
});

/*
 * Jonli (2026-10-19): sirga kalit oʻrniga butun `curl …` buyrugʻi qoʻyilgan edi. SDK uni
 * sarlavhaga qoʻydi, `fetch` "Invalid header value: …" TypeError otdi — va xato MATNI
 * (kalit bilan) logga tushdi. Endi: kalit matndan ajratiladi, logga ketadigan har matn
 * `sirsiz` dan oʻtadi.
 */
describe('kalit va log xavfsizligi', () => {
  const KALIT = 'sk-ant-api03-SINOV_kalit-123';
  const CURL = `curl https://api.anthropic.com/v1/messages \\n  --header "x-api-key: ${KALIT}" \\n  --header "anthropic-version: 2023-06-01"`;
  afterEach(() => { vi.restoreAllMocks(); });

  it('kalitniAjrat: butun buyruqdan, boʻsh joy/qatordan — faqat kalit; kalitsiz gap — null', () => {
    expect(kalitniAjrat(CURL)).toBe(KALIT);
    expect(kalitniAjrat(`  ${KALIT}\n`)).toBe(KALIT);
    expect(kalitniAjrat('"' + KALIT + '"')).toBe(KALIT);
    expect(kalitniAjrat('bu kalit emas')).toBeNull();
    expect(kalitniAjrat('  ')).toBeNull();
    expect(kalitniAjrat(undefined)).toBeNull();
  });

  it('sirsiz: kalit va x-api-key qiymati yashiriladi', () => {
    const t = sirsiz(`Invalid header value: "${CURL}"`);
    expect(t).not.toContain(KALIT);
    expect(t).not.toContain('SINOV_kalit');
    expect(sirsiz('x-api-key: abc123def')).toBe('x-api-key: ***');
  });

  it('sirga butun buyruq qoʻyilsa ham — soʻrovga faqat kalit ketadi', async () => {
    const y: Yozuv[] = [];
    const provayder = claudeProvayderi({ kalit: CURL, fetchFn: soxtaFetch([{ json: MATN('ok') }], y) });
    expect(await sahifaJavobBer({ provayder }, { ...SAHIFA, savol: 'x' })).toBe('ok');
    expect(y[0]!.sarlavha.get('x-api-key')).toBe(KALIT);
  });

  it('sirda kalit topilmasa — provayder yoʻq; logda qiymat yoʻq', () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(claudeProvayderi({ kalit: 'notoʻgʻri qiymat bor' })).toBeNull();
    expect(log.mock.calls.flat().join(' ')).not.toContain('notoʻgʻri qiymat');
  });

  it('API xato javobida kalit boʻlsa — logda yashirin', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const xato = { type: 'error', error: { type: 'invalid_request_error', message: `notoʻgʻri sarlavha ${KALIT}` } };
    const provayder = claudeProvayderi({ kalit: KALIT, fetchFn: soxtaFetch([{ status: 400, json: xato }], []) });
    expect(await sahifaJavobBer({ provayder }, { ...SAHIFA, savol: 'x' })).toBeNull();
    const yozilgan = log.mock.calls.flat().join(' ');
    expect(yozilgan).toMatch(/HTTP 400/);
    expect(yozilgan).not.toContain('SINOV_kalit');
  });

  it('SDK dan tashqari xato (buzuq JSON) matnida kalit boshi boʻlsa ham — logda yashirin', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const buzuq = (async () => new Response(`${KALIT} bu JSON emas`, { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch;
    const provayder = claudeProvayderi({ kalit: KALIT, fetchFn: buzuq });
    expect(await sahifaJavobBer({ provayder }, { ...SAHIFA, savol: 'x' })).toBeNull();
    const yozilgan = log.mock.calls.flat().join(' ');
    expect(yozilgan).toMatch(/llm sahifa/);
    expect(yozilgan).not.toMatch(/sk-ant-a/);
  });

  it('xato matnida kalit boʻlsa — logga YASHIRIB yoziladi (jonli hodisa)', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const yiqil = (async () => { throw new TypeError(`Invalid header value: "${CURL}"`); }) as unknown as typeof fetch;
    const provayder = claudeProvayderi({ kalit: KALIT, fetchFn: yiqil });
    expect(await sahifaJavobBer({ provayder }, { ...SAHIFA, savol: 'x' })).toBeNull();
    const yozilgan = log.mock.calls.flat().join(' ');
    expect(yozilgan).toMatch(/llm sahifa/);
    expect(yozilgan).not.toContain(KALIT);
    expect(yozilgan).not.toContain('SINOV_kalit');
  });
});

/*
 * SARF (2026-10-22, nazoratchi: «AI xarajatini tuzat»). `ai_usage` 2026-10-19 dan beri boʻsh
 * edi — Claude har xabarni yozardi, xarajat esa hech qayerda koʻrinmasdi. Bu yerda: har javob
 * tokenlari va narxi (roʻyxat narxi, platform.claude.com/docs/en/about-claude/pricing,
 * 2026-10-22) `sarf` ga beriladi — rad etilgani ham; zaxira modelga oʻtilsa har urinish
 * alohida, oʻz narxida; yozuvdagi xato javobni buzmaydi.
 */
describe('sarf — har javob narxi (2026-10-22)', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  /** `usage` i berilgan javob (qolgani — `MATN('Javob')`). */
  const SARFLI = (usage: Record<string, unknown>, ortiq: Record<string, unknown> = {}) => ({
    ...MATN('Javob'),
    usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, ...usage },
    ...ortiq,
  });
  const sor = async (json: unknown, ortiq: Partial<Parameters<typeof sahifaJavobBer>[0]> = {}) => {
    const sarflar: LlmSarfi[] = [];
    const provayder = claudeProvayderi({ kalit: 'k', fetchFn: soxtaFetch([{ json }], []) });
    const javobi = await sahifaJavobBer({ provayder, sarf: (s) => sarflar.push(s), ...ortiq }, SAHIFA);
    return { javobi, sarflar };
  };

  it('oddiy javob: tokenlar va narx — Sonnet 5.5: 1 mln kirish $2, chiqish $10', async () => {
    const { javobi, sarflar } = await sor(MATN('Javob'));
    expect(javobi).toBe('Javob');
    // 120 × $2 + 30 × $10 = 540 mikrodollar.
    expect(sarflar).toEqual([{
      belgi: 'sahifa', model: 'claude-sonnet-5-5', kirish: 120, chiqish: 30, keshOqildi: 0, keshYozildi: 0, narxUsd: 0.00054,
    }]);
  });

  it('kesh: oʻqilgani $0,10, yozilgani (5 daqiqa) $2,50, 1 soatligi $4 — 1 mln token uchun', async () => {
    const besh = await sor(SARFLI({ input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 1000, cache_creation_input_tokens: 2000 }));
    // 100×2 + 50×10 + 1000×0,1 + 2000×2,5 = 5 800 mikrodollar.
    expect(besh.sarflar[0]).toMatchObject({ kirish: 100, chiqish: 50, keshOqildi: 1000, keshYozildi: 2000, narxUsd: 0.0058 });
    const soat = await sor(SARFLI({
      input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 1000, cache_creation_input_tokens: 2000,
      cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 2000 },
    }));
    expect(soat.sarflar[0]!.narxUsd).toBe(0.0088);
  });

  it('rad etilgani va kesilgani ham yoziladi — ular ham pul turadi', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const sabab of ['refusal', 'max_tokens']) {
      const { javobi, sarflar } = await sor(javob([{ type: 'text', text: 'chala' }], sabab));
      expect(javobi, sabab).toBeNull();
      expect(sarflar, sabab).toHaveLength(1);
      expect(sarflar[0]!.narxUsd, sabab).toBe(0.00054);
    }
  });

  it('zaxira modelga oʻtilsa — har urinish alohida, oʻz modeli narxida (`usage.iterations`)', async () => {
    const urinish = (type: string, model: string | null, input_tokens: number, output_tokens: number) => ({
      type, model, input_tokens, output_tokens, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, cache_creation: null,
    });
    const { javobi, sarflar } = await sor(SARFLI({
      input_tokens: 100, output_tokens: 40,
      iterations: [urinish('message', null, 100, 10), urinish('fallback_message', 'claude-opus-4-8', 100, 40)],
    }, {
      model: 'claude-opus-4-8',
      content: [
        { type: 'fallback', from: { model: 'claude-sonnet-5-5' }, to: { model: 'claude-opus-4-8' }, trigger: { type: 'refusal' } },
        { type: 'text', text: 'Javob' },
      ],
    }));
    expect(javobi).toBe('Javob');
    expect(sarflar.map((s) => [s.model, s.kirish, s.chiqish, s.narxUsd])).toEqual([
      // Rad etgan urinish — soʻralgan model (yozuvda modeli yoʻq): 100×2 + 10×10.
      ['claude-sonnet-5-5', 100, 10, 0.0003],
      // Javob bergani — Opus 4.8 narxida ($5 / $25): 100×5 + 40×25.
      ['claude-opus-4-8', 100, 40, 0.0015],
    ]);
  });

  it('Haiku 5.5 (tushunish): 1 mln kirish $0,10, chiqish $0,50, kesh oʻqilgani $0,01', () => {
    expect(claudeNarxi('claude-haiku-5-5', { kirish: 1_000_000, chiqish: 0, keshOqildi: 0, keshYozildi: 0 })).toBe(0.1);
    expect(claudeNarxi('claude-haiku-5-5', { kirish: 0, chiqish: 1_000_000, keshOqildi: 0, keshYozildi: 0 })).toBe(0.5);
    expect(claudeNarxi('claude-haiku-5-5', { kirish: 0, chiqish: 0, keshOqildi: 1_000_000, keshYozildi: 0 })).toBe(0.01);
    // Odatdagi tushunish: ~1 200 kirish, ~1 200 kesh yozish, ~60 chiqish — $0,0003 atrofida (Sonnet da ~$0,006).
    expect(claudeNarxi('claude-haiku-5-5', { kirish: 1_200, chiqish: 60, keshOqildi: 0, keshYozildi: 1_200 })).toBeLessThan(0.0004);
  });

  it('narxi roʻyxatda yoʻq model — narx `null` (taxmin qilinmaydi), logda sababi', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // Haiku 5.5 endi roʻyxatda (2026-10-26, tushunish) — misol: eski Haiku 4.5.
    const { sarflar } = await sor(javob([{ type: 'text', text: 'ok' }], 'end_turn', 'claude-haiku-4-5'));
    expect(sarflar[0]).toMatchObject({ model: 'claude-haiku-4-5', kirish: 120, narxUsd: null });
    expect(log.mock.calls.flat().join(' ')).toMatch(/claude-haiku-4-5 narxi roʻyxatda yoʻq/);
  });

  it('narx: sanali nom — sanasiz narxda; `claude-opus-5` ≠ `claude-opus-5-5` (boshi bir xil)', () => {
    const mln = { kirish: 1_000_000, chiqish: 0, keshOqildi: 0, keshYozildi: 0 };
    expect(claudeNarxi('claude-sonnet-5-5-20261001', mln)).toBe(2);
    expect(claudeNarxi('claude-opus-5-5', mln)).toBe(4);
    expect(claudeNarxi('claude-opus-5', mln)).toBe(5);
    expect(claudeNarxi('claude-opus-5-20260601', mln)).toBe(5);
    expect(claudeNarxi('claude-fable-5-1', mln)).toBeNull();
    // 1 soatlik kesh yozilganidan koʻp boʻlolmaydi (oqimda boshqa hodisadan kelishi mumkin).
    expect(claudeNarxi('claude-sonnet-5-5', { ...mln, kirish: 0, keshYozildi: 1_000_000, kesh1Soat: 5_000_000 })).toBe(4);
  });

  it('oqim: sarf oxirida — kirish `message_start` dan, chiqish oxirgi `message_delta` dan', async () => {
    const f = (async () => sseJavob([BOSHI(), ...MATN_BLOKI(0, ['{"oldin":"","izoh":"","savol":"S?"}']), ...OXIRI()])) as unknown as typeof fetch;
    const provayder = claudeProvayderi({ kalit: 'k', fetchFn: f });
    const sarflar: LlmSarfi[] = [];
    const r = await aiYozBer({ provayder, sarf: (s) => sarflar.push(s) }, YOZ_SOROVI, () => undefined);
    expect(r).toEqual({ oldin: '', izoh: '', savol: 'S?' });
    // 120×2 + 40×10 = 640 mikrodollar.
    expect(sarflar).toEqual([{
      belgi: 'ai-yoz', model: 'claude-sonnet-5-5', kirish: 120, chiqish: 40, keshOqildi: 0, keshYozildi: 0, narxUsd: 0.00064,
    }]);
  });

  it('javob kelmasa (HTTP xato) — sarf yoʻq', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sarflar: LlmSarfi[] = [];
    const xato = { type: 'error', error: { type: 'invalid_request_error', message: 'yoʻq' } };
    const provayder = claudeProvayderi({ kalit: 'k', fetchFn: soxtaFetch([{ status: 400, json: xato }], []) });
    expect(await sahifaJavobBer({ provayder, sarf: (s) => sarflar.push(s) }, SAHIFA)).toBeNull();
    expect(sarflar).toEqual([]);
  });

  it('sarf yozuvchisi yiqilsa ham javob mijozga ketadi', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { javobi } = await sor(MATN('Javob'), { sarf: () => { throw new Error('baza'); } });
    expect(javobi).toBe('Javob');
    expect(log.mock.calls.flat().join(' ')).toMatch(/sarf yozilmadi/);
  });
});

describe('aiSarfYozuvchi — `so_ai_sarf_yoz` ga (0072)', () => {
  afterEach(() => { vi.restoreAllMocks(); });
  const SARF: LlmSarfi = {
    belgi: 'ai-yoz', model: 'claude-sonnet-5-5', kirish: 120, chiqish: 40, keshOqildi: 900, keshYozildi: 0, narxUsd: 0.00073,
  };
  /** `rpc` oʻrnida: chaqiruvlarni yozadi va berilgan javobni qaytaradi. */
  const soxtaRpc = (javobi: unknown, chaqiruvlar: Array<[string, unknown]> = []) =>
    async <T,>(nom: string, arg: unknown): Promise<T | null> => { chaqiruvlar.push([nom, arg]); return javobi as T | null; };

  it('bitta chaqiruv — sessiya tokeni bilan, maydonlar bazadagi nomi bilan; mijozni kuttirmaydi (fonda)', async () => {
    const chaqiruvlar: Array<[string, unknown]> = [];
    const fondagi: Array<Promise<unknown>> = [];
    aiSarfYozuvchi(soxtaRpc({ yozildi: true }, chaqiruvlar), 'tok', (p) => fondagi.push(p))(SARF);
    expect(fondagi).toHaveLength(1);
    await Promise.all(fondagi);
    expect(chaqiruvlar).toEqual([['so_ai_sarf_yoz', {
      p_token: 'tok', p_model: 'claude-sonnet-5-5', p_maqsad: 'ai-yoz', p_kirish: 120, p_chiqish: 40,
      p_kesh_oqildi: 900, p_kesh_yozildi: 0, p_narx_usd: 0.00073,
    }]]);
  });

  it('sessiyasiz (boʻsh token) — `p_token: null`; narxsiz — `p_narx_usd: null`', async () => {
    const chaqiruvlar: Array<[string, unknown]> = [];
    const fondagi: Array<Promise<unknown>> = [];
    aiSarfYozuvchi(soxtaRpc({ yozildi: true }, chaqiruvlar), '', (p) => fondagi.push(p))({ ...SARF, narxUsd: null });
    await Promise.all(fondagi);
    expect(chaqiruvlar[0]![1]).toMatchObject({ p_token: null, p_narx_usd: null });
  });

  it('baza yozmasa yoki yiqilsa — jim emas: logda sababi; xato tashqariga chiqmaydi', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fondagi: Array<Promise<unknown>> = [];
    aiSarfYozuvchi(soxtaRpc(null), 'tok', (p) => fondagi.push(p))(SARF);
    aiSarfYozuvchi(async () => { throw new TypeError('tarmoq'); }, 'tok', (p) => fondagi.push(p))(SARF);
    await Promise.all(fondagi);
    const yozilgan = log.mock.calls.flat().join('\n');
    expect(yozilgan).toMatch(/ai sarfi yozilmadi \(ai-yoz, claude-sonnet-5-5\): baza javob bermadi/);
    expect(yozilgan).toMatch(/ai sarfi yozilmadi \(ai-yoz, claude-sonnet-5-5\): TypeError/);
  });

  it('yozildi — logda hech narsa yoʻq', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fondagi: Array<Promise<unknown>> = [];
    aiSarfYozuvchi(soxtaRpc({ yozildi: true }), 'tok', (p) => fondagi.push(p))(SARF);
    await Promise.all(fondagi);
    expect(log).not.toHaveBeenCalled();
  });
});
