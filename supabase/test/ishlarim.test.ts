/**
 * 0083 — «Ishlarim»: `so_ochiq_ishlar` va `so_ochiq_ish_holat`, HAQIQIY Postgres da (PGlite, xotirada).
 *
 * NEGA BU TESTLAR BOR (ikkinchi koʻrik K2): chat ishlarni yozib qoʻyardi, mijoz esa ularni koʻra olmasdi.
 *   - har mijoz FAQAT oʻz ishlarini koʻradi va belgilaydi (begona ish — «topilmadi», notanish token — xato);
 *   - «tekshirish» ishlari (jamoa uchun) roʻyxatga chiqmaydi va belgilanmaydi;
 *   - tartib: ochiqlari oldin, muddat boʻyicha (muddatsizi oxirida), keyin bajarilganlari;
 *   - qayta «bajarildi» birinchi yopilgan vaqtni oʻzgartirmaydi; qayta ochilsa — vaqt boʻshaydi;
 *   - 50 tadan koʻp boʻlsa — ochiqlari kesilmaydi (bajarilgan eskilari tushib qoladi);
 *   - huquqlar — faqat service_role.
 *
 * `so_sessiya_user` bu yerda soxta (jadvaldan): haqiqiysi token xeshini qidiradi — shartnomasi bir xil:
 * topilmasa `null`.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const M83 = readFileSync(join(import.meta.dirname, '..', 'migrations', '0083_selleros_ishlarim.sql'), 'utf8');

const ALI = '00000000-0000-0000-0000-00000000000a';
const VALI = '00000000-0000-0000-0000-00000000000b';
const KOP = '00000000-0000-0000-0000-00000000000c';
const TA = 'a'.repeat(40);
const TV = 'v'.repeat(40);
const TK = 'k'.repeat(40);

const SXEMA = `
  create role anon; create role authenticated; create role service_role;
  create schema selleros; create schema extensions;
  create table selleros.users (id uuid primary key);
  insert into selleros.users values ('${ALI}'), ('${VALI}'), ('${KOP}');
  -- 0056 dagidek.
  create table selleros.ochiq_ish (
    id         bigserial primary key,
    user_id    uuid not null references selleros.users(id) on delete cascade,
    tur        text not null check (tur in ('kutyapman', 'tolov', 'tekshirish')),
    sabab      text not null,
    muddat     date,
    holat      text not null default 'ochiq' check (holat in ('ochiq', 'yopiq')),
    props      jsonb,
    created_at timestamptz not null default now(),
    yopildi_at timestamptz
  );
  create table selleros.test_sessiya (token text primary key, user_id uuid not null);
  insert into selleros.test_sessiya values ('${TA}', '${ALI}'), ('${TV}', '${VALI}'), ('${TK}', '${KOP}');
  create function public.so_sessiya_user(p_token text) returns jsonb language sql as $f$
    select jsonb_build_object('userId', user_id) from selleros.test_sessiya where token = p_token
  $f$;
`;

async function r<T>(db: PGlite, sql: string, ...p: unknown[]): Promise<T> {
  return ((await db.query<{ r: T }>(sql, p)).rows[0] as { r: T }).r;
}

interface IshQ { id: number; tur: string; sabab: string; muddat: string | null; holat: string; yaratildi: string; yopildi: string | null }
const royxat = async (db: PGlite, token: string) => (await r<{ ishlar: IshQ[] }>(db, 'select public.so_ochiq_ishlar($1) as r', token)).ishlar;
const belgi = (db: PGlite, token: string, id: number | null, bajarildi: boolean | null) =>
  r<Record<string, unknown>>(db, 'select public.so_ochiq_ish_holat($1, $2, $3) as r', token, id, bajarildi);

describe('0083 — «Ishlarim»', () => {
  const db = new PGlite();
  const ids: Record<string, number> = {};

  beforeAll(async () => {
    await db.exec(SXEMA);
    await db.exec(M83);
    for (const [kalit, user, tur, sabab, muddat] of [
      ['yatt', ALI, 'kutyapman', 'YATT ochilishi', null],
      ['qabul', ALI, 'kutyapman', 'Uzum ombor qabuli', '2026-11-12'],
      ['soliq', ALI, 'tolov', 'ijtimoiy soliq (2026-yil oktyabr)', '2026-11-15'],
      ['sayt', ALI, 'tekshirish', 'rasmiy: YATT roʻyxat sayti boshqacha', null],
      ['begona', VALI, 'kutyapman', 'yuk kelishi', null],
    ] as const) {
      ids[kalit] = await r<number>(db, 'insert into selleros.ochiq_ish (user_id, tur, sabab, muddat) values ($1, $2, $3, $4) returning id as r', user, tur, sabab, muddat);
    }
  }, 180_000);

  it('roʻyxat: faqat oʻziniki, «tekshirish»siz; ochiqlari muddat boʻyicha, muddatsizi oxirida', async () => {
    expect((await royxat(db, TA)).map((x) => x.sabab)).toEqual(['Uzum ombor qabuli', 'ijtimoiy soliq (2026-yil oktyabr)', 'YATT ochilishi']);
    expect((await royxat(db, TV)).map((x) => x.sabab)).toEqual(['yuk kelishi']);
    const bitta = (await royxat(db, TA))[0]!;
    expect(bitta).toMatchObject({ id: ids['qabul'], tur: 'kutyapman', muddat: '2026-11-12', holat: 'ochiq', yopildi: null });
    expect(typeof bitta.yaratildi).toBe('string');
    expect(await r(db, 'select public.so_ochiq_ishlar($1) as r', 'x'.repeat(40))).toEqual({ xato: 'sessiya topilmadi' });
    expect(await r(db, 'select public.so_ochiq_ishlar(null) as r')).toEqual({ xato: 'sessiya topilmadi' });
  });

  it('bajarildi → yopiq va oxirga tushadi; qayta «bajarildi» vaqtni saqlaydi; qayta ochiq → vaqt boʻsh', async () => {
    expect(await belgi(db, TA, ids['qabul']!, true)).toEqual({ ok: true });
    let j = await royxat(db, TA);
    expect(j.map((x) => [x.sabab, x.holat])).toEqual([
      ['ijtimoiy soliq (2026-yil oktyabr)', 'ochiq'], ['YATT ochilishi', 'ochiq'], ['Uzum ombor qabuli', 'yopiq'],
    ]);
    const birinchi = await r<string>(db, 'select yopildi_at::text as r from selleros.ochiq_ish where id = $1', ids['qabul']);
    expect(birinchi).not.toBeNull();
    await db.exec(`update selleros.ochiq_ish set yopildi_at = yopildi_at - interval '2 days' where id = ${ids['qabul']}`);
    const eski = await r<string>(db, 'select yopildi_at::text as r from selleros.ochiq_ish where id = $1', ids['qabul']);
    expect(await belgi(db, TA, ids['qabul']!, true)).toEqual({ ok: true });
    expect(await r<string>(db, 'select yopildi_at::text as r from selleros.ochiq_ish where id = $1', ids['qabul'])).toBe(eski);

    expect(await belgi(db, TA, ids['qabul']!, false)).toEqual({ ok: true });
    j = await royxat(db, TA);
    expect(j.find((x) => x.id === ids['qabul'])).toMatchObject({ holat: 'ochiq', yopildi: null });
    expect(j[0]!.sabab).toBe('Uzum ombor qabuli');
  });

  it('begona ish, «tekshirish» ishi, notanish token va boʻsh qiymatlar — hech narsa oʻzgarmaydi', async () => {
    expect(await belgi(db, TA, ids['begona']!, true)).toEqual({ xato: 'ish topilmadi' });
    expect(await belgi(db, TA, ids['sayt']!, true)).toEqual({ xato: 'ish topilmadi' });
    expect(await belgi(db, TA, 999_999, true)).toEqual({ xato: 'ish topilmadi' });
    expect(await belgi(db, 'x'.repeat(40), ids['yatt']!, true)).toEqual({ xato: 'sessiya topilmadi' });
    expect(await belgi(db, TA, ids['yatt']!, null)).toEqual({ xato: 'id va bajarildi kerak' });
    expect(await belgi(db, TA, null, true)).toEqual({ xato: 'id va bajarildi kerak' });
    const holatlar = await db.query<{ id: number; holat: string }>('select id, holat from selleros.ochiq_ish order by id');
    expect(holatlar.rows.every((x) => x.holat === 'ochiq')).toBe(true);
  });

  it('50 tadan koʻp: ochiqlari kesilmaydi, eski bajarilganlari tushib qoladi', async () => {
    await db.exec(`
      insert into selleros.ochiq_ish (user_id, tur, sabab, holat, yopildi_at)
      select '${KOP}', 'kutyapman', 'eski ' || g, 'yopiq', now() - g * interval '1 hour' from generate_series(1, 60) g;
      insert into selleros.ochiq_ish (user_id, tur, sabab) values ('${KOP}', 'kutyapman', 'eng eski ochiq');
      update selleros.ochiq_ish set created_at = now() - interval '90 days' where sabab = 'eng eski ochiq';
    `);
    const j = await royxat(db, TK);
    expect(j).toHaveLength(50);
    expect(j[0]!.sabab).toBe('eng eski ochiq');
    expect(j[1]!.sabab).toBe('eski 1');
    expect(j.at(-1)!.sabab).toBe('eski 49');
  });

  it('huquqlar: faqat service_role chaqira oladi', async () => {
    for (const [rol, kutilgan] of [['anon', false], ['authenticated', false], ['public', false], ['service_role', true]] as const) {
      expect(await r<boolean>(db, `select has_function_privilege('${rol}', 'public.so_ochiq_ishlar(text)', 'execute') as r`), rol).toBe(kutilgan);
      expect(await r<boolean>(db, `select has_function_privilege('${rol}', 'public.so_ochiq_ish_holat(text, bigint, boolean)', 'execute') as r`), rol).toBe(kutilgan);
    }
  });
});
