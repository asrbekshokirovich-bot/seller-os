/**
 * Xitoydan topish — Apify provayderi (`crawleast/1688-image-search-scraper`).
 *
 * Tarmoqqa chiqmaydi: `fetch` soxta. Fikstura — aktorning OCHIQ TAʼRIFI
 * (dataset sxemasi namunalari) va Apify API hujjatidan
 * (`fixtures/apify-1688-rasm.json`), jonli javob emas; jonli javob
 * kelgach u bilan almashtiriladi (fikstura ichida yozilgan).
 *
 * Eng muhim tekshiruvlar:
 *   - provayder xatosi BOʻSH ROʻYXAT emas, `xato` bilan qaytadi
 *     (QOIDALAR §8: "qidirilmadi" va "topilmadi" bir xil koʻrinmasin);
 *   - RISK_CONTROL / oʻqilmagan kartalar — xato, javob emas; 0 ta — javob;
 *   - asinxron: boshlash → runId; tekshirish → kutilmoqda / tugadi / xato;
 *   - kalit soʻrov sarlavhasida, natijada hech qayerda yoʻq.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  apifyKartaniOqi, apifyNatijalarniOqi, apifyRunniOqi, limitTekshir, qidiruvniBoshlashSorovi, rasmManzili, rasmTuri,
  rasmYuklovchi, runHolatiSorovi, runNatijasiSorovi, tashxisMatni, xitoyLimitHolati, xitoyQidiruvniBoshla,
  xitoyQidiruvniTekshir, yurishByudjetiUsd, APIFY_AKTOR, APIFY_MANZIL, XITOY_LIMIT, XITOY_RASM_MAX, XITOY_SAHIFA_MAX,
  type XitoyTovar,
} from '@selleros/shared';

const F = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/apify-1688-rasm.json'), 'utf8')) as {
  boshlandi: unknown; ishlayapti: unknown; tugadi: unknown; yiqildi: unknown;
  kalit_notogri: unknown; balans: unknown; natijalar: unknown[]; natijalar_base64: unknown[];
};
/** JONLI javob (2026-09-25): 1688 JPEG rasmi → 20 ta natija, parse qilingan shakl. */
const JONLI = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/jonli-1688-natija.json'), 'utf8')) as {
  jami: number; tashlandi: number; natijalar: XitoyTovar[];
};
/** WebP sehrli baytlari: RIFF....WEBP */
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20]);
const UZUM_A = 'https://images.uzum.uz/aaa/t_product_540_high.jpg';
const UZUM_B = 'https://images.uzum.uz/bbb/original.jpg';
const UZUM_C = 'https://images.uzum.uz/ccc/original.jpg';
const KARTA = (i: number) => ((F.natijalar[0] as { results: unknown[] }).results[i]) as Record<string, unknown>;

