'use client';

/**
 * Usta — chat koʻrinishida.
 *
 * DIZAYN. `ZUMSavdo Chat.dc.html` (nazoratchi, 2026-09-24): chapda
 * yon panel, oʻrtada suhbat, pastda javob tugmalari; qora + sariq,
 * tungi mavzu standart. Oldingi koʻk dizayn (`ZumSavdo-standalone`)
 * shu bilan almashdi.
 *
 * DIZAYNDAN ATAYLAB CHETGA CHIQILGAN JOYLAR — va nega:
 *
 *   1. Xitoy lotlari, toʻlov, yuk kuzatuvi, ogohlantirishlar,
 *      "narxni 5% tushir" — dizaynda ISHLAYOTGANDEK chizilgan.
 *      Tizimda ular hali yoʻq, shuning uchun "tez orada" deb
 *      turadi (nazoratchi qarori). Bosiladigan, lekin hech narsa
 *      qilmaydigan tugma — foydalanuvchini aldash.
 *   2. Dizayndagi raqamlar ("2.4 mln", "oylik savdo 184 mln",
 *      oʻsish grafigi) toʻqilgan. Bu yerda faqat API maydonlari
 *      koʻrsatiladi; grafik oʻrnida ball nimadan yigʻilgani turadi
 *      (QOIDALAR.md, 4-boʻlim).
 *   3. Tuzoq ogohlantirishi dizaynda yoʻq edi. Karta ichiga
 *      qoʻshildi: "tuzoq belgisi yashirilmaydi — tushuntiriladi".
 *   4. Yorugʻ mavzuda sariq MATN (1,5:1) oʻqilmasdi. Matn uchun
 *      alohida toʻq-sariq token bor (`--accMatn`, 5,5:1); tugma va
 *      fonlar sariq qoladi.
 *   5. Telefonda yon panel butun ekranni egallardi — endi ☰ ortida.
 *
 * TANISHUV — UCH SAVOL (nazoratchi qarori, 2026-09-24). Qolgan
 * toʻqqiztasi «Profilim» panelida. Uchtasi tasodifiy emas: ball
 * hisobi profildan faqat byudjet va soha javoblarini oʻqiydi
 * (`qadamlar.ts`, `sohalar()`), yaʼni aynan shular tavsiyani
 * oʻzgartiradi. Savol matni va variantlari `@selleros/shared` da
 * qoladi — bu yerda faqat TARTIB tanlanadi.
 *
 * BALL BU YERDA HISOBLANMAYDI. Sahifa faqat javoblarni yigʻadi va
 * natijani koʻrsatadi; hisob `@selleros/shared` da, bitta joyda
 * (QOIDALAR.md, 3-boʻlim).
 *
 * BOʻSH ROʻYXAT HECH QACHON KOʻRSATILMAYDI. Uch "oʻlchov yoʻq" desa,
 * sababi aynan shundayligicha yoziladi.
 *
 * JAVOB BERMASLIK HAM JAVOB. "Oʻtkazib yuborish" maydonni
 * `undefined` qoldiradi, NOL qilmaydi: nol "pulim yoʻq" degan
 * javob, boʻshliq esa "aytmadi".
 */

import { useEffect, useRef, useState } from 'react';
import {
  aylanmaKun, SAVOLLAR, TRAP_LABEL, type Savol, type TrapKind,
} from '@selleros/shared';
import { son as bosliqliSon, yosh } from '@/lib/bazamiz';
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

/** `/api/bazamiz` javobi. `olchov: null` — hech qachon olinmagan. */
interface BazaJavobi {
  olchov: { tovar: number | null; olchandi: string | null; yoshMs: number } | null;
}

type Mavzu = 'tungi' | 'yorug';

const QISM_NOMI: Record<string, string> = {
  talab: 'Talab',
  marja: 'Marja',
  raqobat: 'Raqobat',
  kirish: 'Kirish qiyinligi',
  mavsum: 'Mavsum',
  profil: 'Sizga moslik',
};

/**
 * Suhbatda soʻraladigan uch savol — shu tartibda.
 *
 * Byudjet birinchi (dizayndagidek): u yoʻnalish roʻyxatini eng
 * koʻp oʻzgartiradi. Keyin qiziqish va tajriba — `sohalar()` ularni
 * "Sizga moslik" qismiga qoʻshadi.
 */
const SUHBAT_MAYDONLARI = ['budgetUzs', 'interest', 'experience'] as const;

const SUHBAT_SAVOLLARI: readonly Savol[] = SUHBAT_MAYDONLARI
  .map((m) => SAVOLLAR.find((s) => s.maydon === m))
  .filter((s): s is Savol => s !== undefined);

/** «Profilim» tartibi: avval suhbatdagi uchtasi, keyin qolganlari. */
const PROFIL_SAVOLLARI: readonly Savol[] = [
  ...SUHBAT_SAVOLLARI,
  ...SAVOLLAR.filter((s) => !SUHBAT_SAVOLLARI.includes(s)),
];

/** Yoʻl — yon paneldagi olti qadam. 5 va 6 hali qurilmagan. */
const QADAMLAR: ReadonlyArray<{ n: number; nom: string; tezOrada?: boolean }> = [
  { n: 1, nom: 'Tanishuv' },
  { n: 2, nom: 'Yoʻnalish' },
  { n: 3, nom: 'Tovar va miqdor' },
  { n: 4, nom: 'Tannarx' },
  { n: 5, nom: 'Xitoydan topish', tezOrada: true },
  { n: 6, nom: 'Buyurtma va kargo', tezOrada: true },
];

