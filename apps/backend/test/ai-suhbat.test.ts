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
 * javob oʻz savoli kelganda olinadi, AI xabari darvozadan oʻtadi, AI yiqilsa — vaqt
 * qolguncha qayta, baribir yozolmasa — TAYYOR JAVOB YOʻQ (2026-10-26, nazoratchi: «AI hamma
 * joyda javob bersin, tayyor javoblar shartmas»): qisqa uzr yoki rad sababi va savolning oʻzi.
 * Ism/telefon (2026-10-21, nazoratchi): AI
 * ajratadi va gapdagi savolga javob beradi, keyin ismi bilan murojaat qiladi; keyingi
 * qadamlarda familiya va telefon AI ga ketmaydi. Eski yoʻl (Gemini) maxfiyligi — munosabat,
 * suhbat-erkin va suhbat testlarida (u yerda ism/telefon LLM ga hech qachon ketmaydi).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  aiUzr, boshlangichHolat, keyingi, suhbatTurn,
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

const TOVARLAR = {
  olchov_yoq: false,
  royxat: [{ nomzod: { productId: 100, title: 'Ayollar potinkasi A', soldUnits30d: 600, sotuvManbasi: 'olchandi' as const, qoldiq: 40 },
    miqdor: { dona: 30, hisob: 'oyiga ~600 · 5% · 30 kun = 30' } }],
};

