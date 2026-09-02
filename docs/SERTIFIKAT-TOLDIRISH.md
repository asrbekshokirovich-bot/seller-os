# `certificate_required` — nima kerak va qanday toʻldiriladi

> Bu hujjat nazoratchi uchun. Kod tomondan hammasi tayyor: maydon
> bor, filtr yozilgan va sinalgan. Yetishmayotgani — HUQUQIY
> MAʼLUMOT, va uni taxmin qilib boʻlmaydi.

## Nega bu maydon boʻsh qoldirilgan

Turkum nomiga qarab taxmin qilib koʻrdim. Natija: **9 tadan 5 tasi
notoʻgʻri chiqdi**. Shundan keyin taxmin qilishni toʻxtatdim.

Xatoning narxi simmetrik emas:

| Xato | Foydalanuvchi uchun natijasi |
|---|---|
| Talab bor, biz aytmadik | Tovar keltiriladi va **sotib boʻlmaydi**. Butun partiya puli. |
| Talab yoʻq, biz aytdik | Bir marta ortiqcha tekshiradi. Bir soat. |

Shuning uchun `null` hech qachon "kerak emas" deb oʻqilmaydi.
Filtr `baholanmadi` qaytaradi va foydalanuvchi
&laquo;bu turkum tekshirilmagan&raquo; degan javobni koʻradi —
xotirjam qiladigan yolgʻon emas.

## Bugungi holat (2026-09-02 da oʻlchandi)

| Nima | Soni |
|---|---:|
| `category_requirements` dagi qator | 66 |
| **`certificate_required` = 1** | **16** |
| `marking_required` = 1 | 3 |
| Tekshirilgan, lekin bayroq qoʻyilmagan | 16 |
| `seasonality` toʻldirilgan | 31 |
| Kuzatuvdagi turkum | 322 |
| Uzumdagi jami turkum | 5 315 |

> Oldingi oʻlchov (2026-08-25) da `certificate_required` **0** edi.
> Oʻrtada ikki ish boʻldi: 2026-08-26 da VMQ 502 topildi va 12 turkum
> toʻldirildi, 2026-09-02 da 4-ilovaning toʻliq matni oʻqilib qolgan
> 30 turkum oxirigacha koʻrib chiqildi (quyida).

"Tekshirilgan, lekin bayroq qoʻyilmagan" — bu **bekor ish emas**.
Har bunday qator qaysi hujjat, qaysi band va qaysi TIF TN kodi
qaralganini yozib qoldiradi, yaʼni keyingi safar oʻsha turkum
qaytadan qidirilmaydi.

## Uch maydon, uch xil qiymat

Har uchalasi UCH holatli. `false` va `null` ARALASHTIRILMAYDI.

| Maydon | Turi | Maʼnosi |
|---|---|---|
| `marking_required` | `1` / `0` / boʻsh | Asl Belgisi markirovkasi kerakmi |
| `certificate_required` | `1` / `0` / boʻsh | Muvofiqlik sertifikati kerakmi |
| `source` | matn | **MAJBURIY.** Manbasiz qator ishlatilmaydi |

`source` boʻsh boʻlsa filtr qatorni umuman koʻrmaydi — chunki
huquqiy talab oʻzgaradi va qayerdan olingani bilinmasa uni qayta
tekshirib boʻlmaydi.

Boʻsh qoldirish — **toʻgʻri javob**, agar bilmasangiz. `0` yozish
esa "tekshirdim, kerak emas" degan daʼvo.

## Qoʻshimcha maydonlar (majburiy emas)

| Maydon | Turi | Maʼnosi |
|---|---|---|
| `entry_cost_uzs` | butun son | Sertifikat/markirovka olishning taxminiy narxi |
| `entry_weeks` | butun son | Necha hafta ketadi |

