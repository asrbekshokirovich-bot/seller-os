/**
 * 0085 — AI tahlilchi kunlik limiti: `so_tahlil_limit`, HAQIQIY Postgres da (PGlite, xotirada).
 *
 * NEGA BU TESTLAR BOR (nazoratchi, 2026-11-10: «Ha, limit bilan yoq»): `AI_TAHLIL=on` dan keyin har savol
 * pul turadi; limit qogʻozda qolmasin:
 *   - shaxsiy limit: chegaraga yetgach `ruxsat: false`, sanoq oshmaydi;
 *   - umumiy shift: hamma foydalanuvchi yigʻindisi chegaraga yetsa — hamma uchun yopiq;
 *   - faqat oʻqish (`p_oshir` yoʻq) sanoqni oʻzgartirmaydi;
 *   - notanish token — xato (kod buni «nomaʼlum = toʻxtash» deb oʻqiydi);
 *   - kecha sanalgani bugungi limitga kirmaydi;
 *   - huquqlar — faqat service_role; jadvalga anon/authenticated kira olmaydi.
 *
 * `so_sessiya_user` bu yerda soxta (jadvaldan): haqiqiysi token xeshini qidiradi — shartnomasi bir xil.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';

const M85 = readFileSync(join(import.meta.dirname, '..', 'migrations', '0085_selleros_tahlil_limit.sql'), 'utf8');

const ALI = '00000000-0000-0000-0000-00000000000a';
const VALI = '00000000-0000-0000-0000-00000000000b';
const TA = 'a'.repeat(40);
const TV = 'v'.repeat(40);

const SXEMA = `
  create role anon; create role authenticated; create role service_role;
  create schema selleros; create schema extensions;
  create table selleros.users (id uuid primary key);
  insert into selleros.users values ('${ALI}'), ('${VALI}');
  create table selleros.test_sessiya (token text primary key, user_id uuid not null);
  insert into selleros.test_sessiya values ('${TA}', '${ALI}'), ('${TV}', '${VALI}');
  create function public.so_sessiya_user(p_token text) returns jsonb language sql as $f$
    select jsonb_build_object('userId', user_id) from selleros.test_sessiya where token = p_token
  $f$;
`;

interface Limit { soni?: number; jami?: number; ruxsat?: boolean; xato?: string }

async function band(db: PGlite, token: string, limit: number | null, umumiy: number | null): Promise<Limit> {
  const r = await db.query<{ r: Limit }>('select public.so_tahlil_limit($1, true, $2, $3) as r', [token, limit, umumiy]);
  return r.rows[0]!.r;
}

let db: PGlite;
beforeEach(async () => {
  db = new PGlite();
  await db.exec(SXEMA);
  await db.exec(M85);
});

describe('so_tahlil_limit (0085)', () => {
  it('shaxsiy limit: 3 ta ruxsat, 4-chisi yoʻq — sanoq 3 da qoladi', async () => {
    const natija = [];
    for (let i = 0; i < 4; i++) natija.push(await band(db, TA, 3, null));
    expect(natija.map((x) => x.ruxsat)).toEqual([true, true, true, false]);
    expect(natija.map((x) => x.soni)).toEqual([1, 2, 3, 3]);
    // Boshqa foydalanuvchiga taʼsir qilmaydi.
    expect(await band(db, TV, 3, null)).toMatchObject({ ruxsat: true, soni: 1, jami: 4 });
  });

  it('umumiy shift: yigʻindi chegaraga yetsa — hamma uchun yopiq', async () => {
    expect(await band(db, TA, 30, 3)).toMatchObject({ ruxsat: true, jami: 1 });
    expect(await band(db, TA, 30, 3)).toMatchObject({ ruxsat: true, jami: 2 });
    expect(await band(db, TV, 30, 3)).toMatchObject({ ruxsat: true, jami: 3 });
    expect(await band(db, TV, 30, 3)).toMatchObject({ ruxsat: false, soni: 1, jami: 3 });
    expect(await band(db, TA, 30, 3)).toMatchObject({ ruxsat: false, soni: 2, jami: 3 });
  });

  it('faqat oʻqish sanoqni oʻzgartirmaydi; notanish token — xato', async () => {
    await band(db, TA, 30, null);
    const oqi = await db.query<{ r: Limit }>('select public.so_tahlil_limit($1) as r', [TA]);
    expect(oqi.rows[0]!.r).toEqual({ soni: 1, jami: 1, ruxsat: true });
    expect(await band(db, 'begona', 30, null)).toEqual({ xato: 'sessiya topilmadi' });
    expect((await db.query<{ n: number }>('select count(*)::int as n from selleros.tahlil_limit')).rows[0]!.n).toBe(1);
  });

  it('kecha sanalgani bugungi limitga kirmaydi', async () => {
    await db.query(`insert into selleros.tahlil_limit (user_id, sana, soni) values ($1, current_date - 1, 30)`, [ALI]);
    expect(await band(db, TA, 30, 30)).toMatchObject({ ruxsat: true, soni: 1, jami: 1 });
  });

  it('huquqlar: funksiya faqat service_role ga; jadvalga anon kira olmaydi; qayta qoʻllash xatosiz', async () => {
    const f = await db.query<{ anon: boolean; svc: boolean }>(`
      select has_function_privilege('anon', 'public.so_tahlil_limit(text, boolean, integer, integer)', 'execute') as anon,
             has_function_privilege('service_role', 'public.so_tahlil_limit(text, boolean, integer, integer)', 'execute') as svc`);
    expect(f.rows[0]).toEqual({ anon: false, svc: true });
    const t = await db.query<{ anon: boolean; auth: boolean }>(`
      select has_table_privilege('anon', 'selleros.tahlil_limit', 'select') as anon,
             has_table_privilege('authenticated', 'selleros.tahlil_limit', 'insert') as auth`);
    expect(t.rows[0]).toEqual({ anon: false, auth: false });
    await db.exec(M85);
    expect(await band(db, TA, 30, null)).toMatchObject({ ruxsat: true, soni: 1 });
  });
});
