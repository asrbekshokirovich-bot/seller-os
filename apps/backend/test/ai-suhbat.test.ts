/**
 * AI SUHBAT — mijoz gapini AI tushunadi, xabarlarni AI yozadi, 12 qadam saqlanadi.
 *
 * NEGA BU TESTLAR BOR. Nazoratchi (2026-10-19): "LLM butun sayt uchun ishlasin,
 * mijoz faqat yozganda emas… hamma xabarni AI yozsin, javobni AI tushunsin,
 * natijani AI tushuntirsin; AI toʻliq erkin, lekin 12 ta qadam qolsin". Ilgari
 * «potinka sotganman» soʻzlar roʻyxatida yoʻq edi — soha belgilanmadi; bir gapda
 * aytilgan pul keyin yana soʻralardi.
 *
 * Bu yerda AI — soxta: soʻrovlarni yozib oladi va berilgan javobni qaytaradi.
 * Tekshiriladi: AI tushungan javobni KOD qabul qiladi (yoki rad etadi), navbatdagi
 * javob oʻz savoli kelganda olinadi, AI xabari darvozadan oʻtadi, AI yiqilsa —
 * kod qoliplari (LLM siz), ism va telefon AI ga ketmaydi, vaqt tugasa — AI siz.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  boshlangichHolat, keyingi, suhbatTurn,
  type AiTushuncha, type AiTushunSorovi, type AiYozSorovi, type AiYozuv, type SuhbatBogliqliklari, type YolHolati,
} from '@selleros/shared';

function soxtaBaza(boshlangich: YolHolati) {
  const k = keyingi(boshlangich);
  const jurnal: Array<{ rol: string; matn: string; savolId?: string; javob?: unknown }> =
    k.tur === 'savol' ? [{ rol: 'menejer', matn: k.savol.matn, savolId: k.savol.id }] : [];
  let holat: YolHolati = boshlangich;
  const rpc = async <T>(nom: string, arg: unknown): Promise<T | null> => {
    const a = arg as Record<string, unknown>;
    if (nom === 'so_suhbat_oqi') return { holat, qadam: null, xabarlar: jurnal } as T;
    if (nom === 'so_suhbat_yoz') {
      jurnal.push(...(a.p_xabarlar as typeof jurnal));
      holat = a.p_holat as YolHolati;
      return { yozildi: (a.p_xabarlar as unknown[]).length } as T;
    }
    return null;
  };
  return { rpc, jurnal, holat: () => holat };
}

const KURS = { olchov_yoq: false, usd: { somPerYuan: 12_650, valyuta: 'USD', sana: '12.10.2026', manba: 'CBU' } };
const YONALISHLAR = {
  olchov_yoq: false, qiziqishlar: ['kiyim'], nomzod_soni: 300,
  royxat: [
    { categoryId: 11, name: 'Ayollar potinkasi', soha: 'kiyim', yetadi: true, optimalKirishSom: 40_000_000, ball: { value: 71 } },
    { categoryId: 12, name: 'Sumkalar', soha: 'aksessuar', yetadi: true, optimalKirishSom: 30_000_000, ball: { value: 78 } },
  ],
};

/** Kod: dollar kursi va yoʻnalishlar — soxta; qolgani chaqirilmasligi kerak. */
const KOD = new Proxy({}, {
  get: (_, nom) => (nom === 'kurs' ? async () => KURS
    : nom === 'yonalishlar' ? async () => YONALISHLAR
      : nom === 'erkinMalumot' ? undefined
        : async () => { throw new Error(`bu testda kod chaqirilmasligi kerak: ${String(nom)}`); }),
});

/** Soxta AI: soʻrovlarni yozib oladi, javoblarni navbat bilan qaytaradi (oxirgisi takrorlanadi). */
function soxtaAi(tushunJavob: Array<AiTushuncha | null>, yozJavob: Array<AiYozuv | null>) {
  const tushunlar: Array<{ k: AiTushunSorovi; ms: number }> = [];
  const yozlar: Array<{ k: AiYozSorovi; ms: number }> = [];
  const ai = {
    tushun: async (k: AiTushunSorovi, ms: number) => {
      tushunlar.push({ k, ms });
      return tushunJavob[Math.min(tushunlar.length - 1, tushunJavob.length - 1)] ?? null;
    },
    yoz: async (k: AiYozSorovi, ms: number) => {
      yozlar.push({ k, ms });
      return yozJavob[Math.min(yozlar.length - 1, yozJavob.length - 1)] ?? null;
    },
  };
  return { ai, tushunlar, yozlar };
}

