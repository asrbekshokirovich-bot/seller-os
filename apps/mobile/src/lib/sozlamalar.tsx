/**
 * Mavzu, til va "kirish ekrani oʻtildimi" — qurilmada saqlanadi.
 *
 * Standart mavzu — TUNGI (dizayn/HOLAT.md, nazoratchi qarori 3).
 * "Tizim mavzusi" varianti ham bor: telefon sozlamasiga ergashadi.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { RANGLAR, type MavzuNomi, type Ranglar } from './mavzu';
import { ol, yoz } from './saqlash';
import { tarjima, type Til, type Tr } from './til';

export type MavzuTanlovi = MavzuNomi | 'tizim';

interface Sozlamalar {
  tayyor: boolean;
  tanlov: MavzuTanlovi;
  mavzu: MavzuNomi;
  r: Ranglar;
  til: Til;
  tr: Tr;
  kirdi: boolean;
  mavzuniTanla: (m: MavzuTanlovi) => void;
  tilniTanla: (t: Til) => void;
  kirishniBelgila: () => void;
}

const Kontekst = createContext<Sozlamalar | null>(null);

const K_MAVZU = 'so_mavzu';
const K_TIL = 'so_til';
const K_KIRDI = 'so_kirdi';

export function SozlamalarProvider({ children }: { children: ReactNode }) {
  const tizim = useColorScheme();
  const [tayyor, setTayyor] = useState(false);
  const [tanlov, setTanlov] = useState<MavzuTanlovi>('tungi');
  const [til, setTil] = useState<Til>('uz');
  const [kirdi, setKirdi] = useState(false);

  useEffect(() => {
    void (async () => {
      const [m, t, k] = await Promise.all([ol(K_MAVZU), ol(K_TIL), ol(K_KIRDI)]);
      if (m === 'yorug' || m === 'tungi' || m === 'tizim') setTanlov(m);
      if (t === 'uz' || t === 'ru') setTil(t);
      setKirdi(k === '1');
      setTayyor(true);
    })();
  }, []);

  const mavzuniTanla = useCallback((m: MavzuTanlovi) => { setTanlov(m); void yoz(K_MAVZU, m); }, []);
  const tilniTanla = useCallback((t: Til) => { setTil(t); void yoz(K_TIL, t); }, []);
  const kirishniBelgila = useCallback(() => { setKirdi(true); void yoz(K_KIRDI, '1'); }, []);

  const qiymat = useMemo<Sozlamalar>(() => {
    const mavzu: MavzuNomi = tanlov === 'tizim' ? (tizim === 'light' ? 'yorug' : 'tungi') : tanlov;
    return {
      tayyor, tanlov, mavzu, r: RANGLAR[mavzu], til, tr: tarjima(til), kirdi,
      mavzuniTanla, tilniTanla, kirishniBelgila,
    };
  }, [tayyor, tanlov, tizim, til, kirdi, mavzuniTanla, tilniTanla, kirishniBelgila]);

  return <Kontekst.Provider value={qiymat}>{children}</Kontekst.Provider>;
}

export function useSozlama(): Sozlamalar {
  const s = useContext(Kontekst);
  if (!s) throw new Error('SozlamalarProvider yoʻq');
  return s;
}
