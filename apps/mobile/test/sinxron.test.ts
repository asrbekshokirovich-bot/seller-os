import { describe, expect, it } from 'vitest';
import { SUHBAT_QADAMLARI } from '../../../packages/shared/src/ssenariy.js';
import { QADAMLAR } from '../src/lib/qadamlar';

/**
 * Ilovadagi 12 qadam — `packages/shared` dagi `SUHBAT_QADAMLARI` ning
 * nusxasi (Metro shared paketni `.js` importlari bilan yecha olmaydi).
 * Ikki nusxa bir kun albatta farq qiladi va buni hech kim sezmaydi —
 * shu test ularni bogʻlab turadi (QOIDALAR.md §8).
 */
describe('mobil qadamlar ↔ shared ssenariy', () => {
  it('nomi, tartibi va "qurilgan" belgisi bir xil', () => {
    expect(QADAMLAR.map((q) => ({ ...q }))).toEqual(SUHBAT_QADAMLARI.map((q) => ({ ...q })));
  });
});
