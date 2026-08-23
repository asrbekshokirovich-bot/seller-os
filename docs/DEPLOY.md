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
