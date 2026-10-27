/**
 * CBU kursi vositachisi (`/api/kurs`, 2026-10-27).
 *
 * NEGA BU TEST BOR. cbu.uz 22-oktyabrdan beri Supabase Edge ga javob bermaydi — Edge kursni
 * Vercel orqali oladi. Vositachi CBU javobini OʻZGARTIRMAY qaytarishi (kursni Edge oʻzi oʻqiydi
 * va tekshiradi), faqat USD/CNY ni olishi va olinmasa — 502 (kechagi qiymat emas) qaytarishi shart.
 * Tarmoqqa chiqilmaydi.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cbuManzili } from '@selleros/shared';
import { cbuVositachi } from '../src/lib/kurs-vositachi';

const CBU_USD = '[{"id":1,"Code":"840","Ccy":"USD","Nominal":"1","Rate":"11861.96","Date":"27.10.2026"}]';

afterEach(() => { vi.restoreAllMocks(); });

describe('cbuVositachi', () => {
  it('USD — CBU manzilidan, javob oʻzgarmagan holda, 30 daqiqa keshlanadi', async () => {
    const urllar: string[] = [];
    const f = (async (u: string | URL | Request) => { urllar.push(String(u)); return new Response(CBU_USD, { status: 200 }); }) as unknown as typeof fetch;
    const r = await cbuVositachi('USD', f);
    expect(r.status).toBe(200);
    expect(await r.text()).toBe(CBU_USD);
    expect(r.headers.get('cache-control')).toBe('public, s-maxage=1800, stale-while-revalidate=3600');
    expect(urllar).toEqual([cbuManzili('USD')]);
  });

  it('CNY ham; boshqa valyuta yoki boʻsh — 400, CBU ga soʻrov yoʻq', async () => {
    const urllar: string[] = [];
    const f = (async (u: string | URL | Request) => { urllar.push(String(u)); return new Response('[]', { status: 200 }); }) as unknown as typeof fetch;
    expect((await cbuVositachi('CNY', f)).status).toBe(200);
    for (const v of ['EUR', '', null, 'usd', '../USD']) expect((await cbuVositachi(v, f)).status, String(v)).toBe(400);
    expect(urllar).toEqual([cbuManzili('CNY')]);
  });

  it('CBU yiqilsa yoki HTTP xato — 502, keshlanmaydi, sababi logda', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const yiqil = (async () => { throw Object.assign(new Error('Signal timed out.'), { name: 'TimeoutError' }); }) as unknown as typeof fetch;
    const r1 = await cbuVositachi('USD', yiqil);
    expect(r1.status).toBe(502);
    expect(r1.headers.get('cache-control')).toBe('no-store');
    const r2 = await cbuVositachi('CNY', (async () => new Response('band', { status: 503 })) as unknown as typeof fetch);
    expect(r2.status).toBe(502);
    const q = log.mock.calls.map((c) => String(c[0]));
    expect(q[0]).toMatch(/^\/api\/kurs: CBU USD olinmadi — TimeoutError: Signal timed out\. \(\d+ ms\)$/);
    expect(q[1]).toMatch(/^\/api\/kurs: CBU CNY — HTTP 503 \(\d+ ms\)$/);
  });
});
