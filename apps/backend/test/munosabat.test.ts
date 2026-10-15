/**
 * Javobga munosabat — mijoz savolga oʻzi YOZIB javob bersa, chat uni eshitganini
 * koʻrsatadi.
 *
 * NEGA BU TESTLAR BOR. Nazoratchi (2026-10-15): "mijozning javobiga eʼtibor
 * bermay keyingi savolga oʻtib ketyapti". Jonli jurnalda «oldin sotganman
 * maishiy texnika», «Bozorda kanstovar sotganman», «Sotganman, velosiped opkeb
 * sotganman. Lekin o'xshamagan biznesim. Uzumga vapshe aloqam yoq» — uchalasidan
 * keyin ham munosabatsiz «Qaysi sohadagi tovarlar sizga yaqin?» chiqqan, hech
 * narsa belgilanmagan, «maishiy texnika» varianti ham yoʻq edi.
 *
 * Endi: (1) yozilgan javobga munosabat — kod jumlasi, LLM boʻlsa odamdek (darvoza
 * bilan); (2) tajribadagi soha keyingi savolda oldindan belgilanadi; (3) gapda
 * javob ham, savol ham boʻlsa — ikkalasi: javob qabul, savolga javob.
 */

import { describe, expect, it } from 'vitest';
import {
  boyMatnmi, javobgaMunosabat, javobHamBormi, keyingi, suhbatTurn, tajribaTuri,
  type MunosabatSorovi, type SuhbatBogliqliklari, type YolHolati,
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

/** Kod: dollar kursi va yoʻnalishlar — soxta; qolgani chaqirilmasligi kerak. */
const KOD = new Proxy({}, {
  get: (_, nom) => (nom === 'kurs' ? async () => KURS
    : nom === 'yonalishlar' ? async () => ({ olchov_yoq: false, royxat: [{ categoryId: 11, name: 'Quloqchinlar' }] })
      : nom === 'erkinMalumot' ? undefined
        : async () => { throw new Error(`bu testda kod chaqirilmasligi kerak: ${String(nom)}`); }),
});

function bogliq(b: ReturnType<typeof soxtaBaza>, munosabatLlm?: SuhbatBogliqliklari['munosabatLlm']): SuhbatBogliqliklari {
  return { rpc: b.rpc, kod: KOD as SuhbatBogliqliklari['kod'], ...(munosabatLlm ? { munosabatLlm } : {}) };
}

/** Tajriba savoli (`uzum_dokoni`) turgan holat. */
const TAJRIBA: YolHolati = { javoblar: { ism: 'Aziz Karimov', telefon: '+998901234567' }, natijalar: {} };
/** Qiziqish savoli turgan holat. */
const QIZIQISH: YolHolati = { javoblar: { ism: 'Aziz Karimov', telefon: '+998901234567', uzum_dokoni: 'yoq' }, natijalar: {} };
/** Byudjet savoli turgan holat. */
const BYUDJET: YolHolati = {
  javoblar: { ism: 'Aziz Karimov', telefon: '+998901234567', uzum_dokoni: 'yoq', qiziqish: ['bilmayman'] }, natijalar: { kurs: KURS },
};

/** LLM ga nima borganini yozib, berilgan javoblarni navbat bilan qaytaradi. */
function soxtaLlm(javoblar: Array<string | null>) {
  const sorovlar: MunosabatSorovi[] = [];
  const f = async (k: MunosabatSorovi) => {
    sorovlar.push(k);
    return javoblar[Math.min(sorovlar.length - 1, javoblar.length - 1)] ?? null;
  };
  return { f, sorovlar };
}

describe('tajriba gapi turi', () => {
  it.each([
    ['oldin sotganman maishiy texnika', 'bor'],
    ['Bozorda kanstovar sotganman', 'bor'],
    ["Sotganman, velosiped opkeb sotganman. Lekin o'xshamagan biznesim. Uzumga vapshe aloqam yoq", 'bor'],
    ['Instagramda kosmetika sotyapman', 'bor'],
    ['bozorda sotganman, lekin uzumda sotmaganman', 'bor'],
    ['hech narsa sotmaganman', 'yoq'],
    ['tajribam yoʻq, birinchi marta', 'yoq'],
    ['kiyim sotmoqchiman', 'niyat'],
    ['продавал одежду на рынке', 'bor'],
    ['ещё не продавал', 'yoq'],
    ['Тажрибам йўқ, биринчи марта', 'yoq'],
    ['bilmadim endi', null],
  ])('%s → %s', (matn, tur) => {
    expect(tajribaTuri(matn)).toBe(tur);
  });
});

describe('gapda javob ham, savol ham', () => {
  it('tajriba aytilgan savol — javob ham bor; faqat savol — yoʻq', () => {
    expect(javobHamBormi('uzum_dokoni', 'oldin maishiy texnika sotganman, endi nima sotsam boʻladi?')).toBe(true);
    expect(javobHamBormi('uzum_dokoni', 'nima sotsam boʻladi?')).toBe(false);
    expect(javobHamBormi('uzum_dokoni', 'Uzumda sotish qiyinmi?')).toBe(false);
  });

  it('qiziqish: soha + tanlov soʻzi — javob; faqat soʻrash («elektronika qanday?») — savol', () => {
    expect(javobHamBormi('qiziqish', 'kiyim sotmoqchiman, qiyinmi?')).toBe(true);
    expect(javobHamBormi('qiziqish', 'krossovka sotmoqchiman, boʻladimi?')).toBe(true);
    expect(javobHamBormi('qiziqish', 'elektronika qanday?')).toBe(false);
  });

  it('boshqa savollarda — har doim avval savol (summa, son)', () => {
    expect(javobHamBormi('byudjet', '100 mln bor, 80 mln bilan boshlasammi?')).toBe(false);
  });
});

describe('kod jumlasi (LLM siz)', () => {
  const tajriba = (matn: string) => javobgaMunosabat('uzum_dokoni', matn, { javoblar: { ...TAJRIBA.javoblar, uzum_dokoni: matn }, natijalar: {} });

  it('tajriba bor / yoʻq / niyat — har biriga oʻz gapi', () => {
    expect(tajriba('oldin sotganman maishiy texnika')).toBe('Tushunarli — savdo tajribangiz bor ekan, bu katta yordam beradi.');
    expect(tajriba('hech narsa sotmaganman')).toBe('Hechqisi yoʻq — hamma birinchi marta boshlaydi. Har qadamni birga oʻtamiz.');
    expect(tajriba('kiyim sotmoqchiman')).toBe('Yaxshi — nima sotmoqchiligingiz aniq boʻlsa, tanlash osonroq.');
    expect(tajriba('bilmadim endi')).toBe('Rahmat, yozganingizni hisobga oldim.');
  });

  it('«Uzumga aloqam yoʻq» — Uzumni noldan koʻrsatishini aytadi', () => {
    expect(tajriba("Sotganman, velosiped opkeb sotganman. Lekin o'xshamagan biznesim. Uzumga vapshe aloqam yoq"))
      .toBe('Tushunarli — savdo tajribangiz bor ekan, bu katta yordam beradi. Uzumni bilmasangiz ham xavotir olmang — roʻyxatdan oʻtishdan sotuvgacha butun yoʻlni koʻrsataman.');
  });

  it('ruscha yozsa — ruscha', () => {
    expect(tajriba('продавал одежду на рынке')).toBe('Понятно — у вас уже есть опыт торговли, это очень поможет.');
  });

  it('tugma bosilgan boʻlsa — jumla yoʻq', () => {
    expect(javobgaMunosabat('uzum_dokoni', 'Yoʻq, birinchi marta', { javoblar: { uzum_dokoni: 'yoq' }, natijalar: {} })).toBeNull();
  });

  it('qiziqishni yozsa — qaysi sohalar olingani; «bilmayman» — hamma sohadan', () => {
    expect(javobgaMunosabat('qiziqish', 'kosmetika va kiyim', { javoblar: { qiziqish: ['kiyim', 'gozallik'] }, natijalar: {} }))
      .toBe('Tushundim — yoʻnalishlarni asosan «Kiyim va poyabzal», «Goʻzallik va parvarish» sohalaridan tanlab koʻrsataman.');
    expect(javobgaMunosabat('qiziqish', 'maishiy texnika', { javoblar: { qiziqish: ['uy'] }, natijalar: {} }))
      .toBe('Tushundim — yoʻnalishlarni asosan «Uy-roʻzgʻor va maishiy texnika» sohasidan tanlab koʻrsataman.');
    expect(javobgaMunosabat('qiziqish', 'bilmayman', { javoblar: { qiziqish: ['bilmayman'] }, natijalar: {} }))
      .toBe('Mayli — hamma sohadan eng yaxshilarini koʻrsataman.');
  });

  it('byudjetni gap bilan yozsa — qaysi summa olingani; faqat son — jumla yoʻq', () => {
    expect(javobgaMunosabat('byudjet', 'hozir 100 mln bor, lekin 70 mln bilan boshlamoqchiman', { javoblar: { byudjet: 70_000_000 }, natijalar: {} }))
      .toBe('Tushunarli — 70 000 000 soʻm bilan boshlaymiz.');
    expect(javobgaMunosabat('byudjet', '70000000', { javoblar: { byudjet: 70_000_000 }, natijalar: {} })).toBeNull();
  });

  it('LLM ga arziydigan gap — kamida 3 soʻz', () => {
    expect(boyMatnmi('oldin sotganman maishiy texnika')).toBe(true);
    expect(boyMatnmi('Samarqand')).toBe(false);
    expect(boyMatnmi('60 ta')).toBe(false);
  });
});

describe('suhbat: yozilgan javobga munosabat', () => {
  it('tajriba yozildi — javob qabul, munosabat, keyingi savolda soha OLDINDAN belgilangan (LLM siz)', async () => {
    const b = soxtaBaza(TAJRIBA);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', matn: 'oldin sotganman maishiy texnika' });
    expect(r.xato).toBeUndefined();
    expect(b.holat().javoblar['uzum_dokoni']).toBe('oldin sotganman maishiy texnika');
    expect(r.xabarlar.map((x) => [x.rol, x.savolId ?? null])).toEqual([
      ['obunachi', 'uzum_dokoni'], ['menejer', null], ['menejer', 'qiziqish'],
    ]);
    expect(r.xabarlar[0]!.matn).toBe('oldin sotganman maishiy texnika');
    expect(r.xabarlar[1]!.matn).toBe('Tushunarli — savdo tajribangiz bor ekan, bu katta yordam beradi.');
    // Oddiy tasdiq — 👍/👎 siz.
    expect(r.xabarlar[1]!.javob).toBeUndefined();
    if (r.keyingi.tur !== 'savol') throw new Error(r.keyingi.tur);
    expect(r.keyingi.savol.id).toBe('qiziqish');
    expect(r.keyingi.savol.tanlangan).toEqual(['uy']);
    expect(r.keyingi.savol.matn).toMatch(/Yozganingizga qarab «Uy-roʻzgʻor va maishiy texnika» ni belgilab qoʻydim/);
    expect(r.keyingi.savol.variantlar.find((v) => v.qiymat === 'uy')?.nom).toBe('Uy-roʻzgʻor va maishiy texnika');
  });

  it('LLM munosabati darvozadan oʻtsa — u ketadi (👍/👎 bilan); LLM ga tushunilgan, keyingi savol, holat boradi — ism yoʻq', async () => {
    const b = soxtaBaza(TAJRIBA);
    const llm = soxtaLlm(['Velosiped savdosi oʻxshamagan boʻlsa ham, bu tajriba foydali. Uzumni noldan birga oʻrganamiz.']);
    const r = await suhbatTurn(bogliq(b, llm.f), 'tok', {
      savolId: 'uzum_dokoni', matn: "Sotganman, velosiped opkeb sotganman. Lekin o'xshamagan biznesim. Uzumga vapshe aloqam yoq",
    });
    expect(r.xabarlar[1]).toMatchObject({
      rol: 'menejer', savolId: 'uzum_dokoni', matn: 'Velosiped savdosi oʻxshamagan boʻlsa ham, bu tajriba foydali. Uzumni noldan birga oʻrganamiz.',
      javob: { erkin: true, manba: 'ai', munosabat: true },
    });
    const s = llm.sorovlar[0]!;
    expect(s.tushunilgan).toMatch(/^Tushunarli — savdo tajribangiz bor ekan/);
    expect(s.keyingi).toMatch(/Qaysi sohadagi tovarlar sizga yaqin\?/);
    expect(s.holat).toMatch(/Savdo tajribasi/);
    expect(`${s.holat}\n${s.tarix}`).not.toMatch(/Aziz|Karimov|901234567/);
    expect(s.tayyor).toBeNull();
    expect(s.bilim).toBeNull();
    // Velosiped — sport: keyingi savolda belgilangan.
    if (r.keyingi.tur !== 'savol') throw new Error(r.keyingi.tur);
    expect(r.keyingi.savol.tanlangan).toEqual(['sport']);
  });

  it('LLM yangi raqam qoʻshsa — sababi bilan bir marta qayta; yana oʻtmasa — kod jumlasi', async () => {
    const b = soxtaBaza(TAJRIBA);
    const llm = soxtaLlm(['Zoʻr! Bunday tajriba bilan 3 oyda 50 mln topasiz.', 'Ajoyib — 30 % foyda qilasiz.']);
    const r = await suhbatTurn(bogliq(b, llm.f), 'tok', { savolId: 'uzum_dokoni', matn: 'Bozorda kanstovar sotganman' });
    expect(llm.sorovlar).toHaveLength(2);
    expect(llm.sorovlar[1]!.tuzat).toMatch(/faktlarda yoʻq/);
    expect(r.xabarlar[1]!.matn).toBe('Tushunarli — savdo tajribangiz bor ekan, bu katta yordam beradi.');
  });

  it('LLM savol bilan tugatsa (keyingi savolni oʻzi bersa) — qaytariladi', async () => {
    const b = soxtaBaza(TAJRIBA);
    const llm = soxtaLlm(['Zoʻr! Qaysi sohani tanlaysiz?', 'Zoʻr, kanstovar boʻyicha tajribangiz bor ekan — bu juda asqotadi.']);
    const r = await suhbatTurn(bogliq(b, llm.f), 'tok', { savolId: 'uzum_dokoni', matn: 'Bozorda kanstovar sotganman' });
    expect(llm.sorovlar[1]!.tuzat).toMatch(/savol berma/);
    expect(r.xabarlar[1]!.matn).toBe('Zoʻr, kanstovar boʻyicha tajribangiz bor ekan — bu juda asqotadi.');
  });

  it('LLM yiqilsa (null) — kod jumlasi, qayta soʻralmaydi', async () => {
    const b = soxtaBaza(TAJRIBA);
    const llm = soxtaLlm([null]);
    const r = await suhbatTurn(bogliq(b, llm.f), 'tok', { savolId: 'uzum_dokoni', matn: 'Bozorda kanstovar sotganman' });
    expect(llm.sorovlar).toHaveLength(1);
    expect(r.xabarlar[1]!.matn).toBe('Tushunarli — savdo tajribangiz bor ekan, bu katta yordam beradi.');
  });

  it('tugma matnini oʻzi yozsa («Yoʻq, birinchi marta») — tugma bosilgandek: munosabat ham, LLM ham yoʻq', async () => {
    const llm = soxtaLlm(['xxx']);
    const b = soxtaBaza(TAJRIBA);
    const r = await suhbatTurn(bogliq(b, llm.f), 'tok', { savolId: 'uzum_dokoni', matn: 'Yoʻq, birinchi marta' });
    expect(b.holat().javoblar['uzum_dokoni']).toBe('yoq');
    expect(r.xabarlar.map((x) => x.rol)).toEqual(['obunachi', 'menejer']);
    expect(llm.sorovlar).toHaveLength(0);
  });

  it('qiziqishni uzun yozsa ham — LLM chaqirilmaydi: kod qaysi sohalar olinganini aniq aytadi', async () => {
    const llm = soxtaLlm(['Ajoyib tanlov!']);
    const b = soxtaBaza(QIZIQISH);
    const r = await suhbatTurn(bogliq(b, llm.f), 'tok', { savolId: 'qiziqish', matn: 'kiyim va kosmetika sotmoqchiman' });
    expect(llm.sorovlar).toHaveLength(0);
    expect(r.xabarlar[1]!.matn).toMatch(/^Tushundim — yoʻnalishlarni asosan «Kiyim va poyabzal», «Goʻzallik va parvarish»/);
  });

  it('LLM ga faqat HOZIRGI suhbat tarixi boradi («Boshidan boshlash» dan oldingisi emas)', async () => {
    const b = soxtaBaza(TAJRIBA);
    b.jurnal.unshift(
      { rol: 'obunachi', matn: 'ESKI SUHBATDAGI GAP' },
      { rol: 'kod', matn: 'Yoʻl boshidan boshlandi', savolId: 'boshdan' },
    );
    const llm = soxtaLlm(['Tushunarli, bozor tajribasi asqotadi.']);
    await suhbatTurn(bogliq(b, llm.f), 'tok', { savolId: 'uzum_dokoni', matn: 'Bozorda kanstovar sotganman' });
    expect(llm.sorovlar[0]!.tarix).not.toMatch(/ESKI SUHBATDAGI GAP/);
    expect(llm.sorovlar[0]!.tarix).toMatch(/Oldin savdo qilganmisiz/);
  });

  it('LLM chaqirilMAYDI: tugma, qisqa yozuv, son savoli (byudjet)', async () => {
    const llm = soxtaLlm(['xxx']);
    const b1 = soxtaBaza(TAJRIBA);
    const r1 = await suhbatTurn(bogliq(b1, llm.f), 'tok', { savolId: 'uzum_dokoni', javob: 'yoq' });
    expect(r1.xabarlar.map((x) => x.rol)).toEqual(['obunachi', 'menejer']);
    const b2 = soxtaBaza(QIZIQISH);
    await suhbatTurn(bogliq(b2, llm.f), 'tok', { savolId: 'qiziqish', matn: 'kiyim' });
    const b3 = soxtaBaza(BYUDJET);
    const r3 = await suhbatTurn(bogliq(b3, llm.f), 'tok', { savolId: 'byudjet', matn: 'hozir 100 mln bor lekin 70 mln bilan boshlamoqchiman' });
    expect(llm.sorovlar).toHaveLength(0);
    // Byudjet: avvalgidek — yozgani oʻzicha, keyin qaysi summa olingani.
    expect(r3.xabarlar[0]!.matn).toBe('hozir 100 mln bor lekin 70 mln bilan boshlamoqchiman');
    expect(r3.xabarlar[1]).toEqual({ rol: 'menejer', matn: 'Tushunarli — 70 000 000 soʻm bilan boshlaymiz.' });
  });

  it('ism va telefon LLM ga HECH QACHON ketmaydi — uzun yozilgan boʻlsa ham (maxfiylik)', async () => {
    const llm = soxtaLlm(['xxx']);
    const b = soxtaBaza({ javoblar: {}, natijalar: {} });
    const r = await suhbatTurn(bogliq(b, llm.f), 'tok', { savolId: 'ism', matn: 'Mening ismim Aziz Karimov, telefonim +998 90 123 45 67' });
    expect(r.xato).toBeUndefined();
    expect(b.holat().javoblar['ism']).toBe('Aziz Karimov');
    expect(llm.sorovlar).toHaveLength(0);
  });

  it('qiziqishni yozsa — pufakda yozgani, keyin qanday tushunilgani', async () => {
    const b = soxtaBaza(QIZIQISH);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'qiziqish', matn: 'krossovka va kosmetika' });
    expect(b.holat().javoblar['qiziqish']).toEqual(['kiyim', 'gozallik']);
    expect(r.xabarlar[0]).toMatchObject({ rol: 'obunachi', matn: 'krossovka va kosmetika', javob: ['kiyim', 'gozallik'] });
    expect(r.xabarlar[1]!.matn).toBe('Tushundim — yoʻnalishlarni asosan «Kiyim va poyabzal», «Goʻzallik va parvarish» sohalaridan tanlab koʻrsataman.');
  });

  it('javob + savol bitta gapda — javob QABUL, savolga javob (bazadan yoki rostini aytib), keyingi savol', async () => {
    const b = soxtaBaza(TAJRIBA);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', matn: 'oldin maishiy texnika sotganman, endi nima sotsam boʻladi?' });
    expect(r.xato).toBeUndefined();
    expect(b.holat().javoblar['uzum_dokoni']).toBe('oldin maishiy texnika sotganman, endi nima sotsam boʻladi?');
    expect(r.xabarlar[1]).toMatchObject({ rol: 'menejer', savolId: 'uzum_dokoni', javob: { erkin: true, munosabat: true } });
    expect(r.xabarlar[1]!.matn).toMatch(/^Tushunarli — savdo tajribangiz bor ekan, bu katta yordam beradi\. \S/);
    if (r.keyingi.tur !== 'savol') throw new Error(r.keyingi.tur);
    expect(r.keyingi.savol.id).toBe('qiziqish');
    expect(r.keyingi.savol.tanlangan).toEqual(['uy']);
  });

  it('javob + savol: LLM ga faktlar va savol qismi boradi; bazadagi javobni dastur AI dan keyin oʻzi qoʻshadi', async () => {
    // Jonli sinov (2026-10-15): AI «…endi nima sotsam boʻladi?» savolini javobsiz qoldirgan edi.
    const b = soxtaBaza(TAJRIBA);
    const llm = soxtaLlm(['Maishiy texnika tajribangiz asqotadi.']);
    const r = await suhbatTurn(bogliq(b, llm.f), 'tok', { savolId: 'uzum_dokoni', matn: 'oldin maishiy texnika sotganman, endi nima sotsam boʻladi?' });
    const s = llm.sorovlar[0]!;
    expect(s.bilim).toBeTruthy();
    expect(s.savolBor).toBe(true);
    expect(s.xabar).toBe('oldin maishiy texnika sotganman, endi nima sotsam boʻladi?');
    expect(s.tayyor).toBeTruthy();
    expect(r.xabarlar[1]!.javob).toEqual({ erkin: true, manba: 'ai', munosabat: true });
    expect(r.xabarlar[1]!.matn).toBe(`Maishiy texnika tajribangiz asqotadi.\n\n${s.tayyor}`);
  });

  it('oddiy javobda (savolsiz) — LLM ga «savol bor» deyilmaydi, faqat AI munosabati', async () => {
    const b = soxtaBaza(TAJRIBA);
    const llm = soxtaLlm(['Bozor tajribasi asqotadi.']);
    const r = await suhbatTurn(bogliq(b, llm.f), 'tok', { savolId: 'uzum_dokoni', matn: 'Bozorda kanstovar sotganman' });
    expect(llm.sorovlar[0]!.savolBor).toBe(false);
    expect(llm.sorovlar[0]!.tayyor).toBeNull();
    expect(r.xabarlar[1]!.matn).toBe('Bozor tajribasi asqotadi.');
  });

  it('bazadan maʼlumot kodi matn emas narsa qaytarsa yoki yiqilsa — javob yiqilmaydi (soxta serverda topilgan)', async () => {
    for (const erkinMalumot of [async () => ({ olchov_yoq: true }), async () => { throw new Error('baza'); }]) {
      const b = soxtaBaza(TAJRIBA);
      const kod = { ...(KOD as object), erkinMalumot } as unknown as SuhbatBogliqliklari['kod'];
      const r = await suhbatTurn({ rpc: b.rpc, kod }, 'tok', { savolId: 'uzum_dokoni', matn: 'oldin maishiy texnika sotganman, endi nima sotsam boʻladi?' });
      expect(r.xato).toBeUndefined();
      expect(typeof r.xabarlar[1]!.matn).toBe('string');
      expect(b.holat().javoblar['uzum_dokoni']).toBeTruthy();
    }
  });

  it('faqat savol («nima sotsam boʻladi?») — avvalgidek erkin javob, tajriba yozilmaydi', async () => {
    const b = soxtaBaza(TAJRIBA);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', matn: 'nima sotsam boʻladi?' });
    expect(b.holat().javoblar['uzum_dokoni']).toBeUndefined();
    if (r.keyingi.tur !== 'savol') throw new Error(r.keyingi.tur);
    expect(r.keyingi.savol.id).toBe('uzum_dokoni');
  });
});
