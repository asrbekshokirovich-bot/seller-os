/**
 * 0080 — AI tahlilchining asboblari: har raqam SQL dan, AI faqat parametr beradi (QOIDALAR §3).
 *
 * Bozor — `tahlil-sinov.ts` (qoʻlda hisoblab boʻladigan kichik bozor). Tekshiriladi: turkum
 * soʻzdan topiladi (oʻzbekcha qoʻshimcha bilan ham); ota turkum barglarini oladi; «eng yaxshi 20%»
 * pogʻonalari nazoratchi qaroricha; Uzumdagidek filtr va saralash; doʻkon/tovar profili; har javobda
 * maʼlumot sanasi; begona saralash nomi rad etiladi; hammasi faqat service_role.
 */

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { tahlilBazasi } from './tahlil-sinov';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type Obj = { [k: string]: Json };
const ids = (x: Json | undefined) => (x as Array<{ id: number }>).map((y) => y.id);
const birinchi = (x: Json | undefined) => (x as Obj[])[0];

describe('0080 — tahlil asboblari', () => {
  let db: PGlite;
  const j = async <T = Record<string, unknown>>(sql: string, p: unknown[] = []) =>
    (await db.query<{ j: T }>(sql, p)).rows[0]!.j;

  beforeAll(async () => {
    db = await tahlilBazasi();
    await db.query('select zumsavdo.tahlil_yangila()');
  }, 180_000);

  it('turkum_top: «kiyimlar» → Kiyim (qoʻshimcha bilan), «shim» → Shimlar yoʻli bilan', async () => {
    const k = await j<{ topildi: Array<{ id: number; yol: string }>; holat: { sana: string } }>(
      `select public.so_tahlil_turkum_top('kiyimlar') as j`);
    expect(k.topildi[0]).toMatchObject({ id: 100, yol: 'Kiyim' });
    expect(k.holat.sana).toBe('2026-10-27');
    const s = await j<{ topildi: Array<{ id: number; yol: string }> }>(`select public.so_tahlil_turkum_top('Shim') as j`);
    expect(s.topildi.map((x) => x.yol)).toContain('Kiyim › Shimlar');
    const bosh = await j<{ topildi: Array<{ id: number }> }>(`select public.so_tahlil_turkum_top('') as j`);
    expect(bosh.topildi.map((x) => x.id).sort()).toEqual([100, 200]); // boʻsh soʻz — yuqori daraja
  });

  it('bozor: Kiyim — 4 sotuvchi, 3 tasi sotgan, tushum va eng yaxshi 20% ulushi', async () => {
    const b = await j<Obj>(`select public.so_tahlil_bozor('{"turkumlar":[100]}') as j`);
    expect(b).toMatchObject({
      sotuvchilar_30kun: { jami: 4, sotgan: 3, sotmagan: 1, top20_soni: 1, tushum_mln: 27.1, top20_ulush_foiz: 88.7 }, // 24 / 27,05
      tovarlar_30kun: { jami: 5, sotgan: 4, sotilyapti_30plus: 3 },
      shu_paytgacha: { sotuvchilar: 5, sotgan_sotuvchilar: 4, tovarlar: 7 },
      qamrov: { turkumlar: [{ id: 100, yol: 'Kiyim' }], barglar: 2 },
    });
    expect(ids(b.eng_kop_sotgan_tovarlar)).toEqual([10, 11, 20]);
    // Doʻkon sahifasi manzili yoʻq — Uzumda uning eng koʻp tushum bergan tovari ochiladi (Katta: 50, 27 mln).
    expect(birinchi(b.eng_katta_dokonlar)).toMatchObject({ id: 1, nom: 'Katta', tushum_mln: 24, eng_yaxshi_tovar: 50 });
  });

  it('bozor: tovar filtri (narx ≤ 100 000) — perepis qismi yoʻq, tovar qatorlaridan', async () => {
    const b = await j<Obj>(`select public.so_tahlil_bozor('{"turkumlar":[100],"narx_max":100000}') as j`);
    expect(b).toMatchObject({ tovarlar_30kun: { jami: 4 }, qamrov: { filtr: { narx_max: 100000 } } }); // 10, 20, 30, 40
    expect(b.shu_paytgacha).toBeUndefined();
  });

  it('sotuvchilar: nisbiy pogʻonalar (nazoratchi qarori) va farqlar uchun koʻrsatkichlar', async () => {
    const s = await j<Obj>(`select public.so_tahlil_sotuvchilar('{"turkumlar":[100]}') as j`);
    // 4 doʻkon: ceil(4×0,2)=1 eng yaxshi (Katta), ceil(4×0,5)=2 gacha oʻrta (Orta), Kichik — past, Sotmagan — 0.
    expect(Object.keys(s.pogonalar_30kun as Obj).sort()).toEqual(['eng_yaxshi_20', 'orta_30', 'past', 'sotmagan']);
    expect(s).toMatchObject({
      pogonalar_30kun: {
        eng_yaxshi_20: { soni: 1, tushum_ulush_foiz: 88.7, tovar_soni_mediana: 2 },
        orta_30: { soni: 1 }, past: { soni: 1 }, sotmagan: { soni: 1, tushum_ulush_foiz: 0 },
      },
      shu_paytgacha: { sotuvchilar: 5, sotgan_sotuvchilar: 4, hech_sotmagan: 1 },
    });
    expect(birinchi(s.eng_katta_5)).toMatchObject({ id: 1, nom: 'Katta', jami_buyurtma: 9000 });
    expect((s.izoh as string[]).join(' ')).toMatch(/sabab emas/);
  });

  it('tovarlar: Uzumdagidek filtr va saralash, havola bilan', async () => {
    const t = await j<Obj>(
      `select public.so_tahlil_tovarlar('{"turkumlar":[13700],"oyiga_min":1}', 'oyiga', 2) as j`);
    expect(t.jami).toMatchObject({ mos_tovarlar: 3, sotgan: 3 }); // 10, 20, 30
    expect(ids(t.tovarlar)).toEqual([10, 20]);
    expect(birinchi(t.tovarlar)).toMatchObject({ havola: 'https://uzum.uz/uz/product/10', dokon_nomi: 'Katta', turkum_yoli: 'Kiyim › Shimlar' });
    const arzon = await j<Obj>(
      `select public.so_tahlil_tovarlar('{"turkumlar":[100]}', 'narx_arzon', 1) as j`);
    expect(ids(arzon.tovarlar)[0]).toBe(30);
    const soz = await j<Obj>(`select public.so_tahlil_tovarlar('{"soz":"krossovka"}', 'tushum', 5) as j`);
    expect(ids(soz.tovarlar)).toEqual([50]);
  });

  it('begona saralash nomi rad etiladi (jim boshqasiga oʻtmaydi)', async () => {
    await expect(db.query(`select public.so_tahlil_tovarlar('{}', 'drop table', 5)`)).rejects.toThrow(/saralash/);
    await expect(db.query(`select public.so_tahlil_turkumlar(1, 'x', 5, false)`)).rejects.toThrow(/saralash/);
  });

  it('doʻkon: nomi boʻyicha topiladi, jami buyurtma va asosiy turkumdagi oʻrni', async () => {
    const d = await j<Obj>(`select public.so_tahlil_dokon(null, 'katta') as j`);
    expect(d).toMatchObject({
      dokon: { id: 1, nom: 'Katta', jami_buyurtma: 9000, tushum_mln: 51, eng_yaxshi_tovar: 50 },
      asosiy_turkumdagi_orni: { turkum: 14237, orin: 1 },
    });
    expect(ids(d.eng_kop_sotgan)[0]).toBe(50);
    const yoq = await j<Obj>(`select public.so_tahlil_dokon(999, null) as j`);
    expect(yoq.topilmadi).toBe(true);
  });

  it('tovar: profil, turkum ichidagi oʻrni, raqobatchilar (±30% narx)', async () => {
    const t = await j<Obj>(`select public.so_tahlil_tovar(20) as j`);
    expect(t).toMatchObject({ tovar: { id: 20, oyiga: 30 }, turkum_ichida: { tovarlar: 4, oyiga_boyicha_orin: 2 } });
    expect(ids(t.raqobatchilar)).toEqual([10, 40]); // 70 000–130 000
    const yoq = await j<Obj>(`select public.so_tahlil_tovar(60) as j`);
    expect(yoq).toMatchObject({ topilmadi: true, perepisda: true });
  });

  it('turkumlar reytingi: ildiz bolalari tushum boʻyicha; barglar rejimi', async () => {
    const r = await j<Obj>(`select public.so_tahlil_turkumlar(null, 'tushum', 10, false) as j`);
    expect(ids(r.turkumlar)).toEqual([100, 200]); // 27,05 mln va 27 mln
    const b = await j<Obj>(`select public.so_tahlil_turkumlar(100, 'sotuvchilar', 10, true) as j`);
    expect(ids(b.turkumlar)).toEqual([13700, 13701]);
  });

  it('faqat service_role chaqira oladi', async () => {
    const r = await db.query<{ f: string; anon: boolean; servis: boolean }>(
      `select p.oid::regprocedure::text as f,
              has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute') as anon,
              has_function_privilege('service_role', p.oid, 'execute') as servis
         from pg_proc p where p.proname like 'so_tahlil_%'`);
    expect(r.rows.length).toBe(7);
    expect(r.rows.filter((x) => x.anon)).toEqual([]);
    expect(r.rows.every((x) => x.servis)).toBe(true);
  });
});