const QADAM_SARLAVHASI: Record<number, string> = {
  1: 'Tanishuv',
  2: 'Yoʻnalish tanlash',
  3: 'Tovar va miqdor',
  4: 'Tannarx',
};

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

  const [mavzu, setMavzu] = useState<Mavzu>('tungi');
  const [menyu, setMenyu] = useState(false);
  const [profilOchiq, setProfilOchiq] = useState(false);
  const baza = useBaza();

  const oxiri = useRef<HTMLDivElement>(null);

  /*
   * Oldingi javoblarni tiklaymiz — sessiyaga bogʻlangan (HttpOnly
   * cookie). Birorta javob bor boʻlsa suhbat savollari qayta
   * soʻralmaydi; oʻzgartirish «Profilim» da.
   */
  useEffect(() => {
    let bekor = false;
    (async () => {
      try {
        const r = await fetch('/api/profil');
        const d = (await r.json()) as { javoblar?: Javoblar | null };
        if (!bekor && d.javoblar && Object.keys(d.javoblar).length > 0) {
          setJavoblar(d.javoblar);
          setJoriy(SUHBAT_SAVOLLARI.length);
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

  /*
   * Mavzu brauzerda eslab qolinadi. Standart — tungi; saqlangan
   * qiymat oʻqib boʻlmasa ham tungi qoladi (xususiy oyna va h.k.).
   */
  useEffect(() => {
    try {
      const s = localStorage.getItem('so_mavzu');
      if (s === 'yorug' || s === 'tungi') setMavzu(s);
    } catch { /* saqlangan qiymat yoʻq — bu xato emas */ }
  }, []);

  function mavzuniTanla(m: Mavzu) {
    setMavzu(m);
    try { localStorage.setItem('so_mavzu', m); } catch { /* jim */ }
  }

  // Esc — ochiq menyu yoki panelni yopadi.
  useEffect(() => {
    function tugma(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setMenyu(false);
      setProfilOchiq(false);
    }
    window.addEventListener('keydown', tugma);
    return () => window.removeEventListener('keydown', tugma);
  }, []);

  // Yangi xabar kelganda oxiriga suramiz — aks holda javob
  // qabul qilingandek koʻrinmaydi.
  useEffect(() => {
    oxiri.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [joriy, natija, tovarlar, tanlangan, yuklanmoqda, tovarYuklanmoqda]);

  const savol: Savol | undefined = SUHBAT_SAVOLLARI[joriy];
  const qadam = tannarxTovari ? 4 : tanlangan ? 3 : natija ? 2 : 1;
  const toldirilgan = PROFIL_SAVOLLARI
    .filter((s) => javobMatni(s, javoblar[s.maydon]) !== null).length;

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
    setTannarxTovari(null);
    setEskiTiklandi(false);
  }

  /**
   * Javoblarni saqlaydi va yoʻnalishlarni soʻraydi.
   *
   * `profil` ochiq uzatiladi, holatdan oʻqilmaydi: «Profilim» dan
   * saqlanganda yangi javoblar holatga hali yetib bormagan boʻladi
   * va hisob ESKI profil bilan ketardi.
   */
  async function yonalishlarniOl(profil: Javoblar = javoblar) {
    setYuklanmoqda(true);
    setXato(null);
    setTanlangan(null);
    setTovarlar(null);
    setTannarxTovari(null);

    // Saqlash yiqilsa ham tavsiya beriladi: odam javob berdi, uni
    // texnik nosozlik tufayli kutdirish notoʻgʻri.
    setSaqlanmoqda(true);
    try {
      await fetch('/api/profil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profil }),
      });
    } catch {
      setXato('Javoblar saqlanmadi (tavsiya baribir koʻrsatiladi).');
    } finally {
      setSaqlanmoqda(false);
    }

    try {
      const r = await fetch('/api/yonalishlar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profil }),
      });
      setNatija((await r.json()) as Natija);
    } catch (q) {
      setXato(`Soʻrov yuborilmadi: ${String(q)}`);
    } finally {
      setYuklanmoqda(false);
    }
  }

  async function tovarlarniOl(y: Yonalish) {
    setTanlangan(y);
    setTovarlar(null);
    setTannarxTovari(null);
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

  /** «Profilim» saqlandi. Tavsiya koʻrsatilgan boʻlsa — qayta hisoblaymiz. */
  function profilSaqlandi(yangi: Javoblar) {
    setJavoblar(yangi);
    setProfilOchiq(false);
    if (natija) void yonalishlarniOl(yangi);
  }

  const yonPanel = (
    <>
      <div className={u.belgi}>
        <span className={u.nishon} aria-hidden="true">Z</span>
        <span className={u.nom}>ZumSavdo<span>Usta</span></span>
      </div>

      <button
        type="button"
        className={u.yangiSuhbat}
        onClick={() => { boshdan(); setMenyu(false); }}
      >
        Yangi suhbat <span aria-hidden="true">+</span>
      </button>

      <nav aria-label="Qadamlar">
        <div className={u.yorliq}>Yoʻl · 6 qadam</div>
        <ol className={u.qadamRoyxat}>
          {QADAMLAR.map((q) => (
            <li
              key={q.n}
              className={[
                u.qadamQator,
                q.tezOrada ? u.qadamTez : '',
                !q.tezOrada && q.n < qadam ? u.qadamOtildi : '',
                q.n === qadam ? u.qadamJoriy : '',
              ].join(' ')}
              aria-current={q.n === qadam ? 'step' : undefined}
            >
              <span className={u.qadamRaqam} aria-hidden="true">
                {!q.tezOrada && q.n < qadam ? '✓' : q.n}
              </span>
              <span className={u.qadamNomi}>{q.nom}</span>
              {q.tezOrada && <span className={u.tezTeg}>tez orada</span>}
            </li>
          ))}
        </ol>
      </nav>

      <button
        type="button"
        className={u.profilTugma}
        onClick={() => { setProfilOchiq(true); setMenyu(false); }}
      >
        <span>Profilim</span>
        <span className={u.profilSon}>{toldirilgan}/{PROFIL_SAVOLLARI.length}</span>
      </button>

      <div className={u.bosh} />

      <BazaKartasi baza={baza} />

      <div className={u.mavzu} role="group" aria-label="Mavzu">
        <button
          type="button"
          className={mavzu === 'yorug' ? u.mavzuFaol : ''}
          aria-pressed={mavzu === 'yorug'}
          onClick={() => mavzuniTanla('yorug')}
        >
          Yorugʻ
        </button>
        <button
          type="button"
          className={mavzu === 'tungi' ? u.mavzuFaol : ''}
          aria-pressed={mavzu === 'tungi'}
          onClick={() => mavzuniTanla('tungi')}
        >
          Tungi
        </button>
      </div>
    </>
  );

  return (
    <div className={`zs-mavzu ${u.ilova} ${menyu ? u.menyuOchiq : ''}`} data-mavzu={mavzu}>
      <aside className={u.yon} aria-label="Yon panel">{yonPanel}</aside>
      {menyu && (
        <button
          type="button"
          className={u.soya}
          aria-label="Menyuni yopish"
          onClick={() => setMenyu(false)}
        />
      )}

      <div className={u.asosiy}>
        <header className={u.tepa}>
          <div className={u.tepaChap}>
            <button
              type="button"
              className={u.burger}
              aria-label="Menyu"
              aria-expanded={menyu}
              onClick={() => setMenyu(true)}
            >
              ☰
            </button>
            <span className={u.tirik} aria-hidden="true" />
            <div className={u.sarlavhaBlok}>
              <div className={u.sarlavha}>{QADAM_SARLAVHASI[qadam]}</div>
              <div className={u.sarlavhaMeta}>
                {qadam === 1 && !eskiTiklandi && savol
                  ? `Tanishuv · ${joriy + 1} / ${SUHBAT_SAVOLLARI.length}`
                  : `${qadam}-qadam · 6 dan`}
              </div>
            </div>
          </div>
          <div className={u.tepaOng}>
            <button type="button" className={u.pill} onClick={() => setProfilOchiq(true)}>
              Profilim
            </button>
            <a className={u.pill} href="/">Chiqish</a>
          </div>
        </header>

        <div className={u.oqim}>
          <div className={u.ichi}>
            <Ai>
              Salom! Men ZumSavdo Ustasiman. Uzumda nima sotish kerakligini
              raqamlar bilan tanlab beraman.
            </Ai>
            <Ai>
              Uch savol beraman. Hech biri majburiy emas — javob
              bermasangiz, tizim taxmin qilmaydi. Qolgan savollar
              &laquo;Profilim&raquo;da.
            </Ai>

            {eskiTiklandi && (
              <Ai>
                Oldingi javoblaringiz tiklandi. Oʻzgartirmoqchi boʻlsangiz —
                &laquo;Profilim&raquo;.
              </Ai>
            )}

            {!eskiTiklandi && SUHBAT_SAVOLLARI.slice(0, joriy).map((s, i) => (
              <Berilgan key={s.raqam} tartib={i + 1} savol={s} qiymat={javoblar[s.maydon]} />
            ))}

            {savol !== undefined && !eskiTiklandi && (
              <Ai nega={savol.nega}>{joriy + 1}. {savol.matn}</Ai>
            )}

            {savol === undefined && !natija && !yuklanmoqda && !saqlanmoqda && (
              <Ai>Savollar tugadi. Yoʻnalishlarni hisoblab beraymi?</Ai>
            )}

            {(yuklanmoqda || saqlanmoqda) && (
              <Yozmoqda>{saqlanmoqda ? 'Javoblarni saqlayapman' : 'Uzum bazasi boʻyicha hisoblayapman'}</Yozmoqda>
            )}

            {xato !== null && (
              <div className={`${u.pufak} ${u.ai}`}>
                <p className={u.xato}>{xato}</p>
              </div>
            )}

            {natija && !yuklanmoqda && (
              <Yonalishlar natija={natija} tanla={tovarlarniOl} tanlangan={tanlangan} />
            )}

            {natija && !yuklanmoqda && !natija.olchov_yoq
              && toldirilgan < PROFIL_SAVOLLARI.length && (
              <ProfilEslatma
                toldirilgan={toldirilgan}
                jami={PROFIL_SAVOLLARI.length}
                och={() => setProfilOchiq(true)}
              />
            )}

            {tanlangan && (
              <Tovarlar
                yonalish={tanlangan}
                natija={tovarlar}
                yuklanmoqda={tovarYuklanmoqda}
                tannarx={setTannarxTovari}
                ochiqId={tannarxTovari?.nomzod.productId ?? null}
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
              * soʻrash maʼnosiz.
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
                yonalishlarniOl={() => void yonalishlarniOl()}
                profilniOch={() => setProfilOchiq(true)}
                boshdan={boshdan}
                matn={matn}
                setMatn={setMatn}
              />
            )}
            <p className={u.pastIzoh}>
              Tavsiyani kod beradi — raqamlar Uzum bazasidan, har tovar
              8 ta tuzoq-filtrdan oʻtadi. Qaror sizniki.
            </p>
          </div>
        </div>
      </div>

      {profilOchiq && (
        <Profilim
          javoblar={javoblar}
          qaytaHisoblaydi={natija !== null}
          yop={() => setProfilOchiq(false)}
          saqlandi={profilSaqlandi}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------ baza */

type BazaHolati = { yuklanmoqda: true } | ({ yuklanmoqda: false } & BazaJavobi);

/** Yon paneldagi "Baza" kartasi uchun oʻlchov — bir marta olinadi. */
function useBaza(): BazaHolati {
  const [h, setH] = useState<BazaHolati>({ yuklanmoqda: true });
  useEffect(() => {
    let bekor = false;
    (async () => {
      try {
        const r = await fetch('/api/bazamiz');
        const d = (await r.json()) as BazaJavobi;
        if (!bekor) setH({ yuklanmoqda: false, olchov: d.olchov ?? null });
      } catch {
        if (!bekor) setH({ yuklanmoqda: false, olchov: null });
      }
    })();
    return () => { bekor = true; };
  }, []);
  return h;
}

/**
 * "Baza" kartasi.
 *
 * Dizaynda "2.4 mln mahsulot · 4 daqiqa oldin" deb QOʻLDA yozilgan
 * edi. Bu yerda son sotuv sahifasi bilan bir xil keshdan keladi;
 * olinmagan boʻlsa — chiziqcha va "olinmadi", nol emas.
 */
function BazaKartasi({ baza }: { baza: BazaHolati }) {
  const o = baza.yuklanmoqda ? null : baza.olchov;
  return (
    <div className={`${u.shisha} ${u.baza}`}>
      <div className={u.bazaYorliq}>Baza</div>
      <div className={u.bazaSon}>
        <span className={o ? u.tirik : u.ochiqEmas} aria-hidden="true" />
        {baza.yuklanmoqda
          ? 'Yuklanmoqda…'
          : o && o.tovar !== null
            ? `${bosliqliSon(o.tovar)} tovar`
            : '— tovar'}
      </div>
      <div className={u.bazaIzoh}>
        {baza.yuklanmoqda
          ? 'Uzum'
          : o
            ? `Uzum · ${yosh(o.yoshMs)}`
            : 'Raqam hozir olinmadi'}
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

/** "Yozmoqda" — uch nuqta va nima qilinayotgani. */
function Yozmoqda({ children }: { children: React.ReactNode }) {
  return (
    <div className={u.yozmoqda} role="status">
      <span className={u.nuqtalar} aria-hidden="true"><i /><i /><i /></span>
      <span>{children}</span>
    </div>
  );
}

/** Berilgan savol va unga berilgan javob. */
function Berilgan({ tartib, savol, qiymat }: { tartib: number; savol: Savol; qiymat: unknown }) {
  const javob = javobMatni(savol, qiymat);
  return (
    <>
      <div className={`${u.pufak} ${u.ai}`}>{tartib}. {savol.matn}</div>
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
  if (s.turi === 'haYoq') return q === 'ha' || q === true ? 'Ha' : 'Yoʻq';
  if (s.turi === 'son') {
    const n = Number(q);
    if (!Number.isFinite(n)) return null;
    return s.maydon === 'budgetUzs' ? `${son(n)} soʻm` : String(n);
  }
  return variantNomi(s, String(q));
}

function variantNomi(s: Savol, qiymat: string): string {
  return s.variantlar?.find((v) => v.qiymat === qiymat)?.nom ?? qiymat;
}

/** `haYoq` variantlari — suhbatda ham, «Profilim» da ham bir xil. */
const HA_YOQ = [{ qiymat: 'ha', nom: 'Ha' }, { qiymat: "yo'q", nom: 'Yoʻq' }] as const;

/* ------------------------------------------------------ javob paneli */

function Javoblash({
  savol, javoblar, yoz, keyingi, otkaz, tugadi, natija, band,
  yonalishlarniOl, profilniOch, boshdan, matn, setMatn,
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
  profilniOch: () => void;
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
        <button type="button" className={u.chip} onClick={profilniOch} disabled={band}>
          Profilni toʻldirish
        </button>
        <button
          type="button"
          className={`${u.chip} ${u.chipYengil}`}
          onClick={boshdan}
          disabled={band}
        >
          Boshidan boshlash
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
    const variantlar = savol.turi === 'haYoq' ? HA_YOQ : (savol.variantlar ?? []);
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
   * Dizaynda kiritish maydoni doim turadi. Bu yerda faqat shu turda
   * koʻrsatiladi: yozilgani qabul qilinmaydigan maydon
   * foydalanuvchini aldardi.
   */
  const son = () => {
    const t = matn.trim();
    const n = Number(t);
    if (t === '' || !Number.isFinite(n) || n < 0) { otkaz(); return; }
    yoz(savol.maydon, n);
    keyingi();
  };

  return (
    <>
      {savol.maydon === 'budgetUzs' && (
        <div className={u.chiplar}>
          {BYUDJET_TEZKOR.map((b) => (
            <button
              key={b.qiymat}
              type="button"
              className={u.chip}
              onClick={() => { yoz(savol.maydon, b.qiymat); keyingi(); }}
            >
              {b.nom}
            </button>
          ))}
        </div>
      )}
      <div className={`${u.shisha} ${u.kiritish}`}>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          aria-label={savol.matn}
          placeholder={savol.maydon === 'budgetUzs' ? 'Yoki aniq summa: masalan 30000000 (soʻm)' : 'Masalan 10'}
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

/**
 * Byudjet uchun tezkor tugmalar (dizayndagidek).
 *
 * Har tugma ANIQ son yozadi — oraliqning pastki chegarasi. Oraliq
 * ("10–30 mln") yozilsa ball uni qaysi son deb olishini taxmin
 * qilishi kerak boʻlardi; pastki chegara esa "kamida shuncha bor"
 * degan rost javob va "byudjet yetadimi" hisobini oshirib
 * yubormaydi.
 */
const BYUDJET_TEZKOR = [
  { qiymat: 5_000_000, nom: '5 mln' },
  { qiymat: 10_000_000, nom: '10 mln' },
  { qiymat: 30_000_000, nom: '30 mln' },
  { qiymat: 70_000_000, nom: '70 mln' },
] as const;

/* ------------------------------------------------------ profilim */

/**
 * «Profilim» — hamma 12 savol bitta panelda.
 *
 * Suhbatda faqat uchtasi soʻraladi; qolganlari shu yerda. Javoblar
 * QORALAMADA tahrirlanadi va faqat "Saqlash" da yuboriladi: yarim
 * tahrirlangan profil bilan yoʻnalish qayta hisoblansa, roʻyxat
 * har bosishda sakrab turardi.
 */
function Profilim({ javoblar, qaytaHisoblaydi, yop, saqlandi }: {
  javoblar: Javoblar;
  qaytaHisoblaydi: boolean;
  yop: () => void;
  saqlandi: (j: Javoblar) => void;
}) {
  const [qoralama, setQoralama] = useState<Javoblar>(javoblar);
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  const toldirilgan = PROFIL_SAVOLLARI
    .filter((s) => javobMatni(s, qoralama[s.maydon]) !== null).length;

  function oz(maydon: string, q: unknown) {
    setQoralama((eski) => {
      const yangi = { ...eski };
      if (q === undefined) delete yangi[maydon];
      else yangi[maydon] = q;
      return yangi;
    });
  }

  async function saqla() {
    setBand(true);
    setXato(null);
    try {
      const r = await fetch('/api/profil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profil: qoralama }),
      });
      // Saqlanmagan profil "saqlandi" deb yopilmaydi.
      if (!r.ok) { setXato('Profil saqlanmadi — keyinroq qayta urinib koʻring.'); return; }
      saqlandi(qoralama);
    } catch {
      setXato('Profil yuborilmadi — tarmoq javob bermadi.');
    } finally {
      setBand(false);
    }
  }

  return (
    <div className={u.panelFon} role="presentation" onClick={yop}>
      <div
        className={u.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profil-sarlavha"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={u.panelBosh}>
          <div>
            <h2 id="profil-sarlavha" className={u.panelSarlavha}>Profilim</h2>
            <p className={u.panelMeta}>
              {toldirilgan} / {PROFIL_SAVOLLARI.length} savolga javob berilgan.
              Hech biri majburiy emas.
            </p>
          </div>
          <button type="button" className={u.yopish} aria-label="Yopish" onClick={yop}>×</button>
        </header>

        <div className={u.panelIchi}>
          {PROFIL_SAVOLLARI.map((s, i) => (
            <section key={s.maydon} className={u.profilSavol}>
              {i === 0 && <div className={u.yorliq}>Suhbatdagi savollar</div>}
              {i === SUHBAT_SAVOLLARI.length && <div className={u.yorliq}>Qoʻshimcha</div>}
              <h3 className={u.profilMatn}>{s.matn}</h3>
              <p className={u.nega}>{s.nega}</p>
              <SavolTahriri savol={s} qiymat={qoralama[s.maydon]} oz={(q) => oz(s.maydon, q)} />
            </section>
          ))}
        </div>

        <footer className={u.panelOxiri}>
          {xato !== null && <p className={u.xato}>{xato}</p>}
          <div className={u.chiplar}>
            <button
              type="button"
              className={`${u.chip} ${u.chipAsosiy}`}
              onClick={saqla}
              disabled={band}
            >
              {band ? 'Saqlanmoqda…' : qaytaHisoblaydi ? 'Saqlash va qayta hisoblash' : 'Saqlash'}
            </button>
            <button type="button" className={`${u.chip} ${u.chipYengil}`} onClick={yop} disabled={band}>
              Bekor qilish
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/**
 * Bitta savolni tahrirlash. `oz(undefined)` — javob OLIB TASHLANDI,
 * nol yoki "yoʻq" emas. Tanlangan variantni qayta bosish uni
 * bekor qiladi.
 */
function SavolTahriri({ savol, qiymat, oz }: {
  savol: Savol;
  qiymat: unknown;
  oz: (q: unknown) => void;
}) {
  if (savol.turi === 'kop') {
    const bel = Array.isArray(qiymat) ? (qiymat as string[]) : [];
    return (
      <div className={u.chiplar}>
        {savol.variantlar?.map((v) => {
          const bor = bel.includes(v.qiymat);
          return (
            <button
              key={v.qiymat}
              type="button"
              className={`${u.chip} ${u.chipKichik} ${bor ? u.chipTanlangan : ''}`}
              aria-pressed={bor}
              onClick={() => {
                const yangi = bor ? bel.filter((x) => x !== v.qiymat) : [...bel, v.qiymat];
                oz(yangi.length > 0 ? yangi : undefined);
              }}
            >
              {v.nom}
            </button>
          );
        })}
      </div>
    );
  }

  if (savol.turi === 'bitta' || savol.turi === 'haYoq') {
    const variantlar = savol.turi === 'haYoq' ? HA_YOQ : (savol.variantlar ?? []);
    // Bazadan `true`/`false` kelishi mumkin — ularni variantga moslaymiz.
    const joriy = qiymat === true ? 'ha' : qiymat === false ? "yo'q" : qiymat;
    return (
      <div className={u.chiplar}>
        {variantlar.map((v) => {
          const bor = joriy === v.qiymat;
          return (
            <button
              key={v.qiymat}
              type="button"
              className={`${u.chip} ${u.chipKichik} ${bor ? u.chipTanlangan : ''}`}
              aria-pressed={bor}
              onClick={() => oz(bor ? undefined : v.qiymat)}
            >
              {v.nom}
            </button>
          );
        })}
      </div>
    );
  }

  const matn = typeof qiymat === 'number' && Number.isFinite(qiymat) ? String(qiymat) : '';
  return (
    <div className={`${u.shisha} ${u.kiritish} ${u.kiritishKichik}`}>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        aria-label={savol.matn}
        placeholder={savol.maydon === 'budgetUzs' ? 'Masalan 30000000 (soʻm)' : 'Masalan 10'}
        value={matn}
        onChange={(e) => {
          const t = e.target.value.trim();
          const n = Number(t);
          // Boʻsh maydon — javob yoʻq, NOL emas.
          oz(t === '' || !Number.isFinite(n) || n < 0 ? undefined : n);
        }}
      />
      {savol.maydon === 'budgetUzs' && <span className={u.birlik}>soʻm</span>}
    </div>
  );
}

/**
 * Profil toʻliq emasligini AYTAMIZ — lekin nima oʻzgarishini ham.
 *
 * "Profilni toʻldiring, tavsiya aniqroq boʻladi" deyish oson, lekin
 * bugun ball profildan faqat byudjet va soha javoblarini oʻqiydi.
 * Qolganlari ballni OʻZGARTIRMAYDI va buni yashirish — va'da berib
 * bajarmaslik.
 */
function ProfilEslatma({ toldirilgan, jami, och }: {
  toldirilgan: number; jami: number; och: () => void;
}) {
  return (
    <div className={`${u.pufak} ${u.ai}`}>
      Profilingiz {toldirilgan} / {jami} toʻldirilgan. &laquo;Oila aʼzolaringiz
      nima bilan shugʻullanadi?&raquo; savoli ham &laquo;Sizga moslik&raquo;
      balliga kiradi; qolganlari keyingi qadamlar uchun.
      <div className={u.pufakTugmalar}>
        <button type="button" className={`${u.chip} ${u.chipKichik}`} onClick={och}>
          Profilimni ochish
        </button>
      </div>
    </div>
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
      <div className={`${u.pufak} ${u.ai}`}>
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
        . Mana eng mos yoʻnalishlar — har birining balli nimadan yigʻilgani bilan:
      </div>

      {natija.kesh_eskirgan && (
        <p className={u.ogohlik}>
          Raqamlar {natija.yoshi_soat} soat oldin hisoblangan. Tavsiya
          baribir koʻrsatiladi, lekin yangilanish kechikkan.
        </p>
      )}

      {royxat.length === 0 && (
        <p className={u.ogohlik}>
          Turkumlar tekshirildi, lekin bittasi ham baholanmadi — maʼlumot
          yetarli emas.
        </p>
      )}

      {royxat.length > 0 && (
        <div className={u.kartalar}>
          <div className={u.yorliq}>
            Yoʻnalishlar · {natija.nomzod_soni ?? '—'} turkumdan {royxat.length} tasi
          </div>
          {royxat.map((y) => (
            <YonalishKartasi
              key={y.categoryId}
              y={y}
              tanla={tanla}
              tanlangan={tanlangan?.categoryId === y.categoryId}
            />
          ))}
        </div>
      )}

      {natija.bolishTaklifi && (
        <p className={u.ogohlik}>{natija.bolishTaklifi.sabab}</p>
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
    <article className={`${u.shisha} ${u.karta} ${tanlangan ? u.kartaTanlangan : ''}`}>
      <header className={u.kartaBoshi}>
        <div className={u.kartaNomBlok}>
          <h3 className={u.kartaNomi}>{y.name}</h3>
          {y.yetadi === null
            ? <span className={`${u.teg} ${u.tegNeytral}`}>byudjet — nomaʼlum</span>
            : y.yetadi
              ? <span className={`${u.teg} ${u.tegYaxshi}`}>byudjetga yetadi</span>
              : <span className={`${u.teg} ${u.tegOgoh}`}>byudjet yetmaydi</span>}
        </div>
        <div className={u.metrika}>
          <span>ball</span>
          <b>{y.ball.value === null ? '—' : Math.round(y.ball.value)}</b>
        </div>
      </header>

      <div className={u.statlar}>
        {/*
          * "Haftalik xaridor" — "30 kunlik sotuv" EMAS. Bu maydon
          * perepisdagi haftalik xaridorlar yigʻindisi (`qadamlar.ts`
          * dagi izoh). Uni dona deb yozsak, kimdir undan partiya
          * hajmini hisoblardi.
          */}
        <Stat nom="Haftalik xaridor" q={son(y.dalil.talabOlchovi)} izoh="turkum boʻyicha jami" />
        <Stat nom="Sotuvchilar" q={son(y.dalil.sotuvchiSoni)} />
        <Stat nom="Top-3 ulushi" q={foiz(y.dalil.top3Ulush)} />
        <Stat nom="Optimal kirish" q={mln(y.optimalKirishSom)} izoh={y.optimalKirishSom === null ? undefined : 'soʻm'} />
      </div>

      <BallQismlari qismlar={y.ball.breakdown} />

      <footer className={u.kartaOxiri}>
        <span className={u.kichikIzoh}>
          Ball 0–100 · {y.ball.breakdown.filter((q) => q.used).length} qism hisobga olindi
        </span>
        <button
          type="button"
          className={`${u.tugma} ${tanlangan ? u.tugmaAsosiy : ''}`}
          onClick={() => tanla(y)}
          aria-pressed={tanlangan}
        >
          {tanlangan ? 'Tanlangan ✓' : 'Tovarlarni koʻrsat'}
        </button>
      </footer>
    </article>
  );
}

/**
 * Ball nimadan yigʻilgani — dizayndagi "oʻsish grafigi" oʻrnida.
 *
 * Grafik uchun 12 oylik qator kerak edi, bizda u yoʻq. Toʻqilgan
 * grafik chizgandan koʻra, bor narsani — olti qismni — koʻrsatamiz.
 * Hisobga olinmagan qism YASHIRILMAYDI: "maʼlumot yoʻq" deb turadi,
 * aks holda ball toʻliq oʻlchovdek koʻrinardi.
 */
function BallQismlari({ qismlar }: { qismlar: Qism[] }) {
  return (
    <div className={u.qismlar}>
      {qismlar.map((q) => {
        const bor = q.applicable && q.used && q.score !== null;
        return (
          <div key={q.part} className={u.qism}>
            <div className={u.qismNomi}>
              <span>{QISM_NOMI[q.part] ?? q.part}</span>
              <span className={u.mono}>
                {bor ? Math.round(q.score as number) : '—'}
              </span>
            </div>
            <div className={`${u.qismBar} ${bor ? '' : u.qismBosh}`}>
              {bor && <i style={{ width: `${Math.max(0, Math.min(100, q.score as number))}%` }} />}
            </div>
            {!bor && (
              <div className={u.qismHolat}>
                {!q.applicable ? 'bu bosqichda hisoblanmaydi' : 'maʼlumot yoʻq'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ nom, q, izoh }: { nom: string; q: string; izoh?: string | undefined }) {
  return (
    <div className={u.stat}>
      <div className={u.statNomi}>{nom}</div>
      <div className={u.statQiymat}>{q}</div>
      {izoh !== undefined && <div className={u.statIzoh}>{izoh}</div>}
    </div>
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
 */
function Tovarlar({
  yonalish, natija, yuklanmoqda, tannarx, ochiqId,
}: {
  yonalish: Yonalish;
  natija: TovarNatija | null;
  yuklanmoqda: boolean;
  tannarx: (t: Tovar) => void;
  ochiqId: number | null;
}) {
  if (yuklanmoqda) {
    return <Yozmoqda>{yonalish.name} boʻyicha tovarlarni yigʻyapman</Yozmoqda>;
  }

  if (natija?.olchov_yoq) {
    return (
      <div className={`${u.pufak} ${u.ai}`}>
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
      <div className={`${u.pufak} ${u.men}`}>{yonalish.name}</div>
      <div className={`${u.pufak} ${u.ai}`}>
        {yonalish.name} — {royxat.length} ta tovar
        {natija.chiqarildi?.length
          ? `, ${natija.chiqarildi.length} tasi tuzoq tufayli chiqarildi`
          : ''}
        . Sotuv soni yonida u qayerdan olingani yozilgan.
      </div>

      <div className={u.kartalar}>
        <div className={u.yorliq}>Tovarlar · {royxat.length} ta</div>
        <UmumiySabab royxat={royxat} />
        {!xilmaXilBaholanmadi(royxat) && <BaholanmaganLar royxat={royxat} />}

        {royxat.map((t) => (
          <TovarKartasi
            key={t.nomzod.productId}
            t={t}
            sababniKorsat={xilmaXilSabab(royxat)}
            baholanmaganniKorsat={xilmaXilBaholanmadi(royxat)}
            tannarx={tannarx}
            ochiq={ochiqId === t.nomzod.productId}
          />
        ))}

        {natija.chiqarildi?.length ? (
          <details className={`${u.shisha} ${u.tafsilot}`}>
            <summary>Roʻyxatdan chiqarilgan {natija.chiqarildi.length} ta tovar — nega</summary>
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
    </>
  );
}

/**
 * Bir xil sabab har kartada takrorlanmasin — bitta boʻlsa bir marta,
 * tepada. Turlicha boʻlsa har kartada.
 */
function UmumiySabab({ royxat }: { royxat: Tovar[] }) {
  const kodlar = new Set(
    royxat.map((t) => t.miqdorSababKodi).filter((k): k is NonNullable<typeof k> => k !== null),
  );
  if (kodlar.size !== 1) return null;

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
  { t, sababniKorsat, baholanmaganniKorsat, tannarx, ochiq }:
  {
    t: Tovar; sababniKorsat: boolean; baholanmaganniKorsat: boolean;
    tannarx: (t: Tovar) => void; ochiq: boolean;
  },
) {
  const n = t.nomzod;
  const manba = n.sotuvManbasi === 'olchandi'
    ? `oʻlchandi · ${son(n.olchanganKun)} kun`
    : n.sotuvManbasi === 'taxmin' ? 'Uzumdan taxmin' : undefined;

  return (
    <article className={`${u.shisha} ${u.karta} ${ochiq ? u.kartaTanlangan : ''}`}>
      <header className={u.kartaBoshi}>
        <div className={u.kartaNomBlok}>
          <h3 className={u.kartaNomi}>{n.title}</h3>
          <p className={u.kartaMeta}>
            {n.shopName ?? '—'} · {n.reyting === null ? '—' : `${n.reyting}★`} · {son(n.sharhSoni)} sharh
          </p>
        </div>
        <div className={u.metrika}>
          <span>tavsiya miqdor</span>
          <b>{t.miqdor ? `${bosliqliSon(t.miqdor.dona)} dona` : '—'}</b>
        </div>
      </header>

      <div className={u.statlar}>
        <Stat nom="Narx" q={son(n.narxSom)} izoh={n.narxSom === null ? undefined : 'soʻm'} />
        <Stat nom="Sotuv · 30 kun" q={son(n.soldUnits30d)} izoh={manba} />
        <Stat nom="Qoldiq" q={son(n.qoldiq)} izoh={n.qoldiq === null ? undefined : 'dona'} />
      </div>

      {t.miqdor ? (
        <p className={u.kichikIzoh}>{t.miqdor.hisob}</p>
      ) : sababniKorsat ? (
        <p className={u.ogohlik}>{t.miqdorSababi}</p>
      ) : null}

      {/* Tuzoq YASHIRILMAYDI — nomi va sababi bilan (QOIDALAR.md, 4). */}
      {t.bayroqlar.length > 0 && (
        <div className={u.bayroqlar}>
          {t.bayroqlar.map((b, i) => (
            <div
              key={i}
              className={`${u.bayroq} ${b.severity === 'block' ? u.bayroqYomon : b.severity === 'warn' ? u.bayroqOgoh : u.bayroqIzoh}`}
            >
              <b>{tuzoqNomi(b.kind)}</b>
              <span>{b.reason}</span>
            </div>
          ))}
        </div>
      )}

      {baholanmaganniKorsat && t.baholanmadi.length > 0 && (
        <BaholanmaganLar royxat={[t]} />
      )}

      <footer className={u.kartaOxiri}>
        <span className={u.kichikIzoh}>
          {t.bayroqlar.length > 0
            ? `${t.bayroqlar.length} ta tuzoq belgisi — sababi yuqorida`
            : t.baholanmadi.length > 0
              ? 'Tuzoq topilmadi · baʼzi filtrlar baholanmadi'
              : 'Tuzoq-filtrlardan oʻtdi'}
        </span>
        <button
          type="button"
          className={`${u.tugma} ${ochiq ? u.tugmaAsosiy : ''}`}
          onClick={() => tannarx(t)}
          aria-pressed={ochiq}
        >
          {ochiq ? 'Tannarx ochiq ✓' : 'Tannarxni hisoblash'}
        </button>
      </footer>
    </article>
  );
}

/** Tuzoqning oʻzbekcha nomi. Notanish tur — mashina nomi, yashirilmaydi. */
function tuzoqNomi(kind: string): string {
  return (TRAP_LABEL as Record<string, string>)[kind] ?? kind;
}

/**
 * Baholanmagan filtrlar — bir marta, yopiq holda.
 *
 * Yashirilmaydi — qaysi filtr ishlamagani koʻrinib turishi kerak,
 * aks holda tovar "hamma tekshiruvdan oʻtgan" boʻlib koʻrinardi.
 * Nomi endi oʻzbekcha (`TRAP_LABEL`); maydon nomlari esa biz uchun,
 * shuning uchun yopiq.
 */
function BaholanmaganLar({ royxat }: { royxat: Tovar[] }) {
  const nomlar = [...new Set(royxat.flatMap((t) => t.baholanmadi.map((b) => b.filtr)))];
  if (nomlar.length === 0) return null;
  const namuna = royxat.find((t) => t.baholanmadi.length > 0);
  return (
    <details className={`${u.shisha} ${u.tafsilot}`}>
      <summary>
        {nomlar.length} ta filtr baholanmadi — maʼlumot yetishmadi
      </summary>
      <table className={u.jadval}>
        <thead><tr><th>Filtr</th><th>Nima yetishmadi</th></tr></thead>
        <tbody>
          {namuna?.baholanmadi.map((b) => (
            <tr key={b.filtr}>
              <td>{tuzoqNomi(b.filtr as TrapKind)}</td>
              <td className={u.yoq}>{b.missing.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function xilmaXilBaholanmadi(royxat: Tovar[]): boolean {
  const s = new Set(royxat.map((t) => t.baholanmadi.map((b) => b.filtr).sort().join('|')));
  return s.size > 1;
}

/* ------------------------------------------------------ fikr */

/**
 * "Bu roʻyxat sizga mantiqlimi?"
 *
 * B2 darvozasi: "begona 3 sotuvchi Ustadan MUSTAQIL oʻtib tovar
 * roʻyxatiga yetadi va «mantiqli» deydi". Ovoz chip bosilishi bilan
 * yoziladi; "Hozir emas" — hech narsa yozilmaydi (sukut "mantiqli"
 * degani emas).
 */
function Fikr({ turkum }: { turkum: number }) {
  const [tanlov, setTanlov] = useState<boolean | null>(null);
  const [izoh, setIzoh] = useState('');
  const [band, setBand] = useState(false);
  const [yashirildi, setYashirildi] = useState(false);
  const [izohYuborildi, setIzohYuborildi] = useState(false);
  const [xato, setXato] = useState<string | null>(null);
  const langar = useRef<HTMLDivElement>(null);

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
      setXato('Fikr yuborilmadi — tarmoq javob bermadi.');
      return false;
    } finally {
      setBand(false);
    }
  }

  async function izohniYubor() {
    const t = izoh.trim();
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
        <div className={`${u.pufak} ${u.ai}`}>
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
          <div className={`${u.shisha} ${u.kiritish}`}>
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
 * Ikki turdagi raqam ANIQ ajratilgan: oʻlchandi (narx, ogʻirlik),
 * Uzum (komissiya, logistika) va siz aytdingiz (Xitoy narxi, kargo,
 * bojxona). Uchalasini bir xil koʻrsatsak, natija "hisoblab
 * chiqarilgan haqiqat" boʻlib koʻrinardi.
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
      <div className={`${u.pufak} ${u.men}`}>Tannarxni hisoblash · {tovar.title}</div>
      <Ai nega="Bu raqamlar SIZNING xaridingiz haqida. Biz ularni oʻlchay olmaymiz — kiritishingiz kerak.">
        {tovar.title} — tannarxni hisoblaymiz.
      </Ai>

      {ochiq && (
        <div className={`${u.shisha} ${u.karta}`}>
          <div className={u.yorliq}>Tannarx · 4-qadam</div>
          <div className={u.maydonlar}>
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
          </div>
          <p className={u.kichikIzoh}>
            Kurs, kargo va bojxona bir marta kiritiladi — keyingi
            tovarlarda saqlanib qoladi.
          </p>
        </div>
      )}

      {xato !== null && (
        <div className={`${u.pufak} ${u.ai}`}>
          <p className={u.xato}>{xato}</p>
        </div>
      )}

      {natija && <TannarxNatija n={natija} manba={komissiyaManbasi} nom={tovar.title} />}

      {natija && <TezOrada />}

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
 * Natija — har qator MANBASI bilan. Eng muhim ustun raqam emas,
 * "qayerdan" ustuni.
 */
function TannarxNatija({ n, manba, nom }: { n: TannarxJavobi; manba: string | null; nom: string }) {
  const t = n.tannarx;
  const qatorlar: Array<[string, number | null, string]> = [
    ['Uzumdagi sotuv narxi', t.sotuvNarxi, 'oʻlchandi'],
    ['1688 narxi (soʻmda)', t.xitoyNarxi, 'siz kiritdingiz'],
    ['Kargo (Xitoydan omborgacha)', t.kargo,
      n.kargoAsosi === 'hajm' ? 'hajm boʻyicha' : n.kargoAsosi === 'ogirlik' ? 'ogʻirlik boʻyicha' : '—'],
    ['Bojxona + QQS', t.bojxonaQqs, 'siz kiritdingiz'],
    ['Uzum komissiyasi', t.komissiya, manba ? 'Uzum jadvali' : 'siz kiritdingiz'],
    ['Uzum logistikasi (xaridorgacha)', t.uzumLogistika, 'Uzum tarifi'],
    // "hisoblandi" — "oʻlchandi" EMAS: saqlash haqi kelajakdagi
    // sotuv tezligiga bogʻliq.
    ['Ombor saqlash haqi', t.saqlash, 'hisoblandi'],
  ];

  const zarar = n.sofFoydaSom !== null && n.sofFoydaSom < 0;

  return (
    <div className={`${u.shisha} ${u.karta}`}>
      <header className={u.kartaBoshi}>
        <div className={u.kartaNomBlok}>
          <div className={u.yorliq}>Tannarx · 1 dona</div>
          <h3 className={u.kartaNomi}>{nom}</h3>
        </div>
        {n.marjaFoizi !== null && (
          <span className={`${u.teg} ${zarar ? u.tegYomon : u.tegYaxshi}`}>
            marja {n.marjaFoizi.toFixed(1)}%
          </span>
        )}
      </header>

      <table className={u.jadval}>
        <thead>
          <tr><th>Nima</th><th className={u.son}>Soʻm</th><th>Qayerdan</th></tr>
        </thead>
        <tbody>
          {qatorlar.map(([nomi, q, qayerdan]) => (
            <tr key={nomi}>
              <td>{nomi}</td>
              <td className={u.son}>
                {q === null ? <span className={u.yoq}>—</span> : son(q)}
              </td>
              {/* Raqam yoʻq boʻlsa MANBA ham yozilmaydi. */}
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
      ) : zarar ? (
        /* ZARAR SOʻZ BILAN AYTILADI — minusni tez oʻqishda sezmaslik mumkin. */
        <p className={u.xato}>
          <strong>
            Har donada ZARAR: {son(Math.abs(n.sofFoydaSom))} soʻm
          </strong>
        </p>
      ) : (
        <div className={u.jami}>
          <span>Sof foyda · 1 dona</span>
          <b>{son(n.sofFoydaSom)} soʻm</b>
        </div>
      )}

      {n.demping?.bayroq && (
        <div className={`${u.bayroq} ${u.bayroqYomon}`}>
          <b>{tuzoqNomi('dumping')}</b>
          <span>{n.demping.bayroq.reason}</span>
        </div>
      )}
    </div>
  );
}

/**
 * 5-qadam hali yoʻq — va buni aytamiz.
 *
 * Dizaynda bu yerda "148 lot topildi" va "Savatni tasdiqlash"
 * turardi. Xitoy qidiruvi hozir boʻsh roʻyxat qaytaradi (provayder
 * ulanmagan), toʻlov esa oʻchiq. Tugma yoʻq: bosiladigan, lekin
 * hech narsa qilmaydigan tugma — vaʼda.
 */
function TezOrada() {
  return (
    <div className={u.tezOrada}>
      <div className={u.kartaNomBlok}>
        <h3 className={u.kartaNomi}>Xitoydan zavod topish</h3>
        <span className={`${u.teg} ${u.tegNeytral}`}>tez orada</span>
      </div>
      <p className={u.kichikIzoh}>
        5-qadam: 1688 va Taobao dan lot qidirish kengaytma orqali
        ulanmoqda. Hozircha Xitoy narxini oʻzingiz kiritasiz; buyurtma
        va kargo (6-qadam) ham keyinroq.
      </p>
    </div>
  );
}

/**
 * Matndan son. Boʻsh matn NOL emas — `null`.
 *
 * Nomi `son` emas: bu faylda allaqachon `son(number)` bor va u
 * teskari ish qiladi (sonni matnga).
 */
function kiritilganSon(s: string): number | null {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/* ------------------------------------------------------ yordamchilar */

/**
 * Oʻlchanmagan raqam NOL emas — chiziqcha.
 *
 * Ajratgich — oddiy boʻshliq (`1 509 827`), `toLocaleString` EMAS:
 * brauzerlar `uz-UZ` ni turlicha biladi va Chromium `30,000,000`
 * chiqarardi — oʻzbek oʻquvchi uni "oʻttiz butun" deb oʻqiydi.
 */
function son(n: number | null): string {
  return n === null ? '—' : bosliqliSon(Math.round(n));
}

/** Foiz. Oʻlchanmagan boʻlsa chiziqcha. */
function foiz(n: number | null): string {
  return n === null ? '—' : `${String(Number(n.toFixed(1))).replace('.', ',')}%`;
}

/**
 * Katta summa qisqa: `14 000 000` → `14 mln`.
 *
 * Bir xona kasr bilan (`14,5 mln`) — "14 mln" deb yaxlitlash
 * byudjet yetadimi degan savolga notoʻgʻri javob berishi mumkin.
 */
function mln(n: number | null): string {
  if (n === null) return '—';
  if (Math.abs(n) < 1_000_000) return bosliqliSon(Math.round(n));
  const q = n / 1_000_000;
  return `${Number.isInteger(q) ? q : q.toFixed(1).replace('.', ',')} mln`;
}

/**
 * Sabab TURLARI xilma-xilmi — unda har kartada koʻrsatiladi.
 * Guruhlash KOD boʻyicha, matn boʻyicha emas.
 */
function xilmaXilSabab(royxat: Tovar[]): boolean {
  const s = new Set(royxat.map((t) => t.miqdorSababKodi).filter(Boolean));
  return s.size > 1;
}
