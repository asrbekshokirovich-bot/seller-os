# Seller OS

Sarmoya Ustasi — O'zbekiston marketpleyslarida savdo boshlamoqchi
bo'lganlar uchun 6 qadamli yo'l: profil → yo'nalish → tovar va miqdor →
Xitoydan topish → buyurtma va kargo → do'kon va sotish.

Farqi: **tavsiyani kod beradi, AI faqat tushuntiradi.** Quruq statistika
yolg'on gapiradi, shuning uchun har tavsiya 8 ta hiyla-filtrdan o'tadi.

## Avval shularni o'qing

| Fayl | Nima |
|---|---|
| [`QOIDALAR.md`](QOIDALAR.md) | **Agent konstitutsiyasi.** Har sessiya shundan boshlanadi |
| [`SXEMA.md`](SXEMA.md) | Ma'lumot modeli |
| [`FORMULA.md`](FORMULA.md) | Ball tizimi (v0 — tasdiq kutmoqda) |
| [`TUZOQLAR.md`](TUZOQLAR.md) | 8 hiyla-filtr |
| [`BACKLOG.md`](BACKLOG.md) | Yangi g'oyalar — joriy bosqichga emas |

## Tuzilishi

```
apps/backend     Fastify — yagona kirish nuqtasi
apps/web         Next.js — Usta (uz/ru)
apps/extension   Chrome MV3 — Uzum sahifasida "Xitoydan top"
apps/scraper     Python — yig'uvchi, "hurmat rejimi"
packages/shared  Ball, tuzoq turlari, chegaralar — BITTA joyda
supabase/        Migratsiyalar va seed
```

Web, bot va kengaytma bazaga to'g'ridan-to'g'ri tegmaydi — hammasi
backend API orqali. Sabab: tavsiya mantiqi bitta joyda tursin.

## ZumSavdo va SellerOS — BITTA mahsulot

Buni birinchi oʻqing. Agent bu yerda ikki marta adashgan
(2026-08-24 va 2026-08-25) va ikkalasida ham xato bir xil boʻlgan:
ikkita nom ikkita mahsulot deb tushunilgan.

| Nom | Nima |
|---|---|
| **ZumSavdo** | Mahsulotning nomi. Foydalanuvchi shuni koʻradi. |
| `seller-os` | Shu mahsulotning kod ombori. Ichki nom. |
| `zumsavdo` sxemasi | Bazadagi Uzum xom oʻlchovi (~1,5 mln tovar) |
| `selleros` sxemasi | Bazadagi Usta maʼlumoti — profil, tavsiya, obuna |

**Bitta sayt, bitta Vercel loyihasi:** `apps/web`.
`/` sotuv sahifasi · `/usta` Usta · `/olchov` ichki panel.
Alohida "ZumSavdo sayti" degan narsa YOʻQ.

### Dizayn — `apps/web/dizayn/`

Nazoratchi bergan qadoq (`ZumSavdo-standalone.html`) **toʻrtta
ekran**: `1 Landing`, `2 Demo chat`, `3 Marketpleys`, `4 1688 sim`.
Bu **butun ilovaning** dizayni, faqat sotuv sahifasi emas.

Yaʼni `/usta` ham, keyingi qadamlar ham shu koʻrinishda boʻlishi
kerak: koʻk `#1A3A6C`, yashil `#D4E94C`, "QADAM" nuqtalari, chat
pufakchalari. Oʻz uslubini oʻylab topish — xato.

Ekranlarni koʻrish: `qurish.mjs` dagi 7-bosqich (ekran
almashtirgichini olib tashlash) oʻtkazib yuborilsa, qadoq ichida
toʻrtala ekran ham ochiladi.

## Ishga tushirish

```bash
cp .env.example .env     # to'ldiring — `.env` omborga tushmaydi
npm install
npx vitest run           # Node testlari
cd apps/scraper && pip install -e '.[dev]' && python -m pytest -q
```

## Bosqichlar

`B0` poydevor · `B1` ma'lumot + birinchi filtrlar · `B2` Usta 1–3-qadam ·
`B3` to'lov va kirish · `B4` Xitoy qadami · `B5` kartochka va xizmatlar ·
`B6` kengayish (WB, Yandex)

Har bosqich **darvoza** bilan qulflanadi: testdan o'tmasa keyingisi
boshlanmaydi.

---

Ichki loyiha.
