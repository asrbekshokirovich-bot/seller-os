// B — bozor paneli (obunada; cheklov oʻchiq paytda hammaga) — 0.4.0.
//
// Nazoratchi qarori («Sotuvchi koʻzoynagi», 2-bosqich, 2026-10-26): Uzum turkum
// yoki qidiruv sahifasida dokdagi «Bozor» tugmasi — shu turkum boʻyicha talab,
// taklif, narx zinapoyasi, raqobat va eng koʻp sotilayotganlar. Hamma raqam
// serverdan (`shared/bozor-paneli.ts`); bu yerda faqat chizish (textContent).
//
// Soʻrov FAQAT tugma bosilganda ketadi (turkum raqami, tanada) — sahifa
// ochilishi bilan emas. «Xaridor koʻzi» da tugma ham, panel ham koʻrinmaydi.

import { sahifaBelgilari } from './belgilar';
import { engKopTurkumlar, minglik, qisqaSana, royxatSahifasimi, somQisqa, turkumIdsi, type SahifaTurkumi } from './koz';

const SAYT = 'https://zumsavdo.vercel.app';
export const BOZOR_ID = 'zs-bozor';

interface Pogona { yorliq: string; tovar: number; sotilgan: number; talab: number; birga: number; eng: boolean }
interface Panel {
  kategoriya: number;
  nom: string | null;
  sana: string | null;
  taklif: { tovar: number; dokon: number };
  talab: { oyiga: number; raqamli: number; raqamsiz: number; ziddiyat: number; aylanma: number | null };
  sotilgan: { soni: number; ulush: number | null };
  raqobat: { top3: number | null; daraja: 'ochiq' | 'orta' | 'qattiq' | null; dokonlar: Array<{ id: number; nom: string | null; ulush: number }> };
  zina: Pogona[];
  top: Array<{ productId: number; nom: string | null; oyiga: number; narx: number | null }>;
  xulosa: string[];
}
interface Javob {
  status?: number;
  sana?: string | null;
  panel?: Panel;
  /** 402 (obuna qulfi) — bepul qism. */
  nom?: string | null;
  taklif?: Panel['taklif'];
  talab?: Panel['talab'];
  izoh?: string;
  narx_som?: number;
  xato?: string;
}

const DARAJA: Record<string, string> = { ochiq: 'bozor ochiq', orta: 'oʻrtacha', qattiq: 'kuchli doʻkonlar qoʻlida' };

/** Panel qaysi sahifa uchun ochilgan (SPA: boshqa sahifaga oʻtilsa yopiladi). */
let ochiqSahifa: string | null = null;
/** Odam chipdan tanlagan turkum (qidiruv sahifasida). */
let tanlov: number | null = null;
let soralmoqda = 0;

function el<K extends keyof HTMLElementTagNameMap>(teg: K, klass?: string, matn?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(teg);
  if (klass) e.className = klass;
  if (matn !== undefined) e.textContent = matn;
  return e;
}

/**
 * Sahifa kaliti: yoʻl va qidiruv soʻzi. Boshqa parametrlar (saralash, sahifa
 * raqami) kalitga kirmaydi — ular oʻzgarganda turkum oʻsha, panel yopilmasin.
 */
const sahifaKaliti = () => location.pathname + (new URLSearchParams(location.search).get('query') ?? '');
const sotuvchiKozimi = () => !document.documentElement.classList.contains('zs-xaridor-kozi');

function korsatkich(nom: string, qiymat: string, izoh: string): HTMLElement {
  const d = el('div', 'zs-bk');
  d.append(el('small', '', nom), el('b', '', qiymat), el('span', '', izoh));
  return d;
}

