# BACKLOG.md

> Yangi g'oya shu yerga tushadi — joriy bosqichga emas.
> Qamrov shishishi (scope creep) rejadagi eng katta xavflardan biri.

Format: `— [kim taklif qildi] g'oya. Nega keyinroq.`

## Ko'rib chiqilmagan

*(bo'sh)*

## Rad etilgan

*(bo'sh)*

## Id → sana kalibrovkasini yangilash

Kalibrovka 526 mahsulotning eng eski sharh sanasidan chiqarilgan
(korrelyatsiya 0.81). Ikki kamchiligi bor:

1. Eng eski sharh ≈ mahsulot paydo bo'lgan vaqt, lekin ANIQ emas —
   sotilmagan mahsulotda sharh umuman yo'q, ya'ni tanlov sotiladigan
   mahsulotlar tomon qiyshiq.
2. 3 000 000 dan yuqori id lar uchun nuqta yetarli emas; u yerdagi
   brendlar `baholanmadi` oladi.

Yaxshilash: frontier zondini KUNLIK yozib borish. 30 kundan keyin
id/kun tezligi to'g'ridan-to'g'ri o'lchanadi va sharhga bog'liq
bo'lmaydi.

## Tuzoq roʻyxati faqat 1-tuzoqni qamraydi

`traps.json` da 53 qator bor, lekin hammasi yopiq brend (`closed_brand`)
boʻyicha. 6-tuzoq (monopoliya) uchun bironta qator yoʻq — yaʼni darvoza
testi u filtrni umuman tekshirmaydi.

Kerak: monopol kategoriyalar uchun ham mustaqil belgi topish va
`tuzoq_nomzodlari.sql` ga qoʻshish.
