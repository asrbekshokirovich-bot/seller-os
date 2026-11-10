/**
 * AI tahlilchi testlari uchun umumiy baza: kichik, qoʻlda hisoblab boʻladigan bozor.
 *
 * Daraxt: 1 → Kiyim(100) → Shimlar(13700), Koʻylaklar(13701); 1 → Poyabzal(200) → Krossovka(14237).
 * Doʻkonlar: 1 Katta, 2 Orta, 3 Kichik, 4 Sotmagan, 5 Eski (faqat perepisda).
 * Tovarlar (30 kun oʻlchangan, oyiga = kunlik × 30):
 *   10 Katta  Shimlar     kuniga 4 → 120, narx 100 000 (tushum 12 mln)
 *   11 Katta  Koʻylaklar  kuniga 2 → 60,  narx 200 000 (12 mln)
 *   20 Orta   Shimlar     kuniga 1 → 30,  narx 100 000 (3 mln)
 *   30 Kichik Shimlar     bitta kunda 1 → 1, narx 50 000 (0,05 mln)
 *   40 Sotmagan Shimlar   hamma kun 0 → 0, narx 80 000
 *   50 Katta  Krossovka   kuniga 3 → 90,  narx 300 000 (27 mln)
 *   60, 61 — Eski doʻkon, faqat perepisda (olib tashlangan).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const yol = (f: string) => readFileSync(join(import.meta.dirname, '..', 'migrations', f), 'utf8');

export const TAHLIL_MIGRATSIYALARI = [
  '0077_zumsavdo_turkum_daraxti.sql',
  '0078_zumsavdo_tovar_baho.sql',
  '0079_zumsavdo_tahlil.sql',
  '0080_selleros_tahlil_asboblari.sql',
  '0081_zumsavdo_tahlil_jadval.sql',
  '0082_zumsavdo_tahlil_bosqichli.sql',
];

/** Bitta qadam natijasi (`zumsavdo.tahlil_qadam`). */
export type Qadam = Record<string, unknown> & { davom?: boolean; bosqich?: string; xato?: string };

/**
 * Tahlil jadvallarini toʻliq qurish: `tahlil_qadam(true)` tugaguncha (jonli bazada pg_cron
 * kechasi daqiqada bitta chaqiradi). Har qadam natijasi qaytariladi — qadamlar soni va
 * bosqichlar tartibini tekshirish uchun. Xato boʻlsa — darhol yiqiladi.
 */
export async function tahlilQur(db: PGlite, max = 500): Promise<Qadam[]> {
  const qadamlar: Qadam[] = [];
  for (let i = 0; i < max; i++) {
    const q = (await db.query<{ j: Qadam }>('select zumsavdo.tahlil_qadam(true) as j')).rows[0]!.j;
    qadamlar.push(q);
    if (q.xato) throw new Error(`tahlil_qadam xatosi (${String(q.bosqich)}): ${q.xato}`);
    if (!q.davom) return qadamlar;
  }
  throw new Error(`tahlil_qadam ${max} qadamda tugamadi`);
}

const SXEMA = `
  create role anon; create role authenticated; create role service_role;
  create schema zumsavdo; create schema selleros;
  create table zumsavdo.tovar_30kun (
    product_id bigint primary key, sana date not null, olchangan_kun smallint not null, qoldiq_oxirgi integer,
    tugagan_kun smallint not null, tugaganiga smallint not null, narx_oxirgi bigint, narx_min bigint, narx_max bigint,
    sotildi smallint[], olchangan_mask integer, tugagan_mask integer, qoldiqdan_mask integer, narx integer[],
    belgi integer, belgi_max integer, sharh_bosh integer, sharh integer, chegirma smallint,
    kategoriya bigint, dokon bigint, nom text, yangilandi timestamptz not null default now()
  );
  create table zumsavdo.product (id bigint primary key, title text, shop_id bigint, category_id bigint);
  create table zumsavdo.product_census (pass integer, product_id bigint, observed_at timestamptz default '2026-10-26 12:00+00',
    price bigint, full_price bigint, reviews integer, rating numeric, buyers_per_week integer, shop_orders bigint,
    primary key (pass, product_id));
  create table zumsavdo.crawl_cursor (name text primary key, next_id bigint, max_id bigint, pass integer, seen bigint,
    live bigint, started_at timestamptz, updated_at timestamptz);
  create table zumsavdo.category (id bigint primary key, name text);
  create table zumsavdo.shop (id bigint primary key, name text);
  create table zumsavdo.market_day (date date primary key, id_frontier bigint);
  create table zumsavdo.xulosa_jurnal (id bigserial primary key, sana date not null);
  create table selleros.id_frontier (id bigserial primary key, platform text, sana date, max_id bigint);
  create function zumsavdo.norm(t text) returns text language sql immutable as $$
    select regexp_replace(translate(replace(replace(replace(replace(lower(coalesce(t, '')), 'ʻ', ''), 'ʼ', ''), '‘', ''), '’', ''), '''', ''), '\\s+', ' ', 'g')
  $$;
`;

