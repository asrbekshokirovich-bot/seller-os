'use client';

/**
 * Usta — chat koʻrinishida (dizayn qadogʻining 2-ekrani).
 *
 * NEGA CHAT. Nazoratchi bergan dizaynda Usta oqimi aynan shunday:
 * tepada "QADAM" nuqtalari, oʻrtada pufakchalar, pastda javob
 * tugmalari. Ilgari bu sahifa oʻn ikki savolli oddiy forma edi —
 * yaʼni dizayn boʻyicha emas, oʻzim oʻylab topgan koʻrinishda.
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
 *
 * JAVOB BERMASLIK HAM JAVOB. Har savolda "Oʻtkazib yuborish" bor va
 * u maydonni `undefined` qoldiradi, NOL qilmaydi: nol "pulim yoʻq"
 * degan javob, boʻshliq esa "aytmadi".
 */

import { useEffect, useRef, useState } from 'react';
import { SAVOLLAR, type Savol } from '@selleros/shared';
import u from './usta.module.css';

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

/** Rejadagi Usta qadamlari — tepadagi nuqtalar shuncha. */
const QADAM_SONI = 6;

export default function Usta() {
  const [javoblar, setJavoblar] = useState<Javoblar>({});
  const [joriy, setJoriy] = useState(0);
  const [tiklandi, setTiklandi] = useState(false);
  const [eskiTiklandi, setEskiTiklandi] = useState(false);

  const [natija, setNatija] = useState<Natija | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  const [tanlangan, setTanlangan] = useState<Yonalish | null>(null);
  const [tovarlar, setTovarlar] = useState<TovarNatija | null>(null);
  const [tovarYuklanmoqda, setTovarYuklanmoqda] = useState(false);

  const [matn, setMatn] = useState('');
  const oxiri = useRef<HTMLDivElement>(null);

  /*
   * Oldingi javoblarni tiklaymiz.
   *
   * Ilgari sahifa yangilansa hammasi yoʻqolardi va odam oʻn ikki
   * savolga qaytadan javob berardi. Endi javoblar sessiyaga
   * bogʻlangan (HttpOnly cookie) va qaytib keladi.
   */
  useEffect(() => {
    let bekor = false;
    (async () => {
      try {
        const r = await fetch('/api/profil');
        const d = (await r.json()) as { javoblar?: Javoblar | null };
        if (!bekor && d.javoblar && Object.keys(d.javoblar).length > 0) {
          setJavoblar(d.javoblar);
          // Javoblar bor — oʻn ikki savolni qaytadan soʻramaymiz.
          setJoriy(SAVOLLAR.length);
          setEskiTiklandi(true);
        }
      } catch {
        // Tiklab boʻlmadi — suhbat boshidan boshlanadi. Bu xato emas.
      } finally {
        if (!bekor) setTiklandi(true);
      }
    })();
    return () => { bekor = true; };
  }, []);

  // Yangi xabar kelganda oxiriga suramiz — aks holda javob
  // qabul qilingandek koʻrinmaydi.
  useEffect(() => {
    oxiri.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [joriy, natija, tovarlar, tanlangan, yuklanmoqda, tovarYuklanmoqda]);

  const savol: Savol | undefined = SAVOLLAR[joriy];
  const qadam = tanlangan ? 3 : natija ? 2 : 1;

  function yoz(maydon: string, qiymat: unknown) {
    setJavoblar((eski) => ({ ...eski, [maydon]: qiymat }));
  }

  function keyingi() {
    setJoriy((i) => i + 1);
    setMatn('');
  }

  /** Javob berilmadi — maydon `undefined` boʻlib qoladi, NOL emas. */
  function otkaz() {
    if (savol) {
      setJavoblar((eski) => {
        const yangi = { ...eski };
        delete yangi[savol.maydon];
        return yangi;
      });
    }
    keyingi();
  }

  function boshdan() {
    setJoriy(0);
    setNatija(null);
    setTanlangan(null);
    setTovarlar(null);
    setEskiTiklandi(false);
  }

  async function yonalishlarniOl() {
    setYuklanmoqda(true);
    setXato(null);

    // Javoblarni SAQLAYMIZ, keyin tavsiya soʻraymiz. Saqlash
    // yiqilsa ham tavsiya beriladi: odam javob berdi, uni
    // texnik nosozlik tufayli kutdirish notoʻgʻri.
    setSaqlanmoqda(true);
    try {
      await fetch('/api/profil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profil: javoblar }),
      });
    } catch {
      // Jim oʻtmaydi — suhbatda koʻrsatiladi.
      setXato('Javoblar saqlanmadi (tavsiya baribir koʻrsatiladi).');
    } finally {
      setSaqlanmoqda(false);
    }

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
    }
  }

  return (
    <div className={u.ilova}>
      <header className={u.tepa}>
        <div className={u.belgi}>
          <span className={u.nishon} aria-hidden="true">Z</span>
          <span className={u.nom}>ZumSavdo<span>Usta</span></span>
        </div>

        <div className={u.qadamlar}>
          <span className={u.qadamYorliq}>Qadam</span>
          <div
            className={u.nuqtalar}
            role="img"
            aria-label={`${QADAM_SONI} qadamdan ${qadam}-si`}
          >
            {Array.from({ length: QADAM_SONI }, (_, i) => i + 1).map((n) => (
              <span
                key={n}
                className={[
                  u.nuqta,
                  n < qadam ? u.nuqtaOtildi : '',
                  n === qadam ? u.nuqtaJoriy : '',
                ].join(' ')}
              />
            ))}
          </div>
        </div>

        <a className={u.chiqish} href="/">Chiqish</a>
      </header>

      <div className={u.oqim}>
        <div className={u.ichi}>
          <Ai>
            Salom! Men ZumSavdo Ustasiman. Uzumda nima sotish kerakligini
            raqamlar bilan tanlab beraman.
          </Ai>
          <Ai>
            Oʻn ikki savol beraman. Hech biri majburiy emas — javob
            bermasangiz, tizim taxmin qilmaydi.
          </Ai>

          {eskiTiklandi && (
            <Ai>
              Oldingi javoblaringiz tiklandi. Oʻzgartirmoqchi boʻlsangiz —
              &laquo;Javoblarni oʻzgartirish&raquo;.
            </Ai>
          )}

          {!eskiTiklandi && SAVOLLAR.slice(0, joriy).map((s) => (
            <Berilgan key={s.raqam} savol={s} qiymat={javoblar[s.maydon]} />
          ))}

          {savol !== undefined && !eskiTiklandi && (
            <Ai nega={savol.nega}>{savol.raqam}. {savol.matn}</Ai>
          )}

          {savol === undefined && !natija && !yuklanmoqda && !saqlanmoqda && (
            <Ai>Savollar tugadi. Yoʻnalishlarni hisoblab beraymi?</Ai>
          )}

          {(yuklanmoqda || saqlanmoqda) && (
            <Ai>{saqlanmoqda ? 'Javoblarni saqlayapman…' : 'Hisoblayapman…'}</Ai>
          )}

          {xato !== null && (
            <div className={`${u.pufak} ${u.ai} ${u.keng}`}>
              <p className={u.xato}>{xato}</p>
            </div>
          )}

          {natija && (
            <Yonalishlar natija={natija} tanla={tovarlarniOl} tanlangan={tanlangan} />
          )}

          {tanlangan && (
            <Tovarlar
              yonalish={tanlangan}
              natija={tovarlar}
              yuklanmoqda={tovarYuklanmoqda}
            />
          )}

          {/*
            * Fikr faqat KOʻRSATILGAN roʻyxat haqida soʻraladi.
            * Boʻsh roʻyxat yoki xato haqida "mantiqlimi?" deb
            * soʻrash maʼnosiz — javob Usta hisobi haqida emas,
            * nosozlik haqida boʻlardi.
            */}
          {tanlangan && !tovarYuklanmoqda
            && tovarlar && !tovarlar.olchov_yoq
            && (tovarlar.royxat?.length ?? 0) > 0 && (
            <Fikr key={tanlangan.categoryId} turkum={tanlangan.categoryId} />
          )}

          <div ref={oxiri} />
        </div>
      </div>

      <div className={u.past_}>
        <div className={u.pastIchi}>
          {!tiklandi ? (
            <p className={u.holat}>Yuklanmoqda…</p>
          ) : (
            <Javoblash
              savol={eskiTiklandi ? undefined : savol}
              javoblar={javoblar}
              yoz={yoz}
              keyingi={keyingi}
              otkaz={otkaz}
              tugadi={savol === undefined || eskiTiklandi}
              natija={natija}
              band={yuklanmoqda || saqlanmoqda}
              yonalishlarniOl={yonalishlarniOl}
              boshdan={boshdan}
              matn={matn}
              setMatn={setMatn}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------ pufakchalar */

function Ai({ children, nega }: { children: React.ReactNode; nega?: string }) {
  return (
    <div className={`${u.pufak} ${u.ai}`}>
      {children}
      {nega !== undefined && <span className={u.nega}>{nega}</span>}
    </div>
  );
}

/** Berilgan savol va unga berilgan javob. */
function Berilgan({ savol, qiymat }: { savol: Savol; qiymat: unknown }) {
  const javob = javobMatni(savol, qiymat);
  return (
    <>
      <div className={`${u.pufak} ${u.ai}`}>{savol.raqam}. {savol.matn}</div>
      <div className={`${u.pufak} ${javob === null ? u.otkazdi : u.men}`}>
        {javob ?? 'Oʻtkazib yuborildi'}
      </div>
    </>
  );
}

/**
 * Javobning koʻrinadigan matni. `null` — javob berilmagan.
 *
 * Boʻsh massiv ham "javob berilmagan": koʻp tanlovli savolda hech
 * nima belgilanmasa, bu "hech biri" degan DAʼVO emas.
 */
function javobMatni(s: Savol, q: unknown): string | null {
  if (q === undefined || q === null || q === '') return null;
  if (Array.isArray(q)) {
    if (q.length === 0) return null;
    return q.map((x) => variantNomi(s, String(x))).join(', ');
  }
  if (s.turi === 'haYoq') return q === 'ha' ? 'Ha' : 'Yoʻq';
  if (s.turi === 'son') {
    const n = Number(q);
    if (!Number.isFinite(n)) return null;
    return s.maydon === 'budgetUzs' ? `${n.toLocaleString('uz-UZ')} soʻm` : String(n);
  }
  return variantNomi(s, String(q));
}

function variantNomi(s: Savol, qiymat: string): string {
  return s.variantlar?.find((v) => v.qiymat === qiymat)?.nom ?? qiymat;
}

/* ------------------------------------------------------ javob paneli */

function Javoblash({
  savol, javoblar, yoz, keyingi, otkaz, tugadi, natija, band,
  yonalishlarniOl, boshdan, matn, setMatn,
}: {
  savol: Savol | undefined;
  javoblar: Javoblar;
  yoz: (maydon: string, q: unknown) => void;
  keyingi: () => void;
  otkaz: () => void;
  tugadi: boolean;
  natija: Natija | null;
  band: boolean;
  yonalishlarniOl: () => void;
  boshdan: () => void;
  matn: string;
  setMatn: (s: string) => void;
}) {
  if (tugadi) {
    return (
      <div className={u.chiplar}>
        {!natija && (
          <button
            type="button"
            className={`${u.chip} ${u.chipAsosiy}`}
            onClick={yonalishlarniOl}
            disabled={band}
          >
            {band ? 'Hisoblanmoqda…' : 'Yoʻnalishlarni koʻrsat'}
          </button>
        )}
        <button
          type="button"
          className={`${u.chip} ${u.chipYengil}`}
          onClick={boshdan}
          disabled={band}
        >
          Javoblarni oʻzgartirish
        </button>
      </div>
    );
  }
  if (savol === undefined) return null;

  const q = javoblar[savol.maydon];

  if (savol.turi === 'kop') {
    const belgilangan = Array.isArray(q) ? (q as string[]) : [];
    return (
      <div className={u.chiplar}>
        {savol.variantlar?.map((v) => {
          const bor = belgilangan.includes(v.qiymat);
          return (
            <button
              key={v.qiymat}
              type="button"
              className={`${u.chip} ${bor ? u.chipTanlangan : ''}`}
              aria-pressed={bor}
              onClick={() => yoz(savol.maydon, bor
                ? belgilangan.filter((x) => x !== v.qiymat)
                : [...belgilangan, v.qiymat])}
            >
              {v.nom}
            </button>
          );
        })}
        {belgilangan.length > 0 ? (
          <button type="button" className={`${u.chip} ${u.chipAsosiy}`} onClick={keyingi}>
            Tayyor
          </button>
        ) : (
          <button type="button" className={`${u.chip} ${u.chipYengil}`} onClick={otkaz}>
            Oʻtkazib yuborish
          </button>
        )}
      </div>
    );
  }

  if (savol.turi === 'bitta' || savol.turi === 'haYoq') {
    const variantlar = savol.turi === 'haYoq'
      ? [{ qiymat: 'ha', nom: 'Ha' }, { qiymat: "yo'q", nom: 'Yoʻq' }]
      : (savol.variantlar ?? []);
    return (
      <div className={u.chiplar}>
        {variantlar.map((v) => (
          <button
            key={v.qiymat}
            type="button"
            className={u.chip}
            onClick={() => { yoz(savol.maydon, v.qiymat); keyingi(); }}
          >
            {v.nom}
          </button>
        ))}
        <button type="button" className={`${u.chip} ${u.chipYengil}`} onClick={otkaz}>
          Oʻtkazib yuborish
        </button>
      </div>
    );
  }

  /*
   * `son` — yagona tur, unda matn maydoni HAQIQATAN ishlaydi.
   *
   * Dizaynda maydon hamma savolda koʻrinadi ("Yoki oʻzingiz
   * yozing…"). Bu yerda faqat shu turda koʻrsatiladi: yozilgani
   * qabul qilinmaydigan maydon foydalanuvchini aldardi.
   */
  const son = () => {
    const t = matn.trim();
    const n = Number(t);
    // Boʻsh maydon `undefined` boʻladi, NOL emas. Nol "pulim yoʻq"
    // degan javob, boʻshliq esa "aytmadi".
    if (t === '' || !Number.isFinite(n) || n < 0) { otkaz(); return; }
    yoz(savol.maydon, n);
    keyingi();
  };

  return (
    <>
      <div className={u.kiritish}>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          aria-label={savol.matn}
          placeholder={savol.maydon === 'budgetUzs' ? 'Masalan 30000000 (soʻm)' : 'Masalan 10'}
          value={matn}
          onChange={(e) => setMatn(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') son(); }}
        />
        <button type="button" className={u.yubor} onClick={son}>Yuborish</button>
      </div>
      <div className={u.chiplar}>
        <button type="button" className={`${u.chip} ${u.chipYengil}`} onClick={otkaz}>
          Oʻtkazib yuborish
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------ 2-qadam */

function Yonalishlar({
  natija, tanla, tanlangan,
}: {
  natija: Natija;
  tanla: (y: Yonalish) => void;
  tanlangan: Yonalish | null;
}) {
  if (natija.olchov_yoq) {
    return (
      <div className={`${u.pufak} ${u.ai} ${u.keng}`}>
        <p className={u.xato}>
          Hozircha koʻrsatadigan narsa yoʻq. Sabab: {natija.sabab ?? 'nomaʼlum'}.
        </p>
        <span className={u.nega}>
          Bu &laquo;sizga mos yoʻnalish yoʻq&raquo; degani EMAS. Maʼlumot yetib
          kelmadi — biroz kutib qayta urinib koʻring.
        </span>
      </div>
    );
  }

  const royxat = natija.royxat ?? [];

  return (
    <>
      <div className={`${u.pufak} ${u.ai}`}>
        {natija.nomzod_soni} turkum tekshirildi
        {typeof natija.baholanmadi === 'number' && natija.baholanmadi > 0
          ? `, ${natija.baholanmadi} tasini maʼlumot yetishmagani uchun baholab boʻlmadi`
          : ''}
        . Mana eng mos yoʻnalishlar:
      </div>

      {natija.kesh_eskirgan && (
        <div className={`${u.pufak} ${u.ai} ${u.keng}`}>
          <p className={u.ogohlik}>
            Raqamlar {natija.yoshi_soat} soat oldin hisoblangan. Tavsiya
            baribir koʻrsatiladi, lekin yangilanish kechikkan.
          </p>
        </div>
      )}

      {royxat.length === 0 && (
        <div className={`${u.pufak} ${u.ai} ${u.keng}`}>
          <p className={u.ogohlik}>
            Turkumlar tekshirildi, lekin bittasi ham baholanmadi — maʼlumot
            yetarli emas.
          </p>
        </div>
      )}

      {royxat.length > 0 && (
        <div className={`${u.pufak} ${u.ai} ${u.keng}`}>
          <div className={u.qatorlar}>
            {royxat.map((y) => (
              <YonalishKartasi
                key={y.categoryId}
                y={y}
                tanla={tanla}
                tanlangan={tanlangan?.categoryId === y.categoryId}
              />
            ))}
          </div>
        </div>
      )}

      {natija.bolishTaklifi && (
        <div className={`${u.pufak} ${u.ai} ${u.keng}`}>
          <p className={u.ogohlik}>{natija.bolishTaklifi.sabab}</p>
        </div>
      )}
    </>
  );
}

function YonalishKartasi({
  y, tanla, tanlangan,
}: {
  y: Yonalish;
  tanla: (y: Yonalish) => void;
  tanlangan: boolean;
}) {
  return (
    <article className={u.karta}>
      <header className={u.kartaBoshi}>
        <h3 className={u.kartaNomi}>{y.name}</h3>
        <span className={u.ball}>{y.ball.value ?? '—'}</span>
      </header>

      <p className={u.dalil}>
        Sotuvchi: {son(y.dalil.sotuvchiSoni)} · Top-3 ulushi:{' '}
        {y.dalil.top3Ulush === null ? '—' : `${y.dalil.top3Ulush}%`} ·{' '}
        {y.yetadi === null
          ? 'Byudjet yetadimi — nomaʼlum'
          : y.yetadi ? 'Byudjetingiz yetadi' : 'Byudjetingiz yetmaydi'}
      </p>

      <details className={u.tafsilot}>
        <summary>Nega bu ball?</summary>
        <table className={u.jadval}>
          <thead>
            <tr>
              <th>Qism</th>
              <th className={u.son}>Ball</th>
              <th className={u.son}>Vazn</th>
              <th>Holat</th>
            </tr>
          </thead>
          <tbody>
            {y.ball.breakdown.map((q) => (
              <tr key={q.part}>
                <td>{QISM_NOMI[q.part] ?? q.part}</td>
                <td className={u.son}>
                  {q.score === null ? <span className={u.yoq}>—</span> : q.score.toFixed(0)}
                </td>
                <td className={u.son}>{q.weight}</td>
                <td>
                  {!q.applicable
                    ? <span className={u.yoq}>bu bosqichda hisoblanmaydi</span>
                    : q.used ? 'hisobga olindi'
                    : <span className={u.yoq}>maʼlumot yoʻq</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <div>
        <button
          type="button"
          className={`${u.chip} ${tanlangan ? u.chipTanlangan : ''}`}
          onClick={() => tanla(y)}
        >
          {tanlangan ? 'Tovarlar koʻrsatilmoqda' : 'Shu yoʻnalishdagi tovarlar'}
        </button>
      </div>
    </article>
  );
}

/* ------------------------------------------------------ 3-qadam */

/**
 * Tanlangan yoʻnalishdagi tovarlar.
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
  if (yuklanmoqda) {
    return <Ai>{yonalish.name} boʻyicha tovarlarni yigʻyapman…</Ai>;
  }

  if (natija?.olchov_yoq) {
    return (
      <div className={`${u.pufak} ${u.ai} ${u.keng}`}>
        <p className={u.xato}>
          Tovar roʻyxati koʻrsatilmadi. Sabab: {natija.sabab ?? 'nomaʼlum'}.
        </p>
      </div>
    );
  }

  if (!natija) return null;

  const royxat = natija.royxat ?? [];

  return (
    <>
      <div className={`${u.pufak} ${u.ai}`}>
        {yonalish.name} — {royxat.length} ta tovar
        {natija.chiqarildi?.length
          ? `, ${natija.chiqarildi.length} tasi tuzoq tufayli chiqarildi`
          : ''}
        .
      </div>

      <div className={`${u.pufak} ${u.ai} ${u.keng}`}>
        <div className={u.qatorlar}>
          <UmumiySabab royxat={royxat} />
          {!xilmaXilBaholanmadi(royxat) && <BaholanmaganLar royxat={royxat} />}

          {royxat.map((t) => (
            <TovarKartasi
              key={t.nomzod.productId}
              t={t}
              sababniKorsat={xilmaXilSabab(royxat)}
              baholanmaganniKorsat={xilmaXilBaholanmadi(royxat)}
            />
          ))}

          {natija.chiqarildi?.length ? (
            <details className={u.tafsilot}>
              <summary>Roʻyxatdan chiqarilgan {natija.chiqarildi.length} ta tovar</summary>
              <table className={u.jadval}>
                <thead><tr><th>Tovar</th><th>Nega chiqarildi</th></tr></thead>
                <tbody>
                  {natija.chiqarildi.map((c) => (
                    <tr key={c.productId}>
                      <td>{c.title}</td>
                      <td className={u.yoq}>{c.sabab}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ) : null}
        </div>
      </div>
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
    <p className={u.ogohlik}>
      <strong>{nechta} ta tovarda miqdor hisoblanmadi.</strong>{' '}
      {namuna.miqdorSababi}
    </p>
  );
}

function TovarKartasi(
  { t, sababniKorsat, baholanmaganniKorsat }:
  { t: Tovar; sababniKorsat: boolean; baholanmaganniKorsat: boolean },
) {
  const n = t.nomzod;
  return (
    <article className={u.karta}>
      <header className={u.kartaBoshi}>
        <h3 className={u.kartaNomi}>{n.title}</h3>
        <span className={u.ball}>{t.miqdor ? `${t.miqdor.dona} dona` : '—'}</span>
      </header>

      <p className={u.dalil}>
        {n.shopName ?? '—'} · {pul(n.narxSom)} · Qoldiq: {son(n.qoldiq)} ·{' '}
        {n.reyting === null ? '—' : `★ ${n.reyting}`} ({son(n.sharhSoni)} sharh)
      </p>

      {t.miqdor ? (
        <p className={u.dalil}>{t.miqdor.hisob}</p>
      ) : sababniKorsat ? (
        <p className={u.ogohlik}>{t.miqdorSababi}</p>
      ) : null}

      <p className={u.dalil}>
        30 kunlik sotuv: {son(n.soldUnits30d)}
        {n.sotuvManbasi === 'olchandi'
          ? ` · oʻlchandi (${son(n.olchanganKun)} kun)`
          : n.sotuvManbasi === 'taxmin'
            ? ' · Uzum koʻrsatkichidan taxmin'
            : ''}
      </p>

      {t.bayroqlar.map((b, i) => (
        <p className={u.ogohlik} key={i}>{b.reason}</p>
      ))}

      {baholanmaganniKorsat && t.baholanmadi.length > 0 && (
        <BaholanmaganLar royxat={[t]} />
      )}
    </article>
  );
}

/**
 * Baholanmagan filtrlar — bir marta, yopiq holda.
 *
 * Ilgari har kartada bir xil uzun satr turardi: "closed_brand
 * (brandSellersCount, sellersStableDays yoki brandAgeDays yoʻq) ·
 * fake_sales (…) · heavy (…)". Yigirma kartada yigirma marta —
 * va u kartadagi qolgan HAMMA narsadan koʻp joy egallardi.
 *
 * Bu maydon nomlari mijoz uchun emas, biz uchun. Shuning uchun
 * yopiq: kerak boʻlsa ochiladi, lekin roʻyxatni bosib turmaydi.
 * Yashirilmaydi ham — qaysi filtr ishlamagani koʻrinib turishi
 * kerak, aks holda tovar "hamma tekshiruvdan oʻtgan" boʻlib
 * koʻrinardi.
 */
function BaholanmaganLar({ royxat }: { royxat: Tovar[] }) {
  const nomlar = [...new Set(royxat.flatMap((t) => t.baholanmadi.map((b) => b.filtr)))];
  if (nomlar.length === 0) return null;
  const namuna = royxat.find((t) => t.baholanmadi.length > 0);
  return (
    <details className={u.tafsilot}>
      <summary>
        {nomlar.length} ta filtr baholanmadi — maʼlumot yetishmadi
      </summary>
      <table className={u.jadval}>
        <thead><tr><th>Filtr</th><th>Nima yetishmadi</th></tr></thead>
        <tbody>
          {namuna?.baholanmadi.map((b) => (
            <tr key={b.filtr}>
              <td>{b.filtr}</td>
              <td className={u.yoq}>{b.missing.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/**
 * Baholanmagan filtrlar toʻplami tovardan tovarga farq qiladimi.
 *
 * Bir xil boʻlsa — bir marta, roʻyxat tepasida. Farq qilsa — har
 * kartada, chunki unda u haqiqatan boshqacha.
 */
function xilmaXilBaholanmadi(royxat: Tovar[]): boolean {
  const s = new Set(royxat.map((t) => t.baholanmadi.map((b) => b.filtr).sort().join('|')));
  return s.size > 1;
}

/* ------------------------------------------------------ fikr */

/**
 * "Bu roʻyxat sizga mantiqlimi?"
 *
 * NEGA BU SAVOL BOR. Reja B2 darvozasi: "begona 3 sotuvchi Ustadan
 * MUSTAQIL oʻtib tovar roʻyxatiga yetadi va «mantiqli» deydi".
 * Shu paytgacha bu javobni yozib oladigan joy yoʻq edi — sotuvchi
 * "miqdor mantiqsiz" desa, gap suhbatda qolardi va uni yonida
 * oʻtirib qogʻozga koʻchirish kerak boʻlardi.
 *
 * OVOZ DARROV YOZILADI. Chip bosilishi bilan soʻrov ketadi, matn
 * kutilmaydi: odamlarning koʻpi izoh yozmaydi, lekin "ha/yoʻq"
 * ning oʻzi ham darvoza uchun dalil. Izoh keyin yuborilsa,
 * ustiga yoziladi (oxirgisi hisoblanadi).
 *
 * JAVOB BERMASLIK — FIKR EMAS. "Hozir emas" bosilsa hech narsa
 * yozilmaydi va darvoza hisobi oʻzgarmaydi. Sukut "mantiqli"
 * degani emas.
 *
 * Har yoʻnalish uchun alohida soʻraladi (`key={turkum}`): odam
 * bir turkumni mantiqli, boshqasini mantiqsiz deb topishi mumkin.
 */
function Fikr({ turkum }: { turkum: number }) {
  const [tanlov, setTanlov] = useState<boolean | null>(null);
  const [izoh, setIzoh] = useState('');
  const [band, setBand] = useState(false);
  const [yashirildi, setYashirildi] = useState(false);
  const [izohYuborildi, setIzohYuborildi] = useState(false);
  const [xato, setXato] = useState<string | null>(null);
  const langar = useRef<HTMLDivElement>(null);

  /*
   * Fikr blokining oʻz suruvchisi bor.
   *
   * Yuqoridagi umumiy `useEffect` faqat suhbat qadamlariga
   * qaraydi. Fikr ichidagi oʻzgarish (izoh maydoni ochilishi)
   * unga koʻrinmaydi va maydon ekran ostida qolib ketardi —
   * odam nima yozishini KOʻRMASDAN yozishi kerak boʻlardi.
   */
  useEffect(() => {
    langar.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [tanlov, izohYuborildi, xato]);

  async function yubor(mantiqli: boolean, matn: string | null) {
    setBand(true);
    setXato(null);
    try {
      const r = await fetch('/api/fikr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mantiqli, matn, qadam: 3, turkum }),
      });
      if (!r.ok) setXato('Fikr saqlanmadi — keyinroq qayta urinib koʻring.');
      return r.ok;
    } catch {
      // Jim oʻtmaydi: "yubordim" deb koʻrsatib, aslida
      // yubormaslik eng yomon variant.
      setXato('Fikr yuborilmadi — tarmoq javob bermadi.');
      return false;
    } finally {
      setBand(false);
    }
  }


  async function izohniYubor() {
    const t = izoh.trim();
    // Boʻsh matn yuborilmaydi: ovoz allaqachon yozilgan, boʻsh
    // qator ustiga yozish faqat ortiqcha yozuv boʻlardi.
    if (t === '') { setIzohYuborildi(true); return; }
    if (tanlov !== null && await yubor(tanlov, t)) setIzohYuborildi(true);
  }

  if (yashirildi) return null;

  if (tanlov === null) {
    return (
      <>
        <Ai nega="Javobingiz Ustani tuzatish uchun ishlatiladi. Roʻyxat oʻzgarmaydi.">
          Bu roʻyxat sizga mantiqlimi?
        </Ai>
        <div className={u.chiplar}>
          <button
            type="button"
            className={u.chip}
            disabled={band}
            onClick={async () => { setTanlov(true); await yubor(true, null); }}
          >
            Ha, mantiqli
          </button>
          <button
            type="button"
            className={u.chip}
            disabled={band}
            onClick={async () => { setTanlov(false); await yubor(false, null); }}
          >
            Yoʻq, mantiqsiz
          </button>
          <button
            type="button"
            className={`${u.chip} ${u.chipYengil}`}
            disabled={band}
            onClick={() => setYashirildi(true)}
          >
            Hozir emas
          </button>
        </div>
        <div ref={langar} />
      </>
    );
  }

  return (
    <>
      <div className={`${u.pufak} ${u.men}`}>
        {tanlov ? 'Ha, mantiqli' : 'Yoʻq, mantiqsiz'}
      </div>

      {xato !== null && (
        <div className={`${u.pufak} ${u.ai} ${u.keng}`}>
          <p className={u.xato}>{xato}</p>
        </div>
      )}

      {izohYuborildi ? (
        <Ai>Rahmat — yozib oldim.</Ai>
      ) : (
        <>
          <Ai>
            {tanlov
              ? 'Rahmat. Qaysi joyi foydali boʻldi? (majburiy emas)'
              : 'Rahmat. Nimasi notoʻgʻri koʻrindi? (majburiy emas)'}
          </Ai>
          <div className={u.kiritish}>
            <input
              type="text"
              maxLength={2000}
              aria-label="Fikringiz"
              placeholder="Masalan: miqdor juda katta koʻrindi"
              value={izoh}
              disabled={band}
              onChange={(e) => setIzoh(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') izohniYubor(); }}
            />
            <button type="button" className={u.yubor} disabled={band} onClick={izohniYubor}>
              Yuborish
            </button>
          </div>
        </>
      )}
      <div ref={langar} />
    </>
  );
}

/* ------------------------------------------------------ yordamchilar */

/** Oʻlchanmagan raqam NOL emas — chiziqcha. */
function son(n: number | null): string {
  return n === null ? '—' : n.toLocaleString('uz-UZ');
}

/** Soʻm summasi. Oʻlchanmagan boʻlsa chiziqcha. */
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
