/**
 * 0078 — «tovar-sotuvi-v1» SQL nusxasi TS asl nusxasi bilan BIR XILMI (PGlite).
 *
 * NEGA BU TEST BOR. Formula endi ikki joyda: TS (`sotuvBahosi` — kartochka, pasport,
 * bozor paneli) va SQL (`zumsavdo.tovar_baho` — AI tahlilchining tayyor jadvali).
 * Ikkisi ajralsa AI bitta tovar uchun kartochkadagidan boshqa raqam aytadi.
 * Kirish — QOʻLDA YOZILMAGAN: `fixtures/tovar-baho-namuna.json` — jonli
 * `zumsavdo.tovar_30kun` dan 1 200 qator (2026-10-27 oynasi, 05.11 da qatlamlab:
 * harakatsiz, kam kun, tugagan, sakrash, katta belgi, kichik belgi, oddiy) —
 * QOIDALAR §8: darvoza haqiqiy oʻlchov bilan.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { sotuvBahosi, tovar30KunOqi, type Tovar30Kun } from '../../packages/shared/src/tovar-sotuvi';

const M78 = readFileSync(join(import.meta.dirname, '..', 'migrations', '0078_zumsavdo_tovar_baho.sql'), 'utf8');
const NAMUNA = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', '..', 'packages', 'shared', 'test', 'fixtures', 'tovar-baho-namuna.json'), 'utf8'),
) as Array<Record<string, unknown> & { qatlam: string }>;

const SXEMA = `
  create role anon; create role authenticated; create role service_role;
  create schema zumsavdo;
`;

interface SqlBaho {
  id: number; oyiga: number | null; holat: string; ishonch: string | null;
  malum_kun: number; xom: number; kesildi: number; sharh_osish: number | null; belgi_oylik: number | null;
  s7: number | null; k7: number | null; s23: number | null; k23: number | null;
}

/** Sunʼiy chekka holatlar (jonli namunada uchramaydiganlar). */
const CHEKKA: Array<Record<string, unknown>> = [
  // Oʻlchanmagan.
  { product_id: 1, sana: '2026-10-27', olchangan_kun: 0, tugagan_kun: 0, tugaganiga: 0, sotildi: null, olchangan_mask: null },
  // Juft sondagi maʼlum kun — p75 = s[floor(0.75×5)] = s[3] (percentile_disc boshqa qiymat berardi).
  {
    product_id: 2, sana: '2026-10-27', olchangan_kun: 6, tugagan_kun: 0, tugaganiga: 0,
    sotildi: [...Array(24).fill(null), 1, 2, 3, 40, 50, 60], olchangan_mask: 0b111111 << 24,
  },
  // 8 kun, bitta katta kun — chegara 5×p75 = 10 (p75 = 2): 300 kesiladi.
  {
    product_id: 3, sana: '2026-10-27', olchangan_kun: 8, tugagan_kun: 0, tugaganiga: 0, qoldiq_oxirgi: 5,
    sotildi: [...Array(22).fill(null), 1, 2, 2, 1, 300, 2, 1, 2], olchangan_mask: 0xff << 22, belgi: 0, belgi_max: 0,
    sharh_bosh: 10, sharh: 10,
  },
  // Manfiy kamayish (qoldiq oshgan) — 0 deb olinadi.
  {
    product_id: 4, sana: '2026-10-27', olchangan_kun: 10, tugagan_kun: 0, tugaganiga: 0, qoldiq_oxirgi: 9,
    sotildi: [...Array(20).fill(null), -5, 3, 3, 3, 3, -1, 3, 3, 3, 3], olchangan_mask: 0x3ff << 20,
  },
];

