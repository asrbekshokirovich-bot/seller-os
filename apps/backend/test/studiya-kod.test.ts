/**
 * 9-qadam kod harakatlari — `suhbatKodHarakatlari(...).studiya(holat)` va
 * `.studiyaYakun(holat)`.
 *
 * `studiya` ASINXRON: tanlangan 1688 takliflarining toʻliq tafsiloti
 * (`offerIds` rejimi, hamma taklif BITTA yurishda) boshlanadi →
 * `kutilmoqda`; `tekshir` da galereya oʻqiladi, keshga yoziladi
 * (`1688-tafsilot:<offerId>`, 72 soat), nomzodlar saralanadi (tanlov →
 * galereya → oʻxshash) va har biriga imzolangan Worker manzili beriladi.
 * Internetdagi "oʻxshash" suratlar olinmaydi. Tarmoq va baza soxta.
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

/** Har tovar: tanlangan taklif `offerId` (tanlov), rasmi va ikkita oʻxshash taklif. */
function holatYasa(tovarlar: Array<{ id: number; offerId: string | null; rasm?: string | null }> = [{ id: 100, offerId: '111111' }]): YolHolati {
  return {
    javoblar: { tovarlar: tovarlar.map((t) => t.id) },
    natijalar: {
      xitoy: { olchov_yoq: false, kurs: null, kutilmoqda: null, qatorlar: tovarlar.map((t) => ({
        productId: t.id, title: `Tovar ${t.id}`, rasmUrl: null, chegaraSom: null, yetishmaydi: [], holat: 'topildi', sabab: null, jami: 3,
        takliflar: [
          taklif(t.offerId ?? '000000', t.rasm === undefined ? `${TANLOV_RASM}_220x220.jpg` : t.rasm),
          taklif('222222', 'https://cbu01.alicdn.com/img/ibank/O1CN01oxshash1.jpg'),
          taklif('333333', 'https://cbu01.alicdn.com/img/ibank/O1CN01oxshash2.jpg_.webp'),
        ],
        keshdan: false, tashlandi: 0,
      })) },
      buyurtma: { olchov_yoq: false, qatorlar: tovarlar.map((t) => ({
        productId: t.id, title: `Tovar ${t.id}`, sourceId: t.offerId, miqdor: 10, holat: t.offerId === null ? 'tanlanmagan' : 'tayyor',
      })) },
    },
  };
}

const GALEREYA = [
  'https://cbu01.alicdn.com/img/ibank/O1CN01tanlov_!!22-0-cib.jpg',
  'https://cbu01.alicdn.com/img/ibank/O1CN01g1_!!22-0-cib.jpg',
  'https://cbu01.alicdn.com/img/ibank/O1CN01g2_!!22-0-cib.jpg',
];
const TAFSILOT = [{ type: 'offerIdsResult', requested: 1, delivered: 1, products: [
  { offerId: '111111', dataQuality: 'full', videoUrl: 'https://cloud.video.taobao.com/v1.mp4', images: GALEREYA },
] }];

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
    if (nom === 'so_xitoy_kesh_yoz') return { id: 1 } as T;
    if (nom === 'so_ochiq_ish_yoz') { id += 1; return (q.ochiq === undefined ? { id, yangi: true } : q.ochiq) as T; }
    return null;
  };
  return { rpc, chaqiruvlar, kim: (nom: string) => chaqiruvlar.filter((c) => c.nom === nom).map((c) => c.arg) };
}

let soat = new Date('2026-09-30T09:00:00.000Z');

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

const AKTOR = '/acts/crawleast~1688-image-search-scraper/runs';
const TAYYOR_TARMOQ = (runId = 'T1', dataset: unknown = TAFSILOT) => soxtaTarmoq({
  [AKTOR]: { json: { data: { id: runId, status: 'READY' } } },
  [`/actor-runs/${runId}/dataset/items`]: { json: dataset },
  [`/actor-runs/${runId}`]: { json: { data: { id: runId, status: 'SUCCEEDED' } } },
});

/** Boshlash → tekshirish (bitta `tekshir`). */
async function ikkiQadam(k: ReturnType<typeof kod>, h: YolHolati): Promise<[StudiyaNatijasi, StudiyaNatijasi]> {
  const boshi = await k.studiya(h);
  return [boshi, await k.studiya({ ...h, natijalar: { ...h.natijalar, studiya: boshi } })];
}

