/**
 * Gemini soʻrovi — model va "oʻylash" sozlamasi.
 *
 * NEGA BU TESTLAR BOR. 2026-10-06: yangi kalit bilan Gemini
 * `gemini-2.5-flash` ga 404 qaytardi — "no longer available to new users";
 * Google yangi loyihalarga 3.5/3.8 ni beradi. Gemini 3.x da: harorat
 * (temperature) oʻzgartirilmaydi (rasmiy tavsiya), "oʻylash" `thinkingLevel`
 * bilan beriladi va uning tokenlari `maxOutputTokens` ga kiradi — chegara
 * kichik boʻlsa javob boʻsh qaytadi.
 */

import { describe, expect, it } from 'vitest';
import { ERKIN_KORSATMA, erkinJavobBer, kartochkaYozBer, MUNOSABAT_KORSATMA, munosabatBer, odamlashtir } from '../src/llm';

interface Yozuv { url: string; tana: Record<string, unknown>; sarlavha: Record<string, string> }

function soxtaFetch(javob: { status?: number; json: unknown }, yozuvlar: Yozuv[]): typeof fetch {
  return (async (url: string, init?: RequestInit) => {
    yozuvlar.push({ url, tana: JSON.parse(String(init?.body)), sarlavha: init?.headers as Record<string, string> });
    return new Response(JSON.stringify(javob.json), { status: javob.status ?? 200 });
  }) as unknown as typeof fetch;
}

const JAVOB = { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Salom! ' }, { text: 'Qancha pul ajratasiz?' }] } }] };

/** Har chaqiruvga navbatdagi javob (oxirgisi takrorlanadi). */
function ketmaKet(javoblar: Array<{ status?: number; json: unknown }>, yozuvlar: Yozuv[]): typeof fetch {
  return (async (url: string, init?: RequestInit) => {
    yozuvlar.push({ url, tana: JSON.parse(String(init?.body)), sarlavha: init?.headers as Record<string, string> });
    const j = javoblar[Math.min(yozuvlar.length - 1, javoblar.length - 1)]!;
    return new Response(JSON.stringify(j.json), { status: j.status ?? 200 });
  }) as unknown as typeof fetch;
}

const BAND = { status: 503, json: { error: { status: 'UNAVAILABLE', message: 'high demand' } } };

describe('gemini soʻrovi', () => {
  it('standart model — gemini-3.8-flash; harorat yuborilmaydi; u minimal ni qoʻllamaydi — low (odamlashtir)', async () => {
    const y: Yozuv[] = [];
    const r = await odamlashtir({ kalit: ' AIzaKALIT \n', fetchFn: soxtaFetch({ json: JAVOB }, y) }, 'Qancha pul ajratasiz?');
    expect(r).toBe('Salom! Qancha pul ajratasiz?');
    expect(y[0]!.url).toContain('/models/gemini-3.8-flash:generateContent');
    expect(y[0]!.sarlavha['x-goog-api-key']).toBe('AIzaKALIT');
    const gc = y[0]!.tana.generationConfig as Record<string, unknown>;
    expect(gc.temperature).toBeUndefined();
    expect(gc.thinkingConfig).toEqual({ thinkingLevel: 'low' });
    expect(gc.maxOutputTokens).toBeGreaterThanOrEqual(2048);
  });

  it('Flash-Lite minimal ni qoʻllaydi — odamlashtirda minimal ketadi', async () => {
    const y: Yozuv[] = [];
    await odamlashtir({ kalit: 'K', model: 'gemini-3.5-flash-lite', fetchFn: soxtaFetch({ json: JAVOB }, y) }, 'x');
    expect((y[0]!.tana.generationConfig as Record<string, unknown>).thinkingConfig).toEqual({ thinkingLevel: 'minimal' });
  });

  it('erkin javob — oʻylash low', async () => {
    const y: Yozuv[] = [];
    await erkinJavobBer({ kalit: 'AIzaKALIT', fetchFn: soxtaFetch({ json: JAVOB }, y) },
      { savol: 'Qancha?', variantlar: [], xabar: 'bu nima?', sabab: null, tayyor: null, bilim: 'faktlar' });
    expect((y[0]!.tana.generationConfig as Record<string, unknown>).thinkingConfig).toEqual({ thinkingLevel: 'low' });
  });

  it('LLM_MODEL bilan boshqa model; 2.x modelga thinkingLevel yuborilmaydi (u uni rad etadi)', async () => {
    const y: Yozuv[] = [];
    await odamlashtir({ kalit: 'K', model: 'gemini-3.6-flash', fetchFn: soxtaFetch({ json: JAVOB }, y) }, 'x');
    await odamlashtir({ kalit: 'K', model: 'gemini-2.5-flash', fetchFn: soxtaFetch({ json: JAVOB }, y) }, 'x');
    expect(y[0]!.url).toContain('/models/gemini-3.6-flash:');
    expect((y[0]!.tana.generationConfig as Record<string, unknown>).thinkingConfig).toEqual({ thinkingLevel: 'minimal' });
    expect((y[1]!.tana.generationConfig as Record<string, unknown>).thinkingConfig).toBeUndefined();
  });

  it('xato yoki boʻsh javob — null (oqim toʻxtamaydi)', async () => {
    const y: Yozuv[] = [];
    expect(await odamlashtir({ kalit: 'K', fetchFn: soxtaFetch({ status: 404, json: { error: { status: 'NOT_FOUND', message: 'model' } } }, y) }, 'x')).toBeNull();
    expect(await odamlashtir({ kalit: 'K', fetchFn: soxtaFetch({ json: { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [] } }] } }, y) }, 'x')).toBeNull();
    expect(await odamlashtir({ kalit: '', fetchFn: soxtaFetch({ json: JAVOB }, y) }, 'x')).toBeNull();
  });
});