Bularsiz ham filtr ishlaydi — u shunchaki
&laquo;xarajat va muddat oʻlchanmagan&raquo; deb yozadi. Nol
yozilmaydi: "0 soʻm, 0 hafta" degan xabar "arzon va tez" degan
notoʻgʻri taassurot berardi.

## Manba qanday yoziladi

Repozitoriyada allaqachon uchta qator bor va ular namuna:

```
VMQ 148, 02.04.2022 (lex.uz/docs/-5936141), 1-guruh
```

Yaʼni: **hujjat nomi, sanasi, havolasi va aniq boʻlimi**. Bu
yetarli — keyin har kim ochib tekshira oladi.

Sertifikat talablari boʻyicha qaysi hujjat asos boʻlishini men
ayta olmayman: buni xotiradan yozsam, yuqoridagi 5/9 xatoni
qaytargan boʻlardim. Buni huquqshunos yoki `standart.uz` /
`lex.uz` dan aniqlash kerak.

## Qayerga yoziladi

`supabase/seed/category_requirements.csv`, keyin
`node supabase/seed/yukla.mjs` bazaga yozadi.

> `certificate_required.TODO.csv` **oʻchirildi** (2026-09-02).
> Undagi 30 turkumning hammasi koʻrib chiqildi: 4 tasiga bayroq
> qoʻyildi, 12 tasi allaqachon toʻldirilgan edi, qolgan 14 tasiga
> tekshirilgani va NEGA bayroq qoʻyilmagani yozib qoldirildi.
> Ish varaqasi oʻz vazifasini bajardi.

## Nazoratchi aynan NIMA qilishi kerak

> Bu boʻlim 2026-09-02 da qisqardi. Oldin bu yerda "menga
> roʻyxatning MATNI kerak" deb yozilgan edi — matn olindi va
> oʻqildi (yuqoridagi boʻlimga qarang). Qolgan uchta narsa
> haqiqatan sizni kutadi.

**1. Deklaratsiya uchun sxema qarori.** Yuqoridagi "Ochiq savol"
boʻlimi. Uchta turkumga taʼsir qiladi va kod tomondan tayyorman.

**2. Boshqa hujjatlar.** VMQ 502 — bitta hujjat. Roʻyxatda
topilmagan turkumlar (soat, quloqchin, stiker, taroq, zargarlik,
qoplama, niqob, organayzer) boshqa hujjatga tegishli boʻlishi
mumkin. Ularga `0` yozilmadi, chunki `0` "hamma hujjatni koʻrdim"
degan daʼvo boʻlardi.

Agar boshqa hujjat nomini yoki havolasini bersangiz, oʻsha
turkumlarni oʻsha manbaga solishtiraman.

**3. Uzumning OʻZ talabi — eng qimmatlisi.** Savdoni qonun emas,
platformaning qoidasi toʻxtatadi. `seller.uzum.uz` qoʻllanmasidan
nimadir olingan (pastda), lekin u toʻliq emas: sotuvchi
kabinetidagi "qaysi turkumda sertifikat soʻraladi" roʻyxati
kerak. Skrinshot ham yetadi.

### Eng kichik foydali qadam

Sotuvchi kabinetiga kirsangiz, sertifikat soʻraladigan turkumlar
roʻyxatini skrinshot qilib tashlang. Qolganini oʻzim qilaman.

## Topilgan manbalar (2026-08-26)

### 1. VM qarori 502-son, 14.08.2024 — lex.uz/docs/-7080176

**4-ilova: "Majburiy tartibda muvofiqligi baholanishi lozim boʻlgan
mahsulotlar ROʻYXATI".** 15.11.2024 dan amalda. Bu bekor qilingan
1513-hujjatning oʻrnini bosgan.

108 ta band, ikki boʻlim:

| Bandlar | Talab |
|---|---|
| 1—65 | muvofiqlik **sertifikati** |
| 66—108 | muvofiqlik **deklaratsiyasi** (xavfi past) |

