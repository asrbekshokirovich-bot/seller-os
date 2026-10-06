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
import { erkinJavobBer, odamlashtir } from '../src/llm';

interface Yozuv { url: string; tana: Record<string, unknown>; sarlavha: Record<string, string> }

function soxtaFetch(javob: { status?: number; json: unknown }, yozuvlar: Yozuv[]): typeof fetch {
  return (async (url: string, init?: RequestInit) => {
    yozuvlar.push({ url, tana: JSON.parse(String(init?.body)), sarlavha: init?.headers as Record<string, string> });
    return new Response(JSON.stringify(javob.json), { status: javob.status ?? 200 });
  }) as unknown as typeof fetch;
}

const JAVOB = { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Salom! ' }, { text: 'Qancha pul ajratasiz?' }] } }] };

describe('gemini soʻrovi', () => {
  it('standart model — gemini-3.5-flash; harorat yuborilmaydi; oʻylash minimal (odamlashtir)', async () => {
    const y: Yozuv[] = [];
    const r = await odamlashtir({ kalit: ' AIzaKALIT \n', fetchFn: soxtaFetch({ json: JAVOB }, y) }, 'Qancha pul ajratasiz?');
    expect(r).toBe('Salom! Qancha pul ajratasiz?');
    expect(y[0]!.url).toContain('/models/gemini-3.5-flash:generateContent');
    expect(y[0]!.sarlavha['x-goog-api-key']).toBe('AIzaKALIT');
    const gc = y[0]!.tana.generationConfig as Record<string, unknown>;
    expect(gc.temperature).toBeUndefined();
    expect(gc.thinkingConfig).toEqual({ thinkingLevel: 'minimal' });
    expect(gc.maxOutputTokens).toBeGreaterThanOrEqual(2048);
  });

  it('erkin javob — oʻylash low', async () => {
    const y: Yozuv[] = [];
    await erkinJavobBer({ kalit: 'AIzaKALIT', fetchFn: soxtaFetch({ json: JAVOB }, y) },
      { savol: 'Qancha?', variantlar: [], xabar: 'bu nima?', sabab: null, tayyor: null, bilim: 'faktlar' });
    expect((y[0]!.tana.generationConfig as Record<string, unknown>).thinkingConfig).toEqual({ thinkingLevel: 'low' });
  });

  it('LLM_MODEL bilan boshqa model; 2.x modelga thinkingLevel yuborilmaydi (u uni rad etadi)', async () => {
    const y: Yozuv[] = [];
    await odamlashtir({ kalit: 'K', model: 'gemini-3.8-flash', fetchFn: soxtaFetch({ json: JAVOB }, y) }, 'x');
    await odamlashtir({ kalit: 'K', model: 'gemini-2.5-flash', fetchFn: soxtaFetch({ json: JAVOB }, y) }, 'x');
    expect(y[0]!.url).toContain('/models/gemini-3.8-flash:');
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
