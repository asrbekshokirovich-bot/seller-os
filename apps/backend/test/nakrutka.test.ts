/**
 * 4-tuzoq: sunʼiy sotuv.
 *
 * Signal — sharh soni sotuvga mos emas. Ikki tomonga ham shubhali:
 * sharh juda kam boʻlsa sotuv shishirilgan boʻlishi mumkin, juda
 * koʻp boʻlsa sharh sotib olingan boʻlishi mumkin.
 */

import { describe, expect, it } from 'vitest';
import { nakrutka, THRESHOLDS } from '@selleros/shared';

const F = THRESHOLDS.fakeSales;
const kir = (u: Partial<Parameters<typeof nakrutka>[0]> = {}) =>
  ({ soldUnits30d: 1000, sotuvManbasi: 'olchandi' as const, reviews: 80, rating: 4.8, ...u });

describe('nakrutka', () => {
  it('kutilgan nisbatda bayroq YOʻQ', () => {
    // 1000 sotuv × 8% = 80 sharh — aynan kutilgani.
    expect(nakrutka(kir())).toBeNull();
  });

  it('chidamlilik oraligʻi ichida bayroq yoʻq', () => {
    const kutilgan = 1000 * F.expectedReviewRate;
    expect(nakrutka(kir({ reviews: Math.round(kutilgan * (F.reviewRateTolerance - 0.1)) })))
      .toBeNull();
    expect(nakrutka(kir({ reviews: Math.ceil(kutilgan / (F.reviewRateTolerance - 0.1)) })))
      .toBeNull();
  });

  it('sharh JUDA KAM — bayroq', () => {
    const n = nakrutka(kir({ soldUnits30d: 100_000, reviews: 50 }));
    expect(n?.kind).toBe('fake_sales');
    expect(n).toMatchObject({ severity: 'warn' });
    expect((n as { reason: string }).reason).toMatch(/juda kam/);
  });

  it('sharh JUDA KOʻP — bayroq (shu 30 kundagi sharh bilan)', () => {
    const n = nakrutka(kir({ soldUnits30d: 100, reviews: 5000, sharhOsishi30k: 5000 }));
    expect(n?.kind).toBe('fake_sales');
    expect((n as { reason: string }).reason).toMatch(/juda koʻp/);
    expect((n as { evidence: Record<string, unknown> }).evidence.sharh30kunlik).toBe(true);
  });

  describe('sharh va sotuv bir oynadan (nazoratchi katalogi, 2026-10-13)', () => {
    it('JAMI sharh 30 kunlik sotuvdan "juda koʻp" deb hisoblanmaydi — baholanmadi', () => {
      // Bref: 30 kunda 128 dona, jami 1 233 sharh — yillab yigʻilgan.
      // Eski qoida "sharhlar sotib olingan, reytingga ishonmang" derdi.
      const n = nakrutka(kir({ soldUnits30d: 128, reviews: 1233, rating: 4.9 }));
      expect(n).toMatchObject({ kind: 'baholanmadi' });
      expect((n as { missing: string[] }).missing[0]).toMatch(/30 kunlik sharh oʻsishi/);
    });

    it('shu 30 kundagi sharh normal boʻlsa — bayroq yoʻq', () => {
      // Oʻsha Bref: 30 kunda 21 ta yangi sharh, kutilgani ~10.
      expect(nakrutka(kir({ soldUnits30d: 128, reviews: 1233, sharhOsishi30k: 21 }))).toBeNull();
    });

    it('jami sharh ham juda kam boʻlsa — bayroq, matn "jami" deydi', () => {
      // Qoldiq 800 000 → 0: qoldiq farqi "sotuv" deydi, sharh yoʻq.
      const n = nakrutka(kir({ soldUnits30d: 2291, reviews: 0, rating: null }));
      expect(n?.kind).toBe('fake_sales');
      const sabab = (n as { reason: string }).reason;
      expect(sabab).toMatch(/juda kam/);
      expect(sabab).toMatch(/tovarda jami 0 ta sharh/);
      expect(sabab).toMatch(/qoldiqni olib qoʻygan/);
      expect((n as { evidence: Record<string, unknown> }).evidence.sharh30kunlik).toBe(false);
    });

    it('oyna berilsa "juda kam" ham shu oyna bilan', () => {
      const n = nakrutka(kir({ soldUnits30d: 8026, reviews: 18, sharhOsishi30k: 16 }));
      expect((n as { reason: string }).reason).toMatch(/shu davrda 16 ta yangi sharh/);
    });

    it('kichik sotuvda nisbat baholanmaydi — "odatda ~0 sharh" yoʻq', () => {
      // Katalogdagi sumka: 30 kunda 53 dona, jami 86 sharh — eski qoida
      // "sharh juda koʻp" derdi; 2 dona / 12 sharhda "odatda ~0".
      for (const [sotuv, sharh] of [[53, 86], [2, 12], [99, 0]] as const) {
        const n = nakrutka(kir({ soldUnits30d: sotuv, reviews: sharh, sharhOsishi30k: sharh }));
        expect(n, `${sotuv} dona / ${sharh} sharh`).toMatchObject({ kind: 'baholanmadi' });
        expect((n as { missing: string[] }).missing[0]).toMatch(/kamida 100 dona/);
      }
    });
  });

  it('dalil raqamlari bayroq bilan birga keladi', () => {
    // Sababsiz bayroq ishonch bermaydi (TUZOQLAR.md, "Natija shakli").
    const n = nakrutka(kir({ soldUnits30d: 100_000, reviews: 50 }));
    expect((n as { evidence: Record<string, number> }).evidence).toMatchObject({
      sotuv30k: 100_000, sharh: 50,
    });
  });

  describe('baholanmadi', () => {
    it('sotuv yoki sharh yoʻq boʻlsa', () => {
      expect(nakrutka(kir({ soldUnits30d: null }))).toMatchObject({ kind: 'baholanmadi' });
      expect(nakrutka(kir({ reviews: null }))).toMatchObject({ kind: 'baholanmadi' });
    });

    it('NOL sotuvda nisbat hisoblanmaydi — "tuzoq yoʻq" emas', () => {
      // Boʻluvchi nol. `null` qaytarsak "tekshirdim, toza" degan
      // daʼvo boʻlardi.
      const n = nakrutka(kir({ soldUnits30d: 0 }));
      expect(n).toMatchObject({ kind: 'baholanmadi' });
    });

    it('reyting yoʻq boʻlsa ham baholaydi — u majburiy emas', () => {
      expect(nakrutka(kir({ rating: null }))).toBeNull();
    });

    it('TAXMINIY sotuvda baholanmaydi', () => {
      // Nisbat sotuvga boʻlinadi. Sotuv raqami tasdiqlanmagan boʻlsa
      // bayroq ham tasdiqlanmagan boʻladi. Oʻlchandi: taxminiy sotuv
      // bilan 6 012 tovardan 3 806 tasi bayroq olardi — 63.3%.
      const n = nakrutka(kir({ soldUnits30d: 100_000, reviews: 50, sotuvManbasi: 'taxmin' }));
      expect(n).toMatchObject({ kind: 'baholanmadi' });
      expect((n as { missing: string[] }).missing[0]).toMatch(/taxmin/);
    });

    it('manba berilmasa — eskicha ishlaydi', () => {
      // `/tuzoqlar` uchi manbani uzatmaydi. Filtr uni talab qilsa,
      // ishlab turgan uch jimgina "baholanmadi" ga oʻtib qolardi.
      expect(nakrutka({ soldUnits30d: 100_000, reviews: 50, rating: null })?.kind)
        .toBe('fake_sales');
    });
  });
});