function zinapoya(zina: Pogona[]): HTMLElement {
  const blok = el('div', 'zs-zina');
  const bosh = el('div', 'zs-zina-bosh');
  bosh.append(el('b', '', 'Narx zinapoyasi, soʻm'));
  const t = el('span', 'zs-zina-belgi'); t.append(el('i', 'zs-zina-i-tovar'), document.createTextNode('taklif — tovar'));
  const d = el('span', 'zs-zina-belgi'); d.append(el('i', 'zs-zina-i-talab'), document.createTextNode('talab — oyiga dona'));
  bosh.append(t, d);
  blok.append(bosh);
  const engTovar = Math.max(1, ...zina.map((z) => z.tovar));
  const engTalab = Math.max(1, ...zina.map((z) => z.talab));
  for (const z of zina) {
    const q = el('div', `zs-zina-qator${z.eng ? ' zs-zina-eng' : ''}`);
    q.title = `${z.yorliq}: ${minglik(z.tovar)} tovar, ${minglik(z.sotilgan)} tasi sotildi, oyiga ≈ ${minglik(z.talab)} dona`;
    const ustun = el('div', 'zs-zina-ustun');
    for (const [klass, qiymat, eng, matn] of [
      ['zs-zina-tovar', z.tovar, engTovar, `${minglik(z.tovar)} tovar`],
      ['zs-zina-talab', z.talab, engTalab, `≈ ${minglik(z.talab)}`],
    ] as const) {
      const r = el('div', 'zs-zina-r');
      const bar = el('div', `zs-zina-bar ${klass}`);
      bar.style.width = `${Math.max(2, (qiymat / eng) * 72)}%`;
      r.append(bar, el('span', 'zs-zina-son', matn));
      ustun.append(r);
    }
    const birga = el('div', 'zs-zina-birga');
    birga.append(el('b', '', z.birga >= 10 ? minglik(z.birga) : z.birga.toFixed(1).replace('.', ',')), el('span', '', '1 tovarga'));
    q.append(el('div', 'zs-zina-yorliq', z.yorliq), ustun, birga);
    blok.append(q);
  }
  return blok;
}

function turkumChiplari(turkumlar: SahifaTurkumi[], faol: number, qayta: () => void): HTMLElement | null {
  if (turkumlar.length < 2) return null;
  const qator = el('div', 'zs-bozor-chiplar');
  for (const t of turkumlar) {
    const c = el('button', `zs-bozor-chip${t.id === faol ? ' zs-faol' : ''}`, `${t.nom ?? `Turkum ${t.id}`} · ${t.soni}`);
    c.type = 'button';
    c.title = `Sahifadagi ${t.soni} ta tovar shu turkumda`;
    c.addEventListener('click', () => { tanlov = t.id; qayta(); });
    qator.append(c);
  }
  return qator;
}