/** Kod: dollar kursi, yoʻnalishlar va tovarlar — soxta; qolgani chaqirilmasligi kerak. */
const KOD = new Proxy({}, {
  get: (_, nom) => (nom === 'kurs' ? async () => KURS
    : nom === 'yonalishlar' ? async () => YONALISHLAR
      : nom === 'tovarlar' ? async () => TOVARLAR
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
  qoshimcha: Pick<SuhbatBogliqliklari, 'munosabatLlm' | 'erkinLlm' | 'llm'> = {},
): SuhbatBogliqliklari {
  return { rpc: b.rpc, kod: KOD as SuhbatBogliqliklari['kod'], ai, ...qoshimcha };
}

const SHAXS = { ism: 'Aziz Karimov', telefon: '+998901234567' };
/** Qiziqish — birinchi savol (2026-10-26). Ismi bor (tanish) mijoz — salomsiz. */
const QIZIQISH: YolHolati = { javoblar: { ...SHAXS }, natijalar: {} };
/** Byudjet savoli turgan holat. */
const BYUDJET: YolHolati = { javoblar: { ...SHAXS, qiziqish: ['kiyim'] }, natijalar: { kurs: KURS } };
/** Ism savoli — yoʻnalish tanlangach (2026-10-26): qiziqish, byudjet, yoʻnalish. */
const ISM: YolHolati = { javoblar: { qiziqish: ['kiyim'], byudjet: 70_000_000, yonalish: 11 }, natijalar: { kurs: KURS, yonalishlar: YONALISHLAR } };
/** Miqdor savoli — ism va telefondan, tovar tanlangandan keyin. */
const MIQDOR: YolHolati = { javoblar: { ...ISM.javoblar, ...SHAXS, tovarlar: [100] }, natijalar: { ...ISM.natijalar, tovarlar: TOVARLAR } };
/** Tajriba savoli (`uzum_dokoni`) — tovar va miqdordan keyin, tannarxdan oldin (2026-10-26). */
const TAJRIBA: YolHolati = { javoblar: { ...MIQDOR.javoblar, 'miqdor:100': 30 }, natijalar: MIQDOR.natijalar };

const YOZUV: AiYozuv = { oldin: 'Zoʻr, tajribangiz bor ekan.', izoh: '', savol: 'Qancha marja bilan sotmoqchisiz?' };

afterEach(() => { vi.useRealTimers(); });

describe('AI tushunadi — javobni kod qabul qiladi', () => {
  it('«potinka sotganman» → tajriba qabul (tannarxdan oldin), keyingi — marja; familiya va telefon AI ga ketmaydi', async () => {
    const b = soxtaBaza(TAJRIBA);
    const s = soxtaAi(
      [{ javoblar: [{ savol_id: 'uzum_dokoni', qiymatlar: ['boshqa'], otkazish: false }], taklif_qiziqish: ['kiyim'], savol_bor: false }],
      [YOZUV],
    );
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'uzum_dokoni', matn: 'Instagramda potinka sotganman' });

    expect(r.xato).toBeUndefined();
    expect(b.holat().javoblar['uzum_dokoni']).toBe('boshqa');
    // Qiziqish allaqachon tanlangan — AI taklifi uni oʻzgartirmaydi.
    expect(b.holat().javoblar['qiziqish_taklif']).toBeUndefined();
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('marja');
    // Tushunishga: joriy savol; tanishuvning qolganiga javob berilgan.
    expect(s.tushunlar[0]!.k.savollar.map((x) => x.id)).toEqual(['uzum_dokoni']);
    // Chat: mijoz gapi (javobi bilan) → AI munosabati (👍/👎) → AI yozgan savol (tugmalar shunga).
    expect(r.xabarlar).toEqual([
      { rol: 'obunachi', matn: 'Instagramda potinka sotganman', savolId: 'uzum_dokoni', javob: 'boshqa' },
      { rol: 'menejer', matn: YOZUV.oldin, savolId: 'uzum_dokoni', javob: { erkin: true, manba: 'ai', munosabat: true } },
      { rol: 'menejer', matn: YOZUV.savol, savolId: 'marja' },
    ]);
    const y = s.yozlar[0]!.k;
    expect(y.qabul).toEqual(['«Oldin savdo qilganmisiz?» → Boshqa joyda sotganman (bozor, Instagram…)']);
    expect(y.keyingi?.id).toBe('marja');
    expect(y.tanlov).toBe(false);
    // Robotdek emas — ismi bilan murojaat qilsin (2026-10-21): AI ga FAQAT ism boradi.
    expect(y.ism).toBe('Aziz');
    // Maxfiylik: familiya va telefon keyingi qadamlarda AI ga ketmaydi.
    const hammasi = JSON.stringify([s.tushunlar, s.yozlar]);
    expect(hammasi).not.toContain('Karimov');
    expect(hammasi).not.toContain('901234567');
  });

  it('birinchi savolda «potinka sotganman» — soha (kiyim) qabul, tajriba navbatda; AI keyingi savollarni yangi tartibda koʻradi', async () => {
    const b = soxtaBaza(boshlangichHolat());
    const s = soxtaAi(
      [{
        javoblar: [
          { savol_id: 'qiziqish', qiymatlar: ['kiyim'], otkazish: false },
          { savol_id: 'uzum_dokoni', qiymatlar: ['boshqa'], otkazish: false },
        ],
        taklif_qiziqish: ['kiyim'], savol_bor: false,
      }],
      [{ oldin: 'Kiyim — yaxshi tanlov.', izoh: '', savol: 'Qancha pul bilan boshlaysiz?' }],
    );
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', matn: 'Instagramda potinka sotganman' });
    expect(r.xato).toBeUndefined();
    expect(b.holat().javoblar['qiziqish']).toEqual(['kiyim']);
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('byudjet');
    expect(s.tushunlar[0]!.k.savollar.map((x) => x.id)).toEqual(['qiziqish', 'byudjet', 'ism', 'uzum_dokoni']);
    // AI ga birinchi savol salomsiz (salom chatda turibdi).
    expect(s.tushunlar[0]!.k.savollar[0]!.matn).toMatch(/^Qaysi sohadagi/);
    // Tajriba — oʻz navbatigacha (tannarx oldidan) kutadi; AI «eslab qoldim» desin.
    expect(b.holat().javoblar['ai_navbat']).toEqual([{ savol_id: 'uzum_dokoni', qiymatlar: ['boshqa'], otkazish: false }]);
    expect(s.yozlar[0]!.k.eslab).toEqual(['«Oldin savdo qilganmisiz?» → Boshqa joyda sotganman (bozor, Instagram…)']);
  });

  it('birinchi gapda ism va telefon — navbatda (yoʻnalishdan keyingacha); AI ga «aytdi» deyiladi, oʻzi koʻrsatilmaydi', async () => {
    const b = soxtaBaza(boshlangichHolat());
    const s = soxtaAi(
      [{
        javoblar: [
          { savol_id: 'qiziqish', qiymatlar: ['kiyim'], otkazish: false },
          { savol_id: 'ism', qiymatlar: ['Aziz Karimov, 90 123 45 67'], otkazish: false },
        ],
        taklif_qiziqish: [], savol_bor: false,
      }],
      [{ oldin: '', izoh: '', savol: 'Qancha pul bilan boshlaysiz?' }],
    );
    await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', matn: 'Aziz Karimov, 90 123 45 67, kiyim sotmoqchiman' });
    expect(b.holat().javoblar['ai_navbat']).toEqual([{ savol_id: 'ism', qiymatlar: ['Aziz Karimov, 90 123 45 67'], otkazish: false }]);
    const k = s.yozlar[0]!.k;
    expect(k.eslab).toEqual(['Mijoz ism va telefonini ham aytdi (shaxsiy maʼlumot — senga koʻrsatilmaydi).']);
    expect(JSON.stringify([k.eslab, k.qabul, k.holat, k.tarix])).not.toMatch(/Aziz|Karimov|123 45 67/);
  });

  it('navbatdagi tajriba — oʻz navbati kelganda (miqdordan keyin) soʻralmay olinadi, toʻgʻri marja', async () => {
    const b = soxtaBaza({ ...MIQDOR, javoblar: { ...MIQDOR.javoblar, ai_navbat: [{ savol_id: 'uzum_dokoni', qiymatlar: ['boshqa'], otkazish: false }] } });
    const s = soxtaAi([], [YOZUV]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'miqdor:100', javob: 30 });
    expect(r.xato).toBeUndefined();
    expect(b.holat().javoblar['uzum_dokoni']).toBe('boshqa');
    expect(b.holat().javoblar['ai_navbat']).toBeUndefined();
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('marja');
    expect(s.yozlar[0]!.k.qabul).toContain('«Oldin savdo qilganmisiz?» → Boshqa joyda sotganman (bozor, Instagram…) (mijoz buni oldingi gapida aytgan edi)');
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

  it('bir gapda soha, pul va tajriba — pul shu turnda navbatdan olinadi (darhol yoʻnalishlar), tajriba navbatda qoladi', async () => {
    const b = soxtaBaza(boshlangichHolat());
    const s = soxtaAi(
      [{
        javoblar: [
          { savol_id: 'qiziqish', qiymatlar: ['kiyim'], otkazish: false },
          { savol_id: 'byudjet', qiymatlar: ['70 mln'], otkazish: false },
          { savol_id: 'uzum_dokoni', qiymatlar: ['kiyim sotganman'], otkazish: false },
        ],
        taklif_qiziqish: ['kiyim'], savol_bor: false,
      }],
      [{ oldin: '', izoh: 'Kiyim sohasidan «Ayollar potinkasi» — 71 ball.', savol: 'Qaysi yoʻnalish yoqdi?' }],
    );
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', matn: 'kiyim sotganman, 70 mln bilan boshlayman' });
    expect(r.xato).toBeUndefined();
    // Qiziqish → kurs → byudjet navbatdan → yoʻnalishlar → yoʻnalish savoli: bitta turnda.
    expect(b.holat().javoblar['qiziqish']).toEqual(['kiyim']);
    expect(b.holat().javoblar['byudjet']).toBe(70_000_000);
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('yonalish');
    // Tajriba — oʻz navbatigacha (tannarx oldidan) kutadi.
    expect(b.holat().javoblar['ai_navbat']).toEqual([{ savol_id: 'uzum_dokoni', qiymatlar: ['kiyim sotganman'], otkazish: false }]);
    const y = s.yozlar[0]!.k;
    expect(y.qabul).toEqual([
      '«Qaysi sohadagi tovarlar sizga yaqin?» → Kiyim va poyabzal',
      '«Qancha pul bilan savdoni boshlamoqchisiz?» → 70 000 000 soʻm (mijoz buni oldingi gapida aytgan edi)',
    ]);
    // AI biladi: tajriba eslab qolindi — «keyin soʻrayman» demaydi (jonli sinov, 2026-10-19).
    expect(y.eslab).toEqual(['«Oldin savdo qilganmisiz?» → kiyim sotganman']);
    expect(y.natijalar.map((x) => x.harakat)).toEqual(['yonalishlar']);
    // Natijada: tanlagan sohasidan eng yuqorisi birinchi (kod xulosasi ham).
    expect(y.natijalar[0]!.matn).toContain('Siz tanlagan sohadan eng yuqorisi — «Ayollar potinkasi» (71 ball); boshqa sohalardan — «Sumkalar» (78 ball)');
    // Izoh — yoʻnalishlar kartasi tepasidagi pufakda; savol — oxirida.
    const kod = r.xabarlar.find((x) => x.rol === 'kod' && x.savolId === 'yonalishlar');
    expect(kod?.matn).toBe('Kiyim sohasidan «Ayollar potinkasi» — 71 ball.');
    expect(r.xabarlar[r.xabarlar.length - 1]).toEqual({ rol: 'menejer', matn: 'Qaysi yoʻnalish yoqdi?', savolId: 'yonalish' });
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
    const b = soxtaBaza(ISM);
    const s = soxtaAi([ismJavobi('Aziz Karimov +998901234567')], [{ oldin: '', izoh: '', savol: 'Tanishganimdan xursandman, Aziz! Qaysi tovarlarni sotmoqchisiz?' }]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'ism', matn: 'Aziz Karimov +998901234567' });
    expect(s.tushunlar).toHaveLength(1);
    expect(s.tushunlar[0]!.k.xabar).toBe('Aziz Karimov +998901234567');
    expect(b.holat().javoblar['ism']).toBe('Aziz Karimov');
    expect(b.holat().javoblar['telefon']).toBe('+998901234567');
    expect(s.yozlar[0]!.k.ism).toBe('Aziz');
    expect(r.xabarlar[r.xabarlar.length - 1]).toEqual({
      rol: 'menejer', matn: 'Tanishganimdan xursandman, Aziz! Qaysi tovarlarni sotmoqchisiz?', savolId: 'tovarlar',
    });
  });

  it('ism qadamida savol ham: ism va telefon saqlanadi, savolga AI javob beradi — shablon emas (10:41 hodisasi)', async () => {
    const b = soxtaBaza(ISM);
    const matn = 'Salom, men Aziz Karimov, 90 123 45 67. Bu xizmat bepulmi?';
    const s = soxtaAi(
      [ismJavobi('Aziz Karimov, 90 123 45 67', true)],
      [{ oldin: 'Ha, Aziz, boshlash bepul.', izoh: '', savol: 'Qaysi tovarlarni sotmoqchisiz?' }],
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
    const b = soxtaBaza(ISM);
    const s = soxtaAi(
      [{ javoblar: [], taklif_qiziqish: [], savol_bor: true }],
      [{ oldin: 'Raqamingiz faqat siz bilan bogʻlanish uchun.', izoh: '', savol: 'Ismingiz va telefon raqamingizni yozasizmi?' }],
    );
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'ism', matn: 'Raqamim nima uchun kerak?' });
    expect(b.holat().javoblar['ism']).toBeUndefined();
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('ism');
    expect(r.xabarlar.map((x) => x.matn)).toContain('Raqamingiz faqat siz bilan bogʻlanish uchun.');
    expect(r.xabarlar[r.xabarlar.length - 1]).toEqual({ rol: 'menejer', matn: 'Ismingiz va telefon raqamingizni yozasizmi?', savolId: 'ism' });
    expect(s.yozlar[0]!.k.keyingi?.matn).toContain('ismingiz');
  });

  it('birinchi savolda faqat savol: AI ga savolning oʻzi, salomsiz — salomni qayta aytmasin (jonli sinov, 2026-10-21)', async () => {
    const b = soxtaBaza(boshlangichHolat());
    const s = soxtaAi(
      [{ javoblar: [], taklif_qiziqish: [], savol_bor: true }],
      [{ oldin: 'ZumSavdo Uzumda savdoni boshlashga yordam beradi.', izoh: '', savol: 'Qaysi soha sizga yaqin?' }],
    );
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', matn: 'Bu sayt nima qiladi?' });
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('qiziqish');
    expect(s.yozlar[0]!.k.keyingi?.matn).not.toContain('Assalomu alaykum');
    expect(s.yozlar[0]!.k.keyingi?.matn).toMatch(/^Qaysi sohadagi tovarlar sizga yaqin\?/);
  });

  it('ism qadamida tajriba ham aytsa — AI keyingi savolni ham koʻradi, javob navbatda kutadi', async () => {
    const b = soxtaBaza(ISM);
    const s = soxtaAi(
      [{
        javoblar: [
          { savol_id: 'ism', qiymatlar: ['Aziz Karimov, +998 90 123 45 67'], otkazish: false },
          { savol_id: 'uzum_dokoni', qiymatlar: ['bozorda kiyim sotganman'], otkazish: false },
        ],
        taklif_qiziqish: [], savol_bor: false,
      }],
      [{ oldin: '', izoh: '', savol: 'Aziz, qaysi tovarlarni sotmoqchisiz?' }],
    );
    await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'ism', matn: 'Aziz Karimov, +998 90 123 45 67, oldin bozorda kiyim sotganman' });
    expect(s.tushunlar[0]!.k.savollar.map((x) => x.id)).toEqual(['ism', 'uzum_dokoni']);
    expect(b.holat().javoblar['ism']).toBe('Aziz Karimov');
    // Tajriba — navbatda (oʻz savoli kelganda soʻralmaydi).
    expect(JSON.stringify(b.holat().javoblar['ai_navbat'])).toContain('bozorda kiyim sotganman');
  });

  it('ism kirillda (oʻzbekcha harfsiz) — javob tili ism boʻyicha emas: sahifa tili (oʻzbek)', async () => {
    const b = soxtaBaza(ISM);
    const s = soxtaAi([ismJavobi('Синов Кирилл, +998 90 000 02 03')], [{ oldin: '', izoh: '', savol: 'Qaysi tovarlarni sotmoqchisiz?' }]);
    await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'ism', matn: 'Синов Кирилл, +998 90 000 02 03' });
    expect(s.yozlar[0]!.k.til).toBe('uz');
  });

  it('ruscha suhbatda faqat telefon yuborsa — javob tili rus qoladi (jonli sinov 2026-10-21: oʻzbekchaga sakragan edi)', async () => {
    const b = soxtaBaza({ javoblar: { ...ISM.javoblar, ism: 'Иван Петров' }, natijalar: ISM.natijalar });
    b.jurnal.push({ rol: 'obunachi', matn: 'Здравствуйте, меня зовут Иван Петров. Что вы умеете?' });
    const s = soxtaAi(
      [{ javoblar: [{ savol_id: 'telefon', qiymatlar: ['+998 90 000 05 32'], otkazish: false }], taklif_qiziqish: [], savol_bor: false }],
      [{ oldin: '', izoh: '', savol: 'Какие товары будете продавать?' }],
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
    const b = soxtaBaza(ISM);
    const s = soxtaAi([ismJavobi('Иван Петров, +998 90 000 02 03')], [{ oldin: '', izoh: '', savol: 'Какие товары будете продавать?' }]);
    await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'ism', matn: 'Здравствуйте, меня зовут Иван Петров, +998 90 000 02 03' });
    expect(s.yozlar[0]!.k.til).toBe('ru');
  });

  it('birinchi tashrif: salomlashish jurnalga yoziladi — birinchi javobdan keyin chatdan yoʻqolmaydi', async () => {
    const b = soxtaBaza(boshlangichHolat(), false);
    const s = soxtaAi([], [{ oldin: '', izoh: '', savol: 'Qancha pul bilan boshlaysiz?' }]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', javob: ['kiyim'] });
    const salom = keyingi(boshlangichHolat());
    expect(r.xabarlar[0]).toEqual({ rol: 'menejer', matn: salom.tur === 'savol' ? salom.savol.matn : '', savolId: 'qiziqish' });
    expect(r.xabarlar[1]!.rol).toBe('obunachi');
    // Jurnalda bor boʻlsa — ikkinchi marta yozilmaydi.
    const b2 = soxtaBaza(boshlangichHolat());
    const r2 = await suhbatTurn(bogliq(b2, s.ai), 't', { savolId: 'qiziqish', javob: ['kiyim'] });
    expect(r2.xabarlar[0]!.rol).toBe('obunachi');
  });

  it('javobsiz soʻrov (yangi suhbat) — AI keyingi savolni salomsiz oladi: salomni qayta aytmasin', async () => {
    const b = soxtaBaza(boshlangichHolat(), false);
    const s = soxtaAi([], [{ oldin: '', izoh: '', savol: 'Qaysi sohadagi tovarlar sizga yaqin?' }]);
    await suhbatTurn(bogliq(b, s.ai), 't', {});
    expect(s.yozlar).toHaveLength(1);
    expect(s.yozlar[0]!.k.keyingi!.id).toBe('qiziqish');
    expect(s.yozlar[0]!.k.keyingi!.matn).toMatch(/^Qaysi sohadagi tovarlar sizga yaqin\?/);
  });

  it('faqat ism yozsa — keyingi savol telefon: uni ham AI yozadi, ismi bilan (ilgari kod qolipi edi)', async () => {
    const b = soxtaBaza(ISM);
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
    const b = soxtaBaza(ISM);
    const s = soxtaAi([null], [YOZUV]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'ism', matn: 'Aziz Karimov +998901234567' });
    expect(b.holat().javoblar['ism']).toBe('Aziz Karimov');
    expect(b.holat().javoblar['telefon']).toBe('+998901234567');
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('tovarlar');
    // Tushunish yiqilgan turnda ham xabarni AI yozadi (2026-10-26; ilgari — kod qolipi).
    expect(s.yozlar).toHaveLength(1);
    expect(s.yozlar[0]!.k.mijoz).toBeNull();
  });

  it('AI savolni yozmasa — qayta soʻraladi (uch martagacha); baribir yozmasa — savolning oʻzi', async () => {
    const b = soxtaBaza(QIZIQISH);
    const s = soxtaAi([], [{ oldin: 'Kiyim — yaxshi tanlov.', izoh: '', savol: '' }]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', javob: ['kiyim'] });
    expect(s.yozlar).toHaveLength(3);
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

/** Eski yoʻl LLM lari — AI rejimida hech qachon chaqirilmasligi kerak (2026-10-26). */
function eskiLlmlar() {
  const n = { munosabat: 0, erkin: 0, odamlashtir: 0 };
  const llm = {
    munosabatLlm: async () => { n.munosabat++; return 'ESKI MUNOSABAT'; },
    erkinLlm: async () => { n.erkin++; return 'ESKI ERKIN'; },
    llm: async () => { n.odamlashtir++; return 'ESKI ODAMLASHTIR'; },
  };
  return { n, llm };
}

describe('AI yiqilsa — tayyor javob yoʻq (2026-10-26), chat toʻxtamaydi', () => {
  it('tushunish yiqildi → javobni kod oʻqiydi, xabarni baribir AI yozadi; eski LLM va tayyor munosabat yoʻq', async () => {
    const b = soxtaBaza(TAJRIBA);
    const s = soxtaAi([null], [YOZUV]);
    const e = eskiLlmlar();
    const r = await suhbatTurn(bogliq(b, s.ai, e.llm), 't', { savolId: 'uzum_dokoni', matn: 'oldin sotganman maishiy texnika' });
    expect(s.tushunlar).toHaveLength(1);
    expect(s.yozlar).toHaveLength(1);
    expect(s.yozlar[0]!.k.mijoz).toBe('oldin sotganman maishiy texnika');
    expect(e.n).toEqual({ munosabat: 0, erkin: 0, odamlashtir: 0 });
    expect(b.holat().javoblar['uzum_dokoni']).toBe('oldin sotganman maishiy texnika');
    const matnlar = r.xabarlar.map((x) => x.matn);
    expect(matnlar).not.toContain('Tushunarli — savdo tajribangiz bor ekan, bu katta yordam beradi.');
    expect(matnlar).toContain(YOZUV.oldin);
    expect(matnlar.at(-1)).toBe(YOZUV.savol);
  });

  it('tushunish yiqilib, kod ham qabul qilmasa — erkin javobni AI yozadi (eski erkin LLM emas), sababi AI ga', async () => {
    const b = soxtaBaza(TAJRIBA);
    const s = soxtaAi([null], [{ oldin: 'Tushunmadim — qayerda sotgansiz?', izoh: '', savol: 'Oldin savdo qilganmisiz?' }]);
    const e = eskiLlmlar();
    const r = await suhbatTurn(bogliq(b, s.ai, e.llm), 't', { savolId: 'uzum_dokoni', matn: 'hmm' });
    expect(e.n).toEqual({ munosabat: 0, erkin: 0, odamlashtir: 0 });
    expect(s.yozlar).toHaveLength(1);
    expect(s.yozlar[0]!.k.rad[0]).toMatch(/qabul qilinmadi/);
    expect(b.holat().javoblar['uzum_dokoni']).toBeUndefined();
    expect(r.xabarlar.map((x) => x.matn)).toEqual(['hmm', 'Tushunmadim — qayerda sotgansiz?', 'Oldin savdo qilganmisiz?']);
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('uzum_dokoni');
  });

  it('yozilgan javob+savolga AI yozolmasa (uch urinish) — qisqa uzr va savolning oʻzi; tayyor javob ham, eski LLM ham yoʻq', async () => {
    const b = soxtaBaza(QIZIQISH);
    const s = soxtaAi([{ javoblar: [{ savol_id: 'qiziqish', qiymatlar: ['kiyim'], otkazish: false }], taklif_qiziqish: [], savol_bor: true }], [null]);
    const e = eskiLlmlar();
    const r = await suhbatTurn(bogliq(b, s.ai, e.llm), 't', { savolId: 'qiziqish', matn: 'kiyim sotmoqchiman, tajribasiz boʻladimi?' });
    expect(s.yozlar).toHaveLength(3);
    expect(e.n).toEqual({ munosabat: 0, erkin: 0, odamlashtir: 0 });
    expect(b.holat().javoblar['qiziqish']).toEqual(['kiyim']);
    if (r.keyingi.tur !== 'savol') throw new Error(r.keyingi.tur);
    expect(r.xabarlar.map((x) => [x.rol, x.matn])).toEqual([
      ['obunachi', 'kiyim sotmoqchiman, tajribasiz boʻladimi?'],
      ['menejer', aiUzr('uz', true)],
      ['menejer', r.keyingi.savol.matn],
    ]);
    expect(r.xabarlar.at(-1)!.savolId).toBe('byudjet');
  });

  it('tugma bosilganda AI yozolmasa — uzrsiz: faqat savolning oʻzi', async () => {
    const b = soxtaBaza(QIZIQISH);
    const s = soxtaAi([], [null]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', javob: ['kiyim'] });
    expect(s.yozlar).toHaveLength(3);
    if (r.keyingi.tur !== 'savol') throw new Error(r.keyingi.tur);
    expect(r.xabarlar.map((x) => x.rol)).toEqual(['obunachi', 'menejer']);
    expect(r.xabarlar.at(-1)).toEqual({ rol: 'menejer', matn: r.keyingi.savol.matn, savolId: 'byudjet' });
  });

  it('erkin savolga AI yozolmasa — uzr (bazadagi tayyor javob emas), savol oʻsha; ruschada — ruscha', async () => {
    for (const [matn, til] of [['Bu bepulmi?', 'uz'], ['Это бесплатно?', 'ru']] as const) {
      const b = soxtaBaza(QIZIQISH);
      const s = soxtaAi([{ javoblar: [], taklif_qiziqish: [], savol_bor: true }], [null]);
      const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', matn });
      expect(r.xabarlar.at(-1), til).toEqual({ rol: 'menejer', matn: aiUzr(til), savolId: 'qiziqish' });
      expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('qiziqish');
      // Bazadagi javob AI ga fakt boʻlib berilgan, lekin mijozga oʻzi chiqmaydi.
      expect(s.yozlar[0]!.k.tayyor).toBeTruthy();
      expect(r.xabarlar.some((x) => x.matn === s.yozlar[0]!.k.tayyor)).toBe(false);
    }
  });

  it('javob qabul qilinmasa va AI yozolmasa — kodning sababi (nimani tuzatish kerak); ruschada — ruscha', async () => {
    const b = soxtaBaza(TAJRIBA);
    const r = await suhbatTurn(bogliq(b, soxtaAi([null], [null]).ai), 't', { savolId: 'uzum_dokoni', matn: 'hmm' });
    expect(r.xabarlar.at(-1)).toEqual({
      rol: 'menejer', matn: 'Variantlardan birini tanlang yoki nima sotganingizni bir-ikki soʻz bilan yozing.', savolId: 'uzum_dokoni',
    });
    const b2 = soxtaBaza(TAJRIBA);
    const r2 = await suhbatTurn(bogliq(b2, soxtaAi([null], [null]).ai), 't', { savolId: 'uzum_dokoni', matn: 'ммм' });
    expect(r2.xabarlar.at(-1)!.matn).toBe('Выберите вариант или коротко напишите, что продавали.');
  });

  it('AI raqam toʻqisa — sababi bilan qayta (uch martagacha); baribir toʻqisa — savolning oʻzi', async () => {
    const b = soxtaBaza(QIZIQISH);
    const s = soxtaAi([], [{ oldin: '', izoh: '', savol: 'Kamida 999 mln kerak boʻladi — qancha bilan boshlaysiz?' }]);
    const r = await suhbatTurn(bogliq(b, s.ai), 't', { savolId: 'qiziqish', javob: ['kiyim'] });
    expect(s.yozlar).toHaveLength(3);
    expect(s.yozlar[1]!.k.tuzat).toContain('999 mln');
    expect(s.yozlar[2]!.k.tuzat).toContain('999 mln');
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

  it('tushunish uzoq ketsa — yozishga vaqt qolmaydi: savolning oʻzi, AI siz (uzrsiz — mijoz savol bermagan)', async () => {
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
    expect(r.keyingi.tur === 'savol' && r.keyingi.savol.id).toBe('marja');
    expect(r.xabarlar.map((x) => x.rol)).toEqual(['obunachi', 'menejer']);
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

  it('uchalasi ham oʻtmasa — oxirida «qayta»: ekranda faqat savolning oʻzi qoladi', async () => {
    const b = soxtaBaza(QIZIQISH);
    const s = oqimliAi([], [{ oldin: '', izoh: '', savol: 'Kamida 999 mln kerak — qancha bilan?' }]);
    const o = oqimYozuvchi();
    const r = await suhbatTurn({ ...bogliq(b, s.ai), oqim: o.oqim }, 't', { savolId: 'qiziqish', javob: ['kiyim'] });
    expect(o.h.at(-1)).toEqual(['qayta']);
    expect(o.h.filter(([n]) => n === 'qayta')).toHaveLength(3);
    expect(r.xabarlar[r.xabarlar.length - 1]!.matn).toBe(r.keyingi.tur === 'savol' ? r.keyingi.savol.matn : '');
  });

  it('qoralama chiqqan-u, AI oxirida yiqilsa (oqim uzildi, rad) — «qayta» va yana urinish; baribir — savolning oʻzi', async () => {
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
    const urinish = [['holat', 'yozmoqda'], ['qism', 'Qancha pul'], ['qayta']];
    expect(o.h).toEqual([...urinish, ...urinish, ...urinish]);
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
    await suhbatTurn({ ...bogliq(soxtaBaza(ISM), s.ai), oqim: o.oqim }, 't', { savolId: 'ism', matn: 'Aziz Karimov +998901234567' });
    expect(o.h.map(([n, x]) => (n === 'holat' ? `holat:${String(x)}` : n))).toEqual(['holat:tushunmoqda', 'holat:yozmoqda', 'qism', 'qism']);
  });
});
