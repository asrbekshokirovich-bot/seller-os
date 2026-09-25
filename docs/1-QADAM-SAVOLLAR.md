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

### Webda: faqat 3 savol, «Profilim» da savol yoʻq (2026-09-25)

Nazoratchi qarori: «suhbatda 3 savol yetadi, profilda savol
boʻlmasin — obuna, sozlamalar koʻrinib tursin». Qolgan 9 savol webda
**hozircha soʻralmaydi**. Matni `@selleros/shared` (`SAVOLLAR`) da
qoladi — oʻchirilmadi, keyin qayerda soʻralishi birga rejalashtiriladi.
Oqibati: oila sohasi (2) ham endi soʻralmaydi, yaʼni «Sizga moslik»
balliga faqat qiziqish va tajriba kiradi.

«Profilim» endi: hisob (mehmon; kirish tez orada), obuna (joriy —
Bepul; Pro/Biznes narxi `TARIF_NARXI` dan, toʻlov ulanmagani uchun
"tez orada"), sozlamalar (mavzu, til, javoblarni qayta berish).

### Oldingi qaror (tarix): 3 savol suhbatda, 9 tasi «Profilim» da (2026-09-24)

Nazoratchi qarori, yangi chat dizayni bilan birga. 12 savolning
hammasi QOLADI — faqat qayerda soʻralishi oʻzgaradi:

- **Suhbatda:** byudjet (4), qiziqish (3), tajriba (1) — shu tartibda.
  Uchtasi tasodifiy emas: ball profildan faqat byudjetni va soha
  javoblarini (`sohalar()`) oʻqiydi, yaʼni tavsiyani aynan shular
  oʻzgartiradi.
- **«Profilim» da:** qolgan 9 ta. Suhbat tugagach eslatma chiqadi va
  unda rost yoziladi: oila sohasi (2) ham ballga kiradi, qolganlari
  hozircha kirmaydi.

Byudjet uchun tezkor tugmalar bor (5 / 10 / 30 / 70 mln). Ular
**oraliq emas** — har biri aniq son yozadi, yaʼni "aniq summa"
qarori buzilmaydi. Maydonga istalgan summani yozish ham mumkin.

Tartib `apps/web/src/app/usta/page.tsx` dagi `SUHBAT_MAYDONLARI` da.
Savol matni va variantlari `packages/shared/src/savollar.ts` da
qoladi — bot va kengaytma bir xil matnni oladi.

---

## Keyingi ish

Bu fayl endi kodga kirishi mumkin. Kerak boʻladi:

- `selleros.user_profiles` ga javob maydonlari (hozir 0 qator)
- 4-savol uchun `null` va nol farqini saqlaydigan ustun turi
- javoblarni `FORMULA.md` 6-qismidagi profil ballariga aylantirish

Bular alohida ish sifatida boshlanadi — savollar matni tasdiqlangani
ularni avtomatik yozib qoʻymaydi.
