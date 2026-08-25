/**
 * 2-tuzoq (mavsumiy) va 8-tuzoq (hype).
 *
 * Ikkalasi ham bugun HAQIQIY maʼlumotda ishlamaydi: mavsumiylik
 * jadvali boʻsh, oʻsish tarixi uch kunlik. Shuning uchun testlar
 * ayniqsa muhim — ular filtr maʼlumot kelganda toʻgʻri ishlashini
 * qulflab qoʻyadi va "baholanmadi" holatini ham tekshiradi.
 */

import { describe, expect, it } from 'vitest';
import { hype, mavsumiy, THRESHOLDS } from '@selleros/shared';

const M = THRESHOLDS.seasonal;
const H = THRESHOLDS.hype;

/** Isitgich: kuz-qishda cho'qqi, yozda past. */
const ISITGICH = [0.4, 0.4, 0.5, 0.6, 0.6, 0.5, 0.5, 0.7, 1.4, 1.9, 2.0, 1.5];
const TEKIS = Array(12).fill(1.0);

describe('mavsumiy', () => {
  it('mavsumdan tashqari — bayroq', () => {
    // Iyun (6-oy), koeffitsient 0.5 < 0.7.
    const n = mavsumiy({ seasonality: ISITGICH, oy: 6 });
    expect(n?.kind).toBe('seasonal');
    expect((n as { reason: string }).reason).toMatch(/mavsumi emas/);
  });

  it('mavsum TUGASHIGA oz qolganda — bayroq', () => {
    // Dekabr (12): koeffitsient 1.5 yuqori, lekin yanvarda 0.4 ga
    // tushadi. Aynan shu payt grafik eng chiroyli koʻrinadi.
    const n = mavsumiy({ seasonality: ISITGICH, oy: 12 });
    expect(n?.kind).toBe('seasonal');
    expect((n as { reason: string }).reason).toMatch(/tugashiga/);
    expect((n as unknown as { evidence: { haftalar: number } }).evidence.haftalar)
      .toBeLessThanOrEqual(M.warnWeeksLeft);
  });

  it('mavsum boshida — bayroq yoʻq', () => {
    // Sentyabr (9): koeffitsient 1.4, tushishgacha 4 oy bor.
    expect(mavsumiy({ seasonality: ISITGICH, oy: 9 })).toBeNull();
  });

  it('mavsumsiz tovarda bayroq yoʻq', () => {
    expect(mavsumiy({ seasonality: TEKIS, oy: 3 })).toBeNull();
  });

  it('YARIM jadval qabul qilinmaydi', () => {
    // 8 ta sondan chiqqan "tugashiga 3 hafta" xulosasi notoʻgʻri
    // boʻladi va buni hech narsa koʻrsatmaydi.
    expect(mavsumiy({ seasonality: [1, 1, 1, 1, 1, 1, 1, 1], oy: 3 }))
      .toMatchObject({ kind: 'baholanmadi' });
  });

  it('jadval yoʻq — baholanmadi (bugungi holat)', () => {
    expect(mavsumiy({ seasonality: null, oy: 8 }))
      .toMatchObject({ kind: 'baholanmadi' });
  });

  it('notoʻgʻri oy — baholanmadi', () => {
    expect(mavsumiy({ seasonality: ISITGICH, oy: 0 }))
      .toMatchObject({ kind: 'baholanmadi', missing: ['oy'] });
  });
});

describe('hype', () => {
  it('yosh VA oʻsish yangi — bayroq', () => {
    const n = hype({ productAgeDays: 20, yangiSotuvUlushi: 0.9 });
    expect(n?.kind).toBe('hype');
    expect(n).toMatchObject({ severity: 'warn' });
    expect((n as { reason: string }).reason).toMatch(/kichik sinov partiyasi/);
  });

  it('yosh, lekin oʻsish barqaror — bayroq yoʻq', () => {
    // Shunchaki yangi tovar, trend emas.
    expect(hype({ productAgeDays: 20, yangiSotuvUlushi: 0.3 })).toBeNull();
  });

  it('oʻsyapti, lekin ESKI — bayroq yoʻq', () => {
    // Barqaror talab, trend emas.
    expect(hype({ productAgeDays: 400, yangiSotuvUlushi: 0.9 })).toBeNull();
  });

  it('yosh chegarasi hujjatdagi bilan bir xil', () => {
    const chegara = H.youngWeeks * 7;
    expect(hype({ productAgeDays: chegara, yangiSotuvUlushi: 0.9 })?.kind).toBe('hype');
    expect(hype({ productAgeDays: chegara + 1, yangiSotuvUlushi: 0.9 })).toBeNull();
  });

  it('tarix yoʻq — baholanmadi (bugungi holat)', () => {
    expect(hype({ productAgeDays: 20, yangiSotuvUlushi: null }))
      .toMatchObject({ kind: 'baholanmadi', missing: ['yangiSotuvUlushi'] });
  });
});
