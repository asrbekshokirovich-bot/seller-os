/**
 * ERKIN MAʼLUMOT — erkin savolga BAZADAGI raqam bilan javob, sunʼiy intellektsiz.
 *
 * Jonli oʻlchov (2026-10-14, birinchi marta kirgan mijozning 40 ta savoli):
 * «Uzumda eng koʻp nima sotiladi?», «Kiyim sotish osonmi?», «Raqobat
 * kuchlimi?», «Soliq qancha toʻlayman?», «Bank hisob raqami kerakmi?» ga
 * "hozir aniq javob bera olmayman" chiqdi. Holbuki javob bazada bor:
 * 2-qadamning yoʻnalish oʻlchovlari (`so_yonalish_nomzodlari`) va
 * 7-qadamning rasmiy faktlari (`fakt`, 0057). Nazoratchi (2026-10-14):
 * "birinchi marta kirgan mijoz xohlagan savolini berishi mumkin — aniq
 * javob bersin".
 *
 * Bu modul SOF: savol turini aniqlaydi (`malumotNiyati`) va bazadan kelgan
 * maʼlumotdan matn yasaydi (`soliqMatni`, `bankMatni`, `yonalishMalumoti`).
 * Bazaga `suhbat-kod.ts` boradi. Raqam faqat bazadan, manbasi bilan;
 * maʼlumot yetmasa — `null` (bilim bazasining umumiy javobi ketadi), hech
 * narsa toʻqilmaydi (QOIDALAR.md, 4-boʻlim).
 */

import { minglik } from './fakt.ts';
import { sanaMatni } from './hisobot.ts';
import type { Yonalish } from './qadamlar.ts';
import { izohTozala, oylikSoliq, type BankQatori, type RasmiyFaktlar } from './rasmiy.ts';
import { BILMAYMAN, normla, qidiruvMos, sohaNomi, sohaniTop, type SohaId } from './soha.ts';
import { UZUM_BILIMI } from './uzum-bilim.ts';
import { yonalishSatri } from './yordamchi.ts';

export type MalumotTuri = 'soliq' | 'bank' | 'top' | 'tavsiya' | 'raqobat' | 'soha';

export interface MalumotNiyati {
  tur: MalumotTuri;
  /** Savolda tilga olingan sohalar ("kiyim", "kosmetika"). */
  sohalar: SohaId[];
  /** Tovar soʻzlari ("krossovka", "ruchka") — turkum nomlari bilan solishtiriladi (`qidiruvMos`). */
  sozlar: string[];
  /** Savol matni (normlangan) — nomi aytilgan bankni topish uchun (`bankMatni`). */
  matn: string;
}

