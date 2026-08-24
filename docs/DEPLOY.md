# Staging deploy

`main` ga har merge → `selleros` Edge Function avtomatik joylanadi va
tirikligi tekshiriladi.

Manzil: `https://duequijnnzcngzzvjqst.supabase.co/functions/v1/selleros`

| Yo'l | Nima qaytaradi |
|---|---|
| `/health` | tirikmi + jonli rejim flaglari |
| `/tuzoqlar` | tovar va turkumlarni filtrdan o'tkazadi |

## Kerakli sirlar (bir marta)

GitHub → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**:

| Nomi | Qayerdan olinadi |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com/dashboard/account/tokens → **Generate new token** |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API Keys → `anon` (ochiq kalit, sir emas) |

`service_role` kaliti **kerak emas va qo'yilmasin**. Edge Function uni
Supabase muhitidan o'zi oladi.

## Sir yo'q bo'lsa nima bo'ladi

Deploy ishi **qizil bo'ladi** va aniq xabar beradi:

```
::error::SUPABASE_ACCESS_TOKEN yo'q.
Qo'shish: GitHub → Settings → Secrets and variables → Actions
```

Bu ataylab. Jimgina o'tkazib yuborilsa, staging eskiradi va buni hech
kim sezmaydi — QOIDALAR.md 8-bo'limi aynan shuni taqiqlaydi.

**Testlar (CI) baribir yashil bo'ladi** — faqat deploy qizil. Ya'ni
repo buzilmagan, darvoza esa haqiqatan yopilmagan.

## Nega Supabase, nega Render emas

Backend mantiqi (`tahlil.ts`, `sifat.ts`) Fastify'ga bog'lanmagan —
sof TypeScript. Shuning uchun u Edge Function ichida ham ishlaydi va
alohida hosting hisobi kerak emas.

Manba bitta joyda turadi: `packages/shared` va `apps/backend`.
`supabase/functions/tayyorlash.mjs` ularni Edge Function papkasiga
ko'chiradi va import kengaytmasini `.js` → `.ts` ga almashtiradi
(Deno shuni talab qiladi).

Nusxa manbadan ajralib ketmasligini CI tekshiradi:

```
node supabase/functions/tayyorlash.mjs --tekshir
```

Ikki nusxa bo'lgan joyda ular albatta bir kun farq qiladi. Bu tekshiruv
shuni oldini oladi.

---

# Sayt (`apps/web`) — Vercel

Edge Function API ni beradi, `apps/web` esa **odam koʻradigan
sahifani**. Ikkalasi alohida joylanadi: API Supabase da, sahifa
Vercel da.

## Ikkita yoʻl, bitta loyiha

| Yoʻl | Nima | Qayerdan |
|---|---|---|
| `/` | sotuv sahifasi | `dizayn/ZumSavdo-standalone.html` dan yasaladi |
| `/usta` | 1-qadam formasi | `src/app/usta/page.tsx` |

Sotuv sahifasi Next komponenti EMAS: u dizayn vositasidan chiqqan
178 KB lik tayyor HTML. `dizayn/qurish.mjs` uni ochib, matn
tuzatishlarini qoʻllab `public/sotuv.html` ga yozadi; `/` esa unga
yoʻnaltiriladi.

Chiqish **omborda saqlanmaydi** — `npm run build` uni har safar
qaytadan yasaydi. Sabab: hosila fayl manbadan ajralib ketishi
mumkin va buni hech narsa koʻrsatmaydi. Manba bitta —
`dizayn/`.

`qurish.mjs` dagi har matn tuzatishi topilmasa **xato beradi va
qurishni toʻxtatadi**. Dizaynning yangi versiyasi kelib matn
koʻchsa, biz buni CI da bilamiz — sayt esa tuzatishsiz chiqmaydi.

## Vercel loyihasini ulash (bir marta)

1. vercel.com → **Add New** → **Project** → `asrbekshokirovich-bot/seller-os`
2. **Root Directory**: `apps/web` ni tanlang.

   *Bu qadam eng koʻp adashtiradigan joy.* Ildizni oʻzgartirmasangiz
   Vercel monorepo ildizida `next` qidiradi va topmaydi.
3. **Framework Preset**: Next.js (oʻzi aniqlaydi).
4. **Build va Install buyruqlarini QOʻLDA OʻZGARTIRMANG.** Ular
   `apps/web/vercel.json` da yozilgan: ikkalasi ham monorepo
   ildiziga chiqadi, chunki `@selleros/shared` ishchi maydon paketi
   va uni faqat ildizdan oʻrnatib boʻladi.

## Muhit oʻzgaruvchilari

Vercel → Project → **Settings** → **Environment Variables**:

| Nomi | Qiymati | Nega |
|---|---|---|
| `SELLEROS_API_URL` | `https://duequijnnzcngzzvjqst.supabase.co/functions/v1/selleros` | API manzili |
| `SELLEROS_API_KEY` | Supabase → Settings → API Keys → `anon` | Faqat oʻqish uchun |

`service_role` kaliti **bu yerga qoʻyilmaydi**. Sahifa bazaga
toʻgʻridan-toʻgʻri tegmaydi — hammasi Edge Function orqali
(reja, 5-boʻlim).

`NEXT_PUBLIC_` prefiksi ham **qoʻyilmaydi**: kalit server tomonda,
`/api/yonalishlar` marshrutida ishlatiladi va brauzerga tushmaydi.

## Sozlanmagan boʻlsa nima boʻladi

Sahifa ochiladi va ishlaydi, lekin natija oʻrniga shunday deydi:

```
Hozircha koʻrsatadigan narsa yoʻq.
Sabab: API manzili sozlanmagan.
```

Boʻsh roʻyxat koʻrsatilmaydi. Boʻsh roʻyxat "sizga mos yoʻnalish
yoʻq" degan **daʼvo** boʻlardi, sozlanmaganlik esa boshqa narsa —
va foydalanuvchi qaysi biri ekanini bilishi kerak (QOIDALAR.md,
4-qoida).
