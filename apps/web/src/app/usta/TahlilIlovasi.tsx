'use client';

/**
 * AI TAHLILCHI javobi ostidagi qism (nazoratchi, 2026-11-05): «filtrlash soʻralsa xulosani oʻz nusxamizdan
 * qilamiz, lekin xuddi Uzumdan jonli qilinayotgandek — 2–3 asosiy tovar yoki doʻkonni brauzerda ochib beramiz».
 *
 * - Havolalar — AI alohida fikr bildirgan tovar/doʻkonlar (server faqat asbob natijasidagilarini qoldiradi).
 * - «Uzumda ochish» — turkum sahifasi, AI tanlagan saralash va narx bilan (manzil shakli brauzerda oʻlchangan:
 *   `tahlilchi.ts`, `uzumOchishManzili`).
 * - «Top-3 ni ochish» — faqat kengaytma panelida: bir bosishda 3 ta tab (sayt ramkasi `window.open` ni bir
 *   martadan koʻp ochira olmaydi — panel `chrome.tabs` bilan ochadi, `apps/extension/src/panel.ts`).
 * - Keyingi savollar — bosilsa yozilgan savol kabi ketadi (faqat oxirgi javobda).
 */

import type { TahlilHavola } from '@selleros/shared';
import u from './usta.module.css';

type Tr = (uz: string, ru: string) => string;

export interface TahlilJavobi {
  manba: 'tahlil';
  havolalar?: TahlilHavola[];
  ochishManzili?: string | null;
  keyingi?: string[];
  sana?: string | null;
}

export function tahlilJavobimi(j: unknown): j is TahlilJavobi {
  return !!j && typeof j === 'object' && (j as { manba?: unknown }).manba === 'tahlil';
}

/** Kengaytma paneliga: shu Uzum sahifalarini yangi tablarda och. Panel manba va manzilni tekshiradi. */
export const UZUM_OCH_XABARI = 'zumsavdo:uzum-och';

function uzummi(href: string): boolean {
  try {
    const m = new URL(href);
    return m.protocol === 'https:' && (m.hostname === 'uzum.uz' || m.hostname === 'www.uzum.uz');
  } catch {
    return false;
  }
}

function panelgaOch(urllar: string[]): void {
  const toza = urllar.filter(uzummi).slice(0, 3);
  if (toza.length) window.parent.postMessage({ tur: UZUM_OCH_XABARI, urllar: toza }, '*');
}

function son(n: number): string {
  // Minglik ajratuvchi — oddiy boʻsh joy (lokal NBSP emas: nusxalanganda buziladi).
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function TahlilIlovasi({ j, tr, kengaytmada, soroq }: {
  j: TahlilJavobi; tr: Tr; kengaytmada: boolean;
  /** Keyingi savolni yuborish; `undefined` — eski javob (tugmalar yoʻq). */
  soroq?: ((matn: string) => void) | undefined;
}) {
  const havolalar = (j.havolalar ?? []).filter((h) => h.havola && uzummi(h.havola));
  const ochish = j.ochishManzili && uzummi(j.ochishManzili) ? j.ochishManzili : null;
  const top = havolalar.slice(0, 3).map((h) => h.havola!);
  const keyingi = soroq ? (j.keyingi ?? []).slice(0, 3) : [];
  if (!havolalar.length && !ochish && !keyingi.length) return null;

  return (
    <div className={u.tahlil}>
      {havolalar.length > 0 && (
        <ul className={u.tahlilHavolalar}>
          {havolalar.map((h) => (
            <li key={`${h.tur}-${h.id}`}>
              <a className={u.tahlilHavola} href={h.havola!} target="_blank" rel="noopener noreferrer"
                onClick={kengaytmada ? (e) => { e.preventDefault(); panelgaOch([h.havola!]); } : undefined}>
                <span className={u.tahlilNom}>{h.tur === 'dokon' ? `🏪 ${h.nom}` : h.nom}</span>
                <span className={u.tahlilRaqam}>
                  {[
                    h.narx ? `${son(h.narx)} ${tr('soʻm', 'сум')}` : null,
                    h.oyiga ? `≈${son(h.oyiga)}${tr('/oy', '/мес')}` : null,
                    h.tur === 'dokon' && h.tushumMln ? `${String(h.tushumMln).replace('.', ',')} ${tr('mln/oy', 'млн/мес')}` : null,
                  ].filter(Boolean).join(' · ')}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {(ochish || (kengaytmada && top.length > 1)) && (
        <div className={u.tahlilTugmalar}>
          {ochish && (kengaytmada
            ? <button type="button" className={u.tahlilTugma} onClick={() => panelgaOch([ochish])}>{tr('Uzumda ochish ↗', 'Открыть в Uzum ↗')}</button>
            : <a className={u.tahlilTugma} href={ochish} target="_blank" rel="noopener noreferrer">{tr('Uzumda ochish ↗', 'Открыть в Uzum ↗')}</a>)}
          {kengaytmada && top.length > 1 && (
            <button type="button" className={u.tahlilTugma} onClick={() => panelgaOch(top)}>
              {tr(`Top-${top.length} ni ochish`, `Открыть топ-${top.length}`)}
            </button>
          )}
        </div>
      )}
      {keyingi.length > 0 && (
        <div className={u.tahlilKeyingi}>
          {keyingi.map((k) => <button key={k} type="button" className={u.tezSavol} onClick={() => soroq!(k)}>{k}</button>)}
        </div>
      )}
    </div>
  );
}
