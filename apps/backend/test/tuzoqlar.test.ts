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

describe('tuzoq ro\'yxati — darvoza', () => {
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
