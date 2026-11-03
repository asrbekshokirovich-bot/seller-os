/**
 * Chiqish — sessiya cookie si oʻchiriladi (`@/lib/chiqish`). Cookie `sessiya.ts` dagidek
 * ishlab chiqarishda `Secure` bilan oʻrnatilgan — oʻchirish ham shunday.
 */

import { chiqishJavobi } from '@/lib/chiqish';

export async function POST(request: Request): Promise<Response> {
  return chiqishJavobi(request, process.env.NODE_ENV === 'production');
}
