/**
 * JAVOBGA MUNOSABAT — mijoz savolga oʻzi YOZIB javob bersa, chat uni eshitganini
 * koʻrsatadi.
 *
 * Nazoratchi (2026-10-15): "mijozning javobiga eʼtibor bermay keyingi savolga
 * oʻtib ketyapti". Ilgari yozilgan javob jimgina saqlanardi va darrov keyingi
 * savol chiqardi. Jonli jurnalda: «oldin sotganman maishiy texnika», «Bozorda
 * kanstovar sotganman», «Sotganman, velosiped opkeb sotganman. Lekin oʻxshamagan
 * biznesim. Uzumga vapshe aloqam yoq» — uchalasidan keyin ham faqat «Qaysi
 * sohadagi tovarlar sizga yaqin?» chiqqan, hech narsa belgilanmagan.
 *
 * Bu modul SOF (LLM siz): kod javobni qanday tushunganini aytadigan qisqa jumla
 * (`javobgaMunosabat`) va gapda savol bilan birga javob ham bormi (`javobHamBormi`).
 * AI suhbatda munosabatni AI yozadi (`ai-suhbat.ts`); AI ulanmagan boʻlsa — shu jumla
 * ketadi (2026-10-28: eski munosabat LLM i olib tashlandi).
 */

import { BILMAYMAN, gapdagiSohalar, normla, SAVDO_SOHALARI, sohaNomi } from './soha.js';
import { UZUM_DOKONI, type YolHolati } from './ssenariy.js';
import { byudjetMatni } from './tanishuv.js';
import { ruschami, tushunishUchun } from './yozuv.js';

/** Tajriba savoliga yozilgan gap: savdo qilgan (`bor`), hali yoʻq (`yoq`) yoki faqat niyat. */
export type TajribaTuri = 'bor' | 'yoq' | 'niyat';

const TAJRIBA_BOR = new RegExp([
  'sotganman', 'sotgan edim', 'sotardim', 'sotyapman', 'sotaman', 'sotib kel(?:aman|ganman|dim)',
  'savdo qil(?:ganman|yapman|ardim|aman)', 'savdoda ishlaganman', "do'kon(?:im)? (?:bor|ochganman|bo'lgan)",
  'magazin(?:im)? bor', "biznes(?:im)? (?:bor|bo'lgan)", 'tadbirkorman',
  // Ruschada inkor alohida soʻz: «не продавал» — tajriba emas.
  '(?<!не )продавал', '(?<!не )продаю', '(?<!не )торговал', '(?<!не )торгую', 'есть магазин',
].join('|'), 'u');
const TAJRIBA_YOQ = new RegExp([
  'birinchi marta', 'sotmaganman', 'savdo qilmaganman', "tajribam yo'?q", "tajriba yo'?q",
  '(?:yangi|endi) boshlayapman', 'первый раз', 'впервые', 'не продавал', 'не торговал', 'нет опыта',
].join('|'), 'u');
const TAJRIBA_NIYAT = new RegExp([
  'sotmoqchiman', 'boshlamoqchiman', "sotishni (?:xohlayman|rejalashtir\\p{L}*|o'ylayapman)", 'sotish niyat\\p{L}*',
  'хочу продавать', 'хочу начать', 'планирую',
].join('|'), 'u');
/** «Uzumga aloqam yoʻq», «Uzumni bilmayman», «Uzumda sotmaganman». */
const UZUM_YANGI = new RegExp([
  "uzum\\p{L}*\\s+(?:\\p{L}+\\s+){0,2}(?:aloqa\\p{L}*\\s+yo'?q|bilmayman|tanimayman|tushunmayman)",
  'uzumda (?:hali |hech )?(?:sotmaganman|savdo qilmaganman|birinchi marta)',
  '(?:uzum|узум)\\p{L}*\\s+(?:\\p{L}+\\s+){0,2}не (?:знаком|продавал|торговал)',
].join('|'), 'u');

/** Tajriba savoliga yozilgan gap turi. Bilinmasa — `null`. Avval «sotganman»: «sotganman, lekin Uzumda sotmaganman» — tajriba bor. */
export function tajribaTuri(matn: string): TajribaTuri | null {
  const t = normla(tushunishUchun(matn));
  if (TAJRIBA_BOR.test(t)) return 'bor';
  if (TAJRIBA_YOQ.test(t)) return 'yoq';
  if (TAJRIBA_NIYAT.test(t)) return 'niyat';
  return null;
}

/** Qiziqish savoliga yozilgan gapda tanlov bormi («kiyim sotmoqchiman», «kosmetika yoqadi»). */
const QIZIQISH_GAPI = /sotmoqchi|qiziq|yoqadi|tanlayman|tanladim|boshlamoqchi|bo'lsin|хочу|интерес|нравится|выбираю/u;

