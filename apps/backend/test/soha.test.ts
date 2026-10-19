/**
 * Sohalar (nazoratchi, 2026-10-13): "faqat sumka, krossovka, quloqchin
 * chiqyapti" — 2-qadam roʻyxati qiziqish va boshqa sohalardan aralash.
 *
 * Nomlar — bazadagi HAQIQIY yoʻnalish nomlari (`so_yonalish_nomzodlari`,
 * 2026-10-13, 300 ta). Chalgʻituvchi nomlar alohida tekshiriladi: «Lab
 * uchun qalamlar» kanstovar emas, «Sochiqlar» — sochga emas.
 */

import { describe, expect, it } from 'vitest';
import {
  gapdagiSohalar, qidiruvMos, SAVDO_SOHALARI, sohaniTop, THRESHOLDS, turkumSohasi, yonalishlar, type TurkumNomzodi,
} from '@selleros/shared';

describe('turkum → soha', () => {
  it.each([
    ['Sumkalar', 'aksessuar'], ['Krossovkalar', 'kiyim'], ['Simsiz quloqchinlar', 'elektronika'],
    ['Qoplamalar', 'elektronika'], ["Kiyim to'plamlari", 'kiyim'], ['Ruchkalar', 'kanstovar'], ['Bloknotlar', 'kanstovar'],
    ['Daftar', 'kanstovar'], ['Romanlar', 'kanstovar'], ['Manga', 'kanstovar'], ['Atirlar', 'gozallik'],
    ['Lab uchun qalamlar', 'gozallik'], ['Korrektorlar va konsilerlar', 'gozallik'], ['Sochiqlar', 'uy'],
    ['Sochiluvchan mahsulotlar uchun idishlar', 'uy'], ['Shampunlar', 'gozallik'], ['Shamlar va shamdonlar', 'uy'],
    ['Kir yuvish uchun gel va suyuqliklar', 'uy'], ['Futbolkalar', 'kiyim'], ['Futbol formasi', 'sport'],
    ['Sport kostyumlari', 'kiyim'], ['Aqlli soatlar', 'elektronika'], ['Soat', 'aksessuar'],
    ['Oʻyin sichqonchalari', 'elektronika'], ['Yumshoq oʻyinchoqlar', 'bolalar'], ['Bir martalik tagliklar va trusiklar', 'bolalar'],
    ['Avtomobil breloklari uchun gʻiloflar', 'avto'], ['Biznes taʼlimi va karyerani rivojlantirish', 'kanstovar'],
    ['Umumiy qobiliyatlarni rivojlantirish', 'bolalar'], ['Qora choy', 'boshqa'], ['BSU (bolgarkalar)', 'boshqa'],
  ])('%s → %s', (nom, soha) => {
    expect(turkumSohasi(nom)).toBe(soha);
  });
});

describe('qiziqish matni → sohalar', () => {
  it('soha nomi yoki tovar soʻzi', () => {
    expect(sohaniTop('kanstovar sotmoqchiman')).toEqual(['kanstovar']);
    expect(sohaniTop('kosmetika va kiyim')).toEqual(['kiyim', 'gozallik']);
    expect(sohaniTop('bolalar oʻyinchoqlari')).toEqual(['bolalar']);
    expect(sohaniTop('канцтовары')).toEqual(['kanstovar']);
    expect(sohaniTop('bilmayman')).toEqual(['bilmayman']);
    expect(sohaniTop('salom')).toEqual([]);
  });

  it('gap ichida adashmaydi (2026-10-15): pasport/transport, «3 soat», kir yuvish mashinasi, maishiy texnika', () => {
    expect(sohaniTop('pasportim bor, transportda ishlaganman')).toEqual([]);
    expect(sohaniTop('kuniga 3 soat ishlayman')).toEqual([]);
    expect(sohaniTop('avtomat kir yuvish mashinasi')).toEqual([]);
    expect(sohaniTop('maishiy texnika')).toEqual(['uy']);
    expect(sohaniTop('texnika sotganman')).toEqual(['elektronika']);
    expect(sohaniTop('mashina ehtiyot qismlari')).toEqual(['avto']);
    expect(sohaniTop('sport kiyimlari')).toEqual(['kiyim', 'sport']);
    expect(sohaniTop('qoʻl soatlar')).toEqual(['aksessuar']);
  });
});

