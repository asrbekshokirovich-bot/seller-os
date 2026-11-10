import { describe, expect, it } from 'vitest';
import { ishHolatiniYoz, ishlarimOqi, ishNomi, muddatiOtgan } from '../src/index.js';

/** Soxta baza: chaqiruvlarni yozadi, oldindan berilgan javobni qaytaradi. */
function soxta(javob: unknown) {
  const chaqiruvlar: Array<{ nom: string; arg: unknown }> = [];
  const rpc = async <T>(nom: string, arg: unknown): Promise<T | null> => {
    chaqiruvlar.push({ nom, arg });
    return javob as T | null;
  };
  return { rpc, chaqiruvlar };
}

const ISH = { id: 7, tur: 'kutyapman', sabab: 'YATT ochilishi', muddat: null, holat: 'ochiq', yaratildi: '2026-11-06T06:00:00Z', yopildi: null };

describe('«Ishlarim» (ikkinchi koʻrik, K2)', () => {
  it('roʻyxat: token bilan soʻraladi, notoʻgʻri qatorlar tashlanadi; baza yoʻq / sessiya yoʻq — xato', async () => {
    const b = soxta({ ishlar: [ISH, { id: 'x' }, null, { ...ISH, id: 8, tur: 'tekshirish' }, { ...ISH, id: 9, holat: 'boshqa' }] });
    expect(await ishlarimOqi(b, 'tok')).toEqual({ ishlar: [ISH] });
    expect(b.chaqiruvlar).toEqual([{ nom: 'so_ochiq_ishlar', arg: { p_token: 'tok' } }]);
    expect(await ishlarimOqi(soxta(null), 'tok')).toEqual({ xato: 'baza javob bermadi' });
    expect(await ishlarimOqi(soxta({ xato: 'sessiya topilmadi' }), 'tok')).toEqual({ xato: 'sessiya topilmadi' });
    expect(await ishlarimOqi(soxta({}), 'tok')).toEqual({ ishlar: [] });
  });

  it('belgi: faqat butun musbat id va boolean; begona ish — 404, sessiya — 401, baza — 503', async () => {
    const b = soxta({ ok: true });
    expect(await ishHolatiniYoz(b, 'tok', { id: 7, bajarildi: true })).toEqual({ ok: true });
    expect(b.chaqiruvlar).toEqual([{ nom: 'so_ochiq_ish_holat', arg: { p_token: 'tok', p_id: 7, p_bajarildi: true } }]);
    for (const yomon of [null, {}, { id: '7', bajarildi: true }, { id: 7.5, bajarildi: true }, { id: 0, bajarildi: true }, { id: -3, bajarildi: false }, { id: 7, bajarildi: 'ha' }, { id: 2 ** 60, bajarildi: true }]) {
      const s = soxta({ ok: true });
      expect(await ishHolatiniYoz(s, 'tok', yomon)).toEqual({ xato: 'id va bajarildi kerak', status: 400 });
      expect(s.chaqiruvlar).toEqual([]);
    }
    expect(await ishHolatiniYoz(soxta({ xato: 'ish topilmadi' }), 'tok', { id: 9, bajarildi: false })).toEqual({ xato: 'ish topilmadi', status: 404 });
    expect(await ishHolatiniYoz(soxta({ xato: 'sessiya topilmadi' }), 'tok', { id: 9, bajarildi: false })).toEqual({ xato: 'sessiya topilmadi', status: 401 });
    expect(await ishHolatiniYoz(soxta(null), 'tok', { id: 9, bajarildi: false })).toEqual({ xato: 'baza javob bermadi', status: 503 });
  });

  it('muddati oʻtgan: faqat ochiq, muddatli va bugundan oldingi', () => {
    expect(muddatiOtgan({ holat: 'ochiq', muddat: '2026-11-05' }, '2026-11-06')).toBe(true);
    expect(muddatiOtgan({ holat: 'ochiq', muddat: '2026-11-06' }, '2026-11-06')).toBe(false);
    expect(muddatiOtgan({ holat: 'yopiq', muddat: '2026-11-01' }, '2026-11-06')).toBe(false);
    expect(muddatiOtgan({ holat: 'ochiq', muddat: null }, '2026-11-06')).toBe(false);
  });

  it('nom: birinchi harf katta, eski oy yozuvi odamcha; qavslar bittalab', () => {
    expect(ishNomi('yuk kelishi')).toBe('Yuk kelishi');
    expect(ishNomi('yuk kelishi (2-partiya)')).toBe('Yuk kelishi (2-partiya)');
    expect(ishNomi('ijtimoiy soliq (2026-08)')).toBe('Ijtimoiy soliq (2026-yil avgust)');
    expect(ishNomi('ijtimoiy soliq (2026-yil oktyabr)')).toBe('Ijtimoiy soliq (2026-yil oktyabr)');
    expect(ishNomi('omborga topshirish (taymslot kutilmoqda) (2-partiya)')).toBe('Omborga topshirish (taymslot kutilmoqda) (2-partiya)');
    expect(ishNomi('Uzum ombor qabuli')).toBe('Uzum ombor qabuli');
    expect(ishNomi('(qavs)')).toBe('(qavs)');
  });

  it('nom ruscha: tanishlari tarjima, davr va partiya ham; notanishi oʻzbekcha qoladi', () => {
    expect(ishNomi('yuk kelishi (3-partiya)', 'ru')).toBe('Прибытие груза (партия 3)');
    expect(ishNomi('bank hisobi ochilishi (YATTdan keyin)', 'ru')).toBe('Открытие банковского счёта (после открытия ИП)');
    expect(ishNomi('ijtimoiy soliq (2026-08)', 'ru')).toBe('Социальный налог (август 2026)');
    expect(ishNomi('ijtimoiy soliq (2026-yil oktyabr)', 'ru')).toBe('Социальный налог (октябрь 2026)');
    expect(ishNomi('aylanma soligʻi hisoboti (2026-yil 4-chorak)', 'ru')).toBe('Отчёт по налогу с оборота (4-й квартал 2026)');
    expect(ishNomi('studiya: oʻz suratlari (yetmadi)', 'ru')).toBe('Студия: свои фото (не хватило)');
    expect(ishNomi('omborga topshirish (taymslot kutilmoqda)', 'ru')).toBe('Сдача на склад (ждём таймслот)');
    expect(ishNomi('yangi ish turi', 'ru')).toBe('Yangi ish turi');
  });

  it('chat yozadigan har bir nomning ruschasi bor (yangi nom qoʻshilsa — shu yerga ham)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const kod = readFileSync(join(import.meta.dirname, '../../../apps/backend/src/suhbat-kod.ts'), 'utf8');
    // `tur: 'kutyapman' | 'tolov'` li yozuvlarning qatʼiy `sabab` matnlari (tekshirish — roʻyxatga chiqmaydi).
    const nomlar = [...kod.matchAll(/tur: '(?:kutyapman|tolov)', sabab: '([^']+)'/gu)].map((m) => m[1]!);
    nomlar.push(...[...kod.matchAll(/qosh\('[a-z_]+', (?:'[^']*'|null), '([^']+)'\)/gu)].map((m) => m[1]!));
    expect(nomlar.length).toBeGreaterThanOrEqual(12);
    for (const n of nomlar) expect(ishNomi(n, 'ru'), n).toMatch(/^[А-ЯЁ]/u);
    expect(ishNomi('ijtimoiy soliq (2026-yil iyun)', 'ru')).toMatch(/^Социальный/u);
    expect(ishNomi('aylanma soligʻi hisoboti (2026-yil iyun)', 'ru')).toMatch(/^Отчёт/u);
  });
});