/**
 * Gapda savol ham, javob ham bor («oldin maishiy texnika sotganman, endi nima
 * sotsam boʻladi?»). Ilgari bunday gap butunlay savol deb olinardi: yordamchi
 * savolga javob berib, xuddi shu «Oldin savdo qilganmisiz?» ni qayta soʻrardi —
 * mijoz aytganini eshitmagandek. Endi tajriba yoki qiziqish aniq aytilgan boʻlsa
 * javob qabul qilinadi, savoliga esa munosabat ichida javob beriladi. Boshqa
 * savollarda (summa, son) — avvalgidek: avval savolga javob.
 */
export function javobHamBormi(savolId: string, matn: string): boolean {
  if (savolId === 'uzum_dokoni') return tajribaTuri(matn) !== null;
  if (savolId === 'qiziqish') {
    const t = normla(tushunishUchun(matn));
    return gapdagiSohalar(t).length > 0 && QIZIQISH_GAPI.test(t);
  }
  return false;
}

/**
 * Kod jumlasi — yozilgan javob qanday tushunilgani (LLM siz). `keyin` — javob
 * qabul qilingan holat. `null` — aytadigan gap yoʻq (tugma, oddiy son, ism…).
 */
export function javobgaMunosabat(savolId: string, yozgan: string, keyin: YolHolati): string | null {
  const ru = ruschami(yozgan);
  if (savolId === 'uzum_dokoni') {
    const j = keyin.javoblar['uzum_dokoni'];
    if (typeof j !== 'string' || UZUM_DOKONI.some((v) => v.qiymat === j)) return null;
    return tajribaMunosabati(yozgan, ru);
  }
  if (savolId === 'qiziqish') {
    const q = keyin.javoblar['qiziqish'];
    if (!Array.isArray(q) || q.length === 0) return null;
    if (q.includes(BILMAYMAN)) return ru ? 'Хорошо — покажу лучшие направления из всех сфер.' : 'Mayli — hamma sohadan eng yaxshilarini koʻrsataman.';
    const nomlar = q.map((x) => `«${ru ? (SAVDO_SOHALARI.find((s) => s.id === x)?.ru ?? String(x)) : sohaNomi(String(x))}»`).join(', ');
    return ru
      ? `Понял — направления подберу в основном из: ${nomlar}.`
      : `Tushundim — yoʻnalishlarni asosan ${nomlar} ${q.length > 1 ? 'sohalaridan' : 'sohasidan'} tanlab koʻrsataman.`;
  }
  // Byudjetni gap bilan yozsa («100 mln bor, lekin 70 mln bilan…») — qaysi summa olingani.
  if (savolId === 'byudjet') {
    const b = keyin.javoblar['byudjet'];
    if (typeof b !== 'number' || /^[\d\s.,]+$/u.test(yozgan.trim())) return null;
    const usd = keyin.javoblar['byudjet_usd'];
    return `Tushunarli — ${byudjetMatni(b, typeof usd === 'number' ? usd : null)} bilan boshlaymiz.`;
  }
  return null;
}

function tajribaMunosabati(yozgan: string, ru: boolean): string {
  const tur = tajribaTuri(yozgan);
  const asos = ru
    ? (tur === 'bor' ? 'Понятно — у вас уже есть опыт торговли, это очень поможет.'
      : tur === 'yoq' ? 'Ничего страшного — все когда-то начинают впервые. Пройдём каждый шаг вместе.'
        : tur === 'niyat' ? 'Хорошо — когда понятно, что вы хотите продавать, выбрать проще.'
          : 'Спасибо, учёл то, что вы написали.')
    // «Tushunarli», «Zoʻr» emas: tajriba oʻxshamagan boʻlishi ham mumkin («oʻxshamagan biznesim»).
    : (tur === 'bor' ? 'Tushunarli — savdo tajribangiz bor ekan, bu katta yordam beradi.'
      : tur === 'yoq' ? 'Hechqisi yoʻq — hamma birinchi marta boshlaydi. Har qadamni birga oʻtamiz.'
        : tur === 'niyat' ? 'Yaxshi — nima sotmoqchiligingiz aniq boʻlsa, tanlash osonroq.'
          : 'Rahmat, yozganingizni hisobga oldim.');
  // «Birinchi marta» javobi buni allaqachon aytadi.
  if (tur === 'yoq' || !UZUM_YANGI.test(normla(tushunishUchun(yozgan)))) return asos;
  return `${asos} ${ru
    ? 'Если с Uzum ещё не знакомы — не переживайте: покажу весь путь, от регистрации до продаж.'
    : 'Uzumni bilmasangiz ham xavotir olmang — roʻyxatdan oʻtishdan sotuvgacha butun yoʻlni koʻrsataman.'}`;
}