describe('gapdan sohalar — tajriba va qiziqish matni (nazoratchi, 2026-10-15)', () => {
  it.each([
    ['oldin sotganman maishiy texnika', ['uy']],
    ['Bozorda kanstovar sotganman', ['kanstovar']],
    ["Sotganman, velosiped opkeb sotganman. Lekin o'xshamagan biznesim. Uzumga vapshe aloqam yoq", ['sport']],
    ['krossovka sotmoqchiman', ['kiyim']],
    ['kir yuvish mashinasi va changyutgich sotganman', ['uy']],
    ['maishiy texnika va telefonlar', ['uy', 'elektronika']],
    ['avto shinalar', ['avto']],
    ['продавал одежду на рынке', ['kiyim']],
    ['bilmayman', []],
    ['nima sotishni bilmayman, oldin kiyim sotganman', ['kiyim']],
    ['oldin savdo qilganman', []],
    // Oyoq kiyim (nazoratchi, 2026-10-19: «potinka» — soha belgilanmagan edi).
    ['Instagramda potinka sotganman', ['kiyim']],
    ['botinka va etik', ['kiyim']],
    ['ayollar tuflisi', ['kiyim']],
    ['продавал женскую обувь и сапоги', ['kiyim']],
    // «etiketka» — etik emas.
    ['etiketka yopishtirishni bilmayman', []],
  ])('%s → %j', (matn, sohalar) => {
    expect(gapdagiSohalar(matn)).toEqual(sohalar);
  });

  it('tovar soʻzi erkin savol turini oʻzgartirmaydi: «Krossovka sotish osonmi?» — butun kiyim sohasi emas', () => {
    expect(sohaniTop('Krossovka sotish osonmi?')).toEqual([]);
  });

  it('«Uy-roʻzgʻor va maishiy texnika» — nomi rost: bazadagi maishiy texnika turkumlari shu sohada', () => {
    expect(SAVDO_SOHALARI.find((s) => s.id === 'uy')).toMatchObject({ nom: 'Uy-roʻzgʻor va maishiy texnika', ru: 'Дом и бытовая техника' });
    // Bazadagi haqiqiy yoʻnalish nomlari (`so_yonalish_nomzodlari`, 2026-10-15).
    for (const nom of ['Changyutgichlar', 'Dazmollar', 'Sovutgichlar', 'Elektr choynaklar', 'Havo namlagichlar', 'Isitgichlar',
      'Mini-ventilyatorlar', 'Maishiy texnika uchun boshqa aksessuarlar va ehtiyot qismlar']) {
      expect(turkumSohasi(nom), nom).toBe('uy');
    }
    expect(turkumSohasi('Televizorlar')).toBe('elektronika');
  });
});

describe('qidiruv', () => {
  it('soʻz boshi, qoʻshimcha va ruscha', () => {
    expect(qidiruvMos('ruchka', 'Ruchkalar')).toBe(true);
    expect(qidiruvMos('ruchkalar', 'Ruchkalar')).toBe(true);
    expect(qidiruvMos('ручка', 'Ruchkalar')).toBe(true);
    expect(qidiruvMos('telefon gʻilofi', 'Qoplamalar')).toBe(true);
    expect(qidiruvMos('atir', 'Parfyumlangan suv')).toBe(false);
    expect(qidiruvMos('atir', 'Atirlar')).toBe(true);
    // 3 harfdan qisqa soʻz hisobga olinmaydi — "va" hamma narsaga mos kelmasin.
    expect(qidiruvMos('va', 'Ryukzaklar va sumkalar')).toBe(false);
  });
});

