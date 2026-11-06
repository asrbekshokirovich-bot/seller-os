'use client';

/**
 * Taqqoslash jadvali — mijoz qismi. Hamma raqam serverdan (`shared/tovar-sotuvi.ts`
 * `taqqosJadvali`): eng yaxshisi har qatorda belgilangan, xulosa — koddan.
 * Bu yerda faqat chizish; raqam toʻqilmaydi (QOIDALAR.md, 4-boʻlim).
 */

import { useEffect, useState } from 'react';
import type { KartochkaBelgisi, TaqqosJadvali } from '@selleros/shared';
import { sessiyaSarlavhasi } from '@/lib/kengaytma';
import { tarjima } from '@/lib/til';
import { useHujjatTili } from '../SahifaTepa';
import u from './taqqos.module.css';

interface Javob {
  sana?: string | null;
  jadval?: TaqqosJadvali;
  /** 402 — obuna qulfi. */
  cheklov?: string;
  izoh?: string;
  narx_som?: number;
  ustunlar?: Array<{ productId: number; nom: string | null; belgi: KartochkaBelgisi }>;
  xato?: string;
}

type Holat = { tur: 'yuklanmoqda' } | { tur: 'xato'; matn: string } | { tur: 'tayyor'; status: number; j: Javob };

// Kengaytmadan kelganda token hash'da (`#sessiya=…`) — `sessiyaSarlavhasi` uni
// varaq xotirasiga oʻtkazib manzildan olib tashlaydi (`lib/kengaytma.ts`).
// Oddiy saytda — cookie.

const qisqaSana = (s: string | null | undefined) => (s ? `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}` : null);
const minglik = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export default function Taqqos() {
  // Sahifa tili — head skripti qoʻygan `<html lang>` (ikkinchi koʻrik, 12-taklif).
  const til = useHujjatTili();
  const tr = tarjima(til);
  return <><h1>{tr('Taqqoslash', 'Сравнение')}</h1><TaqqosJadvaliQismi tr={tr} til={til} /></>;
}

