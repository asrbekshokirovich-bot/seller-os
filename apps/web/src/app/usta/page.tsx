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

import { useRef, useState } from 'react';
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

interface Tovar {
  nomzod: {
    productId: number; title: string; brand: string | null;
    soldUnits30d: number | null; sotuvManbasi: 'olchandi' | 'taxmin' | null;
    olchanganKun: number | null; shopName: string | null;
    narxSom: number | null; qoldiq: number | null;
    reyting: number | null; sharhSoni: number | null;
  };
  miqdor: { dona: number; hisob: string } | null;
  miqdorSababi: string | null;
  miqdorSababKodi: 'olchanmagan' | 'kun-yetmadi' | null;
  bayroqlar: Array<{ kind: string; severity: string; reason: string }>;
  baholanmadi: Array<{ filtr: string; missing: string[] }>;
}

interface TovarNatija {
  olchov_yoq: boolean;
  sabab?: string;
  turkum?: { categoryId: number; name: string } | null;
  royxat?: Tovar[];
  chiqarildi?: Array<{ productId: number; title: string; sabab: string }>;
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
  const [tanlangan, setTanlangan] = useState<Yonalish | null>(null);
  const [tovarlar, setTovarlar] = useState<TovarNatija | null>(null);
  const [tovarYuklanmoqda, setTovarYuklanmoqda] = useState(false);
  const tovarBolimi = useRef<HTMLDivElement>(null);

