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
 * kod qoliplari (LLM siz), vaqt tugasa — AI siz. Ism/telefon (2026-10-21, nazoratchi): AI
 * ajratadi va gapdagi savolga javob beradi, keyin ismi bilan murojaat qiladi; keyingi
 * qadamlarda familiya va telefon AI ga ketmaydi. Eski yoʻl (Gemini) maxfiyligi — munosabat,
 * suhbat-erkin va suhbat testlarida (u yerda ism/telefon LLM ga hech qachon ketmaydi).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  boshlangichHolat, keyingi, suhbatTurn,
  type AiTushuncha, type AiTushunSorovi, type AiYozSorovi, type AiYozuv, type SuhbatBogliqliklari, type YolHolati,
} from '@selleros/shared';

/** `bosh` — jurnalda joriy savol bor (yoʻq boʻlsa — birinchi tashrif: salomlashish `keyingi` dan chiziladi). */
function soxtaBaza(boshlangich: YolHolati, bosh = true) {
  const k = keyingi(boshlangich);
  const jurnal: Array<{ rol: string; matn: string; savolId?: string; javob?: unknown }> =
    k.tur === 'savol' && bosh ? [{ rol: 'menejer', matn: k.savol.matn, savolId: k.savol.id }] : [];
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
    // Robotdek emas — ismi bilan murojaat qilsin (2026-10-21): AI ga FAQAT ism boradi.
    expect(y.ism).toBe('Aziz');
    // Maxfiylik: familiya va telefon keyingi qadamlarda AI ga ketmaydi.
    const hammasi = JSON.stringify([s.tushunlar, s.yozlar]);
    expect(hammasi).not.toContain('Karimov');
    expect(hammasi).not.toContain('901234567');
  });

  it('keyingi qadamda savol bersa — AI javob beradi va mijozni ismi bilan biladi (familiya, telefonsiz)', async () => {
    const b = soxtaBaza(QIZIQISH);
    const s = soxtaAi(
      [{ javoblar: [], taklif_qiziqish: [], savol_bor: true }],
      [{ oldin: 'Aziz, tajribasiz ham boshlasa boʻladi.', izoh: '', savol: 'Qaysi soha sizga yaqin?' }],
    );
    await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', matn: 'tajribasiz ham boshlasa boʻladimi?' });
    expect(s.yozlar[0]!.k.ism).toBe('Aziz');
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
    // AI biladi: pul eslab qolindi — «keyin soʻrayman» demaydi (jonli sinov, 2026-10-19).
    expect(s.yozlar[0]!.k.eslab).toEqual(['«Qancha pul bilan savdoni boshlamoqchisiz?» → 70 mln']);
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

  /** AI ism qadamida ajratib bergan javob (nazoratchi, 2026-10-21). */
  const ismJavobi = (qiymat: string, savolBor = false): AiTushuncha => ({
    javoblar: [{ savol_id: 'ism', qiymatlar: [qiymat], otkazish: false }], taklif_qiziqish: [], savol_bor: savolBor,
  });

  it('ism va telefon: AI tushunadi (ajratadi), kod tekshirib profilga yozadi; keyingi savolni AI ismi bilan yozadi', async () => {
    const b = soxtaBaza(boshlangichHolat());
    const s = soxtaAi([ismJavobi('Aziz Karimov +998901234567')], [{ oldin: '', izoh: '', savol: 'Tanishganimdan xursandman, Aziz! Oldin savdo qilganmisiz?' }]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'ism', matn: 'Aziz Karimov +998901234567' });
    expect(s.tushunlar).toHaveLength(1);
    expect(s.tushunlar[0]!.k.xabar).toBe('Aziz Karimov +998901234567');
    expect(b.holat().javoblar['ism']).toBe('Aziz Karimov');
    expect(b.holat().javoblar['telefon']).toBe('+998901234567');
    expect(s.yozlar[0]!.k.ism).toBe('Aziz');
    expect(r.xabarlar[r.xabarlar.length - 1]).toEqual({
      rol: 'menejer', matn: 'Tanishganimdan xursandman, Aziz! Oldin savdo qilganmisiz?', savolId: 'uzum_dokoni',
    });
  });

  it('ism qadamida savol ham: ism va telefon saqlanadi, savolga AI javob beradi — shablon emas (10:41 hodisasi)', async () => {
    const b = soxtaBaza(boshlangichHolat());
    const matn = 'Salom, men Aziz Karimov, 90 123 45 67. Bu xizmat bepulmi?';
    const s = soxtaAi(
      [ismJavobi('Aziz Karimov, 90 123 45 67', true)],
      [{ oldin: 'Ha, Aziz, boshlash bepul.', izoh: '', savol: 'Oldin savdo qilganmisiz?' }],
    );
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'ism', matn });
    expect(b.holat().javoblar['ism']).toBe('Aziz Karimov');
    expect(b.holat().javoblar['telefon']).toBe('+998901234567');
    const y = s.yozlar[0]!.k;
    expect(y.mijoz).toBe(matn);
    expect(y.savolBor).toBe(true);
    const matnlar = r.xabarlar.map((x) => x.matn).join('\n');
    expect(matnlar).toContain('Ha, Aziz, boshlash bepul.');
    expect(matnlar).not.toContain('hozir aniq javob bera olmayman');
    expect(r.xabarlar.find((x) => x.matn === 'Ha, Aziz, boshlash bepul.')?.javob).toEqual({ erkin: true, manba: 'ai', munosabat: true });
  });

  it('ism qadamida faqat savol: AI javob beradi, ism qayta soʻraladi — hech narsa yozilmaydi', async () => {
    const b = soxtaBaza(boshlangichHolat());
    const s = soxtaAi(
      [{ javoblar: [], taklif_qiziqish: [], savol_bor: true }],
      [{ oldin: 'ZumSavdo Uzumda savdoni boshlashga yordam beradi.', izoh: '', savol: 'Tanishib olaylik: ismingiz va telefon raqamingiz?' }],
    );
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'ism', matn: 'Bu sayt nima qiladi?' });
    expect(b.holat().javoblar['ism']).toBeUndefined();
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('ism');
    expect(r.xabarlar.map((x) => x.matn)).toContain('ZumSavdo Uzumda savdoni boshlashga yordam beradi.');
    expect(r.xabarlar[r.xabarlar.length - 1]).toEqual({ rol: 'menejer', matn: 'Tanishib olaylik: ismingiz va telefon raqamingiz?', savolId: 'ism' });
  });

  it('ism qadamida tajriba va pul ham aytsa — AI keyingi savollarni ham koʻradi, javoblar navbatda kutadi', async () => {
    const b = soxtaBaza(boshlangichHolat());
    const s = soxtaAi(
      [{
        javoblar: [
          { savol_id: 'ism', qiymatlar: ['Aziz Karimov, +998 90 123 45 67'], otkazish: false },
          { savol_id: 'byudjet', qiymatlar: ['50 mln'], otkazish: false },
        ],
        taklif_qiziqish: [], savol_bor: false,
      }],
      [{ oldin: '', izoh: '', savol: 'Aziz, oldin savdo qilganmisiz?' }],
    );
    await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'ism', matn: 'Aziz Karimov, +998 90 123 45 67, 50 mln bilan boshlamoqchiman' });
    expect(s.tushunlar[0]!.k.savollar.map((x) => x.id)).toEqual(['ism', 'uzum_dokoni', 'qiziqish', 'byudjet']);
    expect(b.holat().javoblar['ism']).toBe('Aziz Karimov');
    // Pul — navbatda (oʻz savoli kelganda soʻralmaydi).
    expect(JSON.stringify(b.holat().javoblar['ai_navbat'])).toContain('50 mln');
  });

  it('ism kirillda (oʻzbekcha harfsiz) — javob tili ism boʻyicha emas: sahifa tili (oʻzbek)', async () => {
    const b = soxtaBaza(boshlangichHolat());
    const s = soxtaAi([ismJavobi('Синов Кирилл, +998 90 000 02 03')], [{ oldin: '', izoh: '', savol: 'Oldin savdo qilganmisiz?' }]);
    await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'ism', matn: 'Синов Кирилл, +998 90 000 02 03' });
    expect(s.yozlar[0]!.k.til).toBe('uz');
  });

  it('ruscha suhbatda faqat telefon yuborsa — javob tili rus qoladi (jonli sinov 2026-10-21: oʻzbekchaga sakragan edi)', async () => {
    const b = soxtaBaza({ javoblar: { ism: 'Иван Петров' }, natijalar: {} });
    b.jurnal.push({ rol: 'obunachi', matn: 'Здравствуйте, меня зовут Иван Петров. Что вы умеете?' });
    const s = soxtaAi(
      [{ javoblar: [{ savol_id: 'telefon', qiymatlar: ['+998 90 000 05 32'], otkazish: false }], taklif_qiziqish: [], savol_bor: false }],
      [{ oldin: '', izoh: '', savol: 'Вы раньше торговали?' }],
    );
    await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'telefon', matn: '+998 90 000 05 32' });
    expect(b.holat().javoblar['telefon']).toBe('+998900000532');
    expect(s.yozlar[0]!.k.til).toBe('ru');
  });

  it('faqat raqam (byudjet) — til oldingi yozgan gapidan; oldin hech narsa yozmagan boʻlsa — oʻzi', async () => {
    const b = soxtaBaza(BYUDJET);
    b.jurnal.push({ rol: 'obunachi', matn: 'Я продавал одежду в Инстаграме' });
    const javob = { javoblar: [{ savol_id: 'byudjet', qiymatlar: ['60000000'], otkazish: false }], taklif_qiziqish: [], savol_bor: false };
    const s = soxtaAi([javob], [YOZUV]);
    await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'byudjet', matn: '60000000' });
    expect(s.yozlar[0]!.k.til).toBe('ru');
    // Oldin yozgan gapi yoʻq — sahifa tili (oʻzbek) qoladi.
    const b2 = soxtaBaza(BYUDJET);
    const s2 = soxtaAi([javob], [YOZUV]);
    await suhbatTurn(bogliq(b2, s2.ai), 't', { savolId: 'byudjet', matn: '60000000' });
    expect(s2.yozlar[0]!.k.til).toBe('uz');
  });

  it('ism bilan ruscha gap — javob tili ism va telefondan tashqari gapdan: rus', async () => {
    const b = soxtaBaza(boshlangichHolat());
    const s = soxtaAi([ismJavobi('Иван Петров, +998 90 000 02 03')], [{ oldin: '', izoh: '', savol: 'Вы раньше торговали?' }]);
    await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'ism', matn: 'Здравствуйте, меня зовут Иван Петров, +998 90 000 02 03' });
    expect(s.yozlar[0]!.k.til).toBe('ru');
  });

  it('birinchi tashrif: salomlashish jurnalga yoziladi — birinchi javobdan keyin chatdan yoʻqolmaydi', async () => {
    const b = soxtaBaza(boshlangichHolat(), false);
    const s = soxtaAi([], [{ oldin: '', izoh: '', savol: 'Oldin savdo qilganmisiz?' }]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'ism', matn: 'Aziz Karimov +998901234567' });
    const salom = keyingi(boshlangichHolat());
    expect(r.xabarlar[0]).toEqual({ rol: 'menejer', matn: salom.tur === 'savol' ? salom.savol.matn : '', savolId: 'ism' });
    expect(r.xabarlar[1]!.rol).toBe('obunachi');
    // Jurnalda bor boʻlsa — ikkinchi marta yozilmaydi.
    const b2 = soxtaBaza(boshlangichHolat());
    const r2 = await suhbatTurn(bogliq(b2, s.ai), 't', { savolId: 'ism', matn: 'Aziz Karimov +998901234567' });
    expect(r2.xabarlar[0]!.rol).toBe('obunachi');
  });

  it('faqat ism yozsa — keyingi savol telefon: uni ham AI yozadi, ismi bilan (ilgari kod qolipi edi)', async () => {
    const b = soxtaBaza(boshlangichHolat());
    const s = soxtaAi([ismJavobi('Aziz Karimov')], [{ oldin: '', izoh: '', savol: 'Rahmat, Aziz! Telefon raqamingizni ham yozib qoldirasizmi?' }]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'ism', matn: 'Aziz Karimov' });
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('telefon');
    expect(s.yozlar).toHaveLength(1);
    expect(s.yozlar[0]!.k.keyingi?.id).toBe('telefon');
    expect(s.yozlar[0]!.k.ism).toBe('Aziz');
    expect(r.xabarlar[r.xabarlar.length - 1]).toEqual({
      rol: 'menejer', matn: 'Rahmat, Aziz! Telefon raqamingizni ham yozib qoldirasizmi?', savolId: 'telefon',
    });
  });

  it('AI tushuna olmasa (yiqildi) — ism qadamida ham kod oʻzi ajratadi, suhbat toʻxtamaydi', async () => {
    const b = soxtaBaza(boshlangichHolat());
    const s = soxtaAi([null], [YOZUV]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'ism', matn: 'Aziz Karimov +998901234567' });
    expect(b.holat().javoblar['ism']).toBe('Aziz Karimov');
    expect(b.holat().javoblar['telefon']).toBe('+998901234567');
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('uzum_dokoni');
    // Tushunish yiqilgan turnda AI yozmaydi ham (yana kutmasin) — kod qolipi.
    expect(s.yozlar).toHaveLength(0);
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

/** Oqim hodisalari — tartibi bilan (qism — faqat `oldin`, qisqa boʻlsin). */
function oqimYozuvchi() {
  const h: Array<[string, unknown?]> = [];
  const oqim: NonNullable<SuhbatBogliqliklari['oqim']> = {
    holat: (x) => { h.push(['holat', x]); },
    qism: (y) => { h.push(['qism', y.oldin || y.savol]); },
    qayta: () => { h.push(['qayta']); },
  };
  return { h, oqim };
}

/** Soxta AI, yozishi oqim bilan: avval yarmi, keyin hammasi (`qism`), soʻng javob. */
function oqimliAi(tushunJavob: Array<AiTushuncha | null>, yozJavob: Array<AiYozuv | null>) {
  const s = soxtaAi(tushunJavob, yozJavob);
  const yoz = async (k: AiYozSorovi, ms: number, qism?: (y: AiYozuv) => void) => {
    const y = await s.ai.yoz(k, ms);
    if (y && qism) {
      const m = y.oldin || y.savol;
      const yarim = m.slice(0, Math.ceil(m.length / 2));
      qism(y.oldin ? { oldin: yarim, izoh: '', savol: '' } : { oldin: '', izoh: '', savol: yarim });
      qism(y);
    }
    return y;
  };
  return { ...s, ai: { tushun: s.ai.tushun, yoz } };
}

describe('oqim — matn yozilgan sari (2026-10-20)', () => {
  const yarmi = (m: string) => m.slice(0, Math.ceil(m.length / 2));
  it('yozilgan gap: tushunmoqda → yozmoqda → qoralama; natija oqimsizdagi bilan AYNAN bir xil', async () => {
    const TUSHUN: AiTushuncha = { javoblar: [{ savol_id: 'uzum_dokoni', qiymatlar: ['boshqa'], otkazish: false }], taklif_qiziqish: ['kiyim'], savol_bor: false };
    const b1 = soxtaBaza(TAJRIBA);
    const oddiy = await suhbatTurn(bogliq(b1, soxtaAi([TUSHUN], [YOZUV]).ai), 't', { savolId: 'uzum_dokoni', matn: 'Instagramda potinka sotganman' });
    const b2 = soxtaBaza(TAJRIBA);
    const o = oqimYozuvchi();
    const r = await suhbatTurn({ ...bogliq(b2, oqimliAi([TUSHUN], [YOZUV]).ai), oqim: o.oqim }, 't',
      { savolId: 'uzum_dokoni', matn: 'Instagramda potinka sotganman' });
    expect(r).toEqual(oddiy);
    expect(b2.jurnal).toEqual(b1.jurnal);
    expect(o.h).toEqual([
      ['holat', 'tushunmoqda'], ['holat', 'yozmoqda'], ['qism', yarmi(YOZUV.oldin)], ['qism', YOZUV.oldin],
    ]);
  });

  it('tugma: tushunish yoʻq — birinchi hodisa «yozmoqda»', async () => {
    const o = oqimYozuvchi();
    await suhbatTurn({ ...bogliq(soxtaBaza(QIZIQISH), oqimliAi([], [YOZUV]).ai), oqim: o.oqim }, 't', { savolId: 'qiziqish', javob: ['kiyim'] });
    expect(o.h[0]).toEqual(['holat', 'yozmoqda']);
    expect(o.h.some(([n]) => n === 'qayta')).toBe(false);
  });

  it('darvoza oʻtkazmasa — «qayta» (qoralama olinadi), keyin yangi qoralama va u qoladi', async () => {
    const b = soxtaBaza(QIZIQISH);
    const yaxshi: AiYozuv = { oldin: '', izoh: '', savol: 'Qancha pul bilan boshlaysiz?' };
    const YOMON = 'Kamida 999 mln kerak — qancha bilan?';
    const s = oqimliAi([], [{ oldin: '', izoh: '', savol: YOMON }, yaxshi]);
    const o = oqimYozuvchi();
    const r = await suhbatTurn({ ...bogliq(b, s.ai), oqim: o.oqim }, 't', { savolId: 'qiziqish', javob: ['kiyim'] });
    expect(r.xabarlar[r.xabarlar.length - 1]!.matn).toBe(yaxshi.savol);
    expect(o.h).toEqual([
      ['holat', 'yozmoqda'], ['qism', yarmi(YOMON)], ['qism', YOMON], ['qayta'],
      ['holat', 'yozmoqda'], ['qism', yarmi(yaxshi.savol)], ['qism', yaxshi.savol],
    ]);
  });

  it('ikkalasi ham oʻtmasa — oxirida «qayta»: ekranda faqat kod savoli qoladi', async () => {
    const b = soxtaBaza(QIZIQISH);
    const s = oqimliAi([], [{ oldin: '', izoh: '', savol: 'Kamida 999 mln kerak — qancha bilan?' }]);
    const o = oqimYozuvchi();
    const r = await suhbatTurn({ ...bogliq(b, s.ai), oqim: o.oqim }, 't', { savolId: 'qiziqish', javob: ['kiyim'] });
    expect(o.h.at(-1)).toEqual(['qayta']);
    expect(o.h.filter(([n]) => n === 'qayta')).toHaveLength(2);
    expect(r.xabarlar[r.xabarlar.length - 1]!.matn).toBe(r.keyingi.tur === 'savol' ? r.keyingi.savol.matn : '');
  });

  it('qoralama chiqqan-u, AI oxirida yiqilsa (oqim uzildi, rad) — «qayta»: ekranda faqat kod savoli', async () => {
    const b = soxtaBaza(QIZIQISH);
    const yiqiluvchi = {
      tushun: async () => null,
      yoz: async (_k: AiYozSorovi, _ms: number, qism?: (y: AiYozuv) => void) => {
        qism?.({ oldin: '', izoh: '', savol: 'Qancha pul' });
        return null;
      },
    };
    const o = oqimYozuvchi();
    const r = await suhbatTurn({ ...bogliq(b, yiqiluvchi), oqim: o.oqim }, 't', { savolId: 'qiziqish', javob: ['kiyim'] });
    expect(o.h).toEqual([['holat', 'yozmoqda'], ['qism', 'Qancha pul'], ['qayta']]);
    expect(r.xabarlar[r.xabarlar.length - 1]!.matn).toBe(r.keyingi.tur === 'savol' ? r.keyingi.savol.matn : '');
  });

  it('erkin savol (javob emas): AI javobi ham qoralama boʻlib keladi', async () => {
    const b = soxtaBaza(QIZIQISH);
    const s = oqimliAi([{ javoblar: [], taklif_qiziqish: [], savol_bor: true }],
      [{ oldin: 'Ha, tajribasiz ham boshlasa boʻladi.', izoh: '', savol: 'Qaysi soha?' }]);
    const o = oqimYozuvchi();
    const r = await suhbatTurn({ ...bogliq(b, s.ai), oqim: o.oqim }, 't', { savolId: 'qiziqish', matn: 'tajribasiz ham boshlasa boʻladimi' });
    expect(r.xabarlar.map((x) => x.matn)).toContain('Ha, tajribasiz ham boshlasa boʻladi.');
    expect(o.h.map(([n]) => n)).toEqual(['holat', 'holat', 'qism', 'qism']);
  });

  it('AI berilmasa — hodisa yoʻq (sahifa oddiy JSON oladi)', async () => {
    const o = oqimYozuvchi();
    await suhbatTurn({ ...bogliq(soxtaBaza(QIZIQISH), null), oqim: o.oqim }, 't', { savolId: 'qiziqish', javob: ['kiyim'] });
    expect(o.h).toEqual([]);
  });

  it('ism qadami ham oqim bilan (2026-10-21): «tushunmoqda» → «yozmoqda» → matn', async () => {
    const o = oqimYozuvchi();
    const s = oqimliAi([{ javoblar: [{ savol_id: 'ism', qiymatlar: ['Aziz Karimov +998901234567'], otkazish: false }], taklif_qiziqish: [], savol_bor: false }], [YOZUV]);
    await suhbatTurn({ ...bogliq(soxtaBaza(boshlangichHolat()), s.ai), oqim: o.oqim }, 't', { savolId: 'ism', matn: 'Aziz Karimov +998901234567' });
    expect(o.h.map(([n, x]) => (n === 'holat' ? `holat:${String(x)}` : n))).toEqual(['holat:tushunmoqda', 'holat:yozmoqda', 'qism', 'qism']);
  });
});
