/**
 * 0072 — AI xarajati: `so_ai_sarf_yoz` va `so_kpi_xom` ning `ai` qismi, HAQIQIY Postgres da
 * (PGlite, xotirada).
 *
 * NEGA BU TESTLAR BOR. `ai_usage` (0004) 2026-10-22 gacha boʻsh edi: unga hech kim yozmasdi,
 * panel «AI ulanmagan» derdi, Claude esa har xabarni yozardi (nazoratchi: «AI xarajatini
 * tuzat»). Bu yerda:
 *   - yozuv: mijoz sessiya tokenidan topiladi (sessiyasiz va eskirgan token — mijozsiz, lekin
 *     sarf baribir yoziladi); manfiy/boʻsh qiymatlar tozalanadi; narxi nomaʼlum — `null`, nol emas;
 *   - KPI xom sanogʻi: bugun (Toshkent kuni), 7 va 30 kunlik oyna, mijozlar, mehmon xarajati,
 *     narxsizlar, maqsadlar, mijoz xabarlari (jim oʻlim qorovuli uchun); eski maydonlar joyida;
 *   - huquqlar — faqat service_role.
 *
 * `so_sessiya_user` bu yerda soxta (jadvaldan): haqiqiysi `extensions.digest` bilan token
 * xeshini qidiradi — shartnomasi bir xil: topilmasa `null`.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const M72 = readFileSync(join(import.meta.dirname, '..', 'migrations', '0072_selleros_ai_sarf.sql'), 'utf8');

const SXEMA = `
  create role anon; create role authenticated; create role service_role;
  create schema selleros; create schema extensions;
  create table selleros.users (id uuid primary key, created_at timestamptz not null default now());
  create table selleros.user_profiles (user_id uuid primary key);
  create table selleros.recommendations (id bigserial primary key, user_id uuid, step int);
  create table selleros.subscriptions (id bigserial primary key, user_id uuid, plan text, status text,
    started_at timestamptz, ends_at timestamptz);
  create table selleros.payments (id bigserial primary key);
  create table selleros.events (id bigserial primary key, user_id uuid, name text not null, props jsonb,
    created_at timestamptz not null default now());
  create table selleros.suhbat_xabar (user_id uuid not null, seq bigint not null, rol text not null, matn text,
    created_at timestamptz not null default now(), primary key (user_id, seq));
  -- 0004 dagidek.
  create table selleros.ai_usage (
    id            bigserial primary key,
    user_id       uuid references selleros.users(id),
    model         text not null,
    purpose       text not null,
    input_tokens  integer,
    output_tokens integer,
    cost_usd      numeric(10,6),
    cached        boolean not null default false,
    created_at    timestamptz not null default now()
  );
  create table selleros.test_sessiya (token text primary key, user_id uuid not null);
  create function public.so_sessiya_user(p_token text) returns jsonb language sql as $$
    select jsonb_build_object('userId', user_id) from selleros.test_sessiya where token = p_token
  $$;
`;

const ALI = '00000000-0000-0000-0000-00000000000a';
const VALI = '00000000-0000-0000-0000-00000000000b';
const TOKEN = 'a'.repeat(40);

async function r<T>(db: PGlite, sql: string, ...p: unknown[]): Promise<T> {
  return ((await db.query<{ r: T }>(sql, p)).rows[0] as { r: T }).r;
}

/** `so_ai_sarf_yoz` — Edge `aiSarfYozuvchi` chaqirgandek (nomlangan argumentlar). */
async function yoz(db: PGlite, a: {
  token?: string | null; model?: string | null; maqsad?: string | null; kirish?: number | null; chiqish?: number | null;
  oqildi?: number | null; yozildi?: number | null; narx?: number | null;
}) {
  // Berilmagani — odatiy qiymat; `null` — `null` boʻlib ketadi (shu ham sinaladi).
  const yoki = <T,>(x: T | undefined, odatiy: T) => (x === undefined ? odatiy : x);
  return r<{ yozildi: boolean }>(db, `select public.so_ai_sarf_yoz(
      p_token => $1, p_model => $2, p_maqsad => $3, p_kirish => $4, p_chiqish => $5,
      p_kesh_oqildi => $6, p_kesh_yozildi => $7, p_narx_usd => $8) as r`,
  yoki(a.token, null), yoki(a.model, 'claude-sonnet-5-5'), yoki(a.maqsad, 'ai-yoz'),
  yoki(a.kirish, 120), yoki(a.chiqish, 40), yoki(a.oqildi, 0), yoki(a.yozildi, 0), yoki(a.narx, 0.00064));
}

async function oxirgiQator(db: PGlite) {
  return (await db.query<Record<string, unknown>>(
    'select * from selleros.ai_usage order by id desc limit 1')).rows[0]!;
}