const SOLIQ = /soli[qg]|налог/u;
// Bank nomi ham: «Kapitalbankda…», «Hamkorbankda…», «TBCda…» — jonli (2026-10-14) bular
// "aniq javob bera olmayman" olardi. «banka» (idish) — bank emas.
const BANK = /bank(?!a)|(?<!\p{L})tbc|hisob ?raqam|hisob(?:ni)? och|банк|расч[её]тн/u;
const TOP = /eng ko'p (nima |qaysi tovar |qanday tovar )?(sotil|sotad|xarid|olin)|ko'p sotiladigan|nima ko'p sotil|eng (ko'p |yaxshi )?sotilayotgan|ommabop|xit tovar|самы[ейх] продаваем|что (больше|чаще) всего (прода|покупа)|популярн/u;
const RAQOBAT = /raqobat|konkurent|конкурен/u;
const TAVSIYA = /nima sotsam|nimani sotsam|nima sotay|qaysi (tovar|yo'nalish|soha)(ni|da)? (sotsam|tanlasam|tanlay|boshla)|qaysi (yo'nalish|soha|tovar) (yaxshi|foydali|oson)|nimadan boshlasam|что (лучше )?продавать|какой товар (выбрать|лучше)/u;
/** Baho soʻrovi: "osonmi", "yuradimi", "talab bormi"… */
const BAHO = /oson|qiyin|yaxshimi|yuradimi|sotiladimi|o'tadimi|ketadimi|talab (bormi|qanday|katta|ko'p)|xaridor(i|lari)? (bormi|ko'pmi|qanday)|foydalimi|arziydimi|(sotsam|sotsa|boshlasam) bo'ladimi|легко|сложно|выгодн|прода[её]тся|спрос/u;
/** Savdo haqida gap — tovar soʻzi bilan baho soʻrovi shunda maʼlumot savoli boʻladi. */
const SAVDO = /sot|savdo|yurad|ketad|o'tad|talab|xaridor|продав|прода[её]т|спрос|торгов/u;
/** "Uzumda sotish osonmi?" — umumiy: raqobat manzarasi bilan javob. */
const UMUMIY_SAVDO = /uzum|savdo|sotish|sotuv|торгов|продавать/u;

/** Tovar soʻzi boʻla olmaydigan umumiy soʻzlar (boshi boʻyicha). */
const UMUMIY_BOSH = [
  'sot', 'savdo', 'oson', 'qiyin', 'yaxshi', 'yomon', 'yurad', 'ketad', "o'tad", 'talab', 'xaridor', 'foyda', 'arziy',
  'boshla', "bo'la", "bo'li", 'qanday', 'qanaqa', 'qaysi', 'nima', 'uzum', 'bormi', 'kerak', 'mumkin', 'menga', 'meni',
  'sizga', 'bilan', 'uchun', 'hozir', "ko'p", 'kuchli', 'katta', 'kichik', 'narx', 'pul', 'tovar', 'mahsulot', "yo'nalish",
  'soha', 'bozor', 'raqobat', 'lekin', 'agar', 'qilish', 'qilsam', 'olib', 'kelib', 'xitoy', 'qancha', 'boshqa', 'hamma',
  'продав', 'легко', 'сложно', 'выгодн', 'спрос', 'товар', 'конкурен', 'сильн', 'можно', 'стоит', 'хорош',
];
/** Soha nomlari — ular `sohalar` ga tushadi, tovar soʻzi emas. */
const SOHA_SOZI = /^(kiyim|poyabzal|kosmetika|go'zallik|parvarish|ro'zg'or|uy-ro'zg'or|maishiy|bola|elektronika|texnika|gadjet|kanstovar|kantstovar|kanselyar|aksessuar|zargar|sport|avto|mashina|одежд|обув|космет|красот|электрон|техник|канц|аксессуар|спорт|авто|детск)/u;

function tovarSozlari(t: string): string[] {
  return [...new Set(t.split(/[^\p{L}']+/u)
    .map((w) => w.replace(/^'+|'+$/gu, ''))
    .filter((w) => w.length >= 4 && !SOHA_SOZI.test(w) && !UMUMIY_BOSH.some((b) => w.startsWith(b))))];
}

/**
 * Savol bazadagi maʼlumot bilan javob beriladigan turdami. `matn` — tushunish
 * uchun matn (oʻzbek kirill lotinga oʻgirilgan). Mos kelmasa — `null`.
 */
export function malumotNiyati(matn: string): MalumotNiyati | null {
  const t = normla(matn);
  if (!t) return null;
  const sohalar = sohaniTop(t).filter((x): x is SohaId => x !== BILMAYMAN);
  const sozlar = tovarSozlari(t);
  const niyat = (tur: MalumotTuri): MalumotNiyati => ({ tur, sohalar, sozlar, matn: t });
  if (SOLIQ.test(t)) return niyat('soliq');
  if (BANK.test(t)) return niyat('bank');
  if (TOP.test(t)) return niyat('top');
  if (RAQOBAT.test(t)) return niyat('raqobat');
  if (TAVSIYA.test(t)) return niyat('tavsiya');
  if (BAHO.test(t)) {
    if (sohalar.length || (sozlar.length && SAVDO.test(t))) return niyat('soha');
    if (UMUMIY_SAVDO.test(t)) return niyat('raqobat');
  }
  return null;
}

// ---------------------------------------------------------------- 7-qadam faktlari

/** `1000000000` → "1 mlrd soʻm"; butun million — "mln"; boshqasi guruhlangan. */
function somQisqa(x: number): string {
  if (x >= 1e9 && x % 1e7 === 0) return `${String(x / 1e9).replace('.', ',')} mlrd soʻm`;
  if (x >= 1e6 && x % 1e4 === 0) return `${String(x / 1e6).replace('.', ',')} mln soʻm`;
  return `${minglik(x)} soʻm`;
}

/** Misol uchun oylik sotuv (7-qadam hujjatidagi misol bilan bir xil: docs/RASMIYLASHTIRISH-FAKTLAR.md, 3-boʻlim). */
const MISOL_SOTUV_SOM = 5_000_000;

/**
 * Chatdagi koʻrinish: xatboshilar boʻsh qator bilan, roʻyxat — "• " qatorlar
 * (pufak `white-space: pre-line`). Jonli oʻlchovda (2026-10-14) bank va soliq
 * javobi bitta uzun gap boʻlib chiqdi — oʻqish qiyin edi.
 */
const xatboshilar = (q: ReadonlyArray<string | null>): string => q.filter(Boolean).join('\n\n');
const qatorlar = (q: readonly string[]): string => q.map((x) => `• ${x}`).join('\n');

/** «Soliq qancha?» — 7-qadam faktlaridan (YATT). Asosiy faktlar yoʻq — `null`. */
export function soliqMatni(f: RasmiyFaktlar): string | null {
  const s = f.soliq;
  if (s.aylanmaFoiz === null && s.ijtimoiyOySom === null) return null;
  const qismlar: string[] = [];
  if (s.aylanmaFoiz !== null) {
    const shart = [
      s.aylanmaChegaraSom !== null ? `yillik savdo ${somQisqa(s.aylanmaChegaraSom)}gacha boʻlsa` : null,
      s.rejimTugaydi ? `bu rejim ${sanaMatni(s.rejimTugaydi)} gacha` : null,
    ].filter(Boolean);
    qismlar.push(`aylanma soligʻi — sotuvdan ${String(s.aylanmaFoiz).replace('.', ',')} %${shart.length ? ` (${shart.join('; ')})` : ''}. `
      + 'U xaridor toʻlagan toʻliq narxdan hisoblanadi — Uzum komissiyasi chegirilmaydi.');
  }
  if (s.ijtimoiyOySom !== null) {
    qismlar.push(`ijtimoiy soliq — har oy ${minglik(s.ijtimoiyOySom)} soʻm, sotuv boʻlmasa ham`
      + (s.tolovKuni !== null ? `, oyning ${s.tolovKuni}-sanasigacha` : '') + '.');
  }
  const misol = oylikSoliq(s, MISOL_SOTUV_SOM);
  return xatboshilar([
    `Soliq rasmiylashtirish shakliga bogʻliq. Eng oddiy shakl — YATT; uning soligʻi${qismlar.length > 1 ? ' ikki qism' : ''}:\n${qatorlar(qismlar)}`,
    misol.jamiSom !== null && misol.aylanmaSom !== null && misol.ijtimoiySom !== null
      ? `Masalan, oyiga ${minglik(MISOL_SOTUV_SOM)} soʻm sotsangiz: ${minglik(misol.ijtimoiySom)} + ${minglik(misol.aylanmaSom)} = ${minglik(misol.jamiSom)} soʻm.`
      : null,
    [
      s.manba ? `Manba: ${s.manba}${s.olchandi ? ` (oʻlchandi ${sanaMatni(s.olchandi)})` : ''}.` : null,
      'Bu soliq maslahati emas — aniq qoidani soliq organi yoki buxgalter tasdiqlaydi. 7-qadamda (Rasmiylashtirish) buni partiyangiz boʻyicha hisoblab beraman.',
    ].filter(Boolean).join(' '),
  ]);
}

/** Bank izohidan chat uchun qisqasi: birinchi gap, ichki «[TASDIQ]» belgilarisiz (`izohTozala`). */
function izohQisqa(izoh: string | null): string | null {
  const birinchi = (izohTozala(izoh) ?? '').split(/\.\s/u)[0]!.replace(/\.$/u, '').trim();
  return birinchi || null;
}

function bankSatri(b: BankQatori): string {
  const oylik = b.oylikSom === 0 ? 'oylik xizmat bepul' : b.oylikSom !== null ? `oylik ${minglik(b.oylikSom)} soʻm` : null;
  // 2026-10-14: «Hamkorbankda ofisga borish shartmi?» — javob chatda ham boʻlsin (kartada «ofisda» bor).
  // Oʻlchanmagan (`null`) — hech narsa demaymiz.
  const usul = b.onlayn === true ? 'onlayn ochiladi' : b.onlayn === false ? 'ofisga borib ochiladi' : null;
  const qism = [usul, izohQisqa(b.izoh) ?? oylik].filter(Boolean);
  return `${b.nom}${qism.length ? `: ${qism.join('; ')}` : ''}`;
}

/** Bank nomining kaliti: birinchi soʻz, faqat harflar («Kapitalbank (Uzum…)» → "kapitalbank", «TBC Bank» → "tbc"). */
function bankKaliti(nom: string): string | null {
  const k = normla(nom).split(/[^\p{L}]+/u).find(Boolean) ?? '';
  return k.length >= 3 ? k : null;
}

/**
 * Savolda nomi aytilgan banklar: soʻz (yoki yonma-yon ikki soʻz — «Anor bankda»)
 * kalit bilan boshlanadi: «hamkorbankda» → Hamkorbank.
 */
function aytilganBanklar(banklar: readonly BankQatori[], matn: string): BankQatori[] {
  const s = normla(matn).split(/[^\p{L}]+/u).filter(Boolean);
  const nomzod = [...s, ...s.slice(1).map((x, i) => s[i] + x)];
  return banklar.filter((b) => {
    const k = bankKaliti(b.nom);
    return k !== null && nomzod.some((x) => x.startsWith(k));
  });
}

/** Bitta bank — toʻliq: ochish usuli, narxi, izohning hammasi, manbasi. */
function bankBatafsil(b: BankQatori): string {
  const usul = b.onlayn === true ? 'onlayn ochiladi' : b.onlayn === false ? 'ofisga borib ochiladi' : null;
  const ochish = b.ochishSom === 0 ? 'ochish bepul' : b.ochishSom !== null ? `ochish ${minglik(b.ochishSom)} soʻm` : null;
  const bosh = [usul, ochish].filter(Boolean).join(', ');
  const oylik = b.oylikSom === 0 ? 'Oylik xizmat bepul.' : b.oylikSom !== null ? `Oylik xizmat — ${minglik(b.oylikSom)} soʻm.` : null;
  return [
    `${b.nom}${bosh ? ` — ${bosh}` : ''}:`,
    izohTozala(b.izoh) ?? oylik,
    b.manba ? `Manba: ${b.manba}.` : null,
  ].filter(Boolean).join('\n');
}

/**
 * «Bank hisob raqami kerakmi?» — Uzum qoidasi va 7-qadamdagi bank roʻyxati. Roʻyxat yoʻq — `null`.
 * Savolda bank nomi boʻlsa («Hamkorbankda ofisga borish shartmi?») — oʻsha bank toʻliq,
 * qolganlari nomi bilan (2026-10-14: nazoratchi "mijoz oʻzi xohlagan bankni tanlaydi").
 */
export function bankMatni(f: RasmiyFaktlar, niyat?: Pick<MalumotNiyati, 'matn'>): string | null {
  const b = f.banklar;
  if (!b.length) return null;
  const bepul = b.every((x) => x.ochishSom === 0);
  const sana = b.map((x) => x.olchandi).filter((x): x is string => x !== null).sort().at(-1) ?? null;
  const ogoh = sana ? `Tariflar ${sanaMatni(sana)} da bank saytlaridan olingan — oʻzgargan boʻlishi mumkin, ochishdan oldin bankdan soʻrang.` : null;
  const aytilgan = niyat ? aytilganBanklar(b, niyat.matn) : [];
  if (aytilgan.length) {
    const boshqa = b.filter((x) => !aytilgan.includes(x)).map((x) => x.nom);
    return xatboshilar([
      ...aytilgan.map(bankBatafsil),
      [ogoh, boshqa.length ? `Boshqa banklar ham bor: ${boshqa.join(', ')} — solishtirish uchun «Qaysi bankda hisob ochay?» deb soʻrang; tanlov sizniki.` : null]
        .filter(Boolean).join(' '),
    ]);
  }
  return xatboshilar([
    ['Ha, bank hisob raqami kerak: Uzum pulni faqat oʻz nomingizdagi biznes hisob raqamiga oʻtkazadi — shaxsiy karta boʻlmaydi.',
      ...uzumFakti('To‘lovlar', /hisob raqam/u)].join(' '),
    `Taqqoslangan banklar${bepul ? ' (hammasida hisob ochish bepul)' : ''}:\n${qatorlar(b.map(bankSatri))}`,
    [ogoh, '7-qadamda (Rasmiylashtirish) jadvalini toʻliq koʻrsataman; qaysi bank — tanlov sizniki.'].filter(Boolean).join(' '),
  ]);
}

// ---------------------------------------------------------------- 2-qadam oʻlchovlari

/** Uzum fakti (`uzum-bilim.ts`) — boʻlimi va matni boʻyicha, "[Boʻlim] " siz, manbasi bilan. */
function uzumFakti(bolim: string, filtr: RegExp): string[] {
  return UZUM_BILIMI
    .filter((f) => f.startsWith(`[${bolim}`))
    .map((f) => f.replace(/^\[[^\]]*\]\s*/u, ''))
    .filter((f) => filtr.test(f))
    .slice(0, 1);
}

/** Kartada koʻrinmaydigan, lekin sohaga tegishli Uzum fakti. */
function sohaFakti(soha: string): string[] {
  if (soha === 'kiyim' || soha === 'aksessuar') return uzumFakti('Logistika va saqlash', /^Yangi SKU/u);
  if (soha === 'gozallik' || soha === 'bolalar') return uzumFakti('Sertifikat', /^Sertifikat majburiy toifalar/u);
  return [];
}

const ball = (y: Yonalish): number => Math.round(y.ball.value ?? 0);
const bahoNomi = (b: number): string => (b >= 70 ? '«yaxshi»' : b >= 50 ? '«oʻrtacha»' : '«past»');

/** Har sohadan birinchisi, keyin ikkinchisi… — roʻyxat bitta sohadan iborat boʻlib qolmasin. */
function aralash(royxat: readonly Yonalish[], n: number): Yonalish[] {
  const guruh = new Map<string, Yonalish[]>();
  for (const y of royxat) guruh.set(y.soha, [...(guruh.get(y.soha) ?? []), y]);
  const chiqdi: Yonalish[] = [];
  for (let i = 0; chiqdi.length < Math.min(n, royxat.length); i++) {
    for (const q of guruh.values()) if (q[i] && chiqdi.length < n) chiqdi.push(q[i]!);
  }
  return chiqdi;
}

const YAKUN = '2-qadamda (Yoʻnalish) hammasini kartalarda raqamlari bilan koʻrasiz; tanlov — sizniki.';

/**
 * Raqobat manzarasi: eng katta 3 doʻkon ulushi boʻyicha (kartadagi chegaralar bilan bir
 * xil: 30 va 60 %). Soni 0 boʻlgan guruh aytilmaydi ("0 tasida … qiyin" — jonli oʻlchov, 2026-10-14).
 */
function raqobatMatni(royxat: readonly Yonalish[], qayerda: string): string | null {
  const olchangan = royxat.filter((y) => y.dalil.top3Ulush !== null);
  if (!olchangan.length) return null;
  const ochiq = olchangan.filter((y) => y.dalil.top3Ulush! < 30);
  const yirik = olchangan.filter((y) => y.dalil.top3Ulush! >= 30 && y.dalil.top3Ulush! < 60);
  const qolida = olchangan.length - ochiq.length - yirik.length;
  const misol = ochiq[0];
  return xatboshilar([
    `Bu yoʻnalishga bogʻliq — raqobat har xil. ${qayerda} raqobati oʻlchangan ${olchangan.length} ta yoʻnalishdan:\n${qatorlar([
      ochiq.length ? `${ochiq.length} tasida bozor ochiq — eng katta 3 doʻkon savdoning 30 % idan kamini oladi` : null,
      yirik.length ? `${yirik.length} tasida yirik doʻkonlar bor (30–60 %)` : null,
      qolida ? `${qolida} tasida bozor bir necha doʻkon qoʻlida (60 % dan koʻp) — u yerda yangi sotuvchiga qiyin` : null,
    ].filter((x): x is string => x !== null))}`,
    misol ? `Masalan, bozor ochiq va bahosi yuqori: ${yonalishSatri(misol)}.` : null,
    'Har yoʻnalish kartasida raqobat alohida koʻrsatiladi.',
  ]);
}

/**
 * Yoʻnalish oʻlchovlaridan javob. `baholangan` — `yonalishBaholari()` natijasi
 * (bali boʻyicha); `tanlanganId` — mijoz 2-qadamda tanlagan yoʻnalish.
 * Mos maʼlumot yoʻq — `null`.
 */
export function yonalishMalumoti(
  niyat: MalumotNiyati, baholangan: readonly Yonalish[], tanlanganId: number | null = null,
): string | null {
  if (!baholangan.length) return null;
  const sohada = niyat.sohalar.length ? baholangan.filter((y) => (niyat.sohalar as readonly string[]).includes(y.soha)) : [];
  const tovarda = niyat.sozlar.length ? baholangan.filter((y) => niyat.sozlar.some((s) => qidiruvMos(s, y.name))) : [];
  const sohaNomlari = niyat.sohalar.map(sohaNomi).join(' va ');

  if (niyat.tur === 'top') {
    const royxat = sohada.length ? sohada : baholangan;
    const talab = royxat.filter((y) => y.dalil.talabOlchovi !== null)
      .sort((a, b) => b.dalil.talabOlchovi! - a.dalil.talabOlchovi!).slice(0, 5);
    if (!talab.length) return null;
    const qiyin = talab.filter((y) => y.dalil.top3Ulush !== null && y.dalil.top3Ulush >= 60);
    const oson = aralash(royxat, 3);
    return xatboshilar([
      `${sohada.length ? `${sohaNomlari} sohasida` : 'Uzumda'} xaridori eng koʻp yoʻnalishlar (Uzum katalogidagi oʻlchov boʻyicha): `
        + `${talab.map((y) => `«${y.name}»`).join(', ')}.`,
      (qiyin.length
        ? `Lekin xaridor koʻp joyda raqobat ham kuchli boʻlishi mumkin: masalan, «${qiyin[0]!.name}» da eng katta 3 doʻkon `
          + `savdoning ${Math.round(qiyin[0]!.dalil.top3Ulush!)} % ini oladi.`
        : 'Lekin xaridor koʻp joyda raqobat ham kuchli boʻlishi mumkin.')
        + ` Yangi sotuvchi uchun imkoniyat bahosi eng yuqorilari: ${oson.map((y) => `«${y.name}» — ${ball(y)} ball`).join(', ')}.`,
      YAKUN,
    ]);
  }

  if (niyat.tur === 'tavsiya') {
    const royxat = sohada.length ? sohada.slice(0, 3) : aralash(baholangan, 3);
    return xatboshilar([
      `Hozir ${sohada.length ? `${sohaNomlari} sohasida ` : ''}yangi sotuvchi uchun imkoniyat bahosi eng yuqori yoʻnalishlar:\n`
        + qatorlar(royxat.map((y) => yonalishSatri(y))),
      'Baho qancha yuqori — boshlash shuncha osonroq. Lekin oʻzingiz tushunadigan sohadan boshlash ham muhim: sifatni tekshirish va xaridorga javob berish oson boʻladi.',
      YAKUN,
    ]);
  }

  if (niyat.tur === 'raqobat') {
    // Savolda soha yoki tovar yoʻq, lekin yoʻnalish tanlangan — oʻshaning raqobati.
    const tanlangan = !sohada.length && !tovarda.length && tanlanganId !== null
      ? baholangan.find((y) => y.categoryId === tanlanganId) ?? null : null;
    if (tanlangan) {
      const u = tanlangan.dalil.top3Ulush;
      if (u === null) return null;
      const hukm = u < 30 ? 'bozor ochiq — yangi sotuvchiga joy bor' : u < 60 ? 'yirik doʻkonlar bor' : 'bozor bir necha doʻkon qoʻlida — yangi sotuvchiga qiyin';
      return `Siz tanlagan «${tanlangan.name}» yoʻnalishida eng katta 3 doʻkon savdoning ${Math.round(u)} % ini oladi — ${hukm}`
        + `${tanlangan.dalil.sotuvchiSoni ? `; jami ${minglik(tanlangan.dalil.sotuvchiSoni)} ta sotuvchi` : ''}. `
        + `Imkoniyat bahosi — ${ball(tanlangan)} ball (${bahoNomi(ball(tanlangan))}).`;
    }
    if (tovarda.length) return raqobatMatni(tovarda, `«${tovarda[0]!.name}» kabi`);
    return raqobatMatni(sohada.length ? sohada : baholangan, sohada.length ? `${sohaNomlari} sohasida` : 'Uzumda');
  }

  if (niyat.tur === 'soha') {
    // Avval tovar nomi ("krossovka" → «Krossovkalar»), boʻlmasa soha ("kiyim").
    if (tovarda.length) {
      const eng = tovarda[0]!;
      const satrlar = tovarda.slice(0, 3).map((y) => yonalishSatri(y));
      return xatboshilar([
        satrlar.length === 1 ? `Uzumda ${satrlar[0]}.` : `Uzumda mos yoʻnalishlar:\n${qatorlar(satrlar)}`,
        `«${eng.name}» bahosi ${bahoNomi(ball(eng))}: baho qancha yuqori — boshlash shuncha osonroq. `
          + 'Bitta raqamga emas, xaridor, raqobat va ruxsat koʻrsatkichlariga birga qarang.',
        ...sohaFakti(eng.soha),
        YAKUN,
      ]);
    }
    if (!sohada.length) return null;
    const yaxshi = sohada.filter((y) => ball(y) >= 70).length;
    const ortacha = sohada.filter((y) => ball(y) >= 50 && ball(y) < 70).length;
    const baholar = [
      yaxshi ? `${yaxshi} tasining imkoniyat bahosi «yaxshi» (70 va undan yuqori)` : null,
      ortacha ? `${ortacha} tasiniki «oʻrtacha» (50–69)` : null,
    ].filter(Boolean);
    return xatboshilar([
      `${sohaNomlari} sohasida ${sohada.length} ta yoʻnalish kuzatiladi${baholar.length ? `: ${baholar.join(', ')}` : ' — hech birining bahosi 50 dan yuqori emas'}. `
        + `Eng yuqorilari:\n${qatorlar(sohada.slice(0, 3).map((y) => yonalishSatri(y)))}`,
      ['Baho qancha yuqori — boshlash shuncha osonroq.', ...niyat.sohalar.slice(0, 1).flatMap(sohaFakti)].join(' '),
      YAKUN,
    ]);
  }
  return null;
}
