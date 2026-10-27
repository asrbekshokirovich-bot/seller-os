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

// ---- B — bozor paneli (0.4.0, 2-bosqich)

/**
 * Uzum turkum sahifasi: `/uz/category/<slug>-<id>` (oʻlchandi 2026-10-21:
 * `/uz/category/termoslar-11931`), `/ru/…` va `/category/<id>` ham. Turkum id —
 * oxirgi raqam. Boshqa sahifa — `null`.
 */
export function turkumIdsi(yol: string): number | null {
  const m = yol.match(/\/category\/(?:[^/]*?-)?(\d{1,11})\/?$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Roʻyxat sahifasi — turkum yoki qidiruv (`/uz/search?query=…`): bozor paneli shu yerda. */
export function royxatSahifasimi(yol: string): boolean {
  return turkumIdsi(yol) !== null || /\/search\/?$/.test(yol);
}

export interface SahifaTurkumi {
  id: number;
  nom: string | null;
  soni: number;
  /** Chipdagi nom: bir xil nomli turkumlar sahifadagi tovar nomlaridan ajratiladi. */
  yorliq: string;
  /** Sahifadagi shu turkum tovarlaridan 2 tasining nomi (chip ustiga kelganda). */
  misollar: string[];
}

/** Tovar nomidagi soʻzlar (kichik harf, 3 harfdan uzun, takrorsiz). */
function sozlar(nom: string): Set<string> {
  return new Set((nom.toLocaleLowerCase().match(/\p{L}[\p{L}'ʻʼ’`-]*/gu) ?? []).filter((s) => [...s].length >= 3));
}

/** Nomlarning qancha qismida soʻz bor (0–1); nom yoʻq — 0. */
function ulush(nomlar: ReadonlyArray<Set<string>>, soz: string): number {
  return nomlar.length ? nomlar.filter((s) => s.has(soz)).length / nomlar.length : 0;
}

/**
 * Bir xil nomli turkumni ajratadigan soʻz: shu turkum tovarlari nomlarining kamida
 * yarmida bor va boshqa bir xil nomli turkumlarnikida ancha kam (farq ≥ 0,3).
 * Uzumda bu koʻpincha kimga ekani: «Qizlar …», «… erkaklar chinos shimi», «Ayollar …».
 * Ikkala turkumda ham bor soʻz («shim», «uchun») ajratmaydi — oʻz-oʻzidan tushib qoladi.
 * Faqat birinchi soʻz yetmadi (jonli «shim», 2026-10-27: erkaklar shimlari nomi har xil
 * soʻzdan boshlanadi — «Zamonaviy…», «TERRA PRO erkaklar…»).
 */
function ajratuvchiSoz(bu: readonly string[], boshqalar: ReadonlyArray<readonly string[]>, turkumNomi: string): string | null {
  if (bu.length < 2) return null;
  const meniki = bu.map(sozlar);
  const ularniki = boshqalar.map((b) => b.map(sozlar));
  // Turkum nomining oʻzaklari: «Shimlar» → «shim» — «shim», «shimi» ajratuvchi emas
  // (jonli «shim», 2026-10-27: «Shimlar (Shim)» chiqardi).
  const ozaklar = [...sozlar(turkumNomi)].map((s) => [...s].slice(0, 4).join(''));
  let eng: { soz: string; farq: number; u: number } | null = null;
  for (const s of meniki) {
    for (const soz of s) {
      if (ozaklar.some((o) => soz.startsWith(o))) continue;
      // Kamida 2 ta nomda: bitta nomdagi tasodifiy soʻz («polo») turkum belgisi emas.
      const u = ulush(meniki, soz);
      if (u < 0.5 || u * meniki.length < 2) continue;
      const farq = u - Math.max(0, ...ularniki.map((b) => ulush(b, soz)));
      if (farq < 0.3) continue;
      if (!eng || farq > eng.farq || (farq === eng.farq && u > eng.u)) eng = { soz, farq, u };
    }
  }
  return eng ? eng.soz.charAt(0).toLocaleUpperCase() + eng.soz.slice(1) : null;
}

/**
 * Sahifadagi tovarlarning turkumlari, koʻpidan ozigacha (teng boʻlsa — kichik id).
 * Qidiruv sahifasida manzilda turkum yoʻq: bozor paneli shu roʻyxatning
 * birinchisini oladi. Turkumi nomaʼlum tovar sanalmaydi.
 *
 * BIR XIL NOMLAR. Bazada turkumning faqat oʻz nomi bor («Shimlar»), otasi yoʻq —
 * 312 ta nom bir necha turkumda takrorlanadi («Shimlar» — 6 ta: qizlar, ayollar…,
 * oʻlchandi 2026-10-27). Takrorlangan nom chipda sahifadagi tovar nomlaridan topilgan
 * ajratuvchi soʻz bilan beriladi («Shimlar (Qizlar)», «Shimlar (Ayollar)»). Soʻzsiz qolgan
 * bitta turkum — oddiy nomi bilan (qolganlari belgilangan, u ham ajraladi); soʻzsiz
 * ikkitasi va koʻprogʻi — tartib raqami bilan («Shimlar 1», «Shimlar 2»).
 */
export function engKopTurkumlar(
  tovarlar: Iterable<{ kategoriya?: number | null; kategoriyaNomi?: string | null; nom?: string | null }>,
  max = 3,
): SahifaTurkumi[] {
  const s = new Map<number, { id: number; nom: string | null; soni: number; nomlar: string[] }>();
  for (const t of tovarlar) {
    const id = t.kategoriya;
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) continue;
    let bor = s.get(id);
    if (!bor) {
      bor = { id, nom: t.kategoriyaNomi ?? null, soni: 0, nomlar: [] };
      s.set(id, bor);
    }
    bor.soni += 1;
    if (!bor.nom && t.kategoriyaNomi) bor.nom = t.kategoriyaNomi;
    if (t.nom && t.nom.trim()) bor.nomlar.push(t.nom.trim());
  }
  const tanlov = [...s.values()].sort((a, b) => b.soni - a.soni || a.id - b.id).slice(0, max);
  const nomi = (t: { id: number; nom: string | null }) => t.nom ?? `Turkum ${t.id}`;
  const yorliq = new Map<number, string>();
  for (const t of tanlov) {
    if (yorliq.has(t.id)) continue;
    const guruh = tanlov.filter((x) => nomi(x).toLocaleLowerCase() === nomi(t).toLocaleLowerCase());
    if (guruh.length === 1) {
      yorliq.set(t.id, nomi(t));
      continue;
    }
    const sozlar = guruh.map((x) => ajratuvchiSoz(x.nomlar, guruh.filter((y) => y !== x).map((y) => y.nomlar), nomi(x)));
    const sozsiz = guruh.filter((_, i) => sozlar[i] === null);
    guruh.forEach((x, i) => {
      const soz = sozlar[i];
      yorliq.set(x.id, soz ? `${nomi(x)} (${soz})` : sozsiz.length === 1 ? nomi(x) : `${nomi(x)} ${sozsiz.indexOf(x) + 1}`);
    });
  }
  return tanlov.map((t) => ({ id: t.id, nom: t.nom, soni: t.soni, yorliq: yorliq.get(t.id)!, misollar: t.nomlar.slice(0, 2) }));
}

/** 1 kasr xonasi, vergul bilan, «,0» siz. */
function kasr(x: number): string {
  const r = Math.round(x * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace('.', ',');
}

/** Katta soʻm qisqa: 1 234 567 890 → «1,2 mlrd», 45 600 000 → «45,6 mln», 950 000 → «950 ming». */
export function somQisqa(n: number): string {
  if (n >= 1e9) return `${kasr(n / 1e9)} mlrd`;
  if (n >= 1e6) return `${kasr(n / 1e6)} mln`;
  if (n >= 1e3) return `${kasr(n / 1e3)} ming`;
  return String(Math.round(n));
}

/** Butun son, minglar boʻsh joy bilan: 17 300. */
export function minglik(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
