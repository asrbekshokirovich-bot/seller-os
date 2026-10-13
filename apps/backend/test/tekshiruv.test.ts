/**
 * Tekshiruv darvozasi — LLM matni raqam qo'shmaganini isbotlash.
 *
 * Birinchi navbatda YOLG'ON BLOKLASH holatlari: to'g'ri jumla
 * bloklansa menejer quruq bo'lib qoladi va buni hech kim sezmaydi.
 * Keyin haqiqiy tutish: to'qilgan raqam, so'z bilan yozilgan raqam,
 * kafolat.
 */

import { describe, expect, it } from 'vitest';
import { natijaSonlari, raqamlar, tekshir } from '@selleros/shared';

describe('raqam ajratish', () => {
  const q = (s: string) => raqamlar(s).map((r) => r.qiymat);
  it("o'zbekcha shakllar", () => {
    expect(q('5 500 dona')).toEqual([5500]);
    expect(q('2,3 mln')).toEqual([2_300_000]);
    expect(q('20%')).toEqual([20]);
    expect(q('90–140 ming')).toEqual([90, 140_000]);
  });
  it("so'z bilan yozilgan son", () => {
    expect(q('yigirma mingdan ortiq')).toEqual([20_000]);
    expect(q('yigirma besh ming')).toEqual([25_000]);
    expect(q('ikki yuz ellik')).toEqual([250]);
    expect(q('uch qadam bor')).toEqual([3]);
  });
});

describe("YOLG'ON BLOKLASH bo'lmasligi kerak", () => {
  const kod = '2 ta yoʻnalish baholandi. Eng yuqori ball — "Quloqchinlar", 72 ball. 1 tasiga byudjetingiz yetadi.';

  it('kod jumlasidagi raqamlar bilan qayta aytilgan matn o\'tadi', () => {
    const r = tekshir('Ikkita yoʻnalish chiqdi. Eng kuchlisi Quloqchinlar, 72 ball, bittasiga pulingiz yetadi.', { matnlar: [kod] });
    expect(r.ok, JSON.stringify(r)).toBe(true);
  });
  it('obunachining o\'z raqami o\'tadi', () => {
    const r = tekshir('10 mln soʻm bilan boshlaymiz.', { matnlar: ['Menda 10 mln bor'] });
    expect(r.ok).toBe(true);
  });
  it('kichik sanoq va 100 erkin', () => {
    expect(tekshir('Uch qadam bor, 1-qadam: tanlash. Hammasi 100% aniq emas.').ok).toBe(true);
  });
  it('yaxlitlash yolg\'on emas', () => {
    expect(tekshir('kuniga 48 dona', { sonlar: [47.8] }).ok).toBe(true);
  });
});

describe('haqiqiy yolg\'onni tutadi', () => {
  it('to\'qilgan raqam bloklanadi', () => {
    const r = tekshir('Bu yoʻnalishda kuniga 350 dona ketadi.', { matnlar: ['2 ta yoʻnalish baholandi.'] });
    expect(r.ok).toBe(false);
    expect(r.dalilsiz).toContain('350');
  });
  it('so\'z bilan yozilgan to\'qima ham bloklanadi', () => {
    expect(tekshir('Oyiga yigirma ming dona sotiladi.').ok).toBe(false);
  });
  it('da\'vo birligi bilan kichik son ham dalil talab qiladi', () => {
    expect(tekshir('Komissiya 8% atrofida.').ok).toBe(false);
    expect(tekshir('Komissiya 8% atrofida.', { sonlar: [8] }).ok).toBe(true);
  });
  it('kafolat va va\'da bloklanadi', () => {
    expect(tekshir('Kafolat beraman, albatta sotiladi.').taqiq.length).toBeGreaterThan(0);
    expect(tekshir('Daromadingiz boʻladi.').ok).toBe(false);
  });
});

describe('natija sonlari — identifikator va sarlavha DALIL EMAS', () => {
  it('id, title tashlanadi; oʻlchov qoladi', () => {
    const s = natijaSonlari({
      royxat: [{ nomzod: { productId: 1234567, title: 'Quloqchin 5500 mAh', narxSom: 95000 }, miqdor: { dona: 30, hisob: '30 kun = 30' } }],
      chiqarildi: [{ title: 'X 777', sabab: '999 sabab' }],
    });
    expect(s).toEqual([95000, 30]);
  });
});

describe('kirill va rus (2026-10-13: yordamchi mijoz tilida javob beradi)', () => {
  const q = (s: string) => raqamlar(s).map((r) => r.qiymat);

  it('kirill koʻpaytuvchilar va son-soʻzlar songa aylanadi', () => {
    expect(q('10 млн сўм')).toEqual([10_000_000]);
    expect(q('5 тысяч')).toEqual([5_000]);
    expect(q('3 миллиона')).toEqual([3_000_000]);
    expect(q('20 минг')).toEqual([20_000]);
    expect(q('йигирма минг')).toEqual([20_000]);
    expect(q('икки юз')).toEqual([200]);
    expect(q('двадцать процентов')).toEqual([20]);
    expect(q('двести пятьдесят тысяч')).toEqual([250_000]);
    expect(q('полтора миллиона')).toEqual([1_500_000]);
  });

  it('manbasiz kirill raqam tutiladi; manbadagisi oʻtadi', () => {
    expect(tekshir('Многие начинают с 25 млн.', { matnlar: ['Сколько денег?'] }).ok).toBe(false);
    expect(tekshir('Комиссия — двадцать процентов.').ok).toBe(false);
    expect(tekshir('Комиссия всего 5 процентов.').ok).toBe(false);
    expect(tekshir('Логистика — 5 250 сўм.', { matnlar: ['Logistika yig‘imi: 1 litrgacha — 5 250 so‘m'] }).ok).toBe(true);
    expect(tekshir('Вы указали 10 млн сум.', { matnlar: ['10 000 000 soʻm'] }).ok).toBe(true);
  });

  it('kafolat va vaʼda — oʻzbek kirill va ruscha ham', () => {
    expect(tekshir('Даромад кафолатланади.').taqiq).toContain('kafolat');
    expect(tekshir('Мы гарантируем продажи.').taqiq).toContain('kafolat');
    expect(tekshir('Товар точно продастся.').ok).toBe(false);
    expect(tekshir('Албатта сотилади.').ok).toBe(false);
  });

  it('oddiy ruscha gap yolgʻon son boʻlmaydi («он» — olmosh, «ўн» emas)', () => {
    expect(q('Он сказал, что это хороший товар.')).toEqual([]);
    expect(tekshir('Он сказал, что это хороший товар.').ok).toBe(true);
  });
});
