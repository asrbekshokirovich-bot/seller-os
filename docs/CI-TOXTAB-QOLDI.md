# CI 2026-08-20 dan beri ishlamayapti

**Bu kod muammosi EMAS.** Ishlar umuman boshlanmayapti.

## Dalil

| Oʻlchov | Qiymat |
|---|---|
| Oxirgi yashil run | #11, 2026-08-19 12:11 |
| Undan keyin | #12–#17 — hammasi qizil |
| Ish davomiyligi | **3 soniya** |
| `runner_id` | **0** — runner ajratilmagan |
| Loglar | HTTP 404 — yoʻq |

Uch soniyada, runner-siz, logsiz tugagan ish — test yiqilgani emas.
Kod umuman yuklanmagan.

Ikkala workflow ham (CI va Deploy) bir xil holatda. Yaʼni
`deploy.yml` dagi "sir yoʻq" xabari ham **chiqmagan**.

## Ehtimoliy sabab

**GitHub Actions daqiqalari tugagan yoki spending limit $0 da.**
`seller-os` — yopiq ombor, yopiq omborlar daqiqa sarflaydi.

Tekshirish: https://github.com/settings/billing

## Uch yoʻl

| Yoʻl | Narxi | Izoh |
|---|---|---|
| Limitni koʻtarish | pullik | darhol ishlaydi |
| Keyingi oyni kutish | bepul | daqiqalar tiklanadi |
| Omborni **ochiq** qilish | bepul | ochiq omborlarda Actions cheksiz |

## Uchinchi yoʻl xavfsizmi — TEKSHIRILDI

Butun git tarixi (17 commit) skanerlandi:

| Naqsh | Natija |
|---|---|
| `sb_secret_...` | ✅ topilmadi |
| `eyJhbGciOi...` (JWT) | ✅ topilmadi |
| `SUPABASE_SERVICE_ROLE_KEY=...` | ✅ topilmadi |
| parol / api_key naqshlari | ✅ topilmadi |
| `.env` fayllari | ✅ hech qachon commit qilinmagan |

Baza tomoni:

| Tekshiruv | Natija |
|---|---|
| anon → `selleros` sxema | yopiq |
| anon → `zumsavdo` sxema | yopiq |
| anon → `selleros`/`zumsavdo` jadval huquqi | 0 |
| anon chaqiradigan funksiya | 11 ta, hammasi faqat oʻqiydigan `zs_*` (panel uchun) |

> **Bu jadval avval toʻliq emas edi.** Yuqoridagi qator ilgari
> «anon → jadval huquqi: 0» deb yozilgandi. Oʻlchov `selleros` va
> `zumsavdo` sxemalari boʻyicha qilingan, lekin gap barcha jadvallar
> haqidagidek yozilgan edi. `public` sxemasi tekshirilmagan — va
> teshik oʻsha yerda chiqdi.
>
> 2026-08-23 da toʻliq tekshirilganda maʼlum boʻldi: `public` dagi
> toʻqqizta panel koʻrinishiga `anon` uchun `SELECT` emas, `ALL`
> berilgan ekan (Supabase zavod `alter default privileges` sozlamasi).
> Beshtasi avtomatik yangilanuvchi — yaʼni ochiq anon kaliti bilan
> perepis maʼlumotini oʻchirish mumkin edi. Oʻlchab tasdiqlandi, keyin
> yopildi: zumsavdo omborida
> `20260823090000_zumsavdo_anon_faqat_oqiydi.sql`, va holat endi
> `cd ingest && npm run xavfsizlik` buyrugʻi bilan oʻlchanadi.
>
> Dars QOIDALAR.md §8 ning oʻzi: «yopiq» degan xulosa oʻlchov
> qamragan joygacha amal qiladi, undan nariga emas.

Omborda loyiha manzili (`duequijnnzcngzzvjqst`) bor, lekin u
panelning ochiq URL'ida ham koʻrinadi va sir emas. Yozish huquqi
faqat `service_role` da, u esa omborga hech qachon tushmagan.

**Xulosa: omborni ochiq qilish xavfsiz.** Qaror sizniki.

## CI kodni qabul qilarmidi

CI ning uchala ishi ham mahalliy toʻliq ishlatildi (2026-08-23):

```
npm run lint                          ✅
npm run typecheck                     ✅
npx vitest run                        ✅  166 test
tayyorlash.mjs --tekshir              ✅
python -m pytest                      ✅  29 test
hujjatlar mavjudligi                  ✅
sir qidiruvi                          ✅
```

Yaʼni kod tayyor. Faqat GitHub uni ishga tushirmayapti.
