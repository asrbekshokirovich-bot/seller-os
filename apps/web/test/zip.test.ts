/**
 * ZIP yozuvchi (STORE) — studiya suratlarini bitta faylga yigʻish.
 * Tuzilma qayta oʻqib tekshiriladi: imzolar, CRC, ofsetlar, UTF-8 nomlar.
 */

import { describe, expect, it } from 'vitest';
import { crc32, faylBolagi, zipYasa } from '../src/lib/zip';

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Oddiy oʻquvchi: markaziy katalog → har fayl nomi va baytlari. */
function oqi(zip: Uint8Array): Array<{ nom: string; baytlar: Uint8Array; crc: number; bayroq: number }> {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const e = zip.length - 22;
  expect(v.getUint32(e, true)).toBe(0x06054b50);
  const soni = v.getUint16(e + 10, true);
  let m = v.getUint32(e + 16, true);
  const natija = [];
  for (let k = 0; k < soni; k++) {
    expect(v.getUint32(m, true)).toBe(0x02014b50);
    const bayroq = v.getUint16(m + 8, true);
    const crc = v.getUint32(m + 16, true);
    const hajm = v.getUint32(m + 20, true);
    const nomUz = v.getUint16(m + 28, true);
    const ofset = v.getUint32(m + 42, true);
    const nom = dec.decode(zip.subarray(m + 46, m + 46 + nomUz));
    expect(v.getUint32(ofset, true)).toBe(0x04034b50);
    const lNom = v.getUint16(ofset + 26, true);
    const boshi = ofset + 30 + lNom;
    natija.push({ nom, baytlar: zip.subarray(boshi, boshi + hajm), crc, bayroq });
    m += 46 + nomUz;
  }
  return natija;
}

describe('zip', () => {
  it('crc32 standart tekshiruv qiymati', () => {
    expect(crc32(enc.encode('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it('ikki fayl — qayta oʻqiladi: nom (UTF-8), bayt, CRC, bayroq 0x0800', () => {
    const a = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);
    const b = enc.encode('ikkinchi fayl');
    const zip = zipYasa([{ nom: '1-sumka-oʻzbekcha.jpg', baytlar: a }, { nom: 'Сумка-2.jpg', baytlar: b }], new Date(2026, 8, 29, 12, 0, 0));
    const r = oqi(zip);
    expect(r.map((x) => x.nom)).toEqual(['1-sumka-oʻzbekcha.jpg', 'Сумка-2.jpg']);
    expect([...r[0]!.baytlar]).toEqual([...a]);
    expect(dec.decode(r[1]!.baytlar)).toBe('ikkinchi fayl');
    expect(r[0]!.crc).toBe(crc32(a));
    expect(r.every((x) => x.bayroq === 0x0800)).toBe(true);
  });

  it('boʻsh roʻyxat — faqat oxirgi yozuv (22 bayt)', () => {
    expect(zipYasa([]).length).toBe(22);
  });

  it('faylBolagi: xavfsiz, qisqa, boʻsh boʻlmaydi', () => {
    expect(faylBolagi('Ayollar sumkasi, katta / A4')).toBe('Ayollar-sumkasi-katta-A4');
    expect(faylBolagi('Oʻyinchoq')).toBe('Oyinchoq');
    expect(faylBolagi('???')).toBe('tovar');
    expect(faylBolagi('x'.repeat(100)).length).toBe(40);
  });
});
