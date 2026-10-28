/**
 * Bosh sahifa namunasi (`bosh-namuna.ts`) — nazoratchi, 2026-10-28: «Misol foyda» oʻrniga
 * bugungi haqiqiy raqamlar.
 *
 * NEGA BU TESTLAR BOR. Bosh sahifadagi yoʻnalishlar chatdagi 2-qadam bilan BIR XIL boʻlishi
 * kerak (aks holda sahifa bir narsa, chat boshqa narsa deydi), tavsiya jurnaliga yozilmasligi
 * kerak (bu hech kimga tavsiya emas) va baza javob bermasa raqam toʻqilmasligi kerak.
 */

import { describe, expect, it } from 'vitest';
import { boshNamunaOqi, boshNamunasi, NAMUNA_BYUDJET, NAMUNA_SONI } from '../src/bosh-namuna';
import { yonalishlar, type NomzodJavobi, type TovarNomzodi, type TurkumNomzodi } from '../src/qadamlar';

const nomzod = (categoryId: number, name: string, talabOlchovi: number, top3Ulush = 35): TurkumNomzodi => ({
  categoryId, name, talabOlchovi, sotuvchiSoni: 100 + categoryId, top3Ulush, optimalKirishSom: null,
  talablar: { markirovka: false, sertifikat: false, haftalar: null }, mavsumiylik: null,
});

const KESH: NomzodJavobi = {
  hisoblandi: '2026-10-28T06:00:00Z', yoshi_soat: 2,
  royxat: [
    nomzod(1, 'Sumkalar', 1000, 12), nomzod(2, 'Krossovkalar', 900), nomzod(3, 'Simsiz quloqchinlar', 800),
    nomzod(4, 'Ruchkalar', 400), nomzod(5, 'Bloknotlar', 350), nomzod(6, 'Atirlar', 700), nomzod(7, 'Qalamlar', 100),
  ],
};

const tovar = (url: string, sotildi: number | null, title = 'Tovar') =>
  ({ rasmUrl: url, soldUnits30d: sotildi, title }) as unknown as TovarNomzodi;

/** Soxta `rpc`: nomi boʻyicha javob; chaqiruvlarni yozadi. */
function soxta(nomzodlar: unknown, tovarlar: (id: number) => unknown = () => null) {
  const chaqiruvlar: Array<{ nom: string; arg: Record<string, unknown> }> = [];
  const rpc = async <T>(nom: string, arg: unknown): Promise<T | null> => {
    const a = arg as Record<string, unknown>;
    chaqiruvlar.push({ nom, arg: a });
    if (nom === 'so_yonalish_nomzodlari') return nomzodlar as T | null;
    if (nom === 'so_tovar_royxati') return tovarlar(a.p_category_external_id as number) as T | null;
    return null;
  };
  return { rpc, chaqiruvlar };
}

