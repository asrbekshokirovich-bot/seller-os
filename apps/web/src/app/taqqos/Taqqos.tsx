'use client';

/**
 * Taqqoslash jadvali — mijoz qismi. Hamma raqam serverdan (`shared/tovar-sotuvi.ts`
 * `taqqosJadvali`): eng yaxshisi har qatorda belgilangan, xulosa — koddan.
 * Bu yerda faqat chizish; raqam toʻqilmaydi (QOIDALAR.md, 4-boʻlim).
 */

import { useEffect, useState } from 'react';
import type { KartochkaBelgisi, TaqqosJadvali } from '@selleros/shared';
import { sessiyaSarlavhasi } from '@/lib/kengaytma';
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
  const [holat, setHolat] = useState<Holat>({ tur: 'yuklanmoqda' });
  const [ids, setIds] = useState<string>('');

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('ids') ?? '';
    setIds(p);
    if (!/^\d{1,11}(?:,\d{1,11}){0,4}$/.test(p)) {
      setHolat({ tur: 'xato', matn: 'Taqqoslash uchun tovar tanlanmagan. Uzumda kengaytmaning «+ Taqqoslash» tugmasi bilan 2–5 ta tovar qoʻshing.' });
      return;
    }
    let bekor = false;
    fetch(`/api/taqqos?ids=${p}`, { headers: sessiyaSarlavhasi(), cache: 'no-store' })
      .then(async (r) => {
        const j = (await r.json().catch(() => null)) as Javob | null;
        if (bekor) return;
        if (!j) setHolat({ tur: 'xato', matn: `Javob oʻqilmadi (HTTP ${r.status}).` });
        else if (r.status !== 200 && r.status !== 402) setHolat({ tur: 'xato', matn: j.xato ?? `Server xatosi (HTTP ${r.status}).` });
        else setHolat({ tur: 'tayyor', status: r.status, j });
      })
      .catch(() => { if (!bekor) setHolat({ tur: 'xato', matn: 'Internetga ulanib boʻlmadi — sahifani yangilang.' }); });
    return () => { bekor = true; };
  }, []);

  if (holat.tur === 'yuklanmoqda') return <p className={u.izoh}>Yuklanmoqda…</p>;
  if (holat.tur === 'xato') return <p className={u.xato}>{holat.matn}</p>;

  const { j, status } = holat;
  const sana = qisqaSana(j.sana);

  if (status === 402) {
    return (
      <div className={u.qulf}>
        <p><strong>{j.izoh ?? 'Taqqoslash jadvali obuna bilan ochiladi.'}</strong></p>
        <ul>{(j.ustunlar ?? []).map((x) => <li key={x.productId}>{x.nom ?? `Tovar ${x.productId}`} — {x.belgi.matn}</li>)}</ul>
        <a className={u.tugma} href="/usta">Obuna — {minglik(j.narx_som ?? 149000)} soʻm/oy</a>
      </div>
    );
  }

  const jadval = j.jadval;
  if (!jadval) return <p className={u.xato}>Jadval kelmadi.</p>;

  return (
    <>
      <p className={u.izoh}>
        {sana ? `Maʼlumot ${sana} holatiga. ` : ''}ZumSavdo oʻlchovi — oxirgi 30 kun, taxminiy. ★ — shu qatorda eng yaxshisi.
      </p>
      <div className={u.qobiq}>
        <table className={u.jadval}>
          <thead>
            <tr>
              <th scope="col">Koʻrsatkich</th>
              {jadval.ustunlar.map((x, i) => (
                <th scope="col" key={x.productId}>
                  <span className={u.raqam}>{i + 1}-tovar</span>
                  <a href={`https://uzum.uz/uz/product/tovar-${x.productId}`} target="_blank" rel="noopener noreferrer">
                    {x.nom ?? `Tovar ${x.productId}`}
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
        <h2 id="xulosa">Xulosa</h2>
        <ul>{jadval.xulosa.map((x) => <li key={x}>{x}</li>)}</ul>
      </section>
      <p className={u.izoh}>
        Chegara narx — Xitoydan 1 dona (kargo bilan) shundan qimmatga tushsa, sotganda zarar: narxdan Uzum komissiyasi,
        1 % soliq va eng kam logistika (5 250 soʻm) ayirilgan. Hisob: <code>{jadval.versiya}</code>. Tovarlar: {ids.split(',').join(', ')}.
      </p>
    </>
  );
}
