'use client';

/**
 * Usta — 1-qadam (savollar) va 2-qadam (yoʻnalishlar).
 *
 * BALL BU YERDA HISOBLANMAYDI. Sahifa faqat javoblarni yigʻadi va
 * natijani koʻrsatadi; hisob `@selleros/shared` da, bitta joyda
 * (QOIDALAR.md, 3-boʻlim). Web, bot va kengaytma uch xil javob
 * bermasligi kerak.
 *
 * BOʻSH ROʻYXAT HECH QACHON KOʻRSATILMAYDI. Uch "oʻlchov yoʻq" desa,
 * sababi aynan shundayligicha yoziladi. Boʻsh roʻyxat "sizga mos
 * yoʻnalish yoʻq" degan DAʼVO boʻlardi — holbuki javob koʻpincha
 * "hali hisoblanmadi" yoki "baza javob bermadi".
 */

import { useState } from 'react';
import { SAVOLLAR, type Savol } from '@selleros/shared';

type Javoblar = Record<string, unknown>;

interface Qism {
  part: string;
  score: number | null;
  weight: number;
  used: boolean;
  applicable: boolean;
}

interface Yonalish {
  categoryId: number;
  name: string;
  ball: { value: number | null; breakdown: Qism[] };
  yetadi: boolean | null;
  optimalKirishSom: number | null;
  dalil: { talabOlchovi: number | null; sotuvchiSoni: number | null; top3Ulush: number | null };
}

interface Natija {
  olchov_yoq: boolean;
  sabab?: string;
  nomzod_soni?: number;
  yoshi_soat?: number | null;
  kesh_eskirgan?: boolean;
  royxat?: Yonalish[];
  baholanmadi?: number;
  bolishTaklifi?: { nechta: number; sabab: string } | null;
}

const QISM_NOMI: Record<string, string> = {
  talab: 'Talab',
  marja: 'Marja',
  raqobat: 'Raqobat',
  kirish: 'Kirish qiyinligi',
  mavsum: 'Mavsum',
  profil: 'Sizga moslik',
};

export default function Usta() {
  const [javoblar, setJavoblar] = useState<Javoblar>({});
  const [natija, setNatija] = useState<Natija | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  function yoz(maydon: string, qiymat: unknown) {
    setJavoblar((eski) => ({ ...eski, [maydon]: qiymat }));
  }

  async function yubor(e: React.FormEvent) {
    e.preventDefault();
    setYuklanmoqda(true);
    setXato(null);
    try {
      const r = await fetch('/api/yonalishlar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profil: javoblar }),
      });
      setNatija((await r.json()) as Natija);
    } catch (q) {
      // Tarmoq uzilishi ham "natija yoʻq" emas — sababi aytiladi.
      setXato(`Soʻrov yuborilmadi: ${String(q)}`);
    } finally {
      setYuklanmoqda(false);
    }
  }

  return (
    <main>
      <h1>Nima sotish kerak?</h1>
      <p className="izoh">
        Oʻn ikki savol, ikki daqiqa. Hech biri majburiy emas —
        javob bermasangiz, tizim taxmin qilmaydi.
      </p>

      <form onSubmit={yubor}>
        {SAVOLLAR.map((s) => (
          <SavolQismi key={s.raqam} savol={s} qiymat={javoblar[s.maydon]} yoz={yoz} />
        ))}

        <div className="qator">
          <button type="submit" disabled={yuklanmoqda}>
            {yuklanmoqda ? 'Hisoblanmoqda…' : 'Yoʻnalishlarni koʻrsat'}
          </button>
          {natija && (
            <button type="button" className="ikkinchi" onClick={() => setNatija(null)}>
              Javoblarni oʻzgartirish
            </button>
          )}
        </div>
      </form>

      {xato && <p className="xato">{xato}</p>}
      {natija && <Natijalar natija={natija} />}
    </main>
  );
}

