/**
 * Yordamchi bilimi (nazoratchi, 2026-10-13: "Uzum qoʻllanmasidan yigʻing").
 * LLM bu faktlarni rost deb aytadi va tekshiruv darvozasi ularning raqamlarini
 * ruxsat etadi — shuning uchun har fakt manbasi bilan, taqiqlangan soʻzsiz.
 */

import { describe, expect, it } from 'vitest';
import { bilimJavobi, mijozHolati, suhbatTarixi, UZUM_BILIMI, yordamchiBilimi, type YolHolati } from '@selleros/shared';

describe('Uzum bilimi', () => {
  it('har fakt manbasi bilan; "kafolat" yoʻq (darvoza uni taqiqlaydi)', () => {
    expect(UZUM_BILIMI.length).toBeGreaterThanOrEqual(80);
    for (const f of UZUM_BILIMI) {
      expect(f, f.slice(0, 60)).toMatch(/\(Manba: [^)]+\)$/u);
      expect(f).not.toMatch(/kafolat/iu);
    }
  });

  it('zid manbalar "Aniq emas" deb yozilgan, qatʼiy fakt emas', () => {
    const aniqEmas = UZUM_BILIMI.filter((f) => f.includes('Aniq emas'));
    expect(aniqEmas.length).toBeGreaterThan(0);
    expect(UZUM_BILIMI.some((f) => f.includes('MFO') && !f.includes('Aniq emas'))).toBe(false);
  });

  it('yordamchiga: asos har doim; Uzum faktlari — FAQAT savolga tegishlisi (bepul limit tejaladi, 2026-10-13)', () => {
    const log = yordamchiBilimi('logistika qancha turadi?');
    expect(log).toMatch(/ZumSavdo qadamlari/);
    expect(log).toMatch(/Soʻzlar lugʻati/);
    expect(log).toMatch(/Umumiy maslahatlar/);
    expect(log).toMatch(/5 250 so‘m/);
    expect(log).not.toMatch(/To‘lov jadvallari/);
    expect(yordamchiBilimi('pul qachon tushadi?')).toMatch(/To‘lov jadvallari/);
    // Savolga aloqasi yoʻq — Uzum faktlari umuman yuborilmaydi.
    expect(yordamchiBilimi('salom')).not.toMatch(/Uzum haqida faktlar/);
    expect(yordamchiBilimi('logistika').length).toBeLessThan(UZUM_BILIMI.join(' ').length);
    // Umumiy soʻzlar ("qancha", "kerak") fakt tortib kelmaydi.
    expect(yordamchiBilimi('qancha kerak?')).not.toMatch(/Uzum haqida faktlar/);
  });
});

describe('mijoz holati va suhbat — shaxsiy maʼlumotsiz', () => {
  const H: YolHolati = {
    javoblar: { ism: 'Aziz Karimov', telefon: '+998901234567', uzum_dokoni: 'Bozorda kanstovar sotganman', qiziqish: ['kanstovar'], byudjet: 80_000_000 },
    natijalar: {},
  };

  it('holat: qadam, tajriba, qiziqish, pul — ism va telefon yoʻq', () => {
    const m = mijozHolati(H, 2);
    expect(m).toMatch(/2-qadam «Yoʻnalish»/);
    expect(m).toMatch(/«Bozorda kanstovar sotganman»/);
    expect(m).toMatch(/Kanstovar va kitob/);
    expect(m).toMatch(/80 000 000 soʻm/);
    expect(m).not.toMatch(/Aziz|Karimov|998/);
  });

  it('tarix: ism/telefon savollari tashlanadi, qolgan matndan ism olib tashlanadi', () => {
    const t = suhbatTarixi([
      { rol: 'menejer', matn: 'Ismingiz?', savolId: 'ism' },
      { rol: 'obunachi', matn: 'Aziz Karimov', savolId: 'ism' },
      { rol: 'menejer', matn: 'Aziz, telefon raqamingizni yozing', savolId: 'telefon' },
      { rol: 'obunachi', matn: '+998901234567', savolId: 'telefon' },
      { rol: 'menejer', matn: 'Rahmat, Aziz! Oldin savdo qilganmisiz?', savolId: 'uzum_dokoni' },
      { rol: 'obunachi', matn: 'bozorda sotganman' },
    ], H);
    expect(t).not.toMatch(/Aziz|Karimov|998901234567/);
    expect(t).toMatch(/Yordamchi: Rahmat, …! Oldin savdo qilganmisiz\?/);
    expect(t).toMatch(/Mijoz: bozorda sotganman/);
  });
});

