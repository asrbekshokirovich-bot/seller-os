'use client';

/**
 * Quyosh / oy — dizayndagi segmentli mavzu tugmasi (bosh sahifa, Kirish,
 * Usta tepa panelida bir xil). Tanlov `useMavzu` da saqlanadi.
 */

import type { Mavzu } from '@/lib/mavzu';
import type { Tr } from '@/lib/til';
import { Ikon } from './Ikon';
import s from './mavzuTugma.module.css';

export function MavzuTugma({ mavzu, tanla, tr }: { mavzu: Mavzu; tanla: (m: Mavzu) => void; tr: Tr }) {
  return (
    <span className={s.mavzuTugma} role="group" aria-label={tr('Mavzu', 'Тема')}>
      <button type="button" className={s.quyosh} aria-pressed={mavzu === 'yorug'} aria-label={tr('Yorugʻ mavzu', 'Светлая тема')} onClick={() => tanla('yorug')}>
        <Ikon nom="quyosh" o={17} />
      </button>
      <button type="button" className={s.oy} aria-pressed={mavzu === 'tungi'} aria-label={tr('Tungi mavzu', 'Тёмная тема')} onClick={() => tanla('tungi')}>
        <Ikon nom="oy" o={17} />
      </button>
    </span>
  );
}
