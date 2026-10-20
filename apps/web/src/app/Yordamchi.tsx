'use client';

/**
 * «Savol bering» — saytning har sahifasida AI yordamchi (nazoratchi, 2026-10-19:
 * «Har sahifada AI yordamchi»). Pastki oʻng burchakda tugma; bosilsa — kichik
 * oyna: odam savol yozadi, yordamchi shu sahifani bilgan holda javob beradi
 * (`/api/yordamchi` → Edge `/yordamchi`, `sahifa-yordamchi.ts`). 12 qadamli yoʻl
 * bu emas — u «Boshlash» dan ochiladi; bu yerda hech narsa saqlanmaydi.
 */

import { useEffect, useRef, useState } from 'react';
import { Ikon } from './Ikon';
import y from './yordamchi.module.css';

export type YordamchiSahifasi = 'bosh' | 'kirish' | 'maxfiylik' | 'obuna';
interface Xabar { rol: 'mijoz' | 'yordamchi'; matn: string }

/** Sahifaga mos tayyor savollar — oyna boʻsh boʻlsa koʻrinadi. */
const TEZ: Record<YordamchiSahifasi, Array<[string, string]>> = {
  bosh: [['ZumSavdo nima qiladi?', 'Что делает ZumSavdo?'], ['Bu bepulmi?', 'Это бесплатно?'],
    ['Uzumda sotish uchun nima kerak?', 'Что нужно, чтобы продавать на Uzum?']],
  kirish: [['Kirish nima uchun kerak?', 'Зачем входить?'], ['Kirmasam ham boʻladimi?', 'Можно без входа?']],
  maxfiylik: [['Maʼlumotlarim kimga boradi?', 'Кому уходят мои данные?'], ['Maʼlumotimni oʻchirsa boʻladimi?', 'Можно удалить мои данные?']],
  obuna: [['Obuna nima beradi?', 'Что даёт подписка?'], ['Hozir bepulmi?', 'Сейчас бесплатно?'], ['Qanday toʻlayman?', 'Как оплатить?']],
};

