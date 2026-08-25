# QOIDALAR.md — agent konstitutsiyasi

> Repo ildizida turadi. Har sessiya shu fayldan boshlanadi: kontekst
> yo'qolsa ham qoidalar yo'qolmaydi.

Bu fayl **majburiy**. Undagi qoida bilan topshiriq ziddiyatga tushsa —
qoida ustun turadi, va ziddiyat ochiq aytiladi.

---

## 1. Rollar

| Agent (kod yozuvchi) | Nazoratchi (odam) |
|---|---|
| Butun kod bazasi va testlar | Kalitlar, pul, imzo, **qaror** |
| Migratsiya, seed, hujjat | PR ni merge qilish, prod deploy |
| Ball formulasini **taklif qilish** | Uni **tasdiqlash** |
| Tuzoq qoidalarini yozish | Tuzoq-tovar ro'yxatini berish |

Agent hech qachon: prod ga deploy qilmaydi, sirlarni yozmaydi, merchant
arizasi yubormaydi, shartnoma imzolamaydi.

## 2. Manba-haqiqat

Uchta fayl mahsulotning mantig'ini belgilaydi. Kod ular bilan zid bo'lsa —
**kod noto'g'ri**.

- `SXEMA.md` — ma'lumot modeli. Jadval qo'shilsa avval shu yerda.
- `FORMULA.md` — ball tizimi. Versiyalanadi, o'zgarishi tasdiq talab qiladi.
- `TUZOQLAR.md` — 8 hiyla-filtr: signal, chegara, tizim harakati.

## 3. Buzilmaydigan uchta qoida

**Tavsiyani KOD beradi, AI faqat tushuntiradi.**
Yo'nalish, tovar, miqdor — deterministik ball + filtrlar. Bir xil kirish →
har doim bir xil javob. LLM o'zi tovar tavsiya qilmaydi va SQL yozmaydi —
faqat tayyor funksiyalarni chaqiradi.

**Sirlar faqat `env` da.**
Kodda, logda, testda, commit xabarida — hech qachon. `.env` gitignore da.

**Yangi g'oya `BACKLOG.md` ga.**
Joriy bosqichga emas. Qamrov shishishi (scope creep) — eng katta xavf.

## 4. Halollik

Bu mahsulot odamlarning puliga ta'sir qiladi. Shuning uchun:

- Har raqam yonida **davr** va aniqlik izohi: "taxminiy (±3–5%)".
- **Kafolat so'zi taqiq.** "Albatta foyda qilasiz" — hech qachon.
  To'g'ri ohang: "statistika shuni ko'rsatadi, qaror sizniki".
- Tuzoq belgisi **yashirilmaydi** — tushuntiriladi.
- O'lchov yo'q bo'lsa **chiziqcha**, nol emas. Nol — "sotuv bo'lmagan"
  degan javob; chiziqcha — "javob yo'q". Ikkisi boshqa narsa.
- To'qilgan ma'lumot **hech qachon** bazaga yozilmaydi va ekranda
  ko'rsatilmaydi. Namuna generatori yo'q.

## 5. Ish tartibi

- Vazifa birligi — kichik ticket + qabul mezoni.
- Har o'zgarish — alohida PR + testlar + tavsif.
- Filtr va formulalar — **avval test, keyin kod** (TDD).
- Merge sharti — CI yashil: lint + testlar + tuzoq 100% + eval ≥90%.
- Sxema o'zgarishi — **faqat migratsiya orqali**. Qo'lda SQL yo'q.
- Har merge → staging ga avtomatik deploy. Prod — faqat odam tugmasi.

## 6. Bosqich darvozalari

B0 → B6 ketma-ket. Darvozadan **testsiz o'tilmaydi**. Agent bosqichni
istagancha tez o'tishi mumkin, lekin mezonni chetlab o'tolmaydi.

Kutish holati to'xtash emas: to'lov sandbox da, kargo ariza rejimida,
kengaytma sideload da ishlayveradi. Jonli rejim **flag** bilan yoqiladi.

## 7. Skreyping — "hurmat rejimi"

- Faqat **ochiq** sahifalar. Shaxsiy ma'lumot — faqat token bilan.
- Tezlik: boshida 2–4 so'rov/soniya. Xato ko'paysa — avtomatik
  sekinlashish va kill-switch.
