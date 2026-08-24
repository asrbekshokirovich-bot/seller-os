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

1. ~~`selleros` sxemasi boʻsh — skreyper bazaga hech qachon yozmagan.~~
   **✅ YOPILDI 2026-08-24** — skreyper GitHub Actions da oʻzi yurdi va
   oʻzi yozdi. `docs/B1-TEKSHIRUV.md` §1.1 ga qarang.
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

## 1-qadam formasi — parser ulandi, forma hali yoʻq

*Yangilandi 2026-08-24.* `profilOqi` endi ishlab chiqarishda
chaqiriladi: `/yonalishlar` uchi profilni soʻrov tanasidan oʻqiydi
(`apps/backend/src/app.ts`, `supabase/functions/selleros/index.ts`).
Uni `ISTISNO` roʻyxatidan chiqarish talabini qorovulning oʻzi
qoʻydi.

Qolgan ikkitasi — `bosProfil` va `javobSoni` — hamon oʻlik: ular
formaning oʻziga (boʻsh holat va "profil qanchalik toʻliq"
koʻrsatkichi) kerak, forma esa yoʻq (`apps/web` boʻsh).

Bu OʻLIK KOD va u `scripts/olik-kod.mjs` ning `ISTISNO` roʻyxatida
sababi bilan yozilgan. Roʻyxatga yozilishining maʼnosi shu: kod
jimgina emas, bilib turib oʻlik. Forma yozilgach istisno olib
tashlanadi.

Kerak: `apps/web` da 1-qadam formasi va javoblarni
`selleros.user_profiles` ga yozadigan uch.

## `/yonalishlar` 25 soniya ishlaydi

Jonli oʻlchov (2026-08-24, staging): 300 turkum, javob 7 KB,
**25.2 soniya**.

Sabab: `so_yonalish_nomzodlari()` har chaqiruvda butun perepis
kesimini qaytadan hisoblaydi — kuzatilayotgan 300 turkumdagi har
tovarning oxirgi oʻlchovi, doʻkonlar boʻyicha yigʻindi, top-3.
Foydalanuvchi uchun bu juda sekin.

Vaqt byudjeti 120 s qoʻyilgani shu sababdan: 8 s lik standart
chegara bilan u umuman ishlamasdi. Yaʼni hozirgi holat "ishlaydi",
"tez" emas — va buni yashirmaslik kerak.

Kerak: natijani kunlik jadvalda saqlash (`category_daily` yoki
alohida `yonalish_nomzodi`), uchi esa tayyor qatorni oʻqisin.
Perepis kuniga 4 marta yangilanadi, yaʼni real vaqtda hisoblashning
maʼnosi yoʻq.
