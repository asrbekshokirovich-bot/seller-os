// A — kartochka belgilari (bepul) va D — taqqoslash savati (0.3.0).
//
// Nazoratchi qarori («Sotuvchi koʻzoynagi», 2026-10-21): Uzum qidiruv va
// turkum sahifasida har tovar tagida bitta qator — «≈ N dona/oy» va rangli
// nuqta; bir tugma bilan «Xaridor koʻzi»ga qaytadi. «+ Taqqoslash» —
// savatchaga (5 tagacha), jadval saytda ochiladi.
//
// TARMOQQA CHIQMAYDI — soʻrovni `background.ts` yuboradi. Uzumga ham
// soʻrov ketmaydi: faqat sahifada turgan havolalardagi tovar raqamlari oʻqiladi.
// DOM faqat `textContent` bilan quriladi (innerHTML yoʻq).

import { BELGI_BOLAGI, TAQQOS_MAX, hrefdanId, qisqaSana, savatdanOl, savatgaQosh, soraladiganlar, taqqosManzili, type SavatTovari } from './koz';

const SAYT = 'https://zumsavdo.vercel.app';
const KOZ_KALITI = 'koz';
const SAVAT_KALITI = 'taqqos';

interface Belgi {
  productId: number;
  rang: 'yashil' | 'sariq' | 'kulrang' | 'yoq';
  matn: string;
  /** Rasm ustidagi qisqa yozuv (server, 0.3.0). Eski server bermasa — `matn`. */
  qisqa?: string;
  izoh: string;
  /** Tovar turkumi (server, 0.4.0) — qidiruv sahifasida bozor paneli shu boʻyicha. */
  kategoriya?: number | null;
  kategoriyaNomi?: string | null;
}

/** Sahifa ichidagi kesh: Uzum kartochkani qayta chizsa, qator darhol qaytadi. */
const belgilar = new Map<number, Belgi>();
const soralmoqda = new Set<number>();
/**
 * Shu sahifada bir marta soʻralgan id: javobda kelmasa ham qayta soʻralmaydi —
 * aks holda har DOM oʻzgarishida bir xil soʻrov ketardi (sinov, 2026-10-21: 5 ta).
 * Tarmoq xatosida chiqariladi — keyin qayta urinadi.
 */
const soralgan = new Set<number>();
let malumotSanasi: string | null = null;
let sotuvchiKozi = true;
let savat: SavatTovari[] = [];

/**
 * Bizning oynalar (bozor paneli, dok, pasport) ichidagi tovar havolalari Uzum
 * kartochkasi emas: bozor panelidagi «eng koʻp sotilayotganlar» havolasiga belgi
 * yopishib qolardi (haqiqiy sahifada koʻrildi, 2026-10-27).
 */
const BIZNING_OYNALAR = '#zs-bozor, #zs-dok, #zs-pasport, #selleros-xitoy-panel';

function tovarHavolalari(): HTMLAnchorElement[] {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/product/"]'))
    .filter((a) => !a.closest(BIZNING_OYNALAR));
}

/**
 * Kartochka ildizi: havoladan yuqoriga — ota-element boshqa tovar havolasini
 * ham oʻz ichiga olguncha. Uzum klass nomlariga tayanmaydi (ular oʻzgaradi):
 * qoʻshni kartochkalar turgan joy — tarmoq, undan bitta past — kartochka.
 */
function kartaIldizi(a: HTMLElement, id: number): HTMLElement | null {
  let el: HTMLElement = a;
  for (let i = 0; i < 8 && el.parentElement && el.parentElement !== document.body; i++) {
    const ota = el.parentElement;
    const boshqa = Array.from(ota.querySelectorAll<HTMLAnchorElement>('a[href*="/product/"]'))
      .some((x) => { const b = hrefdanId(x.getAttribute('href')); return b !== null && b !== id; });
    if (boshqa) return el;
    el = ota;
  }
  return null;
}

