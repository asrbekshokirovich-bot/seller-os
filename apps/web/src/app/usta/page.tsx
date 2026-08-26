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
import { aylanmaKun, SAVOLLAR, type Savol } from '@selleros/shared';
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
  /** 4-qadam qaysi tovar uchun ochilgan. `null` — yopiq. */
  const [tannarxTovari, setTannarxTovari] = useState<Tovar | null>(null);
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
  const qadam = tannarxTovari ? 4 : tanlangan ? 3 : natija ? 2 : 1;

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
              tannarx={setTannarxTovari}
            />
          )}

          {tannarxTovari && (
            <Tannarx
              key={tannarxTovari.nomzod.productId}
              tovar={tannarxTovari.nomzod}
              komissiyaFoizi={
                (tannarxTovari.nomzod as { komissiyaFoizi?: number | null })
                  .komissiyaFoizi ?? null
              }
              komissiyaManbasi={
                (tannarxTovari.nomzod as { komissiyaManbasi?: string | null })
                  .komissiyaManbasi ?? null
              }
              yop={() => setTannarxTovari(null)}
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
  yonalish, natija, yuklanmoqda, tannarx,
}: {
  yonalish: Yonalish;
  natija: TovarNatija | null;
  yuklanmoqda: boolean;
  tannarx: (t: Tovar) => void;
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
              tannarx={tannarx}
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
  { t, sababniKorsat, baholanmaganniKorsat, tannarx }:
  {
    t: Tovar; sababniKorsat: boolean; baholanmaganniKorsat: boolean;
    tannarx: (t: Tovar) => void;
  },
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

      <div>
        <button type="button" className={u.chip} onClick={() => tannarx(t)}>
          Tannarxni hisoblash
        </button>
      </div>
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

/* ------------------------------------------------------ 4-qadam */

/** 4-qadam sozlamalari — bir marta kiritiladi, tovardan tovarga oʻzgarmaydi. */
interface Sozlama {
  kursSomPerYuan: string;
  kargoSomPerKg: string;
  kargoSomPerM3: string;
  bojFoizi: string;
  qqsFoizi: string;
}

const SOZLAMA_BOSH: Sozlama = {
  kursSomPerYuan: '', kargoSomPerKg: '', kargoSomPerM3: '',
  bojFoizi: '', qqsFoizi: '',
};

interface TannarxJavobi {
  olchov_yoq: boolean;
  sofFoydaSom: number | null;
  marjaFoizi: number | null;
  kargoAsosi: 'ogirlik' | 'hajm' | null;
  yetishmaydi: string[];
  tannarx: {
    sotuvNarxi: number | null; xitoyNarxi: number | null;
    kargo: number | null; bojxonaQqs: number | null;
    komissiya: number | null; uzumLogistika: number | null;
    saqlash: number | null;
  };
  demping?: {
    bayroq: { reason: string; severity: string } | null;
    baholanmadi: string[] | null;
  };
}

/**
 * 4-qadam — bitta tovarning haqiqiy tannarxi.
 *
 * NEGA ALOHIDA QADAM. 1—3-qadam BOZOR haqida: nima sotiladi, kim
 * sotadi, qancha. 4-qadam esa SIZNING pulingiz haqida va u
 * boshqa turdagi maʼlumot talab qiladi — Xitoy narxi, kargo
 * tarifingiz, bojxona stavkasi. Bularni biz oʻlchay olmaymiz.
 *
 * SHUNING UCHUN IKKI TURDAGI RAQAM ANIQ AJRATILGAN:
 *
 *   oʻlchandi   — biz bilamiz (narx, ogʻirlik, hajm)
 *   Uzum        — Uzumning oʻz jadvalidan (komissiya, logistika)
 *   siz aytdingiz — foydalanuvchi kiritgan taxmin
 *
 * Uchalasini bir xil koʻrsatsak, natija "hisoblab chiqarilgan
 * haqiqat" boʻlib koʻrinardi. Aslida uning yarmi taxmin va
 * foydalanuvchi buni bilishi kerak.
 */
function Tannarx({ tovar, komissiyaFoizi, komissiyaManbasi, yop }: {
  tovar: Tovar['nomzod'] & { weightG?: number | null; volumeMl?: number | null };
  komissiyaFoizi: number | null;
  komissiyaManbasi: string | null;
  yop: () => void;
}) {
  const [xitoy, setXitoy] = useState('');
  const [soz, setSoz] = useState<Sozlama>(SOZLAMA_BOSH);
  const [ochiq, setOchiq] = useState(true);
  const [natija, setNatija] = useState<TannarxJavobi | null>(null);
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);
  const langar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    langar.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [natija, ochiq]);

  /* Sozlamalarni brauzerda saqlaymiz: ular tovardan tovarga
     oʻzgarmaydi va har safar qaytadan yozdirish ortiqcha. */
  useEffect(() => {
    try {
      const eski = localStorage.getItem('so_tannarx_sozlama');
      if (eski) setSoz({ ...SOZLAMA_BOSH, ...JSON.parse(eski) });
    } catch { /* saqlangan qiymat yoʻq — bu xato emas */ }
  }, []);

  function sozla(maydon: keyof Sozlama, q: string) {
    const yangi = { ...soz, [maydon]: q };
    setSoz(yangi);
    try { localStorage.setItem('so_tannarx_sozlama', JSON.stringify(yangi)); } catch { /* jim */ }
  }

  async function hisobla() {
    setBand(true);
    setXato(null);
    try {
      const r = await fetch('/api/tannarx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sotuvNarxiSom: tovar.narxSom,
          xitoyNarxiYuan: kiritilganSon(xitoy),
          kursSomPerYuan: kiritilganSon(soz.kursSomPerYuan),
          weightG: tovar.weightG ?? null,
          volumeMl: tovar.volumeMl ?? null,
          kargo: {
            somPerKg: kiritilganSon(soz.kargoSomPerKg),
            somPerM3: kiritilganSon(soz.kargoSomPerM3),
          },
          boj: { bojFoizi: kiritilganSon(soz.bojFoizi), qqsFoizi: kiritilganSon(soz.qqsFoizi) },
          komissiyaFoizi,
          /*
           * Aylanma — tovar omborda oʻrtacha necha kun turadi.
           * Uzumning taʼrifi 15 kunlik oʻrtachaga tayanadi, bizda
           * esa 30 kunlik oʻlchangan sotuv bor; oyna boshqa, oʻlchov
           * bir xil. Farq izohlanmasa raqam Uzumnikidan biroz
           * chetga chiqadi — shuning uchun natija "hisoblandi" deb
           * belgilanadi.
           *
           * Ikkalasi ham OʻLCHANGAN: qoldiq va 30 kunlik sotuv.
           * Bittasi yoʻq boʻlsa `aylanmaKun` `null` qaytaradi va
           * saqlash haqi chiziqcha boʻlib qoladi.
           */
          aylanmaKun: aylanmaKun(
            tovar.qoldiq ?? null,
            tovar.soldUnits30d === null || tovar.soldUnits30d === undefined
              ? null
              : tovar.soldUnits30d / 30,
          ),
        }),
      });
      setNatija((await r.json()) as TannarxJavobi);
      setOchiq(false);
    } catch (q) {
      setXato(`Soʻrov yuborilmadi: ${String(q)}`);
    } finally {
      setBand(false);
    }
  }

  return (
    <>
      <Ai nega="Bu raqamlar SIZNING xaridingiz haqida. Biz ularni oʻlchay olmaymiz — kiritishingiz kerak.">
        {tovar.title} — tannarxni hisoblaymiz.
      </Ai>

      {ochiq && (
        <div className={`${u.pufak} ${u.ai} ${u.keng}`}>
          <div className={u.qatorlar}>
            <Maydon nom="1688 dagi narx (yuan)" qiymat={xitoy} oz={setXitoy}
                    joy="Masalan 20" />
            <Maydon nom="Yuan kursi (soʻm)" qiymat={soz.kursSomPerYuan}
                    oz={(q) => sozla('kursSomPerYuan', q)} joy="Masalan 1750" />
            <Maydon nom="Kargo — soʻm/kg" qiymat={soz.kargoSomPerKg}
                    oz={(q) => sozla('kargoSomPerKg', q)} joy="Masalan 30000" />
            <Maydon nom="Kargo — soʻm/m³" qiymat={soz.kargoSomPerM3}
                    oz={(q) => sozla('kargoSomPerM3', q)} joy="Masalan 4000000" />
            <Maydon nom="Bojxona boji (%)" qiymat={soz.bojFoizi}
                    oz={(q) => sozla('bojFoizi', q)} joy="Masalan 10" />
            <Maydon nom="QQS (%)" qiymat={soz.qqsFoizi}
                    oz={(q) => sozla('qqsFoizi', q)} joy="Masalan 12" />
            <p className={u.dalil}>
              Kurs, kargo va bojxona bir marta kiritiladi — keyingi
              tovarlarda saqlanib qoladi.
            </p>
          </div>
        </div>
      )}

      {xato !== null && (
        <div className={`${u.pufak} ${u.ai} ${u.keng}`}>
          <p className={u.xato}>{xato}</p>
        </div>
      )}

      {natija && <TannarxNatija n={natija} manba={komissiyaManbasi} />}

      <div className={u.chiplar}>
        {!ochiq && (
          <button type="button" className={`${u.chip} ${u.chipYengil}`}
                  onClick={() => setOchiq(true)}>
            Raqamlarni oʻzgartirish
          </button>
        )}
        {ochiq && (
          <button type="button" className={`${u.chip} ${u.chipAsosiy}`}
                  onClick={hisobla} disabled={band}>
            {band ? 'Hisoblanmoqda…' : 'Hisoblash'}
          </button>
        )}
        <button type="button" className={`${u.chip} ${u.chipYengil}`} onClick={yop}>
          Yopish
        </button>
      </div>
      <div ref={langar} />
    </>
  );
}

