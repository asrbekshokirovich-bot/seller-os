# Uzum komissiyasi — holat, manba va yopilgan yoʻllar

> Bu hujjat `SERTIFIKAT-TOLDIRISH.md` dan ajratildi (2026-09-02):
> komissiya sertifikat emas va u yerda yotishi chalgʻitardi.

## Nega muhim

`tannarxHisobi()` va 3-tuzoq (demping) `komissiyaFoizi` ni TALAB
qiladi. Komissiya marjaga, marja demping bayrogʻiga ulanadi —
yaʼni notoʻgʻri komissiya foydali tovarni "zararli" deb bloklaydi.

## Bugungi qamrov (2026-09-02 da oʻlchandi)

| | |
|---|---:|
| Jadvalda turkum | 223 |
| Kuzatuvdagi turkum | 322 |
| **Moslashgani** | **19** |
| Qamragan tovar | **343** / 6 025 |
| Tovar qamrovi | **5,7%** |

Qolgan 94,3% da `komissiyaFoizi = null` va bu **halol**:
`packages/shared/src/tannarx.ts` uni `yetishmaydi` roʻyxatiga
qoʻshadi, yaʼni hisob "oʻlchanmadi" deydi, taxmin qilmaydi.
Foydalanuvchidan 4-qadamda soʻraladi.

## Uchta yoʻl yopildi — qayta urinmang

Bu boʻlimning maqsadi: kelajakda kimdir shu uchtasini qaytadan
sinab koʻrmasin. Har biri oʻlchov bilan rad etilgan.

### 1. Turkum daraxti orqali bogʻlash — RAD ETILDI

Gipoteza: jadval yuqori darajadagi (ota) turkumlarni ishlatadi va
bizning barg turkumlarimiz ulardan meros oladi.

Oʻlchandi 2026-09-02, sakkizta turkumning ota zanjiri Uzumdan
jonli olindi (`Category.parent`):

```
Idish yuvish vositalari  ← 11341 ← 10005 ← 1
Ichki kiyim toʻplamlari  ← 14967 ← 10116 ← 10014
Kosmetik sovun           ← 11468 ← 66    ← 10012
Knopkali telefonlar      ← 10044 ← 10020 ← 1
```

Natija: **18 ta ota id dan 0 tasi jadvalda bor**. Otalar ham
10 000+ fazosida — daraxt koʻprik boʻlmaydi.

### 2. Uzum ochiq API si — RAD ETILDI

`graphql.uzum.uz` sxemasi toʻliq introspeksiya qilindi
(2026-09-02). `commission`, `tariff`, `logistic`, `storage`
kabi maydon **yoʻq**. Komissiya sotuvchi kabinetida, xaridor
API sida emas.

### 3. Nom boʻyicha moslashtirish — RAD ETILDI (siyosat)

Turkum nomiga qarab taxmin qilish bu loyihada bir marta
9 tadan 5 tasida notoʻgʻri chiqqan. Komissiya marjaga ulangani
uchun bu yerda xatoning narxi ayniqsa yuqori.

## Id fazosi haqida — aniqlik

Oldin "jadval ESKI id fazosini ishlatadi" deb yozilgandi. Bu
aniq emas ekan. Oʻlchandi:

| | |
|---|---:|
| Jadval id oraligʻi | 11 — 2799 |
| Bizning turkumlar oraligʻi | 69 — 18095 |
| Jadvaldagi qator, 11—2799 da | 223 / 223 |
| Bizning turkum, 11—2799 da | **19** / 322 |