  async function tovarlarniOl(y: Yonalish) {
    setTanlangan(y);
    setTovarlar(null);
    setTovarYuklanmoqda(true);
    try {
      const r = await fetch(`/api/tovarlar?turkum=${y.categoryId}`);
      setTovarlar((await r.json()) as TovarNatija);
    } catch (q) {
      setTovarlar({ olchov_yoq: true, sabab: `Soʻrov yuborilmadi: ${String(q)}` });
    } finally {
      setTovarYuklanmoqda(false);
      // Boʻlim sahifaning eng pastida ochiladi (2-qadam roʻyxati
      // uzun). Surmasak, foydalanuvchi tugmani bosadi va ekranda
      // hech nima oʻzgarmagandek koʻrinadi.
      requestAnimationFrame(() =>
        tovarBolimi.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

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
      {natija && <Natijalar natija={natija} tanla={tovarlarniOl} tanlangan={tanlangan} />}
      {tanlangan && (
        <div ref={tovarBolimi}>
          <Tovarlar
            yonalish={tanlangan}
            natija={tovarlar}
            yuklanmoqda={tovarYuklanmoqda}
          />
        </div>
      )}
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

function Natijalar({
  natija, tanla, tanlangan,
}: {
  natija: Natija;
  tanla: (y: Yonalish) => void;
  tanlangan: Yonalish | null;
}) {
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

      {royxat.map((y) => (
        <Karta
          key={y.categoryId}
          y={y}
          tanla={tanla}
          tanlangan={tanlangan?.categoryId === y.categoryId}
        />
      ))}

      {natija.bolishTaklifi && (
        <p className="ogoh">{natija.bolishTaklifi.sabab}</p>
      )}
    </>
  );
}

function Karta({
  y, tanla, tanlangan,
}: {
  y: Yonalish;
  tanla: (y: Yonalish) => void;
  tanlangan: boolean;
}) {
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

      <div className="qator" style={{ marginTop: '.8rem' }}>
        <button
          type="button"
          className={tanlangan ? undefined : 'ikkinchi'}
          onClick={() => tanla(y)}
        >
          {tanlangan ? 'Tovarlar koʻrsatilmoqda' : 'Shu yoʻnalishdagi tovarlar'}
        </button>
      </div>
    </article>
  );
}

/** Oʻlchanmagan raqam NOL emas — chiziqcha. */
function son(n: number | null): string {
  return n === null ? '—' : n.toLocaleString('uz-UZ');
}

/**
 * 3-qadam — tanlangan yoʻnalishdagi tovarlar.
 *
 * Uch narsa ATAYLAB koʻrsatiladi:
 *   1. Miqdor hisoblanmagan boʻlsa — NEGA hisoblanmagani;
 *   2. Sotuv raqami qayerdan kelgani (oʻlchov yoki taxmin);
 *   3. Tuzoq tufayli roʻyxatdan chiqarilgan tovarlar.
 *
 * Uchinchisi eng muhim: chiqarilgan tovarni koʻrsatmasak,
 * foydalanuvchi uni oʻzi topib, "nega bu yoʻq?" deb oʻylaydi va
 * tizimga ishonchi tushadi. Sababi bilan koʻrsatilsa — teskarisi.
 */
function Tovarlar({
  yonalish, natija, yuklanmoqda,
}: {
  yonalish: Yonalish;
  natija: TovarNatija | null;
  yuklanmoqda: boolean;
}) {
  return (
    <>
      <h2>Tovarlar — {yonalish.name}</h2>

      {yuklanmoqda && <p className="nega">Yuklanmoqda…</p>}

      {natija?.olchov_yoq && (
        <p className="xato">
          Tovar roʻyxati koʻrsatilmadi.<br />
          Sabab: {natija.sabab ?? 'nomaʼlum'}.
        </p>
      )}

      {natija && !natija.olchov_yoq && (
        <>
          <p className="nega">
            {natija.royxat?.length ?? 0} ta tovar
            {natija.chiqarildi?.length
              ? `, ${natija.chiqarildi.length} tasi tuzoq tufayli chiqarildi`
              : ''}
            .
          </p>

          <UmumiySabab royxat={natija.royxat ?? []} />

          {natija.royxat?.map((t) => (
            <TovarKartasi
              key={t.nomzod.productId}
              t={t}
              sababniKorsat={xilmaXilSabab(natija.royxat ?? [])}
            />
          ))}

          {natija.chiqarildi?.length ? (
            <details className="izohli" style={{ marginTop: '1rem' }}>
              <summary>Roʻyxatdan chiqarilgan {natija.chiqarildi.length} ta tovar</summary>
              <table className="qismlar">
                <thead><tr><th>Tovar</th><th>Nega chiqarildi</th></tr></thead>
                <tbody>
                  {natija.chiqarildi.map((c) => (
                    <tr key={c.productId}>
                      <td>{c.title}</td>
                      <td className="yoq">{c.sabab}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ) : null}
        </>
      )}
    </>
  );
}

/**
 * Bir xil sabab har kartada takrorlanmasin.
 *
 * Ilgari "sotuv hali oʻlchanmagan" yozuvi yigirma marta koʻchirilardi
 * va roʻyxatni oʻqib boʻlmasdi. Sabab bitta boʻlsa — bir marta, tepada.
 * Turlicha boʻlsa — har kartada, chunki unda u haqiqatan boshqacha.
 */
function UmumiySabab({ royxat }: { royxat: Tovar[] }) {
  const kodlar = new Set(
    royxat.map((t) => t.miqdorSababKodi).filter((k): k is NonNullable<typeof k> => k !== null),
  );
  if (kodlar.size !== 1) return null;

  // Kod bitta boʻlsa, matnni birinchi tovardan olamiz. Tafsilot
  // (necha kun) tovardan tovarga farq qiladi, lekin SABAB bitta —
  // va foydalanuvchiga kerak boʻlgani shu.
  const namuna = royxat.find((t) => t.miqdorSababKodi !== null);
  const nechta = royxat.filter((t) => t.miqdorSababKodi !== null).length;
  if (!namuna) return null;

  return (
    <p className="ogoh">
      <strong>{nechta} ta tovarda miqdor hisoblanmadi.</strong>{' '}
      {namuna.miqdorSababi}
    </p>
  );
}

function TovarKartasi({ t, sababniKorsat }: { t: Tovar; sababniKorsat: boolean }) {
  const n = t.nomzod;
  return (
    <article className="karta">
      <header>
        <h3>{n.title}</h3>
        <span className="ball">
          {t.miqdor ? `${t.miqdor.dona} dona` : '—'}
        </span>
      </header>

      <p className="nega">
        {n.shopName ?? '—'} · {pul(n.narxSom)} · Qoldiq: {son(n.qoldiq)} ·{' '}
        {n.reyting === null ? '—' : `★ ${n.reyting}`} ({son(n.sharhSoni)} sharh)
      </p>

      {t.miqdor ? (
        <p className="nega">{t.miqdor.hisob}</p>
      ) : sababniKorsat ? (
        <p className="ogoh">{t.miqdorSababi}</p>
      ) : null}

      <p className="nega">
        30 kunlik sotuv: {son(n.soldUnits30d)}
        {n.sotuvManbasi === 'olchandi'
          ? ` · oʻlchandi (${son(n.olchanganKun)} kun)`
          : n.sotuvManbasi === 'taxmin'
            ? ' · Uzum koʻrsatkichidan taxmin'
            : ''}
      </p>

      {t.bayroqlar.map((b, i) => (
        <p className="ogoh" key={i}>{b.reason}</p>
      ))}

      {t.baholanmadi.length > 0 && (
        <p className="nega">
          Baholanmagan filtrlar:{' '}
          {t.baholanmadi.map((b) => `${b.filtr} (${b.missing.join(', ')} yoʻq)`).join(' · ')}
        </p>
      )}
    </article>
  );
}

/** Soʻm summasi. Oʻlchanmagan bo'lsa chiziqcha. */
function pul(n: number | null): string {
  return n === null ? '—' : `${n.toLocaleString('uz-UZ')} soʻm`;
}

/**
 * Sabab TURLARI xilma-xilmi — unda har kartada koʻrsatiladi.
 *
 * Guruhlash KOD boʻyicha, matn boʻyicha emas: "1 kun bor" va
 * "2 kun bor" — bir xil sabab, boshqa satr. Matn boʻyicha
 * guruhlaganda roʻyxatda yigirmata deyarli bir xil ogohlantirish
 * chiqib, uni oʻqib boʻlmasdi.
 */
function xilmaXilSabab(royxat: Tovar[]): boolean {
  const s = new Set(royxat.map((t) => t.miqdorSababKodi).filter(Boolean));
  return s.size > 1;
}