function Maydon({ nom, qiymat, oz, joy }: {
  nom: string; qiymat: string; oz: (q: string) => void; joy: string;
}) {
  return (
    <label className={u.maydon}>
      <span>{nom}</span>
      <input type="number" min={0} inputMode="decimal" value={qiymat}
             placeholder={joy} onChange={(e) => oz(e.target.value)} />
    </label>
  );
}

/**
 * Natija — har qator MANBASI bilan.
 *
 * Eng muhim ustun raqam emas, "qayerdan" ustuni. Foydalanuvchi
 * qaysi raqam oʻlchangani va qaysi biri uning oʻz taxmini
 * ekanini koʻrmasa, butun hisob "tizim shunday dedi" boʻlib
 * qoladi va xato joyini topib boʻlmaydi.
 */
function TannarxNatija({ n, manba }: { n: TannarxJavobi; manba: string | null }) {
  const t = n.tannarx;
  const qatorlar: Array<[string, number | null, string]> = [
    ['Uzumdagi sotuv narxi', t.sotuvNarxi, 'oʻlchandi'],
    ['1688 narxi (soʻmda)', t.xitoyNarxi, 'siz kiritdingiz'],
    ['Kargo (Xitoydan omborgacha)', t.kargo,
      n.kargoAsosi === 'hajm' ? 'hajm boʻyicha' : n.kargoAsosi === 'ogirlik' ? 'ogʻirlik boʻyicha' : '—'],
    ['Bojxona + QQS', t.bojxonaQqs, 'siz kiritdingiz'],
    ['Uzum komissiyasi', t.komissiya, manba ? 'Uzum jadvali' : 'siz kiritdingiz'],
    ['Uzum logistikasi (xaridorgacha)', t.uzumLogistika, 'Uzum tarifi'],
    // "hisoblandi" — "oʻlchandi" EMAS. Saqlash haqi tovar omborda
    // necha kun turishiga bogʻliq, u esa kelajakdagi sotuv
    // tezligiga bogʻliq. Farqni koʻrsatmasak, model oʻlchov
    // qiyofasida chiqardi.
    ['Ombor saqlash haqi', t.saqlash, 'hisoblandi'],
  ];

  return (
    <div className={`${u.pufak} ${u.ai} ${u.keng}`}>
      <table className={u.jadval}>
        <thead>
          <tr><th>Nima</th><th className={u.son}>Soʻm</th><th>Qayerdan</th></tr>
        </thead>
        <tbody>
          {qatorlar.map(([nom, q, qayerdan]) => (
            <tr key={nom}>
              <td>{nom}</td>
              <td className={u.son}>
                {q === null ? <span className={u.yoq}>—</span> : q.toLocaleString('uz-UZ')}
              </td>
              {/* Raqam yoʻq boʻlsa MANBA ham yozilmaydi: "Uzum jadvali"
                  degan yozuv boʻsh katak yonida turgan raqam bor,
                  faqat koʻrsatilmagan degan taassurot beradi. */}
              <td className={u.yoq}>{q === null ? '—' : qayerdan}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {n.sofFoydaSom === null ? (
        <p className={u.ogohlik}>
          Hisob toʻliq emas. Yetishmayapti: {n.yetishmaydi.join(', ')}.
          Nol koʻrsatilmaydi — u &laquo;tekin&raquo; degan javob boʻlardi.
        </p>
      ) : n.sofFoydaSom < 0 ? (
        /*
         * ZARAR SOʻZ BILAN AYTILADI. Ilgari manfiy son ijobiysi
         * bilan bir xil koʻrinardi — faqat oldida minus. Odam
         * jadvalni tez oʻqiganda minusni sezmasligi mumkin, va
         * aynan shu holatda u butun partiya pulini tikadi.
         */
        <p className={u.xato}>
          <strong>
            Har donada ZARAR: {Math.abs(n.sofFoydaSom).toLocaleString('uz-UZ')} soʻm
            {n.marjaFoizi !== null && ` · marja ${n.marjaFoizi.toFixed(1)}%`}
          </strong>
        </p>
      ) : (
        <p className={u.dalil}>
          <strong>
            Sof foyda: {n.sofFoydaSom.toLocaleString('uz-UZ')} soʻm
            {n.marjaFoizi !== null && ` · marja ${n.marjaFoizi.toFixed(1)}%`}
          </strong>
        </p>
      )}

      {n.demping?.bayroq && (
        <p className={u.xato}>{n.demping.bayroq.reason}</p>
      )}
    </div>
  );
}

/**
 * Matndan son. Boʻsh matn NOL emas — `null`.
 *
 * Nomi `son` emas: bu faylda allaqachon `son(number)` bor va u
 * teskari ish qiladi (sonni matnga). Ikkalasi bir nom bilan
 * turganda TypeScript ularni ajratardi, odam esa yoʻq.
 */
function kiritilganSon(s: string): number | null {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
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
