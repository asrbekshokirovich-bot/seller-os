'use client';

/**
 * Usta — SUHBAT (ssenariy holat mashinasi ustida).
 *
 * Nazoratchi topshirigʻi (2026-09-25): ssenariy sunʼiy intellektga
 * joylashsin, bir vaqtda BITTA savol, javob kelgach keyingisi.
 *
 * BU SAHIFA HECH NARSANI HAL QILMAYDI. Qaysi savol keyin kelishini
 * server (`/suhbat`, `@selleros/shared` `ssenariy.ts`) aytadi; sahifa
 * faqat CHIZADI va JAVOBNI YUBORADI. Shuning uchun bu yerda savol
 * matni ham, tartib ham yoʻq — ular kelib tushadi. Bot va kengaytma
 * ham xuddi shu uchdan xizmat oladi, bitta manba.
 *
 * NIMA CHIZILADI:
 *   - `obunachi` — oʻng pufak (odam javobi)
 *   - `menejer`  — chap pufak (savol yoki "tez orada")
 *   - `kod`      — karta: yoʻnalishlar / tovarlar / chegara narx.
 *                  Raqamlar API dan; hech narsa bu yerda hisoblanmaydi.
 *
 * HALOLLIK (QOIDALAR.md, 4-boʻlim): "oʻlchov yoʻq" boʻlsa boʻsh karta
 * emas, sabab yoziladi. Tuzoq bayrogʻi yashirilmaydi. Yetishmagan
 * qism (`yetishmaydi`) koʻrsatiladi.
 *
 * YON PANELDA 12 QADAM — hammasi qurilgan (2026-09-30). Yoʻl 11 ↔ 12
 * oyma-oy aylanadi; qurilmagan qadam paydo boʻlsa "tez orada" deb chiqadi.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { oyNomi, REJA_QADAMI, STUDIYA_CHIQISH, SUHBAT_QADAMLARI, TARIF_NARXI, type Reja } from '@selleros/shared';
import { son, yosh } from '@/lib/bazamiz';
import { hashTokeni } from '@/lib/sessiya-sarlavha';
import { saqlanganTil, tarjima, tilniQoy, tilniSaqla, type Til, type Tr } from '@/lib/til';
import { faylBolagi, zipYasa } from '@/lib/zip';
import u from './usta.module.css';

/**
 * Kengaytma rejimi (0.2.0): sahifa Chrome yon panelidagi ramkada ochiladi,
 * cookie u yerda ishlamaydi — token manzil hash'ida keladi
 * (`#sessiya=…&kengaytma=1`, serverga ketmaydi) va har soʻrovga
 * `x-sessiya` sarlavhasi bilan qoʻshiladi. Oddiy saytda hash yoʻq —
 * sarlavha ham yoʻq, hammasi avvalgidek cookie bilan.
 */
function sessiyaSarlavhasi(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const t = hashTokeni(window.location.hash);
  return t ? { 'x-sessiya': t } : {};
}

/* ------------------------------------------------------ turlar (API shakli) */

interface Variant { qiymat: string | number; nom: string }

interface Savol {
  id: string;
  qadam: number;
  matn: string;
  turi: 'tanlov' | 'kopTanlov' | 'son' | 'matn';
  variantlar: Variant[];
  erkin: boolean;
  otkazishMumkin: boolean;
}

type Keyingi =
  | { tur: 'savol'; savol: Savol }
  | { tur: 'kod'; harakat: string; qadam: number }
  | { tur: 'kutish'; qadam: number; matn: string; boshlandi: string | null }
  | { tur: 'tezOrada'; qadam: number; nom: string; matn: string };

interface Xabar {
  rol: 'obunachi' | 'menejer' | 'kod';
  matn: string;
  savolId?: string;
  javob?: unknown;
  seq?: number;
}

interface SuhbatJavobi {
  xato?: string;
  xabarlar: Xabar[];
  keyingi: Keyingi;
  qadam: number;
  yozildi: boolean;
  tarix?: Xabar[];
}

interface BazaJavobi {
  olchov: { tovar: number | null; olchandi: string | null; yoshMs: number } | null;
}

type Mavzu = 'tungi' | 'yorug';

/* ------------------------------------------------------ sahifa */

export default function Suhbat() {
  const [xabarlar, setXabarlar] = useState<Xabar[]>([]);
  const [keyingi, setKeyingi] = useState<Keyingi | null>(null);
  const [qadam, setQadam] = useState(1);
  const [yuklandi, setYuklandi] = useState(false);
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  const [matn, setMatn] = useState('');
  const [tanlangan, setTanlangan] = useState<Array<string | number>>([]);

  const [mavzu, setMavzu] = useState<Mavzu>('tungi');
  const [til, setTil] = useState<Til>('uz');
  const [menyu, setMenyu] = useState(false);
  const [profilOchiq, setProfilOchiq] = useState(false);
  const tr = tarjima(til);
  const baza = useBaza();
  const oxiri = useRef<HTMLDivElement>(null);

  /** Javobni qabul qiladi: xabarlarni qoʻshadi, keyingini yangilaydi. */
  const qabul = useCallback((r: SuhbatJavobi, almashtir: boolean) => {
    if (r.tarix !== undefined) setXabarlar(r.tarix);
    else if (r.xabarlar.length) setXabarlar((eski) => (almashtir ? r.xabarlar : [...eski, ...r.xabarlar]));
    setKeyingi(r.keyingi);
    setQadam(r.qadam);
    setXato(r.xato && r.xabarlar.length === 0 && r.tarix === undefined ? r.xato : null);
    setTanlangan([]);
    setMatn('');
  }, []);

  /*
   * BIR MARTA yuklanadi. `tr` har renderda yangi funksiya — u
   * bogʻliqlikka kirsa `useEffect` har renderda qayta ishlaydi:
   * jonli tekshiruvda (2026-09-25) `/api/suhbat` bitta ochilishda
   * 4 marta chaqirildi. Shuning uchun til bu yerda saqlangan
   * qiymatdan oʻqiladi, `tr` dan emas.
   */
  const yukla = useCallback(async () => {
    const t = tarjima(saqlanganTil() ?? 'uz');
    try {
      const r = await fetch('/api/suhbat', { cache: 'no-store', headers: sessiyaSarlavhasi() });
      const d = (await r.json()) as SuhbatJavobi & { xato?: string };
      if (!r.ok || (d.xato && !d.keyingi)) {
        setXato(d.xato ?? t('Ulanib boʻlmadi', 'Не удалось подключиться'));
      } else {
        qabul(d, true);
      }
    } catch (q) {
      setXato(`${t('Soʻrov yuborilmadi', 'Запрос не отправлен')}: ${String(q)}`);
    } finally {
      setYuklandi(true);
    }
  }, [qabul]);

  useEffect(() => { void yukla(); }, [yukla]);

  useEffect(() => {
    try {
      const s = localStorage.getItem('so_mavzu');
      if (s === 'yorug' || s === 'tungi') setMavzu(s);
    } catch { /* saqlangan qiymat yoʻq — bu xato emas */ }
    const t = saqlanganTil();
    if (t) { setTil(t); tilniQoy(t); }
  }, []);

  useEffect(() => {
    function tugma(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setMenyu(false);
      setProfilOchiq(false);
    }
    window.addEventListener('keydown', tugma);
    return () => window.removeEventListener('keydown', tugma);
  }, []);

  useEffect(() => {
    oxiri.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [xabarlar, keyingi, band]);

  /**
   * `jim` — fon soʻrovi (5-qadam kutishini tekshirish): "Yozmoqda…"
   * koʻrsatilmaydi, kiritish bloklanmaydi.
   */
  async function yubor(tana: Record<string, unknown>, jim = false) {
    if (!jim) { setBand(true); setXato(null); }
    try {
      const r = await fetch('/api/suhbat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...sessiyaSarlavhasi() },
        body: JSON.stringify(tana),
      });
      const d = (await r.json()) as SuhbatJavobi;
      if (!r.ok && !d.keyingi) {
        setXato(d.xato ?? tr('Ulanib boʻlmadi', 'Не удалось подключиться'));
        return;
      }
      qabul(d, tana.boshdan === true);
      if (tana.boshdan === true) setXabarlar([]);
    } catch (q) {
      setXato(`${tr('Soʻrov yuborilmadi', 'Запрос не отправлен')}: ${String(q)}`);
    } finally {
      if (!jim) setBand(false);
    }
  }

  const javobBer = (savolId: string, javob: unknown) => void yubor({ savolId, javob });

  // 5-qadam (1688, 30–90 s) va 9-qadam (1688 taklif galereyasi, 20–60 s):
  // `kutish` holatida har 8 s da `{tekshir: true}` yuboriladi; tugagach
  // javobda xabarlar keladi. Qaysi ish kutilayotganini server biladi.
  const kutishBormi = keyingi?.tur === 'kutish';
  useEffect(() => {
    if (!kutishBormi) return;
    const id = setInterval(() => { void yubor({ tekshir: true }, true); }, 8000);
    return () => clearInterval(id);
  }, [kutishBormi]);
  const boshdan = () => void yubor({ boshdan: true });

  function mavzuniTanla(m: Mavzu) {
    setMavzu(m);
    try { localStorage.setItem('so_mavzu', m); } catch { /* jim */ }
  }
  function tilniTanla(t: Til) { setTil(t); tilniSaqla(t); }

  const savol = keyingi?.tur === 'savol' ? keyingi.savol : null;
  // Oxirgi tovar katalogi — joriy savol "tovarlar" bo'lsa aynan u bosiladi.
  let oxirgiTovarKod = -1;
  for (let i = xabarlar.length - 1; i >= 0; i--) {
    if (xabarlar[i]!.rol === 'kod' && xabarlar[i]!.savolId === 'tovarlar') { oxirgiTovarKod = i; break; }
  }
  const tovarToggle = (id: number) =>
    setTanlangan(tanlangan.some((x) => String(x) === String(id))
      ? tanlangan.filter((x) => String(x) !== String(id))
      : [...tanlangan, id]);
  const oxirgi = xabarlar[xabarlar.length - 1];
  // Server savolni faqat POST da yozadi; birinchi tashrifda yoki
  // tarix qisqa boʻlsa savol pufagi keyingidan chiziladi.
  const savolKorsat = savol !== null && !(oxirgi?.rol === 'menejer' && oxirgi.savolId === savol.id);
  const tezOrada = keyingi?.tur === 'tezOrada' ? keyingi : null;
  const kutish = keyingi?.tur === 'kutish' ? keyingi : null;
  const tezOradaKorsat = tezOrada !== null && !(oxirgi?.rol === 'menejer' && oxirgi.matn === tezOrada.matn);

  const qadamNomi = SUHBAT_QADAMLARI.find((q) => q.n === qadam)?.nom ?? '';

  const yonPanel = (
    <>
      <div className={u.belgi}>
        <span className={u.nishon} aria-hidden="true">Z</span>
        <span className={u.nom}>ZumSavdo<span>Usta</span></span>
      </div>

      <button type="button" className={u.yangiSuhbat} onClick={() => { boshdan(); setMenyu(false); }} disabled={band}>
        {tr('Boshidan boshlash', 'Начать заново')} <span aria-hidden="true">↺</span>
      </button>

      <nav aria-label={tr('Qadamlar', 'Шаги')}>
        <div className={u.yorliq}>{tr(`Yoʻl · ${SUHBAT_QADAMLARI.length} qadam`, `Путь · ${SUHBAT_QADAMLARI.length} шагов`)}</div>
        <ol className={u.qadamRoyxat}>
          {SUHBAT_QADAMLARI.map((q) => (
            <li
              key={q.n}
              className={[
                u.qadamQator,
                !q.qurilgan ? u.qadamTez : '',
                q.qurilgan && q.n < qadam ? u.qadamOtildi : '',
                q.n === qadam ? u.qadamJoriy : '',
              ].join(' ')}
              aria-current={q.n === qadam ? 'step' : undefined}
            >
              <span className={u.qadamRaqam} aria-hidden="true">{q.qurilgan && q.n < qadam ? '✓' : q.n}</span>
              <span className={u.qadamNomi}>{q.nom}</span>
              {!q.qurilgan && <span className={u.tezTeg}>{tr('tez orada', 'скоро')}</span>}
            </li>
          ))}
        </ol>
      </nav>

      <button type="button" className={u.profilTugma} onClick={() => { setProfilOchiq(true); setMenyu(false); }}>
        <span>{tr('Profilim', 'Мой профиль')}</span>
        <span className={u.profilSon}>{tr('Bepul', 'Бесплатно')}</span>
      </button>

      <div className={u.bosh} />
      <BazaKartasi baza={baza} til={til} />
    </>
  );

  return (
    <div className={`zs-mavzu ${u.ilova} ${menyu ? u.menyuOchiq : ''}`} data-mavzu={mavzu}>
      <aside className={u.yon} aria-label={tr('Yon panel', 'Боковая панель')}>{yonPanel}</aside>
      {menyu && (
        <button type="button" className={u.soya} aria-label={tr('Menyuni yopish', 'Закрыть меню')} onClick={() => setMenyu(false)} />
      )}

      <div className={u.asosiy}>
        <header className={u.tepa}>
          <div className={u.tepaChap}>
            <button type="button" className={u.burger} aria-label={tr('Menyu', 'Меню')} aria-expanded={menyu} onClick={() => setMenyu(true)}>☰</button>
            <span className={u.tirik} aria-hidden="true" />
            <div className={u.sarlavhaBlok}>
              <div className={u.sarlavha}>{qadamNomi}</div>
              <div className={u.sarlavhaMeta}>
                {tr(`${qadam}-qadam · ${SUHBAT_QADAMLARI.length} dan`, `Шаг ${qadam} из ${SUHBAT_QADAMLARI.length}`)}
              </div>
            </div>
          </div>
          <div className={u.tepaOng}>
            <button type="button" className={u.pill} onClick={() => setProfilOchiq(true)}>{tr('Profilim', 'Мой профиль')}</button>
            <a className={u.pill} href="/">{tr('Chiqish', 'Выйти')}</a>
          </div>
        </header>

        <div className={u.oqim}>
          <div className={u.ichi}>
            {xabarlar.map((x, i) => (
              <XabarPufagi
                key={x.seq ?? `y${i}`}
                x={x}
                tr={tr}
                katalog={x.rol === 'kod' && x.savolId === 'tovarlar'
                  ? (i === oxirgiTovarKod && savol?.id === 'tovarlar'
                    ? { tanlangan, onToggle: tovarToggle, band }
                    : { tanlangan: tarixdagiTanlov(xabarlar, i), band: true })
                  : undefined}
              />
            ))}

            {savolKorsat && savol && <div className={`${u.pufak} ${u.ai}`}>{savol.matn}</div>}
            {tezOradaKorsat && tezOrada && <div className={`${u.pufak} ${u.ai}`}>{tezOrada.matn}</div>}
            {kutish && (
              <div className={u.yozmoqda} role="status">
                <span className={u.nuqtalar} aria-hidden="true"><i /><i /><i /></span>
                <span>{kutish.matn}</span>
              </div>
            )}

            {band && (
              <div className={u.yozmoqda} role="status">
                <span className={u.nuqtalar} aria-hidden="true"><i /><i /><i /></span>
                <span>{tr('Yozmoqda…', 'Пишет…')}</span>
              </div>
            )}

            {xato !== null && (
              <div className={`${u.pufak} ${u.ai}`}><p className={u.xato}>{xato}</p></div>
            )}

            <div ref={oxiri} />
          </div>
        </div>

        <div className={u.past_}>
          <div className={u.pastIchi}>
            {!yuklandi ? (
              <p className={u.holat}>{tr('Yuklanmoqda…', 'Загрузка…')}</p>
            ) : (
              <Javoblash
                savol={savol}
                tezOrada={tezOrada !== null}
                kutish={kutish !== null}
                band={band}
                tanlangan={tanlangan}
                setTanlangan={setTanlangan}
                matn={matn}
                setMatn={setMatn}
                javobBer={javobBer}
                boshdan={boshdan}
                tr={tr}
              />
            )}
            <p className={u.pastIzoh}>
              {tr(
                'Savol tartibini va raqamlarni kod beradi — Uzum bazasidan, 8 ta tuzoq-filtr bilan. Qaror sizniki.',
                'Порядок вопросов и цифры даёт код — из базы Uzum, через 8 фильтров-ловушек. Решение за вами.',
              )}
            </p>
          </div>
        </div>
      </div>

      {profilOchiq && (
        <Profilim mavzu={mavzu} mavzuniTanla={mavzuniTanla} til={til} tilniTanla={tilniTanla} boshdan={boshdan} yop={() => setProfilOchiq(false)} />
      )}
    </div>
  );
}

