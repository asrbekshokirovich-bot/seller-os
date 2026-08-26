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

## Boʻsh jadvallar — holat (2026-08-25)

Reja bu jadvallarni majburiy deb yozgan. Qaysi biri toʻldi, qaysi
biri nimani kutmoqda:

| Jadval | Qator | Holat |
|---|---|---|
| `product_flags` | **319** | ✅ skreyper ishida hisoblanadi |
| `sales_estimates` | **6 186** | ✅ skreyper ishida hisoblanadi |
| `category_requirements` | **34** | ⚠️ mavsum 31, markirovka 3, qolgani boʻsh |
| `yonalish_nomzodi` | **300** | ✅ kesh |
| `recommendations` | **27** | ✅ anonim sessiya ulandi |
| `user_profiles` | **3** | ✅ anonim sessiya ulandi |
| `users` | **6** | ✅ birinchi tashrifda yaratiladi |
| `subscriptions` / `payments` | 0 | ❌ **Payme/Click tasdigʻi kerak** |
| `ai_usage` / `events` | 0 | ❌ `ANTHROPIC_API_KEY` kerak |

`product_flags` yozilishi IDEMPOTENT: har hisobda oʻsha tovarlarning
eski bayroqlari oldin oʻchiriladi. Tekshirildi — ikkinchi chaqiruvda
319 oʻchirildi, 319 yozildi.

Bugungi taqsimot:

| Tuzoq | Daraja | Soni |
|---|---|---|
| `seasonal` | warn | 283 |
| `closed_brand` | block | 36 |

Qolgan olti filtr maʼlumot kutmoqda — nimani kutayotgani
`/tuzoqlar` javobidagi `yetishmayotgan` da koʻrinadi.

## KPI paneli — nimasi oʻlchanadi (2026-08-25)

`GET /kpi` rejaning 8-boʻlimidagi oʻn bitta raqamni qaytaradi.
Bugun ulardan **uchtasi** oʻlchanadi, sakkiztasi yoʻq — va
har oʻlchanmagani `qiymat: null` va SABAB bilan qaytadi. Nol
qoʻyilmaydi: "bepul → pullik 0%" mahsulot haqidagi daʼvo
boʻlardi, holbuki bu kodning holati.

| KPI | Bugun | Nega |
|---|---|---|
| Usta → 3-qadam | 3 tadan 0 | namuna kichik (<20), darvozaga hisoblanmaydi |
| Skreyper qamrovi | oʻlchanadi | `so_quality` |
| Skreyper xatosi | oʻlchanadi | `so_quality` |
| Tavsiya qabuli | — | oqimda "tovar tanlandi" nuqtasi yoʻq (`events` boʻsh) |
| Bepul → pullik | — | `payments` boʻsh — toʻlov oqimi ishlamagan |
| Mijoz ketishi | — | toʻlov davri boshlanmagan |
| AI xarajat | — | `ai_usage` boʻsh, tarif narxi ham belgilanmagan |
| Tuzoq testi / Eval | — | CI da oʻlchanadi, ish vaqtida yozilmaydi |
| Qadam tezligi | — | soʻrov vaqti hech qayerga yozilmaydi |
| Avtoyechish | — | jonli rejim yoqilmagan |

Bitta anomaliya koʻrindi va yashirilmadi: **1 foydalanuvchi
3-qadamga profilsiz yetgan**. Sabab — `/tovarlar` profil talab
qilmaydi. U nisbat maxrajiga kirmaydi, lekin javobda `ogoh`
maydonida turadi.

## Tarif limiti — qoida bor, yoqilmagan

Reja (B3): "Bepulda Usta 2-qadamgacha, pullikda toʻliq — pilot
sinovi uchun flag bilan almashtiriladigan".

Qoida `packages/shared/src/tarif.ts` da va testlari yashil.
Yoqilishi uchun `TARIF_CHEKLOVI=1` kerak — **hozir oʻchiq va
shunday qolishi kerak**: toʻlov oqimi yoʻq, yaʼni yoqilsa hech
kim 3-qadamga oʻta olmasdi. Holati `/health` javobida
`live.tarifCheklovi` da koʻrinadi.

## Uzum sxemasi — nima BOR va nima YOʻQ (2026-08-25, introspeksiya)

GraphQL introspeksiyasi ochiq. Quyidagilar OʻLCHANDI, taxmin emas.

### `brand` — Uzumda umuman yoʻq

