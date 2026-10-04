'use client';

/**
 * Bosh sahifa — `dizayn/ZumSavdo-Veb.html`, w1 «Landing sahifa»
 * (terrakota, nazoratchi 2026-09-30). Oʻlchamlar dizayndagi inline
 * uslubdan aynan: 1440 kenglikda chetdan 120 px, hero 1fr + 620 px.
 *
 * DIZAYNDAN FARQ — ataylab, halollik uchun:
 *   1. Jonli son (kuzatilayotgan tovarlar) bazadan keladi, sanasi bilan;
 *      olinmasa — chiziqcha (QOIDALAR.md, 4-boʻlim). Dizayndagi
 *      "3 020 056" — oʻsha kungi raqam.
 *   2. Pul oqimi kartasi — MISOL va shunday yozilgan; raqamlari
 *      Ustadagi 4-qadam tuzilmasida hisoblanadi (quyidagi `MISOL`).
 *   3. Bekatlar kartasi harakatlanadi (avtomatik, 3,6 s), dizayn —
 *      shu harakatning birinchi bekatdagi surati.
 *
 * TIL. Til Ustada, «Profilim» da tanlanadi (`so_til`), bu yerda faqat
 * oʻqiladi. Mavzu — tepa paneldagi quyosh/oy tugmasi (hamma sahifada bir).
 */

import { useEffect, useRef, useState } from 'react';
import { son } from '@/lib/bazamiz';
import { useMavzu } from '@/lib/mavzu';
import { tarjima, type Til } from '@/lib/til';
import { useTil } from '@/lib/useTil';
import { Ikon } from './Ikon';
import { MavzuTugma } from './MavzuTugma';
import b from './bosh.module.css';

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
/** Bir vaqtda koʻrinadigan bekat kartalari (dizayn: 3). */
const OYNA = 3;

/**
 * Misol hisob — 300 dona, 1 dona boʻyicha soʻmda.
 *
 * Tuzilma 4-qadamdagi `/tannarx` bilan bir xil: Xitoy narxi, kargo,
 * bojxona — SIZNING sarmoyangiz; komissiya, logistika, saqlash —
 * Uzum sotuvdan ushlab qoladi. Raqamlarning oʻzi misol va sahifada
 * shunday yozilgan. Sarmoya ulushlari (62 / 20 / 18 %) — dizayndagi
 * chiziq bilan bir xil.
 */