function TaqqosJadvaliQismi({ tr, til }: { tr: ReturnType<typeof tarjima>; til: 'uz' | 'ru' }) {
  const [holat, setHolat] = useState<Holat>({ tur: 'yuklanmoqda' });
  const [ids, setIds] = useState<string>('');

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('ids') ?? '';
    setIds(p);
    if (!/^\d{1,11}(?:,\d{1,11}){0,4}$/.test(p)) {
      setHolat({ tur: 'xato', matn: tr('Taqqoslash uchun tovar tanlanmagan. Uzumda kengaytmaning «+ Taqqoslash» tugmasi bilan 2–5 ta tovar qoʻshing.',
        'Товары для сравнения не выбраны. На Uzum добавьте 2–5 товаров кнопкой расширения «+ Сравнить».') });
      return;
    }
    let bekor = false;
    fetch(`/api/taqqos?ids=${p}${til === 'ru' ? '&til=ru' : ''}`, { headers: sessiyaSarlavhasi(), cache: 'no-store' })
      .then(async (r) => {
        const j = (await r.json().catch(() => null)) as Javob | null;
        if (bekor) return;
        if (!j) setHolat({ tur: 'xato', matn: tr(`Javob oʻqilmadi (HTTP ${r.status}).`, `Ответ не прочитан (HTTP ${r.status}).`) });
        else if (r.status !== 200 && r.status !== 402) setHolat({ tur: 'xato', matn: j.xato ?? tr(`Server xatosi (HTTP ${r.status}).`, `Ошибка сервера (HTTP ${r.status}).`) });
        else setHolat({ tur: 'tayyor', status: r.status, j });
      })
      .catch(() => { if (!bekor) setHolat({ tur: 'xato', matn: tr('Internetga ulanib boʻlmadi — sahifani yangilang.', 'Нет соединения — обновите страницу.') }); });
    return () => { bekor = true; };
    // Til oʻzgarsa — jadval shu tilda qayta yuklanadi (`tr` — tildan).
  }, [til]);

  if (holat.tur === 'yuklanmoqda') return <p className={u.izoh}>{tr('Yuklanmoqda…', 'Загрузка…')}</p>;
  if (holat.tur === 'xato') return <p className={u.xato}>{holat.matn}</p>;

  const { j, status } = holat;
  const sana = qisqaSana(j.sana);

  if (status === 402) {
    return (
      <div className={u.qulf}>
        <p><strong>{j.izoh ?? tr('Taqqoslash jadvali obuna bilan ochiladi.', 'Таблица сравнения открывается с подпиской.')}</strong></p>
        <ul>{(j.ustunlar ?? []).map((x) => <li key={x.productId}>{x.nom ?? tr(`Tovar ${x.productId}`, `Товар ${x.productId}`)} — {x.belgi.matn}</li>)}</ul>
        <a className={u.tugma} href="/usta">{tr('Obuna', 'Подписка')} — {minglik(j.narx_som ?? 149000)} {tr('soʻm/oy', 'сум/мес')}</a>
      </div>
    );
  }

  const jadval = j.jadval;
  if (!jadval) return <p className={u.xato}>{tr('Jadval kelmadi.', 'Таблица не пришла.')}</p>;

  return (
    <>
      <p className={u.izoh}>
        {sana ? tr(`Maʼlumot ${sana} holatiga. `, `Данные на ${sana}. `) : ''}
        {tr('ZumSavdo oʻlchovi — oxirgi 30 kun, taxminiy. ★ — shu qatorda eng yaxshisi.', 'Замер ZumSavdo — последние 30 дней, оценка. ★ — лучший в строке.')}
      </p>
      <div className={u.qobiq}>
        <table className={u.jadval}>
          <thead>
            <tr>
              <th scope="col">{tr('Koʻrsatkich', 'Показатель')}</th>
              {jadval.ustunlar.map((x, i) => (
                <th scope="col" key={x.productId}>
                  <span className={u.raqam}>{tr(`${i + 1}-tovar`, `Товар ${i + 1}`)}</span>
                  <a href={`https://uzum.uz/uz/product/tovar-${x.productId}`} target="_blank" rel="noopener noreferrer">
                    {x.nom ?? tr(`Tovar ${x.productId}`, `Товар ${x.productId}`)}
                  </a>
                  <span className={`${u.belgi} ${u[x.belgi.rang] ?? ''}`} title={x.belgi.izoh}>{x.belgi.matn}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jadval.qatorlar.map((q) => (
              <tr key={q.kalit}>
                <th scope="row">{q.nom}</th>
                {q.qiymatlar.map((v, i) => (
                  <td key={jadval.ustunlar[i]?.productId ?? i} className={q.eng === i ? u.eng : undefined}>
                    {v}{q.eng === i ? ' ★' : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className={u.xulosa} aria-labelledby="xulosa">
        <h2 id="xulosa">{tr('Xulosa', 'Вывод')}</h2>
        <ul>{jadval.xulosa.map((x) => <li key={x}>{x}</li>)}</ul>
      </section>
      <p className={u.izoh}>
        {tr('Chegara narx — Xitoydan 1 dona (kargo bilan) shundan qimmatga tushsa, sotganda zarar: narxdan Uzum komissiyasi, 1 % soliq va eng kam logistika (5 250 soʻm) ayirilgan.',
          'Предельная цена — если 1 штука из Китая (с карго) обойдётся дороже, продажа убыточна: из цены вычтены комиссия Uzum, налог 1 % и минимальная логистика (5 250 сум).')}
        {' '}{tr('Hisob', 'Расчёт')}: <code>{jadval.versiya}</code>. {tr('Tovarlar', 'Товары')}: {ids.split(',').join(', ')}.
      </p>
    </>
  );
}
