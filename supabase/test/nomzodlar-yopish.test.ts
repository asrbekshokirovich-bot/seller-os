/**
 * 0086 — `zs_*_nomzodlari` faqat service_role, HAQIQIY Postgres da (PGlite, xotirada).
 *
 * NEGA BU TEST BOR: 0044 va 0049 oltita SECURITY DEFINER funksiyaga faqat service_role ga
 * GRANT bergan, lekin Postgres yangi funksiyaga PUBLIC EXECUTE ni oʻzi beradi — sayt anon
 * kaliti bilan har kim chaqira olardi (jonli bazada 2026-11-13 da oʻlchandi).
 *   - birinchi test teshikni 0086 SIZ koʻrsatadi — test haqiqatan ushlay olishining isboti;
 *   - ikkinchisi 0086 bilan: anon, authenticated, public — yoʻq; service_role — bor.
 *
 * Funksiya tanasi jadvallarga tayanadi; bu yerda faqat huquq tekshiriladi
 * (`check_function_bodies = off`).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

const migratsiya = (fayl: string) => readFileSync(join(import.meta.dirname, '..', 'migrations', fayl), 'utf8');
const M44 = migratsiya('0044_selleros_fikstura_rpc.sql');
const M49 = migratsiya('0049_selleros_fikstura_demping_hype.sql');
const M86 = migratsiya('0086_selleros_nomzodlar_yopish.sql');

const FUNKSIYALAR = ['demping', 'hype', 'mavsumiy', 'nakrutka', 'ogir', 'sertifikat'].map((n) => `public.zs_${n}_nomzodlari()`);

const SXEMA = `
  create role anon; create role authenticated; create role service_role;
  set check_function_bodies = off;
`;

async function huquq(db: PGlite, rol: string, funksiya: string): Promise<boolean> {
  const { rows } = await db.query<{ r: boolean }>(`select has_function_privilege($1, $2, 'execute') as r`, [rol, funksiya]);
  return rows[0]!.r;
}

async function bazaQur(bilan0086: boolean): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SXEMA);
  await db.exec(M44);
  await db.exec(M49);
  if (bilan0086) await db.exec(M86);
  return db;
}

describe('0086 — zs_*_nomzodlari faqat service_role', () => {
  it('0086 siz: anon chaqira oladi (jonli bazadagi teshik shu)', async () => {
    const db = await bazaQur(false);
    for (const f of FUNKSIYALAR) expect(await huquq(db, 'anon', f), f).toBe(true);
    await db.close();
  }, 60_000);

  it('0086 bilan: anon, authenticated, public — yoʻq; service_role — bor', async () => {
    const db = await bazaQur(true);
    for (const f of FUNKSIYALAR) {
      for (const [rol, kutilgan] of [['anon', false], ['authenticated', false], ['public', false], ['service_role', true]] as const) {
        expect(await huquq(db, rol, f), `${rol} ${f}`).toBe(kutilgan);
      }
    }
    await db.close();
  }, 60_000);
});
