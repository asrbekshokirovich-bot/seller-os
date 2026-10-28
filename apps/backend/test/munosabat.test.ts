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
  javobgaMunosabat, javobHamBormi, keyingi, suhbatTurn, tajribaTuri,
  type SuhbatBogliqliklari, type YolHolati,
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

const YONALISHLAR = { olchov_yoq: false, royxat: [{ categoryId: 11, name: 'Quloqchinlar' }] };
const TOVARLAR = {
  olchov_yoq: false,
  royxat: [{ nomzod: { productId: 100, title: 'Quloqchin A', soldUnits30d: 600, sotuvManbasi: 'olchandi' as const, qoldiq: 40 },
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

function bogliq(b: ReturnType<typeof soxtaBaza>): SuhbatBogliqliklari {
  return { rpc: b.rpc, kod: KOD as SuhbatBogliqliklari['kod'] };
}

const SHAXS = { ism: 'Aziz Karimov', telefon: '+998901234567' };
/** Qiziqish — birinchi savol (2026-10-26); ismi bor (tanish) mijoz — salomsiz. */
const QIZIQISH: YolHolati = { javoblar: { ...SHAXS }, natijalar: {} };
/** Ism savoli — yoʻnalish tanlangach (2026-10-26). */
const ISM: YolHolati = { javoblar: { qiziqish: ['bilmayman'], byudjet: 10_000_000, yonalish: 11 }, natijalar: { kurs: KURS, yonalishlar: YONALISHLAR } };
/** Tajriba savoli (`uzum_dokoni`) — tovar va miqdordan keyin, tannarxdan oldin (2026-10-26). */
const TAJRIBA: YolHolati = {
  javoblar: { ...ISM.javoblar, ...SHAXS, tovarlar: [100], 'miqdor:100': 30 }, natijalar: { ...ISM.natijalar, tovarlar: TOVARLAR },
};


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

});

describe('suhbat: yozilgan javobga munosabat', () => {
  it('tajriba yozildi — javob qabul, munosabat, keyingi savol — marja (2026-10-26: tajriba tannarxdan oldin; LLM siz)', async () => {
    const b = soxtaBaza(TAJRIBA);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', matn: 'oldin sotganman maishiy texnika' });
    expect(r.xato).toBeUndefined();
    expect(b.holat().javoblar['uzum_dokoni']).toBe('oldin sotganman maishiy texnika');
    expect(r.xabarlar.map((x) => [x.rol, x.savolId ?? null])).toEqual([
      ['obunachi', 'uzum_dokoni'], ['menejer', null], ['menejer', 'marja'],
    ]);
    expect(r.xabarlar[0]!.matn).toBe('oldin sotganman maishiy texnika');
    expect(r.xabarlar[1]!.matn).toBe('Tushunarli — savdo tajribangiz bor ekan, bu katta yordam beradi.');
    // Oddiy tasdiq — 👍/👎 siz.
    expect(r.xabarlar[1]!.javob).toBeUndefined();
    if (r.keyingi.tur !== 'savol') throw new Error(r.keyingi.tur);
    expect(r.keyingi.savol.id).toBe('marja');
  });

  it('tugma matnini oʻzi yozsa («Yoʻq, birinchi marta») — tugma bosilgandek: munosabat yoʻq', async () => {
    const b = soxtaBaza(TAJRIBA);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', matn: 'Yoʻq, birinchi marta' });
    expect(b.holat().javoblar['uzum_dokoni']).toBe('yoq');
    expect(r.xabarlar.map((x) => x.rol)).toEqual(['obunachi', 'menejer']);
  });

  it('qiziqishni uzun yozsa — kod qaysi sohalar olinganini aniq aytadi', async () => {
    const b = soxtaBaza(QIZIQISH);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'qiziqish', matn: 'kiyim va kosmetika sotmoqchiman' });
    expect(r.xabarlar[1]!.matn).toMatch(/^Tushundim — yoʻnalishlarni asosan «Kiyim va poyabzal», «Goʻzallik va parvarish»/);
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
    expect(r.keyingi.savol.id).toBe('marja');
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

describe('soʻroq soʻzi gap ichida — savol (nazoratchi sinovi, 2026-10-19)', () => {
  it('qiziqishga «gozallik va parvarish qanday tovarlar» — javob deb OLINMAYDI: savolga javob, savol oʻsha', async () => {
    const b = soxtaBaza({ javoblar: { ism: 'Aziz Karimov', telefon: '+998901234567', uzum_dokoni: 'oldin ayollar kosmetikasi sotganman' }, natijalar: {} });
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'qiziqish', matn: 'gozallik va parvarish qanday tovarlar' });
    expect(r.xato).toBeUndefined();
    expect(b.holat().javoblar['qiziqish']).toBeUndefined();
    expect(r.xabarlar.map((x) => x.rol)).toEqual(['obunachi', 'menejer']);
    expect(r.xabarlar[1]!.javob).toMatchObject({ erkin: true });
    if (r.keyingi.tur !== 'savol') throw new Error(r.keyingi.tur);
    expect(r.keyingi.savol.id).toBe('qiziqish');
    // Oldindan belgilangan soha joyida qoladi.
    expect(r.keyingi.savol.tanlangan).toEqual(['gozallik']);
    // AI siz ham — bazadan aniq javob: sohaga nimalar kiradi.
    expect(r.xabarlar[1]!.matn).toMatch(/«Goʻzallik va parvarish» sohasiga, masalan: atirlar/);
    expect(r.xabarlar[1]!.matn).toMatch(/Hozirgi savol: «Qaysi sohadagi tovarlar sizga yaqin[?]»$/);
  });

  it('«komissiya qancha», «nechta olsam» — savol; «bir necha marta kiyim sotganman» — javob', async () => {
    for (const matn of ['uzumda komissiya qancha', 'birinchi partiyaga nechta olsam', 'kosmetika nima degani']) {
      const b = soxtaBaza(TAJRIBA);
      await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', matn });
      expect(b.holat().javoblar['uzum_dokoni'], matn).toBeUndefined();
    }
    const b = soxtaBaza(TAJRIBA);
    const r = await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', matn: 'bir necha marta kiyim sotganman' });
    expect(b.holat().javoblar['uzum_dokoni']).toBe('bir necha marta kiyim sotganman');
    // Savol yoʻq — munosabatda «savolingizga…» qismi ham yoʻq.
    expect(r.xabarlar[1]!.matn).toBe('Tushunarli — savdo tajribangiz bor ekan, bu katta yordam beradi.');
  });

  it('«nimadir», «kimdir» — soʻroq emas; tajriba + gap ichidagi savol — javob ham, savol ham', async () => {
    const b = soxtaBaza(TAJRIBA);
    await suhbatTurn(bogliq(b), 'tok', { savolId: 'uzum_dokoni', matn: 'nimadir sotganman bozorda' });
    expect(b.holat().javoblar['uzum_dokoni']).toBe('nimadir sotganman bozorda');
    // Tajriba gapi yoʻq joyda ham: «nimadir» — soʻroq emas, qiziqish javobi qabul qilinadi.
    const bq = soxtaBaza(QIZIQISH);
    await suhbatTurn(bogliq(bq), 'tok', { savolId: 'qiziqish', matn: 'kosmetika va yana nimadir' });
    expect(bq.holat().javoblar['qiziqish']).toEqual(['gozallik']);
    const b2 = soxtaBaza(TAJRIBA);
    const r = await suhbatTurn(bogliq(b2), 'tok', { savolId: 'uzum_dokoni', matn: 'kiyim sotganman, uzumda komissiya qancha' });
    expect(b2.holat().javoblar['uzum_dokoni']).toBe('kiyim sotganman, uzumda komissiya qancha');
    expect(r.xabarlar[1]!.javob).toMatchObject({ erkin: true, munosabat: true });
  });
});
