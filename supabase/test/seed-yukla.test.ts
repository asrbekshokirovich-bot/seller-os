/**
 * Seed CSV oʻqiladigan qismning testlari.
 *
 * Deyarli hammasi BITTA xato atrofida: boʻsh katak nolga yoki
 * `false` ga aylanmasligi kerak.
 *
 * Bu xato bazada allaqachon bir marta boʻlgan: `category_requirements`
 * da `marking_required` `NOT NULL boolean` edi va jadval boʻsh edi —
 * natijada HAR turkum "sertifikat kerak emas" deb oʻqilardi. Odam
 * sota olmaydigan tovarga butun partiya pulini tikishi mumkin edi va
 * kod bironta xato bermasdi.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — `.mjs` skript, tur eʼloni yoʻq (ataylab: u
// bitta joyda ishlatiladigan vosita, paket emas).
import { csvOqi, faylniOqi, qatorniTekshir } from '../seed/yukla.mjs';

const SARLAVHA =
  'category_external_id,marking_required,certificate_required,' +
  'entry_cost_uzs,entry_weeks,optimal_entry_uzs,seasonality,source,note';

const ONIKKI = '0.4,0.4,0.5,0.6,0.6,0.5,0.5,0.7,1.4,1.9,2.0,1.5';

describe('seed CSV', () => {
  it('sarlavha mos kelmasa TOʻXTAYDI', () => {
    // Ustun tartibi oʻzgarsa qiymatlar notoʻgʻri maydonga tushardi:
    // "sertifikat kerak" "markirovka kerak" ga aylanardi.
    expect(() => csvOqi('a,b,c\n1,2,3')).toThrow(/sarlavhasi mos emas/);
  });

  it('katak soni notoʻgʻri boʻlsa toʻxtaydi', () => {
    expect(() => csvOqi(`${SARLAVHA}\n123,1,0`)).toThrow(/katak/);
  });

  it('tirnoq ichidagi VERGUL saqlanadi', () => {
    // Mavsumiylik bitta katakda 12 ta vergulli son. Tirnoqni
    // hisobga olmasak u 12 ta ustunga boʻlinib ketardi.
    const [q] = csvOqi(`${SARLAVHA}\n123,,,,,,"${ONIKKI}",,`);
    expect(q.seasonality).toBe(ONIKKI);
  });

  describe('boʻsh katak — null', () => {
    const bosh = { category_external_id: '123' };

    it('ha/yoʻq maydoni boʻsh boʻlsa null, false EMAS', () => {
      const q = qatorniTekshir(bosh, 2);
      expect(q.marking_required).toBeNull();
      expect(q.certificate_required).toBeNull();
      expect(q.marking_required).not.toBe(false);
    });

    it('son maydoni boʻsh boʻlsa null, 0 EMAS', () => {
      const q = qatorniTekshir(bosh, 2);
      expect(q.optimal_entry_uzs).toBeNull();
      expect(q.entry_weeks).toBeNull();
      expect(q.optimal_entry_uzs).not.toBe(0);
    });

    it('HAQIQIY NOL saqlanadi', () => {
      // 0 — "hujjat pul talab qilmaydi" degan javob, boʻshliqdan farqli.
      const q = qatorniTekshir({ ...bosh, entry_cost_uzs: '0' }, 2);
      expect(q.entry_cost_uzs).toBe(0);
    });

    it('HAQIQIY false saqlanadi', () => {
      const q = qatorniTekshir({ ...bosh, marking_required: '0' }, 2);
      expect(q.marking_required).toBe(false);
    });
  });

  it('tushunarsiz ha/yoʻq qiymati JIMGINA oʻtmaydi', () => {
    // "balki" ni `false` deb qabul qilish eng xavfli yechim boʻlardi.
    expect(() => qatorniTekshir(
      { category_external_id: '1', marking_required: 'balki' }, 2,
    )).toThrow(/0\/1 kutilgan/);
  });

  it('YARIM mavsumiylik qabul qilinmaydi', () => {
    // `mavsum()` uzunligi 12 boʻlmasa `null` qaytaradi — yaʼni
    // 8 ta son yozilsa ball jimgina hisoblanmay qolardi.
    expect(() => qatorniTekshir(
      { category_external_id: '1', seasonality: '1,1,1,1,1,1,1,1' }, 2,
    )).toThrow(/12 ta kerak/);
  });

  it('toʻliq mavsumiylik songa aylanadi', () => {
    const q = qatorniTekshir({ category_external_id: '1', seasonality: ONIKKI }, 2);
    expect(q.seasonality).toHaveLength(12);
    expect(q.seasonality?.[10]).toBe(2.0);
  });

  it('id boʻsh boʻlsa toʻxtaydi', () => {
    expect(() => qatorniTekshir({ category_external_id: '' }, 2))
      .toThrow(/boʻsh boʻlmaydi/);
  });

  it('TAKROR id toʻxtatadi', () => {
    // Qaysi qator yozilishi tasodifga qolardi.
    expect(() => faylniOqi(`${SARLAVHA}\n123,1,,,,,,,\n123,0,,,,,,,`))
      .toThrow(/takrorlanmoqda/);
  });

  it('boʻsh CSV (faqat sarlavha) — xato emas, boʻsh roʻyxat', () => {
    expect(faylniOqi(SARLAVHA)).toEqual([]);
  });

  it('MANBA saqlanadi — u maʼlumotning bir qismi', () => {
    // Bazada huquqiy havolali qatorlar bor: "VMQ 148, 02.04.2022,
    // 1-guruh". Yuklovchi `source` ni oʻzi yozganida shu havola
    // yoʻqolardi — daʼvo qolardi, DALIL yoʻqolardi.
    const [q] = faylniOqi(`${SARLAVHA}\n123,1,,,,,,"VMQ 148, 1-guruh","izoh"`);
    expect(q.source).toBe('VMQ 148, 1-guruh');
    expect(q.note).toBe('izoh');
  });

  it('manba boʻsh boʻlsa null — matn sifatida "" emas', () => {
    const [q] = faylniOqi(`${SARLAVHA}\n123,1,,,,,,,`);
    expect(q.source).toBeNull();
  });
});

/**
 * Yuklangan mavsumiylik egri chiziqlari toʻgʻri shakldami.
 *
 * Koeffitsient "oʻrtacha oyga nisbatan" degani, yaʼni oʻrtachasi
 * 1.0 boʻlishi SHART. Boʻlmasa turkum boshqalarga nisbatan
 * sunʼiy ravishda yuqori yoki past chiqadi — va buni hech narsa
 * koʻrsatmaydi, chunki egri chiziqning shakli baribir toʻgʻri
 * koʻrinadi.
 */
