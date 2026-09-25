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
 * YON PANELDA 12 QADAM. 5–12 "tez orada" — obunachi yoʻl qayerda
 * tugaganini va nima kelishini biladi.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { REJA_QADAMI, SUHBAT_QADAMLARI, TARIF_NARXI, type Reja } from '@selleros/shared';
import { son, yosh } from '@/lib/bazamiz';
import { saqlanganTil, tarjima, tilniQoy, tilniSaqla, type Til, type Tr } from '@/lib/til';
import u from './usta.module.css';

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
      const r = await fetch('/api/suhbat', { cache: 'no-store' });
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

  async function yubor(tana: Record<string, unknown>) {
    setBand(true);
    setXato(null);
    try {
      const r = await fetch('/api/suhbat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setBand(false);
    }
  }

  const javobBer = (savolId: string, javob: unknown) => void yubor({ savolId, javob });
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
  sourceId: string; title: string; narxYuan: number; rasmUrl: string; moq: number;
  reyting: number | null; manzil: string | null; sotilgan: number | null; zavod: boolean | null;
  reklama?: boolean | null; narxSom: number | null; chegaradaMi: boolean | null;
}
interface XitoyQatorQ {
  productId: number; title: string; rasmUrl: string | null; chegaraSom: number | null;
  holat: 'topildi' | 'topilmadi' | 'qidirilmadi'; sabab: string | null; jami: number | null;
  takliflar: XitoyTaklifQ[];
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
            <Stat nom={tr('1688 topdi', '1688 нашёл')} q={q.jami === null ? '—' : raqam(q.jami)} />
          </div>
          {q.sabab && <p className={u.ogohlik}>{q.sabab}</p>}
          {q.takliflar.length > 0 && (
            <div className={u.katalog}>
              {q.takliflar.map((t) => {
                const havola = /^https?:\/\//i.test(t.manzil ?? '') ? t.manzil : null;
                return (
                  <div key={t.sourceId} className={u.katalogKarta}>
                    <div className={u.katalogRasm} aria-hidden="true">
                      <img src={t.rasmUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
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
                      <span>MOQ {t.moq}</span>
                      <span>{t.sotilgan === null ? '—' : `${son(t.sotilgan)} ${tr('sotilgan', 'продано')}`}</span>
                    </div>
                    <div className={u.katalogQator}>
                      <span>{t.zavod === true ? tr('zavod', 'завод') : t.zavod === false ? tr('sotuvchi', 'продавец') : '—'}</span>
                      <span>{t.reyting === null ? '—' : `★ ${t.reyting}`}{t.reklama === true ? ` · ${tr('reklama', 'реклама')}` : ''}</span>
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

function Javoblash({ savol, tezOrada, band, tanlangan, setTanlangan, matn, setMatn, javobBer, boshdan, tr }: {
  savol: Savol | null;
  tezOrada: boolean;
  band: boolean;
  tanlangan: Array<string | number>;
  setTanlangan: (t: Array<string | number>) => void;
  matn: string;
  setMatn: (s: string) => void;
  javobBer: (savolId: string, javob: unknown) => void;
  boshdan: () => void;
  tr: Tr;
}) {
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