function chiz(panel: HTMLElement, j: Javob, o: { turkumlar: SahifaTurkumi[]; faol: number; umumiy: boolean; qayta: () => void }): void {
  panel.replaceChildren();
  const bosh = el('div', 'zs-pasport-bosh');
  bosh.append(el('span', 'zs-tamga', 'ZumSavdo · bozor paneli'));
  const ong = el('span', 'zs-bozor-ong');
  const sana = qisqaSana(j.sana ?? j.panel?.sana ?? null);
  if (sana) ong.append(el('span', 'zs-sana', `${sana} holatiga · 30 kun`));
  const yop = el('button', 'zs-bozor-yop', '×');
  yop.type = 'button';
  yop.title = 'Yopish';
  yop.setAttribute('aria-label', 'Bozor panelini yopish');
  yop.addEventListener('click', yopish);
  ong.append(yop);
  bosh.append(ong);
  panel.append(bosh);

  const p = j.panel;
  const nom = p?.nom ?? j.nom ?? null;
  panel.append(el('div', 'zs-bozor-nom', nom ?? `Turkum ${o.faol}`));
  const chiplar = turkumChiplari(o.turkumlar, o.faol, o.qayta);
  if (chiplar) panel.append(chiplar);
  if (o.umumiy) {
    panel.append(el('p', 'zs-izoh', 'Bu umumiy turkum — panel sahifadagi tovarlarning eng koʻp turkumi boʻyicha.'));
  }

  const talab = p?.talab ?? j.talab;
  const taklif = p?.taklif ?? j.taklif;
  if (j.status === 402 && talab && taklif) {
    // Obuna qulfi: talab va taklif (bepul qism) baribir koʻrinadi.
    const k = el('div', 'zs-bk-tor');
    k.append(
      korsatkich('Talab', `≈ ${minglik(talab.oyiga)} dona/oy`, `${minglik(talab.raqamli)} tovar boʻyicha`),
      korsatkich('Taklif', `${minglik(taklif.tovar)} tovar`, `${minglik(taklif.dokon)} doʻkon`),
    );
    panel.append(k, el('p', 'zs-qulf', j.izoh ?? 'Toʻliq bozor paneli obuna bilan ochiladi.'));
    const a = el('a', 'zs-tugma zs-asosiy', `Obuna — ${minglik(j.narx_som ?? 149000)} soʻm/oy`);
    a.href = `${SAYT}/usta`; a.target = '_blank'; a.rel = 'noopener noreferrer';
    panel.append(a);
    return;
  }
  if (!p) {
    panel.append(el('p', 'zs-izoh', j.xato ? `Bozor maʼlumoti olinmadi: ${j.xato}` : 'Bozor maʼlumoti olinmadi — keyinroq qayta urinib koʻring.'));
    return;
  }
  if (p.taklif.tovar === 0) {
    panel.append(el('p', 'zs-izoh', 'Bu turkumda ZumSavdo oʻlchagan faol tovar yoʻq.'));
    return;
  }

  const k = el('div', 'zs-bk-tor');
  k.append(
    korsatkich('Talab', `≈ ${minglik(p.talab.oyiga)} dona/oy`,
      p.talab.aylanma !== null ? `aylanma ≈ ${somQisqa(p.talab.aylanma)} soʻm/oy` : `${minglik(p.talab.raqamli)} tovar boʻyicha`),
    korsatkich('Taklif', `${minglik(p.taklif.tovar)} tovar`, `${minglik(p.taklif.dokon)} doʻkon`),
    korsatkich('Sotilayotgani', p.sotilgan.ulush === null ? '—' : `${Math.round(p.sotilgan.ulush)} %`, `${minglik(p.sotilgan.soni)} tovar sotildi`),
    korsatkich('Raqobat', p.raqobat.top3 === null ? '—' : `top-3: ${Math.round(p.raqobat.top3)} %`, p.raqobat.daraja ? DARAJA[p.raqobat.daraja] ?? '' : 'sotuv yoʻq'),
  );
  panel.append(k);

  if (p.zina.length) panel.append(zinapoya(p.zina));

  if (p.xulosa.length) {
    const x = el('ul', 'zs-bozor-xulosa');
    for (const s of p.xulosa) x.append(el('li', '', s));
    panel.append(x);
  }

  if (p.top.length) {
    const blok = el('div', 'zs-bozor-top');
    blok.append(el('b', '', 'Eng koʻp sotilayotganlar'));
    const ol = el('ol');
    for (const t of p.top) {
      const li = el('li');
      const a = el('a', '', t.nom ?? `Tovar ${t.productId}`);
      a.href = `https://uzum.uz/uz/product/${t.productId}`;
      a.target = '_blank';
      a.rel = 'noopener';
      li.append(a, el('span', '', ` · ≈ ${minglik(t.oyiga)}/oy${t.narx !== null ? ` · ${minglik(t.narx)} soʻm` : ''}`));
      ol.append(li);
    }
    blok.append(ol);
    panel.append(blok);
  }

  if (p.raqobat.dokonlar.length) {
    const d = p.raqobat.dokonlar.map((x) => `${x.nom ?? `#${x.id}`} ${Math.round(x.ulush)} %`).join(', ');
    panel.append(el('p', 'zs-izoh', `Eng katta doʻkonlar (talab ulushi): ${d}.`));
  }

  const izoh: string[] = ['ZumSavdo oʻlchovi, taxminiy', 'faol tovar — oxirgi 7 kunda oʻlchangan'];
  if (p.talab.raqamsiz) izoh.push(`${minglik(p.talab.raqamsiz)} tasi hali kam oʻlchangan`);
  if (p.talab.ziddiyat) izoh.push(`${minglik(p.talab.ziddiyat)} tasining sotuvi aniq emas — talabga kirmadi`);
  panel.append(el('p', 'zs-bozor-manba', `${izoh.join(' · ')}.`));
}

async function sora(kategoriya: number): Promise<Javob> {
  try {
    return ((await chrome.runtime.sendMessage({ tur: 'bozor', kategoriya })) ?? {}) as Javob;
  } catch (e) {
    return { xato: e instanceof Error && /context invalidated/i.test(e.message) ? 'kengaytma yangilandi — sahifani yangilang (F5)' : 'javob kelmadi' };
  }
}

async function yukla(): Promise<void> {
  const panel = document.getElementById(BOZOR_ID);
  if (!panel || !sotuvchiKozimi()) return;
  const kalit = sahifaKaliti();
  const navbat = ++soralmoqda;
  const urlTurkum = turkumIdsi(location.pathname);
  const turkumlar = engKopTurkumlar(sahifaBelgilari());
  let faol = tanlov ?? urlTurkum ?? turkumlar[0]?.id ?? null;
  if (faol === null) {
    panel.replaceChildren(el('p', 'zs-izoh', 'Sahifadagi tovarlar hali yuklanmadi — biroz kutib, «Bozor» ni qayta bosing.'));
    return;
  }
  panel.replaceChildren(el('p', 'zs-izoh', 'ZumSavdo: bozor maʼlumoti yuklanmoqda…'));
  let j = await sora(faol);
  let umumiy = false;
  // Umumiy (ota) turkum sahifasi: bazada tovar bevosita barg turkumlarda — sahifadagi
  // tovarlarning eng koʻp turkumi olinadi va bu ochiq yoziladi.
  if (tanlov === null && faol === urlTurkum && j.panel && j.panel.taklif.tovar === 0 && turkumlar[0] && turkumlar[0].id !== faol) {
    faol = turkumlar[0].id;
    umumiy = true;
    j = await sora(faol);
  }
  if (navbat !== soralmoqda || sahifaKaliti() !== kalit || !panel.isConnected) return;
  chiz(panel, j, { turkumlar: urlTurkum !== null && !umumiy ? [] : turkumlar, faol, umumiy, qayta: () => { void yukla(); } });
}

function yopish(): void {
  document.getElementById(BOZOR_ID)?.remove();
  ochiqSahifa = null;
  document.querySelector<HTMLButtonElement>('.zs-dok-bozor')?.setAttribute('aria-pressed', 'false');
}

function ochish(): void {
  yopish();
  const panel = el('div');
  panel.id = BOZOR_ID;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'ZumSavdo bozor paneli');
  document.body.appendChild(panel);
  ochiqSahifa = sahifaKaliti();
  tanlov = null;
  document.querySelector<HTMLButtonElement>('.zs-dok-bozor')?.setAttribute('aria-pressed', 'true');
  // Taqqoslash savati ochiq boʻlsa — yopiladi (ikkalasi bir joyda turadi).
  const savat = document.querySelector<HTMLElement>('#zs-dok .zs-dok-savat');
  if (savat) savat.hidden = true;
  void yukla();
}