/** Kartochkadagi tovar nomi — eng uzun harfli qator (narx va «sharh» qatorlari qisqa). */
function kartaNomi(karta: HTMLElement, id: number): string {
  const qatorlar = (karta.innerText || '').split('\n').map((s) => s.trim())
    .filter((s) => /\p{L}{3,}/u.test(s) && !/soʻm|сум|so'm|sharh|отзыв|oyiga|в месяц/i.test(s));
  const eng = qatorlar.sort((a, b) => b.length - a.length)[0];
  return eng ? eng.slice(0, 120) : `Tovar ${id}`;
}

/**
 * Belgi rasm USTIDA, chap yuqori burchakda (0.3.0). Uzum toʻrida qator
 * balandligi qatʼiy (444 px, oʻlchandi 2026-10-21): kartochka ostiga qoʻshilgan
 * qator keyingi qatordagi rasm ustiga toshardi. Rasm ustida joylashuv
 * oʻzgarmaydi; toʻliq matn, izoh va «+ Taqqoslash» — ustiga kelganda.
 */
function belgiYasa(b: Belgi, karta: HTMLElement): HTMLElement {
  const q = document.createElement('div');
  q.className = `zs-belgi zs-${b.rang}`;
  q.dataset.zsId = String(b.productId);
  // Belgi ichidagi bosish kartochka havolasiga oʻtmasin.
  q.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });

  const tabletka = document.createElement('div');
  tabletka.className = 'zs-tabletka';
  const nuqta = document.createElement('span');
  nuqta.className = 'zs-nuqta';
  const qisqa = document.createElement('b');
  qisqa.textContent = b.qisqa ?? b.matn;
  tabletka.append(nuqta, qisqa);

  const oyna = document.createElement('div');
  oyna.className = 'zs-belgi-oyna';
  const matn = document.createElement('b');
  matn.textContent = b.matn;
  const izoh = document.createElement('small');
  izoh.textContent = b.izoh;
  const qosh = document.createElement('button');
  qosh.type = 'button';
  qosh.className = 'zs-qosh';
  qosh.textContent = savat.some((x) => x.id === b.productId) ? '✓ Taqqoslashda' : '+ Taqqoslash';
  qosh.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    void savatgaQoshish({ id: b.productId, nom: kartaNomi(karta, b.productId) });
  });
  const manba = document.createElement('small');
  manba.className = 'zs-manba';
  const sana = qisqaSana(malumotSanasi);
  manba.textContent = `ZumSavdo oʻlchovi${sana ? `, ${sana} holatiga` : ''} · taxminiy`;
  oyna.append(matn, izoh, qosh, manba);

  q.append(tabletka, oyna);
  return q;
}

/**
 * Rasm bloki — rasmni oʻz ichiga olgan, kartochka havolasining BEVOSITA bolasi
 * (Uzumda `.product-card__visual`, klassga tayanmasdan). Rasmning oʻz otasi
 * EMAS: sichqoncha kelganda Uzum rasm karuselini qayta chizadi va u yerga
 * qoʻyilgan belgi oʻchib ketardi (oʻlchandi 2026-10-21, haqiqiy sahifada).
 */
function rasmBloki(karta: HTMLElement): HTMLElement {
  const img = karta.querySelector('img');
  if (!img) return karta;
  const havola = img.closest('a') ?? karta;
  let el: HTMLElement = img;
  while (el.parentElement && el.parentElement !== havola && el.parentElement !== karta) el = el.parentElement;
  return el;
}

function chiz(): void {
  for (const a of tovarHavolalari()) {
    const id = hrefdanId(a.getAttribute('href'));
    if (id === null) continue;
    const b = belgilar.get(id);
    if (!b) continue;
    const karta = kartaIldizi(a, id);
    if (!karta || karta.querySelector(`.zs-belgi[data-zs-id="${id}"]`)) continue;
    const joy = rasmBloki(karta);
    if (getComputedStyle(joy).position === 'static') joy.classList.add('zs-joy');
    joy.appendChild(belgiYasa(b, karta));
  }
}

/**
 * Sahifadagi tovarlar (havolasi bor, belgisi kelgan): belgi va kartochkadagi nom —
 * bozor paneli turkumni va bir xil nomli turkumlarni ajratish soʻzini shundan oladi.
 */
export function sahifaTovarlari(): Array<Belgi & { nom: string }> {
  const korildi = new Set<number>();
  const natija: Array<Belgi & { nom: string }> = [];
  for (const a of tovarHavolalari()) {
    const id = hrefdanId(a.getAttribute('href'));
    if (id === null || korildi.has(id)) continue;
    korildi.add(id);
    const b = belgilar.get(id);
    if (!b) continue;
    const karta = kartaIldizi(a, id);
    const nom = karta ? kartaNomi(karta, id) : '';
    natija.push({ ...b, nom: nom === `Tovar ${id}` ? '' : nom });
  }
  return natija;
}

let kutish: ReturnType<typeof setTimeout> | null = null;

/** Sahifani koʻzdan kechiradi: yangi tovarlarni soʻraydi, borlarini chizadi. */
export function belgilarniYangila(): void {
  if (kutish) clearTimeout(kutish);
  kutish = setTimeout(() => { void yangila(); }, 400);
}

