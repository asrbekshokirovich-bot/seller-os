/**
 * Bozor paneli (`src/bozor-paneli.ts`) — kengaytmaning B qismi.
 *
 * FIKSTURA HAQIQIY (QOIDALAR.md, 8-boʻlim). `fixtures/bozor-shimlar.json` —
 * «Shimlar» turkumi (13700) 2026-10-25 holatiga: qatorlar zumsavdo
 * `ingest/xulosa.mjs --quruq --idlar` bilan VPS da yasalgan (bazadagi
 * `zumsavdo.tovar_30kun` qatorlarining aynan oʻzi, `so_bozor_qatorlar` kabi
 * `narx` massivisiz), doʻkon nomlari va «yangi» chegarasi — bazadan.
 * Kutilgan qiymatlar shu oʻlchovdan koʻchirilgan, qoʻlda tanlanmagan.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BOZOR_KAM_TOVAR, BOZOR_MAX_QATOR, OYNA_KUN, RAQOBAT, ZINA_KAM_TOVAR,
  bozorKirishiniOqi, bozorPaneli, narxZinasi, sotuvBahosi, turkumniOqi, zinaChegaralari,
  type BozorKirishi, type Tovar30Kun,
} from '../src/index.js';

const xom = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/bozor-shimlar.json'), 'utf8')) as unknown;
const kirish = bozorKirishiniOqi(xom)!;
const panel = bozorPaneli(kirish);

/** Sintetik qator: 30 kunning hammasida oʻlchangan, har kuni `kunlik` dona kamaygan. */
function qator(id: number, o: { dokon?: number | null; narx?: number | null; kunlik?: number; belgi?: number | null } = {}): Tovar30Kun {
  const kunlik = o.kunlik ?? 1;
  return {
    product_id: id, sana: '2026-10-25', olchangan_kun: OYNA_KUN, qoldiq_oxirgi: 100, tugagan_kun: 0, tugaganiga: 0,
    narx_oxirgi: o.narx === undefined ? 100_000 : o.narx, narx_min: null, narx_max: null,
    sotildi: Array.from({ length: OYNA_KUN }, () => kunlik), olchangan_mask: 2 ** OYNA_KUN - 1, tugagan_mask: 0, qoldiqdan_mask: 0,
    narx: null, belgi: o.belgi ?? null, belgi_max: o.belgi ?? null, sharh_bosh: 0, sharh: 3, chegirma: null,
    kategoriya: 1, dokon: o.dokon === undefined ? id : o.dokon, nom: `Tovar ${id}`,
  };
}
const sintetik = (qatorlar: Tovar30Kun[], q: Partial<BozorKirishi> = {}): BozorKirishi => ({
  kategoriya: 1, nom: 'Sinov', qatorlar, dokonlar: new Map(), yangiChegara: null, kesildi: false, ...q,
});

describe('fikstura va oʻqish', () => {
  it('RPC javobi oʻqiladi: turkum, 194 qator, doʻkon nomlari, «yangi» chegarasi', () => {
    expect(kirish.kategoriya).toBe(13700);
    expect(kirish.nom).toBe('Shimlar');
    expect(kirish.qatorlar).toHaveLength(194);
    expect(kirish.dokonlar.get(105801)).toBe('umar.kids');
    expect(kirish.yangiChegara).toEqual({ sana: '2026-08-26', id: 3257612 });
    expect(kirish.kesildi).toBe(false);
  });

  it('buzuq javob — null; turkum raqami — musbat butun son', () => {
    expect(bozorKirishiniOqi(null)).toBeNull();
    expect(bozorKirishiniOqi([])).toBeNull();
    expect(bozorKirishiniOqi({ kategoriya: 'x' })).toBeNull();
    expect(bozorKirishiniOqi({ kategoriya: 5 })).toMatchObject({ kategoriya: 5, qatorlar: [], yangiChegara: null });
    expect(turkumniOqi(11931)).toBe(11931);
    expect(turkumniOqi(' 11931 ')).toBe(11931);
    for (const x of [0, -1, 1.5, '12a', '', null, undefined, 1e11]) expect(turkumniOqi(x)).toBeNull();
  });
});

