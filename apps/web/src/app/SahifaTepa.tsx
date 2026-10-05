'use client';

/**
 * Hujjat sahifalarining tepasi (Maxfiylik, 404) — bosh sahifa navi bilan
 * bir uslub: belgi, mavzu tugmasi va bitta asosiy havola.
 */

import { useSyncExternalStore } from 'react';
import { useMavzu } from '@/lib/mavzu';
import { tarjima, type Til } from '@/lib/til';
import { Havola } from './Havola';
import { Ikki } from './Ikki';
import { MavzuTugma } from './MavzuTugma';
import s from './sahifaTepa.module.css';

const jim = () => () => {};

/** Statik sahifada til — head skripti qoʻygan `<html lang>` (serverda — oʻzbekcha). */
function useHujjatTili(): Til {
  return useSyncExternalStore(jim, () => (document.documentElement.lang === 'ru' ? 'ru' : 'uz'), () => 'uz');
}

/**
 * `til` berilmasa (statik 404) — havola matni ikkala tilda (`Ikki`, CSS
 * koʻrsatadi), tugmalar yorligʻi esa hujjat tilida.
 */
export function SahifaTepa({ til, havola }: { til?: Til; havola: { href: string; uz: string; ru: string } }) {
  const [mavzu, mavzuniTanla] = useMavzu();
  const hujjatTili = useHujjatTili();
  const tr = tarjima(til ?? hujjatTili);
  return (
    <header className={s.tepa}>
      <div className={s.ichi}>
        {/* Tor ekranda «ZumSavdo» yashiriladi — havola nomi aria-label da qoladi. */}
        <Havola className={s.logo} href="/" aria-label="ZumSavdo">
          <span className={s.nishon} aria-hidden="true">Z</span>
          <span className={s.logoMatn}>ZumSavdo</span>
        </Havola>
        <div className={s.ong}>
          <MavzuTugma mavzu={mavzu} tanla={mavzuniTanla} tr={tr} />
          <Havola className={s.tugma} href={havola.href}>{til ? tr(havola.uz, havola.ru) : <Ikki uz={havola.uz} ru={havola.ru} />}</Havola>
        </div>
      </div>
    </header>
  );
}
