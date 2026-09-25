# Chrome kengaytmasi — «Seller OS — Xitoydan top»

Uzum.uz tovar sahifasiga tugma qoʻshadi: bosilganda 1688 dan
oʻxshash tovarlarni qidiradi.

Doʻkonda: **Published — public**, 2026-09-02 dan beri. Provayder
ulangan versiya — **0.1.2** (2026-09-25), doʻkonga qayta yuklanishi kerak.

## 2026-09-05 — nashr qilingan, lekin hech qachon ishlamagan

Kengaytma uch kun ommaviy turdi va uning tugmasi **bir marta ham
natija bera olmasdi**. Toʻrtta uzilish bor edi, har biri
mustaqil ravishda yetarli:

| # | Uzilish | Dalil |
|---|---|---|
| 1 | `BACKEND_URL = 'https://api.selleros.uz'` — domen mavjud emas | DNS: `api.selleros.uz` ham, `selleros.uz` ham topilmadi |
| 2 | `/xitoy-qidiruv` uchi faqat Fastify'da (`app.ts:854`), u hech qayerda ishlamaydi | Edge Function: `{"xato":"topilmadi","yol":"/xitoy-qidiruv"}` |
| 3 | Manifestda `host_permissions` yoʻq | faqat `"permissions": ["activeTab"]` |
| 4 | Migratsiya `0046_selleros_xitoy.sql` bazaga **qoʻllanmagan** | `so_xitoy_limit` va `so_xitoy_kesh_ol` `pg_proc` da yoʻq, `selleros.xitoy_*` jadvallari yoʻq |

Yaʼni foydalanuvchi tugmani bosganda kod `catch` ga tushib
**«Tarmoq xatosi»** deb yozardi — har safar.

Zarar boʻlmadi: `Users —`, `Rating —`. Hech kim oʻrnatmagan.

**2-uzilish — takroriy naqsh.** Aynan shu xato 2026-09-02 da
monopoliya bayrogʻini bir kunga yoʻqotgan edi: kod Fastify'ga
yozilgan, chaqiruvchi esa Edge Function. Fastify serveri bu
loyihada **hech qayerda ishlamaydi** — u faqat `apps/backend` da
manba sifatida turadi.

## Qanday ishlaydi (0.1.1 dan keyin)

```
content.js  ──xabar──▶  background.js  ──HTTPS──▶  Edge Function
 (uzum.uz)              (kengaytma)                /xitoy-qidiruv
```

**Tarmoqqa faqat `background.js` chiqadi.** Manifest V3 da content
script sahifaning (uzum.uz) manshasidan soʻrov yuboradi va CORS ga
tushadi; servis ishchisi esa kengaytmaning oʻz manshasidan yuboradi
va `host_permissions` dagi manzillar uchun CORS dan ozod.

Sessiya tokeni `chrome.storage.local` da saqlanadi: har qidiruvda
yangi sessiya ochish bazada keraksiz qator yaratardi va kunlik limit
hisobi maʼnosini yoʻqotardi. 401 kelsa token bir marta yangilanadi.

Kalit — Supabase ning **ommaviy** (`publishable`) kaliti. Panel ham
shuni ishlatadi. `service_role` kengaytmaga hech qachon tushmaydi
(QOIDALAR.md, 3-qoida).

## 2026-09-25 — provayder ulandi (Apify)

Avval TMAPI ulangan edi; nazoratchi qarori bilan **Apify** aktori
`crawleast/1688-image-search-scraper` ga oʻtildi (kichik hajmda Apify
bepul rejasi — $5/oy — yetadi; narx $0.005/rasm + $0.01/yurish, 0 ta
natija pulsiz). Kalit — Apify API tokeni, Supabase secret `XITOY_API_KEY`
(nazoratchi `scripts/kalit-qoy.cmd` orqali qoʻyadi; chatga ham, repoga
ham tushmaydi). Aktor taʼrifi va sxemasi `packages/shared/src/xitoy.ts`
boshida yozilgan.

**Qidiruv RASM boʻyicha** va **ASINXRON** (30–90 s):

```
content.ts → background.ts → POST /xitoy-qidiruv {productId, rasmUrl}
                                 ← 202 {kutilmoqda, runId}
             background.ts → POST /xitoy-qidiruv {runId, rasmUrl}   (har 5 s)
                                 ← 202 kutilmoqda | 200 natija | 502 xato
```

