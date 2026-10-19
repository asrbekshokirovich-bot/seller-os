/**
 * AI suhbat — koʻrsatma, soʻrov matni, JSON sxema va javobni oʻqish (`ai-suhbat.ts`),
 * provayderga chaqiruv (`llm.ts`: `aiTushunBer`, `aiYozBer`).
 *
 * NEGA BU TESTLAR BOR. Nazoratchi (2026-10-19): suhbatni AI olib borsin — mijoz
 * gapini tushunsin, har xabarni yozsin, natijani tushuntirsin. AI javobi JSON:
 * shakli buzuq boʻlsa — `null` (kod qoliplari), notoʻgʻri qiymat kodga yetmasin.
 * AI ga havola, rasm va kalit ketmasin; natijadagi raqamlar unga koʻrinsin
 * (darvoza ularni manba deb biladi).
 */

import { describe, expect, it } from 'vitest';
import {
  aiQiymat, aiTushunchaniOqi, aiYozMatni, aiYozuvniOqi, AI_TUSHUN_SXEMA, AI_YOZ_SXEMA, ixcham, natijaTavsifi, savolTavsifi,
  type AiYozSorovi,
} from '../src/ai-suhbat';
import { aiTushunBer, aiYozBer, type LlmChaqiruvi } from '../src/llm';
import type { SuhbatSavoli } from '../src/ssenariy';

const SAVOL: SuhbatSavoli = {
  id: 'qiziqish', qadam: 1, matn: 'Qaysi sohadagi tovarlar sizga yaqin?', turi: 'kopTanlov',
  variantlar: [{ qiymat: 'kiyim', nom: 'Kiyim va poyabzal' }, { qiymat: 'bilmayman', nom: 'Bilmayman' }],
  erkin: true, otkazishMumkin: true, profilMaydoni: null, tanlangan: ['kiyim'],
};

const YOZ: AiYozSorovi = {
  mijoz: null, tanlov: false, qabul: [], rad: [], eslab: [], savolBor: false, bilim: null, tayyor: null, natijalar: [],
  keyingi: SAVOL, keyingiMatn: null, holat: '- Hozir: 1-qadam', tarix: '', til: 'uz', tuzat: null,
};

describe('javobni oʻqish', () => {
  it('tushuncha: JSON (``` oʻrami bilan ham); shakli buzuq — null', () => {
    const t = aiTushunchaniOqi('```json\n{"javoblar":[{"savol_id":"byudjet","qiymatlar":["70 mln"],"otkazish":false}],"taklif_qiziqish":["kiyim"],"savol_bor":true}\n```');
    expect(t).toEqual({ javoblar: [{ savol_id: 'byudjet', qiymatlar: ['70 mln'], otkazish: false }], taklif_qiziqish: ['kiyim'], savol_bor: true });
    expect(aiTushunchaniOqi('salom')).toBeNull();
    expect(aiTushunchaniOqi('{"javoblar":[]}')).toBeNull();
    expect(aiTushunchaniOqi('[]')).toBeNull();
    // Buzuq javob elementi tashlanadi, qolgani qoladi; taklif boʻlmasa — boʻsh.
    expect(aiTushunchaniOqi('{"javoblar":[{"savol_id":1},{"savol_id":"x","qiymatlar":[5]}],"savol_bor":false}'))
      .toEqual({ javoblar: [{ savol_id: 'x', qiymatlar: ['5'], otkazish: false }], taklif_qiziqish: [], savol_bor: false });
  });

  it('yozuv: uch qism, boʻsh joylar kesiladi; savol yoʻq — null', () => {
    expect(aiYozuvniOqi('{"oldin":" Zoʻr! ","izoh":"","savol":"Qaysi soha?"}')).toEqual({ oldin: 'Zoʻr!', izoh: '', savol: 'Qaysi soha?' });
    expect(aiYozuvniOqi('{"oldin":"x"}')).toBeNull();
    expect(aiYozuvniOqi('{"oldin":5,"savol":"S?"}')).toEqual({ oldin: '', izoh: '', savol: 'S?' });
    expect(aiYozuvniOqi('buzuq')).toBeNull();
  });

  it('qiymat: koʻp tanlov — roʻyxat, boshqasi — birinchisi; oʻtkazish faqat ruxsat boʻlsa', () => {
    expect(aiQiymat(SAVOL, { savol_id: 'qiziqish', qiymatlar: ['kiyim', ' '], otkazish: false })).toEqual(['kiyim']);
    expect(aiQiymat({ ...SAVOL, turi: 'son' }, { savol_id: 'qiziqish', qiymatlar: [' 70 mln ', '80'], otkazish: false })).toBe('70 mln');
    expect(aiQiymat(SAVOL, { savol_id: 'qiziqish', qiymatlar: [], otkazish: true })).toBeNull();
    expect(aiQiymat({ ...SAVOL, otkazishMumkin: false }, { savol_id: 'qiziqish', qiymatlar: [], otkazish: true })).toBeUndefined();
    expect(aiQiymat(SAVOL, { savol_id: 'qiziqish', qiymatlar: ['  '], otkazish: false })).toBeUndefined();
  });
});