/* ------------------------------------------------------ pufakchalar */

/** Kod xabaridan keyingi obunachi javobi — tarixda nima tanlangani. */
function tarixdagiTanlov(xabarlar: Xabar[], kodIdx: number): Array<string | number> {
  for (let j = kodIdx + 1; j < xabarlar.length; j++) {
    const x = xabarlar[j]!;
    if (x.rol === 'obunachi' && x.savolId === 'tovarlar' && Array.isArray(x.javob)) {
      return x.javob as Array<string | number>;
    }
  }
  return [];
}

interface KatalogRejimi {
  tanlangan: Array<string | number>;
  /** Berilsa — karta bosiladi (joriy savol). Berilmasa — faqat ko'rsatiladi. */
  onToggle?: ((id: number) => void) | undefined;
  band: boolean;
}

function XabarPufagi({ x, tr, katalog }: { x: Xabar; tr: Tr; katalog?: KatalogRejimi | undefined }) {
  if (x.rol === 'obunachi') return <div className={`${u.pufak} ${u.men}`}>{x.matn}</div>;
  if (x.rol === 'menejer') return <div className={`${u.pufak} ${u.ai}`}>{x.matn}</div>;
  return <KodKartasi x={x} tr={tr} katalog={katalog} />;
}

/* ------------------------------------------------------ kod kartalari */

interface YonalishQatori {
  categoryId: number; name: string;
  ball: { value: number | null };
  yetadi: boolean | null;
  optimalKirishSom: number | null;
  dalil: { talabOlchovi: number | null; sotuvchiSoni: number | null; top3Ulush: number | null };
}
interface TovarQatori {
  nomzod: {
    productId: number; title: string; shopName: string | null;
    narxSom: number | null; soldUnits30d: number | null;
    sotuvManbasi: 'olchandi' | 'taxmin' | null; olchanganKun: number | null;
    categoryMedianUnits30d?: number | null; reyting?: number | null; sharhSoni?: number | null;
    /** `so_tovar_royxati.rasmUrl` (0054) — kalit oʻlchangan tovarda; boʻlmasa harf turadi. */
    rasmUrl?: string | null;
  };
  miqdor: { dona: number; hisob: string } | null;
  miqdorSababi: string | null;
  bayroqlar: Array<{ kind: string; severity: string; reason: string }>;
}
interface TannarxQatori {
  productId: number; title: string; sotuvNarxiSom: number | null; miqdor: number | null;
  marjaFoizi: number | null; chegaraSom: number | null; yetishmaydi: string[]; hisob: string | null;
}

function KodKartasi({ x, tr, katalog }: { x: Xabar; tr: Tr; katalog?: KatalogRejimi | undefined }) {
  const n = (x.javob ?? {}) as Record<string, unknown>;
  const olchovYoq = n.olchov_yoq === true;
  return (
    <div className={`${u.pufak} ${u.ai}`}>
      <p>{x.matn}</p>
      {olchovYoq ? null : x.savolId === 'yonalishlar'
        ? <Yonalishlar royxat={(n.royxat as YonalishQatori[] | undefined) ?? []} eskirgan={n.kesh_eskirgan === true} baholanmadi={Number(n.baholanmadi ?? 0)} bolish={(n.bolishTaklifi as { sabab: string } | null | undefined) ?? null} tr={tr} />
        : x.savolId === 'tovarlar'
          ? <TovarKatalogi royxat={(n.royxat as TovarQatori[] | undefined) ?? []} chiqarildi={(n.chiqarildi as Array<{ title: string; sabab: string }> | undefined) ?? []} rejim={katalog ?? { tanlangan: [], band: true }} tr={tr} />
          : x.savolId === 'tannarx'
            ? <Chegaralar qatorlar={(n.qatorlar as TannarxQatori[] | undefined) ?? []} izoh={typeof n.izoh === 'string' ? n.izoh : null} tr={tr} />
            : x.savolId === 'xitoy'
              ? <XitoyTakliflari qatorlar={(n.qatorlar as XitoyQatorQ[] | undefined) ?? []} kurs={(n.kurs as XitoyKursQ | null | undefined) ?? null} izoh={typeof n.izoh === 'string' ? n.izoh : null} tr={tr} />
              : x.savolId === 'buyurtma'
                ? <BuyurtmaVaraqasi n={n as unknown as BuyurtmaQ} tr={tr} />
                : x.savolId === 'ochiq_ish'
                  ? <p className={u.kichikIzoh}>{typeof n.izoh === 'string' ? n.izoh : null}</p>
                  : x.savolId === 'rasmiy'
                    ? <RasmiyKartasi n={n as unknown as RasmiyQ} tr={tr} />
                    : x.savolId === 'rasmiy_yakun'
                      ? <p className={u.kichikIzoh}>{typeof n.izoh === 'string' ? n.izoh : null}</p>
                      : x.savolId === 'qabul'
                        ? <QabulKartasi n={n as unknown as QabulQ} tr={tr} />
                        : x.savolId === 'studiya'
                          ? <StudiyaKartasi n={n as unknown as StudiyaQ} tr={tr} />
                          : x.savolId === 'yuklash'
                            ? <YuklashKartasi n={n as unknown as YuklashQ} tr={tr} />
                            : x.savolId === 'sotuv'
                              ? <SotuvKartasi n={n as unknown as SotuvQ} tr={tr} />
                              : x.savolId === 'hisobot'
                                ? <HisobotKartasi n={n as unknown as HisobotQ} tr={tr} />
                                : x.savolId === 'hisobot_hisob'
                                  ? <HisobotHisobKartasi n={n as unknown as HisobotHisobQ} tr={tr} />
                                  : x.savolId === 'hisobot_yakun'
                                    ? <HisobotYakunKartasi n={n as unknown as HisobotYakunQ} tr={tr} />
                                    : x.savolId === 'qabul_yakun' || x.savolId === 'studiya_yakun' || x.savolId === 'yuklash_yakun'
                                      ? <p className={u.kichikIzoh}>{typeof n.izoh === 'string' ? n.izoh : null}</p>
                                      : null}
    </div>
  );
}

const raqam = (q: number | null | undefined) => (q === null || q === undefined ? '—' : son(q));

function Yonalishlar({ royxat, eskirgan, baholanmadi, bolish, tr }: {
  royxat: YonalishQatori[]; eskirgan: boolean; baholanmadi: number;
  bolish: { sabab: string } | null; tr: Tr;
}) {
  return (
    <div className={u.kartalar}>
      {eskirgan && <p className={u.kichikIzoh}>{tr('Kesh 24 soatdan eski — raqamlar kechagi.', 'Кэш старше 24 часов — цифры вчерашние.')}</p>}
      {royxat.map((y) => (
        <div key={y.categoryId} className={u.karta}>
          <div className={u.kartaBoshi}>
            <div className={u.kartaNomBlok}><div className={u.kartaNomi}>{y.name}</div></div>
            <span className={`${u.teg} ${y.yetadi === true ? u.tegYaxshi : y.yetadi === false ? u.tegYomon : u.tegNeytral}`}>
              {y.yetadi === true ? tr('byudjet yetadi', 'бюджета хватит') : y.yetadi === false ? tr('byudjet yetmaydi', 'бюджета не хватит') : tr('byudjet: —', 'бюджет: —')}
            </span>
          </div>
          <div className={u.statlar}>
            <Stat nom={tr('Ball', 'Балл')} q={y.ball.value === null ? '—' : String(y.ball.value)} />
            <Stat nom={tr('Sotuvchilar', 'Продавцы')} q={raqam(y.dalil.sotuvchiSoni)} />
            <Stat nom={tr('Top-3 ulushi', 'Доля топ-3')} q={y.dalil.top3Ulush === null ? '—' : `${y.dalil.top3Ulush}%`} />
            <Stat nom={tr('Optimal kirish', 'Оптимальный вход')} q={y.optimalKirishSom === null ? '—' : `${raqam(y.optimalKirishSom)} ${tr('soʻm', 'сум')}`} />
          </div>
        </div>
      ))}
      {bolish && <p className={u.kichikIzoh}>{bolish.sabab}</p>}
      {baholanmadi > 0 && <p className={u.kichikIzoh}>{tr(`${baholanmadi} ta nomzod baholanmadi — maʼlumot yetmadi.`, `${baholanmadi} кандидатов не оценены — не хватило данных.`)}</p>}
    </div>
  );
}

/**
 * TOVAR KATALOGI — tanlov suhbat OQIMIDA.
 *
 * Nazoratchi sinovi (2026-09-25): 20 ta uzun tugma pastki panelda
 * butun ekranni egallab, suhbat siljimay qolgan. Endi tovarlar shu
 * yerda karta bo'lib turadi va karta bosilib tanlanadi; pastda faqat
 * "Tayyor". Savol javob berilgach kartalar qoladi, tanlanganlari
 * belgilangan holda — tarixda nima tanlangani ko'rinadi.
 *
 * RAQAMLAR API DAN. Ulush FAQAT shu ro'yxat ichida hisoblanadi va
 * shunday yoziladi ("ro'yxatdagi ulush"): butun turkumga nisbatan
 * emas, chunki ro'yxat turkumning o'lchangan qismi, hammasi emas.
 * Rasm: `rasmUrl` kelsa rasm (0054, faqat ogʻir soʻrovda oʻlchangan
 * tovarlarda), kelmasa nomning bosh harfi — chiziqcha oʻrnida.
 */
