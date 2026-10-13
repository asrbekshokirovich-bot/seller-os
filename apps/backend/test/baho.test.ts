/**
 * 👍/👎 — yordamchi javobiga baho (nazoratchi, 2026-10-13: "Ha, boʻlsin").
 *
 * Asosiy talab: matnga ISHONILMAYDI. Baho faqat mijozning oʻz suhbatidagi
 * erkin javobga yoziladi; hodisaga matn emas, xabar raqami ketadi.
 */

import { describe, expect, it } from 'vitest';
import { javobniBahola } from '@selleros/shared';

function baza(xabarlar: unknown[]) {
  const yozilgan: unknown[] = [];
  const rpc = async <T>(nom: string, arg: unknown): Promise<T | null> => {
    const a = arg as Record<string, unknown>;
    if (a.p_token !== 'tok') return { xato: 'sessiya topilmadi' } as T;
    if (nom === 'so_suhbat_oqi') return { holat: null, qadam: 1, xabarlar } as T;
    if (nom === 'so_hodisa_yoz') { yozilgan.push(a); return { ok: true } as T; }
    return null;
  };
  return { rpc, yozilgan };
}

const JAVOB = 'Uzum pulni toʻlov jadvali boʻyicha avtomatik oʻtkazadi.';
const JURNAL = [
  { seq: 1, rol: 'menejer', matn: 'Ismingiz va familiyangiz?', savolId: 'ism', javob: null },
  { seq: 2, rol: 'obunachi', matn: 'pul qachon tushadi?', savolId: null, javob: null },
  { seq: 3, rol: 'menejer', matn: JAVOB, savolId: 'byudjet', javob: { erkin: true, manba: 'baza' } },
];

describe('javob bahosi (👍/👎)', () => {
  it('oʻz suhbatidagi erkin javob — hodisa: seq, baho, manba, savolId (matn emas)', async () => {
    const b = baza(JURNAL);
    expect(await javobniBahola(b.rpc, 'tok', { matn: JAVOB, baho: 'yomon' })).toEqual({ status: 200, tana: { ok: true } });
    expect(b.yozilgan).toEqual([{
      p_token: 'tok', p_nom: 'javob_baho', p_props: { seq: 3, baho: 'yomon', manba: 'baza', savolId: 'byudjet' },
    }]);
  });

  it('suhbatda yoʻq matn yoki erkin boʻlmagan xabar — 404, hech narsa yozilmaydi', async () => {
    const b = baza(JURNAL);
    expect((await javobniBahola(b.rpc, 'tok', { matn: 'begona matn', baho: 'yaxshi' })).status).toBe(404);
    expect((await javobniBahola(b.rpc, 'tok', { matn: 'Ismingiz va familiyangiz?', baho: 'yaxshi' })).status).toBe(404);
    expect(b.yozilgan).toEqual([]);
  });

  it('notoʻgʻri baho yoki matn — 400; begona sessiya — 401', async () => {
    const b = baza(JURNAL);
    expect((await javobniBahola(b.rpc, 'tok', { matn: JAVOB, baho: 'ajoyib' })).status).toBe(400);
    expect((await javobniBahola(b.rpc, 'tok', { baho: 'yaxshi' })).status).toBe(400);
    expect((await javobniBahola(b.rpc, 'tok', { matn: 'a'.repeat(9_000), baho: 'yaxshi' })).status).toBe(400);
    expect((await javobniBahola(b.rpc, 'boshqa', { matn: JAVOB, baho: 'yaxshi' })).status).toBe(401);
    expect(b.yozilgan).toEqual([]);
  });
});
