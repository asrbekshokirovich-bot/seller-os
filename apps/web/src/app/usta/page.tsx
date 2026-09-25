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
 * toʻqqiztasi webda soʻralmaydi (2026-09-25): «Profilim» da savol
 * yoʻq, u hisob, obuna va sozlamalar uchun. Uchtasi tasodifiy emas: ball
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
 * IKKI TIL (2026-09-25). Har matn `tr(uz, ru)` bilan, yonma-yon.
 * Til «Profilim» da tanlanadi. Backend yozgan matnlar (tuzoq sababi,
 * miqdor hisobi) hozircha oʻzbekcha — `lib/til.ts` dagi izohga qarang.
 *
 * JAVOB BERMASLIK HAM JAVOB. "Oʻtkazib yuborish" maydonni
 * `undefined` qoldiradi, NOL qilmaydi: nol "pulim yoʻq" degan
 * javob, boʻshliq esa "aytmadi".
 */

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  aylanmaKun, REJA_QADAMI, SAVOLLAR, TARIF_NARXI, TRAP_LABEL,
  type Reja, type Savol, type TrapKind,
} from '@selleros/shared';
import { son as bosliqliSon, yosh } from '@/lib/bazamiz';
import {
  saqlanganTil, tarjima, tilniQoy, tilniSaqla, type Til, type Tr,
} from '@/lib/til';
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

const QISM_NOMI: Record<string, readonly [string, string]> = {
  talab: ['Talab', 'Спрос'],
  marja: ['Marja', 'Маржа'],
  raqobat: ['Raqobat', 'Конкуренция'],
  kirish: ['Kirish qiyinligi', 'Сложность входа'],
  mavsum: ['Mavsum', 'Сезон'],
  profil: ['Sizga moslik', 'Подходит вам'],
};

/** Tuzoqlarning ruscha nomi. Oʻzbekchasi — `TRAP_LABEL` (shared). */
const TUZOQ_RU: Record<TrapKind, string> = {
  closed_brand: 'Закрытый бренд',
  seasonal: 'Сезонный товар',
  dumping: 'Демпинг',
  fake_sales: 'Накрутка продаж',
  certification: 'Сертификат/маркировка',
  monopoly: 'Монопольная категория',
  heavy: 'Тяжёлый товар',
  hype: 'Краткий тренд',
};

/**
 * Suhbatdagi uch savolning ruscha matni. Savolning oʻzi (maydon,
 * turi, variant QIYMATLARI) `@selleros/shared` da qoladi — bu yerda
 * faqat koʻrinadigan matn.
 */
const SAVOL_RU: Partial<Record<string, { matn: string; nega: string }>> = {
  budgetUzs: {
    matn: 'Сколько денег вы можете выделить на старт?',
    nega: 'От этой суммы зависят направление и количество товара. Не знаете — оставьте пустым, не пишите наугад.',
  },
  interest: {
    matn: 'В какой сфере хотите продавать?',
    nega: 'Интерес важен в долгую: с товаром, который не нравится, быстро устаёшь.',
  },
  experience: {
    matn: 'В каких сферах вы работали?',
    nega: 'Сферы, где у вас есть опыт, стоят выше в рекомендации. Отсутствие опыта балл НЕ снижает.',
  },
};

const SOHA_RU: Record<string, string> = {
  avto: 'Авто и мототехника',
  kiyim: 'Одежда и обувь',
  bolalar: 'Детские товары',
  elektronika: 'Электроника',
  maishiy: 'Бытовая техника и кухня',
  qurilish: 'Стройка и инструменты',
  kosmetika: 'Косметика и парфюмерия',
  sport: 'Спорт и туризм',
  dala: 'Сад и огород',
};

/** Savolning tanlangan tildagi nusxasi. Qiymatlar oʻzgarmaydi — faqat matn. */
function savolTilida(s: Savol, til: Til): Savol {
  if (til === 'uz') return s;
  const ru = SAVOL_RU[s.maydon];
  return {
    ...s,
    matn: ru?.matn ?? s.matn,
    nega: ru?.nega ?? s.nega,
    ...(s.variantlar
      ? { variantlar: s.variantlar.map((v) => ({ ...v, nom: SOHA_RU[v.qiymat] ?? v.nom })) }
      : {}),
  };
}

/** Joriy til — sahifadagi har komponent shundan oʻqiydi. */
const TilKonteksti = createContext<Til>('uz');

function useTr(): Tr {
  return tarjima(useContext(TilKonteksti));
}

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

/** Yoʻl — yon paneldagi olti qadam. 5 va 6 hali qurilmagan. */
const QADAMLAR: ReadonlyArray<{ n: number; nom: string; ru: string; tezOrada?: boolean }> = [
  { n: 1, nom: 'Tanishuv', ru: 'Знакомство' },
  { n: 2, nom: 'Yoʻnalish', ru: 'Направление' },
  { n: 3, nom: 'Tovar va miqdor', ru: 'Товар и количество' },
  { n: 4, nom: 'Tannarx', ru: 'Себестоимость' },
  { n: 5, nom: 'Xitoydan topish', ru: 'Поиск в Китае', tezOrada: true },
  { n: 6, nom: 'Buyurtma va kargo', ru: 'Заказ и карго', tezOrada: true },
];

