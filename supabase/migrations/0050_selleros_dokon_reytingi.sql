-- 0050: do'kon reytingi va sharh soni yoziladi + `official` regressiyasi.
--
-- ============================================================
-- 1. DO'KON REYTINGI — ustun bor edi, ajratuvchi yo'q edi
-- ============================================================
--
-- `selleros.shop.rating` 0001-migratsiyadan beri bor va bugungacha
-- BO'SH turgan: 4 297 do'kondan 0 tasida qiymat. Sabab kodda emas,
-- so'rovda edi — `manbalar/uzum.py` `shop { id title official
-- ordersQuantity }` so'rardi, ya'ni reyting hech qachon kelmagan.
-- `weight_g` bilan aynan bir xil naqsh (QOIDALAR.md, 8-bo'lim).
-- Do'kon sharhlari soni uchun esa ustunning o'zi ham yo'q edi.
--
-- MANBA HAQIQATAN BERADIMI. Ha. Jonli o'lchandi 2026-09-02,
-- `graphql.uzum.uz`, aynan skreyper ishlatadigan `productPage(id:)`
-- so'rovi orqali, 70 ta tasodifiy do'kon:
--
--     rating > 0              60 ta
--     feedbackQuantity > 0    60 ta
--     null                     0 ta
--     reyting oralig'i        2.5 .. 5.0, mediana 4.7
--
-- Bu `official` dan tubdan farq qiladi: o'sha maydon 63 113 do'konda
-- 0 ta `true` bergan, ya'ni doimiy edi. Bu ikkisi do'kondan do'konga
-- o'zgaradi — demak o'lchov.
--
-- NOL — BAHO EMAS. Xuddi shu o'lchovda:
--
--     sharh = 0 va reyting = 0        10 ta
--     sharh > 0 lekin reyting = 0      0 ta
--     sharh = 0 lekin reyting > 0      0 ta
--
-- Ya'ni Uzumning `rating: 0.0` i "nol baho" degani emas, "hali
-- baholanmagan" degani. Skreyper sharhsiz do'konda reytingni `null`
-- qilib yuboradi (`_dokon_reytingi`). Sharh soni uchun nol esa
-- HAQIQIY javob: "hali sharh yo'q" — u o'zgartirilmasdan yoziladi.
--
-- Hech bir filtr hozir bunga tayanmaydi; nimaga ishlatilishi alohida
-- qaror (BACKLOG.md). Migratsiyaning sababi bitta: bugun yig'ilmagan
-- raqamni ertaga orqaga qarab tiklab bo'lmaydi.
--
-- ============================================================
-- 2. `official` REGRESSIYASI — 0009 bekor qilingan ekan
-- ============================================================
--
-- Buni shu ish ustida topdim va u alohida ticket emas, chunki aynan
-- shu blok qayta yozilyapti.
--
-- 0009-migratsiya `official` ni tuzatgan edi: Uzum bu maydonni
-- to'ldirmaydi (63 113 do'konda 0 ta `true`), shuning uchun uning
-- `false` i o'lchov emas — doimiy. 0009 ustunni NULL qila oladigan
-- qilgan, mavjud `false` larni tozalagan va yozish uchini
-- `coalesce(excluded.official, eski)` ga o'zgartirgan.
--
-- KEYIN U BEKOR BO'LGAN. `so_ingest_batch` 0023, 0030, 0031 va 0037
-- da qayta yozilgan, va tana 0009 DAN OLDINGI nusxadan ko'chirilgan.
-- Jonli funksiyada bugun shu turibdi:
--
--     select ..., coalesce(rasmiy, false), now()
--     ...
--     set name = excluded.name, official = excluded.official, ...
--
-- Skreyper `shop_official = None` yuboradi (bu to'g'ri), demak
-- `coalesce(null, false)` = **false**, va `official = excluded.official`
-- uni shartsiz yozadi. Ya'ni har supurish har do'konga soxta `false`
-- qo'yib chiqadi.
--
-- O'lchandi 2026-09-02: 4 297 do'kondan 4 276 tasida `false`,
-- 21 tasida `null` (ular oxirgi supurishlarda ko'rilmagan), `true`
-- 0 ta. Oxirgi yozuv — bugun 09:46 dagi supurish.
--
-- Nega hech kim sezmagan: hech bir filtr `shopOfficial` ga
-- tayanmaydi (`so_tovar_holati` da u qattiq `null`), shuning uchun
-- soxta qiymat hech qayerda ko'rinmagan. Lekin u bazada turibdi va
-- QOIDALAR.md 4-qoidasini buzadi: o'lchanmagan narsa o'lchangan
-- bo'lib ko'rinmasligi kerak.
--
-- Bu yerda 0009 ning niyati tiklanadi va qayta buzilmasligi uchun
-- 0037 dagi dars ham yozib qo'yiladi: bu funksiyani qayta
-- yozayotgan har kim tanani JONLI ta'rifdan olsin, eski
-- migratsiyadan emas.
--
-- ============================================================
-- 3. ESLATMA: fayl bilan baza ajralib ketgan
-- ============================================================
--
-- 0037 izohida "`so_ingest_batch` ham yangilandi" deb yozilgan,
-- lekin o'sha migratsiya faylida funksiya YO'Q — u to'g'ridan-to'g'ri
-- bazaga qo'llangan. Shuning uchun quyidagi tana `pg_get_functiondef`
-- dan olingan jonli nusxadir, migratsiya fayllaridan emas: fayllarda
-- `volume_ml` yozuvi umuman yo'q va ularga tayansak hajm jimgina
-- yo'qolardi.


alter table selleros.shop
  add column if not exists feedback_quantity int;

comment on column selleros.shop.rating is
  'Do''kon reytingi (Uzum). NULL — baho yo''q, nol EMAS: sharhsiz '
  'do''konga Uzum 0.0 beradi va skreyper uni NULL ga aylantiradi '
  '(o''lchandi 2026-09-02: sharhi bor do''konda reyting 0 hech qachon '
  'uchramadi).';

comment on column selleros.shop.feedback_quantity is
  'Do''kon sharhlari soni (Uzum). Nol — haqiqiy javob ("hali sharh '
  'yo''q"), NULL — o''lchanmagan.';


-- Yozish uchi. Tana JONLI ta'rifdan olingan; faqat do'kon bloki
-- o'zgargan (reyting, sharh soni, `official` ni 0009 ga qaytarish).
create or replace function public.so_ingest_batch(
  p_platform text,
  p_batch    jsonb
) returns jsonb
language plpgsql security definer
set search_path to 'selleros', 'public'
as $$
declare
  n_cat int := 0; n_shop int := 0; n_prod int := 0; n_daily int := 0; n_obs int := 0;
  today date := (now() at time zone 'Asia/Tashkent')::date;
begin
  with kirish as (
    select distinct
      (x->>'category_external_id')::bigint as ext,
      x->>'category_name' as nomi
    from jsonb_array_elements(p_batch) x
    where x->>'category_external_id' is not null
  ),
  yozildi as (
    insert into selleros.category (platform, external_id, name_uz, updated_at)
    select p_platform, ext, nomi, now() from kirish
    on conflict (platform, external_id) do update
      set name_uz = coalesce(excluded.name_uz, selleros.category.name_uz), updated_at = now()
    returning 1
  )
  select count(*) into n_cat from yozildi;

  with kirish as (
    select distinct on ((x->>'shop_external_id')::bigint)
      (x->>'shop_external_id')::bigint as ext,
      x->>'shop_name' as nomi,
      (x->>'shop_official')::boolean as rasmiy,
      (x->>'shop_rating')::numeric as baho,
      (x->>'shop_reviews')::int as sharh
    from jsonb_array_elements(p_batch) x
    where x->>'shop_external_id' is not null
  ),
  yozildi as (
    insert into selleros.shop
      (platform, external_id, name, official, rating, feedback_quantity, updated_at)
    -- `coalesce(rasmiy, false)` ATAYLAB YO'Q (0009). Skreyper bu
    -- maydonga hech narsa yubormaydi va "bilmadim" `false` ga
    -- aylanmasligi kerak.
    select p_platform, ext, coalesce(nomi, 'Sotuvchi ' || ext), rasmiy, baho, sharh, now()
    from kirish
    on conflict (platform, external_id) do update
      set name = excluded.name,
          -- NULL "bilmadim" degani; eski bilimni o'chirmaydi.
          official = coalesce(excluded.official, selleros.shop.official),
          -- Reytingda ham shunday: skreyper sharhsiz do'konda NULL
          -- yuboradi va bu "baho yo'q" degani. Do'kon sharhlarini
          -- yo'qotsa ham biz bilgan oxirgi baho saqlanadi.
          rating = coalesce(excluded.rating, selleros.shop.rating),
          -- Sharh sonida NOL HAQIQIY javob, shuning uchun `coalesce`
          -- faqat NULL dan himoya qiladi: nol kelsa nol yoziladi.
          feedback_quantity = coalesce(excluded.feedback_quantity, selleros.shop.feedback_quantity),
          updated_at = now()
    returning 1
  )
  select count(*) into n_shop from yozildi;

  with kirish as (
    select distinct on ((x->>'external_id')::bigint)
      (x->>'external_id')::bigint as ext,
      x->>'title' as nomi,
      (x->>'shop_external_id')::bigint as shop_ext,
      (x->>'category_external_id')::bigint as cat_ext,
      (x->>'weight_g')::int as ogirlik,
      (x->>'oversized')::boolean as katta,
      (x->>'volume_ml')::int as hajm
    from jsonb_array_elements(p_batch) x
  ),
  yozildi as (
    insert into selleros.product
      (platform, external_id, title, shop_id, category_id, weight_g, oversized,
       volume_ml, updated_at)
    select p_platform, k.ext, k.nomi, s.id, c.id, k.ogirlik, k.katta, k.hajm, now()
    from kirish k
    left join selleros.shop s     on s.platform = p_platform and s.external_id = k.shop_ext
    left join selleros.category c on c.platform = p_platform and c.external_id = k.cat_ext
    on conflict (platform, external_id) do update
      set title = excluded.title,
          shop_id = coalesce(excluded.shop_id, selleros.product.shop_id),
          category_id = coalesce(excluded.category_id, selleros.product.category_id),
          -- Yengil soʻrovdagi `null` oʻlchangan ogʻirlikni OʻCHIRMASIN.
          -- Ogʻirlik faqat `--stok` bilan keladi.
          weight_g = coalesce(excluded.weight_g, selleros.product.weight_g),
          -- `oversized` YENGIL soʻrovda ham keladi, lekin qoida bir
          -- xil: yoʻq qiymat borini oʻchirmaydi.
          oversized = coalesce(excluded.oversized, selleros.product.oversized),
          -- Yengil soʻrovdagi `null` oʻlchangan hajmni OʻCHIRMASIN.
          volume_ml = coalesce(excluded.volume_ml, selleros.product.volume_ml),
          updated_at = now()
    returning 1
  )
  select count(*) into n_prod from yozildi;

  -- Xom o'lchov. CHANGE-ONLY: oldingi o'lchov bilan bir xil bo'lsa
  -- yozilmaydi. Aks holda kuniga uch marta yig'sak, o'zgarmagan
  -- mahsulot yiliga 1000 ta bir xil qator qoldirardi. Zumsavdoda
  -- o'lchandi: yillik hajm 460 GB o'rniga 14 GB.
  with kirish as (
    select distinct on ((x->>'external_id')::bigint, (x->>'observed_at')::timestamptz)
      (x->>'external_id')::bigint as ext,
      coalesce((x->>'observed_at')::timestamptz, now()) as vaqt,
      (x->>'price')::bigint as narx,
      (x->>'stock')::int as qoldiq,
      (x->>'reviews')::int as sharh,
      (x->>'rating')::numeric as baho,
      (x->>'buyers_per_week')::int as xaridor
    from jsonb_array_elements(p_batch) x
  ),
  bilan_id as (
    select pr.id as product_id, k.*
    from kirish k
    join selleros.product pr on pr.platform = p_platform and pr.external_id = k.ext
  ),
  oxirgi as (
    select b.*, o.price as e_narx, o.stock as e_qoldiq, o.reviews as e_sharh
    from bilan_id b
    left join lateral (
      select price, stock, reviews from selleros.product_observation po
      where po.product_id = b.product_id order by po.observed_at desc limit 1
    ) o on true
  ),
  yozildi as (
    insert into selleros.product_observation
      (product_id, observed_at, price, stock, reviews, rating, buyers_per_week)
    select product_id, vaqt, narx, qoldiq, sharh, baho, xaridor
    from oxirgi
    where e_narx is distinct from narx
       or e_qoldiq is distinct from qoldiq
       or e_sharh is distinct from sharh
    on conflict (product_id, observed_at) do nothing
    returning 1
  )
  select count(*) into n_obs from yozildi;

  with kirish as (
    select distinct on ((x->>'external_id')::bigint)
      (x->>'external_id')::bigint as ext,
      (x->>'price')::bigint as narx,
      (x->>'stock')::int as qoldiq,
      (x->>'reviews')::int as sharh,
      (x->>'rating')::numeric as baho,
      coalesce((x->>'observed_at')::timestamptz, now()) as vaqt
    from jsonb_array_elements(p_batch) x
    order by (x->>'external_id')::bigint, (x->>'observed_at')::timestamptz desc nulls last
  ),
  yozildi as (
    insert into selleros.product_daily
      (product_id, date, price, stock, reviews, rating, observed_at, sweeps)
    select pr.id, today, k.narx, k.qoldiq, k.sharh, k.baho, k.vaqt, 1
    from kirish k
    join selleros.product pr on pr.platform = p_platform and pr.external_id = k.ext
    on conflict (product_id, date) do update
      set price = excluded.price, stock = excluded.stock, reviews = excluded.reviews,
          rating = excluded.rating, observed_at = excluded.observed_at,
          sweeps = selleros.product_daily.sweeps + 1
    returning 1
  )
  select count(*) into n_daily from yozildi;

  return jsonb_build_object(
    'categories', n_cat, 'shops', n_shop, 'products', n_prod,
    'daily', n_daily, 'observations', n_obs
  );
end;
$$;

revoke all on function public.so_ingest_batch(text, jsonb) from public, anon, authenticated;
grant execute on function public.so_ingest_batch(text, jsonb) to service_role;


-- 0009 ning tozalashi qayta bajariladi. O'sha kuni bu qatorlar NULL
-- qilingan edi, keyin funksiya regressiyasi ularni yana `false` ga
-- to'ldirgan. Endi funksiya bu ustunga yozmaydi, ya'ni tozalash
-- bir marta bo'ladi va shunday qoladi.
update selleros.shop set official = null where official is not null;