describe('bilimdan javob — LLM ishlamasa ham (jonli sinov, 2026-10-13: Gemini limiti tugagan)', () => {
  const ROYXAT = { olchov_yoq: false, royxat: [
    { categoryId: 1, name: 'Ruchkalar', soha: 'kanstovar', yetadi: true, optimalKirishSom: null, ball: { value: 70, breakdown: [] }, dalil: { talabOlchovi: 1, sotuvchiSoni: 120, top3Ulush: 25 } },
    { categoryId: 2, name: 'Bloknotlar', soha: 'kanstovar', yetadi: true, optimalKirishSom: null, ball: { value: 70, breakdown: [] }, dalil: { talabOlchovi: 1, sotuvchiSoni: 80, top3Ulush: 40 } },
  ] };
  const H: YolHolati = { javoblar: { qiziqish: ['kanstovar'], byudjet: 80_000_000 }, natijalar: { yonalishlar: ROYXAT } };

  it.each([
    ['ball nima degani?', 'yonalish', /Imkoniyat bahosi \(ball\)/],
    ['bozor ochiq degani nima?', 'yonalish', /«Bozor ochiq» — eng katta 3 doʻkon/],
    ['pul qachon tushadi?', 'tovarlar', /to‘lov jadvali bo‘yicha avtomatik.*\(Manba: Uzum qoʻllanmasi/],
    ['sertifikat kerakmi?', 'tovarlar', /Sertifikatlar/],
    ['Uzumga qanday roʻyxatdan oʻtaman?', 'tovarlar', /seller\.uzum\.uz\/seller\/signup/],
    ['komissiya qancha?', 'tovarlar', /Komissiya — Uzum har sotuvdan/],
    ['mavsum yoki bir yillik sotuvni koʻrsata olasizmi?', 'tovarlar', /2026-yil avgustda/],
    ['dollarda yozsam boʻladimi?', 'byudjet', /«5000 \$» deb yozing/],
    ['10 mln yetadimi?', 'byudjet', /«Pulingiz yetadi»/],
    ['qancha kerak?', 'byudjet', /«Pulingiz yetadi»/],
    ['nega sumka chiqyapti, men kanstovar dedimku', 'yonalish', /taqqoslash uchun/],
    ['men hech narsa bilmayman, qayerdan boshlayman?', 'uzum_dokoni', /12 qadamda olib boraman/],
    ['qaysi birini tanlasam yaxshi?', 'yonalish', /Kartalardagi «imkoniyat bahosi»ga qarang/],
    ['qaysi tovarni tanlay?', 'tovarlar', /Yakuniy tanlov — sizniki/],
    ['kanstovar uzumda yuradimi?', 'qiziqish', /Buni taxmin bilan aytmayman/],
    ['qaysi soha yaxshi?', 'qiziqish', /«Bilmayman» ni bosing — keyingi qadamda hamma sohadan/],
    ['kanstovar bilan kiyimdan qaysi biri osonroq?', 'byudjet', /raqam bilan Yoʻnalish qadamida koʻrsataman/],
  ])('«%s» (%s)', (matn, savolId, kutilgan) => {
    expect(bilimJavobi(matn, savolId, H)).toMatch(kutilgan);
  });

  it('ekrandagi kartalar tilga olinsa — ularning maʼlumoti (solishtirish)', () => {
    const j = bilimJavobi('ruchkalar bilan bloknotlarning farqi nima?', 'yonalish', H);
    expect(j).toMatch(/^Kartalardagi maʼlumot: «Ruchkalar» \(Kanstovar va kitob\) — 70 ball/);
    expect(j).toMatch(/«Bloknotlar»/);
  });

  // Jonli oʻlchov (2026-10-14): 40 ta birinchi savoldan 15 tasi javobsiz, 3 tasi boshqa mavzuga ketgan edi.
  it.each([
    ['Uzum omboriga qanday topshiraman?', /Fulfilment markazi: Toshkent/],
    ['Kartochkaga qanday rasm kerak?', /750×1000.*9-qadamda \(Studiya\)/su],
    ['Bojxona toʻlovi qancha?', /raqam bilan ayta olmayman.*customs\.uz/su],
    ['Xitoydan tovar necha kunda keladi?', /Aniq kunini ayta olmayman.*kargo kompaniyasidan soʻrang/su],
    ['Xitoydan tovar qancha vaqtda keladi?', /Aniq kunini ayta olmayman/],
    ['Sifatsiz tovar kelsa nima qilaman?', /8-qadamda \(Qabul\).*2 500 so‘m/su],
    ['Soliq qancha toʻlayman?', /7-qadamda \(Rasmiylashtirish\) soliq foizi.*soliq va yuridik masalalarda maslahat bermaydi/su],
    ['Daromad soligʻi qancha?', /7-qadamda \(Rasmiylashtirish\) soliq foizi/],
    ['Bank hisob raqami kerakmi?', /Bank hisob raqami ham kerak.*5 tagacha hisob raqam/su],
    ['Kiyim sotish osonmi?', /Buni taxmin bilan aytmayman/],
    ['Uzumda eng koʻp nima sotiladi?', /xaridor qanchalik koʻpligi va raqobat raqam bilan/],
    ['Raqobat kuchlimi?', /«Bozor ochiq» — eng katta 3 doʻkon.*har yoʻnalish kartasida/su],
    ['Qancha vaqtda pul topaman?', /^Aniq muddatni vaʼda qilmayman.*10 kundan ko‘p.*2 haftada bir marta/su],
    ['Uzumda doʻkon ochish bepulmi?', /^Uzumning haqi sotuvdan olinadi: Komissiya va logistika yig‘imi faqat sotilgan.*Yangi SKU/su],
    ['Uzumda savdo qilish osonmi?', /tayyorgarligingizga bogʻliq/],
    ['Pul necha kunda tushadi?', /to‘lov jadvali bo‘yicha avtomatik/],
    ['Сколько стоит доставка на склад Uzum?', /Fulfilment markazi.*Logistika yig‘imi \(01\.06\.2026/su],
    ['Какие документы нужны для продажи на Uzum?', /Hujjatlar: YaTT/],
  ])('yangi mavzu: «%s»', (matn, kutilgan) => {
    expect(bilimJavobi(matn, 'byudjet', H)).toMatch(kutilgan);
  });

  it('chalgʻitadigan soʻzlar: "rasmiylashtirish" rasm emas; "bepul" dagi "pul" — byudjet maslahati emas; tovar kelishi — pul topish emas', () => {
    expect(bilimJavobi('Rasmiylashtirish qanday boʻladi?', 'byudjet', H) ?? '').not.toMatch(/750×1000/);
    expect(bilimJavobi('Uzumda doʻkon ochish bepulmi?', 'byudjet', H)).not.toMatch(/hamma pulni/);
    expect(bilimJavobi('Xitoydan tovar qancha vaqtda keladi?', 'byudjet', H)).not.toMatch(/vaʼda qilmayman/);
    expect(bilimJavobi('Odam bilan gaplashsam boʻladimi?', 'byudjet', H) ?? '').not.toMatch(/odam emasman/);
  });

  it('mos mavzu yoʻq — null (toʻqilmaydi); pul haqidagi "qaysi biri" soha maslahatiga tushmaydi', () => {
    expect(bilimJavobi('ertaga ob-havo qanday', 'yonalish', H)).toBeNull();
    expect(bilimJavobi('80 mln yoki 100 mln, qaysi biri yaxshi?', 'byudjet', H)).toBeNull();
  });
});
