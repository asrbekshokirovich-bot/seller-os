/**
 * 6-tuzoqning qamrov qorovuli tirikmi.
 *
 * XATO NIMA EDI. `monopoliya.ts` da qamrov qorovuli bor:
 * top-3 ulushi turkumdagi sotuvchilarning yarmidan koʻpi ustida
 * hisoblanmasa, filtr "baholanmadi" deydi. U bekorga
 * qoʻyilmagan — izohida 2026-08-19 dagi oʻlchov bor:
 * "Qoplamalar" da 10 sotuvchi boʻyicha ulush 76%, aslida
 * 2 052 sotuvchi va 21%.
 *
 * Lekin `so_turkum_holati` `measuredSellers` va `totalSellers`
 * ga BIR XIL sonni qoʻyardi, yaʼni qamrov har doim 100% chiqardi
 * va qorovul hech qachon ishlamasdi.
 *
 * Oʻlchandi: haqiqiy mediana qamrov 2,3% (19/785), va 319
 * turkumdan 284 tasi "monopol" deb bayroqlanardi.
 *
 * Tuzatilgandan keyin: bayroqli 8, baholanmadi 0.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const M = join(
  import.meta.dirname, '../migrations/0041_selleros_turkum_raqobati.sql',
);
const sql = readFileSync(M, 'utf8');
const kod = sql.split('\n').filter((q) => !q.trim().startsWith('--')).join('\n');

const IS = join(import.meta.dirname, '../../.github/workflows/skreyper.yml');
const ish = readFileSync(IS, 'utf8');

describe('turkum raqobati — manba perepis', () => {
  it('hisob `zumsavdo` dan, `selleros.product` dan emas', () => {
    expect(kod).toMatch(/from\s+zumsavdo\.product_census/);
    expect(kod).toMatch(/from\s+zumsavdo\.product\s+p/);
  });

  it('`so_turkum_holati` keshdan oʻqiydi', () => {
    /*
     * Eski shakl namunadan hisoblardi:
     *   from selleros.product p ... group by p.category_id, p.shop_id
     * U qaytib kelsa qamrov yana 2,3% ga tushardi.
     */
    const holati = kod.slice(kod.indexOf('function public.so_turkum_holati'));
    expect(holati).toMatch(/from\s+selleros\.turkum_raqobati\s+r/);
    expect(holati).not.toMatch(/from\s+selleros\.product\s+p\b[\s\S]*group\s+by/);
  });

  it('ulush hisobida nolga boʻlish yoʻq', () => {
    // Sharh yigʻindisi nol boʻlsa javob `null` — "bilmayman",
    // nol emas va xato ham emas.
    expect(kod).toMatch(/nullif\(j\.s,\s*0\)/);
  });

  it('supurishdan keyin va bayroqlardan OLDIN yangilanadi', () => {
    const raqobat = ish.indexOf('so_turkum_raqobati_yangila');
    const bayroq = ish.indexOf('bayroqlarni-hisobla');
    expect(raqobat, 'raqobat yangilash ishda yoʻq').toBeGreaterThan(-1);
    expect(raqobat).toBeLessThan(bayroq);
  });

  it('nol turkum xato deb sanaladi — jim oʻtmaydi', () => {
    expect(ish).toMatch(/Turkum raqobati yangilanmadi/);
  });
});
