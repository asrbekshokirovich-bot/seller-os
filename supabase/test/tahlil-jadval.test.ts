/**
 * 0079 + 0082 — AI tahlilchining tayyor jadvallari: SQL HAQIQIY Postgres da (PGlite).
 *
 * NEGA BU TEST BOR. AI aytadigan har raqam shu jadvallardan keladi. Bu yerda kichik,
 * qoʻlda hisoblab boʻladigan bozor yasaladi va tekshiriladi: tovar sotuvi formula bilan
 * (0078) — kartochka bilan bir xil; ota turkum = barglari yigʻindisi (doʻkon ikki bargda
 * boʻlsa ham BIR marta sanaladi); «eng yaxshi 20%» ulushi; «shu paytgacha» — oxirgi
 * TOʻLIQ perepis oʻtishidan; tashqaridan (anon) oʻqib boʻlmaydi.
 *
 * 0082 (05.11 hodisasidan keyin): qurilish KICHIK QADAMLARDA, nofaol nusxaga; tayyor
 * boʻlmaguncha AI eski (toʻliq) nusxani koʻradi; faqat kechasi; xato yoziladi va
 * 5 tasidan keyin qurilish toʻxtaydi.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { tahlilBazasi, tahlilQur, type Qadam } from './tahlil-sinov';

const M82 = readFileSync(join(import.meta.dirname, '..', 'migrations', '0082_zumsavdo_tahlil_bosqichli.sql'), 'utf8');

describe('0079/0082 — tahlil jadvallari', () => {
  let db: PGlite;
  let birinchi: Qadam[];
  const bitta = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]!;
  const hammasi = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows;
  const qadam = async (m = true) => (await bitta<{ j: Qadam }>('select zumsavdo.tahlil_qadam($1) as j', [m])).j;
  const holat = async () =>
    bitta<{ faol: string | null; quriladi: string | null; bosqich: string | null; xato_soni: number; oxirgi_xato: string | null }>(
      'select faol, quriladi, bosqich, xato_soni, oxirgi_xato from zumsavdo.tahlil_qurilish where id = 1',
    );
  const korinish = async (v: string) =>
    (await bitta<{ d: string }>(`select pg_get_viewdef('zumsavdo.${v}'::regclass) as d`)).d;

  beforeAll(async () => {
    db = await tahlilBazasi();
    birinchi = await tahlilQur(db);
  }, 180_000);

  it('birinchi qurilish: hamma bosqich tartib bilan, «b» nusxaga, jurnalga yoziladi; ikkinchisi — hech narsa', async () => {
    const bosqichlar = [...new Set(birinchi.map((q) => q.bosqich).filter(Boolean))];
    expect(bosqichlar).toEqual(['tovar_indeks', 'census', 'census_yig', 'dokon_turkum', 'dokon', 'turkum', 'yakun', 'tayyor']);
    expect(birinchi[0]).toMatchObject({ boshlandi: 'b', sana: '2026-10-27', census_pass: 2 });
    expect(await holat()).toMatchObject({ faol: 'b', quriladi: null, bosqich: null, xato_soni: 0 });
    expect(await korinish('tahlil_tovar')).toContain('tahlil_tovar_b');
    expect(await qadam()).toMatchObject({ yangi_yoq: true });
    const jurnal = await hammasi<{ census_pass: number; sana: string; qatorlar: Record<string, number | string> }>(
      'select census_pass, sana::text, qatorlar from zumsavdo.tahlil_jurnal',
    );
    expect(jurnal).toHaveLength(1);
    expect(jurnal[0]).toMatchObject({ census_pass: 2, sana: '2026-10-27' });
    expect(jurnal[0]!.qatorlar).toMatchObject({ tovar: 6, daraxtsiz_tovar: 0, dokon_turkum: 6, dokon: 5, turkum: 6, nusxa: 'b' });
    const h = await bitta<{ j: { sana: string; census_pass: number } }>('select zumsavdo.tahlil_holati() as j');
    expect(h.j).toMatchObject({ sana: '2026-10-27', census_pass: 2 });
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

  it('yangi kun: «a» nusxaga quriladi, tayyor boʻlmaguncha AI eski toʻliq nusxani koʻradi', async () => {
    await db.exec(`insert into zumsavdo.xulosa_jurnal (sana) values ('2026-10-28')`);
    // Yangi kunda Katta doʻkonning shimi ikki baravar sotildi.
    await db.exec(`update zumsavdo.tovar_30kun set sana = '2026-10-28', sotildi = '{${Array(30).fill(8).join(',')}}' where product_id = 10`);
    expect(await qadam()).toMatchObject({ boshlandi: 'a', sana: '2026-10-28' });
    // Bir necha qadam — qurilish yarmida.
    for (let i = 0; i < 3; i++) await qadam();
    expect(await holat()).toMatchObject({ faol: 'b', quriladi: 'a' });
    const oldin = await bitta<{ oyiga: number; n: number }>(
      'select (select oyiga from zumsavdo.tahlil_tovar where product_id = 10) as oyiga, (select count(*)::int from zumsavdo.tahlil_turkum) as n',
    );
    expect(oldin).toEqual({ oyiga: 120, n: 6 });

    const qolgan = await tahlilQur(db);
    // Perepis oʻtishi oʻzgarmagan — «shu paytgacha» qayta hisoblanmaydi, faol nusxadan olinadi.
    const bosqichlar = qolgan.map((q) => q.bosqich);
    expect(bosqichlar).not.toContain('census');
    expect(bosqichlar).toContain('dokon_turkum');
    expect(await holat()).toMatchObject({ faol: 'a', quriladi: null });
    expect(await korinish('tahlil_dokon')).toContain('tahlil_dokon_a');
    const keyin = await bitta<{ oyiga: number; census: number }>(
      `select (select oyiga from zumsavdo.tahlil_tovar where product_id = 10) as oyiga,
              (select census_sotuvchilar::int from zumsavdo.tahlil_turkum where turkum = 100) as census`,
    );
    expect(keyin).toEqual({ oyiga: 240, census: 5 });
    expect((await bitta<{ n: number }>('select count(*)::int as n from zumsavdo.tahlil_jurnal')).n).toBe(2);
  });

  it('qurilish yarmida yangi kun kelsa — boshidan (aralash nusxa boʻlmaydi)', async () => {
    await db.exec(`insert into zumsavdo.xulosa_jurnal (sana) values ('2026-10-29')`);
    expect(await qadam()).toMatchObject({ boshlandi: 'b', sana: '2026-10-29' });
    await db.exec(`insert into zumsavdo.xulosa_jurnal (sana) values ('2026-10-30')`);
    expect(await qadam()).toMatchObject({ qayta: 'yangi tovar_30kun kuni', sana: '2026-10-30' });
    await tahlilQur(db);
    const j = await bitta<{ sana: string }>('select sana::text from zumsavdo.tahlil_jurnal order by id desc limit 1');
    expect(j.sana).toBe('2026-10-30');
    expect(await holat()).toMatchObject({ faol: 'b', quriladi: null });
  });

  it('xato: yoziladi, faol nusxa buzilmaydi; 5 ta xatodan keyin cron qadami toʻxtaydi', async () => {
    await db.exec(`update zumsavdo.tahlil_qurilish set quriladi = 'a', bosqich = 'nomalum' where id = 1`);
    for (let i = 1; i <= 5; i++) {
      expect(await qadam()).toMatchObject({ bosqich: 'nomalum', davom: false });
      expect((await holat()).xato_soni).toBe(i);
    }
    expect((await holat()).oxirgi_xato).toContain('nomaʼlum bosqich');
    // Faol nusxa (b) oʻqilishda davom etadi.
    expect((await bitta<{ n: number }>('select count(*)::int as n from zumsavdo.tahlil_tovar')).n).toBe(6);
    // Cron qadami (majburiy emas): kechasi — toʻxtagan, kunduzi — kutadi; ikkala holatda ham ish qilmaydi.
    const q = await qadam(false);
    expect(Boolean(q.toxtadi) || Boolean(q.kutish)).toBe(true);
    expect((await holat()).xato_soni).toBe(5);
    await db.exec(`update zumsavdo.tahlil_qurilish set quriladi = null, bosqich = null, xato_soni = 0, oxirgi_xato = null where id = 1`);
  });

  it('tun oynasi: UTC 20:00–02:59 (Toshkent 01:00–07:59)', async () => {
    const r = await hammasi<{ v: string; t: boolean }>(
      `select v, zumsavdo.tahlil_tunmi(v::timestamptz) as t
         from unnest(array['2026-11-05 19:59:59Z', '2026-11-05 20:00:00Z', '2026-11-05 23:30:00Z', '2026-11-06 02:59:59Z',
                           '2026-11-06 03:00:00Z', '2026-11-05 10:50:00Z']) v`,
    );
    expect(Object.fromEntries(r.map((x) => [x.v, x.t]))).toEqual({
      '2026-11-05 19:59:59Z': false, '2026-11-05 20:00:00Z': true, '2026-11-05 23:30:00Z': true,
      '2026-11-06 02:59:59Z': true, '2026-11-06 03:00:00Z': false, '2026-11-05 10:50:00Z': false,
    });
  });

  it('0082 ni qayta qoʻllash xavfsiz: faol nusxa oʻzgarmaydi, maʼlumot joyida', async () => {
    await db.exec(M82);
    expect(await korinish('tahlil_tovar')).toContain('tahlil_tovar_b');
    expect((await bitta<{ n: number }>('select count(*)::int as n from zumsavdo.tahlil_tovar')).n).toBe(6);
    expect(await qadam()).toMatchObject({ yangi_yoq: true });
  });

  it('tashqaridan oʻqib ham, qurib ham boʻlmaydi', async () => {
    const r = await hammasi<{ v: string; e: boolean }>(
      `select v, has_table_privilege('anon', 'zumsavdo.' || v, 'select') or has_table_privilege('authenticated', 'zumsavdo.' || v, 'select') as e
         from unnest(array['tahlil_tovar', 'tahlil_census_dt', 'tahlil_dokon_turkum', 'tahlil_dokon', 'tahlil_turkum', 'tahlil_jurnal',
                           'tahlil_qurilish', 'tahlil_tovar_a', 'tahlil_tovar_b', 'tahlil_census_qism_a', 'tahlil_turkum_b']) v`,
    );
    expect(r.filter((x) => x.e)).toEqual([]);
    const f = await hammasi<{ f: string; e: boolean }>(
      `select f, has_function_privilege('anon', f, 'execute') or has_function_privilege('authenticated', f, 'execute') as e
         from unnest(array['zumsavdo.tahlil_qadam(boolean)', 'zumsavdo.tahlil_nusxa_tozala(text)', 'zumsavdo.tahlil_filtrla(jsonb)']) f`,
    );
    expect(f.filter((x) => x.e)).toEqual([]);
  });
});
