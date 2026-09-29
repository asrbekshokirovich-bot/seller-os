# Privacy Policy — Seller OS: Xitoydan top

**Last updated: 29 September 2026** (version 0.2.0 of the extension)

This policy describes what the Chrome extension **"Seller OS — Xitoydan top"**
does with data. It is written to match the extension's source code exactly;
the code is public at
<https://github.com/asrbekshokirovich-bot/seller-os/tree/main/apps/extension>.

---

## What the extension does

Two things:

1. It adds one button — **"Xitoydan top"** — to product pages on
   `uzum.uz`. When you click it, the extension looks up visually similar
   products on the Chinese wholesale marketplace 1688 and shows the results
   on the same page.
2. Clicking the extension icon opens a Chrome side panel that shows the
   **Seller OS chat** — our own website (`/usta` page) loaded in a frame.
   Everything you type there goes to our server exactly as it would if you
   opened the website in a tab; the website's own privacy terms apply. The
   panel uses the same anonymous session token as the button (see below),
   so your daily search limit is counted once.

## What is sent off your device

**Two things, and only when you click the button: the numeric product ID
of the Uzum page you are on, and the web address of that product's main
photo.**

The extension reads the product ID from the page address
(`uzum.uz/product/<id>`) and the address of the product's main photo from
the page (a public address on Uzum's image server, `images.uzum.uz/...`).
It sends both to our own server at `duequijnnzcngzzvjqst.supabase.co`.
Our server downloads that public product photo, converts it to JPEG, and
sends it to a third-party image-search provider (Apify, running a 1688
image-search actor) so it can find visually similar items. The results
come back to you on the same page.

The photo is the seller's public product picture. It is not a screenshot,
not your camera, and not any image you uploaded.

Nothing is sent when you merely browse. No button click, no request.

## What is stored on your device

One value in `chrome.storage.local`: an **anonymous session token** issued
by our server.

The token contains no name, email, or account. It exists so that repeated
searches count against one daily quota instead of opening a new session
every time. It never leaves your browser except as a header on requests to
our own server.

You can delete it at any time by removing the extension.

## What we do NOT collect

The extension does **not** collect, store, or transmit:

- names, email addresses, phone numbers or any identifying information
- passwords or credentials
- payment or financial information
- health information
- messages, emails or personal communications
- location or GPS data
- your browsing history or the list of pages you visit
- keystrokes, mouse movement or scrolling
- page text or videos
- screenshots, or any image other than the public address of the product's
  main photo (see above)

The extension runs **only** on `uzum.uz` pages. It has no access to any
other website.

## Third parties

The product photo (downloaded by our server from its public address) is
forwarded to an image-search provider — **Apify** (apify.com), which runs
a 1688 image-search actor — solely to perform the search you requested.
This is the extension's core function and no other data accompanies it:
no session token, no product ID, nothing about you.

Our server keeps the search result for 72 hours, keyed by the photo
address, so that the same product is not searched twice; the cache holds
1688 listings only, nothing about the person who searched.

We do not sell user data. We do not transfer user data for advertising,
profiling, credit scoring or lending. We do not use data for anything
unrelated to the single purpose described above.

## Remote code

The extension executes **no remote code**. All JavaScript ships inside the
extension package. There is no `eval()`, no dynamically loaded script, and
no external module.

## Retention

Search requests are logged on our server only as a count, to enforce the
daily quota. The anonymous session token expires and is discarded.

## Changes

If this policy changes, the date at the top will change and the new version
will be published at this same address.

## Contact

asrbekshokirovich@gmail.com

---
---

# Maxfiylik siyosati — Seller OS: Xitoydan top

**Oxirgi yangilanish: 2026-yil 10-sentabr**

Bu hujjat **"Seller OS — Xitoydan top"** Chrome kengaytmasi maʼlumot bilan
nima qilishini tushuntiradi. Matn kodning oʻziga qarab yozilgan; kod ochiq:
<https://github.com/asrbekshokirovich-bot/seller-os/tree/main/apps/extension>

## Kengaytma nima qiladi

Ikki narsa:

1. `uzum.uz` mahsulot sahifasiga bitta tugma qoʻshadi — **"Xitoydan top"**.
   Uni bosganingizda 1688 ulgurji bozoridan oʻxshash tovarlar qidiriladi va
   natija oʻsha sahifada koʻrsatiladi.
2. Kengaytma belgisini bossangiz Chrome yon paneli ochiladi va unda
   **Seller OS chati** — oʻz saytimizning `/usta` sahifasi — ramkada
   koʻrsatiladi. U yerga yozganingiz saytni oddiy ochgandagidek
   serverimizga boradi; saytning oʻz maxfiylik shartlari amal qiladi. Panel
   tugma bilan bir xil anonim seans tokenidan foydalanadi (quyida), kunlik
   limit bir marta hisoblanadi.

## Qurilmangizdan nima chiqadi

**Ikkita narsa, va faqat tugmani bosganingizda: siz turgan Uzum
sahifasining raqamli mahsulot identifikatori va oʻsha mahsulot asosiy
rasmining internet manzili.**

Kengaytma identifikatorni sahifa manzilidan (`uzum.uz/product/<id>`),
rasm manzilini esa sahifadan (Uzum rasm serveridagi ochiq manzil,
`images.uzum.uz/...`) oʻqiydi va ikkalasini oʻz serverimizga
(`duequijnnzcngzzvjqst.supabase.co`) yuboradi. Server oʻsha ochiq mahsulot
rasmini yuklab oladi, JPEG ga oʻgiradi va rasm boʻyicha qidiruv
provayderiga (Apify, 1688 rasm-qidiruv aktori) uzatadi — u oʻxshash
tovarlarni topadi. Natija sizga oʻsha sahifada koʻrsatiladi.

Bu rasm — sotuvchining ochiq mahsulot surati. Skrinshot emas, kamerangiz
emas, siz yuklagan rasm emas.

Shunchaki sahifani koʻrib turganingizda hech narsa yuborilmaydi.

## Qurilmangizda nima saqlanadi

`chrome.storage.local` da bitta qiymat: serverimiz bergan **anonim seans
tokeni**.

Tokenda ism, email yoki hisob yoʻq. U kunlik limit toʻgʻri hisoblanishi
uchun kerak — aks holda har qidiruvda yangi seans ochilardi. Token
brauzeringizdan faqat serverimizga yuborilgan soʻrov sarlavhasi sifatida
chiqadi.

Kengaytmani oʻchirsangiz token ham oʻchadi.

## Nimalarni YIGʻMAYMIZ

Kengaytma quyidagilarni yigʻmaydi, saqlamaydi va uzatmaydi:

- ism, email, telefon yoki shaxsni aniqlovchi maʼlumot
- parol yoki hisob maʼlumotlari
- toʻlov va moliyaviy maʼlumot
- sogʻliq maʼlumoti
- xabarlar, xatlar, shaxsiy yozishmalar
- joylashuv yoki GPS
- brauzer tarixi, koʻrgan sahifalaringiz roʻyxati
- klaviatura bosishlari, sichqoncha harakati, varaqlash
- sahifa matni yoki videolari
- skrinshot yoki mahsulot asosiy rasmining ochiq manzilidan boshqa har
  qanday rasm (yuqoriga qarang)

Kengaytma **faqat** `uzum.uz` sahifalarida ishlaydi. Boshqa saytlarga
kirish huquqi yoʻq.

## Uchinchi tomonlar

Mahsulot rasmi (serverimiz uni ochiq manzildan yuklab oladi) faqat siz
soʻragan qidiruvni bajarish uchun rasm-qidiruv provayderiga — **Apify**
(apify.com, 1688 rasm-qidiruv aktori) — uzatiladi. Bu kengaytmaning asosiy
vazifasi va u bilan birga boshqa hech qanday maʼlumot ketmaydi: seans
tokeni ham, mahsulot identifikatori ham, siz haqingizda hech narsa ham.

Serverimiz qidiruv natijasini rasm manzili boʻyicha 72 soat saqlaydi —
bir tovar ikki marta qidirilmasin; keshda faqat 1688 takliflari turadi,
kim qidirgani emas.

Maʼlumotni sotmaymiz. Reklama, profillash, kredit baholash yoki qarz berish
uchun uzatmaymiz. Yuqorida yozilgan yagona maqsaddan tashqari hech narsaga
ishlatmaymiz.

## Masofaviy kod

Kengaytma **masofaviy kod ishlatmaydi**. Barcha JavaScript paket ichida.
`eval()` yoʻq, tashqaridan yuklanadigan skript yoʻq, tashqi modul yoʻq.

## Saqlash muddati

Qidiruv soʻrovlari serverda faqat sanoq sifatida qayd etiladi — kunlik
limitni tekshirish uchun. Anonim seans tokeni muddati tugagach oʻchiriladi.

## Oʻzgarishlar

Siyosat oʻzgarsa, yuqoridagi sana oʻzgaradi va yangi matn shu manzilda
chop etiladi.

## Aloqa

asrbekshokirovich@gmail.com