function SavolQismi({
  savol, qiymat, yoz,
}: {
  savol: Savol;
  qiymat: unknown;
  yoz: (maydon: string, q: unknown) => void;
}) {
  const m = savol.maydon;
  return (
    <fieldset>
      <legend>{savol.raqam}. {savol.matn}</legend>
      <p className="nega">{savol.nega}</p>

      {savol.turi === 'kop' && (
        <div className="variantlar">
          {savol.variantlar?.map((v) => {
            const tanlangan = Array.isArray(qiymat) && qiymat.includes(v.qiymat);
            return (
              <label className="tanlov" key={v.qiymat}>
                <input
                  type="checkbox"
                  checked={tanlangan}
                  onChange={(e) => {
                    const bor = Array.isArray(qiymat) ? (qiymat as string[]) : [];
                    yoz(m, e.target.checked
                      ? [...bor, v.qiymat]
                      : bor.filter((x) => x !== v.qiymat));
                  }}
                />
                {v.nom}
              </label>
            );
          })}
        </div>
      )}

      {savol.turi === 'bitta' && (
        <select
          value={typeof qiymat === 'string' ? qiymat : ''}
          onChange={(e) => yoz(m, e.target.value === '' ? undefined : e.target.value)}
        >
          {/* Boʻsh variant SHART: "aytmadi" ni tanlash mumkin
              boʻlishi kerak, aks holda birinchi variant jimgina
              javobga aylanadi. */}
          <option value="">— javob bermayman —</option>
          {savol.variantlar?.map((v) => (
            <option key={v.qiymat} value={v.qiymat}>{v.nom}</option>
          ))}
        </select>
      )}

      {savol.turi === 'haYoq' && (
        <div className="variantlar">
          {[
            { q: 'ha', n: 'Ha' },
            { q: "yo'q", n: 'Yoʻq' },
          ].map((v) => (
            <label className="tanlov" key={v.q}>
              <input
                type="radio"
                name={m}
                checked={qiymat === v.q}
                onChange={() => yoz(m, v.q)}
              />
              {v.n}
            </label>
          ))}
        </div>
      )}

      {savol.turi === 'son' && (
        <input
          type="number"
          min={0}
          placeholder={m === 'budgetUzs' ? 'masalan 30000000 (soʻm)' : 'masalan 10'}
          value={typeof qiymat === 'number' || typeof qiymat === 'string' ? String(qiymat) : ''}
          onChange={(e) => {
            // Boʻsh maydon `undefined` boʻladi, NOL emas. Nol
            // "pulim yoʻq" degan javob, boʻshliq esa "aytmadi".
            const t = e.target.value.trim();
            yoz(m, t === '' ? undefined : Number(t));
          }}
        />
      )}
    </fieldset>
  );
}

function Natijalar({ natija }: { natija: Natija }) {
  if (natija.olchov_yoq) {
    return (
      <>
        <h2>Yoʻnalishlar</h2>
        <p className="xato">
          Hozircha koʻrsatadigan narsa yoʻq.<br />
          Sabab: {natija.sabab ?? 'nomaʼlum'}.
        </p>
        <p className="nega">
          Bu &laquo;sizga mos yoʻnalish yoʻq&raquo; degani EMAS. Maʼlumot
          yetib kelmadi — biroz kutib qayta urinib koʻring.
        </p>
      </>
    );
  }

  const royxat = natija.royxat ?? [];

  return (
    <>
      <h2>Yoʻnalishlar</h2>

      {natija.kesh_eskirgan && (
        <p className="ogoh">
          Raqamlar {natija.yoshi_soat} soat oldin hisoblangan. Tavsiya
          baribir koʻrsatiladi, lekin yangilanish kechikkan.
        </p>
      )}

      <p className="nega">
        {natija.nomzod_soni} turkum tekshirildi
        {typeof natija.baholanmadi === 'number' && natija.baholanmadi > 0
          ? `, ${natija.baholanmadi} tasini maʼlumot yetishmagani uchun baholab boʻlmadi`
          : ''}
        .
      </p>

      {royxat.length === 0 && (
        <p className="ogoh">
          Turkumlar tekshirildi, lekin bittasi ham baholanmadi —
          maʼlumot yetarli emas.
        </p>
      )}

      {royxat.map((y) => <Karta key={y.categoryId} y={y} />)}

      {natija.bolishTaklifi && (
        <p className="ogoh">{natija.bolishTaklifi.sabab}</p>
      )}
    </>
  );
}

function Karta({ y }: { y: Yonalish }) {
  return (
    <article className="karta">
      <header>
        <h3>{y.name}</h3>
        <span className="ball">{y.ball.value ?? '—'}</span>
      </header>

      <p className="nega">
        Sotuvchi: {son(y.dalil.sotuvchiSoni)} · Top-3 ulushi:{' '}
        {y.dalil.top3Ulush === null ? '—' : `${y.dalil.top3Ulush}%`} ·{' '}
        {y.yetadi === null
          ? 'Byudjet yetadimi — nomaʼlum'
          : y.yetadi ? 'Byudjetingiz yetadi' : 'Byudjetingiz yetmaydi'}
      </p>

      <details className="izohli">
        <summary>Nega bu ball?</summary>
        <table className="qismlar">
          <thead>
            <tr><th>Qism</th><th>Ball</th><th>Vazn</th><th>Holat</th></tr>
          </thead>
          <tbody>
            {y.ball.breakdown.map((q) => (
              <tr key={q.part}>
                <td>{QISM_NOMI[q.part] ?? q.part}</td>
                <td className="son">
                  {q.score === null ? <span className="yoq">—</span> : q.score.toFixed(0)}
                </td>
                <td className="son">{q.weight}</td>
                <td>
                  {!q.applicable
                    ? <span className="yoq">bu bosqichda hisoblanmaydi</span>
                    : q.used ? 'hisobga olindi'
                    : <span className="yoq">maʼlumot yoʻq</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </article>
  );
}

/** Oʻlchanmagan raqam NOL emas — chiziqcha. */
function son(n: number | null): string {
  return n === null ? '—' : n.toLocaleString('uz-UZ');
}
