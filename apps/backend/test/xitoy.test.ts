/**
 * Xitoydan topish — TMAPI provayderi.
 *
 * Tarmoqqa chiqmaydi: `fetch` soxta. Fikstura — provayder
 * HUJJATIDAGI namuna (`fixtures/tmapi-1688-rasm.json`), jonli javob
 * emas; jonli javob kelgach u bilan almashtiriladi (fikstura ichida
 * yozilgan).
 *
 * Eng muhim tekshiruvlar:
 *   - provayder xatosi BOʻSH ROʻYXAT emas, `xato` bilan qaytadi
 *     (QOIDALAR §8: "qidirilmadi" va "topilmadi" bir xil koʻrinmasin);
 *   - Uzum rasmi avval oʻgiriladi, Ali rasmi toʻgʻridan-toʻgʻri;
 *   - kalit soʻrov sarlavhasida, javobda hech qayerda yoʻq.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  aliRasmimi, rasmOgirishSorovi, rasmQidiruvSorovi, tmapiJavobiniOqi, tmapiOgirishniOqi,
  tmapiTovarniOqi, xitoyQidir, TMAPI_MANZIL, XITOY_SAHIFA_MAX,
} from '@selleros/shared';

const F = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/tmapi-1688-rasm.json'), 'utf8')) as {
  muvaffaqiyat: { data: { items: unknown[] } } & Record<string, unknown>;
  ogirish: unknown;
  kalitsiz: unknown;
  balans: unknown;
};

const UZUM_RASM = 'https://images.uzum.uz/crt4mqc0u44g6jopp250/t_product_540_high.jpg';
const ALI_RASM = 'https://cbu01.alicdn.com/img/ibank/O1CN01Lnbnos2LkORtHhOVp_!!3367999730-0-cib.jpg';

describe('aliRasmimi', () => {
  it('alicdn — ha; oʻgirilgan yoʻl — ha; Uzum CDN — yoʻq; buzuq — yoʻq', () => {
    expect(aliRasmimi(ALI_RASM)).toBe(true);
    expect(aliRasmimi('/search/imgextra/1692942898123_q7ftzxs9.jpg')).toBe(true);
    expect(aliRasmimi(UZUM_RASM)).toBe(false);
    expect(aliRasmimi('rasm')).toBe(false);
  });
});

describe('soʻrov yasash', () => {
  it('qidiruv: GET, apikey sarlavhada, img_url kodlangan, page_size 20 dan oshmaydi', () => {
    const s = rasmQidiruvSorovi('KALIT', ALI_RASM, { sahifaHajmi: 99, tartib: 'sales' });
    expect(s.init.method).toBe('GET');
    expect(s.init.headers.apikey).toBe('KALIT');
    expect(s.url.startsWith(`${TMAPI_MANZIL}/1688/search/image?`)).toBe(true);
    const p = new URL(s.url).searchParams;
    expect(p.get('img_url')).toBe(ALI_RASM);
    expect(p.get('page_size')).toBe(String(XITOY_SAHIFA_MAX));
    expect(p.get('sort')).toBe('sales');
    expect(p.get('page')).toBe('1');
  });
  it('oʻgirish: POST JSON, url va search_api_endpoint', () => {
    const s = rasmOgirishSorovi('KALIT', UZUM_RASM);
    expect(s.init.method).toBe('POST');
    expect(s.init.headers.apikey).toBe('KALIT');
    expect(s.init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(s.init.body ?? '{}')).toEqual({ url: UZUM_RASM, search_api_endpoint: '/search/image' });
  });
});

describe('tmapiTovarniOqi', () => {
  it('hujjat namunasi: hamma maydon provayderdan, hech narsa hisoblanmaydi', () => {
    const t = tmapiTovarniOqi(F.muvaffaqiyat.data.items[0]);
    expect(t).not.toBeNull();
    expect(t).toMatchObject({
      sourceId: '983093623752',
      narxYuan: 27,
      moq: 1,
      reyting: 4.5,
      manba: '1688',
      manzil: 'https://detail.1688.com/offer/983093623752.html',
      sotilgan: 5160,
      buyurtmalar: 111,
      zavod: true,
      sotuvchi: '广东瑜佃供应链管理有限公司',
      joy: '广东 东莞市',
      dokonYili: 5,
      takrorXaridFoizi: 54,
      reklama: true,
    });
    expect(t!.rasmUrl.startsWith('https://cbu01.alicdn.com/')).toBe(true);
  });
  it('sotuvi 0 boʻlgan element: nol JAVOB, null emas', () => {
    const t = tmapiTovarniOqi(F.muvaffaqiyat.data.items[1]);
    expect(t?.sotilgan).toBe(0);
    expect(t?.buyurtmalar).toBe(0);
    expect(t?.reklama).toBe(false);
  });
  it('narxi yoʻq element oʻqilmaydi (null), boʻsh narx nolga aylanmaydi', () => {
    const asl = F.muvaffaqiyat.data.items[0] as Record<string, unknown>;
    expect(tmapiTovarniOqi({ ...asl, price: '', price_info: {} })).toBeNull();
    expect(tmapiTovarniOqi({ ...asl, item_id: undefined })).toBeNull();
    expect(tmapiTovarniOqi('matn')).toBeNull();
  });
});

describe('tmapiJavobiniOqi', () => {
  it('200: roʻyxat, jami va tashlanganlar soni', () => {
    const n = tmapiJavobiniOqi(F.muvaffaqiyat);
    expect(n.ok).toBe(true);
    if (!n.ok) return;
    expect(n.natijalar.length).toBe(2);
    expect(n.jami).toBe(680);
    expect(n.tashlandi).toBe(0);
  });
  it('oʻqib boʻlmagan element sanaladi, jimgina tushib qolmaydi', () => {
    const j = { code: 200, data: { total_count: 3, items: [...F.muvaffaqiyat.data.items, { item_id: 1 }] } };
    const n = tmapiJavobiniOqi(j);
    if (!n.ok) throw new Error(n.sabab);
    expect(n.natijalar.length).toBe(2);
    expect(n.tashlandi).toBe(1);
  });
  it('439 — balans; 4011 — kalit; matn hujjatdagi maʼnoni beradi', () => {
    const b = tmapiJavobiniOqi(F.balans);
    expect(b.ok).toBe(false);
    if (!b.ok) { expect(b.kod).toBe(439); expect(b.sabab).toMatch(/balans|obuna/); }
    const k = tmapiJavobiniOqi(F.kalitsiz);
    if (!k.ok) { expect(k.kod).toBe(4011); expect(k.sabab).toMatch(/kalit/); }
  });
  it('JSON emas / boʻsh — xato, boʻsh roʻyxat emas', () => {
    expect(tmapiJavobiniOqi(null).ok).toBe(false);
    expect(tmapiJavobiniOqi({}).ok).toBe(false);
    expect(tmapiJavobiniOqi('x').ok).toBe(false);
  });
  it('oʻgirish javobi: yoʻl keladi; kelmasa xato', () => {
    const y = tmapiOgirishniOqi(F.ogirish);
    expect(y).toEqual({ ok: true, yol: '/search/imgextra/1692942898123_q7ftzxs9.jpg' });
    expect(tmapiOgirishniOqi({ code: 200, data: {} }).ok).toBe(false);
    expect(tmapiOgirishniOqi(F.balans).ok).toBe(false);
  });
});

/** Soxta fetch: chaqiruvlarni yozib boradi, URL boʻyicha javob beradi. */
function soxtaFetch(javoblar: Record<string, unknown | (() => never)>) {
  const chaqiruvlar: Array<{ url: string; init: RequestInit | undefined }> = [];
  const f = (async (kirish: string | URL | Request, init?: RequestInit) => {
    const url = String(kirish);
    chaqiruvlar.push({ url, init });
    const kalit = Object.keys(javoblar).find((k) => url.includes(k));
    if (!kalit) throw new Error(`kutilmagan URL: ${url}`);
    const j = javoblar[kalit];
    if (typeof j === 'function') (j as () => never)();
    return new Response(JSON.stringify(j), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { fetch: f, chaqiruvlar };
}

describe('xitoyQidir', () => {
  it('Uzum rasmi: avval oʻgirish, keyin qidiruv; kalit ikkala sarlavhada', async () => {
    const s = soxtaFetch({ 'convert_url': F.ogirish, 'search/image?': F.muvaffaqiyat });
    const n = await xitoyQidir({ kalit: 'KALIT', fetch: s.fetch }, { rasmUrl: UZUM_RASM });
    expect(n.xato).toBeNull();
    expect(n.natijalar.length).toBe(2);
    expect(n.manba).toBe('1688');
    expect(n.jami).toBe(680);
    expect(n.ogirilganRasm).toBe('/search/imgextra/1692942898123_q7ftzxs9.jpg');
    expect(s.chaqiruvlar.map((c) => c.url.includes('convert_url') ? 'ogirish' : 'qidiruv')).toEqual(['ogirish', 'qidiruv']);
    for (const c of s.chaqiruvlar) expect((c.init?.headers as Record<string, string>).apikey).toBe('KALIT');
    expect(new URL(s.chaqiruvlar[1]!.url).searchParams.get('img_url')).toBe('/search/imgextra/1692942898123_q7ftzxs9.jpg');
    // Kalit natijaga sizmaydi.
    expect(JSON.stringify(n)).not.toContain('KALIT');
  });
  it('Ali rasmi: oʻgirishsiz, bitta soʻrov', async () => {
    const s = soxtaFetch({ 'search/image?': F.muvaffaqiyat });
    const n = await xitoyQidir({ kalit: 'K', fetch: s.fetch }, { rasmUrl: ALI_RASM, tartib: 'sales' });
    expect(n.xato).toBeNull();
    expect(s.chaqiruvlar.length).toBe(1);
    expect(n.ogirilganRasm).toBeNull();
  });
  it('oʻgirish yiqilsa qidiruv YUBORILMAYDI va sabab aytiladi', async () => {
    const s = soxtaFetch({ 'convert_url': F.balans, 'search/image?': F.muvaffaqiyat });
    const n = await xitoyQidir({ kalit: 'K', fetch: s.fetch }, { rasmUrl: UZUM_RASM });
    expect(n.natijalar).toEqual([]);
    expect(n.xato).toMatch(/oʻgirib boʻlmadi.*balans/);
    expect(s.chaqiruvlar.length).toBe(1);
  });
  it('provayder 439 — xato bilan, boʻsh roʻyxat "topilmadi" degani EMAS', async () => {
    const s = soxtaFetch({ 'search/image?': F.balans });
    const n = await xitoyQidir({ kalit: 'K', fetch: s.fetch }, { rasmUrl: ALI_RASM });
    expect(n.natijalar).toEqual([]);
    expect(n.manba).toBeNull();
    expect(n.xato).toMatch(/balans|obuna/);
  });
  it('0 ta natija — JAVOB: xato null, jami 0', async () => {
    const s = soxtaFetch({ 'search/image?': { code: 200, msg: 'success', data: { total_count: 0, items: [] } } });
    const n = await xitoyQidir({ kalit: 'K', fetch: s.fetch }, { rasmUrl: ALI_RASM });
    expect(n.xato).toBeNull();
    expect(n.natijalar).toEqual([]);
    expect(n.jami).toBe(0);
    expect(n.manba).toBe('1688');
  });
  it('tarmoq yiqilsa — xato matni, otmaydi', async () => {
    const s = soxtaFetch({ 'search/image?': () => { throw new Error('ECONNRESET'); } });
    const n = await xitoyQidir({ kalit: 'K', fetch: s.fetch }, { rasmUrl: ALI_RASM });
    expect(n.xato).toMatch(/ulanib boʻlmadi.*ECONNRESET/);
  });
  it('kalit yoki rasm yoʻq — soʻrov yuborilmaydi', async () => {
    const s = soxtaFetch({});
    expect((await xitoyQidir({ kalit: '', fetch: s.fetch }, { rasmUrl: ALI_RASM })).xato).toMatch(/kalit/);
    expect((await xitoyQidir({ kalit: 'K', fetch: s.fetch }, { rasmUrl: '' })).xato).toMatch(/rasm/);
    expect(s.chaqiruvlar.length).toBe(0);
  });
});
