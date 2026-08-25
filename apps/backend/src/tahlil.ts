import {
  hype, mavsumiy, monopoliya, nakrutka, ogir, TRAP_LABEL, yopiqBrend,
} from '@selleros/shared';
import type {
  Baholanmadi, Flag, TovarHolati, TovarToliq, TrapKind, TurkumHolati,
} from '@selleros/shared';

/**
 * Filtrlarni bazaga ulaydigan qatlam.
 *
 * NEGA BU FAYL BOR. B1 tekshiruvi (docs/B1-TEKSHIRUV.md) shuni ochdi:
 * filtrlar yozilgan va sinalgan edi, lekin ularni ishlab chiqarish kodi
 * CHAQIRMASDI — ular faqat testlarda yashardi. Yaʼni kutubxona toʻgʻri,
 * mahsulot esa yoʻq edi.
 *
 * Zanjir: baza → `so_tovar_holati` → `TovarHolati` → filtr → bayroq.
 */

export interface Bayroqli<T> {
  holat: T;
  bayroqlar: Flag[];
  /** Baholab boʻlmagan filtrlar va nima yetishmagani. */
  baholanmadi: { filtr: string; missing: string[] }[];
}

/**
 * Bitta tovarni barcha tovar filtrlaridan oʻtkazadi.
 *
 * `oy` — mavsum filtri uchun. Argument sifatida uzatiladi, ichkarida
 * `new Date()` chaqirilmaydi: aks holda test natijasi qaysi oyda
 * ishlatilganiga bogʻliq boʻlardi va yilda bir marta sababsiz
 * qizarardi.
 */
export function tovarniTekshir(t: TovarToliq, oy?: number): Bayroqli<TovarHolati> {
  const bayroqlar: Flag[] = [];
  const baholanmadi: { filtr: string; missing: string[] }[] = [];

  /** Filtr natijasini toʻgʻri roʻyxatga qoʻyadi. */
  const yoz = (nom: string, natija: Flag | Baholanmadi | null) => {
    if (!natija) return;
    if (natija.kind === 'baholanmadi') {
      baholanmadi.push({ filtr: nom, missing: natija.missing });
    } else {
      bayroqlar.push(natija);
    }
  };

  yoz('closed_brand', yopiqBrend(t));

  yoz('fake_sales', nakrutka({
    soldUnits30d: t.soldUnits30d,
    sotuvManbasi: t.sotuvManbasi ?? null,
    reviews: t.sharhSoni ?? null,
    rating: t.reyting ?? null,
  }));

  yoz('heavy', ogir({
    weightG: t.weightG ?? null,
    volumeMl: t.volumeMl ?? null,
    oversized: t.oversized ?? null,
  }));

  yoz('seasonal', mavsumiy({
    seasonality: t.seasonality ?? null,
    oy: oy ?? 0,
  }));

  yoz('hype', hype({
    productAgeDays: t.productAgeDays ?? null,
    yangiSotuvUlushi: t.yangiSotuvUlushi ?? null,
  }));

  return { holat: t, bayroqlar, baholanmadi };
}

/** Bitta turkumni barcha turkum filtrlaridan oʻtkazadi. */
export function turkumniTekshir(t: TurkumHolati): Bayroqli<TurkumHolati> {
  const bayroqlar: Flag[] = [];
  const baholanmadi: { filtr: string; missing: string[] }[] = [];

  const natija = monopoliya(t);
  if (natija && natija.kind === 'baholanmadi') {
    baholanmadi.push({ filtr: 'monopoly', missing: natija.missing });
  } else if (natija) {
    bayroqlar.push(natija);
  }

  return { holat: t, bayroqlar, baholanmadi };
}

export interface Xulosa {
  tekshirildi: number;
  bayroqli: number;
  baholanmadi: number;
  /**
   * Qaysi maydon yetishmagani — nechta marta.
   *
   * Bu raqam MAJBURIY koʻrsatiladi. Filtr "baholay olmadim" deb jim
   * qolsa, u ishlamayotgani bilinmaydi — aynan shu naqsh bugun toʻrt
   * marta uchradi (`shopOfficial`, `sellersCount`, `brand`, yupqa
   * namuna). QOIDALAR.md, 8-boʻlim.
   */
  yetishmayotgan: Record<string, number>;
  /**
   * Tuzoq turlari boʻyicha yigʻindi — nomi oʻzbekcha bilan.
   *
   * Mijoz (web, bot, kengaytma) buni oʻzi yigʻa olardi, lekin
   * uchalasi oʻzbekcha nomni oʻzida saqlashi kerak boʻlardi.
   * Bir nom uch joyda — bu albatta ajralib ketadi va bittasi
   * eskirganini hech narsa koʻrsatmaydi.
   *
   * Nom `TRAP_LABEL` da, bitta joyda. Sinxronlik testi uni har
   * `TrapKind` uchun toʻlganini tekshiradi.
   */
  turlar: Array<{ kind: TrapKind; nom: string; soni: number }>;
  bayroqlar: Flag[];
}

/** Bir qancha natijadan hisobot yigʻadi. */
export function xulosa<T>(natijalar: Bayroqli<T>[]): Xulosa {
  const yetishmayotgan: Record<string, number> = {};
  const bayroqlar: Flag[] = [];
  let bayroqli = 0;
  let baholanmadiSoni = 0;

  for (const n of natijalar) {
    if (n.bayroqlar.length) {
      bayroqli += 1;
      bayroqlar.push(...n.bayroqlar);
    }
    if (n.baholanmadi.length) baholanmadiSoni += 1;
    for (const b of n.baholanmadi) {
      for (const m of b.missing) {
        yetishmayotgan[m] = (yetishmayotgan[m] ?? 0) + 1;
      }
    }
  }

  const sanoq = new Map<TrapKind, number>();
  for (const b of bayroqlar) sanoq.set(b.kind, (sanoq.get(b.kind) ?? 0) + 1);

  return {
    tekshirildi: natijalar.length,
    bayroqli,
    baholanmadi: baholanmadiSoni,
    yetishmayotgan,
    // Koʻpdan ozga — foydalanuvchi eng koʻp uchraganini birinchi
    // koʻrsin. Teng boʻlsa nom boʻyicha, natija barqaror boʻlishi uchun.
    turlar: [...sanoq.entries()]
      .map(([kind, soni]) => ({ kind, nom: TRAP_LABEL[kind], soni }))
      .sort((a, b) => b.soni - a.soni || a.kind.localeCompare(b.kind)),
    bayroqlar,
  };
}
