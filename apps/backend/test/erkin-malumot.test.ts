/**
 * Erkin savolga BAZADAGI raqam bilan javob (`erkin-malumot.ts`, `suhbat-kod.ts`).
 *
 * NEGA BU TESTLAR BOR. Jonli oʻlchov (2026-10-14, birinchi marta kirgan
 * mijozning 40 ta savoli): «Uzumda eng koʻp nima sotiladi?», «Kiyim sotish
 * osonmi?», «Raqobat kuchlimi?», «Soliq qancha toʻlayman?», «Bank hisob raqami
 * kerakmi?» ga "hozir aniq javob bera olmayman" chiqdi — holbuki javob bazada
 * bor (2-qadam oʻlchovlari, 7-qadam faktlari). Raqam faqat bazadan; maʼlumot
 * yoʻq — `null`, toʻqilmaydi.
 */

import { describe, expect, it } from 'vitest';
import {
  bankMatni, faktlarniOqi, malumotNiyati, rasmiyFaktlari, soliqMatni, yonalishMalumoti,
  type MalumotNiyati, type NomzodJavobi, type TurkumNomzodi, type Yonalish, type YolHolati,
} from '@selleros/shared';
import { suhbatKodHarakatlari } from '../src/suhbat-kod.js';

describe('malumotNiyati — savol turi', () => {
  it.each([
    ['Soliq qancha toʻlayman?', 'soliq'],
    ['Daromad soligʻi qancha?', 'soliq'],
    ['Какой налог платить?', 'soliq'],
    ['Bank hisob raqami kerakmi?', 'bank'],
    ['Qaysi bankda hisob ochay?', 'bank'],
    ['Нужен ли банковский счёт?', 'bank'],
    // Bank nomi bilan (2026-10-14 jonli: "aniq javob bera olmayman" chiqardi).
    ['Kapitalbankda 3 bepul oydan keyin paket narxi qancha?', 'bank'],
    ['Hamkorbankda hisob ochish uchun ofisga borish shartmi?', 'bank'],
    ['TBCda oylik toʻlov qancha?', 'bank'],
    ['Hisob ochish uchun nima kerak?', 'bank'],
    ['Uzumda eng koʻp nima sotiladi?', 'top'],
    ['Что больше всего продают на Uzum?', 'top'],
    ['Raqobat kuchlimi?', 'raqobat'],
    ['Uzumda savdo qilish osonmi?', 'raqobat'],
    ['Nima sotsam yaxshi?', 'tavsiya'],
    ['Kiyim sotish osonmi?', 'soha'],
    ['Krossovka sotish osonmi?', 'soha'],
    ['Kanstovar Uzumda yuradimi?', 'soha'],
  ])('«%s» → %s', (matn, tur) => {
    expect(malumotNiyati(matn)?.tur).toBe(tur);
  });

  it('soha va tovar soʻzlari ajratiladi', () => {
    expect(malumotNiyati('Kiyimda raqobat kuchlimi?')).toMatchObject({ tur: 'raqobat', sohalar: ['kiyim'] });
    expect(malumotNiyati('Kiyim sotish osonmi?')).toMatchObject({ sohalar: ['kiyim'], sozlar: [] });
    expect(malumotNiyati('Krossovka sotish osonmi?')).toMatchObject({ sohalar: [], sozlar: ['krossovka'] });
  });

  it('«banka» (idish) — bank savoli emas', () => {
    expect(malumotNiyati('Shisha banka sotsam boʻladimi?')?.tur).not.toBe('bank');
  });

  it('maʼlumot savoli emas — null (bilim bazasi javob beradi)', () => {
    for (const t of ['Ertaga ob-havo qanday?', 'Salom', 'Pul qachon tushadi?', 'Kartochka yaratish qiyinmi?',
      'YATT ochish osonmi?', 'Rasmiylashtirish qanday boʻladi?', '1688 nima?', '']) {
      expect(malumotNiyati(t), t).toBeNull();
    }
  });
});

