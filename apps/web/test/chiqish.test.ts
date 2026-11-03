/**
 * Chiqish — `POST /api/chiqish` (`lib/chiqish.ts`).
 *
 * NEGA BU TESTLAR BOR. Nazoratchi (2026-11-03): «profildan chiqish tugmasi bosilsa chiqmayapti».
 * «Chiqish» faqat bosh sahifaga olib borardi — sessiya cookie si qolib, sayt odamni tanishda
 * davom etardi. Bu yerda:
 *   - oʻz sahifasidan — cookie oʻrnatilgandagi nom va yoʻl bilan oʻchadi (aks holda brauzer
 *     uni oʻchirmaydi), ishlab chiqarishda `Secure` bilan;
 *   - begona saytdan (`Sec-Fetch-Site`, `Origin`) — 403, cookie ga tegilmaydi: odam bilmasdan
 *     chiqarib yuborilsa, suhbati butunlay yoʻqolardi (kirish hali yoʻq).
 */

import { describe, expect, it } from 'vitest';
import { chiqishCookiesi, chiqishJavobi, ozSaytdanmi } from '../src/lib/chiqish';

const SAYT = 'https://zumsavdo.vercel.app';

const sorov = (sarlavhalar: Record<string, string> = {}, manzil = `${SAYT}/api/chiqish`) =>
  new Request(manzil, { method: 'POST', headers: { Cookie: 'so_sessiya=maxfiy-token', ...sarlavhalar } });

/** Brauzer oʻz sahifasidagi `fetch` ga qoʻyadigan sarlavhalar. */
const OZI = { Origin: SAYT, 'Sec-Fetch-Site': 'same-origin' };

describe('chiqishCookiesi', () => {
  it('sessiya cookie si — oʻsha nom va yoʻl, darhol eskiradi, HttpOnly', () => {
    const c = chiqishCookiesi(false);
    expect(c.startsWith('so_sessiya=;')).toBe(true);
    for (const q of ['Path=/', 'Max-Age=0', 'Expires=Thu, 01 Jan 1970 00:00:00 GMT', 'HttpOnly', 'SameSite=Lax']) {
      expect(c.split('; '), q).toContain(q);
    }
    expect(c).not.toContain('Secure');
  });

  it('ishlab chiqarishda — `Secure` (cookie shunday oʻrnatilgan)', () => {
    expect(chiqishCookiesi(true).split('; ')).toContain('Secure');
  });
});

describe('chiqishJavobi', () => {
  it('oʻz sahifasidan — 204, cookie oʻchadi, keshlanmaydi', () => {
    const r = chiqishJavobi(sorov(OZI), true);
    expect(r.status).toBe(204);
    expect(r.headers.get('set-cookie')).toBe(chiqishCookiesi(true));
    expect(r.headers.get('cache-control')).toBe('no-store');
  });

  it('begona saytdan — 403, cookie ga tegilmaydi', () => {
    for (const s of [
      { Origin: 'https://yomon.example', 'Sec-Fetch-Site': 'cross-site' },
      { Origin: 'https://boshqa.vercel.app', 'Sec-Fetch-Site': 'cross-site' },
      { 'Sec-Fetch-Site': 'cross-site' },
      { 'Sec-Fetch-Site': 'same-site' },
      { Origin: 'https://yomon.example' },
      { Origin: 'http://zumsavdo.vercel.app.yomon.example' },
      { Origin: 'null' },
    ]) {
      const r = chiqishJavobi(sorov(s), true);
      expect(r.status, JSON.stringify(s)).toBe(403);
      expect(r.headers.get('set-cookie'), JSON.stringify(s)).toBeNull();
    }
  });

  it('`Origin` sahifa manzili, `Host` yoki `X-Forwarded-Host` bilan bir xil — oʻtadi', () => {
    expect(ozSaytdanmi(sorov(OZI))).toBe(true);
    expect(ozSaytdanmi(sorov({ Origin: 'http://localhost:3000' }, 'http://localhost:3000/api/chiqish'))).toBe(true);
    expect(ozSaytdanmi(sorov({ Origin: SAYT, Host: 'zumsavdo.vercel.app' }, 'http://ichki:3000/api/chiqish'))).toBe(true);
    expect(ozSaytdanmi(sorov({ Origin: SAYT, 'X-Forwarded-Host': 'zumsavdo.vercel.app' }, 'http://ichki:3000/api/chiqish'))).toBe(true);
    expect(ozSaytdanmi(sorov({ Origin: 'https://zumsavdo.vercel.app:8443' }))).toBe(false);
  });

  it('sarlavhasiz soʻrov (curl, eski brauzer) — oʻtadi: begona cookie siz faqat oʻzini chiqaradi', () => {
    expect(chiqishJavobi(sorov(), false).status).toBe(204);
    expect(chiqishJavobi(sorov({ 'Sec-Fetch-Site': 'same-origin' }), false).status).toBe(204);
  });
});
