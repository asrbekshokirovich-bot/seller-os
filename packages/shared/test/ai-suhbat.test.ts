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
  aiQiymat, aiTushunchaniOqi, aiUzr, aiYozMatni, aiYozuvniOqi, aiYozuvQismi, AI_TUSHUN_KORSATMA, AI_TUSHUN_SXEMA, AI_YOZ_KORSATMA,
  AI_YOZ_SXEMA, ixcham, natijaTavsifi, savolTavsifi, type AiYozSorovi,
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
  keyingi: SAVOL, keyingiMatn: null, holat: '- Hozir: 1-qadam', tarix: '', til: 'uz', bugun: '20.10.2026', tuzat: null,
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

  it('yozuv: «batafsil» — boʻlsa oʻqiladi, boʻsh boʻlsa yozilmaydi (2026-10-27)', () => {
    expect(aiYozuvniOqi('{"oldin":"Ha.","izoh":"","savol":"S?","batafsil":" Uzun tushuntirish. "}'))
      .toEqual({ oldin: 'Ha.', izoh: '', savol: 'S?', batafsil: 'Uzun tushuntirish.' });
    expect(aiYozuvniOqi('{"oldin":"Ha.","izoh":"","savol":"S?","batafsil":"  "}')).toEqual({ oldin: 'Ha.', izoh: '', savol: 'S?' });
  });

  it('koʻrsatma (3-taklif): koʻrinadigan qism 1–2 jumla, uzuni — batafsil da', () => {
    expect(AI_YOZ_KORSATMA).toMatch(/HAR BIRI\n?\s*1–2 QISQA JUMLA/u);
    expect(AI_YOZ_KORSATMA).toMatch(/- batafsil: kerak boʻlsa — toʻliq tushuntirish/u);
    expect(AI_YOZ_KORSATMA).not.toMatch(/har qism odatda 1–4 jumla/u);
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
    // Bugun — muddatlar haqida rost gapirsin (2026-10-20).
    expect(m).toContain('BUGUN: 20.10.2026 (Toshkent vaqti).');
    const ru = aiYozMatni({ ...YOZ, mijoz: 'Ha', tanlov: true, til: 'ru', tuzat: 'juda uzun.', rad: ['«X» — sabab'] });
    expect(ru).toContain('MIJOZ TUGMANI BOSDI: «Ha»');
    expect(ru).toContain('JAVOB TILI: rus tili');
    expect(ru).toContain('QABUL QILINMADI:\n- «X» — sabab');
    expect(ru).toContain('OLDINGI JAVOBING QAYTARILDI: juda uzun.');
    expect(aiYozMatni({ ...YOZ, keyingi: null, keyingiMatn: '1688 dan qidiryapman' })).toContain('KEYINGI QADAM (savol emas): 1688 dan qidiryapman');
  });

  it('yozish: mijoz ismi maʼlum boʻlsa — ismi bilan murojaat (2026-10-21); boʻlmasa — qator yoʻq', () => {
    expect(aiYozMatni({ ...YOZ, ism: 'Aziz' })).toContain('MIJOZ ISMI: Aziz');
    expect(aiYozMatni(YOZ)).not.toContain('MIJOZ ISMI');
    expect(aiYozMatni({ ...YOZ, ism: null })).not.toContain('MIJOZ ISMI');
  });

  it('oʻtkazish: faqat ruxsat boʻlsa tilga olinadi (jonli sinov 2026-10-21: soxta «Oʻtkazib yuborish» tugmasi, keyin har savolga «javob shart»)', () => {
    const majburiy: SuhbatSavoli = { ...SAVOL, id: 'telefon', turi: 'matn', variantlar: [], otkazishMumkin: false };
    // Majburiy savol tavsifida oʻtkazish haqida hech narsa yoʻq — AI uni mijozga takrorlamasin.
    expect(savolTavsifi(majburiy)).not.toContain('oʻtkazib');
    expect(savolTavsifi(SAVOL)).toContain('oʻtkazib yuborsa boʻladi');
    expect(AI_YOZ_KORSATMA).toContain('Savolni oʻtkazib yuborish haqida FAQAT uning tavsifida');
    expect(AI_YOZ_KORSATMA).toContain('oʻtkazish haqida umuman gapirma');
    expect(AI_YOZ_KORSATMA).toContain('Ichki boʻlim nomlari (FAKTLAR, MIJOZ HOLATI');
    expect(AI_YOZ_KORSATMA).toContain('SUHBATda javob bergan savolingga qayta javob berma');
  });

  it('tushunish koʻrsatmasi: ism/telefon — ajrat, salom va savolni qoʻshma, savol_bor (2026-10-21)', () => {
    expect(AI_TUSHUN_KORSATMA).toContain('- ism (ism-familiya va telefon)');
    expect(AI_TUSHUN_KORSATMA).toContain('Salomlashish, savol va boshqa gaplarni QOʻSHMA');
    expect(AI_TUSHUN_KORSATMA).toContain('- telefon: qiymatlar = [mijoz yozgan telefon raqami, aynan]');
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

  it('sxemalar — hamma maydon majburiy, ortiqchasi yoʻq (structured outputs); «batafsil» oxirida', () => {
    expect(AI_YOZ_SXEMA.required).toEqual(['oldin', 'izoh', 'savol', 'batafsil']);
    // Koʻrinadigan qismlar oldin yoziladi — oqimda birinchi chiqadi.
    expect(Object.keys(AI_YOZ_SXEMA.properties as object)).toEqual(['oldin', 'izoh', 'savol', 'batafsil']);
    expect(AI_YOZ_SXEMA.additionalProperties).toBe(false);
    expect(AI_TUSHUN_SXEMA.required).toEqual(['javoblar', 'taklif_qiziqish', 'savol_bor']);
    expect(AI_TUSHUN_SXEMA.additionalProperties).toBe(false);
  });
});

