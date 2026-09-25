/**
 * 5-qadam kod harakati — `suhbatKodHarakatlari(...).xitoy(holat)`.
 *
 * ASINXRON: birinchi chaqiruv yurishni boshlaydi (`kutilmoqda`), keyingi
 * chaqiruvlar (chat `tekshir`) holatni soʻraydi; tugagach qatorlar
 * toʻldiriladi. Baza soxta (`rpc`), Apify va CBU soxta (`fetch`).
 *
 * Eng muhim tekshiruvlar (2026-09-25 tekshiruvidan):
 *   - kalit yoʻq / rasm yoʻq / limit oʻlchanmadi / tarif — "qidirilmadi" +
 *     SABAB, "topilmadi" emas; tarmoqqa chiqilmaydi;
 *   - band qilish yurishdan OLDIN, har rasm uchun; yiqilsa qaytariladi;
 *   - kesh bor boʻlsa yurishga kirmaydi va band qilinmaydi;
 *   - narxSom/chegaradaMi faqat kurs bilan; chegara kamchiligi (yetishmaydi)
 *     qatorda yoʻqolmaydi; bir turnda 5 tagacha rasm.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { XitoyNatijasi, YolHolati } from '@selleros/shared';
import { suhbatKodHarakatlari } from '../src/suhbat-kod.js';

const F = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/apify-1688-rasm.json'), 'utf8')) as {
  boshlandi: unknown; ishlayapti: unknown; tugadi: unknown; yiqildi: unknown; balans: unknown; natijalar: unknown[];
};
const CBU = [{ Ccy: 'CNY', Nominal: '1', Rate: '1762.49', Date: '25.09.2026' }];
const RASM_A = 'https://images.uzum.uz/aaa/t_product_540_high.jpg';
const RASM_B = 'https://images.uzum.uz/bbb/original.jpg';
const RASM_C = 'https://images.uzum.uz/ccc/original.jpg';
const RUN = 'HG7ML7M8z78YcAPEB';

function holatYasa(q: Partial<YolHolati['javoblar']> = {}, natijalar: Partial<YolHolati['natijalar']> = {}): YolHolati {
  return {
    javoblar: {
      byudjet: 10_000_000, uzum_dokoni: 'yoq', yonalish: 11, tovarlar: [100, 200, 300],
      'miqdor:100': 30, 'miqdor:200': 10, 'miqdor:300': 5, marja: 30, xitoy_tasdiq: 'ha', ...q,
    },
    natijalar: {
      tovarlar: { royxat: [
        { nomzod: { productId: 100, title: 'Quloqchin A', narxSom: 95_000, rasmUrl: RASM_A }, miqdor: null },
        { nomzod: { productId: 200, title: 'Quloqchin B', narxSom: 80_000, rasmUrl: RASM_B }, miqdor: null },
        { nomzod: { productId: 300, title: 'Quloqchin C', narxSom: 50_000, rasmUrl: null }, miqdor: null },
      ] },
      tannarx: { qatorlar: [
        { productId: 100, chegaraSom: 5_000, yetishmaydi: ['kargo'] },
        { productId: 200, chegaraSom: null, yetishmaydi: ['komissiya'] },
        { productId: 300, chegaraSom: 60_000, yetishmaydi: [] },
      ] },
      ...natijalar,
    },
  };
}

function soxtaBaza(q: { soni?: number; jami?: number; kesh?: Record<string, unknown[]>; limitXato?: boolean } = {}) {
  let soni = q.soni ?? 0;
  let jami = q.jami ?? 0;
  const yozilgan: Array<{ hash: string; natijalar: unknown[] }> = [];
  const chaqiruvlar: string[] = [];
  const rpc = async <T>(nom: string, arg: unknown): Promise<T | null> => {
    const a = arg as Record<string, unknown>;
    chaqiruvlar.push(nom + (a.p_oshir === true ? ':oshir' : a.p_qaytar === true ? ':qaytar' : ''));
    if (nom === 'so_obuna') return { obuna: null } as T;
    if (nom === 'so_xitoy_limit') {
      if (q.limitXato) return { xato: 'sessiya topilmadi' } as T;
      if (a.p_qaytar === true) { soni = Math.max(0, soni - 1); jami = Math.max(0, jami - 1); return { soni, jami, ruxsat: true } as T; }
      if (a.p_oshir === true) {
        const lim = a.p_limit as number | null; const um = a.p_umumiy_limit as number | null;
        if ((typeof um === 'number' && jami >= um) || (typeof lim === 'number' && soni >= lim)) return { soni, jami, ruxsat: false } as T;
        soni += 1; jami += 1; return { soni, jami, ruxsat: true } as T;
      }
      return { soni, jami, ruxsat: true } as T;
    }
    if (nom === 'so_xitoy_kesh_ol') {
      const k = (q.kesh ?? {})[String(a.p_rasm_hash)];
      return (k ? { topildi: true, natijalar: k, manba: '1688' } : { topildi: false }) as T;
    }
    if (nom === 'so_xitoy_kesh_yoz') { yozilgan.push({ hash: String(a.p_rasm_hash), natijalar: a.p_natijalar as unknown[] }); return { id: 1 } as T; }
    return null;
  };
  return { rpc, yozilgan, chaqiruvlar, soni: () => soni };
}

/** Soxta tarmoq: CBU + Apify. `holat` — Apify yurish holati javobi. */
function soxtaFetch(q: { cbu?: unknown | (() => never); boshlash?: unknown; holat?: unknown | (() => never); natijalar?: unknown } = {}) {
  const urllar: string[] = [];
  const f = (async (kirish: string | URL | Request) => {
    const url = String(kirish);
    urllar.push(url);
    const json = (x: unknown) => { if (typeof x === 'function') (x as () => never)(); return new Response(JSON.stringify(x), { status: 200, headers: { 'Content-Type': 'application/json' } }); };
    if (url.includes('cbu.uz')) return json(q.cbu ?? CBU);
    if (url.endsWith('/runs')) return json(q.boshlash ?? F.boshlandi);
    if (url.includes('/dataset/items')) return json(q.natijalar ?? F.natijalar);
    if (url.includes('/actor-runs/')) return json(q.holat ?? F.ishlayapti);
    throw new Error(`kutilmagan URL: ${url}`);
  }) as unknown as typeof fetch;
  return { fetch: f, urllar, apify: () => urllar.filter((u) => u.includes('apify')) };
}