async function yangila(): Promise<void> {
  // «Xaridor koʻzi» — belgilar yashirin va serverga HECH NARSA soʻralmaydi (PRIVACY.md 0.3.0).
  if (!sotuvchiKozi) return;
  const ids = new Set<number>();
  for (const a of tovarHavolalari()) {
    const id = hrefdanId(a.getAttribute('href'));
    if (id !== null) ids.add(id);
  }
  chiz();
  const kerak = soraladiganlar(ids, (id) => belgilar.has(id) || soralmoqda.has(id) || soralgan.has(id), BELGI_BOLAGI);
  if (!kerak.length) return;
  kerak.forEach((id) => { soralmoqda.add(id); soralgan.add(id); });
  try {
    const j = (await chrome.runtime.sendMessage({ tur: 'belgilar', ids: kerak })) as
      { sana?: string | null; belgilar?: Belgi[]; xato?: string } | undefined;
    if (j?.belgilar) {
      for (const b of j.belgilar) if (b && typeof b.productId === 'number') belgilar.set(b.productId, b);
      if (j.sana) { malumotSanasi = j.sana; dockniYangila(); }
    }
    if (j?.xato) {
      console.warn('ZumSavdo: belgilar olinmadi —', j.xato);
      kerak.forEach((id) => soralgan.delete(id));
    }
  } catch (e) {
    // Kengaytma yangilangan (eski sahifa) yoki ishchi uxlagan — keyingi koʻrishda qayta.
    console.warn('ZumSavdo: belgilar xabari yiqildi', e);
    kerak.forEach((id) => soralgan.delete(id));
  } finally {
    kerak.forEach((id) => soralmoqda.delete(id));
  }
  chiz();
  // Bitta soʻrovga sigʻmaganlari (100 dan koʻp) — navbatdagisi.
  if (kerak.length >= BELGI_BOLAGI) belgilarniYangila();
}

// ---- dok: «Sotuvchi koʻzi» va taqqoslash savati

const DOK_ID = 'zs-dok';

function kozniQoy(sotuvchi: boolean): void {
  const yoqildi = sotuvchi && !sotuvchiKozi;
  sotuvchiKozi = sotuvchi;
  document.documentElement.classList.toggle('zs-xaridor-kozi', !sotuvchi);
  dockniYangila();
  // Xaridor koʻzida soʻralmagan belgilar endi soʻraladi.
  if (yoqildi) belgilarniYangila();
}

async function savatgaQoshish(t: SavatTovari): Promise<void> {
  const r = savatgaQosh(savat, t, TAQQOS_MAX);
  if (r.toldi) {
    dockXabari(`Savatda ${TAQQOS_MAX} ta tovar bor — avval birini olib tashlang.`);
    return;
  }
  savat = r.savat;
  await chrome.storage.local.set({ [SAVAT_KALITI]: savat });
  dockniYangila();
  qoshTugmalariniYangila();
}

export function pasportdanQosh(t: SavatTovari): Promise<void> {
  return savatgaQoshish(t);
}

function qoshTugmalariniYangila(): void {
  document.querySelectorAll<HTMLElement>('.zs-belgi').forEach((q) => {
    const id = Number(q.dataset.zsId);
    const btn = q.querySelector<HTMLButtonElement>('.zs-qosh');
    if (btn) btn.textContent = savat.some((x) => x.id === id) ? '✓ Taqqoslashda' : '+ Taqqoslash';
  });
}

let xabarVaqti: ReturnType<typeof setTimeout> | null = null;
function dockXabari(matn: string): void {
  const el = document.querySelector<HTMLElement>(`#${DOK_ID} .zs-dok-xabar`);
  if (!el) return;
  el.textContent = matn;
  el.hidden = false;
  if (xabarVaqti) clearTimeout(xabarVaqti);
  xabarVaqti = setTimeout(() => { el.hidden = true; }, 4000);
}

async function jadvalniOch(): Promise<void> {
  if (!savat.length) return;
  let token: string | null = null;
  try {
    const j = (await chrome.runtime.sendMessage({ tur: 'sessiya' })) as { token?: string | null } | undefined;
    token = typeof j?.token === 'string' && j.token ? j.token : null;
  } catch { /* token boʻlmasa ham sahifa ochiladi — sayt oʻz sessiyasini ochadi */ }
  window.open(taqqosManzili(SAYT, savat.map((x) => x.id), token), '_blank', 'noopener');
}

