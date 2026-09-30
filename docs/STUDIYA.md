# Studiya — 9-qadam: tovar suratlari oq fonda, Uzumga moslab

Nazoratchi topshirigʻi (2026-09-29): *"studiyaning vazifasi — tovar
suratlari orqa foni oq rangda, Uzumga moslab qilib bersin"*. Qarorlar:

| Savol | Qaror (nazoratchi) |
|---|---|
| Fonni kim olib tashlaydi | **Cloudflare** (hozircha) — Images binding, `segment=foreground` |
| Hamma surat kesiladimi | **Yoʻq** — foni allaqachon oq surat kesilmaydi, faqat 3:4 ga moslanadi |
| Suratlar qayerdan | "1688 + internet", "iloji boricha studiyaga ishi tushmasin" → bugun **tanlangan 1688 taklifining galereyasi** (pastda: nega internet emas) |
| 8/10 tartibi | **Tuzatildi** — yetkazma faqat kartochkadan keyin (Uzum jarayoni) |

### Nega internet (Google Lens) emas — jonli sinov 2026-09-30

Birinchi versiya tanlangan 1688 rasmi bilan Google Lens `visual_matches`
qidirardi (Apify `johnvc~google-lens-api`). Ikki sumka uchun 17 va 14 ta
natija keldi — koʻpi **boshqa tovar**: Jacquemus, Louis Vuitton, Tod's,
Coach, Dooney & Bourke sumkalari, DHgate "designer" nusxalari, qizil
gilamdagi aktrisa surati. Bunday surat kartochkada chalgʻituvchi (Uzum
5.7) va brend/mualliflik huquqini buzadi. `exact_matches` esa toʻliq
suratni bermaydi (aktor hujjati: `image` — null). Shuning uchun manba —
sotuvchi AYNAN oladigan tovarning oʻz suratlari: 1688 taklif galereyasi.

## Oqim

```
8. Qabul (yuk keldi, sanaldi)
   └─ kod `studiya`  ──►  Apify `crawleast~1688-image-search-scraper`, `offerIds` ─┐  asinxron,
                          (hamma tanlangan taklif BITTA yurishda) → `images`       │  20–60 s,
                          kesh `selleros.xitoy_kesh`, kalit `1688-tafsilot:<id>`    │  `kutish`
      ◄── `tekshir` (har 8 s) ──────────────────────────────────────────────────┘
   nomzodlar: tanlangan taklif surati → uning galereyasi → oʻxshash takliflar, 8 tagacha
   (bir xil fayl turli manzil bilan kelsa — bitta; `rasmKaliti`)
   har biriga imzolangan manzil:  STUDIYA_URL/?r=auto&src=<asl>&s=<HMAC>
9. savol «Yetarlimi?» — Yetarli / Yetmadi (oʻzim suratga olaman) / Qayta qidir / Keyinroq
   └─ kod `studiya_yakun` → ochiq ish ("yetmadi", "keyin")
10. Yuklash: kartochka → qadoq va yorliq → yetkazish → taymslot → topshirish
```

Brauzer suratni **Worker** dan oladi; tanlanganlar bitta faylga
(bitta — JPEG, koʻp — ZIP, `apps/web/src/lib/zip.ts`) yuklanadi. Tizim
suratni Uzumga **yuklamaydi** — sotuvchi kartochkaga oʻzi qoʻyadi.

## Worker (`apps/studiya-worker`)

`GET /?r=auto|pad|cut&src=<rasm>&s=<imzo>` → **1200 × 1600 JPEG** (3:4),
sifat 90, oq fon, har tomonda 48 px oq chet. Uzum talabi (0059, qoʻllanma
5.7): kamida 750 × 1000, vertikal 3:4, 5 MB gacha — chiqish talabdan katta.

| Rejim | Nima qiladi |
|---|---|
| `auto` | 48 × 48 xom nusxa olinadi; chet halqasining ≥ 90 % i oq boʻlsa → `pad`, aks holda → `cut` |
| `pad` | oq chet qirqiladi (`trim.border`), 1104 × 1504 ichiga sigʻdiriladi, 48 px oq chet |
| `cut` | `segment=foreground` (BiRefNet) fonni shaffof qiladi, shaffof chet qirqiladi, keyin `pad` |

Tovarning oʻzi (rang, yorugʻlik) oʻzgartirilmaydi — Uzum 5.7 filtr va
chalgʻituvchi sunʼiy intellekt tasvirini taqiqlaydi.

