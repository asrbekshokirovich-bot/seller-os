import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tovarniTekshir, turkumniTekshir, xulosa } from '../src/tahlil.js';
import { TRAP_LABEL } from '@selleros/shared';
import type { Flag, TovarHolati, TrapKind, TurkumHolati } from '@selleros/shared';

/**
 * Quvur testi: baza → `so_tovar_holati` → filtr.
 *
 * Fikstura qoʻlda yozilmagan — u bazadagi funksiya qaytargan haqiqiy
 * javob (2026-08-20, 12 ta haqiqiy Uzum mahsuloti).
 */
const f = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures/quvur.json'), 'utf8'),
) as { tovar: TovarHolati[]; turkum: TurkumHolati[] };

describe('quvur: baza → filtr', () => {
  it('quvur filtr kutgan shaklni beradi', () => {
    for (const t of f.tovar) {
      expect(t).toHaveProperty('productId');
      expect(t).toHaveProperty('brandSellersCount');
      expect(t).toHaveProperty('brandAgeDays');
    }
  });

  it('brend haqiqatan toʻldirilgan', () => {
    // `brand` uzoq vaqt NULL edi va yopiq brend filtri shu sababli
    // hech qachon ishlay olmasdi. Endi u doʻkon nomidan chiqariladi.
    const brendli = f.tovar.filter((t) => t.brand !== null);
    expect(brendli.length, 'birorta tovarda ham brend topilmadi').toBeGreaterThan(0);
  });

  it('yosh id soatidan keladi', () => {
    const yoshli = f.tovar.filter((t) => t.brandAgeDays !== null);
    expect(yoshli.length).toBeGreaterThan(0);
    // Lamart eng eski id (2064) — u eng qari boʻlishi kerak.
    const lamart = f.tovar.find((t) => t.brand === 'lamart');
    expect(lamart?.brandAgeDays).toBeGreaterThan(1000);
  });

  it('yupqa turkum BAHOLANMAYDI — yolgʻon monopoliya bermaydi', () => {
    // Har turkumda bitta sotuvchi: top-3 ulushi tabiiy ravishda 100%.
    // Bu monopoliya emas, oʻlchov yupqaligi. Qoʻriqchi shuni ushlashi shart.
    const x = xulosa(f.turkum.map(turkumniTekshir));
    expect(x.bayroqli, 'yupqa maʼlumotda yolgʻon monopoliya berildi').toBe(0);
    expect(x.baholanmadi).toBe(f.turkum.length);
  });

  it('nima yetishmagani sanab koʻrsatiladi', () => {
    // Jim qolish taqiqlangan (QOIDALAR.md, 8-boʻlim): filtr baholay
    // olmasa, NIMA yetishmagani hisobotda chiqishi shart.
    const x = xulosa(f.tovar.map(tovarniTekshir));
    expect(Object.keys(x.yetishmayotgan).length).toBeGreaterThan(0);
    expect(x.yetishmayotgan).toHaveProperty('soldUnits30d');
  });

  it('xulosa hamma tovarni sanaydi', () => {
    const x = xulosa(f.tovar.map(tovarniTekshir));
    expect(x.tekshirildi).toBe(f.tovar.length);
    expect(x.bayroqli + x.baholanmadi).toBeLessThanOrEqual(f.tovar.length);
  });
});

/**
 * Tuzoq turlari boʻyicha yigʻindi.
 *
 * `TRAP_LABEL` — oʻzbekcha nomlar jadvali — yozilgan, izohlangan va
 * sinxronlik testi bilan qoplangan edi, lekin ishlab chiqarishda uni
 * HECH KIM chaqirmasdi: API faqat mashina nomlarini (`closed_brand`)
 * qaytarardi. Yaʼni foydalanuvchi uchun yozilgan matn foydalanuvchiga
 * hech qachon yetib bormasdi.
 *
 * Buni oʻlik kod qorovuli topdi — lekin faqat nusxalar sanoqdan
 * chiqarilgandan keyin. Undan oldin Edge Function nusxasi nomni
 * ikkinchi marta uchratardi va eksport tirik koʻrinardi.
 */
describe('xulosa — turlar boʻyicha', () => {
  const bayroq = (kind: TrapKind): Flag => ({
    kind, severity: 'warn', reason: 'sinov', evidence: { x: 1 },
  });
  const natija = (...kinds: TrapKind[]) => ({
    holat: null, bayroqlar: kinds.map(bayroq), baholanmadi: [],
  });

  it('har turga oʻzbekcha nom qoʻshiladi', () => {
    const x = xulosa([natija('closed_brand')]);
    expect(x.turlar).toEqual([
      { kind: 'closed_brand', nom: TRAP_LABEL.closed_brand, soni: 1 },
    ]);
    expect(x.turlar[0]!.nom).not.toBe('closed_brand');
  });

  it('koʻpdan ozga tartiblanadi', () => {
    const x = xulosa([natija('monopoly', 'monopoly'), natija('closed_brand')]);
    expect(x.turlar.map((t) => t.kind)).toEqual(['monopoly', 'closed_brand']);
    expect(x.turlar.map((t) => t.soni)).toEqual([2, 1]);
  });

  it('bayroq boʻlmasa boʻsh — nol koʻrsatilmaydi', () => {
    // Boʻsh roʻyxat "tekshirilmagan turlar yoʻq" degani, har turga
    // nol yozish esa "tekshirdim, topmadim" degan daʼvo boʻlardi.
    expect(xulosa([natija()]).turlar).toEqual([]);
  });
});
