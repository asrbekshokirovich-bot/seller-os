import { describe, it, expect } from 'vitest';
import {
  xizmatNarxi,
  XIZMAT_NARXLARI,
} from '../src/xizmat.js';

describe('Xizmat', () => {
  it('xizmat turlari toʻgʻri soni', () => {
    expect(XIZMAT_NARXLARI).toHaveLength(3);
  });

  it('start-paket narxi', () => {
    expect(xizmatNarxi('start-paket')).toBe(1_500_000);
  });

  it('kalit-taxtida narxi', () => {
    expect(xizmatNarxi('kalit-taxtida')).toBe(5_000_000);
  });

  it('kartochka narxi', () => {
    expect(xizmatNarxi('kartochka')).toBe(200_000);
  });

  it('notanish tur 0 qaytaradi', () => {
    expect(xizmatNarxi('boshqa' as never)).toBe(0);
  });
});