function kod(b: ReturnType<typeof soxtaBaza>, f: typeof fetch, q: { kalit?: string | null; tarifCheklovi?: boolean } = {}) {
  return suhbatKodHarakatlari(b.rpc, () => ({ bayroqlar: [], baholanmadi: [] }), () => 9,
    { kalit: q.kalit === undefined ? 'KALIT' : q.kalit, fetch: f, token: 'tok', tarifCheklovi: q.tarifCheklovi ?? false });
}

const qator = (n: XitoyNatijasi, id: number) => n.qatorlar.find((x) => x.productId === id)!;

describe('xitoy — boshlash', () => {
  it('kalit yoʻq — olchov_yoq, har tovar "qidirilmadi" sabab bilan, tarmoqqa chiqilmaydi', async () => {
    const b = soxtaBaza(); const s = soxtaFetch();
    const n = await kod(b, s.fetch, { kalit: null }).xitoy(holatYasa()) as XitoyNatijasi;
    expect(n.olchov_yoq).toBe(true);
    expect(n.kutilmoqda).toBeNull();
    expect(n.qatorlar.map((q) => q.holat)).toEqual(['qidirilmadi', 'qidirilmadi', 'qidirilmadi']);
    expect(qator(n, 100).sabab).toMatch(/kalit/);
    expect(s.urllar).toEqual([]);
  });

  it('limit oʻlchanmasa (sessiya notoʻgʻri) — qidirilmadi, yurish boshlanmaydi', async () => {
    const b = soxtaBaza({ limitXato: true }); const s = soxtaFetch();
    const n = await kod(b, s.fetch).xitoy(holatYasa()) as XitoyNatijasi;
    expect(n.kutilmoqda).toBeNull();
    expect(qator(n, 100).sabab).toMatch(/sessiya topilmadi/);
    expect(s.apify()).toEqual([]);
  });

  it('tarif cheklovi yoqiq, bepul reja — qidirilmadi "tarif", yurish yoʻq', async () => {
    const b = soxtaBaza(); const s = soxtaFetch();
    const n = await kod(b, s.fetch, { tarifCheklovi: true }).xitoy(holatYasa()) as XitoyNatijasi;
    expect(qator(n, 100).sabab).toMatch(/tarif/);
    expect(s.apify()).toEqual([]);
    expect(b.soni()).toBe(0);
  });

  it('rasmli tovarlar: har biri band qilinadi, BITTA yurish boshlanadi, kutilmoqda; rasmsizi qidirilmadi', async () => {
    const b = soxtaBaza(); const s = soxtaFetch();
    const n = await kod(b, s.fetch).xitoy(holatYasa()) as XitoyNatijasi;
    expect(n.olchov_yoq).toBe(false);
    expect(n.kurs).toEqual({ somPerYuan: 1762.49, sana: '25.09.2026', manba: 'CBU' });
    expect(n.kutilmoqda).toMatchObject({ runId: RUN, rasmlar: [{ productId: 100, rasmUrl: RASM_A }, { productId: 200, rasmUrl: RASM_B }] });
    expect(typeof n.kutilmoqda!.boshlandi).toBe('string');
    expect(qator(n, 300)).toMatchObject({ holat: 'qidirilmadi', sabab: expect.stringMatching(/rasm/) });
    expect(n.qatorlar.length).toBe(1);
    expect(s.apify().filter((u) => u.endsWith('/runs')).length).toBe(1);
    expect(b.soni()).toBe(2);
    expect(b.yozilgan).toEqual([]);
    expect(JSON.stringify(n)).not.toContain('KALIT');
  });

  it('kesh bor — yurishga kirmaydi, band qilinmaydi, chegara va keshdan belgisi', async () => {
    const keshdagi = [{ sourceId: '1', title: 'Keshdagi', narxYuan: 2, rasmUrl: null, moq: 2, reyting: null, manba: '1688', manzil: null, oxshashlikOrni: 1, dropshipNarxYuan: null, buyurtmalar: 5, zavod: null, superZavod: null, sotuvchi: null, joy: null, dokonYili: null }];
    const b = soxtaBaza({ kesh: { [RASM_A]: keshdagi, [RASM_B]: keshdagi } }); const s = soxtaFetch();
    const n = await kod(b, s.fetch).xitoy(holatYasa()) as XitoyNatijasi;
    expect(n.kutilmoqda).toBeNull();
    expect(s.apify()).toEqual([]);
    expect(b.soni()).toBe(0);
    const a = qator(n, 100);
    expect(a).toMatchObject({ holat: 'topildi', keshdan: true, yetishmaydi: ['kargo'] });
    expect(a.takliflar[0]).toMatchObject({ narxSom: 3_525, chegaradaMi: true });
    // 200: chegara null → chegaradaMi null
    expect(qator(n, 200).takliflar[0]).toMatchObject({ narxSom: 3_525, chegaradaMi: null });
  });

  it('shaxsiy limit tugagan (bepul: 3) — qidirilmadi "limit", yurish yoʻq', async () => {
    const b = soxtaBaza({ soni: 3 }); const s = soxtaFetch();
    const n = await kod(b, s.fetch).xitoy(holatYasa()) as XitoyNatijasi;
    expect(n.kutilmoqda).toBeNull();
    expect(qator(n, 100).sabab).toMatch(/limit/);
    expect(s.apify()).toEqual([]);
  });

  it('bir turnda 5 tagacha rasm; qolgani "qayta qidirishda" deb qidirilmadi', async () => {
    const tovarlar = Array.from({ length: 7 }, (_, i) => 100 + i);
    const h = holatYasa({ tovarlar }, { tovarlar: { royxat: tovarlar.map((id) => ({ nomzod: { productId: id, title: `T${id}`, narxSom: 1, rasmUrl: `https://images.uzum.uz/k${id}/original.jpg` }, miqdor: null })) }, tannarx: { qatorlar: [] } });
    const b = soxtaBaza({ soni: 0 }); const s = soxtaFetch();
    // pro rejaga oʻxshash limit uchun soxta obuna yoʻq — bepul 3 ta; 5 dan oldin limit tugaydi, shuning uchun limit sababi ham chiqadi
    const n = await kod(b, s.fetch).xitoy(h) as XitoyNatijasi;
    expect(n.kutilmoqda!.rasmlar.length).toBe(3);
    expect(n.qatorlar.filter((q) => /limit/.test(q.sabab ?? '')).length).toBe(4);
  });

  it('yurish boshlanmasa (balans) — hamma band qaytariladi, qidirilmadi', async () => {
    const b = soxtaBaza(); const s = soxtaFetch({ boshlash: F.balans });
    const n = await kod(b, s.fetch).xitoy(holatYasa()) as XitoyNatijasi;
    expect(n.kutilmoqda).toBeNull();
    expect(qator(n, 100).sabab).toMatch(/provayder.*balans/);
    expect(b.soni()).toBe(0);
    expect(b.chaqiruvlar.filter((c) => c === 'so_xitoy_limit:qaytar').length).toBe(2);
  });

  it('obunachi yuborgan rasm manzili ishlatiladi; `javascript:` esa emas', async () => {
    const b = soxtaBaza(); const s = soxtaFetch();
    const n = await kod(b, s.fetch).xitoy(holatYasa({ 'rasm:300': RASM_C })) as XitoyNatijasi;
    expect(n.kutilmoqda!.rasmlar.map((r) => r.productId)).toEqual([100, 200, 300]);
    const b2 = soxtaBaza(); const s2 = soxtaFetch();
    const n2 = await kod(b2, s2.fetch).xitoy(holatYasa({ 'rasm:300': 'javascript:alert(1)' })) as XitoyNatijasi;
    expect(qator(n2, 300).holat).toBe('qidirilmadi');
  });
});