describe('soʻrov yasash', () => {
  it('boshlash: POST aktor manziliga, Bearer kalit, kiritma va shift', () => {
    const s = qidiruvniBoshlashSorovi('KALIT', [{ url: UZUM_A }, { url: UZUM_B }], { sahifaHajmi: 99 });
    expect(s.url).toBe(`${APIFY_MANZIL}/acts/${APIFY_AKTOR}/runs`);
    expect(s.init.method).toBe('POST');
    expect(s.init.headers.Authorization).toBe('Bearer KALIT');
    expect(s.init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(s.init.body ?? '{}')).toEqual({
      imageUrls: [UZUM_A, UZUM_B], maxImages: 2, maxResultsPerImage: XITOY_SAHIFA_MAX,
      enrichDetails: false, maxTotalChargeUsd: yurishByudjetiUsd(2),
    });
  });
  it('bir yurishga koʻpi bilan XITOY_RASM_MAX rasm', () => {
    const rasmlar = Array.from({ length: 15 }, (_, i) => ({ url: `https://images.uzum.uz/k${i}/original.jpg` }));
    const b = JSON.parse(qidiruvniBoshlashSorovi('K', rasmlar).init.body ?? '{}') as { imageUrls: string[]; maxImages: number };
    expect(b.imageUrls.length).toBe(XITOY_RASM_MAX);
    expect(b.maxImages).toBe(XITOY_RASM_MAX);
  });
  it('yuklangan rasm base64 bilan (`imagesBase64`), yuklanmagani URL bilan — aralash', () => {
    const y = { base64: 'QUJD', fileName: '0123456789abcdef.webp', sha256: '0123456789abcdef'.repeat(4), bayt: 3, tur: 'webp' as const };
    const b = JSON.parse(qidiruvniBoshlashSorovi('K', [{ url: UZUM_A, yuklangan: y }, { url: UZUM_B, yuklangan: null }]).init.body ?? '{}') as Record<string, unknown>;
    expect(b.imagesBase64).toEqual([{ base64: 'QUJD', fileName: '0123456789abcdef.webp' }]);
    expect(b.imageUrls).toEqual([UZUM_B]);
    expect(b.maxImages).toBe(2);
    const faqat = JSON.parse(qidiruvniBoshlashSorovi('K', [{ url: UZUM_A, yuklangan: y }]).init.body ?? '{}') as Record<string, unknown>;
    expect(faqat.imageUrls).toBeUndefined();
  });
  it('shift: aktor narxidan, eng kami 0.04', () => {
    expect(yurishByudjetiUsd(1)).toBe(0.04);
    expect(yurishByudjetiUsd(10)).toBe(0.07);
  });
  it('holat va natija manzillari', () => {
    expect(runHolatiSorovi('K', 'HG7ML7M8z78YcAPEB').url).toBe(`${APIFY_MANZIL}/actor-runs/HG7ML7M8z78YcAPEB`);
    expect(runNatijasiSorovi('K', 'HG7ML7M8z78YcAPEB').url).toBe(`${APIFY_MANZIL}/actor-runs/HG7ML7M8z78YcAPEB/dataset/items?clean=true`);
    expect(runHolatiSorovi('K', 'x').init.headers.Authorization).toBe('Bearer K');
  });
});

describe('apifyRunniOqi', () => {
  it('yurish javobi: id va holat', () => {
    expect(apifyRunniOqi(F.boshlandi)).toEqual({ ok: true, runId: 'HG7ML7M8z78YcAPEB', holat: 'READY' });
    expect(apifyRunniOqi(F.tugadi)).toMatchObject({ ok: true, holat: 'SUCCEEDED' });
  });
  it('xato: hujjatdagi turlar oʻzbekcha maʼno bilan', () => {
    const k = apifyRunniOqi(F.kalit_notogri);
    expect(k.ok).toBe(false);
    if (!k.ok) expect(k.sabab).toMatch(/Apify kaliti notoʻgʻri.*invalid-token/);
    const b = apifyRunniOqi(F.balans);
    if (!b.ok) expect(b.sabab).toMatch(/balans/);
    expect(apifyRunniOqi({}).ok).toBe(false);
    expect(apifyRunniOqi(null).ok).toBe(false);
  });
});