`content.ts` sahifadagi birinchi `images.uzum.uz/<key>/…` rasmini
`rasmUrl` sifatida yuboradi (bazada rasm boʻlmasa ham ishlaydi).

**Rasm base64 bilan ketadi (2026-09-26).** Jonli oʻlchov: 1688 ning oʻz
JPEG rasmi URL bilan → 20 ta natija; Uzum rasmi URL bilan → 0 ta (ikki
tovar). Uzum CDN faqat WebP beradi (`.jpg` nomiga qaramay, JPEG
varianti yoʻq — serverdan oʻlchandi). Endi uch rasmni oʻzi yuklab
(`rasmYuklovchi`, ≤1 MB) aktorga `imagesBase64` bilan beradi; natija
`sha256Prefix16` / `img-N` bilan bogʻlanadi; aktor tashxisi (`tashxis`:
tur, bayt, yuklandimi) javobda — 0 natija sababi koʻrinadi. 202 javobida
`usul` (`base64`/`url`), `rasmTuri`, `rasmBayt`, `ogirildi` bor.

**WebP → JPEG (2026-09-26).** Jonli: oʻsha Uzum rasmi base64 WebP bilan →
0 ta; JPEG qilib → **20 ta**, aynan oʻsha tovar (run FFn17tXqPqgHZsyFz).
1688 WebP ni qabul qilmaydi. Endi yuklangan rasm WebP boʻlsa ochiq
rasm-proksi `images.weserv.nl` (`output=jpg&w=800`) orqali JPEG olinadi;
proksi yiqilsa WebP ketadi va `ogirildi: false` rostini aytadi. Kesh
kaliti — asl Uzum URL. Proksi uchinchi tomon: u yopilsa qidiruv 0 ga
qaytadi va tashxisda `webp` koʻrinadi — shunda oʻz konvertorimiz
(BACKLOG) kerak boʻladi.

Uch javoblari ATAYLAB farqlanadi:

| Holat | Javob |
|---|---|
| Yurish boshlandi / ishlayapti | 202 `kutilmoqda: true, runId` |
| Qidiruv boʻldi, topildi | 200 `natijalar: [...]`, `jami`, `limit` |
| Qidiruv boʻldi, 0 ta | 200 `natijalar: []`, `izoh: "1688 bu rasmga oʻxshash tovar bermadi."` |
| Qidiruv BOʻLMADI (balans, kalit, RISK_CONTROL, javob shakli buzuq, yurish yiqildi) | 502, `xato: "provayder: …"`; band qilingan limit qaytariladi |
| Vaqtinchalik tarmoq xatosi | 502, `qaytaUrinish: true` — kengaytma yana soʻraydi |
| Rasm kelmadi | 200 `izoh: "Tovar rasmi kelmadi …"` |
| Sessiya notoʻgʻri / baza javob bermadi | 401 / 503 — sanoq OʻLCHANMADI, nol deb olinmaydi |
| Kunlik limit (shaxsiy yoki umumiy `XITOY_LIMIT.jamiKunlik`) | 429, `sabab` bilan |

Kunlik sanoq (`so_xitoy_limit`) ILGARI hech qachon oshirilmasdi —
limit qogʻozda edi. Endi (0055) u yurish boshlanishidan OLDIN atomik
band qilinadi (poyga yoʻq), yurish yiqilsa qaytariladi, va UMUMIY
kunlik shift bor — sessiyalar anonim va cheksiz ochilgani uchun
shaxsiy limitning oʻzi xarajatni cheklamaydi (BACKLOG). Kesh
(`so_xitoy_kesh_yoz`) natija kelganda yoziladi; boʻsh natija ham
keshlanadi — u javob.

Jonli javob hali oʻlchanmagan: fikstura
`apps/backend/test/fixtures/apify-1688-rasm.json` aktor sxemasi
namunasi. Birinchi haqiqiy qidiruv `selleros.xitoy_kesh` ga tushadi —
fikstura oʻsha bilan almashtirilishi kerak.

## Doʻkonga yuklash

1. `cd apps/extension && npm run build`
2. `cd dist && zip -r ../selleros-extension-v<versiya>.zip .`
3. Chrome Web Store Developer Dashboard → Package → Upload new package.

`manifest.json` va `package.json` dagi versiya bir xil boʻlishi
kerak — doʻkon eskisini rad etadi.
