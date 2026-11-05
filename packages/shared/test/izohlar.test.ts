import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IZOHLAR, IZOHLAR_RU, izohRu } from '../src/izohlar.js';

/** Mijozga chiqmasligi kerak boʻlgan ichki belgilar (ikkinchi koʻrik, 1-taklif). */
const ICHKI = /BACKLOG|docs\/[A-Z0-9-]+\.md|nazoratchi|faktda yoʻq|faktdan|fakt jadval|\(0\d{3}|qoʻllanmagan\)|provayderdan|Cloudflare/u;

/** Izohlar va qavslar ichidagi kod emas, mijozga koʻrinadigan matn: izohlarni olib tashlaymiz. */
function izohsiz(manba: string): string {
  return manba.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/(^|[^:])\/\/[^\n]*/gu, '$1');
}

describe('kod kartasi izohlari', () => {
  it('har izohning ruschasi bor va ichki belgi yoʻq', () => {
    for (const k of Object.keys(IZOHLAR) as Array<keyof typeof IZOHLAR>) {
      expect(IZOHLAR[k]).not.toMatch(ICHKI);
      expect(IZOHLAR_RU[k]).not.toMatch(ICHKI);
      expect(IZOHLAR_RU[k]).toMatch(/[а-яё]/u);
      expect(IZOHLAR_RU[k]).not.toMatch(/[ʻʼ]/u);
    }
  });

  it('izohRu: aniq matn, qayta buyurtma boshi va notanish matn', () => {
    expect(izohRu(IZOHLAR.qabul)).toBe(IZOHLAR_RU.qabul);
    expect(izohRu(`2-partiya (qayta buyurtma). ${IZOHLAR.buyurtma}`)).toBe(`Партия 2 (повторный заказ). ${IZOHLAR_RU.buyurtma}`);
    expect(izohRu('Eski izoh (BACKLOG).')).toBeNull();
  });

  it('suhbat matnlarida ichki yozuv qolmagan (ssenariy, suhbat-kod, chat sahifasi)', () => {
    for (const fayl of [
      new URL('../src/ssenariy.ts', import.meta.url),
      new URL('../../../apps/backend/src/suhbat-kod.ts', import.meta.url),
      new URL('../../../apps/web/src/app/usta/Suhbat.tsx', import.meta.url),
    ]) {
      const matn = izohsiz(readFileSync(fayl, 'utf8'));
      const topildi = matn.split('\n').filter((q) => ICHKI.test(q));
      expect(topildi, fayl.pathname).toEqual([]);
    }
  });
});