- To'liq katalog aylanishi — tunda; kunduzi top kategoriyalar.
- Himoyani ataylab buzish (CAPTCHA aylanib o'tish, bloklashni chetlash) —
  **qilinmaydi**. Platforma yopiq bo'lsa, u yopiq deb yoziladi.

## 8. Jim o'lim taqiqlanadi

Filtr yoki hisob "bilmadim" qaytarishi TO'G'RI. Lekin u shu holatda
**abadiy** qolib ketishi mumkin va buni hech kim sezmaydi: xato
yozilmaydi, log to'lmaydi, test qizarmaydi, hujjatda "tayyor" deb
turaveradi.

Ikki marta sodir bo'lgan (2026-08-19):
- `shopOfficial` — Uzum hech qachon `true` bermaydi. 1-tuzoq shunga
  suyanardi, ya'ni hech qachon ishlamasdi.
- `sellersCount` — do'konlar aro tovar moslash yo'q, maydon hech qachon
  to'lmaydi. Filtr haqiqiy ma'lumotda doim "baholay olmadim" derdi.

Ikkalasida ham testlar yashil edi. **Sabab: kirish ma'lumotini test
muallifi o'zi yozgan.** Qo'lda yozilgan fikstura — tilak, o'lchov emas.

Shuning uchun:

1. Har filtrning darvoza testi **bazadan olingan haqiqiy o'lchov** bilan
   ishlaydi. Qo'lda yozilgan fikstura mantiqni sinash uchun qoladi,
   lekin darvozani u yopmaydi.
2. Kirish maydoni haqiqiy ma'lumotda kamida bir marta o'lchanishi shart.
   O'lchanmasa — CI yiqiladi. Ataylab o'lchanmaydigan maydon testdagi
   `OLCHANMAYDI` ro'yxatiga **sababi bilan** yoziladi. Jimlik emas,
   ongli qaror.
3. Filtr darvoza ro'yxatida kamida bir marta bayroq qo'yishi shart.
   Hech qachon ishlamaydigan filtr — o'lik kod.

### Nega bu takrorlanaveradi (2026-08-24 tahlili)

Bir kunda **yettita** jim kamchilik topildi. Yuqoridagi uchta qoida
ularning bittasini ham ushlamagan bo'lardi. Demak qoidalar to'g'ri,
lekin sabab chuqurroqda edi.

Yettitasi:

| # | Nima | Nima ko'ringan |
|---|---|---|
| 1 | `trackedProducts()` PostgREST 1000 qatorda kesilgan | Sweep "hammasini o'lchadim" degan, aslida 2% |
| 2 | Skreyperning ishga tushirish nuqtasi yo'q | 29 test yashil, `selleros` bo'sh |
| 3 | `PRODUCT_QUERY_STOK` chaqirilmagan | `stock` har doim `None`, sotuv baholash ishlamaydi |
| 4 | `next_delay()` qaytargan qiymati tashlangan | Hurmat rejimi qog'ozda, so'rov to'liq tezlikda |
| 5 | `so_sweep_close` bo'sh javob qaytargan | Yozish o'tgan, buyruq qizil — sabab chalg'itgan |
| 6 | `category_requirements` `NOT NULL boolean` + bo'sh jadval | Har turkum "sertifikat kerak emas" |
| 7 | `sertifikat()` ikkala maydonni ham talab qilgan | Bilingan talab yashiringan |

**Umumiy sabab bitta: bu joylarda «hech narsa bo'lmadi» va «hammasi
joyida» bir xil ko'rinadi.**

Har birida tizim javob qaytargan — 200, `false`, bo'sh ro'yxat, yashil
test. Javob bor bo'lgani uchun hech kim savol bermagan.

Uchta shakl takrorlanadi:

**a) Standart qiymat da'voga aylanadi.** `NOT NULL DEFAULT false`,
`Number("")` → `0`. Tur tizimi qiymat talab qiladi, yo'qlik esa
javobga aylanadi. (6-band, va bugun `user_profiles` da oldini oldik.)

**b) Chegara jimgina kesadi.** PostgREST 1000 qatordan keyin to'xtaydi
va 200 qaytaradi. Uning shartnomasi "mana ma'lumot", "mana
BUTUN ma'lumot" emas. (1-band.)

**c) Test o'lik kodni tirik ko'rsatadi.** Test funksiyani o'zi
chaqiradi. Shuning uchun "uni hech kim chaqirmaydi" degan holat
testda ham yashil bo'ladi. (2- va 3-bandlar.)

