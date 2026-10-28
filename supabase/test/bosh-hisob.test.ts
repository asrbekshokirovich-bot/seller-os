/**
 * 0076 — bosh sahifa hisoblagichi: `so_hisob_yoz` va `so_hisob_voronka`, HAQIQIY Postgres da
 * (PGlite, xotirada).
 *
 * NEGA BU TESTLAR BOR. Nazoratchi (2026-10-28): «hisoblagich qoʻy». Bosh sahifani nechta odam
 * ochgani va nechtasi chatni boshlagani bilinmasdi; chat jadvallarida sinov sessiyalari
 * aralash edi. Bu yerda:
 *   - yozuv ISMSIZ: `user_id` boʻsh, faqat nom; sinov — `props.sinov`;
 *   - faqat toʻrt nom; begona nom yozilmaydi; daqiqasiga 600 tadan ortigʻi — yozilmaydi;
 *   - voronka: Toshkent kunlari, sinovsiz sanoq, sinovlar soni, hisoblagich boshlangan kun;
 *   - huquqlar — faqat service_role.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

const M76 = readFileSync(join(import.meta.dirname, '..', 'migrations', '0076_selleros_bosh_hisob.sql'), 'utf8');

const SXEMA = `
  create role anon; create role authenticated; create role service_role;
  create schema selleros;
  create table selleros.users (id uuid primary key);
  -- 0004 dagidek.
  create table selleros.events (
    id         bigserial primary key,
    user_id    uuid references selleros.users(id),
    name       text not null,
    props      jsonb,
    created_at timestamptz not null default now()
  );
  create index events_name_idx on selleros.events (name, created_at);
`;

async function r<T>(db: PGlite, sql: string, ...p: unknown[]): Promise<T> {
  return ((await db.query<{ r: T }>(sql, p)).rows[0] as { r: T }).r;
}

const yoz = (db: PGlite, nom: string | null, sinov?: boolean | null) => (sinov === undefined
  ? r<Record<string, unknown>>(db, 'select public.so_hisob_yoz(p_nom => $1) as r', nom)
  : r<Record<string, unknown>>(db, 'select public.so_hisob_yoz(p_nom => $1, p_sinov => $2) as r', nom, sinov));

interface Kun { sana: string; ochdi: number; boshladi: number; javob: number; yonalish: number }
interface Voronka { kun: number; boshlandi: string | null; sinov: number; kunlar: Kun[] }

const voronka = (db: PGlite, kun?: number | null) => (kun === undefined
  ? r<Voronka>(db, 'select public.so_hisob_voronka() as r')
  : r<Voronka>(db, 'select public.so_hisob_voronka($1) as r', kun));

/** Toshkent kunining soati (bugundan `kunOldin` kun oldin) — `timestamptz` ifodasi. */
const toshkent = (kunOldin: number, soat: string) =>
  `(((now() at time zone 'Asia/Tashkent')::date - ${kunOldin}) + time '${soat}') at time zone 'Asia/Tashkent'`;

describe('0076 — so_hisob_yoz', () => {
  const db = new PGlite();

  // PGlite (WASM Postgres) ishga tushishi band kompyuterda 10 soniyadan oshadi.
  beforeAll(async () => {
    await db.exec(SXEMA);
    await db.exec(M76);
    await db.exec(M76); // qayta qoʻllash xavfsiz
  }, 120_000);

  beforeEach(async () => { await db.exec('delete from selleros.events'); });

  it('toʻrt nom — ismsiz yoziladi: user_id boʻsh, props boʻsh', async () => {
    for (const nom of ['bosh_ochildi', 'bosh_boshladi', 'suhbat_birinchi_javob', 'suhbat_yonalish']) {
      expect(await yoz(db, nom), nom).toEqual({ ok: true });
    }
    const q = (await db.query<{ name: string; user_id: string | null; props: unknown }>(
      'select name, user_id, props from selleros.events order by id')).rows;
    expect(q.map((x) => x.name)).toEqual(['bosh_ochildi', 'bosh_boshladi', 'suhbat_birinchi_javob', 'suhbat_yonalish']);
    expect(q.every((x) => x.user_id === null && x.props === null)).toBe(true);
  });

  it('sinov — `props.sinov = true`; `false` va `null` — oddiy yozuv', async () => {
    await yoz(db, 'bosh_ochildi', true);
    await yoz(db, 'bosh_ochildi', false);
    await yoz(db, 'bosh_ochildi', null);
    const p = (await db.query<{ props: unknown }>('select props from selleros.events order by id')).rows.map((x) => x.props);
    expect(p).toEqual([{ sinov: true }, null, null]);
  });

  it('begona yoki boʻsh nom — xato, hech narsa yozilmaydi', async () => {
    for (const nom of ['javob_baho', 'tavsiya_tanlandi', 'BOSH_OCHILDI', '', ' bosh_ochildi', null]) {
      expect(await yoz(db, nom), String(nom)).toEqual({ xato: 'nomaʼlum hisob' });
    }
    expect(await r<number>(db, 'select count(*)::int as r from selleros.events')).toBe(0);
  });

  it('daqiqasiga 600 tadan ortigʻi yozilmaydi; boshqa nom va eski yozuvlar chegaraga kirmaydi', async () => {
    await db.exec(`insert into selleros.events (name) select 'bosh_ochildi' from generate_series(1, 599)`);
    // Bir daqiqadan eski yozuvlar sanalmaydi.
    await db.exec(`insert into selleros.events (name, created_at)
      select 'bosh_ochildi', now() - interval '2 minutes' from generate_series(1, 50)`);
    expect(await yoz(db, 'bosh_ochildi')).toEqual({ ok: true }); // 600-chi
    expect(await yoz(db, 'bosh_ochildi')).toEqual({ ok: false, sabab: 'chegara' });
    expect(await r<number>(db, `select count(*)::int as r from selleros.events where name = 'bosh_ochildi'`)).toBe(650);
    expect(await yoz(db, 'bosh_boshladi')).toEqual({ ok: true });
  });

  it('huquqlar: anon va authenticated chaqira olmaydi, service_role — oladi', async () => {
    const h = (rol: string, fn: string) => r<boolean>(db, `select has_function_privilege('${rol}', '${fn}', 'execute') as r`);
    for (const fn of ['public.so_hisob_yoz(text, boolean)', 'public.so_hisob_voronka(int)']) {
      expect(await h('anon', fn), fn).toBe(false);
      expect(await h('authenticated', fn), fn).toBe(false);
      expect(await h('service_role', fn), fn).toBe(true);
    }
  });
});

