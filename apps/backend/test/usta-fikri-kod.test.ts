/**
 * B2 darvozasi — Usta haqidagi fikr bazaga (`so_fikr_yoz`, 0029) yoziladi.
 *
 * NEGA BU TESTLAR BOR. 2026-10-05: chat fikr soʻramas edi — /olchov dagi B2
 * darvozasi ("3 begona sotuvchi Ustani «mantiqli» deydi") hech qachon
 * ochilmasdi. Nazoratchi (2026-10-06, "a"): 4-qadamdan keyin soʻralsin.
 * Bu testlar savol javobi `events` ga aynan darvoza sanaydigan shaklda
 * borishini tekshiradi: `mantiqli` true/false (oʻtkazish — yozilmaydi),
 * izoh matni, qadam va turkum.
 */

import { describe, expect, it } from 'vitest';
import type { YolHolati } from '@selleros/shared';
import { suhbatKodHarakatlari } from '../src/suhbat-kod.js';

function soxtaRpc(javob: unknown) {
  const chaqiruvlar: Array<{ nom: string; arg: Record<string, unknown> }> = [];
  const rpc = async <T>(nom: string, arg: unknown): Promise<T | null> => {
    chaqiruvlar.push({ nom, arg: arg as Record<string, unknown> });
    return javob as T | null;
  };
  return { rpc, chaqiruvlar };
}

function kod(rpc: ReturnType<typeof soxtaRpc>['rpc'], sessiya = true) {
  return suhbatKodHarakatlari(rpc, () => ({ bayroqlar: [], baholanmadi: [] }), () => 10,
    sessiya ? { kalit: null, fetch, token: 'tok', tarifCheklovi: false } : null);
}

const holat = (javoblar: Record<string, unknown>): YolHolati => ({ javoblar: { yonalish: 11770, ...javoblar }, natijalar: {} });

describe('ustaFikri', () => {
  it('«Ha, mantiqli» + izoh — so_fikr_yoz(mantiqli=true, matn, qadam 4, turkum = yoʻnalish)', async () => {
    const b = soxtaRpc({ saqlandi: true });
    const n = await kod(b.rpc).ustaFikri(holat({ usta_fikri: 'ha', usta_fikri_izoh: '  Chegara narx foydali  ' }));
    expect(n).toEqual({ olchov_yoq: false, yozildi: true });
    expect(b.chaqiruvlar).toEqual([{ nom: 'so_fikr_yoz', arg: {
      p_token: 'tok', p_mantiqli: true, p_matn: 'Chegara narx foydali', p_qadam: 4, p_turkum: 11770,
    } }]);
  });

  it('«Yoʻq» izohsiz — mantiqli=false, matn null', async () => {
    const b = soxtaRpc({ saqlandi: true });
    await kod(b.rpc).ustaFikri(holat({ usta_fikri: 'yoq', usta_fikri_izoh: null }));
    expect(b.chaqiruvlar[0]!.arg).toMatchObject({ p_mantiqli: false, p_matn: null });
  });

  it('juda uzun izoh 2000 belgigacha qisqaradi; yoʻnalish yoʻq — turkum null', async () => {
    const b = soxtaRpc({ saqlandi: true });
    await kod(b.rpc).ustaFikri({ javoblar: { usta_fikri: 'ha', usta_fikri_izoh: 'a'.repeat(5000) }, natijalar: {} });
    expect((b.chaqiruvlar[0]!.arg.p_matn as string).length).toBe(2000);
    expect(b.chaqiruvlar[0]!.arg.p_turkum).toBeNull();
  });

  it('baza yozmasa yoki sessiya yoʻq — olchov_yoq (yoʻl toʻxtamaydi), RPC sessiyasiz chaqirilmaydi', async () => {
    const xato = soxtaRpc({ xato: 'sessiya topilmadi' });
    expect(await kod(xato.rpc).ustaFikri(holat({ usta_fikri: 'ha' }))).toEqual({ olchov_yoq: true, sabab: 'sessiya topilmadi' });
    const yoq = soxtaRpc(null);
    expect(await kod(yoq.rpc).ustaFikri(holat({ usta_fikri: 'ha' }))).toEqual({ olchov_yoq: true, sabab: 'baza javob bermadi' });
    const sessiyasiz = soxtaRpc({ saqlandi: true });
    expect(await kod(sessiyasiz.rpc, false).ustaFikri(holat({ usta_fikri: 'ha' }))).toEqual({ olchov_yoq: true, sabab: 'sessiya yoʻq' });
    expect(sessiyasiz.chaqiruvlar).toHaveLength(0);
  });
});