Shu roʻyxatdan **12 ta turkum** toʻldirildi: parfyum va kosmetika
(15-band), oyoq kiyim (43-band), oʻyinchoq (62-band), trikotaj
kiyim (39/40-band).

### 2. Uzum sotuvchi qoʻllanmasi — seller.uzum.uz/manual/uz/2.seller-requirements

Platformaning OʻZ talabi. Savdoni aynan shu toʻxtatadi.

| Toifa | Uzum talab qiladigan hujjat |
|---|---|
| Zargarlik buyumlari | Davlat probir nazorati inspeksiyasi **ruxsatnomasi** |
| Oziq-ovqat | SES sertifikati + muvofiqlik sertifikati; yaroqlilik muddatining ≥60% yoki ≥6 oy qolgan boʻlishi |
| BAD, vitamin, sport ovqati, tibbiy texnika | SES + muvofiqlik sertifikati |
| Kosmetika, maishiy kimyo | muvofiqlik sertifikati |
| Bolalar tovarlari | muvofiqlik sertifikati majburiy |
| Kamerali dronlar | qonunchilik boʻyicha ruxsat |

Hujjatlar **3 ish kuni** ichida qoʻlda tekshiriladi.

### Zargarlik — turkum darajasida hal qilib BOʻLMAYDI

Uzum zargarlik buyumlariga probir ruxsatnomasini talab qiladi.
Lekin `Ziraklar`, `Uzuklar`, `Bilaguzuklar`, `Zanjirlar`
turkumlaridagi tovarlarning koʻpi **bijuteriya**: "zanglamas
poʻlat", "XUPING", "obmanka". Ular qimmatbaho metall emas.

Yaʼni bitta turkum ichida talab bor tovar ham, yoʻq tovar ham bor.
Turkumga `1` qoʻysak, bijuteriya sotmoqchi boʻlgan odamga yoʻq
talabni koʻrsatardik.

Shuning uchun bayroq **qoʻyilmadi**, lekin tekshirilgani yozib
qoʻyildi — keyingi safar qaytadan qidirilmasin. Buni hal qilish
uchun tovar darajasida material aniqlanishi kerak.

### Hali toʻldirilmagan — va nega

**Smartfon, simsiz quloqchin, soat, noutbuk, planshet** — VMQ 502
roʻyxatida yoʻq. Bu "kerak emas" degani EMAS: alohida hujjatga
tegishli boʻlishi mumkin. `0` yozish "tekshirdim, kerak emas"
degan daʼvo boʻlardi.

**Sumka, shim, palto** — VMQ 502 ning DEKLARATSIYA boʻlimida
(77, 86, 87-bandlar). `certificate_required` ikki holatli,
deklaratsiya esa sertifikat emas. Uni `1` deb yozish ham, `0` deb
yozish ham notoʻgʻri. Sxemaga uchinchi qiymat kerak —
nazoratchining qarori.

## Uzum jadvallari — komissiya va logistika (2026-08-26)

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

## Toʻldirgandan keyin nima boʻladi

1. Fayl `so_talablarni_yoz` orqali bazaga tushadi.
2. `sertifikat()` filtri oʻsha turkumda ishlay boshlaydi va
   3-qadamda `note` darajasidagi ogohlantirish chiqadi:
   &laquo;Kirishdan oldin: markirovka + sertifikat&raquo;.
3. `/olchov` panelidagi &laquo;Tuzoq sogʻligi&raquo; blokida
   `Sertifikat / markirovka` qatori
   &laquo;Bu namunada emas&raquo; dan
   &laquo;Ishlayapti&raquo; ga oʻtadi.

Bloklamaydi — `note` beradi. TUZOQLAR.md §5 shunday belgilaydi:
talab bor degani "kirmang" degani emas, "kirishdan oldin buni
biling" degani. Tayyor sotuvchi uchun bu hatto afzallik —
raqobat kamroq.
