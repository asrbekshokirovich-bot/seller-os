# SXEMA.md — ma'lumot modeli

> Manba-haqiqat. Jadval qo'shilsa yoki o'zgarsa — **avval shu yerda**,
> keyin migratsiya. Qo'lda SQL yo'q.

Baza: Supabase Postgres. Sxema nomi: `selleros`.
PostgREST faqat `public` ni ko'radi, shuning uchun tashqariga chiqishi
kerak bo'lgan narsa `public.so_*` ko'rinishi/funksiyasi orqali beriladi.

---

## Nega `platform` ustuni birinchi kundan

Reja B6 da WB va Yandex qo'shilishini aytadi. Platformani keyin qo'shish —
har jadvalning kalitini qayta qurish degani. Hozir bitta ustun qo'shish
arzon, keyin qimmat. Shuning uchun u boshidan bor va hozircha faqat
`'uzum'` qiymati bilan to'ladi.

Id lar platformalar orasida to'qnashadi (Uzum 3,2 mln, WB 350 mln), shuning
uchun kalit har doim `(platform, external_id)`.

---

## 1. Katalog

### `platform`
Qaysi bozorlar bor. `code` (uzum/wb-uz/yandex), `name`, `base_url`,
`exact_orders` — bu platformada buyurtma **aniq** o'lchanadimi.

> Uzumda `Shop.ordersQuantity` hisoblagichi bor → buyurtma aniq.
> WB da bunday hisoblagich **yo'q** → faqat stok farqidan taxmin.
> Panel bu farqni ko'rsatishi shart, aks holda ikki xil ishonchlilikdagi
> raqam aralashib ketadi.

### `category`
Kategoriya daraxti. `(platform, external_id)` kalit, `parent_id` bilan
o'ziga havola. `name_uz`, `name_ru`.

### `shop`
Sotuvchi. `(platform, external_id)`, `name`, `rating`, `feedback_quantity`,
`official`.

> `official` — **ishonmang.** Uzum bu maydonni to'ldirmaydi (2026-08-19 da
> jonli tekshirilgan: Artel Brand Shop, ARTEL_OFFICIAL, Яшкино — hammasi
> `false`). Ustun NULL bo'la oladi (migratsiya `0009`) va hech bir filtr
> unga suyanmaydi. Saqlanishining yagona sababi — Uzum to'ldira boshlasa
> tayyor bo'lish. Uzum manbasi bu ustunga hech narsa yozmaydi: uning
> `false` i o'lchov emas, doimiy (63 113 do'konda 0 ta `true`).

> `rating` va `feedback_quantity` — **haqiqiy o'lchov**, `official` dan
> farqli. Jonli o'lchandi 2026-09-02, 70 ta tasodifiy do'kon: 60 tasida
> ikkalasi ham noldan katta, `null` bitta ham yo'q, reyting 2.5–5.0
> (mediana 4.7). Ular do'kondan do'konga o'zgaradi — demak o'lchov,
> doimiy emas.
>
> `rating` da **nol yo'q**: sharhi bo'lmagan do'konga Uzum `0.0` beradi va
> bu baho emas, bahoning yo'qligi. O'sha o'lchovda reyting nol bo'lgan
> 10 ta do'konning hammasida sharh ham nol edi, va sharhi bor do'konda
> reyting nol bo'lgan holat bitta ham chiqmadi. Skreyper shuning uchun
> uni `null` ga aylantiradi (`_dokon_reytingi`). `feedback_quantity` da
> esa nol **haqiqiy javob**: "hali sharh yo'q".
>
> Migratsiya `0050` gacha ikkalasi ham bo'sh edi — `rating` ustuni
> `0001` dan beri bor, lekin so'rovga qo'shilmagani uchun 4 297 do'konning
> 0 tasida qiymat bor edi. Hozircha hech bir filtr bunga tayanmaydi;
> nimaga ishlatilishi alohida qaror (`BACKLOG.md`).

### `product`
Tovar pasporti. `(platform, external_id)`, `title`, `shop_id`,
`category_id`, `brand` (**1-tuzoq uchun majburiy**), `weight_g`,
`volume_ml`, `oversized`, `first_seen_at` (**8-tuzoq: tovar yoshi**).

