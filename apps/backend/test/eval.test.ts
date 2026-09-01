import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  mavsumiy, monopoliya, nakrutka, ogir, sertifikat, yopiqBrend,
} from '@selleros/shared';
import type {
  KirishTalablari, MavsumKirishi, NakrutkaKirishi,
  OgirKirishi, TovarHolati, TurkumHolati,
} from '@selleros/shared';

/**
 * EVAL — QOIDALAR.md, 5-boʻlim: "Merge sharti — CI yashil: lint +
 * testlar + tuzoq 100% + eval ≥90%".
 *
 * Tuzoq testidan farqi. Tuzoq testi HAR QATORNI alohida tekshiradi va
 * bittasi ham xato boʻlmasligi kerak. Eval esa filtrni **umumiy
 * aniqlik** boʻyicha oʻlchaydi va foizni chiqaradi. Ikkalasi kerak:
 * tuzoq testi regressiyani ushlaydi, eval sifat pasayishini koʻrsatadi.
 *
 * Eval boʻsh oʻtmasligi uchun uchta shart bor: roʻyxat kamida shuncha
 * qatordan iborat, ikkala sinf ham vakil boʻlishi, va aniqlik
 * chegaradan yuqori.
 */

const MIN_ANIQLIK = 90;
const MIN_QATOR = 20;

interface TovarQator { expect: string | null; kirish: TovarHolati; note: string }
interface TurkumQator { expect: string | null; kirish: TurkumHolati; note: string }
interface NakrutkaQator { expect: string | null; kirish: NakrutkaKirishi; note: string }
interface MavsumQator { expect: string | null; kirish: MavsumKirishi; note: string }
interface OgirQator { expect: string | null; kirish: OgirKirishi; note: string }
interface SertifikatQator { expect: string | null; kirish: KirishTalablari; note: string }

const oqi = <T>(fayl: string): { elementlar: T[] } =>
  JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', fayl), 'utf8'));

/** Filtr javobini roʻyxatdagi belgi bilan bir shaklga keltiradi. */
function belgi(r: { kind: string } | null): string | null {
  if (r === null) return null;
  return r.kind === 'baholanmadi' ? 'baholanmadi' : r.kind;
}

function baho<T>(qatorlar: { expect: string | null; kirish: T }[],
                 filtr: (k: T) => { kind: string } | null) {
  let togri = 0;
  const xatolar: string[] = [];
  for (const q of qatorlar) {
    const olindi = belgi(filtr(q.kirish));
    if (olindi === q.expect) togri += 1;
    else xatolar.push(`kutilgan ${q.expect}, olindi ${olindi}`);
  }
  return { aniqlik: (100 * togri) / qatorlar.length, togri, jami: qatorlar.length, xatolar };
}

