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
Sotuvchi. `(platform, external_id)`, `name`, `official` (rasmiy brend
do'konimi — **1-tuzoq uchun majburiy**), `rating`.

### `product`
Tovar pasporti. `(platform, external_id)`, `title`, `shop_id`,
`category_id`, `brand` (**1-tuzoq uchun majburiy**), `weight_g`,
`volume_ml`, `first_seen_at` (**8-tuzoq: tovar yoshi**).

## 2. Kunlik tarix

### `product_daily`
Har kuni har tovar uchun bitta qator: `price`, `stock`, `rating`,
`reviews`, `sellers_count`, `observed_at`, `window_hours`.

`window_hours` — o'lchov oynasi. Ikki o'lchov orasidagi masofa har xil
bo'lsa, ulardan chiqqan sotuv taxmini ham har xil bo'ladi va kunlarni
to'g'ridan-to'g'ri solishtirib bo'lmaydi.

### `sales_estimates`
Kunlik hisoblangan sotuv — **stok farqidan**.

```
sotilgan ≈ Σ (stok kamayishi)     — kun ichida
keltirilgan ≈ Σ (stok o'sishi)    — alohida saqlanadi, ayirilmaydi
```

`certainty` ustuni: `exact` (Uzum hisoblagichi) yoki `approx` (stok farqi).
`method` — qaysi usul bilan chiqarilgani.

> Tovar kun ichida keltirilsa, sotuvning bir qismi ko'rinmay qoladi.
> Shuning uchun bu **taxminiy** va shunday deb belgilanadi.

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
1-qadam javoblari: `experience`, `family_field`, `interest`, `budget_uzs`,
`hours_per_week`, `city`, `answers` (jsonb — xom javoblar).

### `recommendations`
Har tavsiya logi: kimga, nima, qaysi ball va bayroq bilan, qachon.
Javobgarlik uchun ham, o'rganish uchun ham. `score_breakdown` (jsonb) —
"nega bu tovar?" shu yerdan ochiladi.

## 4. Biznes

`users`, `subscriptions`, `payments` — mijoz, tarif, to'lovlar, dunning.
`ai_usage` — har LLM javobining narxi (maqsad: tarif narxining <8% i).
`events` — mahsulot ichidagi harakatlar (KPI uchun).

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