describe('bozorPaneli — jonli «Shimlar» (2026-10-25)', () => {
  it('talab — belgilardagi oʻsha formula yigʻindisi (ziddiyat va raqamsiz tovar kirmaydi)', () => {
    let jami = 0, raqamli = 0, raqamsiz = 0, ziddiyat = 0;
    for (const t of kirish.qatorlar) {
      const b = sotuvBahosi(t, t.product_id);
      if (b.oyiga === null) raqamsiz += 1;
      else if (b.holat === 'ziddiyat') ziddiyat += 1;
      else { raqamli += 1; jami += b.oyiga; }
    }
    expect(panel.talab).toMatchObject({ oyiga: jami, raqamli, raqamsiz, ziddiyat });
    expect(panel.talab).toMatchObject({ oyiga: 5689, raqamli: 174, raqamsiz: 9, ziddiyat: 11 });
    expect(panel.talab.aylanma).toBe(745_595_910);
  });

  it('taklif, sotilgan ulushi, oyna', () => {
    expect(panel.taklif).toEqual({ tovar: 194, dokon: 134 });
    expect(panel.sotilgan.soni).toBe(111);
    expect(panel.sotilgan.ulush).toBeCloseTo((111 * 100) / 174, 6);
    expect(panel.sana).toBe('2026-10-25');
    expect(panel.oyna).toEqual({ dan: '2026-09-26', gacha: '2026-10-25' });
  });

  it('raqobat: eng katta 3 doʻkon ~46 % → «oʻrta», nomlari bilan', () => {
    expect(panel.raqobat.daraja).toBe('orta');
    expect(panel.raqobat.top3).toBeCloseTo(45.6, 1);
    expect(panel.raqobat.sotganDokon).toBe(82);
    expect(panel.raqobat.dokonlar.map((d) => [d.nom, d.oyiga])).toEqual([['umar.kids', 916], ['Samina_Xan', 870], ['PLAYOWO', 808]]);
  });

  it('narx zinapoyasi: yumaloq chegaralar, taklif ham talab ham pogʻonada oʻzgaradi', () => {
    expect(panel.zina.map((z) => [z.yorliq, z.tovar, z.talab, z.sotilgan])).toEqual([
      ['< 60 ming', 33, 477, 23],
      ['60–80 ming', 20, 262, 15],
      ['80–150 ming', 55, 2993, 38],
      ['150–200 ming', 32, 1679, 18],
      ['≥ 200 ming', 34, 278, 17],
    ]);
    expect(panel.zina.filter((z) => z.eng).map((z) => z.yorliq)).toEqual(['80–150 ming']);
    // Hamma raqamli tovarning narxi bor — pogʻonalar talabni toʻliq boʻladi.
    expect(panel.zina.reduce((s, z) => s + z.tovar, 0)).toBe(panel.talab.raqamli);
    expect(panel.zina.reduce((s, z) => s + z.talab, 0)).toBe(panel.talab.oyiga);
  });

  it('yangi tovarlar (26-avgustdan keyin) va tugaganlar', () => {
    expect(panel.yangi).toMatchObject({ dan: '2026-08-26', soni: 84, yaxshi: 29 });
    expect(panel.yangi!.talabUlush).toBeCloseTo(58.4, 1);
    expect(panel.tugagan).toEqual({ soni: 20, yaxshiSotilgan: 1 });
  });

  it('eng koʻp sotilayotgan 5 tovar — ishonchi past emas, kamayish tartibida', () => {
    expect(panel.top.map((t) => [t.productId, t.oyiga])).toEqual([[3422310, 870], [677162, 715], [3190442, 674], [3332867, 493], [3324930, 216]]);
    expect(panel.top[0]!.nom).toMatch(/^Qizlar uchun klyosh shimlar/);
    expect(panel.top.every((t) => t.ishonch !== 'past')).toBe(true);
  });

  it('xulosa — kod yozadi, faqat fakt', () => {
    expect(panel.xulosa).toEqual([
      'Talab eng katta — 80–150 ming soʻmlik tovarlarda: oyiga ≈ 2 993 dona (53 %). Tovar ham u yerda eng koʻp — 55 ta.',
      'Eng katta 3 doʻkon talabning 46 foizini oladi.',
      '26-avgustdan keyin qoʻyilgan 84 tovardan 29 tasi oyiga 10 donadan koʻp sotilyapti.',
      'Yaxshi sotilgan 1 ta tovar oxirgi kunlarda tugab qolgan.',
    ]);
    expect(panel.versiya).toBe('bozor-paneli-v1');
    expect(panel.tovarSotuviVersiyasi).toBe('tovar-sotuvi-v1');
  });
});

