import { monopoliya, yopiqBrend } from './shared/index.ts';
import type { Flag, TovarHolati, TurkumHolati } from './shared/index.ts';

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

/** Bitta tovarni barcha tovar filtrlaridan oʻtkazadi. */
export function tovarniTekshir(t: TovarHolati): Bayroqli<TovarHolati> {
  const bayroqlar: Flag[] = [];
  const baholanmadi: { filtr: string; missing: string[] }[] = [];

  const natija = yopiqBrend(t);
  if (natija && natija.kind === 'baholanmadi') {
    baholanmadi.push({ filtr: 'closed_brand', missing: natija.missing });
  } else if (natija) {
    bayroqlar.push(natija);
  }

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

  return {
    tekshirildi: natijalar.length,
    bayroqli,
    baholanmadi: baholanmadiSoni,
    yetishmayotgan,
    bayroqlar,
  };
}
