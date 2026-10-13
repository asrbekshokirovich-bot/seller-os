/**
 * Yordamchi bilimi (nazoratchi, 2026-10-13: "Uzum qoʻllanmasidan yigʻing").
 * LLM bu faktlarni rost deb aytadi va tekshiruv darvozasi ularning raqamlarini
 * ruxsat etadi — shuning uchun har fakt manbasi bilan, taqiqlangan soʻzsiz.
 */

import { describe, expect, it } from 'vitest';
import { bilimJavobi, mijozHolati, suhbatTarixi, UZUM_BILIMI, YORDAMCHI_BILIMI, type YolHolati } from '@selleros/shared';

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

  it('yordamchiga hammasi bitta matnda: ZumSavdo, qadamlar, lugʻat, maslahat, Uzum', () => {
    expect(YORDAMCHI_BILIMI).toMatch(/ZumSavdo qadamlari/);
    expect(YORDAMCHI_BILIMI).toMatch(/Soʻzlar lugʻati/);
    expect(YORDAMCHI_BILIMI).toMatch(/Umumiy maslahatlar/);
    expect(YORDAMCHI_BILIMI).toMatch(/Uzum haqida faktlar/);
    expect(YORDAMCHI_BILIMI).toMatch(/5 250 so‘m/);
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
    ['nega sumka chiqyapti, men kanstovar dedimku', 'yonalish', /taqqoslash uchun/],
    ['men hech narsa bilmayman, qayerdan boshlayman?', 'uzum_dokoni', /12 qadamda olib boraman/],
    ['qaysi birini tanlasam yaxshi?', 'yonalish', /Kartalardagi «imkoniyat bahosi»ga qarang/],
    ['qaysi tovarni tanlay?', 'tovarlar', /Yakuniy tanlov — sizniki/],
    ['kanstovar uzumda yuradimi?', 'qiziqish', /Buni taxmin bilan aytmayman/],
    ['qaysi soha yaxshi?', 'qiziqish', /«Bilmayman» ni bosing — keyingi qadamda hamma sohadan/],
  ])('«%s» (%s)', (matn, savolId, kutilgan) => {
    expect(bilimJavobi(matn, savolId, H)).toMatch(kutilgan);
  });

  it('ekrandagi kartalar tilga olinsa — ularning maʼlumoti (solishtirish)', () => {
    const j = bilimJavobi('ruchkalar bilan bloknotlarning farqi nima?', 'yonalish', H);
    expect(j).toMatch(/^Kartalardagi maʼlumot: «Ruchkalar» \(Kanstovar va kitob\) — 70 ball/);
    expect(j).toMatch(/«Bloknotlar»/);
  });

  it('mos mavzu yoʻq — null (toʻqilmaydi)', () => {
    expect(bilimJavobi('ertaga ob-havo qanday', 'yonalish', H)).toBeNull();
  });
});
