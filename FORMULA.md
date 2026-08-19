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

### 2. Marja — `marja`

```
sof_foyda_1_dona = sotuv_narxi
                 − xitoy_narxi
                 − kargo(og'irlik, hajm)
                 − bojxona/QQS
                 − platforma_komissiyasi
marja_% = sof_foyda_1_dona / sotuv_narxi
```

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

## Versiya tarixi

| Versiya | Sana | O'zgarish | Tasdiqladi |
|---|---|---|---|
| v0 | 2026-08-19 | Birinchi taklif | **kutilmoqda** |
