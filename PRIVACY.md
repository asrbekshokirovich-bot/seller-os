# Privacy Policy — ZumSavdo: Xitoydan top

**Last updated: 22 October 2026** (version 0.3.0 of the extension)

This policy describes what the Chrome extension **"ZumSavdo — Xitoydan top"**
does with data. It is written to match the extension's source code exactly;
the code is public at
<https://github.com/asrbekshokirovich-bot/seller-os/tree/main/apps/extension>.

---

## What the extension does

1. **Sales labels on Uzum lists** (new in 0.3.0). On `uzum.uz` search and
   category pages, each product card gets a small label in the corner of its
   photo — for example "≈ 430/oy" (about 430 sold per month, our estimate
   from public stock changes over the last 30 days). A switch at the bottom
   of the page ("Sotuvchi koʻzi" / "Xaridor koʻzi") turns the labels off.
2. **Product passport** (new in 0.3.0). On a product page, under the
   "Xitoydan top" button, a panel shows the same product's 30-day sales
   chart, price range, days out of stock, Uzum's commission for its category
   and a break-even purchase price.
3. **Comparison tray** (new in 0.3.0). "+ Taqqoslash" adds up to five
   products to a tray; "Jadvalda taqqoslash" opens a comparison table on our
   website in a new tab.
4. **"Xitoydan top"** — on a product page, looks up visually similar products
   on the Chinese wholesale marketplace 1688 and shows the results there.