describe('mavsumiylik egri chiziqlari', () => {
  const CSV = join(import.meta.dirname, '../seed/category_requirements.csv');
  const qatorlar = faylniOqi(readFileSync(CSV, 'utf8'));
  const mavsumli = qatorlar.filter((q: { seasonality: number[] | null }) => q.seasonality);

  it('kamida bitta turkumda mavsumiylik bor', () => {
    // Boʻsh CSV bilan bu testlar jimgina oʻtib ketardi.
    expect(mavsumli.length).toBeGreaterThan(0);
  });

  it('har biri roppa-rosa 12 ta koeffitsient', () => {
    for (const q of mavsumli) {
      expect(q.seasonality, `${q.category_external_id}`).toHaveLength(12);
    }
  });

  it('har birining OʻRTACHASI 1.0', () => {
    for (const q of mavsumli) {
      const ortacha = q.seasonality.reduce((a: number, b: number) => a + b, 0) / 12;
      expect(Math.abs(ortacha - 1), `${q.category_external_id}: oʻrtacha ${ortacha.toFixed(3)}`)
        .toBeLessThan(0.01);
    }
  });

  it('manba oʻlchov emasligini AYTADI', () => {
    // Mavsumiylik oʻlchanmagan. Buni yashirish — taxminni
    // oʻlchovdek koʻrsatish.
    for (const q of mavsumli) {
      expect(q.source, `${q.category_external_id}`).toMatch(/oʻlchov EMAS|mulohaza/i);
    }
  });
});
