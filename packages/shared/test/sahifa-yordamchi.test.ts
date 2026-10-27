/**
 * Sahifa yordamchisi — «Savol bering» (nazoratchi, 2026-10-19: «Har sahifada AI yordamchi»).
 *
 * NEGA BU TESTLAR BOR. Bosh sahifa, kirish, maxfiylik va «Rejalar» da odam istalgan
 * savolni yozadi. AI javobi darvozadan oʻtadi (raqam faqat faktlardan, kafolat yoʻq,
 * til — odamniki); oʻtmasa yoki yiqilsa — vaqt qolguncha qayta (uch martagacha), baribir
 * yozolmasa — qisqa uzr: TAYYOR JAVOB YOʻQ (nazoratchi, 2026-10-26: «AI hamma joyda javob
 * bersin, tayyor javoblar shartmas»). AI umuman ulanmagan boʻlsa — bazadagi javob yoki umumiy
 * gap. Brauzerdan kelgan tarix tekshiriladi.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SAHIFA_KORSATMA, SAHIFA_TAVSIFI, sahifaJavobi, sahifaSoroviMatni, sahifaTarixi, type SahifaSorovi,
} from '../src/sahifa-yordamchi';
import { AI_YOZ_KORSATMA, aiUzr, SAYT_NOMLARI } from '../src/ai-suhbat';
import { tayyorJavob } from '../src/erkin';

/** Soxta AI: soʻrovlarni yozadi, javoblarni navbat bilan qaytaradi (oxirgisi takrorlanadi). */
function soxta(javoblar: Array<string | null>) {
  const sorovlar: SahifaSorovi[] = [];
  const ai = async (k: SahifaSorovi) => {
    sorovlar.push(k);
    return javoblar[Math.min(sorovlar.length - 1, javoblar.length - 1)] ?? null;
  };
  return { ai, sorovlar };
}

const K = { sahifa: 'bosh' as const, tarix: [], holat: null };