function bogliq(
  b: ReturnType<typeof soxtaBaza>, ai: NonNullable<SuhbatBogliqliklari['ai']> | null,
  qoshimcha: { munosabatLlm?: NonNullable<SuhbatBogliqliklari['munosabatLlm']> } = {},
): SuhbatBogliqliklari {
  return { rpc: b.rpc, kod: KOD as SuhbatBogliqliklari['kod'], ai, ...qoshimcha };
}

const SHAXS = { ism: 'Aziz Karimov', telefon: '+998901234567' };
/** Tajriba savoli (`uzum_dokoni`) turgan holat. */
const TAJRIBA: YolHolati = { javoblar: { ...SHAXS }, natijalar: {} };
/** Qiziqish savoli turgan holat. */
const QIZIQISH: YolHolati = { javoblar: { ...SHAXS, uzum_dokoni: 'yoq' }, natijalar: {} };
/** Byudjet savoli turgan holat. */
const BYUDJET: YolHolati = { javoblar: { ...SHAXS, uzum_dokoni: 'yoq', qiziqish: ['kiyim'] }, natijalar: { kurs: KURS } };

const YOZUV: AiYozuv = { oldin: 'Zoʻr, tajribangiz bor ekan.', izoh: '', savol: 'Qaysi soha sizga yaqin?' };

afterEach(() => { vi.useRealTimers(); });