describe('narx zinapoyasi — chegaralar', () => {
  it('tovar kam yoki narx bir xil — zinapoya yoʻq', () => {
    expect(zinaChegaralari(Array.from({ length: 2 * ZINA_KAM_TOVAR - 1 }, (_, i) => 10_000 * (i + 1)))).toEqual([]);
    expect(zinaChegaralari(Array.from({ length: 100 }, () => 49_000))).toEqual([]);
    expect(narxZinasi([{ narx: 10_000, oyiga: 5 }])).toEqual([]);
  });

  it('chegaralar yumaloq, oʻsuvchi, har pogʻonada narx bor; tovar kam boʻlsa pogʻona kam', () => {
    const narxlar = Array.from({ length: 200 }, (_, i) => 20_000 + i * 2_500);
    const c = zinaChegaralari(narxlar);
    expect(c.length).toBe(4);
    for (let i = 0; i < c.length; i++) {
      expect(c[i]! / 10 ** Math.floor(Math.log10(c[i]!))).toSatisfy((m: number) => [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8].includes(m));
      if (i > 0) expect(c[i]!).toBeGreaterThan(c[i - 1]!);
    }
    const chegara = [-Infinity, ...c, Infinity];
    for (let i = 0; i + 1 < chegara.length; i++) {
      expect(narxlar.some((n) => n >= chegara[i]! && n < chegara[i + 1]!)).toBe(true);
    }
    expect(zinaChegaralari(narxlar.slice(0, 30)).length).toBeLessThanOrEqual(2); // 30 tovar — koʻpi bilan 3 pogʻona
  });

  it('«1 tovarga eng koʻp» — bitta, kamida ZINA_KAM_TOVAR tovarli pogʻonada', () => {
    const t = [
      ...Array.from({ length: 3 }, () => ({ narx: 5_000, oyiga: 900 })),
      ...Array.from({ length: 60 }, (_, i) => ({ narx: 50_000 + i * 1_000, oyiga: 20 })),
      ...Array.from({ length: 40 }, (_, i) => ({ narx: 200_000 + i * 5_000, oyiga: 40 })),
    ];
    const z = narxZinasi(t);
    expect(z.filter((p) => p.eng)).toHaveLength(1);
    expect(z.find((p) => p.eng)!.tovar).toBeGreaterThanOrEqual(ZINA_KAM_TOVAR);
  });
});

describe('bozorPaneli — qoidalar (sintetik)', () => {
  it('maʼlumot kam — bitta ogohlantirish, boshqa xulosa yoʻq', () => {
    const p = bozorPaneli(sintetik(Array.from({ length: BOZOR_KAM_TOVAR - 1 }, (_, i) => qator(i + 1))));
    expect(p.talab.raqamli).toBe(BOZOR_KAM_TOVAR - 1);
    expect(p.xulosa).toEqual([`Bu turkumda sotuvi oʻlchangan tovar kam (${BOZOR_KAM_TOVAR - 1} ta) — raqamlar tasodifiy boʻlishi mumkin.`]);
    expect(bozorPaneli(sintetik([])).xulosa[0]).toMatch(/hali yoʻq/);
  });

  it('raqobat darajasi: ochiq / qattiq / sotuv 3 doʻkonda', () => {
    // 20 doʻkon, sotuv teng — top-3 = 15 % < ochiq.
    const ochiq = bozorPaneli(sintetik(Array.from({ length: 20 }, (_, i) => qator(i + 1))));
    expect(ochiq.raqobat.top3).toBeCloseTo(15, 6);
    expect(ochiq.raqobat.top3!).toBeLessThan(RAQOBAT.ochiq);
    expect(ochiq.raqobat.daraja).toBe('ochiq');
    expect(ochiq.xulosa).toContain('Bozor bitta doʻkon qoʻlida emas: eng katta 3 doʻkon ulushi 15 foiz.');
    // 3 doʻkon oyiga 720, qolgan 12 tasi 360 — top-3 = 67 % ≥ qattiq.
    const katta = [qator(1, { kunlik: 8 }), qator(2, { kunlik: 8 }), qator(3, { kunlik: 8 })];
    const qattiq = bozorPaneli(sintetik([...katta, ...Array.from({ length: 12 }, (_, i) => qator(10 + i))]));
    expect(qattiq.raqobat.top3).toBeCloseTo((720 * 100) / 1080, 6);
    expect(qattiq.raqobat.daraja).toBe('qattiq');
    expect(qattiq.xulosa.some((x) => /raqobat qilish qiyin/.test(x))).toBe(true);
    // Hamma tovar 3 doʻkonniki.
    const uch = bozorPaneli(sintetik(Array.from({ length: 12 }, (_, i) => qator(i + 1, { dokon: (i % 3) + 1 }))));
    expect(uch.xulosa).toContain('Sotuv faqat 3 ta doʻkonda — bozor ular qoʻlida.');
  });

  it('«yangi» chegarasi juda eski boʻlsa (oʻlchov toʻxtagan) — koʻrsatilmaydi', () => {
    const qatorlar = Array.from({ length: 12 }, (_, i) => qator(100 + i));
    expect(bozorPaneli(sintetik(qatorlar, { yangiChegara: { sana: '2026-08-26', id: 105 } })).yangi).toMatchObject({ soni: 6 });
    expect(bozorPaneli(sintetik(qatorlar, { yangiChegara: { sana: '2026-07-01', id: 105 } })).yangi).toBeNull();
  });

  it('kesilgan turkum — xulosada ochiq aytiladi', () => {
    const p = bozorPaneli(sintetik(Array.from({ length: 12 }, (_, i) => qator(i + 1)), { kesildi: true }));
    expect(p.kesildi).toBe(true);
    expect(BOZOR_MAX_QATOR).toBe(20_000);
    expect(p.xulosa[p.xulosa.length - 1]).toBe('Turkum juda katta — 20 000 ta tovar hisoblandi, qolgani kirmadi.');
  });
});
