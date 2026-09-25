/**
 * 5-qadam kod harakati — `suhbatKodHarakatlari(...).xitoy(holat)`.
 *
 * Baza soxta (`rpc`), provayder va CBU soxta (`fetch`). Fikstura
 * provayder HUJJATIDAGI namuna; kurs — 2026-09-25 jonli oʻlchov.
 *
 * Eng muhim tekshiruvlar:
 *   - kalit yoʻq / rasm yoʻq / provayder xatosi / limit — hammasi
 *     "qidirilmadi" + SABAB, "topilmadi" emas;
 *   - kesh bor boʻlsa provayder chaqirilmaydi va limit oshmaydi;
 *   - narxSom va chegaradaMi faqat kurs bilan; kurs boʻlmasa null;
 *   - kalit natijaga sizmaydi.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { XitoyNatijasi, YolHolati } from '@selleros/shared';
import { suhbatKodHarakatlari } from '../src/suhbat-kod.js';

const F = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/tmapi-1688-rasm.json'), 'utf8')) as {
  muvaffaqiyat: unknown; ogirish: unknown; balans: unknown;
};
const CBU = [{ Ccy: 'CNY', Nominal: '1', Rate: '1762.49', Date: '25.09.2026' }];
const RASM_100 = 'https://images.uzum.uz/aaa/t_product_540_high.jpg';

function holatYasa(q: Partial<YolHolati['javoblar']> = {}): YolHolati {
  return {
    javoblar: {
      byudjet: 10_000_000, uzum_dokoni: 'yoq', yonalish: 11, tovarlar: [100, 200],
      'miqdor:100': 30, 'miqdor:200': 10, marja: 30, xitoy_tasdiq: 'ha', ...q,
    },
    natijalar: {
      tovarlar: { royxat: [
        { nomzod: { productId: 100, title: 'Quloqchin A', narxSom: 95_000, rasmUrl: RASM_100 }, miqdor: null },
        { nomzod: { productId: 200, title: 'Quloqchin B', narxSom: 80_000, rasmUrl: null }, miqdor: null },
      ] },
      tannarx: { qatorlar: [
        { productId: 100, chegaraSom: 60_000 },
        { productId: 200, chegaraSom: null },
      ] },
    },
  };
}

/** Soxta baza: obuna yoʻq (bepul), limit sanog'i, kesh xotirada. */
function soxtaBaza(boshlangichLimit = 0, kesh: Record<string, unknown[]> = {}) {
  let soni = boshlangichLimit;
  const yozilgan: Array<{ hash: string; natijalar: unknown[] }> = [];
  const rpc = async <T>(nom: string, arg: unknown): Promise<T | null> => {
    const a = arg as Record<string, unknown>;
    if (nom === 'so_obuna') return { obuna: null } as T;
    if (nom === 'so_xitoy_limit') { if (a.p_oshir === true) soni += 1; return { soni } as T; }
    if (nom === 'so_xitoy_kesh_ol') {
      const k = kesh[String(a.p_rasm_hash)];
      return (k ? { topildi: true, natijalar: k, manba: '1688' } : { topildi: false }) as T;
    }
    if (nom === 'so_xitoy_kesh_yoz') { yozilgan.push({ hash: String(a.p_rasm_hash), natijalar: a.p_natijalar as unknown[] }); return { id: 1 } as T; }
    return null;
  };
  return { rpc, yozilgan, soni: () => soni };
}

