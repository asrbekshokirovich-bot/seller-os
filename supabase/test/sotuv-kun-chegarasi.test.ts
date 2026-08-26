/**
 * Sotuv hisobi kun chegarasini kesib oʻtadimi.
 *
 * XATO NIMA EDI. `so_rollup_sales` qoldiq farqini oladigan `lag()`
 * oynasi KUN BOʻYICHA boʻlingan edi:
 *
 *   lag(o.stock) over (partition by o.product_id, kun order by ...)
 *
 * Har kun yangidan boshlangani uchun kunning birinchi oʻlchovida
 * oldingi qiymat `null` boʻlardi va kechagi oxirgi oʻlchov bilan
 * bugungi birinchi oʻlchov orasidagi harakat butunlay yoʻqolardi.
 *
 * Oʻlchandi: harakatning 27,6% i tashlanardi (1 615 + 394 dona,
 * jami 7 283 dan). Supurish kuniga uch marta yuradi — toʻrtta
 * oraliqdan bittasi, tunggisi, har doim tushib qolardi.
 *
 * NEGA TEST MATNGA QARAYDI. Bu yerda baza yoʻq: CI da Supabase
 * ishlamaydi. Lekin xatoning oʻzi bitta satrda va uni matndan
 * aniq koʻrish mumkin — `partition by` ichida sana boʻlmasligi
 * kerak. Bu "kod ishlayaptimi" degan test emas, "oʻsha satr
 * qaytib kelmadimi" degan qorovul.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const M = join(
  import.meta.dirname, '../migrations/0038_selleros_sotuv_kun_chegarasi.sql',
);
const sql = readFileSync(M, 'utf8');

/** Faqat bajariladigan kod — izohlar tashlanadi. */
const kod = sql
  .split('\n')
  .filter((q) => !q.trim().startsWith('--'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');

describe('so_rollup_sales — kun chegarasi', () => {
  it('`lag(stock)` oynasi SANA boʻyicha boʻlinmaydi', () => {
    /*
     * Aynan qaytib kelishi mumkin boʻlgan satr. Oynada
     * `product_id` dan boshqa hech narsa boʻlmasligi kerak.
     */
    const oyna = kod.match(
      /lag\(\s*o\.stock\s*\)\s*over\s*\(([\s\S]*?)\)/,
    );
    expect(oyna, '`lag(o.stock) over (...)` topilmadi').not.toBeNull();
    expect(oyna![1]).not.toMatch(/observed_at\s*at\s*time\s*zone/);
    expect(oyna![1]).not.toMatch(/::date/);
    expect(oyna![1]).toMatch(/partition\s+by\s+o\.product_id\s+order\s+by/);
  });

  it('qatorlar `product_daily` dan yoziladi, harakatdan emas', () => {
    /*
     * Harakatsiz kunga ham qator kerak: "0 dona sotildi" — OʻLCHOV.
     * Busiz sekin tovar `tovar_sotuvi` dagi "7 kun" shartiga hech
     * qachon yetmasdi va abadiy taxminda qolardi.
     */
    expect(kod).toMatch(/from\s+selleros\.product_daily\s+d/);
    expect(kod).toMatch(/left\s+join\s+harakat\s+h/);
  });

  it('oʻlchov soni `sweeps` dan olinadi, kuzatuv sonidan emas', () => {
    // `product_observation` faqat OʻZGARGANDA yoziladi, yaʼni
    // undagi qator soni "necha marta qaradik" degani emas.
    expect(kod).toMatch(/d\.sweeps/);
  });

  it('qoldigʻi hech qachon oʻlchanmagan tovarga `null`, nol EMAS', () => {
    // Nol "sotilmadi" degan daʼvo, holbuki javob "qaramadik".
    expect(kod).toMatch(/b\.birinchi_kun\s+is\s+null\s+or\s+b\.birinchi_kun\s*>\s*d\.date/);
  });

  it('oʻlik `so_rollup_days` oʻchiriladi', () => {
    /*
     * U ikki sababdan yaroqsiz edi: hech kim chaqirmasdi va
     * chaqirilsa `certainty` CHECK sharti bilan darhol yiqilardi
     * ('yuqori'/'orta'/'past' yozardi, ruxsat esa
     * 'exact'/'approx' ga).
     */
    expect(kod).toMatch(/drop\s+function\s+if\s+exists\s+public\.so_rollup_days/);
  });
});