Uchinchisi eng ayyori, chunki u tekshiruvning o'ziga tegadi. Buni
o'lchab ko'rdik: `scripts/olik-kod.mjs` ning birinchi versiyasi
testni ham sanardi va shu sababli 3-bandni ushlay olmadi — qorovulda
u tekshiradigan kasallikning o'zi bor edi.

Shuning uchun yana ikki qoida:

4. **Eksport ishlab chiqarish kodida ishlatilishi shart. Test
   sanalmaydi.** `npm run olik-kod` shuni tekshiradi. Ataylab hali
   ulanmagan kod `ISTISNO` ro'yxatiga **sababi bilan** yoziladi —
   "jimgina o'lik" bilan "bilib turib o'lik" orasidagi farq shu.

5. **Ro'yxat qaytaradigan har bir chegara to'liqligi bilan
   tekshiriladi.** Sahifalab o'qilsa — `count` bilan solishtiriladi;
   yaxshirog'i, chegara umuman tegmaydigan shakl tanlanadi
   (`so_select_tracked` bitta jsonb massiv qaytaradi, qator emas).

Bularning ikkalasi ham CI qadami — eslash yoki ehtiyotkorlikka
tayanmaydi.

### Yana ikki shakl (2026-08-24, B2 ishida topildi)

Yuqoridagi uch shaklga ikkitasi qo'shildi. Ikkalasi ham **tekshiruvning
o'ziga** tegadi, ya'ni (c) ning qarindoshlari.

**d) Shart o'z chegarasi bilan boqiladi.** `talab()` o'lchov kunini
so'raydi va `< MIN_DAYS_FOR_DEMAND` bo'lsa `null` qaytaradi. Chaqiruvchi
esa kun o'rniga `MIN_DAYS_FOR_DEMAND` ning **o'zini** uzatgan. Shart
kodda turibdi, testi ham bor, lekin u hech qachon ishlamaydi — chunki
kirish har doim aynan chegarada.

Qoida: **shart qo'llanmasa, uni kirishni soxtalashtirib emas, ochiq
aytish kerak.** Endi `talab(..., manba)` bor: `'stok-farqi'` da kun
shart, `'togridan-togri'` da shart emas — va bu tanlov kodda ham,
`FORMULA.md` da ham ko'rinib turadi.

Bu shaklni topish oson: agar argument sifatida chegara konstantasi
uzatilayotgan bo'lsa, o'sha shart o'lik.

**e) Test o'zi qo'ymagan shartga tayanadi.** `/yonalishlar` uchining
birinchi testi "baza ulanmagan bo'lsa bo'sh ro'yxat qaytarmaydi"
deb yozilgan va yashil edi. Lekin muhitda `SUPABASE_*` **bor** edi
— faqat boshqa loyihaga ishora qilardi. So'rov haqiqatan ketgan,
404 olgan va uch "baza javob bermadi" degan. Test o'tdi, ammo o'zi
tekshiraman degan sababdan emas; to'g'ri ulangan muhitda esa yiqilardi.

Belgi ochiq turgan edi: test 1,5 soniya ishlagan. Sof funksiya uchun
mumkin bo'lmagan vaqt.

Qoida: **test o'z shartini o'zi qo'yadi.** Muhit o'zgaruvchisiga
bog'liq test uni ataylab tozalaydi va tozalanganini **tekshiradi**.
Muhitdan meros olingan shart — shart emas, tasodif.

**f) Qorovul yangi faylni ko'rmaydi.** Sir qidiruvchi `git grep`
ishlatardi, u esa faqat KUZATILAYOTGAN fayllarni o'qiydi. Yangi
yaratilgan fayl unga umuman ko'rinmaydi — u faqat `git add` dan
KEYIN paydo bo'ladi.

Sir uchun bu tartib teskari: qorovul kalitni omborga tushishidan
OLDIN ko'rishi kerak. Amalda mahalliy CI yashil chiqdi, o'sha
commit esa GitHub da qizardi — ya'ni qorovul ishladi, lekin bir
commit KECH. Haqiqiy kalit bo'lganida u allaqachon tarixda
qolardi.

Tuzatildi: `git grep --untracked`. `.gitignore` dagi fayllar
baribir chetlab o'tiladi, ya'ni `ingest/.env` tegilmaydi.