// 0057 seed shakli va raqamlari (izohdagi "[TASDIQ]" ham — u chatga chiqmasligi kerak). Hamkorbank
// `onlayn: false` (2026-10-14 oʻlchovi: hujjatlar ofisda), Agrobank — `onlayn: null`, izohsiz.
const Q = (qiymat: unknown, manba = 'manba') => ({ qiymat, birlik: null, manba, olchandi: '2026-09-28', izoh: null });
const FAKT = {
  'bhm.som': Q(440_000, 'PF-115'),
  'soliq.aylanma_foiz': Q(1, 'PQ-247 12.08.2025 (lex.uz/docs/-7681520)'), 'soliq.aylanma_chegara_som': Q(1_000_000_000),
  'soliq.ijtimoiy_oy_bhm': Q(1), 'soliq.tolov_kuni': Q(15), 'soliq.rejim_tugaydi': Q('2030-12-31'),
  'bank.royxat': Q([
    { nom: 'Kapitalbank (Uzum Business ilovasi)', onlayn: true, ochish_som: 0, oylik_som: null,
      izoh: '3 oy bepul, keyin paket (Start/Pro Business — narxi PDF, [TASDIQ]); aksiyada boshqa bankka 0,1 %. Uzum guruhi banki. Toshkent.',
      olchandi: '2026-09-28' },
    { nom: 'TBC Bank (TBC Biznes)', onlayn: true, ochish_som: 0, oylik_som: 0, izoh: 'Basic — bepul, operatsiya boʻyicha toʻlov; Biznes — 170 000/oy. ERI kerak emas.' },
    { nom: 'Hamkorbank', onlayn: false, ochish_som: 0, oylik_som: 220_000, izoh: 'ILK QADAM — 220 000/oy (aylanma 15 mln gacha); hujjat ofisda [TASDIQ]; naqd 1 %.' },
    { nom: 'Agrobank', onlayn: null, ochish_som: 0, oylik_som: 60_000, izoh: null },
  ]),
};

