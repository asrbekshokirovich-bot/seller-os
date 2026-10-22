# FORMULA.md — ball tizimi

> **Versiya: v0 (taklif).** Nazoratchi tasdig'ini kutmoqda.
> O'zgarish — alohida PR, versiya raqami oshadi, testlar yangilanadi.

Ball nima uchun kerak: 3-qadamda "qaysi tovar" degan savolga javob berish
va uni **ochiq tushuntirish**. "Nega bu tovar?" tugmasi shu ballning
ochilishini ko'rsatadi.

---

## Asosiy qoida

Ball — deterministik. **Bir xil kirish → har doim bir xil natija.**
LLM ballga aralashmaydi; u faqat natijani o'zbekchada tushuntiradi.

Ball 0–100 oralig'ida. Oltita qism, har biri 0–100, keyin vazn bilan
qo'shiladi.

```
ball = Σ (qism_ball × vazn) / Σ vazn
```

## Oltita qism

| # | Qism | Nima o'lchaydi | Vazn (v0) |
|---|---|---|---|
| 1 | `talab` | Sotuv hajmi — bozorda pul bormi | 25 |
| 2 | `marja` | Tannarx vs sotuv narxi — foyda qoladimi | 25 |
| 3 | `raqobat` | Sotuvchi soni, top-3 ulushi (**teskari**) | 20 |
| 4 | `kirish` | Sertifikat/brend to'siqlari (**teskari**) | 10 |
| 5 | `mavsum` | Hozirgi oyga moslik | 10 |
| 6 | `profil` | Foydalanuvchi tajribasi/oilasi bilan moslik | 10 |

**Teskari** degani: raqobat kuchli bo'lsa ball **pasayadi**.

Vaznlar `packages/shared/src/formula.ts` da bitta joyda. Ular shu jadval
bilan mos bo'lishi kerak — CI da tekshiriladi.

## Har qismning hisobi (v0 taklif)

### 1. Talab — `talab`

Oxirgi 30 kunlik taxminiy sotuv (dona), kategoriya ichida foizga
aylantiriladi (persentil). Sotuv taxmini stok farqidan chiqadi — **taxminiy**.

Ma'lumot yetarli bo'lmasa (< `MIN_DAYS_FOR_DEMAND` kunlik nuqta) — qism
`null`, ball hisoblanmaydi va tovar "ma'lumot yig'ilmoqda" deb belgilanadi.
Nol qo'yilmaydi: nol "talab yo'q" degan javob bo'lardi.

**Kun sharti faqat stok farqiga tegishli** *(aniqlashtirish, 2026-08-24)*.
U bitta o'lchovdan farq chiqmagani uchun qo'yilgan. Platformaning o'zi
aytgan raqam (perepisdagi haftalik xaridorlar) bitta o'lchovda ham
to'liq — unga bu shart tegishli emas va `talab(..., 'togridan-togri')`
bilan ochiq chetlab o'tiladi.

Chetlash **ochiq** bo'lishi shart. Ilgari chaqiruvchi kun soni o'rniga
chegaraning O'ZINI (`MIN_DAYS_FOR_DEMAND`) uzatib, shartni jimgina
bekor qilgan edi: kod tekshiruv bordek ko'rinardi, lekin u hech qachon
ishlamasdi.

Qism **persentil** bo'lgani uchun o'lchov BIRLIGI muhim emas — monoton
bo'lsa kifoya. Shuning uchun 30 kunlik sotuv yig'ilgunicha uning
o'rniga boshqa talab o'lchovi qo'yilishi mumkin va turkumlar tartibi
o'zgarmaydi.

### 2. Marja — `marja`

```
sof_foyda_1_dona = sotuv_narxi
                 − xitoy_narxi
                 − kargo(og'irlik, hajm)          ← Xitoydan omborgacha
                 − bojxona/QQS
                 − platforma_komissiyasi
                 − uzum_logistikasi(hajm)         ← ombordan xaridorgacha
marja_% = sof_foyda_1_dona / sotuv_narxi
```

