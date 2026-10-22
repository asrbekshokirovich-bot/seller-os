// «Sotuvchi koʻzoynagi» (0.3.0) — sof funksiyalar (testlanadi, `test/koz.test.ts`).
//
// Nazoratchi qarori (2026-10-21): Uzum roʻyxatida har tovar tagida sotuv belgisi
// (bepul), tovar sahifasida pasport, taqqoslash savati → saytdagi jadval.

/** Bir soʻrovda eng koʻp tovar (server `BELGI_MAX`). */
export const BELGI_BOLAGI = 100;
/** Taqqoslash savatida eng koʻp tovar (server `TAQQOS_MAX`). */
export const TAQQOS_MAX = 5;
/** Belgi shuncha vaqt keshda turadi — maʼlumot kuniga bir marta yangilanadi. */
export const BELGI_KESH_MS = 3 * 3600_000;

/**
 * Uzum havolasidan tovar id. Haqiqiy shakl `/uz/product/<slug>-<id>`
 * (oʻlchandi 2026-09-29), `?skuId=…` ham boʻlishi mumkin; `/product/<id>` ham.
 * Boshqa sayt yoki shakl — `null`.
 */
export function hrefdanId(href: string | null | undefined): number | null {
  if (!href) return null;
  let yol: string;
  try {
    const u = new URL(href, 'https://uzum.uz');
    if (u.hostname !== 'uzum.uz' && !u.hostname.endsWith('.uzum.uz')) return null;
    yol = u.pathname;
  } catch {
    return null;
  }
  const m = yol.match(/\/product\/(?:[^/]*?-)?(\d{1,11})\/?$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Keshda yoʻq va hozir soʻralmayotgan id lar — bitta soʻrovga (koʻpi bilan `max`). */
export function soraladiganlar(ids: Iterable<number>, bor: (id: number) => boolean, max = BELGI_BOLAGI): number[] {
  const natija: number[] = [];
  for (const id of ids) {
    if (natija.length >= max) break;
    if (!bor(id) && !natija.includes(id)) natija.push(id);
  }
  return natija;
}

export interface SavatTovari {
  id: number;
  nom: string;
}

/**
 * Taqqoslash savatiga qoʻshish. Bor boʻlsa — oʻzgarmaydi; toʻla boʻlsa —
 * qoʻshilmaydi va `toldi` (eng eskisi jimgina chiqarib yuborilmaydi: odam
 * qaysi tovar yoʻqolganini bilmay qolardi).
 */
export function savatgaQosh(savat: readonly SavatTovari[], t: SavatTovari, max = TAQQOS_MAX): { savat: SavatTovari[]; toldi: boolean } {
  if (savat.some((x) => x.id === t.id)) return { savat: [...savat], toldi: false };
  if (savat.length >= max) return { savat: [...savat], toldi: true };
  return { savat: [...savat, { id: t.id, nom: t.nom.slice(0, 120) }], toldi: false };
}

export function savatdanOl(savat: readonly SavatTovari[], id: number): SavatTovari[] {
  return savat.filter((x) => x.id !== id);
}

/**
 * Saytdagi taqqoslash sahifasi. Sessiya tokeni HASH da: serverga ham, Referer
 * ga ham ketmaydi; sahifa uni `x-sessiya` sarlavhasida yuboradi (yon panel
 * bilan bir xil yoʻl, `apps/web/src/lib/sessiya-sarlavha.ts`).
 */
export function taqqosManzili(sayt: string, ids: readonly number[], token: string | null): string {
  const asos = `${sayt}/taqqos?ids=${ids.join(',')}`;
  return token ? `${asos}#sessiya=${encodeURIComponent(token)}&kengaytma=1` : asos;
}

/** «2026-10-20» → «20.10». */
export function qisqaSana(sana: string | null | undefined): string | null {
  const m = sana?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}` : null;
}