describe('AI tushunadi — javobni kod qabul qiladi', () => {
  it('«potinka sotganman» → tajriba qabul, kiyim oldindan belgilanadi; ism va telefon AI ga ketmaydi', async () => {
    const b = soxtaBaza(TAJRIBA);
    const s = soxtaAi(
      [{ javoblar: [{ savol_id: 'uzum_dokoni', qiymatlar: ['boshqa'], otkazish: false }], taklif_qiziqish: ['kiyim'], savol_bor: false }],
      [YOZUV],
    );
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'uzum_dokoni', matn: 'Instagramda potinka sotganman' });

    expect(r.xato).toBeUndefined();
    expect(b.holat().javoblar['uzum_dokoni']).toBe('boshqa');
    expect(b.holat().javoblar['qiziqish_taklif']).toEqual(['kiyim']);
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('qiziqish');
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.tanlangan).toEqual(['kiyim']);
    // Tushunishga: joriy savol va tanishuvning keyingilari.
    expect(s.tushunlar[0]!.k.savollar.map((x) => x.id)).toEqual(['uzum_dokoni', 'qiziqish', 'byudjet']);
    // Chat: mijoz gapi (javobi bilan) → AI munosabati (👍/👎) → AI yozgan savol (tugmalar shunga).
    expect(r.xabarlar).toEqual([
      { rol: 'obunachi', matn: 'Instagramda potinka sotganman', savolId: 'uzum_dokoni', javob: 'boshqa' },
      { rol: 'menejer', matn: YOZUV.oldin, savolId: 'uzum_dokoni', javob: { erkin: true, manba: 'ai', munosabat: true } },
      { rol: 'menejer', matn: YOZUV.savol, savolId: 'qiziqish' },
    ]);
    // Yozishga: qabul qilingani, keyingi savol (belgilangani bilan).
    const y = s.yozlar[0]!.k;
    expect(y.qabul).toEqual(['«Oldin savdo qilganmisiz?» → Boshqa joyda sotganman (bozor, Instagram…)']);
    expect(y.keyingi?.id).toBe('qiziqish');
    expect(y.keyingi?.tanlangan).toEqual(['kiyim']);
    expect(y.tanlov).toBe(false);
    // Maxfiylik: ism va telefon AI ga hech qayerda ketmaydi.
    const hammasi = JSON.stringify([s.tushunlar, s.yozlar]);
    expect(hammasi).not.toContain('Karimov');
    expect(hammasi).not.toContain('901234567');
  });

  it('bir gapda tajriba va pul — pul navbatda turadi, qiziqishdan keyin soʻralmay olinadi', async () => {
    const b = soxtaBaza(TAJRIBA);
    const s = soxtaAi(
      [{
        javoblar: [
          { savol_id: 'uzum_dokoni', qiymatlar: ['kiyim sotganman'], otkazish: false },
          { savol_id: 'byudjet', qiymatlar: ['70 mln'], otkazish: false },
        ],
        taklif_qiziqish: ['kiyim'], savol_bor: false,
      }],
      [YOZUV, { oldin: '', izoh: 'Kiyim sohasidan «Ayollar potinkasi» — 71 ball.', savol: 'Qaysi yoʻnalish yoqdi?' }],
    );
    const d = bogliq(b, s.ai);
    const r1 = await suhbatTurn(d, 't', { savolId: 'uzum_dokoni', matn: 'kiyim sotganman, 70 mln bilan boshlayman' });
    expect(r1.keyingi.tur === 'savol' && r1.keyingi.savol.id).toBe('qiziqish');
    expect(b.holat().javoblar['byudjet']).toBeUndefined();
    expect(b.holat().javoblar['ai_navbat']).toEqual([{ savol_id: 'byudjet', qiymatlar: ['70 mln'], otkazish: false }]);

    // Qiziqish tugmasi → kurs → byudjet navbatdan → yoʻnalishlar → yoʻnalish savoli.
    const r2 = await suhbatTurn(d, 't', { savolId: 'qiziqish', javob: ['kiyim'] });
    expect(r2.xato).toBeUndefined();
    expect(b.holat().javoblar['byudjet']).toBe(70_000_000);
    expect(b.holat().javoblar['ai_navbat']).toBeUndefined();
    expect(r2.keyingi.tur === 'savol' && r2.keyingi.savol.id).toBe('yonalish');
    const y = s.yozlar[1]!.k;
    expect(y.tanlov).toBe(true);
    expect(y.qabul).toEqual([
      '«Qaysi sohadagi tovarlar sizga yaqin?» → Kiyim va poyabzal',
      '«Qancha pul bilan savdoni boshlamoqchisiz?» → 70 000 000 soʻm (mijoz buni oldingi gapida aytgan edi)',
    ]);
    expect(y.natijalar.map((x) => x.harakat)).toEqual(['yonalishlar']);
    // Natijada: tanlagan sohasidan eng yuqorisi birinchi (kod xulosasi ham).
    expect(y.natijalar[0]!.matn).toContain('Siz tanlagan sohadan eng yuqorisi — «Ayollar potinkasi» (71 ball); boshqa sohalardan — «Sumkalar» (78 ball)');
    // Izoh — yoʻnalishlar kartasi tepasidagi pufakda; savol — oxirida.
    const kod = r2.xabarlar.find((x) => x.rol === 'kod' && x.savolId === 'yonalishlar');
    expect(kod?.matn).toBe('Kiyim sohasidan «Ayollar potinkasi» — 71 ball.');
    expect(r2.xabarlar[r2.xabarlar.length - 1]).toEqual({ rol: 'menejer', matn: 'Qaysi yoʻnalish yoqdi?', savolId: 'yonalish' });
  });

  it('navbatdagi javob qabul qilinmasa — sababi AI ga, savol oʻsha', async () => {
    const b = soxtaBaza({ ...QIZIQISH, javoblar: { ...QIZIQISH.javoblar, ai_navbat: [{ savol_id: 'byudjet', qiymatlar: ['70'], otkazish: false }] } });
    const s = soxtaAi([], [{ oldin: '70 — soʻmmi yoki dollarmi?', izoh: '', savol: 'Qancha pul bilan boshlaysiz?' }]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', javob: ['kiyim'] });
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('byudjet');
    expect(b.holat().javoblar['byudjet']).toBeUndefined();
    expect(b.holat().javoblar['ai_navbat']).toBeUndefined();
    expect(s.yozlar[0]!.k.rad).toHaveLength(1);
    expect(s.yozlar[0]!.k.rad[0]).toMatch(/^«Qancha pul bilan savdoni boshlamoqchisiz\?» — mijozdan «70» tushunildi, lekin qabul qilinmadi: /u);
  });

  it('AI tushungan qiymat rad etilsa — holat oʻzgarmaydi, AI sababini aytib qayta soʻraydi', async () => {
    const b = soxtaBaza(BYUDJET);
    const s = soxtaAi(
      [{ javoblar: [{ savol_id: 'byudjet', qiymatlar: ['70'], otkazish: false }], taklif_qiziqish: [], savol_bor: false }],
      [{ oldin: '70 deganingiz soʻmmi yoki dollarmi?', izoh: '', savol: 'Qancha pul bilan boshlaysiz — masalan, 70 mln yoki 5000 $?' }],
    );
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'byudjet', matn: '70 ga boshlayman' });
    expect(b.holat().javoblar['byudjet']).toBeUndefined();
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('byudjet');
    expect(s.yozlar[0]!.k.rad).toHaveLength(1);
    expect(r.xabarlar).toEqual([
      { rol: 'obunachi', matn: '70 ga boshlayman' },
      { rol: 'menejer', matn: '70 deganingiz soʻmmi yoki dollarmi?', savolId: 'byudjet', javob: { erkin: true, manba: 'ai' } },
      { rol: 'menejer', matn: 'Qancha pul bilan boshlaysiz — masalan, 70 mln yoki 5000 $?', savolId: 'byudjet' },
    ]);
  });

  it('variant nomini yozsa («yoʻq») — tugma kabi: tushunish chaqirilmaydi (tez)', async () => {
    const b = soxtaBaza(TAJRIBA);
    const s = soxtaAi([], [YOZUV]);
    await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'uzum_dokoni', matn: 'yoʻq' });
    expect(s.tushunlar).toHaveLength(0);
    expect(b.holat().javoblar['uzum_dokoni']).toBe('yoq');
    expect(s.yozlar[0]!.k.tanlov).toBe(true);
  });

  it('javob ham, savol ham yoʻq («salom») — AI baribir javob qaytaradi, savol oʻsha', async () => {
    const b = soxtaBaza(QIZIQISH);
    const s = soxtaAi([{ javoblar: [], taklif_qiziqish: [], savol_bor: false }],
      [{ oldin: 'Vaalaykum assalom!', izoh: '', savol: 'Qaysi soha sizga yaqin?' }]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', matn: 'salom' });
    expect(s.yozlar[0]!.k.savolBor).toBe(true);
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('qiziqish');
    expect(b.holat().javoblar['qiziqish']).toBeUndefined();
  });

  it('faqat savol — javob qabul qilinmaydi, AI ga bazadagi javob beriladi', async () => {
    const b = soxtaBaza(QIZIQISH);
    const s = soxtaAi(
      [{ javoblar: [], taklif_qiziqish: [], savol_bor: true }],
      [{ oldin: 'Goʻzallik va parvarishga kosmetika, atir va boshqalar kiradi.', izoh: '', savol: 'Qaysi soha sizga yaqin?' }],
    );
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', matn: 'gozallik va parvarish qanday tovarlar' });
    expect(b.holat().javoblar['qiziqish']).toBeUndefined();
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('qiziqish');
    const y = s.yozlar[0]!.k;
    expect(y.savolBor).toBe(true);
    expect(y.tayyor).toContain('«Goʻzallik va parvarish» sohasiga');
    expect(r.xabarlar.map((x) => x.rol)).toEqual(['obunachi', 'menejer', 'menejer']);
  });
});

