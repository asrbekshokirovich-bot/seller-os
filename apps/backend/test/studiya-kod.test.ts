/**
 * 9-qadam kod harakatlari — `suhbatKodHarakatlari(...).studiya(holat)` va
 * `.studiyaYakun(holat)`.
 *
 * `studiya` ASINXRON: tanlangan 1688 taklifi rasmi bilan Google Lens
 * (Apify) yurishi boshlanadi → `kutilmoqda`; `tekshir` da natija oʻqiladi
 * (Uzum saytidan, kichik va takror suratlar tashlanadi), keshga yoziladi
 * (`lens:` kaliti, 72 soat), nomzodlar saralanadi va har biriga
 * imzolangan Worker manzili beriladi. Tarmoq va baza soxta — pul ketmaydi.
 */

import { describe, expect, it } from 'vitest';
import {
  studiyaImzosi, type QabulYakunNatijasi, type StudiyaNatijasi, type YolHolati,
} from '@selleros/shared';
import { suhbatKodHarakatlari, type XitoyBogliqligi } from '../src/suhbat-kod.js';
import { SURAT_FAKT } from './fixtures/uzum-faktlar.js';

const WORKER = 'https://selleros-studiya.sinov.workers.dev';
const IMZO_KALITI = 'sinov-imzo-kaliti';
const TANLOV_RASM = 'https://cbu01.alicdn.com/img/ibank/O1CN01tanlov_!!22-0-cib.jpg';

function taklif(sourceId: string, rasmUrl: string | null, title = `Taklif ${sourceId}`) {
  return { sourceId, title, rasmUrl, narxYuan: 27, moq: 1, reyting: null, manba: '1688', manzil: null, oxshashlikOrni: 1,
    dropshipNarxYuan: null, buyurtmalar: null, zavod: null, superZavod: null, sotuvchi: null, joy: null, dokonYili: null, narxSom: null, chegaradaMi: null };
}

function holatYasa(tovarlar: Array<{ id: number; tanlov: string | null; rasm?: string | null }> = [{ id: 100, tanlov: 'A1' }]): YolHolati {
  return {
    javoblar: { tovarlar: tovarlar.map((t) => t.id) },
    natijalar: {
      xitoy: { olchov_yoq: false, kurs: null, kutilmoqda: null, qatorlar: tovarlar.map((t) => ({
        productId: t.id, title: `Tovar ${t.id}`, rasmUrl: null, chegaraSom: null, yetishmaydi: [], holat: 'topildi', sabab: null, jami: 3,
        takliflar: [
          taklif('A1', t.rasm === undefined ? `${TANLOV_RASM}_220x220.jpg` : t.rasm),
          taklif('B2', 'https://cbu01.alicdn.com/img/ibank/O1CN01oxshash1.jpg'),
          taklif('C3', 'https://cbu01.alicdn.com/img/ibank/O1CN01oxshash2.jpg_.webp'),
        ],
        keshdan: false, tashlandi: 0,
      })) },
      buyurtma: { olchov_yoq: false, qatorlar: tovarlar.map((t) => ({
        productId: t.id, title: `Tovar ${t.id}`, sourceId: t.tanlov, miqdor: 10, holat: t.tanlov === null ? 'tanlanmagan' : 'tayyor',
      })) },
    },
  };
}

/** Lens dataset qatorlari: bittasi yaxshi, bittasi Uzumdan, bittasi kichik, bittasi takror. */
const LENS_QATORLAR = [
  { position: 1, title: 'Women bag large', source: 'Amazon.com', url: 'https://www.amazon.com/dp/X', image: 'https://m.media-amazon.com/images/I/bag.jpg', imageWidth: 1500, imageHeight: 1500 },
  { position: 2, title: 'Sumka', source: 'Uzum Market', url: 'https://uzum.uz/uz/product/sumka-123', image: 'https://images.uzum.uz/abc/original.jpg', imageWidth: 1200, imageHeight: 1600 },
  { position: 3, title: 'Kichik', source: 'x.com', url: 'https://x.com/p', image: 'https://x.com/small.jpg', imageWidth: 300, imageHeight: 300 },
  { position: 4, title: 'Women bag large', source: 'Amazon.com', url: 'https://www.amazon.com/dp/Y', image: 'https://m.media-amazon.com/images/I/bag.jpg', imageWidth: 1500, imageHeight: 1500 },
];

