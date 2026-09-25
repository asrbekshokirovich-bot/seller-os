'use client';

/**
 * Bosh sahifa — `ZUMSavdo K Journey Tinted.dc.html` (nazoratchi,
 * 2026-09-24). Tungi mavzu standart.
 *
 * DIZAYNDAN ATAYLAB CHETGA CHIQILGAN JOYLAR:
 *
 *   1. Sarlavha. Dizaynda "tizim har bekatni oʻzi bosib oʻtadi, siz
 *      faqat tasdiqlaysiz" deyilgan. Bugun besh bekatdan bittasi
 *      (nisha) va tannarx hisobi ishlaydi. Qolgan toʻrttasi — "tez
 *      orada" (nazoratchi qarori). Sarlavha shuni aytadi.
 *   2. Bekat kartalarida toʻqilgan raqamlar ("Yiwu Hongyu · 4.8",
 *      "$893", "18 kun") yoʻq — oʻrnida bekat NIMA qilishi va holati.
 *   3. Pul oqimi kartasi — MISOL, va shunday deb yozilgan. Raqamlari
 *      Ustadagi 4-qadam formulasi tuzilmasida: dizayndagi hisobda
 *      Uzum logistikasi va saqlash tushib qolgan edi, foyda oshib
 *      koʻrinardi.
 *   4. "Tizimga kirish" emas, "Ustaga oʻtish": hisob (login) yoʻq,
 *      tugma shunchaki Ustani ochadi.
 *   5. Jonli son: kuzatilayotgan tovarlar. U bazadan keladi, yoshi
 *      aytiladi, olinmasa — chiziqcha (QOIDALAR.md, 4-boʻlim).
 *
 * TIL. Bu sahifada til tugmasi yoʻq — til Ustada, «Profilim» da
 * tanlanadi (`so_til`), bu yerda faqat oʻqiladi. Holat jumlasi
 * serverda ikkala tilda tayyorlanadi: raqam brauzerda sakramasin.
 */

import { useEffect, useRef, useState } from 'react';
import { son } from '@/lib/bazamiz';
import { saqlanganTil, tarjima, tilniQoy, type Til } from '@/lib/til';
import b from './bosh.module.css';

type Mavzu = 'tungi' | 'yorug';

interface Bekat {
  joy: string;
  /** Joy nomi ruschada farq qilsa. Yiwu, Uzum, Chrome — oʻzgarmaydi. */
  joyRu?: string;
  nom: string;
  matn: string;
  /** Ruscha: `[nom, matn, meta?]`. */
  ru: readonly [string, string, (readonly [string, string])?];
  ishlaydi: boolean;
  /** Bekatda haqiqatan bor narsa. Yoʻq boʻlsa — koʻrsatilmaydi. */
  meta?: readonly [string, string];
}

const BEKATLAR: readonly Bekat[] = [
  {
    joy: 'Uzum',
    nom: 'Nisha tanlash',
    matn: 'Yoʻnalish va tovar: 6 qismli ball, 8 ta tuzoq-filtr va tavsiya miqdor.',
    ru: [
      'Выбор ниши',
      'Направление и товар: балл из 6 частей, 8 фильтров-ловушек и рекомендуемое количество.',
      ['фильтры-ловушки', '8'],
    ],
    ishlaydi: true,
    meta: ['tuzoq-filtr', '8 ta'],
  },
  {
    joy: 'Yiwu',
    nom: 'Zavod topish',
    matn: '1688 va Taobao lotlarini solishtirish. Hozircha Xitoy narxini oʻzingiz kiritasiz.',
    ru: [
      'Поиск фабрики',
      'Сравнение лотов 1688 и Taobao. Пока цену в Китае вводите сами.',
      ['расчёт себестоимости', 'работает'],
    ],
    ishlaydi: false,
    meta: ['tannarx hisobi', 'ishlaydi'],
  },
  {
    joy: 'Chrome',
    nom: 'Buyurtma',
    matn: 'Kengaytma savatni toʻldiradi va zavodga soʻrov yuboradi.',
    ru: ['Заказ', 'Расширение заполняет корзину и отправляет запрос фабрике.'],
    ishlaydi: false,
  },
  {
    joy: 'Toshkent',
    joyRu: 'Ташкент',
    nom: 'Yetkazish',
    matn: 'Kargo, bojxona va broker hisobi, yuk kuzatuvi.',
    ru: ['Доставка', 'Расчёт карго, таможни и брокера, отслеживание груза.'],
    ishlaydi: false,
  },
  {
    joy: 'Uzum Market',
    nom: 'Doʻkonda',
    matn: 'Kartochka matni, narx va moderatsiya holati.',
    ru: ['В магазине', 'Текст карточки, цена и статус модерации.'],
    ishlaydi: false,
  },
];