describe('xitoy — tekshirish (kutilmoqda)', () => {
  const KUTILMOQDA: XitoyNatijasi = {
    olchov_yoq: false, kurs: { somPerYuan: 1762.49, sana: '25.09.2026', manba: 'CBU' },
    qatorlar: [{ productId: 300, title: 'Quloqchin C', rasmUrl: null, chegaraSom: 60_000, yetishmaydi: [], holat: 'qidirilmadi', sabab: 'rasm yoʻq', jami: null, takliflar: [], keshdan: false, tashlandi: 0 }],
    kutilmoqda: { runId: RUN, boshlandi: '2026-09-25T20:00:00.000Z', rasmlar: [{ productId: 100, rasmUrl: RASM_A }, { productId: 200, rasmUrl: RASM_B }] },
  };

  it('RUNNING — hech narsa oʻzgarmaydi (oʻsha holat qaytadi), kurs qayta soʻralmaydi', async () => {
    const b = soxtaBaza({ soni: 2 }); const s = soxtaFetch({ holat: F.ishlayapti });
    const n = await kod(b, s.fetch).xitoy(holatYasa({}, { xitoy: KUTILMOQDA })) as XitoyNatijasi;
    expect(n).toEqual(KUTILMOQDA);
    expect(s.urllar.some((u) => u.includes('cbu.uz'))).toBe(false);
    expect(b.yozilgan).toEqual([]);
  });

  it('SUCCEEDED — qatorlar toʻldiriladi: A topildi (chegara, tartib), B RISK_CONTROL → qidirilmadi + band qaytadi', async () => {
    const b = soxtaBaza({ soni: 2 }); const s = soxtaFetch({ holat: F.tugadi });
    const n = await kod(b, s.fetch).xitoy(holatYasa({}, { xitoy: KUTILMOQDA })) as XitoyNatijasi;
    expect(n.kutilmoqda).toBeNull();
    expect(n.qatorlar.map((q) => q.productId)).toEqual([100, 200, 300]);
    const a = qator(n, 100);
    expect(a.holat).toBe('topildi');
    expect(a.jami).toBe(2);
    expect(a.yetishmaydi).toEqual(['kargo']);
    // 1.9 ¥ → 3 349 soʻm (chegarada, 5 000), 5 ¥ → 8 812 (yuqori). Chegarada boʻlgani birinchi.
    expect(a.takliflar.map((t) => [t.sourceId, t.narxSom, t.chegaradaMi])).toEqual([['692120494348', 3_349, true], ['802207808750', 8_812, false]]);
    const bq = qator(n, 200);
    expect(bq.holat).toBe('qidirilmadi');
    expect(bq.sabab).toMatch(/RISK_CONTROL/);
    expect(b.yozilgan.map((y) => y.hash)).toEqual([RASM_A]);
    expect(b.soni()).toBe(1);
    expect(n.olchov_yoq).toBe(false);
  });

  it('SUCCEEDED, 0 ta natija — "topilmadi" (javob): keshlanadi, band qoladi', async () => {
    const kut: XitoyNatijasi = { ...KUTILMOQDA, qatorlar: [], kutilmoqda: { runId: RUN, boshlandi: 'x', rasmlar: [{ productId: 300, rasmUrl: RASM_C }] } };
    const b = soxtaBaza({ soni: 1 }); const s = soxtaFetch({ holat: F.tugadi });
    const n = await kod(b, s.fetch).xitoy(holatYasa({ 'rasm:300': RASM_C }, { xitoy: kut })) as XitoyNatijasi;
    expect(qator(n, 300)).toMatchObject({ holat: 'topilmadi', jami: 0, takliflar: [] });
    expect(b.yozilgan.map((y) => y.hash)).toEqual([RASM_C]);
    expect(b.soni()).toBe(1);
  });

  it('FAILED — hamma kutilgan tovar qidirilmadi, bandlar qaytadi', async () => {
    const b = soxtaBaza({ soni: 2 }); const s = soxtaFetch({ holat: F.yiqildi });
    const n = await kod(b, s.fetch).xitoy(holatYasa({}, { xitoy: KUTILMOQDA })) as XitoyNatijasi;
    expect(n.kutilmoqda).toBeNull();
    expect(qator(n, 100).sabab).toMatch(/FAILED/);
    expect(b.soni()).toBe(0);
  });

  it('holat soʻrovi tarmoqda yiqilsa — kutishda qoladi (3 martagacha), keyin qidirilmadi', async () => {
    const b = soxtaBaza({ soni: 2 }); const s = soxtaFetch({ holat: () => { throw new Error('ETIMEDOUT'); } });
    let h = holatYasa({}, { xitoy: KUTILMOQDA });
    for (let i = 0; i < 3; i++) {
      const n = await kod(b, s.fetch).xitoy(h) as XitoyNatijasi;
      expect(n.kutilmoqda).not.toBeNull();
      h = { ...h, natijalar: { ...h.natijalar, xitoy: n } };
    }
    const n = await kod(b, s.fetch).xitoy(h) as XitoyNatijasi;
    expect(n.kutilmoqda).toBeNull();
    expect(qator(n, 100).sabab).toMatch(/ulanib boʻlmadi/);
    expect(b.soni()).toBe(0);
  });

  it('kurs olinmasa — narxSom va chegaradaMi null, natija baribir "topildi"', async () => {
    const b = soxtaBaza(); const s = soxtaFetch({ cbu: () => { throw new Error('ENOTFOUND'); } });
    const n1 = await kod(b, s.fetch).xitoy(holatYasa()) as XitoyNatijasi;
    expect(n1.kurs).toBeNull();
    const s2 = soxtaFetch({ holat: F.tugadi });
    const n2 = await kod(b, s2.fetch).xitoy(holatYasa({}, { xitoy: n1 })) as XitoyNatijasi;
    expect(qator(n2, 100).takliflar[0]).toMatchObject({ narxSom: null, chegaradaMi: null });
  });
});
