-- 9-qadam (Studiya) va 10-qadam (Yuklash) faktlari: Uzum tovar surati
-- talablari va kartochka qoidalari. Manba — Uzum rasmiy qoʻllanmasi,
-- 5-bob (Tovar kartochkalarini yaratish, 5.1, 5.7, 5.9, VGT) va 7-bob
-- (Fotostudiya — RU matni), 2.12 (surat mualliflik shikoyatlari).
-- Agent brauzerda oʻqidi 2026-09-29. Qoʻllanma oʻzgarsa — shu qatorlar
-- tuzatiladi, kod oʻzgarmaydi. `on conflict do nothing`: nazoratchi
-- tuzatgani saqlanadi.
--
-- DIQQAT: jsonb literallarida ASCII apostrof YOʻQ — faqat ʻ (U+02BB).
-- `supabase/test/migratsiya-jsonb.test.ts` buni tekshiradi (0058 saboqi).

insert into selleros.fakt (kalit, qiymat, birlik, manba, olchandi, izoh) values
  -- ---------------------------------------------------------------- surat: texnik talab
  ('uzum.surat.format', '"JPEG, JPG, WebP, PNG"'::jsonb, 'matn',
   'seller.uzum.uz/manual/uz/5.product-creation (5.7)', '2026-09-29', 'Video — MP4.'),
  ('uzum.surat.min_eni', '750'::jsonb, 'px',
   'seller.uzum.uz/manual/uz/5.product-creation (5.7)', '2026-09-29', 'Minimal ruxsat 750 × 1000.'),
  ('uzum.surat.min_boyi', '1000'::jsonb, 'px',
   'seller.uzum.uz/manual/uz/5.product-creation (5.7)', '2026-09-29', null),
  ('uzum.surat.nisbat', '"vertikal 3:4"'::jsonb, 'matn',
   'seller.uzum.uz/manual/uz/5.product-creation (5.7)', '2026-09-29', null),
  ('uzum.surat.max_mb', '5'::jsonb, 'MB',
   'seller.uzum.uz/manual/uz/5.product-creation (5.7)', '2026-09-29', 'Video — 10 MB gacha.'),
  ('uzum.surat.tovar_ulush_min', '50'::jsonb, '%',
   'seller.uzum.uz/manual/uz/5.product-creation (5.7)', '2026-09-29', 'Suratdagi tovar kadrning 50 % dan koʻpini egallashi kerak.'),

  -- ---------------------------------------------------------------- surat: mazmun qoidalari
  ('uzum.surat.qoidalar', '[
     "Har SKU uchun kamida bitta surat — tovarning old tomoni; SKU ning birinchi surati old tomon boʻlsin",
     "Tovar toʻliq koʻrinsin, kesilmasin; kadrning 50 % dan koʻpini egallasin",
     "Qadoqdagi tovar surati yagona surat boʻlmasin",
     "Rangli filtr, qayta yoritish, qoraytirish yoʻq; xiralik, shovqin, ramka yoʻq",
     "Fon: yorqin boʻlmagan, bir xil rang tavsiya etiladi (oq — mos); tartibsiz maishiy fon mumkin emas",
     "Suratda tovarga aloqasiz buyum va odam boʻlmasin",
     "Suratdagi matn faqat oʻzbek yoki rus tilida — xitoycha yozuvli surat mos emas",
     "Tovar haqida chalgʻituvchi sunʼiy intellekt tasviri taqiqlanadi — tovar haqiqiy koʻrinishda boʻlsin",
     "Boshqa Uzum doʻkonining suv belgisi (doʻkon nomi) boʻlgan surat — shikoyat boʻlsa hujjatsiz bloklanadi"
   ]'::jsonb, 'roʻyxat',
   'seller.uzum.uz/manual/uz/5.product-creation (5.7); 2.seller-requirements (2.12)', '2026-09-29',
   'Moderator mos kelmagan suratlarni olib tashlaydi yoki kartochkani bloklaydi.'),
  ('uzum.surat.fotostudiya', '"FBO: omborga kelganda har SKU dan 1 dona Uzum Fotostudiyasiga olinadi; suratga olingandan keyin u «Brak» boʻlimiga tushadi (sotuvga qaytmaydi) — biznes-qoʻllab-quvvatlash orqali olib ketiladi. Kiyimda tanlanadigan oʻlchamlar: ayollar S-M, erkaklar L-XL, plyus 3XL-4XL, bolalar 99/30, poyabzal 36 (39)."'::jsonb, 'matn',
   'seller.uzum.uz/manual/7.work (RU, «Фотостудия»); 5.product-creation', '2026-09-29',
   'Kartochka yuborishdan OLDIN yaratiladi va unga surat kerak — Fotostudiya suratlari keyin qoʻshiladi.'),
  ('uzum.surat.qollanma.url', '"https://seller.uzum.uz/manual/uz/5.product-creation/"'::jsonb, 'url',
   'seller.uzum.uz/manual/uz', '2026-09-29', 'Rasmiy qoʻllanma, 5-bob, 5.7 — suratlar va videolar.'),

  -- ---------------------------------------------------------------- kartochka qoidalari (10-qadam)
  ('uzum.kartochka.qoidalar', '[
     "Nom, qisqa tavsif va xususiyatlar ikki tilda: oʻzbek (lotin) va rus (kirill)",
     "Nomda emoji, CapsLock, takroriy belgilar (!!!, ???) yoʻq; ruxsat etilgan belgilar: , . : ; - – ( ) / “ ” % x *",
     "Stop-soʻzlar taqiqlanadi: aksiya, bepul, sale, chegirma, trend, top, xit, eng yaxshi, eng arzon, 1-raqamli va hokazo",
     "Sharh, reyting, buyurtmalar soni, kontakt va boshqa saytga havola yozilmaydi",
     "Xususiyatlar guruhlari (rang, oʻlcham, hajm) faqat birinchi yuborishgacha qoʻshiladi yoki oʻchiriladi; keyin faqat yangi qiymat",
     "Bir kartochkada har xil turdagi tovar mumkin emas (masalan gʻilof va himoya oynasi)",
     "Kartochkada 5 tagacha xususiyat guruhi, ulardan 3 tasi oʻzingizniki boʻlishi mumkin",
     "VGT: omborga boradigan qadoqdagi 1 dona — uzunlik, eni, balandlik (mm) va vazn (g); qadoqdagi yozuvdan koʻchirmang, oʻlchang"
   ]'::jsonb, 'roʻyxat',
   'seller.uzum.uz/manual/uz/5.product-creation (5.1, 5.9, VGT)', '2026-09-29',
   'Omborda VGT qayta oʻlchanadi; farq boʻlsa Uzum oʻz oʻlchovini yozadi.'),
  ('uzum.kartochka.qollanma.url', '"https://seller.uzum.uz/manual/uz/5.product-creation/"'::jsonb, 'url',
   'seller.uzum.uz/manual/uz', '2026-09-29', 'Rasmiy qoʻllanma, 5-bob — kartochka yaratish.')
on conflict (kalit) do nothing;