5. **Side panel** — clicking the extension icon opens the ZumSavdo chat (our
   website's `/usta` page) in Chrome's side panel. Everything you type there
   goes to our server exactly as it would if you opened the website in a tab;
   the website's own privacy terms apply.

All sales numbers come from our own measurements of public Uzum listings.
The extension does not read your Uzum account, cart or orders.

## What is sent off your device

Only to our own server at `duequijnnzcngzzvjqst.supabase.co`, and only these:

- **Product numbers shown on the page** — while sales labels are on, the
  numeric IDs of the products listed on the Uzum page you are viewing (read
  from the product links on that page), so the server can return their
  labels. With "Xaridor koʻzi" on, nothing is requested.
- **The product number of the product page you open** — for its passport.
- **When you click "Xitoydan top"**: that product's number and the public web
  address of its main photo (`images.uzum.uz/...`). Our server downloads that
  public photo, converts it to JPEG and sends it to an image-search provider
  (Apify, running a 1688 image-search actor), which finds similar items.
- **When you open the comparison table**: the product numbers in your tray
  are part of the page address on our website, so the link can be shared.

Nothing else from the page is sent: no page text, no prices you see, no
photos (except the public product photo address above, only on click).

Product numbers sent for labels and passports are used only to answer that
request. They are **not stored** and are not linked to you.

## What is stored on your device

In `chrome.storage.local`:

- an **anonymous session token** issued by our server (no name, email or
  account; it keeps the daily "Xitoydan top" limit counted once);
- your **label switch** ("Sotuvchi koʻzi" on or off);
- your **comparison tray**: up to five product numbers with the product
  names shown on Uzum.

They never leave your browser, except the token as a header on requests to
our own server. Removing the extension deletes all three.

## What we do NOT collect

The extension does **not** collect, store, or transmit:

- names, email addresses, phone numbers or any identifying information
- passwords or credentials
- payment or financial information
- health information
- messages, emails or personal communications
- location or GPS data
- a history of the pages you visit (product numbers are used only to answer
  the label request and are not saved)
- keystrokes, mouse movement or scrolling
- page text or videos
- screenshots, or any image other than the public address of the product's
  main photo (only when you click "Xitoydan top")

The extension runs **only** on `uzum.uz` pages. It has no access to any
other website.

## Third parties

The product photo (downloaded by our server from its public address) is
forwarded to an image-search provider — **Apify** (apify.com), which runs a
1688 image-search actor — solely to perform the search you requested. No
other data accompanies it: no session token, no product number, nothing
about you. Sales labels, passports and comparisons involve no third party.

Our server keeps a search result for 72 hours, keyed by the photo address,
so the same product is not searched twice; the cache holds 1688 listings
only, nothing about the person who searched.

We do not sell user data. We do not transfer user data for advertising,
profiling, credit scoring or lending. We do not use data for anything
unrelated to the purposes described above.

## Remote code

The extension executes **no remote code**. All JavaScript ships inside the
extension package. There is no `eval()`, no dynamically loaded script, and
no external module.

## Retention

"Xitoydan top" requests are logged on our server only as a count, to enforce
the daily limit. Label and passport requests are not logged. The anonymous
session token expires and is discarded.

## Changes

If this policy changes, the date at the top will change and the new version
will be published at this same address.

## Contact

asrbekshokirovich@gmail.com

---
---

# Maxfiylik siyosati — ZumSavdo: Xitoydan top

**Oxirgi yangilanish: 2026-yil 22-oktabr** (kengaytma 0.3.0)

Bu hujjat **"ZumSavdo — Xitoydan top"** Chrome kengaytmasi maʼlumot bilan
nima qilishini tushuntiradi. Matn kodning oʻziga qarab yozilgan; kod ochiq:
<https://github.com/asrbekshokirovich-bot/seller-os/tree/main/apps/extension>

## Kengaytma nima qiladi

1. **Uzum roʻyxatida sotuv belgisi** (0.3.0 dan). `uzum.uz` qidiruv va turkum
   sahifalarida har tovar rasmining burchagida kichik belgi chiqadi —
   masalan «≈ 430/oy» (oyiga taxminan 430 dona sotiladi: oxirgi 30 kundagi
   ochiq qoldiq oʻzgarishidan bizning hisobimiz). Sahifa pastidagi
   «Sotuvchi koʻzi» / «Xaridor koʻzi» tugmasi belgilarni oʻchiradi.
2. **Tovar pasporti** (0.3.0 dan). Tovar sahifasida, «Xitoydan top» tugmasi
   ostida: shu tovarning 30 kunlik sotuv grafigi, narx oraligʻi, tugab qolgan
   kunlar, turkum boʻyicha Uzum komissiyasi va chegara narx.
3. **Taqqoslash savati** (0.3.0 dan). «+ Taqqoslash» beshtagacha tovarni
   savatchaga qoʻshadi; «Jadvalda taqqoslash» saytimizda taqqoslash
   jadvalini yangi oynada ochadi.
4. **«Xitoydan top»** — tovar sahifasida 1688 ulgurji bozoridan oʻxshash
   tovarlarni qidiradi va natijani oʻsha sahifada koʻrsatadi.
5. **Yon panel** — kengaytma belgisini bossangiz Chrome yon panelida ZumSavdo
   chati (saytimizning `/usta` sahifasi) ochiladi. U yerga yozganingiz
   saytni oddiy ochgandagidek serverimizga boradi; saytning oʻz maxfiylik
   shartlari amal qiladi.

Hamma sotuv raqamlari — ochiq Uzum sahifalarini oʻzimiz oʻlchaganimizdan.
Kengaytma Uzumdagi hisobingiz, savatingiz va buyurtmalaringizni oʻqimaydi.

## Qurilmangizdan nima chiqadi

Faqat oʻz serverimizga (`duequijnnzcngzzvjqst.supabase.co`) va faqat shular:

- **Sahifadagi tovar raqamlari** — sotuv belgilari yoqiq paytda siz koʻrib
  turgan Uzum sahifasidagi tovarlarning raqamli identifikatorlari (sahifadagi
  tovar havolalaridan oʻqiladi): server ularning belgisini qaytaradi.
  «Xaridor koʻzi» yoqiq boʻlsa — hech narsa soʻralmaydi.
- **Siz ochgan tovar sahifasining raqami** — pasport uchun.
- **«Xitoydan top» bosilganda**: oʻsha tovar raqami va asosiy rasmining ochiq
  manzili (`images.uzum.uz/...`). Server shu ochiq rasmni yuklab oladi, JPEG
  ga oʻgiradi va rasm-qidiruv provayderiga (Apify, 1688 rasm-qidiruv aktori)
  uzatadi — u oʻxshash tovarlarni topadi.
- **Taqqoslash jadvali ochilganda**: savatdagi tovar raqamlari saytimizdagi
  sahifa manzilida turadi — havolani ulashsa boʻladi.

Sahifadan boshqa hech narsa ketmaydi: sahifa matni ham, siz koʻrgan narxlar
ham, rasmlar ham (yuqoridagi ochiq rasm manzilidan tashqari, faqat bosilganda).

Belgi va pasport uchun yuborilgan tovar raqamlari faqat oʻsha soʻrovga javob
berish uchun ishlatiladi. Ular **saqlanmaydi** va sizga bogʻlanmaydi.

## Qurilmangizda nima saqlanadi

`chrome.storage.local` da:

- serverimiz bergan **anonim seans tokeni** (ism, email, hisob yoʻq; «Xitoydan
  top» kunlik limiti bir marta hisoblanishi uchun);
- **belgilar tugmasi** holati («Sotuvchi koʻzi» yoqiq yoki oʻchiq);
- **taqqoslash savati**: beshtagacha tovar raqami va Uzumdagi nomi.

Ular brauzeringizdan chiqmaydi — faqat token serverimizga soʻrov sarlavhasi
boʻlib boradi. Kengaytmani oʻchirsangiz uchalasi ham oʻchadi.

## Nimalarni YIGʻMAYMIZ

Kengaytma quyidagilarni yigʻmaydi, saqlamaydi va uzatmaydi:

- ism, email, telefon yoki shaxsni aniqlovchi maʼlumot
- parol yoki hisob maʼlumotlari
- toʻlov va moliyaviy maʼlumot
- sogʻliq maʼlumoti
- xabarlar, xatlar, shaxsiy yozishmalar
- joylashuv yoki GPS
- koʻrgan sahifalaringiz tarixi (tovar raqamlari faqat belgi soʻroviga javob
  berish uchun ishlatiladi va saqlanmaydi)
- klaviatura bosishlari, sichqoncha harakati, varaqlash
- sahifa matni yoki videolari
- skrinshot yoki mahsulot asosiy rasmining ochiq manzilidan boshqa har
  qanday rasm (faqat «Xitoydan top» bosilganda)

Kengaytma **faqat** `uzum.uz` sahifalarida ishlaydi. Boshqa saytlarga
kirish huquqi yoʻq.

## Uchinchi tomonlar

Mahsulot rasmi (serverimiz uni ochiq manzildan yuklab oladi) faqat siz
soʻragan qidiruvni bajarish uchun rasm-qidiruv provayderiga — **Apify**
(apify.com, 1688 rasm-qidiruv aktori) — uzatiladi. U bilan birga boshqa hech
narsa ketmaydi: seans tokeni ham, tovar raqami ham, siz haqingizda hech narsa
ham. Sotuv belgilari, pasport va taqqoslashda uchinchi tomon yoʻq.

Serverimiz qidiruv natijasini rasm manzili boʻyicha 72 soat saqlaydi — bir
tovar ikki marta qidirilmasin; keshda faqat 1688 takliflari turadi, kim
qidirgani emas.

Maʼlumotni sotmaymiz. Reklama, profillash, kredit baholash yoki qarz berish
uchun uzatmaymiz. Yuqorida yozilgan maqsadlardan tashqari hech narsaga
ishlatmaymiz.

## Masofaviy kod

Kengaytma **masofaviy kod ishlatmaydi**. Barcha JavaScript paket ichida.
`eval()` yoʻq, tashqaridan yuklanadigan skript yoʻq, tashqi modul yoʻq.

## Saqlash muddati

«Xitoydan top» soʻrovlari serverda faqat sanoq sifatida qayd etiladi —
kunlik limitni tekshirish uchun. Belgi va pasport soʻrovlari qayd etilmaydi.
Anonim seans tokeni muddati tugagach oʻchiriladi.

## Oʻzgarishlar

Siyosat oʻzgarsa, yuqoridagi sana oʻzgaradi va yangi matn shu manzilda
chop etiladi.

## Aloqa

asrbekshokirovich@gmail.com
