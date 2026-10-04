'use client';

/**
 * «Obunani oʻzgartirish» — dizayn w9. Ustaning ichki koʻrinishi (yon panel
 * joyida qoladi): «Profilim» → «Rejalarni solishtirish». Alohida sahifa
 * EMAS — kengaytma yon panelida sessiya tokeni manzil hash'ida turadi va
 * sahifa almashsa yoʻqolardi.
 *
 * HALOLLIK: toʻlov (Payme, Click) HALI ULANMAGAN — dizayndagidek toʻlov
 * tugmasi oʻchiq va sababi yozilgan. Narx va qadam chegaralari
 * `@selleros/shared` dan (`TARIF_NARXI`, `REJA_QADAMI`) — shu yerda
 * yozilmaydi.
 */

import { useState } from 'react';
import { REJA_QADAMI, SUHBAT_QADAMLARI, TARIF_NARXI, type Reja } from '@selleros/shared';
import { son } from '@/lib/bazamiz';
import type { Mavzu } from '@/lib/mavzu';
import type { Tr } from '@/lib/til';
import { Ikon } from '../Ikon';
import { MavzuTugma } from '../MavzuTugma';
import o from './obuna.module.css';

const REJALAR: readonly Reja[] = ['bepul', 'pro', 'biznes'];
const OYLAR_QISQA = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'] as const;
const OYLAR_QISQA_RU = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'] as const;

/** Bugundan bir oy keyin — "30 okt 2026". */
function keyingiTolov(tr: Tr): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  const oy = tr(OYLAR_QISQA[d.getMonth()]!, OYLAR_QISQA_RU[d.getMonth()]!);
  return `${d.getDate()} ${oy} ${d.getFullYear()}`;
}

