# 1-qadam savollari — TASDIQLANGAN (2026-08-24)

> **Holat: TASDIQLANDI.** Toʻrtta ochiq qaror nazoratchi tomonidan
> hal qilindi (pastdagi "Qabul qilingan qarorlar" ga qarang). Matn
> kodga kirishi mumkin.

Maqsad: 10–12 ta **oddiy** savol. Foydalanuvchi 2–3 daqiqada tugatsin.
Javoblar profil ballariga aylanadi (`FORMULA.md`, 6-qism).

Ohang: savol emas, suhbat. "Byudjetingizni kiriting" emas —
"Boshlash uchun qancha pul ajrata olasiz?"

---

| # | Savol | Javob turi | Nimaga ta'sir qiladi |
|---|---|---|---|
| 1 | Qaysi sohalarda ishlagansiz? | ko'p tanlov | `profil` balli |
| 2 | Oila a'zolaringiz nima bilan shug'ullanadi? (do'kon, ustaxona, dala…) | ko'p tanlov | `profil` — tanish yetkazuvchi, bilim, sotuv kanali |
| 3 | Qaysi sohada sotishni xohlaysiz? | ko'p tanlov | `profil` |
| 4 | Boshlash uchun qancha pul ajrata olasiz? | **aniq summa** (ixtiyoriy) | 2-qadam: yo'nalish va miqdor |
| 5 | Bu pul qancha vaqt bog'lanib qolishi mumkin? | tanlov | risk darajasi |
| 6 | Haftasiga necha soat vaqtingiz bor? | tanlov | xizmat taklifi (o'zi/biz qilamiz) |
| 7 | Qaysi shahardasiz? | tanlov | kargo, ombor, yetkazish |
| 8 | Ilgari onlayn sotganmisiz? | tanlov | tajriba darajasi |
| 9 | Uzumda do'koningiz bormi? | ha/yo'q | token rejimi (B5) |
| 10 | Xitoydan tovar keltirganmisiz? | ha/yo'q | 4-qadam murakkabligi |
| 11 | Sertifikat/markirovka bilan ishlaganmisiz? | ha/yo'q | 5-tuzoq: kirish qiyinligi |
| 12 | Nimadan ko'proq qo'rqasiz: tovar qolib ketishidanmi yoki kam foydadanmi? | tanlov | konservativ vs tavakkal standart |

---

## Qabul qilingan qarorlar

| Savol | Qaror |
|---|---|
| 12 ta savol koʻpmi? | **Yoʻq — hammasi qoladi.** |
| Byudjet: oraliqmi, aniq summami? | **Aniq summa.** |
| 12-savol (qoʻrquv turi) kerakmi? | **Ha, qoladi.** |
| Ruscha matn kim yozadi? | **Hozircha faqat oʻzbekcha.** |

### Aniq summa — bitta shart bilan

Aniq summa yaxshiroq hisoblanadi, lekin uning maʼlum xavfi bor: koʻp
odam aniq raqam yozishdan qochadi yoki tasodifiy raqam kiritadi.
Notoʻgʻri aniqlik esa aniqsizlikdan yomonroq — chunki u ishonchli
koʻrinadi.

Shuning uchun maydon **majburiy emas**. Toʻldirilmasa `null` yoziladi,
**nol emas**. QOIDALAR.md 4-qoidasi shu haqda: nol "pulim yoʻq" degan
javob, `null` esa "aytmadi". Ularni aralashtirsak, javob bermagan odam
puli yoʻq odamga oʻxshab qoladi va tavsiya notoʻgʻri chiqadi.

Byudjet `null` boʻlsa 2-qadam miqdorni hisoblamaydi — "byudjet
koʻrsatilmagan" deb yozadi va yoʻnalishni baribir beradi.

### Faqat oʻzbekcha — nima yoʻqotamiz

Rus tilida gaplashadigan sotuvchilar birinchi versiyada qatnasha
olmaydi. Bu ongli tanlov: savollar hali oʻzgaradi va ikki tilni
barobar olib borish har oʻzgarishni ikki barobar qiladi. Matn
barqarorlashgach ruschasi qoʻshiladi.

---

## Keyingi ish

Bu fayl endi kodga kirishi mumkin. Kerak boʻladi:

- `selleros.user_profiles` ga javob maydonlari (hozir 0 qator)
- 4-savol uchun `null` va nol farqini saqlaydigan ustun turi
- javoblarni `FORMULA.md` 6-qismidagi profil ballariga aylantirish

Bular alohida ish sifatida boshlanadi — savollar matni tasdiqlangani
ularni avtomatik yozib qoʻymaydi.
