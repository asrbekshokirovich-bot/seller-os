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

## Bugungi holat (2026-08-25 da oʻlchandi)

| Nima | Soni |
|---|---:|
| `marking_reference` dagi qator (markirovka) | 13 |
| Ulardan `category_requirements` ga tushgani | 3 |
| **`certificate_required` toʻldirilgan turkum** | **0** |
| Kuzatuvdagi turkum | 318 |
| Uzumdagi jami turkum | 5 315 |

Yaʼni 5-tuzoq (sertifikat/markirovka) bugun deyarli hech qayerda
ishlamaydi.

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

`supabase/seed/certificate_required.TODO.csv` — men eng
muhim **30 ta turkumni talab boʻyicha tartiblab** tayyorladim.
Faqat uch ustunni toʻldirish qoladi:
`marking_required`, `certificate_required`, `source`.

Birinchi oʻntalik (talab — oʻlchangan, taxmin emas):

| Turkum | Talab |
|---|---:|
| Smartfonlar Android | 618 813 |
| Qoplamalar | 285 516 |
| Simsiz quloqchinlar | 265 835 |
| Sumkalar | 209 020 |
| Parfyumlangan suv | 178 247 |
| Ziraklar | 154 057 |
| Krossovkalar | 146 784 |
| Soat | 132 246 |
| Uzuklar | 112 946 |
| Smartfonlar Apple iPhone (iOS) | 112 004 |

Hammasini toʻldirish shart emas. **Bittasini** toʻldirsangiz ham
oʻsha turkum boʻyicha filtr darhol ishlay boshlaydi.

## Nazoratchi aynan NIMA qilishi kerak

> Qisqa javob: **huquqiy qaror qabul qilish shart emas.**
> Menga roʻyxatning MATNI kerak, xulosa emas. Uzum turkumlariga
> moslashtirishni oʻzim qilaman.

### Nima allaqachon bor

`VMQ 148, 02.04.2022` (lex.uz/docs/-5936141) dan 13 ta turkum
olingan — hammasi maishiy texnika:

| Guruh | Turkumlar |
|---|---|
| 1-guruh | muzlatgich, kir yuvish mashinasi, televizor, changyutgich |
| 2-guruh | dazmol, gaz pechka, mikrotoʻlqinli pech |
| 3-guruh | konditsioner, blender, mikser |

### Nima yetishmayapti

Foydalanuvchilarga eng koʻp tavsiya qilinadigan turkumlar bu
roʻyxatda **umuman yoʻq**: smartfon, simsiz quloqchin, parfyum,
kosmetika, krossovka, zargarlik.

Yaʼni ular boshqa hujjatga tegishli yoki umuman talab yoʻq —
va men buni bilmayman.

### Uch manba, arzonidan boshlab

**1. Uzumning oʻz sotuvchi hujjatlari — eng arzon va eng aniq.**

Uzum sotuvchidan qaysi turkumlarda sertifikat soʻrashini oʻzi
belgilaydi va buni sotuvchi kabinetida/qoʻllanmasida yozadi.
Aynan shu narsa savdoni toʻxtatadi — qonun emas, platformaning
talabi.

Kerak: sotuvchi kabinetidagi yoki yordam boʻlimidagi
&laquo;qanday turkumlarda sertifikat kerak&raquo; roʻyxati.
Skrinshot ham boʻladi.

**2. lex.uz — asosi.**

Qidiruv soʻzlari: *majburiy sertifikatlashtirish*,
*muvofiqlik sertifikati*, *majburiy sertifikatlash roʻyxati*.

Kerak: hujjat nomi, sanasi, havolasi va **ilovadagi tovar
roʻyxati matni**.

**3. Sertifikatlashtirish organi yoki huquqshunos** — faqat
`entry_cost_uzs` va `entry_weeks` uchun. Bu majburiy emas,
filtr busiz ham ishlaydi.

### Menga qanday yuborish kerak

Quyidagilarning **istalgan bittasi** yetadi:

* lex.uz sahifasiga havola,
* roʻyxat matnini nusxalab tashlash,
* skrinshot,
* Uzum kabinetidagi roʻyxat rasmi.

CSV ni oʻzingiz toʻldirishingiz **shart emas**. Roʻyxatni
bersangiz, men uni Uzum turkumlariga moslashtirib, `source`
maydonini toʻldirib, faylga yozaman va bazaga qoʻyaman.

Bir shart bor: **xulosa emas, MANBA kerak.** &laquo;Menimcha
parfyumga sertifikat kerak&raquo; degan gap yozilmaydi — chunki
keyin uni hech kim qayta tekshira olmaydi va bir yildan keyin
qoida oʻzgarsa, buni hech narsa koʻrsatmaydi.

### Eng kichik foydali qadam

Bittagina turkumni oling — masalan **Simsiz quloqchinlar**
(talab 265 835). Uzum kabinetida yoki lex.uz da shu boʻyicha
nima yozilganini toping va menga tashlang.

Bitta turkum ham filtrni oʻsha yerda darhol ishga tushiradi.

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
