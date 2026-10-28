/**
 * LLM adapteri (`llm.ts`) — provayder (Claude) orqali chaqiruvlar.
 *
 * NEGA BU TESTLAR BOR. 2026-10-28 (nazoratchi, 4-taklif: «eski Gemini yoʻllari olib
 * tashlanadi»): Gemini va eski yoʻllar (odamlashtir, erkin javob, munosabat) olib tashlandi —
 * endi faqat Claude provayderi. Bu yerda: provayder yoʻq boʻlsa hech narsa chaqirilmaydi va
 * `null` (kod javobi ketadi); kartochka javobi maydonlarga ajraladi, buzuq boʻlsa — `null`.
 * Soʻrov shakli (model, kesh, effort, sxema) — `llm-claude.test.ts` da.
 */

import { describe, expect, it } from 'vitest';
import { aiTushunBer, aiYozBer, kartochkaYozBer, sahifaJavobBer, type LlmChaqiruvi } from '../src/llm';

/** Soxta provayder: chaqiruvlarni yozadi, berilgan javobni qaytaradi. */
function soxta(javob: string | null) {
  const chaqiruvlar: LlmChaqiruvi[] = [];
  const provayder = async (c: LlmChaqiruvi) => { chaqiruvlar.push(c); return javob; };
  return { provayder, chaqiruvlar };
}

const SAHIFA = { savol: 'Bu bepulmi?', sahifa: 'bosh' as const, tarix: [], holat: null, bilim: 'B', tayyor: null, til: 'uz' as const, tuzat: null };

describe('provayder yoʻq (kalit yoʻq) — AI ishlamaydi', () => {
  it('hamma ish — null, hech narsa chaqirilmaydi (kod javobi ketadi)', async () => {
    expect(await sahifaJavobBer({ provayder: null }, SAHIFA)).toBeNull();
    expect(await kartochkaYozBer({ provayder: null }, { namuna: 'x', turkum: null, xitoy: null })).toBeNull();
    expect(await aiTushunBer({ provayder: null }, { savollar: [], xabar: 'x', holat: '-', tarix: '' })).toBeNull();
  });

  it('boʻsh matn — provayder chaqirilmaydi', async () => {
    const s = soxta('javob');
    expect(await sahifaJavobBer({ provayder: s.provayder }, { ...SAHIFA, savol: '   ' })).not.toBeNull();
    // Sahifa soʻrovi faktlar bilan — boʻsh emas; boʻsh soʻrov faqat AI yozishida boʻlmaydi.
    expect(s.chaqiruvlar).toHaveLength(1);
  });
});

describe('kartochka matni (10-qadam, 2026-10-13)', () => {
  const M = { nom_uz: 'Gel ruchka koʻk siyohli', nom_ru: 'Гелевая ручка синяя', qisqa_uz: 'q', qisqa_ru: 'к', tavsif_uz: 't', tavsif_ru: 'т' };

  it('JSON javob (``` bilan ham) — maydonlar; soʻrovda tovar nomlari, sxema bilan', async () => {
    const s = soxta(`\`\`\`json\n${JSON.stringify(M)}\n\`\`\``);
    const r = await kartochkaYozBer({ provayder: s.provayder }, { namuna: 'Gel ruchka 0,5 mm', turkum: 'Ruchkalar', xitoy: '中性笔' });
    expect(r).toEqual({ nomUz: M.nom_uz, nomRu: M.nom_ru, qisqaUz: 'q', qisqaRu: 'к', tavsifUz: 't', tavsifRu: 'т' });
    expect(s.chaqiruvlar[0]!.json).not.toBeNull();
    expect(s.chaqiruvlar[0]!.kuch).toBe('medium');
    expect(s.chaqiruvlar[0]!.matn).toMatch(/UZUMDAGI NAMUNA TOVAR NOMI: Gel ruchka 0,5 mm/);
    expect(s.chaqiruvlar[0]!.matn).toMatch(/1688 TAKLIFI NOMI \(xitoycha\): 中性笔/);
  });

  it('maydon yetishmasa yoki JSON buzuq — null (qolip koʻrsatiladi)', async () => {
    expect(await kartochkaYozBer({ provayder: soxta(JSON.stringify({ ...M, nom_ru: '' })).provayder }, { namuna: 'x', turkum: null, xitoy: null })).toBeNull();
    expect(await kartochkaYozBer({ provayder: soxta('bu JSON emas').provayder }, { namuna: 'x', turkum: null, xitoy: null })).toBeNull();
  });
});

describe('AI suhbat — javob shakli buzuq boʻlsa null', () => {
  it('tushunish va yozish: JSON emas — null (kod yoʻli ketadi)', async () => {
    expect(await aiTushunBer({ provayder: soxta('JSON emas').provayder }, { savollar: [], xabar: 'x', holat: '-', tarix: '' })).toBeNull();
    expect(await aiYozBer({ provayder: soxta('{"oldin":"x"}').provayder }, {
      mijoz: null, tanlov: false, qabul: [], rad: [], eslab: [], savolBor: false, bilim: null, tayyor: null, natijalar: [],
      keyingi: null, keyingiMatn: 'Kutamiz', holat: '-', tarix: '', til: 'uz', bugun: '28.10.2026', tuzat: null,
    })).toBeNull();
  });
});