describe('zaxira model (2026-10-14: bepul darajada 503 "high demand")', () => {
  const SOROV = { savol: 'S', variantlar: [], xabar: 'X', sabab: null, tayyor: null, bilim: 'B' };

  it('503 — bir marta gemini-3.5-flash-lite bilan qayta; uning javobi qaytadi', async () => {
    const y: Yozuv[] = [];
    const r = await erkinJavobBer({ kalit: 'K', fetchFn: ketmaKet([BAND, { json: JAVOB }], y) }, SOROV);
    expect(r).toBe('Salom! Qancha pul ajratasiz?');
    expect(y.map((x) => x.url.match(/models\/([^:]+):/)?.[1])).toEqual(['gemini-3.8-flash', 'gemini-3.5-flash-lite']);
    expect(JSON.stringify(y[1]!.tana)).toBe(JSON.stringify(y[0]!.tana));
  });

  it('429 (limit tugadi) — ham zaxira bilan', async () => {
    const y: Yozuv[] = [];
    const r = await erkinJavobBer({ kalit: 'K', fetchFn: ketmaKet([{ status: 429, json: {} }, { json: JAVOB }], y) }, SOROV);
    expect(r).not.toBeNull();
    expect(y).toHaveLength(2);
  });

  it('zaxira ham band — null; ikki martadan ortiq soʻralmaydi', async () => {
    const y: Yozuv[] = [];
    expect(await erkinJavobBer({ kalit: 'K', fetchFn: ketmaKet([BAND], y) }, SOROV)).toBeNull();
    expect(y).toHaveLength(2);
  });

  it('asosiy model vaqtning 70 % ida ulgurmasa — qolgan vaqtda zaxira (jonli oʻlchov, 2026-10-14: AbortError)', async () => {
    const y: Yozuv[] = [];
    const vaqtlar: number[] = [];
    const boshi = Date.now();
    const f = (async (url: string, init?: RequestInit) => {
      y.push({ url, tana: JSON.parse(String(init?.body)), sarlavha: init?.headers as Record<string, string> });
      if (y.length === 1) {
        // Asosiy model "osilib qoladi" — faqat signal uzganda tugaydi.
        return new Promise<Response>((_, rad) => init!.signal!.addEventListener('abort', () => {
          vaqtlar.push(Date.now() - boshi);
          rad(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        }));
      }
      return new Response(JSON.stringify(JAVOB), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await erkinJavobBer({ kalit: 'K', fetchFn: f, vaqtMs: 1_000 }, SOROV);
    expect(r).toBe('Salom! Qancha pul ajratasiz?');
    expect(y.map((x) => x.url.match(/models\/([^:]+):/)?.[1])).toEqual(['gemini-3.8-flash', 'gemini-3.5-flash-lite']);
    // 70 % (700 ms) da uzildi — 1 000 ms gacha kutilmadi.
    expect(vaqtlar[0]).toBeGreaterThanOrEqual(650);
    expect(vaqtlar[0]).toBeLessThan(950);
  });

  it('zaxirasiz — asosiy model butun vaqtni oladi; vaqt tugasa null', async () => {
    const vaqtlar: number[] = [];
    const boshi = Date.now();
    const f = (async (_url: string, init?: RequestInit) => new Promise<Response>((_, rad) => init!.signal!.addEventListener('abort', () => {
      vaqtlar.push(Date.now() - boshi);
      rad(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    }))) as unknown as typeof fetch;
    expect(await erkinJavobBer({ kalit: 'K', zaxiraModel: '', fetchFn: f, vaqtMs: 400 }, SOROV)).toBeNull();
    expect(vaqtlar).toHaveLength(1);
    expect(vaqtlar[0]).toBeGreaterThanOrEqual(380);
  });

  it('boshqa xato (400, 404, kalit) — qayta soʻralmaydi', async () => {
    for (const status of [400, 403, 404, 500]) {
      const y: Yozuv[] = [];
      expect(await erkinJavobBer({ kalit: 'K', fetchFn: ketmaKet([{ status, json: {} }, { json: JAVOB }], y) }, SOROV)).toBeNull();
      expect(y).toHaveLength(1);
    }
  });

  it('LLM_ZAXIRA_MODEL boʻsh — zaxirasiz; asosiy model zaxira bilan bir xil — qayta soʻralmaydi; boshqa zaxira — oʻsha', async () => {
    const a: Yozuv[] = [];
    await erkinJavobBer({ kalit: 'K', zaxiraModel: '', fetchFn: ketmaKet([BAND, { json: JAVOB }], a) }, SOROV);
    expect(a).toHaveLength(1);
    const b: Yozuv[] = [];
    await erkinJavobBer({ kalit: 'K', model: 'gemini-3.5-flash-lite', fetchFn: ketmaKet([BAND, { json: JAVOB }], b) }, SOROV);
    expect(b).toHaveLength(1);
    const c: Yozuv[] = [];
    await erkinJavobBer({ kalit: 'K', zaxiraModel: ' gemini-3.6-flash ', fetchFn: ketmaKet([BAND, { json: JAVOB }], c) }, SOROV);
    expect(c[1]!.url).toContain('/models/gemini-3.6-flash:');
  });
});

describe('yordamchi feʼl-atvori (nazoratchi tanlovi, 2026-10-13)', () => {
  it('koʻrsatma: doʻstona, batafsil, oʻzi maslahat beradi, mijoz tili va yozuvi, bilmasa — umumiy maslahat, rostgoʻy', () => {
    expect(ERKIN_KORSATMA).toMatch(/Doʻstona/);
    expect(ERKIN_KORSATMA).toMatch(/Batafsil: 4–8 jumla/);
    expect(ERKIN_KORSATMA).toMatch(/soʻramasa ham/);
    expect(ERKIN_KORSATMA).toMatch(/oʻzbek kirill/);
    expect(ERKIN_KORSATMA).toMatch(/aniq bilmayman.*umumiy maslahat/su);
    expect(ERKIN_KORSATMA).toMatch(/odam emasman/);
  });

  it('javob tili: rus yoki kirill savolda aniq aytiladi; lotin savolda — qoʻshilmaydi (2026-10-14)', async () => {
    const matnlar: string[] = [];
    for (const til of ['ru', 'uz-kirill', 'uz', undefined] as const) {
      const y: Yozuv[] = [];
      await erkinJavobBer({ kalit: 'K', fetchFn: soxtaFetch({ json: JAVOB }, y) },
        { savol: 'S', variantlar: [], xabar: 'X', sabab: null, tayyor: 'oʻzbekcha', bilim: 'B', ...(til ? { til } : {}) });
      matnlar.push((y[0]!.tana as { contents: Array<{ parts: Array<{ text: string }> }> }).contents[0]!.parts[0]!.text);
    }
    expect(matnlar[0]).toMatch(/JAVOB TILI: rus tili\. Butun javobni faqat rus tilida yoz/);
    expect(matnlar[1]).toMatch(/JAVOB TILI: oʻzbek tili, KIRILL yozuvida/);
    expect(matnlar[2]).not.toMatch(/JAVOB TILI/);
    expect(matnlar[3]).not.toMatch(/JAVOB TILI/);
  });

  it('bazaviy javob soʻrovga «maʼnosi va raqamlarini saqlab» deb qoʻshiladi', async () => {
    const y: Yozuv[] = [];
    await erkinJavobBer({ kalit: 'K', fetchFn: soxtaFetch({ json: JAVOB }, y) },
      { savol: 'S', variantlar: [], xabar: 'X', sabab: null, tayyor: 'Logistika — 5 250 soʻm', bilim: 'B' });
    expect(JSON.stringify(y[0]!.tana)).toMatch(/TAYYOR JAVOB \(maʼnosi va raqamlarini saqlab/);
  });
});

describe('kartochka matni (10-qadam, 2026-10-13)', () => {
  const javob = (t: string) => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: t }] } }] });
  const M = { nom_uz: 'Gel ruchka koʻk siyohli', nom_ru: 'Гелевая ручка синяя', qisqa_uz: 'q', qisqa_ru: 'к', tavsif_uz: 't', tavsif_ru: 'т' };

  it('JSON javob (``` bilan ham) — maydonlar; soʻrov JSON rejimida, manbalar bilan', async () => {
    const y: Yozuv[] = [];
    const r = await kartochkaYozBer({ kalit: 'K', fetchFn: soxtaFetch({ json: javob(`\`\`\`json\n${JSON.stringify(M)}\n\`\`\``) }, y) },
      { namuna: 'Gel ruchka 0,5 mm', turkum: 'Ruchkalar', xitoy: '中性笔' });
    expect(r).toEqual({ nomUz: M.nom_uz, nomRu: M.nom_ru, qisqaUz: 'q', qisqaRu: 'к', tavsifUz: 't', tavsifRu: 'т' });
    const tana = y[0]!.tana as { generationConfig: Record<string, unknown>; contents: Array<{ parts: Array<{ text: string }> }> };
    expect(tana.generationConfig.responseMimeType).toBe('application/json');
    expect(tana.contents[0]!.parts[0]!.text).toMatch(/UZUMDAGI NAMUNA TOVAR NOMI: Gel ruchka 0,5 mm/);
    expect(tana.contents[0]!.parts[0]!.text).toMatch(/1688 TAKLIFI NOMI \(xitoycha\): 中性笔/);
  });

  it('maydon yetishmasa yoki JSON buzuq — null (qolip koʻrsatiladi)', async () => {
    const yoq = await kartochkaYozBer({ kalit: 'K', fetchFn: soxtaFetch({ json: javob(JSON.stringify({ ...M, nom_ru: '' })) }, []) },
      { namuna: 'x', turkum: null, xitoy: null });
    expect(yoq).toBeNull();
    const buzuq = await kartochkaYozBer({ kalit: 'K', fetchFn: soxtaFetch({ json: javob('bu JSON emas') }, []) },
      { namuna: 'x', turkum: null, xitoy: null });
    expect(buzuq).toBeNull();
  });
});

