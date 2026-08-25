/**
 * Tarif darvozasi va KPI paneli uchlari.
 *
 * Muhit oʻzgaruvchilari ataylab tozalanadi (QOIDALAR.md §8-e):
 * bir marta test bazaga HAQIQIY soʻrov yuborib, "oʻtdi" degan
 * yolgʻon natija bergan edi.
 *
 * `TARIF_CHEKLOVI` ham shu roʻyxatda: flag mahalliy muhitda
 * yoqilgan boʻlsa, cheklovsiz holatni tekshiradigan test jimgina
 * boshqa narsani tekshirib qolardi.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { build } from '../src/app.js';
import { KPI_MAQSAD } from '@selleros/shared';

const KALITLAR = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TARIF_CHEKLOVI'] as const;
const OLDINGI = new Map<string, string | undefined>();

beforeEach(() => {
  for (const nom of KALITLAR) {
    OLDINGI.set(nom, process.env[nom]);
    delete process.env[nom];
  }
});

afterEach(() => {
  for (const nom of KALITLAR) {
    const eski = OLDINGI.get(nom);
    if (eski === undefined) delete process.env[nom];
    else process.env[nom] = eski;
  }
});

async function soraw(url: string, sarlavha: Record<string, string> = {}) {
  const app = build();
  const res = await app.inject({ method: 'GET', url, headers: sarlavha });
  await app.close();
  return res;
}

describe('tarif cheklovi — pilotda OʻCHIQ', () => {
  it('muhit tozalangan — test haqiqiy bazaga tegmaydi', () => {
    expect(process.env.SUPABASE_URL).toBeUndefined();
    expect(process.env.TARIF_CHEKLOVI).toBeUndefined();
  });

  it('/health cheklov holatini koʻrsatadi va u standart holatda oʻchiq', async () => {
    const res = await soraw('/health');
    expect(res.json().live.tarifCheklovi).toBe(false);
  });

  /*
   * Eng muhim tekshiruv. Toʻlov oqimi hali yoʻq — yaʼni cheklov
   * yoqilsa hech kim 3-qadamga oʻta olmasdi. Shuning uchun u
   * ANIQ `TARIF_CHEKLOVI=1` boʻlmasa yoqilmaydi.
   */
  it('cheklov oʻchiqda 3-qadam tokensiz ham ochiq', async () => {
    const res = await soraw('/tovarlar?turkum=123');
    expect(res.statusCode).not.toBe(402);
  });

  it('faqat "1" yoqadi — "true", "yes", "0" yoqmaydi', async () => {
    for (const qiymat of ['true', 'yes', '0', '']) {
      process.env.TARIF_CHEKLOVI = qiymat;
      const res = await soraw('/tovarlar?turkum=123');
      expect(res.statusCode, qiymat).not.toBe(402);
    }
  });

  it('cheklov yoqilganda tokensiz soʻrov 402 va SABABI bilan qaytadi', async () => {
    process.env.TARIF_CHEKLOVI = '1';
    const res = await soraw('/tovarlar?turkum=123');
    expect(res.statusCode).toBe(402);
    const j = res.json();
    expect(j.cheklov).toBe('tarif');
    expect(j.reja).toBe('bepul');
    expect(j.qadam).toBe(3);
    // Nima ochishini AYTIB qoʻyish shart: odam nimani
    // yoʻqotayotganini bilsin.
    expect(j.ochadigan_rejalar).toContain('pro');
    expect(j.hozir_ochiq_qadam).toBe(2);
  });

  it('cheklov yoqilgan boʻlsa ham 2-qadam yopilmaydi', async () => {
    process.env.TARIF_CHEKLOVI = '1';
    const app = build();
    const res = await app.inject({ method: 'POST', url: '/yonalishlar', payload: {} });
    await app.close();
    expect(res.statusCode).not.toBe(402);
  });
});

describe('/tarif', () => {
  it('tokensiz — bepul, va bu xato emas', async () => {
    const res = await soraw('/tarif');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ reja: 'bepul', sabab: 'obuna-yoq' });
  });

  it('cheklov oʻchiqda hamma qadam ochiq koʻrinadi — panel haqiqatni koʻrsatadi', async () => {
    const j = (await soraw('/tarif')).json();
    expect(j.cheklov_yoqilgan).toBe(false);
    expect(j.qadamlar.every((q: { ochiq: boolean }) => q.ochiq)).toBe(true);
    // Qoida esa oʻzgarmaydi: rejada 3-qadam baribir yopiq.
    expect(j.qadamlar.find((q: { qadam: number }) => q.qadam === 3).rejada_ochiq).toBe(false);
  });

  it('cheklov yoqilganda 3-qadam yopiq koʻrinadi', async () => {
    process.env.TARIF_CHEKLOVI = '1';
    const j = (await soraw('/tarif')).json();
    expect(j.qadamlar.find((q: { qadam: number }) => q.qadam === 3).ochiq).toBe(false);
    expect(j.qadamlar.find((q: { qadam: number }) => q.qadam === 2).ochiq).toBe(true);
  });
});

describe('/kpi', () => {
  it('baza ulanmagan boʻlsa ham jadval TOʻLIQ qaytadi', async () => {
    const res = await soraw('/kpi');
    expect(res.statusCode).toBe(200);
    const j = res.json();
    expect(j.kpi).toHaveLength(Object.keys(KPI_MAQSAD).length);
  });

  /*
   * Qator yoʻqolib ketsa panel "hammasi joyida" boʻlib
   * koʻrinardi. Shuning uchun oʻlchanmagan KPI ham jadvalda
   * turadi — faqat `qiymat: null` va sababi bilan.
   */
  it('oʻlchanmagan qator jadvaldan tushib qolmaydi, sababi bilan turadi', async () => {
    const j = (await soraw('/kpi')).json();
    for (const k of j.kpi) {
      if (k.qiymat === null) expect(k.sabab, k.kalit).toBeTruthy();
    }
    expect(j.xulosa.olchandi).toBe(0);
    expect(j.xulosa.jami).toBe(j.kpi.length);
  });

  it('hech bir oʻlchanmagan KPI nol koʻrsatmaydi', async () => {
    const j = (await soraw('/kpi')).json();
    const nolli = j.kpi.filter((k: { qiymat: number | null; sabab: string | null }) =>
      k.qiymat === 0 && k.sabab !== null);
    expect(nolli).toHaveLength(0);
  });
});