type Javob = { status?: number; json: unknown } | Error;

/** Soxta Apify: yoʻl → javob. Har chaqiruv yoziladi. */
function soxtaTarmoq(javoblar: Record<string, Javob | Javob[]>) {
  const chaqiruvlar: Array<{ url: string; method: string; body: unknown }> = [];
  const f = async (url: string, init?: { method?: string; body?: string }) => {
    chaqiruvlar.push({ url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(init.body) : null });
    const kalit = Object.keys(javoblar).find((k) => url.includes(k));
    if (kalit === undefined) throw new Error(`kutilmagan soʻrov: ${url}`);
    const j = javoblar[kalit]!;
    const bir = Array.isArray(j) ? (j.length > 1 ? j.shift()! : j[0]!) : j;
    if (bir instanceof Error) throw bir;
    return new Response(JSON.stringify(bir.json), { status: bir.status ?? 200, headers: { 'content-type': 'application/json' } });
  };
  return { fetch: f as unknown as typeof fetch, chaqiruvlar };
}

function soxtaBaza(q: { kesh?: Record<string, unknown>; fakt?: unknown; ochiq?: unknown } = {}) {
  const chaqiruvlar: Array<{ nom: string; arg: Record<string, unknown> }> = [];
  let id = 60;
  const rpc = async <T>(nom: string, arg: unknown): Promise<T | null> => {
    const a = arg as Record<string, unknown>;
    chaqiruvlar.push({ nom, arg: a });
    if (nom === 'so_fakt_oqi') return (q.fakt === undefined ? SURAT_FAKT : q.fakt) as T;
    if (nom === 'so_xitoy_kesh_ol') {
      const n = q.kesh?.[a.p_rasm_hash as string];
      return (n === undefined ? { topildi: false } : { topildi: true, natijalar: n }) as T;
    }
    if (nom === 'so_xitoy_kesh_yoz') return { yozildi: true } as T;
    if (nom === 'so_ochiq_ish_yoz') { id += 1; return (q.ochiq === undefined ? { id, yangi: true } : q.ochiq) as T; }
    return null;
  };
  return { rpc, chaqiruvlar, kim: (nom: string) => chaqiruvlar.filter((c) => c.nom === nom).map((c) => c.arg) };
}

let soat = new Date('2026-09-29T09:00:00.000Z');

function kod(b: ReturnType<typeof soxtaBaza>, t: ReturnType<typeof soxtaTarmoq>, q: Partial<XitoyBogliqligi> = {}, sessiya = true) {
  const x: XitoyBogliqligi = {
    kalit: 'APIFY', fetch: t.fetch, token: 'tok', tarifCheklovi: false, hozir: () => soat,
    studiya: { url: WORKER, kalit: IMZO_KALITI }, ...q,
  };
  const k = suhbatKodHarakatlari(b.rpc, () => ({ bayroqlar: [], baholanmadi: [] }), () => 9, sessiya ? x : null);
  return {
    studiya: (h: YolHolati) => k.studiya(h) as Promise<StudiyaNatijasi>,
    studiyaYakun: (h: YolHolati) => k.studiyaYakun(h) as Promise<QabulYakunNatijasi>,
  };
}

const TAYYOR_TARMOQ = () => soxtaTarmoq({
  '/acts/johnvc~google-lens-api/runs': { json: { data: { id: 'LENS1', status: 'READY' } } },
  '/actor-runs/LENS1/dataset/items': { json: LENS_QATORLAR },
  '/actor-runs/LENS1': { json: { data: { id: 'LENS1', status: 'SUCCEEDED' } } },
});