describe('soliqMatni / bankMatni — 7-qadam faktlaridan', () => {
  it('soliq: aylanma foizi, chegara, muddat, ijtimoiy soliq, misol hisobi, manba va ogohlantirish', () => {
    const m = soliqMatni(rasmiyFaktlari(faktlarniOqi(FAKT)))!;
    expect(m).toMatch(/^Soliq rasmiylashtirish shakliga bogʻliq\. Eng oddiy shakl — YATT; uning soligʻi ikki qism:\n• aylanma soligʻi — sotuvdan 1 % \(yillik savdo 1 mlrd soʻmgacha boʻlsa; bu rejim 31\.12\.2030 gacha\)\. U xaridor toʻlagan toʻliq narxdan hisoblanadi — Uzum komissiyasi chegirilmaydi\.\n• ijtimoiy soliq — har oy 440 000 soʻm, sotuv boʻlmasa ham, oyning 15-sanasigacha\.\n\n/);
    expect(m).toMatch(/\n\nMasalan, oyiga 5 000 000 soʻm sotsangiz: 440 000 \+ 50 000 = 490 000 soʻm\.\n\n/);
    expect(m).toMatch(/Manba: PQ-247 12\.08\.2025 \(lex\.uz\/docs\/-7681520\) \(oʻlchandi 28\.09\.2026\)/);
    expect(m).toMatch(/soliq maslahati emas/);
  });

  it('soliq: fakt yoʻq — null; faqat ijtimoiy — misolsiz (yarim hisob chiqmaydi)', () => {
    expect(soliqMatni(rasmiyFaktlari({}))).toBeNull();
    const faqat = soliqMatni(rasmiyFaktlari(faktlarniOqi({ 'bhm.som': Q(440_000), 'soliq.ijtimoiy_oy_bhm': Q(1) })))!;
    expect(faqat).toMatch(/uning soligʻi:\n• ijtimoiy soliq — har oy 440 000 soʻm/);
    expect(faqat).not.toMatch(/Masalan|ikki qism|aylanma/);
  });

  it('bank: Uzum qoidasi, banklar qisqa izoh bilan — "[TASDIQ]" chatga chiqmaydi; ochish usuli; sana', () => {
    const m = bankMatni(rasmiyFaktlari(faktlarniOqi(FAKT)))!;
    expect(m).toMatch(/^Ha, bank hisob raqami kerak: Uzum pulni faqat oʻz nomingizdagi biznes hisob raqamiga/);
    expect(m).toMatch(/5 tagacha hisob raqam/);
    expect(m).toMatch(/\n\nTaqqoslangan banklar \(hammasida hisob ochish bepul\):\n• Kapitalbank \(Uzum Business ilovasi\): onlayn ochiladi; 3 oy bepul, keyin paket; aksiyada boshqa bankka 0,1 %\n/);
    expect(m).toMatch(/\n• TBC Bank \(TBC Biznes\): onlayn ochiladi; Basic — bepul/);
    // onlayn: false — «ofisga borib ochiladi»; null — usul aytilmaydi, izoh yoʻq — oylik toʻlov.
    expect(m).toMatch(/\n• Hamkorbank: ofisga borib ochiladi; ILK QADAM — 220 000\/oy \(aylanma 15 mln gacha\); hujjat ofisda; naqd 1 %\n/);
    expect(m).toMatch(/\n• Agrobank: oylik 60 000 soʻm\n\n/);
    expect(m).not.toMatch(/TASDIQ|PDF/);
    expect(m).toMatch(/28\.09\.2026 da bank saytlaridan/);
  });

  it('bank nomi aytilgan — oʻsha bank toʻliq (usul, ochish, izoh, manba), qolganlari nomi bilan', () => {
    const f = rasmiyFaktlari(faktlarniOqi(FAKT));
    const m = bankMatni(f, niyat('Hamkorbankda hisob ochish uchun ofisga borish shartmi?'))!;
    expect(m).toMatch(/^Hamkorbank — ofisga borib ochiladi, ochish bepul:\nILK QADAM — 220 000\/oy \(aylanma 15 mln gacha\); hujjat ofisda; naqd 1 %\.\nManba: manba\.\n\n/);
    expect(m).toMatch(/\n\nTariflar 28\.09\.2026 da bank saytlaridan olingan.* Boshqa banklar ham bor: Kapitalbank \(Uzum Business ilovasi\), TBC Bank \(TBC Biznes\), Agrobank — /);
    expect(m).not.toMatch(/Taqqoslangan banklar|TASDIQ/);
    // Ikki soʻz («Kapital bankda»), izohsiz bank — oylik toʻlov; ikki bank — ikkalasi.
    expect(bankMatni(f, niyat('Kapital bankda paket narxi qancha?'))).toMatch(/^Kapitalbank \(Uzum Business ilovasi\) — onlayn ochiladi, ochish bepul:\n3 oy bepul/);
    expect(bankMatni(f, niyat('Agrobankda oylik qancha?'))).toMatch(/^Agrobank — ochish bepul:\nOylik xizmat — 60 000 soʻm\.\nManba: manba\.\n\n/);
    const ikki = bankMatni(f, niyat('TBC yoki Hamkorbank — qaysi bank yaxshi?'))!;
    expect(ikki).toMatch(/^TBC Bank \(TBC Biznes\) — onlayn ochiladi, ochish bepul:\n[^\n]+\nManba: manba\.\n\nHamkorbank — ofisga borib ochiladi/);
    expect(ikki).toMatch(/Boshqa banklar ham bor: Kapitalbank \(Uzum Business ilovasi\), Agrobank — /);
  });

  it('bank nomi aytilmagan — umumiy roʻyxat', () => {
    const m = bankMatni(rasmiyFaktlari(faktlarniOqi(FAKT)), niyat('Qaysi bankda hisob ochay?'))!;
    expect(m).toMatch(/^Ha, bank hisob raqami kerak/);
    expect(m).toMatch(/Taqqoslangan banklar/);
  });

  it('bank: roʻyxat yoʻq — null', () => {
    expect(bankMatni(rasmiyFaktlari({}))).toBeNull();
  });
});

