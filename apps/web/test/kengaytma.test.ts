/**
 * Kengaytma yon paneli: sessiya tokeni hash'dan varaq xotirasiga oʻtadi va
 * manzildan olib tashlanadi; havolalar hash'ni faqat xotira ishlamaganda olib yuradi.
 *
 * Token manzilda qolsa — manzil satri, tarix, nusxalangan havola, skrinshot
 * orqali begonaga oʻtadi (xavfsizlik tekshiruvi, 2026-10-26). Lekin xotira
 * yopiq boʻlsa hash YAGONA nusxa: oʻchirilsa keyingi sahifa tokensiz ochiladi va
 * ramkada cookie ishlamagani uchun suhbat yoʻqolgandek koʻrinadi. Oddiy saytda
 * esa havola OʻZGARMASLIGI kerak — begona hash (`#yol`) boshqa sahifaga olib ketilmaydi.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashBilan, kengaytmaHashi, kengaytmaTokeni, tokensizHash } from '../src/lib/kengaytma';

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

describe('tokensizHash', () => {
  it('sessiya qismlari olib tashlanadi — boshqa narsa qolmasa boʻsh satr', () => {
    expect(tokensizHash(HASH)).toBe('');
    expect(tokensizHash(`#kengaytma=1&sessiya=${TOKEN}`)).toBe('');
    expect(tokensizHash(`#sessiya=${TOKEN}`)).toBe('');
  });
  it('begona qism joyida qoladi', () => {
    expect(tokensizHash(`${HASH}&til=ru`)).toBe('#til=ru');
    expect(tokensizHash('#yol')).toBe('#yol');
    expect(tokensizHash('')).toBe('');
  });
});

/**
 * Brauzer oynasining kerakli qismi. `replaceState` manzilni ham oʻzgartiradi
 * (brauzerdagidek). Xotira: `bor` — ishlaydi; `yopiq` — oʻqishning oʻzi xato
 * (bloklangan xotira); `tola` — yozish xato (Safari maxfiy rejimi); `jim` —
 * xatosiz «yozadi», lekin saqlamaydi.
 */
type Xotira = 'bor' | 'yopiq' | 'tola' | 'jim';
function soxtaOyna(manzil: string, xotira: Xotira = 'bor', oldingi?: string) {
  const asos = 'https://zumsavdo.vercel.app';
  const qism = (m: string) => { const u = new URL(m, asos); return { pathname: u.pathname, search: u.search, hash: u.hash }; };
  const location = qism(manzil);
  const replaceState = vi.fn((_holat: unknown, _bosh: string, yangi?: string | URL | null) => {
    Object.assign(location, qism(String(yangi)));
  });
  const saqlov = new Map<string, string>();
  if (oldingi) saqlov.set('zs_sessiya', oldingi);
  const sessionStorage = {
    getItem: (k: string) => (xotira === 'jim' ? null : saqlov.get(k) ?? null),
    setItem: (k: string, v: string) => {
      if (xotira === 'tola') throw new DOMException('kvota', 'QuotaExceededError');
      if (xotira !== 'jim') saqlov.set(k, v);
    },
  };
  const dispatchEvent = vi.fn(() => true);
  const oyna = {
    location,
    history: { replaceState },
    get sessionStorage() {
      if (xotira === 'yopiq') throw new DOMException('ruxsat yoʻq', 'SecurityError');
      return sessionStorage;
    },
    dispatchEvent,
  } as unknown as Parameters<typeof kengaytmaTokeni>[0];
  return { oyna, location, replaceState, saqlov, dispatchEvent };
}

