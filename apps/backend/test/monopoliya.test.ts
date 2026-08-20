import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { monopoliya } from '@selleros/shared';
import type { TurkumHolati } from '@selleros/shared';

/**
 * 6-tuzoq darvoza testi. Kirish — bazadan olingan HAQIQIY oʻlchov.
 *
 * Roʻyxat uch qismdan iborat va uchalasi ham shart:
 *   monopoly     — filtr ogohlantirishi kerak
 *   null         — bermasligi kerak (tarqoq bozor)
 *   baholanmadi  — namuna yupqa, JAVOB BERMASLIGI kerak
 *
 * Uchinchisi eng muhimi. Aynan shu holatda eski filtr yolgʻon
 * ogohlantirish berardi: "Qoplamalar" turkumida 10 ta sotuvchi
 * oʻlchangani boʻyicha ulush 76% chiqardi, aslida 2 052 sotuvchi
 * bor va ulush 21%.
 */

interface Element {
  category_external_id: number;
  expect: string | null;
  turkum: string;
  kirish: TurkumHolati;
  note: string;
}

const fayl = join(import.meta.dirname, 'fixtures/monopoliya.json');
const { elementlar } = JSON.parse(readFileSync(fayl, 'utf8')) as { elementlar: Element[] };

describe('6-tuzoq: monopoliya — darvoza', () => {
  it('uch xil kutilgan javob ham roʻyxatda bor', () => {
    const turlar = new Set(elementlar.map((e) => String(e.expect)));
    for (const kerak of ['monopoly', 'null', 'baholanmadi']) {
      expect(turlar, `"${kerak}" holati roʻyxatda yoʻq`).toContain(kerak);
    }
  });

  it('har bir kirish maydoni haqiqatan oʻlchanadi', () => {
    for (const maydon of ['top3SharePercent', 'measuredSellers', 'totalSellers']) {
      const bor = elementlar.some(
        (e) => (e.kirish as unknown as Record<string, unknown>)[maydon] !== null,
      );
      expect(bor, `"${maydon}" birorta qatorda ham oʻlchanmagan`).toBe(true);
    }
  });

  it('filtr kamida bir marta bayroq qoʻyadi', () => {
    const yondi = elementlar.some((e) => {
      const r = monopoliya(e.kirish);
      return r !== null && r.kind !== 'baholanmadi';
    });
    expect(yondi, 'filtr haqiqiy maʼlumotda hech qachon ishlamadi').toBe(true);
  });

  it.each(elementlar.map((e) => [`${e.turkum} #${e.category_external_id}`, e] as const))(
    '%s',
    (_nom, e) => {
      const r = monopoliya(e.kirish);
      const olindi = r === null ? null : r.kind === 'baholanmadi' ? 'baholanmadi' : r.kind;
      expect(olindi, e.note).toBe(e.expect);
    },
  );
});
