/**
 * KOD KARTALARI OSTIDAGI IZOHLAR — mijoz tilida (nazoratchi, 2026-11-05, ikkinchi koʻrik, 1-taklif).
 *
 * Koʻrikda kartalar ostida faqat biz uchun yozilgan eslatmalar chiqdi: fayl nomi («docs/…md»),
 * migratsiya raqamlari, «BACKLOG», «nazoratchi tekshiradi», «provayder», «Cloudflare». Mijoz ularni
 * tushunmaydi va sayt chala qilingandek koʻrinadi. Endi hamma izoh shu yerda, oddiy gap bilan,
 * oʻzbekcha va ruscha. `suhbat-kod.ts` natijaga oʻzbekchasini yozadi (eski jurnal bilan bir xil
 * maydon), sahifa rus tilida ruschasini `izohRu` bilan topadi. Ichki belgilar test bilan
 * taqiqlangan (`izohlar.test.ts`).
 */

export const IZOHLAR = {
  tannarx: 'Chegara — Xitoyda 1 dona uchun toʻlash mumkin boʻlgan eng yuqori narx, soʻmda. Hisobga kirmagan qism alohida yozilgan — u qoʻshilsa, haqiqiy chegara pastroq boʻladi.',
  xitoy: 'Takliflar 1688 dan, tovar rasmi boʻyicha topildi. Narx yuanda, soʻmda — Markaziy bank kursi bilan. «Chegarada» — soʻmdagi narx 4-qadamdagi chegaradan oshmaydi; chegaraga kirmagan xarajat (kargo) har kartada yozilgan. Buyurtmalar soni — 1688 dagi jami son.',
  buyurtma: 'Varaqa 5-qadamda tanlagan 1688 takliflaringizdan tuzildi. Narx yuanda — 1688 dagi narx, soʻmda — Markaziy bank kursi bilan. Kargo narxi kiritilgan boʻlsa qoʻshiladi, boʻlmasa hisobga kirmaganini alohida yozamiz. Biz buyurtma bermaymiz va pul olmaymiz — varaqani agentingizga yuborasiz.',
  yukKutish: 'Yuk kelishini kutish ishlaringiz roʻyxatiga yozildi. Biz hozircha eslatma yubormaymiz — yuk kelganda shu chatga qaytib xabar bering.',
  rasmiy: 'Raqamlar rasmiy manbalardan olingan — har birining yonida manbasi va tekshirilgan sanasi bor. Soliq xaridor toʻlagan toʻliq narxdan hisoblanadi, Uzum komissiyasi chegirilmaydi. Bu soliq yoki yuridik maslahat emas.',
  rasmiyYakun: 'Keyinga qoldirgan ishlaringiz roʻyxatga yozildi (muddati boʻlsa — sanasi bilan). Biz hozircha eslatma yubormaymiz — tayyor boʻlganda shu chatga qayting, davom etamiz.',
  qabul: 'Xitoydan kelgan yukni sanang va koʻzdan kechiring. Kam yoki nuqsonli boʻlsa, agentga daʼvo qilish ishlaringiz roʻyxatiga yoziladi. Qoidalar Uzum qoʻllanmasidan (6-bob); qadoqlash tavsiyasi tovar nomiga qarab taxminiy.',
  qabulYakun: 'Kam yoki nuqsonli yuk boʻyicha agentga daʼvo qilish ishi roʻyxatga yozildi. Biz hozircha eslatma yubormaymiz.',
  studiya: 'Suratlar siz tanlagan 1688 taklifining oʻz galereyasidan (aynan shu tovar), yetmasa oʻxshash 1688 takliflaridan olinadi. Internetdagi boshqa suratlar olinmaydi — ular koʻpincha boshqa tovar yoki brend boʻlib chiqadi. Har surat oq fonga oʻtkaziladi: foni oq boʻlsa faqat 3:4 oʻlchamga moslanadi, boʻlmasa fon olib tashlanadi; tovarning oʻzi oʻzgartirilmaydi. Suratlarni Uzumga oʻzingiz yuklaysiz.',
  studiyaYakun: 'Suratlar boʻyicha qolgan ishlar roʻyxatga yozildi: suratlar yetmasa — oʻzingiz suratga olish, «keyin» desangiz — suratlarni tanlash. Biz hozircha eslatma yubormaymiz.',
  kartochka: 'Matnni sunʼiy intellekt yozdi; u Uzum qoidalari boʻyicha tekshirildi, oʻzbekcha va ruscha matn maʼnosi ham solishtirildi. Kabinetga qoʻyishdan oldin oʻqib chiqing: tovaringizga mos kelmagan gapni tuzating.',
  yuklash: 'Kartochka va surat talablari — Uzum qoʻllanmasining 5-bobidan, omborga topshirish — 6 va 14-boblardan. Kartochkani kabinetda oʻzingiz yaratasiz; qadoqlash tavsiyasi tovar nomiga qarab taxminiy.',
  yuklashYakun: 'Qolgan ishlar roʻyxatga yozildi: «keyin» deganlaringiz va Uzum omborida qabulni kutish (Uzum qoidasidagi muddat bilan). Biz hozircha eslatma yubormaymiz — holatini shu chatga qaytib yozing.',
  sotuv: 'Oʻz kartochkangiz narxi, zaxirasi va sharhlari kuniga 3 marta oʻlchanadi; sotilgan dona — zaxira kamayishidan taxmin (Uzum buyurtma sonini bermaydi). Raqobatchi — 3-qadamda tanlangan Uzum tovari.',
  hisobot: 'Aniq summa — Uzum kabinetidagi komissioner hisobotidan (soliq hisoboti shu hujjatga asoslanadi). Bizning oʻlchovimiz — zaxira kamayishidan taxmin. Soliq foizi va muddatlar rasmiy manbalardan. Bu soliq maslahati emas.',
  hisobotHisob: 'Soliq xaridor toʻlagan toʻliq narxdan hisoblanadi (Uzum komissiyasi chegirilmaydi); foiz, ijtimoiy soliq va muddatlar rasmiy manbalardan. Bu soliq maslahati emas — aniq qoidani soliq organi yoki buxgalter tasdiqlaydi.',
  hisobotYakun: 'Ishlaringiz roʻyxatga yozildi: ijtimoiy soliq toʻlovi (muddati bilan) va keyinga qoldirilgan deklaratsiya. Keyingi oy rejasi — hozirgi sotuv tezligi va zaxiradan, bashorat emas.',
} as const;