describe('kengaytmaTokeni', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('hash dagi token xotiraga oʻtadi va manzildan olib tashlanadi', () => {
    const s = soxtaOyna(`/usta${HASH}`);
    expect(kengaytmaTokeni(s.oyna)).toBe(TOKEN);
    expect(s.saqlov.get('zs_sessiya')).toBe(TOKEN);
    // Darhol emas: Next.js `replaceState` ni sahifa effektlaridan keyin oʻraydi.
    expect(s.replaceState).not.toHaveBeenCalled();
    vi.runAllTimers();
    // `null` — Next oʻz holatini oʻzi koʻchiradi va routerga yangi manzilni beradi.
    expect(s.replaceState).toHaveBeenCalledTimes(1);
    expect(s.replaceState).toHaveBeenCalledWith(null, '', '/usta');
    expect(s.location.hash).toBe('');
    // Havolalar endi hash olib yurmaydi — keyingi sahifa tokenni xotiradan oladi.
    expect(kengaytmaHashi(s.location.hash)).toBe('');
    expect(s.dispatchEvent).toHaveBeenCalledTimes(1);
    // Keyingi soʻrovlar xuddi shu tokenni xotiradan oladi.
    expect(kengaytmaTokeni(s.oyna)).toBe(TOKEN);
    vi.runAllTimers();
    expect(s.replaceState).toHaveBeenCalledTimes(1);
  });

  it('/taqqos: soʻrov qismi (ids) joyida qoladi', () => {
    const s = soxtaOyna(`/taqqos?ids=1,2${HASH}`);
    expect(kengaytmaTokeni(s.oyna)).toBe(TOKEN);
    vi.runAllTimers();
    expect(s.replaceState).toHaveBeenCalledTimes(1);
    expect(s.replaceState).toHaveBeenCalledWith(null, '', '/taqqos?ids=1,2');
  });

  it('hash dagi begona qism joyida qoladi — faqat sessiya qismlari ketadi', () => {
    const s = soxtaOyna(`/usta${HASH}&til=ru`);
    kengaytmaTokeni(s.oyna);
    vi.runAllTimers();
    expect(s.replaceState).toHaveBeenCalledWith(null, '', '/usta#til=ru');
  });

  it('bir necha chaqiruv navbat kelguncha — manzil bir marta tozalanadi', () => {
    const s = soxtaOyna(`/usta${HASH}`);
    kengaytmaTokeni(s.oyna);
    kengaytmaTokeni(s.oyna);
    vi.runAllTimers();
    expect(s.replaceState).toHaveBeenCalledTimes(1);
    expect(s.dispatchEvent).toHaveBeenCalledTimes(1);
  });

  it('navbat kelguncha hash oʻzgargan boʻlsa — manzilga tegilmaydi', () => {
    const s = soxtaOyna(`/usta${HASH}`);
    kengaytmaTokeni(s.oyna);
    s.location.hash = '#yol';
    vi.runAllTimers();
    expect(s.replaceState).not.toHaveBeenCalled();
    expect(s.dispatchEvent).not.toHaveBeenCalled();
  });

  for (const xotira of ['yopiq', 'tola', 'jim'] as const) {
    it(`xotira ishlamasa (${xotira}) — hash yagona nusxa, joyida qoladi`, () => {
      const s = soxtaOyna(`/usta${HASH}`, xotira);
      expect(kengaytmaTokeni(s.oyna)).toBe(TOKEN);
      vi.runAllTimers();
      expect(s.replaceState).not.toHaveBeenCalled();
      expect(s.location.hash).toBe(HASH);
      // Havolalar uni avvalgidek keyingi sahifaga olib yuradi.
      expect(hashBilan('/', kengaytmaHashi(s.location.hash))).toBe(`/${HASH}`);
    });
  }

  it('hash da token yoʻq — xotiradagisi (panelda boshqa sahifadan qaytilganda)', () => {
    const s = soxtaOyna('/usta', 'bor', TOKEN);
    expect(kengaytmaTokeni(s.oyna)).toBe(TOKEN);
    vi.runAllTimers();
    expect(s.replaceState).not.toHaveBeenCalled();
  });

  it('kengaytma yangi token bersa — eskisi almashadi', () => {
    const yangi = 'b4e2d3c5-6f70-4b8c-9d0e-1f2a3b4c5d6e';
    const s = soxtaOyna(`/usta#sessiya=${yangi}&kengaytma=1`, 'bor', TOKEN);
    expect(kengaytmaTokeni(s.oyna)).toBe(yangi);
    expect(s.saqlov.get('zs_sessiya')).toBe(yangi);
  });

  it('shakli buzuq token qabul qilinmaydi, xotiraga yozilmaydi, manzilga tegilmaydi', () => {
    const s = soxtaOyna('/usta#sessiya=<script>', 'bor', TOKEN);
    expect(kengaytmaTokeni(s.oyna)).toBe(TOKEN);
    expect(s.saqlov.get('zs_sessiya')).toBe(TOKEN);
    vi.runAllTimers();
    expect(s.replaceState).not.toHaveBeenCalled();
  });

  it('hech qayerda yoʻq — null (oddiy sayt: cookie ishlaydi)', () => {
    expect(kengaytmaTokeni(soxtaOyna('/usta').oyna)).toBeNull();
    expect(kengaytmaTokeni(soxtaOyna('/usta#yol', 'yopiq').oyna)).toBeNull();
  });
});
