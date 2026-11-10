/**
 * RUS TILI — javob tugmalari (nazoratchi, 2026-11-04, 4-taklif: «sahifa ruscha boʻlsa — hammasi
 * ruscha»). Ilgari rus sahifasida sarlavha va «Продолжить» ruscha, salom va javob tugmalari esa
 * oʻzbekcha edi — birinchi ekranda tushunmagan matnni koʻrgan odam chiqib ketardi.
 *
 * Tugma nomi bitta joyda — ssenariyning oʻzida (oʻzbekcha `nom`); ruschasi shu lugʻatdan, nom
 * boʻyicha. Yangi tugma qoʻshilsa va bu yerda boʻlmasa — test yiqiladi (`test/ru.test.ts`
 * ssenariydagi har bir `nom: '…'` ni tekshiradi). Maʼlumotdan kelgan nomlar (Uzum turkumi, tovar
 * nomi) tarjima qilinmaydi — ular oʻzicha qoladi.
 */

import { SAVDO_SOHALARI } from './soha.js';

/** Oʻzbekcha tugma nomi → ruschasi. */
export const VARIANT_RU: Readonly<Record<string, string>> = {
  // 1-qadam: pul (1-taklif), tajriba, qiziqish
  '5 mln soʻm': '5 млн сум',
  '10 mln soʻm': '10 млн сум',
  '30 mln soʻm': '30 млн сум',
  '70 mln soʻm': '70 млн сум',
  '100 mln dan koʻp': 'Больше 100 млн',
  'Hali bilmayman': 'Пока не знаю',
  'Ha, Uzumda sotyapman': 'Да, продаю на Uzum',
  'Uzumda kabinet bor, hali sotmaganman': 'Есть кабинет на Uzum, ещё не продаю',
  'Boshqa joyda sotganman (bozor, Instagram…)': 'Продавал(а) в другом месте (рынок, Instagram…)',
  'Yoʻq, birinchi marta': 'Нет, впервые',
  'Bilmayman — eng yaxshilarini koʻrsating': 'Не знаю — покажите лучшие',
  'Bu tovarni oʻtkazib yuborish': 'Пропустить этот товар',
  'Ha, YATT ochdim': 'Да, ИП открыт',
  'Hali ochmadim': 'Ещё не открыт',
  ...Object.fromEntries(SAVDO_SOHALARI.map((s) => [s.nom, s.ru])),
  // 2–5-qadam
  'Qayta urinish': 'Повторить',
  'Boshqa yoʻnalish': 'Другое направление',
  'Yana koʻrsatish': 'Показать ещё',
  'Ha, Xitoydan topamiz': 'Да, ищем в Китае',
  'Miqdorni oʻzgartiraman': 'Изменю количество',
  'Marjani oʻzgartiraman': 'Изменю маржу',
  'Ha, mantiqli': 'Да, логично',
  'Yoʻq, nimadir notoʻgʻri': 'Нет, что-то не так',
  'Shusiz davom etamiz': 'Продолжим без этого',
  'Qayta qidirish': 'Искать заново',
  // 6–7-qadam
  'Bu safar olmayman': 'В этот раз не беру',
  'YATT bor': 'Есть ИП (YATT)',
  'MChJ (firma) bor': 'Есть ООО (фирма)',
  'Oʻzini oʻzi band qilganman': 'Я самозанятый(ая)',
  'Hech biri yoʻq': 'Ничего из этого',
  'Ochdim, guvohnoma qoʻlimda': 'Открыл(а), свидетельство на руках',
  'Keyinroq ochaman': 'Открою позже',
  'Sayt boshqacha / bu tugma yoʻq': 'Сайт выглядит иначе / нет этой кнопки',
  'Biznes hisob raqamim bor': 'Есть расчётный счёт',
  'Hozir ochdim': 'Только что открыл(а)',
  'Bank shartlari boshqacha': 'Условия банка другие',
  'Kabinet faollashtirilgan': 'Кабинет активирован',
  'Ariza yubordim, kutyapman': 'Подал(а) заявку, жду',
  'Keyinroq': 'Позже',
  // 8–10-qadam
  'Keldi': 'Пришёл',
  'Hali kelmadi': 'Ещё не пришёл',
  'Hammasi mos': 'Всё совпадает',
  'Kam keldi': 'Пришло меньше',
  'Nuqsonli bor': 'Есть брак',
  'Yetarli, yuklab oldim': 'Хватает, скачал(а)',
  'Yetmadi — oʻzim suratga olaman': 'Не хватает — сфотографирую сам(а)',
  'Qayta qidir': 'Искать заново',
  'Kartochka matnini yozib ber': 'Напиши текст карточки',
  'Yaratdim': 'Создал(а)',
  'Kabinet boshqacha': 'Кабинет выглядит иначе',
  'Tayyor': 'Готово',
  'Qoʻllanma boshqacha': 'Инструкция другая',
  'Oʻzim Toshkent omboriga olib boraman': 'Сам(а) отвезу на склад в Ташкенте',
  'Uzum logistikasi (topshirish punkti orqali, pullik)': 'Логистика Uzum (через ПВЗ, платно)',
  'Yaratdim, taymslot oldim': 'Создал(а), таймслот получен',
  'Topshirdim': 'Сдал(а)',
  'Taymslotni kutyapman': 'Жду таймслот',
  'Omborda boshqacha': 'На складе иначе',
  // 11–12-qadam
  'Ha, yana buyurtma': 'Да, заказать ещё',
  'Hozircha yoʻq': 'Пока нет',
  'Tushunarli': 'Понятно',
  'Tegmaymiz': 'Оставляем цену',
  'Tushiraman': 'Снижу цену',
  'Javob yozaman': 'Напишу ответ',
  'Tayyorlaymiz': 'Готовим',
  'Bajardim': 'Сделал(а)',
  'Sayt boshqacha': 'Сайт выглядит иначе',
  'Boshlaymiz': 'Начинаем',
  'Yangilash': 'Обновить',
  'Havola qoʻshish': 'Добавить ссылку',
  'Yana buyurtma': 'Заказать ещё',
  'Oy hisoboti': 'Отчёт за месяц',
  // Obuna
  'Qayta tekshirish': 'Проверить снова',
  'Payme orqali toʻlash': 'Оплатить через Payme',
  'Click orqali toʻlash': 'Оплатить через Click',
  'Toʻladim — tekshirish': 'Оплатил(а) — проверить',
  // Shaharlar (6-qadam)
  'Toshkent': 'Ташкент',
  'Samarqand': 'Самарканд',
  'Buxoro': 'Бухара',
  'Andijon': 'Андижан',
  'Namangan': 'Наманган',
  'Fargʻona': 'Фергана',
  'Qarshi': 'Карши',
  'Nukus': 'Нукус',
  'Urganch': 'Ургенч',
  'Navoiy': 'Навои',
  'Jizzax': 'Джизак',
  'Guliston': 'Гулистан',
  'Termiz': 'Термез',
  'Boshqa': 'Другой',
};

