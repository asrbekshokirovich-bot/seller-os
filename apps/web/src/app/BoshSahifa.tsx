'use client';

/**
 * Bosh sahifa — `dizayn/ZumSavdo-Landing.html` (siyohrang, Manrope;
 * nazoratchi 2026-10-21). Oʻlcham, rang va matn dizayndagi inline
 * uslubdan aynan; oʻrniga CSS modul (`bosh.module.css`).
 *
 * BIRINCHI MARTA KIRGAN ODAM UCHUN (nazoratchi, 2026-10-28: «hammasini
 * qil, narx koʻrinsin, hisoblagich qoʻy»). Birinchi kirgan odam uch
 * narsani tez bilishi kerak: bu nima, menga nima beradi, qancha turadi.
 *   1. Tepada chatning birinchi 2 savoli (soha va pul) — shu yerning
 *      oʻzida. Javob chatga birinchi xabar boʻlib ketadi (`BoshSavol`,
 *      `lib/bosh-xabar.ts`). Ilgari qidiruv qutisi yozilmaydigan havola edi.
 *   2. «Misol foyda» (oʻylab topilgan +9,0 mln) oʻrniga bugungi bazadan
 *      3 ta haqiqiy yoʻnalish (`/bosh-namuna`); olinmasa — halol izoh.
 *   3. Narx: tarif cheklovi oʻchiq boʻlsa — «Hozir hammasi bepul»; Pro
 *      narxi (`OBUNA_NARXI`) va doim bepul qadamlar (`REJA_QADAMI`) koddan.
 *   4. Matnlar chatga mos; «Kirish» oʻrniga «Boshlash» (qaytgan odamga —
 *      «Davom etish»); UZ | RU tugmasi.
 *   5. 12 qadam oʻrniga «Bugun nima olasiz» — qolgan qadamlar yigʻiq.
 *   6. Ismsiz hisoblagich (`lib/hisob.ts`, 0076).
 *
 * DIZAYNDAN FARQ — ataylab, halollik uchun: 12 qadam holati `SUHBAT_QADAMLARI.qurilgan`
 * dan; jonli son (kuzatilayotgan tovarlar) — bazadan, sanasi bilan, olinmasa —
 * chiziqcha (QOIDALAR.md, 4-boʻlim); pastki qatorda «Maxfiylik siyosati».
 *
 * Mavzu — faqat yorugʻ (dizaynda tungi nusxa yoʻq).
 */

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import {
  BILMAYMAN, BYUDJET_TUGMALARI, OBUNA_NARXI, REJA_QADAMI, SAVDO_SOHALARI, SUHBAT_QADAMLARI,
  type BoshNamuna, type NamunaYonalish, type SohaId,
} from '@selleros/shared';
import { son } from '@/lib/bazamiz';
import { boshXabarMatni, boshXabarniSaqla, pulMatni } from '@/lib/bosh-xabar';
import { birMarta, sinovniOqi } from '@/lib/hisob';
import { hashBilan, useKengaytmaHashi } from '@/lib/kengaytma';
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

/** Hero tugmalaridagi qisqa soha nomi; chatga toʻliq nomi ketadi (`boshXabarMatni`). */
const SOHA_QISQA: Readonly<Record<SohaId, readonly [string, string]>> = {
  kiyim: ['Kiyim, poyabzal', 'Одежда, обувь'],
  gozallik: ['Goʻzallik', 'Красота'],
  uy: ['Uy-roʻzgʻor', 'Дом, техника'],
  bolalar: ['Bolalar', 'Детское'],
  elektronika: ['Elektronika', 'Электроника'],
  kanstovar: ['Kanstovar', 'Канцтовары'],
  aksessuar: ['Aksessuar', 'Аксессуары'],
  sport: ['Sport', 'Спорт'],
  avto: ['Avto', 'Авто'],
};

