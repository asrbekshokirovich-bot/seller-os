/**
 * CBU kursi — vositachi: `GET /api/kurs?valyuta=USD|CNY` → CBU JSON i oʻzgarmagan holda
 * (`@/lib/kurs-vositachi`). Edge Function cbu.uz ga yeta olmaydi (2026-10-27) — kursni shu
 * yerdan oladi (`CBU_VOSITACHI`).
 */

import { cbuVositachi } from '@/lib/kurs-vositachi';

export async function GET(request: Request): Promise<Response> {
  return cbuVositachi(new URL(request.url).searchParams.get('valyuta'));
}