describe('studiya — boshlash va tekshirish', () => {
  it('hamma tanlangan taklif BITTA yurishda (offerIds rejimi); natija `kutilmoqda`, qator hali yoʻq', async () => {
    soat = new Date('2026-09-30T09:00:00.000Z');
    const b = soxtaBaza();
    const t = TAYYOR_TARMOQ();
    const n = await kod(b, t).studiya(holatYasa([{ id: 100, offerId: '111111' }, { id: 200, offerId: '444444' }]));
    expect(n.kutilmoqda).toEqual({ boshlandi: '2026-09-30T09:00:00.000Z', runId: 'T1', kutilgan: [{ productId: 100, offerId: '111111' }, { productId: 200, offerId: '444444' }], tayyor: [] });
    expect(n.qatorlar).toEqual([]);
    expect(n.sozlangan).toBe(true);
    expect(t.chaqiruvlar).toHaveLength(1);
    expect(t.chaqiruvlar[0]!.url).toMatch(/\/acts\/crawleast~1688-image-search-scraper\/runs\?timeout=300$/);
    expect(t.chaqiruvlar[0]!.body).toEqual({ offerIds: ['111111', '444444'], maxTotalChargeUsd: 0.04 });
    expect(b.kim('so_xitoy_kesh_ol')).toEqual([{ p_rasm_hash: '1688-tafsilot:111111' }, { p_rasm_hash: '1688-tafsilot:444444' }]);
  });

  it('tekshir: tugagan — galereya keshga yoziladi; tartib tanlov → galereya → oʻxshash; takror yoʻq; har surat imzolangan; video', async () => {
    const b = soxtaBaza();
    const [, n] = await ikkiQadam(kod(b, TAYYOR_TARMOQ()), holatYasa());
    expect(n.kutilmoqda).toBeNull();
    expect(n.olchov_yoq).toBe(false);
    expect(n.chiqishMos).toBe(true);
    const q = n.qatorlar[0]!;
    expect(q).toMatchObject({ galereya: 'olindi', galereyaSabab: null, video: 'https://cloud.video.taobao.com/v1.mp4' });
    expect(q.suratlar.map((s) => [s.manba, s.asl])).toEqual([
      ['1688-tanlov', TANLOV_RASM],
      ['1688-galereya', GALEREYA[1]],
      ['1688-galereya', GALEREYA[2]],
      ['1688-oxshash', 'https://cbu01.alicdn.com/img/ibank/O1CN01oxshash1.jpg'],
      ['1688-oxshash', 'https://cbu01.alicdn.com/img/ibank/O1CN01oxshash2.jpg'],
    ]);
    for (const s of q.suratlar) {
      const u = new URL(s.url!);
      expect(u.origin).toBe(WORKER);
      expect(u.searchParams.get('src')).toBe(s.asl);
      expect(u.searchParams.get('s')).toBe(await studiyaImzosi(IMZO_KALITI, 'auto', s.asl));
    }
    expect(b.kim('so_xitoy_kesh_yoz')).toEqual([{
      p_rasm_hash: '1688-tafsilot:111111', p_manba: '1688-tafsilot',
      p_natijalar: { rasmlar: GALEREYA, video: 'https://cloud.video.taobao.com/v1.mp4', sifat: 'full' },
    }]);
  });

  it('kesh bor — Apify chaqirilmaydi, darhol yakun, "keshdan"; keshdagi buzuq qiymat — qayta soʻraladi', async () => {
    const b = soxtaBaza({ kesh: { '1688-tafsilot:111111': { rasmlar: [GALEREYA[1]], video: null, sifat: 'partial' } } });
    const t = soxtaTarmoq({});
    const n = await kod(b, t).studiya(holatYasa());
    expect(t.chaqiruvlar).toHaveLength(0);
    expect(n.kutilmoqda).toBeNull();
    expect(n.qatorlar[0]).toMatchObject({ galereya: 'keshdan', video: null });
    expect(n.qatorlar[0]!.suratlar.map((s) => s.manba)).toEqual(['1688-tanlov', '1688-galereya', '1688-oxshash', '1688-oxshash']);

    const buzuq = await kod(soxtaBaza({ kesh: { '1688-tafsilot:111111': [{ asl: 'eski-lens-shakli' }] } }), TAYYOR_TARMOQ()).studiya(holatYasa());
    expect(buzuq.kutilmoqda?.kutilgan).toEqual([{ productId: 100, offerId: '111111' }]);
  });

  it('kalit yoʻq — galereya "olinmadi" sabab bilan; 1688 suratlari baribir beriladi', async () => {
    const n = await kod(soxtaBaza(), soxtaTarmoq({}), { kalit: null }).studiya(holatYasa());
    expect(n.kutilmoqda).toBeNull();
    expect(n.qatorlar[0]).toMatchObject({ galereya: 'olinmadi', galereyaSabab: 'provayder kaliti yoʻq' });
    expect(n.qatorlar[0]!.suratlar).toHaveLength(3);
  });

  it('studiya ulanmagan — `sozlangan: false`, manzil `null` (asl surat koʻrsatiladi)', async () => {
    const n = await kod(soxtaBaza(), soxtaTarmoq({}), { kalit: null, studiya: { url: null, kalit: null } }).studiya(holatYasa());
    expect(n.sozlangan).toBe(false);
    expect(n.qatorlar[0]!.suratlar.every((s) => s.url === null)).toBe(true);
    const n2 = await kod(soxtaBaza(), soxtaTarmoq({}), { kalit: null, studiya: { url: WORKER, kalit: '' } }).studiya(holatYasa());
    expect(n2.sozlangan).toBe(false);
  });

  it('boshlashda provayder xatosi — hammasi "xato" sabab bilan; tarmoq yiqilsa — "provayderga ulanib boʻlmadi"', async () => {
    const t = soxtaTarmoq({ [AKTOR]: { status: 402, json: { error: { type: 'not-enough-usage-to-run-paid-actor', message: 'x' } } } });
    const n = await kod(soxtaBaza(), t).studiya(holatYasa());
    expect(n.qatorlar[0]).toMatchObject({ galereya: 'xato' });
    expect(n.qatorlar[0]!.galereyaSabab).toMatch(/not-enough-usage-to-run-paid-actor/);
    const t2 = soxtaTarmoq({ [AKTOR]: new Error('tarmoq') });
    const n2 = await kod(soxtaBaza(), t2).studiya(holatYasa());
    expect(n2.qatorlar[0]).toMatchObject({ galereya: 'xato', galereyaSabab: 'provayderga ulanib boʻlmadi' });
  });

  it('yurish hali ketmoqda — `kutilmoqda` oʻzgarmaydi; 5 daqiqadan keyin — "xato", 1688 suratlari bilan yakun', async () => {
    soat = new Date('2026-09-30T09:00:00.000Z');
    const t = soxtaTarmoq({
      [AKTOR]: { json: { data: { id: 'T2', status: 'READY' } } },
      '/actor-runs/T2': { json: { data: { id: 'T2', status: 'RUNNING' } } },
    });
    const b = soxtaBaza();
    const k = kod(b, t);
    const h = holatYasa();
    const boshi = await k.studiya(h);
    soat = new Date('2026-09-30T09:01:00.000Z');
    const ikki = await k.studiya({ ...h, natijalar: { ...h.natijalar, studiya: boshi } });
    expect(ikki).toEqual(boshi);
    soat = new Date('2026-09-30T09:06:00.000Z');
    const uch = await k.studiya({ ...h, natijalar: { ...h.natijalar, studiya: ikki } });
    expect(uch.kutilmoqda).toBeNull();
    expect(uch.qatorlar[0]).toMatchObject({ galereya: 'xato', galereyaSabab: 'galereya 5 daqiqada olinmadi' });
    expect(uch.qatorlar[0]!.suratlar).toHaveLength(3);
    expect(b.kim('so_xitoy_kesh_yoz')).toEqual([]);
  });

  it('holat yoki natijani olishda tarmoq xatosi — 3 marta qayta urinadi, keyin "xato"; FAILED — darhol "xato"', async () => {
    soat = new Date('2026-09-30T09:00:00.000Z');
    const t = soxtaTarmoq({ [AKTOR]: { json: { data: { id: 'T3', status: 'READY' } } }, '/actor-runs/T3': new Error('tarmoq uzildi') });
    const k = kod(soxtaBaza(), t);
    const h = holatYasa();
    let n = await k.studiya(h);
    for (let i = 1; i <= 3; i++) {
      n = await k.studiya({ ...h, natijalar: { ...h.natijalar, studiya: n } });
      expect(n.kutilmoqda!.urinish).toBe(i);
    }
    n = await k.studiya({ ...h, natijalar: { ...h.natijalar, studiya: n } });
    expect(n.qatorlar[0]).toMatchObject({ galereya: 'xato', galereyaSabab: 'provayder javob bermadi' });

    const tn = soxtaTarmoq({
      [AKTOR]: { json: { data: { id: 'T4', status: 'READY' } } },
      '/actor-runs/T4/dataset/items': new Error('tarmoq uzildi'),
      '/actor-runs/T4': { json: { data: { id: 'T4', status: 'SUCCEEDED' } } },
    });
    const [, n4] = await ikkiQadam(kod(soxtaBaza(), tn), h);
    expect(n4.kutilmoqda?.urinish).toBe(1);

    const tf = soxtaTarmoq({ [AKTOR]: { json: { data: { id: 'T5', status: 'READY' } } }, '/actor-runs/T5': { json: { data: { id: 'T5', status: 'FAILED' } } } });
    const [, n5] = await ikkiQadam(kod(soxtaBaza(), tf), h);
    expect(n5.qatorlar[0]).toMatchObject({ galereya: 'xato', galereyaSabab: 'galereya yurishi yakunlanmadi (FAILED)' });
  });

  it('provayder bu taklifni bermadi — "olinmadi" (kesh yozilmaydi); galereyasi boʻsh — "olindi", sabab aytiladi, kesh yoziladi', async () => {
    const h = holatYasa([{ id: 100, offerId: '111111' }, { id: 200, offerId: '444444' }]);
    const bir = [{ type: 'offerIdsResult', requested: 2, delivered: 1, products: [{ offerId: '444444', dataQuality: 'minimal', images: [] }] }];
    const b = soxtaBaza();
    const [, n] = await ikkiQadam(kod(b, TAYYOR_TARMOQ('T6', bir)), h);
    expect(n.qatorlar.map((q) => [q.productId, q.galereya, q.galereyaSabab])).toEqual([
      [100, 'olinmadi', 'provayder bu taklif tafsilotini bermadi'],
      [200, 'olindi', 'taklif sahifasida qoʻshimcha surat yoʻq'],
    ]);
    expect(b.kim('so_xitoy_kesh_yoz').map((x) => x.p_rasm_hash)).toEqual(['1688-tafsilot:444444']);
    const [, x] = await ikkiQadam(kod(soxtaBaza(), TAYYOR_TARMOQ('T7', [{ type: 'imageResult' }])), holatYasa());
    expect(x.qatorlar[0]).toMatchObject({ galereya: 'xato', galereyaSabab: 'provayder tafsilot qatorini bermadi' });
  });

  it('eski shakldagi (Lens davri) kutish — qayta boshlanadi, yiqilmaydi', async () => {
    const h = holatYasa();
    const eski = { olchov_yoq: false, qatorlar: [], kutilmoqda: { boshlandi: '2026-09-29T09:00:00.000Z', runlar: [{ productId: 100, runId: 'L1', rasmUrl: 'x' }], tayyor: [] } };
    const n = await kod(soxtaBaza(), TAYYOR_TARMOQ('T8')).studiya({ ...h, natijalar: { ...h.natijalar, studiya: eski } });
    expect(n.kutilmoqda).toMatchObject({ runId: 'T8', kutilgan: [{ productId: 100, offerId: '111111' }] });
  });

  it('Uzum talabi oshsa (1500×2000) — chiqishMos false; fakt yoʻq — null', async () => {
    const katta = { ...SURAT_FAKT, 'uzum.surat.min_eni': { ...SURAT_FAKT['uzum.surat.min_eni'], qiymat: 1500 }, 'uzum.surat.min_boyi': { ...SURAT_FAKT['uzum.surat.min_boyi'], qiymat: 2000 } };
    const n = await kod(soxtaBaza({ fakt: katta }), soxtaTarmoq({}), { kalit: null }).studiya(holatYasa());
    expect(n.chiqishMos).toBe(false);
    const y = await kod(soxtaBaza({ fakt: {} }), soxtaTarmoq({}), { kalit: null }).studiya(holatYasa());
    expect(y.chiqishMos).toBeNull();
  });

  it('varaqada 1688 tanlovi yoʻq — olchov_yoq sabab bilan; fakt oʻqilmasa talablar null', async () => {
    const n = await kod(soxtaBaza({ fakt: null }), soxtaTarmoq({})).studiya(holatYasa([{ id: 100, offerId: null }]));
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