function TovarKatalogi({ royxat, chiqarildi, rejim, tr }: {
  royxat: TovarQatori[];
  chiqarildi: Array<{ title: string; sabab: string }>;
  rejim: KatalogRejimi;
  tr: Tr;
}) {
  const jami = royxat.reduce((s, t) => s + (t.nomzod.soldUnits30d ?? 0), 0);
  const faol = rejim.onToggle !== undefined && !rejim.band;
  return (
    <>
      <div className={u.katalog}>
        {royxat.map((t) => {
          const n = t.nomzod;
          const id = n.productId;
          const bor = rejim.tanlangan.some((x) => String(x) === String(id));
          const sold = n.soldUnits30d;
          const ulush = jami > 0 && sold !== null ? Math.round((100 * sold) / jami) : null;
          const med = n.categoryMedianUnits30d ?? null;
          const nisbat = sold !== null && med !== null && med > 0 ? sold / med : null;
          const ogoh = t.bayroqlar.find((b) => b.severity !== 'note') ?? t.bayroqlar[0];
          return (
            <button
              key={id}
              type="button"
              className={`${u.katalogKarta} ${bor ? u.katalogTanlangan : ''}`}
              aria-pressed={bor}
              disabled={!faol}
              onClick={() => rejim.onToggle?.(id)}
            >
              {bor && <span className={u.katalogTanlov} aria-hidden="true">✓</span>}
              <div className={u.katalogRasm} aria-hidden="true">
                {n.rasmUrl
                  ? <img src={n.rasmUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  : <span>{n.title.trim().charAt(0).toUpperCase() || '·'}</span>}
              </div>
              <div className={u.katalogNomi}>{n.title}</div>
              <div className={u.katalogDokon}>{n.shopName ?? '—'}</div>
              <div className={u.katalogNarx}>
                {n.narxSom === null ? '—' : `${son(n.narxSom)} ${tr('soʻm', 'сум')}`}
              </div>
              <div className={u.katalogQator}>
                <span>{tr('30 kunda', 'За 30 дн')}: {sold === null ? '—' : `${son(sold)} ${tr('dona', 'шт')}`}</span>
                <span>{n.sotuvManbasi === 'olchandi' ? tr('oʻlchandi', 'измерено') : n.sotuvManbasi === 'taxmin' ? tr('taxmin', 'оценка') : '—'}</span>
              </div>
              {ulush !== null && (
                <div className={u.ulush}>
                  <div className={u.katalogQator}>
                    <span>{tr('roʻyxatdagi ulush', 'доля в списке')}</span>
                    <span>{ulush}%</span>
                  </div>
                  <div className={u.ulushIz}><i style={{ width: `${ulush}%` }} /></div>
                </div>
              )}
              {nisbat !== null && (
                <div className={u.katalogQator}>
                  <span>{tr('turkum medianasiga', 'к медиане категории')}</span>
                  <span>{nisbat.toFixed(1)}×</span>
                </div>
              )}
              {/*
                * Reyting 0 — "baho yo'q", baho emas (SXEMA.md: sharhsiz
                * tovarga Uzum 0.0 beradi). "★ 0" deb ko'rsatish yomon baho
                * degan yolg'on taassurot berardi.
                */}
              <div className={u.katalogQator}>
                <span>{n.reyting === null || n.reyting === undefined || (n.reyting === 0 && !n.sharhSoni) ? tr('baho yoʻq', 'нет оценки') : `★ ${n.reyting}`}</span>
                <span>{n.sharhSoni === null || n.sharhSoni === undefined ? '—' : `${son(n.sharhSoni)} ${tr('sharh', 'отз.')}`}</span>
              </div>
              {t.miqdor
                ? <div className={u.katalogQator}><span>{tr('taklif', 'предложение')}: {t.miqdor.dona} {tr('dona', 'шт')}</span></div>
                : t.miqdorSababi
                  ? <div className={u.katalogQator}><span>{t.miqdorSababi}</span></div>
                  : null}
              {ogoh && <span className={u.katalogBelgi}>{ogoh.reason}</span>}
            </button>
          );
        })}
      </div>
      {chiqarildi.length > 0 && (
        <p className={u.kichikIzoh}>
          {tr('Tuzoq sababli chiqarildi:', 'Исключены из-за ловушек:')}{' '}
          {chiqarildi.map((c) => `${c.title} — ${c.sabab}`).join('; ')}
        </p>
      )}
    </>
  );
}

function Chegaralar({ qatorlar, izoh, tr }: { qatorlar: TannarxQatori[]; izoh: string | null; tr: Tr }) {
  return (
    <div className={u.kartalar}>
      {qatorlar.map((q) => (
        <div key={q.productId} className={u.karta}>
          <div className={u.kartaBoshi}>
            <div className={u.kartaNomBlok}><div className={u.kartaNomi}>{q.title}</div></div>
            {q.miqdor !== null && <span className={`${u.teg} ${u.tegNeytral}`}>{q.miqdor} {tr('dona', 'шт')}</span>}
          </div>
          <div className={u.statlar}>
            <Stat nom={tr('Uzumda narx', 'Цена на Uzum')} q={q.sotuvNarxiSom === null ? '—' : `${raqam(q.sotuvNarxiSom)} ${tr('soʻm', 'сум')}`} />
            <Stat nom={tr('Marja', 'Маржа')} q={q.marjaFoizi === null ? '—' : `${q.marjaFoizi}%`} />
            <Stat nom={tr('Xitoyda chegara', 'Потолок в Китае')} q={q.chegaraSom === null ? '—' : `${raqam(q.chegaraSom)} ${tr('soʻm', 'сум')}`} />
          </div>
          {q.hisob && <p className={`${u.kichikIzoh} ${u.mono}`}>{q.hisob}</p>}
          {q.yetishmaydi.length > 0 && (
            <p className={u.ogohlik}>{tr('Hisobga kirmadi:', 'Не учтено:')} {q.yetishmaydi.join(', ')}</p>
          )}
        </div>
      ))}
      {izoh && <p className={u.kichikIzoh}>{izoh}</p>}
    </div>
  );
}

/* ------------------------------------------------------ 5-qadam: 1688 takliflari */

interface XitoyTaklifQ {
  sourceId: string; title: string; narxYuan: number; rasmUrl: string | null; moq: number | null;
  reyting: number | null; manzil: string | null; buyurtmalar: number | null; zavod: boolean | null;
  superZavod?: boolean | null; oxshashlikOrni?: number | null; dropshipNarxYuan?: number | null;
  narxSom: number | null; chegaradaMi: boolean | null;
}
interface XitoyQatorQ {
  productId: number; title: string; rasmUrl: string | null; chegaraSom: number | null; yetishmaydi?: string[];
  holat: 'topildi' | 'topilmadi' | 'qidirilmadi'; sabab: string | null; jami: number | null;
  takliflar: XitoyTaklifQ[]; keshdan?: boolean; tashlandi?: number; tashxis?: string | null;
}
interface XitoyKursQ { somPerYuan: number; sana: string; manba: string }

/**
 * Har tanlangan tovar uchun 1688 takliflari. Uch holat ATAYLAB farq
 * qiladi: topildi (kartalar) / topilmadi (1688 hech narsa bermadi —
 * bu javob) / qidirilmadi (sabab). Raqamlar provayderdan; soʻm — CBU
 * kursi bilan, kurs boʻlmasa koʻrsatilmaydi. Havola faqat http(s).
 */
function XitoyTakliflari({ qatorlar, kurs, izoh, tr }: {
  qatorlar: XitoyQatorQ[]; kurs: XitoyKursQ | null; izoh: string | null; tr: Tr;
}) {
  const holatMatni = (h: XitoyQatorQ['holat']) =>
    h === 'topildi' ? tr('topildi', 'найдено') : h === 'topilmadi' ? tr('1688 da oʻxshash yoʻq', 'на 1688 нет похожих') : tr('qidirilmadi', 'не искалось');
  const holatSinfi = (h: XitoyQatorQ['holat']) =>
    h === 'topildi' ? u.tegYaxshi : h === 'topilmadi' ? u.tegNeytral : u.tegOgoh;
  return (
    <div className={u.kartalar}>
      {qatorlar.map((q) => (
        <div key={q.productId} className={u.karta}>
          <div className={u.kartaBoshi}>
            <div className={u.kartaNomBlok}><div className={u.kartaNomi}>{q.title}</div></div>
            <span className={`${u.teg} ${holatSinfi(q.holat)}`}>{holatMatni(q.holat)}</span>
          </div>
          <div className={u.statlar}>
            <Stat nom={tr('Xitoyda chegara', 'Потолок в Китае')} q={q.chegaraSom === null ? '—' : `${raqam(q.chegaraSom)} ${tr('soʻm', 'сум')}`} />
            <Stat nom={tr('1688 topdi', '1688 нашёл')} q={q.jami === null ? '—' : raqam(q.jami)} izoh={q.keshdan ? tr('72 soatlik keshdan', 'из кэша (72 ч)') : undefined} />
          </div>
          {(q.yetishmaydi?.length ?? 0) > 0 && (
            <p className={u.ogohlik}>{tr('Chegaraga kirmadi:', 'В потолок не вошло:')} {q.yetishmaydi!.join(', ')} — {tr('haqiqiy chegara pastroq', 'реальный потолок ниже')}</p>
          )}
          {q.sabab && <p className={u.ogohlik}>{q.sabab}</p>}
          {q.holat === 'topilmadi' && q.tashxis && <p className={u.kichikIzoh}>{q.tashxis}</p>}
          {(q.tashlandi ?? 0) > 0 && <p className={u.kichikIzoh}>{q.tashlandi} {tr('ta karta oʻqilmadi va koʻrsatilmadi', 'карточек не прочитано и не показано')}</p>}
          {q.takliflar.length > 0 && (
            <div className={u.katalog}>
              {q.takliflar.map((t) => {
                const havola = /^https?:\/\//i.test(t.manzil ?? '') ? t.manzil : null;
                return (
                  <div key={t.sourceId} className={u.katalogKarta}>
                    <div className={u.katalogRasm} aria-hidden="true">
                      {t.rasmUrl
                        ? <img src={t.rasmUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                        : <span>{t.title.trim().charAt(0) || '·'}</span>}
                    </div>
                    <div className={u.katalogNomi}>
                      {havola
                        ? <a href={havola} target="_blank" rel="noopener noreferrer">{t.title}</a>
                        : t.title}
                    </div>
                    <div className={u.katalogNarx}>
                      ¥{t.narxYuan}{t.narxSom !== null && ` ≈ ${son(t.narxSom)} ${tr('soʻm', 'сум')}`}
                    </div>
                    <div className={u.katalogQator}>
                      <span>MOQ {t.moq === null ? '—' : t.moq}</span>
                      <span>{t.buyurtmalar === null ? '—' : `${son(t.buyurtmalar)} ${tr('buyurtma', 'заказов')}`}</span>
                    </div>
                    <div className={u.katalogQator}>
                      <span>{t.superZavod === true ? tr('super zavod', 'супер-завод') : t.zavod === true ? tr('zavod', 'завод') : t.zavod === false ? tr('sotuvchi', 'продавец') : '—'}</span>
                      <span>{t.reyting === null ? '—' : `★ ${t.reyting}`}{typeof t.oxshashlikOrni === 'number' ? ` · #${t.oxshashlikOrni}` : ''}</span>
                    </div>
                    {t.chegaradaMi !== null && (
                      <span className={u.katalogBelgi}>
                        {t.chegaradaMi ? tr('chegarada', 'в пределах потолка') : tr('chegaradan yuqori', 'выше потолка')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
      <p className={u.kichikIzoh}>
        {kurs
          ? tr(`Kurs: ${kurs.manba}, 1 yuan = ${son(kurs.somPerYuan)} soʻm (${kurs.sana}).`, `Курс: ${kurs.manba}, 1 юань = ${son(kurs.somPerYuan)} сум (${kurs.sana}).`)
          : tr('Kurs olinmadi — soʻm koʻrsatilmadi.', 'Курс не получен — сумы не показаны.')}
        {izoh ? ` ${izoh}` : ''}
      </p>
    </div>
  );
}

/* ------------------------------------------------------ 6-qadam: buyurtma varaqasi */

interface BuyurtmaQatorQ {
  productId: number; title: string; sourceId: string | null; xitoyTitle: string | null; manzil: string | null;
  miqdor: number | null; narxYuan: number | null; narxSom: number | null; jamiYuan: number | null; jamiSom: number | null;
  weightG: number | null; kargoSom: number | null; kargoIzoh: string | null; holat: 'tayyor' | 'tanlanmagan';
}
interface BuyurtmaQ {
  qatorlar?: BuyurtmaQatorQ[];
  jami?: { yuan: number | null; som: number | null; kargoSom: number | null; dona: number | null; tayyor: number; tanlanmagan: number };
  kargo?: { hamkor: string | null; izoh: string | null };
  kurs?: { cny: { sana: string; somPerYuan: number } | null; usd: { sana: string; somPerYuan: number } | null };
  izoh?: string;
}

/** Varaqa matni — agentga yuborish uchun (nusxalash). Hamma raqam natijadan. */
function varaqaMatni(n: BuyurtmaQ): string {
  const q = (n.qatorlar ?? []).filter((x) => x.holat === 'tayyor');
  const satrlar = q.map((x, i) =>
    `${i + 1}. ${x.xitoyTitle ?? x.title} — ${x.miqdor ?? '?'} dona × ¥${x.narxYuan ?? '?'}${x.jamiYuan !== null ? ` = ¥${x.jamiYuan}` : ''}${x.manzil ? `\n   ${x.manzil}` : ''}`);
  const j = n.jami;
  return ['Buyurtma varaqasi (SellerOS)', ...satrlar, j ? `Jami: ${j.dona ?? '?'} dona, ¥${j.yuan ?? '?'}` : ''].filter(Boolean).join('\n');
}

function BuyurtmaVaraqasi({ n, tr }: { n: BuyurtmaQ; tr: Tr }) {
  const [nusxalandi, setNusxalandi] = useState(false);
  const q = n.qatorlar ?? [];
  const j = n.jami;
  const nusxala = () => {
    try { void navigator.clipboard.writeText(varaqaMatni(n)); setNusxalandi(true); setTimeout(() => setNusxalandi(false), 2000); } catch { /* clipboard yoʻq */ }
  };
  return (
    <div className={u.kartalar}>
      {q.map((x) => (
        <div key={x.productId} className={u.karta}>
          <div className={u.kartaBoshi}>
            <div className={u.kartaNomBlok}>
              <div className={u.kartaNomi}>{x.title}</div>
              {x.xitoyTitle && <div className={u.kichikIzoh}>{x.manzil ? <a href={x.manzil} target="_blank" rel="noopener noreferrer">{x.xitoyTitle}</a> : x.xitoyTitle}</div>}
            </div>
            <span className={`${u.teg} ${x.holat === 'tayyor' ? u.tegYaxshi : u.tegOgoh}`}>{x.holat === 'tayyor' ? tr('varaqada', 'в листе') : tr('taklif tanlanmagan', 'вариант не выбран')}</span>
          </div>
          <div className={u.statlar}>
            <Stat nom={tr('Miqdor', 'Кол-во')} q={x.miqdor === null ? '—' : `${x.miqdor} ${tr('dona', 'шт')}`} />
            <Stat nom={tr('Narx', 'Цена')} q={x.narxYuan === null ? '—' : `¥${x.narxYuan}${x.narxSom !== null ? ` ≈ ${raqam(x.narxSom)}` : ''}`} />
            <Stat nom={tr('Jami', 'Итого')} q={x.jamiYuan === null ? '—' : `¥${x.jamiYuan}${x.jamiSom !== null ? ` ≈ ${raqam(x.jamiSom)} ${tr('soʻm', 'сум')}` : ''}`} />
            <Stat nom={tr('Kargo / dona', 'Карго / шт')} q={x.kargoSom === null ? '—' : `${raqam(x.kargoSom)} ${tr('soʻm', 'сум')}`} izoh={x.kargoIzoh ?? undefined} />
          </div>
        </div>
      ))}
      {j && (
        <div className={u.karta}>
          <div className={u.statlar}>
            <Stat nom={tr('Tovar', 'Товаров')} q={`${j.tayyor}${j.tanlanmagan ? ` (+${j.tanlanmagan} ${tr('tanlanmagan', 'не выбрано')})` : ''}`} />
            <Stat nom={tr('Dona', 'Штук')} q={j.dona === null ? '—' : raqam(j.dona)} />
            <Stat nom={tr('Jami', 'Итого')} q={j.yuan === null ? '—' : `¥${j.yuan}${j.som !== null ? ` ≈ ${raqam(j.som)} ${tr('soʻm', 'сум')}` : ''}`} />
            <Stat nom={tr('Kargo jami', 'Карго итого')} q={j.kargoSom === null ? '—' : `${raqam(j.kargoSom)} ${tr('soʻm', 'сум')}`} izoh={n.kargo?.izoh ?? undefined} />
          </div>
          {n.kargo?.izoh && <p className={u.ogohlik}>{tr('Kargo hisobga kirmadi:', 'Карго не учтено:')} {n.kargo.izoh}</p>}
          <div className={u.chiplar}>
            <button type="button" className={`${u.chip} ${u.chipYengil}`} onClick={nusxala} disabled={j.tayyor === 0}>
              {nusxalandi ? tr('Nusxalandi ✓', 'Скопировано ✓') : tr('Varaqani nusxalash (agentga yuborish uchun)', 'Скопировать лист (для агента)')}
            </button>
          </div>
        </div>
      )}
      {n.izoh && <p className={u.kichikIzoh}>{n.izoh}{n.kurs?.cny ? ` ${tr('Kurs', 'Курс')}: 1 ¥ = ${son(n.kurs.cny.somPerYuan)} (${n.kurs.cny.sana}).` : ''}</p>}
    </div>
  );
}

/* ------------------------------------------------------ 7-qadam: rasmiylashtirish */

interface RasmiyManbaQ { manba: string | null; olchandi: string | null }
interface RasmiyQ {
  olchov_yoq?: boolean; sabab?: string; kabinetBor?: boolean; partiyaSotuvSom?: number | null;
  faktlar?: {
    bhmSom: number | null;
    yatt: RasmiyManbaQ & { bojShaxsanSom: number | null; bojOnlaynSom: number | null; royxatUrl: string | null; muddatDaqiqa: number | null; xodimMax: number | null };
    soliq: RasmiyManbaQ & { aylanmaFoiz: number | null; aylanmaChegaraSom: number | null; ijtimoiyOySom: number | null; tolovKuni: number | null; rejimTugaydi: string | null };
    banklar: Array<RasmiyManbaQ & { nom: string; onlayn: boolean | null; ochishSom: number | null; oylikSom: number | null; izoh: string | null }>;
    uzum: RasmiyManbaQ & { kabinetUrl: string | null; qollanmaUrl: string | null; komissioner: { stir: string | null; nom: string | null; mfo: string | null; hisob: string | null; muddatYil: number | null }; faollashtirishKun: number | null; qollabQuvvatlashUrl: string | null; tolovStandart: string | null };
    yetishmaydi: string[];
  };
  soliq?: { ijtimoiySom: number | null; aylanmaSom: number | null; jamiSom: number | null; sotuvSom: number | null };
  izoh?: string;
}

function Manba({ manba, olchandi, tr }: { manba: string | null; olchandi: string | null; tr: Tr }) {
  if (!manba && !olchandi) return null;
  return <p className={u.kichikIzoh}>{tr('Manba', 'Источник')}: {manba ?? '—'}{olchandi ? ` · ${olchandi}` : ''}</p>;
}

/** Faktlar kartasi: har raqam yonida manba va sana; fakt yoʻq — "faktda yoʻq", nol emas. */
function RasmiyKartasi({ n, tr }: { n: RasmiyQ; tr: Tr }) {
  const [nusxalandi, setNusxalandi] = useState(false);
  const f = n.faktlar;
  if (!f) return <p className={u.kichikIzoh}>{n.sabab ?? tr('faktlar yoʻq', 'нет данных')}</p>;
  const s = n.soliq;
  const som = (x: number | null | undefined) => (x === null || x === undefined ? tr('faktda yoʻq', 'нет в фактах') : `${raqam(x)} ${tr('soʻm', 'сум')}`);
  const bepulYoki = (x: number | null) => (x === null ? '—' : x === 0 ? tr('bepul', 'бесплатно') : som(x));
  const k = f.uzum.komissioner;
  const rekvizit = [`STIR: ${k.stir ?? '—'}`, `Nom: ${k.nom ?? '—'}`, `MFO: ${k.mfo ?? '—'}`, `Hisob: ${k.hisob ?? '—'}`, `Muddat: ${k.muddatYil !== null ? `${k.muddatYil} yil` : '—'}`, 'ONKM + Marketplace'].join('\n');
  const nusxala = () => {
    try { void navigator.clipboard.writeText(rekvizit); setNusxalandi(true); setTimeout(() => setNusxalandi(false), 2000); } catch { /* clipboard yoʻq */ }
  };
  return (
    <div className={u.kartalar}>
      {f.yetishmaydi.length > 0 && <p className={u.ogohlik}>{tr('Faktda yoʻq:', 'Нет в фактах:')} {f.yetishmaydi.join(', ')}</p>}
      <div className={u.karta}>
        <div className={u.kartaBoshi}><div className={u.kartaNomBlok}><div className={u.kartaNomi}>{tr('Soliq 2026', 'Налоги 2026')}</div></div></div>
        <div className={u.statlar}>
          <Stat nom={tr('Ijtimoiy soliq / oy', 'Соцналог / мес')} q={som(s?.ijtimoiySom)} izoh={f.soliq.tolovKuni !== null ? tr(`${f.soliq.tolovKuni}-sanagacha, sotuv boʻlmasa ham`, `до ${f.soliq.tolovKuni} числа, даже без продаж`) : undefined} />
          <Stat nom={tr('Aylanma soligʻi', 'Налог с оборота')} q={f.soliq.aylanmaFoiz !== null ? `${f.soliq.aylanmaFoiz} %` : tr('faktda yoʻq', 'нет в фактах')} izoh={f.soliq.aylanmaChegaraSom !== null ? tr(`yiliga ${raqam(f.soliq.aylanmaChegaraSom)} soʻmgacha`, `до ${raqam(f.soliq.aylanmaChegaraSom)} сум в год`) : undefined} />
          <Stat nom={tr('Partiya sotilsa', 'При продаже партии')} q={s?.aylanmaSom !== null && s?.aylanmaSom !== undefined ? som(s.aylanmaSom) : '—'} izoh={n.partiyaSotuvSom !== null && n.partiyaSotuvSom !== undefined ? `${raqam(n.partiyaSotuvSom)} ${tr('soʻm sotuvdan', 'сум продаж')}` : undefined} />
          <Stat nom={tr('BHM', 'БРВ')} q={som(f.bhmSom)} izoh={f.soliq.rejimTugaydi ? tr(`rejim ${f.soliq.rejimTugaydi} gacha`, `режим до ${f.soliq.rejimTugaydi}`) : undefined} />
        </div>
        <Manba manba={f.soliq.manba} olchandi={f.soliq.olchandi} tr={tr} />
      </div>
      {!n.kabinetBor && (
        <>
          <div className={u.karta}>
            <div className={u.kartaBoshi}><div className={u.kartaNomBlok}><div className={u.kartaNomi}>{tr('1. YATT ochish', '1. Открыть ИП')}</div></div></div>
            <div className={u.statlar}>
              <Stat nom={tr('Onlayn boj', 'Пошлина онлайн')} q={som(f.yatt.bojOnlaynSom)} />
              <Stat nom={tr('Shaxsan (DXM)', 'Лично (ЦГУ)')} q={som(f.yatt.bojShaxsanSom)} />
              <Stat nom={tr('Vaqt', 'Время')} q={f.yatt.muddatDaqiqa !== null ? `~${f.yatt.muddatDaqiqa} ${tr('daqiqa', 'мин')}` : '—'} />
              <Stat nom={tr('Xodim', 'Сотрудники')} q={f.yatt.xodimMax !== null ? `${f.yatt.xodimMax} ${tr('nafargacha', 'макс')}` : '—'} />
            </div>
            {f.yatt.royxatUrl && <p className={u.kichikIzoh}><a href={f.yatt.royxatUrl} target="_blank" rel="noopener noreferrer">{f.yatt.royxatUrl}</a> · {tr('pasport/ID + JShShIR', 'паспорт/ID + ПИНФЛ')}</p>}
            <Manba manba={f.yatt.manba} olchandi={f.yatt.olchandi} tr={tr} />
          </div>
          <div className={u.karta}>
            <div className={u.kartaBoshi}><div className={u.kartaNomBlok}><div className={u.kartaNomi}>{tr('2. Biznes hisob raqami', '2. Расчётный счёт')}</div></div></div>
            {f.banklar.length === 0 ? <p className={u.kichikIzoh}>{tr('Bank roʻyxati faktda yoʻq.', 'Список банков не заполнен.')}</p> : f.banklar.map((b) => (
              <div key={b.nom} className={u.statlar}>
                <Stat nom={b.nom} q={b.onlayn === true ? tr('onlayn', 'онлайн') : b.onlayn === false ? tr('ofisda', 'в офисе') : '—'} izoh={b.izoh ?? undefined} />
                <Stat nom={tr('Ochish', 'Открытие')} q={bepulYoki(b.ochishSom)} />
                <Stat nom={tr('Oylik', 'В месяц')} q={bepulYoki(b.oylikSom)} izoh={b.olchandi ?? undefined} />
              </div>
            ))}
            <p className={u.kichikIzoh}>{tr('Faqat oʻz nomingizdagi hisob — Uzum boshqa odamning kartasiga toʻlamaydi.', 'Только счёт на ваше имя — Uzum не платит на чужую карту.')}</p>
          </div>
          <div className={u.karta}>
            <div className={u.kartaBoshi}><div className={u.kartaNomBlok}><div className={u.kartaNomi}>{tr('3. Uzum kabineti', '3. Кабинет Uzum')}</div></div></div>
            <ol className={u.kichikIzoh}>
              <li>{f.uzum.kabinetUrl ? <a href={f.uzum.kabinetUrl} target="_blank" rel="noopener noreferrer">{f.uzum.kabinetUrl}</a> : tr('manzil faktda yoʻq', 'нет адреса')} — {tr('telefon + email, oferta', 'телефон + email, оферта')}</li>
              <li>{tr('Hujjatlar: YATT guvohnomasi + pasport', 'Документы: свидетельство ИП + паспорт')}</li>
              <li>{tr('my3.soliq.uz → komissionerlar roʻyxati → Uzum:', 'my3.soliq.uz → список комиссионеров → Uzum:')}<pre className={u.mono}>{rekvizit}</pre></li>
              <li>{f.uzum.qollabQuvvatlashUrl ? <a href={f.uzum.qollabQuvvatlashUrl} target="_blank" rel="noopener noreferrer">{tr('biznes-qoʻllab-quvvatlash', 'бизнес-поддержка')}</a> : tr('qoʻllab-quvvatlash', 'поддержка')} — {tr('3 ta skrinshot', '3 скриншота')}{f.uzum.faollashtirishKun !== null ? tr(`; tekshiruv ~${f.uzum.faollashtirishKun} kun`, `; проверка ~${f.uzum.faollashtirishKun} дн`) : ''}</li>
            </ol>
            <div className={u.chiplar}>
              <button type="button" className={`${u.chip} ${u.chipYengil}`} onClick={nusxala}>{nusxalandi ? tr('Nusxalandi ✓', 'Скопировано ✓') : tr('Rekvizitlarni nusxalash', 'Скопировать реквизиты')}</button>
              {f.uzum.qollanmaUrl && <a className={`${u.chip} ${u.chipYengil}`} href={f.uzum.qollanmaUrl} target="_blank" rel="noopener noreferrer">{tr('Rasmiy qoʻllanma', 'Официальная инструкция')}</a>}
            </div>
            {f.uzum.tolovStandart && <p className={u.kichikIzoh}>{tr('Toʻlov jadvali (standart):', 'График выплат (стандарт):')} {f.uzum.tolovStandart}</p>}
            <Manba manba={f.uzum.manba} olchandi={f.uzum.olchandi} tr={tr} />
          </div>
        </>
      )}
      {n.izoh && <p className={u.kichikIzoh}>{n.izoh}</p>}
    </div>
  );
}

/* ------------------------------------------------------ 8-qadam: qabul */

interface QabulFaktlarQ {
  ombor: { manzil: string | null; soat: string | null };
  qaytarish: { manzil: string | null; soat: string | null };
  muddatKunMax: number | null; tafovutSom: number | null; taqiqJarimaSom: number | null;
  taymslot: { ozgartirishMax: number | null; bekorSoat: number | null };
  yetkazma: { skuMax: number | null; aktNusxa: number | null; qutiToliqlik: string | null };
  yorliq: Record<string, string>; qadoqUmumiy: string | null;
  logistika: { url: string | null; qutiKgMax: number | null; oldinKun: number | null };
  qollanmaUrl: string | null; manba: string | null; olchandi: string | null; yetishmaydi: string[];
}
type QabulQatorlariQ = Array<{ productId: number; title: string; miqdor: number | null; qadoq: { tur: string; usul: string; belgilar: string | null } | null }>;
interface QabulQ {
  olchov_yoq?: boolean; sabab?: string; jamiDona?: number | null; izoh?: string;
  faktlar?: QabulFaktlarQ;
  qatorlar?: QabulQatorlariQ;
}

const dona = (x: number | null | undefined, tr: Tr) => (x === null || x === undefined ? '' : ` · ${raqam(x)} ${tr('dona', 'шт')}`);

/**
 * 8-qadam kartasi: Xitoydan kelgan yukni sanash roʻyxati va omborda
 * aniqlangan muammo narxi. Uzum ombori, qadoq va yetkazma — 10-qadamda
 * (kartochkadan keyin; tartib 2026-09-29 da tuzatildi).
 */
function QabulKartasi({ n, tr }: { n: QabulQ; tr: Tr }) {
  const f = n.faktlar;
  if (!f) return <p className={u.kichikIzoh}>{n.sabab ?? tr('faktlar yoʻq', 'нет данных')}</p>;
  const q = n.qatorlar ?? [];
  return (
    <div className={u.kartalar}>
      <div className={u.karta}>
        <div className={u.kartaBoshi}><div className={u.kartaNomBlok}><div className={u.kartaNomi}>{tr('Yukni sanash', 'Пересчёт груза')}{dona(n.jamiDona, tr)}</div></div></div>
        {q.length === 0 ? <p className={u.kichikIzoh}>{tr('Varaqada tovar yoʻq.', 'В листе нет товаров.')}</p> : q.map((x) => (
          <div key={x.productId} className={u.statlar}>
            <Stat nom={x.title} q={x.miqdor === null ? '—' : `${x.miqdor} ${tr('dona', 'шт')}`} />
          </div>
        ))}
        <p className={u.kichikIzoh}>{tr('Qutilarni oching, sanang, har donani koʻzdan kechiring. Kam, nuqsonli yoki qadogʻi buzilgan boʻlsa — suratga oling va agentga yozing.', 'Откройте коробки, пересчитайте, осмотрите каждую единицу. Недостача, брак или повреждённая упаковка — сфотографируйте и напишите агенту.')}</p>
        <div className={u.statlar}>
          <Stat nom={tr('Uzum omborida har muammo', 'Каждая проблема на складе Uzum')} q={f.tafovutSom === null ? tr('faktda yoʻq', 'нет в фактах') : `${raqam(f.tafovutSom)} ${tr('soʻm / birlik', 'сум / ед')}`} izoh={tr('brak, kam, ortiqcha, yorliqsiz, aralash', 'брак, недостача, излишек, без этикетки, пересорт')} />
        </div>
        <Manba manba={f.manba} olchandi={f.olchandi} tr={tr} />
      </div>
      {n.izoh && <p className={u.kichikIzoh}>{n.izoh}</p>}
    </div>
  );
}

/* ------------------------------------------------------ 9-qadam: studiya */

interface SuratTalablariQ {
  format: string | null; minEni: number | null; minBoyi: number | null; nisbat: string | null; maxMb: number | null;
  tovarUlushMin: number | null; qoidalar: string[]; fotostudiya: string | null; qollanmaUrl: string | null;
  kartochkaQoidalari: string[]; kartochkaQollanmaUrl: string | null; manba: string | null; olchandi: string | null; yetishmaydi: string[];
}
interface StudiyaSuratiQ {
  /** Eski (Lens davri, 2026-09-29) suhbatlarda `internet` ham uchraydi. */
  manba: '1688-tanlov' | '1688-galereya' | '1688-oxshash' | 'internet'; asl: string; sayt: string | null;
  eni: number | null; boyi: number | null; nom: string | null; url: string | null;
}
interface StudiyaQatoriQ {
  productId: number; title: string; suratlar: StudiyaSuratiQ[];
  /** Eski suhbatlarda yoʻq boʻlishi mumkin — teg chiqmaydi. */
  galereya?: 'olindi' | 'keshdan' | 'olinmadi' | 'xato'; galereyaSabab?: string | null; video?: string | null;
}
interface StudiyaQ {
  olchov_yoq?: boolean; sabab?: string; qatorlar?: StudiyaQatoriQ[]; talablar?: SuratTalablariQ | null;
  sozlangan?: boolean; chiqishMos?: boolean | null; izoh?: string;
}

/** Brauzerda faylni saqlatadi (kengaytma yon panelida ham ishlaydi — ramkada `sandbox` yoʻq). */
function saqla(blob: Blob, nom: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function talabQatori(t: SuratTalablariQ | null | undefined, tr: Tr): string {
  if (!t || t.minEni === null || t.minBoyi === null) return tr('Uzum surat talablari faktda yoʻq.', 'Требования Uzum к фото не заполнены.');
  return tr(
    `Uzum talabi: kamida ${t.minEni}×${t.minBoyi}, ${t.nisbat ?? 'nisbat faktda yoʻq'}${t.maxMb !== null ? `, ${t.maxMb} MB gacha` : ''}${t.format ? `; ${t.format}` : ''}.`,
    `Требование Uzum: минимум ${t.minEni}×${t.minBoyi}, ${t.nisbat ?? 'пропорция не заполнена'}${t.maxMb !== null ? `, до ${t.maxMb} МБ` : ''}${t.format ? `; ${t.format}` : ''}.`,
  );
}

/**
 * 9-qadam kartasi: har tovar uchun suratlar (siz tanlagan 1688 taklifi va
 * uning galereyasi, joy qolsa oʻxshash takliflar) — studiya ulangan boʻlsa
 * oq fonli 1200×1600 koʻrinishda.
 * Belgilangan suratlar bitta faylga (bitta — JPEG, bir nechta — ZIP)
 * yuklanadi. Tizim suratni Uzumga YUKLAMAYDI — kartochkaga siz qoʻyasiz.
 * Studiya tayyorlay olmagan surat (manba yopiq va h.k.) belgilanmaydi.
 */
function StudiyaKartasi({ n, tr }: { n: StudiyaQ; tr: Tr }) {
  const [tanlangan, setTanlangan] = useState<string[]>([]);
  const [buzuq, setBuzuq] = useState<string[]>([]);
  const [band, setBand] = useState(false);
  const [holat, setHolat] = useState<string | null>(null);
  const q = n.qatorlar ?? [];
  const sozlangan = n.sozlangan === true;
  const kalit = (productId: number, i: number) => `${productId}:${i}`;
  const mumkin = q.flatMap((x) => x.suratlar.flatMap((s, i) => (s.url !== null && !buzuq.includes(kalit(x.productId, i)) ? [kalit(x.productId, i)] : [])));
  const belgilangan = tanlangan.filter((k) => mumkin.includes(k));
  const almashtir = (k: string) => setTanlangan((e) => (e.includes(k) ? e.filter((x) => x !== k) : [...e, k]));
  const manbaNomi = (s: StudiyaSuratiQ) =>
    s.manba === '1688-tanlov' ? tr('tanlangan taklif', 'выбранный вариант')
      : s.manba === '1688-galereya' ? tr('taklif galereyasi', 'галерея варианта')
        : s.manba === '1688-oxshash' ? tr('oʻxshash taklif', 'похожий вариант')
          : (s.sayt ?? '—');
  const galereyaTegi = (x: StudiyaQatoriQ): [string | undefined, string] | null =>
    x.galereya === 'olindi' ? [u.tegYaxshi, tr('1688 galereyasi', 'галерея 1688')]
      : x.galereya === 'keshdan' ? [u.tegNeytral, tr('1688 galereyasi (keshdan)', 'галерея 1688 (из кэша)')]
        : x.galereya === 'olinmadi' ? [u.tegOgoh, tr('galereya olinmadi', 'галерея не получена')]
          : x.galereya === 'xato' ? [u.tegOgoh, tr('galereya: xato', 'галерея: ошибка')]
            : null;

  async function yuklab() {
    const royxat = q.flatMap((x) => x.suratlar.flatMap((s, i) => (
      belgilangan.includes(kalit(x.productId, i)) && s.url !== null ? [{ nom: `${faylBolagi(x.title)}-${i + 1}.jpg`, url: s.url }] : [])));
    if (royxat.length === 0) return;
    setBand(true);
    const olingan: Array<{ nom: string; buf: ArrayBuffer }> = [];
    let xato = 0;
    for (const [j, f] of royxat.entries()) {
      setHolat(tr(`Tayyorlanmoqda: ${j + 1} / ${royxat.length}…`, `Готовим: ${j + 1} / ${royxat.length}…`));
      try {
        const r = await fetch(f.url);
        if (!r.ok) throw new Error(String(r.status));
        olingan.push({ nom: f.nom, buf: await r.arrayBuffer() });
      } catch {
        xato += 1;
      }
    }
    if (olingan.length === 1) saqla(new Blob([olingan[0]!.buf], { type: 'image/jpeg' }), olingan[0]!.nom);
    else if (olingan.length > 1) {
      const zip = zipYasa(olingan.map((f) => ({ nom: f.nom, baytlar: new Uint8Array(f.buf) })));
      saqla(new Blob([zip], { type: 'application/zip' }), `zumsavdo-suratlar-${new Date().toISOString().slice(0, 10)}.zip`);
    }
    setHolat(xato
      ? tr(`${olingan.length} ta surat yuklandi, ${xato} tasi olinmadi — qayta urinib koʻring.`, `Скачано ${olingan.length}, не получено ${xato} — попробуйте ещё раз.`)
      : tr(`Yuklab olindi: ${olingan.length} ta surat.`, `Скачано фото: ${olingan.length}.`));
    setBand(false);
  }

  return (
    <div className={u.kartalar}>
      {!sozlangan && (
        <p className={u.ogohlik}>{tr('Studiya xizmati hali ulanmagan — suratlar asl holida (fon oqlanmagan). Suratni bosib asl nusxasini oching.', 'Сервис студии ещё не подключён — фото в исходном виде (фон не белый). Нажмите на фото, чтобы открыть оригинал.')}</p>
      )}
      {n.chiqishMos === false && (
        <p className={u.ogohlik}>{tr(`Diqqat: studiya chiqishi (${STUDIYA_CHIQISH.eni}×${STUDIYA_CHIQISH.boyi}) Uzumning hozirgi talabiga mos emas — nazoratchiga yozildi.`, `Внимание: размер студии (${STUDIYA_CHIQISH.eni}×${STUDIYA_CHIQISH.boyi}) не соответствует текущему требованию Uzum — передано контролёру.`)} {talabQatori(n.talablar, tr)}</p>
      )}
      {q.map((x) => {
        const teg = galereyaTegi(x);
        return (
          <div key={x.productId} className={u.karta}>
            <div className={u.kartaBoshi}>
              <div className={u.kartaNomBlok}><div className={u.kartaNomi}>{x.title}</div></div>
              {teg && <span className={`${u.teg} ${teg[0]}`}>{teg[1]}</span>}
            </div>
            {x.galereyaSabab && <p className={u.ogohlik}>{x.galereyaSabab}</p>}
            {x.suratlar.length === 0 ? (
              <p className={u.kichikIzoh}>{tr('Surat topilmadi — oʻzingiz suratga oling (oq yoki och bir xil fon, tovar kadrning yarmidan koʻpi).', 'Фото не найдено — снимите сами (белый или светлый однотонный фон, товар больше половины кадра).')}</p>
            ) : (
              <div className={u.studiyaGrid}>
                {x.suratlar.map((s, i) => {
                  const k = kalit(x.productId, i);
                  const yoq = buzuq.includes(k);
                  const ichi = (
                    <>
                      <span className={u.studiyaRasmIchi}>
                        {yoq
                          ? <span>{tr('Studiya bu suratni ololmadi', 'Студия не смогла получить фото')}</span>
                          : <img src={s.url ?? s.asl} alt={s.nom ?? x.title} loading="lazy" referrerPolicy="no-referrer"
                              onError={() => setBuzuq((e) => (e.includes(k) ? e : [...e, k]))} />}
                      </span>
                      <span className={u.studiyaManba}>
                        <span>{i + 1}. {manbaNomi(s)}</span>
                        {s.eni !== null && s.boyi !== null && <span>{s.eni}×{s.boyi}</span>}
                      </span>
                      {tanlangan.includes(k) && !yoq && <span className={u.katalogTanlov} aria-hidden="true">✓</span>}
                    </>
                  );
                  return s.url === null ? (
                    <a key={k} className={u.studiyaRasm} href={s.asl} target="_blank" rel="noopener noreferrer">{ichi}</a>
                  ) : (
                    <button key={k} type="button" className={`${u.studiyaRasm} ${tanlangan.includes(k) && !yoq ? u.studiyaTanlangan : ''}`}
                      aria-pressed={tanlangan.includes(k)} disabled={yoq || band} onClick={() => almashtir(k)}>{ichi}</button>
                  );
                })}
              </div>
            )}
            {x.suratlar.some((y) => y.manba === '1688-galereya') && (
              <p className={u.kichikIzoh}>{tr('Galereyada taklifning boshqa rang va variantlari ham boʻladi — faqat siz buyurtma qilgan rang va variant suratini tanlang.', 'В галерее бывают и другие цвета и варианты — выбирайте только фото того цвета и варианта, который вы заказали.')}</p>
            )}
            {x.suratlar.some((y) => y.manba === '1688-oxshash') && (
              <p className={u.kichikIzoh}>{tr('«Oʻxshash taklif» — boshqa 1688 sotuvchisining surati: tovar aynan siz olganidek ekanini tekshiring.', '«Похожий вариант» — фото другого продавца 1688: проверьте, что товар точно такой же.')}</p>
            )}
            {x.video && /^https?:\/\//i.test(x.video) && (
              <p className={u.kichikIzoh}>
                <a href={x.video} target="_blank" rel="noopener noreferrer">{tr('Taklif videosi (1688)', 'Видео варианта (1688)')}</a>
                {' '}{tr('— Uzum MP4 video qabul qiladi; xitoycha yozuv yoki ovoz boʻlsa ishlatmang.', '— Uzum принимает MP4; с китайским текстом или голосом не используйте.')}
              </p>
            )}
          </div>
        );
      })}
      {sozlangan && mumkin.length > 0 && (
        <div className={u.karta}>
          <div className={u.chiplar}>
            <button type="button" className={`${u.chip} ${u.chipYengil}`} disabled={band}
              onClick={() => setTanlangan(belgilangan.length === mumkin.length ? [] : mumkin)}>
              {belgilangan.length === mumkin.length ? tr('Belgilarni olib tashlash', 'Снять выделение') : tr('Hammasini belgilash', 'Выбрать все')}
            </button>
            <button type="button" className={`${u.chip} ${u.chipAsosiy}`} disabled={band || belgilangan.length === 0} onClick={() => void yuklab()}>
              {belgilangan.length > 1
                ? tr(`Yuklab olish — ${belgilangan.length} ta (ZIP)`, `Скачать — ${belgilangan.length} (ZIP)`)
                : tr('Yuklab olish', 'Скачать')}
            </button>
          </div>
          {holat && <p className={u.kichikIzoh} role="status">{holat}</p>}
          <p className={u.kichikIzoh}>{tr(`Har surat ${STUDIYA_CHIQISH.eni}×${STUDIYA_CHIQISH.boyi} JPEG, oq fon.`, `Каждое фото ${STUDIYA_CHIQISH.eni}×${STUDIYA_CHIQISH.boyi} JPEG, белый фон.`)} {talabQatori(n.talablar, tr)}</p>
        </div>
      )}
      {n.talablar && n.talablar.qoidalar.length > 0 && (
        <details className={u.kichikIzoh}>
          <summary>{tr(`Uzum surat qoidalari (${n.talablar.qoidalar.length})`, `Правила фото Uzum (${n.talablar.qoidalar.length})`)}</summary>
          <ol>{n.talablar.qoidalar.map((r) => <li key={r}>{r}</li>)}</ol>
          {n.talablar.qollanmaUrl && <a href={n.talablar.qollanmaUrl} target="_blank" rel="noopener noreferrer">{tr('Rasmiy qoʻllanma (5.7)', 'Инструкция (5.7)')}</a>}
        </details>
      )}
      {n.izoh && <p className={u.kichikIzoh}>{n.izoh}</p>}
    </div>
  );
}

/* ------------------------------------------------------ 10-qadam: yuklash */

interface YuklashQ {
  olchov_yoq?: boolean; sabab?: string; jamiDona?: number | null; izoh?: string;
  faktlar?: QabulFaktlarQ; talablar?: SuratTalablariQ; qatorlar?: QabulQatorlariQ;
}

/**
 * 10-qadam kartasi, Uzum jarayoni tartibida: 1) kartochka (surat talablari
 * va qoidalar, 0059), 2) qadoq va yorliq, 3) yetkazma va ombor (0058).
 * Fakt yoʻq — "faktda yoʻq", nol emas.
 */
function YuklashKartasi({ n, tr }: { n: YuklashQ; tr: Tr }) {
  const f = n.faktlar;
  const t = n.talablar;
  if (!f || !t) return <p className={u.kichikIzoh}>{n.sabab ?? tr('faktlar yoʻq', 'нет данных')}</p>;
  const yoq = tr('faktda yoʻq', 'нет в фактах');
  const son = (x: number | null, birlik: string) => (x === null ? yoq : `${raqam(x)} ${birlik}`);
  const q = n.qatorlar ?? [];
  const yetishmaydi = [...f.yetishmaydi, ...t.yetishmaydi];
  return (
    <div className={u.kartalar}>
      {yetishmaydi.length > 0 && <p className={u.ogohlik}>{tr('Faktda yoʻq:', 'Нет в фактах:')} {yetishmaydi.join(', ')}</p>}
      <div className={u.karta}>
        <div className={u.kartaBoshi}><div className={u.kartaNomBlok}><div className={u.kartaNomi}>{tr('1. Kartochka', '1. Карточка')}</div></div></div>
        <div className={u.statlar}>
          <Stat nom={tr('Surat (kamida)', 'Фото (минимум)')} q={t.minEni !== null && t.minBoyi !== null ? `${t.minEni}×${t.minBoyi}` : yoq} izoh={t.nisbat ?? undefined} />
          <Stat nom={tr('Hajm', 'Размер')} q={t.maxMb !== null ? `≤ ${t.maxMb} MB` : yoq} izoh={t.format ?? undefined} />
          <Stat nom={tr('Tovar kadrda', 'Товар в кадре')} q={t.tovarUlushMin !== null ? `> ${t.tovarUlushMin} %` : yoq} />
          <Stat nom={tr('Studiya suratlari', 'Фото из студии')} q={`${STUDIYA_CHIQISH.eni}×${STUDIYA_CHIQISH.boyi}`} izoh={tr('3:4, oq fon (9-qadam)', '3:4, белый фон (шаг 9)')} />
        </div>
        {t.kartochkaQoidalari.length > 0 && <ol className={u.kichikIzoh}>{t.kartochkaQoidalari.map((r) => <li key={r}>{r}</li>)}</ol>}
        {t.fotostudiya && <p className={u.kichikIzoh}>{tr('Uzum Fotostudiyasi:', 'Фотостудия Uzum:')} {t.fotostudiya}</p>}
        {t.kartochkaQollanmaUrl && (
          <div className={u.chiplar}>
            <a className={`${u.chip} ${u.chipYengil}`} href={t.kartochkaQollanmaUrl} target="_blank" rel="noopener noreferrer">{tr('Rasmiy qoʻllanma (5-bob)', 'Инструкция (гл. 5)')}</a>
          </div>
        )}
        <Manba manba={t.manba} olchandi={t.olchandi} tr={tr} />
      </div>
      <div className={u.karta}>
        <div className={u.kartaBoshi}><div className={u.kartaNomBlok}><div className={u.kartaNomi}>{tr('2. Qadoq va yorliq', '2. Упаковка и этикетка')}{dona(n.jamiDona, tr)}</div></div></div>
        {q.length === 0 ? <p className={u.kichikIzoh}>{tr('Varaqada tovar yoʻq.', 'В листе нет товаров.')}</p> : q.map((x) => (
          <div key={x.productId} className={u.statlar}>
            <Stat nom={x.title} q={x.miqdor === null ? '—' : `${x.miqdor} ${tr('dona', 'шт')}`} />
            <Stat nom={x.qadoq ? x.qadoq.tur : tr('Umumiy qoida', 'Общее правило')} q={x.qadoq ? x.qadoq.usul : (f.qadoqUmumiy ?? yoq)} izoh={x.qadoq?.belgilar ?? undefined} />
          </div>
        ))}
        <div className={u.statlar}>
          <Stat nom={tr('Kod', 'Код')} q={f.yorliq.kod ?? yoq} />
          <Stat nom={tr('Yorliq oʻlchami', 'Размер этикетки')} q={f.yorliq.tavsiya ?? yoq} izoh={f.yorliq.min ? `${tr('min', 'мин')} ${f.yorliq.min}${f.yorliq.dpi ? `, ${f.yorliq.dpi} dpi` : ''}` : undefined} />
          <Stat nom={tr('Quti', 'Коробка')} q={f.yetkazma.qutiToliqlik ?? yoq} />
        </div>
      </div>
      <div className={u.karta}>
        <div className={u.kartaBoshi}><div className={u.kartaNomBlok}><div className={u.kartaNomi}>{tr('3. Yetkazma va Uzum ombori', '3. Поставка и склад Uzum')}</div></div></div>
        <p className={u.kichikIzoh}>{f.ombor.manzil ?? yoq} · {f.ombor.soat ?? yoq}</p>
        {f.qaytarish.manzil && <p className={u.kichikIzoh}>{tr('Qaytarilgan tovarlar:', 'Возвраты:')} {f.qaytarish.manzil} · {f.qaytarish.soat ?? ''}</p>}
        <div className={u.statlar}>
          <Stat nom={tr('Yetkazma', 'Поставка')} q={f.yetkazma.skuMax === null ? yoq : `${f.yetkazma.skuMax} SKU ${tr('gacha', 'макс')}`} izoh={f.yetkazma.aktNusxa !== null ? tr(`akt ${f.yetkazma.aktNusxa} nusxa`, `акт ${f.yetkazma.aktNusxa} экз`) : undefined} />
          <Stat nom={tr('Taymslot', 'Таймслот')} q={f.taymslot.ozgartirishMax === null ? yoq : `${f.taymslot.ozgartirishMax} ${tr('marta oʻzgartirish', 'изменения')}`} izoh={f.taymslot.bekorSoat !== null ? tr(`bekor — ${f.taymslot.bekorSoat} soat oldin`, `отмена — за ${f.taymslot.bekorSoat} ч`) : undefined} />
          <Stat nom={tr('Viloyatdan', 'Из регионов')} q={f.logistika.qutiKgMax === null ? yoq : `${tr('quti', 'коробка')} ≤ ${f.logistika.qutiKgMax} kg`} izoh={f.logistika.oldinKun !== null ? tr(`taymslotdan ${f.logistika.oldinKun} kun oldin, pullik`, `за ${f.logistika.oldinKun} дн до таймслота, платно`) : undefined} />
          <Stat nom={tr('Qabul muddati', 'Срок приёмки')} q={f.muddatKunMax === null ? yoq : `${tr('gacha', 'до')} ${f.muddatKunMax} ${tr('kun', 'дн')}`} />
          <Stat nom={tr('Tafovut', 'Расхождение')} q={son(f.tafovutSom, tr('soʻm / birlik', 'сум / ед'))} />
          <Stat nom={tr('Taqiqlangan tovar', 'Запрещённый товар')} q={son(f.taqiqJarimaSom, tr('soʻm', 'сум'))} />
        </div>
        <div className={u.chiplar}>
          {f.logistika.url && <a className={`${u.chip} ${u.chipYengil}`} href={f.logistika.url} target="_blank" rel="noopener noreferrer">{tr('Uzum logistikasi', 'Логистика Uzum')}</a>}
          {f.qollanmaUrl && <a className={`${u.chip} ${u.chipYengil}`} href={f.qollanmaUrl} target="_blank" rel="noopener noreferrer">{tr('Rasmiy qoʻllanma (6-bob)', 'Инструкция (гл. 6)')}</a>}
        </div>
        <Manba manba={f.manba} olchandi={f.olchandi} tr={tr} />
      </div>
      {n.izoh && <p className={u.kichikIzoh}>{n.izoh}</p>}
    </div>
  );
}

/* ------------------------------------------------------ 11-qadam: sotuv */

interface OzHolatQ {
  holat: 'olchandi' | 'kutilmoqda'; sana: string | null; bugunSotildi: number | null; tezlik: number | null; tezlikKun: number;
  zaxira: number | null; zaxiraKun: number | null; zaxiraUlush: number | null; narx: number | null; sharh: number | null;
  reyting: number | null; yangiSharh: number; oyDona: number | null; oySom: number | null; olchovKun: number;
}
interface RaqobatchiQ { narx: number | null; oldingiNarx: number | null; tushdiFoiz: number | null; sana: string | null }
interface SotuvQ {
  olchov_yoq?: boolean; sabab?: string; sana?: string; oy?: string; partiya?: number;
  qatorlar?: Array<{ productId: number; title: string; miqdor: number | null; ozId: number | null; partiya?: number; oz: OzHolatQ | null; raqobatchi: RaqobatchiQ | null }>;
  signallar?: Array<{ id: string; tur: 'zaxira' | 'narx' | 'sharh'; productId: number }>;
  kuzatuvXato?: string | null;
  jami?: { bugunDona: number | null; oyDona: number | null; oySom: number | null };
  izoh?: string;
}

const somQ = (x: number | null | undefined, tr: Tr) => (x === null || x === undefined ? '—' : `${raqam(x)} ${tr('soʻm', 'сум')}`);

/**
 * 11-qadam kartasi: har tovar — oʻz kartochkasi (oʻlchov) va raqobatchi
 * narxi. Hamma sotuv raqami taxmin (zaxira kamayishidan) va shunday yoziladi.
 */
function SotuvKartasi({ n, tr }: { n: SotuvQ; tr: Tr }) {
  const q = n.qatorlar ?? [];
  const j = n.jami;
  return (
    <div className={u.kartalar}>
      {n.kuzatuvXato && <p className={u.ogohlik}>{tr('Kuzatuvga qoʻshib boʻlmadi:', 'Не удалось добавить в отслеживание:')} {n.kuzatuvXato}</p>}
      {q.map((x) => {
        const o = x.oz;
        const [sinf, teg] = x.ozId === null ? [u.tegOgoh, tr('havola yoʻq', 'нет ссылки')]
          : o?.holat === 'olchandi' ? [u.tegYaxshi, tr('oʻlchanmoqda', 'измеряется')]
            : [u.tegNeytral, tr('oʻlchov kutilmoqda', 'ждём замер')];
        const r = x.raqobatchi;
        return (
          <div key={x.productId} className={u.karta}>
            <div className={u.kartaBoshi}>
              <div className={u.kartaNomBlok}>
                <div className={u.kartaNomi}>{x.title}</div>
                {x.ozId !== null && <div className={u.kichikIzoh}><a href={`https://uzum.uz/uz/product/${x.ozId}`} target="_blank" rel="noopener noreferrer">{tr('Oʻz kartochkangiz', 'Ваша карточка')}</a>{o?.sana ? ` · ${tr('oxirgi oʻlchov', 'последний замер')} ${o.sana}` : ''}{x.partiya && x.partiya > 1 ? ` · ${x.partiya}-${tr('partiya', 'партия')}` : ''}</div>}
              </div>
              <span className={`${u.teg} ${sinf}`}>{teg}</span>
            </div>
            {o && o.holat === 'olchandi' && (
              <div className={u.statlar}>
                <Stat nom={tr('Bugun sotildi', 'Продано сегодня')} q={o.bugunSotildi === null ? '—' : `${o.bugunSotildi} ${tr('dona', 'шт')}`} izoh={tr('zaxira kamayishidan', 'по снижению остатка')} />
                <Stat nom={tr('Tezlik', 'Скорость')} q={o.tezlik === null ? '—' : `${o.tezlik} ${tr('dona/kun', 'шт/день')}`} izoh={o.tezlikKun ? tr(`oxirgi ${o.tezlikKun} kun`, `за ${o.tezlikKun} дн`) : undefined} />
                <Stat nom={tr('Zaxira', 'Остаток')} q={o.zaxira === null ? '—' : `${o.zaxira} ${tr('dona', 'шт')}`} izoh={o.zaxiraKun !== null ? tr(`${o.zaxiraKun} kunga yetadi`, `хватит на ${o.zaxiraKun} дн`) : undefined} />
                <Stat nom={tr('Narxingiz', 'Ваша цена')} q={somQ(o.narx, tr)} />
                <Stat nom={tr('Sharhlar', 'Отзывы')} q={o.sharh === null ? '—' : String(o.sharh)} izoh={o.yangiSharh ? tr(`+${o.yangiSharh} yangi`, `+${o.yangiSharh} новых`) : (o.reyting !== null ? `★ ${o.reyting}` : undefined)} />
                <Stat nom={tr('Shu oy', 'За месяц')} q={o.oyDona === null ? '—' : `${o.oyDona} ${tr('dona', 'шт')}`} izoh={o.oySom !== null ? `≈ ${somQ(o.oySom, tr)}` : undefined} />
              </div>
            )}
            {x.ozId !== null && o?.holat !== 'olchandi' && (
              <p className={u.kichikIzoh}>{tr('Kuzatuvga qoʻshildi. Skreyper kuniga 3 marta oʻlchaydi (09:00, 17:00, 01:00); sotuv raqami ikki oʻlchovdan keyin chiqadi.', 'Добавлено в отслеживание. Замер 3 раза в день (09:00, 17:00, 01:00); продажи — после двух замеров.')}</p>
            )}
            {r && r.narx !== null && (
              <p className={u.kichikIzoh}>
                {tr('Raqobatchi narxi', 'Цена конкурента')}: {somQ(r.narx, tr)}
                {r.tushdiFoiz !== null && r.oldingiNarx !== null ? ` (${tr('oldin', 'было')} ${raqam(r.oldingiNarx)}, −${r.tushdiFoiz} %)` : ''}
                {r.sana ? ` · ${r.sana}` : ''}
              </p>
            )}
          </div>
        );
      })}
      {j && (j.bugunDona !== null || j.oyDona !== null) && (
        <div className={u.karta}>
          <div className={u.statlar}>
            <Stat nom={tr('Bugun jami', 'Сегодня всего')} q={j.bugunDona === null ? '—' : `${j.bugunDona} ${tr('dona', 'шт')}`} />
            <Stat nom={tr('Shu oy jami', 'За месяц всего')} q={j.oyDona === null ? '—' : `${j.oyDona} ${tr('dona', 'шт')}`} izoh={j.oySom !== null ? `≈ ${somQ(j.oySom, tr)}` : undefined} />
          </div>
          <p className={u.kichikIzoh}>{tr('Taxmin: Uzum buyurtma sonini bermaydi, sotuv zaxira kamayishidan hisoblanadi. Aniq raqam — kabinetdagi komissioner hisobotida.', 'Оценка: Uzum не отдаёт число заказов, продажи считаются по снижению остатка. Точные цифры — в отчёте комиссионера в кабинете.')}</p>
        </div>
      )}
      {n.izoh && <p className={u.kichikIzoh}>{n.izoh}</p>}
    </div>
  );
}

/* ------------------------------------------------------ 12-qadam: hisobot */

interface HisobotFaktlarQ {
  soliq: { aylanmaFoiz: number | null; ijtimoiyOySom: number | null; tolovKuni: number | null; manba: string | null; olchandi: string | null };
  agent: string | null; aylanmaDavri: string | null; aylanmaKun: number | null; portalUrl: string | null; komissionerKun: number | null; yetishmaydi: string[];
}
interface HisobotQ {
  olchov_yoq?: boolean; sabab?: string; oy?: string; tugagan?: boolean; faktlar?: HisobotFaktlarQ;
  olchovSotuv?: number | null; olchovDona?: number | null;
  qatorlar?: Array<{ productId: number; title: string; oyDona: number | null; oySom: number | null }>;
  izoh?: string;
}

function HisobotKartasi({ n, tr }: { n: HisobotQ; tr: Tr }) {
  const q = n.qatorlar ?? [];
  const f = n.faktlar;
  return (
    <div className={u.kartalar}>
      {f && f.yetishmaydi.length > 0 && <p className={u.ogohlik}>{tr('Faktda yoʻq:', 'Нет в фактах:')} {f.yetishmaydi.join(', ')}</p>}
      <div className={u.karta}>
        <div className={u.kartaBoshi}>
          <div className={u.kartaNomBlok}><div className={u.kartaNomi}>{tr('Oy hisoboti', 'Отчёт за месяц')} · {n.oy ? oyNomi(n.oy) : '—'}</div></div>
          {n.tugagan === false && <span className={`${u.teg} ${u.tegNeytral}`}>{tr('hozirgacha', 'на сегодня')}</span>}
        </div>
        {q.map((x) => (
          <div key={x.productId} className={u.statlar}>
            <Stat nom={x.title} q={x.oyDona === null ? '—' : `${x.oyDona} ${tr('dona', 'шт')}`} izoh={x.oySom !== null ? `≈ ${somQ(x.oySom, tr)}` : tr('oʻlchov yoʻq', 'нет замера')} />
          </div>
        ))}
        <div className={u.statlar}>
          <Stat nom={tr('Oʻlchovimiz (taxmin)', 'Наш замер (оценка)')} q={somQ(n.olchovSotuv, tr)} izoh={n.olchovDona !== null && n.olchovDona !== undefined ? `${n.olchovDona} ${tr('dona', 'шт')}` : undefined} />
          <Stat nom={tr('Komissioner hisoboti', 'Отчёт комиссионера')} q={f?.komissionerKun !== null && f?.komissionerKun !== undefined ? tr(`keyingi oyning ${f.komissionerKun}-sanasigacha`, `до ${f.komissionerKun} числа след. месяца`) : '—'} izoh={tr('aniq summa shu yerda', 'точная сумма там')} />
        </div>
      </div>
      {n.izoh && <p className={u.kichikIzoh}>{n.izoh}</p>}
    </div>
  );
}

interface HisobotHisobQ {
  oy?: string; tugagan?: boolean; sotuvSom?: number | null; sotuvManbasi?: 'kabinet' | 'olchov' | null; komissiyaSom?: number | null; sofSom?: number | null;
  soliq?: { ijtimoiySom: number | null; aylanmaSom: number | null; jamiSom: number | null };
  ijtimoiyMuddat?: string | null; komissionerSana?: string | null; yetishmaydi?: string[];
  faktlar?: HisobotFaktlarQ; qadamlar?: string[]; izoh?: string;
}

function HisobotHisobKartasi({ n, tr }: { n: HisobotHisobQ; tr: Tr }) {
  const s = n.soliq;
  const f = n.faktlar;
  return (
    <div className={u.kartalar}>
      <div className={u.karta}>
        <div className={u.kartaBoshi}>
          <div className={u.kartaNomBlok}><div className={u.kartaNomi}>{tr('Oy yakuni', 'Итоги месяца')} · {n.oy ? oyNomi(n.oy) : '—'}</div></div>
          {n.tugagan === false && <span className={`${u.teg} ${u.tegNeytral}`}>{tr('hozirgacha', 'на сегодня')}</span>}
        </div>
        <div className={u.statlar}>
          <Stat nom={tr('Sotuv', 'Продажи')} q={somQ(n.sotuvSom, tr)} izoh={n.sotuvManbasi === 'kabinet' ? tr('kabinet hisobotidan', 'из отчёта кабинета') : n.sotuvManbasi === 'olchov' ? tr('taxmin, oʻlchovdan', 'оценка по замеру') : undefined} />
          <Stat nom={tr('Komissiya', 'Комиссия')} q={n.komissiyaSom === null || n.komissiyaSom === undefined ? tr('yozilmagan', 'не указана') : somQ(n.komissiyaSom, tr)} />
          <Stat nom={tr('Sof tushum', 'Чистая выручка')} q={n.sofSom === null || n.sofSom === undefined ? '—' : somQ(n.sofSom, tr)} />
          <Stat nom={tr('Aylanma soligʻi', 'Налог с оборота')} q={somQ(s?.aylanmaSom, tr)} izoh={f?.soliq.aylanmaFoiz !== null && f?.soliq.aylanmaFoiz !== undefined ? `${f.soliq.aylanmaFoiz} %` : undefined} />
          <Stat nom={tr('Ijtimoiy soliq', 'Социальный налог')} q={somQ(s?.ijtimoiySom, tr)} izoh={n.ijtimoiyMuddat ? tr(`${n.ijtimoiyMuddat} gacha`, `до ${n.ijtimoiyMuddat}`) : undefined} />
        </div>
        {f?.agent && <p className={u.ogohlik}>{tr('Soliq agenti:', 'Налоговый агент:')} {f.agent}. {tr('Komissioner hisobotida ushlab qolinganini tekshiring.', 'Проверьте удержание в отчёте комиссионера.')}</p>}
      </div>
      {(n.qadamlar ?? []).length > 0 && (
        <div className={u.karta}>
          <div className={u.kartaBoshi}><div className={u.kartaNomBlok}><div className={u.kartaNomi}>{tr('Deklaratsiya qadamlari', 'Шаги декларации')}</div></div></div>
          <ol className={u.kichikIzoh}>{(n.qadamlar ?? []).map((q) => <li key={q}>{q}</li>)}</ol>
          <div className={u.chiplar}>
            {f?.portalUrl && <a className={`${u.chip} ${u.chipYengil}`} href={f.portalUrl} target="_blank" rel="noopener noreferrer">{tr('Soliq portali', 'Налоговый портал')}</a>}
            <a className={`${u.chip} ${u.chipYengil}`} href="https://seller.uzum.uz" target="_blank" rel="noopener noreferrer">{tr('Uzum kabineti', 'Кабинет Uzum')}</a>
          </div>
          {f?.soliq.manba && <Manba manba={f.soliq.manba} olchandi={f.soliq.olchandi} tr={tr} />}
        </div>
      )}
      {n.izoh && <p className={u.kichikIzoh}>{n.izoh}</p>}
    </div>
  );
}

interface HisobotYakunQ { reja?: string[]; izoh?: string }

function HisobotYakunKartasi({ n, tr }: { n: HisobotYakunQ; tr: Tr }) {
  const r = n.reja ?? [];
  return (
    <div className={u.kartalar}>
      {r.length > 0 && (
        <div className={u.karta}>
          <div className={u.kartaBoshi}><div className={u.kartaNomBlok}><div className={u.kartaNomi}>{tr('Keyingi oy rejasi', 'План на следующий месяц')}</div></div></div>
          <ul className={u.kichikIzoh}>{r.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}
      {n.izoh && <p className={u.kichikIzoh}>{n.izoh}</p>}
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

/* ------------------------------------------------------ javob berish */

function Javoblash({ savol, tezOrada, kutish, band, tanlangan, setTanlangan, matn, setMatn, javobBer, boshdan, tr }: {
  savol: Savol | null;
  tezOrada: boolean;
  kutish: boolean;
  band: boolean;
  tanlangan: Array<string | number>;
  setTanlangan: (t: Array<string | number>) => void;
  matn: string;
  setMatn: (s: string) => void;
  javobBer: (savolId: string, javob: unknown) => void;
  boshdan: () => void;
  tr: Tr;
}) {
  if (kutish) {
    return (
      <div className={u.chiplar}>
        <span className={u.holat}>{tr('1688 qidiruvi tugashini kutamiz — sahifani yopmang.', 'Ждём завершения поиска на 1688 — не закрывайте страницу.')}</span>
      </div>
    );
  }
  if (tezOrada || savol === null) {
    return (
      <div className={u.chiplar}>
        <button type="button" className={`${u.chip} ${u.chipYengil}`} onClick={boshdan} disabled={band}>
          {tr('Boshidan boshlash', 'Начать заново')}
        </button>
      </div>
    );
  }

  const otkaz = savol.otkazishMumkin
    ? <button type="button" className={`${u.chip} ${u.chipYengil}`} onClick={() => javobBer(savol.id, null)} disabled={band}>{tr('Oʻtkazib yuborish', 'Пропустить')}</button>
    : null;

  if (savol.turi === 'kopTanlov' && savol.id === 'tovarlar') {
    // Tanlov oqimdagi katalogda. Bu yerda faqat yakun.
    return (
      <div className={u.chiplar}>
        {tanlangan.length > 0
          ? <button type="button" className={`${u.chip} ${u.chipAsosiy}`} onClick={() => javobBer(savol.id, tanlangan)} disabled={band}>{tr(`Tayyor (${tanlangan.length})`, `Готово (${tanlangan.length})`)}</button>
          : <span className={u.holat}>{tr('Yuqoridagi kartalardan tanlang', 'Выберите карточки выше')}</span>}
        {tanlangan.length === 0 && otkaz}
      </div>
    );
  }

  if (savol.turi === 'kopTanlov') {
    return (
      <div className={u.chiplar}>
        {savol.variantlar.map((v) => {
          const bor = tanlangan.some((x) => String(x) === String(v.qiymat));
          return (
            <button key={String(v.qiymat)} type="button" className={`${u.chip} ${bor ? u.chipTanlangan : ''}`} aria-pressed={bor} disabled={band}
              onClick={() => setTanlangan(bor ? tanlangan.filter((x) => String(x) !== String(v.qiymat)) : [...tanlangan, v.qiymat])}>
              {v.nom}
            </button>
          );
        })}
        {tanlangan.length > 0
          ? <button type="button" className={`${u.chip} ${u.chipAsosiy}`} onClick={() => javobBer(savol.id, tanlangan)} disabled={band}>{tr('Tayyor', 'Готово')}</button>
          : otkaz}
      </div>
    );
  }

  const erkinYubor = () => {
    const t = matn.trim();
    if (t === '') return;
    javobBer(savol.id, savol.turi === 'son' ? Number(t) : t);
  };

  return (
    <>
      {savol.variantlar.length > 0 && (
        <div className={u.chiplar}>
          {savol.variantlar.map((v) => (
            <button key={String(v.qiymat)} type="button" className={u.chip} disabled={band} onClick={() => javobBer(savol.id, v.qiymat)}>
              {v.nom}
            </button>
          ))}
        </div>
      )}
      {(savol.erkin || savol.turi === 'matn') && (
        <div className={`${u.shisha} ${u.kiritish}`}>
          <input
            type={savol.turi === 'son' ? 'number' : 'text'}
            min={savol.turi === 'son' ? 0 : undefined}
            inputMode={savol.turi === 'son' ? 'numeric' : 'text'}
            aria-label={savol.matn}
            placeholder={savol.turi === 'son' ? tr('Oʻzim yozaman: aniq son', 'Своё число') : tr('Oʻzim yozaman', 'Свой ответ')}
            value={matn}
            disabled={band}
            onChange={(e) => setMatn(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') erkinYubor(); }}
          />
          <button type="button" className={u.yubor} onClick={erkinYubor} disabled={band}>{tr('Yuborish', 'Отправить')}</button>
        </div>
      )}
      {otkaz && <div className={u.chiplar}>{otkaz}</div>}
    </>
  );
}

/* ------------------------------------------------------ baza */

type BazaHolati = { yuklanmoqda: true } | ({ yuklanmoqda: false } & BazaJavobi);

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

/** Son sotuv sahifasi bilan bir xil keshdan; olinmasa — chiziqcha, nol emas. */
function BazaKartasi({ baza, til }: { baza: BazaHolati; til: Til }) {
  const tr = tarjima(til);
  const o = baza.yuklanmoqda ? null : baza.olchov;
  return (
    <div className={`${u.shisha} ${u.baza}`}>
      <div className={u.bazaYorliq}>{tr('Baza', 'База')}</div>
      <div className={u.bazaSon}>
        <span className={o ? u.tirik : u.ochiqEmas} aria-hidden="true" />
        {baza.yuklanmoqda ? tr('Yuklanmoqda…', 'Загрузка…')
          : o && o.tovar !== null ? `${son(o.tovar)} ${tr('tovar', 'товаров')}` : `— ${tr('tovar', 'товаров')}`}
      </div>
      <div className={u.bazaIzoh}>
        {baza.yuklanmoqda ? 'Uzum' : o ? `Uzum · ${yosh(o.yoshMs, til)}` : tr('Raqam hozir olinmadi', 'Цифра сейчас не получена')}
      </div>
    </div>
  );
}

/* ------------------------------------------------------ profilim */

/** «Profilim» — hisob, obuna va sozlamalar. Savol yoʻq (nazoratchi, 2026-09-25). */
function Profilim({ mavzu, mavzuniTanla, til, tilniTanla, boshdan, yop }: {
  mavzu: Mavzu; mavzuniTanla: (m: Mavzu) => void;
  til: Til; tilniTanla: (t: Til) => void;
  boshdan: () => void; yop: () => void;
}) {
  const tr = tarjima(til);
  const rejalar: ReadonlyArray<{ reja: Reja; nom: string }> = [
    { reja: 'bepul', nom: tr('Bepul', 'Бесплатный') },
    { reja: 'pro', nom: 'Pro' },
    { reja: 'biznes', nom: tr('Biznes', 'Бизнес') },
  ];
  return (
    <div className={u.panelFon} role="presentation" onClick={yop}>
      <div className={u.panel} role="dialog" aria-modal="true" aria-labelledby="profil-sarlavha" onClick={(e) => e.stopPropagation()}>
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
                <p className={u.kichikIzoh}>{tr('Suhbat shu brauzerga bogʻlangan — boshqa qurilmada koʻrinmaydi.', 'Чат привязан к этому браузеру — на другом устройстве его не видно.')}</p>
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
                      {joriy ? <span className={u.teg}>{tr('joriy', 'текущий')}</span> : <span className={`${u.teg} ${u.tegNeytral}`}>{tr('tez orada', 'скоро')}</span>}
                    </div>
                    <div className={u.rejaNarx}>
                      {`${narx === null ? '0' : son(narx)} ${tr('soʻm', 'сум')}`}<span> / {tr('oy', 'мес')}</span>
                    </div>
                    <p className={u.kichikIzoh}>{tr(`1–${qadam}-qadam`, `Шаги 1–${qadam}`)}</p>
                  </div>
                );
              })}
            </div>
            <p className={u.kichikIzoh}>{tr('Toʻlov (Payme, Click) hali ulanmagan — pullik rejaga hozircha oʻtib boʻlmaydi.', 'Оплата (Payme, Click) ещё не подключена — перейти на платный тариф пока нельзя.')}</p>
          </section>
          <section className={u.profilBolim}>
            <div className={u.yorliq}>{tr('Sozlamalar', 'Настройки')}</div>
            <div className={u.profilQator}>
              <span className={u.profilNom}>{tr('Mavzu', 'Тема')}</span>
              <div className={u.mavzu} role="group" aria-label={tr('Mavzu', 'Тема')}>
                {(['yorug', 'tungi'] as const).map((m) => (
                  <button key={m} type="button" className={mavzu === m ? u.mavzuFaol : ''} aria-pressed={mavzu === m} onClick={() => mavzuniTanla(m)}>
                    {m === 'yorug' ? tr('Yorugʻ', 'Светлая') : tr('Tungi', 'Тёмная')}
                  </button>
                ))}
              </div>
            </div>
            <div className={u.profilQator}>
              <span className={u.profilNom}>{tr('Til', 'Язык')}</span>
              <div className={u.mavzu} role="group" aria-label={tr('Til', 'Язык')}>
                {([['uz', 'Oʻzbekcha'], ['ru', 'Русский']] as const).map(([t, nom]) => (
                  <button key={t} type="button" lang={t} className={til === t ? u.mavzuFaol : ''} aria-pressed={til === t} onClick={() => tilniTanla(t)}>{nom}</button>
                ))}
              </div>
            </div>
            <div className={u.profilQator}>
              <div>
                <div className={u.profilNom}>{tr('Suhbat', 'Чат')}</div>
                <p className={u.kichikIzoh}>{tr('Yoʻlni boshidan boshlash. Tarix saqlanadi.', 'Начать путь заново. История сохраняется.')}</p>
              </div>
              <button type="button" className={`${u.chip} ${u.chipKichik}`} onClick={() => { boshdan(); yop(); }}>{tr('Boshidan boshlash', 'Начать заново')}</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