describe('javobga munosabat (2026-10-15)', () => {
  const SOROV = {
    savol: 'Oldin savdo qilganmisiz?', xabar: 'oldin sotganman maishiy texnika', tushunilgan: 'Tushunarli — savdo tajribangiz bor ekan.',
    tayyor: null, bilim: null, holat: '- Hozir: 1-qadam «Tanishuv».', tarix: 'Mijoz: oldin sotganman maishiy texnika',
    keyingi: 'Qaysi sohadagi tovarlar sizga yaqin?', til: 'uz' as const, tuzat: null, savolBor: false,
  };

  it('korsatma: keyingi savolni bermaydi, raqam va vaʼda yoʻq; soʻrovda tushunilgan va keyingi savol', async () => {
    expect(MUNOSABAT_KORSATMA).toMatch(/Keyingi savolni BERMA/);
    expect(MUNOSABAT_KORSATMA).toMatch(/Yangi raqam oʻylab topma/);
    expect(MUNOSABAT_KORSATMA).toMatch(/vaʼda qilma/);
    const y: Yozuv[] = [];
    const r = await munosabatBer({ kalit: 'K', fetchFn: soxtaFetch({ json: JAVOB }, y) }, SOROV);
    expect(r).toBe('Salom! Qancha pul ajratasiz?');
    const matn = (y[0]!.tana as { contents: Array<{ parts: Array<{ text: string }> }> }).contents[0]!.parts[0]!.text;
    expect(matn).toMatch(/TUSHUNILGAN \(dastur javobni shunday tushundi\): Tushunarli/);
    expect(matn).toMatch(/KEYINGI SAVOL \(uni dastur oʻzi beradi — sen takrorlama\): Qaysi sohadagi/);
    expect(matn).toMatch(/ODAM YOZDI: oldin sotganman maishiy texnika$/);
    expect(matn).not.toMatch(/FAKTLAR|DASTUR JAVOBI|SAVOL HAM BERDI/);
    expect((y[0]!.tana.generationConfig as Record<string, unknown>).thinkingConfig).toEqual({ thinkingLevel: 'low' });
  });

  it('gapda savol: bazada javob boʻlsa — «dastur oʻzi qoʻshadi», takrorlamaydi; rus tilida yozsa — rus tilida', async () => {
    const y: Yozuv[] = [];
    await munosabatBer({ kalit: 'K', fetchFn: soxtaFetch({ json: JAVOB }, y) },
      { ...SOROV, bilim: 'Faktlar roʻyxati', tayyor: 'Yoʻnalish qadamida koʻrsataman.', til: 'ru', savolBor: true });
    const matn = (y[0]!.tana as { contents: Array<{ parts: Array<{ text: string }> }> }).contents[0]!.parts[0]!.text;
    expect(matn).toMatch(/FAKTLAR:\nFaktlar roʻyxati/);
    expect(matn).toMatch(/DASTUR JAVOBI \(gapdagi savolga; buni dastur oʻzi qoʻshadi — takrorlama\): Yoʻnalish qadamida/);
    expect(matn).not.toMatch(/SAVOL HAM BERDI/);
    expect(matn).toMatch(/JAVOB TILI: rus tili/);
  });

  it('gapda savol, bazada javob yoʻq — AI ga «albatta javob ber»', async () => {
    const y: Yozuv[] = [];
    await munosabatBer({ kalit: 'K', fetchFn: soxtaFetch({ json: JAVOB }, y) }, { ...SOROV, bilim: 'Faktlar', savolBor: true });
    const matn = (y[0]!.tana as { contents: Array<{ parts: Array<{ text: string }> }> }).contents[0]!.parts[0]!.text;
    expect(matn).toMatch(/ODAM GAPIDA SAVOL HAM BERDI — unga albatta qisqa, aniq javob ber\./);
    expect(MUNOSABAT_KORSATMA).toMatch(/Savolni eʼtiborsiz qoldirma/);
  });
});
