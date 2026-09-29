# Mobil dizayn — holat

**Berildi:** 2026-09-29 (nazoratchi). Ikki fayl, bitta dizayn:

| Fayl | Mavzu |
|---|---|
| `ZUMSavdo-Mobil.html` | yorugʻ |
| `ZUMSavdo-Mobil-Tungi.html` | tungi |

Fayllar dizayn vositasining bundle formatida, ular kod emas, **manba**.
Ekranlar qoʻlda React Native ga oʻtkazilgan. Ranglar `src/lib/mavzu.ts`
da, dizayndagi hex qiymatlar bilan.

Webdan (`apps/web`, qora + sariq) ATAYLAB farq qiladi: ilova oʻz
dizayniga ega (terrakota `#D2552D`, Unbounded + Onest).

## Ekranlar → kod

| Dizayn | Ekran | Fayl |
|---|---|---|
| 1a–1f | Suhbat (hamma qadam) | `src/app/suhbat.tsx`, `src/ui/kod-kartalari.tsx`, `src/ui/javoblash.tsx` |
| 2a | Kirish | `src/app/kirish.tsx` |
| 2b | Bosh sahifa | `src/app/(tabs)/bosh.tsx` |
| 3a | Suhbatlar | `src/app/(tabs)/suhbatlar.tsx` |
| 3b | Yuklar | `src/app/(tabs)/yuklar.tsx` |
| 3c | Sozlamalar | `src/app/(tabs)/sozlama.tsx` |

## Nazoratchi qarori (2026-09-29)

"Dizayndagi hamma ekran hozir chiqsin, yoʻq funksiyalar keyingi
yangilanishda qoʻshiladi." Shuning uchun har ekran dizayn shaklida
qurilgan, tizimda hali yoʻq qismlari **"tez orada"** deb turadi
(web 2-qarori bilan bir xil). Keyingi yangilanishda faqat maʼlumot
ulanadi, ekran qayta chizilmaydi.

## Dizayndan ataylab chetga chiqilgan joylar

QOIDALAR.md 4-boʻlim (halollik) dizayndan ustun: dizayndagi raqamlar
namuna, ilovada esa har raqam API dan keladi yoki chiziqcha turadi.

| Dizaynda | Kodda | Nega |
|---|---|---|
| 2a: telefon + SMS, Telegram orqali kirish | Maydon va tugmalar bor, "tez orada", bosilmaydi. Ishlaydigani: "Mehmon sifatida boshlash" | Backendda login yoʻq, SMS provayderi tanlanmagan |
| 2b: "Kelib tushdi 16,4 mln, ROI +125%" | "Pul holati" kartasi, qiymatlar chiziqcha, "tez orada" | Sotuv raqami Uzum kabinetidan keladi, u ulanmagan |
| 2b: 3 ta faol savdo | Bitta haqiqiy savdo (joriy suhbat: qadam, tanlangan tovar) | Bitta sessiya = bitta suhbat |
| 2b: "Asrbek", "AB" | "Mehmon", "M" | Ism soʻralmaydi (PRIVACY.md) |
| 1a: "Tanishuv · 1 / 3" | "1-qadam · 12 dan", 12 segmentli progress | Ssenariy 12 qadam (web 7-qarori) |
| 1a: byudjet "10–30 mln" oraliqlari | Aniq son tugmalari serverdan ("30 mln soʻm") | 2026-08-24 qarori: byudjet aniq son |
| 1b: "moslik 92", oylik savdo, 3 oy oʻsishi, grafik | Ball, sotuvchilar, top-3 ulushi, optimal kirish | API da shu maydonlar bor (web bilan bir xil) |
| 1c: "Budjet rejasi", dona ± tugmalari, foyda | "Xitoyda chegara narx": Uzum narxi, marja, chegara | Miqdor suhbatda soʻraladi; foyda hisobini kod bermaydi |
| 1d: Taobao, Made-in-China, "Savatda", "$2.10" | Faqat 1688, ¥ va CBU kursi bilan soʻm; karta bosilsa tanlanadi | Provayder faqat 1688 (Apify) |
| 1e, 3b: yuk bosqichlari, "Bojxonada · ~4 okt" | 6-qadam varaqasidagi tovarlar; bosqichlar boʻsh, sana chiziqcha, "kuzatuv tez orada" | Kargo hamkori yoʻq (web 9-qarori) |
| 1f: pul holati, "Qoldiq tugayapti", raqobatchi | Yoʻq (8–12-qadam "tez orada") | Sotuv ulanmagan |
| 3a: 4 suhbat, arxiv | Bitta haqiqiy suhbat; arxiv "tez orada"; + tugmasi yoʻlni boshidan boshlaydi (ogohlantirish bilan) | Parallel savdo yoʻq |
| 3c: Uzum kabineti "Ulangan", Telegram, ogohlantirish kalitlari | "tez orada", kalitlar oʻchiq; Chrome kengaytmasi "Doʻkonda" (haqiqat) | Ulanishlar qurilmagan |
| 3c: Mavzu Yorugʻ / Tungi | + "Tizim" (telefon sozlamasiga ergashadi); standart tungi | Web 3-qarori: standart tungi |