Umumiy shakl: **tekshiruvning ko'rish maydoni uning va'dasidan
tor bo'lmasligi kerak.** (b) chegara qatorlarni kesardi, bu esa
fayllarni. Ikkalasida ham vosita "hammasi" deb tushunilgan, aslida
esa "kuzatilgani" yoki "birinchi 1000 tasi" degan.

**Bu shakl IKKINCHI marta takrorlandi (2026-08-25).** Sir
qidiruvchi tuzatilgan edi, lekin `olik-kod.mjs` da xuddi shu
`git ls-files` qolib ketgan. Yangi yozilgan `tannarx.ts` da o'lik
eksport bor edi; `npm run olik-kod` **yashil** dedi, `git add`
dan keyin esa o'shа buyruq uni topdi — ya'ni xato yana bir commit
kechikardi.

Xulosa: bitta qorovulni tuzatish yetarli emas. Bir vosita shu
loyihada ishonchsiz chiqsa, uni ISHLATADIGAN HAMMA joy
tekshirilishi kerak. Endi ikkala qorovul ham kuzatilmagan
fayllarni ko'radi.

**g) Sanoqchi o'zi yaratgan murojaatni sanaydi.** (c) ning ikkita
yangi ko'rinishi topildi, ikkalasi ham `olik-kod.mjs` ning o'zida:

1. **Mashina yozgan nusxa.** `tayyorlash.mjs` `packages/shared` ni
   Edge Function papkasiga ko'chiradi. Nusxadagi har nom ikkinchi
   marta uchraydi, ya'ni **har qanday o'lik eksport tirik ko'rinadi**.
   Nusxa hech kimning qarori emas — u dalil bo'la olmaydi.
2. **Qorovulning o'z daftari.** `ISTISNO` ro'yxati nomlarni matn
   sifatida saqlaydi va o'sha fayl ham skanerlanardi. Ya'ni qorovul
   o'z bookkeeping yozuvini "ishlatilgan" deb sanardi.

Birinchisi tuzatilgach qorovul darhol haqiqiy nosozlik topdi:
`TRAP_LABEL` — tuzoqlarning **o'zbekcha nomlari** — hech qayerdan
chaqirilmasdi. API faqat mashina nomlarini qaytarardi, ya'ni
foydalanuvchi uchun yozilgan matn foydalanuvchiga hech qachon yetib
bormasdi. Endi `/tuzoqlar` javobida `turlar` maydoni bor.

**h) Baza funksiyasining javob SHAKLI — shartnoma.**
`so_yonalish_nomzodlari()` massiv qaytarardi, men uni obyektga
o'zgartirdim va migratsiyani darhol qo'lladim. Uni O'QIYDIGAN kod
esa hali eski edi: Edge Function massiv kutardi, obyekt oldi va
**500 qaytardi**. To'rt daqiqa davomida uch ishlamadi.

Migratsiya "faqat baza" emas. Uni o'qiydigan har bir joy — backend,
Edge Function, skreyper, panel — o'sha shartnomaga bog'langan.

Tartib: **avval kod (ikkala shaklni ham qabul qiladigan), keyin
migratsiya, keyin eski shaklni olib tashlash.** Yoki, kichik
loyihada — migratsiya va deploy bir commitda, va uzilish oynasi
BILIB TURIB qabul qilinadi. Farqi: birinchisida uzilish yo'q,
ikkinchisida u kutilgan va qisqa. Yomoni — uchinchisi: uzilish bor,
lekin uni hech kim kutmagan.

### Istisno "hozircha" degani, "abadiy" emas

`ISTISNO` ro'yxatining o'zi ham jim o'lim manbai: nom bir marta
yozilsa, kod TIRILGANDAN keyin ham chetda qolaveradi va ro'yxat
vaqt o'tishi bilan qorovulning ko'zini yumib boradi.

Shuning uchun teskarisi ham tekshiriladi: **istisnodagi nom ishlab
chiqarishda ishlatilsa — CI qizaradi** va ro'yxatdan o'chirishni
talab qiladi. Bugun aynan shunday bo'ldi: `profilOqi` `/yonalishlar`
uchiga ulangach, uni ro'yxatdan chiqarishni qorovulning o'zi so'radi.

## 9. Ushbu faylni o'zgartirish

Faqat nazoratchi tasdig'i bilan, alohida PR da, sababi yozilgan holda.