const QADAM_SARLAVHASI: Record<number, readonly [string, string]> = {
  1: ['Tanishuv', 'Знакомство'],
  2: ['Yoʻnalish tanlash', 'Выбор направления'],
  3: ['Tovar va miqdor', 'Товар и количество'],
  4: ['Tannarx', 'Себестоимость'],
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
  const [til, setTil] = useState<Til>('uz');
  const tr = tarjima(til);
  const [menyu, setMenyu] = useState(false);
  const [profilOchiq, setProfilOchiq] = useState(false);
  const baza = useBaza();

  const oxiri = useRef<HTMLDivElement>(null);

  /*
   * Oldingi javoblarni tiklaymiz — sessiyaga bogʻlangan (HttpOnly
   * cookie). Birorta javob bor boʻlsa suhbat savollari qayta
   * soʻralmaydi; oʻzgartirish — «Boshidan boshlash».
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
    const t = saqlanganTil();
    if (t) { setTil(t); tilniQoy(t); }
  }, []);

  function mavzuniTanla(m: Mavzu) {
    setMavzu(m);
    try { localStorage.setItem('so_mavzu', m); } catch { /* jim */ }
  }

  function tilniTanla(t: Til) {
    setTil(t);
    tilniSaqla(t);
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

  const savollar = SUHBAT_SAVOLLARI.map((q) => savolTilida(q, til));
  const savol: Savol | undefined = savollar[joriy];
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
    setTannarxTovari(null);
    setEskiTiklandi(false);
  }

  /** Javoblarni saqlaydi va yoʻnalishlarni soʻraydi. */
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
      setXato(tr('Javoblar saqlanmadi (tavsiya baribir koʻrsatiladi).', 'Ответы не сохранились (рекомендация всё равно будет показана).'));
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
      setXato(`${tr('Soʻrov yuborilmadi', 'Запрос не отправлен')}: ${String(q)}`);
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
      setTovarlar({ olchov_yoq: true, sabab: `${tr('Soʻrov yuborilmadi', 'Запрос не отправлен')}: ${String(q)}` });
    } finally {
      setTovarYuklanmoqda(false);
    }
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
        {tr('Yangi suhbat', 'Новый чат')} <span aria-hidden="true">+</span>
      </button>

      <nav aria-label={tr('Qadamlar', 'Шаги')}>
        <div className={u.yorliq}>{tr('Yoʻl · 6 qadam', 'Путь · 6 шагов')}</div>
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
              <span className={u.qadamNomi}>{tr(q.nom, q.ru)}</span>
              {q.tezOrada && <span className={u.tezTeg}>{tr('tez orada', 'скоро')}</span>}
            </li>
          ))}
        </ol>
      </nav>

      <button
        type="button"
        className={u.profilTugma}
        onClick={() => { setProfilOchiq(true); setMenyu(false); }}
      >
        <span>{tr('Profilim', 'Мой профиль')}</span>
        <span className={u.profilSon}>{tr('Bepul', 'Бесплатно')}</span>
      </button>

      <div className={u.bosh} />

      <BazaKartasi baza={baza} />
    </>
  );

  return (
    <TilKonteksti.Provider value={til}>
    <div className={`zs-mavzu ${u.ilova} ${menyu ? u.menyuOchiq : ''}`} data-mavzu={mavzu}>
      <aside className={u.yon} aria-label={tr('Yon panel', 'Боковая панель')}>{yonPanel}</aside>
      {menyu && (
        <button
          type="button"
          className={u.soya}
          aria-label={tr('Menyuni yopish', 'Закрыть меню')}
          onClick={() => setMenyu(false)}
        />
      )}

      <div className={u.asosiy}>
        <header className={u.tepa}>
          <div className={u.tepaChap}>
            <button
              type="button"
              className={u.burger}
              aria-label={tr('Menyu', 'Меню')}
              aria-expanded={menyu}
              onClick={() => setMenyu(true)}
            >
              ☰
            </button>
            <span className={u.tirik} aria-hidden="true" />
            <div className={u.sarlavhaBlok}>
              <div className={u.sarlavha}>
                {tr(QADAM_SARLAVHASI[qadam]?.[0] ?? '', QADAM_SARLAVHASI[qadam]?.[1] ?? '')}
              </div>
              <div className={u.sarlavhaMeta}>
                {qadam === 1 && !eskiTiklandi && savol
                  ? `${tr('Tanishuv', 'Знакомство')} · ${joriy + 1} / ${SUHBAT_SAVOLLARI.length}`
                  : tr(`${qadam}-qadam · 6 dan`, `Шаг ${qadam} из 6`)}
              </div>
            </div>
          </div>
          <div className={u.tepaOng}>
            <button type="button" className={u.pill} onClick={() => setProfilOchiq(true)}>
              {tr('Profilim', 'Мой профиль')}
            </button>
            <a className={u.pill} href="/">{tr('Chiqish', 'Выйти')}</a>
          </div>
        </header>

        <div className={u.oqim}>
          <div className={u.ichi}>
            <Ai>
              {tr(
                'Salom! Men ZumSavdo Ustasiman. Uzumda nima sotish kerakligini raqamlar bilan tanlab beraman.',
                'Здравствуйте! Я Мастер ZumSavdo. Помогу выбрать, что продавать на Uzum, — на основе цифр.',
              )}
            </Ai>
            <Ai>
              {tr(
                'Uch savol beraman. Hech biri majburiy emas — javob bermasangiz, tizim taxmin qilmaydi.',
                'Задам три вопроса. Ни один не обязателен — если не ответите, система не будет угадывать.',
              )}
            </Ai>

            {eskiTiklandi && (
              <Ai>
                {tr(
                  'Oldingi javoblaringiz tiklandi. Oʻzgartirmoqchi boʻlsangiz — «Boshidan boshlash».',
                  'Ваши прежние ответы восстановлены. Чтобы изменить — «Начать заново».',
                )}
              </Ai>
            )}

            {!eskiTiklandi && savollar.slice(0, joriy).map((s, i) => (
              <Berilgan key={s.raqam} tartib={i + 1} savol={s} qiymat={javoblar[s.maydon]} />
            ))}

            {savol !== undefined && !eskiTiklandi && (
              <Ai nega={savol.nega}>{joriy + 1}. {savol.matn}</Ai>
            )}

            {savol === undefined && !natija && !yuklanmoqda && !saqlanmoqda && (
              <Ai>{tr('Savollar tugadi. Yoʻnalishlarni hisoblab beraymi?', 'Вопросы закончились. Рассчитать направления?')}</Ai>
            )}

            {(yuklanmoqda || saqlanmoqda) && (
              <Yozmoqda>
                {saqlanmoqda
                  ? tr('Javoblarni saqlayapman', 'Сохраняю ответы')
                  : tr('Uzum bazasi boʻyicha hisoblayapman', 'Считаю по базе Uzum')}
              </Yozmoqda>
            )}

            {xato !== null && (
              <div className={`${u.pufak} ${u.ai}`}>
                <p className={u.xato}>{xato}</p>
              </div>
            )}

            {natija && !yuklanmoqda && (
              <Yonalishlar natija={natija} tanla={tovarlarniOl} tanlangan={tanlangan} />
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
              <p className={u.holat}>{tr('Yuklanmoqda…', 'Загрузка…')}</p>
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
                boshdan={boshdan}
                matn={matn}
                setMatn={setMatn}
              />
            )}
            <p className={u.pastIzoh}>
              {tr(
                'Tavsiyani kod beradi — raqamlar Uzum bazasidan, har tovar 8 ta tuzoq-filtrdan oʻtadi. Qaror sizniki.',
                'Рекомендацию даёт код — цифры из базы Uzum, каждый товар проходит 8 фильтров-ловушек. Решение за вами.',
              )}
            </p>
          </div>
        </div>
      </div>

      {profilOchiq && (
        <Profilim
          mavzu={mavzu}
          mavzuniTanla={mavzuniTanla}
          til={til}
          tilniTanla={tilniTanla}
          boshdan={boshdan}
          yop={() => setProfilOchiq(false)}
        />
      )}
    </div>
    </TilKonteksti.Provider>
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
  const til = useContext(TilKonteksti);
  const tr = tarjima(til);
  const o = baza.yuklanmoqda ? null : baza.olchov;
  return (
    <div className={`${u.shisha} ${u.baza}`}>
      <div className={u.bazaYorliq}>{tr('Baza', 'База')}</div>
      <div className={u.bazaSon}>
        <span className={o ? u.tirik : u.ochiqEmas} aria-hidden="true" />
        {baza.yuklanmoqda
          ? tr('Yuklanmoqda…', 'Загрузка…')
          : o && o.tovar !== null
            ? `${bosliqliSon(o.tovar)} ${tr('tovar', 'товаров')}`
            : `— ${tr('tovar', 'товаров')}`}
      </div>
      <div className={u.bazaIzoh}>
        {baza.yuklanmoqda
          ? 'Uzum'
          : o
            ? `Uzum · ${yosh(o.yoshMs, til)}`
            : tr('Raqam hozir olinmadi', 'Цифра сейчас не получена')}
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
  const tr = useTr();
  const javob = javobMatni(savol, qiymat, tr);
  return (
    <>
      <div className={`${u.pufak} ${u.ai}`}>{tartib}. {savol.matn}</div>
      <div className={`${u.pufak} ${javob === null ? u.otkazdi : u.men}`}>
        {javob ?? tr('Oʻtkazib yuborildi', 'Пропущено')}
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
function javobMatni(s: Savol, q: unknown, tr: Tr): string | null {
  if (q === undefined || q === null || q === '') return null;
  if (Array.isArray(q)) {
    if (q.length === 0) return null;
    return q.map((x) => variantNomi(s, String(x))).join(', ');
  }
  if (s.turi === 'haYoq') return q === 'ha' || q === true ? tr('Ha', 'Да') : tr('Yoʻq', 'Нет');
  if (s.turi === 'son') {
    const n = Number(q);
    if (!Number.isFinite(n)) return null;
    return s.maydon === 'budgetUzs' ? `${son(n)} ${tr('soʻm', 'сум')}` : String(n);
  }
  return variantNomi(s, String(q));
}

function variantNomi(s: Savol, qiymat: string): string {
  return s.variantlar?.find((v) => v.qiymat === qiymat)?.nom ?? qiymat;
}

/** `haYoq` variantlari. `nom` — oʻzbekcha; ruschasi `ru`. */
const HA_YOQ = [
  { qiymat: 'ha', nom: 'Ha', ru: 'Да' },
  { qiymat: "yo'q", nom: 'Yoʻq', ru: 'Нет' },
] as const;

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
  const tr = useTr();
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
            {band ? tr('Hisoblanmoqda…', 'Считаю…') : tr('Yoʻnalishlarni koʻrsat', 'Показать направления')}
          </button>
        )}
        <button
          type="button"
          className={`${u.chip} ${u.chipYengil}`}
          onClick={boshdan}
          disabled={band}
        >
          {tr('Boshidan boshlash', 'Начать заново')}
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
            {tr('Tayyor', 'Готово')}
          </button>
        ) : (
          <button type="button" className={`${u.chip} ${u.chipYengil}`} onClick={otkaz}>
            {tr('Oʻtkazib yuborish', 'Пропустить')}
          </button>
        )}
      </div>
    );
  }

  if (savol.turi === 'bitta' || savol.turi === 'haYoq') {
    const variantlar = savol.turi === 'haYoq'
      ? HA_YOQ.map((v) => ({ qiymat: v.qiymat, nom: tr(v.nom, v.ru) }))
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
          {tr('Oʻtkazib yuborish', 'Пропустить')}
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
              {tr(b.nom, b.nom.replace('mln', 'млн'))}
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
          placeholder={savol.maydon === 'budgetUzs'
            ? tr('Yoki aniq summa: masalan 30000000 (soʻm)', 'Или точная сумма: например 30000000 (сум)')
            : tr('Masalan 10', 'Например 10')}
          value={matn}
          onChange={(e) => setMatn(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') son(); }}
        />
        <button type="button" className={u.yubor} onClick={son}>{tr('Yuborish', 'Отправить')}</button>
      </div>
      <div className={u.chiplar}>
        <button type="button" className={`${u.chip} ${u.chipYengil}`} onClick={otkaz}>
          {tr('Oʻtkazib yuborish', 'Пропустить')}
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
 * «Profilim» — hisob, obuna va sozlamalar. SAVOL YOʻQ.
 *
 * Nazoratchi qarori (2026-09-25): tanishuv faqat suhbatdagi uch
 * savol; «Profilim» da savol turmaydi. Javobni oʻzgartirish —
 * «Boshidan boshlash» orqali, suhbatning oʻzida.
 *
 * Halollik (QOIDALAR.md, 4-boʻlim): hisob (login) va toʻlov hali
 * ulanmagan. Shuning uchun joriy reja — `bepul`, pullik rejalar
 * narxi bilan, lekin TUGMASIZ "tez orada" deb turadi. Bosiladigan,
 * lekin hech narsa qilmaydigan "Obuna boʻlish" — vaʼda.
 *
 * Narx va qadam chegarasi shu yerda YOZILMAYDI — `@selleros/shared`
 * dan oʻqiladi (`TARIF_NARXI`, `REJA_QADAMI`), backend bilan bitta
 * manba.
 *
 * Mavzu va til FAQAT shu yerda tanlanadi (nazoratchi, 2026-09-25):
 * yon paneldagi va bosh sahifadagi mavzu tugmalari olib tashlandi.
 */
function Profilim({ mavzu, mavzuniTanla, til, tilniTanla, boshdan, yop }: {
  mavzu: Mavzu;
  mavzuniTanla: (m: Mavzu) => void;
  til: Til;
  tilniTanla: (t: Til) => void;
  boshdan: () => void;
  yop: () => void;
}) {
  const tr = tarjima(til);
  const rejalar: ReadonlyArray<{ reja: Reja; nom: string }> = [
    { reja: 'bepul', nom: tr('Bepul', 'Бесплатный') },
    { reja: 'pro', nom: 'Pro' },
    { reja: 'biznes', nom: tr('Biznes', 'Бизнес') },
  ];

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
            <h2 id="profil-sarlavha" className={u.panelSarlavha}>{tr('Profilim', 'Мой профиль')}</h2>
            <p className={u.panelMeta}>{tr('Hisob, obuna va sozlamalar', 'Аккаунт, подписка и настройки')}</p>
          </div>
          <button type="button" className={u.yopish} aria-label={tr('Yopish', 'Закрыть')} onClick={yop}>×</button>
        </header>

        <div className={u.panelIchi}>
          <section className={u.profilBolim}>
            <div className={u.yorliq}>{tr('Hisob', 'Аккаунт')}</div>
            <div className={u.profilQator}>
              <div>
                <div className={u.profilNom}>{tr('Mehmon', 'Гость')}</div>
                <p className={u.kichikIzoh}>
                  {tr(
                    'Javoblaringiz shu brauzerga bogʻlangan — boshqa qurilmada koʻrinmaydi.',
                    'Ваши ответы привязаны к этому браузеру — на другом устройстве их не видно.',
                  )}
                </p>
              </div>
              <span className={`${u.teg} ${u.tegNeytral}`}>{tr('kirish tez orada', 'вход скоро')}</span>
            </div>
          </section>

          <section className={u.profilBolim}>
            <div className={u.yorliq}>{tr('Obuna', 'Подписка')}</div>
            <div className={u.rejalar}>
              {rejalar.map((r) => {
                const narx = TARIF_NARXI[r.reja] ?? null;
                const joriy = r.reja === 'bepul';
                const qadam = REJA_QADAMI[r.reja];
                return (
                  <div key={r.reja} className={`${u.reja} ${joriy ? u.rejaJoriy : ''}`}>
                    <div className={u.rejaBosh}>
                      <span className={u.profilNom}>{r.nom}</span>
                      {joriy
                        ? <span className={u.teg}>{tr('joriy', 'текущий')}</span>
                        : <span className={`${u.teg} ${u.tegNeytral}`}>{tr('tez orada', 'скоро')}</span>}
                    </div>
                    <div className={u.rejaNarx}>
                      {`${narx === null ? '0' : son(narx)} ${tr('soʻm', 'сум')}`}
                      <span> / {tr('oy', 'мес')}</span>
                    </div>
                    <p className={u.kichikIzoh}>
                      {qadam >= QADAMLAR.length
                        ? tr(`Hamma ${QADAMLAR.length} qadam`, `Все ${QADAMLAR.length} шагов`)
                        : tr(`1–${qadam}-qadam`, `Шаги 1–${qadam}`)}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className={u.kichikIzoh}>
              {tr(
                'Toʻlov (Payme, Click) hali ulanmagan — pullik rejaga hozircha oʻtib boʻlmaydi.',
                'Оплата (Payme, Click) ещё не подключена — перейти на платный тариф пока нельзя.',
              )}
            </p>
          </section>

          <section className={u.profilBolim}>
            <div className={u.yorliq}>{tr('Sozlamalar', 'Настройки')}</div>
            <div className={u.profilQator}>
              <span className={u.profilNom}>{tr('Mavzu', 'Тема')}</span>
              <div className={u.mavzu} role="group" aria-label={tr('Mavzu', 'Тема')}>
                {(['yorug', 'tungi'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={mavzu === m ? u.mavzuFaol : ''}
                    aria-pressed={mavzu === m}
                    onClick={() => mavzuniTanla(m)}
                  >
                    {m === 'yorug' ? tr('Yorugʻ', 'Светлая') : tr('Tungi', 'Тёмная')}
                  </button>
                ))}
              </div>
            </div>
            <div className={u.profilQator}>
              <span className={u.profilNom}>{tr('Til', 'Язык')}</span>
              {/*
                * Til nomi HAR DOIM oʻz tilida yoziladi ("Русский", "Oʻzbekcha"):
                * tilni bilmagan odam ham oʻz tilini taniy olsin.
                */}
              <div className={u.mavzu} role="group" aria-label={tr('Til', 'Язык')}>
                {([['uz', 'Oʻzbekcha'], ['ru', 'Русский']] as const).map(([t, nom]) => (
                  <button
                    key={t}
                    type="button"
                    lang={t}
                    className={til === t ? u.mavzuFaol : ''}
                    aria-pressed={til === t}
                    onClick={() => tilniTanla(t)}
                  >
                    {nom}
                  </button>
                ))}
              </div>
            </div>
            <div className={u.profilQator}>
              <div>
                <div className={u.profilNom}>{tr('Suhbat javoblari', 'Ответы в чате')}</div>
                <p className={u.kichikIzoh}>
                  {tr(
                    'Byudjet, qiziqish va tajribani qaytadan berish.',
                    'Заново указать бюджет, интерес и опыт.',
                  )}
                </p>
              </div>
              <button
                type="button"
                className={`${u.chip} ${u.chipKichik}`}
                onClick={() => { boshdan(); yop(); }}
              >
                {tr('Boshidan boshlash', 'Начать заново')}
              </button>
            </div>
          </section>
        </div>
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
  const tr = useTr();
  if (natija.olchov_yoq) {
    return (
      <div className={`${u.pufak} ${u.ai}`}>
        <p className={u.xato}>
          {tr('Hozircha koʻrsatadigan narsa yoʻq. Sabab', 'Пока нечего показать. Причина')}:{' '}
          {natija.sabab ?? tr('nomaʼlum', 'неизвестна')}.
        </p>
        <span className={u.nega}>
          {tr(
            'Bu «sizga mos yoʻnalish yoʻq» degani EMAS. Maʼlumot yetib kelmadi — biroz kutib qayta urinib koʻring.',
            'Это НЕ значит «подходящих направлений нет». Данные не пришли — подождите и попробуйте снова.',
          )}
        </span>
      </div>
    );
  }

  const royxat = natija.royxat ?? [];

  return (
    <>
      <div className={`${u.pufak} ${u.ai}`}>
        {tr(`${natija.nomzod_soni} turkum tekshirildi`, `Проверено категорий: ${natija.nomzod_soni}`)}
        {typeof natija.baholanmadi === 'number' && natija.baholanmadi > 0
          ? tr(
            `, ${natija.baholanmadi} tasini maʼlumot yetishmagani uchun baholab boʻlmadi`,
            `, ${natija.baholanmadi} не удалось оценить — не хватило данных`,
          )
          : ''}
        {tr(
          '. Mana eng mos yoʻnalishlar — har birining balli nimadan yigʻilgani bilan:',
          '. Вот самые подходящие направления — с разбором, из чего сложился балл:',
        )}
      </div>

      {natija.kesh_eskirgan && (
        <p className={u.ogohlik}>
          {tr(
            `Raqamlar ${natija.yoshi_soat} soat oldin hisoblangan. Tavsiya baribir koʻrsatiladi, lekin yangilanish kechikkan.`,
            `Цифры рассчитаны ${natija.yoshi_soat} ч. назад. Рекомендация показана, но обновление задерживается.`,
          )}
        </p>
      )}

      {royxat.length === 0 && (
        <p className={u.ogohlik}>
          {tr(
            'Turkumlar tekshirildi, lekin bittasi ham baholanmadi — maʼlumot yetarli emas.',
            'Категории проверены, но ни одна не оценена — данных недостаточно.',
          )}
        </p>
      )}

      {royxat.length > 0 && (
        <div className={u.kartalar}>
          <div className={u.yorliq}>
            {tr(
              `Yoʻnalishlar · ${natija.nomzod_soni ?? '—'} turkumdan ${royxat.length} tasi`,
              `Направления · ${royxat.length} из ${natija.nomzod_soni ?? '—'} категорий`,
            )}
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
  const tr = useTr();
  return (
    <article className={`${u.shisha} ${u.karta} ${tanlangan ? u.kartaTanlangan : ''}`}>
      <header className={u.kartaBoshi}>
        <div className={u.kartaNomBlok}>
          <h3 className={u.kartaNomi}>{y.name}</h3>
          {y.yetadi === null
            ? <span className={`${u.teg} ${u.tegNeytral}`}>{tr('byudjet — nomaʼlum', 'бюджет — неизвестен')}</span>
            : y.yetadi
              ? <span className={`${u.teg} ${u.tegYaxshi}`}>{tr('byudjetga yetadi', 'бюджета хватает')}</span>
              : <span className={`${u.teg} ${u.tegOgoh}`}>{tr('byudjet yetmaydi', 'бюджета не хватает')}</span>}
        </div>
        <div className={u.metrika}>
          <span>{tr('ball', 'балл')}</span>
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
        <Stat
          nom={tr('Haftalik xaridor', 'Покупателей в неделю')}
          q={son(y.dalil.talabOlchovi)}
          izoh={tr('turkum boʻyicha jami', 'всего по категории')}
        />
        <Stat nom={tr('Sotuvchilar', 'Продавцы')} q={son(y.dalil.sotuvchiSoni)} />
        <Stat nom={tr('Top-3 ulushi', 'Доля топ-3')} q={foiz(y.dalil.top3Ulush)} />
        <Stat
          nom={tr('Optimal kirish', 'Оптимальный вход')}
          q={mln(y.optimalKirishSom, tr('mln', 'млн'))}
          izoh={y.optimalKirishSom === null ? undefined : tr('soʻm', 'сум')}
        />
      </div>

      <BallQismlari qismlar={y.ball.breakdown} />

      <footer className={u.kartaOxiri}>
        <span className={u.kichikIzoh}>
          {tr(
            `Ball 0–100 · ${y.ball.breakdown.filter((q) => q.used).length} qism hisobga olindi`,
            `Балл 0–100 · учтено частей: ${y.ball.breakdown.filter((q) => q.used).length}`,
          )}
        </span>
        <button
          type="button"
          className={`${u.tugma} ${tanlangan ? u.tugmaAsosiy : ''}`}
          onClick={() => tanla(y)}
          aria-pressed={tanlangan}
        >
          {tanlangan ? tr('Tanlangan ✓', 'Выбрано ✓') : tr('Tovarlarni koʻrsat', 'Показать товары')}
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
  const tr = useTr();
  return (
    <div className={u.qismlar}>
      {qismlar.map((q) => {
        const bor = q.applicable && q.used && q.score !== null;
        const nom = QISM_NOMI[q.part];
        return (
          <div key={q.part} className={u.qism}>
            <div className={u.qismNomi}>
              <span>{nom ? tr(nom[0], nom[1]) : q.part}</span>
              <span className={u.mono}>
                {bor ? Math.round(q.score as number) : '—'}
              </span>
            </div>
            <div className={`${u.qismBar} ${bor ? '' : u.qismBosh}`}>
              {bor && <i style={{ width: `${Math.max(0, Math.min(100, q.score as number))}%` }} />}
            </div>
            {!bor && (
              <div className={u.qismHolat}>
                {!q.applicable
                  ? tr('bu bosqichda hisoblanmaydi', 'на этом шаге не считается')
                  : tr('maʼlumot yoʻq', 'нет данных')}
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
  const tr = useTr();
  if (yuklanmoqda) {
    return (
      <Yozmoqda>
        {tr(`${yonalish.name} boʻyicha tovarlarni yigʻyapman`, `Собираю товары: ${yonalish.name}`)}
      </Yozmoqda>
    );
  }

  if (natija?.olchov_yoq) {
    return (
      <div className={`${u.pufak} ${u.ai}`}>
        <p className={u.xato}>
          {tr('Tovar roʻyxati koʻrsatilmadi. Sabab', 'Список товаров не показан. Причина')}:{' '}
          {natija.sabab ?? tr('nomaʼlum', 'неизвестна')}.
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
        {yonalish.name} — {tr(`${royxat.length} ta tovar`, `товаров: ${royxat.length}`)}
        {natija.chiqarildi?.length
          ? tr(
            `, ${natija.chiqarildi.length} tasi tuzoq tufayli chiqarildi`,
            `, ${natija.chiqarildi.length} исключено из-за ловушек`,
          )
          : ''}
        {tr(
          '. Sotuv soni yonida u qayerdan olingani yozilgan.',
          '. Рядом с продажами указано, откуда взята цифра.',
        )}
      </div>

      <div className={u.kartalar}>
        <div className={u.yorliq}>{tr(`Tovarlar · ${royxat.length} ta`, `Товары · ${royxat.length}`)}</div>
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
            <summary>
              {tr(
                `Roʻyxatdan chiqarilgan ${natija.chiqarildi.length} ta tovar — nega`,
                `Исключённые товары (${natija.chiqarildi.length}) — почему`,
              )}
            </summary>
            <table className={u.jadval}>
              <thead>
                <tr><th>{tr('Tovar', 'Товар')}</th><th>{tr('Nega chiqarildi', 'Почему исключён')}</th></tr>
              </thead>
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
  const tr = useTr();
  const kodlar = new Set(
    royxat.map((t) => t.miqdorSababKodi).filter((k): k is NonNullable<typeof k> => k !== null),
  );
  if (kodlar.size !== 1) return null;

  const namuna = royxat.find((t) => t.miqdorSababKodi !== null);
  const nechta = royxat.filter((t) => t.miqdorSababKodi !== null).length;
  if (!namuna) return null;

  return (
    <p className={u.ogohlik}>
      <strong>
        {tr(`${nechta} ta tovarda miqdor hisoblanmadi.`, `Количество не рассчитано для товаров: ${nechta}.`)}
      </strong>{' '}
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
  const til = useContext(TilKonteksti);
  const tr = tarjima(til);
  const n = t.nomzod;
  const manba = n.sotuvManbasi === 'olchandi'
    ? tr(`oʻlchandi · ${son(n.olchanganKun)} kun`, `измерено · ${son(n.olchanganKun)} дн.`)
    : n.sotuvManbasi === 'taxmin' ? tr('Uzumdan taxmin', 'оценка Uzum') : undefined;

  return (
    <article className={`${u.shisha} ${u.karta} ${ochiq ? u.kartaTanlangan : ''}`}>
      <header className={u.kartaBoshi}>
        <div className={u.kartaNomBlok}>
          <h3 className={u.kartaNomi}>{n.title}</h3>
          <p className={u.kartaMeta}>
            {n.shopName ?? '—'} · {n.reyting === null ? '—' : `${n.reyting}★`} ·{' '}
            {tr(`${son(n.sharhSoni)} sharh`, `отзывов: ${son(n.sharhSoni)}`)}
          </p>
        </div>
        <div className={u.metrika}>
          <span>{tr('tavsiya miqdor', 'рекоменд. количество')}</span>
          <b>{t.miqdor ? `${bosliqliSon(t.miqdor.dona)} ${tr('dona', 'шт.')}` : '—'}</b>
        </div>
      </header>

      <div className={u.statlar}>
        <Stat nom={tr('Narx', 'Цена')} q={son(n.narxSom)} izoh={n.narxSom === null ? undefined : tr('soʻm', 'сум')} />
        <Stat nom={tr('Sotuv · 30 kun', 'Продажи · 30 дн.')} q={son(n.soldUnits30d)} izoh={manba} />
        <Stat nom={tr('Qoldiq', 'Остаток')} q={son(n.qoldiq)} izoh={n.qoldiq === null ? undefined : tr('dona', 'шт.')} />
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
              <b>{tuzoqNomi(b.kind, til)}</b>
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
            ? tr(
              `${t.bayroqlar.length} ta tuzoq belgisi — sababi yuqorida`,
              `Признаков ловушки: ${t.bayroqlar.length} — причина выше`,
            )
            : t.baholanmadi.length > 0
              ? tr('Tuzoq topilmadi · baʼzi filtrlar baholanmadi', 'Ловушек нет · часть фильтров не оценена')
              : tr('Tuzoq-filtrlardan oʻtdi', 'Прошёл фильтры-ловушки')}
        </span>
        <button
          type="button"
          className={`${u.tugma} ${ochiq ? u.tugmaAsosiy : ''}`}
          onClick={() => tannarx(t)}
          aria-pressed={ochiq}
        >
          {ochiq ? tr('Tannarx ochiq ✓', 'Себестоимость открыта ✓') : tr('Tannarxni hisoblash', 'Рассчитать себестоимость')}
        </button>
      </footer>
    </article>
  );
}

/** Tuzoq nomi joriy tilda. Notanish tur — mashina nomi, yashirilmaydi. */
function tuzoqNomi(kind: string, til: Til): string {
  const lugat: Record<string, string> = til === 'ru' ? TUZOQ_RU : TRAP_LABEL;
  return lugat[kind] ?? kind;
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
  const til = useContext(TilKonteksti);
  const tr = tarjima(til);
  const nomlar = [...new Set(royxat.flatMap((t) => t.baholanmadi.map((b) => b.filtr)))];
  if (nomlar.length === 0) return null;
  const namuna = royxat.find((t) => t.baholanmadi.length > 0);
  return (
    <details className={`${u.shisha} ${u.tafsilot}`}>
      <summary>
        {tr(
          `${nomlar.length} ta filtr baholanmadi — maʼlumot yetishmadi`,
          `Не оценено фильтров: ${nomlar.length} — не хватило данных`,
        )}
      </summary>
      <table className={u.jadval}>
        <thead>
          <tr><th>{tr('Filtr', 'Фильтр')}</th><th>{tr('Nima yetishmadi', 'Чего не хватило')}</th></tr>
        </thead>
        <tbody>
          {namuna?.baholanmadi.map((b) => (
            <tr key={b.filtr}>
              <td>{tuzoqNomi(b.filtr as TrapKind, til)}</td>
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
  const tr = useTr();
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
      if (!r.ok) setXato(tr('Fikr saqlanmadi — keyinroq qayta urinib koʻring.', 'Отзыв не сохранился — попробуйте позже.'));
      return r.ok;
    } catch {
      setXato(tr('Fikr yuborilmadi — tarmoq javob bermadi.', 'Отзыв не отправлен — сеть не ответила.'));
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
        <Ai nega={tr(
          'Javobingiz Ustani tuzatish uchun ishlatiladi. Roʻyxat oʻzgarmaydi.',
          'Ваш ответ используется, чтобы улучшить Мастера. Список не изменится.',
        )}>
          {tr('Bu roʻyxat sizga mantiqlimi?', 'Этот список кажется вам логичным?')}
        </Ai>
        <div className={u.chiplar}>
          <button
            type="button"
            className={u.chip}
            disabled={band}
            onClick={async () => { setTanlov(true); await yubor(true, null); }}
          >
            {tr('Ha, mantiqli', 'Да, логично')}
          </button>
          <button
            type="button"
            className={u.chip}
            disabled={band}
            onClick={async () => { setTanlov(false); await yubor(false, null); }}
          >
            {tr('Yoʻq, mantiqsiz', 'Нет, нелогично')}
          </button>
          <button
            type="button"
            className={`${u.chip} ${u.chipYengil}`}
            disabled={band}
            onClick={() => setYashirildi(true)}
          >
            {tr('Hozir emas', 'Не сейчас')}
          </button>
        </div>
        <div ref={langar} />
      </>
    );
  }

  return (
    <>
      <div className={`${u.pufak} ${u.men}`}>
        {tanlov ? tr('Ha, mantiqli', 'Да, логично') : tr('Yoʻq, mantiqsiz', 'Нет, нелогично')}
      </div>

      {xato !== null && (
        <div className={`${u.pufak} ${u.ai}`}>
          <p className={u.xato}>{xato}</p>
        </div>
      )}

      {izohYuborildi ? (
        <Ai>{tr('Rahmat — yozib oldim.', 'Спасибо — записал.')}</Ai>
      ) : (
        <>
          <Ai>
            {tanlov
              ? tr('Rahmat. Qaysi joyi foydali boʻldi? (majburiy emas)', 'Спасибо. Что оказалось полезным? (необязательно)')
              : tr('Rahmat. Nimasi notoʻgʻri koʻrindi? (majburiy emas)', 'Спасибо. Что показалось неверным? (необязательно)')}
          </Ai>
          <div className={`${u.shisha} ${u.kiritish}`}>
            <input
              type="text"
              maxLength={2000}
              aria-label={tr('Fikringiz', 'Ваш отзыв')}
              placeholder={tr('Masalan: miqdor juda katta koʻrindi', 'Например: количество показалось слишком большим')}
              value={izoh}
              disabled={band}
              onChange={(e) => setIzoh(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') izohniYubor(); }}
            />
            <button type="button" className={u.yubor} disabled={band} onClick={izohniYubor}>
              {tr('Yuborish', 'Отправить')}
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
  const tr = useTr();
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
      setXato(`${tr('Soʻrov yuborilmadi', 'Запрос не отправлен')}: ${String(q)}`);
    } finally {
      setBand(false);
    }
  }

  return (
    <>
      <div className={`${u.pufak} ${u.men}`}>
        {tr('Tannarxni hisoblash', 'Расчёт себестоимости')} · {tovar.title}
      </div>
      <Ai nega={tr(
        'Bu raqamlar SIZNING xaridingiz haqida. Biz ularni oʻlchay olmaymiz — kiritishingiz kerak.',
        'Эти цифры — о ВАШЕЙ закупке. Мы не можем их измерить — их нужно ввести.',
      )}>
        {tovar.title} — {tr('tannarxni hisoblaymiz.', 'считаем себестоимость.')}
      </Ai>

      {ochiq && (
        <div className={`${u.shisha} ${u.karta}`}>
          <div className={u.yorliq}>{tr('Tannarx · 4-qadam', 'Себестоимость · шаг 4')}</div>
          <div className={u.maydonlar}>
            <Maydon nom={tr('1688 dagi narx (yuan)', 'Цена на 1688 (юань)')} qiymat={xitoy} oz={setXitoy}
                    joy={tr('Masalan 20', 'Например 20')} />
            <Maydon nom={tr('Yuan kursi (soʻm)', 'Курс юаня (сум)')} qiymat={soz.kursSomPerYuan}
                    oz={(q) => sozla('kursSomPerYuan', q)} joy={tr('Masalan 1750', 'Например 1750')} />
            <Maydon nom={tr('Kargo — soʻm/kg', 'Карго — сум/кг')} qiymat={soz.kargoSomPerKg}
                    oz={(q) => sozla('kargoSomPerKg', q)} joy={tr('Masalan 30000', 'Например 30000')} />
            <Maydon nom={tr('Kargo — soʻm/m³', 'Карго — сум/м³')} qiymat={soz.kargoSomPerM3}
                    oz={(q) => sozla('kargoSomPerM3', q)} joy={tr('Masalan 4000000', 'Например 4000000')} />
            <Maydon nom={tr('Bojxona boji (%)', 'Таможенная пошлина (%)')} qiymat={soz.bojFoizi}
                    oz={(q) => sozla('bojFoizi', q)} joy={tr('Masalan 10', 'Например 10')} />
            <Maydon nom={tr('QQS (%)', 'НДС (%)')} qiymat={soz.qqsFoizi}
                    oz={(q) => sozla('qqsFoizi', q)} joy={tr('Masalan 12', 'Например 12')} />
          </div>
          <p className={u.kichikIzoh}>
            {tr(
              'Kurs, kargo va bojxona bir marta kiritiladi — keyingi tovarlarda saqlanib qoladi.',
              'Курс, карго и таможня вводятся один раз — для следующих товаров они сохранятся.',
            )}
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
            {tr('Raqamlarni oʻzgartirish', 'Изменить цифры')}
          </button>
        )}
        {ochiq && (
          <button type="button" className={`${u.chip} ${u.chipAsosiy}`}
                  onClick={hisobla} disabled={band}>
            {band ? tr('Hisoblanmoqda…', 'Считаю…') : tr('Hisoblash', 'Рассчитать')}
          </button>
        )}
        <button type="button" className={`${u.chip} ${u.chipYengil}`} onClick={yop}>
          {tr('Yopish', 'Закрыть')}
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
  const til = useContext(TilKonteksti);
  const tr = tarjima(til);
  const t = n.tannarx;
  const siz = tr('siz kiritdingiz', 'ввели вы');
  const qatorlar: Array<[string, number | null, string]> = [
    [tr('Uzumdagi sotuv narxi', 'Цена продажи на Uzum'), t.sotuvNarxi, tr('oʻlchandi', 'измерено')],
    [tr('1688 narxi (soʻmda)', 'Цена 1688 (в сумах)'), t.xitoyNarxi, siz],
    [tr('Kargo (Xitoydan omborgacha)', 'Карго (из Китая до склада)'), t.kargo,
      n.kargoAsosi === 'hajm'
        ? tr('hajm boʻyicha', 'по объёму')
        : n.kargoAsosi === 'ogirlik' ? tr('ogʻirlik boʻyicha', 'по весу') : '—'],
    [tr('Bojxona + QQS', 'Таможня + НДС'), t.bojxonaQqs, siz],
    [tr('Uzum komissiyasi', 'Комиссия Uzum'), t.komissiya, manba ? tr('Uzum jadvali', 'таблица Uzum') : siz],
    [tr('Uzum logistikasi (xaridorgacha)', 'Логистика Uzum (до покупателя)'), t.uzumLogistika, tr('Uzum tarifi', 'тариф Uzum')],
    // "hisoblandi" — "oʻlchandi" EMAS: saqlash haqi kelajakdagi
    // sotuv tezligiga bogʻliq.
    [tr('Ombor saqlash haqi', 'Плата за хранение'), t.saqlash, tr('hisoblandi', 'рассчитано')],
  ];

  const zarar = n.sofFoydaSom !== null && n.sofFoydaSom < 0;

  return (
    <div className={`${u.shisha} ${u.karta}`}>
      <header className={u.kartaBoshi}>
        <div className={u.kartaNomBlok}>
          <div className={u.yorliq}>{tr('Tannarx · 1 dona', 'Себестоимость · 1 шт.')}</div>
          <h3 className={u.kartaNomi}>{nom}</h3>
        </div>
        {n.marjaFoizi !== null && (
          <span className={`${u.teg} ${zarar ? u.tegYomon : u.tegYaxshi}`}>
            {tr('marja', 'маржа')} {n.marjaFoizi.toFixed(1)}%
          </span>
        )}
      </header>

      <table className={u.jadval}>
        <thead>
          <tr>
            <th>{tr('Nima', 'Что')}</th>
            <th className={u.son}>{tr('Soʻm', 'Сум')}</th>
            <th>{tr('Qayerdan', 'Источник')}</th>
          </tr>
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
          {tr('Hisob toʻliq emas. Yetishmayapti', 'Расчёт неполный. Не хватает')}: {n.yetishmaydi.join(', ')}.{' '}
          {tr(
            'Nol koʻrsatilmaydi — u «tekin» degan javob boʻlardi.',
            'Ноль не показываем — это означало бы «бесплатно».',
          )}
        </p>
      ) : zarar ? (
        /* ZARAR SOʻZ BILAN AYTILADI — minusni tez oʻqishda sezmaslik mumkin. */
        <p className={u.xato}>
          <strong>
            {tr('Har donada ZARAR', 'УБЫТОК с каждой штуки')}: {son(Math.abs(n.sofFoydaSom))} {tr('soʻm', 'сум')}
          </strong>
        </p>
      ) : (
        <div className={u.jami}>
          <span>{tr('Sof foyda · 1 dona', 'Чистая прибыль · 1 шт.')}</span>
          <b>{son(n.sofFoydaSom)} {tr('soʻm', 'сум')}</b>
        </div>
      )}

      {n.demping?.bayroq && (
        <div className={`${u.bayroq} ${u.bayroqYomon}`}>
          <b>{tuzoqNomi('dumping', til)}</b>
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
  const tr = useTr();
  return (
    <div className={u.tezOrada}>
      <div className={u.kartaNomBlok}>
        <h3 className={u.kartaNomi}>{tr('Xitoydan zavod topish', 'Поиск фабрики в Китае')}</h3>
        <span className={`${u.teg} ${u.tegNeytral}`}>{tr('tez orada', 'скоро')}</span>
      </div>
      <p className={u.kichikIzoh}>
        {tr(
          '5-qadam: 1688 va Taobao dan lot qidirish kengaytma orqali ulanmoqda. Hozircha Xitoy narxini oʻzingiz kiritasiz; buyurtma va kargo (6-qadam) ham keyinroq.',
          'Шаг 5: поиск лотов на 1688 и Taobao подключается через расширение. Пока цену в Китае вводите сами; заказ и карго (шаг 6) — тоже позже.',
        )}
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
function mln(n: number | null, birlik: string): string {
  if (n === null) return '—';
  if (Math.abs(n) < 1_000_000) return bosliqliSon(Math.round(n));
  const q = n / 1_000_000;
  return `${Number.isInteger(q) ? q : q.toFixed(1).replace('.', ',')} ${birlik}`;
}

/**
 * Sabab TURLARI xilma-xilmi — unda har kartada koʻrsatiladi.
 * Guruhlash KOD boʻyicha, matn boʻyicha emas.
 */
function xilmaXilSabab(royxat: Tovar[]): boolean {
  const s = new Set(royxat.map((t) => t.miqdorSababKodi).filter(Boolean));
  return s.size > 1;
}