/** Sonli shablonlar («30 kunlik zaxira — 17 dona») — son oʻzicha, soʻzlar ruscha. */
const NAMUNALAR: ReadonlyArray<readonly [RegExp, string]> = [
  [/^(\d+) kunlik zaxira — (.+) dona$/u, 'Запас на $1 дней — $2 шт'],
  [/^(\d+) kunlik — (.+) dona$/u, 'На $1 дней — $2 шт'],
  [/^Oldingidek — (.+) dona$/u, 'Как в прошлый раз — $1 шт'],
  [/^(\d+)%$/u, '$1%'],
];

/** Tugma nomining ruschasi; lugʻatda va shablonda yoʻq boʻlsa — `undefined` (nom oʻzicha qoladi). */
export function variantRu(nom: string): string | undefined {
  const l = VARIANT_RU[nom];
  if (l !== undefined) return l;
  for (const [n, r] of NAMUNALAR) if (n.test(nom)) return nom.replace(n, r);
  return undefined;
}

/** Variantlarga ruscha nom qoʻshadi (bor boʻlsa — tegilmaydi). */
export function ruschaVariantlar<T extends { nom: string; ru?: string }>(v: readonly T[]): T[] {
  return v.map((x) => {
    if (x.ru !== undefined) return x;
    const ru = variantRu(x.nom);
    return ru === undefined ? x : { ...x, ru };
  });
}
