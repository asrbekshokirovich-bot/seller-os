'use client';

/**
 * Kirish — dizayn w2 (telefon raqam) va w3 (SMS kod).
 *
 * HALOLLIK (QOIDALAR.md; nazoratchi qarori 2 — tizimda yoʻq funksiya
 * "tez orada"). SMS va Telegram orqali kirish HALI ULANMAGAN: SMS
 * provayder (masalan Eskiz) va Telegram bot nazoratchining hisobi bilan
 * ulanadi. Shu paytgacha tugmalar dizayndagidek turadi, bosilganda
 * rostini aytadi va mehmon sifatida davom etishni taklif qiladi. Kod
 * ekrani (w3) tayyor, lekin SMS yuborish ulanmaguncha unga oʻtilmaydi
 * (`SMS_ULANGAN`).
 *
 * Kengaytma rejimi: sessiya tokeni manzil hash'ida keladi — Ustaga
 * qaytishda hash saqlanadi, aks holda yangi (boʻsh) suhbat ochilardi.
 */

import { useEffect, useRef, useState } from 'react';
import { son } from '@/lib/bazamiz';
import { useMavzu } from '@/lib/mavzu';
import { saqlanganTil, tarjima, tilniQoy, type Til } from '@/lib/til';
import { Ikon } from '../Ikon';
import { MavzuTugma } from '../MavzuTugma';
import k from './kirish.module.css';

/** SMS provayder ulangach `true` — kod ekrani (w3) ochiladi. */
const SMS_ULANGAN = false;

/** `901234567` → `+998 90 123 45 67`. */
function raqamKorinishi(raqamlar: string): string {
  const r = raqamlar.slice(0, 9);
  const qism = [r.slice(0, 2), r.slice(2, 5), r.slice(5, 7), r.slice(7, 9)].filter(Boolean);
  return `+998 ${qism.join(' ')}`.trimEnd();
}