describe('apifyKartaniOqi', () => {
  it('sxema namunasi: hamma maydon provayderdan, hech narsa hisoblanmaydi', () => {
    const t = apifyKartaniOqi(KARTA(0));
    expect(t).toMatchObject({
      sourceId: '802207808750', narxYuan: 5, moq: 1, reyting: 4.15, manba: '1688',
      manzil: 'https://detail.1688.com/offer/802207808750.html', oxshashlikOrni: 2, dropshipNarxYuan: 3.5,
      buyurtmalar: 88655, zavod: true, superZavod: false, sotuvchi: '浦江爱贝特宠物用品有限公司', joy: '浙江 浦江县', dokonYili: 12,
    });
    expect(t!.rasmUrl!.startsWith('https://cbu01.alicdn.com/')).toBe(true);
  });
  it('kelmagan maydonlar null — nol EMAS; protokolsiz rasm https bilan', () => {
    const t = apifyKartaniOqi(KARTA(1));
    expect(t).toMatchObject({ sourceId: '692120494348', moq: 1000, reyting: null, buyurtmalar: null, dokonYili: null, dropshipNarxYuan: null, superZavod: true, zavod: false });
    expect(t!.rasmUrl).toBe('https://cbu01.alicdn.com/img/ibank/O1CN01mlPQyb1rrmigLQq2W_!!2219127385685-0-cib.jpg');
    const { imageUrl: _r, ...rasmsiz } = KARTA(0);
    void _r;
    expect(apifyKartaniOqi(rasmsiz)?.rasmUrl).toBeNull();
    const { moq: _m, ...moqsiz } = KARTA(0);
    void _m;
    expect(apifyKartaniOqi(moqsiz)?.moq).toBeNull();
  });
  it('narxi yoki manzili yoʻq/notoʻgʻri karta oʻqilmaydi (null)', () => {
    expect(apifyKartaniOqi({ ...KARTA(0), priceYuan: '' })).toBeNull();
    expect(apifyKartaniOqi({ ...KARTA(0), offerId: undefined })).toBeNull();
    expect(apifyKartaniOqi({ ...KARTA(0), detailUrl: 'javascript:alert(1)' })).toBeNull();
    expect(apifyKartaniOqi('matn')).toBeNull();
  });
});

describe('apifyNatijalarniOqi', () => {
  it('har rasm uchun bitta natija; oʻxshashlik oʻrni boʻyicha tartib; SUMMARY eʼtiborsiz', () => {
    const n = apifyNatijalarniOqi(F.natijalar);
    expect(n.ok).toBe(true);
    if (!n.ok) return;
    expect(n.rasmlar.map((r) => r.rasmUrl)).toEqual([UZUM_A, UZUM_B, UZUM_C]);
    const a = n.rasmlar[0]!;
    expect(a.xato).toBeNull();
    expect(a.jami).toBe(2);
    expect(a.natijalar.map((t) => t.sourceId)).toEqual(['692120494348', '802207808750']);
    expect(a.tashlandi).toBe(0);
  });
  it('RISK_CONTROL — XATO (qidiruv boʻlmadi), boʻsh javob emas', () => {
    const n = apifyNatijalarniOqi(F.natijalar);
    if (!n.ok) throw new Error(n.sabab);
    const b = n.rasmlar[1]!;
    expect(b.natijalar).toEqual([]);
    expect(b.xato).toMatch(/RISK_CONTROL.*risk control/);
  });
  it('0 ta natija (status OK) — JAVOB: xato null, jami 0', () => {
    const n = apifyNatijalarniOqi(F.natijalar);
    if (!n.ok) throw new Error(n.sabab);
    expect(n.rasmlar[2]).toMatchObject({ rasmUrl: UZUM_C, natijalar: [], jami: 0, xato: null });
  });
  it('bir rasm uchun bir nechta surat — OXIRGISI olinadi', () => {
    const eski = { type: 'imageResult', queryImage: { url: UZUM_A }, status: 'OK', matchCount: 0, results: [] };
    const n = apifyNatijalarniOqi([eski, F.natijalar[0]]);
    if (!n.ok) throw new Error(n.sabab);
    expect(n.rasmlar.length).toBe(1);
    expect(n.rasmlar[0]!.natijalar.length).toBe(2);
  });
  it('kartalar keldi, birortasi oʻqilmadi — XATO, "topilmadi" emas', () => {
    const q = { type: 'imageResult', queryImage: { url: UZUM_A }, status: 'OK', matchCount: 2, results: [{ ...KARTA(0), priceYuan: '' }, { offerId: 1 }] };
    const n = apifyNatijalarniOqi([q]);
    if (!n.ok) throw new Error(n.sabab);
    expect(n.rasmlar[0]).toMatchObject({ natijalar: [], tashlandi: 2, xato: expect.stringMatching(/2 ta karta berdi, birortasi oʻqilmadi/) });
  });
  it('tashxis: aktorning rasm haqidagi maʼlumoti qatorda, matn sifatida ham', () => {
    const n = apifyNatijalarniOqi(F.natijalar);
    if (!n.ok) throw new Error(n.sabab);
    expect(n.rasmlar[1]!.tashxis).toEqual({ manba: 'url', tur: 'webp', bayt: 233896, yuklash: 'direct' });
    expect(tashxisMatni(n.rasmlar[1]!.tashxis)).toBe('rasm: webp, 228 KB, yuklandi: direct, URL');
    expect(tashxisMatni({ manba: 'base64', tur: null, bayt: null, yuklash: 'none' })).toBe('rasm: yuklanmadi, biz yubordik');
    expect(tashxisMatni(null)).toBeNull();
  });
  it('base64 kirish: natija SHA-256 prefiksi yoki img-N tartibi bilan bogʻlanadi', () => {
    const kirish = [{ url: UZUM_A, sha256: '0123456789abcdef' + 'ff'.repeat(24) }, { url: UZUM_B, sha256: null }];
    const n = apifyNatijalarniOqi(F.natijalar_base64, kirish);
    if (!n.ok) throw new Error(n.sabab);
    expect(n.rasmlar.map((r) => [r.rasmUrl, r.natijalar.length, r.tashxis?.manba])).toEqual([[UZUM_A, 1, 'base64'], [UZUM_B, 0, 'base64']]);
    // kirish berilmasa — id bilan qoladi, yoʻqolmaydi
    const n2 = apifyNatijalarniOqi(F.natijalar_base64);
    if (!n2.ok) throw new Error(n2.sabab);
    expect(n2.rasmlar.map((r) => r.rasmUrl)).toEqual(['img-0', 'img-1']);
  });
  it('roʻyxat emas — xato (provayder xatosi boʻlsa uning matni)', () => {
    expect(apifyNatijalarniOqi(F.balans)).toMatchObject({ ok: false, sabab: expect.stringMatching(/balans/) });
    expect(apifyNatijalarniOqi({ data: [] }).ok).toBe(false);
    expect(apifyNatijalarniOqi(null).ok).toBe(false);
  });
});