describe('0072 — so_ai_sarf_yoz', () => {
  const db = new PGlite();

  // PGlite (WASM Postgres) ishga tushishi band kompyuterda 10 soniyadan oshadi.
  beforeAll(async () => {
    await db.exec(SXEMA);
    await db.exec(`insert into selleros.users (id) values ('${ALI}'), ('${VALI}');
      insert into selleros.test_sessiya values ('${TOKEN}', '${ALI}');`);
    await db.exec(M72);
    await db.exec(M72); // qayta qoʻllash xavfsiz
  }, 120_000);

  it('sessiya tokeni bilan — mijoz nomiga; hamma maydon yoziladi', async () => {
    expect(await yoz(db, { token: TOKEN, oqildi: 900, yozildi: 300, narx: 0.00073 })).toEqual({ yozildi: true });
    expect(await oxirgiQator(db)).toMatchObject({
      user_id: ALI, model: 'claude-sonnet-5-5', purpose: 'ai-yoz', input_tokens: 120, output_tokens: 40,
      cache_read_tokens: 900, cache_write_tokens: 300, cost_usd: '0.000730', cached: true,
    });
  });

  it('sessiyasiz, boʻsh yoki eskirgan token — mijozsiz, lekin sarf baribir yoziladi', async () => {
    for (const token of [null, '', 'b'.repeat(40)]) {
      expect(await yoz(db, { token })).toEqual({ yozildi: true });
      expect((await oxirgiQator(db)).user_id, String(token)).toBeNull();
    }
  });

  it('keshdan oʻqilmagan — `cached: false`', async () => {
    await yoz(db, { oqildi: 0 });
    expect((await oxirgiQator(db)).cached).toBe(false);
  });

  it('manfiy yoki boʻsh tokenlar — 0; boʻsh model va maqsad — «nomaʼlum»; uzuni kesiladi', async () => {
    await yoz(db, { model: '  ', maqsad: null, kirish: -5, chiqish: null, oqildi: -1, yozildi: null });
    expect(await oxirgiQator(db)).toMatchObject({
      model: 'nomaʼlum', purpose: 'nomaʼlum', input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0,
    });
    await yoz(db, { model: 'm'.repeat(200), maqsad: 'q'.repeat(200) });
    const q = await oxirgiQator(db);
    expect(String(q.model)).toHaveLength(80);
    expect(String(q.purpose)).toHaveLength(40);
  });

  it('narx: nomaʼlum, manfiy yoki sigʻmaydigan — `null` (nol emas); 6 xonagacha yaxlitlanadi', async () => {
    for (const narx of [null, -0.01, 10000]) {
      await yoz(db, { narx });
      expect((await oxirgiQator(db)).cost_usd, String(narx)).toBeNull();
    }
    await yoz(db, { narx: 0.0012345678 });
    expect((await oxirgiQator(db)).cost_usd).toBe('0.001235');
    await yoz(db, { narx: 0 });
    expect((await oxirgiQator(db)).cost_usd).toBe('0.000000');
  });

  it('huquqlar: anon va authenticated chaqira olmaydi, service_role — oladi', async () => {
    const h = (rol: string, fn: string) => r<boolean>(db, `select has_function_privilege('${rol}', '${fn}', 'execute') as r`);
    const YOZ = 'public.so_ai_sarf_yoz(text,text,text,integer,integer,integer,integer,numeric)';
    for (const fn of [YOZ, 'public.so_kpi_xom()']) {
      expect(await h('anon', fn), fn).toBe(false);
      expect(await h('authenticated', fn), fn).toBe(false);
      expect(await h('service_role', fn), fn).toBe(true);
    }
  });
});

interface AiXom {
  qatorlar: number; xarajat_usd: number | null; oxirgi: string | null;
  bugun: { chaqiruv: number; usd: number | null };
  kun7: { chaqiruv: number; usd: number | null };
  kun30: { chaqiruv: number; usd: number | null; narxsiz: number; mijoz: number; mehmon_usd: number | null };
  maqsad_30kun: Record<string, { chaqiruv: number; usd: number | null }>;
  xabar_7kun: number;
}

