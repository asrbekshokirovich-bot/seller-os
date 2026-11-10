/**
 * 0077 — Uzum turkum daraxti: SQL HAQIQIY Postgres da (PGlite).
 *
 * NEGA BU TEST BOR. Daraxt toʻliq almashtiriladi: yangi roʻyxatda yoʻq tugun oʻchadi.
 * Demak yarim roʻyxat (tarmoq uzildi, javob kesildi) butun daraxtni yoʻq qilishi mumkin
 * edi. Bu yerda tekshiriladi: toʻgʻri daraxt yoʻl va barg bilan yoziladi; ostki daraxt
 * `yol @> array[X]` bilan topiladi; har qanday buzuq roʻyxat rad etiladi va jadval
 * O'ZGARMAYDI; funksiya faqat service_role uchun.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const M77 = readFileSync(join(import.meta.dirname, '..', 'migrations', '0077_zumsavdo_turkum_daraxti.sql'), 'utf8');
const M84 = readFileSync(join(import.meta.dirname, '..', 'migrations', '0084_zumsavdo_tahlil_tuzatish.sql'), 'utf8');
// 0084 dan faqat daraxt yozuvchisi (qolgani tahlil jadvallariga bogʻliq — `tahlil-jadval.test.ts`).
const OXIRI = 'grant execute on function public.so_turkum_daraxti_yoz(jsonb) to service_role;';
const M84_DARAXT = M84.slice(M84.indexOf('create or replace function public.so_turkum_daraxti_yoz'), M84.indexOf(OXIRI) + OXIRI.length);

const SXEMA = `
  create role anon; create role authenticated; create role service_role;
  create schema zumsavdo;
`;

interface Tugun { id: number; ota_id: number | null; nom: string; kattalar?: boolean }

/** Ildiz 1 → «Kiyim» (100) → 3 ta ichki (1001..1003) → har birida barglar; qolgani toʻldiruvchi. */
function daraxt(qoshimcha = 5000): Tugun[] {
  const t: Tugun[] = [
    { id: 1, ota_id: null, nom: 'Barcha toifalar' },
    { id: 100, ota_id: 1, nom: 'Kiyim' },
    { id: 1001, ota_id: 100, nom: 'Ayollar kiyimi' },
    { id: 1002, ota_id: 100, nom: 'Erkaklar kiyimi' },
    { id: 1003, ota_id: 100, nom: 'Qizlar uchun' },
    { id: 13700, ota_id: 1003, nom: 'Shimlar' },
    { id: 13701, ota_id: 1001, nom: 'Shimlar' },
    { id: 13702, ota_id: 1002, nom: 'Shimlar' },
    { id: 200, ota_id: 1, nom: 'Poyabzallar' },
    { id: 14237, ota_id: 200, nom: 'Krossovkalar', kattalar: false },
  ];
  for (let i = 0; i < qoshimcha; i++) t.push({ id: 100_000 + i, ota_id: 300, nom: `Toʻldiruvchi ${i}` });
  t.push({ id: 300, ota_id: 1, nom: 'Boshqa' });
  return t;
}

