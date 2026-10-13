/**
 * Tayyor savollar (nazoratchi, 2026-10-13: «Nima soʻrashni oʻzi taklif
 * qiladi»). Har birining javobi BAZADA bor — Gemini ishlamasa ham (limit,
 * toʻlov yoqilmagan) bosilgan savolga aniq javob chiqadi, "javob bera
 * olmayman" emas. Ism savolida bosilgan savol ism deb yozilmaydi.
 */

import { describe, expect, it } from 'vitest';
import {
  bilimJavobi, suhbatTurn, tayyorJavob, TEZ_SAVOLLAR, tezSavollar,
  type SuhbatBogliqliklari, type YolHolati,
} from '@selleros/shared';

const H: YolHolati = { javoblar: { qiziqish: ['kanstovar'], byudjet: 80_000_000 }, natijalar: {} };
/** Haqiqiy savol idlari (`miqdor:<tovar>`). */
const HAQIQIY_ID: Record<string, string> = { miqdor: 'miqdor:100' };

const hammasi = Object.entries(TEZ_SAVOLLAR)
  .flatMap(([id, royxat]) => royxat.map((s) => ({ id: HAQIQIY_ID[id] ?? id, ...s })));

describe('tayyor savollar — javobi bazada bor', () => {
  it.each(hammasi.map((s) => [s.id, s.uz]))('«%s» savolida «%s»', (id, uz) => {
    expect(uz.trim().endsWith('?')).toBe(true);
    expect(tayyorJavob(uz) ?? bilimJavobi(uz, id, H)).toBeTruthy();
  });

  it.each(hammasi.filter((s) => s.ru).map((s) => [s.id, s.ru!]))('ruscha: «%s» savolida «%s» — ruscha javob', (_id, ru) => {
    expect(ru.trim().endsWith('?')).toBe(true);
    expect(tayyorJavob(ru)?.ru).toBeTruthy();
  });

  it('`miqdor:123` kabi idlar — oldingi qismi boʻyicha; notanish savolda — yoʻq', () => {
    expect(tezSavollar('miqdor:123')).toBe(TEZ_SAVOLLAR['miqdor']);
    expect(tezSavollar('notanish')).toEqual([]);
  });

  it('miqdor javobi faqat miqdor savolida — byudjetda pul maslahatini egallamaydi', () => {
    expect(bilimJavobi('Nechta olishim kerak?', 'miqdor:100', H)).toMatch(/Birinchi partiya miqdori/);
    expect(bilimJavobi('Nechta olishim kerak?', 'byudjet', H) ?? '').not.toMatch(/Birinchi partiya miqdori/);
  });
});

function soxtaBaza(boshlangich: YolHolati | null) {
  let holat = boshlangich;
  const jurnal: unknown[] = [];
  const rpc = async <T>(nom: string, arg: unknown): Promise<T | null> => {
    const a = arg as Record<string, unknown>;
    if (nom === 'so_suhbat_oqi') return { holat, qadam: null, xabarlar: jurnal } as T;
    if (nom === 'so_suhbat_yoz') {
      jurnal.push(...(a.p_xabarlar as unknown[]));
      holat = a.p_holat as YolHolati;
      return { yozildi: (a.p_xabarlar as unknown[]).length } as T;
    }
    return null;
  };
  return { rpc, holat: () => holat };
}

const KOD = new Proxy({}, {
  get: () => async () => { throw new Error('bu testda kod chaqirilmasligi kerak'); },
}) as SuhbatBogliqliklari['kod'];

describe('ism va telefon savolida bosilgan tayyor savol — javob, ism/telefon emas', () => {
  it.each(TEZ_SAVOLLAR['ism']!.flatMap((s) => [s.uz, s.ru!]))('ism: «%s»', async (matn) => {
    const b = soxtaBaza(null);
    const r = await suhbatTurn({ rpc: b.rpc, kod: KOD }, 'tok', { savolId: 'ism', matn });
    expect(r.xato).toBeUndefined();
    expect(b.holat()?.javoblar['ism']).toBeUndefined();
    expect(r.xabarlar.at(-1)!.javob).toEqual({ erkin: true, manba: 'baza' });
  });

  it.each(TEZ_SAVOLLAR['telefon']!.flatMap((s) => [s.uz, s.ru!]))('telefon: «%s»', async (matn) => {
    const b = soxtaBaza({ javoblar: { ism: 'Aziz Karimov' }, natijalar: {} });
    const r = await suhbatTurn({ rpc: b.rpc, kod: KOD }, 'tok', { savolId: 'telefon', matn });
    expect(r.xato).toBeUndefined();
    expect(b.holat()?.javoblar['telefon']).toBeUndefined();
    expect(r.xabarlar.at(-1)!.matn).toMatch(/Gemini/);
  });
});