/** «Bugun nima olasiz» — 2–5-qadam natijalari; `vaqt` — birinchi natija qancha vaqtda. */
const OLISH: readonly (readonly [string, string, string, string, boolean])[] = [
  ['Yoʻnalishlar', 'Sohangiz va pulingizga mos — bazadagi raqamlar va Uzumdagi rasmlari bilan.',
    'Направления', 'Под вашу сферу и бюджет — с цифрами из базы и фото с Uzum.', true],
  ['Tovar va nechta olish', 'Uzumda qancha sotilayotganiga qarab; sotilmaydiganlari chiqarib tashlanadi.',
    'Товар и сколько брать', 'По тому, сколько продаётся на Uzum; неходовые отсеиваются.', false],
  ['Tannarx va Xitoydagi narx', 'Kargo, bojxona va Uzum ulushi bilan, soʻmda; Xitoydagi zavodlar — rasm boʻyicha.',
    'Себестоимость и цена в Китае', 'С карго, таможней и долей Uzum, в сумах; фабрики в Китае — по фото.', false],
];

/** Imkoniyat kartasidagi misol (dizayndagi): Xitoyda 36 700, Uzumda 89 000 soʻm. Kartada «misol» deb yozilgan. */
const MISOL = { sotuv: 89_000, tannarx: 36_700 } as const;

/** Misol zavodlar: [shahar, harf, narx soʻmda]. */
const ZAVODLAR = [['Yiwu', 'A', 36_700], ['Guangzhou', 'B', 38_200], ['Shenzhen', 'C', 41_500]] as const;