describe('eval — filtrlarning umumiy aniqligi', () => {
  const tovar = oqi<TovarQator>('traps.json').elementlar;
  const turkum = oqi<TurkumQator>('monopoliya.json').elementlar;
  const nakrutkaQ = oqi<NakrutkaQator>('nakrutka.json').elementlar;
  const mavsumQ = oqi<MavsumQator>('mavsumiy.json').elementlar;
  const ogirQ = oqi<OgirQator>('ogir.json').elementlar;
  const sertQ = oqi<SertifikatQator>('sertifikat.json').elementlar;

  it(`roʻyxatlar yetarli katta (≥${MIN_QATOR})`, () => {
    expect(tovar.length).toBeGreaterThanOrEqual(MIN_QATOR);
    expect(turkum.length).toBeGreaterThanOrEqual(MIN_QATOR);
    expect(nakrutkaQ.length).toBeGreaterThanOrEqual(MIN_QATOR);
    expect(mavsumQ.length).toBeGreaterThanOrEqual(MIN_QATOR);
    expect(ogirQ.length).toBeGreaterThanOrEqual(MIN_QATOR);
    expect(sertQ.length).toBeGreaterThanOrEqual(MIN_QATOR);
  });

  it('ikkala sinf ham vakil boʻlgan', () => {
    for (const [nom, qatorlar] of [['tovar', tovar], ['turkum', turkum],
        ['nakrutka', nakrutkaQ], ['mavsum', mavsumQ]] as const) {
      const musbat = qatorlar.filter((q) => q.expect !== null && q.expect !== 'baholanmadi');
      const manfiy = qatorlar.filter((q) => q.expect === null);
      expect(musbat.length, `${nom}: musbat misol yoʻq`).toBeGreaterThan(0);
      expect(manfiy.length, `${nom}: manfiy misol yoʻq`).toBeGreaterThan(0);
    }
    for (const [nom, qatorlar] of [['ogir', ogirQ], ['sertifikat', sertQ]] as const) {
      const musbat = qatorlar.filter((q) => q.expect !== null && q.expect !== 'baholanmadi');
      const baholanmadi = qatorlar.filter((q) => q.expect === 'baholanmadi');
      expect(musbat.length, `${nom}: musbat misol yoʻq`).toBeGreaterThan(0);
      expect(baholanmadi.length, `${nom}: baholanmadi misol yoʻq`).toBeGreaterThan(0);
    }
  });

  it(`1-tuzoq aniqligi ≥ ${MIN_ANIQLIK}%`, () => {
    const n = baho(tovar, yopiqBrend);
    expect(n.aniqlik, `${n.togri}/${n.jami}. Xatolar: ${n.xatolar.join('; ')}`)
      .toBeGreaterThanOrEqual(MIN_ANIQLIK);
  });

  it(`4-tuzoq aniqligi ≥ ${MIN_ANIQLIK}%`, () => {
    const n = baho(nakrutkaQ, nakrutka);
    expect(n.aniqlik, `${n.togri}/${n.jami}. Xatolar: ${n.xatolar.join('; ')}`)
      .toBeGreaterThanOrEqual(MIN_ANIQLIK);
  });

  it(`2-tuzoq aniqligi ≥ ${MIN_ANIQLIK}%`, () => {
    const n = baho(mavsumQ, mavsumiy);
    expect(n.aniqlik, `${n.togri}/${n.jami}. Xatolar: ${n.xatolar.join('; ')}`)
      .toBeGreaterThanOrEqual(MIN_ANIQLIK);
  });

  it(`5-tuzoq aniqligi ≥ ${MIN_ANIQLIK}%`, () => {
    const n = baho(sertQ, sertifikat);
    expect(n.aniqlik, `${n.togri}/${n.jami}. Xatolar: ${n.xatolar.join('; ')}`)
      .toBeGreaterThanOrEqual(MIN_ANIQLIK);
  });

  it(`6-tuzoq aniqligi ≥ ${MIN_ANIQLIK}%`, () => {
    const n = baho(turkum, monopoliya);
    expect(n.aniqlik, `${n.togri}/${n.jami}. Xatolar: ${n.xatolar.join('; ')}`)
      .toBeGreaterThanOrEqual(MIN_ANIQLIK);
  });

  it(`7-tuzoq aniqligi ≥ ${MIN_ANIQLIK}%`, () => {
    const n = baho(ogirQ, ogir);
    expect(n.aniqlik, `${n.togri}/${n.jami}. Xatolar: ${n.xatolar.join('; ')}`)
      .toBeGreaterThanOrEqual(MIN_ANIQLIK);
  });

  it('umumiy aniqlik chiqariladi', () => {
    const natijalar = [
      baho(tovar, yopiqBrend),
      baho(nakrutkaQ, nakrutka),
      baho(mavsumQ, mavsumiy),
      baho(sertQ, sertifikat),
      baho(turkum, monopoliya),
      baho(ogirQ, ogir),
    ];
    const togri = natijalar.reduce((s, n) => s + n.togri, 0);
    const jami = natijalar.reduce((s, n) => s + n.jami, 0);
    const umumiy = (100 * togri) / jami;
    expect(umumiy, `umumiy aniqlik ${umumiy.toFixed(1)}% (${togri}/${jami})`)
      .toBeGreaterThanOrEqual(MIN_ANIQLIK);
  });
});