**Ikkita logistika bor va ular ARALASHTIRILMAYDI.** `kargo` —
Xitoydan O'zbekistondagi omborgacha, sotuvchi to'laydi. Uzum
logistikasi — ombordan xaridorgacha, Uzum ushlab qoladi.

Oxirgi qator 2026-08-26 da qo'shildi. Undan oldin u hisobda umuman
yo'q edi va shuning uchun **har bir marja 5 250 — 50 000 so'mga
oshib ko'rsatilardi** — ya'ni foydasiz tovar foydali bo'lib
chiqardi.

Uzum tarifi (seller.uzum.uz/manual/uz/3.tariffs, 2026-06-01 dan):

| Hajm | Yig'im |
|---|---:|
| 1 litrgacha | 5 250 so'm |
| har qo'shimcha litr | +250 so'm |
| yuqori chegara | 50 000 so'm |

Hajm o'lchanmagan bo'lsa qism `null` bo'ladi. Uzum qoidasida
"o'lchamsiz tovar — 50 000 so'm" bandi bor, lekin u sotuvchi
o'lchamni ko'rsatmagani uchun **jarima**; bizning hisobimizda
noma'lum hajm "bilmayman" degani bo'lishi kerak.

`marja_%` → ball chiziqli: `MARGIN_FLOOR` da 0, `MARGIN_TARGET` da 100.

Xitoy narxi bo'lmasa (4-qadam o'tilmagan) — qism `null`.

### 3. Raqobat — `raqobat` (teskari)

Ikki signaldan: sotuvchilar soni va top-3 ulushi.

```
raqobat_ball = 100 − (konsentratsiya_% × 0.7 + sotuvchi_zichligi × 0.3)
```

Monopoliya filtri (top-3 > chegaradan) alohida **bayroq** ham qo'yadi —
ball pasayishi bilan cheklanmaydi.

### 4. Kirish qiyinligi — `kirish` (teskari)

`category_requirements` dan: markirovka kerakmi, sertifikat kerakmi,
kutish vaqti, taxminiy xarajat. Har biri ballni pasaytiradi.

### 5. Mavsum — `mavsum`

`category_requirements.seasonality` — 12 oylik koeffitsient massivi.
Hozirgi oy koeffitsienti → ball. Mavsum tugayotgan bo'lsa `seasonal`
bayrog'i ham qo'yiladi.

### 6. Profil mosligi — `profil`

1-qadam javoblaridan. Masalan: otasi avtoehtiyot qism do'koni bo'lsa —
avto kategoriyaga **+ball** (tanish yetkazuvchi, bilim, sotuv kanali bor).

Moslik jadvali `SXEMA.md` dagi `user_profiles` maydonlariga tayanadi.

---

## Filtrlar balldan KEYIN emas, OLDIN

Tartib qat'iy:

```
1. nomzodlar ro'yxati
2. HIYLA-FILTRLAR  → `block` bo'lganlar chiqarib tashlanadi
3. ball hisoblanadi (qolganlari uchun)
4. `warn` bayroqlari ballni pasaytiradi
5. saralash va ko'rsatish
```

Agar ball avval hisoblansa, "block" tovar yuqorida turib qolishi va
ro'yxatga sirg'alib kirishi mumkin.

## Ma'lumot yetishmasa

Qism `null` bo'lsa u **vazndan ham chiqariladi** (nol deb sanalmaydi).
Agar ikkitadan ko'p qism `null` bo'lsa — tovar "hali baholab bo'lmaydi"
deb belgilanadi va tavsiyaga chiqmaydi.

## «Qo'llanmaydi» — «yo'q» dan BOSHQA holat

*Qo'shimcha, 2026-08-24. Yuqoridagi qoidani o'zgartirmaydi, chegarasini
aniqlaydi.*

Uchta holat bor, ikkitasi emas:

| Holat | Ma'nosi | Vaznda | «Yo'q» hisobida |
|---|---|---|---|
| son | o'lchangan javob (0 ham javob) | ✅ | — |
| `null` | **bilmayman** — o'lchanmagan | ❌ | ✅ sanaladi |
| qo'llanmaydi | shu BOSQICHDA umuman so'ralmaydi | ❌ | ❌ sanalmaydi |

