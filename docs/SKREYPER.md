# SKREYPER — Uzum maʼlumotini yigʻish (SellerOS tomoni)

*Yangi odam uchun: nima yigʻiladi, qayerda, qanday ishlaydi, qanday tekshiriladi va oʻzgartiriladi.
Holat — 2026-10-20. Butun katalogni yigʻadigan VPS tizimi va perepis — yopiq `zumsavdo` omborida
(`docs/HANDOFF.md` — avval shuni oʻqing, PR #9 shoxchasida). Bu hujjat — SellerOS ning oʻz kuzatuvi.*

## 1. Bir qarashda

- **Nima:** Uzumdagi **6 000 tovar** — 300 ta eng katta turkumdan 20 tadan, turkum ichida talab boʻyicha
  20 boʻlakka boʻlib (har boʻlakdan bittadan) tanlangan namuna. Har biri **kuniga 3 marta** oʻlchanadi:
  narx, qoldiq (SKU lar yigʻindisi), reyting, sharhlar, «N kishi shu hafta sotib oldi» belgisi, oʻlcham.
- **Nega namuna:** tuzoq filtrlari turkum medianasini talab qiladi (`categoryMedianUnits30d`); faqat
  eng koʻp sotiladiganlarni olsak mediana shishadi (0013 izohi). 6 000 — kuniga uch marta sigʻadigan hajm.
- **Qayerda ishlatiladi:** 2-qadam (yoʻnalishlar, `so_yonalish_yangila` keshi), 3-qadam (katalog,
  `so_tovar_royxati`), sotuv bahosi (qoldiq farqidan, `so_rollup_sales`), tuzoq bayroqlari.
- **Qayerda ishlaydi:** GitHub Actions (`.github/workflows/skreyper.yml`) — bu ombor ochiq, daqiqalar bepul.
  Yozadi: Supabase, `selleros` sxemasi. Oʻqiydi: `zumsavdo` sxemasi (perepis — boshqa ombor yozadi).
- **2026-10-20 dan:** uzoq tugagan tovarlar har ishda avtomatik **sotuvdagisi bilan almashtiriladi** (6-boʻlim).

## 2. Umumiy xarita

```
Uzum GraphQL (graphql.uzum.uz, anonim token id.uzum.uz)
 ├─ zumsavdo ombori (YOPIQ)
 │    ├─ VPS uzluksiz yigʻuv — butun katalog → VPS Postgres `zs.*` (Supabase ga YOZMAYDI, ega qarori #9)
 │    ├─ perepis.yml (GitHub Actions) → Supabase `zumsavdo.product`, `product_census`, `crawl_cursor`
 │    └─ sweep.yml   (GitHub Actions) → Supabase `zumsavdo.product_observation`, `product_day`
 └─ seller-os ombori (OCHIQ, shu)
      ├─ skreyper.yml — 6 000 tovar → Supabase `selleros.*`   ← shu hujjat
      ├─ turkum.yml   — turkum hajmi (Uzumning oʻz soni)       → `selleros` (so_turkum_hajmi_yoz)
      └─ sayt (Next.js + Edge) — `selleros.*` va `zumsavdo.*` ni oʻqiydi
```

**Diqqat (2026-10-20):** perepis va sweep 2026-10-13 / 10-02 dan beri ISHLAMAYAPTI — yopiq omborda
GitHub ning bepul daqiqalari oy boshida ~2 kunda tugaydi (perepis ishi ~4 soat). Batafsil va variantlar —
`zumsavdo/docs/HANDOFF.md`. SellerOS kuzatuvi bundan TOʻXTAMAYDI; faqat yangi nomzodlar eski perepisdan olinadi.

## 3. Ish oqimlari

### `skreyper.yml` — asosiy (cron `0 4,12,20 * * *` UTC = 09:00, 17:00, 01:00 Toshkent; qoʻlda ham)

GitHub rejalashtirilgan ishlarni **soatlab kechiktiradi** (2026-10-20: 04:00 dagi ish 09:18 da boshlangan).
Shoshilinch boʻlsa — Actions → «Skreyper (SellerOS)» → *Run workflow*. `concurrency: skreyper` —
ikki ish bir vaqtda yurmaydi, navbatga turadi. Ish chegarasi 180 daqiqa.

| # | Qadam | Nima qiladi | Yiqilsa |
|---|---|---|---|
| 1 | Sir borligini tekshirish | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` bormi | ish toʻxtaydi |
| 2 | Frontier zondi | eng katta mahsulot id si (binary search, ≤25 soʻrov) → `selleros.id_frontier` (`id_yoshi()` uchun) | qizil |
| 3 | **Kuzatuv roʻyxatini yangilash** | `python -m selleros_scraper almashtir` — 6-boʻlim | `continue-on-error`: oʻlchov baribir boʻladi |
| 4 | **Oʻlchash** | `python -m selleros_scraper --kuzatuv --stok` — faol 6 000 tovar, ogʻir soʻrov (qoldiq bilan), 500 talab `so_ingest_batch` | qizil |
| 5 | Haqiqatan oʻlchandimi | `so_olchov_soni` — bugun 0 ta yozilgan boʻlsa qizil («xatosiz, lekin hech narsa» — QOIDALAR §8) | qizil |
| 6 | Yoʻnalish keshini yangilash | `so_yonalish_yangila` (~35 s) — 2-qadam nomzodlari | `if: always()` |
| 7 | Sotuvni hisoblash | `so_rollup_sales` — oxirgi 3 kun, qoldiq farqidan | `if: always()` |
| 8 | Turkum raqobatini yangilash | `so_turkum_raqobati_yangila` — monopoliya tuzogʻi | `if: always()` |
| 9 | Brend qamrovini yangilash | `so_brend_yangila` — 3 mln perepis nomini tokenlaydi | **HAR ISHDA QIZIL** — 9-boʻlim |
| 10 | Tuzoq bayroqlarini hisoblash | Edge `bayroqlarni-hisobla` | `if: always()` |

### Boshqalar
- `turkum.yml` — kuniga bir marta (06:30 UTC): 300 turkumning Uzumdagi tovar soni (`selleros_scraper.turkum`). Perepisdagi son Uzumdagidan 2–5 barobar farq qiladi (`manbalar/turkum_hajmi.py` izohi).
- `skreyper-sinov.yml` — qoʻlda: berilgan id oraligʻini quruq yurish, keyin yozish (jonli sinov).
- `qorovul.yml` — har soat: maʼlumot yoshi chegarada (`scripts/malumot-yoshi.mjs`) — oʻlchov toʻxtasa qizaradi.

## 4. Kod xaritasi (`apps/scraper/selleros_scraper/`)

| Fayl | Nima |
|---|---|
| `__main__.py` | CLI: `--kuzatuv --stok` (oʻlchash), `--id/--dan/--gacha`, `--quruq`, subbuyruqlar `frontier`, `almashtir` |
| `sweep.py` | oʻlchash halqasi: soʻrov → `Natija` → 500 talik partiya → `so_ingest_batch`; kill-switch, kechikish, proksi |
| `almashtir.py` | kuzatuv yangilash (6-boʻlim): nomzodni Uzumda oʻlchaydi, juft/rad → `so_almashtir` |
| `store.py` | PostgREST RPC lar (`service_role`). Xato matnidan kalit kesiladi |
| `hurmat.py` | hurmat rejimi (QOIDALAR §7): 3 soʻrov/s; xato ≥5 % — sekinlashadi (8 barobargacha), ≥25 % (20 soʻrovdan keyin) — toʻxtaydi |
| `token.py` | anonim token (`id.uzum.uz`), sarlavhalar tajribada topilgan — izohida |
| `manbalar/uzum.py` | GraphQL soʻrovlari: yengil `PRODUCT_QUERY` va ogʻir `PRODUCT_QUERY_STOK` (`skuList`, oʻlcham, rasm); `parse`; qoldiq = `availableAmount` yigʻindisi |
| `manbalar/uzum_client.py` | javobni turkumlaydi: `TOPILDI`, `YOQ` (mahsulot yoʻq — xato EMAS, id fazosining ~70 % i boʻsh), `TEZ` (429), `TOKEN` (401), `XATO` |
| `frontier.py`, `turkum.py`, `manbalar/turkum_hajmi.py` | frontier zondi, turkum hajmi |

## 5. Jadvallar va RPC lar (`SXEMA.md` — toʻliq)

| Jadval | Nima |
|---|---|
| `selleros.tracked_product` | kuzatuv namunasi: `external_id`, `category_external_id` (sotuvchi 11-qadamda qoʻshgani — `null`), `demand_bucket` (1–20), `buyers_per_week_at_pick`, `active`, `added_at` |
| `selleros.product` | tovar (birinchi oʻlchovda yaratiladi) |
| `selleros.product_observation` | FAQAT OʻZGARISHLAR (narx/qoldiq/sharh oʻzgarsa qator). "Qator yoʻq" ≠ "oʻlchanmagan" |
| `selleros.product_daily` | HAR oʻlchangan kun — bitta qator (qoldiq, narx, reyting, sharh). Tovar oʻlchanganmi — shundan bilinadi |
| `selleros.sales_estimates`, `tovar_sotuvi` (view) | qoldiq farqidan sotuv; `sold_30d` uchun kamida 7 oʻlchangan kun |
| `selleros.kuzatuv_rad` | almashtirishda Uzumda tekshirilib, yaroqsiz chiqqan nomzodlar (14 kun taklif qilinmaydi) |
| `selleros.id_frontier`, `yonalish_nomzodi`, `brend_qamrovi`, `sweep_log` | frontier, 2-qadam keshi, brend qamrovi, ish jurnali |

RPC (hammasi `public.so_*`, faqat `service_role`): `so_select_tracked`, `so_ingest_batch`, `so_sweep_open/close`,
`so_olchov_soni`, `so_frontier_yoz`, `so_almashtir_nomzodlari`, `so_almashtir`, `so_yonalish_yangila`,
`so_rollup_sales`, `so_turkum_raqobati_yangila`, `so_brend_yangila`, `so_turkum_royxati`, `so_turkum_hajmi_yoz`.

**Jonli funksiya fayllardan farq qilishi mumkin.** `so_tovar_royxati` da `komissiya` boʻlagi bevosita bazaga
qoʻshilgan (0036). Shuning uchun uni QAYTA YARATMANG — `pg_get_functiondef` + `replace` + boʻlak topilmasa
`raise exception` (0039, 0054, 0064, 0068 dagidek).

## 6. Kuzatuv namunasini yangilash (0068, 0069 — 2026-10-20)

**Muammo.** Namuna 2026-08-24 da bir marta tanlangan (`selleros.kuzatuv_yangilash`, 0014) va hech qachon
yangilanmagan. 2026-10-20: 5 999 tadan **4 536 tasi 14 kundan beri qoldiqsiz**, 4 326 tasida birorta ham qoldiq
koʻrilmagan. Uzumning oʻzi ularni «Tugadi» deydi (`skuList.stock.status = OUT_OF_STOCK`) — oʻlchov toʻgʻri edi.
3-qadam katalogi shularni koʻrsatardi.

**Yechim — har skreyper ishida («Oʻlchash» dan oldin):**
1. `so_almashtir_nomzodlari(p_kun 14, p_turkum 300, p_nomzod 5)` — **oʻlik oʻrinlar**: faol, turkum namunasidan,
   14 kundan oldin qoʻshilgan, soʻnggi 14 kunda kamida 7 kun oʻlchangan va har kuni qoldiq 0 — yoki umuman
   oʻlchanmagan (Uzumdan olib tashlangan). Skreyper soʻnggi 2 kunda 1 000 dan kam oʻlchagan boʻlsa — taklif yoʻq.
   Har oʻringa **nomzodlar**: oʻsha turkumdan (perepis), xaridor belgisi bor, kuzatilmagan, yaqinda rad
   etilmagan; oʻrinning talab boʻlagiga yaqini birinchi; turkumlar navbat bilan (har turkumning 1-oʻrni,
   keyin 2-si…). Hisob hash bilan ~20 s (`set enable_nestloop = off`: indeks bilan bittalab oʻqish 3–4 daqiqa edi).
2. `almashtir.py` — har nomzodni Uzumda **oʻlchaydi** (ogʻir soʻrov): qoldigʻi bor va turkumi oʻsha — juft;
   boʻlmasa — rad. Tarmoq/429 — rad EMAS. Chegara: 2 000 soʻrov va 30 daqiqa (`--max-sorov`, `--max-daqiqa`).
3. `so_almashtir(p_juftlar, p_rad)` — bitta tranzaksiya: yangisi eski oʻrinning turkumi va boʻlagi bilan,
   eskisi `active = false` (tarixi qoladi). Bitta eski — bitta yangi; turkum hajmi 20 dan oʻzgarmaydi.
4. `so_tovar_royxati` — faqat faol namuna (oʻsha turkumniki).

**Nomzod tartibi (0069), birinchi ishdan oʻlchandi.** Boʻlak ichida «xaridor belgisi» kattasi birinchi edi — 15 %
topildi: belgi TUGAGAN tovarda ham qoladi (rad etilganlarda mediana 331, qabul qilinganlarda 65). Qaysi
nomzod sotuvda chiqqani: perepis kursoridan keyingi (yangi tovar) — 36 %, ikki oʻtish orasida sharhi oʻsgan —
23 %, soʻnggi oʻtishda yoʻq — 12 %, qolgani — 6 %. Endi shu tartibda, har birida id kattasi birinchi (~33 % kutiladi).

**Natija.** Birinchi ish (2026-10-20, qoʻlda): 2 000 soʻrov, 22 daqiqa → 305 almashtirish (235 turkum), 1 690 rad;
har turkumda hamon 20 tovar; oʻsha ishning oʻlchovida yangi 305 tadan 304 tasi qoldiq bilan chiqdi. Qolgani
~4 232 oʻrin — har ishda yuzlab, bir necha kunda.

## 7. Qanday tekshirish

```sql
-- namuna holati
select count(*) filter (where active) faol, count(*) filter (where not active) almashtirilgan,
       count(*) filter (where active and added_at > now() - interval '1 day') bugun_qoshilgan,
       (select count(*) from selleros.kuzatuv_rad) rad
from selleros.tracked_product;
-- bugun nechta oʻlchandi va qanchasida qoldiq bor
select count(*), count(*) filter (where stock > 0)
from selleros.product_daily where date = (now() at time zone 'Asia/Tashkent')::date;
-- hali qancha oʻlik oʻrin bor (faqat sanash; hisob ~20 s)
select (public.so_almashtir_nomzodlari(14, 300, 1))->'olik_jami';
-- har turkumda 20 tadan (0 qaytishi kerak)
select count(*) from (select category_external_id, count(*) n from selleros.tracked_product
  where active and category_external_id is not null group by 1) x where n <> 20;
```
Ish logida «Kuzatuv roʻyxatini yangilash» qadami JSON chiqaradi: `oʻlik_oʻrinlar`, `soʻrovlar`, `juftlar`,
`rad`, `vaqt_tugadi`, `bazada` (bazadan qaytgan son — niyat emas, natija).

## 8. Qanday oʻzgartirish va sinash

- **Python testlari** (`apps/scraper/tests`, 113 ta): CI `pip install -e '.[dev]' && pytest`. Windows da pip
  qaramliklari boʻlmasa: `uv run --no-project --python 3.12 --with httpx --with pytest --with-editable . python -m pytest -q`.
  Uzum — `httpx.MockTransport` bilan soxta; uyqu almashtiriladi (`uxla=`).
- **SQL testlari** (`supabase/test/*.test.ts`, vitest): `kuzatuv-almashtir.test.ts` 0068/0069 ni HAQIQIY
  Postgres da (PGlite, xotirada) sinaydi — `npx vitest run supabase/test/kuzatuv-almashtir.test.ts`.
- **Mutatsiya** (shu loyiha odati): har muhim shartni vaqtincha olib tashlab test yiqilishini koʻring; faylni
  nusxadan tiklang (`git checkout` EMAS — boshqa oʻzgarishlarni oʻchirib yuboradi).
- **Migratsiya:** `supabase/migrations/NNNN_*.sql`. Jonli bazaga qoʻllash — faqat EGASINING aniq ruxsati bilan,
  har migratsiyaga alohida. Jonli funksiyani yamash qoidasi — 5-boʻlim oxiri.
- **Jonli sinov:** Uzumga soʻrov faqat GitHub Actions dan (shu ish oqimlari) yoki VPS dan. **Shaxsiy noutbukdan
  Uzumga soʻrov yubormang** (zumsavdo RUNBOOK #20: kvota oʻrnatmaga bogʻlangan, VPS ulushini yeydi).
  Tovar rostdan tugaganmi — VPS dagi `ingest/uzum-tovar.mjs` (zumsavdo ombori).

## 9. Maʼlum muammolar va ochiq qarorlar (2026-10-20)

| Muammo | Holat |
|---|---|
| «Brend qamrovini yangilash» HAR ishda qizil | `so_brend_yangila` 3 mln nomni har safar qayta tokenlaydi; javob 2 daqiqadan oshib shlyuz uzadi, baza esa ishni tugatadi. Ish «failure» koʻrinadi, qolgan qadamlar ishlaydi. Tuzatish taklifi: perepis oʻzgarmagan boʻlsa oʻtkazib yuborish (migratsiya — ega ruxsati) |
| Rejalashtirilgan ishlar soatlab kech | GitHub tomoni; shoshilinch boʻlsa qoʻlda ishga tushiring |
| Perepis toʻxtagan (zumsavdo, toʻlov) | ega qarori — `zumsavdo/docs/HANDOFF.md` |
| `0064` (katalogda Uzum yozuvi va sharh oʻsishi) yozilgan, qoʻllanmagan | ega ruxsati kutilmoqda |
| Almashtirilgan yangi tovarda sotuv tarixi yoʻq | `sold_30d` 7 oʻlchangan kundan keyin chiqadi — kutilgan |

## 10. Qoidalar (qisqa)

1. «Ishladi» ≠ «yozdi»: har qadam bazadan qaytgan son bilan tekshiriladi (QOIDALAR §8).
2. Hurmat rejimi: tezlik, kill-switch, kechikish — haqiqatan qoʻllanadi (QOIDALAR §7, `hurmat.py`).
3. `None` va `0` aralashmaydi: `0` — «tugagan», `None` — «oʻlchanmagan».
4. Sirlar faqat GitHub Secrets / Supabase secrets da; omborga hech qachon tushmaydi (CI qorovuli tekshiradi).