describe('soʻrov matni', () => {
  it('savol tavsifi: id, turi, variantlar (qiymat = nom), oldindan belgilangan', () => {
    const t = savolTavsifi(SAVOL, 2);
    expect(t).toContain('2) id: qiziqish (1-qadam), turi: kopTanlov, oʻzi yozsa ham boʻladi, oʻtkazib yuborsa boʻladi');
    expect(t).toContain('Variantlar: kiyim = «Kiyim va poyabzal»; bilmayman = «Bilmayman»');
    expect(t).toContain('Oldindan belgilangan: kiyim');
  });

  it('yozish: mijoz yubormagan boʻlsa — shuni aytadi; til va tuzatish', () => {
    const m = aiYozMatni(YOZ);
    expect(m).toContain('MIJOZ hozir hech narsa yozmadi');
    expect(m).toContain('YANGI NATIJALAR: yoʻq.');
    expect(m).toContain('KEYINGI SAVOL:\nid: qiziqish');
    expect(m).not.toContain('JAVOB TILI');
    const ru = aiYozMatni({ ...YOZ, mijoz: 'Ha', tanlov: true, til: 'ru', tuzat: 'juda uzun.', rad: ['«X» — sabab'] });
    expect(ru).toContain('MIJOZ TUGMANI BOSDI: «Ha»');
    expect(ru).toContain('JAVOB TILI: rus tili');
    expect(ru).toContain('QABUL QILINMADI:\n- «X» — sabab');
    expect(ru).toContain('OLDINGI JAVOBING QAYTARILDI: juda uzun.');
    expect(aiYozMatni({ ...YOZ, keyingi: null, keyingiMatn: '1688 dan qidiryapman' })).toContain('KEYINGI QADAM (savol emas): 1688 dan qidiryapman');
  });

  it('natija: yoʻnalishlar — kartadagi qatorlar; boshqasi — ixcham maʼlumot (havola, rasm, kalitsiz)', () => {
    const y = natijaTavsifi('yonalishlar', {
      olchov_yoq: false, qiziqishlar: ['kiyim'], nomzod_soni: 300,
      royxat: [{ categoryId: 11, name: 'Ayollar potinkasi', soha: 'kiyim', yetadi: true, optimalKirishSom: 40_000_000, ball: { value: 71 } }],
    });
    expect(y).toContain('Dastur xulosasi: Uzumda nima yaxshi sotilayotganini tekshirdim.');
    expect(y).toContain('· «Ayollar potinkasi» (Kiyim va poyabzal) — 71 ball: boshlash uchun taxminan 40 000 000 soʻm, pul yetadi');
    const b = natijaTavsifi('buyurtma', { jami: 12_000_000, rasmUrl: 'https://x/y.jpg', qatorlar: [{ nom: 'A', havola: 'https://1688.com/1' }] });
    expect(b).toContain('"jami":12000000');
    expect(b).not.toContain('https');
    expect(b).not.toContain('rasmUrl');
  });

  it('ixcham: uzun matn kesiladi, roʻyxatdan 8 tasi, chuqurligi 4 qavat', () => {
    expect(ixcham('x'.repeat(130))).toBe(`${'x'.repeat(120)}…`);
    expect((ixcham(Array.from({ length: 20 }, (_, i) => i)) as unknown[]).length).toBe(8);
    expect(ixcham({ a: { b: { c: { d: { e: 1 } } } } })).toEqual({ a: { b: { c: {} } } });
    expect(ixcham({ token: 't', kalit: 'k', url: 'u', narx: 5 })).toEqual({ narx: 5 });
  });
});

describe('provayderga chaqiruv', () => {
  function soxta(javob: string | null) {
    const c: LlmChaqiruvi[] = [];
    return { c, provayder: async (x: LlmChaqiruvi) => { c.push(x); return javob; } };
  }

  it('tushunish: sxema bilan, oʻylash low, vaqt — berilgani; javob oʻqiladi', async () => {
    const s = soxta('{"javoblar":[],"taklif_qiziqish":[],"savol_bor":true}');
    const t = await aiTushunBer({ kalit: null, provayder: s.provayder, vaqtMs: 9_000 },
      { savollar: [SAVOL], xabar: 'bu nima?', holat: '', tarix: '' });
    expect(t).toEqual({ javoblar: [], taklif_qiziqish: [], savol_bor: true });
    expect(s.c[0]!.json).toBe(AI_TUSHUN_SXEMA);
    expect(s.c[0]!.kuch).toBe('low');
    expect(s.c[0]!.vaqtMs).toBe(9_000);
    expect(s.c[0]!.belgi).toBe('ai-tushun');
    expect(s.c[0]!.matn).toContain('MIJOZ YOZDI: bu nima?');
  });

  it('yozish: sxema bilan; standart vaqt 30 s; buzuq JSON yoki javob yoʻq — null', async () => {
    const s = soxta('{"oldin":"","izoh":"","savol":"Qaysi soha?"}');
    expect(await aiYozBer({ kalit: null, provayder: s.provayder }, YOZ)).toEqual({ oldin: '', izoh: '', savol: 'Qaysi soha?' });
    expect(s.c[0]!.json).toBe(AI_YOZ_SXEMA);
    expect(s.c[0]!.vaqtMs).toBe(30_000);
    expect(await aiYozBer({ kalit: null, provayder: soxta('buzuq').provayder }, YOZ)).toBeNull();
    expect(await aiYozBer({ kalit: null, provayder: soxta(null).provayder }, YOZ)).toBeNull();
    expect(await aiTushunBer({ kalit: null, provayder: soxta('{}').provayder }, { savollar: [SAVOL], xabar: 'x', holat: '', tarix: '' })).toBeNull();
  });

  it('sxemalar — hamma maydon majburiy, ortiqchasi yoʻq (structured outputs)', () => {
    expect(AI_YOZ_SXEMA.required).toEqual(['oldin', 'izoh', 'savol']);
    expect(AI_YOZ_SXEMA.additionalProperties).toBe(false);
    expect(AI_TUSHUN_SXEMA.required).toEqual(['javoblar', 'taklif_qiziqish', 'savol_bor']);
    expect(AI_TUSHUN_SXEMA.additionalProperties).toBe(false);
  });
});
