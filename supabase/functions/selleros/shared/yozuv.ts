/**
 * YOZUV — oʻzbek kirill matnini tanish va TUSHUNISH uchun lotinga oʻgirish.
 *
 * Nazoratchi (2026-10-13): yordamchi mijoz qaysi tilda yozsa, oʻsha tilda
 * javob beradi — oʻzbekcha lotin yoki kirill, ruscha. Ilgari har qanday
 * kirill matn "ruscha" deb olinardi: «Пул қачон тушади?» ga ruscha shablon
 * chiqardi, bilim bazasi (lotin kalit soʻzlari) esa savolni umuman
 * tanimasdi. Endi oʻzbek kirill matni kalit soʻz, soʻroq belgisi va tugma
 * nomini topish uchun lotinga oʻgiriladi. Javobni LLM mijozning oʻz
 * yozuvida yozadi; LLM boʻlmasa — lotin shablon (ruscha emas).
 *
 * Mijoz yozgan matnning OʻZI oʻzgarmaydi: chatga va LLM ga asl matn ketadi.
 */

/** Faqat oʻzbek kirilliga xos harflar (ruschada yoʻq). */
const OZBEK_HARF = /[ўқғҳ]/iu;

/**
 * Oʻzbek kirill matnida koʻp uchraydigan, ruschada yoʻq soʻzlar — ў/қ/ғ/ҳ siz
 * yozilganda ham ("канча", "булади") tanish uchun. «товар» yoʻq: u ruscha ham.
 */
const OZBEK_SOZ = /(?:^|[^\p{L}])(?:нима|нега|канча|кандай|качон|каер\p{L}*|кайси|ким|нечта|бор|йук|керак|мен|сиз|менга|сизга|пул|пулим|сотиш|сотмокчи\p{L}*|учун|билан|хам|эмас|булади|бошла\p{L}*|салом|ассалому|рахмат|ха)(?=[^\p{L}]|$)/iu;

/** Matnda kirill harfi bormi. */
export function kirilmi(matn: string): boolean {
  return /[Ѐ-ӿ]/u.test(String(matn ?? ''));
}

/** Oʻzbek kirill matnimi (ruscha emas). */
export function ozbekKirilmi(matn: string): boolean {
  const s = String(matn ?? '');
  return kirilmi(s) && (OZBEK_HARF.test(s) || OZBEK_SOZ.test(s.toLowerCase()));
}

/** Ruscha matnmi: kirill, lekin oʻzbekcha emas. */
export function ruschami(matn: string): boolean {
  return kirilmi(matn) && !ozbekKirilmi(matn);
}

const HARF: Readonly<Record<string, string>> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh',
  ъ: 'ʼ', ь: '', ы: 'i', э: 'e', ю: 'yu', я: 'ya', ў: 'oʻ', қ: 'q', ғ: 'gʻ', ҳ: 'h',
};

/** «е» soʻz boshida va unli yoki ъ/ь dan keyin — "ye" ("етти" → "yetti"), boshqa joyda — "e". */
const YE_OLDIDAN = /[аеёиоуэюяўыъь]/u;

/** Oʻzbek kirill → lotin. Kirill boʻlmagan belgilar oʻzgarmaydi. */
export function lotinga(matn: string): string {
  const s = String(matn ?? '');
  let chiqdi = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    const kichik = c.toLowerCase();
    let l: string;
    if (kichik === 'е') {
      const oldingi = i > 0 ? s[i - 1]!.toLowerCase() : '';
      l = !/\p{L}/u.test(oldingi) || YE_OLDIDAN.test(oldingi) ? 'ye' : 'e';
    } else {
      l = HARF[kichik] ?? c;
    }
    // Bosh harf: "Шаҳар" → "Shahar".
    if (c !== kichik && l) l = l.charAt(0).toUpperCase() + l.slice(1);
    chiqdi += l;
  }
  return chiqdi;
}

/** Tushunish uchun matn: oʻzbek kirill boʻlsa — lotinda, boʻlmasa oʻzi. */
export function tushunishUchun(matn: string): string {
  return ozbekKirilmi(matn) ? lotinga(matn) : String(matn ?? '');
}
