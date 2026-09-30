/**
 * Migratsiyalardagi `'…'::jsonb` literallari — haqiqiy JSON boʻlishi shart.
 *
 * NEGA. 0058 da qadoq jadvali (`'[ … ]'::jsonb`) ichida `bo'yoq`,
 * `o'yinchoq` kabi soʻzlar ASCII apostrof bilan yozilgan edi. SQL da bu
 * satrni yopadi: fayl Postgres da yiqiladi, lekin CI da migratsiyalar
 * ishga tushmaydi — xato repoda sezilmay qoldi (jonli bazaga ikkilangan
 * apostrof bilan qoʻllangan, 2026-09-29). Bu test SQL ni tokenlarga ajratadi
 * (izohlar, `$teg$…$teg$` bloklari, `"identifikator"` lar, `''` escape) va
 * har `::jsonb` literalini `JSON.parse` qiladi — buzuq apostrof literalni
 * boʻlib yuboradi va parse yiqiladi.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PAPKA = join(import.meta.dirname, '..', 'migrations');

interface Literal { matn: string; qator: number }

/** Top-level `'…'::jsonb` literallari. `$teg$` bloklari (funksiya tanalari) chetlab oʻtiladi. */
export function jsonbLiterallari(sql: string): { literallar: Literal[]; tugallanmagan: boolean } {
  const literallar: Literal[] = [];
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (c === '-' && sql[i + 1] === '-') {
      const j = sql.indexOf('\n', i);
      i = j < 0 ? sql.length : j + 1;
      continue;
    }
    if (c === '/' && sql[i + 1] === '*') {
      const j = sql.indexOf('*/', i + 2);
      i = j < 0 ? sql.length : j + 2;
      continue;
    }
    if (c === '$') {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i, i + 64));
      if (m) {
        const teg = m[0];
        const j = sql.indexOf(teg, i + teg.length);
        if (j < 0) return { literallar, tugallanmagan: true };
        i = j + teg.length;
        continue;
      }
    }
    if (c === '"') {
      const j = sql.indexOf('"', i + 1);
      if (j < 0) return { literallar, tugallanmagan: true };
      i = j + 1;
      continue;
    }
    if (c === "'") {
      let j = i + 1;
      let matn = '';
      let yopildi = false;
      while (j < sql.length) {
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") { matn += "'"; j += 2; continue; }
          yopildi = true;
          break;
        }
        matn += sql[j];
        j += 1;
      }
      if (!yopildi) return { literallar, tugallanmagan: true };
      if (/^::jsonb/i.test(sql.slice(j + 1, j + 8))) {
        literallar.push({ matn, qator: sql.slice(0, i).split('\n').length });
      }
      i = j + 1;
      continue;
    }
    i += 1;
  }
  return { literallar, tugallanmagan: false };
}

const fayllar = readdirSync(PAPKA).filter((f) => f.endsWith('.sql')).sort();

describe('migratsiya jsonb literallari', () => {
  it('tokenizator: ikkilangan apostrof — bitta literal; ochiq apostrof — aniqlanadi (yopilmagan satr yoki JSON emas)', () => {
    const toza = jsonbLiterallari(`insert into t values ('["bo''yoq", "a"]'::jsonb);`);
    expect(toza.tugallanmagan).toBe(false);
    expect(toza.literallar.map((l) => JSON.parse(l.matn))).toEqual([["bo'yoq", 'a']]);
    const aniqlandimi = (sql: string) => {
      const r = jsonbLiterallari(sql);
      return r.tugallanmagan || r.literallar.some((l) => { try { JSON.parse(l.matn); return false; } catch { return true; } });
    };
    // Toq sonli ochiq apostrof — satr yopilmay qoladi.
    expect(aniqlandimi(`insert into t values ('["bo'yoq", "a"]'::jsonb);`)).toBe(true);
    // Juft sonli (0058 dagi kabi) — literal boʻlinadi, ::jsonb oldidagi boʻlak JSON emas.
    expect(aniqlandimi(`insert into t values ('["bo'yoq", "o'yinchoq"]'::jsonb);`)).toBe(true);
    expect(aniqlandimi(`insert into t values ('["bo''yoq", "o''yinchoq"]'::jsonb);`)).toBe(false);
  });

  for (const f of fayllar) {
    it(`${f}: har ::jsonb literali — JSON`, () => {
      const sql = readFileSync(join(PAPKA, f), 'utf8').replace(/\r\n/g, '\n');
      const { literallar, tugallanmagan } = jsonbLiterallari(sql);
      expect(tugallanmagan, `${f}: yopilmagan satr yoki blok`).toBe(false);
      for (const l of literallar) {
        expect(() => JSON.parse(l.matn), `${f}:${l.qator} — jsonb literali JSON emas`).not.toThrow();
      }
    });
  }
});