describe('boshNamunasi — GET /bosh-namuna', () => {
  it('chatdagi 2-qadam bilan bir xil tartib (30 mln, sohasiz); 3 ta; tavsiya jurnaliga yozilmaydi', async () => {
    const s = soxta(KESH);
    const n = await boshNamunasi(s.rpc, 10);
    expect(n.status).toBe(200);
    const namuna = (n.tana as { namuna: { royxat: Array<{ categoryId: number }> } }).namuna;
    const chatda = yonalishlar(KESH.royxat, NAMUNA_BYUDJET, null, 10, null).royxat.slice(0, NAMUNA_SONI);
    expect(namuna.royxat.map((y) => y.categoryId)).toEqual(chatda.map((y) => y.categoryId));
    expect(namuna.royxat).toHaveLength(3);
    // Faqat oʻqish: nomzodlar va har yoʻnalishga bitta rasm soʻrovi. Jurnal (`recommendations`) yoʻq.
    expect(s.chaqiruvlar.map((c) => c.nom)).toEqual(['so_yonalish_nomzodlari', 'so_tovar_royxati', 'so_tovar_royxati', 'so_tovar_royxati']);
  });

  it('karta maydonlari: ball butun, sotuvchilar va katta doʻkonlar ulushi nomzoddan; kesh yoshi', async () => {
    const n = await boshNamunasi(soxta({ ...KESH, yoshi_soat: 30 }).rpc, 10);
    const namuna = (n.tana as { namuna: Record<string, unknown> }).namuna as {
      byudjet: number; hisoblandi: string; kesh_eskirgan: boolean;
      royxat: Array<{ categoryId: number; ball: number | null; sotuvchiSoni: number; top3Ulush: number; soha: string }>;
    };
    expect(namuna).toMatchObject({ byudjet: 30_000_000, hisoblandi: '2026-10-28T06:00:00Z', kesh_eskirgan: true });
    for (const y of namuna.royxat) {
      expect(y.ball === null || Number.isInteger(y.ball)).toBe(true);
      expect(y.sotuvchiSoni).toBe(100 + y.categoryId);
      expect(typeof y.soha).toBe('string');
    }
    expect((await boshNamunasi(soxta(KESH).rpc, 10)).tana).toMatchObject({ namuna: { kesh_eskirgan: false } });
  });

  it('rasmlar: eng koʻp sotilgani oldin, 3 tagacha; rasm soʻrovi yiqilsa — rasmsiz, namuna baribir', async () => {
    const s = soxta(KESH, (id) => (id === 1
      ? { royxat: [tovar('https://images.uzum.uz/a.jpg', 5), tovar('https://images.uzum.uz/b.jpg', 90, 'Sumka B'),
        tovar('https://images.uzum.uz/c.jpg', null), tovar('https://images.uzum.uz/d.jpg', 40)] }
      : null));
    const n = await boshNamunasi(s.rpc, 10);
    const royxat = (n.tana as { namuna: { royxat: Array<{ categoryId: number; rasmlar: Array<{ url: string; nom: string }> }> } }).namuna.royxat;
    const sumka = royxat.find((y) => y.categoryId === 1);
    expect(sumka?.rasmlar.map((r) => r.url)).toEqual([
      'https://images.uzum.uz/b.jpg', 'https://images.uzum.uz/d.jpg', 'https://images.uzum.uz/a.jpg',
    ]);
    expect(sumka?.rasmlar[0]?.nom).toBe('Sumka B');
    expect(royxat.filter((y) => y.categoryId !== 1).every((y) => y.rasmlar.length === 0)).toBe(true);
  });

  it('baza javob bermasa yoki nomzodlar hali hisoblanmagan — oʻlchanmadi (503), boʻsh roʻyxat emas', async () => {
    expect(await boshNamunasi(soxta(null).rpc, 10))
      .toEqual({ status: 503, tana: { olchov_yoq: true, sabab: 'baza javob bermadi' } });
    expect(await boshNamunasi(soxta({ ...KESH, royxat: [] }).rpc, 10))
      .toEqual({ status: 503, tana: { olchov_yoq: true, sabab: 'nomzodlar hali hisoblanmadi' } });
  });
});

describe('boshNamunaOqi — sayt tomoni', () => {
  const Y = { categoryId: 1, name: 'Sumkalar', soha: 'aksessuar', ball: 74, sotuvchiSoni: 812, top3Ulush: 12, rasmlar: [] };
  const N = { byudjet: 30_000_000, hisoblandi: '2026-10-28T06:00:00Z', kesh_eskirgan: false, royxat: [Y] };

  it('toʻgʻri shakl — oʻzicha; rasm: faqat https, 3 tagacha', () => {
    expect(boshNamunaOqi(N)).toEqual(N);
    const rasmlar = ['https://a/1.jpg', 'http://a/2.jpg', 'https://a/3.jpg', 'https://a/4.jpg', 'https://a/5.jpg']
      .map((url) => ({ url, nom: 'x' }));
    expect(boshNamunaOqi({ ...N, royxat: [{ ...Y, rasmlar: [...rasmlar, { url: 5 }] }] })!.royxat[0]!.rasmlar.map((r) => r.url))
      .toEqual(['https://a/1.jpg', 'https://a/3.jpg', 'https://a/4.jpg']);
  });

  it('`null` raqamlar — joyida (oʻlchanmagan); sana yoʻq — `null`', () => {
    const v = boshNamunaOqi({ ...N, hisoblandi: undefined, royxat: [{ ...Y, ball: null, sotuvchiSoni: null, top3Ulush: null }] });
    expect(v!.hisoblandi).toBeNull();
    expect(v!.royxat[0]).toMatchObject({ ball: null, sotuvchiSoni: null, top3Ulush: null });
  });

  it('buzuq yoki boʻsh — `null` (sahifa raqam toʻqimaydi)', () => {
    for (const buzuq of [
      null, 'x', [], { ...N, royxat: [] }, { ...N, royxat: null }, { ...N, byudjet: '30' }, { ...N, hisoblandi: 5 },
      { ...N, royxat: [{ ...Y, name: ' ' }] }, { ...N, royxat: [{ ...Y, ball: '74' }] }, { ...N, royxat: [{ ...Y, categoryId: null }] },
      { ...N, royxat: [{ ...Y, top3Ulush: undefined }] }, { ...N, royxat: [null] },
    ]) {
      expect(boshNamunaOqi(buzuq), JSON.stringify(buzuq)).toBeNull();
    }
  });
});
