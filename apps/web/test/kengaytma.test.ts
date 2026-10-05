/**
 * Kengaytma yon paneli: sahifalar orasidagi havolalar tokenli hash'ni olib yuradi.
 *
 * Hash yoʻqolsa keyingi sahifa tokensiz ochiladi va ramkada cookie ishlamagani
 * uchun suhbat yoʻqolgandek koʻrinadi. Oddiy saytda esa havola OʻZGARMASLIGI
 * kerak — begona hash (`#yol`) boshqa sahifaga olib ketilmaydi.
 */

import { describe, expect, it } from 'vitest';
import { hashBilan, kengaytmaHashi } from '../src/lib/kengaytma';

const TOKEN = 'a3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const HASH = `#sessiya=${TOKEN}&kengaytma=1`;

describe('kengaytmaHashi', () => {
  it('tokenli hash oʻzi qaytadi', () => {
    expect(kengaytmaHashi(HASH)).toBe(HASH);
    expect(kengaytmaHashi(`#sessiya=${TOKEN}`)).toBe(`#sessiya=${TOKEN}`);
  });
  it('tokensiz, boʻsh yoki shakli buzuq hash — boʻsh satr', () => {
    expect(kengaytmaHashi('')).toBe('');
    expect(kengaytmaHashi('#yol')).toBe('');
    expect(kengaytmaHashi('#sessiya=qisqa&kengaytma=1')).toBe('');
    expect(kengaytmaHashi(`#sessiya=${TOKEN}%20OR%201`)).toBe('');
  });
});

describe('hashBilan', () => {
  it('kengaytmada ichki havolaga hash qoʻshiladi', () => {
    expect(hashBilan('/usta', HASH)).toBe(`/usta${HASH}`);
    expect(hashBilan('/', HASH)).toBe(`/${HASH}`);
    expect(hashBilan('/maxfiylik', HASH)).toBe(`/maxfiylik${HASH}`);
  });
  it('oddiy saytda havola oʻzgarmaydi', () => {
    expect(hashBilan('/usta', '')).toBe('/usta');
    expect(hashBilan('/usta', '#yol')).toBe('/usta');
  });
  it('oʻz langari bor havola tegilmaydi', () => {
    expect(hashBilan('#yol', HASH)).toBe('#yol');
    expect(hashBilan('/maxfiylik#gemini', HASH)).toBe('/maxfiylik#gemini');
  });
});