describe('0077 — turkum daraxti', () => {
  const db = new PGlite();
  const yoz = async (t: unknown) =>
    (await db.query<{ j: Record<string, number> }>('select public.so_turkum_daraxti_yoz($1::jsonb) as j', [JSON.stringify(t)])).rows[0]!.j;
  const soni = async () => Number((await db.query<{ n: number }>('select count(*)::int as n from zumsavdo.turkum')).rows[0]!.n);

  beforeAll(async () => {
    await db.exec(SXEMA);
    await db.exec(M77);
    await db.exec(M77); // qayta qoʻllash xavfsiz
    await db.exec(M84_DARAXT); // 0084: faqat oʻzgargan qator yoziladi
  }, 120_000);

  it('toʻgʻri daraxt: yoʻl, yoʻl nomi, chuqurlik, barg', async () => {
    const j = await yoz(daraxt());
    expect(j.tugunlar).toBe(5011);
    expect(j.chuqurlik_max).toBe(3);
    expect(j.ochirildi).toBe(0);
    const r = (await db.query<{ id: number; yol: number[]; yol_nomi: string; chuqurlik: number; barg: boolean }>(
      'select id, yol, yol_nomi, chuqurlik, barg from zumsavdo.turkum where id in (1, 100, 1003, 13700) order by id',
    )).rows;
    const by = Object.fromEntries(r.map((x) => [x.id, x]));
    expect(by[1]).toMatchObject({ chuqurlik: 0, barg: false, yol_nomi: 'Barcha toifalar' });
    expect(by[100]).toMatchObject({ chuqurlik: 1, barg: false, yol_nomi: 'Kiyim' });
    expect(by[13700]).toMatchObject({ chuqurlik: 3, barg: true, yol_nomi: 'Kiyim › Qizlar uchun › Shimlar' });
    expect(by[13700]!.yol.map(Number)).toEqual([1, 100, 1003, 13700]);
  });

  it('ostki daraxt: «Kiyim» ning barglari — uchta «Shimlar», boshqasi emas', async () => {
    const r = (await db.query<{ id: number }>(
      `select id from zumsavdo.turkum where yol @> array[100]::bigint[] and barg order by id`,
    )).rows.map((x) => Number(x.id));
    expect(r).toEqual([13700, 13701, 13702]);
  });

  it('qayta yozish: yoʻqolgan tugun oʻchadi, nom yangilanadi', async () => {
    const t = daraxt().filter((x) => x.id !== 13702).map((x) => (x.id === 14237 ? { ...x, nom: 'Krossovkalar va kedalar' } : x));
    const j = await yoz(t);
    expect(j.ochirildi).toBe(1);
    const nom = (await db.query<{ nom: string; yol_nomi: string }>('select nom, yol_nomi from zumsavdo.turkum where id = 14237')).rows[0]!;
    expect(nom).toEqual({ nom: 'Krossovkalar va kedalar', yol_nomi: 'Poyabzallar › Krossovkalar va kedalar' });
  });

  const maxVaqt = async () =>
    (await db.query<{ v: string }>('select max(yangilandi)::text as v from zumsavdo.turkum')).rows[0]!.v;
  const oxirgiDaraxt = () =>
    daraxt().filter((x) => x.id !== 13702).map((x) => (x.id === 14237 ? { ...x, nom: 'Krossovkalar va kedalar' } : x));

  it('0084: oʻzgarmagan daraxt qayta yozilsa — hech bir qator «yangilanmaydi» (tahlil har kecha qayta qurilmaydi)', async () => {
    const oldin = await maxVaqt();
    const j = await yoz(oxirgiDaraxt());
    expect(j.ozgardi).toBe(0);
    expect(j.ochirildi).toBe(0);
    expect(await maxVaqt()).toBe(oldin);
  });

  it('0084: tugun oʻchsa — ildiz belgilanadi (daraxt oʻzgargani koʻrinadi)', async () => {
    const oldin = await maxVaqt();
    await new Promise((r) => setTimeout(r, 20));
    const j = await yoz(oxirgiDaraxt().filter((x) => x.id !== 13701));
    // 13701 oʻchdi; uning otasi 1001 endi oʻzi barg — bitta qator oʻzgaradi.
    expect(j).toMatchObject({ ochirildi: 1, ozgardi: 1 });
    expect(await maxVaqt()).not.toBe(oldin);
  });

  it('0084: nom oʻzgarsa — faqat oʻsha tugun va uning avlodlari yangilanadi', async () => {
    const t = oxirgiDaraxt().filter((x) => x.id !== 13701).map((x) => (x.id === 1003 ? { ...x, nom: 'Qizlar' } : x));
    const j = await yoz(t);
    // 1003 va uning yagona bargi 13700 (yoʻl nomi «Kiyim › Qizlar › Shimlar» boʻldi).
    expect(j.ozgardi).toBe(2);
  });

  const buzuq: Array<[string, () => unknown, RegExp]> = [
    ['massiv emas', () => ({ id: 1 }), /massiv emas/],
    ['kam tugun', () => daraxt(10), /kamida 5 000/],
    ['ildizsiz', () => daraxt().filter((x) => x.id !== 1).map((x) => (x.ota_id === 1 ? { ...x, ota_id: null } : x)), /ildiz/],
    ['takror id', () => [...daraxt(), { id: 13700, ota_id: 1003, nom: 'Shimlar' }], /takror/],
    ['yetim', () => [...daraxt(), { id: 9_999_999, ota_id: 8_888_888, nom: 'Yetim' }], /otasi/],
    ['halqa', () => [...daraxt(), { id: 7, ota_id: 8, nom: 'A' }, { id: 8, ota_id: 7, nom: 'B' }], /bogʻlanmagan/],
  ];
  for (const [nom, t, xato] of buzuq) {
    it(`buzuq roʻyxat rad etiladi va jadval oʻzgarmaydi: ${nom}`, async () => {
      const oldin = await soni();
      await expect(yoz(t())).rejects.toThrow(xato);
      expect(await soni()).toBe(oldin);
    });
  }

  it('faqat service_role: anon va authenticated chaqira olmaydi', async () => {
    const huquq = (await db.query<{ r: string; e: boolean }>(
      `select r, has_function_privilege(r, 'public.so_turkum_daraxti_yoz(jsonb)', 'execute') as e
         from unnest(array['anon', 'authenticated', 'service_role']) r`,
    )).rows;
    expect(Object.fromEntries(huquq.map((x) => [x.r, x.e]))).toEqual({ anon: false, authenticated: false, service_role: true });
    const jadval = (await db.query<{ r: string; e: boolean }>(
      `select r, has_table_privilege(r, 'zumsavdo.turkum', 'select') as e from unnest(array['anon', 'authenticated']) r`,
    )).rows;
    expect(jadval.every((x) => !x.e)).toBe(true);
  });
});
