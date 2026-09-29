/**
 * Kengaytma rejimi: sessiya tokeni sarlavhadan / hash'dan.
 *
 * Cookie boʻlmagan joyda (Chrome yon paneli ramkasi) token shu ikki yoʻl
 * bilan keladi. Shakli buzuq token QABUL QILINMAYDI — u Edge Function
 * sarlavhasiga koʻchadi, shuning uchun elak shu yerda.
 */

import { describe, expect, it } from 'vitest';
import { hashTokeni, sorovTokeni } from '../src/lib/sessiya-sarlavha';

const TOKEN = 'a3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

describe('sorovTokeni', () => {
  it('sarlavhadagi toʻgʻri token qaytadi (boʻshliqlar kesiladi)', () => {
    const r = new Request('https://x.test/api/suhbat', { headers: { 'x-sessiya': ` ${TOKEN} ` } });
    expect(sorovTokeni(r)).toBe(TOKEN);
  });
  it('sarlavha yoʻq, boʻsh, qisqa yoki begona belgili — null', () => {
    expect(sorovTokeni(new Request('https://x.test/'))).toBeNull();
    expect(sorovTokeni(new Request('https://x.test/', { headers: { 'x-sessiya': '' } }))).toBeNull();
    expect(sorovTokeni(new Request('https://x.test/', { headers: { 'x-sessiya': 'qisqa' } }))).toBeNull();
    expect(sorovTokeni(new Request('https://x.test/', { headers: { 'x-sessiya': `${TOKEN} OR 1=1` } }))).toBeNull();
    expect(sorovTokeni(undefined)).toBeNull();
    expect(sorovTokeni(null)).toBeNull();
  });
});

describe('hashTokeni', () => {
  it('#sessiya=… va &kengaytma=1 bilan', () => {
    expect(hashTokeni(`#sessiya=${TOKEN}&kengaytma=1`)).toBe(TOKEN);
    expect(hashTokeni(`#kengaytma=1&sessiya=${encodeURIComponent(TOKEN)}`)).toBe(TOKEN);
  });
  it('yoʻq yoki buzuq — null', () => {
    expect(hashTokeni('')).toBeNull();
    expect(hashTokeni('#kengaytma=1')).toBeNull();
    expect(hashTokeni('#sessiya=%E0%A4%A')).toBeNull();
    expect(hashTokeni('#sessiya=<script>')).toBeNull();
  });
});
