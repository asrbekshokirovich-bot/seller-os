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
  YANGI_MS, holatMatni, son, yosh,
} from '../src/lib/bazamiz';

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

/*
 * Ruscha (2026-09-25). Tekshiruv matnning soʻzma-soʻz tarjimasini
 * emas, oʻzbekcha testlardagi UCH holat ruschada ham ajralishini
 * tekshiradi — eskirgan raqam "bugungi" boʻlib qolmasin.
 */
describe('ruscha — holatlar oʻzbekchadagidek ajraladi', () => {
  it('yosh: qisqartma bilan, kelishiksiz', () => {
    expect(yosh(30_000, 'ru')).toBe('только что');
    expect(yosh(5 * 60_000, 'ru')).toBe('5 мин. назад');
    expect(yosh(3 * 3_600_000, 'ru')).toBe('3 ч. назад');
    expect(yosh(2 * 86_400_000, 'ru')).toBe('2 дн. назад');
  });

  it('yangi oʻlchov: sana bor, yosh yoʻq', () => {
    const m = holatMatni(OLCHOV, HOZIR + 60_000, 'ru');
    expect(m).toContain('2026-08-25');
    expect(m).not.toContain('назад');
  });

  it('eskirgan oʻlchov: yoshi AYTILADI', () => {
    const m = holatMatni(OLCHOV, HOZIR + 5 * 3_600_000, 'ru');
    expect(m).toContain('5 ч. назад');
    expect(m).toContain('не обновлены');
  });

  it('oʻlchov yoʻq: eski raqam koʻrsatilmasligi AYTILADI', () => {
    expect(holatMatni(null, HOZIR, 'ru')).toContain('Старые цифры не показываем');
  });

  it('til koʻrsatilmasa — oʻzbekcha (eski chaqiruvlar oʻzgarmaydi)', () => {
    expect(holatMatni(null, HOZIR)).toBe(holatMatni(null, HOZIR, 'uz'));
  });
});