describe('studiya — boshlash va tekshirish', () => {
  it('yurish tanlangan taklifning ASL rasmi bilan boshlanadi; natija `kutilmoqda`, qator hali yoʻq', async () => {
    soat = new Date('2026-09-29T09:00:00.000Z');
    const b = soxtaBaza();
    const t = TAYYOR_TARMOQ();
    const n = await kod(b, t).studiya(holatYasa());
    expect(n.kutilmoqda).toEqual({ boshlandi: '2026-09-29T09:00:00.000Z', runlar: [{ productId: 100, runId: 'LENS1', rasmUrl: TANLOV_RASM }], tayyor: [] });
    expect(n.qatorlar).toEqual([]);
    expect(n.sozlangan).toBe(true);
    expect(n.talablar).toMatchObject({ minEni: 750, minBoyi: 1000 });
    expect(t.chaqiruvlar).toHaveLength(1);
    expect(t.chaqiruvlar[0]!.url).toMatch(/\/acts\/johnvc~google-lens-api\/runs\?maxTotalChargeUsd=0\.02&timeout=180$/);
    expect(t.chaqiruvlar[0]!.body).toEqual({ image_url: TANLOV_RASM, search_type: 'visual_matches', max_results: 20 });
    expect(b.kim('so_xitoy_kesh_ol')).toEqual([{ p_rasm_hash: `lens:${TANLOV_RASM}` }]);
  });

  it('tekshir: tugagan — Uzumdan, kichik va takror tashlanadi; kesh yoziladi; tartib tanlov → internet → oʻxshash; har surat imzolangan', async () => {
    const b = soxtaBaza();
    const t = TAYYOR_TARMOQ();
    const k = kod(b, t);
    const h = holatYasa();
    const boshi = await k.studiya(h);
    const n = await k.studiya({ ...h, natijalar: { ...h.natijalar, studiya: boshi } });
    expect(n.kutilmoqda).toBeNull();
    expect(n.olchov_yoq).toBe(false);
    expect(n.chiqishMos).toBe(true);
    const q = n.qatorlar[0]!;
    expect(q.internet).toBe('qidirildi');
    expect(q.tashlandi).toBe(3);
    expect(q.suratlar.map((s) => [s.manba, s.asl])).toEqual([
      ['1688-tanlov', TANLOV_RASM],
      ['internet', 'https://m.media-amazon.com/images/I/bag.jpg'],
      ['1688-oxshash', 'https://cbu01.alicdn.com/img/ibank/O1CN01oxshash1.jpg'],
      ['1688-oxshash', 'https://cbu01.alicdn.com/img/ibank/O1CN01oxshash2.jpg'],
    ]);
    expect(q.suratlar[1]).toMatchObject({ sayt: 'Amazon.com', eni: 1500, boyi: 1500, nom: 'Women bag large' });
    for (const s of q.suratlar) {
      const u = new URL(s.url!);
      expect(u.origin).toBe(WORKER);
      expect(u.searchParams.get('src')).toBe(s.asl);
      expect(u.searchParams.get('s')).toBe(await studiyaImzosi(IMZO_KALITI, 'auto', s.asl));
    }
    expect(b.kim('so_xitoy_kesh_yoz')).toEqual([{ p_rasm_hash: `lens:${TANLOV_RASM}`, p_natijalar: [expect.objectContaining({ asl: 'https://m.media-amazon.com/images/I/bag.jpg' })], p_manba: 'lens' }]);
  });

  it('kesh bor — Apify chaqirilmaydi, darhol yakun, "keshdan"', async () => {
    const b = soxtaBaza({ kesh: { [`lens:${TANLOV_RASM}`]: [{ manba: 'internet', asl: 'https://shop.example/bag.jpg', sayt: 'shop.example', eni: 1000, boyi: 1000, nom: 'Bag' }] } });
    const t = soxtaTarmoq({});
    const n = await kod(b, t).studiya(holatYasa());
    expect(t.chaqiruvlar).toHaveLength(0);
    expect(n.kutilmoqda).toBeNull();
    expect(n.qatorlar[0]!.internet).toBe('keshdan');
    expect(n.qatorlar[0]!.suratlar.map((s) => s.manba)).toEqual(['1688-tanlov', 'internet', '1688-oxshash', '1688-oxshash']);
  });

  it('kalit yoʻq — internet "qidirilmadi" sabab bilan; 1688 suratlari baribir beriladi', async () => {
    const n = await kod(soxtaBaza(), soxtaTarmoq({}), { kalit: null }).studiya(holatYasa());
    expect(n.kutilmoqda).toBeNull();
    expect(n.qatorlar[0]).toMatchObject({ internet: 'qidirilmadi', internetSabab: 'provayder kaliti yoʻq' });
    expect(n.qatorlar[0]!.suratlar).toHaveLength(3);
  });

  it('studiya ulanmagan — `sozlangan: false`, manzil `null` (asl surat koʻrsatiladi)', async () => {
    const n = await kod(soxtaBaza(), soxtaTarmoq({}), { kalit: null, studiya: { url: null, kalit: null } }).studiya(holatYasa());
    expect(n.sozlangan).toBe(false);
    expect(n.qatorlar[0]!.suratlar.every((s) => s.url === null)).toBe(true);
    const n2 = await kod(soxtaBaza(), soxtaTarmoq({}), { kalit: null, studiya: { url: WORKER, kalit: '' } }).studiya(holatYasa());
    expect(n2.sozlangan).toBe(false);
  });

  it('boshlashda provayder xatosi — "xato" sabab bilan; tanlangan rasmi yoʻq — "qidirilmadi"', async () => {
    const t = soxtaTarmoq({ '/acts/johnvc~google-lens-api/runs': { status: 402, json: { error: { type: 'not-enough-usage-to-run-paid-actor', message: 'x' } } } });
    const n = await kod(soxtaBaza(), t).studiya(holatYasa([{ id: 100, tanlov: 'A1' }, { id: 200, tanlov: 'A1', rasm: null }]));
    expect(n.qatorlar.map((q) => [q.productId, q.internet])).toEqual([[100, 'xato'], [200, 'qidirilmadi']]);
    expect(n.qatorlar[0]!.internetSabab).toMatch(/not-enough-usage-to-run-paid-actor/);
    expect(n.qatorlar[1]!.internetSabab).toBe('tanlangan taklifning rasmi yoʻq');
    expect(n.qatorlar[1]!.suratlar.map((s) => s.manba)).toEqual(['1688-oxshash', '1688-oxshash']);
  });

  it('bir turnda 5 tagacha yurish; 6-tovar "qidirilmadi" — «Qayta qidir» bilan davom etadi', async () => {
    let r = 0;
    const t = soxtaTarmoq({ '/acts/johnvc~google-lens-api/runs': Array.from({ length: 6 }, () => ({ json: { data: { id: `R${++r}`, status: 'READY' } } })) });
    const h = holatYasa([1, 2, 3, 4, 5, 6].map((id) => ({ id, tanlov: 'A1', rasm: `https://cbu01.alicdn.com/img/${id}.jpg` })));
    const n = await kod(soxtaBaza(), t).studiya(h);
    expect(n.kutilmoqda!.runlar).toHaveLength(5);
    expect(n.kutilmoqda!.tayyor).toEqual([expect.objectContaining({ productId: 6, internet: 'qidirilmadi', sabab: expect.stringMatching(/bir turnda 5 tagacha/) })]);
  });

  it('yurish hali ketmoqda — `kutilmoqda` qoladi; 5 daqiqadan keyin — "xato", 1688 suratlari bilan yakun', async () => {
    soat = new Date('2026-09-29T09:00:00.000Z');
    const t = soxtaTarmoq({
      '/acts/johnvc~google-lens-api/runs': { json: { data: { id: 'LENS2', status: 'READY' } } },
      '/actor-runs/LENS2': { json: { data: { id: 'LENS2', status: 'RUNNING' } } },
    });
    const b = soxtaBaza();
    const k = kod(b, t);
    const h = holatYasa();
    const boshi = await k.studiya(h);
    soat = new Date('2026-09-29T09:01:00.000Z');
    const ikki = await k.studiya({ ...h, natijalar: { ...h.natijalar, studiya: boshi } });
    expect(ikki.kutilmoqda!.runlar).toEqual(boshi.kutilmoqda!.runlar);
    soat = new Date('2026-09-29T09:06:00.000Z');
    const uch = await k.studiya({ ...h, natijalar: { ...h.natijalar, studiya: ikki } });
    expect(uch.kutilmoqda).toBeNull();
    expect(uch.qatorlar[0]).toMatchObject({ internet: 'xato', internetSabab: 'internet qidiruvi 5 daqiqada tugamadi' });
    expect(uch.qatorlar[0]!.suratlar).toHaveLength(3);
    expect(b.kim('so_xitoy_kesh_yoz')).toEqual([]);
  });

  it('holatni oʻqishda tarmoq xatosi — 3 marta qayta urinadi, keyin "xato"; FAILED — darhol "xato"', async () => {
    soat = new Date('2026-09-29T09:00:00.000Z');
    const t = soxtaTarmoq({
      '/acts/johnvc~google-lens-api/runs': { json: { data: { id: 'LENS3', status: 'READY' } } },
      '/actor-runs/LENS3': new Error('tarmoq uzildi'),
    });
    const k = kod(soxtaBaza(), t);
    const h = holatYasa();
    let n = await k.studiya(h);
    for (let i = 1; i <= 3; i++) {
      n = await k.studiya({ ...h, natijalar: { ...h.natijalar, studiya: n } });
      expect(n.kutilmoqda!.runlar[0]!.urinish).toBe(i);
    }
    n = await k.studiya({ ...h, natijalar: { ...h.natijalar, studiya: n } });
    expect(n.qatorlar[0]).toMatchObject({ internet: 'xato', internetSabab: 'provayder javob bermadi' });

    const t2 = soxtaTarmoq({
      '/acts/johnvc~google-lens-api/runs': { json: { data: { id: 'LENS4', status: 'READY' } } },
      '/actor-runs/LENS4': { json: { data: { id: 'LENS4', status: 'FAILED' } } },
    });
    const k2 = kod(soxtaBaza(), t2);
    const b2 = await k2.studiya(h);
    const x = await k2.studiya({ ...h, natijalar: { ...h.natijalar, studiya: b2 } });
    expect(x.qatorlar[0]).toMatchObject({ internet: 'xato', internetSabab: 'internet qidiruvi yakunlanmadi (FAILED)' });
  });

  it('yurish tugagan, lekin natijani olishda tarmoq xatosi — qayta kutiladi (urinish), xato deb yozilmaydi', async () => {
    soat = new Date('2026-09-29T09:00:00.000Z');
    const t = soxtaTarmoq({
      '/acts/johnvc~google-lens-api/runs': { json: { data: { id: 'LENS7', status: 'READY' } } },
      '/actor-runs/LENS7/dataset/items': new Error('tarmoq uzildi'),
      '/actor-runs/LENS7': { json: { data: { id: 'LENS7', status: 'SUCCEEDED' } } },
    });
    const b = soxtaBaza();
    const k = kod(b, t);
    const h = holatYasa();
    const n = await k.studiya({ ...h, natijalar: { ...h.natijalar, studiya: await k.studiya(h) } });
    expect(n.kutilmoqda!.runlar).toEqual([expect.objectContaining({ runId: 'LENS7', urinish: 1 })]);
    expect(b.kim('so_xitoy_kesh_yoz')).toEqual([]);
  });

  it('aktor xato qatori berdi — "xato", kesh YOZILMAYDI', async () => {
    const t = soxtaTarmoq({
      '/acts/johnvc~google-lens-api/runs': { json: { data: { id: 'LENS5', status: 'READY' } } },
      '/actor-runs/LENS5/dataset/items': { json: [{ resultType: 'error', message: 'Google Lens: image could not be fetched' }] },
      '/actor-runs/LENS5': { json: { data: { id: 'LENS5', status: 'SUCCEEDED' } } },
    });
    const b = soxtaBaza();
    const k = kod(b, t);
    const h = holatYasa();
    const boshi = await k.studiya(h);
    const n = await k.studiya({ ...h, natijalar: { ...h.natijalar, studiya: boshi } });
    expect(n.qatorlar[0]).toMatchObject({ internet: 'xato', internetSabab: 'Google Lens: image could not be fetched' });
    expect(b.kim('so_xitoy_kesh_yoz')).toEqual([]);
  });

  it('natijasiz qidiruv — "qidirildi", internet surati yoʻq (bu xato emas), kesh yoziladi', async () => {
    const t = soxtaTarmoq({
      '/acts/johnvc~google-lens-api/runs': { json: { data: { id: 'LENS6', status: 'READY' } } },
      '/actor-runs/LENS6/dataset/items': { json: [] },
      '/actor-runs/LENS6': { json: { data: { id: 'LENS6', status: 'SUCCEEDED' } } },
    });
    const b = soxtaBaza();
    const k = kod(b, t);
    const h = holatYasa();
    const n = await k.studiya({ ...h, natijalar: { ...h.natijalar, studiya: await k.studiya(h) } });
    expect(n.qatorlar[0]).toMatchObject({ internet: 'qidirildi', internetSabab: null });
    expect(n.qatorlar[0]!.suratlar.some((s) => s.manba === 'internet')).toBe(false);
    expect(b.kim('so_xitoy_kesh_yoz')).toHaveLength(1);
  });

  it('Uzum talabi oshsa (1500×2000) — chiqishMos false; fakt yoʻq — null', async () => {
    const katta = { ...SURAT_FAKT, 'uzum.surat.min_eni': { ...SURAT_FAKT['uzum.surat.min_eni'], qiymat: 1500 }, 'uzum.surat.min_boyi': { ...SURAT_FAKT['uzum.surat.min_boyi'], qiymat: 2000 } };
    const n = await kod(soxtaBaza({ fakt: katta }), soxtaTarmoq({}), { kalit: null }).studiya(holatYasa());
    expect(n.chiqishMos).toBe(false);
    const y = await kod(soxtaBaza({ fakt: {} }), soxtaTarmoq({}), { kalit: null }).studiya(holatYasa());
    expect(y.chiqishMos).toBeNull();
  });

  it('varaqada 1688 tanlovi yoʻq — olchov_yoq sabab bilan; fakt oʻqilmasa talablar null', async () => {
    const n = await kod(soxtaBaza({ fakt: null }), soxtaTarmoq({})).studiya(holatYasa([{ id: 100, tanlov: null }]));
    expect(n).toMatchObject({ olchov_yoq: true, sabab: 'buyurtma varaqasida 1688 taklifi tanlangan tovar yoʻq', talablar: null, qatorlar: [] });
  });
});

