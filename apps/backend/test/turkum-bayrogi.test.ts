/**
 * Turkum bayrogʻi tovarlarga tarqatilishi.
 *
 * NEGA BU TEST BOR. 6-tuzoq (monopoliya) TURKUM darajasida
 * hisoblanadi, `selleros.product_flags` esa TOVAR boʻyicha yoziladi.
 * Ikkisi bogʻlanmagani uchun bayroq jadvalgacha hech qachon yetib
 * kelmagan: `turkumniTekshir` yozilgan, testi bor, `/tuzoqlar` uchida
 * koʻrinadi — va `product_flags` da `monopoly` turi BITTA ham yoʻq
 * edi (oʻlchandi 2026-09-02). QOIDALAR.md 8-boʻlimidagi naqsh.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { TurkumHolati } from '@selleros/shared';
import { turkumBayroqlariniTarqat } from '../src/tahlil.js';

/** Repo ildizi — bu fayl `apps/backend/test/` da yotadi. */
const ILDIZ = join(import.meta.dirname, '../../..');

/** Chegaradan OʻTADIGAN turkum: top-3 ulushi 88%, qamrov toʻliq. */
const MONOPOL: TurkumHolati = {
  categoryId: 12,
  name: 'Daftar',
  top3SharePercent: 88,
  measuredSellers: 435,
  totalSellers: 435,
};

/** Chegaradan oʻtmaydigan turkum: ulush 30%. */
const TOZA: TurkumHolati = {
  categoryId: 34,
  name: 'Ilgaklar va tutqichlar',
  top3SharePercent: 30,
  measuredSellers: 811,
  totalSellers: 811,
};

const XARITA = [
  { productId: 101, categoryId: 12 },
  { productId: 102, categoryId: 12 },
  { productId: 201, categoryId: 34 },
];

describe('turkumBayroqlariniTarqat', () => {
  it('monopol turkumdagi HAR tovarga bayroq qoʻyiladi', () => {
    const natija = turkumBayroqlariniTarqat([MONOPOL, TOZA], XARITA);
    expect(natija.map((b) => b.productId).sort()).toEqual([101, 102]);
    expect(natija.every((b) => b.kind === 'monopoly')).toBe(true);
  });

  it('toza turkumdagi tovar bayroq olmaydi', () => {
    const natija = turkumBayroqlariniTarqat([MONOPOL, TOZA], XARITA);
    expect(natija.some((b) => b.productId === 201)).toBe(false);
  });

  it('bayroq TURKUMNIKI boʻlib qoladi — tovar ayblanmaydi', () => {
    // Matn ham, dalil ham turkum haqida. Tovarga koʻchirilganda
    // ular oʻzgarmasligi kerak: aks holda "bu tovar monopol" degan
    // maʼno paydo boʻlardi va u notoʻgʻri.
    const [b] = turkumBayroqlariniTarqat([MONOPOL], XARITA);
    expect(b!.reason).toContain('Kirish qiyin');
    expect(b!.evidence).toMatchObject({
      top3_ulush_foiz: 88,
      turkumdagi_sotuvchi: 435,
    });
    expect(b!.severity).toBe('warn');
  });

  it('bayroqli turkum yoʻq boʻlsa boʻsh roʻyxat', () => {
    expect(turkumBayroqlariniTarqat([TOZA], XARITA)).toEqual([]);
  });

  it('xaritada yoʻq turkum tashlab ketiladi, yiqilmaydi', () => {
    // Xarita va turkum roʻyxati ikki xil uchdan keladi va bir-biriga
    // toʻliq mos boʻlishi shart emas.
    const natija = turkumBayroqlariniTarqat([MONOPOL], [
      { productId: 999, categoryId: 77 },
    ]);
    expect(natija).toEqual([]);
  });

  it('baholanmagan turkum bayroq bermaydi', () => {
    // Qamrov yetarli emas — filtr "baholanmadi" deydi, "monopol
    // emas" demaydi. Ikkalasi bir xil koʻrinmasligi kerak.
    const kam: TurkumHolati = {
      categoryId: 55, name: 'Qoplamalar',
      top3SharePercent: 76, measuredSellers: 10, totalSellers: 2052,
    };
    expect(turkumBayroqlariniTarqat([kam], [
      { productId: 1, categoryId: 55 },
    ])).toEqual([]);
  });
});

/**
 * IKKALA UCH HAM ulangan boʻlsin — qorovul.
 *
 * NEGA. Bu mantiq ikki joyda yashaydi: `apps/backend/src/app.ts`
 * (Fastify) va `supabase/functions/selleros/index.ts` (Edge Function).
 * JADVAL faqat ikkinchisini chaqiradi —
 * `.github/workflows/skreyper.yml` `functions/v1/selleros/
 * bayroqlarni-hisobla` ga `curl` yuboradi. Fastify serveri hech
 * qayerda ishlamaydi.
 *
 * 2026-09-02 da monopoliya bayrogʻi faqat `app.ts` ga ulandi. Natija:
 * supurish yashil tugadi (`tekshirildi` noldan katta, demak qorovul
 * qadam ham oʻtdi), bayroqlar 17:35 da qayta hisoblandi — va jadvalda
 * `monopoly` turi BITTA ham yoʻq edi. Kod bor, test yashil, jadval
 * boʻsh (QOIDALAR.md, 8-boʻlim).
 *
 * Bu test matnni oʻqiydi, chunki Edge Function Deno uchun yozilgan va
 * uni shu yerdan import qilib boʻlmaydi.
 */
describe('monopoliya bayrogʻi ikkala uchda ham ulangan', () => {
  const UCHLAR: [string, string][] = [
    ['Fastify', 'apps/backend/src/app.ts'],
    ['Edge Function', 'supabase/functions/selleros/index.ts'],
  ];

  it.each(UCHLAR)('%s — turkum bayroqlari olinadi', (_nom, yol) => {
    const kod = readFileSync(join(ILDIZ, yol), 'utf8');
    expect(kod).toMatch(/so_turkum_tovarlari/);
    expect(kod).toMatch(/turkumBayroqlariniTarqat/);
  });

  it.each(UCHLAR)('%s — ular `so_bayroq_yoz` ga BORADI', (_nom, yol) => {
    // Hisoblab, keyin yozuvga qoʻshmaslik — aynan shu xato boʻlgan.
    const kod = readFileSync(join(ILDIZ, yol), 'utf8');
    expect(kod).toMatch(/p_bayroqlar:\s*\[[^\]]*monopoliyaBayroqlari/);
  });

  it.each(UCHLAR)('%s — javobda soni koʻrinadi', (_nom, yol) => {
    // Nol boʻlsa jimgina qolmasin.
    const kod = readFileSync(join(ILDIZ, yol), 'utf8');
    expect(kod).toMatch(/monopoliya:\s*monopoliyaBayroqlari\.length/);
  });
});