Farq nima uchun kerak. 2-qadamda (yo'nalish tanlash) `marja` hech qachon
ma'lum emas: Xitoy narxi 4-qadamda keladi. Uni «yo'q» deb sanasak,
bitta qism **doim** yo'q bo'ladi — ya'ni 2-qadamda chegara amalda
2 emas, 1. Bu bosqichni tuzilishi bo'yicha imkonsiz qiladi: bugungi
ma'lumot bilan 300 turkumdan hech biri baholanmaydi va ro'yxat bo'sh
chiqadi.

Yechim chegarani ko'tarish EMAS. Chegarani ko'tarish har qanday boshqa
ma'lumot yetishmovchiligini ham yashirardi — bugun `marja` ni, ertaga
`talab` ni.

Kodda: `score(parts, maxNullParts, qollanmaydi)`. Uchinchi argument —
shu bosqichda qo'llanmaydigan qismlar ro'yxati. Ular vaznga ham,
«yo'q» hisobiga ham kirmaydi, lekin `breakdown` da `applicable: false`
bilan **ko'rinib turadi** — «Nega bu ball?» savoliga to'liq javob
berilishi kerak.

**Ro'yxat qisqa bo'lishi shart.** Bu yerga qism qo'shish — uni ballga
ta'sirsiz qilish demak, ya'ni tekshiruvni yumshatishning eng oson
yo'li. Har qo'shimcha shu hujjatda sababi bilan yozilishi kerak.

| Bosqich | Qo'llanmaydi | Sabab |
|---|---|---|
| 2-qadam (yo'nalish) | `marja` | Xitoy narxi 4-qadamda keladi |

`kirish` va `mavsum` bu ro'yxatda **yo'q**, garchi bugun ikkalasi ham
bo'sh bo'lsa ham: ular to'planishi kerak bo'lgan ma'lumot, ya'ni
`null` — «bilmayman». Bo'sh bo'lgani «qo'llanmaydi» degani emas.

## Tovar sotuvi — kengaytma (`tovar-sotuvi-v1`, 2026-10-21)

Nazoratchi qarori («Sotuvchi koʻzoynagi», 2026-10-21): kengaytma Uzum
roʻyxatida har tovar tagida sotuvni koʻrsatadi (A — bepul), tovar
sahifasida pasport (C) va taqqoslash jadvali (D) — obunada. Kod —
`packages/shared/src/tovar-sotuvi.ts`, testlar — haqiqiy oʻlchov bilan
(`packages/shared/test/fixtures/tovar-30kun-qatorlar.json`, VPS, 2026-10-21).

**Manba.** ZumSavdo yigʻuvchisi (VPS) butun katalogni har kuni oʻlchaydi
(~700 ming tovar/kun). Har tirik tovar uchun kuniga bir marta 30 kunlik
qator `zumsavdo.tovar_30kun` ga yoziladi (SXEMA.md). Qatorda oʻlchov bor —
kunlik qoldiq kamayishi; quyidagi tozalash shu yerda, bazada emas.

**Nega tozalanadi.** Faqat qoldiq kamayishini sanash adashtiradi.
Oʻlchandi (Termoslar, 21.09–20.10.2026): «eng koʻp sotilgan» 8 tovardan 7
tasida sotuvchi zaxirani bir kunda yuzlab donaga kamaytirgan — sotuv emas.
«Termos KINSDA»: hisob boʻyicha 713 dona, Uzum belgisi esa haftasiga 1 kishi,
yangi sharh 0. «Termos, 3 stakan»: qoldiq 666 → 0 → 666.

```
kunlik_chegara = max(10, 5 × p75, ⌈3 × eng_katta_belgi / 7⌉, ⌈30 × yangi_sharh / oʻlchangan_kun⌉)
sanaldi[kun]   = kamayish ≤ kunlik_chegara ? kamayish : 0      (oshgan kun BUTUNLAY sanalmaydi)
oyiga          = Σ sanaldi × 30 / maʼlum_kunlar                 (maʼlum kun < 7 → raqam yoʻq)
```

- **p75** — shu tovarning maʼlum kunlaridagi kamayishning 75-persentili (odatiy yaxshi kun).
- **Belgi va sharh chegarani faqat kengaytiradi.** Koʻp xaridori bor tovarning aksiya kuni
  sanalsin: BB krem (1334924) 30 kunda +214 sharh — sharhsiz chegara uning 437 donasidan
  135 tasini kesardi. «30 × sharh» — sharhni taxminan har 10-xaridor yozadi deb olingan
  (taxmin, oʻlchanmagan), ustiga 3 barobar zaxira. Belgining maʼnosi tasdiqlanmagan
  (`qadamlar.ts`, `MIQDOR_UCHUN_MANBA`) — u raqamning oʻrnini bosmaydi.
- **Oshgan kun nega 0, chegara emas.** «666 → 0 → 666» kunida haqiqiy sotuv yoʻq; chegarani
  sanasak, sotilmayotgan tovar «oyiga ~14 dona» boʻlib chiqardi. Narxi: haqiqiy katta kun
  ham yoʻqoladi — raqam pastga qiyshiq, yuqoriga emas (SXEMA.md, `sales_estimates`).

**Holat** (kartochka belgisi):

| Holat | Shart | Kartochkada |
|---|---|---|
| `tugagan` | oxirgi ≥ 3 oʻlchangan kun qoldiq 0 | kulrang «Tugagan» + belgi eskirgani |
| `kam` | maʼlum kun < 7 | «—» (raqam yoʻq) |
| `ziddiyat` | (a) oyiga > max(10 × belgi_oylik, belgi_oylik + 50) va sharh yoʻq; (b) belgi_oylik ≥ 100, oyiga < belgi_oylik / 10, qoldiq bor; (c) kamayishning yarmidan koʻpi (≥ 50 dona) kesilgan, sharh yoʻq va belgi buni koʻtarmaydi | sariq «Sotuv aniq emas» + sabab |
| `sotilyapti` | oyiga ≥ 30 | yashil «≈ N dona/oy» |
| `sekin` | 1 ≤ oyiga < 30 | sariq «≈ N dona/oy» |
| `sotilmadi` | oyiga 0 | kulrang «Sotuv koʻrinmadi» + Uzum belgisi yonida |
| `olchanmagan` | bazada qator yoʻq | «—» |

`belgi_oylik = belgi × 30 / 7` — faqat solishtirish uchun. (b) chegarasi 100: kichik belgida
(haftasiga ~8) farq maʼnosiz va kartochkalar «aniq emas» bilan toʻlib ketardi (jonli
tanlovda 30 boʻlganda 78 tadan 16 tasi, 100 da — 7 tasi).

**Ishonch:** `past` — ziddiyat, maʼlum kun < 14 yoki kamayishning yarmidan koʻpi kesilgan
va qolgani tasdiqlanmagan; `yuqori` — maʼlum kun ≥ 20 va tasdiqlangan (belgi bor — raqam
uning 0,2–5 barobari; yoʻq — oyiga < 30 yoki yangi sharh bor); qolgani — `oʻrta`.

**Chegara narx** (pasport, taqqoslash): `narx − komissiya − aylanma soligʻi − logistika`.
Komissiya — `selleros.uzum_komissiya` (turkum boʻyicha), soliq — fakt
`soliq.aylanma_foiz`, logistika — hajm nomaʼlum, shuning uchun eng kami (5 250 soʻm,
1 litrgacha): chegara aslida shundan PAST boʻlishi mumkin.

Jonli natija (fikstura, 78 tovar): 1978350 → 430, 3302715 → 300 (1 098 dan 838 tasi
kesildi, qolgani belgi va +45 sharh bilan mos), 1334924 → 504, KINSDA / 1580691 /
«IRON 2L» → «Sotuv aniq emas».

## Versiya tarixi

| Versiya | Sana | O'zgarish | Tasdiqladi |
|---|---|---|---|
| v0 | 2026-08-19 | Birinchi taklif | **kutilmoqda** |
| tovar-sotuvi-v1 | 2026-10-21 | Kengaytma uchun tovar sotuvi (yuqoridagi boʻlim) | **kutilmoqda** |