describe('aiYozuvQismi — yozilayotgan xabar (oqim, 2026-10-20)', () => {
  const TOLIQ = JSON.stringify({
    oldin: 'Rahmat! «Kiyim» — yaxshi tanlov.\nKeyin hisoblaymiz.',
    izoh: 'Bu yerda 3 ta yoʻnalish: narxi 120 000 soʻmdan.',
    savol: 'Qancha pul ajratasiz? 😀',
  });

  it('har bir boshlanishda (har belgi): qismlar oxirgisining boshi; oxirida — aiYozuvniOqi bilan bir xil', () => {
    const oxiri = aiYozuvniOqi(TOLIQ)!;
    for (let n = 0; n <= TOLIQ.length; n++) {
      const q = aiYozuvQismi(TOLIQ.slice(0, n));
      for (const k of ['oldin', 'izoh', 'savol'] as const) {
        expect(oxiri[k].startsWith(q[k]), `${n} ${k}: «${q[k]}»`).toBe(true);
      }
    }
    expect(aiYozuvQismi(TOLIQ)).toEqual(oxiri);
  });

  it('escape lar (yangi qator, qoʻshtirnoq, teskari chiziq, u-kod); chala escape va yarim emoji — tashlanadi', () => {
    const T = String.fromCharCode(92);
    const j = (s: string) => s.replaceAll('~', T);
    expect(aiYozuvQismi(j('{"oldin":"a~nb ~"c~" ~~ ~u0067oz","izoh":"","savol":"s"}')))
      .toEqual({ oldin: `a${String.fromCharCode(10)}b "c" ${T} goz`, izoh: '', savol: 's' });
    expect(aiYozuvQismi(j('{"oldin":"abc~')).oldin).toBe('abc');
    expect(aiYozuvQismi(j('{"oldin":"abc~u00')).oldin).toBe('abc');
    // Emoji ikki yarimdan (~ud83d~ude00): faqat birinchi yarmi kelgan — koʻrsatilmaydi.
    expect(aiYozuvQismi(j('{"oldin":"ok ~ud83d')).oldin).toBe('ok');
    expect(aiYozuvQismi(j('{"oldin":"ok ~ud83d~ude00"')).oldin).toBe(`ok ${String.fromCodePoint(0x1f600)}`);
  });

  it('boʻsh joylar, notanish kalit, tartib boshqacha — baribir; kutilmagan shakl — bor qismlar qaytadi', () => {
    expect(aiYozuvQismi(' {\n "savol" : "S?",\n "boshqa": "x", "oldin": "O"')).toEqual({ oldin: 'O', izoh: '', savol: 'S?' });
    expect(aiYozuvQismi('')).toEqual({ oldin: '', izoh: '', savol: '' });
    expect(aiYozuvQismi('{"oldin":"A","son":5,"savol":"B"}')).toEqual({ oldin: 'A', izoh: '', savol: '' });
  });
});

/*
 * 2026-10-26 (nazoratchi: «AI hamma joyda javob bersin, tayyor javoblar shartmas»): AI baribir
 * yozolmaganda — yagona tayyor gap, qisqa uzr. U savolga javob bermaydi va tilida boʻladi.
 */
describe('aiUzr', () => {
  it('qisqa, rost: javob bermaydi, qayta yozishni soʻraydi; mijoz tilida', () => {
    expect(aiUzr('uz')).toBe('Kechirasiz, hozir javob yoza olmadim — birozdan keyin qayta yozing.');
    expect(aiUzr('uz', true)).toBe('Javobingizni yozib oldim. Kechirasiz, savolingizga hozir javob yoza olmadim — birozdan keyin qayta soʻrang.');
    expect(aiUzr('ru')).toMatch(/^Извините/);
    expect(aiUzr('ru', true)).toMatch(/^Ваш ответ записал\./);
    expect(aiUzr('uz-kirill')).toMatch(/^Кечирасиз/);
    expect(aiUzr('uz-kirill', true)).toMatch(/^Жавобингизни ёзиб олдим\./);
  });
});
