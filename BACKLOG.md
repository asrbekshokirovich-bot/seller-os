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

## ~~1-qadam formasi~~ — YOZILDI, lekin javob SAQLANMAYDI

*2026-08-24.* `apps/web` da Next.js sahifasi bor: 12 savol, natija
roʻyxati va "Nega bu ball?" jadvali. Brauzerda tekshirildi —
sahifa 2434 px, 12 ta savol, 5 ta natija kartochkasi, jadvalda
uchala holat ham koʻrinadi (hisobga olindi / maʼlumot yoʻq /
bu bosqichda hisoblanmaydi).

**QOLADI: javoblar `selleros.user_profiles` ga yozilmaydi.**

Hozir profil har soʻrovda tanadan keladi va soʻrov tugagach
yoʻqoladi. Yaʼni foydalanuvchi sahifani yangilasa hammasini
qaytadan toʻldiradi, va ikkinchi qadamga (miqdor, tovar tanlash)
oʻtganda profil qayerdan olinishi noaniq.

Buning sababi ochiq: **autentifikatsiya yoʻq.** Foydalanuvchini
aniqlaydigan narsa boʻlmagani uchun javobni kimga bogʻlab yozish
kerakligi ham maʼlum emas. Uni "bor" deb koʻrsatish oʻrniga
shunday qoldirildi.

Kerak: auth (B3), soʻng `/profil` uchi va sahifada saqlash.

## 1-qadam parseri — ulandi

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

## ~~`/yonalishlar` 25 soniya ishlaydi~~ — TUZATILDI

*2026-08-24.* Jonli oʻlchov 25.2 s koʻrsatgan edi. Sabab:
`so_yonalish_nomzodlari()` har chaqiruvda butun perepis kesimini
qaytadan hisoblardi, holbuki perepis kuniga 4 marta yangilanadi.

Ikkiga boʻlindi:

| | Nima qiladi | Qancha | Qachon |
|---|---|---|---|
| `so_yonalish_yangila()` | ogʻir hisob, keshga yozadi | **34.9 s** | skreyper bilan, kuniga 3 marta |
| `so_yonalish_nomzodlari()` | tayyor qatorni oʻqiydi | **0.032 s** | har soʻrovda |

780 barobar tez. Javob endi massiv emas, obyekt: `hisoblandi`,
`yoshi_soat` va `royxat`. Eskirish KOʻRINIB turadi — 24 soatdan
oshsa `kesh_eskirgan: true` qaytadi. Eskirgan kesh javobni
toʻxtatmaydi (kechagi raqam bugungi tavsiyani deyarli
oʻzgartirmaydi), lekin u aytiladi.

Qoladi: yangilash qadami `if: always()` bilan qoʻyilgan, yaʼni
oʻlchov yiqilsa ham kesh yangilanadi. Bu ataylab — kechagi keshni
bugungi nosozlik tufayli eskitib yuborishning foydasi yoʻq.

## `optimal_entry_uzs` va `seasonality` — eshik ochildi, xona boʻsh

*2026-08-24.* Bugungacha `category_requirements.csv` yozilgan va
ustunlari hujjatlashtirilgan edi, lekin uni bazaga OLIB KIRADIGAN
hech narsa yoʻq edi. Yaʼni odam bilimi uchun yoʻl umuman
qurilmagan.

Endi bor: `node supabase/seed/yukla.mjs`. CSV shakli har CI
yugurishida tekshiriladi.

**Lekin maʼlumotning oʻzi hamon yoʻq**, va buni oʻzim toʻldirib
qoʻya olmayman:

| Ustun | Nega boʻsh | Kim toʻldiradi |
|---|---|---|
| `optimal_entry_uzs` | "Turkumga kirish uchun normal summa" — bu **bozor bilimi**, oʻlchov emas. Uni oʻlchangan raqamdan chiqarish uchun 30 kunlik sotuv kerak, u esa hali yoʻq. | Nazoratchi |
| ~~`seasonality`~~ | **31 turkumga yozildi (2026-08-25)** — mulohaza, oʻlchov emas. Faqat mavsumi jismonan/taqvim boʻyicha aniq turkumlar. Oʻlchangan egri chiziq 2027-avgustdan oldin boʻlmaydi. | ✅ qisman |
| `certificate_required` | Huquqiy hujjat kerak. Nom boʻyicha taxmin qilish 9 tadan 5 tasida notoʻgʻri chiqqan edi. | Nazoratchi |

Shu sababdan `yetadi` maydoni hamon `null` va `mavsum` balli
hamon hisoblanmaydi. Interfeys buni yashirmaydi: "Byudjet
yetadimi — nomaʼlum" deb yozadi.

**Bu raqamlarni oʻzim toʻqib qoʻyish oson boʻlardi va u eng
zararli yechim boʻlardi:** taxminiy summa ishonchli koʻrinadi va
odam unga qarab pul tikadi.

Hozir CSV da 3 qator bor — VMQ 148 boʻyicha qoʻlda tekshirilgan
markirovka talablari, huquqiy havolasi bilan.