export default function Yordamchi({ sahifa, til, sarlavha, boshlashHavolasi = true }: {
  sahifa: YordamchiSahifasi;
  til: 'uz' | 'ru';
  /** Kengaytma rejimidagi sessiya sarlavhasi (`/usta`); oddiy saytda — cookie. */
  sarlavha?: () => Record<string, string>;
  /** «Yoʻlni boshlash» havolasi — `/usta` ichida kerak emas. */
  boshlashHavolasi?: boolean;
}) {
  const tr = (uz: string, ru: string) => (til === 'ru' ? ru : uz);
  const [ochiq, setOchiq] = useState(false);
  const [xabarlar, setXabarlar] = useState<Xabar[]>([]);
  const [matn, setMatn] = useState('');
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);
  const oqim = useRef<HTMLDivElement>(null);
  const maydon = useRef<HTMLTextAreaElement>(null);
  const tugma = useRef<HTMLButtonElement>(null);

  // Yangi xabar yoki «Yozmoqda…» — pastga.
  useEffect(() => {
    const el = oqim.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [xabarlar, band, ochiq]);
  // Ochilganda — yozish maydoniga; Esc — yopadi (fokus tugmaga qaytadi).
  useEffect(() => {
    if (!ochiq) return;
    maydon.current?.focus();
    const f = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOchiq(false);
      tugma.current?.focus();
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [ochiq]);

  async function sora(savol: string) {
    const s = savol.trim();
    if (!s || band) return;
    const tarix = xabarlar.slice(-6);
    setXabarlar((x) => [...x, { rol: 'mijoz', matn: s }]);
    setMatn('');
    setBand(true);
    setXato(null);
    try {
      const r = await fetch('/api/yordamchi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(sarlavha?.() ?? {}) },
        body: JSON.stringify({ savol: s, sahifa, tarix, til }),
      });
      const d = (await r.json().catch(() => null)) as { matn?: unknown } | null;
      if (!r.ok || typeof d?.matn !== 'string' || !d.matn) throw new Error(String(r.status));
      const javob = d.matn;
      setXabarlar((x) => [...x, { rol: 'yordamchi', matn: javob }]);
    } catch {
      // Javob kelmadi — savol oʻchmaydi: maydonga qaytadi, qayta yuborish mumkin.
      setXabarlar((x) => x.slice(0, -1));
      setMatn((m) => m || s);
      setXato(tr('Javob kelmadi — birozdan keyin qayta yuboring.', 'Ответ не пришёл — отправьте ещё раз чуть позже.'));
    } finally {
      setBand(false);
    }
  }

  return (
    <div className={`zs-mavzu ${y.ildiz}`}>
      {ochiq && (
        <section className={y.oyna} role="dialog" aria-label={tr('ZumSavdo yordamchisi', 'Помощник ZumSavdo')}>
          <header className={y.tepa}>
            <div>
              <div className={y.sarlavha}>{tr('ZumSavdo yordamchisi', 'Помощник ZumSavdo')}</div>
              <div className={y.izoh}>{tr('Uzumda savdo va ZumSavdo haqida soʻrang', 'Спросите про торговлю на Uzum и ZumSavdo')}</div>
            </div>
            <button type="button" className={y.yopish} onClick={() => { setOchiq(false); tugma.current?.focus(); }}
              aria-label={tr('Yopish', 'Закрыть')}>
              <Ikon nom="yopish" o={18} />
            </button>
          </header>

          <div className={y.oqim} ref={oqim} role="log" aria-live="polite">
            <div className={`${y.pufak} ${y.ai}`}>
              {tr('Salom! Savolingizni yozing — Uzumda savdo, ZumSavdo, narx yoki shu sahifa haqida boʻlishi mumkin.',
                'Здравствуйте! Напишите вопрос — про торговлю на Uzum, ZumSavdo, цены или эту страницу.')}
            </div>
            {xabarlar.length === 0 && (
              <div className={y.tezlar}>
                {TEZ[sahifa].map(([uz, ru]) => (
                  <button key={uz} type="button" className={y.tez} disabled={band} onClick={() => void sora(tr(uz, ru))}>{tr(uz, ru)}</button>
                ))}
              </div>
            )}
            {xabarlar.map((x, i) => <div key={i} className={`${y.pufak} ${x.rol === 'mijoz' ? y.men : y.ai}`}>{x.matn}</div>)}
            {band && <div className={y.yozmoqda} role="status">{tr('Yozmoqda…', 'Пишет…')}</div>}
            {xato !== null && <div className={y.xato} role="alert">{xato}</div>}
          </div>

          <form className={y.past} onSubmit={(e) => { e.preventDefault(); void sora(matn); }}>
            <textarea
              ref={maydon}
              className={y.maydon}
              rows={1}
              maxLength={500}
              value={matn}
              placeholder={tr('Savolingizni yozing…', 'Напишите вопрос…')}
              aria-label={tr('Savol', 'Вопрос')}
              onChange={(e) => setMatn(e.target.value)}
              onKeyDown={(e) => {
                // Enter — yuborish, Shift+Enter — yangi qator.
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void sora(matn); }
              }}
            />
            <button type="submit" className={y.yuborish} disabled={band || !matn.trim()} aria-label={tr('Yuborish', 'Отправить')}>
              <Ikon nom="ong" o={18} />
            </button>
          </form>
          {boshlashHavolasi && (
            <a className={y.boshlash} href={til === 'ru' ? '/usta/ru' : '/usta'}>
              {tr('Yoʻlni boshlash — nima sotishni birga tanlaymiz →', 'Начать путь — вместе выберем, что продавать →')}
            </a>
          )}
        </section>
      )}
      <button ref={tugma} type="button" className={y.tugma} aria-expanded={ochiq} onClick={() => setOchiq((o) => !o)}>
        <Ikon nom={ochiq ? 'yopish' : 'suhbatlar'} o={18} />
        <span>{ochiq ? tr('Yopish', 'Закрыть') : tr('Savol bering', 'Задать вопрос')}</span>
      </button>
    </div>
  );
}