describe('AI yozadi — tugma bosilganda ham', () => {
  it('tugma: tushunish chaqirilmaydi, yozish — tugma nomi bilan', async () => {
    const b = soxtaBaza(QIZIQISH);
    const s = soxtaAi([], [{ oldin: '', izoh: '', savol: 'Endi pul: qancha bilan boshlaysiz?' }]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', javob: ['kiyim'] });
    expect(s.tushunlar).toHaveLength(0);
    expect(s.yozlar[0]!.k.mijoz).toBe('Kiyim va poyabzal');
    expect(s.yozlar[0]!.k.tanlov).toBe(true);
    // Boʻsh «oldin» — pufak yoʻq; savol — AI matni, tugmalar shunga.
    expect(r.xabarlar).toEqual([
      { rol: 'obunachi', matn: 'Kiyim va poyabzal', savolId: 'qiziqish', javob: ['kiyim'] },
      { rol: 'menejer', matn: 'Endi pul: qancha bilan boshlaysiz?', savolId: 'byudjet' },
    ]);
  });

  it('rus sahifasi: tugma bosilsa ham AI ruscha yozadi (lotincha javob qaytariladi)', async () => {
    const b = soxtaBaza(QIZIQISH);
    const s = soxtaAi([], [
      { oldin: '', izoh: '', savol: 'Qancha pul bilan boshlaysiz?' },
      { oldin: '', izoh: '', savol: 'С какой суммы начнёте?' },
    ]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', javob: ['kiyim'], til: 'ru' });
    expect(s.yozlar.map((x) => x.k.til)).toEqual(['ru', 'ru']);
    expect(s.yozlar[1]!.k.tuzat).toContain('rus tilida');
    expect(r.xabarlar[r.xabarlar.length - 1]!.matn).toBe('С какой суммы начнёте?');
  });

  it('ism va telefon: AI tushunmaydi; keyingi savolni AI yozadi — shaxsiy maʼlumotsiz', async () => {
    const b = soxtaBaza(boshlangichHolat());
    const s = soxtaAi([], [{ oldin: '', izoh: '', savol: 'Tanishganimdan xursandman! Oldin savdo qilganmisiz?' }]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'ism', matn: 'Aziz Karimov +998901234567' });
    expect(s.tushunlar).toHaveLength(0);
    expect(b.holat().javoblar['ism']).toBe('Aziz Karimov');
    expect(s.yozlar[0]!.k.mijoz).toBeNull();
    expect(JSON.stringify(s.yozlar)).not.toContain('Karimov');
    expect(JSON.stringify(s.yozlar)).not.toContain('901234567');
    expect(r.xabarlar[r.xabarlar.length - 1]).toEqual({
      rol: 'menejer', matn: 'Tanishganimdan xursandman! Oldin savdo qilganmisiz?', savolId: 'uzum_dokoni',
    });
  });

  it('faqat ism yozsa — keyingi savol telefon (unda ism bor): AI yozmaydi, kod savoli', async () => {
    const b = soxtaBaza(boshlangichHolat());
    const s = soxtaAi([], [YOZUV]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'ism', matn: 'Aziz Karimov' });
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('telefon');
    expect(s.yozlar).toHaveLength(0);
    expect(r.xabarlar[r.xabarlar.length - 1]!.matn).toBe(r.keyingi.tur === 'savol' ? r.keyingi.savol.matn : '');
  });

  it('AI savolni yozmasa — qayta soʻraladi; yana yozmasa — kod savoli', async () => {
    const b = soxtaBaza(QIZIQISH);
    const s = soxtaAi([], [{ oldin: 'Kiyim — yaxshi tanlov.', izoh: '', savol: '' }]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', javob: ['kiyim'] });
    expect(s.yozlar).toHaveLength(2);
    expect(s.yozlar[1]!.k.tuzat).toContain('KEYINGI SAVOLni albatta ber');
    expect(r.xabarlar[r.xabarlar.length - 1]!.matn).toBe(r.keyingi.tur === 'savol' ? r.keyingi.savol.matn : '');
  });

  it('mijoz soʻragan-u, «oldin» boʻsh — bir marta qayta soʻraladi', async () => {
    const b = soxtaBaza(QIZIQISH);
    const s = soxtaAi(
      [{ javoblar: [], taklif_qiziqish: [], savol_bor: true }],
      [{ oldin: '', izoh: '', savol: 'Qaysi soha?' }, { oldin: 'Ha, boshlasa boʻladi.', izoh: '', savol: 'Qaysi soha?' }],
    );
    await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', matn: 'tajribasiz ham boshlasa boʻladimi' });
    expect(s.yozlar).toHaveLength(2);
    expect(s.yozlar[1]!.k.tuzat).toContain('savoliga javob ber');
  });
});

describe('AI yiqilsa — kod qoliplari (chat toʻxtamaydi)', () => {
  it('tushunish yiqildi → eski yoʻl, LLM siz: munosabat LLM i ham, yozish ham chaqirilmaydi', async () => {
    const b = soxtaBaza(TAJRIBA);
    const s = soxtaAi([null], [YOZUV]);
    let munosabat = 0;
    const r = await suhbatTurn(bogliq(b, s.ai, { munosabatLlm: async () => { munosabat++; return 'x'; } }), 't',
      { savolId: 'uzum_dokoni', matn: 'oldin sotganman maishiy texnika' });
    expect(s.tushunlar).toHaveLength(1);
    expect(s.yozlar).toHaveLength(0);
    expect(munosabat).toBe(0);
    expect(b.holat().javoblar['uzum_dokoni']).toBe('oldin sotganman maishiy texnika');
    expect(r.xabarlar.map((x) => x.matn)).toContain('Tushunarli — savdo tajribangiz bor ekan, bu katta yordam beradi.');
    expect(r.keyingi.tur === 'savol' && r.xabarlar[r.xabarlar.length - 1]!.matn).toBe(r.keyingi.tur === 'savol' ? r.keyingi.savol.matn : '');
  });

  it('AI raqam toʻqisa — sababi bilan qayta; yana toʻqisa — kod savoli', async () => {
    const b = soxtaBaza(QIZIQISH);
    const s = soxtaAi([], [{ oldin: '', izoh: '', savol: 'Kamida 999 mln kerak boʻladi — qancha bilan boshlaysiz?' }]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', javob: ['kiyim'] });
    expect(s.yozlar).toHaveLength(2);
    expect(s.yozlar[1]!.k.tuzat).toContain('999 mln');
    const oxirgi = r.xabarlar[r.xabarlar.length - 1]!;
    expect(oxirgi.savolId).toBe('byudjet');
    expect(oxirgi.matn).toBe(r.keyingi.tur === 'savol' ? r.keyingi.savol.matn : '');
  });

  it('kafolat yozsa — oʻtmaydi', async () => {
    const b = soxtaBaza(QIZIQISH);
    const s = soxtaAi([], [{ oldin: 'Kiyim — kafolatli foyda.', izoh: '', savol: 'Qancha bilan boshlaysiz?' }]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', javob: ['kiyim'] });
    expect(r.xabarlar.some((x) => x.matn.includes('kafolat'))).toBe(false);
  });

  it('tushunish uzoq ketsa — yozishga vaqt qolmaydi: kod savoli, AI siz', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const b = soxtaBaza(TAJRIBA);
    const s = soxtaAi([], [YOZUV]);
    const ai = {
      tushun: async (k: AiTushunSorovi, ms: number) => {
        vi.setSystemTime(Date.now() + 45_000);
        return s.ai.tushun(k, ms).then(() => ({
          javoblar: [{ savol_id: 'uzum_dokoni', qiymatlar: ['yoq'], otkazish: false }], taklif_qiziqish: [], savol_bor: false,
        }));
      },
      yoz: s.ai.yoz,
    };
    const r = await suhbatTurn(bogliq(b, ai), 't', { savolId: 'uzum_dokoni', matn: 'hali hech narsa sotmaganman' });
    expect(s.tushunlar[0]!.ms).toBeLessThanOrEqual(18_000);
    expect(s.yozlar).toHaveLength(0);
    expect(b.holat().javoblar['uzum_dokoni']).toBe('yoq');
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('qiziqish');
  });

  it('AI berilmasa — avvalgidek (eski yoʻl)', async () => {
    const b = soxtaBaza(QIZIQISH);
    const r = await suhbatTurn(bogliq(b, null), 't', { savolId: 'qiziqish', javob: ['kiyim'] });
    expect(r.xabarlar[r.xabarlar.length - 1]!.matn).toBe(r.keyingi.tur === 'savol' ? r.keyingi.savol.matn : '');
  });
});
