/**
 * 2-qadam qidiruvi va aralash roʻyxat — server kodi (`suhbat-kod.ts`).
 *
 * Nazoratchi (2026-10-13): mijoz "faqat sumka, krossovka, quloqchin sotsam
 * boʻlarkan" deb oʻylamasin — qiziqishi boʻyicha va boshqa sohalardan
 * aralash roʻyxat, istalgan tovar nomini yozib qidirish.
 */

import { describe, expect, it } from 'vitest';
import type { NomzodJavobi, TurkumNomzodi, YolHolati } from '@selleros/shared';
import { suhbatKodHarakatlari } from '../src/suhbat-kod.js';

const nomzod = (categoryId: number, name: string, talabOlchovi: number): TurkumNomzodi => ({
  categoryId, name, talabOlchovi, sotuvchiSoni: 120, top3Ulush: 35, optimalKirishSom: null,
  talablar: { markirovka: false, sertifikat: false, haftalar: null }, mavsumiylik: null,
});

const KESH: NomzodJavobi = {
  hisoblandi: '2026-10-13T06:00:00Z', yoshi_soat: 2,
  royxat: [
    nomzod(1, 'Sumkalar', 1000), nomzod(2, 'Krossovkalar', 900), nomzod(3, 'Simsiz quloqchinlar', 800),
    nomzod(4, 'Ruchkalar', 400), nomzod(5, 'Bloknotlar', 350), nomzod(6, 'Atirlar', 700), nomzod(7, 'Qalamlar', 100),
  ],
};

function kod(javob: unknown) {
  const chaqiruvlar: string[] = [];
  const rpc = async <T>(nom: string): Promise<T | null> => { chaqiruvlar.push(nom); return javob as T | null; };
  return { k: suhbatKodHarakatlari(rpc, () => ({ bayroqlar: [], baholanmadi: [] }), () => 10), chaqiruvlar };
}

const H: YolHolati = { javoblar: {}, natijalar: {} };

describe('yonalishlar — qiziqish bilan', () => {
  it('tanlagan sohasi (kanstovar) roʻyxatga kiradi, boshqa sohalar ham bor', async () => {
    const { k } = kod(KESH);
    const n = await k.yonalishlar({ budgetUzs: null, interest: ['kanstovar'] }, H) as { royxat: Array<{ name: string; soha: string }>; qiziqishlar: string[] };
    expect(n.qiziqishlar).toEqual(['kanstovar']);
    const nomlar = n.royxat.map((y) => y.name);
    expect(nomlar).toEqual(expect.arrayContaining(['Ruchkalar', 'Bloknotlar']));
    expect(new Set(n.royxat.map((y) => y.soha)).size).toBeGreaterThan(1);
  });
});

describe('yonalishQidiruv', () => {
  it('soʻz boʻyicha — eng yuqori baholi mosi; soz va n doim qaytadi', async () => {
    const { k } = kod(KESH);
    const n = await k.yonalishQidiruv('ruchka', 3, { budgetUzs: null }, H) as Record<string, unknown>;
    expect(n).toMatchObject({ soz: 'ruchka', n: 3, olchov_yoq: false, nomzod_soni: 7, topildi: 1 });
    expect((n.royxat as Array<{ name: string }>).map((y) => y.name)).toEqual(['Ruchkalar']);
  });

  it('soha nomi boʻyicha ("kanstovar") — shu sohaning hammasi, bali boʻyicha', async () => {
    const { k } = kod(KESH);
    const n = await k.yonalishQidiruv('kanstovar', 1, { budgetUzs: null }, H) as { royxat: Array<{ name: string }> };
    expect(n.royxat.map((y) => y.name)).toEqual(['Ruchkalar', 'Bloknotlar', 'Qalamlar']);
  });

  it('topilmasa — boʻsh roʻyxat (taxmin yoʻq); baza javob bermasa — sababi, soz va n bilan', async () => {
    const { k } = kod(KESH);
    expect(await k.yonalishQidiruv('traktor', 2, { budgetUzs: null }, H)).toMatchObject({ soz: 'traktor', n: 2, topildi: 0, royxat: [] });
    const { k: k2 } = kod(null);
    expect(await k2.yonalishQidiruv('ruchka', 4, { budgetUzs: null }, H)).toEqual({ soz: 'ruchka', n: 4, olchov_yoq: true, sabab: 'baza javob bermadi' });
  });
});