export type IzohKaliti = keyof typeof IZOHLAR;

export const IZOHLAR_RU: Readonly<Record<IzohKaliti, string>> = {
  tannarx: 'Потолок — максимальная цена за 1 штуку в Китае, в сумах. Что не учтено, написано отдельно — с этим реальный потолок будет ниже.',
  xitoy: 'Варианты с 1688, найдены по фото товара. Цена в юанях, в сумах — по курсу Центробанка. «В потолке» — цена в сумах не выше потолка из шага 4; что в потолок не вошло (карго), написано на каждой карточке. Число заказов — всего на 1688.',
  buyurtma: 'Лист составлен из вариантов 1688, выбранных на шаге 5. Цена в юанях — цена на 1688, в сумах — по курсу Центробанка. Если ставки карго внесены, они добавляются; если нет — отдельно пишем, что карго не учтено. Мы не делаем заказ и не берём деньги — лист вы отправляете своему агенту.',
  yukKutish: 'Ожидание груза записано в ваш список дел. Напоминаний мы пока не присылаем — когда груз придёт, вернитесь в этот чат и сообщите.',
  rasmiy: 'Цифры взяты из официальных источников — рядом с каждой указан источник и дата проверки. Налог считается с полной цены, которую заплатил покупатель; комиссия Uzum не вычитается. Это не налоговая и не юридическая консультация.',
  rasmiyYakun: 'Отложенные дела записаны в список (со сроком, если он есть). Напоминаний мы пока не присылаем — когда будете готовы, вернитесь в этот чат, и продолжим.',
  qabul: 'Пересчитайте и осмотрите груз из Китая. Если чего-то не хватает или есть брак, претензия агенту попадёт в ваш список дел. Правила — из руководства Uzum (глава 6); совет по упаковке примерный, по названию товара.',
  qabulYakun: 'Претензия агенту по недостаче или браку записана в список дел. Напоминаний мы пока не присылаем.',
  studiya: 'Фото берутся из галереи выбранного вами варианта на 1688 (именно этот товар), если не хватает — из похожих вариантов на 1688. Другие фото из интернета не берём — часто это другой товар или бренд. Каждое фото переводится на белый фон: если фон уже белый — только подгоняется под 3:4, иначе фон убирается; сам товар не меняется. Фото на Uzum вы загружаете сами.',
  studiyaYakun: 'Оставшиеся дела по фото записаны в список: если фото не хватило — снять самим, если «позже» — выбрать фото. Напоминаний мы пока не присылаем.',
  kartochka: 'Текст написал искусственный интеллект; он проверен по правилам Uzum, смысл узбекского и русского текста сверен. Перед размещением в кабинете прочитайте и исправьте всё, что не подходит вашему товару.',
  yuklash: 'Требования к карточке и фото — из главы 5 руководства Uzum, сдача на склад — из глав 6 и 14. Карточку вы создаёте сами в кабинете; совет по упаковке примерный, по названию товара.',
  yuklashYakun: 'Оставшиеся дела записаны в список: то, что вы отложили, и ожидание приёмки на складе Uzum (со сроком по правилам Uzum). Напоминаний мы пока не присылаем — вернитесь в этот чат и напишите, как дела.',
  sotuv: 'Цена, остаток и отзывы вашей карточки измеряются 3 раза в день; проданные штуки — оценка по уменьшению остатка (Uzum не показывает число заказов). Конкурент — товар Uzum, выбранный на шаге 3.',
  hisobot: 'Точная сумма — из отчёта комиссионера в кабинете Uzum (налоговый отчёт опирается на этот документ). Наш замер — оценка по уменьшению остатка. Ставка налога и сроки — из официальных источников. Это не налоговая консультация.',
  hisobotHisob: 'Налог считается с полной цены, которую заплатил покупатель (комиссия Uzum не вычитается); ставка, социальный налог и сроки — из официальных источников. Это не налоговая консультация — точное правило подтвердит налоговая или бухгалтер.',
  hisobotYakun: 'Дела записаны в список: оплата социального налога (со сроком) и отложенная декларация. План на следующий месяц — по текущей скорости продаж и остатку, это не прогноз.',
};

/** Qayta buyurtma izohi oldidagi belgi (`suhbat-kod.ts`, 6-qadam): «2-partiya (qayta buyurtma). …». */
const PARTIYA = /^(\d+)-partiya \(qayta buyurtma\)\. /u;

/**
 * Kod kartasi izohining ruschasi. Notanish matn (eski jurnaldagi izoh) — `null`: sahifa
 * oʻzbekchasini koʻrsatadi. Qayta buyurtmaning «N-partiya» boshi ham oʻgiriladi.
 */
export function izohRu(uz: string): string | null {
  const m = PARTIYA.exec(uz);
  const asl = m ? uz.slice(m[0].length) : uz;
  const kalit = (Object.keys(IZOHLAR) as IzohKaliti[]).find((k) => IZOHLAR[k] === asl);
  if (kalit === undefined) return null;
  return m ? `Партия ${m[1]} (повторный заказ). ${IZOHLAR_RU[kalit]}` : IZOHLAR_RU[kalit];
}
