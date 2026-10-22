/**
 * Taqqoslash jadvali (nazoratchi, 2026-10-21, «Sotuvchi koʻzoynagi» D).
 *
 * Kengaytmaning taqqoslash savatidan ochiladi: `/taqqos?ids=1,2,3`. Sahifa
 * STATIK qobiq (Vercel funksiyalari iad1 da — dinamik sahifa Oʻzbekistondan
 * ~1 s sekinroq), jadvalni mijoz komponenti `/api/taqqos` dan oladi. Telefonda
 * ham ochiladi, havolasini sherigingizga yuborsa boʻladi (token hash'da —
 * yuborilgan havolada boʻlsa, oluvchi oʻz sessiyasi bilan koʻradi).
 */

import type { Metadata } from 'next';
import { SahifaTepa } from '../SahifaTepa';
import Taqqos from './Taqqos';
import u from './taqqos.module.css';

export const metadata: Metadata = {
  title: 'ZumSavdo — Taqqoslash',
  description: 'Uzum tovarlarini yonma-yon solishtirish: oyiga sotuv, aylanma, sharhlar, chegara narx.',
  // Har odamning oʻz tanlovi — qidiruvga tushmasin.
  robots: { index: false, follow: false },
};

export default function TaqqosSahifa() {
  return (
    <div className={`zs-mavzu ${u.sahifa}`} lang="uz">
      <SahifaTepa til="uz" havola={{ href: '/usta', uz: 'Suhbatga oʻtish', ru: 'Начать чат' }} />
      <main className={u.ichi}>
        <h1>Taqqoslash</h1>
        <Taqqos />
      </main>
    </div>
  );
}