const MISOL = {
  dona: 300,
  sotuv: 89_000,
  xitoy: 22_630,
  kargo: 7_300,
  bojxona: 6_570,
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

export default function BoshSahifa({ tovar, holat, holatRu, til: boshTil }: {
  tovar: number | null; holat: string; holatRu: string; til: Til;
}) {
  const [mavzu, mavzuniTanla] = useMavzu();
  const [til] = useTil(boshTil);
  const tr = tarjima(til);
  const mlnB = tr('mln', 'млн');
  const [i, setI] = useState(0);
  const [toxta, setToxta] = useState(false);
  const [harakatsiz, setHarakatsiz] = useState(false);
  const [mp, setMp] = useState(0);
  const boshlandi = useRef(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setHarakatsiz(m.matches);
  }, []);

  /*
   * Pul oqimi: 3,4 s da yigʻiladi, keyin 7 s gacha turadi va qaytadan.
   * Harakat oʻchiq boʻlsa (`prefers-reduced-motion`) — darhol oxirgi
   * holat, animatsiyasiz (dizayndagi surat — shu oxirgi holat).
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
    setI((n + BEKATLAR.length) % BEKATLAR.length);
  }

  const e = 1 - Math.pow(1 - mp, 3);
  const bosqich = (from: number, to: number) => Math.max(0, Math.min(1, (e - from) / (to - from)));
  const mSarmoya = bosqich(0, 0.35);
  const mYol = bosqich(0.3, 0.6);
  const mTushum = bosqich(0.55, 1);
  const kun = Math.round(mYol * 18);

  const oynaBosh = Math.min(i, BEKATLAR.length - OYNA);
  const korinadi = BEKATLAR.slice(oynaBosh, oynaBosh + OYNA);
  const h1 = til === 'ru'
    ? ['Путь одного товара до вашего магазина — ', 'пять станций', ', на каждой цифры.']
    : ['Bir dona tovarning doʻkoningizgacha yoʻli — ', 'besh bekat', ', har birida raqam.'];

  return (
    <div className={`zs-mavzu ${b.sahifa}`} data-til={til}>
      <header className={b.nav}>
        <div className={b.navIchi}>
          <a className={b.logo} href="/">
            <span className={b.nishon} aria-hidden="true">Z</span>
            <span className={b.logoMatn}>ZumSavdo</span>
          </a>
          <nav className={b.navOng} aria-label={tr('Asosiy', 'Главное')}>
            <a className={b.navHavola} href="#yol">{tr('Yoʻl', 'Путь')}</a>
            <MavzuTugma mavzu={mavzu} tanla={mavzuniTanla} tr={tr} />
            <a className={b.ustaga} href="/usta">{tr('Ustaga oʻtish', 'Перейти к Мастеру')}</a>
          </nav>
        </div>
      </header>

      <main>
        <section className={b.hero}>
          <div>
            <div className={b.kicker}><span className={b.kickerNuqta} aria-hidden="true" />
              {tr('Guangzhou → Toshkent → Uzum', 'Гуанчжоу → Ташкент → Uzum')}
            </div>
            <h1 className={b.h1}>{h1[0]}<span className={b.urgu}>{h1[1]}</span>{h1[2]}</h1>
            <p className={b.lead}>
              {tr(
                'Nisha tanlash va tannarx bugun ishlaydi. Xitoydan zavod, buyurtma, yetkazish va Uzum kartochkasi — tez orada. Qaror har doim sizniki.',
                'Выбор ниши и себестоимость работают уже сегодня. Фабрика в Китае, заказ, доставка и карточка Uzum — скоро. Решение всегда за вами.',
              )}
            </p>
            <div className={b.tugmalar}>
              <a className={b.asosiyTugma} href="/usta">{tr('Suhbatni boshlash', 'Начать чат')}<Ikon nom="ong" o={18} /></a>
              <a className={b.oqTugma} href="#yol">{tr('Bekatlarni koʻrish', 'Смотреть станции')}</a>
            </div>
            <div className={b.jonli}>
              <span className={b.jonliSon}>{tovar === null ? '—' : son(tovar)}</span>
              <span className={b.jonliMatn}>{tr('tovar kuzatilmoqda', 'товаров отслеживается')} · Uzum</span>
            </div>
            <div className={b.jonliIzoh}>{til === 'ru' ? holatRu : holat}</div>
          </div>

          <div className={b.oqim}>
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
              <div className={b.qumKarta}>
                <div className={b.yorliq}>{tr('Sarmoya', 'Вложения')}</div>
                <Mln n={SARMOYA * mSarmoya} birlik={mlnB} />
                <div className={b.qismlar}>
                  <span className={b.qismMatn} style={{ width: `${(MISOL.xitoy / SARMOYA_DONA) * 100 * mSarmoya}%` }} />
                  <span className={b.qismAcc} style={{ width: `${(MISOL.kargo / SARMOYA_DONA) * 100 * mSarmoya}%` }} />
                  <span className={b.qismQolgan} />
                </div>
                <div className={b.izoh}>{tr('tovar · kargo · bojxona', 'товар · карго · таможня')}</div>
              </div>

              <div className={b.yol} aria-hidden="true">
                <div className={b.yolNomlar}>
                  <span>{tr('Xitoy', 'Китай')}</span><span>{tr('Toshkent', 'Ташкент')}</span><span>Uzum</span>
                </div>
                <div className={b.yolChiziq}>
                  <i style={{ width: `${mYol * 100}%` }} />
                  <span className={`${b.yolNuqta} ${b.yolChap} ${b.yolYetdi}`} />
                  <span className={`${b.yolNuqta} ${b.yolOrta} ${mYol >= 0.5 ? b.yolYetdi : ''}`} />
                  <span className={`${b.yolNuqta} ${b.yolOng} ${mYol >= 1 ? b.yolYetdi : ''}`} />
                </div>
                <div className={b.yolHolat}>
                  {tr(`${kun} kun`, `${kun} дн.`)} ·{' '}
                  {mYol < 1
                    ? tr('yoʻlda', 'в пути')
                    : mTushum < 1 ? tr('sotuvda', 'в продаже') : tr('yakunlandi', 'завершено')}
                </div>
              </div>

              <div className={b.accKarta}>
                <div className={b.yorliqOq}>{tr('Tushum', 'Выручка')}</div>
                <Mln n={TUSHUM * mTushum} birlik={mlnB} oq />
                <div className={b.izohOq} style={{ marginTop: 14 }}>{MISOL.dona} × {son(MISOL.sotuv)} {tr('soʻm', 'сум')}</div>
                <div className={b.izohOq} style={{ marginTop: 4 }}>{tr('Uzum ushlaydi', 'Uzum удерживает')} −{mlnMatn(UZUM * mTushum, mlnB)}</div>
              </div>
            </div>

            <div className={b.hisob}>
              <div className={b.hisobQator}>
                <div className={b.qator}><span>{tr('Sarmoya', 'Вложения')}</span><b>{mlnMatn(SARMOYA * mSarmoya, mlnB)}</b></div>
                <div className={b.bar}><i className={b.barMatn} style={{ width: `${(SARMOYA / SOF_TUSHUM) * 100 * mSarmoya}%` }} /></div>
              </div>
              <div className={b.hisobQator}>
                <div className={b.qator}><span>{tr('Sof tushum (Uzumdan keyin)', 'Чистая выручка (после Uzum)')}</span><b>{mlnMatn(SOF_TUSHUM * mTushum, mlnB)}</b></div>
                <div className={b.bar}><i className={b.barAcc} style={{ width: `${100 * mTushum}%` }} /></div>
              </div>
              <div className={b.foyda}>
                <span>{tr('Sof foyda', 'Чистая прибыль')}</span>
                <span className={b.foydaQiymat}>
                  <span className={b.foydaMln}>{mlnMatn(FOYDA * mTushum, mlnB)}</span>
                  <span className={b.foydaFoiz}>{Math.round(MARJA * mTushum)}%</span>
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

        <section id="yol" className={b.bekatlar} aria-label={tr('Besh bekat', 'Пять станций')}>
          <div className={b.bolimBosh}>
            <h2 className={b.h2}>{tr('Besh bekat', 'Пять станций')}</h2>
            <div className={b.boshqaruv}>
              <span className={b.bolimMeta}>{tr('Bekat', 'Станция')} {i + 1} / {BEKATLAR.length}</span>
              <button type="button" className={b.oldingi} aria-label={tr('Oldingi bekat', 'Предыдущая станция')} onClick={() => tanla(i - 1)}>
                <Ikon nom="chap" o={18} />
              </button>
              <button type="button" className={b.keyingi} aria-label={tr('Keyingi bekat', 'Следующая станция')} onClick={() => tanla(i + 1)}>
                <Ikon nom="ong" o={18} />
              </button>
            </div>
          </div>

          <div className={b.trek}>
            {BEKATLAR.map((q, n) => (
              <div key={q.joy} className={b.trekBekat}>
                <div className={b.trekQator}>
                  <button
                    type="button"
                    className={`${b.trekRaqam} ${n <= i ? b.trekRaqamFaol : ''} ${n === i ? b.trekRaqamJoriy : ''}`}
                    aria-label={`${tr('Bekat', 'Станция')} ${n + 1}: ${tr(q.nom, q.ru[0])}`}
                    aria-current={n === i ? 'step' : undefined}
                    onClick={() => tanla(n)}
                  >
                    {n + 1}
                  </button>
                  {n < BEKATLAR.length - 1 && <span className={`${b.trekChiziq} ${n === i ? b.trekChiziqJoriy : n < i ? b.trekChiziqOtdi : ''}`} />}
                </div>
                <span className={`${b.trekNom} ${n === i ? b.trekNomFaol : ''}`}>{tr(q.joy, q.joyRu ?? q.joy)}</span>
              </div>
            ))}
          </div>

          <div className={b.lenta} onMouseEnter={() => setToxta(true)} onFocus={() => setToxta(true)}>
            {korinadi.map((q, k) => {
              const n = oynaBosh + k;
              const faol = n === i;
              return (
                <button
                  key={q.joy}
                  type="button"
                  className={`${b.bekat} ${faol ? b.bekatFaol : ''} ${!faol && k === OYNA - 1 ? b.bekatXira : ''}`}
                  onClick={() => tanla(n)}
                  aria-pressed={faol}
                >
                  <span className={b.bekatBosh}>
                    <span>{tr('Bekat', 'Станция')} 0{n + 1}</span><span>{tr(q.joy, q.joyRu ?? q.joy)}</span>
                  </span>
                  <span className={b.bekatNomQator}>
                    <span className={b.bekatNom}>{tr(q.nom, q.ru[0])}</span>
                    <span className={`${b.holatTeg} ${q.ishlaydi ? b.holatBor : ''}`}>
                      {q.ishlaydi ? tr('ishlaydi', 'работает') : tr('tez orada', 'скоро')}
                    </span>
                  </span>
                  <span className={b.bekatMatn}>{tr(q.matn, q.ru[1])}</span>
                  <span className={b.bekatBoshliq} />
                  <span className={b.bekatBar}>
                    <i style={{ width: faol ? (!toxta && !harakatsiz ? `${progress * 100}%` : '100%') : '0%' }} />
                  </span>
                  <span className={b.bekatOxir}>
                    <span>{q.meta ? tr(q.meta[0], q.ru[2]?.[0] ?? q.meta[0]) : tr('holat', 'статус')}</span>
                    <b>{q.meta ? tr(q.meta[1], q.ru[2]?.[1] ?? q.meta[1]) : '—'}</b>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={b.cta}>
          <div>
            <h2 className={b.ctaSarlavha}>{tr('Yoʻlni byudjetingiz boshlaydi.', 'Путь начинается с вашего бюджета.')}</h2>
            <p className={b.ctaMatn}>
              {tr(
                'Uch savol — byudjet, qiziqish, tajriba. Keyin Usta yoʻnalish va tovarni Uzum bazasidan, raqamlar bilan tanlaydi.',
                'Три вопроса — бюджет, интерес, опыт. Затем Мастер подберёт направление и товар по базе Uzum, с цифрами.',
              )}
            </p>
          </div>
          <a className={b.ctaTugma} href="/usta">{tr('Suhbatni boshlash', 'Начать чат')}<Ikon nom="ong" o={18} /></a>
        </section>
      </main>

      <footer className={b.pastki}>
        <span>ZumSavdo · Uzum Market</span>
        <a href="/maxfiylik">{tr('Maxfiylik siyosati', 'Политика конфиденциальности')}</a>
        <span>{tr('Toshkent', 'Ташкент')} · 2026</span>
      </footer>
    </div>
  );
}

/** Katta raqam + «mln» (dizayn: Unbounded 30 px, birlik Onest 13 px). */
function Mln({ n, birlik, oq = false }: { n: number; birlik: string; oq?: boolean }) {
  return (
    <div className={b.kattaQator}>
      <span className={b.katta}>{(n / 1_000_000).toFixed(1).replace('.', ',')}</span>
      <span className={oq ? b.birlikOq : b.birlik}>{birlik}</span>
    </div>
  );
}

/** `10 950 000` → `10,9 mln`. Bir xona kasr — "11 mln" yaxlitlashi 50 ming yashiradi. */
function mlnMatn(n: number, birlik: string): string {
  return `${(n / 1_000_000).toFixed(1).replace('.', ',')} ${birlik}`;
}