const HAMMA = 2 ** 30 - 1;

export async function tahlilBazasi(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SXEMA);
  for (const f of TAHLIL_MIGRATSIYALARI) await db.exec(yol(f));
  await db.exec(`
    insert into zumsavdo.turkum (id, ota_id, nom, chuqurlik, yol, yol_nomi, barg) values
      (1, null, 'Barcha toifalar', 0, '{1}', 'Barcha toifalar', false),
      (100, 1, 'Kiyim', 1, '{1,100}', 'Kiyim', false),
      (13700, 100, 'Shimlar', 2, '{1,100,13700}', 'Kiyim › Shimlar', true),
      (13701, 100, 'Koʻylaklar', 2, '{1,100,13701}', 'Kiyim › Koʻylaklar', true),
      (200, 1, 'Poyabzal', 1, '{1,200}', 'Poyabzal', false),
      (14237, 200, 'Krossovkalar', 2, '{1,200,14237}', 'Poyabzal › Krossovkalar', true);
    insert into zumsavdo.category values (13700, 'Shimlar'), (13701, 'Koʻylaklar'), (14237, 'Krossovkalar');
    insert into zumsavdo.shop values (1, 'Katta'), (2, 'Orta'), (3, 'Kichik'), (4, 'Sotmagan'), (5, 'Eski');
    insert into zumsavdo.crawl_cursor values ('census', 500, 1000, 3, 0, 0, now(), now());
    insert into zumsavdo.xulosa_jurnal (sana) values ('2026-10-27');
    insert into selleros.id_frontier (platform, sana, max_id) values ('uzum', '2026-09-01', 3282517), ('uzum', '2026-10-01', 3432061);
  `);
  const kun = (q: number) => `'{${Array(30).fill(q).join(',')}}'`;
  const kichik = `'{${[...Array(29).fill(0), 1].join(',')}}'`;
  const q = (id: number, dokon: number, turkum: number, sotildi: string, narx: number, nom: string) =>
    `(${id}, '2026-10-27', 30, 5, 0, 0, ${narx}, ${sotildi}, ${HAMMA}, null, null, 0, 0, 0, ${turkum}, ${dokon}, '${nom}')`;
  await db.exec(`
    insert into zumsavdo.tovar_30kun (product_id, sana, olchangan_kun, qoldiq_oxirgi, tugagan_kun, tugaganiga, narx_oxirgi,
      sotildi, olchangan_mask, belgi, belgi_max, sharh_bosh, sharh, chegirma, kategoriya, dokon, nom) values
      ${q(10, 1, 13700, kun(4), 100000, 'Ayollar shimi klassik')},
      ${q(11, 1, 13701, kun(2), 200000, 'Erkaklar koʻylagi')},
      ${q(20, 2, 13700, kun(1), 100000, 'Bolalar shimi')},
      ${q(30, 3, 13700, kichik, 50000, 'Arzon shim')},
      ${q(40, 4, 13700, kun(0), 80000, 'Sotilmagan shim')},
      ${q(50, 1, 14237, kun(3), 300000, 'Krossovka sport')};
    insert into zumsavdo.product values (10, 'T10', 1, 13700), (11, 'T11', 1, 13701), (20, 'T20', 2, 13700),
      (30, 'T30', 3, 13700), (40, 'T40', 4, 13700), (50, 'T50', 1, 14237), (60, 'T60', 5, 13700), (61, 'T61', 5, 13701);
    insert into zumsavdo.product_census (pass, product_id, reviews, rating, shop_orders) values
      (2, 10, 50, 4.8, 9000), (2, 11, 20, 4.6, 9000), (2, 20, 5, 4.5, 700), (2, 30, 1, 4.0, 3),
      (2, 40, 0, null, 0), (2, 50, 30, 4.9, 9000), (2, 60, 7, 4.1, 120),
      (3, 10, 999, 1.0, 1);
  `);
  return db;
}
