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

  const yukla = useCallback(async () => {
    try {
      const r = await fetch('/api/suhbat', { cache: 'no-store' });
      const d = (await r.json()) as SuhbatJavobi & { xato?: string };
      if (!r.ok || (d.xato && !d.keyingi)) {
        setXato(d.xato ?? tr('Ulanib boʻlmadi', 'Не удалось подключиться'));
      } else {
        qabul(d, true);
      }
    } catch (q) {
      setXato(`${tr('Soʻrov yuborilmadi', 'Запрос не отправлен')}: ${String(q)}`);
    } finally {
      setYuklandi(true);
    }
  }, [qabul, tr]);

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
            {xabarlar.map((x, i) => <XabarPufagi key={x.seq ?? `y${i}`} x={x} tr={tr} />)}

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

function XabarPufagi({ x, tr }: { x: Xabar; tr: Tr }) {
  if (x.rol === 'obunachi') return <div className={`${u.pufak} ${u.men}`}>{x.matn}</div>;
  if (x.rol === 'menejer') return <div className={`${u.pufak} ${u.ai}`}>{x.matn}</div>;
  return <KodKartasi x={x} tr={tr} />;
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
  };
  miqdor: { dona: number; hisob: string } | null;
  miqdorSababi: string | null;
  bayroqlar: Array<{ kind: string; severity: string; reason: string }>;
}
interface TannarxQatori {
  productId: number; title: string; sotuvNarxiSom: number | null; miqdor: number | null;
  marjaFoizi: number | null; chegaraSom: number | null; yetishmaydi: string[]; hisob: string | null;
}

function KodKartasi({ x, tr }: { x: Xabar; tr: Tr }) {
  const n = (x.javob ?? {}) as Record<string, unknown>;
  const olchovYoq = n.olchov_yoq === true;
  return (
    <div className={`${u.pufak} ${u.ai}`}>
      <p>{x.matn}</p>
      {olchovYoq ? null : x.savolId === 'yonalishlar'
        ? <Yonalishlar royxat={(n.royxat as YonalishQatori[] | undefined) ?? []} eskirgan={n.kesh_eskirgan === true} baholanmadi={Number(n.baholanmadi ?? 0)} bolish={(n.bolishTaklifi as { sabab: string } | null | undefined) ?? null} tr={tr} />
        : x.savolId === 'tovarlar'
          ? <Tovarlar royxat={(n.royxat as TovarQatori[] | undefined) ?? []} chiqarildi={(n.chiqarildi as Array<{ title: string; sabab: string }> | undefined) ?? []} tr={tr} />
          : x.savolId === 'tannarx'
            ? <Chegaralar qatorlar={(n.qatorlar as TannarxQatori[] | undefined) ?? []} izoh={typeof n.izoh === 'string' ? n.izoh : null} tr={tr} />
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

function Tovarlar({ royxat, chiqarildi, tr }: { royxat: TovarQatori[]; chiqarildi: Array<{ title: string; sabab: string }>; tr: Tr }) {
  return (
    <div className={u.kartalar}>
      {royxat.map((t) => (
        <div key={t.nomzod.productId} className={u.karta}>
          <div className={u.kartaBoshi}>
            <div className={u.kartaNomBlok}>
              <div className={u.kartaNomi}>{t.nomzod.title}</div>
              <div className={u.kartaMeta}>{t.nomzod.shopName ?? '—'}</div>
            </div>
          </div>
          <div className={u.statlar}>
            <Stat nom={tr('Narx', 'Цена')} q={t.nomzod.narxSom === null ? '—' : `${raqam(t.nomzod.narxSom)} ${tr('soʻm', 'сум')}`} />
            <Stat
              nom={tr('30 kunlik sotuv', 'Продажи за 30 дн')}
              q={raqam(t.nomzod.soldUnits30d)}
              izoh={t.nomzod.sotuvManbasi === 'olchandi' ? tr('oʻlchandi', 'измерено') : t.nomzod.sotuvManbasi === 'taxmin' ? tr('taxmin', 'оценка') : undefined}
            />
          </div>
          <p className={u.kichikIzoh}>{t.miqdor ? t.miqdor.hisob : t.miqdorSababi ?? ''}</p>
          {t.bayroqlar.length > 0 && (
            <div className={u.bayroqlar}>
              {t.bayroqlar.map((b) => (
                <div key={b.kind} className={`${u.bayroq} ${b.severity === 'block' ? u.bayroqYomon : b.severity === 'warn' ? u.bayroqOgoh : ''}`}>
                  <span className={u.bayroqIzoh}>{b.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {chiqarildi.length > 0 && (
        <p className={u.kichikIzoh}>
          {tr('Tuzoq sababli chiqarildi:', 'Исключены из-за ловушек:')}{' '}
          {chiqarildi.map((c) => `${c.title} — ${c.sabab}`).join('; ')}
        </p>
      )}
    </div>
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
