'use client';

/**
 * Bosh sahifa — `dizayn/ZumSavdo-Landing.html` (siyohrang, Manrope;
 * nazoratchi 2026-10-21). Oʻlcham, rang va matn dizayndagi inline
 * uslubdan aynan; oʻrniga CSS modul (`bosh.module.css`).
 *
 * DIZAYNDAN FARQ — ataylab, halollik uchun:
 *   1. 12 qadam holati dizayndagi qoʻlda yozilgan «tez orada» dan emas,
 *      `SUHBAT_QADAMLARI.qurilgan` dan (bugun 12 tasi ham qurilgan).
 *   2. Birinchi kartada jonli son (kuzatilayotgan tovarlar) — bazadan,
 *      sanasi bilan; olinmasa — chiziqcha (QOIDALAR.md, 4-boʻlim).
 *   3. Qidiruv qutisi — yozib boʻlmaydigan rasm emas, suhbatga havola:
 *      haqiqiy qidiruv suhbatning oʻzida.
 *   4. Pastki qatorda «Maxfiylik siyosati» havolasi qoladi.
 *
 * Mavzu — faqat yorugʻ (dizaynda tungi nusxa yoʻq). Til — Ustadagi
 * «Profilim» da tanlanadi (`so_til`), bu yerda faqat oʻqiladi.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { SUHBAT_QADAMLARI } from '@selleros/shared';
import { son } from '@/lib/bazamiz';
import { mlnKasr } from '@/lib/mln';
import { ruShakl, tarjima, type Til, type Tr } from '@/lib/til';
import { useTil } from '@/lib/useTil';
import { Havola } from './Havola';
import Yordamchi from './Yordamchi';
import b from './bosh.module.css';

/** Hero zinapoyasidagi qisqa nom (12 ta, dizayndagidek). */
const ZINA: readonly (readonly [string, string])[] = [
  ['Tanishuv', 'Знакомство'], ['Yoʻnalish', 'Направление'], ['Tovar', 'Товар'],
  ['Tannarx', 'Расчёт'], ['Zavod', 'Фабрика'], ['Buyurtma', 'Заказ'],
  ['Bojxona', 'Таможня'], ['Qabul', 'Приёмка'], ['Studiya', 'Студия'],
  ['Yuklash', 'Загрузка'], ['Sotuv', 'Продажи'], ['Hisobot', 'Отчёт'],
];

/** 12 qadam roʻyxatidagi bir qatorlik izoh. Nom va holat — `SUHBAT_QADAMLARI` dan. */
const IZOH: readonly (readonly [string, string])[] = [
  ['Siz haqingizda bir necha savol.', 'Несколько вопросов о вас.'],
  ['Byudjet va qiziqishingizga mos yoʻnalish.', 'Направление под ваш бюджет и интересы.'],
  ['Uzum bazasidan tovar va tavsiya miqdor.', 'Товар из базы Uzum и рекомендуемое количество.'],
  ['Tovar, kargo, bojxona va Uzum ulushi.', 'Товар, карго, таможня и доля Uzum.'],
  ['Xitoydan zavod va narx, soʻmda.', 'Фабрика в Китае и цена в сумах.'],
  ['Buyurtma berish va yoʻlga chiqarish.', 'Заказ и отправка в путь.'],
  ['Bojxona va hujjatlar.', 'Таможня и документы.'],
  ['Tovarni qabul qilish.', 'Приёмка товара.'],
  ['Tovar suratlari va tavsifi.', 'Фото и описание товара.'],
  ['Uzumga kartochka yuklash.', 'Загрузка карточки на Uzum.'],
  ['Birinchi buyurtmalar.', 'Первые заказы.'],
  ['Natija va keyingi qadam.', 'Итог и следующий шаг.'],
];

/** Qidiruv qutisida yozilib-oʻchiriladigan misollar. */
const MISOLLAR: Record<Til, readonly string[]> = {
  uz: ['telefon gʻilofi, byudjet 5 mln', 'oshxona idishlari, 20 mln', 'bolalar kiyimi, 10 mln', 'avto aksessuarlar, 8 mln'],
  ru: ['чехол для телефона, бюджет 5 млн', 'посуда для кухни, 20 млн', 'детская одежда, 10 млн', 'автоаксессуары, 8 млн'],
};