> `volume_ml` — `Sku.dimensions` medianasidan (mm → ml).
>
> 2026-08-25 da bu yerda "Uzum hech qachon bermaydi" deb yozgandim.
> XATO edi: faqat `Product` turini qaraganman, o'lchamlar esa
> `Sku` da. Ertasiga topildi va ustun to'la boshladi.
>
> Hajm Uzum logistika yig'imi uchun MAJBURIY: yig'im hajm bo'yicha
> hisoblanadi (FORMULA.md, 2-bo'lim).
>
> `oversized` — Uzumning o'z "katta hajmli" belgisi, hajm o'rniga
> ishlatiladigan yagona signal. `null` = o'lchanmagan; `false`
> "og'ir emas" degani EMAS (TUZOQLAR.md, 7-tuzoq).

## 2. Kunlik tarix

### `product_observation` — xom o'lchov

Har sweepda har tovar uchun bitta qator: `observed_at`, `price`, `stock`,
`reviews`, `rating`, `buyers_per_week`.

**Nega kunlik jadval yetmaydi:** sotuv qoldiq kamayishidan hisoblanadi.
Agar faqat kun oxiri saqlansa, kun ichidagi to'ldirish sotuvni yashiradi —
ertalab 100, kunduzi 20, kechqurun yana 100 bo'lsa, kunlik farq **nol**
chiqadi va 80 dona sotuv yo'qoladi.

**O'zgarmagan o'lchov yozilmaydi** (change-only). Narx ham, qoldiq ham,
sharh ham o'zgarmagan bo'lsa — yangi qator kerak emas. Zumsavdoda
o'lchandi: bu yillik hajmni 460 GB dan 14 GB ga tushiradi.

### `product_daily`
Har kuni har tovar uchun bitta qator: `price`, `stock`, `rating`,
`reviews`, `sellers_count`, `observed_at`, `window_hours`.

`window_hours` — o'lchov oynasi. Ikki o'lchov orasidagi masofa har xil
bo'lsa, ulardan chiqqan sotuv taxmini ham har xil bo'ladi va kunlarni
to'g'ridan-to'g'ri solishtirib bo'lmaydi.

### `sales_estimates`
Kunlik hisoblangan sotuv — **stok farqidan**.

```
sotilgan    ≈ Σ (stok kamayishi)   — kun ichidagi HAR qadam bo'yicha
keltirilgan ≈ Σ (stok o'sishi)     — alohida saqlanadi, AYIRILMAYDI
```

Ikkalasi `product_observation` dagi ketma-ket o'lchovlardan chiqadi.
Ayirilmasligi muhim: keltirilgan tovarni sotuvdan ayirsak, ko'p
to'ldiriladigan tovar "sotilmayapti" bo'lib ko'rinadi.

`certainty` ustuni: `exact` (Uzum hisoblagichi) yoki `approx` (stok farqi).
`method` — qaysi usul bilan chiqarilgani.

> Tovar kun ichida keltirilsa, sotuvning bir qismi ko'rinmay qoladi.
> Shuning uchun bu **taxminiy** va shunday deb belgilanadi.

### `sweep_log` — har aylanish natijasi

`started_at`, `finished_at`, `platform`, `requested`, `found`, `missing`,
`errors`, `written`, `stopped_reason`.

**Nega kerak:** sifat paneli "qamrov %, xato %, oxirgi yangilanish" ni
shundan o'qiydi. Yig'uvchi jimgina ishlamay qolsa, buni faqat shu jadval
ko'rsatadi — baza esa eski ma'lumot bilan to'g'ridek turaveradi.

**`missing` xato EMAS.** Id fazosining ~70% i bo'sh; agar u xatoga
qo'shilsa, xato darajasi 70% ga chiqadi va kill-switch bekorga ishlaydi.
Shuning uchun ular alohida ustunda.

## 3. Usta jadvallari

### `product_flags`
Tuzoq bayroqlari. `product_id`, `kind` (8 turdan biri), `severity`
(block/warn/note), `reason`, `evidence` (jsonb), `computed_at`.

`evidence` majburiy — foydalanuvchi "nega?" desa raqam ko'rsatiladi.

### `category_requirements`
Kategoriya talablari — **qo'lda to'ldiriladi** (B0 seed).
`marking_required`, `certificate_required`, `entry_cost_uzs`,
`entry_weeks`, `optimal_entry_uzs`, `seasonality` (12 oylik massiv).

### `user_profiles`

1-qadam javoblari (`docs/1-QADAM-SAVOLLAR.md`, tasdiqlangan 2026-08-24).
Oʻn ikki savolning har biri bitta ustun; `answers` (jsonb) xom javobni
saqlaydi.

| Savol | Ustun | Turi |
|---|---|---|
| 1 | `experience` | text[] |
| 2 | `family_field` | text[] |
| 3 | `interest` | text[] |
| 4 | `budget_uzs` | bigint |
| 5 | `capital_lock` | text (`3_oy`/`6_oy`/`1_yil`/`muddatsiz`) |
| 6 | `hours_per_week` | integer (0–168) |
| 7 | `city` | text |
| 8 | `online_experience` | text (`yoq`/`biroz`/`tajribali`) |
| 9 | `has_uzum_shop` | boolean |
| 10 | `imported_from_china` | boolean |
| 11 | `cert_experience` | boolean |
| 12 | `risk_preference` | text (`ehtiyotkor`/`tavakkal`) |

**Hech biri `NOT NULL DEFAULT` olmaydi — ataylab.** Ha/yoʻq
savollarini `boolean not null default false` qilish oson va xato
boʻlardi: javob bermagan odam "yoʻq" degan odamga aylanadi. Masalan
11-savol `false` boʻlsa, sertifikat bilan ishlagan odam ishlamagan deb
hisoblanadi va unga eng foydali yoʻnalish koʻrsatilmaydi.

`budget_uzs` da nol **haqiqiy javob**: "hozircha pulim yoʻq". `null`
esa "aytmadi". Boʻsh maydonni nolga aylantirish taqiqlanadi —
`Number("")` nolga teng boʻlgani uchun bu eng oson tushib qolinadigan
xato. Kod tomonida `packages/shared/src/profil.ts` va uning testlari
shuni ushlab turadi.

Oʻlchab tasdiqlangan (2026-08-24): hamma javobi `null` boʻlgan qator
yoziladi; notanish qiymat va manfiy byudjet rad etiladi; byudjet noli
qabul qilinadi.

### `recommendations`
Har tavsiya logi: kimga, nima, qaysi ball va bayroq bilan, qachon.
Javobgarlik uchun ham, o'rganish uchun ham. `score_breakdown` (jsonb) —
"nega bu tovar?" shu yerdan ochiladi.

### `id_frontier`
Id→sana kalibrovkasining kunlik o'lchovi. Har kuni Uzumdagi eng katta
javob beruvchi mahsulot id si yoziladi. **7+** kunlik qator to'plangach
`id_yoshi()` statik jadvaldan dinamik regressiyaga o'tadi — chegara
`0043` da, va u yerda nega ettita ekani yozilgan (ikkita nuqta ham
regressiya beradi, lekin bitta anomal kun uni buzadi).

`platform`, `sana` (unique), `max_id` (topilgan eng yuqori id),
`probe_steps` (nechta so'rov ketdi), `created_at`.

> **Qachondan beri to'ladi.** 2026-09-02 dan. Bundan oldin bu bo'lim
> "har kuni yoziladi" deb turgan, lekin jadval **bo'sh** edi: zondni
> chaqiradigan qadam hech bir workflow da yo'q edi, va yozish yo'lining
> o'zi ham buzuq edi — `selleros.frontier_yoz` `selleros` sxemasida,
> PostgREST esa faqat `public` ni ko'radi (`0051`).
>
> O'lchov ishlashi tasdiqlangan: quruq yurish 3 285 215 topgan, 23
> qadamda. Zumsavdoning mustaqil zondi o'sha kuni 3 284 229 bergan —
> ikki boshqa amalga oshirish 0,03% farq bilan bir xil javob beradi.

## 4. Biznes

`users`, `subscriptions`, `payments` — mijoz, tarif, to'lovlar, dunning.
`ai_usage` — har LLM javobining narxi (maqsad: tarif narxining <8% i).
`events` — mahsulot ichidagi harakatlar (KPI uchun).

`subscriptions` qatori **YOʻQ boʻlishi odatiy hol**: hamma bepuldan
boshlanadi va bu xato emas. `public.so_obuna(token)` shunchaki
qatorni beradi; uni qaysi rejaga oʻgirishni baza HAL QILMAYDI —
buni `packages/shared/src/tarif.ts` qiladi, chunki bir xil qoida
web, bot va kengaytmaga bitta joydan xizmat qilishi kerak.

`public.so_kpi_xom()` reja 8-boʻlimidagi KPI lar uchun XOM
sanoqlarni beradi — foiz ham, "yaxshi/yomon" ham unda yoʻq.
Sabab shu: bazada hisoblangan foizni testdan oʻtkazish uchun
har safar baza kerak boʻlardi.

## 5. Yozish qoidasi

- Yig'uvchi `service_role` bilan yozadi. Panel `anon` bilan **faqat
  o'qiydi** va faqat `public.so_*` orqali.
- O'zgarmagan o'lchov **yozilmaydi** (change-only). Kunlik jadval —
  yig'indi, xom o'lchov emas.
- Hisoblagich kamaysa (masalan sotuvchi tovarni almashtirgan) — bu
  anomaliya: sotuv `null` qo'yiladi va `anomaly` ga yoziladi. Manfiy sotuv
  hech qachon yozilmaydi.

## Versiya tarixi

| Versiya | Sana | O'zgarish |
|---|---|---|
| v1 | 2026-08-19 | Birinchi sxema (B0) |
| v2 | 2026-09-01 | `id_frontier` jadvali — id→sana kalibrovkasi uchun kunlik o'lchov |


## `sales_estimates` — sotuv qanday hisoblanadi

Uzum sotuv sonini bermaydi. `Product.ordersQuantity` bor, lekin u
yaxlitlangan va haqiqiy sotuvning ~55% ini ko'rsatadi — shuning uchun
**hech qachon so'ralmaydi**.

Sotuv **qoldiq farqidan** hisoblanadi:

```
sotilgan    = ketma-ket o'lchovlar orasidagi qoldiq KAMAYISHLARI yig'indisi
keltirilgan = o'sha o'lchovlar orasidagi qoldiq O'SISHLARI yig'indisi
```

**Ikkalasi alohida saqlanadi va bir-biridan ayirilmaydi.** Sinaldi:

| Qoldiq yo'li | To'g'ri javob | Sodda ayirish bersa edi |
|---|---|---|
| 100 → 95 → 98 → 90 | sotilgan **13**, keltirilgan **3** | 10 — ikkalasi ham yo'qoladi |

Ayirsak, "3 sotildi, 1 keltirildi" degan kun ikkala raqamini ham
yo'qotadi va tovari tugagan do'kon bilan ombori to'lgan do'kon bir xil
ko'rinadi.

### Bu TAXMIN, va u pastga qiyshiq

Ikki o'lchov orasida sotilib, keyin qayta to'ldirilgan tovar
ko'rinmaydi. Ya'ni raqam haqiqiydan **kam** bo'lishi mumkin, ko'p
bo'lishi mumkin emas. `certainty` ustuni kunlik o'lchov soniga qarab
belgilanadi: 3+ o'lchov — `yuqori`, 2 — `o'rta`, 1 — `past`.

### `stock` NULL va 0 — boshqa narsa

`0` — tovar tugagan (o'lchandi). `NULL` — qoldiq umuman o'lchanmagan
(yengil so'rov ishlatilgan). Aralashtirsak, o'lchanmagan tovar
"hammasi sotilgan" bo'lib chiqardi.

Qoldiq faqat **og'ir so'rovda** (`PRODUCT_QUERY_STOK`) keladi — u
javobni ~16 barobar shishiradi, shuning uchun faqat tanlangan
tovarlarga so'raladi.

### Zaxira yo'l ochiq belgilanadi

Qoldiq hali o'lchanmagan tovarda sotuv `buyers_per_week x 4.3` bilan
taxmin qilinadi. Bu **aniqroq emas**, shuning uchun javobda
`sotuvManbasi` maydoni bor: `olchandi` yoki `taxmin`. Foydalanuvchi
raqam qayerdan kelganini bilishi kerak.