**Imzo.** `s = HMAC-SHA256(STUDIYA_KALIT, "<r>\n<src>")`, hex. Imzosiz yoki
notoʻgʻri soʻrov — 403, manba yuklanmaydi, Cloudflare limiti sarflanmaydi.
Imzoni faqat Edge Function beradi (`studiyaManzili`, `packages/shared/src/studiya.ts`).

**Kesh.** Natija Worker Cache API da 30 kun. Cloudflare bir xil
(manba + parametr) ni oyiga bir marta hisoblaydi.

`GET /salomat` → `{"ok":true,"kalit":true}` (kalit qoʻyilganmi — qiymatsiz).

## Narx va limit (oʻlchandi 2026-09-29, developers.cloudflare.com/images/pricing)

| | |
|---|---|
| Free | oyiga **5 000** noyob oʻzgartirish; oshsa — yangi oʻzgartirish **9422** xato qaytaradi, **pul olinmaydi** |
| Paid | 5 000 dan keyin **$0.50 / 1 000** noyob oʻzgartirish |
| Hisob | bir xil manba + bir xil parametr oy ichida bir marta; Images binding ham shu hisobga kiradi |

Bitta surat `auto` da **2** oʻzgartirish (zond + natija). Bir tovar — 8
tagacha surat → ~16. Free: taxminan **300 tovar / oy**. Limit tugasa
surat kartada "Studiya bu suratni ololmadi" deb chiqadi (jim oʻlim yoʻq).

**1688 taklif tafsiloti (Apify, `offerIds` rejimi)** — yetkazilgan har
tafsilot **$0.003**, yetkazilmagani bepul; bitta yurish 20 tagacha taklif,
aktor kiritmasida xarajat shifti `maxTotalChargeUsd` ≥ 0.04 (aktor README,
build 0.3.30, 2026-09-30). Alohida kunlik limit yoʻq: tafsilot faqat
5-qadamda tanlangan taklif uchun va 72 soatlik kesh bilan soʻraladi, 1688
qidiruvi esa kunlik limitli (0055). «Qayta qidir» 72 soat ichida keshdan
oladi — qayta pul ketmaydi. Tafsilotda video (`videoUrl`) boʻlsa kartada
havola chiqadi.

## Joylash (bir marta)

1. **Nazoratchi:** Cloudflare hisobi (bepul) → terminalda:
   ```bash
   npx wrangler@4 login
   ```
   brauzer ochiladi, ruxsat beriladi. Birinchi marta `workers.dev`
   subdomen soʻralsa — Cloudflare dashboard → Workers & Pages da nom tanlanadi.
2. `scripts\studiya-ulash.cmd` (ikki marta bosish) — skript:
   Worker ni joylaydi, tasodifiy 32 baytli `STUDIYA_KALIT` yasaydi va uni
   Worker ga (`wrangler secret bulk`) hamda Supabase ga (`STUDIYA_KALIT`,
   `STUDIYA_URL`) **fayl orqali** beradi, fayllarni oʻchiradi, qiymatni
   ekranga chiqarmaydi; oxirida `/salomat` ni tekshiradi.
3. `0059` migratsiyasi qoʻllanadi (nazoratchi "qoʻlla" deganda).

Ulanmagan holat ham ishlaydi: `STUDIYA_URL` yoki `STUDIYA_KALIT` yoʻq
boʻlsa suhbat suratlarni **asl holida** koʻrsatadi va buni aytadi
(`sozlangan: false`).

## Tekshirish

```bash
npx vitest run apps/studiya-worker packages/shared/test/studiya.test.ts apps/backend/test/studiya-kod.test.ts
```

Jonli: 9-qadamga yetgan suhbatda surat toʻri chiqadi; bitta suratni
yangi oynada ochib, javob sarlavhalarini koʻring — `X-Studiya-Rejim`
(`pad`/`cut`), `X-Studiya-Oq` (chet oqligi), `X-Studiya-Manba` (asl oʻlcham).

## Bilingan cheklovlar (BACKLOG)

- Suratdagi **xitoycha yozuv** avtomatik aniqlanmaydi — Uzum faqat
  oʻzbek/rus matnga ruxsat beradi; sotuvchi tanlashda koʻradi.
- Sotuvchi **oʻz suratini** yuklab studiyadan oʻtkaza olmaydi ("Yetmadi"
  — ochiq ish).
- **Oʻxshash taklif** surati boshqa 1688 sotuvchisiniki — kartada
  "tovar aynan bir xilligini tekshiring" deb yoziladi. Uzum saytidan
  surat olinmaydi (2.12 — boshqa doʻkon suv belgisi hujjatsiz bloklanadi).