/** Bekat avtomatik almashish oraligʻi. */
const BEKAT_MS = 3600;

/**
 * Misol hisob — 300 dona, 1 dona boʻyicha soʻmda.
 *
 * Tuzilma 4-qadamdagi `/tannarx` bilan bir xil: Xitoy narxi, kargo,
 * bojxona — SIZNING sarmoyangiz; komissiya, logistika, saqlash —
 * Uzum sotuvdan ushlab qoladi. Raqamlarning oʻzi misol va sahifada
 * shunday yozilgan.
 */
const MISOL = {
  dona: 300,
  sotuv: 89_000,
  xitoy: 26_900,
  kargo: 4_400,
  bojxona: 5_200,
  komissiya: 13_350,
  logistika: 4_900,
  saqlash: 1_200,
} as const;

const SARMOYA_DONA = MISOL.xitoy + MISOL.kargo + MISOL.bojxona;
const UZUM_DONA = MISOL.komissiya + MISOL.logistika + MISOL.saqlash;
const SARMOYA = SARMOYA_DONA * MISOL.dona;
const TUSHUM = MISOL.sotuv * MISOL.dona;
const UZUM = UZUM_DONA * MISOL.dona;
const SOF_TUSHUM = TUSHUM - UZUM;
const FOYDA = SOF_TUSHUM - SARMOYA;
const MARJA = (FOYDA / TUSHUM) * 100;