export function Obuna({ tr, mavzu, mavzuniTanla, orqaga }: {
  tr: Tr; mavzu: Mavzu; mavzuniTanla: (m: Mavzu) => void; orqaga: () => void;
}) {
  const joriy: Reja = 'bepul';
  const [tanlangan, setTanlangan] = useState<Reja>('pro');
  const [usul, setUsul] = useState<'payme' | 'click'>('payme');
  const nomi = (r: Reja) => (r === 'bepul' ? tr('Bepul', 'Бесплатный') : r === 'pro' ? 'Pro' : tr('Biznes', 'Бизнес'));
  const narx = (r: Reja) => TARIF_NARXI[r] ?? 0;
  // Roʻyxat: eng keng reja chegarasidan bitta keyingi qadamgacha (dizayn: 1–7).
  const oxirgi = Math.min(SUHBAT_QADAMLARI.length, Math.max(...REJALAR.map((r) => REJA_QADAMI[r])) + 1);
  const qadamlar = SUHBAT_QADAMLARI.slice(0, oxirgi);
  const somB = tr('soʻm', 'сум');

  return (
    <>
      <header className={o.tepa}>
        <div className={o.tepaChap}>
          <button type="button" className={o.orqaga} aria-label={tr('Orqaga', 'Назад')} onClick={orqaga}><Ikon nom="chap" o={18} /></button>
          <div>
            <div className={o.sarlavha}>{tr('Obunani oʻzgartirish', 'Смена подписки')}</div>
            <div className={o.meta}>{tr('Profilim · Obuna', 'Мой профиль · Подписка')}</div>
          </div>
        </div>
        <MavzuTugma mavzu={mavzu} tanla={mavzuniTanla} tr={tr} />
      </header>

      <div className={o.ichi}>
        <div className={o.rejalar}>
          {REJALAR.map((r) => {
            const chegara = REJA_QADAMI[r];
            const faol = r === tanlangan && r !== joriy;
            return (
              <div key={r} className={`${o.reja} ${faol ? o.rejaTanlangan : ''}`}>
                <div className={o.rejaBosh}>
                  <span className={o.rejaNomi}>{nomi(r)}</span>
                  {r === joriy
                    ? <span className={`${o.teg} ${o.tegNeytral}`}>{tr('joriy', 'текущий')}</span>
                    : r === 'pro' ? <span className={o.teg}>{tr('tavsiya', 'рекомендуем')}</span> : null}
                </div>
                <div className={o.narx}>
                  <span className={`${o.narxSon} ${faol ? o.narxAcc : ''}`}>{son(narx(r))}</span>
                  <span className={o.narxBirlik}>{tr('soʻm / oy', 'сум / мес')}</span>
                </div>
                <div className={o.qadam}>{tr(`1–${chegara}-qadam`, `Шаги 1–${chegara}`)}</div>
                <div className={o.chiziq} />
                <ul className={o.royxat}>
                  {qadamlar.map((q) => {
                    const bor = q.n <= chegara;
                    return (
                      <li key={q.n} className={bor ? '' : o.yopiq}>
                        <span className={bor ? o.belgiBor : o.belgiYoq}>
                          {bor ? <Ikon nom="belgi" o={12} q={3} /> : <Ikon nom="qulf" o={11} q={2.5} />}
                        </span>
                        {tr(q.nom, q.ru)}
                      </li>
                    );
                  })}
                </ul>
                <div className={o.boshliq} />
                {r === joriy
                  ? <button type="button" className={`${o.tugma} ${o.tugmaChiziq}`} disabled>{tr('Joriy reja', 'Текущий тариф')}</button>
                  : faol
                    ? <button type="button" className={`${o.tugma} ${o.tugmaAcc}`} aria-pressed="true">{tr('Tanlangan', 'Выбрано')}<Ikon nom="belgi" o={18} /></button>
                    : <button type="button" className={`${o.tugma} ${o.tugmaQora}`} onClick={() => setTanlangan(r)}>{tr('Tanlash', 'Выбрать')}</button>}
              </div>
            );
          })}
        </div>

        <aside className={o.tolov}>
          {/* Ikki guruh: keng ekranda bitta ustun (dizayn), tor ekranda yonma-yon — toʻlov tugmasi pastga tushib ketmaydi. */}
          <div className={o.tolovChap}>
          <div className={o.yorliq}>{tr('Toʻlov', 'Оплата')}</div>
          <div className={o.tolovReja}>
            <span className={o.tolovNomi}>{nomi(tanlangan)}</span>
            <span className={o.xira}>{tr('oylik', 'ежемесячно')}</span>
          </div>
          <div className={o.qatorlar}>
            <div className={o.qator}><span>{tr('Reja', 'Тариф')}</span><b>{son(narx(tanlangan))} {somB}</b></div>
            <div className={o.qator}><span>{tr('Hozirgi reja', 'Текущий тариф')}</span><b>{nomi(joriy)} · 0 {somB}</b></div>
            <div className={o.qator}><span>{tr('Keyingi toʻlov', 'Следующий платёж')}</span><b>{keyingiTolov(tr)}</b></div>
          </div>
          <div className={o.ajrat} />
          <div className={o.jami}>
            <span>{tr('Jami', 'Итого')}</span>
            <span className={o.jamiQiymat}><span className={o.jamiSon}>{son(narx(tanlangan))}</span><span className={o.jamiBirlik}>{somB}</span></span>
          </div>
          </div>
          <div className={o.tolovOng}>
          <div className={`${o.yorliq} ${o.usulYorliq}`}>{tr('Toʻlov usuli', 'Способ оплаты')}</div>
          <div className={o.usullar}>
            {(['payme', 'click'] as const).map((x) => (
              <button key={x} type="button" className={`${o.usul} ${usul === x ? o.usulTanlangan : ''}`} aria-pressed={usul === x} onClick={() => setUsul(x)}>
                <span className={o.radio} />
                <span className={o.usulNomi}>{x === 'payme' ? 'Payme' : 'Click'}</span>
              </button>
            ))}
          </div>
          <div className={o.boshliq} />
          <div className={o.ogoh}>
            <span className={o.ogohIkon}><Ikon nom="qulf" o={15} /></span>
            {tr('Toʻlov (Payme, Click) hali ulanmagan — pullik rejaga hozircha oʻtib boʻlmaydi.', 'Оплата (Payme, Click) ещё не подключена — перейти на платный тариф пока нельзя.')}
          </div>
          <button type="button" className={o.tolash} disabled>
            {usul === 'payme' ? tr('Payme orqali toʻlash', 'Оплатить через Payme') : tr('Click orqali toʻlash', 'Оплатить через Click')}
          </button>
          </div>
        </aside>
      </div>
    </>
  );
}
