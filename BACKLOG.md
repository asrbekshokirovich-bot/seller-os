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

## 2-qatlam namunasi monopoliya uchun juda yupqa

493 turkumdan atigi 8 tasida 8 va undan koʻp sotuvchi oʻlchangan.
Qolgan 485 tasida filtr baholay olmaydi.

Hozircha zarari yoʻq — konsentratsiya perepisdan hisoblanadi va u
toʻliq. Lekin talab ballari 2-qatlamdan chiqadi, yaʼni monopol
turkumdagi tovar bahosi baribir yupqa maʼlumotga tayanadi.

Kerak: 2-qatlamni turkum boʻyicha muvozanatlash — hozir u eng koʻp
sotiladigan tovarlar tomon qiyshiq.

## B1 tekshiruvi ochgan bandlar (2026-08-20)

Toʻliq hisobot: `docs/B1-TEKSHIRUV.md`.

1. `selleros` sxemasi boʻsh — skreyper bazaga hech qachon yozmagan.
2. Filtrlarni ishlab chiqarish kodi chaqirmaydi; `TovarHolati` ni
   bazadan yigʻadigan qatlam yoʻq.
3. Fikstura yasash skriptlari bazaga ulanmaydi — maʼlumot qoʻlda
   koʻchirilgan, perepis tugagach yana qoʻlda yangilash kerak.
4. `npm run lint` hech narsa qilmaydi — CI darvozasi boʻsh.
5. Eval testlari yoʻq (QOIDALAR §5 merge uchun talab qiladi).
6. `minSellerCoveragePercent = 50` atigi 7 ta oʻlchov nuqtasiga tayanadi.

## Qoldiq faqat 6 ta tovarda o'lchangan

`so_rollup_days` ishlaydi, lekin hozircha 0 qator chiqaradi: har
tovarda bitta qoldiq o'lchovi bor, farq yo'q. Ikkinchi o'lchovdan
keyin sotuv hisoblana boshlaydi.

Kerak: 2-qatlam tsikli kuniga kamida 2 marta o'lchasin (`certainty`
`o'rta` bo'lishi uchun), imkoni bo'lsa 3 marta (`yuqori`).