describe('0072 — so_kpi_xom: `ai` qismi', () => {
  const db = new PGlite();
  let ai: AiXom;
  let xom: Record<string, unknown>;
  /** Hali hech narsa yozilmagan holat. */
  let bosh: AiXom;

  beforeAll(async () => {
    await db.exec(SXEMA);
    await db.exec(`insert into selleros.users (id) values ('${ALI}'), ('${VALI}');`);
    await db.exec(M72);
    bosh = (await r<{ ai: AiXom }>(db, 'select public.so_kpi_xom() as r')).ai;
    // Toshkent kunining boshi — "bugun" chegarasi.
    const KUN_BOSHI = `(date_trunc('day', now() at time zone 'Asia/Tashkent') at time zone 'Asia/Tashkent')`;
    await db.exec(`
      insert into selleros.ai_usage (user_id, model, purpose, input_tokens, output_tokens, cost_usd, created_at) values
        -- bugun (Toshkent): Ali — yozish va tushunish; mehmon — sahifa
        ('${ALI}', 'claude-sonnet-5-5', 'ai-yoz',    100, 40, 0.010000, ${KUN_BOSHI} + interval '1 minute'),
        ('${ALI}', 'claude-sonnet-5-5', 'ai-tushun', 100, 10, 0.002000, ${KUN_BOSHI} + interval '2 minutes'),
        (null,     'claude-sonnet-5-5', 'sahifa',    100, 20, 0.003000, ${KUN_BOSHI} + interval '3 minutes'),
        -- kecha 23:59 (Toshkent) — bugun EMAS, 7 kun ichida
        ('${VALI}', 'claude-sonnet-5-5', 'ai-yoz',   100, 40, 0.020000, ${KUN_BOSHI} - interval '1 minute'),
        -- 3 kun oldin — narxi nomaʼlum model
        ('${VALI}', 'claude-haiku-5-5',  'ai-yoz',   100, 40, null,     now() - interval '3 days'),
        -- 20 kun oldin — faqat 30 kunlikda
        ('${ALI}', 'claude-sonnet-5-5', 'kartochka', 900, 700, 0.100000, now() - interval '20 days'),
        -- 40 kun oldin — faqat umumiy yigʻindida
        ('${VALI}', 'claude-opus-5-5',  'ai-yoz',   100, 40, 1.000000, now() - interval '40 days');
      insert into selleros.suhbat_xabar (user_id, seq, rol, created_at) values
        ('${ALI}', 1, 'obunachi', now() - interval '1 hour'),
        ('${ALI}', 2, 'menejer',  now() - interval '1 hour'),
        ('${VALI}', 1, 'obunachi', now() - interval '6 days'),
        ('${VALI}', 2, 'obunachi', now() - interval '8 days');
    `);
    xom = await r<Record<string, unknown>>(db, 'select public.so_kpi_xom() as r');
    ai = xom.ai as AiXom;
  }, 120_000);

  it('eski maydonlar joyida: umumiy qatorlar va yigʻindi (40 kunligi ham)', () => {
    expect(ai.qatorlar).toBe(7);
    expect(ai.xarajat_usd).toBeCloseTo(1.135, 6);
    for (const k of ['usta', 'tavsiya', 'obuna', 'tolov', 'hodisa']) expect(xom, k).toHaveProperty(k);
  });

  it('bugun — Toshkent kuni boʻyicha (kecha 23:59 kirmaydi)', () => {
    expect(ai.bugun.chaqiruv).toBe(3);
    expect(ai.bugun.usd).toBeCloseTo(0.015, 6);
  });

  it('7 kun: narxsiz chaqiruv sanaladi, lekin yigʻindiga kirmaydi', () => {
    expect(ai.kun7.chaqiruv).toBe(5);
    expect(ai.kun7.usd).toBeCloseTo(0.035, 6);
  });

  it('30 kun: chaqiruv, narx, narxsiz, mijozlar (mehmon sanalmaydi), mehmon xarajati', () => {
    expect(ai.kun30.chaqiruv).toBe(6);
    expect(ai.kun30.usd).toBeCloseTo(0.135, 6);
    expect(ai.kun30.narxsiz).toBe(1);
    expect(ai.kun30.mijoz).toBe(2);
    expect(ai.kun30.mehmon_usd).toBeCloseTo(0.003, 6);
  });

  it('maqsad boʻyicha (30 kun)', () => {
    expect(Object.keys(ai.maqsad_30kun).sort()).toEqual(['ai-tushun', 'ai-yoz', 'kartochka', 'sahifa']);
    expect(ai.maqsad_30kun['ai-yoz']!.chaqiruv).toBe(3);
    expect(ai.maqsad_30kun['ai-yoz']!.usd).toBeCloseTo(0.03, 6);
    expect(ai.maqsad_30kun.kartochka!.usd).toBeCloseTo(0.1, 6);
  });

  it('mijoz xabarlari, 7 kun — faqat mijozniki (`obunachi`)', () => {
    expect(ai.xabar_7kun).toBe(2);
  });

  it('oxirgi yozuv vaqti', () => {
    expect(ai.oxirgi).toBeTruthy();
  });

  it('jadval boʻsh — sanoqlar nol, yigʻindilar `null` (nol emas), maqsadlar boʻsh', () => {
    expect(bosh).toMatchObject({
      qatorlar: 0, xarajat_usd: null, oxirgi: null,
      bugun: { chaqiruv: 0, usd: null }, kun7: { chaqiruv: 0, usd: null },
      kun30: { chaqiruv: 0, usd: null, narxsiz: 0, mijoz: 0, mehmon_usd: null },
      maqsad_30kun: {}, xabar_7kun: 0,
    });
  });
});
