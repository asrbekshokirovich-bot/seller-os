import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TRAP_KINDS, TRAP_LABEL } from '../src/traps.js';
import { PARTS, WEIGHTS } from '../src/formula.js';

/**
 * Hujjat — manba-haqiqat (QOIDALAR.md, 2-bo'lim). Lekin hujjat va kod
 * vaqt o'tishi bilan ajralib ketadi va buni hech kim sezmaydi: kod
 * ishlayveradi, hujjat esa yolg'on gapira boshlaydi.
 *
 * Shu testlar ularni bog'lab turadi. Biri o'zgarsa — ikkinchisi ham
 * o'zgarishi shart, aks holda CI yiqiladi.
 */

const ROOT = join(import.meta.dirname, '../../..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');

describe('hujjat ↔ kod ↔ baza', () => {
  it('8 ta tuzoq bor — kam ham emas, ko\'p ham emas', () => {
    expect(TRAP_KINDS).toHaveLength(8);
  });

  it('har tuzoq TUZOQLAR.md da tavsiflangan', () => {
    const doc = read('TUZOQLAR.md');
    for (const kind of TRAP_KINDS) {
      expect(doc, `TUZOQLAR.md da "${kind}" yo'q`).toContain(kind);
    }
  });

  it('har tuzoqning o\'zbekcha nomi bor', () => {
    for (const kind of TRAP_KINDS) {
      expect(TRAP_LABEL[kind], `"${kind}" uchun nom yo'q`).toBeTruthy();
    }
  });

  it('bazadagi enum kod bilan bir xil', () => {
    // Migratsiyadan enum qiymatlarini o'qiymiz. Baza kerak emas — matn
    // yetarli, chunki migratsiya o'zi manba.
    const sql = read('supabase/migrations/0003_selleros_usta.sql');
    const block = sql.slice(sql.indexOf('create type selleros.trap_kind'));
    for (const kind of TRAP_KINDS) {
      expect(block, `migratsiyada "${kind}" yo'q`).toContain(`'${kind}'`);
    }
  });

  it('ball qismlari FORMULA.md dagi jadval bilan bir xil', () => {
    const doc = read('FORMULA.md');
    for (const part of PARTS) {
      expect(doc, `FORMULA.md da "${part}" qismi yo'q`).toContain(`\`${part}\``);
    }
  });

  it('vaznlar FORMULA.md da yozilgan raqam bilan bir xil', () => {
    const doc = read('FORMULA.md');
    for (const part of PARTS) {
      const row = doc.split('\n').find((l) => l.includes(`\`${part}\``) && l.includes('|'));
      expect(row, `FORMULA.md da "${part}" qatori yo'q`).toBeDefined();
      const weight = row!.split('|').map((c) => c.trim()).at(-2);
      expect(weight, `"${part}" vazni mos emas`).toBe(String(WEIGHTS[part]));
    }
  });

  it('vaznlar yig\'indisi 100', () => {
    const sum = PARTS.reduce((a, p) => a + WEIGHTS[p], 0);
    expect(sum).toBe(100);
  });
});

describe('konstitutsiya joyida', () => {
  it('QOIDALAR.md repo ildizida', () => {
    expect(read('QOIDALAR.md')).toContain('agent konstitutsiyasi');
  });

  it('uchta buzilmaydigan qoida yozilgan', () => {
    const doc = read('QOIDALAR.md');
    expect(doc).toContain('Tavsiyani KOD beradi');
    expect(doc).toContain('Sirlar faqat');
    expect(doc).toContain('BACKLOG.md');
  });
});
