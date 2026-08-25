/**
 * "Bazamizda bugun" raqamlari.
 *
 * NEGA BU TESTLAR BOR. Toʻrtta raqam sotuv sahifasida qoʻlda
 * yozilgan edi va bir kunda 322 099 taga eskirdi (1 528 764 →
 * 1 850 863). Ustidagi sarlavha esa "Har bir raqam oʻlchangan"
 * deb turadi — yaʼni eskirgan raqam shunchaki xato emas, sahifa
 * daʼvosini yolgʻonga aylantiradi.
 *
 * Nazoratchining gapi: "notoʻgʻri maʼlumot berish juda qimmatga
 * tushadi". Shu sababdan quyidagi uch holat ARALASHMASLIGI
 * kerak va har biri alohida sinaladi.
 */

import { describe, expect, it } from 'vitest';
import {
  YANGI_MS, bazamizniQoy, holatMatni, qoy, son, yosh,
} from '../src/lib/bazamiz';

/** Statik sahifada RAQAM YOʻQ — faqat chiziqcha. */
const SAHIFA = `<div>
  <div data-bazamiz="tovar" style="font-size:34px">—</div>
  <div data-bazamiz="dokon" style="font-size:34px">—</div>
  <p data-bazamiz="holat">Raqamlar hozir olinmadi.</p>
</div>`;

const HOZIR = 1_800_000_000_000;
const OLCHOV = {
  qiymat: { tovar: 1_850_863, dokon: 85_866, olchandi: '2026-08-25' },
  vaqt: HOZIR,
};

describe('son', () => {
  it('mingliklar boʻshliq bilan ajratiladi', () => {
    expect(son(1_850_863)).toBe('1 850 863');
    expect(son(85_866)).toBe('85 866');
  });

  it('kichik son oʻzgarmaydi', () => {
    expect(son(0)).toBe('0');
    expect(son(999)).toBe('999');
  });

  /*
   * Ajratgich — ODDIY boʻshliq, `toLocaleString` emas: u muhitga
   * qarab uzilmas boʻshliq yoki vergul beradi.
   */
  it('uzilmas boʻshliq ishlatilmaydi', () => {
    expect(son(1_850_863)).not.toContain(' ');
  });
});

describe('qoy', () => {
  it('belgilangan elementning ichi almashadi', () => {
    const n = qoy(SAHIFA, 'tovar', '1 850 863');
    expect(n).toContain('>1 850 863</div>');
  });

  it('atributlar saqlanadi — uslub yoʻqolmaydi', () => {
    const n = qoy(SAHIFA, 'tovar', '1');
    expect(n).toContain('data-bazamiz="tovar" style="font-size:34px"');
  });

  it('faqat oʻz belgisini tegadi', () => {
    const n = qoy(SAHIFA, 'tovar', '1');
    expect(n).toContain('data-bazamiz="dokon" style="font-size:34px">—<');
  });

  it('belgi yoʻq boʻlsa matn buzilmaydi', () => {
    expect(qoy(SAHIFA, 'yoq_narsa', 'X')).toBe(SAHIFA);
  });
});

describe('yosh', () => {
  it('daqiqa, soat va kun', () => {
    expect(yosh(30_000)).toBe('hozirgina');
    expect(yosh(5 * 60_000)).toBe('5 daqiqa oldin');
    expect(yosh(3 * 3_600_000)).toBe('3 soat oldin');
    expect(yosh(2 * 86_400_000)).toBe('2 kun oldin');
  });
});

describe('holatMatni — uch holat ARALASHMAYDI', () => {
  it('yangi oʻlchov: sana va "har kuni oʻzgaradi"', () => {
    const m = holatMatni(OLCHOV, HOZIR + 60_000);
    expect(m).toContain('2026-08-25 holatiga');
    expect(m).not.toContain('oldin');
  });

  /*
   * ENG MUHIM TEKSHIRUV. Eskirgan oʻlchov "bugungi" deb
   * koʻrsatilmaydi va yoshi YASHIRILMAYDI.
   */
  it('eskirgan oʻlchov: yoshi AYTILADI', () => {
    const m = holatMatni(OLCHOV, HOZIR + 5 * 3_600_000);
    expect(m).toContain('5 soat oldin');
    expect(m).toContain('yangilanmadi');
    expect(m).not.toContain('har kuni oʻzgaradi');
  });

  it('bir soat — chegara; undan keyin eskirgan deb sanaladi', () => {
    expect(holatMatni(OLCHOV, HOZIR + YANGI_MS - 1)).toContain('holatiga');
    expect(holatMatni(OLCHOV, HOZIR + YANGI_MS)).toContain('oldin');
  });

  it('oʻlchov umuman yoʻq: eski raqam koʻrsatilmasligi AYTILADI', () => {
    const m = holatMatni(null, HOZIR);
    expect(m).toContain('olinmadi');
    expect(m).toContain('Eski raqam koʻrsatilmaydi');
  });
});

describe('bazamizniQoy', () => {
  it('yangi oʻlchovda raqamlar almashadi', () => {
    const n = bazamizniQoy(SAHIFA, OLCHOV, HOZIR);
    expect(n).toContain('>1 850 863<');
    expect(n).toContain('>85 866<');
  });

  /*
   * ENG MUHIM TEKSHIRUV. Oʻlchov yoʻq boʻlsa RAQAM
   * KOʻRSATILMAYDI. Ilgari bu yerda qurish paytidagi eski son
   * turardi va u yangi boʻlib koʻrinardi.
   */
  it('oʻlchov yoʻq boʻlsa raqam oʻrnida CHIZIQCHA qoladi', () => {
    const n = bazamizniQoy(SAHIFA, null, HOZIR);
    expect(n).toContain('data-bazamiz="tovar" style="font-size:34px">—<');
    expect(n).not.toMatch(/data-bazamiz="tovar"[^>]*>[^<]*\d/);
  });

  it('eskirgan oʻlchovda raqam koʻrsatiladi, lekin yoshi bilan', () => {
    const n = bazamizniQoy(SAHIFA, OLCHOV, HOZIR + 9 * 3_600_000);
    expect(n).toContain('>1 850 863<');
    expect(n).toContain('9 soat oldin');
  });

  it('yarim javobda faqat kelgani almashadi, qolgani chiziqcha', () => {
    const n = bazamizniQoy(SAHIFA, { qiymat: { tovar: 7 }, vaqt: HOZIR }, HOZIR);
    expect(n).toContain('>7<');
    expect(n).toContain('data-bazamiz="dokon" style="font-size:34px">—<');
  });

  it('nol ham qabul qilinadi — u haqiqiy oʻlchov boʻlishi mumkin', () => {
    // Kunlik oʻlchov nol boʻlishi mumkin (supurish hali
    // boshlanmagan). Bu `undefined` dan farq qiladi.
    const n = bazamizniQoy(
      '<i data-bazamiz="kunlik">—</i><p data-bazamiz="holat">x</p>',
      { qiymat: { kunlik: 0 }, vaqt: HOZIR }, HOZIR,
    );
    expect(n).toContain('>0<');
  });
});
