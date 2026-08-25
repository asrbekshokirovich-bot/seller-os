/**
 * Oʻlchov paneli — reja, 8-boʻlim.
 *
 * Sahifa SERVER komponenti. Sabab: `SELLEROS_API_KEY` brauzerga
 * umuman tushmasin va sahifada mijoz JS i boʻlmasin. Panelda
 * bosiladigan narsa yoʻq — u faqat oʻqiladi.
 *
 * PANEL RAQAM TOʻQIMAYDI. `/kpi` javobidagi har qator shu yerda
 * qanday kelsa shunday chiqadi: `qiymat: null` — chiziqcha va
 * SABAB, nol emas. Qator jadvaldan tushib qolmaydi ham — yoʻqolgan
 * qator "hammasi joyida" boʻlib koʻrinardi.
 */

import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from 'next/font/google';
import type { Kpi, Reja } from '@selleros/shared';
import { olib } from '@/lib/api';
import { holat } from '@/lib/panel';
import { PANEL_COOKIE, kalit, togrimi, xesh } from '@/lib/qulf';
import u from './olchov.module.css';

/*
 * Sahifa HAR SOʻROVDA qayta hisoblanadi.
 *
 * Bu qator boʻlmasa Next uni statik deb prerender qiladi va
 * OʻLCHANDI: qurish paytida `PANEL_KALITI` boʻsh boʻlgani uchun
 * qulf `cookies()` gacha yetmaydi, yaʼni sahifada dinamik chaqiruv
 * qolmaydi va "panel sozlanmagan" sahifasi keshga muzlab qoladi —
 * kalit keyin qoʻyilsa ham panel ochilmasdi.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SellerOS — Oʻlchov paneli',
  // Ichki panel qidiruvga tushmasin.
  robots: { index: false, follow: false },
};

/*
 * Shrift qurish paytida yuklab olinadi va oʻzimizdan beriladi.
 * Ish vaqtida Google ga soʻrov ketmaydi — panel tashqi xizmatga
 * bogʻlanib qolmasin.
 */