export default function Kirish({ tovar }: { tovar: number | null }) {
  const [mavzu, mavzuniTanla] = useMavzu();
  const [til, setTil] = useState<Til>('uz');
  const tr = tarjima(til);
  const [raqam, setRaqam] = useState('');
  const [bosqich, setBosqich] = useState<'raqam' | 'kod'>('raqam');
  const [xabar, setXabar] = useState<string | null>(null);
  const [kod, setKod] = useState('');
  const [hash, setHash] = useState('');
  const kodMaydon = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = saqlanganTil();
    if (t) { setTil(t); tilniQoy(t); }
    setHash(window.location.hash);
  }, []);

  const toliq = raqam.length === 9;
  const tezOrada = tr(
    'SMS va Telegram orqali kirish hali ulanmagan — tez orada. Hozircha mehmon sifatida davom eting: suhbat shu brauzerda saqlanadi.',
    'Вход по SMS и через Telegram ещё не подключён — скоро. Пока продолжайте как гость: чат сохраняется в этом браузере.',
  );

  function smsOl() {
    if (!toliq) { setXabar(tr('Telefon raqamni toʻliq yozing: +998 va 9 ta raqam.', 'Введите номер полностью: +998 и 9 цифр.')); return; }
    if (!SMS_ULANGAN) { setXabar(tezOrada); return; }
    setXabar(null);
    setBosqich('kod');
  }

  return (
    <div className={`zs-mavzu ${k.sahifa}`} data-mavzu={mavzu}>
      <aside className={k.panel}>
        <a className={k.belgi} href="/">
          <span className={k.nishon} aria-hidden="true">Z</span>
          <span className={k.nom}>ZumSavdo</span>
        </a>
        <div className={k.boshliq} />
        <div className={k.shior}>{tr('Uzumʼda nima sotishni suhbatda topamiz.', 'Что продавать на Uzum — найдём в чате.')}</div>
        <p className={k.shiorMatn}>
          {tr(
            'Nisha tanlash, Xitoydan buyurtma, doʻkon ochish va nazorat — hammasi bitta suhbatda.',
            'Выбор ниши, заказ из Китая, открытие магазина и контроль — всё в одном чате.',
          )}
        </p>
        <div className={k.raqamlar}>
          <div className={k.raqamKarta}>
            <div><span className={k.raqamSon}>{tovar === null ? '—' : son(tovar)}</span></div>
            <div className={k.raqamNom}>{tr('tovar kuzatilmoqda', 'товаров отслеживается')}</div>
          </div>
          <div className={k.raqamKarta}>
            <div><span className={k.raqamSon}>{tr('8 ta', '8')}</span></div>
            <div className={k.raqamNom}>{tr('tuzoq-filtr', 'фильтров-ловушек')}</div>
          </div>
          <div className={k.raqamKarta}>
            <div><span className={k.raqamSon}>12</span></div>
            <div className={k.raqamNom}>{tr('qadam', 'шагов')}</div>
          </div>
        </div>
      </aside>

      <main className={k.ong}>
        <div className={k.mavzu}><MavzuTugma mavzu={mavzu} tanla={mavzuniTanla} tr={tr} /></div>

        {bosqich === 'raqam' ? (
          <div className={k.forma}>
            <h1 className={k.sarlavha}>{tr('Kirish', 'Вход')}</h1>
            <p className={k.izoh}>{tr('Suhbatingiz hisobingizga bogʻlanadi va istalgan qurilmada ochiladi.', 'Чат привяжется к аккаунту и откроется на любом устройстве.')}</p>
            <label className={k.maydon}>
              <span className={k.maydonIkon}><Ikon nom="telefon" o={20} /></span>
              <span className={k.maydonIchi}>
                <span className={k.maydonNom}>{tr('Telefon raqam', 'Номер телефона')}</span>
                <input
                  className={k.maydonQiymat}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  autoFocus
                  placeholder="+998 90 123 45 67"
                  value={raqam ? raqamKorinishi(raqam) : ''}
                  onChange={(e) => {
                    const r = e.target.value.replace(/\D/g, '').replace(/^998/, '').slice(0, 9);
                    setRaqam(r);
                    setXabar(null);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') smsOl(); }}
                />
              </span>
            </label>
            <div className={k.tugmalar}>
              <button type="button" className={k.asosiy} onClick={smsOl}>{tr('SMS kod olish', 'Получить SMS-код')}</button>
              <button type="button" className={k.qora} onClick={() => setXabar(tezOrada)}>
                <Ikon nom="telegram" o={18} />{tr('Telegram orqali kirish', 'Войти через Telegram')}
              </button>
            </div>
            {xabar && <p className={k.xabar} role="status">{xabar}</p>}
            <div className={k.yoki}><span />{tr('yoki', 'или')}<span /></div>
            <a className={k.mehmon} href={`/usta${hash}`}>
              <span className={k.mehmonIkon}><Ikon nom="odam" o={20} /></span>
              <span className={k.mehmonMatn}>
                <span className={k.mehmonNom}>{tr('Mehmon sifatida davom etish', 'Продолжить как гость')}</span>
                <span className={k.mehmonIzoh}>{tr('Suhbat shu brauzerga bogʻlangan — boshqa qurilmada koʻrinmaydi.', 'Чат привязан к этому браузеру — на другом устройстве его не видно.')}</span>
              </span>
              <span className={k.mehmonOq}><Ikon nom="ong" o={18} /></span>
            </a>
            <div className={k.shartlar}>{tr('Kirish orqali foydalanish shartlariga rozilik bildirasiz', 'Входя, вы соглашаетесь с условиями использования')}</div>
          </div>
        ) : (
          <div className={k.forma}>
            <button type="button" className={k.orqaga} onClick={() => { setBosqich('raqam'); setKod(''); }}>
              <Ikon nom="chap" o={18} />{tr('Raqamni oʻzgartirish', 'Изменить номер')}
            </button>
            <h1 className={`${k.sarlavha} ${k.kodSarlavha}`}>{tr('Kodni kiriting', 'Введите код')}</h1>
            <p className={k.izoh}>
              <b className={k.raqamQalin}>{raqamKorinishi(raqam)}</b>{' '}{tr('raqamiga 6 xonali kod yubordik.', '— отправили 6-значный код.')}
            </p>
            <div className={k.kodlar} onClick={() => kodMaydon.current?.focus()}>
              {Array.from({ length: 6 }, (_, n) => (
                <div key={n} className={`${k.katak} ${n === kod.length ? k.katakJoriy : ''}`}>
                  {kod[n] ? <span className={k.katakSon}>{kod[n]}</span> : n === kod.length ? <span className={k.kursor} /> : null}
                </div>
              ))}
              <input
                ref={kodMaydon}
                className={k.yashirin}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                aria-label={tr('SMS kod', 'SMS-код')}
                value={kod}
                onChange={(e) => setKod(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
            <div className={k.kodOst}>
              <span>{tr('Kod kelmadimi?', 'Код не пришёл?')}</span>
              <span>{tr('Qayta yuborish', 'Отправить снова')}</span>
            </div>
            <button type="button" className={`${k.asosiy} ${k.tasdiq}`} disabled={kod.length < 6}>{tr('Tasdiqlash', 'Подтвердить')}</button>
          </div>
        )}
      </main>
    </div>
  );
}
