/**
 * `so_ingest_batch` doʻkonga nima yozadi — qorovul test.
 *
 * NEGA KERAK. Bu funksiya bir xil xatoni IKKI MARTA yegan va
 * ikkalasida ham hech narsa qizarmagan.
 *
 * 1. `0009` migratsiyasi `official` ni tuzatgan: Uzum bu maydonni
 *    toʻldirmaydi (63 113 doʻkonda 0 ta `true`), demak uning `false` i
 *    oʻlchov emas — doimiy. Ustun NULL boʻla oladigan qilingan, mavjud
 *    `false` lar tozalangan, yozish uchi `coalesce(excluded.official,
 *    eski)` ga oʻzgartirilgan.
 *
 * 2. Keyin funksiya `0023`, `0030`, `0031`, `0037` da qayta yozilgan va
 *    tana har safar **0009 dan oldingi** nusxadan koʻchirilgan. Natijada
 *    `coalesce(rasmiy, false)` qaytib kelgan va har supurish har doʻkonga
 *    soxta `false` qoʻyib chiqqan. Oʻlchandi 2026-09-02: 4 297 doʻkondan
 *    4 276 tasida `false`, oxirgi yozuv oʻsha kuni 09:46 dagi supurish.
 *
 * Nega hech kim sezmagan: hech bir filtr `shopOfficial` ga tayanmaydi,
 * shuning uchun soxta qiymat ekranda koʻrinmagan. U faqat bazada
 * yotgan va QOIDALAR.md 4-qoidasini buzgan — oʻlchanmagan narsa
 * oʻlchangan boʻlib koʻringan.
 *
 * Shuning uchun test funksiya nomerini QOTIRMAYDI: u `so_ingest_batch`
 * ni belgilaydigan ENG OXIRGI migratsiyani topadi. Ertaga kimdir `0055`
 * da funksiyani yana koʻchirsa, test oʻsha faylni tekshiradi va
 * regressiya uchinchi marta jimgina oʻtmaydi.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATSIYALAR = join(import.meta.dirname, '../migrations');

/** `so_ingest_batch` ni belgilaydigan eng oxirgi migratsiya. */
function oxirgiTarif(): { fayl: string; sql: string } {
  const fayllar = readdirSync(MIGRATSIYALAR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  let topildi: { fayl: string; sql: string } | null = null;
  for (const fayl of fayllar) {
    const sql = readFileSync(join(MIGRATSIYALAR, fayl), 'utf8');
    if (/create or replace function\s+public\.so_ingest_batch/.test(sql)) {
      topildi = { fayl, sql };
    }
  }
  if (topildi === null) throw new Error('so_ingest_batch hech qayerda belgilanmagan');
  return topildi;
}

/** Izohlarni olib tashlaydi — taqiq faqat KODga tegishli. */
function kodi(sql: string): string {
  return sql
    .split('\n')
    .map((satr) => satr.replace(/--.*$/, ''))
    .join('\n');
}

/**
 * Funksiya tanasidagi doʻkon bloki — OʻQISH bilan birga.
 *
 * Blok `insert` dan emas, undan oldingi `with kirish as (` dan
 * boshlanadi: `(x->>'shop_rating')` kabi maydonlar aynan oʻsha CTE da
 * oʻqiladi va faqat `insert` dan boshlansak, ular tekshiruvdan tushib
 * qolardi.
 */
function dokonBloki(sql: string): string {
  const kod = kodi(sql);
  const yozish = kod.indexOf('insert into selleros.shop');
  expect(yozish, 'doʻkon bloki topilmadi').toBeGreaterThan(-1);
  const bosh = kod.lastIndexOf('with kirish as (', yozish);
  expect(bosh, 'doʻkon blokining `with kirish` i topilmadi').toBeGreaterThan(-1);
  const oxir = kod.indexOf('into n_shop', yozish);
  expect(oxir, 'doʻkon blokining oxiri topilmadi').toBeGreaterThan(yozish);
  return kod.slice(bosh, oxir);
}

describe('so_ingest_batch — doʻkon yozuvi', () => {
  const { fayl, sql } = oxirgiTarif();
  const blok = dokonBloki(sql);

  it(`eng oxirgi taʼrif topildi (${fayl})`, () => {
    expect(blok.length).toBeGreaterThan(0);
  });

  it('`official` ga "bilmadim" NULL boʻlib boradi, false emas', () => {
    // Aynan shu satr 0009 da olib tashlangan va keyin qaytib kelgan.
    expect(blok).not.toMatch(/coalesce\s*\(\s*rasmiy\s*,\s*false\s*\)/);
  });

  it('`official` eski bilimni oʻchirmaydi', () => {
    // Shartsiz `official = excluded.official` NULL kelganda bor
    // qiymatni oʻchirardi — 0009 aynan shuni tuzatgan.
    expect(blok).toMatch(
      /official\s*=\s*coalesce\s*\(\s*excluded\.official\s*,\s*selleros\.shop\.official\s*\)/,
    );
  });

  it('doʻkon reytingi yoziladi va eski bahoni oʻchirmaydi', () => {
    // Ustun 0001 dan beri bor, 0050 gacha BOʻSH turgan: soʻrovga
    // qoʻshilmagani uchun. Yozuv yoʻqolsa yana shunday boʻladi.
    expect(blok).toMatch(/\(x->>'shop_rating'\)/);
    expect(blok).toMatch(
      /rating\s*=\s*coalesce\s*\(\s*excluded\.rating\s*,\s*selleros\.shop\.rating\s*\)/,
    );
  });

  it('doʻkon sharhlari soni yoziladi', () => {
    expect(blok).toMatch(/\(x->>'shop_reviews'\)/);
    expect(blok).toMatch(/feedback_quantity\s*=\s*coalesce\s*\(\s*excluded\.feedback_quantity/);
  });
});

describe('so_ingest_batch — koʻchirishda yoʻqolgan blok yoʻq', () => {
  const { sql } = oxirgiTarif();
  const kod = kodi(sql);

  // Bu maydonlar `0023`, `0031`, `0037` da qoʻshilgan va ularning
  // ikkitasi migratsiya faylida umuman yoʻq — faqat jonli bazada
  // edi. Yaʼni funksiyani qayta yozayotgan odam ularni bilmasdan
  // tashlab ketishi juda oson, va 7-tuzoq jimgina oʻlardi.
  it.each([
    ["ogʻirlik oʻqiladi", /\(x->>'weight_g'\)/],
    ["ogʻirlik saqlanadi", /weight_g\s*=\s*coalesce\s*\(\s*excluded\.weight_g/],
    ['oversized oʻqiladi', /\(x->>'oversized'\)/],
    ['oversized saqlanadi', /oversized\s*=\s*coalesce\s*\(\s*excluded\.oversized/],
    ['hajm oʻqiladi', /\(x->>'volume_ml'\)/],
    ['hajm saqlanadi', /volume_ml\s*=\s*coalesce\s*\(\s*excluded\.volume_ml/],
    ['xom oʻlchov yoziladi', /insert into selleros\.product_observation/],
    ['kunlik yoziladi', /insert into selleros\.product_daily/],
  ])('%s', (_nom, naqsh) => {
    expect(kod).toMatch(naqsh);
  });
});