/** Soxta fetch: URL boʻlagi boʻyicha javob (tartib muhim). */
function soxtaFetch(javoblar: Array<[string, unknown | (() => never)]>) {
  const chaqiruvlar: Array<{ url: string; init: RequestInit | undefined }> = [];
  const f = (async (kirish: string | URL | Request, init?: RequestInit) => {
    const url = String(kirish);
    chaqiruvlar.push({ url, init });
    const juft = javoblar.find(([k]) => url.includes(k));
    if (!juft) throw new Error(`kutilmagan URL: ${url}`);
    const j = juft[1];
    if (typeof j === 'function') (j as () => never)();
    return new Response(JSON.stringify(j), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { fetch: f, chaqiruvlar };
}

describe('rasmYuklovchi', () => {
  it('yuklaydi: base64, SHA-256, tur sehrli baytlardan (Uzum .jpg — aslida webp)', async () => {
    const f = (async () => new Response(WEBP, { status: 200, headers: { 'Content-Type': 'image/webp' } })) as unknown as typeof fetch;
    const y = await rasmYuklovchi(f)(UZUM_A);
    expect(y).not.toBeNull();
    expect(y!.tur).toBe('webp');
    expect(y!.bayt).toBe(WEBP.length);
    expect(y!.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(y!.fileName).toBe(`${y!.sha256.slice(0, 16)}.webp`);
    expect(atob(y!.base64).length).toBe(WEBP.length);
    expect(rasmTuri(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    expect(rasmTuri(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBe('png');
    expect(rasmTuri(new Uint8Array([1, 2, 3]))).toBeNull();
  });
  it('HTTP xato, boʻsh, juda katta, tarmoq yiqilishi — null (URL bilan davom etiladi)', async () => {
    const r = (x: Response) => (async () => x) as unknown as typeof fetch;
    expect(await rasmYuklovchi(r(new Response('x', { status: 404 })))(UZUM_A)).toBeNull();
    expect(await rasmYuklovchi(r(new Response(new Uint8Array(0), { status: 200 })))(UZUM_A)).toBeNull();
    expect(await rasmYuklovchi(r(new Response(new Uint8Array(20), { status: 200 })), { maxBayt: 10 })(UZUM_A)).toBeNull();
    const yiqil = (async () => { throw new Error('ECONNRESET'); }) as unknown as typeof fetch;
    expect(await rasmYuklovchi(yiqil)(UZUM_A)).toBeNull();
  });
});

describe('xitoyQidiruvniBoshla', () => {
  it('yukla berilsa: rasm avval yuklanadi, base64 bilan ketadi, SHA qaytadi; yuklanmasa URL bilan', async () => {
    const s = soxtaFetch([['/runs', F.boshlandi]]);
    const yukla = async (url: string) => (url === UZUM_A
      ? { base64: 'QUJD', fileName: 'x.webp', sha256: 'ab'.repeat(32), bayt: 3, tur: 'webp' as const }
      : null);
    const b = await xitoyQidiruvniBoshla({ kalit: 'K', fetch: s.fetch }, { rasmlar: [UZUM_A, UZUM_B], yukla });
    expect(b.runId).toBe('HG7ML7M8z78YcAPEB');
    if (b.runId === null) return;
    expect(b.rasmlar).toEqual([
      { url: UZUM_A, usul: 'base64', sha256: 'ab'.repeat(32), tur: 'webp', bayt: 3 },
      { url: UZUM_B, usul: 'url', sha256: null, tur: null, bayt: null },
    ]);
    const tana = JSON.parse(String(s.chaqiruvlar[0]!.init?.body)) as Record<string, unknown>;
    expect(tana.imagesBase64).toEqual([{ base64: 'QUJD', fileName: 'x.webp' }]);
    expect(tana.imageUrls).toEqual([UZUM_B]);
  });
  it('yurish boshlanadi: runId qaytadi, bitta POST, kalit faqat sarlavhada', async () => {
    const s = soxtaFetch([['/runs', F.boshlandi]]);
    const b = await xitoyQidiruvniBoshla({ kalit: 'KALIT', fetch: s.fetch }, { rasmlar: [UZUM_A, UZUM_B] });
    expect(b).toEqual({ runId: 'HG7ML7M8z78YcAPEB', xato: null, rasmlar: [
      { url: UZUM_A, usul: 'url', sha256: null, tur: null, bayt: null },
      { url: UZUM_B, usul: 'url', sha256: null, tur: null, bayt: null },
    ] });
    expect(s.chaqiruvlar.length).toBe(1);
    expect((s.chaqiruvlar[0]!.init?.headers as Record<string, string>).Authorization).toBe('Bearer KALIT');
    expect(JSON.parse(String(s.chaqiruvlar[0]!.init?.body)).imageUrls).toEqual([UZUM_A, UZUM_B]);
    expect(JSON.stringify(b)).not.toContain('KALIT');
  });
  it('kalit yoʻq / rasm yoʻq / notoʻgʻri rasm — soʻrov yuborilmaydi', async () => {
    const s = soxtaFetch([]);
    expect((await xitoyQidiruvniBoshla({ kalit: '', fetch: s.fetch }, { rasmlar: [UZUM_A] })).xato).toMatch(/kalit/);
    expect((await xitoyQidiruvniBoshla({ kalit: 'K', fetch: s.fetch }, { rasmlar: [] })).xato).toMatch(/rasm/);
    expect((await xitoyQidiruvniBoshla({ kalit: 'K', fetch: s.fetch }, { rasmlar: ['rasm.jpg'] })).xato).toMatch(/rasm/);
    expect(s.chaqiruvlar.length).toBe(0);
  });
  it('provayder xatosi (balans) va tarmoq xatosi — xato matni, otmaydi', async () => {
    const s1 = soxtaFetch([['/runs', F.balans]]);
    expect((await xitoyQidiruvniBoshla({ kalit: 'K', fetch: s1.fetch }, { rasmlar: [UZUM_A] })).xato).toMatch(/balans/);
    const s2 = soxtaFetch([['/runs', () => { throw new Error('ECONNRESET'); }]]);
    expect((await xitoyQidiruvniBoshla({ kalit: 'K', fetch: s2.fetch }, { rasmlar: [UZUM_A] })).xato).toMatch(/ulanib boʻlmadi.*ECONNRESET/);
    const s3 = soxtaFetch([['/runs', F.yiqildi]]);
    expect((await xitoyQidiruvniBoshla({ kalit: 'K', fetch: s3.fetch }, { rasmlar: [UZUM_A] })).xato).toMatch(/FAILED/);
  });
});

describe('xitoyQidiruvniTekshir', () => {
  it('RUNNING — kutilmoqda, natija soʻralmaydi', async () => {
    const s = soxtaFetch([['/dataset/items', F.natijalar], ['/actor-runs/', F.ishlayapti]]);
    expect(await xitoyQidiruvniTekshir({ kalit: 'K', fetch: s.fetch }, 'HG7ML7M8z78YcAPEB')).toEqual({ holat: 'kutilmoqda', runHolati: 'RUNNING' });
    expect(s.chaqiruvlar.length).toBe(1);
  });
  it('SUCCEEDED, base64 kirish — natija kirish roʻyxati bilan bogʻlanadi', async () => {
    const s = soxtaFetch([['/dataset/items', F.natijalar_base64], ['/actor-runs/', F.tugadi]]);
    const t = await xitoyQidiruvniTekshir({ kalit: 'K', fetch: s.fetch }, 'x', [{ url: UZUM_A, sha256: '0123456789abcdef' + '00'.repeat(24) }, { url: UZUM_B }]);
    if (t.holat !== 'tugadi') throw new Error(t.holat);
    expect(t.rasmlar.map((r) => r.rasmUrl)).toEqual([UZUM_A, UZUM_B]);
  });
  it('SUCCEEDED — natija oʻqiladi, har rasm uchun', async () => {
    const s = soxtaFetch([['/dataset/items', F.natijalar], ['/actor-runs/', F.tugadi]]);
    const t = await xitoyQidiruvniTekshir({ kalit: 'K', fetch: s.fetch }, 'HG7ML7M8z78YcAPEB');
    expect(t.holat).toBe('tugadi');
    if (t.holat === 'tugadi') {
      expect(t.rasmlar.length).toBe(3);
      expect(t.rasmlar[0]!.natijalar.length).toBe(2);
    }
    expect(s.chaqiruvlar.map((c) => c.url.includes('dataset') ? 'natija' : 'holat')).toEqual(['holat', 'natija']);
  });
  it('FAILED — xato, yakuniy holat bilan; tarmoq yiqilsa — xato, holat null', async () => {
    const s = soxtaFetch([['/actor-runs/', F.yiqildi]]);
    expect(await xitoyQidiruvniTekshir({ kalit: 'K', fetch: s.fetch }, 'x')).toMatchObject({ holat: 'xato', runHolati: 'FAILED', xato: expect.stringMatching(/FAILED/) });
    const s2 = soxtaFetch([['/actor-runs/', () => { throw new Error('ETIMEDOUT'); }]]);
    expect(await xitoyQidiruvniTekshir({ kalit: 'K', fetch: s2.fetch }, 'x')).toMatchObject({ holat: 'xato', runHolati: null });
    const s3 = soxtaFetch([['/actor-runs/', F.kalit_notogri]]);
    expect(await xitoyQidiruvniTekshir({ kalit: 'K', fetch: s3.fetch }, 'x')).toMatchObject({ holat: 'xato', xato: expect.stringMatching(/kaliti/) });
  });
});

describe('rasmManzili — tashqaridan kelgan rasm manzili', () => {
  it('faqat http(s), 2048 gacha; boshqasi null', () => {
    expect(rasmManzili(UZUM_A)).toBe(UZUM_A);
    expect(rasmManzili(' ' + UZUM_B + ' ')).toBe(UZUM_B);
    expect(rasmManzili('ftp://x/y.jpg')).toBeNull();
    expect(rasmManzili('javascript:alert(1)')).toBeNull();
    expect(rasmManzili('rasm.jpg')).toBeNull();
    expect(rasmManzili('https://a/' + 'x'.repeat(2048))).toBeNull();
    expect(rasmManzili(12)).toBeNull();
    expect(rasmManzili('')).toBeNull();
  });
});

describe('limit — oʻlchov, nol emas', () => {
  it('limitTekshir: shaxsiy va umumiy shift, sabab bilan', () => {
    expect(limitTekshir(0, 'bepul')).toMatchObject({ ruxsat: true, qolgan: 3, limit: 3, sabab: null, umumiy: null });
    expect(limitTekshir(3, 'bepul')).toMatchObject({ ruxsat: false, qolgan: 0, sabab: 'shaxsiy' });
    expect(limitTekshir(0, 'pro', XITOY_LIMIT.jamiKunlik)).toMatchObject({ ruxsat: false, sabab: 'umumiy', umumiy: { ishlatilgan: XITOY_LIMIT.jamiKunlik, limit: XITOY_LIMIT.jamiKunlik } });
    expect(limitTekshir(1, 'pro', 5)).toMatchObject({ ruxsat: true, qolgan: 29, sabab: null, umumiy: { ishlatilgan: 5, limit: XITOY_LIMIT.jamiKunlik } });
  });
  it('xitoyLimitHolati: null → 503; xato → 401; sanoqsiz → 503; toʻgʻri → oʻlchov', () => {
    expect(xitoyLimitHolati(null, 'bepul')).toMatchObject({ ok: false, kod: 503 });
    expect(xitoyLimitHolati({ xato: 'sessiya topilmadi' }, 'bepul')).toMatchObject({ ok: false, kod: 401, xato: 'sessiya topilmadi' });
    expect(xitoyLimitHolati({}, 'bepul')).toMatchObject({ ok: false, kod: 503 });
    expect(xitoyLimitHolati({ soni: 2 }, 'bepul')).toMatchObject({ ok: true, ishlatilgan: 2, jami: null, ruxsat: true, natija: { ruxsat: true, qolgan: 1 } });
    expect(xitoyLimitHolati({ soni: 3, jami: 10, ruxsat: false }, 'bepul')).toMatchObject({ ok: true, ruxsat: false, jami: 10 });
  });
});

describe('JONLI javob (2026-09-25) — haqiqiy oʻlchov, hujjat namunasi emas', () => {
  it('20 ta natija, oʻxshashlik tartibida, har birida XitoyTovar majburiy maydonlari', () => {
    expect(JONLI.jami).toBe(20);
    expect(JONLI.tashlandi).toBe(0);
    expect(JONLI.natijalar.length).toBe(20);
    expect(JONLI.natijalar.map((t) => t.oxshashlikOrni)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    for (const t of JONLI.natijalar) {
      expect(typeof t.sourceId).toBe('string');
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.narxYuan).toBeGreaterThan(0);
      expect(t.manba).toBe('1688');
      expect(t.manzil).toMatch(/^https:\/\/detail\.1688\.com\//);
      expect(t.rasmUrl).toMatch(/^https:\/\//);
      expect(t.moq === null || t.moq > 0).toBe(true);
      expect(typeof t.zavod === 'boolean' || t.zavod === null).toBe(true);
    }
    // Jonli maʼlumotda oʻlchangan: buyurtmalar soni ham, zavod belgisi ham keladi.
    expect(JONLI.natijalar.some((t) => typeof t.buyurtmalar === 'number' && t.buyurtmalar > 0)).toBe(true);
    expect(JONLI.natijalar.some((t) => t.zavod === true)).toBe(true);
  });
});