/**
 * Misol hisob (dizayndagi): 300 dona × 89 000 soʻm, tannarx 36 700/dona,
 * Uzum ulushi 25 %. Raqamlar misol va kartada shunday yozilgan.
 */
const MISOL = { dona: 300, sotuv: 89_000, tannarx: 36_700, uzumUlush: 0.25 } as const;
const SARMOYA = MISOL.dona * MISOL.tannarx;
const TUSHUM = MISOL.dona * MISOL.sotuv;
const FOYDA = TUSHUM * (1 - MISOL.uzumUlush) - SARMOYA;

/** Misol zavodlar: [shahar, harf, narx soʻmda]. */
const ZAVODLAR = [['Yiwu', 'A', 36_700], ['Guangzhou', 'B', 38_200], ['Shenzhen', 'C', 41_500]] as const;

export default function BoshSahifa({ tovar, holat, holatRu, til: boshTil }: {
  tovar: number | null; holat: string; holatRu: string; til: Til;
}) {
  const [til] = useTil(boshTil);
  const tr = tarjima(til);
  const ildiz = useRef<HTMLDivElement>(null);
  const yozuv = useYozuv(MISOLLAR[til]);

  /* Pastdagi bloklar koʻrinishga kirganda chiqadi (dizayndagi `zs-rv`). */
  useEffect(() => {
    const ichida = b.ichida ?? '';
    const bloklar = ildiz.current?.querySelectorAll(`.${b.rv}`) ?? [];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      bloklar.forEach((el) => el.classList.add(ichida));
      return;
    }
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add(ichida); io.unobserve(e.target); }
    }), { threshold: 0.12 });
    bloklar.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const boshlash = tr('Suhbatni boshlash', 'Начать чат');

  return (
    <div ref={ildiz} className={`zs-mavzu ${b.sahifa}`} data-til={til}>
      <header className={b.nav}>
        <div className={`${b.ichi} ${b.navIchi}`}>
          <Havola className={b.logo} href="/" aria-label="ZumSavdo">
            <span className={b.nishon} aria-hidden="true">Z</span>
            <span className={b.logoMatn}>ZumSavdo</span>
          </Havola>
          <nav className={b.navOng} aria-label={tr('Asosiy', 'Главное')}>
            <Havola className={b.navHavola} href="#natija">{tr('Imkoniyatlar', 'Возможности')}</Havola>
            <Havola className={b.navHavola} href="#yol">{tr('12 qadam', '12 шагов')}</Havola>
            <Havola className={b.navHavola} href="#narx">{tr('Narx', 'Цена')}</Havola>
            <Havola className={b.navHavola} href="#savol">{tr('Savollar', 'Вопросы')}</Havola>
            <Havola className={b.kirish} href="/usta">{tr('Kirish', 'Войти')}</Havola>
          </nav>
        </div>
      </header>

      <main>
        <div className={`${b.ichi} ${b.heroJoy}`}>
          <section className={`${b.hero} ${b.grad}`}>
            <span className={`${b.orb} ${b.orb1}`} aria-hidden="true" />
            <span className={`${b.orb} ${b.orb2} ${b.glow}`} aria-hidden="true" />
            <span className={`${b.orb} ${b.orb3}`} aria-hidden="true" />
            <div className={b.heroIchi}>
              <div className={b.heroChap}>
                <span className={b.bepulTeg}>{tr('Boshlash bepul', 'Начать бесплатно')}</span>
                <h1 className={b.h1}>
                  {til === 'ru'
                    ? <>Не знаете, что продавать? <span className={b.urgu}>Напишите</span> — найдём.</>
                    : <>Nima sotishni bilmaysizmi? <span className={b.urgu}>Yozing</span> — topib beramiz.</>}
                </h1>
              </div>
              <div className={b.heroOng}>
                <p className={b.lead}>
                  {tr(
                    'Uzum bazasidan tovar, Xitoydan zavod, soʻmda tannarx va foyda. Savollarga javob bering, yordamchi hisobini chiqaradi.',
                    'Товар из базы Uzum, фабрика в Китае, себестоимость и прибыль в сумах. Ответьте на вопросы — помощник всё посчитает.',
                  )}
                </p>
                <Havola className={b.qidiruv} href="/usta" aria-label={boshlash}>
                  <span className={b.qidiruvChap}>
                    <Chiz o={22} rang="#6B5A74" q={2.2} className={b.flexNone}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></Chiz>
                    <span className={b.qidiruvMatn}>
                      <span className={b.yozuv}>{tr('Masalan: ', 'Например: ')}{yozuv}</span>
                      <span className={b.kursor} aria-hidden="true" />
                    </span>
                  </span>
                  <span className={`${b.tugma} ${b.tugmaGrad} ${b.shine} ${b.qidiruvTugma}`}>
                    {tr('Topish', 'Найти')}<Strelka />
                  </span>
                </Havola>
              </div>
            </div>

            <div className={b.zina} aria-hidden="true">
              <div className={b.zinaQator}>
                {ZINA.map(([uz, ru], n) => (
                  <div
                    key={uz}
                    className={`${b.zinapoya} ${n === ZINA.length - 1 ? b.zinapoyaOxir : ''}`}
                    style={{
                      '--i': n,
                      height: `clamp(${54 + n * 13}px, ${(5.2 + n * 1.55).toFixed(2)}vw, ${70 + n * 20}px)`,
                      ...(n < ZINA.length - 1 ? { background: `rgba(255,255,255,${(0.1 + n * 0.015).toFixed(3)})` } : {}),
                    } as CSSProperties}
                  >
                    <span className={b.zinaRaqam}>{n + 1}</span>
                    <span className={b.zinaNom}>{til === 'ru' ? ru : uz}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <div className={b.heroPast}>
            <span>{tr('Tanishuvdan hisobotgacha', 'От знакомства до отчёта')}</span>
            <span>{tr('12 qadam, har birida raqam', '12 шагов, в каждом — цифры')}</span>
          </div>
        </div>

        <div className={`${b.ichi} ${b.kartalarJoy}`}>
          <div className={b.uchKarta}>
            <div className={`${b.rv} ${b.lift} ${b.ochKarta} ${b.imkon}`}>
              <IkonQuti><path d="M3 3v18h18" /><path d="M8 17v-6M13 17V7M18 17v-9" /></IkonQuti>
              <div className={b.imkonSarlavha}>{tr('Uzumdagi barcha mahsulot va doʻkonlar statistikasi', 'Статистика всех товаров и магазинов Uzum')}</div>
              <div className={b.imkonPast}>
                <div className={b.ustunlar} aria-hidden="true">
                  {[38, 62, 48, 80, 56, 92, 70].map((h, n) => (
                    <i key={n} className={`${b.ustun} ${n === 5 ? b.ustunFaol : ''}`} style={{ '--i': n, height: h } as CSSProperties} />
                  ))}
                </div>
                <div className={b.chiplar}>
                  <span className={b.oqChip}>{tr('Tovarlar', 'Товары')}</span>
                  <span className={b.oqChip}>{tr('Doʻkonlar', 'Магазины')}</span>
                </div>
                <div className={b.jonli}>
                  <b>{tovar === null ? '—' : son(tovar)}</b>{' '}
                  {tr('tovar kuzatilmoqda', `${ruShakl(tovar, ['товар', 'товара', 'товаров'])} отслеживается`)}
                  <span className={b.jonliIzoh}>{til === 'ru' ? holatRu : holat}</span>
                </div>
              </div>
            </div>

            <div className={`${b.rv} ${b.lift} ${b.ochKarta} ${b.imkon}`}>
              <IkonQuti><path d="M3 12l9-9h7a2 2 0 0 1 2 2v7l-9 9z" /><circle cx="16" cy="8" r="1.5" /></IkonQuti>
              <div className={b.imkonSarlavha}>{tr('Xitoydagi tannarx va Uzumda sotilayotgan narx yonma-yon', 'Себестоимость в Китае и цена на Uzum рядом')}</div>
              <div className={b.imkonPast}>
                <div className={b.narxlar}>
                  <div className={b.narxOq}>
                    <div className={b.narxYorliq}>{tr('Xitoyda', 'В Китае')}</div>
                    <div className={b.narxSon}>{son(MISOL.tannarx)}</div>
                    <div className={b.narxBirlik}>{tr('soʻm', 'сум')}</div>
                  </div>
                  <Chiz o={22} rang="#4A2A57" q={2.6} className={b.flexNone}><path d="M5 12h14M13 6l6 6-6 6" /></Chiz>
                  <div className={b.narxQora}>
                    <div className={b.narxYorliq}>{tr('Uzumda', 'На Uzum')}</div>
                    <div className={b.narxSon}>{son(MISOL.sotuv)}</div>
                    <div className={b.narxBirlik}>{tr('soʻm', 'сум')}</div>
                  </div>
                </div>
                <div className={b.misolJoy}><Misol tr={tr} oq /></div>
              </div>
            </div>

            <div className={`${b.rv} ${b.lift} ${b.ochKarta} ${b.imkon}`}>
              <IkonQuti><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></IkonQuti>
              <div className={b.imkonSarlavha}>{tr('Xitoydan arzon narxlarda topish', 'Поиск дешевле в Китае')}</div>
              <div className={b.imkonPast}>
                <div className={b.zavodlar}>
                  {ZAVODLAR.map(([, h, narx], n) => (
                    <div key={h} className={`${b.zavod} ${n === 0 ? b.zavodEng : ''}`}>
                      <span>{tr('Zavod', 'Фабрика')} {h}</span>
                      <span className={b.zavodNarx}>
                        {n === 0 && <span className={b.engArzon}>{tr('eng arzon', 'дешевле всех')}</span>}
                        {son(narx)} {tr('soʻm', 'сум')}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={b.misolJoy}><Misol tr={tr} oq /></div>
              </div>
            </div>
          </div>
        </div>

        <section id="natija" className={`${b.ichi} ${b.bolim}`}>
          <div className={b.natija}>
            <div className={b.natijaChap}>
              <Sarlavha
                h={tr('Bitta suhbat — uchta javob.', 'Один чат — три ответа.')}
                p={tr('Tovar nomini yozing. Yordamchi oʻzi qidiradi, solishtiradi va hisoblaydi.', 'Напишите название товара. Помощник сам найдёт, сравнит и посчитает.')}
              />
              <div className={b.belgilar}>
                <Belgili>{tr('Uzum bazasi: 6 qismli ball va 8 ta tuzoq-filtr', 'База Uzum: балл из 6 частей и 8 фильтров-ловушек')}</Belgili>
                <Belgili>{tr('Xitoydan oʻxshash zavodlar, narx soʻmda', 'Похожие фабрики в Китае, цена в сумах')}</Belgili>
                <Belgili>{tr('Tannarx va sof foyda, har qator manbasi bilan', 'Себестоимость и чистая прибыль, у каждой строки — источник')}</Belgili>
              </div>
              <div>
                <Havola className={`${b.tugma} ${b.tugmaGrad} ${b.tugma60} ${b.pulse} ${b.shine}`} href="/usta">{boshlash}<Strelka /></Havola>
              </div>
            </div>

            <div className={`${b.rv} ${b.grad} ${b.namuna}`}>
              <span className={`${b.orb} ${b.orb4}`} aria-hidden="true" />
              <span className={`${b.orb} ${b.orb5}`} aria-hidden="true" />
              <div className={b.float} style={{ maxWidth: 380, '--d': '0s', '--r': '-2deg' } as CSSProperties}>
                <div className={b.oqKarta}>
                  <div className={b.tovarQator}>
                    <div className={b.tovarRasm} aria-hidden="true" />
                    <div className={b.tovarMatn}>
                      <div className={b.tovarNom}>{tr('Silikon gʻilof', 'Силиконовый чехол')}</div>
                      <div className={b.tovarTur}>{tr('Uy-roʻzgʻor · Uzum bazasi', 'Дом · база Uzum')}</div>
                    </div>
                    <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={tr('Ball 78', 'Балл 78')}>
                      <circle cx="32" cy="32" r="26" fill="none" stroke="#EFE6F4" strokeWidth="8" />
                      <circle cx="32" cy="32" r="26" fill="none" stroke="#4A2A57" strokeWidth="8" strokeLinecap="round" strokeDasharray="163" strokeDashoffset="38" transform="rotate(-90 32 32)" />
                      <text x="32" y="38" textAnchor="middle" fontFamily="Manrope" fontWeight="800" fontSize="18" fill="#2A1733">78</text>
                    </svg>
                  </div>
                  <div className={b.chiplar14}>
                    <span className={b.binafChip}>{tr('6 qismli ball', 'Балл из 6 частей')}</span>
                    <span className={b.binafChip}>{tr('8 filtr oʻtdi', '8 фильтров пройдено')}</span>
                    <Misol tr={tr} />
                  </div>
                </div>
              </div>

              <div className={b.float} style={{ maxWidth: 360, alignSelf: 'flex-end', '--d': '-1.5s', '--r': '2deg' } as CSSProperties}>
                <div className={b.oqKarta}>
                  <div className={b.kartaBosh}>
                    <span>{tr(`Hisob · ${son(MISOL.dona)} dona`, `Расчёт · ${son(MISOL.dona)} шт.`)}</span><Misol tr={tr} />
                  </div>
                  <div className={b.ikkiUstun}>
                    <div>
                      <div className={b.kichikYorliq}>{tr('Sarmoya', 'Вложения')}</div>
                      <div className={b.mln}>{mlnKasr(SARMOYA)} <span>{tr('mln', 'млн')}</span></div>
                    </div>
                    <div>
                      <div className={b.kichikYorliq}>{tr('Tushum', 'Выручка')}</div>
                      <div className={b.mln}>{mlnKasr(TUSHUM)} <span>{tr('mln', 'млн')}</span></div>
                    </div>
                  </div>
                  <div className={b.foyda}>
                    <span className={b.foydaYorliq}>{tr('Sof foyda', 'Чистая прибыль')}</span>
                    <span className={b.foydaSon}>+{mlnKasr(FOYDA)} {tr('mln', 'млн')}</span>
                  </div>
                </div>
              </div>

              <div className={b.float} style={{ maxWidth: 400, '--d': '-3s', '--r': '-1deg' } as CSSProperties}>
                <div className={b.oqKarta}>
                  <div className={b.kartaBosh}>
                    <span>{tr('Xitoy · oʻxshash zavodlar', 'Китай · похожие фабрики')}</span><Misol tr={tr} />
                  </div>
                  {ZAVODLAR.map(([shahar, h, narx], n) => (
                    <div key={h} className={`${b.zavodQator} ${n === 0 ? b.zavodQatorBirinchi : ''}`}>
                      <span>{shahar} {tr(`zavodi ${h}`, `фабрика ${h}`)}</span>
                      <span className={b.zavodNarx}>{son(narx)} {tr('soʻm', 'сум')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className={b.yolFon}>
          <section id="yol" className={`${b.ichi} ${b.yolBolim}`}>
            <Sarlavha
              h={tr('12 qadam, bitta suhbat.', '12 шагов, один чат.')}
              p={tr('Tanishuvdan hisobotgacha. Har qadamda nima qilish oddiy tilda tushuntiriladi.', 'От знакомства до отчёта. На каждом шаге простым языком объясняется, что делать.')}
            />
            <div className={b.ikkiBlok}>
              <QadamBlok
                tr={tr} til={til} bosh={0}
                nom={tr('Tayyorgarlik', 'Подготовка')}
                izoh={tr('1–6 qadam: tanlash, hisob, zavod', 'Шаги 1–6: выбор, расчёт, фабрика')}
              />
              <QadamBlok
                tr={tr} til={til} bosh={6}
                nom={tr('Sotuv', 'Продажи')}
                izoh={tr('7–12 qadam: yetkazish va Uzum', 'Шаги 7–12: доставка и Uzum')}
              />
            </div>
          </section>
        </div>

        <section className={`${b.ichi} ${b.bolim} ${b.ustma}`}>
          <Sarlavha h={tr('Kim uchun?', 'Для кого?')} />
          <div className={b.kimlar}>
            {([
              ['Endi boshlayotganlar', 'Nima sotishni bilmaysizmi? Yoʻnalish va tovarni Uzum bazasidan, raqamlar bilan tanlaymiz.',
                'Новичкам', 'Не знаете, что продавать? Подберём направление и товар по базе Uzum, с цифрами.'],
              ['Uzumda sotayotganlar', 'Yangi tovar va tannarxni tekshiring: 8 ta tuzoq-filtr, chegara narx bilan.',
                'Продавцам Uzum', 'Проверьте новый товар и себестоимость: 8 фильтров-ловушек и предельная цена.'],
              ['Importchilar', 'Xitoydan zavod va narx: rasm boʻyicha, soʻmda, chegara narx bilan solishtirib.',
                'Импортёрам', 'Фабрика и цена в Китае: по фото, в сумах, в сравнении с предельной ценой.'],
              ['Qoʻshimcha daromad izlayotganlar', 'Byudjetingizdan boshlaymiz. Har qadamda raqam, qaror sizniki.',
                'Ищущим доп. доход', 'Начнём с вашего бюджета. На каждом шаге — цифры, решение за вами.'],
            ] as const).map(([nUz, mUz, nRu, mRu], n) => (
              <div key={nUz} className={`${b.rv} ${b.lift} ${b.kim} ${n % 2 ? b.kimToq : ''}`}>
                <div className={b.kimNom}>{tr(nUz, nRu)}</div>
                <p className={b.kimMatn}>{tr(mUz, mRu)}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="narx" className={`${b.ichi} ${b.bolim} ${b.ustma}`}>
          <Sarlavha h={tr('Narx', 'Цена')} p={tr('Boshlash bepul. Davom etasiz — toʻliq yoʻl pullik tarifda.', 'Начать бесплатно. Дальше — полный путь на платном тарифе.')} />
          <div className={b.tariflar}>
            <div className={`${b.rv} ${b.lift} ${b.tarif}`}>
              <div>
                <div className={b.tarifYorliq}>{tr('Boshlash', 'Старт')}</div>
                <div className={b.bepul}>{tr('Bepul', 'Бесплатно')}</div>
              </div>
              <div className={b.belgilar12}>
                <Belgili>{tr('Yordamchi bilan tanishuv', 'Знакомство с помощником')}</Belgili>
                <Belgili>{tr('Yoʻnalish boʻyicha dastlabki maslahat', 'Первый совет по направлению')}</Belgili>
                <Belgili>{tr('Umumiy savollarga javob', 'Ответы на общие вопросы')}</Belgili>
              </div>
              <div><Havola className={`${b.tugma} ${b.tugmaOch} ${b.tugma56}`} href="/usta">{tr('Bepul boshlash', 'Начать бесплатно')}<Strelka /></Havola></div>
            </div>
            <div className={`${b.rv} ${b.lift} ${b.grad} ${b.tarif} ${b.tarifQora}`}>
              <div>
                <div className={b.tarifYorliqOch}>{tr('Toʻliq yoʻl', 'Полный путь')}</div>
                <div className={b.pullik}>{tr('Pullik tarif', 'Платный тариф')}</div>
                <div className={b.tarifIzoh}>{tr('Narx tez orada eʼlon qilinadi.', 'Цена будет объявлена скоро.')}</div>
              </div>
              <div className={b.ochBelgilar}>
                {[
                  tr('12 qadamning hammasi', 'Все 12 шагов'),
                  tr('Uzum bazasi tahlili, 8 ta tuzoq-filtr', 'Анализ базы Uzum, 8 фильтров-ловушек'),
                  tr('Tannarx va foyda hisobi', 'Расчёт себестоимости и прибыли'),
                  tr('Xitoydan zavod topish', 'Поиск фабрики в Китае'),
                ].map((m) => (
                  <div key={m} className={b.ochBelgi}>
                    <Chiz o={20} rang="#CDA9DE" q={2.6} className={b.flexNone}><path d="M5 12l5 5L20 7" /></Chiz>{m}
                  </div>
                ))}
              </div>
              <div><Havola className={`${b.tugma} ${b.tugmaOq} ${b.tugma56}`} href="/usta">{boshlash}<Strelka /></Havola></div>
            </div>
          </div>
        </section>

        <section id="savol" className={`${b.ichi} ${b.bolim} ${b.savollarBolim}`}>
          <Sarlavha h={tr('Savollar', 'Вопросы')} />
          <div className={b.savollar}>
            {([
              ['ZumSavdo nima qiladi?', 'Uzumda savdo qilishning butun yoʻlida yoningizda boʻladi: nima sotishni tanlashdan tortib, tovarni Xitoydan topish, olib kelish va Uzumda sotishgacha.',
                'Что делает ZumSavdo?', 'Помогает на всём пути продаж на Uzum: от выбора, что продавать, до поиска товара в Китае, доставки и продаж на Uzum.'],
              ['Bu bepulmi?', 'Boshlash bepul. Toʻliq yoʻl pullik tarifda.',
                'Это бесплатно?', 'Начать бесплатно. Полный путь — на платном тарифе.'],
              ['Raqamim nima uchun kerak?', 'Faqat siz bilan bogʻlanish uchun. Boshqa hech kimga berilmaydi.',
                'Зачем мой номер?', 'Только чтобы связаться с вами. Никому не передаётся.'],
              ['Raqamlar qayerdan olinadi?', 'Uzum bazasidan, 8 ta tuzoq-filtr bilan. Har qator manbasi bilan koʻrsatiladi.',
                'Откуда цифры?', 'Из базы Uzum, с 8 фильтрами-ловушками. У каждой строки указан источник.'],
              ['Qaror kimniki?', 'Sizniki. Yordamchi tavsiya beradi va hisoblaydi, tanlov har doim sizda.',
                'Кто принимает решение?', 'Вы. Помощник советует и считает, выбор всегда за вами.'],
            ] as const).map(([sUz, jUz, sRu, jRu]) => (
              <div key={sUz} className={b.savol}>
                <div className={b.savolMatn}>{tr(sUz, sRu)}</div>
                <p className={b.javob}>{tr(jUz, jRu)}</p>
              </div>
            ))}
          </div>
        </section>

        <div className={`${b.ichi} ${b.ctaJoy}`}>
          <section className={`${b.rv} ${b.grad} ${b.cta}`}>
            <div className={b.ctaChap}>
              <h2 className={b.ctaSarlavha}>{tr('Birinchi tovaringizni bugun toping.', 'Найдите свой первый товар сегодня.')}</h2>
              <p className={b.ctaMatn}>
                {tr(
                  'Bir necha oddiy savol: tajribangiz, qiziqishingiz va byudjetingiz. Boshlash bepul.',
                  'Несколько простых вопросов: опыт, интересы и бюджет. Начать бесплатно.',
                )}
              </p>
            </div>
            <Havola className={`${b.tugma} ${b.tugmaOq} ${b.tugma64}`} href="/usta">{boshlash}<Strelka /></Havola>
          </section>
        </div>
      </main>

      <footer className={b.pastki}>
        <div className={`${b.ichi} ${b.pastkiIchi}`}>
          <div className={b.pastkiLogo}>
            <span className={b.pastkiNishon} aria-hidden="true">Z</span>
            <span>ZumSavdo</span>
          </div>
          <Havola href="/maxfiylik">{tr('Maxfiylik siyosati', 'Политика конфиденциальности')}</Havola>
          <span>{tr('Qaror har doim sizniki.', 'Решение всегда за вами.')}</span>
        </div>
      </footer>
      {/* «Savol bering» — har sahifada AI yordamchi (nazoratchi, 2026-10-19). */}
      <Yordamchi sahifa="bosh" til={til} />
    </div>
  );
}

/**
 * Qidiruv qutisidagi «yozilayotgan» misol: harf-harf yoziladi, 1,8 s
 * turadi, oʻchadi, keyingisi. Birinchi chizishda (va harakat oʻchiq
 * boʻlsa doim) — birinchi misol toʻliq, jim.
 */
function useYozuv(misollar: readonly string[]): string {
  const [matn, setMatn] = useState(misollar[0] ?? '');
  useEffect(() => {
    setMatn(misollar[0] ?? '');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let pi = 0;
    let ci = misollar[0]?.length ?? 0;
    let ochir = true;
    let t = 0;
    const qadam = () => {
      const m = misollar[pi] ?? '';
      ci += ochir ? -1 : 1;
      setMatn(m.slice(0, ci));
      let kut = ochir ? 28 : 55;
      if (!ochir && ci === m.length) { ochir = true; kut = 1800; }
      else if (ochir && ci <= 0) { ochir = false; pi = (pi + 1) % misollar.length; kut = 300; }
      t = window.setTimeout(qadam, kut);
    };
    t = window.setTimeout(qadam, 1800);
    return () => clearTimeout(t);
  }, [misollar]);
  return matn;
}

function QadamBlok({ tr, til, bosh, nom, izoh }: { tr: Tr; til: Til; bosh: number; nom: string; izoh: string }) {
  return (
    <div className={`${b.rv} ${b.lift} ${b.ochKarta} ${b.qadamBlok}`}>
      <div className={b.blokNom}>{nom}</div>
      <div className={b.blokIzoh}>{izoh}</div>
      <ol className={b.qadamlar}>
        {SUHBAT_QADAMLARI.slice(bosh, bosh + 6).map((q) => {
          const [iUz, iRu] = IZOH[q.n - 1] ?? ['', ''];
          return (
            <li key={q.n} className={b.qadam}>
              <span className={b.qadamRaqam}>{q.n}</span>
              <div className={b.qadamMatn}>
                <div className={b.qadamNom}>{til === 'ru' ? q.ru : q.nom}</div>
                <div className={b.qadamIzoh}>{tr(iUz, iRu)}</div>
              </div>
              {q.qurilgan
                ? <span className={`${b.holat} ${b.holatBor}`}>{tr('ishlaydi', 'работает')}</span>
                : <span className={b.holat}>{tr('tez orada', 'скоро')}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Sarlavha({ h, p }: { h: string; p?: string }) {
  return (
    <div className={`${b.rv} ${b.sarlavha}`}>
      <h2 className={b.h2}>{h}</h2>
      {p && <p className={b.h2Matn}>{p}</p>}
    </div>
  );
}

function Belgili({ children }: { children: ReactNode }) {
  return (
    <div className={b.belgili}>
      <span className={b.belgiQuti}><Chiz o={14} rang="#fff" q={3}><path d="M5 12l5 5L20 7" /></Chiz></span>
      {children}
    </div>
  );
}

function Misol({ tr, oq = false }: { tr: Tr; oq?: boolean }) {
  return <span className={oq ? b.misolOq : b.misol}>{tr('misol', 'пример')}</span>;
}

function IkonQuti({ children }: { children: ReactNode }) {
  return <div className={`${b.ikonQuti} ${b.float}`}><Chiz o={30} rang="#fff" q={2}>{children}</Chiz></div>;
}

function Strelka() {
  return <Chiz o={18} rang="currentColor" q={2.4}><path d="M5 12h14M13 6l6 6-6 6" /></Chiz>;
}

/** Dizayndagi chiziqli SVG (24×24). */
function Chiz({ o, rang, q, className, children }: { o: number; rang: string; q: number; className?: string | undefined; children: ReactNode }) {
  return (
    <svg width={o} height={o} viewBox="0 0 24 24" fill="none" stroke={rang} strokeWidth={q} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}