const plex = IBM_Plex_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
});
const plexCond = IBM_Plex_Sans_Condensed({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600'],
  variable: '--font-plex-cond',
  display: 'swap',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

const SHRIFTLAR = `${plex.variable} ${plexCond.variable} ${plexMono.variable}`;

/** `GET /kpi` javobi. */
interface KpiJavobi {
  olchandi: string;
  xulosa: { jami: number; olchandi: number; yaxshi: number; yomon: number };
  kpi: Kpi[];
}

/** `GET /tarif` javobi. */
interface TarifJavobi {
  reja: Reja;
  sabab: string;
  tanilmadi: boolean;
  xomReja: string | null;
  cheklov_yoqilgan: boolean;
  qadamlar: { qadam: number; ochiq: boolean; rejada_ochiq: boolean }[];
}

/** Usta qadamlarining nomlari — reja, 2-boʻlim. */
const QADAM_NOMI: Record<number, string> = {
  1: 'Profil',
  2: 'Yoʻnalish',
  3: 'Tovar va miqdor',
  4: 'Tannarx',
  5: 'Buyurtma',
  6: 'Chiqish',
};

export default async function OlchovSahifasi(
  props: { searchParams: Promise<Record<string, string | string[] | undefined>> },
) {
  const h = await holat();
  if (h === 'sozlanmagan') return <Sozlanmagan />;
  if (h === 'kalit-kerak') {
    const q = await props.searchParams;
    return <Kirish xato={q.xato === '1'} />;
  }

  const [kpi, tarif] = await Promise.all([
    olib<KpiJavobi>('/kpi'),
    olib<TarifJavobi>('/tarif'),
  ]);

  return (
    <div className={`${u.panel} ${SHRIFTLAR}`}>
      <div className={u.wrap}>
        <header className={u.head}>
          <p className={u.eyebrow}>Reja · 8-boʻlim · Birinchi kundan oʻlchanadigan raqamlar</p>
          <h1>Oʻlchov paneli</h1>
          <p className={u.lede}>
            Rejadagi KPI lar. Oʻlchanmagani <b>nol emas</b> — chiziqcha bilan
            chiqadi va yonida nega oʻlchanmagani yozilgan.
          </p>
          <p className={u.stamp}>
            <span>manba: <b>GET /kpi</b></span>
            <span>javob: <b>{kpi ? vaqt(kpi.olchandi) : '—'}</b></span>
          </p>
        </header>

        {kpi === null ? (
          <div className={u.xato}>
            <b>KPI javobi olinmadi.</b>
            <p>
              Panel API ga ulanolmadi. Boʻsh jadval koʻrsatilmaydi: u
              &laquo;hamma KPI oʻlchanmagan&raquo; degan daʼvo boʻlardi,
              holbuki bu ulanish xatosi. <code className={u.kod}>SELLEROS_API_URL</code> va{' '}
              <code className={u.kod}>SELLEROS_API_KEY</code> ni tekshiring.
            </p>
          </div>
        ) : (
          <>
            <Yigindi x={kpi.xulosa} />
            <Blok
              sarlavha="Usta va mahsulot"
              izoh="darvozalar shu raqamlarga bogʻlangan"
              qatorlar={kpi.kpi.filter((k) => k.guruh === 'mahsulot')}
            />
            <Blok
              sarlavha="Texnik"
              izoh="sifat paneli har kuni tekshiradi"
              qatorlar={kpi.kpi.filter((k) => k.guruh === 'texnik')}
            />
          </>
        )}

        <Tarif t={tarif} />

        <section className={u.izoh}>
          <p><b>Panelning ikkita qatʼiy qoidasi</b></p>
          <ul>
            <li>
              <b>Oʻlchanmagan raqam nol emas.</b> Har boʻsh qator chiziqcha va
              sabab bilan chiqadi, va jadvaldan tushib qolmaydi.
            </li>
            <li>
              <b>Kichik namuna baholanmaydi.</b> Kuzatuv kam boʻlsa foiz
              koʻrsatiladi, lekin &laquo;namuna kichik&raquo; deb belgilanadi va
              darvoza uni &laquo;maqsaddan past&raquo; deb sanamaydi.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function Yigindi({ x }: { x: KpiJavobi['xulosa'] }) {
  return (
    <section className={u.tally} aria-label="Yigʻindi">
      <div>
        <span className={u.tallyN}>
          {x.olchandi}
          <small>&thinsp;/&thinsp;{x.jami}</small>
        </span>
        <span className={u.tallyK}>Oʻlchandi</span>
      </div>
      <div className={u.tallyYaxshi}>
        <span className={u.tallyN}>{x.yaxshi}</span>
        <span className={u.tallyK}>Maqsadda</span>
      </div>
      <div className={x.yomon > 0 ? u.tallyYomon : undefined}>
        <span className={u.tallyN}>{x.yomon}</span>
        <span className={u.tallyK}>Maqsaddan past</span>
      </div>
      <div className={u.tallyYoq}>
        <span className={u.tallyN}>{x.jami - x.olchandi}</span>
        <span className={u.tallyK}>Oʻlchanmadi</span>
      </div>
    </section>
  );
}

function Blok(
  { sarlavha, izoh, qatorlar }: { sarlavha: string; izoh: string; qatorlar: Kpi[] },
) {
  if (!qatorlar.length) return null;
  return (
    <section className={u.blok}>
      <header className={u.blokHead}>
        <h2>{sarlavha}</h2>
        <span>{izoh}</span>
      </header>
      <div className={u.qatorlar}>
        {qatorlar.map((k) => <Qator key={k.kalit} k={k} />)}
      </div>
    </section>
  );
}

function Qator({ k }: { k: Kpi }) {
  const belgi = HOLAT[k.holat];
  return (
    <div className={`${u.qator} ${belgi.qator}`}>
      <div className={u.stripe} />
      <div className={u.nom}>
        <b>{k.nom}</b>
        {k.sabab !== null && <span className={u.sabab}>{k.sabab}</span>}
        {k.ogoh !== undefined && (
          <span className={u.ogoh}><b>Ogoh:</b> {k.ogoh}</span>
        )}
      </div>
      <div className={`${u.qiymat} ${k.qiymat === null ? u.bosh : ''}`}>
        {k.qiymat === null ? '—' : (
          <>
            {k.qiymat}
            <u>{k.birlik === 'foiz' ? '%' : ' s'}</u>
          </>
        )}
      </div>
      <div className={u.oxirgi}>
        <span className={`${u.chip} ${belgi.chip}`}>{belgi.matn}</span>
        <span className={u.maqsad}>{maqsadMatni(k)}</span>
      </div>
    </div>
  );
}

/**
 * `Kpi.holat` → chiziq, chip va oʻzbekcha nom.
 *
 * Boʻsh satr — asosiy uslub yetarli degani: `.stripe` va `.chip`
 * oʻzi neytral rangda. Yoʻq sinf nomini yozib qoʻyish xavfli
 * boʻlardi — CSS moduli uni `undefined` qilib qaytaradi va xato
 * jimgina oʻtib ketardi.
 */
const HOLAT: Record<Kpi['holat'], { qator: string; chip: string; matn: string }> = {
  yaxshi: { qator: kerak('sYaxshi'), chip: kerak('cYaxshi'), matn: 'Maqsadda' },
  yomon: { qator: kerak('sYomon'), chip: kerak('cYomon'), matn: 'Maqsaddan past' },
  'namuna-kichik': { qator: kerak('sKichik'), chip: kerak('cKichik'), matn: 'Namuna kichik' },
  olchanmadi: { qator: kerak('sYoq'), chip: '', matn: 'Oʻlchanmadi' },
  maqsadsiz: { qator: '', chip: '', matn: 'Maqsadsiz' },
};

/**
 * CSS modulidagi sinf nomi. Yoʻq boʻlsa — XATO, sukut emas.
 *
 * `?? ''` yozilsa CSS da sinf qayta nomlanganda uslub jimgina
 * yoʻqolardi va jadval rangsiz chiqib ketardi. Bu yer ataylab
 * shovqinli: xato darhol koʻrinsin.
 */
function kerak(nom: string): string {
  const sinf = u[nom];
  if (sinf === undefined) {
    throw new Error(`olchov.module.css da '.${nom}' sinfi yoʻq.`);
  }
  return sinf;
}

function maqsadMatni(k: Kpi): string {
  const asos = k.maqsad.yonalish === 'yoq' ? k.maqsad.matn : `maqsad ${k.maqsad.matn}`;
  return k.namuna === null ? asos : `${asos} · n=${k.namuna}`;
}

function Tarif({ t }: { t: TarifJavobi | null }) {
  if (t === null) {
    return (
      <section className={u.blok}>
        <header className={u.blokHead}><h2>Tarif cheklovi</h2></header>
        <div className={u.xato}>
          <b>Tarif holati olinmadi.</b>
          <p>
            &laquo;Cheklov oʻchiq&raquo; deb koʻrsatilmaydi: u tekshirilmagan
            daʼvo boʻlardi.
          </p>
        </div>
      </section>
    );
  }

  const yopiq = t.qadamlar.find((q) => !q.ochiq);
  return (
    <section className={u.blok}>
      <header className={u.blokHead}>
        <h2>Tarif cheklovi</h2>
        <span>GET /tarif</span>
      </header>

      <p className={u.tarifHolati}>
        <code className={u.kod}>TARIF_CHEKLOVI</code>
        <span className={`${u.bayroq} ${t.cheklov_yoqilgan ? '' : u.bayroqYoq}`}>
          {t.cheklov_yoqilgan ? 'Yoqilgan' : 'Oʻchiq'}
        </span>
        <span>
          {t.cheklov_yoqilgan
            ? `amaldagi reja: ${t.reja}`
            : `pilot holati — hamma qadam ochiq (reja: ${t.reja})`}
        </span>
      </p>

      {t.tanilmadi && (
        <div className={u.xato}>
          <b>Bazadagi reja nomi tanilmadi: {t.xomReja ?? '—'}</b>
          <p>
            Foydalanuvchi bepulga tushirildi. Bu jimgina boʻlmasligi kerak:
            bitta harf xatosi toʻlagan mijozni bepulga aylantirib qoʻyadi.
          </p>
        </div>
      )}

      <div className={u.qadamlar}>
        {t.qadamlar.map((q) => (
          <div
            key={q.qadam}
            className={`${u.qadam} ${q.ochiq ? u.qadamOchiq : u.qadamYopiq}`}
          >
            <span className={u.qadamNo}>{q.qadam}-qadam</span>
            <span className={u.qadamT}>{QADAM_NOMI[q.qadam] ?? '—'}</span>
            <span className={u.qadamH}>{q.ochiq ? 'Ochiq' : 'Yopiq'}</span>
          </div>
        ))}
      </div>

      {yopiq !== undefined && (
        <div className={u.qulf}>
          <h3>{yopiq.qadam}-qadamdan boshlab bu rejada yopiq</h3>
          <p>
            Yopiq qadamga soʻrov <code className={u.kod}>402</code> bilan
            qaytadi: qaysi qadam, qaysi reja va uni nima ochishi javobda
            yozilgan.
          </p>
        </div>
      )}
    </section>
  );
}

function Sozlanmagan() {
  return (
    <div className={`${u.panel} ${SHRIFTLAR}`}>
      <div className={u.kirish}>
        <div className={u.xato}>
          <b>Panel yopiq: <code className={u.kod}>PANEL_KALITI</code> sozlanmagan.</b>
          <p>
            Panel foydalanuvchi soni va obuna holatini koʻrsatadi. Kalitsiz u
            hech kimga ochilmaydi — sozlash esdan chiqsa panel omma uchun
            ochilib ketmasligi kerak.
          </p>
        </div>
      </div>
    </div>
  );
}

function Kirish({ xato }: { xato: boolean }) {
  async function kir(forma: FormData) {
    'use server';
    const berilgan = String(forma.get('kalit') ?? '');
    const k = kalit();
    if (!togrimi(berilgan, k)) redirect('/olchov?xato=1');

    (await cookies()).set(PANEL_COOKIE, xesh(k), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/olchov',
      maxAge: 60 * 60 * 12,
    });
    redirect('/olchov');
  }

  return (
    <div className={`${u.panel} ${SHRIFTLAR}`}>
      <div className={u.kirish}>
        <p className={u.eyebrow}>SellerOS · ichki panel</p>
        {xato && (
          <div className={u.xato}>
            <b>Kalit notoʻgʻri.</b>
            <p>Qaytadan urinib koʻring.</p>
          </div>
        )}
        <form action={kir}>
          <label htmlFor="kalit">Panel kaliti</label>
          <input id="kalit" name="kalit" type="password" autoComplete="off" required />
          <button type="submit">Kirish</button>
        </form>
      </div>
    </div>
  );
}

/** Toshkent vaqti — server UTC da tursa ham panel mahalliy vaqtni koʻrsatadi. */
function vaqt(iso: string): string {
  const q = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const p = (nom: string) => q.find((x) => x.type === nom)?.value ?? '??';
  return `${p('year')}-${p('month')}-${p('day')} ${p('hour')}:${p('minute')} (Toshkent)`;
}