const Y = (categoryId: number, name: string, soha: string, ball: number, talab: number | null, sotuvchi: number | null, top3: number | null): Yonalish => ({
  categoryId, name, soha, yetadi: null, optimalKirishSom: null,
  ball: { value: ball, breakdown: [] }, dalil: { talabOlchovi: talab, sotuvchiSoni: sotuvchi, top3Ulush: top3 },
}) as unknown as Yonalish;

/** Bali boʻyicha (`yonalishBaholari` tartibi). */
const ROYXAT: Yonalish[] = [
  Y(1, 'Ruchkalar', 'kanstovar', 78, 400, 300, 12),
  Y(2, 'Krossovkalar', 'kiyim', 74, 900, 1500, 18),
  Y(3, 'Futbolkalar', 'kiyim', 71, 950, 2000, 25),
  Y(4, 'Atirlar', 'gozallik', 66, 700, 800, 45),
  Y(5, 'Simsiz quloqchinlar', 'elektronika', 52, 1000, 600, 72),
  Y(6, 'Paypoqlar', 'kiyim', 40, 300, 100, 65),
];
const niyat = (matn: string): MalumotNiyati => malumotNiyati(matn)!;

describe('yonalishMalumoti — 2-qadam oʻlchovlaridan', () => {
  it('eng koʻp sotiladi — xaridor oʻlchovi boʻyicha; kuchli raqobat misoli; yangi sotuvchiga qulaylari (har xil sohadan)', () => {
    const m = yonalishMalumoti(niyat('Uzumda eng koʻp nima sotiladi?'), ROYXAT)!;
    expect(m).toMatch(/^Uzumda xaridori eng koʻp yoʻnalishlar \(Uzum katalogidagi oʻlchov boʻyicha\): «Simsiz quloqchinlar», «Futbolkalar», «Krossovkalar», «Atirlar», «Ruchkalar»\./);
    expect(m).toMatch(/«Simsiz quloqchinlar» da eng katta 3 doʻkon savdoning 72 % ini oladi/);
    expect(m).toMatch(/imkoniyat bahosi eng yuqorilari: «Ruchkalar» — 78 ball, «Krossovkalar» — 74 ball, «Atirlar» — 66 ball/);
    expect(m).toMatch(/2-qadamda \(Yoʻnalish\)/);
  });

  it('nima sotsam yaxshi — bali eng yuqori 3 ta, har xil sohadan, karta maʼlumoti bilan', () => {
    const m = yonalishMalumoti(niyat('Nima sotsam yaxshi?'), ROYXAT)!;
    expect(m).toMatch(/«Ruchkalar» \(Kanstovar va kitob\) — 78 ball/);
    expect(m).toMatch(/«Krossovkalar» \(Kiyim va poyabzal\) — 74 ball/);
    expect(m).toMatch(/«Atirlar»/);
    expect(m).not.toMatch(/«Futbolkalar»/);
    expect(m).toMatch(/tanlov — sizniki/);
  });

  it('raqobat — chegaralar kartadagi bilan bir xil (30 / 60 %); sohada — faqat oʻsha soha', () => {
    const m = yonalishMalumoti(niyat('Raqobat kuchlimi?'), ROYXAT)!;
    expect(m).toMatch(/Uzumda raqobati oʻlchangan 6 ta yoʻnalishdan:\n• 3 tasida bozor ochiq — eng katta 3 doʻkon savdoning 30 % idan kamini oladi\n• 1 tasida yirik doʻkonlar bor \(30–60 %\)\n• 2 tasida bozor bir necha doʻkon qoʻlida \(60 % dan koʻp\) — u yerda yangi sotuvchiga qiyin\n\n/);
    expect(m).toMatch(/Masalan, bozor ochiq va bahosi yuqori: «Ruchkalar»/);
    const k = yonalishMalumoti(niyat('Kiyimda raqobat kuchlimi?'), ROYXAT)!;
    expect(k).toMatch(/Kiyim va poyabzal sohasida raqobati oʻlchangan 3 ta yoʻnalishdan:\n• 2 tasida bozor ochiq/);
  });

  it('raqobat chegaralari: 30 % — «yirik doʻkonlar bor», 60 % — «bir necha doʻkon qoʻlida» (kartadagi `<` bilan bir xil)', () => {
    const m = yonalishMalumoti(niyat('Raqobat kuchlimi?'), [Y(1, 'A', 'uy', 70, 1, 10, 30), Y(2, 'B', 'uy', 60, 1, 10, 60), Y(3, 'C', 'uy', 50, 1, 10, 29.6)])!;
    expect(m).toMatch(/3 ta yoʻnalishdan:\n• 1 tasida bozor ochiq.*\n• 1 tasida yirik doʻkonlar bor.*\n• 1 tasida bozor bir necha doʻkon qoʻlida/);
    expect(m).toMatch(/Masalan, bozor ochiq va bahosi yuqori: «C»/);
    // Soni 0 boʻlgan guruh aytilmaydi ("0 tasida … qiyin" chiqmaydi).
    const ochiq = yonalishMalumoti(niyat('Raqobat kuchlimi?'), [Y(1, 'A', 'uy', 70, 1, 10, 10), Y(2, 'B', 'uy', 60, 1, 10, 20)])!;
    expect(ochiq).toMatch(/2 ta yoʻnalishdan:\n• 2 tasida bozor ochiq/);
    expect(ochiq).not.toMatch(/0 tasida|yirik|qoʻlida/);
  });

  it('raqobat — yoʻnalish tanlangan va savolda soha yoʻq: oʻsha yoʻnalishniki', () => {
    const m = yonalishMalumoti(niyat('Raqobat kuchlimi?'), ROYXAT, 5)!;
    expect(m).toMatch(/^Siz tanlagan «Simsiz quloqchinlar» yoʻnalishida eng katta 3 doʻkon savdoning 72 % ini oladi — bozor bir necha doʻkon qoʻlida/);
    expect(m).toMatch(/jami 600 ta sotuvchi/);
    expect(m).toMatch(/52 ball \(«oʻrtacha»\)/);
  });

  it('«Kiyim sotish osonmi?» — soha soni, baholari, eng yuqorilari va kiyimga tegishli Uzum fakti', () => {
    const m = yonalishMalumoti(niyat('Kiyim sotish osonmi?'), ROYXAT)!;
    expect(m).toMatch(/^Kiyim va poyabzal sohasida 3 ta yoʻnalish kuzatiladi: 2 tasining imkoniyat bahosi «yaxshi» \(70 va undan yuqori\)\. Eng yuqorilari:\n• «Krossovkalar»/);
    expect(m).not.toMatch(/0 tasi/);
    expect(m).toMatch(/Yangi SKU’lar bepul saqlanadi: kiyim, poyabzal/);
  });

  it('«Krossovka sotish osonmi?» — tovar nomi boʻyicha oʻsha yoʻnalish', () => {
    const m = yonalishMalumoti(niyat('Krossovka sotish osonmi?'), ROYXAT)!;
    expect(m).toMatch(/^Uzumda «Krossovkalar» \(Kiyim va poyabzal\) — 74 ball/);
    expect(m).toMatch(/«Krossovkalar» bahosi «yaxshi»/);
  });

  it('maʼlumot yoʻq — null (toʻqilmaydi)', () => {
    expect(yonalishMalumoti(niyat('Raqobat kuchlimi?'), [])).toBeNull();
    expect(yonalishMalumoti(niyat('Avto tovarlar sotish osonmi?'), ROYXAT)).toBeNull();
    expect(yonalishMalumoti(niyat('Raqobat kuchlimi?'), [Y(1, 'X', 'boshqa', 60, 1, 1, null)])).toBeNull();
  });
});