/** Turkum nomzodi — ball qismlari bir xil boʻlsin, farqi faqat talab oʻlchovida. */
function nomzod(categoryId: number, name: string, talabOlchovi: number): TurkumNomzodi {
  return {
    categoryId, name, talabOlchovi, sotuvchiSoni: 100, top3Ulush: 40, optimalKirishSom: null,
    talablar: { markirovka: false, sertifikat: false, haftalar: null }, mavsumiylik: null,
  };
}

const NOMZODLAR: TurkumNomzodi[] = [
  nomzod(1, 'Sumkalar', 1000), nomzod(2, 'Krossovkalar', 990), nomzod(3, 'Simsiz quloqchinlar', 980),
  nomzod(4, 'Futbolkalar', 970), nomzod(5, 'Hamyonlar', 960), nomzod(6, 'Atirlar', 950),
  nomzod(7, 'Sochiqlar', 940), nomzod(8, 'Ruchkalar', 300), nomzod(9, 'Bloknotlar', 290),
  nomzod(10, 'Daftar', 280), nomzod(11, 'Penallar', 270), nomzod(12, 'Romanlar', 260),
  nomzod(13, 'Yumshoq oʻyinchoqlar', 500), nomzod(14, 'Qora choy', 10),
];

describe('2-qadam roʻyxati: aralash (nazoratchi, 2026-10-13)', () => {
  const U = THRESHOLDS.usta;

  it('qiziqishsiz — birinchi sahifa hammasi boshqa-boshqa sohadan', () => {
    const r = yonalishlar(NOMZODLAR, null, null, 6);
    expect(r.royxat).toHaveLength(U.maxYonalish);
    expect(new Set(r.royxat.map((y) => y.soha)).size).toBe(r.royxat.length);
    expect(r.qiziqishlar).toEqual([]);
    // Bir sohadan ikkinchisi — keyingi sahifalarda.
    expect(r.keyingilar!.length).toBeGreaterThan(0);
  });

  it('qiziqish bilan — sahifada 4 tasi tanlagan sohasidan, qolgani boshqalaridan', () => {
    const r = yonalishlar(NOMZODLAR, null, null, 6, ['kanstovar']);
    const soni = r.royxat.filter((y) => y.soha === 'kanstovar').length;
    expect(soni).toBe(U.qiziqishUlushi);
    expect(r.royxat.length).toBe(U.maxYonalish);
    // Kanstovar bali past boʻlsa ham chiqadi (oʻzi tanladi); kartada bahosi yoziladi.
    expect(r.royxat.slice(0, 4).map((y) => y.name)).toEqual(['Ruchkalar', 'Bloknotlar', 'Daftar', 'Penallar']);
    expect(r.qiziqishlar).toEqual(['kanstovar']);
  });

  it('boshqa sohalardan zaif yoʻnalish olinmaydi (oʻrtachadan past)', () => {
    const r = yonalishlar(NOMZODLAR, null, null, 6);
    const hammasi = [...r.royxat, ...(r.keyingilar ?? [])];
    expect(hammasi.every((y) => (y.ball.value ?? 0) >= U.boshqaMinBall)).toBe(true);
  });

  it('noma’lum soha id si eʼtiborsiz', () => {
    expect(yonalishlar(NOMZODLAR, null, null, 6, ['yoq-soha']).qiziqishlar).toEqual([]);
  });
});

describe('bir xil nomli turkumlar', () => {
  it('faqat eng yuqori baholisi qoladi (tugmada «Atirlar», «Atirlar» chiqmasin)', () => {
    const r = yonalishlar([nomzod(1, 'Atirlar', 900), nomzod(2, 'Atirlar', 500), nomzod(3, 'Sumkalar', 800)], null, null, 6);
    const hammasi = [...r.royxat, ...(r.keyingilar ?? [])];
    expect(hammasi.filter((y) => y.name === 'Atirlar').map((y) => y.categoryId)).toEqual([1]);
  });
});
