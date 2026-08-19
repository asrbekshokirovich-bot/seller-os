import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { yopiqBrend } from '@selleros/shared';
import type { TovarHolati } from '@selleros/shared';

/**
 * Darvoza testi (QOIDALAR.md, 5-bo'lim): tuzoq ro'yxatining 100% i
 * to'g'ri baholanishi shart.
 *
 * `kirish` — bazadan olingan HAQIQIY o'lchovlar. Ya'ni bu filtrning
 * mantiqini emas, uni haqiqiy bozor ma'lumotida sinaydi.
 *
 * NIMANI ISBOTLAYDI: filtr real o'lchovlarda kutilgan javobni beradi va
 * keyingi o'zgarish uni jimgina buzsa — CI yiqiladi.
 *
 * NIMANI ISBOTLAMAYDI: ro'yxatning o'zi to'g'riligini. Nomzodlarni
 * topgan belgi (do'kon nomi = brend nomi) filtrdan mustaqil, lekin
 * "yangi brend" chegarasi (200 sharh) shu ma'lumotdan chiqarilgan.
 * Pilot ma'lumoti kelganda qayta tekshiriladi — BACKLOG.md.
 */

interface Element {
  external_id: number;
  expect: string | null;
  dokon: string;
  kirish: Omit<TovarHolati, 'productId'>;
  note: string;
}

const fayl = join(import.meta.dirname, 'fixtures/traps.json');
const { elementlar } = JSON.parse(readFileSync(fayl, 'utf8')) as { elementlar: Element[] };

/**
 * Ataylab oʻlchanmaydigan maydonlar va sababi.
 *
 * Maydon shu roʻyxatda boʻlmasa, u haqiqiy maʼlumotda kamida bir marta
 * oʻlchanishi SHART. Doim `null` boʻlgan maydon — oʻlik kirish: filtr
 * unga suyansa, jimgina hech qachon ishlamaydi va buni hech kim sezmaydi.
 * Aynan shu ikki marta sodir boʻlgan (`shopOfficial`, `sellersCount`).
 *
 * Bu yerga qoʻshish — ONGLI qaror, sababi bilan. Jimlik emas.
 */
const OLCHANMAYDI: Record<string, string> = {
  shopOfficial:
    'Uzum bu maydonni toʻldirmaydi — 63 113 doʻkonda 0 ta `true` ' +
    '(2026-08-19). Hech bir filtr bunga suyanmaydi.',
  sellersCount:
    'Doʻkonlar aro tovar moslash hali yoʻq. 1-tuzoq undan voz kechdi: ' +
    'brend nomda + brendni <=2 doʻkon sotadi → tovarni ham <=2 sotadi.',
  sellersStableDays:
    'Bazada 3 kunlik tarix bor, 60 kun kerak (16-oktabr). Filtr yoshni ' +
    'sharh orqali isbotlaydi — `brandReviews`.',
};

describe('tuzoq ro\'yxati — darvoza', () => {
  it('har bir kirish maydoni haqiqatan oʻlchanadi', () => {
    // Bu test ikki marta sodir boʻlgan xatoni ushlaydi: filtr hech
    // qachon kelmaydigan maydonga suyanadi, natijada jimgina oʻladi.
    const maydonlar = new Set<string>();
    for (const e of elementlar) for (const k of Object.keys(e.kirish)) maydonlar.add(k);

    for (const maydon of maydonlar) {
      if (maydon in OLCHANMAYDI) continue;
      const olchangan = elementlar.some(
        (e) => (e.kirish as Record<string, unknown>)[maydon] !== null,
      );
      expect(
        olchangan,
        `"${maydon}" 53 qatorning birortasida ham oʻlchanmagan. ` +
          'Yo quvurni tuzating, yo OLCHANMAYDI ga sababi bilan qoʻshing.',
      ).toBe(true);
    }
  });

  it('filtr kamida bir marta bayroq qoʻyadi', () => {
    // Hamma qatorga `null` qaytaradigan filtr ham "100%" olishi mumkin
    // edi — agar roʻyxatda tuzoq boʻlmasa. Bu shuni taqiqlaydi.
    const bayroqli = elementlar.filter((e) => e.expect !== null && e.expect !== 'baholanmadi');
    expect(bayroqli.length, 'roʻyxatda bironta ham haqiqiy tuzoq yoʻq').toBeGreaterThan(0);

    const yondi = bayroqli.some((e) => {
      const r = yopiqBrend({ productId: e.external_id, ...e.kirish });
      return r !== null && r.kind !== 'baholanmadi';
    });
    expect(yondi, 'filtr haqiqiy maʼlumotda hech qachon ishlamadi').toBe(true);
  });

  it('ro\'yxat bo\'sh emas va 20 dan ko\'p', () => {
    expect(elementlar.length).toBeGreaterThanOrEqual(20);
  });

  it('salbiy misollar bor', () => {
    // Faqat tuzoqlardan iborat ro'yxatda hammaga "tuzoq" deydigan filtr
    // ham 100% olardi.
    const salbiy = elementlar.filter((e) => e.expect === null);
    expect(salbiy.length).toBeGreaterThanOrEqual(5);
  });

  it.each(elementlar.map((e) => [`${e.dokon} #${e.external_id}`, e] as const))(
    '%s',
    (_nom, e) => {
      const natija = yopiqBrend({ productId: e.external_id, ...e.kirish });
      const olindi =
        natija === null ? null
        : natija.kind === 'baholanmadi' ? 'baholanmadi'
        : natija.kind;
      expect(olindi, e.note).toBe(e.expect);
    },
  );
});
