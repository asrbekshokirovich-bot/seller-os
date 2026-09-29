/**
 * Suhbat holati — butun ilova uchun BITTA.
 *
 * Bosh sahifa, "Suhbatlar" va "Yuklar" ham shu holatdan oʻqiydi, shuning
 * uchun u ekran ichida emas, kontekstda turadi. Holat serverniki:
 * bu yerda faqat oxirgi javob saqlanadi (web `Suhbat.tsx` bilan bir xil
 * qabul qilish qoidasi).
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { suhbatOl, suhbatYubor, UlanishXatosi } from './api';
import { savolKorsatilsinmi } from './holat';
import type { Keyingi, SuhbatJavobi, Xabar } from './turlar';

interface Suhbat {
  xabarlar: Xabar[];
  keyingi: Keyingi | null;
  qadam: number;
  yuklandi: boolean;
  band: boolean;
  xato: string | null;
  yukla: () => Promise<void>;
  yubor: (tana: Record<string, unknown>, jim?: boolean) => Promise<void>;
  javobBer: (savolId: string, javob: unknown) => void;
  boshdan: () => void;
}

const Kontekst = createContext<Suhbat | null>(null);

/** 5-qadam: 1688 qidiruvi 30–90 s — `kutish` holatida shuncha oraliqda tekshiriladi. */
const TEKSHIRISH_MS = 8000;

/**
 * Server savolni tarixga faqat POST turnida yozadi — birinchi savol
 * (salomlashuv) tarixda yoʻq, ekranda esa `keyingi` dan chiziladi.
 * Javob berilgach u yoʻqolib qolmasin: qabul qilingan javobdan oldin
 * shu savol mahalliy qoʻshiladi (web bilan farq, faqat koʻrinish).
 */
function koringanSavol(xabarlar: readonly Xabar[], keyingi: Keyingi | null): Xabar[] {
  const savol = keyingi?.tur === 'savol' ? keyingi.savol : null;
  if (!savolKorsatilsinmi(xabarlar, savol) || !savol) return [];
  return [{ rol: 'menejer', matn: savol.matn, savolId: savol.id }];
}

function sabab(q: unknown): string {
  return q instanceof UlanishXatosi ? q.message : `Soʻrov yuborilmadi: ${String(q)}`;
}

export function SuhbatProvider({ children }: { children: ReactNode }) {
  const [xabarlar, setXabarlar] = useState<Xabar[]>([]);
  const [keyingi, setKeyingi] = useState<Keyingi | null>(null);
  const [qadam, setQadam] = useState(1);
  const [yuklandi, setYuklandi] = useState(false);
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  const qabul = useCallback((r: SuhbatJavobi, almashtir: boolean, oldin: Xabar[] = []) => {
    if (r.tarix !== undefined) setXabarlar(r.tarix);
    else if (r.xabarlar.length) setXabarlar((eski) => (almashtir ? r.xabarlar : [...eski, ...oldin, ...r.xabarlar]));
    setKeyingi(r.keyingi);
    setQadam(r.qadam);
    setXato(r.xato && r.xabarlar.length === 0 && r.tarix === undefined ? r.xato : null);
  }, []);

  const yukla = useCallback(async () => {
    try {
      const { ok, data } = await suhbatOl();
      if (!ok || (data.xato && !data.keyingi)) setXato(data.xato ?? 'Ulanib boʻlmadi');
      else qabul(data, true);
    } catch (q) {
      setXato(sabab(q));
    } finally {
      setYuklandi(true);
    }
  }, [qabul]);

  // `yubor` barqaror boʻlsin (kontekst har renderda yangilanmasin) —
  // joriy holat ref orqali oʻqiladi.
  const xabarlarRef = useRef(xabarlar);
  xabarlarRef.current = xabarlar;
  const keyingiRef = useRef(keyingi);
  keyingiRef.current = keyingi;

  const yubor = useCallback(async (tana: Record<string, unknown>, jim = false) => {
    if (!jim) { setBand(true); setXato(null); }
    // Soʻrovdan OLDIN olinadi: javob kelguncha holat oʻzgarishi mumkin.
    const javobmi = tana.savolId !== undefined || tana.matn !== undefined;
    const oldin = javobmi ? koringanSavol(xabarlarRef.current, keyingiRef.current) : [];
    try {
      const { ok, data } = await suhbatYubor(tana);
      if (!ok && !data.keyingi) {
        if (!jim) setXato(data.xato ?? 'Ulanib boʻlmadi');
        return;
      }
      qabul(data, tana.boshdan === true, oldin);
      if (tana.boshdan === true) setXabarlar([]);
    } catch (q) {
      if (!jim) setXato(sabab(q));
    } finally {
      if (!jim) setBand(false);
    }
  }, [qabul]);

  useEffect(() => { void yukla(); }, [yukla]);

  // `kutish` holatida fon tekshiruvi — kiritish bloklanmaydi.
  const kutishBormi = keyingi?.tur === 'kutish';
  const yuborRef = useRef(yubor);
  yuborRef.current = yubor;
  useEffect(() => {
    if (!kutishBormi) return;
    const id = setInterval(() => { void yuborRef.current({ tekshir: true }, true); }, TEKSHIRISH_MS);
    return () => clearInterval(id);
  }, [kutishBormi]);

  const javobBer = useCallback((savolId: string, javob: unknown) => { void yubor({ savolId, javob }); }, [yubor]);
  const boshdan = useCallback(() => { void yubor({ boshdan: true }); }, [yubor]);

  const qiymat = useMemo<Suhbat>(
    () => ({ xabarlar, keyingi, qadam, yuklandi, band, xato, yukla, yubor, javobBer, boshdan }),
    [xabarlar, keyingi, qadam, yuklandi, band, xato, yukla, yubor, javobBer, boshdan],
  );
  return <Kontekst.Provider value={qiymat}>{children}</Kontekst.Provider>;
}

export function useSuhbat(): Suhbat {
  const s = useContext(Kontekst);
  if (!s) throw new Error('SuhbatProvider yoʻq');
  return s;
}
