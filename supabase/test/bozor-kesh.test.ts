/**
 * 0074 + 0075 — bozor paneli qatorlari va umumiy kesh: SQL HAQIQIY Postgres da (PGlite).
 *
 * NEGA BU TEST BOR. Jonli (2026-10-27): eng katta turkum paneli 4,1 s, takroriy soʻrov ham
 * 4 s — Edge xotirasidagi kesh har nusxada alohida. 0075 panelni shu kun maʼlumoti uchun
 * bazada saqlaydi. Bu yerda tekshiriladi: kesh faqat joriy kun va joriy kod versiyasi
 * uchun beriladi; eskiroq kun yangisining ustiga yozilmaydi; `so_bozor_qatorlar` (0074)
 * kerakli javobni beradi; hammasi faqat service_role uchun.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const yol = (f: string) => readFileSync(join(import.meta.dirname, '..', 'migrations', f), 'utf8');
const M74 = yol('0074_selleros_bozor_paneli.sql');
const M75 = yol('0075_selleros_bozor_kesh.sql');

const SXEMA = `
  create role anon; create role authenticated; create role service_role;
  create schema zumsavdo; create schema selleros;
  create table zumsavdo.tovar_30kun (
    product_id bigint primary key, sana date not null, kategoriya bigint, dokon bigint,
    narx int[], nom text, yangilandi timestamptz not null default now()
  );
  create table zumsavdo.category (id bigint primary key, name text);
  create table zumsavdo.shop (id bigint primary key, name text);
  create table zumsavdo.market_day (date date primary key, id_frontier bigint);
  create table zumsavdo.xulosa_jurnal (id bigserial primary key, sana date not null);
`;

const VERSIYA = 'bozor-paneli-v1/tovar-sotuvi-v1/1';

describe('0074 + 0075 — bozor paneli: qatorlar va umumiy kesh', () => {
  const db = new PGlite();
  const bitta = async <T>(sql: string, p: unknown[] = []) => (await db.query<{ j: T }>(sql, p)).rows[0]!.j;
  const oqi = (k: number, v = VERSIYA) =>
    bitta<{ sana: string | null; panel: unknown }>('select public.so_bozor_kesh_oqi($1, $2) as j', [k, v]);
  const yoz = (k: number, sana: string, panel: unknown, v = VERSIYA) =>
    db.query('select public.so_bozor_kesh_yoz($1, $2::date, $3, $4::jsonb)', [k, sana, v, JSON.stringify(panel)]);

  // PGlite (WASM Postgres) ishga tushishi band kompyuterda 10 soniyadan oshadi.
  beforeAll(async () => {
    await db.exec(SXEMA);
    await db.exec(`
      insert into zumsavdo.category values (13700, 'Shimlar'), (11931, 'Termoslar');
      insert into zumsavdo.shop values (1, 'umar.kids'), (2, 'PLAYOWO'), (3, 'Boshqa');
      insert into zumsavdo.market_day values ('2026-08-20', 3230877), ('2026-08-26', 3257612), ('2026-09-05', 3300445);
      insert into zumsavdo.xulosa_jurnal (sana) values ('2026-10-25');
      insert into zumsavdo.tovar_30kun (product_id, sana, kategoriya, dokon, narx, nom) values
        (10, '2026-10-25', 13700, 1, '{1,2}', 'Qizlar shimi'),
        (20, '2026-10-25', 13700, 2, null, 'Qizlar uchun shim'),
        (30, '2026-10-25', 13700, 1, null, null),
        (40, '2026-10-25', 11931, 3, null, 'Termos');
    `);
    await db.exec(M74);
    await db.exec(M75);
    await db.exec(M75); // qayta qoʻllash xavfsiz
  }, 120_000);

  it('so_bozor_qatorlar (0074): turkum qatorlari narx massivisiz, doʻkon nomlari, «yangi» chegarasi', async () => {
    const j = await bitta<{
      nom: string; qatorlar: Array<Record<string, unknown>>; dokonlar: Array<{ id: number; nom: string }>;
      kesildi: boolean; yangi_chegara: { sana: string; id: number } | null;
    }>('select public.so_bozor_qatorlar(13700, 60, 20000) as j');
    expect(j.nom).toBe('Shimlar');
    expect(j.qatorlar.map((q) => q.product_id).sort()).toEqual([10, 20, 30]);
    for (const q of j.qatorlar) {
      expect(q).not.toHaveProperty('narx');
      expect(q).not.toHaveProperty('yangilandi');
      expect(q).toHaveProperty('sana', '2026-10-25');
    }
    expect(j.dokonlar.map((d) => d.nom).sort()).toEqual(['PLAYOWO', 'umar.kids']);
    expect(j.kesildi).toBe(false);
    // 25.10 − 60 kun = 26.08 → shu kungi chegara (undan oldingi eng yaqin kun ham boʻlardi).
    expect(j.yangi_chegara).toEqual({ sana: '2026-08-26', id: 3257612 });
    const kesik = await bitta<{ qatorlar: unknown[]; kesildi: boolean }>('select public.so_bozor_qatorlar(13700, 60, 2) as j');
    expect(kesik.qatorlar).toHaveLength(2);
    expect(kesik.kesildi).toBe(true);
  });

  it('kesh: avval yoʻq, yozilgach — shu kun va shu versiya uchun beriladi', async () => {
    expect(await oqi(13700)).toEqual({ sana: '2026-10-25', panel: null });
    await yoz(13700, '2026-10-25', { nom: 'Shimlar', talab: 5689 });
    expect(await oqi(13700)).toEqual({ sana: '2026-10-25', panel: { nom: 'Shimlar', talab: 5689 } });
    // Boshqa kod versiyasi — eski kesh ishlatilmaydi.
    expect((await oqi(13700, 'bozor-paneli-v2/tovar-sotuvi-v1/1')).panel).toBeNull();
    expect((await oqi(11931)).panel).toBeNull();
  });

  it('yangi kun maʼlumoti kelsa — kechagi kesh berilmaydi; eskiroq kun yangisining ustiga yozilmaydi', async () => {
    await db.exec(`insert into zumsavdo.xulosa_jurnal (sana) values ('2026-10-26')`);
    expect(await oqi(13700)).toEqual({ sana: '2026-10-26', panel: null });
    await yoz(13700, '2026-10-26', { talab: 5862 });
    expect((await oqi(13700)).panel).toEqual({ talab: 5862 });
    await yoz(13700, '2026-10-25', { talab: 1 }); // kechikkan eski yozuv
    expect((await oqi(13700)).panel).toEqual({ talab: 5862 });
    const qator = (await db.query<{ sana: string; n: number }>(
      `select sana::text as sana, count(*) over () ::int as n from selleros.bozor_kesh where kategoriya = 13700`)).rows;
    expect(qator).toEqual([{ sana: '2026-10-26', n: 1 }]);
  });

  it('huquqlar: faqat service_role; jadvalda RLS yoqiq', async () => {
    const h = async (rol: string, fn: string) =>
      (await db.query<{ ok: boolean }>(`select has_function_privilege('${rol}', '${fn}', 'execute') as ok`)).rows[0]!.ok;
    for (const fn of [
      'public.so_bozor_kesh_oqi(bigint, text)',
      'public.so_bozor_kesh_yoz(bigint, date, text, jsonb)',
      'public.so_bozor_qatorlar(bigint, int, int)',
    ]) {
      expect(await h('anon', fn), fn).toBe(false);
      expect(await h('authenticated', fn), fn).toBe(false);
      expect(await h('service_role', fn), fn).toBe(true);
    }
    const t = (await db.query<{ rls: boolean; anon: boolean }>(`
      select c.relrowsecurity as rls, has_table_privilege('anon', 'selleros.bozor_kesh', 'select') as anon
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'selleros' and c.relname = 'bozor_kesh'`)).rows[0]!;
    expect(t).toEqual({ rls: true, anon: false });
  });
});