const nomzod = (categoryId: number, name: string, talabOlchovi: number, top3Ulush: number): TurkumNomzodi => ({
  categoryId, name, talabOlchovi, sotuvchiSoni: 120, top3Ulush, optimalKirishSom: null,
  talablar: { markirovka: false, sertifikat: false, haftalar: null }, mavsumiylik: null,
});
const KESH: NomzodJavobi = {
  hisoblandi: '2026-10-14T06:00:00Z', yoshi_soat: 2,
  royxat: [nomzod(1, 'Sumkalar', 1000, 20), nomzod(2, 'Krossovkalar', 900, 70), nomzod(4, 'Ruchkalar', 400, 15)],
};

function kod(javoblar: Record<string, unknown>) {
  const chaqiruvlar: string[] = [];
  const rpc = async <T>(nom: string): Promise<T | null> => { chaqiruvlar.push(nom); return (javoblar[nom] ?? null) as T | null; };
  const k = suhbatKodHarakatlari(rpc, () => ({ bayroqlar: [], baholanmadi: [] }), () => 10);
  return { k, chaqiruvlar };
}
const H: YolHolati = { javoblar: {}, natijalar: {} };

describe('suhbat-kod: erkinMalumot — bazadan oʻqiydi', () => {
  it('soliq va bank — fakt jadvalidan (so_fakt_oqi); yoʻnalish oʻlchoviga tegmaydi', async () => {
    const { k, chaqiruvlar } = kod({ so_fakt_oqi: FAKT });
    expect(await k.erkinMalumot!(niyat('Soliq qancha?'), H)).toMatch(/440 000 soʻm/);
    expect(await k.erkinMalumot!(niyat('Bank kerakmi?'), H)).toMatch(/TBC Bank/);
    // Bank nomi savoldan oʻtadi — oʻsha bank toʻliq.
    expect(await k.erkinMalumot!(niyat('Hamkorbankda ofisga borish shartmi?'), H)).toMatch(/^Hamkorbank — ofisga borib ochiladi/);
    expect(chaqiruvlar).toEqual(['so_fakt_oqi', 'so_fakt_oqi', 'so_fakt_oqi']);
  });

  it('eng koʻp sotiladi va raqobat — 2-qadam keshidan, oʻsha ball bilan', async () => {
    const { k, chaqiruvlar } = kod({ so_yonalish_nomzodlari: KESH });
    expect(await k.erkinMalumot!(niyat('Uzumda eng koʻp nima sotiladi?'), H)).toMatch(/«Sumkalar», «Krossovkalar», «Ruchkalar»/);
    expect(await k.erkinMalumot!(niyat('Raqobat kuchlimi?'), { javoblar: { yonalish: 2 }, natijalar: {} })).toMatch(/^Siz tanlagan «Krossovkalar»/);
    expect(chaqiruvlar.every((c) => c === 'so_yonalish_nomzodlari')).toBe(true);
  });

  it('baza javob bermasa yoki kesh boʻsh — null (chatda bilim bazasining umumiy javobi chiqadi)', async () => {
    expect(await kod({}).k.erkinMalumot!(niyat('Soliq qancha?'), H)).toBeNull();
    expect(await kod({}).k.erkinMalumot!(niyat('Raqobat kuchlimi?'), H)).toBeNull();
    expect(await kod({ so_yonalish_nomzodlari: { ...KESH, royxat: [] } }).k.erkinMalumot!(niyat('Raqobat kuchlimi?'), H)).toBeNull();
  });
});
