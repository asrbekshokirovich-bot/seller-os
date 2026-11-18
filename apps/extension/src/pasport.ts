// C — tovar pasporti (obunada; cheklov oʻchiq paytda hammaga) — 0.3.0.
//
// Uzum tovar sahifasida, «Xitoydan top» tugmasi ostida: 30 kunlik sotuv
// grafigi, uch belgi tekshiruvi (qoldiq, Uzum belgisi, yangi sharh), narx
// oraligʻi, tugab qolgan kunlar, komissiya va chegara narx. Hamma raqam
// serverdan (`shared/tovar-sotuvi.ts`); bu yerda faqat chizish (textContent).

import { qisqaSana } from './koz';

const SAYT = 'https://zumsavdo.vercel.app';
export const PASPORT_ID = 'zs-pasport';

interface Belgi { productId: number; rang: string; matn: string; izoh: string }
interface Kun { sana: string; sanaldi: number | null; kamaydi: number | null; tugagan: boolean | null; narx: number | null }
interface Pasport {
  productId: number;
  nom: string | null;
  kategoriyaNomi: string | null;
  belgi: Belgi;
  baho: {
    holat: string;
    ishonch: 'yuqori' | 'orta' | 'past' | null;
    oyiga: number | null;
    malumKun: number;
    oyna: { dan: string; gacha: string } | null;
    sabablar: string[];
    kunlar: Kun[];
  };
  tekshiruv: Array<{ nom: string; mos: boolean | null; matn: string }>;
  faktlar: Array<{ nom: string; qiymat: string; izoh?: string; tur?: 'ogoh' | 'urgu' }>;
}
interface Javob {
  status?: number;
  sana?: string | null;
  pasport?: Pasport;
  belgi?: Belgi;
  cheklov?: string;
  narx_som?: number;
  izoh?: string;
  xato?: string;
}

const ISHONCH: Record<string, string> = { yuqori: 'Ishonch: yuqori', orta: 'Ishonch: oʻrta', past: 'Ishonch: past' };

function el<K extends keyof HTMLElementTagNameMap>(teg: K, klass?: string, matn?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(teg);
  if (klass) e.className = klass;
  if (matn !== undefined) e.textContent = matn;
  return e;
}

function minglik(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** 30 kunlik ustunlar: sanalgan — rangli, sanalmagan katta kun — kulrang punktir, oʻlchanmagan — nuqta. */
function grafik(kunlar: Kun[]): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 300, H = 90, L = 22, B = 14, T = 6;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'zs-grafik');
  svg.setAttribute('role', 'img');
  const sanalgan = kunlar.map((k) => k.sanaldi ?? 0);
  const eng = Math.max(1, ...sanalgan);
  const tepa = eng <= 10 ? 10 : Math.ceil(eng / 10) * 10;
  svg.setAttribute('aria-label', `Kunlik sotuv, eng kattasi ${minglik(eng)} dona`);
  const y = (v: number) => T + (H - T - B) * (1 - Math.min(v, tepa) / tepa);
  const qadam = (W - L) / kunlar.length;
  const chiziq = (v: number) => {
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', String(L)); l.setAttribute('x2', String(W));
    l.setAttribute('y1', String(y(v))); l.setAttribute('y2', String(y(v)));
    l.setAttribute('class', 'zs-grafik-tor');
    svg.appendChild(l);
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', String(L - 4)); t.setAttribute('y', String(y(v) + 3));
    t.setAttribute('text-anchor', 'end'); t.setAttribute('class', 'zs-grafik-yozuv');
    t.textContent = String(v);
    svg.appendChild(t);
  };
  chiziq(0); chiziq(tepa);
  kunlar.forEach((k, i) => {
    const x = L + i * qadam + qadam * 0.15;
    const w = qadam * 0.7;
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', String(x)); r.setAttribute('width', String(w)); r.setAttribute('rx', '1');
    const t = document.createElementNS(NS, 'title');
    if (k.sanaldi === null) {
      r.setAttribute('y', String(y(0) - 3)); r.setAttribute('height', '3');
      r.setAttribute('class', 'zs-ustun-yoq');
      t.textContent = `${qisqaSana(k.sana)}: oʻlchanmagan`;
    } else if ((k.kamaydi ?? 0) > k.sanaldi) {
      // Chegaradan oshgan kun: sotuv deb sanalmadi — balandligi tepada kesiladi.
      r.setAttribute('y', String(y(tepa))); r.setAttribute('height', String(y(0) - y(tepa)));
      r.setAttribute('class', 'zs-ustun-kesildi');
      t.textContent = `${qisqaSana(k.sana)}: qoldiq ${minglik(k.kamaydi ?? 0)} taga kamaygan — sotuv deb sanalmadi`;
    } else {
      const h = Math.max(1, y(0) - y(k.sanaldi));
      r.setAttribute('y', String(y(0) - h)); r.setAttribute('height', String(h));
      r.setAttribute('class', 'zs-ustun');
      t.textContent = `${qisqaSana(k.sana)}: ${minglik(k.sanaldi)} dona${k.narx ? ` · ${minglik(k.narx)} soʻm` : ''}${k.tugagan ? ' · qoldiq 0' : ''}`;
    }
    r.appendChild(t);
    svg.appendChild(r);
    if (k.tugagan) {
      const d = document.createElementNS(NS, 'circle');
      d.setAttribute('cx', String(x + w / 2)); d.setAttribute('cy', String(H - 4)); d.setAttribute('r', '1.8');
      d.setAttribute('class', 'zs-tugagan-nuqta');
      svg.appendChild(d);
    }
  });
  const [bosh, oxiri] = [kunlar[0], kunlar[kunlar.length - 1]];
  for (const [k, x, anchor] of [[bosh, L, 'start'], [oxiri, W, 'end']] as const) {
    if (!k) continue;
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', String(x)); t.setAttribute('y', String(H - 1));
    t.setAttribute('text-anchor', anchor); t.setAttribute('class', 'zs-grafik-yozuv');
    t.textContent = qisqaSana(k.sana) ?? '';
    svg.appendChild(t);
  }
  return svg;
}

