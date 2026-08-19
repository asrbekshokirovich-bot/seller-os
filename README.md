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
