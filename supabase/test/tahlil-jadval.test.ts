/**
 * 0079 — AI tahlilchining tayyor jadvallari: SQL HAQIQIY Postgres da (PGlite).
 *
 * NEGA BU TEST BOR. AI aytadigan har raqam shu jadvallardan keladi. Bu yerda kichik,
 * qoʻlda hisoblab boʻladigan bozor yasaladi va tekshiriladi: tovar sotuvi formula bilan
 * (0078) — kartochka bilan bir xil; ota turkum = barglari yigʻindisi (doʻkon ikki bargda
 * boʻlsa ham BIR marta sanaladi); «eng yaxshi 20%» ulushi; «shu paytgacha» — oxirgi
 * TOʻLIQ perepis oʻtishidan; yangilash faqat manba oʻzgarganda va har safar jurnalga;
 * tashqaridan (anon) oʻqib boʻlmaydi.
 */

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { tahlilBazasi } from './tahlil-sinov';

describe('0079 — tahlil jadvallari', () => {
  let db: PGlite;
  const bitta = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]!;
  const hammasi = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows;
  const yangila = async (m = false) => (await bitta<{ j: { yangilandi: string[] } }>('select zumsavdo.tahlil_yangila($1) as j', [m])).j;

  beforeAll(async () => {
    db = await tahlilBazasi();
  }, 180_000);

  it('birinchi yangilash: hamma jadval, jurnalga yoziladi; ikkinchisi — hech narsa', async () => {
    const j = await yangila();
    expect(j.yangilandi).toEqual(['tahlil_tovar', 'tahlil_dokon_turkum', 'tahlil_census_dt', 'tahlil_dokon', 'tahlil_turkum']);
    expect((await yangila()).yangilandi).toEqual([]);
    const jurnal = await hammasi<{ census_pass: number; sana: string }>('select census_pass, sana::text from zumsavdo.tahlil_jurnal');
    expect(jurnal).toEqual([{ census_pass: 2, sana: '2026-10-27' }]);
  });

  it('tovar: oyiga formula bilan, tushum = oyiga × narx, reyting oxirgi TOʻLIQ oʻtishdan', async () => {
    const r = await hammasi<{ product_id: number; oyiga: number; holat: string; tushum: string; reyting: string | null }>(
      'select product_id, oyiga, holat, tushum::text, reyting::text from zumsavdo.tahlil_tovar order by product_id',
    );
    const by = Object.fromEntries(r.map((x) => [Number(x.product_id), x]));
    expect(by[10]).toMatchObject({ oyiga: 120, holat: 'sotilyapti', tushum: '12000000', reyting: '4.8' });
    expect(by[11]).toMatchObject({ oyiga: 60, tushum: '12000000' });
    expect(by[20]).toMatchObject({ oyiga: 30, holat: 'sotilyapti' });
    expect(by[30]).toMatchObject({ oyiga: 1, holat: 'sekin' });
    expect(by[40]).toMatchObject({ oyiga: 0, holat: 'sotilmadi', tushum: '0' });
  });

  it('turkum: ota = barglar yigʻindisi, doʻkon bir marta sanaladi', async () => {
    const k = await bitta<Record<string, string | number>>(
      'select sotuvchilar, sotgan_sotuvchilar, tovarlar, dona::int, tushum::text, top20_tushum::text from zumsavdo.tahlil_turkum where turkum = 100',
    );
    // Kiyim: Katta (10, 11), Orta (20), Kichik (30), Sotmagan (40) → 4 doʻkon, 3 tasi sotgan.
    expect(k).toMatchObject({ sotuvchilar: 4, sotgan_sotuvchilar: 3, tovarlar: 5, dona: 120 + 60 + 30 + 1 + 0 });
    // Tushum: 12 + 12 + 3 + 0,05 mln; eng yaxshi 20% = ceil(4 × 0,2) = 1 doʻkon (Katta) = 24 mln.
    expect(k.tushum).toBe(String(12_000_000 + 12_000_000 + 3_000_000 + 50_000));
    expect(k.top20_tushum).toBe('24000000');
    const ildiz = await bitta<{ sotuvchilar: number; tovarlar: number }>('select sotuvchilar, tovarlar from zumsavdo.tahlil_turkum where turkum = 1');
    expect(ildiz).toEqual({ sotuvchilar: 4, tovarlar: 6 });
  });

  it('shu paytgacha: olib tashlangan tovar ham, sharhli = sotilgani isbotlangan', async () => {
    const k = await bitta<Record<string, number>>(
      'select census_sotuvchilar, census_sotgan_sotuvchilar, census_tovarlar, census_sharhli from zumsavdo.tahlil_turkum where turkum = 100',
    );
    // Kiyim: doʻkonlar 1,2,3,4,5 (5 — faqat perepisda). Sharhli tovar: 10,11,20,30,60 → doʻkonlar 1,2,3,5.
    expect(k).toEqual({ census_sotuvchilar: 5, census_sotgan_sotuvchilar: 4, census_tovarlar: 7, census_sharhli: 5 });
  });

  it('doʻkon: jami buyurtma (Uzum), asosiy turkum, faqat perepisdagi doʻkon ham bor', async () => {
    const r = await hammasi<{ dokon: number; nom: string; jami_buyurtma: string | null; asosiy_turkum: number | null; tushum: string }>(
      'select dokon, nom, jami_buyurtma::text, asosiy_turkum, tushum::text from zumsavdo.tahlil_dokon order by dokon',
    );
    const by = Object.fromEntries(r.map((x) => [Number(x.dokon), x]));
    expect(by[1]).toMatchObject({ nom: 'Katta', jami_buyurtma: '9000', asosiy_turkum: 14237, tushum: '51000000' });
    expect(by[5]).toMatchObject({ nom: 'Eski', jami_buyurtma: '120', asosiy_turkum: null, tushum: '0' });
  });

  it('yosh: 3 432 061 raqamli tovar 2026-10-01 da qoʻyilgan (kalibrovka nuqtasi)', async () => {
    const r = await bitta<{ y: number }>(
      `select zumsavdo.tahlil_yosh(3432061, n.ids, n.sanalar, '2026-10-27') as y from zumsavdo.tahlil_id_nuqtalari() n`,
    );
    expect(r.y).toBe(26);
  });

  it('manba oʻzgarsa — qayta yangilanadi (yangi xulosa kuni → tovar jadvallari)', async () => {
    await db.exec(`insert into zumsavdo.xulosa_jurnal (sana) values ('2026-10-28')`);
    const j = await yangila();
    expect(j.yangilandi).toEqual(['tahlil_tovar', 'tahlil_dokon_turkum', 'tahlil_dokon', 'tahlil_turkum']);
  });

  it('tashqaridan oʻqib boʻlmaydi', async () => {
    const r = await hammasi<{ v: string; e: boolean }>(
      `select v, has_table_privilege('anon', 'zumsavdo.' || v, 'select') or has_table_privilege('authenticated', 'zumsavdo.' || v, 'select') as e
         from unnest(array['tahlil_tovar', 'tahlil_census_dt', 'tahlil_dokon_turkum', 'tahlil_dokon', 'tahlil_turkum', 'tahlil_jurnal']) v`,
    );
    expect(r.filter((x) => x.e)).toEqual([]);
  });
});
