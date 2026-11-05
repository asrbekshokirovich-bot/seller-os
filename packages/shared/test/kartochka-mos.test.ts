import { describe, expect, it } from 'vitest';
import { kartochkaMosMatni, kartochkaMosniOqi } from '../src/kartochka-mos.js';

describe('kartochka matni — ikki til bir xil maʼnodami', () => {
  it('model javobini oʻqiydi', () => {
    expect(kartochkaMosniOqi('{"mos": true, "farq": ""}')).toEqual({ mos: true, farq: '' });
    expect(kartochkaMosniOqi('```json\n{"mos": false, "farq": "Nomda: «qalin tagliksiz» ↔ «на толстой подошве»"}\n```'))
      .toEqual({ mos: false, farq: 'Nomda: «qalin tagliksiz» ↔ «на толстой подошве»' });
    // Farq yozilmagan boʻlsa ham — farq bor deb.
    expect(kartochkaMosniOqi('{"mos": false, "farq": "  "}')).toEqual({ mos: false, farq: 'maʼno farqi bor' });
  });

  it('buzuq javob — tekshirilmadi (null)', () => {
    expect(kartochkaMosniOqi('mos')).toBeNull();
    expect(kartochkaMosniOqi('{"mos": "ha"}')).toBeNull();
    expect(kartochkaMosniOqi('null')).toBeNull();
  });

  it('model uchun matnda ikki tilning uch qismi bor', () => {
    const m = kartochkaMosMatni({ nomUz: 'A', nomRu: 'B', qisqaUz: 'C', qisqaRu: 'D', tavsifUz: 'E', tavsifRu: 'F' });
    for (const q of ['NOM (oʻzbekcha): A', 'NOM (ruscha): B', 'QISQA (oʻzbekcha): C', 'QISQA (ruscha): D', 'TAVSIF (oʻzbekcha): E', 'TAVSIF (ruscha): F']) {
      expect(m).toContain(q);
    }
  });
});