/**
 * Har DOM oʻzgarishida (content.ts): roʻyxat sahifasida dokka «Bozor» tugmasini
 * qoʻyadi, boshqa sahifada yashiradi; boshqa sahifaga oʻtilsa ochiq panel yopiladi.
 */
export function bozorniTekshir(): void {
  const qator = document.querySelector<HTMLElement>('#zs-dok .zs-dok-qator');
  if (!qator) return;
  let tugma = qator.querySelector<HTMLButtonElement>('.zs-dok-bozor');
  const royxat = royxatSahifasimi(location.pathname);
  if (!tugma && royxat) {
    tugma = el('button', 'zs-dok-bozor', 'Bozor');
    tugma.type = 'button';
    tugma.title = 'Shu turkum bozori: talab, taklif, narx zinapoyasi, raqobat (ZumSavdo)';
    tugma.setAttribute('aria-pressed', 'false');
    tugma.addEventListener('click', () => { if (document.getElementById(BOZOR_ID)) yopish(); else ochish(); });
    qator.querySelector('.zs-dok-koz')?.after(tugma);
  }
  if (tugma) tugma.hidden = !royxat;
  if (ochiqSahifa !== null && (ochiqSahifa !== sahifaKaliti() || !royxat)) yopish();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById(BOZOR_ID)) yopish();
});
