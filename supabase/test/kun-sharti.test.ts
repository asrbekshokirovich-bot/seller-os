/**
 * SQL dagi kun sharti TS dagi chegara bilan bir xilmi.
 *
 * `selleros.tovar_sotuvi` koʻrinishida `k.kun >= 7` shart bor. Etti —
 * `THRESHOLDS.data.minDaysForDemand`. SQL TypeScript ni import qila
 * olmaydi, yaʼni raqam ikki joyda yozilgan.
 *
 * Takrorlangan raqam albatta ajralib ketadi: kimdir TS dagi chegarani
 * oʻzgartiradi, SQL eskiligicha qoladi va **hech narsa xato bermaydi**
 * — faqat sotuv hisobi boshqa qoidaga oʻtadi. Bugun shu shaklning
 * bir nechta koʻrinishi tuzatildi (QOIDALAR.md, 8-boʻlim).
 *
 * Shuning uchun migratsiya matni oʻqiladi va raqam solishtiriladi.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THRESHOLDS } from '@selleros/shared';

const MIGRATSIYA = join(
  import.meta.dirname, '../migrations/0022_selleros_tovar_royxati.sql',
);

describe('SQL va TS chegarasi', () => {
  const sql = readFileSync(MIGRATSIYA, 'utf8');

  it('kun sharti migratsiyada bor', () => {
    // Shart yoʻqolsa test qizarishi kerak: usiz 1 kunlik oʻlchovdan
    // "30 kunlik sotuv = 0" chiqadi va "oʻlchanmadi" "sotilmaydi" ga
    // aylanadi.
    expect(sql).toMatch(/k\.kun\s*>=\s*\d+/);
  });

  it('SQL dagi raqam THRESHOLDS bilan bir xil', () => {
    const m = sql.match(/k\.kun\s*>=\s*(\d+)/);
    expect(m, 'kun sharti topilmadi').not.toBeNull();
    expect(Number(m![1])).toBe(THRESHOLDS.data.minDaysForDemand);
  });

  it('migratsiyada izoh raqam qayerdanligini aytadi', () => {
    // Keyingi odam raqamni oʻzgartirmoqchi boʻlsa, uni TS da ham
    // oʻzgartirish kerakligini bilishi shart.
    expect(sql).toMatch(/minDaysForDemand/);
  });
});