describe('sahifa yordamchisi', () => {
  it('AI javobi darvozadan oʻtsa — u; soʻrovda sahifa, faktlar va tayyor javob', async () => {
    const s = soxta(['ZumSavdo sizni 12 qadamda olib boradi — nima sotishni tanlashdan Uzumda sotishgacha.']);
    const r = await sahifaJavobi({ ai: s.ai }, { ...K, savol: 'ZumSavdo nima qiladi?' });
    expect(r).toEqual({ matn: 'ZumSavdo sizni 12 qadamda olib boradi — nima sotishni tanlashdan Uzumda sotishgacha.', manba: 'ai' });
    expect(s.sorovlar[0]!.sahifa).toBe('bosh');
    expect(s.sorovlar[0]!.bilim.length).toBeGreaterThan(100);
    expect(s.sorovlar[0]!.til).toBe('uz');
  });

  it('AI raqam toʻqisa — sababi bilan qayta (uch martagacha); baribir toʻqisa — uzr, bazadagi tayyor javob emas', async () => {
    const s = soxta(['Obuna atigi 7 777 soʻm.']);
    const r = await sahifaJavobi({ ai: s.ai }, { ...K, sahifa: 'obuna', savol: 'Bu bepulmi?' });
    expect(s.sorovlar).toHaveLength(3);
    expect(s.sorovlar[1]!.tuzat).toContain('7 777');
    expect(r).toEqual({ matn: aiUzr('uz'), manba: 'shablon' });
    // Bazadagi javob AI ga fakt boʻlib boradi — mijozga oʻzi chiqmaydi.
    expect(s.sorovlar[0]!.tayyor).toBeTruthy();
  });

  it('oqim (2026-10-20): qoralama darhol; oʻtmasa — «qayta», yangisi; hech biri oʻtmasa — har biridan keyin «qayta»', async () => {
    const h: string[] = [];
    const oqim = { qism: (m: string) => { h.push(`qism:${m}`); }, qayta: () => { h.push('qayta'); } };
    // AI yozayotganda qism chaqiradi (yarmi, keyin hammasi), soʻng javobni qaytaradi.
    const oqimli = (javoblar: string[]) => {
      let n = 0;
      return async (_k: SahifaSorovi, _ms: number, qism?: (m: string) => void) => {
        const j = javoblar[Math.min(n++, javoblar.length - 1)]!;
        qism?.(j.slice(0, 5));
        qism?.(j);
        return j;
      };
    };
    const yaxshi = 'Hozir hamma qadam bepul.';
    const r = await sahifaJavobi({ ai: oqimli(['Obuna atigi 7 777 soʻm.', yaxshi]), oqim }, { ...K, sahifa: 'obuna', savol: 'Bu bepulmi?' });
    expect(r).toEqual({ matn: yaxshi, manba: 'ai' });
    expect(h).toEqual(['qism:Obuna', 'qism:Obuna atigi 7 777 soʻm.', 'qayta', 'qism:Hozir', `qism:${yaxshi}`]);

    h.length = 0;
    const r2 = await sahifaJavobi({ ai: oqimli(['Obuna atigi 7 777 soʻm.']), oqim }, { ...K, sahifa: 'obuna', savol: 'Bu bepulmi?' });
    expect(r2).toEqual({ matn: aiUzr('uz'), manba: 'shablon' });
    expect(h.filter((x) => x === 'qayta')).toHaveLength(3);
    expect(h.at(-1)).toBe('qayta');
  });

  it('oqim: qoralama chiqqan-u, AI oxirida yiqilsa — «qayta» va yana urinish; baribir — uzr', async () => {
    const h: string[] = [];
    const oqim = { qism: (m: string) => { h.push(`qism:${m}`); }, qayta: () => { h.push('qayta'); } };
    const ai = async (_k: SahifaSorovi, _ms: number, qism?: (m: string) => void) => { qism?.('Obuna'); return null; };
    const r = await sahifaJavobi({ ai, oqim }, { ...K, sahifa: 'obuna', savol: 'Bu bepulmi?' });
    expect(r).toEqual({ matn: aiUzr('uz'), manba: 'shablon' });
    expect(h).toEqual(['qism:Obuna', 'qayta', 'qism:Obuna', 'qayta', 'qism:Obuna', 'qayta']);
  });

  it('kafolat yozsa — oʻtmaydi', async () => {
    const s = soxta(['Kafolat beraman — foyda boʻladi.', 'Foyda vaʼda qilolmayman, lekin yoʻlni birga oʻtamiz.']);
    const r = await sahifaJavobi({ ai: s.ai }, { ...K, savol: 'foyda boʻladimi?' });
    expect(s.sorovlar[1]!.tuzat).toContain('kafolat');
    expect(r).toEqual({ matn: 'Foyda vaʼda qilolmayman, lekin yoʻlni birga oʻtamiz.', manba: 'ai' });
  });

  it('ruscha savol — ruscha javob talab qilinadi; lotincha javob qaytariladi', async () => {
    const s = soxta(['ZumSavdo yordam beradi.', 'ZumSavdo помогает пройти путь до продаж на Uzum.']);
    const r = await sahifaJavobi({ ai: s.ai }, { ...K, savol: 'Что делает ZumSavdo?' });
    expect(s.sorovlar[0]!.til).toBe('ru');
    expect(s.sorovlar[1]!.tuzat).toContain('rus tilida');
    expect(r.manba).toBe('ai');
  });

  it('rus sahifasida raqamli savol («?») — javob ruscha', async () => {
    const s = soxta(['Подскажу по шагам.']);
    await sahifaJavobi({ ai: s.ai }, { ...K, savol: '???', til: 'ru' });
    expect(s.sorovlar[0]!.til).toBe('ru');
  });

  it('AI yoʻq — bazadagi javob; u ham boʻlmasa — umumiy gap (javobsiz qolmaydi)', async () => {
    const r1 = await sahifaJavobi({ ai: null }, { ...K, savol: 'Bu bepulmi?' });
    expect(r1.manba).toBe('baza');
    const r2 = await sahifaJavobi({ ai: null }, { ...K, savol: 'qwerty zxcv' });
    expect(r2.manba).toBe('shablon');
    expect(r2.matn).toContain('«Yoʻlni boshlash»');
    const r3 = await sahifaJavobi({ ai: null }, { ...K, savol: 'йцукен фыва' });
    expect(r3.matn).toContain('«Начать путь»');
  });

  it('AI yiqilsa (null yoki xato) — uch marta urinadi, keyin uzr (ruscha savolga — ruscha); bazadagi javob emas', async () => {
    let n = 0;
    const r = await sahifaJavobi({ ai: async () => { n++; throw new Error('tarmoq'); } }, { ...K, savol: 'Bu bepulmi?' });
    expect(n).toBe(3);
    expect(r).toEqual({ matn: aiUzr('uz'), manba: 'shablon' });
    const r2 = await sahifaJavobi({ ai: async () => null }, { ...K, savol: 'Это бесплатно?' });
    expect(r2).toEqual({ matn: aiUzr('ru'), manba: 'shablon' });
  });

  it('har urinish umumiy vaqtga sigʻadi (Vercel 60 s): vaqt tugasa — yana urinmaydi', async () => {
    const vaqtlar: number[] = [];
    const ai = async (_k: SahifaSorovi, ms: number) => { vaqtlar.push(ms); return null; };
    await sahifaJavobi({ ai }, { ...K, savol: 'Bu bepulmi?' });
    expect(vaqtlar).toHaveLength(3);
    for (const v of vaqtlar) expect(v).toBeLessThanOrEqual(25_000);
  });

  afterEach(() => { vi.useRealTimers(); });
  it('sekin AI (har urinish 24 s): ikkinchisiga qolgan vaqt, uchinchisiga vaqt yetmaydi — uzr (50 s ichida)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const vaqtlar: number[] = [];
    const ai = async (_k: SahifaSorovi, ms: number) => { vaqtlar.push(ms); vi.setSystemTime(Date.now() + 24_000); return null; };
    const r = await sahifaJavobi({ ai }, { ...K, savol: 'Bu bepulmi?' });
    expect(vaqtlar).toEqual([25_000, 24_000]);
    expect(r).toEqual({ matn: aiUzr('uz'), manba: 'shablon' });
  });

  it('soʻrov matni: sahifa tavsifi, mijoz holati, oldingi savol-javoblar', () => {
    const m = sahifaSoroviMatni({
      savol: 'qaysi biri yaxshi?', sahifa: 'obuna', bilim: 'FAKT', tayyor: null, til: 'uz', tuzat: null,
      holat: '- Hozir: 2-qadam', tarix: [{ rol: 'mijoz', matn: 'salom' }, { rol: 'yordamchi', matn: 'Vaalaykum assalom!' }],
    });
    expect(m).toContain(SAHIFA_TAVSIFI.obuna);
    expect(m).toContain('MIJOZ HOLATI (u yordamchi suhbatida shu yerda):\n- Hozir: 2-qadam');
    expect(m).toContain('Odam: salom\nYordamchi: Vaalaykum assalom!');
    expect(m.endsWith('ODAM YOZDI: qaysi biri yaxshi?')).toBe(true);
  });

  it('brauzerdan kelgan tarix tekshiriladi: notoʻgʻrisi tashlanadi, oxirgi 6 tasi, 500 belgigacha', () => {
    expect(sahifaTarixi('x')).toEqual([]);
    expect(sahifaTarixi([{ rol: 'admin', matn: 'x' }, { rol: 'mijoz', matn: 5 }, null, { rol: 'mijoz', matn: 'ha' }]))
      .toEqual([{ rol: 'mijoz', matn: 'ha' }]);
    const kop = Array.from({ length: 9 }, (_, i) => ({ rol: 'mijoz', matn: `${i}`.repeat(600) }));
    const t = sahifaTarixi(kop);
    expect(t).toHaveLength(6);
    expect(t[0]!.matn).toBe('3'.repeat(500));
  });

  it('sayt nomlari — AI tarjima qilib toʻqimasin (jonli sinov, 2026-10-20: «Рејаларни солиштириш»)', () => {
    expect(SAYT_NOMLARI).toContain('«Rejalarni solishtirish»');
    expect(SAYT_NOMLARI).toContain('(«Сравнить тарифы»)');
    expect(SAYT_NOMLARI).toContain('(«Мой профиль»)');
    expect(SAHIFA_KORSATMA).toContain(SAYT_NOMLARI);
    expect(AI_YOZ_KORSATMA).toContain(SAYT_NOMLARI);
    // Boshlash — oynadagi havola nomi bilan; «Rejalar» suhbat ichida — boshlashni taklif qilmaydi.
    expect(SAHIFA_KORSATMA).toContain('«Yoʻlni boshlash» havolasi (rus tilida — «Начать путь»)');
    expect(SAHIFA_TAVSIFI.obuna).toContain('suhbatni boshlashni taklif');
    expect(SAHIFA_TAVSIFI.bosh).toContain('«Suhbatni boshlash»');
  });

  it('maxfiylik javobida eski provayder nomi yoʻq (Gemini → Claude, 2026-10-19)', () => {
    const j = tayyorJavob('telefon raqamim kimga ketadi?');
    expect(j).not.toBeNull();
    expect(`${j!.uz} ${j!.ru}`).not.toMatch(/Gemini/u);
  });
});