function chiz(panel: HTMLElement, j: Javob, qosh: (nom: string) => void): void {
  panel.replaceChildren();
  const bosh = el('div', 'zs-pasport-bosh');
  bosh.append(el('span', 'zs-tamga', 'ZumSavdo pasporti'));
  const sana = qisqaSana(j.sana);
  if (sana) bosh.append(el('span', 'zs-sana', `${sana} holatiga`));
  panel.append(bosh);

  if (j.status === 402 && j.belgi) {
    // Obuna qulfi: bepul qism (belgi) baribir koʻrinadi.
    panel.append(el('div', `zs-katta zs-${j.belgi.rang}`, j.belgi.matn), el('p', 'zs-izoh', j.belgi.izoh));
    const qulf = el('p', 'zs-qulf', j.izoh ?? 'Toʻliq pasport obuna bilan ochiladi.');
    panel.append(qulf);
    const a = el('a', 'zs-tugma zs-asosiy', `Obuna — ${minglik(j.narx_som ?? 149000)} soʻm/oy`);
    a.href = `${SAYT}/usta`; a.target = '_blank'; a.rel = 'noopener noreferrer';
    panel.append(a);
    return;
  }
  const p = j.pasport;
  if (!p) {
    panel.append(el('p', 'zs-izoh', j.xato ? `Pasport olinmadi: ${j.xato}` : 'Pasport olinmadi — keyinroq qayta urinib koʻring.'));
    return;
  }

  const b = p.baho;
  const katta = el('div', 'zs-katta-qator');
  katta.append(el('span', `zs-katta zs-${p.belgi.rang}`, p.belgi.matn));
  if (b.ishonch) katta.append(el('span', `zs-ishonch zs-ishonch-${b.ishonch}`, ISHONCH[b.ishonch] ?? ''));
  panel.append(katta);
  if (b.oyna) {
    panel.append(el('p', 'zs-izoh', `taxminiy · ${qisqaSana(b.oyna.dan)}–${qisqaSana(b.oyna.gacha)} · ${b.malumKun} kun oʻlchandi`));
  } else {
    panel.append(el('p', 'zs-izoh', p.belgi.izoh));
  }

  if (p.tekshiruv.length) {
    const t = el('div', 'zs-tekshiruv');
    for (const x of p.tekshiruv) {
      const c = el('span', `zs-chip ${x.mos === true ? 'zs-mos' : x.mos === false ? 'zs-mos-emas' : ''}`, `${x.nom}: ${x.matn}`);
      t.append(c);
    }
    panel.append(t);
  }
  if (b.kunlar.length) panel.append(grafik(b.kunlar));

  const faktlar = el('div', 'zs-faktlar');
  for (const f of p.faktlar) {
    const d = el('div', `zs-fakt${f.tur ? ` zs-fakt-${f.tur}` : ''}`);
    d.append(el('small', '', f.nom), el('b', '', f.qiymat));
    if (f.izoh) d.append(el('span', '', f.izoh));
    faktlar.append(d);
  }
  panel.append(faktlar);

  if (b.sabablar.length) {
    const s = el('ul', 'zs-sabablar');
    for (const x of b.sabablar) s.append(el('li', '', x));
    panel.append(s);
  }

  const tugmalar = el('div', 'zs-tugmalar');
  const q = el('button', 'zs-tugma zs-asosiy', '+ Taqqoslash');
  q.type = 'button';
  q.addEventListener('click', () => { qosh(p.nom ?? document.title); q.textContent = '✓ Taqqoslashda'; });
  const chat = el('a', 'zs-tugma', 'Chatda hisobla');
  chat.href = `${SAYT}/usta`; chat.target = '_blank'; chat.rel = 'noopener noreferrer';
  tugmalar.append(q, chat);
  panel.append(tugmalar);
}

/**
 * Pasportni tovar sahifasiga qoʻyadi (bir tovar uchun bir marta). Uzum SPA:
 * boshqa tovarga oʻtilsa eski panel olib tashlanadi; javob kelguncha tovar
 * oʻzgargan boʻlsa — chizilmaydi.
 */
export async function pasportniQoy(pid: number, joy: Element, joriyId: () => number | null, qosh: (t: { id: number; nom: string }) => void): Promise<void> {
  const bor = document.getElementById(PASPORT_ID);
  if (bor && bor.dataset.zsId === String(pid)) return;
  bor?.remove();
  const panel = el('div');
  panel.id = PASPORT_ID;
  panel.dataset.zsId = String(pid);
  panel.append(el('p', 'zs-izoh', 'ZumSavdo: sotuv maʼlumoti yuklanmoqda…'));
  joy.parentElement?.insertBefore(panel, joy.nextSibling);
  let j: Javob;
  try {
    j = ((await chrome.runtime.sendMessage({ tur: 'pasport', id: pid })) ?? {}) as Javob;
  } catch (e) {
    j = { xato: e instanceof Error && /context invalidated/i.test(e.message) ? 'kengaytma yangilandi — sahifani yangilang (F5)' : 'javob kelmadi' };
  }
  if (joriyId() !== pid || !panel.isConnected) return;
  chiz(panel, j, (nom) => qosh({ id: pid, nom }));
}
