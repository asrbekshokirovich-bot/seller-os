/**
 * 0072 — `zumsavdo.product` va `shop` tez-tez tozalansin: SQL HAQIQIY Postgres da (PGlite).
 *
 * NEGA BU TEST BOR. 2026-10-22 da bosh sahifadagi tovar soni «—» boʻlib qoldi:
 * `so_bazamiz` dagi `count(*)` 44 s ketdi (oʻlik qatorlar, standart 20 % chegara).
 * Bu yerda — migratsiya ikkala jadvalga 2 % chegarani qoʻyadi va maʼlumotga tegmaydi.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const M72 = readFileSync(join(import.meta.dirname, '..', 'migrations', '0072_zumsavdo_product_autovacuum.sql'), 'utf8');

describe('0072 — zumsavdo.product autovacuum', () => {
  const db = new PGlite();

  beforeAll(async () => {
    await db.exec(`
      create schema zumsavdo;
      create table zumsavdo.product (id bigint primary key, category_id bigint);
      create table zumsavdo.shop (id bigint primary key);
      insert into zumsavdo.product select g, 1 from generate_series(1, 50) g;
    `);
    await db.exec(M72);
  });

  it('ikkala jadvalda 2 % chegara', async () => {
    const r = await db.query<{ relname: string; reloptions: string[] }>(`
      select c.relname, c.reloptions from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'zumsavdo' and c.relname in ('product', 'shop') order by c.relname`);
    const kutilgan = [
      'autovacuum_vacuum_scale_factor=0.02',
      'autovacuum_vacuum_insert_scale_factor=0.02',
      'autovacuum_analyze_scale_factor=0.02',
    ];
    expect(r.rows.map((x) => x.relname)).toEqual(['product', 'shop']);
    for (const x of r.rows) expect([...x.reloptions].sort()).toEqual([...kutilgan].sort());
  });

  it('maʼlumot oʻzgarmaydi', async () => {
    const r = await db.query<{ n: number }>('select count(*)::int as n from zumsavdo.product');
    expect(r.rows[0]?.n).toBe(50);
  });
});