export default function BoshSahifa({ tovar, holat, holatRu }: {
  tovar: number | null; holat: string; holatRu: string;
}) {
  const [mavzu, setMavzu] = useState<Mavzu>('tungi');
  const [til, setTil] = useState<Til>('uz');
  const tr = tarjima(til);
  const mlnB = tr('mln', 'млн');
  const [i, setI] = useState(0);
  const [toxta, setToxta] = useState(false);
  const [harakatsiz, setHarakatsiz] = useState(false);
  const [mp, setMp] = useState(0);
  const boshlandi = useRef(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Tugma yoʻq (nazoratchi, 2026-09-25): mavzu Ustada, «Profilim»
    // da tanlanadi; bosh sahifa oʻsha tanlovni faqat oʻqiydi.
    try {
      const s = localStorage.getItem('so_mavzu');
      if (s === 'yorug' || s === 'tungi') setMavzu(s);
    } catch { /* saqlangan qiymat yoʻq — standart tungi */ }
    const t = saqlanganTil();
    if (t) { setTil(t); tilniQoy(t); }
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setHarakatsiz(m.matches);
  }, []);

  /*
   * Pul oqimi: 3,4 s da yigʻiladi, keyin 7 s gacha turadi va qaytadan.
   * Harakat oʻchiq boʻlsa (`prefers-reduced-motion`) — darhol oxirgi
   * holat, animatsiyasiz.
   */
  useEffect(() => {
    if (harakatsiz) { setMp(1); return; }
    let raf = 0;
    const yur = () => {
      const t0 = performance.now();
      const qadam = (now: number) => {
        const p = Math.min(1, (now - t0) / 3400);
        setMp(p);
        if (p < 1) raf = requestAnimationFrame(qadam);
      };
      raf = requestAnimationFrame(qadam);
    };
    yur();
    const t = setInterval(yur, 7000);
    return () => { clearInterval(t); cancelAnimationFrame(raf); };
  }, [harakatsiz]);

  /* Bekatlar avtomatik almashadi — foydalanuvchi tanlasa yoki harakat oʻchiq boʻlsa, toʻxtaydi. */
  useEffect(() => {
    if (toxta || harakatsiz) { setProgress(0); return; }
    boshlandi.current = performance.now();
    let raf = 0;
    const qadam = (now: number) => {
      const p = Math.min(1, (now - boshlandi.current) / BEKAT_MS);
      setProgress(p);
      if (p >= 1) {
        setI((x) => (x + 1) % BEKATLAR.length);
        return;
      }
      raf = requestAnimationFrame(qadam);
    };
    raf = requestAnimationFrame(qadam);
    return () => cancelAnimationFrame(raf);
  }, [i, toxta, harakatsiz]);

  function tanla(n: number) {
    setToxta(true);
    setI(n);
  }

  const e = 1 - Math.pow(1 - mp, 3);
  const bosqich = (from: number, to: number) => Math.max(0, Math.min(1, (e - from) / (to - from)));
  const mSarmoya = bosqich(0, 0.35);
  const mYol = bosqich(0.3, 0.6);
  const mTushum = bosqich(0.55, 1);
  const kun = Math.round(mYol * 18);

  const joy = [10, 30, 50, 70, 90] as const;

  return (
    <div className={`zs-mavzu ${b.sahifa}`} data-mavzu={mavzu}>
      <header className={b.nav}>
        <div className={b.navIchi}>
          <a className={b.logo} href="/">
            <span className={b.nishon} aria-hidden="true">Z</span>
            ZumSavdo
          </a>
          <nav className={b.navOng} aria-label={tr('Asosiy', 'Главное')}>
            <a className={b.navHavola} href="#yol">{tr('Yoʻl', 'Путь')}</a>
            <a className={b.kirish} href="/usta">{tr('Ustaga oʻtish', 'Перейти к Мастеру')}</a>
          </nav>
        </div>
      </header>

      <main>
        <section className={b.hero}>
          <div>
            <div className={b.kicker}><span className={b.tirik} aria-hidden="true" />
              {tr('Guangzhou → Toshkent → Uzum', 'Гуанчжоу → Ташкент → Uzum')}
            </div>
            <h1 className={b.h1}>
              {tr(
                'Bir dona tovarning doʻkoningizgacha yoʻli — besh bekat, har birida raqam.',
                'Путь одного товара до вашего магазина — пять станций, на каждой цифры.',
              )}
            </h1>
            <p className={b.lead}>
              {tr(
                'Nisha tanlash va tannarx bugun ishlaydi. Xitoydan zavod, buyurtma, yetkazish va Uzum kartochkasi — tez orada. Qaror har doim sizniki.',
                'Выбор ниши и себестоимость работают уже сегодня. Фабрика в Китае, заказ, доставка и карточка Uzum — скоро. Решение всегда за вами.',
              )}
            </p>
            <div className={b.tugmalar}>
              <a className={b.asosiyTugma} href="/usta">{tr('Suhbatni boshlash', 'Начать чат')}</a>
              <a className={b.ikkinchiTugma} href="#yol">{tr('Bekatlarni koʻrish', 'Смотреть станции')}</a>
            </div>
            <div className={b.jonli}>
              <div className={b.jonliSon}>
                <span className={tovar === null ? b.ochiq : b.tirik} aria-hidden="true" />
                <span className={b.mono}>{tovar === null ? '—' : son(tovar)}</span>{' '}
                {tr('tovar kuzatilmoqda', 'товаров отслеживается')} · Uzum
              </div>
              <div className={b.jonliIzoh}>{til === 'ru' ? holatRu : holat}</div>
            </div>
          </div>

          <div className={`${b.shisha} ${b.oqim}`}>
            <div className={b.oqimBosh}>
              <span>
                {tr(
                  `Pul oqimi · ${MISOL.dona} dona · silikon toʻplam`,
                  `Денежный поток · ${MISOL.dona} шт. · силиконовый набор`,
                )}
              </span>
              <span className={b.misolTeg}>{tr('misol', 'пример')}</span>
            </div>

            <div className={b.oqimQator}>
              <div className={b.kichikKarta}>
                <div className={b.yorliq}>{tr('Sarmoya', 'Вложения')}</div>
                <div className={b.katta}>{mln(SARMOYA * mSarmoya, mlnB)}</div>
                <div className={b.chiziqlar}>
                  <Chiziq w={(MISOL.xitoy / SARMOYA_DONA) * 100 * mSarmoya} rang="ink" />
                  <Chiziq w={(MISOL.kargo / SARMOYA_DONA) * 100 * mSarmoya} rang="ink2" />
                  <Chiziq w={(MISOL.bojxona / SARMOYA_DONA) * 100 * mSarmoya} rang="qum" />
                </div>
                <div className={b.izoh}>{tr('tovar · kargo · bojxona', 'товар · карго · таможня')}</div>
              </div>

              <div className={b.yol} aria-hidden="true">
                <div className={b.yolChiziq} />
                {!harakatsiz && (
                  <>
                    <span className={`${b.zarra} ${b.zarraKatta}`} />
                    <span className={b.zarra} style={{ animationDelay: '1.05s' }} />
                    <span className={b.zarra} style={{ animationDelay: '2.1s' }} />
                  </>
                )}
                <div className={b.yolNomlar}>
                  <span>{tr('Xitoy', 'Китай')}</span><span>{tr('Toshkent', 'Ташкент')}</span><span>Uzum</span>
                </div>
                <div className={b.yolHolat}>
                  {tr(`${kun} kun`, `${kun} дн.`)} ·{' '}
                  {mYol < 1
                    ? tr('yoʻlda', 'в пути')
                    : mTushum < 1 ? tr('sotuvda', 'в продаже') : tr('yakunlandi', 'завершено')}
                </div>
              </div>

              <div className={b.sariqKarta}>
                <div className={b.yorliqQora}>{tr('Tushum', 'Выручка')}</div>
                <div className={b.katta}>{mln(TUSHUM * mTushum, mlnB)}</div>
                <div className={b.izohQora}>{MISOL.dona} × {son(MISOL.sotuv)} {tr('soʻm', 'сум')}</div>
                <div className={b.izohQora}>{tr('Uzum ushlaydi', 'Uzum удерживает')} −{mln(UZUM * mTushum, mlnB)}</div>
              </div>
            </div>

            <div className={b.kichikKarta} style={{ marginTop: 16 }}>
              <Qator nom={tr('Sarmoya', 'Вложения')} q={mln(SARMOYA * mSarmoya, mlnB)} />
              <div className={b.bar}><i className={b.barQum} style={{ width: `${(SARMOYA / SOF_TUSHUM) * 100 * mSarmoya}%` }} /></div>
              <Qator nom={tr('Sof tushum (Uzumdan keyin)', 'Чистая выручка (после Uzum)')} q={mln(SOF_TUSHUM * mTushum, mlnB)} />
              <div className={b.bar}><i className={b.barSariq} style={{ width: `${100 * mTushum}%` }} /></div>
              <div className={b.foyda}>
                <span>{tr('Sof foyda', 'Чистая прибыль')}</span>
                <span>
                  <span className={b.foydaMln}>{mln(FOYDA * mTushum, mlnB)}</span>
                  <b>{Math.round(MARJA * mTushum)}%</b>
                </span>
              </div>
            </div>
            <p className={b.oqimOst}>
              {tr(
                'Raqamlar misol. Oʻz tovaringiz uchun — Ustada, 4-qadam: har qator manbasi bilan.',
                'Цифры — пример. Для вашего товара — в Мастере, шаг 4: каждая строка с источником.',
              )}
            </p>
          </div>
        </section>

        <section id="yol" className={b.yolBolim} aria-label={tr('Besh bekat', 'Пять станций')}>
          <div className={b.bolimBosh}>
            <h2 className={b.h2}>{tr('Besh bekat', 'Пять станций')}</h2>
            <div className={b.bolimMeta}>
              {tr('Bekat', 'Станция')} {i + 1} / {BEKATLAR.length}
              {!toxta && !harakatsiz ? tr(' · avtomatik', ' · автоматически') : ''}
            </div>
          </div>

          <div className={b.trek}>
            <div className={b.trekChiziq} />
            <div className={b.trekTola} style={{ width: `${(joy[i] ?? 10) - 10}%` }} />
            {BEKATLAR.map((q, n) => (
              <button
                key={q.joy}
                type="button"
                className={b.trekNuqta}
                style={{ left: `${joy[n] ?? 10}%`, background: n <= i ? 'var(--acc)' : 'var(--a30)' }}
                aria-label={`${tr('Bekat', 'Станция')} ${n + 1}: ${tr(q.nom, q.ru[0])}`}
                aria-current={n === i ? 'step' : undefined}
                onClick={() => tanla(n)}
              />
            ))}
            <div className={b.chip} style={{ left: `${joy[i] ?? 10}%` }} aria-hidden="true"><span /></div>
            {BEKATLAR.map((q, n) => (
              <span
                key={q.joy}
                className={`${b.trekNom} ${n === i ? b.trekNomFaol : ''}`}
                style={{ left: `${joy[n] ?? 10}%` }}
              >
                {tr(q.joy, q.joyRu ?? q.joy)}
              </span>
            ))}
          </div>

          <div
            className={b.lenta}
            onMouseEnter={() => setToxta(true)}
            onFocus={() => setToxta(true)}
          >
            <div className={b.lentaIchi} style={{ transform: `translateX(${-150 - i * 318}px)` }}>
              {BEKATLAR.map((q, n) => {
                const d = Math.abs(n - i);
                return (
                  <button
                    key={q.joy}
                    type="button"
                    className={`${b.shisha} ${b.bekat}`}
                    style={{
                      transform: `scale(${d === 0 ? 1 : d === 1 ? 0.92 : 0.86})`,
                      opacity: d === 0 ? 1 : d === 1 ? 0.55 : 0.3,
                    }}
                    onClick={() => tanla(n)}
                    aria-pressed={n === i}
                  >
                    <span className={b.bekatBosh}>
                      <span>{tr('Bekat', 'Станция')} 0{n + 1}</span><span>{tr(q.joy, q.joyRu ?? q.joy)}</span>
                    </span>
                    <span className={b.bekatNom}>
                      {tr(q.nom, q.ru[0])}
                      <span className={`${b.holatTeg} ${q.ishlaydi ? b.holatBor : ''}`}>
                        {q.ishlaydi ? tr('ishlaydi', 'работает') : tr('tez orada', 'скоро')}
                      </span>
                    </span>
                    <span className={b.bekatMatn}>{tr(q.matn, q.ru[1])}</span>
                    <span className={b.bekatBar}>
                      <i style={{ width: n === i && !toxta && !harakatsiz ? `${progress * 100}%` : n === i ? '100%' : '0%' }} />
                    </span>
                    <span className={b.bekatOxir}>
                      <span>{q.meta ? tr(q.meta[0], q.ru[2]?.[0] ?? q.meta[0]) : tr('holat', 'статус')}</span>
                      <b className={q.meta ? '' : b.metaYoq}>
                        {q.meta ? tr(q.meta[1], q.ru[2]?.[1] ?? q.meta[1]) : tr('tez orada', 'скоро')}
                      </b>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className={b.soyaChap} />
            <div className={b.soyaOng} />
          </div>
        </section>

        <section className={b.cta}>
          <div className={b.ctaIchi}>
            <div>
              <h2 className={b.ctaSarlavha}>{tr('Yoʻlni byudjetingiz boshlaydi.', 'Путь начинается с вашего бюджета.')}</h2>
              <p className={b.ctaMatn}>
                {tr(
                  'Uch savol — byudjet, qiziqish, tajriba. Keyin Usta yoʻnalish va tovarni Uzum bazasidan, raqamlar bilan tanlaydi.',
                  'Три вопроса — бюджет, интерес, опыт. Затем Мастер подберёт направление и товар по базе Uzum, с цифрами.',
                )}
              </p>
            </div>
            <a className={b.asosiyTugma} href="/usta">{tr('Suhbatni boshlash', 'Начать чат')}</a>
          </div>
        </section>
      </main>

      <footer className={b.pastki}>
        <div className={b.pastkiIchi}>
          <span>ZumSavdo · Uzum Market</span>
          <a href="/maxfiylik">{tr('Maxfiylik siyosati', 'Политика конфиденциальности')}</a>
          <span>{tr('Toshkent', 'Ташкент')} · 2026</span>
        </div>
      </footer>
    </div>
  );
}

function Chiziq({ w, rang }: { w: number; rang: 'ink' | 'ink2' | 'qum' }) {
  return (
    <div className={b.ingichka}>
      <i className={b[`rang_${rang}`]} style={{ width: `${w}%` }} />
    </div>
  );
}

function Qator({ nom, q }: { nom: string; q: string }) {
  return (
    <div className={b.qator}><span>{nom}</span><span className={b.mono}>{q}</span></div>
  );
}

/** `10 950 000` → `11,0 mln`. Bir xona kasr — "11 mln" yaxlitlashi 50 ming yashiradi. */
function mln(n: number, birlik: string): string {
  return `${(n / 1_000_000).toFixed(1).replace('.', ',')} ${birlik}`;
}
