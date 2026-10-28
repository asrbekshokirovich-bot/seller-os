# Staging deploy

`main` ga har merge → `selleros` Edge Function avtomatik joylanadi va
tirikligi tekshiriladi.

Manzil: `https://duequijnnzcngzzvjqst.supabase.co/functions/v1/selleros`

| Yo'l | Nima qaytaradi |
|---|---|
| `/health` | tirikmi + jonli rejim flaglari |
| `/tuzoqlar` | tovar va turkumlarni filtrdan o'tkazadi |
| `/suhbat` | ssenariy suhbati: GET — tarix va savol, POST — javob |

## Kerakli sirlar (bir marta)

GitHub → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**:

| Nomi | Qayerdan olinadi |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com/dashboard/account/tokens → **Generate new token** |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API Keys → `anon` (ochiq kalit, sir emas) |

`service_role` kaliti **kerak emas va qo'yilmasin**. Edge Function uni
Supabase muhitidan o'zi oladi.

## Suhbat uchun ixtiyoriy sir

Edge Function da (Supabase → Edge Functions → **Secrets**, yoki `supabase secrets set`):

- `ANTHROPIC_API_KEY` — **Claude** (2026-10-19 dan asosiy; `llm-claude.ts`). Model —
  `CLAUDE_MODEL` (boʻlmasa `claude-sonnet-5-5`; 2026-10-20 gacha `claude-opus-5-5` edi —
  nazoratchi «tezroq va arzonroq» dedi). Narx, 1M token: Opus 5.5 — $4 kirish /
  $20 chiqish; Sonnet 5.5 — $2 / $10; Haiku 5.5 — $0.10 / $0.50. Kalit qoʻyilgach
  `/health` → `live.llmProvayder: "claude"`, `live.claudeModel` — qaysi model ishlayapti.
  Mijoz gapini **tushunish** (AI suhbat, JSON) — alohida, tezkor model: `CLAUDE_TUSHUN_MODEL`
  (boʻlmasa `claude-haiku-5-5`, 2026-10-26; `live.claudeTushunModel`). Yozish — `CLAUDE_MODEL` da.
  Suhbat va «Savol bering» javobi yozilgan sari chiqadi (oqim, `oqim.ts`): sayt `{oqim: true}`
  yuboradi, Edge `text/event-stream` qaytaradi, Vercel vositachisi uni ushlab turmay uzatadi.
- Gemini (`GEMINI_API_KEY`, `LLM_MODEL`, `LLM_ZAXIRA_MODEL`) va eski LLM sozlamalari (`LLM_AVVAL`,
  `LLM_ODAMLASHTIR`, `LLM_MUNOSABAT`) 2026-10-28 da olib tashlandi (nazoratchi, 4-taklif): ular endi
  oʻqilmaydi — sirlarda qolgan boʻlsa, oʻchirsa boʻladi.

**Kalit boʻlmasa ham suhbat ishlaydi**: AI yoʻq — kod jumlalari va bazadagi javoblar. Kalit
qoʻyilgach javob `tekshiruv.ts` darvozasidan oʻtadi. AI suhbatda (Claude) **tayyor javob yoʻq**
(nazoratchi, 2026-10-26: «AI hamma joyda javob bersin, tayyor javoblar shartmas»): darvoza
oʻtkazmasa yoki AI yiqilsa — vaqt qolguncha qayta (uch martagacha), baribir yozolmasa — qisqa
uzr va savolning oʻzi (`aiUzr`).

Boshqa ixtiyoriy sozlama:

| Sir | Nima qiladi |
|---|---|
| `AI_SUHBAT=0` | **AI suhbatni** oʻchiradi (2026-10-19, `ai-suhbat.ts`). Standart — Claude kaliti boʻlsa yoqilgan: mijoz yozganini AI tushunadi (bir gapdagi bir nechta javob ham), har xabarni AI yozadi, natijalarni tushuntiradi; 12 qadam va raqamlar — koddan. Oʻchsa — kod jumlalari va bazadagi javoblar (AI siz). `/health` → `live.aiSuhbat`. |

## Studiya (9-qadam) sirlari

`STUDIYA_URL` va `STUDIYA_KALIT` — Cloudflare Worker manzili va imzo
kaliti. Worker `main` deploy qadamiga **kirmaydi**: u alohida Cloudflare
hisobida, bir marta `scripts\studiya-ulash.cmd` bilan joylanadi
(docs/STUDIYA.md). Sirlar boʻlmasa suhbat ishlaydi — suratlar asl holida
chiqadi va shu aytiladi.

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
| `PANEL_KALITI` | oʻzingiz yasagan uzun tasodifiy satr | `/olchov` panelini qulflaydi |

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

## Oʻlchov paneli — `/olchov`

Reja 8-boʻlimidagi KPI lar. Sahifa **server komponenti**: API
kaliti brauzerga tushmaydi va sahifada mijoz JS i yoʻq.

### Panel qulflangan

Panel foydalanuvchi sonini, konversiyani va obuna holatini
koʻrsatadi — bular ichki raqamlar.

`PANEL_KALITI` **boʻsh boʻlsa panel hech kimga ochilmaydi** va
buni sahifaning oʻzi aytadi. Teskarisi — kalitsiz ochiq qolish —
eng yomon yechim boʻlardi: sozlash esdan chiqsa panel jimgina
omma uchun ochilib ketardi.

Kirilgach cookie da kalitning oʻzi emas, `sha256` i saqlanadi
(HttpOnly, `SameSite=Lax`, 12 soat, faqat `/olchov` yoʻlida).

### Panel nimani koʻrsatadi

Oʻn bitta KPI ning HAMMASI koʻrinadi. Oʻlchanmagani **nol emas** —
chiziqcha va sabab bilan chiqadi. Qator jadvaldan tushib
qolmaydi ham: yoʻqolgan qator "hammasi joyida" boʻlib koʻrinardi.

API javob bermasa boʻsh jadval koʻrsatilmaydi — xato yoziladi.
Boʻsh jadval "hamma KPI oʻlchanmagan" degan daʼvo boʻlardi,
holbuki bu ulanish xatosi.
