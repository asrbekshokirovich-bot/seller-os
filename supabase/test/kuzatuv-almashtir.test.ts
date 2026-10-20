/**
 * 0068/0069 — kuzatuv roʻyxatini yangilash: SQL HAQIQIY Postgres da (PGlite, xotirada).
 *
 * NEGA BU TESTLAR BOR. Kuzatuv namunasi (0014) 2026-08-24 da bir marta tanlangan va hech
 * qachon yangilanmagan edi — 2026-10-20 da 5 999 tadan 4 536 tasi Uzumda «Tugadi». 0068 har
 * skreyper ishida oʻlik oʻrinlarni oʻsha turkumning sotuvdagi tovari bilan almashtiradi,
 * 0069 — nomzodlar tartibi (sotuvda boʻlishi ehtimoli kattasi birinchi). Bu yerda:
 *   - qaysi oʻrin oʻlik (14 kun qoldiq 0 yoki oʻlchanmagan; yangi qoʻshilgan, kam oʻlchangan va
 *     sotuvchi qoʻshgani — emas), oʻlchov toʻxtagan boʻlsa — hech narsa taklif qilinmaydi;
 *   - nomzodlar: oʻsha turkumdan, kuzatilmagan, yaqinda rad etilmagan, xaridor belgisi bor;
 *     turkumlar navbat bilan; boʻlak ichida 0069 tartibi;
 *   - almashtirish: bitta eski — bitta yangi, turkum hajmi oʻzgarmaydi, notoʻgʻrisi tashlanadi;
 *   - katalog (`so_tovar_royxati`) — faqat faol namuna; huquqlar — faqat service_role.
 * Har shartni olib tashlab koʻrilgan (mutatsiya, 2026-10-20) — test uni ushlaydi.
 *
 * Jonli `so_tovar_royxati` fayllardagidan farq qiladi (0036), shuning uchun bu yerda uning
 * `tovar` boʻlagi AYNAN jonli matndagidek (pg_get_functiondef, 2026-10-20) qayta yozilgan.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const oqi = (f: string) => readFileSync(join(import.meta.dirname, '..', 'migrations', f), 'utf8').replace(/\r\n/g, '\n');
const M68 = oqi('0068_selleros_kuzatuv_almashtir.sql');
const M69 = oqi('0069_selleros_almashtir_tartib.sql');

const SXEMA = `
  create role anon; create role authenticated; create role service_role;
  create schema selleros; create schema zumsavdo;
  create table selleros.tracked_product (
    external_id bigint primary key, platform text not null default 'uzum', category_external_id bigint,
    buyers_per_week_at_pick integer, demand_bucket integer, active boolean not null default true,
    added_at timestamptz not null default now());
  create table selleros.category (id bigint primary key, platform text, external_id bigint, name_uz text, name_ru text);
  create table selleros.shop (id bigint primary key, name text);
  create table selleros.product (id bigserial primary key, platform text not null default 'uzum', external_id bigint not null,
    title text, shop_id bigint, category_id bigint, unique (platform, external_id));
  create table selleros.product_daily (product_id bigint not null, date date not null, stock int, primary key (product_id, date));
  create table selleros.sotuvchi_tovar (user_id uuid not null, external_id bigint not null, primary key (user_id, external_id));
  create table zumsavdo.product (id bigint primary key, category_id bigint);
  create table zumsavdo.product_census (pass int not null, product_id bigint not null, buyers_per_week int, reviews int,
    primary key (pass, product_id));
  create table zumsavdo.crawl_cursor (name text primary key, next_id bigint);
  create or replace function public.so_tovar_royxati(p_category_external_id bigint, p_limit integer default 50)
   returns jsonb language sql security definer set search_path to 'selleros', 'public'
  as $function$
  with
  turkum as (
    select id, external_id, coalesce(name_uz, name_ru) as name from selleros.category
    where platform = 'uzum' and external_id = p_category_external_id
  ),
  tovar as (
    select p.id, p.external_id, p.title, p.shop_id,
           s.name as shop_name
    from selleros.product p
    join turkum t on t.id = p.category_id
    left join selleros.shop s on s.id = p.shop_id
    where p.platform = 'uzum'
  )
  select coalesce(jsonb_agg(tv.external_id order by tv.external_id), '[]'::jsonb)
  from (select * from tovar order by external_id limit p_limit) tv
  $function$;
`;
const KUN = (n: number) => `(now() at time zone 'Asia/Tashkent')::date - ${n}`;

interface Nomzod { id: number; xaridor: number }
interface Slot { eski: number; turkum: number; bolak: number; nomzodlar: Nomzod[] }
interface Nomzodlar { slotlar: Slot[]; olik_jami: number; turkumlar: number; pass?: number; sabab?: string }

async function r<T>(db: PGlite, sql: string, ...p: unknown[]): Promise<T> {
  return ((await db.query<{ r: T }>(sql, p)).rows[0] as { r: T }).r;
}

describe('0068 — oʻlik oʻrinlar, almashtirish, katalog', () => {
  const db = new PGlite();
  const tp = async (e: number) => (await db.query<Record<string, unknown>>(
    'select * from selleros.tracked_product where external_id = $1', [e])).rows[0];
  let n: Nomzodlar;
  let bosh: Nomzodlar;
  const slot = (e: number) => n.slotlar.find((s) => s.eski === e)!;

  beforeAll(async () => {
    await db.exec(SXEMA);
    // Turkumlar: A (tashqi 100), B (200), C (300).
    await db.exec(`
      insert into selleros.category values (1, 'uzum', 100, 'A', 'A'), (2, 'uzum', 200, 'B', 'B'), (3, 'uzum', 300, 'C', 'C');
      insert into selleros.tracked_product (external_id, category_external_id, buyers_per_week_at_pick, demand_bucket, added_at) values
        (1001, 100, 500, 1,  now() - interval '30 days'),  -- oʻlik: 14 kun 0
        (1002, 100, 50,  5,  now() - interval '30 days'),  -- tirik: qoldiq bor
        (1003, 100, 10,  10, now() - interval '30 days'),  -- oʻlik: umuman oʻlchanmagan
        (1004, 100, 5,   15, now() - interval '5 days'),   -- oʻlik, lekin yangi qoʻshilgan
        (1006, 100, 1,   20, now() - interval '30 days'),  -- oʻlik, lekin sotuvchi qoʻshgan
        (1007, 100, 1,   19, now() - interval '30 days'),  -- oʻlchangan kun kam (3 kun) — oʻlik emas
        (2001, 200, 300, 3,  now() - interval '30 days'),  -- B: oʻlik
        (3001, 300, 30,  1,  now() - interval '30 days');  -- C: oʻlik, nomzodsiz
      insert into selleros.tracked_product (external_id, category_external_id, added_at) values (1005, null, now() - interval '30 days');
      insert into selleros.sotuvchi_tovar values ('11111111-1111-1111-1111-111111111111', 1006);
      insert into selleros.product (external_id, category_id) values (1001, 1), (1002, 1), (1004, 1), (1006, 1), (1007, 1), (2001, 2), (3001, 3), (1005, 1);
    `);
    for (const [e, stok, kunlar] of [[1001, 0, 14], [1002, 5, 14], [1004, 0, 5], [1006, 0, 14], [1007, 0, 3], [2001, 0, 14], [3001, 0, 14], [1005, 0, 14]] as const) {
      await db.query(`insert into selleros.product_daily select p.id, ${KUN(0)} - g, $2 from selleros.product p, generate_series(0, $3 - 1) g
        where p.external_id = $1`, [e, stok, kunlar]);
    }
    // Perepis: A da 60 ta (5001..5060) talabi kamayib, B da 20 ta; C da yoʻq. Kursor yoʻq — hamma eski.
    await db.exec(`
      insert into zumsavdo.crawl_cursor values ('census', 999999999);
      insert into zumsavdo.product select 5000 + g, 100 from generate_series(1, 60) g;
      insert into zumsavdo.product select 6000 + g, 200 from generate_series(1, 20) g;
      insert into zumsavdo.product values (1001, 100), (1002, 100), (1003, 100), (2001, 200);
      insert into zumsavdo.product_census select 6, 5000 + g, 1000 - g * 10 from generate_series(1, 40) g;
      insert into zumsavdo.product_census select 5, 5000 + g, case when g = 50 then null else 600 - g * 10 end from generate_series(41, 60) g;
      insert into zumsavdo.product_census select 6, 6000 + g, 200 - g from generate_series(1, 20) g;
      insert into zumsavdo.product_census values (6, 1001, 900), (6, 1002, 800), (6, 1003, 50), (6, 2001, 150);
    `);
    await db.exec(M68);
    await db.exec(M69);
    await db.exec(M68); // qayta qoʻllash xavfsiz (katalog yamogʻi ikki marta tushmaydi)
    await db.exec(M69);
    await db.exec(`insert into selleros.kuzatuv_rad values (5001, now()), (5002, now() - interval '20 days')`);
    bosh = await r<Nomzodlar>(db, 'select public.so_almashtir_nomzodlari() as r');
    // Darvoza: skreyper soʻnggi 2 kunda kamida 1 000 tovar oʻlchagan boʻlsin.
    await db.exec(`insert into selleros.product_daily select 900000 + g, ${KUN(0)}, 1 from generate_series(1, 1000) g`);
    n = await r<Nomzodlar>(db, 'select public.so_almashtir_nomzodlari(14, 60, 5) as r');
  });

  it('oʻlchov toʻxtagan boʻlsa — hech narsa taklif qilinmaydi', () => {
    expect(bosh.sabab).toBe('oʻlchov yoʻq');
    expect(bosh.slotlar).toEqual([]);
  });

  it('oʻlik oʻrinlar: 14 kun 0, oʻlchanmagan; yangi, kam oʻlchangan va sotuvchiniki — emas; turkumlar navbat bilan', () => {
    expect(n.slotlar.map((s) => s.eski).sort()).toEqual([1001, 1003, 2001, 3001]);
    expect(n.olik_jami).toBe(4);
    expect(n.pass).toBe(6);
    // Har turkumning birinchi oʻrni, keyin ikkinchisi (A: 1001, 1003).
    expect(n.slotlar.map((s) => s.eski)).toEqual([1001, 2001, 3001, 1003]);
    // Navbatda: eng koʻp oʻligi bor turkum (A) — `p_turkum = 1` da faqat u.
  });

  it('nomzodlar: oʻsha turkumdan, kuzatilmagan, yaqinda rad etilmagan, belgisi bor; boʻlakka yaqini', async () => {
    const a1 = slot(1001).nomzodlar.map((x) => x.id);
    expect(a1).toHaveLength(5);
    expect(a1).not.toContain(5001); // yaqinda rad etilgan
    expect(a1).toContain(5002); // 20 kun oldin rad etilgan — yana taklif qilinadi
    expect(a1.every((x) => x >= 5002 && x <= 5060)).toBe(true);
    // Boʻlak 1 (5002..5004) — avval; toifasi bir xil — id kattasi birinchi (0069).
    expect(a1.slice(0, 3)).toEqual([5004, 5003, 5002]);
    // Boʻlak 10 — oʻrtadan: birinchi nomzod eng yuqori ham, eng past talabli ham emas.
    const b10 = slot(1003).nomzodlar[0]!;
    expect(b10.xaridor < 900 && b10.xaridor > 200).toBe(true);
    expect(n.slotlar.flatMap((s) => s.nomzodlar.map((x) => x.id))).not.toContain(5050); // belgisiz
    expect(slot(2001).nomzodlar.every((x) => x.id > 6000 && x.id <= 6020)).toBe(true);
    expect(slot(3001).nomzodlar).toEqual([]);
    const bir = await r<Nomzodlar>(db, 'select public.so_almashtir_nomzodlari(14, 1, 3) as r');
    expect(bir.slotlar.map((s) => s.eski).sort()).toEqual([1001, 1003]);
    expect(bir.slotlar.every((s) => s.nomzodlar.length <= 3)).toBe(true);
  });

  it('almashtirish: bitta eski — bitta yangi, turkum hajmi oʻzgarmaydi, notoʻgʻrisi tashlanadi', async () => {
    const natija = await r<Record<string, number>>(db, 'select public.so_almashtir($1::jsonb, $2::jsonb) as r',
      JSON.stringify([
        { eski: 1001, yangi: 5003, xaridor: 970 },
        { eski: 1001, yangi: 5005 },              // bitta eski — ikkinchisi tashlanadi
        { eski: 1003, yangi: 5004, xaridor: 960 },
        { eski: 2001, yangi: 5004 },              // bitta yangi — ikkinchisi tashlanadi
        { eski: 1002, yangi: 1003 },              // yangi allaqachon kuzatilgan
        { eski: 1005, yangi: 5010 },              // sotuvchi qoʻshgani (turkumsiz)
        { eski: 1006, yangi: 5011 },              // sotuvchiniki
        { eski: 'x', yangi: 5012 },               // buzuq
      ]),
      JSON.stringify([5020, 5021, '5021', 'buzuq']));
    expect(natija).toMatchObject({ qoshildi: 2, ochirildi: 2, rad: 2 });
    expect((await tp(1001))!.active).toBe(false);
    expect((await tp(1003))!.active).toBe(false);
    expect((await tp(2001))!.active).toBe(true);
    expect(await tp(5003)).toMatchObject({ active: true, demand_bucket: 1, buyers_per_week_at_pick: 970 });
    expect(Number((await tp(5003))!.category_external_id)).toBe(100);
    expect((await tp(5004))!.demand_bucket).toBe(10);
    for (const e of [5005, 5010, 5011, 5012]) expect(await tp(e)).toBeUndefined();
    const faolA = (await db.query<{ n: number }>(
      'select count(*)::int as n from selleros.tracked_product where active and category_external_id = 100')).rows[0]!.n;
    expect(faolA).toBe(6);
    // Nofaol eski — qayta almashtirilmaydi.
    const r2 = await r<Record<string, number>>(db, `select public.so_almashtir($1::jsonb, '[]'::jsonb) as r`,
      JSON.stringify([{ eski: 1001, yangi: 5030 }]));
    expect(r2.qoshildi).toBe(0);
    // Rad etilganlar va kuzatilayotganlar keyingi taklifda yoʻq.
    const n2 = await r<Nomzodlar>(db, 'select public.so_almashtir_nomzodlari(14, 60, 60) as r');
    expect(n2.slotlar.map((s) => s.eski).sort()).toEqual([2001, 3001]);
    const hammasi = n2.slotlar.flatMap((s) => s.nomzodlar.map((x) => x.id));
    expect(hammasi).not.toContain(5003);
    expect(hammasi).not.toContain(5020);
    await expect(db.query(`select public.so_almashtir('{}'::jsonb, '[]'::jsonb)`)).rejects.toThrow(/massiv/);
  });

  it('katalog — faqat faol namuna, oʻsha turkumniki', async () => {
    await db.exec(`insert into selleros.product (external_id, category_id) values (5003, 1) on conflict do nothing`);
    expect(await r<number[]>(db, 'select public.so_tovar_royxati(100, 50) as r')).toEqual([1002, 1004, 1006, 1007, 5003]);
    const def = await r<string>(db, `select pg_get_functiondef('public.so_tovar_royxati(bigint,integer)'::regprocedure) as r`);
    expect(def.split('selleros.tracked_product tp')).toHaveLength(2);
  });

  it('huquqlar: anon va authenticated chaqira olmaydi, service_role — oladi', async () => {
    const h = (rol: string, fn: string) => r<boolean>(db, `select has_function_privilege('${rol}', '${fn}', 'execute') as r`);
    expect(await h('anon', 'public.so_almashtir(jsonb,jsonb)')).toBe(false);
    expect(await h('authenticated', 'public.so_almashtir_nomzodlari(int,int,int)')).toBe(false);
    expect(await h('anon', 'selleros.almashtir_nomzodlari(int,int,int)')).toBe(false);
    expect(await h('service_role', 'public.so_almashtir(jsonb,jsonb)')).toBe(true);
    expect(await h('service_role', 'public.so_almashtir_nomzodlari(int,int,int)')).toBe(true);
  });
});

describe('0069 — nomzodlar tartibi: sotuvda boʻlishi ehtimoli kattasi birinchi', () => {
  // Birinchi jonli ishdan oʻlchandi: kursordan keyingi (yangi) 36 %, sharhi oʻsgan 23 %,
  // soʻnggi oʻtishda yoʻq 12 %, qolgani 6 % — «xaridor belgisi» kattasi esa koʻproq tugagan.
  const db = new PGlite();
  let n: Nomzodlar;
  const ids = (e: number, m: Nomzodlar = n) => m.slotlar.find((s) => s.eski === e)!.nomzodlar.map((x) => x.id);

  beforeAll(async () => {
    await db.exec(SXEMA);
    await db.exec(`
      insert into selleros.category values (1, 'uzum', 100, 'A', 'A'), (2, 'uzum', 200, 'B', 'B');
      insert into selleros.tracked_product (external_id, category_external_id, buyers_per_week_at_pick, demand_bucket, added_at) values
        (1001, 100, 500, 1, now() - interval '30 days'), (1009, 100, 1, 14, now() - interval '30 days'),
        (1010, 100, 1, 12, now() - interval '30 days'), (1008, 100, 1, 18, now() - interval '30 days'),
        (2001, 200, 1, 1, now() - interval '30 days');
      insert into selleros.product (external_id, category_id) values (1001, 1), (1008, 1), (1009, 1), (1010, 1), (2001, 2);
      insert into selleros.product_daily select p.id, ${KUN(0)} - g, 0 from selleros.product p, generate_series(0, 13) g;
      insert into selleros.product_daily select 900000 + g, ${KUN(0)}, 1 from generate_series(1, 1000) g;
      -- A: 5001..5040 ikkala oʻtishda, 5003 ning sharhi oʻsgan; 5035 — 6-oʻtishda yoʻq (kursordan oldin);
      -- 5041..5060 — faqat 5-oʻtishda, kursordan keyin (yangi), 5050 belgisiz.
      insert into zumsavdo.crawl_cursor values ('census', 5041);
      insert into zumsavdo.product select 5000 + g, 100 from generate_series(1, 60) g;
      insert into zumsavdo.product values (1001, 100), (1002, 100), (1003, 100);
      insert into zumsavdo.product_census select 6, 5000 + g, 1000 - g * 10, case when g = 3 then 120 else 100 end
        from generate_series(1, 40) g where g <> 35;
      insert into zumsavdo.product_census select 5, 5000 + g, 1000 - g * 10, 100 from generate_series(1, 40) g;
      insert into zumsavdo.product_census select 5, 5000 + g, case when g = 50 then null else 600 - g * 10 end, 50
        from generate_series(41, 60) g;
      insert into zumsavdo.product_census values (6, 1001, 900, 10), (6, 1002, 800, 10), (6, 1003, 50, 10);
      insert into selleros.tracked_product (external_id, category_external_id, demand_bucket, added_at)
        values (1002, 100, 5, now() - interval '30 days'), (1003, 100, 10, now());
      -- B: boʻlak 1 da 6001 (eski), 7001 (kursordan keyin — yangi), 6002 (sharhi oʻsgan).
      insert into zumsavdo.product select 6000 + g, 200 from generate_series(1, 40) g;
      insert into zumsavdo.product values (7001, 200);
      insert into zumsavdo.product_census select 6, 6000 + g, 1000 - 10 * g, case when g = 2 then 130 else 100 end
        from generate_series(1, 40) g;
      insert into zumsavdo.product_census select 5, 6000 + g, 1000 - 10 * g, 100 from generate_series(1, 40) g;
      insert into zumsavdo.product_census values (5, 7001, 985, 40);
    `);
    await db.exec(M68);
    await db.exec(M69);
    n = await r<Nomzodlar>(db, 'select public.so_almashtir_nomzodlari(14, 300, 5) as r');
  });

  it('sharhi oʻsgan — belgisi kattaroq eskidan oldin; yangi — undan ham oldin', () => {
    expect(ids(1001).slice(0, 3)).toEqual([5003, 5004, 5002]);
    expect(ids(2001).slice(0, 3)).toEqual([7001, 6002, 6001]);
  });

  it('kursordan keyingi (yangi) — eskidan oldin; soʻnggi oʻtishda yoʻq — sharhsizdan oldin; id kattasi birinchi', () => {
    expect(ids(1009).slice(0, 3)).toEqual([5042, 5041, 5040]);
    expect(ids(1010).slice(0, 3)).toEqual([5035, 5036, 5034]);
    expect(ids(1008).slice(0, 2)).toEqual([5054, 5053]);
  });

  it('har boʻlakdan `p_nomzod` tasi — sotuvda boʻlishi ehtimoli kattalari (belgisi kattalari emas)', async () => {
    const m = await r<Nomzodlar>(db, 'select public.so_almashtir_nomzodlari(14, 300, 2) as r');
    expect(ids(1009, m)).toEqual([5042, 5041]);
  });

  it('kursor boʻlmasa ham ishlaydi; oʻlchov yozuvi yoʻq tovar (1002) ham oʻlik oʻrin', async () => {
    await db.exec(`delete from zumsavdo.crawl_cursor`);
    const m = await r<Nomzodlar>(db, 'select public.so_almashtir_nomzodlari(14, 300, 5) as r');
    expect(m.slotlar).toHaveLength(6);
    expect(n.slotlar).toHaveLength(6);
  });
});
