/**
 * Ranglar — `ZUMSavdo_Mobil.html` (yorugʻ) va `ZUMSavdo_Mobil_Tungi.html`
 * (tungi) dizaynlaridan, nazoratchi 2026-09-29 da berdi.
 *
 * Web (`apps/web`, qora + sariq) bilan ATAYLAB farq qiladi: ilova oʻz
 * dizayniga ega. Nomlar maʼnoga koʻra (`ink2` — ikkinchi darajali matn),
 * rang nomi emas, shuning uchun ikkala mavzu bitta kalit toʻplamida.
 */

import type { ViewStyle } from 'react-native';

export type MavzuNomi = 'yorug' | 'tungi';

export interface Ranglar {
  /** Ekran foni. */
  bg: string;
  /** Karta, pufak, kiritish maydoni. */
  karta: string;
  /** Karta ichidagi kichik blok (stat, variant tugmasi). */
  ichki: string;
  /** Progress izi, boʻsh segment, faol boʻlmagan chip. */
  iz: string;
  /** Ajratuvchi chiziq. */
  chiziq: string;
  ink: string;
  ink2: string;
  acc: string;
  /** Aksent ustidagi matn. */
  accInk: string;
  accYumshoq: string;
  /** Teskari blok (odam pufagi, yuborish tugmasi, pastki menyu). */
  teskari: string;
  teskariInk: string;
  yaxshi: string;
  ogoh: string;
  yomon: string;
}

export const RANGLAR: Record<MavzuNomi, Ranglar> = {
  yorug: {
    bg: '#F4EFE6',
    karta: '#FFFFFF',
    ichki: '#F8F4EC',
    iz: '#EDE6DA',
    chiziq: '#E3DACB',
    ink: '#1F1A14',
    ink2: '#6E6558',
    acc: '#D2552D',
    accInk: '#FFFFFF',
    accYumshoq: 'rgba(210,85,45,0.10)',
    teskari: '#1F1A14',
    teskariInk: '#FFFFFF',
    yaxshi: '#2E8B57',
    ogoh: '#B7791F',
    yomon: '#C0392B',
  },
  tungi: {
    bg: '#13100C',
    karta: '#1D1914',
    ichki: '#25201A',
    iz: '#2B251E',
    chiziq: '#3A3229',
    ink: '#F4EFE6',
    ink2: '#AFA595',
    acc: '#E86E42',
    accInk: '#FFFFFF',
    accYumshoq: 'rgba(232,110,66,0.16)',
    teskari: '#F4EFE6',
    teskariInk: '#13100C',
    yaxshi: '#4DBB84',
    ogoh: '#E3A646',
    yomon: '#EC6F60',
  },
};

/** Karta soyasi: yorugʻda yumshoq soya, tungida ingichka hoshiya. */
export function kartaSoyasi(m: MavzuNomi): ViewStyle {
  return m === 'yorug'
    ? { boxShadow: '0 1px 2px rgba(60,40,20,0.06), 0 6px 18px rgba(60,40,20,0.06)' }
    : { boxShadow: '0 0 0 1px #2E2720, 0 8px 22px rgba(0,0,0,0.35)' };
}

/** Rangga shaffoflik qoʻshadi: `#2E8B57` + 0.1 → `#2E8B571A`. */
export function shaffof(hex: string, alfa: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alfa)) * 255).toString(16).padStart(2, '0');
  return `${hex}${a.toUpperCase()}`;
}

export const SHRIFT = {
  sarlavha: 'Unbounded_600SemiBold',
  sarlavhaQalin: 'Unbounded_700Bold',
  matn: 'Onest_400Regular',
  matnOrta: 'Onest_500Medium',
  matnYarim: 'Onest_600SemiBold',
  matnQalin: 'Onest_700Bold',
} as const;