describe('0078 — tovar_baho: SQL = TS (tovar-sotuvi-v1)', () => {
  const db = new PGlite();
  let sql: Map<number, SqlBaho>;
  const qatorlar: Tovar30Kun[] = tovar30KunOqi([...NAMUNA, ...CHEKKA]);

  beforeAll(async () => {
    await db.exec(SXEMA);
    await db.exec(M78);
    await db.exec(M78); // qayta qoʻllash xavfsiz
    const r = await db.query<SqlBaho>(
      `select (x->>'product_id')::bigint as id, (b).*
         from jsonb_array_elements($1::jsonb) x,
         lateral (select zumsavdo.tovar_baho(
           (x->>'olchangan_kun')::int, (x->>'qoldiq_oxirgi')::int, (x->>'tugaganiga')::int,
           (select array_agg(e::smallint order by o) from jsonb_array_elements_text(
              case when jsonb_typeof(x->'sotildi') = 'array' then x->'sotildi' end) with ordinality as t(e, o)),
           (x->>'olchangan_mask')::int, (x->>'belgi')::int, (x->>'belgi_max')::int,
           (x->>'sharh_bosh')::int, (x->>'sharh')::int) as b) z`,
      [JSON.stringify([...NAMUNA, ...CHEKKA])],
    );
    sql = new Map(r.rows.map((x) => [Number(x.id), x]));
  }, 180_000);

  it('namuna toʻliq oʻqildi va har qatlam bor', () => {
    expect(qatorlar.length).toBe(NAMUNA.length + CHEKKA.length);
    expect(sql.size).toBe(qatorlar.length);
    const qatlamlar = new Set(NAMUNA.map((x) => x.qatlam));
    expect([...qatlamlar].sort()).toEqual(['harakatsiz', 'kam_kun', 'katta_belgi', 'kichik_belgi', 'oddiy', 'sakrash', 'tugagan']);
  });

  it('har qator: oyiga, holat, ishonch, maʼlum kun, xom, kesildi — bir xil', () => {
    const farqlar: string[] = [];
    for (const t of qatorlar) {
      const ts = sotuvBahosi(t, t.product_id);
      const s = sql.get(t.product_id)!;
      const kutilgan = { oyiga: ts.oyiga, holat: ts.holat, ishonch: ts.ishonch, malum_kun: ts.malumKun, xom: ts.xom, kesildi: ts.kesildi };
      const olingan = { oyiga: s.oyiga, holat: s.holat, ishonch: s.ishonch, malum_kun: s.malum_kun, xom: s.xom, kesildi: s.kesildi };
      if (JSON.stringify(kutilgan) !== JSON.stringify(olingan)) {
        farqlar.push(`${t.product_id}: TS ${JSON.stringify(kutilgan)} ≠ SQL ${JSON.stringify(olingan)}`);
      }
    }
    expect(farqlar.slice(0, 10)).toEqual([]);
  });

  it('sharh oʻsishi va oylik belgi — bir xil', () => {
    for (const t of qatorlar) {
      const ts = sotuvBahosi(t, t.product_id);
      const s = sql.get(t.product_id)!;
      if (ts.holat === 'olchanmagan') continue;
      expect([s.sharh_osish, s.belgi_oylik]).toEqual([ts.sharhOsish, ts.belgiOylik]);
    }
  });

  it('trend: oxirgi 7 va oldingi 23 kundagi SANALGAN sotuv — TS kunlik roʻyxati bilan bir xil', () => {
    for (const t of qatorlar) {
      const ts = sotuvBahosi(t, t.product_id);
      const s = sql.get(t.product_id)!;
      if (!ts.kunlar.length) {
        expect([s.k7, s.k23]).toEqual([null, null]);
        continue;
      }
      const oxirgi = ts.kunlar.slice(23).filter((k) => k.sanaldi !== null);
      const oldingi = ts.kunlar.slice(0, 23).filter((k) => k.sanaldi !== null);
      expect([s.s7, s.k7, s.s23, s.k23]).toEqual([
        oxirgi.reduce((a, k) => a + k.sanaldi!, 0), oxirgi.length,
        oldingi.reduce((a, k) => a + k.sanaldi!, 0), oldingi.length,
      ]);
    }
  });

  it('qamrov: har holat va har ishonch darajasi kamida bir marta uchradi (oʻlik shart yoʻq)', () => {
    const holatlar = new Set([...sql.values()].map((x) => x.holat));
    for (const h of ['sotilyapti', 'sekin', 'sotilmadi', 'tugagan', 'ziddiyat', 'kam', 'olchanmagan']) {
      expect(holatlar, h).toContain(h);
    }
    const ishonchlar = new Set([...sql.values()].map((x) => x.ishonch));
    for (const i of ['yuqori', 'orta', 'past', null]) expect(ishonchlar, String(i)).toContain(i);
    expect([...sql.values()].some((x) => x.kesildi > 0)).toBe(true);
  });

  it('chekka holatlar: p75 juft n da, katta kun kesiladi, manfiy kamayish 0', () => {
    expect(sql.get(1)).toMatchObject({ holat: 'olchanmagan', oyiga: null, ishonch: null, malum_kun: 0 });
    expect(sql.get(2)).toMatchObject({ holat: 'kam', oyiga: null, malum_kun: 6 });
    expect(sql.get(3)).toMatchObject({ kesildi: 300, xom: 311, malum_kun: 8, oyiga: Math.round((11 * 30) / 8) });
    expect(sql.get(4)).toMatchObject({ xom: 24, kesildi: 0, malum_kun: 10, oyiga: 72 });
  });
});
