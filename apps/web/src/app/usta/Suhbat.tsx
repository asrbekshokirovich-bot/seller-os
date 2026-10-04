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

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { oyNomi, REJA_QADAMI, STUDIYA_CHIQISH, SUHBAT_QADAMLARI, TARIF_NARXI, type Reja } from '@selleros/shared';
import { son } from '@/lib/bazamiz';
import { useMavzu, type Mavzu } from '@/lib/mavzu';
import { hashTokeni } from '@/lib/sessiya-sarlavha';
import { saqlanganTil, tarjima, type Til, type Tr } from '@/lib/til';
import { useTil } from '@/lib/useTil';
import { faylBolagi, zipYasa } from '@/lib/zip';
import { Ikon, type IkonNomi } from '../Ikon';
import { MavzuTugma } from '../MavzuTugma';
import { Obuna } from './Obuna';
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

/* ------------------------------------------------------ sahifa */

export default function Suhbat({ til: boshTil }: { til: Til }) {
  const [xabarlar, setXabarlar] = useState<Xabar[]>([]);
  const [keyingi, setKeyingi] = useState<Keyingi | null>(null);
  const [qadam, setQadam] = useState(1);
  const [yuklandi, setYuklandi] = useState(false);
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  const [matn, setMatn] = useState('');
  const [tanlangan, setTanlangan] = useState<Array<string | number>>([]);

  const [mavzu, mavzuniTanla] = useMavzu();
  const [til, tilniTanla] = useTil(boshTil);
  const [menyu, setMenyu] = useState(false);
  const [profilOchiq, setProfilOchiq] = useState(false);
  const [obunaOchiq, setObunaOchiq] = useState(false);
  const tr = tarjima(til);
  const oqim = useRef<HTMLDivElement>(null);

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
    function tugma(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setMenyu(false);
      setProfilOchiq(false);
    }
    window.addEventListener('keydown', tugma);
    return () => window.removeEventListener('keydown', tugma);
  }, []);

  // Oxirgi xabarga: aylanuvchi maydonning oxirigacha (pastki 20 px chekka ham kiradi — dizayndagidek).
  useEffect(() => {
    const el = oqim.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
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

  const qadamlarSoni = SUHBAT_QADAMLARI.length;
  const joriyQadam = SUHBAT_QADAMLARI.find((q) => q.n === qadam);
  const qadamNomi = joriyQadam ? tr(joriyQadam.nom, joriyQadam.ru) : '';
  const foiz = Math.round((Math.min(qadam, qadamlarSoni) / qadamlarSoni) * 100);

  const yonPanel = (
    <>
      <div className={u.belgi}>
        <span className={u.nishon} aria-hidden="true">Z</span>
        <span className={u.nom}>ZumSavdo</span>
        <span className={u.nomUsta}>Usta</span>
      </div>

      <button type="button" className={u.yangiSuhbat} onClick={() => { boshdan(); setMenyu(false); }} disabled={band}>
        {tr('Boshidan boshlash', 'Начать заново')}
        <span className={u.xiraIkon}><Ikon nom="qaytadan" o={17} /></span>
      </button>

      <nav className={u.qadamlar} aria-label={tr('Qadamlar', 'Шаги')}>
        <div className={u.yorliq}>{tr(`Yoʻl · ${qadamlarSoni} qadam`, `Путь · ${qadamlarSoni} шагов`)}</div>
        <ol className={u.qadamRoyxat}>
          {SUHBAT_QADAMLARI.map((q) => {
            const otildi = q.qurilgan && q.n < qadam;
            return (
              <li
                key={q.n}
                className={[u.qadamQator, otildi ? u.qadamOtildi : '', q.n === qadam ? u.qadamJoriy : ''].join(' ')}
                aria-current={q.n === qadam ? 'step' : undefined}
              >
                <span className={u.qadamRaqam} aria-hidden="true">{otildi ? <Ikon nom="belgi" o={13} q={3} /> : q.n}</span>
                <span className={u.qadamNomi}>{tr(q.nom, q.ru)}</span>
                {!q.qurilgan && <span className={u.tezTeg}>{tr('tez orada', 'скоро')}</span>}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className={u.bosh} />

      <button type="button" className={u.profilTugma} onClick={() => { setProfilOchiq(true); setMenyu(false); }}>
        <span className={u.avatar}><Ikon nom="odam" o={18} /></span>
        <span className={u.profilNomi}>{tr('Profilim', 'Мой профиль')}</span>
        <span className={u.profilSon}>{tr('Bepul', 'Бесплатно')}</span>
      </button>
    </>
  );

  return (
    <div className={`zs-mavzu ${u.ilova} ${menyu ? u.menyuOchiq : ''}`} data-til={til}>
      <aside className={u.yon} aria-label={tr('Yon panel', 'Боковая панель')}>{yonPanel}</aside>
      {menyu && (
        <button type="button" className={u.soya} aria-label={tr('Menyuni yopish', 'Закрыть меню')} onClick={() => setMenyu(false)} />
      )}

      <div className={u.asosiy}>
        {obunaOchiq ? (
          <Obuna tr={tr} mavzu={mavzu} mavzuniTanla={mavzuniTanla} orqaga={() => setObunaOchiq(false)} />
        ) : (<>
        <header className={u.tepa}>
          <div className={u.tepaChap}>
            <button type="button" className={u.burger} aria-label={tr('Menyu', 'Меню')} aria-expanded={menyu} onClick={() => setMenyu(true)}>
              <Ikon nom="menyu" o={18} />
            </button>
            <span className={u.tirik} aria-hidden="true" />
            <div className={u.sarlavhaBlok}>
              <div className={u.sarlavha}>{qadamNomi}</div>
              <div className={u.sarlavhaMeta}>
                {tr(`${qadam}-qadam · ${qadamlarSoni} dan`, `Шаг ${qadam} из ${qadamlarSoni}`)}
              </div>
            </div>
            <div className={u.jarayon} role="progressbar" aria-valuemin={0} aria-valuemax={qadamlarSoni} aria-valuenow={qadam}
              aria-label={tr('Yoʻl', 'Путь')}>
              <i style={{ width: `${foiz}%` }} />
            </div>
          </div>
          <div className={u.tepaOng}>
            <MavzuTugma mavzu={mavzu} tanla={mavzuniTanla} tr={tr} />
            <button type="button" className={`${u.pill} ${profilOchiq ? u.pillFaol : ''}`} onClick={() => setProfilOchiq(true)}>
              <Ikon nom="odam" o={16} />{tr('Profilim', 'Мой профиль')}
            </button>
            <a className={u.pill} href="/"><Ikon nom="chiqish" o={16} />{tr('Chiqish', 'Выйти')}</a>
          </div>
        </header>

        <div className={u.oqim} ref={oqim}>
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
            {kutish && <div className={`${u.pufak} ${u.ai}`} role="status">{kutish.matn}</div>}

            {band && (
              <div className={u.yozmoqda} role="status">
                <span className={u.nuqtalar} aria-hidden="true"><i /><i /><i /></span>
                <span>{tr('Yozmoqda…', 'Пишет…')}</span>
              </div>
            )}

            {xato !== null && (
              <div className={`${u.pufak} ${u.ai}`}><p className={u.xato}>{xato}</p></div>
            )}

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
        </>)}
      </div>

      {profilOchiq && (
        <Profilim mavzu={mavzu} mavzuniTanla={mavzuniTanla} til={til} tilniTanla={tilniTanla} boshdan={boshdan}
          yop={() => setProfilOchiq(false)} obuna={() => { setProfilOchiq(false); setObunaOchiq(true); }} />
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

/**
 * Karta chizilmaydigan kod natijalari (ochiq ishlar yozildi va h.k.) —
 * xulosa pufagi: ✓ belgisi, qalin jumla va kulrang izoh (dizayn w7).
 * Yozib boʻlmagan boʻlsa (`olchov_yoq`) — ogohlantirish belgisi.
 */
const XULOSA_HARAKATLARI = new Set(['ochiq_ish', 'rasmiy_yakun', 'qabul_yakun', 'studiya_yakun', 'yuklash_yakun']);

function KodKartasi({ x, tr, katalog }: { x: Xabar; tr: Tr; katalog?: KatalogRejimi | undefined }) {
  const n = (x.javob ?? {}) as Record<string, unknown>;
  const olchovYoq = n.olchov_yoq === true;
  const izoh = typeof n.izoh === 'string' ? n.izoh : null;
  if (x.savolId !== undefined && XULOSA_HARAKATLARI.has(x.savolId)) {
    return (
      <div className={`${u.pufak} ${u.ai}`}>
        <div className={u.xulosa}>
          <span className={`${u.xulosaBelgi} ${olchovYoq ? u.xulosaOgoh : ''}`}>
            <Ikon nom={olchovYoq ? 'ogoh' : 'belgi'} o={16} q={olchovYoq ? 2 : 3} />
          </span>
          <div>
            <div className={u.xulosaMatn}>{x.matn}</div>
            {izoh && <div className={u.xulosaIzoh}>{izoh}</div>}
          </div>
        </div>
      </div>
    );
  }
  const karta = olchovYoq ? null
    : x.savolId === 'yonalishlar'
      ? <Yonalishlar royxat={(n.royxat as YonalishQatori[] | undefined) ?? []} eskirgan={n.kesh_eskirgan === true} baholanmadi={Number(n.baholanmadi ?? 0)} bolish={(n.bolishTaklifi as { sabab: string } | null | undefined) ?? null} tr={tr} />
      : x.savolId === 'tovarlar'
        ? <TovarKatalogi royxat={(n.royxat as TovarQatori[] | undefined) ?? []} chiqarildi={(n.chiqarildi as Array<{ title: string; sabab: string }> | undefined) ?? []} rejim={katalog ?? { tanlangan: [], band: true }} tr={tr} />
        : x.savolId === 'tannarx'
          ? <Chegaralar qatorlar={(n.qatorlar as TannarxQatori[] | undefined) ?? []} izoh={izoh} tr={tr} />
          : x.savolId === 'xitoy'
            ? <XitoyTakliflari qatorlar={(n.qatorlar as XitoyQatorQ[] | undefined) ?? []} kurs={(n.kurs as XitoyKursQ | null | undefined) ?? null} izoh={izoh} tr={tr} />
            : x.savolId === 'buyurtma'
              ? <BuyurtmaVaraqasi n={n as unknown as BuyurtmaQ} tr={tr} />
              : x.savolId === 'rasmiy'
                ? <RasmiyKartasi n={n as unknown as RasmiyQ} tr={tr} />
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
                              : null;
  return (
    <>
      <div className={`${u.pufak} ${u.ai}`}>{x.matn}</div>
      {karta}
    </>
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
          const ogoh = t.bayroqlar.find((b) => b.severity !== 'note') ?? t.bayroqlar[0];
          /*
           * Reyting 0 — "baho yo'q", baho emas (SXEMA.md: sharhsiz
           * tovarga Uzum 0.0 beradi). "★ 0" deb ko'rsatish yomon baho
           * degan yolg'on taassurot berardi.
           */
          const bahoYoq = n.reyting === null || n.reyting === undefined || (n.reyting === 0 && !n.sharhSoni);
          return (
            <div key={id} className={`${u.katalogKarta} ${bor ? u.katalogTanlangan : ''}`}>
              <div className={`${u.katalogRasm} ${n.rasmUrl ? u.katalogRasmBor : ''}`}>
                {n.rasmUrl
                  ? <img src={n.rasmUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  : <><Ikon nom="rasm" o={26} q={1.75} />{tr('Mahsulot rasmi', 'Фото товара')}</>}
              </div>
              <div className={u.katalogIchi}>
                <div className={u.katalogNomi}>{n.title}</div>
                <div className={u.katalogDokon}>{n.shopName ?? '—'}</div>
                <div className={u.katalogNarx}>
                  <span className={u.narx}>
                    <span className={u.narxSon}>{n.narxSom === null ? '—' : son(n.narxSom)}</span>
                    {n.narxSom !== null && <span className={u.birlik}>{tr('soʻm', 'сум')}</span>}
                  </span>
                </div>
                <div className={u.katalogQatorlar}>
                  <div className={u.katalogQator}>
                    <span>{tr('30 kunda', 'За 30 дн')}: {sold === null ? '—' : `${son(sold)} ${tr('dona', 'шт')}`}</span>
                    <span>{n.sotuvManbasi === 'olchandi' ? tr('oʻlchandi', 'измерено') : n.sotuvManbasi === 'taxmin' ? tr('taxmin', 'оценка') : '—'}</span>
                  </div>
                  <div className={u.katalogQator}>
                    <span>{tr('roʻyxatdagi ulush', 'доля в списке')}</span>
                    <span>{ulush === null ? '—' : `${ulush}%`}</span>
                  </div>
                  <div className={u.ulushIz}><i style={{ width: `${ulush ?? 0}%` }} /></div>
                  <div className={u.katalogQator}>
                    <span className={u.reyting}>
                      {bahoYoq
                        ? tr('baho yoʻq', 'нет оценки')
                        : <><span className={u.yulduz}><Ikon nom="yulduz" o={14} /></span>{n.reyting}</>}
                    </span>
                    <span>{n.sharhSoni === null || n.sharhSoni === undefined ? '—' : `${son(n.sharhSoni)} ${tr('sharh', 'отз.')}`}</span>
                  </div>
                  {t.miqdor
                    ? <div className={u.taklif}>{tr('taklif', 'предложение')}: {t.miqdor.dona} {tr('dona', 'шт')}</div>
                    : t.miqdorSababi
                      ? <div className={u.katalogIzoh}>{t.miqdorSababi}</div>
                      : null}
                </div>
                {ogoh && (
                  <div className={u.katalogOgoh}>
                    <span className={u.ogohIkon}><Ikon nom="ogoh" o={15} /></span>
                    <span>{ogoh.reason}</span>
                  </div>
                )}
                <div className={u.katalogOxir} />
                {(faol || bor) && (
                  <button
                    type="button"
                    className={`${u.tugma} ${u.katalogTugma} ${bor ? u.tugmaAsosiy : ''}`}
                    aria-pressed={bor}
                    disabled={!faol}
                    onClick={() => rejim.onToggle?.(id)}
                  >
                    {bor ? <>{tr('Tanlangan', 'Выбрано')}<Ikon nom="belgi" o={18} /></> : tr('Tanlash', 'Выбрать')}
                  </button>
                )}
              </div>
            </div>
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
            <Ogohlik>{tr('Hisobga kirmadi:', 'Не учтено:')} {q.yetishmaydi.join(', ')}</Ogohlik>
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
        <Fragment key={q.productId}>
          <div className={u.karta}>
            <div className={u.kartaBoshi}>
              <div className={u.kartaNomBlok}><div className={u.kartaNomi}>{q.title}</div></div>
              <span className={`${u.teg} ${holatSinfi(q.holat)}`}>{holatMatni(q.holat)}</span>
            </div>
            <div className={u.statlar}>
              <Stat nom={tr('Xitoyda chegara', 'Потолок в Китае')} q={q.chegaraSom === null ? '—' : `${raqam(q.chegaraSom)} ${tr('soʻm', 'сум')}`} />
              <Stat nom={tr('1688 topdi', '1688 нашёл')} q={q.jami === null ? '—' : raqam(q.jami)} izoh={q.keshdan ? tr('72 soatlik keshdan', 'из кэша (72 ч)') : undefined} />
            </div>
            {(q.yetishmaydi?.length ?? 0) > 0 && (
              <Ogohlik>{tr('Chegaraga kirmadi:', 'В потолок не вошло:')} {q.yetishmaydi!.join(', ')} — {tr('haqiqiy chegara pastroq', 'реальный потолок ниже')}</Ogohlik>
            )}
            {q.sabab && <Ogohlik>{q.sabab}</Ogohlik>}
            {q.holat === 'topilmadi' && q.tashxis && <p className={u.kichikIzoh}>{q.tashxis}</p>}
            {(q.tashlandi ?? 0) > 0 && <p className={u.kichikIzoh}>{q.tashlandi} {tr('ta karta oʻqilmadi va koʻrsatilmadi', 'карточек не прочитано и не показано')}</p>}
          </div>
          {q.takliflar.length > 0 && (
            <div className={u.katalog}>
              {q.takliflar.map((t) => {
                const havola = /^https?:\/\//i.test(t.manzil ?? '') ? t.manzil : null;
                return (
                  <div key={t.sourceId} className={u.katalogKarta}>
                    <div className={`${u.katalogRasm} ${t.rasmUrl ? u.katalogRasmBor : ''}`}>
                      {t.rasmUrl
                        ? <img src={t.rasmUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                        : <><Ikon nom="rasm" o={26} q={1.75} />{tr('Mahsulot rasmi', 'Фото товара')}</>}
                    </div>
                    <div className={u.katalogIchi}>
                      <div className={u.katalogNomi}>
                        {havola ? <a href={havola} target="_blank" rel="noopener noreferrer">{t.title}</a> : t.title}
                      </div>
                      <div className={u.katalogNarx}>
                        <span className={u.narx}>
                          <span className={u.narxSon}>¥{t.narxYuan}</span>
                          {t.narxSom !== null && <span className={u.birlik}>≈ {son(t.narxSom)} {tr('soʻm', 'сум')}</span>}
                        </span>
                      </div>
                      <div className={u.katalogQatorlar}>
                        <div className={u.katalogQator}>
                          <span>MOQ {t.moq === null ? '—' : t.moq}</span>
                          <span>{t.buyurtmalar === null ? '—' : `${son(t.buyurtmalar)} ${tr('buyurtma', 'заказов')}`}</span>
                        </div>
                        <div className={u.katalogQator}>
                          <span>{t.superZavod === true ? tr('super zavod', 'супер-завод') : t.zavod === true ? tr('zavod', 'завод') : t.zavod === false ? tr('sotuvchi', 'продавец') : '—'}</span>
                          <span className={u.reyting}>
                            {t.reyting === null ? '—' : <><span className={u.yulduz}><Ikon nom="yulduz" o={14} /></span>{t.reyting}</>}
                            {typeof t.oxshashlikOrni === 'number' ? ` · #${t.oxshashlikOrni}` : ''}
                          </span>
                        </div>
                      </div>
                      {t.chegaradaMi !== null && (
                        <div className={u.chiplar}>
                          <span className={`${u.teg} ${t.chegaradaMi ? u.tegYaxshi : u.tegOgoh}`}>
                            {t.chegaradaMi ? tr('chegarada', 'в пределах потолка') : tr('chegaradan yuqori', 'выше потолка')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Fragment>
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
  const yuan = (y: number | null, s: number | null) => (y === null ? '—' : `¥${y}${s !== null ? ` ≈ ${raqam(s)}` : ''}`);
  return (
    <div className={u.karta}>
      {q.map((x) => (
        <div key={x.productId} className={u.bolak}>
          <div className={u.kartaBoshi}>
            <div className={u.kartaNomBlok}>
              <div className={u.kartaNomi}>{x.title}</div>
              {x.xitoyTitle && (
                <div className={u.kartaOst}>
                  {x.manzil ? <a href={x.manzil} target="_blank" rel="noopener noreferrer">{x.xitoyTitle}</a> : x.xitoyTitle}
                </div>
              )}
            </div>
            <span className={`${u.teg} ${x.holat === 'tayyor' ? u.tegYaxshi : u.tegOgoh}`}>{x.holat === 'tayyor' ? tr('varaqada', 'в листе') : tr('taklif tanlanmagan', 'вариант не выбран')}</span>
          </div>
          <div className={u.statlar}>
            <Stat nom={tr('Miqdor', 'Кол-во')} q={x.miqdor === null ? '—' : `${x.miqdor} ${tr('dona', 'шт')}`} />
            <Stat nom={tr('Narx', 'Цена')} q={yuan(x.narxYuan, x.narxSom)} />
            <Stat nom={tr('Jami', 'Итого')} q={yuan(x.jamiYuan, x.jamiSom)} />
            <Stat nom={tr('Kargo / dona', 'Карго / шт')} q={x.kargoSom === null ? '—' : `${raqam(x.kargoSom)} ${tr('soʻm', 'сум')}`} izoh={x.kargoIzoh ?? undefined} />
          </div>
        </div>
      ))}
      {j && (
        <>
          <div className={`${u.statlar} ${u.statlarYaqin}`}>
            <Stat nom={tr('Tovar', 'Товаров')} q={`${j.tayyor}${j.tanlanmagan ? ` (+${j.tanlanmagan} ${tr('tanlanmagan', 'не выбрано')})` : ''}`} />
            <Stat nom={tr('Dona', 'Штук')} q={j.dona === null ? '—' : raqam(j.dona)} />
            <Stat nom={tr('Jami', 'Итого')} q={yuan(j.yuan, j.som)} />
            <Stat nom={tr('Kargo jami', 'Карго итого')} q={j.kargoSom === null ? '—' : `${raqam(j.kargoSom)} ${tr('soʻm', 'сум')}`} izoh={n.kargo?.izoh ?? undefined} />
          </div>
          {n.kargo?.izoh && <Ogohlik>{tr('Kargo hisobga kirmadi:', 'Карго не учтено:')} {n.kargo.izoh}</Ogohlik>}
          <div className={u.chiplar}>
            <button type="button" className={u.tugma} onClick={nusxala} disabled={j.tayyor === 0}>
              <Ikon nom="nusxa" o={18} />
              {nusxalandi ? tr('Nusxalandi ✓', 'Скопировано ✓') : tr('Varaqani nusxalash (agentga yuborish uchun)', 'Скопировать лист (для агента)')}
            </button>
          </div>
        </>
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
  return <p className={u.manba}>{tr('Manba', 'Источник')}: {manba ?? '—'}{olchandi ? ` · ${olchandi}` : ''}</p>;
}

/** Faktlar kartasi: har raqam yonida manba va sana; fakt yoʻq — "faktda yoʻq", nol emas. */
function RasmiyKartasi({ n, tr }: { n: RasmiyQ; tr: Tr }) {
  const [nusxalandi, setNusxalandi] = useState(false);
  const f = n.faktlar;
  if (!f) return <p className={u.kichikIzoh}>{n.sabab ?? tr('faktlar yoʻq', 'нет данных')}</p>;
  const s = n.soliq;
  const yoq = tr('faktda yoʻq', 'нет в фактах');
  const somB = tr('soʻm', 'сум');
  const som = (x: number | null | undefined) => (x === null || x === undefined ? yoq : `${raqam(x)} ${somB}`);
  const bepulYoki = (x: number | null) => (x === null ? '—' : x === 0 ? tr('bepul', 'бесплатно') : som(x));
  const k = f.uzum.komissioner;
  const rekvizit = [`STIR: ${k.stir ?? '—'}`, `Nom: ${k.nom ?? '—'}`, `MFO: ${k.mfo ?? '—'}`, `Hisob: ${k.hisob ?? '—'}`, `Muddat: ${k.muddatYil !== null ? `${k.muddatYil} yil` : '—'}`, 'ONKM + Marketplace'].join('\n');
  const nusxala = () => {
    try { void navigator.clipboard.writeText(rekvizit); setNusxalandi(true); setTimeout(() => setNusxalandi(false), 2000); } catch { /* clipboard yoʻq */ }
  };
  const tekshirilgan = f.soliq.manba !== null && f.soliq.olchandi !== null;
  return (
    <div className={u.kartalar}>
      {f.yetishmaydi.length > 0 && <Ogohlik>{tr('Faktda yoʻq:', 'Нет в фактах:')} {f.yetishmaydi.join(', ')}</Ogohlik>}
      <div className={u.karta}>
        <div className={`${u.kartaBoshi} ${u.kartaBoshiMarkaz}`}>
          <div className={u.kartaSarlavha}>{tr('Soliq 2026', 'Налоги 2026')}</div>
          {tekshirilgan && <span className={`${u.teg} ${u.tegYaxshi}`}>{tr('tekshirildi', 'проверено')}</span>}
        </div>
        <div className={`${u.statlar} ${u.statlarKatta}`}>
          <Stat katta nom={tr('Ijtimoiy soliq / oy', 'Соцналог / мес')} q={s?.ijtimoiySom == null ? yoq : raqam(s.ijtimoiySom)} birlik={s?.ijtimoiySom == null ? undefined : somB}
            izoh={f.soliq.tolovKuni !== null ? tr(`${f.soliq.tolovKuni}-sanagacha, sotuv boʻlmasa ham`, `до ${f.soliq.tolovKuni} числа, даже без продаж`) : undefined} />
          <Stat katta nom={tr('Aylanma soligʻi', 'Налог с оборота')} q={f.soliq.aylanmaFoiz !== null ? String(f.soliq.aylanmaFoiz) : yoq} birlik={f.soliq.aylanmaFoiz !== null ? '%' : undefined}
            izoh={f.soliq.aylanmaChegaraSom !== null ? tr(`yiliga ${raqam(f.soliq.aylanmaChegaraSom)} soʻmgacha`, `до ${raqam(f.soliq.aylanmaChegaraSom)} сум в год`) : undefined} />
          <Stat katta nom={tr('Partiya sotilsa', 'При продаже партии')} q={s?.aylanmaSom == null ? '—' : raqam(s.aylanmaSom)} birlik={s?.aylanmaSom == null ? undefined : somB}
            izoh={n.partiyaSotuvSom !== null && n.partiyaSotuvSom !== undefined ? `${raqam(n.partiyaSotuvSom)} ${tr('soʻm sotuvdan', 'сум продаж')}` : undefined} />
          <Stat katta nom={tr('BHM', 'БРВ')} q={f.bhmSom === null ? yoq : raqam(f.bhmSom)} birlik={f.bhmSom === null ? undefined : somB}
            izoh={f.soliq.rejimTugaydi ? tr(`rejim ${f.soliq.rejimTugaydi} gacha`, `режим до ${f.soliq.rejimTugaydi}`) : undefined} />
        </div>
        <Manba manba={f.soliq.manba} olchandi={f.soliq.olchandi} tr={tr} />
        {n.izoh && <p className={u.ajratilgan}>{n.izoh}</p>}
      </div>
      {!n.kabinetBor && (
        <>
          <div className={u.karta}>
            <div className={u.kartaSarlavha}>{tr('1. YATT ochish', '1. Открыть ИП')}</div>
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
            <div className={u.kartaSarlavha}>{tr('2. Biznes hisob raqami', '2. Расчётный счёт')}</div>
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
            <div className={u.kartaSarlavha}>{tr('3. Uzum kabineti', '3. Кабинет Uzum')}</div>
            <ol className={u.royxat}>
              <li>{f.uzum.kabinetUrl ? <a href={f.uzum.kabinetUrl} target="_blank" rel="noopener noreferrer">{f.uzum.kabinetUrl}</a> : tr('manzil faktda yoʻq', 'нет адреса')} — {tr('telefon + email, oferta', 'телефон + email, оферта')}</li>
              <li>{tr('Hujjatlar: YATT guvohnomasi + pasport', 'Документы: свидетельство ИП + паспорт')}</li>
              <li>{tr('my3.soliq.uz → komissionerlar roʻyxati → Uzum:', 'my3.soliq.uz → список комиссионеров → Uzum:')}<pre className={u.mono}>{rekvizit}</pre></li>
              <li>{f.uzum.qollabQuvvatlashUrl ? <a href={f.uzum.qollabQuvvatlashUrl} target="_blank" rel="noopener noreferrer">{tr('biznes-qoʻllab-quvvatlash', 'бизнес-поддержка')}</a> : tr('qoʻllab-quvvatlash', 'поддержка')} — {tr('3 ta skrinshot', '3 скриншота')}{f.uzum.faollashtirishKun !== null ? tr(`; tekshiruv ~${f.uzum.faollashtirishKun} kun`, `; проверка ~${f.uzum.faollashtirishKun} дн`) : ''}</li>
            </ol>
            <div className={u.chiplar}>
              <button type="button" className={u.tugma} onClick={nusxala}><Ikon nom="nusxa" o={18} />{nusxalandi ? tr('Nusxalandi ✓', 'Скопировано ✓') : tr('Rekvizitlarni nusxalash', 'Скопировать реквизиты')}</button>
              {f.uzum.qollanmaUrl && <a className={u.tugma} href={f.uzum.qollanmaUrl} target="_blank" rel="noopener noreferrer">{tr('Rasmiy qoʻllanma', 'Официальная инструкция')}</a>}
            </div>
            {f.uzum.tolovStandart && <p className={u.kichikIzoh}>{tr('Toʻlov jadvali (standart):', 'График выплат (стандарт):')} {f.uzum.tolovStandart}</p>}
            <Manba manba={f.uzum.manba} olchandi={f.uzum.olchandi} tr={tr} />
          </div>
        </>
      )}
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
        <div className={u.kartaSarlavha}>{tr('Yukni sanash', 'Пересчёт груза')}{dona(n.jamiDona, tr)}</div>
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
        <Ogohlik>{tr('Studiya xizmati hali ulanmagan — suratlar asl holida (fon oqlanmagan). Suratni bosib asl nusxasini oching.', 'Сервис студии ещё не подключён — фото в исходном виде (фон не белый). Нажмите на фото, чтобы открыть оригинал.')}</Ogohlik>
      )}
      {n.chiqishMos === false && (
        <Ogohlik>{tr(`Diqqat: studiya chiqishi (${STUDIYA_CHIQISH.eni}×${STUDIYA_CHIQISH.boyi}) Uzumning hozirgi talabiga mos emas — nazoratchiga yozildi.`, `Внимание: размер студии (${STUDIYA_CHIQISH.eni}×${STUDIYA_CHIQISH.boyi}) не соответствует текущему требованию Uzum — передано контролёру.`)} {talabQatori(n.talablar, tr)}</Ogohlik>
      )}
      {q.map((x) => {
        const teg = galereyaTegi(x);
        return (
          <div key={x.productId} className={u.karta}>
            <div className={u.kartaBoshi}>
              <div className={u.kartaNomBlok}><div className={u.kartaNomi}>{x.title}</div></div>
              {teg && <span className={`${u.teg} ${teg[0]}`}>{teg[1]}</span>}
            </div>
            {x.galereyaSabab && <Ogohlik>{x.galereyaSabab}</Ogohlik>}
            {x.suratlar.length === 0 ? (
              <p className={u.kichikIzoh}>{tr('Surat topilmadi — oʻzingiz suratga oling (oq yoki och bir xil fon, tovar kadrning yarmidan koʻpi).', 'Фото не найдено — снимите сами (белый или светлый однотонный фон, товар больше половины кадра).')}</p>
            ) : (
              <div className={u.studiyaGrid}>
                {x.suratlar.map((s, i) => {
                  const k = kalit(x.productId, i);
                  const yoq = buzuq.includes(k);
                  const ichi = (
                    <>
                      {yoq
                        ? <span className={u.studiyaYoq}>{tr('Studiya bu suratni ololmadi', 'Студия не смогла получить фото')}</span>
                        : <img src={s.url ?? s.asl} alt={s.nom ?? x.title} loading="lazy" referrerPolicy="no-referrer"
                            onError={() => setBuzuq((e) => (e.includes(k) ? e : [...e, k]))} />}
                      <span className={u.studiyaManba}>{i + 1}. {manbaNomi(s)}{s.eni !== null && s.boyi !== null ? ` · ${s.eni}×${s.boyi}` : ''}</span>
                      {s.url !== null && !yoq && (
                        <span className={u.studiyaRasmIchi} aria-hidden="true">{tanlangan.includes(k) && <Ikon nom="belgi" o={13} q={3} />}</span>
                      )}
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
            <button type="button" className={u.tugma} disabled={band}
              onClick={() => setTanlangan(belgilangan.length === mumkin.length ? [] : mumkin)}>
              {belgilangan.length === mumkin.length ? tr('Belgilarni olib tashlash', 'Снять выделение') : tr('Hammasini belgilash', 'Выбрать все')}
            </button>
            <button type="button" className={`${u.tugma} ${u.tugmaAsosiy}`} disabled={band || belgilangan.length === 0} onClick={() => void yuklab()}>
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
      {yetishmaydi.length > 0 && <Ogohlik>{tr('Faktda yoʻq:', 'Нет в фактах:')} {yetishmaydi.join(', ')}</Ogohlik>}
      <div className={u.karta}>
        <div className={u.kartaSarlavha}>{tr('1. Kartochka', '1. Карточка')}</div>
        <div className={u.statlar}>
          <Stat nom={tr('Surat (kamida)', 'Фото (минимум)')} q={t.minEni !== null && t.minBoyi !== null ? `${t.minEni}×${t.minBoyi}` : yoq} izoh={t.nisbat ?? undefined} />
          <Stat nom={tr('Hajm', 'Размер')} q={t.maxMb !== null ? `≤ ${t.maxMb} MB` : yoq} izoh={t.format ?? undefined} />
          <Stat nom={tr('Tovar kadrda', 'Товар в кадре')} q={t.tovarUlushMin !== null ? `> ${t.tovarUlushMin} %` : yoq} />
          <Stat nom={tr('Studiya suratlari', 'Фото из студии')} q={`${STUDIYA_CHIQISH.eni}×${STUDIYA_CHIQISH.boyi}`} izoh={tr('3:4, oq fon (9-qadam)', '3:4, белый фон (шаг 9)')} />
        </div>
        {t.kartochkaQoidalari.length > 0 && <ol className={u.royxat}>{t.kartochkaQoidalari.map((r) => <li key={r}>{r}</li>)}</ol>}
        {t.fotostudiya && <p className={u.kichikIzoh}>{tr('Uzum Fotostudiyasi:', 'Фотостудия Uzum:')} {t.fotostudiya}</p>}
        {t.kartochkaQollanmaUrl && (
          <div className={u.chiplar}>
            <a className={u.tugma} href={t.kartochkaQollanmaUrl} target="_blank" rel="noopener noreferrer">{tr('Rasmiy qoʻllanma (5-bob)', 'Инструкция (гл. 5)')}</a>
          </div>
        )}
        <Manba manba={t.manba} olchandi={t.olchandi} tr={tr} />
      </div>
      <div className={u.karta}>
        <div className={u.kartaSarlavha}>{tr('2. Qadoq va yorliq', '2. Упаковка и этикетка')}{dona(n.jamiDona, tr)}</div>
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
        <div className={u.kartaSarlavha}>{tr('3. Yetkazma va Uzum ombori', '3. Поставка и склад Uzum')}</div>
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
          {f.logistika.url && <a className={u.tugma} href={f.logistika.url} target="_blank" rel="noopener noreferrer">{tr('Uzum logistikasi', 'Логистика Uzum')}</a>}
          {f.qollanmaUrl && <a className={u.tugma} href={f.qollanmaUrl} target="_blank" rel="noopener noreferrer">{tr('Rasmiy qoʻllanma (6-bob)', 'Инструкция (гл. 6)')}</a>}
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
      {n.kuzatuvXato && <Ogohlik>{tr('Kuzatuvga qoʻshib boʻlmadi:', 'Не удалось добавить в отслеживание:')} {n.kuzatuvXato}</Ogohlik>}
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
  olchovSotuv?: number | null; olchovDona?: number | null; olchovKun?: number | null; oyKunlari?: number | null;
  qatorlar?: Array<{ productId: number; title: string; oyDona: number | null; oySom: number | null }>;
  izoh?: string;
}

function HisobotKartasi({ n, tr }: { n: HisobotQ; tr: Tr }) {
  const q = n.qatorlar ?? [];
  const f = n.faktlar;
  return (
    <div className={u.kartalar}>
      {f && f.yetishmaydi.length > 0 && <Ogohlik>{tr('Faktda yoʻq:', 'Нет в фактах:')} {f.yetishmaydi.join(', ')}</Ogohlik>}
      <div className={u.karta}>
        <div className={`${u.kartaBoshi} ${u.kartaBoshiMarkaz}`}>
          <div className={u.kartaSarlavha}>{tr('Oy hisoboti', 'Отчёт за месяц')} · {n.oy ? oyNomi(n.oy) : '—'}</div>
          {n.tugagan === false && <span className={`${u.teg} ${u.tegNeytral}`}>{tr('hozirgacha', 'на сегодня')}</span>}
        </div>
        {q.map((x) => (
          <div key={x.productId} className={u.statlar}>
            <Stat nom={x.title} q={x.oyDona === null ? '—' : `${x.oyDona} ${tr('dona', 'шт')}`} izoh={x.oySom !== null ? `≈ ${somQ(x.oySom, tr)}` : tr('oʻlchov yoʻq', 'нет замера')} />
          </div>
        ))}
        <div className={u.statlar}>
          <Stat nom={tr('Oʻlchovimiz (taxmin)', 'Наш замер (оценка)')} q={somQ(n.olchovSotuv, tr)}
            izoh={n.olchovDona !== null && n.olchovDona !== undefined
              ? `${n.olchovDona} ${tr('dona', 'шт')}${n.olchovKun && n.oyKunlari && n.olchovKun < n.oyKunlari ? ` · ${tr(`${n.oyKunlari} kundan ${n.olchovKun} kuni oʻlchangan`, `замер ${n.olchovKun} из ${n.oyKunlari} дн`)}` : ''}`
              : tr('bu oy oʻlchanmagan', 'месяц не измерен')} />
          <Stat nom={tr('Komissioner hisoboti', 'Отчёт комиссионера')} q={f?.komissionerKun !== null && f?.komissionerKun !== undefined ? tr(`keyingi oyning ${f.komissionerKun}-sanasigacha`, `до ${f.komissionerKun} числа след. месяца`) : '—'} izoh={tr('aniq summa shu yerda', 'точная сумма там')} />
        </div>
      </div>
      {n.izoh && <p className={u.kichikIzoh}>{n.izoh}</p>}
    </div>
  );
}

interface HisobotHisobQ {
  oy?: string; tugagan?: boolean; qamrov?: { kun: number; jami: number } | null;
  sotuvSom?: number | null; sotuvManbasi?: 'kabinet' | 'olchov' | null; komissiyaSom?: number | null; sofSom?: number | null;
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
        <div className={`${u.kartaBoshi} ${u.kartaBoshiMarkaz}`}>
          <div className={u.kartaSarlavha}>{tr('Oy yakuni', 'Итоги месяца')} · {n.oy ? oyNomi(n.oy) : '—'}</div>
          {n.tugagan === false && <span className={`${u.teg} ${u.tegNeytral}`}>{tr('hozirgacha', 'на сегодня')}</span>}
        </div>
        <div className={u.statlar}>
          <Stat nom={tr('Sotuv', 'Продажи')} q={somQ(n.sotuvSom, tr)}
            izoh={n.sotuvManbasi === 'kabinet' ? tr('kabinet hisobotidan', 'из отчёта кабинета')
              : n.sotuvManbasi === 'olchov'
                ? `${tr('taxmin, oʻlchovdan', 'оценка по замеру')}${n.qamrov ? ` · ${tr(`${n.qamrov.jami} kundan ${n.qamrov.kun} kuni`, `${n.qamrov.kun} из ${n.qamrov.jami} дн`)}` : ''}`
                : undefined} />
          <Stat nom={tr('Komissiya', 'Комиссия')} q={n.komissiyaSom === null || n.komissiyaSom === undefined ? tr('yozilmagan', 'не указана') : somQ(n.komissiyaSom, tr)} />
          <Stat nom={tr('Sof tushum', 'Чистая выручка')} q={n.sofSom === null || n.sofSom === undefined ? '—' : somQ(n.sofSom, tr)} />
          <Stat nom={tr('Aylanma soligʻi', 'Налог с оборота')} q={somQ(s?.aylanmaSom, tr)} izoh={f?.soliq.aylanmaFoiz !== null && f?.soliq.aylanmaFoiz !== undefined ? `${f.soliq.aylanmaFoiz} %` : undefined} />
          <Stat nom={tr('Ijtimoiy soliq', 'Социальный налог')} q={somQ(s?.ijtimoiySom, tr)} izoh={n.ijtimoiyMuddat ? tr(`${n.ijtimoiyMuddat} gacha`, `до ${n.ijtimoiyMuddat}`) : undefined} />
        </div>
        {f?.agent && <Ogohlik>{tr('Soliq agenti:', 'Налоговый агент:')} {f.agent}. {tr('Komissioner hisobotida ushlab qolinganini tekshiring.', 'Проверьте удержание в отчёте комиссионера.')}</Ogohlik>}
      </div>
      {(n.qadamlar ?? []).length > 0 && (
        <div className={u.karta}>
          <div className={u.kartaSarlavha}>{tr('Deklaratsiya qadamlari', 'Шаги декларации')}</div>
          <ol className={u.royxat}>{(n.qadamlar ?? []).map((q) => <li key={q}>{q}</li>)}</ol>
          <div className={u.chiplar}>
            {f?.portalUrl && <a className={u.tugma} href={f.portalUrl} target="_blank" rel="noopener noreferrer">{tr('Soliq portali', 'Налоговый портал')}</a>}
            <a className={u.tugma} href="https://seller.uzum.uz" target="_blank" rel="noopener noreferrer">{tr('Uzum kabineti', 'Кабинет Uzum')}</a>
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
          <div className={u.kartaSarlavha}>{tr('Keyingi oy rejasi', 'План на следующий месяц')}</div>
          <ul className={u.royxat}>{r.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}
      {n.izoh && <p className={u.kichikIzoh}>{n.izoh}</p>}
    </div>
  );
}

/**
 * Statistika plitkasi. `katta` — «Soliq 2026» kartasidagi kabi: raqam
 * 22 px Unbounded, birlik (`soʻm`, `%`) yonida kichik Onest (dizayn w7).
 */
function Stat({ nom, q, izoh, birlik, katta = false }: {
  nom: string; q: string; izoh?: string | undefined; birlik?: string | undefined; katta?: boolean;
}) {
  return (
    <div className={`${u.stat} ${katta ? u.statKatta : ''}`}>
      <div className={u.statNomi}>{nom}</div>
      <div className={u.statQiymat}>{q}{birlik !== undefined && <span className={u.birlik}>{birlik}</span>}</div>
      {izoh !== undefined && <div className={u.statIzoh}>{izoh}</div>}
    </div>
  );
}

/** Sariq ogohlantirish qatori (dizayn w6: «Kargo hisobga kirmadi…»). */
function Ogohlik({ children }: { children: ReactNode }) {
  return (
    <p className={u.ogohlik}>
      <span className={u.ogohIkon}><Ikon nom="ogoh" o={18} /></span>
      <span>{children}</span>
    </p>
  );
}

/* ------------------------------------------------------ javob berish */

/**
 * Savol kartasining qisqa sarlavhasi. Toʻliq savol menejer pufagida
 * turadi; kartada — dizayndagidek qisqa bosh gap (w4: «Birinchi
 * partiyaga qancha ajratasiz?»). Maxsus sarlavha boʻlmasa — savol
 * matnidagi oxirgi soʻroq gapi.
 */
const SAVOL_SARLAVHASI: Record<string, [string, string]> = {
  byudjet: ['Birinchi partiyaga qancha ajratasiz?', 'Сколько выделите на первую партию?'],
  shahar: ['Tovar qaysi shaharga keladi?', 'В какой город придёт товар?'],
};

function qisqaSavol(matn: string): string {
  const gaplar = matn.split(/(?<=[.?!])\s+/).map((g) => g.trim()).filter(Boolean);
  const soroq = gaplar.filter((g) => g.endsWith('?'));
  const g = soroq[soroq.length - 1] ?? gaplar[gaplar.length - 1] ?? matn;
  return g.length > 90 ? `${g.slice(0, 88)}…` : g;
}

function savolBoshi(s: Savol, tr: Tr): { nom: string; izoh: string; ikon: IkonNomi; son: string } {
  const maxsus = SAVOL_SARLAVHASI[s.id];
  const nom = maxsus ? tr(maxsus[0], maxsus[1]) : qisqaSavol(s.matn);
  const izoh = s.turi === 'kopTanlov'
    ? tr('Bir nechtasini belgilang', 'Отметьте несколько')
    : s.turi === 'son'
      ? (s.erkin ? tr('Bittasini tanlang yoki pastda aniq sonni yozing', 'Выберите или впишите точное число ниже') : tr('Bittasini tanlang', 'Выберите один вариант'))
      : (s.erkin ? tr('Bittasini tanlang yoki pastda oʻzingiz yozing', 'Выберите или напишите свой ответ ниже') : tr('Bittasini tanlang', 'Выберите один вариант'));
  const k = s.variantlar.length;
  return {
    nom,
    izoh,
    ikon: s.id === 'byudjet' ? 'hamyon' : s.id === 'shahar' ? 'joy' : 'savol',
    son: s.id === 'shahar' ? tr(`${k} shahar`, `${k} городов`) : tr(`${k} variant`, `${k} вар.`),
  };
}

/**
 * Variantlar ustunlari: qisqa roʻyxat — bir qatorda (byudjet: 4), shaharlar
 * kabi koʻp va qisqa — 5 ustun (dizayn w6), uzun matn — 2 yoki 1 ustun.
 */
function ustunlar(s: Savol): number {
  const k = s.variantlar.length;
  const eng = Math.max(0, ...s.variantlar.map((v) => v.nom.length));
  if (s.turi === 'son') return Math.min(Math.max(k, 1), 4);
  if (eng > 44) return 1;
  if (eng > 22) return 2;
  if (k <= 4) return Math.max(k, 1);
  return eng > 14 ? 3 : 5;
}

/**
 * Ustunlar soni ekranga moslanadi: dizayndagi son (`ustunlar`) sigʻsa — shu,
 * sigʻmasa bittadan kamayadi (telefon, planshet, kengaytma paneli, tor oyna).
 * Taxmin emas — brauzerda oʻlchanadi: biror tugmaning matni tugmadan chiqsa
 * (`scrollWidth > clientWidth`), ustun kam. Shrift, til va klaviatura
 * belgisi oʻz-oʻzidan hisobga olinadi. Oʻlchash chizishdan oldin
 * (`useLayoutEffect`), shuning uchun buzilgan holat ekranda koʻrinmaydi.
 */
/**
 * Tugma sigʻadimi: tugmaning oʻzi toshmagan va matn oxiri yonidagi 1–9
 * belgisidan (yoʻq boʻlsa — tugmaning ichki chetidan) oʻtmagan. Matn tugma
 * ichida qolib, belgi ustiga chiqsa ham — sigʻmagan.
 */
function sigadi(b: HTMLElement): boolean {
  if (b.scrollWidth > b.clientWidth + 1) return false;
  const nomi = b.querySelector<HTMLElement>(`.${u.variantNomi}`);
  if (!nomi) return true;
  const oxiri = nomi.getBoundingClientRect().left + nomi.scrollWidth;
  const belgi = nomi.nextElementSibling as HTMLElement | null;
  const chegara = belgi && getComputedStyle(belgi).display !== 'none'
    ? belgi.getBoundingClientRect().left
    : b.getBoundingClientRect().right - parseFloat(getComputedStyle(b).paddingRight);
  return oxiri <= chegara + 0.5;
}

function useUstun(ref: RefObject<HTMLDivElement | null>, eng: number, kalit: string): number {
  const [n, setN] = useState(eng);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let oxirgiEn = -1;
    const qoy = (k: number) => {
      el.dataset.ustun = String(k);
      el.style.gridTemplateColumns = `repeat(${k}, minmax(0, 1fr))`;
    };
    const olcha = () => {
      if (el.clientWidth === oxirgiEn) return;
      oxirgiEn = el.clientWidth;
      let k = eng;
      for (; k > 1; k--) {
        qoy(k);
        if (Array.from(el.querySelectorAll('button')).every(sigadi)) break;
      }
      qoy(k);
      setN(k);
    };
    olcha();
    const ro = new ResizeObserver(olcha);
    ro.observe(el);
    // Shrift kech yuklansa matn kengligi oʻzgaradi — qayta oʻlchash.
    void document.fonts?.ready.then(() => { oxirgiEn = -1; olcha(); });
    return () => ro.disconnect();
  }, [ref, eng, kalit]);
  return n;
}

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
  const kiritish = useRef<HTMLInputElement>(null);
  const variantlarRef = useRef<HTMLDivElement>(null);
  const ustun = useUstun(
    variantlarRef,
    savol ? ustunlar(savol) : 1,
    savol ? `${savol.id}|${savol.variantlar.map((v) => v.nom).join('|')}|${tr('uz', 'ru')}` : '',
  );

  // Klaviatura: 1–9 — variant raqami (dizayndagi kichik belgilar). Yozish
  // maydonida emas va koʻp tanlovli savolda emas.
  useEffect(() => {
    if (!savol || savol.turi === 'kopTanlov' || savol.variantlar.length === 0 || savol.variantlar.length > 9) return;
    const s = savol;
    function bos(e: KeyboardEvent) {
      if (band || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const i = Number(e.key);
      if (!Number.isInteger(i) || i < 1 || i > s.variantlar.length) return;
      e.preventDefault();
      javobBer(s.id, s.variantlar[i - 1]!.qiymat);
    }
    window.addEventListener('keydown', bos);
    return () => window.removeEventListener('keydown', bos);
  }, [savol, band, javobBer]);

  if (kutish) {
    // Dizayn w8: kutish paytida ham oddiy qator turadi; javob natija kelgach soʻraladi.
    return (
      <div className={u.kiritish} aria-disabled="true">
        <input type="text" readOnly tabIndex={-1} aria-label={tr('Javob', 'Ответ')} placeholder={tr('Oʻzim yozaman', 'Свой ответ')} />
        <button type="button" className={u.yubor} tabIndex={-1} aria-disabled="true" aria-label={tr('Yuborish', 'Отправить')}><span className={u.yuborMatn}>{tr('Yuborish', 'Отправить')}</span><Ikon nom="ong" o={18} /></button>
      </div>
    );
  }
  if (tezOrada || savol === null) {
    return (
      <div className={u.tugmalar}>
        <button type="button" className={`${u.tugma} ${u.tugmaSoyali}`} onClick={boshdan} disabled={band}>
          <Ikon nom="qaytadan" o={18} />{tr('Boshidan boshlash', 'Начать заново')}
        </button>
      </div>
    );
  }

  // Ixcham ekranda (telefon, past oyna) «Oʻtkazib yuborish» savol kartasining tepasiga chiqadi — pastdagi alohida qator joyi suhbatga qoladi.
  const otkazTugma = (klass: string | undefined) => (savol.otkazishMumkin
    ? <button type="button" className={klass} onClick={() => javobBer(savol.id, null)} disabled={band}>{tr('Oʻtkazib yuborish', 'Пропустить')}</button>
    : null);
  const otkaz = otkazTugma(u.otkazish);

  const davom = (
    <button type="button" className={u.davom} onClick={() => javobBer(savol.id, tanlangan)} disabled={band || tanlangan.length === 0}>
      {tanlangan.length > 0 ? tr(`Davom etish · ${tanlangan.length} ta`, `Продолжить · ${tanlangan.length}`) : tr('Davom etish', 'Продолжить')}
      <Ikon nom="ong" o={18} />
    </button>
  );

  if (savol.turi === 'kopTanlov' && savol.id === 'tovarlar') {
    // Tanlov oqimdagi kartalarda (w5). Bu yerda faqat yakun.
    return (
      <>
        <div className={u.tanlovQator}>
          <span>{tr('Yuqoridagi kartalardan tanlang', 'Выберите карточки выше')}</span>
          {davom}
        </div>
        {tanlangan.length === 0 && otkaz}
      </>
    );
  }

  const bosh = savolBoshi(savol, tr);
  const kop = savol.turi === 'kopTanlov';
  const raqamli = savol.turi === 'son';
  const uzun = ustunlar(savol) <= 2 && !raqamli;
  const erkinYubor = () => {
    const t = matn.trim();
    if (t === '') return;
    javobBer(savol.id, savol.turi === 'son' ? Number(t) : t);
  };

  return (
    <>
      {savol.variantlar.length > 0 && (
        <div className={u.savolKarta}>
          <div className={u.savolBosh}>
            <span className={u.savolIkon}><Ikon nom={bosh.ikon} o={18} /></span>
            <div className={u.savolMatn}>
              <div className={u.savolSarlavha}>{bosh.nom}</div>
              <div className={u.savolIzoh}>{bosh.izoh}</div>
            </div>
            <span className={u.savolSon}>{bosh.son}</span>
            {otkazTugma(u.otkazishBosh)}
          </div>
          <div ref={variantlarRef} className={u.variantlar} data-ustun={ustun} style={{ gridTemplateColumns: `repeat(${ustun}, minmax(0, 1fr))` }}>
            {savol.variantlar.map((v, i) => {
              const bor = kop && tanlangan.some((x) => String(x) === String(v.qiymat));
              return (
                <button
                  key={String(v.qiymat)}
                  type="button"
                  className={[u.variant, raqamli ? u.variantRaqam : '', uzun ? u.variantUzun : '', bor ? u.variantTanlangan : ''].join(' ')}
                  aria-pressed={kop ? bor : undefined}
                  disabled={band}
                  onClick={() => (kop
                    ? setTanlangan(bor ? tanlangan.filter((x) => String(x) !== String(v.qiymat)) : [...tanlangan, v.qiymat])
                    : javobBer(savol.id, v.qiymat))}
                >
                  <span className={u.radio} aria-hidden="true" />
                  <span className={u.variantNomi}>{v.nom}</span>
                  {raqamli && i < 9 && <span className={u.klavish} aria-hidden="true">{i + 1}</span>}
                </button>
              );
            })}
            {savol.erkin && !kop && !raqamli && (
              <button type="button" className={u.variantBoshqa} onClick={() => kiritish.current?.focus()}>
                <span><Ikon nom="plyus" o={16} /></span>
                {savol.id === 'shahar' ? tr('Boshqa shahar — pastda yozing', 'Другой город — напишите ниже') : tr('Boshqa javob — pastda yozing', 'Другой ответ — напишите ниже')}
              </button>
            )}
          </div>
          {kop && <div className={u.variantYakun}>{davom}</div>}
        </div>
      )}
      {(savol.erkin || savol.turi === 'matn') && (
        <div className={u.kiritish}>
          <input
            ref={kiritish}
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
          <button type="button" className={u.yubor} onClick={erkinYubor} disabled={band} aria-label={tr('Yuborish', 'Отправить')}>
            <span className={u.yuborMatn}>{tr('Yuborish', 'Отправить')}</span><Ikon nom="ong" o={18} />
          </button>
        </div>
      )}
      {otkaz}
    </>
  );
}

/* ------------------------------------------------------ profilim */

/**
 * «Profilim» — hisob, obuna va sozlamalar (dizayn w8). Savol yoʻq
 * (nazoratchi, 2026-09-25). «Kirish» — `/kirish`, «Rejalarni
 * solishtirish» — `/obuna`.
 */
function Profilim({ mavzu, mavzuniTanla, til, tilniTanla, boshdan, yop, obuna }: {
  mavzu: Mavzu; mavzuniTanla: (m: Mavzu) => void;
  til: Til; tilniTanla: (t: Til) => void;
  boshdan: () => void; yop: () => void; obuna: () => void;
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
          <button type="button" className={u.yopish} aria-label={tr('Yopish', 'Закрыть')} onClick={yop}><Ikon nom="yopish" o={18} /></button>
        </header>
        <div className={u.panelIchi}>
          <section>
            <div className={u.bolimYorliq}>{tr('Hisob', 'Аккаунт')}</div>
            <div className={u.hisob}>
              <span className={u.hisobAvatar}><Ikon nom="odam" o={22} /></span>
              <div className={u.hisobMatn}>
                <div className={u.hisobNom}>{tr('Mehmon', 'Гость')}</div>
                <div className={u.hisobIzoh}>{tr('Suhbat shu brauzerga bogʻlangan — boshqa qurilmada koʻrinmaydi.', 'Чат привязан к этому браузеру — на другом устройстве его не видно.')}</div>
              </div>
              {/* Kengaytma rejimida token hash'da — Kirishga ham, qaytishda ham oʻtadi. */}
              <a className={u.kirishTugma} href="/kirish" onClick={(e) => { e.preventDefault(); window.location.href = `/kirish${window.location.hash}`; }}>{tr('Kirish', 'Войти')}</a>
            </div>
          </section>
          <div className={u.panelChiziq} />
          <section>
            <div className={u.bolimBosh}>
              <div className={u.bolimYorliq}>{tr('Obuna', 'Подписка')}</div>
              <button type="button" className={u.solishtir} onClick={obuna}>{tr('Rejalarni solishtirish', 'Сравнить тарифы')}<Ikon nom="ong" o={15} /></button>
            </div>
            <div className={u.rejalar}>
              {rejalar.map((r) => {
                const narx = TARIF_NARXI[r.reja] ?? null;
                const joriy = r.reja === 'bepul';
                const qadam = REJA_QADAMI[r.reja];
                return (
                  <div key={r.reja} className={`${u.reja} ${joriy ? u.rejaJoriy : ''}`}>
                    <div className={u.rejaBosh}>
                      <span className={u.rejaNomi}>{r.nom}</span>
                      {joriy ? <span className={u.teg}>{tr('joriy', 'текущий')}</span> : <span className={`${u.teg} ${u.tegNeytral}`}>{tr('tez orada', 'скоро')}</span>}
                    </div>
                    <div className={u.rejaNarx}>
                      <span className={u.rejaSon}>{narx === null ? '0' : son(narx)}</span>
                      <span className={u.rejaBirlik}>{tr('soʻm / oy', 'сум / мес')}</span>
                    </div>
                    <div className={u.rejaQadam}>{tr(`1–${qadam}-qadam`, `Шаги 1–${qadam}`)}</div>
                  </div>
                );
              })}
            </div>
            <div className={u.tolovIzoh}>
              <Ikon nom="qulf" o={15} />
              {tr('Toʻlov (Payme, Click) hali ulanmagan — pullik rejaga hozircha oʻtib boʻlmaydi.', 'Оплата (Payme, Click) ещё не подключена — перейти на платный тариф пока нельзя.')}
            </div>
          </section>
          <div className={u.panelChiziq} />
          <section className={u.sozlamalar}>
            <div className={u.bolimYorliq}>{tr('Sozlamalar', 'Настройки')}</div>
            <div className={u.sozlama}>
              <span className={u.sozlamaNomi}>{tr('Mavzu', 'Тема')}</span>
              <div className={u.segment} role="group" aria-label={tr('Mavzu', 'Тема')}>
                {(['yorug', 'tungi'] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={mavzu === m} onClick={() => mavzuniTanla(m)}>
                    {m === 'yorug' ? tr('Yorugʻ', 'Светлая') : tr('Tungi', 'Тёмная')}
                  </button>
                ))}
              </div>
            </div>
            <div className={u.sozlama}>
              <span className={u.sozlamaNomi}>{tr('Til', 'Язык')}</span>
              <div className={u.segment} role="group" aria-label={tr('Til', 'Язык')}>
                {([['uz', 'Oʻzbekcha'], ['ru', 'Русский']] as const).map(([t, nom]) => (
                  <button key={t} type="button" lang={t} aria-pressed={til === t} onClick={() => tilniTanla(t)}>{nom}</button>
                ))}
              </div>
            </div>
            <div className={u.sozlama}>
              <div>
                <div className={u.sozlamaNomi}>{tr('Suhbat', 'Чат')}</div>
                <div className={u.hisobIzoh}>{tr('Yoʻlni boshidan boshlash. Tarix saqlanadi.', 'Начать путь заново. История сохраняется.')}</div>
              </div>
              <button type="button" className={u.boshdanTugma} onClick={() => { boshdan(); yop(); }}>
                <Ikon nom="qaytadan" o={18} />{tr('Boshidan boshlash', 'Начать заново')}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
