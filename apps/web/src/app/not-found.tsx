/**
 * 404 — sahifa topilmadi (hamma notoʻgʻri manzil uchun).
 *
 * Ilgari Next.js ning inglizcha oq sahifasi chiqardi («This page could
 * not be found»), sayt dizayni ham, ortga yoʻl ham yoʻq edi. Endi —
 * sayt mavzusida, ikki yoʻl bilan: bosh sahifa va Usta.
 *
 * Til cookie dan EMAS: ildiz 404 har sahifa daraxtiga kiradi va cookie
 * oʻqisa hamma sahifa (masalan /maxfiylik) dinamik boʻlib qolardi. Matn
 * ikkala tilda, koʻrinadigani — `<html lang>` boʻyicha (`Ikki`).
 */

import type { Metadata } from 'next';
import { Havola } from './Havola';
import { Ikki } from './Ikki';
import { SahifaTepa } from './SahifaTepa';
import t from './topilmadi.module.css';

export const metadata: Metadata = {
  title: 'ZumSavdo — 404',
};

export default function SahifaTopilmadi() {
  return (
    <div className={`zs-mavzu ${t.sahifa}`}>
      <SahifaTepa havola={{ href: '/usta', uz: 'Ustaga oʻtish', ru: 'Перейти к Мастеру' }} />
      <main className={t.ichi}>
        <div className={t.son} aria-hidden="true">404</div>
        <h1 className={t.sarlavha}><Ikki uz="Bu sahifa topilmadi" ru="Страница не найдена" /></h1>
        <p className={t.izoh}>
          <Ikki
            uz="Manzil notoʻgʻri yozilgan yoki sahifa koʻchirilgan. Suhbatingiz joyida — Ustada davom eting."
            ru="Адрес написан неверно или страница перенесена. Ваш чат на месте — продолжайте в Мастере."
          />
        </p>
        <div className={t.tugmalar}>
          <Havola className={t.asosiy} href="/usta"><Ikki uz="Ustaga oʻtish" ru="Перейти к Мастеру" /></Havola>
          <Havola className={t.ikkinchi} href="/"><Ikki uz="Bosh sahifa" ru="Главная" /></Havola>
        </div>
      </main>
    </div>
  );
}
