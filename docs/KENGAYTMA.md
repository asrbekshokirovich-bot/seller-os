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

## 2026-09-25 — provayder ulandi (TMAPI)

`XITOY_API_KEY` Supabase secret sifatida qoʻyildi (nazoratchi,
`scripts/kalit-qoy.cmd` orqali — kalit chatga ham, repoga ham
tushmaydi). Provayder — TMAPI, hujjatning Markdown eksporti
`tmapi.top/docs/ali/search/search-items-by-image-url.md`:

```
GET  https://api.tmapi.top/1688/search/image?img_url=…&page_size=20&sort=default
POST https://api.tmapi.top/1688/tools/image/convert_url   {"url": "…"}
sarlavha: apikey: <kalit>
```

**Qidiruv RASM boʻyicha**, tovar id si boʻyicha emas. Bazada tovar
rasmi hali yoʻq (BACKLOG: "Tovar rasmi"), shuning uchun `content.ts`
sahifadagi birinchi `images.uzum.uz/<key>/…` rasmini olib
`rasmUrl` sifatida yuboradi. Uzum rasmi Ali platformasiniki emas —
uch avval `convert_url` bilan oʻgiradi, keyin qidiradi
(`packages/shared/src/xitoy.ts`, `xitoyQidir`).

Uch endi uch xil javob beradi va ular ATAYLAB farqlanadi:

| Holat | Javob |
|---|---|
| Qidiruv boʻldi, topildi | `natijalar: [...]`, `jami`, `limit` |
| Qidiruv boʻldi, 0 ta | `natijalar: []`, `izoh: "1688 bu rasmga oʻxshash tovar bermadi."` |
| Qidiruv BOʻLMADI (provayder xatosi, balans, tarmoq, javob shakli buzuq) | HTTP 502, `xato: "provayder: …"`; band qilingan limit qaytariladi |
| Rasm kelmadi | `izoh: "Tovar rasmi kelmadi …"` |
| Sessiya notoʻgʻri / baza javob bermadi | 401 / 503 — sanoq OʻLCHANMADI, nol deb olinmaydi |
| Kunlik limit (shaxsiy yoki umumiy `XITOY_LIMIT.jamiKunlik`) | 429, `sabab` bilan |

Kunlik sanoq (`so_xitoy_limit`) ILGARI hech qachon oshirilmasdi —
limit qogʻozda edi. Endi (0055) u provayderdan OLDIN atomik band
qilinadi (poyga yoʻq), provayder yiqilsa qaytariladi, va UMUMIY
kunlik shift bor — sessiyalar anonim va cheksiz ochilgani uchun
shaxsiy limitning oʻzi xarajatni cheklamaydi (BACKLOG). Kesh
(`so_xitoy_kesh_yoz`) ham shu yerda yoziladi; boʻsh natija ham
keshlanadi — u javob. Provayder element berib, birortasi oʻqilmasa —
bu xato (502), kesh yozilmaydi.

Jonli javob hali oʻlchanmagan: fikstura
`apps/backend/test/fixtures/tmapi-1688-rasm.json` hujjat namunasi.
Birinchi haqiqiy qidiruv `selleros.xitoy_kesh` ga tushadi — fikstura
oʻsha bilan almashtirilishi kerak.

## Doʻkonga yuklash

1. `cd apps/extension && npm run build`
2. `cd dist && zip -r ../selleros-extension-v<versiya>.zip .`
3. Chrome Web Store Developer Dashboard → Package → Upload new package.

`manifest.json` va `package.json` dagi versiya bir xil boʻlishi
kerak — doʻkon eskisini rad etadi.
