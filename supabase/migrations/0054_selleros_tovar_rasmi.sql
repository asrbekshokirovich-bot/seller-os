-- Tovar rasmi — `product.image_key`.
--
-- NEGA. Suhbatning 5-qadami (Xitoydan topish) va kengaytma 1688 da
-- RASM boʻyicha qidiradi (TMAPI, `packages/shared/src/xitoy.ts`).
-- Katalog kartasi ham rasm uchun joy bilan qurilgan. Bazada esa rasm
-- yoʻq edi va skreyper uni soʻramasdi (BACKLOG: "Tovar rasmi").
--
-- OʻLCHANDI 2026-09-25 (Hetzner serveridan, zumsavdo mijozi bilan;
-- laptopdan zond taqiqlangan): Uzum GraphQL `Product.photos[]` da
-- `key`, `original { high low }`, `link(trans: PRODUCT_540) { high low }`.
-- Manzil shakli:
--
--     https://images.uzum.uz/<key>/original.jpg
--     https://images.uzum.uz/<key>/t_product_540_high.jpg   (HEAD 200, image/webp)
--
-- FAQAT KALIT SAQLANADI, manzil emas: manzil kalitdan yasaladi va
-- oʻlcham keyin oʻzgartirilsa migratsiya kerak boʻlmaydi. Birinchi
-- rasm — asosiy rasm; qolganlari kerak boʻlsa alohida ustun/jadval.
--
-- `null` = oʻlchanmagan (yengil soʻrovda `photos` soʻralmaydi — u
-- 12 rasmda javobni 93 → 476 baytga oshiradi, 2,7 mln id da ~1 GB).
-- Rasm faqat ogʻir soʻrovda (`--stok`, kuzatilayotgan tovarlar) keladi.
-- Shuning uchun `coalesce(excluded, eski)`: yengil soʻrov oʻlchangan
-- kalitni OʻCHIRMAYDI (`weight_g` bilan bir xil qoida, 0050).
--
-- FUNKSIYALAR JONLI TAʼRIFDAN PATCHLANADI (0039/0050 darsi: fayl bilan
-- baza ajralib ketgan, qoʻlda koʻchirish xatoga ochiq eshik).
-- Almashtiriladigan boʻlak topilmasa `raise exception` — jimgina
-- oʻtib ketmaydi.

alter table selleros.product
  add column if not exists image_key text;

comment on column selleros.product.image_key is
  'Uzum asosiy rasm kaliti (Product.photos[0].key). Manzil: '
  'https://images.uzum.uz/<key>/t_product_540_high.jpg. NULL = olchanmagan '
  '(faqat ogir sorovda keladi), rasm yoq degani EMAS.';

do $migratsiya$
declare
  eski text;
  yangi text;
  matn text;
begin
  -- ---------------------------------------------------------- so_ingest_batch
  select pg_get_functiondef(p.oid) into matn
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'so_ingest_batch';

  -- 1) kirish CTE: rasm kaliti oʻqiladi
  eski := '      (x->>''volume_ml'')::int as hajm
    from jsonb_array_elements(p_batch) x';
  yangi := '      (x->>''volume_ml'')::int as hajm,
      x->>''image_key'' as rasm
    from jsonb_array_elements(p_batch) x';
  if position(eski in matn) = 0 then
    raise exception 'so_ingest_batch (1): almashtiriladigan bolak topilmadi';
  end if;
  matn := replace(matn, eski, yangi);

  -- 2) insert ustunlari
  eski := '       volume_ml, updated_at)
    select p_platform, k.ext, k.nomi, s.id, c.id, k.ogirlik, k.katta, k.hajm, now()';
  yangi := '       volume_ml, image_key, updated_at)
    select p_platform, k.ext, k.nomi, s.id, c.id, k.ogirlik, k.katta, k.hajm, k.rasm, now()';
  if position(eski in matn) = 0 then
    raise exception 'so_ingest_batch (2): almashtiriladigan bolak topilmadi';
  end if;
  matn := replace(matn, eski, yangi);

  -- 3) conflict update: yengil soʻrovdagi null oʻlchangan kalitni oʻchirmasin
  eski := '          volume_ml = coalesce(excluded.volume_ml, selleros.product.volume_ml),
          updated_at = now()';
  yangi := '          volume_ml = coalesce(excluded.volume_ml, selleros.product.volume_ml),
          -- Rasm kaliti ham faqat ogʻir soʻrovda keladi (0054).
          image_key = coalesce(excluded.image_key, selleros.product.image_key),
          updated_at = now()';
  if position(eski in matn) = 0 then
    raise exception 'so_ingest_batch (3): almashtiriladigan bolak topilmadi';
  end if;
  matn := replace(matn, eski, yangi);
  execute matn;

  -- ---------------------------------------------------------- so_tovar_royxati
  select pg_get_functiondef(p.oid) into matn
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'so_tovar_royxati';

  -- 1) tovar CTE: kalit oʻqiladi
  eski := '    select p.id, p.external_id, p.title, p.shop_id, p.weight_g, p.volume_ml,
           p.oversized,';
  yangi := '    select p.id, p.external_id, p.title, p.shop_id, p.weight_g, p.volume_ml,
           p.oversized, p.image_key,';
  if position(eski in matn) = 0 then
    raise exception 'so_tovar_royxati (1): almashtiriladigan bolak topilmadi';
  end if;
  matn := replace(matn, eski, yangi);

  -- 2) javobda `rasmUrl` — kalitdan yasaladi; kalit boʻlmasa null (chiziqcha).
  eski := '        ''oversized'',              tv.oversized,';
  yangi := '        ''oversized'',              tv.oversized,
        -- Rasm manzili kalitdan (0054). null = olchanmagan.
        ''rasmUrl'',                case when tv.image_key is not null
                                    then ''https://images.uzum.uz/'' || tv.image_key || ''/t_product_540_high.jpg''
                                  end,';
  if position(eski in matn) = 0 then
    raise exception 'so_tovar_royxati (2): almashtiriladigan bolak topilmadi';
  end if;
  matn := replace(matn, eski, yangi);
  execute matn;
end
$migratsiya$;