function soxtaFetch(javoblar: Record<string, unknown>) {
  const urllar: string[] = [];
  const f = (async (kirish: string | URL | Request) => {
    const url = String(kirish);
    urllar.push(url);
    const k = Object.keys(javoblar).find((x) => url.includes(x));
    if (!k) throw new Error(`kutilmagan URL: ${url}`);
    const j = javoblar[k];
    if (typeof j === 'function') (j as () => never)();
    return new Response(JSON.stringify(j), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { fetch: f, urllar };
}

const HAMMASI = { 'cbu.uz': CBU, 'convert_url': F.ogirish, 'search/image?': F.muvaffaqiyat };

function kod(b: ReturnType<typeof soxtaBaza>, f: typeof fetch, kalit: string | null = 'KALIT') {
  return suhbatKodHarakatlari(b.rpc, () => ({ bayroqlar: [], baholanmadi: [] }), () => 9,
    { kalit, fetch: f, token: 'tok' });
}

describe('xitoy kod harakati', () => {
  it('kalit yoʻq — olchov_yoq, har tovar "qidirilmadi" sabab bilan, tarmoqqa chiqilmaydi', async () => {
    const b = soxtaBaza(); const s = soxtaFetch(HAMMASI);
    const n = await kod(b, s.fetch, null).xitoy(holatYasa()) as XitoyNatijasi;
    expect(n.olchov_yoq).toBe(true);
    expect(n.qatorlar.map((q) => q.holat)).toEqual(['qidirilmadi', 'qidirilmadi']);
    expect(n.qatorlar[0]!.sabab).toMatch(/kalit/);
    expect(s.urllar).toEqual([]);
  });

  it('rasmli tovar: oʻgirish + qidiruv, soʻmga oʻgirish, chegara belgisi, kesh va sanoq', async () => {
    const b = soxtaBaza(); const s = soxtaFetch(HAMMASI);
    const n = await kod(b, s.fetch).xitoy(holatYasa()) as XitoyNatijasi;
    expect(n.olchov_yoq).toBe(false);
    expect(n.kurs).toEqual({ somPerYuan: 1762.49, sana: '25.09.2026', manba: 'CBU' });

    const q100 = n.qatorlar.find((q) => q.productId === 100)!;
    expect(q100.holat).toBe('topildi');
    expect(q100.chegaraSom).toBe(60_000);
    expect(q100.jami).toBe(680);
    expect(q100.takliflar.length).toBe(2);
    // 27 ¥ → 47 587 soʻm (chegarada), 80 ¥ → 140 999 soʻm (yuqori). Chegarada boʻlgani birinchi.
    expect(q100.takliflar[0]).toMatchObject({ narxYuan: 27, narxSom: 47_587, chegaradaMi: true });
    expect(q100.takliflar[1]).toMatchObject({ narxYuan: 80, narxSom: 140_999, chegaradaMi: false });

    const q200 = n.qatorlar.find((q) => q.productId === 200)!;
    expect(q200.holat).toBe('qidirilmadi');
    expect(q200.sabab).toMatch(/rasm/);

    expect(b.yozilgan.length).toBe(1);
    expect(b.yozilgan[0]!.hash).toBe(RASM_100);
    expect(b.soni()).toBe(1);
    expect(JSON.stringify(n)).not.toContain('KALIT');
  });

  it('kesh bor — provayder chaqirilmaydi, sanoq oshmaydi, chegara baribir hisoblanadi', async () => {
    const keshdagi = [{ sourceId: '1', title: 'Keshdagi', narxYuan: 10, rasmUrl: 'https://cbu01.alicdn.com/a.jpg', moq: 2, reyting: null, manba: '1688', manzil: null, sotilgan: 5, buyurtmalar: null, zavod: null, sotuvchi: null, joy: null, dokonYili: null, takrorXaridFoizi: null, reklama: null }];
    const b = soxtaBaza(0, { [RASM_100]: keshdagi }); const s = soxtaFetch({ 'cbu.uz': CBU });
    const n = await kod(b, s.fetch).xitoy(holatYasa()) as XitoyNatijasi;
    const q = n.qatorlar.find((x) => x.productId === 100)!;
    expect(q.holat).toBe('topildi');
    expect(q.takliflar[0]).toMatchObject({ narxSom: 17_625, chegaradaMi: true });
    expect(s.urllar.some((u) => u.includes('tmapi'))).toBe(false);
    expect(b.soni()).toBe(0);
    expect(b.yozilgan).toEqual([]);
  });

  it('provayder 439 — "qidirilmadi" + sabab, kesh yozilmaydi, sanoq oshmaydi', async () => {
    const b = soxtaBaza(); const s = soxtaFetch({ 'cbu.uz': CBU, 'convert_url': F.ogirish, 'search/image?': F.balans });
    const n = await kod(b, s.fetch).xitoy(holatYasa()) as XitoyNatijasi;
    const q = n.qatorlar.find((x) => x.productId === 100)!;
    expect(q.holat).toBe('qidirilmadi');
    expect(q.sabab).toMatch(/provayder.*(balans|obuna)/);
    expect(q.takliflar).toEqual([]);
    expect(b.yozilgan).toEqual([]);
    expect(b.soni()).toBe(0);
    expect(n.olchov_yoq).toBe(true);
  });

  it('kunlik limit tugagan (bepul: 3) — provayder chaqirilmaydi, sabab limit', async () => {
    const b = soxtaBaza(3); const s = soxtaFetch(HAMMASI);
    const n = await kod(b, s.fetch).xitoy(holatYasa()) as XitoyNatijasi;
    const q = n.qatorlar.find((x) => x.productId === 100)!;
    expect(q.holat).toBe('qidirilmadi');
    expect(q.sabab).toMatch(/limit/);
    expect(s.urllar.some((u) => u.includes('tmapi'))).toBe(false);
  });

  it('kurs olinmasa — narxSom va chegaradaMi null, natija baribir "topildi"', async () => {
    const b = soxtaBaza(); const s = soxtaFetch({ 'cbu.uz': () => { throw new Error('ENOTFOUND'); }, 'convert_url': F.ogirish, 'search/image?': F.muvaffaqiyat });
    const n = await kod(b, s.fetch).xitoy(holatYasa()) as XitoyNatijasi;
    expect(n.kurs).toBeNull();
    const q = n.qatorlar.find((x) => x.productId === 100)!;
    expect(q.holat).toBe('topildi');
    expect(q.takliflar[0]).toMatchObject({ narxYuan: 27, narxSom: null, chegaradaMi: null });
  });

  it('obunachi yuborgan rasm manzili ishlatiladi; `javascript:` esa emas', async () => {
    const b = soxtaBaza(); const s = soxtaFetch(HAMMASI);
    const n = await kod(b, s.fetch).xitoy(holatYasa({ 'rasm:200': 'https://images.uzum.uz/bbb/original.jpg' })) as XitoyNatijasi;
    expect(n.qatorlar.find((x) => x.productId === 200)!.holat).toBe('topildi');
    expect(b.yozilgan.map((y) => y.hash)).toContain('https://images.uzum.uz/bbb/original.jpg');

    const b2 = soxtaBaza(); const s2 = soxtaFetch(HAMMASI);
    const n2 = await kod(b2, s2.fetch).xitoy(holatYasa({ 'rasm:200': 'javascript:alert(1)' })) as XitoyNatijasi;
    expect(n2.qatorlar.find((x) => x.productId === 200)!.holat).toBe('qidirilmadi');
  });

  it('0 ta natija — "topilmadi", bu javob: kesh yoziladi, sanoq oshadi', async () => {
    const b = soxtaBaza(); const s = soxtaFetch({ 'cbu.uz': CBU, 'convert_url': F.ogirish, 'search/image?': { code: 200, data: { total_count: 0, items: [] } } });
    const n = await kod(b, s.fetch).xitoy(holatYasa()) as XitoyNatijasi;
    const q = n.qatorlar.find((x) => x.productId === 100)!;
    expect(q.holat).toBe('topilmadi');
    expect(q.jami).toBe(0);
    expect(b.yozilgan.length).toBe(1);
    expect(b.soni()).toBe(1);
  });
});