export default function BoshSahifa({ tovar, holat, holatRu, til: boshTil, namuna, cheklov, qaytgan }: {
  tovar: number | null; holat: string; holatRu: string; til: Til;
  /** Bugungi namuna yoʻnalishlar; olinmagan — `null`. */
  namuna: BoshNamuna | null;
  /** Tarif cheklovi yoqilganmi; bilinmasa — `null` (ikkala holatda ham rost matn). */
  cheklov: boolean | null;
  /** Bu brauzerda chat oldin ochilgan (sessiya cookie si bor). */
  qaytgan: boolean;
}) {
  const [til, tilniTanla] = useTil(boshTil);
  const tr = tarjima(til);
  const ildiz = useRef<HTMLDivElement>(null);

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

  /* Hisoblagich: sahifa ochildi (shu varaqda bir marta). Sinovchi brauzeri — `?sinov=1`. */
  useEffect(() => {
    sinovniOqi(window.location.search);
    birMarta('bosh_ochildi');
  }, []);

  /** Chatga oʻtish — hisoblagichda «boshladi». */
  const boshladi = () => birMarta('bosh_boshladi');
  const boshlash = qaytgan ? tr('Suhbatni davom ettirish', 'Продолжить чат') : tr('Suhbatni boshlash', 'Начать чат');
  const bepulQadam = REJA_QADAMI.bepul;
  const keyingiQadamlar = SUHBAT_QADAMLARI.slice(bepulQadam);

  return (
    <div ref={ildiz} className={`zs-mavzu ${b.sahifa}`} data-til={til}>
      <header className={b.nav}>
        <div className={`${b.ichi} ${b.navIchi}`}>
          <Havola className={b.logo} href="/" aria-label="ZumSavdo">
            <span className={b.nishon} aria-hidden="true">Z</span>
            <span className={b.logoMatn}>ZumSavdo</span>
          </Havola>
          <nav className={b.navOng} aria-label={tr('Asosiy', 'Главное')}>
            <Havola className={b.navHavola} href="#natija">{tr('Namuna', 'Пример')}</Havola>
            <Havola className={b.navHavola} href="#yol">{tr('Nima olasiz', 'Что получите')}</Havola>
            <Havola className={b.navHavola} href="#narx">{tr('Narx', 'Цена')}</Havola>
            <Havola className={b.navHavola} href="#savol">{tr('Savollar', 'Вопросы')}</Havola>
            <TilTanlov til={til} tanla={tilniTanla} tr={tr} className={b.tilNav} />
            <Havola className={b.kirish} href="/usta" onClick={boshladi}>
              {qaytgan ? tr('Davom etish', 'Продолжить') : tr('Boshlash', 'Начать')}
            </Havola>
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
                <div className={b.heroTepa}>
                  <span className={b.bepulTeg}>
                    {cheklov === false ? tr('Hozir hammasi bepul', 'Сейчас всё бесплатно') : tr('Boshlash bepul', 'Начать бесплатно')}
                  </span>
                  {/* Telefonda tepadagi panelga sigʻmaydi — til shu yerda. */}
                  <TilTanlov til={til} tanla={tilniTanla} tr={tr} className={b.tilHero} />
                </div>
                <h1 className={b.h1}>
                  {til === 'ru'
                    ? <>Не знаете, что продавать? <span className={b.urgu}>2 вопроса</span> — и направления готовы.</>
                    : <>Nima sotishni bilmaysizmi? <span className={b.urgu}>2 ta savol</span> — yoʻnalishlar tayyor.</>}
                </h1>
                <p className={b.lead}>
                  {tr(
                    'Uzum bazasidan tovar, Xitoydan zavod, soʻmda tannarx. Ikki savolga javob bering — mos yoʻnalishlarni raqamlari bilan koʻrasiz.',
                    'Товар из базы Uzum, фабрика в Китае, себестоимость в сумах. Ответьте на два вопроса — увидите подходящие направления с цифрами.',
                  )}
                </p>
              </div>
              <div className={b.heroOng}>
                <BoshSavol til={til} tr={tr} />
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
                h={tr('Raqamlar — bugungi Uzum bazasidan.', 'Цифры — из сегодняшней базы Uzum.')}
                p={tr(
                  `Mana namuna: ${pulMatni(namuna?.byudjet ?? 30_000_000, 'uz')} bilan boshlaganda bugun turli sohalardagi eng yuqori baholangan yoʻnalishlar. Sizga moslarini chat sohangiz va pulingiz bilan topadi.`,
                  `Вот пример: направления с лучшей оценкой в разных сферах сегодня при старте с ${pulMatni(namuna?.byudjet ?? 30_000_000, 'ru')}. Подходящие именно вам чат подберёт по вашей сфере и бюджету.`,
                )}
              />
              <div className={b.belgilar}>
                <Belgili>{tr('Har yoʻnalishda — sotuvchilar soni va katta doʻkonlar ulushi', 'В каждом направлении — число продавцов и доля крупных магазинов')}</Belgili>
                <Belgili>{tr('Tannarx soʻmda: kargo, bojxona va Uzum ulushi bilan', 'Себестоимость в сумах: с карго, таможней и долей Uzum')}</Belgili>
                <Belgili>{tr('Xitoydagi zavod narxlari — rasm boʻyicha', 'Цены фабрик в Китае — по фото')}</Belgili>
              </div>
              <div>
                <Havola className={`${b.tugma} ${b.tugmaGrad} ${b.tugma60} ${b.pulse} ${b.shine}`} href="/usta" onClick={boshladi}>
                  {tr('Oʻz yoʻnalishimni topish', 'Найти своё направление')}<Strelka />
                </Havola>
              </div>
            </div>

            <div className={`${b.rv} ${b.grad} ${b.namuna}`}>
              <span className={`${b.orb} ${b.orb4}`} aria-hidden="true" />
              <span className={`${b.orb} ${b.orb5}`} aria-hidden="true" />
              {namuna ? (
                <>
                  <div className={b.namunaBosh}>
                    <span>{tr(`Bugun bazada · ${pulMatni(namuna.byudjet, 'uz')} bilan`, `Сегодня в базе · с ${pulMatni(namuna.byudjet, 'ru')}`)}</span>
                    {namuna.hisoblandi && <span>{sanaMatni(namuna.hisoblandi)}</span>}
                  </div>
                  {namuna.royxat.map((y, i) => <NamunaKarta key={y.categoryId} y={y} i={i} tr={tr} />)}
                  <p className={b.namunaIzoh}>
                    {tr(
                      'Uzum bazasi, har kuni yangilanadi. Foyda vaʼda qilinmaydi — hisobini chatda, oʻz narxingiz bilan qilamiz.',
                      'База Uzum, обновляется каждый день. Прибыль не обещаем — считаем в чате, по вашим ценам.',
                    )}
                    {namuna.kesh_eskirgan && tr(' Raqamlar kechagi.', ' Цифры вчерашние.')}
                  </p>
                </>
              ) : (
                <div className={b.oqKarta}>
                  <div className={b.tovarNom}>{tr('Bugungi namuna hozir yuklanmadi.', 'Сегодняшний пример сейчас не загрузился.')}</div>
                  <p className={b.oqKartaMatn}>
                    {tr('Yoʻnalishlarni chatda koʻrasiz — raqamlari bilan.', 'Направления увидите в чате — с цифрами.')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className={b.yolFon}>
          <section id="yol" className={`${b.ichi} ${b.yolBolim}`}>
            <Sarlavha
              h={tr('Bugun nima olasiz', 'Что вы получите сегодня')}
              p={tr('Bitta suhbatda, oddiy tilda. Har raqam yonida — qayerdan olingani.', 'В одном чате, простым языком. У каждой цифры — источник.')}
            />
            <ol className={b.olish}>
              {OLISH.map(([nUz, iUz, nRu, iRu, tez], n) => (
                <li key={nUz} className={`${b.rv} ${b.lift} ${b.ochKarta} ${b.olishKarta}`}>
                  <span className={b.qadamRaqam}>{n + 1}</span>
                  <div className={b.qadamMatn}>
                    <div className={b.olishNom}>
                      {tr(nUz, nRu)}
                      {tez && <span className={b.vaqtChip}>{tr('1 daqiqada', 'за минуту')}</span>}
                    </div>
                    <p className={b.olishIzoh}>{tr(iUz, iRu)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <details className={`${b.rv} ${b.ochKarta} ${b.keyin}`}>
              <summary className={b.keyinBosh}>
                {tr(
                  `Keyin yana ${keyingiQadamlar.length} qadam: buyurtma, bojxona, Uzumga yuklash, sotuv va hisobot`,
                  `Дальше ещё ${keyingiQadamlar.length} ${ruShakl(keyingiQadamlar.length, ['шаг', 'шага', 'шагов'])}: заказ, таможня, загрузка на Uzum, продажи и отчёт`,
                )}
              </summary>
              <ol className={b.qadamlar}>
                {keyingiQadamlar.map((q) => {
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
            </details>
          </section>
        </div>

        <section className={`${b.ichi} ${b.bolim} ${b.ustma}`}>
          <Sarlavha h={tr('Kim uchun?', 'Для кого?')} />
          <div className={b.kimlar}>
            {([
              ['Endi boshlayotganlar', 'Nima sotishni bilmaysizmi? Yoʻnalish va tovarni Uzum bazasidagi raqamlar bilan tanlaymiz.',
                'Новичкам', 'Не знаете, что продавать? Подберём направление и товар по цифрам из базы Uzum.'],
              ['Uzumda sotayotganlar', 'Yangi tovarni tekshiring: sotilmaydigan va xavfli tovarlar oldindan chiqarib tashlanadi, tannarx soʻmda.',
                'Продавцам Uzum', 'Проверьте новый товар: неходовые и рискованные отсеиваются заранее, себестоимость в сумах.'],
              ['Importchilar', 'Xitoydan zavod va narx: rasm boʻyicha, soʻmda, Uzumdagi narx bilan solishtirib.',
                'Импортёрам', 'Фабрика и цена в Китае: по фото, в сумах, в сравнении с ценой на Uzum.'],
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
          <Sarlavha
            h={tr('Narx', 'Цена')}
            p={cheklov === false
              ? tr('Hozir hammasi bepul: karta ham, toʻlov ham soʻralmaydi.', 'Сейчас всё бесплатно: ни карта, ни оплата не нужны.')
              : cheklov === true
                ? tr(`1–${bepulQadam} qadam doim bepul. Keyingilari — Pro tarifda.`, `Шаги 1–${bepulQadam} всегда бесплатны. Дальше — тариф Pro.`)
                : tr(`1–${bepulQadam} qadam doim bepul.`, `Шаги 1–${bepulQadam} всегда бесплатны.`)}
          />
          <div className={b.tariflar}>
            <div className={`${b.rv} ${b.lift} ${b.grad} ${b.tarif} ${b.tarifQora}`}>
              <div>
                <div className={b.tarifYorliqOch}>{cheklov === false ? tr('Hozir', 'Сейчас') : tr('Bepul', 'Бесплатно')}</div>
                <div className={b.pullik}>{cheklov === false ? tr('Hammasi bepul', 'Всё бесплатно') : tr(`1–${bepulQadam} qadam`, `Шаги 1–${bepulQadam}`)}</div>
                <div className={b.tarifIzoh}>
                  {cheklov === false
                    ? tr('12 qadamning hammasi ochiq. Karta ham, toʻlov ham soʻralmaydi.', 'Открыты все 12 шагов. Ни карта, ни оплата не нужны.')
                    : tr('Yoʻnalish, tovar, tannarx va Xitoydagi narxlar — doim bepul.', 'Направление, товар, себестоимость и цены в Китае — всегда бесплатно.')}
                </div>
              </div>
              <div className={b.ochBelgilar}>
                {(cheklov === false
                  ? [
                    tr('Yoʻnalish va tovar', 'Направление и товар'),
                    tr('Tannarx: kargo, bojxona va Uzum ulushi bilan', 'Себестоимость: с карго, таможней и долей Uzum'),
                    tr('Xitoydagi zavod narxlari', 'Цены фабрик в Китае'),
                    tr('Buyurtmadan Uzumda sotuvgacha', 'От заказа до продаж на Uzum'),
                  ]
                  : [
                    tr('Yoʻnalish va tovar', 'Направление и товар'),
                    tr('Tannarx: kargo, bojxona va Uzum ulushi bilan', 'Себестоимость: с карго, таможней и долей Uzum'),
                    tr('Xitoydagi zavod narxlari', 'Цены фабрик в Китае'),
                  ]).map((m) => (
                  <div key={m} className={b.ochBelgi}>
                    <Chiz o={20} rang="#CDA9DE" q={2.6} className={b.flexNone}><path d="M5 12l5 5L20 7" /></Chiz>{m}
                  </div>
                ))}
              </div>
              <div>
                <Havola className={`${b.tugma} ${b.tugmaOq} ${b.tugma56}`} href="/usta" onClick={boshladi}>
                  {tr('Bepul boshlash', 'Начать бесплатно')}<Strelka />
                </Havola>
              </div>
            </div>
            <div className={`${b.rv} ${b.lift} ${b.tarif}`}>
              <div>
                <div className={b.tarifYorliq}>{cheklov === false ? tr('Keyinchalik · Pro', 'Позже · Pro') : 'Pro'}</div>
                <div className={b.narxKatta}>{son(OBUNA_NARXI)} <span>{tr('soʻm / oy', 'сум / мес')}</span></div>
                <div className={b.tarifIzohXira}>
                  {cheklov === false
                    ? tr(`Pro tarif yoqilganda ham 1–${bepulQadam} qadam bepul qoladi.`, `И после включения Pro шаги 1–${bepulQadam} останутся бесплатными.`)
                    : tr(`${bepulQadam + 1}–12 qadam: buyurtmadan hisobotgacha.`, `Шаги ${bepulQadam + 1}–12: от заказа до отчёта.`)}
                </div>
              </div>
              <div className={b.belgilar12}>
                <Belgili>{tr('Buyurtma va kargo', 'Заказ и карго')}</Belgili>
                <Belgili>{tr('Bojxona va qabul', 'Таможня и приёмка')}</Belgili>
                <Belgili>{tr('Surat, kartochka va Uzumga yuklash', 'Фото, карточка и загрузка на Uzum')}</Belgili>
                <Belgili>{tr('Sotuv kuzatuvi va oylik hisobot', 'Отслеживание продаж и отчёт за месяц')}</Belgili>
              </div>
            </div>
          </div>
        </section>

        <section id="savol" className={`${b.ichi} ${b.bolim} ${b.savollarBolim}`}>
          <Sarlavha h={tr('Savollar', 'Вопросы')} />
          <div className={b.savollar}>
            {([
              ['ZumSavdo nima qiladi?', 'Uzumda savdo qilishning butun yoʻlida yoningizda boʻladi: nima sotishni tanlashdan tortib, tovarni Xitoydan topish, olib kelish va Uzumda sotishgacha.',
                'Что делает ZumSavdo?', 'Помогает на всём пути продаж на Uzum: от выбора, что продавать, до поиска товара в Китае, доставки и продаж на Uzum.'],
              ['Roʻyxatdan oʻtish kerakmi?', 'Yoʻq. Email ham, parol ham soʻralmaydi: chatni ochasiz va darhol boshlaysiz.',
                'Нужна регистрация?', 'Нет. Ни email, ни пароль не нужны: открываете чат и сразу начинаете.'],
              ['Bu bepulmi?', cheklov === false
                ? `Hozir hamma qadamlar bepul. Pro tarif yoqilganda ham 1–${bepulQadam} qadam bepul qoladi: yoʻnalish, tovar, tannarx va Xitoydagi narxlar.`
                : `1–${bepulQadam} qadam doim bepul: yoʻnalish, tovar, tannarx va Xitoydagi narxlar. Pro tarif — ${son(OBUNA_NARXI)} soʻm / oy.`,
              'Это бесплатно?', cheklov === false
                ? `Сейчас все шаги бесплатны. И после включения Pro шаги 1–${bepulQadam} останутся бесплатными: направление, товар, себестоимость и цены в Китае.`
                : `Шаги 1–${bepulQadam} всегда бесплатны: направление, товар, себестоимость и цены в Китае. Тариф Pro — ${son(OBUNA_NARXI)} сум / мес.`],
              ['Raqamim nima uchun kerak?', 'Birinchi natijani raqamsiz koʻrasiz. Raqam yoʻnalish tanlangach soʻraladi — natijangizni saqlash va siz bilan bogʻlanish uchun. Boshqa hech kimga berilmaydi.',
                'Зачем мой номер?', 'Первый результат вы увидите без номера. Номер спрашиваем после выбора направления — чтобы сохранить результат и связаться с вами. Никому не передаётся.'],
              ['Raqamlar qayerdan olinadi?', 'Uzumning ochiq sahifalaridan, har kuni oʻlchanadi. Sotilmaydigan va xavfli tovarlar oldindan chiqarib tashlanadi. Har raqam yonida qayerdan olingani yozilgan.',
                'Откуда цифры?', 'С открытых страниц Uzum, измеряем каждый день. Неходовые и рискованные товары отсеиваются заранее. У каждой цифры указан источник.'],
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
                  'Ikki savol: qaysi soha va qancha pul. Birinchi natija bir daqiqada.',
                  'Два вопроса: какая сфера и сколько денег. Первый результат — за минуту.',
                )}
              </p>
            </div>
            <Havola className={`${b.tugma} ${b.tugmaOq} ${b.tugma64}`} href="/usta" onClick={boshladi}>{boshlash}<Strelka /></Havola>
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
 * Tepadagi 2 savol (nazoratchi, 2026-10-28; 1-taklif): chatning birinchi ikki savoli — qaysi
 * soha va qancha pul — shu yerning oʻzida, variantlari chatdagidek (`SAVDO_SOHALARI` +
 * «Bilmayman», `BYUDJET_TUGMALARI`). «Yoʻnalishlarni koʻrish» — matn varaq xotirasiga, chat
 * ochiladi va u bilan boshlanadi (`lib/bosh-xabar.ts`). Oʻzi yozsa ham boʻladi — AI tushunadi.
 */
function BoshSavol({ til, tr }: { til: Til; tr: Tr }) {
  const [sohalar, setSohalar] = useState<string[]>([]);
  const [pul, setPul] = useState<number | null>(null);
  const [ozi, setOzi] = useState('');
  const [ketdi, setKetdi] = useState(false);
  const hash = useKengaytmaHashi();
  const matn = boshXabarMatni(sohalar, pul, ozi, til);

  // «Bilmayman» boshqa sohalar bilan birga tanlanmaydi (chatdagidek).
  const sohaBos = (id: string) => setSohalar((s) => (id === BILMAYMAN
    ? (s.includes(BILMAYMAN) ? [] : [BILMAYMAN])
    : s.includes(id) ? s.filter((x) => x !== id) : [...s.filter((x) => x !== BILMAYMAN), id]));

  function yubor(e: FormEvent) {
    e.preventDefault();
    if (!matn || ketdi) return;
    setKetdi(true);
    boshXabarniSaqla(matn);
    birMarta('bosh_boshladi');
    window.location.assign(hashBilan('/usta', hash));
  }

  return (
    <form className={b.savolKarta} onSubmit={yubor} aria-label={tr('Yoʻnalish topish', 'Подбор направления')}>
      <fieldset className={b.savolGuruh}>
        <legend className={b.savolNom}>{tr('Qaysi soha sizga yaqin?', 'Какая сфера вам ближе?')}</legend>
        <div className={b.tanlovlar}>
          {SAVDO_SOHALARI.map((s) => (
            <button key={s.id} type="button" className={b.tanlov} aria-pressed={sohalar.includes(s.id)} onClick={() => sohaBos(s.id)}>
              {tr(...SOHA_QISQA[s.id])}
            </button>
          ))}
          <button type="button" className={b.tanlov} aria-pressed={sohalar.includes(BILMAYMAN)} onClick={() => sohaBos(BILMAYMAN)}>
            {tr('Bilmayman', 'Не знаю')}
          </button>
        </div>
      </fieldset>
      <fieldset className={b.savolGuruh}>
        <legend className={b.savolNom}>{tr('Qancha pul bilan boshlaysiz?', 'С какой суммы начнёте?')}</legend>
        <div className={b.tanlovlar}>
          {BYUDJET_TUGMALARI.map((v) => {
            const n = Number(v.qiymat);
            return (
              <button key={n} type="button" className={b.tanlov} aria-pressed={pul === n} onClick={() => setPul((p) => (p === n ? null : n))}>
                {pulMatni(n, til)}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className={b.yokiQator}>{tr('yoki oʻzingiz yozing', 'или напишите сами')}</div>
      <input
        className={b.yozMaydon}
        value={ozi}
        onChange={(e) => setOzi(e.target.value)}
        maxLength={300}
        enterKeyHint="go"
        aria-label={tr('Oʻzingiz yozing: soha va pul', 'Напишите сами: сфера и бюджет')}
        placeholder={tr('Masalan: idishlar, 20 mln', 'Например: посуда, 20 млн')}
      />
      <button type="submit" className={`${b.tugma} ${b.tugmaOq} ${b.korishTugma}`} disabled={!matn || ketdi}>
        {tr('Yoʻnalishlarni koʻrish', 'Показать направления')}<Strelka />
      </button>
      <p className={b.heroIzoh}>{tr('Roʻyxatdan oʻtish va telefon kerak emas.', 'Без регистрации и номера телефона.')}</p>
    </form>
  );
}

/** UZ | RU (nazoratchi, 2026-10-28): bosh sahifada ham til tanlanadi — tanlov chatga ham oʻtadi (`so_til`). */
function TilTanlov({ til, tanla, tr, className }: { til: Til; tanla: (t: Til) => void; tr: Tr; className: string | undefined }) {
  return (
    <div className={`${b.tilTanlov} ${className ?? ''}`} role="group" aria-label={tr('Til', 'Язык')}>
      {(['uz', 'ru'] as const).map((t) => (
        <button key={t} type="button" lang={t} aria-pressed={til === t} onClick={() => tanla(t)}>
          {t === 'uz' ? 'UZ' : 'RU'}
        </button>
      ))}
    </div>
  );
}

/** Bugungi namunadagi bitta yoʻnalish — chatdagi 2-qadam kartasining qisqasi. */
function NamunaKarta({ y, i, tr }: { y: NamunaYonalish; i: number; tr: Tr }) {
  const soha = SAVDO_SOHALARI.find((s) => s.id === y.soha);
  // Uzum CDN rasmi yuklanmasa — oʻsha rasm yashirinadi (chatdagidek).
  const [buzilgan, setBuzilgan] = useState<ReadonlySet<string>>(new Set());
  const rasmlar = y.rasmlar.filter((r) => !buzilgan.has(r.url));
  return (
    <div
      className={b.float}
      style={{ maxWidth: 400, ...(i === 1 ? { alignSelf: 'flex-end' } : {}), '--d': `${-1.5 * i}s`, '--r': ['-2deg', '2deg', '-1deg'][i % 3] } as CSSProperties}
    >
      <div className={b.oqKarta}>
        <div className={b.tovarQator}>
          <div className={b.tovarMatn}>
            <div className={b.tovarNom}>{y.name}</div>
            <div className={b.tovarTur}>{soha ? tr(soha.nom, soha.ru) : tr('Boshqa', 'Другое')}</div>
          </div>
          {y.ball !== null && <BallHalqa ball={y.ball} tr={tr} />}
        </div>
        {rasmlar.length > 0 && (
          <div className={b.tovarRasmlar}>
            {rasmlar.map((r) => (
              // Uzum CDN begona Referer bilan rasm bermaydi — `no-referrer` (chatdagidek).
              <img
                key={r.url} src={r.url} alt={r.nom} title={r.nom} width={48} height={48} loading="lazy" decoding="async"
                className={b.tovarRasm} referrerPolicy="no-referrer"
                onError={() => setBuzilgan((s) => new Set(s).add(r.url))}
              />
            ))}
          </div>
        )}
        <div className={b.chiplar14}>
          {y.sotuvchiSoni !== null && (
            <span className={b.binafChip}>
              {tr(`${son(y.sotuvchiSoni)} ta sotuvchi`, `${son(y.sotuvchiSoni)} ${ruShakl(y.sotuvchiSoni, ['продавец', 'продавца', 'продавцов'])}`)}
            </span>
          )}
          {y.top3Ulush !== null && (
            <span className={b.binafChip}>{tr(`3 ta katta doʻkon: ${y.top3Ulush} %`, `3 крупнейших магазина: ${y.top3Ulush} %`)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Imkoniyat bahosi halqasi (0–100). */
function BallHalqa({ ball, tr }: { ball: number; tr: Tr }) {
  const aylana = 2 * Math.PI * 26;
  const ulush = Math.max(0, Math.min(100, ball)) / 100;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={tr(`Imkoniyat bahosi: ${ball} / 100`, `Оценка возможности: ${ball} / 100`)} className={b.flexNone}>
      <circle cx="32" cy="32" r="26" fill="none" stroke="#EFE6F4" strokeWidth="8" />
      <circle
        cx="32" cy="32" r="26" fill="none" stroke="#4A2A57" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={aylana.toFixed(1)} strokeDashoffset={(aylana * (1 - ulush)).toFixed(1)} transform="rotate(-90 32 32)"
      />
      <text x="32" y="38" textAnchor="middle" fontFamily="Manrope" fontWeight="800" fontSize="18" fill="#2A1733">{ball}</text>
    </svg>
  );
}

/** ISO vaqt → Toshkent sanasi `28.10.2026`. */
function sanaMatni(iso: string): string {
  const q = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric' })
    .formatToParts(new Date(iso));
  const p = (nom: string) => q.find((x) => x.type === nom)?.value ?? '';
  return `${p('day')}.${p('month')}.${p('year')}`;
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
