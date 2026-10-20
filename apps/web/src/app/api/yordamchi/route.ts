/**
 * Sahifa yordamchisi — vositachi (2026-10-19, «Har sahifada AI yordamchi»).
 *
 * POST {savol, sahifa, tarix, til} → Edge `/yordamchi` → {matn, manba}. Sessiya
 * boʻlsa (cookie yoki kengaytma sarlavhasi) — u bilan: yordamchi mijoz suhbatda
 * qayerdaligini biladi. Boʻlmasa — sessiyasiz: bosh sahifada savol bergan odamga
 * yangi sessiya OCHILMAYDI (savol bergani — yoʻlni «boshladi» degani emas).
 */

import { apiga, sozlanganmi, token } from '@/lib/sessiya';
import { sorovTokeni } from '@/lib/sessiya-sarlavha';

/** AI javobi 25 s gacha, darvozadan oʻtmasa — yana bir urinish. */
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  if (!sozlanganmi()) return javob({ xato: 'API manzili sozlanmagan' }, 503);

  let tana = '{}';
  try { tana = JSON.stringify(await request.json()); } catch { /* boʻsh */ }

  try {
    const t = sorovTokeni(request) ?? (await token()) ?? '';
    const r = await apiga('/yordamchi', t, { method: 'POST', body: tana });
    return new Response(await r.text(), {
      status: r.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (xato) {
    console.error('/api/yordamchi:', xato);
    return javob({ xato: 'API ga ulanib boʻlmadi' }, 502);
  }
}

function javob(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
