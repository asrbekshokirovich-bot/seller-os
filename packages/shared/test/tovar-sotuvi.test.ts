/**
 * Tovar sotuvi (`src/tovar-sotuvi.ts`) — kengaytmaning A/C/D qismlari uchun formula.
 *
 * FIKSTURA HAQIQIY (QOIDALAR.md, 8-boʻlim: darvoza testi bazadagi oʻlchov bilan).
 * `fixtures/tovar-30kun-qatorlar.json` — zumsavdo `ingest/xulosa.mjs --quruq --idlar`
 * bilan VPS da yasalgan qatorlar (2026-10-21), yaʼni `zumsavdo.tovar_30kun` ga
 * boradigan qatorlarning aynan oʻzi. Raqamlar shu kunning oʻlchovi: kutilgan
 * qiymatlar qoʻlda «chiroyli» qilib tanlanmagan — jadvaldan koʻchirilgan.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BELGI_MAX, KUNLIK_CHEGARA, OYNA_KUN, idlarniOqi, kartochkaBelgilari, kartochkaBelgisi, kengaytmaQismiOchiq, oynaKuni, sotuvBahosi, taqqosJadvali, tovar30KunOqi,
  tovarPasporti, zararsizlikChegarasi, type Tovar30Kun,
} from '../src/index.js';

const fikstura = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/tovar-30kun-qatorlar.json'), 'utf8')) as {
  sana: string; qatorlar: unknown[];
};
const qatorlar = tovar30KunOqi(fikstura.qatorlar);
const qator = (id: number): Tovar30Kun => {
  const t = qatorlar.find((q) => q.product_id === id);
  if (!t) throw new Error(`fiksturada ${id} yoʻq`);
  return t;
};
const baho = (id: number) => sotuvBahosi(qator(id), id);

describe('fikstura', () => {
  it('haqiqiy qatorlar oʻqiladi: oyna 30 kun, faollarida massiv bor', () => {
    expect(fikstura.sana).toBe('2026-10-20');
    expect(qatorlar.length).toBe(fikstura.qatorlar.length);
    expect(qatorlar.length).toBeGreaterThan(70);
    const faol = qatorlar.filter((q) => q.sotildi !== null);
    expect(faol.length).toBeGreaterThan(60);
    for (const q of faol) expect(q.sotildi).toHaveLength(OYNA_KUN);
  });
});

describe('sotuvBahosi — jonli Termoslar misollari', () => {
  it('haqiqiy sotuvchi (1978350): 26 kunda 373 dona, kesilgan yoʻq → oyiga 430, ishonch yuqori', () => {
    const b = baho(1978350);
    expect(b.holat).toBe('sotilyapti');
    expect(b.malumKun).toBe(26);
    expect(b.xom).toBe(373);
    expect(b.kesildi).toBe(0);
    expect(b.oyiga).toBe(430);
    expect(b.ishonch).toBe('yuqori');
    expect(b.oyna).toEqual({ dan: '2026-09-21', gacha: '2026-10-20' });
    expect(kartochkaBelgisi(b)).toMatchObject({ rang: 'yashil', matn: '≈ 430 dona/oy', izoh: '26 kun oʻlchandi · ishonch yuqori' });
  });

  it('haqiqiy sotuvchi + bir kunlik tuzatish (3302715): 1 098 dan 838 tasi sanalmaydi, qolgani belgi va +45 sharh bilan mos', () => {
    const b = baho(3302715);
    expect(b.xom).toBe(1098);
    expect(b.kesildi).toBe(838);
    expect(b.oyiga).toBe(300);
    expect(b.holat).toBe('sotilyapti');
    expect(b.ishonch).toBe('yuqori');
    expect(b.sabablar[0]).toMatch(/keskin kamaygan/);
  });

  it('«Termos KINSDA» (2996358): 713 dona kamaygan, belgi haftasiga 1, sharh 0 → «Sotuv aniq emas»', () => {
    const b = baho(2996358);
    expect(b.xom).toBe(713);
    expect(b.oyiga).toBe(0);
    expect(b.holat).toBe('ziddiyat');
    expect(b.ishonch).toBe('past');
    const k = kartochkaBelgisi(b);
    expect(k).toMatchObject({ rang: 'sariq', matn: 'Sotuv aniq emas' });
    expect(k.izoh).toMatch(/713 taga keskin kamaygan/);
  });

  it('zaxira oʻchib-yongan (1580691: 666 → 0 → 666) — chegaragacha qismi ham sotuv deb sanalmaydi', () => {
    const b = baho(1580691);
    expect(b.kunlikChegara).toBe(KUNLIK_CHEGARA.mutlaq);
    expect(b.xom).toBe(666);
    // Chegarani (10) sanasak «oyiga ~14 dona» chiqardi — sotilmayotgan tovar sotilayotgandek.
    expect(b.oyiga).toBe(0);
    expect(b.holat).toBe('ziddiyat');
  });

  it('tugagan tovar, eskirgan belgi (1321486: 26 kun qoldiq 0, belgi 1 397)', () => {
    const b = baho(1321486);
    expect(b.holat).toBe('tugagan');
    expect(b.tugaganiga).toBe(26);
    expect(kartochkaBelgisi(b)).toMatchObject({ rang: 'kulrang', matn: 'Tugagan', izoh: '26 kundan beri qoldiq 0 · Uzum belgisi eskirgan' });
    expect(b.sabablar.join(' ')).toMatch(/1 397 kishi shu hafta sotib oldi.*eskirgan/);
  });

  it('juda kam oʻlchangan (3286701: 3 kun) — raqam yoʻq, chiziqcha', () => {
    const b = baho(3286701);
    expect(b.holat).toBe('kam');
    expect(b.oyiga).toBeNull();
    expect(b.ishonch).toBeNull();
    expect(kartochkaBelgisi(b)).toMatchObject({ rang: 'yoq', matn: '—', izoh: 'hali 3 kun oʻlchandi' });
  });

  it('katta tuzatishdan keyin kichik sotuv qolgan (3038118: 657 dan 650 tasi kesildi) → oyiga 8', () => {
    const b = baho(3038118);
    expect(b.kesildi).toBe(650);
    expect(b.oyiga).toBe(8);
    expect(b.holat).toBe('sekin');
  });
});

describe('sotuvBahosi — boshqa turkumlar', () => {
  it('sharh tez oʻssa katta kun ham sanaladi (1334924, BB krem: +214 sharh) — kesilmaydi', () => {
    const b = baho(1334924);
    expect(b.sharhOsish).toBe(214);
    expect(b.kunlikChegara).toBe(Math.ceil((KUNLIK_CHEGARA.sharhKoef * 214) / qator(1334924).olchangan_kun));
    expect(b.kesildi).toBe(0);
    expect(b.oyiga).toBe(504);
    expect(b.ishonch).toBe('yuqori');
  });

  it('belgi koʻp xaridor deydi, qoldiq kamaymaydi (740623: haftasiga 73) → «Sotuv aniq emas»', () => {
    const b = baho(740623);
    expect(b.belgiOylik).toBe(313);
    expect(b.holat).toBe('ziddiyat');
    expect(kartochkaBelgisi(b).izoh).toMatch(/qoldiq esa deyarli kamaymaydi/);
  });

  it('kichik belgi va sotuv yoʻq (12125: haftasiga 8) — ziddiyat emas, «Sotuv koʻrinmadi» + Uzum belgisi yonida', () => {
    const b = baho(12125);
    expect(b.holat).toBe('sotilmadi');
    expect(kartochkaBelgisi(b)).toMatchObject({ rang: 'kulrang', matn: 'Sotuv koʻrinmadi', izoh: '21 kunda qoldiq kamaymadi · Uzum belgisi: haftasiga 8' });
  });

  it('bazada qatori yoʻq — oʻlchanmagan (nol emas)', () => {
    const b = sotuvBahosi(null, 999);
    expect(b.holat).toBe('olchanmagan');
    expect(b.oyiga).toBeNull();
    expect(kartochkaBelgisi(b)).toEqual({ productId: 999, rang: 'yoq', matn: '—', qisqa: '—', izoh: 'oʻlchanmagan' });
  });
});

describe('tovar30KunOqi', () => {
  it('buzuq qator tashlanadi; uzunligi 30 boʻlmagan massiv — null; matn sonlar oʻqiladi', () => {
    const r = tovar30KunOqi([
      { product_id: '5', sana: '2026-10-20', olchangan_kun: '3', sotildi: [1, 2], tugaganiga: 0 },
      { sana: '2026-10-20' },
      null,
      { product_id: 6, sana: 'kecha' },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]!.product_id).toBe(5);
    expect(r[0]!.olchangan_kun).toBe(3);
    expect(r[0]!.sotildi).toBeNull();
  });

  it('oyna kunlari: 0 — eng eski, 29 — sana', () => {
    expect(oynaKuni('2026-10-20', 0)).toBe('2026-09-21');
    expect(oynaKuni('2026-10-20', 29)).toBe('2026-10-20');
  });
});

describe('zararsizlikChegarasi', () => {
  it('38 990 − 25 % − 1 % − logistika 5 250 = 23 602', () => {
    const c = zararsizlikChegarasi(38_990, 25, 1);
    expect(c.som).toBe(23_602);
    expect(c.yetishmaydi).toEqual([]);
    expect(c.hisob).toContain('logistika kamida 5 250');
  });
  it('komissiya yoʻq — hisob yoʻq; soliq yoʻq — hisob bor, lekin yetishmaydi', () => {
    expect(zararsizlikChegarasi(38_990, null, 1)).toMatchObject({ som: null, yetishmaydi: ['komissiya'] });
    expect(zararsizlikChegarasi(38_990, 25, null)).toMatchObject({ som: 23_992, yetishmaydi: ['soliq'] });
  });
});

describe('tovarPasporti', () => {
  it('1978350: uch belgi tekshiruvi, narx oraligʻi, komissiya va chegara', () => {
    const p = tovarPasporti({ ...qator(1978350), komissiya_foizi: 25 }, 1978350, { soliqFoizi: 1 });
    expect(p.belgi.matn).toBe('≈ 430 dona/oy');
    expect(p.tekshiruv.map((x) => x.mos)).toEqual([true, true, true]);
    expect(p.tekshiruv[2]!.matn).toBe('30 kunda +57');
    expect(p.chegara.som).toBe(23_602);
    const narx = p.faktlar.find((f) => f.nom === 'Narx, 30 kun')!;
    expect(narx.qiymat).toBe('35 990 – 39 990 soʻm');
    expect(p.baho.kunlar).toHaveLength(OYNA_KUN);
    expect(p.baho.kunlar.filter((k) => k.sanaldi === null)).toHaveLength(OYNA_KUN - 26);
  });
});

describe('taqqosJadvali', () => {
  const opts = { soliqFoizi: 1 };
  const t = (id: number) => ({ productId: id, t: { ...qator(id), komissiya_foizi: 25 } });

  it('eng yaxshisi har qatorda; xulosa koddan', () => {
    const j = taqqosJadvali([t(1978350), t(3302715), t(1988172)], opts);
    expect(j.ustunlar.map((u) => u.productId)).toEqual([1978350, 3302715, 1988172]);
    const qator_ = (k: string) => j.qatorlar.find((q) => q.kalit === k)!;
    expect(qator_('sotuv').eng).toBe(0);
    expect(qator_('chegara').eng).toBe(2);
    expect(j.xulosa[0]).toBe('Eng koʻp sotiladigani — 1-tovar.');
    expect(j.xulosa[1]).toMatch(/3-tovar, lekin u kamroq sotiladi/);
  });

  it('ishonchsiz raqam solishtirishga kirmaydi va bu ochiq aytiladi', () => {
    const j = taqqosJadvali([t(1978350), t(2996358)], opts);
    const sotuv = j.qatorlar.find((q) => q.kalit === 'sotuv')!;
    expect(sotuv.eng).toBeNull();
    expect(j.xulosa.join(' ')).toMatch(/2-tovar: sotuv raqami ishonchsiz/);
  });

  it('5 tadan koʻp berilsa — birinchi beshtasi', () => {
    const ids = qatorlar.slice(0, 7).map((q) => q.product_id);
    expect(taqqosJadvali(ids.map((id) => ({ productId: id, t: qator(id) })), opts).ustunlar).toHaveLength(5);
  });
});

describe('soʻrov yordamchilari', () => {
  it('idlarniOqi: massiv yoki matn, takrorsiz, chegarada; buzuq — null (jimgina kesilmaydi)', () => {
    expect(idlarniOqi([3, '5', 3], 10)).toEqual([3, 5]);
    expect(idlarniOqi('1978350, 3302715', 10)).toEqual([1978350, 3302715]);
    expect(idlarniOqi([], 10)).toBeNull();
    expect(idlarniOqi([1, 2, 3], 2)).toBeNull();
    expect(idlarniOqi([1, -2], 10)).toBeNull();
    expect(idlarniOqi(['1e3'], 10)).toBeNull();
    expect(idlarniOqi({ ids: [1] }, 10)).toBeNull();
    expect(BELGI_MAX).toBe(100);
  });

  it('kartochkaBelgilari: soʻrov tartibida, bazada yoʻq id — oʻlchanmagan; sana — maʼlumot kuni', () => {
    const r = kartochkaBelgilari([3302715, 42, 1978350], [qator(1978350), qator(3302715)]);
    expect(r.sana).toBe('2026-10-20');
    expect(r.belgilar.map((b) => b.productId)).toEqual([3302715, 42, 1978350]);
    expect(r.belgilar[1]).toEqual({ productId: 42, rang: 'yoq', matn: '—', qisqa: '—', izoh: 'oʻlchanmagan', kategoriya: null, kategoriyaNomi: null });
    // Turkum — qidiruv sahifasidagi bozor paneli uchun (2-bosqich).
    expect(r.belgilar[0]!.kategoriya).toBe(qator(3302715).kategoriya);
    expect(r.belgilar[0]!.kategoriya).not.toBeNull();
    expect(kartochkaBelgilari([1], []).sana).toBeNull();
  });

  it('obuna qoidasi: belgi bepul, pasport va taqqoslash — obunada', () => {
    expect(kengaytmaQismiOchiq('bepul', 'belgi')).toBe(true);
    expect(kengaytmaQismiOchiq('bepul', 'pasport')).toBe(false);
    expect(kengaytmaQismiOchiq('bepul', 'taqqos')).toBe(false);
    expect(kengaytmaQismiOchiq('bepul', 'bozor')).toBe(false);
    expect(kengaytmaQismiOchiq('pro', 'pasport')).toBe(true);
    expect(kengaytmaQismiOchiq('biznes', 'taqqos')).toBe(true);
  });
});

describe('kartochka rangi', () => {
  it('oyiga ≥ 30, lekin ishonch past — yashil emas, sariq', () => {
    const b = { ...baho(1978350), ishonch: 'past' as const };
    expect(kartochkaBelgisi(b).rang).toBe('sariq');
    expect(kartochkaBelgisi(baho(1978350)).rang).toBe('yashil');
  });
});

describe("rasm ustidagi qisqa yozuv", () => {
  it("har holat uchun qisqa (chapdan ~70 px)", () => {
    expect(kartochkaBelgisi(baho(1978350)).qisqa).toBe("≈ 430/oy");
    expect(kartochkaBelgisi(baho(2996358)).qisqa).toBe("aniq emas");
    expect(kartochkaBelgisi(baho(1321486)).qisqa).toBe("tugagan");
    expect(kartochkaBelgisi(baho(12125)).qisqa).toBe("sotuv yoʻq");
    expect(kartochkaBelgisi(baho(3286701)).qisqa).toBe("—");
    for (const q of qatorlar) expect(kartochkaBelgisi(sotuvBahosi(q, q.product_id)).qisqa.length).toBeLessThanOrEqual(12);
  });
});

describe('narx oʻzgarishi', () => {
  it('oraliqda oʻlchanmagan kun boʻlsa ham oxirgi oʻzgarish koʻrinadi (1978350: 19.10 yoʻq, 20.10 — 38 990)', () => {
    const p = tovarPasporti(qator(1978350), 1978350, { soliqFoizi: 1 });
    const f = p.faktlar.find((x) => x.nom === 'Narx oʻzgarishi')!;
    expect(f.qiymat).toContain('20.10: 35 990 → 38 990');
  });
});