describe('0076 — so_hisob_voronka', () => {
  const db = new PGlite();

  beforeAll(async () => {
    await db.exec(SXEMA);
    await db.exec(M76);
  }, 120_000);

  beforeEach(async () => { await db.exec('delete from selleros.events'); });

  it('boʻsh baza — har kun nol, `boshlandi` yoʻq (panel chiziqcha qoʻyadi), sinov 0', async () => {
    const v = await voronka(db, 3);
    expect(v.kun).toBe(3);
    expect(v.boshlandi).toBeNull();
    expect(v.sinov).toBe(0);
    expect(v.kunlar).toHaveLength(3);
    expect(v.kunlar.every((k) => k.ochdi === 0 && k.boshladi === 0 && k.javob === 0 && k.yonalish === 0)).toBe(true);
  });

  it('kunlar — bugundan orqaga, Toshkent sanasi bilan; davr 1–90, standart 14', async () => {
    const bugun = await r<string>(db, `select to_char((now() at time zone 'Asia/Tashkent')::date, 'YYYY-MM-DD') as r`);
    const v = await voronka(db, 2);
    expect(v.kunlar[0]!.sana).toBe(bugun);
    expect(v.kunlar[1]!.sana < bugun).toBe(true);
    expect((await voronka(db)).kun).toBe(14);
    expect((await voronka(db, null)).kun).toBe(14);
    expect((await voronka(db, 0)).kun).toBe(1);
    expect((await voronka(db, -5)).kunlar).toHaveLength(1);
    expect((await voronka(db, 1000)).kunlar).toHaveLength(90);
  });

  it('sanoq — nom va kun boʻyicha; sinov yozuvlari sanalmaydi, soni alohida', async () => {
    await db.exec(`
      insert into selleros.events (name, created_at) values
        ('bosh_ochildi', ${toshkent(0, '10:00')}), ('bosh_ochildi', ${toshkent(0, '11:00')}),
        ('bosh_ochildi', ${toshkent(0, '12:00')}), ('bosh_boshladi', ${toshkent(0, '10:01')}),
        ('suhbat_birinchi_javob', ${toshkent(0, '10:02')}), ('suhbat_yonalish', ${toshkent(0, '10:03')}),
        ('bosh_ochildi', ${toshkent(1, '09:00')}), ('bosh_boshladi', ${toshkent(1, '09:01')});
      insert into selleros.events (name, props, created_at) values
        ('bosh_ochildi', '{"sinov": true}', ${toshkent(0, '13:00')}),
        ('suhbat_yonalish', '{"sinov": true}', ${toshkent(1, '13:00')});
      -- Boshqa hodisalar (👍/👎, tavsiya) voronkaga kirmaydi.
      insert into selleros.events (name, created_at) values ('javob_baho', ${toshkent(0, '10:00')});
    `);
    const v = await voronka(db, 3);
    expect(v.kunlar[0]).toMatchObject({ ochdi: 3, boshladi: 1, javob: 1, yonalish: 1 });
    expect(v.kunlar[1]).toMatchObject({ ochdi: 1, boshladi: 1, javob: 0, yonalish: 0 });
    expect(v.kunlar[2]).toMatchObject({ ochdi: 0, boshladi: 0, javob: 0, yonalish: 0 });
    expect(v.sinov).toBe(2);
    expect(v.boshlandi).toBe(v.kunlar[1]!.sana);
  });

  it('kun chegarasi — Toshkent yarim tuni: 23:59 kechaga, 00:01 bugunga', async () => {
    await db.exec(`insert into selleros.events (name, created_at) values
      ('bosh_ochildi', ${toshkent(1, '23:59')}), ('bosh_ochildi', ${toshkent(0, '00:01')})`);
    const v = await voronka(db, 2);
    expect(v.kunlar[0]!.ochdi).toBe(1);
    expect(v.kunlar[1]!.ochdi).toBe(1);
  });

  it('davrdan eski yozuv sanalmaydi; `boshlandi` esa butun tarix boʻyicha (sinovsiz)', async () => {
    await db.exec(`insert into selleros.events (name, created_at) values
      ('bosh_ochildi', ${toshkent(10, '12:00')}), ('bosh_ochildi', ${toshkent(0, '12:00')});
      insert into selleros.events (name, props, created_at) values
      ('bosh_ochildi', '{"sinov": true}', ${toshkent(20, '12:00')})`);
    const v = await voronka(db, 3);
    expect(v.kunlar.reduce((s, k) => s + k.ochdi, 0)).toBe(1);
    expect(v.sinov).toBe(0);
    const oninchi = await r<string>(db, `select to_char((now() at time zone 'Asia/Tashkent')::date - 10, 'YYYY-MM-DD') as r`);
    expect(v.boshlandi).toBe(oninchi);
  });
});