Yaʼni id fazosi bir XIL (2607 "Soat", 2744 "Ilgaklar va
tutqichlar" nomi bilan ham mos keladi). Muammo tarjimada emas:
**jadval Uzumning 5 315 turkumidan atigi 223 tasini qamraydi**,
va bizning kuzatuv roʻyxatimiz koʻproq yangi (yuqori raqamli)
turkumlardan iborat.

## Yagona qolgan manba — sotuvchi kabineti

Komissiya sotuvchi kabinetida turkum boʻyicha koʻrsatiladi.
Kerak boʻlgan narsa: `category ID` → komissiya foizi juftliklari.
Eksport, nusxa yoki skrinshot — farqi yoʻq.

Ustun tanlovi allaqachon hal qilingan: **FBO** (223 tadan
221 tasida FBO/FBS/DBS bir xil, yangi boshlovchi Uzum omborini
ishlatadi).

Yuborilsa, `selleros.uzum_komissiya` ga yozaman —
`so_tovar_royxati` va tannarx hisobi darhol ishlatadi.

## Nazoratchi bergan jadvallar (2026-08-26)

Nazoratchi ikkita Google jadval berdi. Ular sertifikat haqida
emas, lekin boshqa boʻshliqni yopadi.

### 1. "Новые комиссии c калькулятором"

`category ID` → komissiya foizi. Id fazosi bizniki bilan bir xil
(2607 "Soatlar", 2615 "Boshqa avtomobil aksessuarlari" toʻgʻri
keldi).

Uch ustun: **FBO / FBS / DBS** — uch xil bajarish modeli (Uzum
ombori / sotuvchi ombori / sotuvchi yetkazishi). 223 tadan 221
tasida uchalasi bir xil. FBO olindi: yangi boshlovchi Uzum
omborini ishlatadi.

**Qamrov cheklangan va bu ochiq yozilgan:**

| | |
|---|---:|
| jadvalda turkum | 223 |
| bizda topilgani | **19** |
| qamragan tovar | **343** / 6 025 |

Sabab: jadvaldagi id lar 11—2799, Uzumning hozirgi turkumlari esa
16 000 gacha. Jadval eski id fazosini ishlatadi.

**Nom boʻyicha moslashtirish QILINMADI.** Turkum nomiga qarab
taxmin qilish bu loyihada 9 tadan 5 tasida notoʻgʻri chiqqan.
Komissiya marjaga, marja demping bayrogʻiga ulanadi — notoʻgʻri
komissiya foydali tovarni "zararli" deb bloklardi.

### 2. "Kalkulyator: Logistika va saqlash"

Kecha yangilangan (a.yermakova@uzum.com). Ichida uch narsa bor:

* **komissiya** — chegirmadan oldin va keyin (masalan 32,50% →
  chegirma 2,50% → 30,00%);
* **logistika** — HAJM boʻyicha: uzunlik×kenglik×balandlik → litr
  → yigʻim;
* **saqlash** — aylanuvchanlik guruhiga qarab, 1 litr uchun kunlik
  tarif.

Birinchi jadvaldagi qatʼiy logistika yigʻimlari:

| Gabarit guruhi | Yigʻim |
|---|---:|
| KGT, narx 99 999 soʻmgacha | 4 000 |
| KGT, narx 100 000 va yuqori | 6 000 |
| OʻGT | 8 000 |
| YGT, sim-kartalar | 20 000 |

**Bu ikkinchi jadval hali OLINMADI.** Sababi: undagi foizlar
oʻnli kasr bilan berilgan va varaqda ustunlarga boʻlinib ketgan
("10,00%" ikki katakka tushadi). Ehtiyotsiz oʻqisam, 10% oʻrniga
1 000% yozib qoʻyish mumkin edi. Uni alohida, tekshiruv bilan
olish kerak.

## 4-ilovaning toʻliq matni oʻqildi (2026-09-02)

Oldin bu hujjatda "roʻyxatning MATNI kerak" deb yozilgan edi va u
nazoratchidan soʻralgandi. Matn `lex.uz/docs/-7080176` dan olindi va
4-ilova toʻliq ajratildi: **108 band, 65 tasi sertifikat (1—65),
43 tasi deklaratsiya (66—108)** — bu hujjatning oldingi qismidagi
daʼvo bilan mos, yaʼni ajratish toʻgʻri.

`certificate_required.TODO.csv` dagi **30 ta turkumning hammasi**
koʻrib chiqildi va fayl oʻchirildi: undagi ish tugagan.

### Topildi — sertifikat talab qilinadi

| Turkum | Band | Nega |
|---|---|---|
| Smartfonlar (Android, iPhone) | 56 | TIF TN 8517 13 ∈ 8517 11 000 0 — 8517 69 900 0 |
| Noutbuklar | 54 | 8471 30 000 0 kod roʻyxatida AYNAN bor |
| Planshetlar | 54 yoki 56 | 8471 30 → 54-band, 8517 62 → 56-band; **ikkala tasnifda ham** sertifikat |

Planshet holati alohida qiziq: tasnif noaniq boʻlsa ham javob aniq,
chunki ikkala yoʻl ham sertifikat boʻlimiga olib boradi.

### Tekshirildi, lekin bayroq QOʻYILMADI

Uch xil sabab bor va ular aralashtirilmaydi.

**1. Tasnifga bogʻliq** — bir tasnifda roʻyxatda bor, boshqasida yoʻq:

| Turkum | Nega |
|---|---|
| Simsiz quloqchinlar | 8518 30 (quloqchin) roʻyxatda YOʻQ — 56-band 8518 dan faqat 21/22/29 (dinamiklar) ni oladi. Lekin TWS 8517 62 deb ham tasniflanadi va u 56-bandda BOR. |
| Aqlli soatlar | 8517 62 → 56-bandda bor; 9102 → roʻyxatda yoʻq. |

**2. Deklaratsiya boʻlimida** — sxema buni ifodalay olmaydi:

| Turkum | Band |
|---|---|
| Sumkalar | 77 (4202) |
| Kiyim toʻplamlari | 86 (trikotaj), 87 (toʻqima) |
| Har kun kiyiladigan liboslar | 86, 87 |

`certificate_required` ikki holatli. Deklaratsiya sertifikat emas,
shuning uchun `1` ham, `0` ham notoʻgʻri boʻlardi. **Bu hali ham
nazoratchining qarori** — pastdagi "Ochiq savol" ga qarang.

**3. VMQ 502 roʻyxatida umuman yoʻq** — lekin bu "kerak emas"
degani EMAS, faqat "shu hujjatda yoʻq" degani:

| Turkum | TIF TN | Izoh |
|---|---|---|
| Soat (2610, 2607) | 9101, 9102 | 9101 umuman yoʻq; 9102 faqat 106-bandda, u ham "faqat elektron sekundomerlar, shaxmat soatlari" deb cheklangan |
| Stikerlar | 4821, 4911 | — |
| Soch toʻgʻnagʻichlari va taroqlar | 9615 | — |
| Qoplamalar | 3926 | — |
| Matoli niqoblar | 6307 90 | 41-band 6307 dan faqat 6307 20 000 0 ni oladi; 88-band nomi "sport bayroqlari" deb cheklangan |
| Organayzerlar | 3924 90, 3926 | 20-band 3924 dan faqat 3924 10 000 0 (dasturxon buyumlari) ni oladi |
| Ziraklar, uzuklar, bilaguzuklar, zanjirlar | 7113, 7117 | roʻyxatda yoʻq; ustiga bijuteriya aralashligi allaqachon yozilgan |

Bularga `0` yozilmadi. `0` — "tekshirdim, kerak emas" degan daʼvo,
va u faqat BARCHA tegishli hujjatlar koʻrilgandan keyin yozilishi
mumkin. Koʻrilgani bittasi.

### Bir tuzatish

`Futbolkalar` va `Kalta yengli futbolkalar` qatorlarida manba
**40-band** deb yozilgan. Futbolka TIF TN 6109 (trikotaj) va u
**39-bandda** (6105—6109); 40-band esa toʻqima mahsulotlar
(6205—6209). Ikkala band ham sertifikat boʻlimida, yaʼni
`certificate_required = 1` **oʻzgarmaydi** — faqat havola aniq emas.
Tegilmadi: bu qatorlarni nazoratchi kiritgan va bayroqqa taʼsiri
yoʻq.

## Ochiq savol — nazoratchiga

**Deklaratsiya uchun uchinchi qiymat kerakmi?**

Uchta turkum (sumka, kiyim toʻplami, libos) VMQ 502 roʻyxatida BOR,
lekin deklaratsiya boʻlimida. Hozir ular bayroqsiz qolyapti, yaʼni
foydalanuvchi "tekshirilmagan" deb koʻradi — aslida esa biz aniq
bilamiz: talab bor, faqat sertifikat emas, deklaratsiya.

Variantlar:

1. `certificate_required` ni uch holatli qilish
   (`sertifikat` / `deklaratsiya` / `yoʻq`) — sxema oʻzgaradi.
2. Alohida `declaration_required` ustuni qoʻshish — sodda, lekin
   filtr ikkala ustunni koʻrishi kerak.
3. Hozirgicha qoldirish — foydalanuvchi bilsa boʻladigan narsani
   bilmay qoladi.

Qaror sizniki. Aytsangiz, migratsiya va filtr oʻzgarishini yozaman.
