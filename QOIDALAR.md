# QOIDALAR.md — agent konstitutsiyasi

> Repo ildizida turadi. Har sessiya shu fayldan boshlanadi: kontekst
> yo'qolsa ham qoidalar yo'qolmaydi.

Bu fayl **majburiy**. Undagi qoida bilan topshiriq ziddiyatga tushsa —
qoida ustun turadi, va ziddiyat ochiq aytiladi.

---

## 1. Rollar

| Agent (kod yozuvchi) | Nazoratchi (odam) |
|---|---|
| Butun kod bazasi va testlar | Kalitlar, pul, imzo, **qaror** |
| Migratsiya, seed, hujjat | PR ni merge qilish, prod deploy |
| Ball formulasini **taklif qilish** | Uni **tasdiqlash** |
| Tuzoq qoidalarini yozish | Tuzoq-tovar ro'yxatini berish |

Agent hech qachon: prod ga deploy qilmaydi, sirlarni yozmaydi, merchant
arizasi yubormaydi, shartnoma imzolamaydi.

## 2. Manba-haqiqat

Uchta fayl mahsulotning mantig'ini belgilaydi. Kod ular bilan zid bo'lsa —
**kod noto'g'ri**.

- `SXEMA.md` — ma'lumot modeli. Jadval qo'shilsa avval shu yerda.
- `FORMULA.md` — ball tizimi. Versiyalanadi, o'zgarishi tasdiq talab qiladi.
- `TUZOQLAR.md` — 8 hiyla-filtr: signal, chegara, tizim harakati.

## 3. Buzilmaydigan uchta qoida

**Tavsiyani KOD beradi, AI faqat tushuntiradi.**
Yo'nalish, tovar, miqdor — deterministik ball + filtrlar. Bir xil kirish →
har doim bir xil javob. LLM o'zi tovar tavsiya qilmaydi va SQL yozmaydi —
faqat tayyor funksiyalarni chaqiradi.

**Sirlar faqat `env` da.**
Kodda, logda, testda, commit xabarida — hech qachon. `.env` gitignore da.

**Yangi g'oya `BACKLOG.md` ga.**
Joriy bosqichga emas. Qamrov shishishi (scope creep) — eng katta xavf.

## 4. Halollik

Bu mahsulot odamlarning puliga ta'sir qiladi. Shuning uchun:

- Har raqam yonida **davr** va aniqlik izohi: "taxminiy (±3–5%)".
- **Kafolat so'zi taqiq.** "Albatta foyda qilasiz" — hech qachon.
  To'g'ri ohang: "statistika shuni ko'rsatadi, qaror sizniki".
- Tuzoq belgisi **yashirilmaydi** — tushuntiriladi.
- O'lchov yo'q bo'lsa **chiziqcha**, nol emas. Nol — "sotuv bo'lmagan"
  degan javob; chiziqcha — "javob yo'q". Ikkisi boshqa narsa.
- To'qilgan ma'lumot **hech qachon** bazaga yozilmaydi va ekranda
  ko'rsatilmaydi. Namuna generatori yo'q.

## 5. Ish tartibi

- Vazifa birligi — kichik ticket + qabul mezoni.
- Har o'zgarish — alohida PR + testlar + tavsif.
- Filtr va formulalar — **avval test, keyin kod** (TDD).
- Merge sharti — CI yashil: lint + testlar + tuzoq 100% + eval ≥90%.
- Sxema o'zgarishi — **faqat migratsiya orqali**. Qo'lda SQL yo'q.
- Har merge → staging ga avtomatik deploy. Prod — faqat odam tugmasi.

## 6. Bosqich darvozalari

B0 → B6 ketma-ket. Darvozadan **testsiz o'tilmaydi**. Agent bosqichni
istagancha tez o'tishi mumkin, lekin mezonni chetlab o'tolmaydi.

Kutish holati to'xtash emas: to'lov sandbox da, kargo ariza rejimida,
kengaytma sideload da ishlayveradi. Jonli rejim **flag** bilan yoqiladi.

## 7. Skreyping — "hurmat rejimi"

- Faqat **ochiq** sahifalar. Shaxsiy ma'lumot — faqat token bilan.
- Tezlik: boshida 2–4 so'rov/soniya. Xato ko'paysa — avtomatik
  sekinlashish va kill-switch.
- To'liq katalog aylanishi — tunda; kunduzi top kategoriyalar.
- Himoyani ataylab buzish (CAPTCHA aylanib o'tish, bloklashni chetlash) —
  **qilinmaydi**. Platforma yopiq bo'lsa, u yopiq deb yoziladi.

## 8. Jim o'lim taqiqlanadi

Filtr yoki hisob "bilmadim" qaytarishi TO'G'RI. Lekin u shu holatda
**abadiy** qolib ketishi mumkin va buni hech kim sezmaydi: xato
yozilmaydi, log to'lmaydi, test qizarmaydi, hujjatda "tayyor" deb
turaveradi.

Ikki marta sodir bo'lgan (2026-08-19):
- `shopOfficial` — Uzum hech qachon `true` bermaydi. 1-tuzoq shunga
  suyanardi, ya'ni hech qachon ishlamasdi.
- `sellersCount` — do'konlar aro tovar moslash yo'q, maydon hech qachon
  to'lmaydi. Filtr haqiqiy ma'lumotda doim "baholay olmadim" derdi.

Ikkalasida ham testlar yashil edi. **Sabab: kirish ma'lumotini test
muallifi o'zi yozgan.** Qo'lda yozilgan fikstura — tilak, o'lchov emas.

Shuning uchun:

1. Har filtrning darvoza testi **bazadan olingan haqiqiy o'lchov** bilan
   ishlaydi. Qo'lda yozilgan fikstura mantiqni sinash uchun qoladi,
   lekin darvozani u yopmaydi.
2. Kirish maydoni haqiqiy ma'lumotda kamida bir marta o'lchanishi shart.
   O'lchanmasa — CI yiqiladi. Ataylab o'lchanmaydigan maydon testdagi
   `OLCHANMAYDI` ro'yxatiga **sababi bilan** yoziladi. Jimlik emas,
   ongli qaror.
3. Filtr darvoza ro'yxatida kamida bir marta bayroq qo'yishi shart.
   Hech qachon ishlamaydigan filtr — o'lik kod.

## 9. Ushbu faylni o'zgartirish

Faqat nazoratchi tasdig'i bilan, alohida PR da, sababi yozilgan holda.