`Product` turida brend maydoni YOʻQ. 15 ta tovarning
`characteristics` ro'yxati ham qaraldi: faqat "Rang", "Razmer",
"Erkaklar poyabzali oʻlchami EUR" chiqdi — brend hech qayerda yoʻq.

Shuning uchun `product.brand` 6 025 tovardan atigi 10 tasida toʻlgan
va `brend_topish()` (doʻkon nomi tovar sarlavhasida uchraydimi)
181 tasini topadi — jami **3%**. 1-tuzoq (yopiq brend) shu 3% da
ishlaydi, qolganida "baholanmadi".

### `makeSearch` facets — brend roʻyxati SHU YERDA boʻlishi mumkin

`makeSearch(query: MakeSearchQueryInput!)` uchi bor va u
`facets { filter { id title type } buckets { total filterValue { id name } } }`
qaytaradi. `categoryId` qabul qiladi. Soʻrov SHAKLI tekshirildi va
toʻgʻri — u subgrafgacha yetdi.

LEKIN maʼlumot olinmadi: `search-gateway` bizning mijozga **429
Too Many Requests** qaytardi va 75 soniya kutgandan keyin ham
qaytardi. Yaʼni qidiruv uchi mahsulot uchidan qattiqroq cheklangan.

Kerak boʻlsa: soʻrovni `hurmat.py` orqali, sekin va kam sonli
oʻtkazish — alohida ish sifatida, supurish bilan bir vaqtda emas.
Ad-hoc urinish qilmang: bugun uchta ketma-ket soʻrovdan keyin
qulf tushdi.

Agar facet ochilsa, turkum boʻyicha HAQIQIY brend roʻyxati
chiqadi va `brend_topish` taxminidan voz kechish mumkin boʻladi.

### `makeSearchByImage` — B4 uchun tashqi kalit KERAK BOʻLMASLIGI mumkin

`makeSearchByImage(queryByImage: MakeImageSearchInput!)` mavjud;
kirishi `imageKey`, `pagination`, `filters`, `sort`.

Reja B4 "rasm boʻyicha 1688 dan tovar topish" ni talab qiladi va u
uchun tashqi rasm-qidiruv API kaliti kutilayotgan edi. Uzumning
oʻzida rasm qidiruvi bor — yaʼni kamida "shu rasmdagi tovar
Uzumda bormi va qanchaga sotilyapti" degan yarmi kalitsiz
ishlashi mumkin.

`imageKey` ni qanday olish kerakligi hali NOMAʼLUM — rasm avval
Uzumga yuklanadi shekilli. Tekshirilmagan; 429 sababli
toʻxtatildi.

### `oversized` — ulandi (0031)

Bu roʻyxatdagi yagona band bugun yopildi. Tafsilot: TUZOQLAR.md,
7-tuzoq.

## Wildberries komissiya jadvali bor — B6 uchun tayyor tursin (2026-08-26)

Nazoratchi `commission_1.xlsx` yubordi. U **Uzumniki emas,
Wildberriesniki** — ustun nomlaridan aniq koʻrinadi:

```
Самовывоз из магазина продавца (C&C) | Витрина (DBS)/Курьер WB (DBW)
Витрина экспресс (EDBS) | Маркетплейс (FBS) | Склад WB (FBW) | Бронирование
```

7 422 qator, 96 ta yuqori turkum, `Категория / Предмет` kesimida.

**Uzum komissiyasi sifatida YUKLANMADI.** Sabab raqamda:

| | Mediana | Oraliq |
|---|---:|---:|
| Uzum, FBO | 20% | 5 — 35 |
| WB, Склад WB (FBW) | **34%** | 0,5 — 43,5 |

Aralashtirsak har bir marja hisobi 14 punktga yanglishardi va
demping filtri FOYDALI tovarlarni "zararli" deb bloklardi.

**Qachon kerak boʻladi:** reja B6 — Wildberries va Yandex
qoʻshilganda. Bu blokda tashqi kalit talab qilinmaydi, yaʼni uni
istalgan payt boshlash mumkin. Jadval oʻsha kunga tayyor:
fayl nazoratchida, tuzilishi shu yerda yozilgan.

Yuklashda ikki shart: `platform = 'wildberries'` boʻlsin va
qaysi ustun olinayotgani (FBW yoki FBS) manbada yozilsin — WB da
ular 3—5 punktga farq qiladi.