describe('studiyaYakun', () => {
  it('kam — oʻz suratlari; keyin yoki oʻtkazilgan — tanlov; tayyor — hech narsa', async () => {
    const b = soxtaBaza();
    const k = kod(b, soxtaTarmoq({}));
    const h = holatYasa();
    const kam = await k.studiyaYakun({ ...h, javoblar: { ...h.javoblar, studiya_tayyor: 'kam' } });
    expect(kam.yozildi.map((y) => [y.tur, y.sabab])).toEqual([['kutyapman', 'studiya: oʻz suratlari (yetmadi)']]);
    expect(b.kim('so_ochiq_ish_yoz')[0]).toMatchObject({ p_token: 'tok', p_props: { savolId: 'studiya_tayyor', javob: 'kam' } });
    const keyin = await k.studiyaYakun({ ...h, javoblar: { ...h.javoblar, studiya_tayyor: null } });
    expect(keyin.yozildi.map((y) => y.sabab)).toEqual(['studiya: suratlar tanlovi']);
    const tayyor = await k.studiyaYakun({ ...h, javoblar: { ...h.javoblar, studiya_tayyor: 'tayyor' } });
    expect(tayyor).toMatchObject({ olchov_yoq: false, yozildi: [] });
  });
  it('chiqish talabga mos emas — nazoratchiga tekshirish ishi', async () => {
    const h = holatYasa();
    const n = await kod(soxtaBaza(), soxtaTarmoq({})).studiyaYakun({
      javoblar: { ...h.javoblar, studiya_tayyor: 'tayyor' },
      natijalar: { ...h.natijalar, studiya: { chiqishMos: false } },
    });
    expect(n.yozildi.map((y) => [y.tur, y.sabab])).toEqual([['tekshirish', 'studiya: chiqish oʻlchami Uzum talabiga mos emas']]);
  });
  it('sessiya yoʻq — olchov_yoq', async () => {
    expect(await kod(soxtaBaza(), soxtaTarmoq({}), {}, false).studiyaYakun(holatYasa())).toMatchObject({ olchov_yoq: true, sabab: 'sessiya yoʻq' });
  });
});