function dockYarat(): HTMLElement {
  const dok = document.createElement('div');
  dok.id = DOK_ID;

  const qator = document.createElement('div');
  qator.className = 'zs-dok-qator';
  const z = document.createElement('span');
  z.className = 'zs-dok-z';
  z.textContent = 'Z';
  const koz = document.createElement('button');
  koz.type = 'button';
  koz.className = 'zs-dok-koz';
  koz.addEventListener('click', () => {
    kozniQoy(!sotuvchiKozi);
    void chrome.storage.local.set({ [KOZ_KALITI]: sotuvchiKozi ? 'sotuvchi' : 'xaridor' });
  });
  const taqqos = document.createElement('button');
  taqqos.type = 'button';
  taqqos.className = 'zs-dok-taqqos';
  taqqos.addEventListener('click', () => {
    const r = dok.querySelector<HTMLElement>('.zs-dok-savat');
    if (r) r.hidden = !r.hidden;
  });
  qator.append(z, koz, taqqos);

  const savatEl = document.createElement('div');
  savatEl.className = 'zs-dok-savat';
  savatEl.hidden = true;

  const xabar = document.createElement('div');
  xabar.className = 'zs-dok-xabar';
  xabar.hidden = true;

  dok.append(savatEl, xabar, qator);
  return dok;
}

function dockniYangila(): void {
  const dok = document.getElementById(DOK_ID);
  if (!dok) return;
  const koz = dok.querySelector<HTMLButtonElement>('.zs-dok-koz');
  if (koz) {
    koz.textContent = sotuvchiKozi ? 'Sotuvchi koʻzi: yoqiq' : 'Xaridor koʻzi';
    koz.setAttribute('aria-pressed', String(sotuvchiKozi));
    const sana = qisqaSana(malumotSanasi);
    koz.title = sana ? `Sotuv belgilari ${sana} holatiga (ZumSavdo oʻlchovi, taxminiy)` : 'Sotuv belgilari — ZumSavdo oʻlchovi (taxminiy)';
  }
  const taqqos = dok.querySelector<HTMLButtonElement>('.zs-dok-taqqos');
  if (taqqos) {
    taqqos.textContent = `Taqqoslash (${savat.length})`;
    taqqos.disabled = savat.length === 0;
  }
  const savatEl = dok.querySelector<HTMLElement>('.zs-dok-savat');
  if (savatEl) {
    savatEl.replaceChildren();
    for (const t of savat) {
      const r = document.createElement('div');
      r.className = 'zs-dok-tovar';
      const nom = document.createElement('span');
      nom.textContent = t.nom;
      const ol = document.createElement('button');
      ol.type = 'button';
      ol.textContent = '×';
      ol.title = 'Savatdan olib tashlash';
      ol.addEventListener('click', () => {
        savat = savatdanOl(savat, t.id);
        void chrome.storage.local.set({ [SAVAT_KALITI]: savat });
        dockniYangila();
        qoshTugmalariniYangila();
      });
      r.append(nom, ol);
      savatEl.appendChild(r);
    }
    const och = document.createElement('button');
    och.type = 'button';
    och.className = 'zs-dok-och';
    och.textContent = savat.length >= 2 ? 'Jadvalda taqqoslash →' : 'Kamida 2 ta tovar qoʻshing';
    och.disabled = savat.length < 2;
    och.addEventListener('click', () => { void jadvalniOch(); });
    savatEl.appendChild(och);
    if (!savat.length) savatEl.hidden = true;
  }
}

/** Bir marta: dok, saqlangan holat, boshqa varaqlardagi oʻzgarish. */
export async function belgilarniBoshla(): Promise<void> {
  if (!document.getElementById(DOK_ID)) document.body.appendChild(dockYarat());
  try {
    const s = await chrome.storage.local.get([KOZ_KALITI, SAVAT_KALITI]);
    kozniQoy(s[KOZ_KALITI] !== 'xaridor');
    savat = Array.isArray(s[SAVAT_KALITI]) ? (s[SAVAT_KALITI] as SavatTovari[]).slice(0, TAQQOS_MAX) : [];
  } catch {
    kozniQoy(true);
  }
  dockniYangila();
  chrome.storage.onChanged.addListener((o, joy) => {
    if (joy !== 'local') return;
    if (o[SAVAT_KALITI]) {
      savat = Array.isArray(o[SAVAT_KALITI].newValue) ? (o[SAVAT_KALITI].newValue as SavatTovari[]) : [];
      dockniYangila();
      qoshTugmalariniYangila();
    }
    if (o[KOZ_KALITI]) kozniQoy(o[KOZ_KALITI].newValue !== 'xaridor');
  });
  belgilarniYangila();
}
