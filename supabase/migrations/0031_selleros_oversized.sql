-- Uzumning oʻz «katta hajmli» belgisi — 7-tuzoqning yoʻqolgan yarmi.
--
-- MUAMMO. 7-tuzoq (ogʻir tovar) ikki tarmoqli: ogʻirlik va HAJM.
-- Hajm tarmogʻi bir marta ham ishlamagan, chunki `volume_ml` ustuni
-- hech qachon toʻlmagan — Uzumda bunday maydon YOʻQ.
--
-- Ustiga-ustak kuzatuvdagi 5 996 tovardan 1 122 tasida ogʻirlik ham
-- yoʻq: Uzum ularda `skuList { weight }` ni boʻsh qaytaradi (40 ta
-- tovarda jonli tekshirildi — hech birida ogʻirlik yoʻq). Yaʼni bu
-- tovarlar uchun 7-tuzoq umuman baholanmasdi.
--
-- YECHIM. Uzum GraphQL sxemasida `Product.oversized` boolean bor va
-- u HAQIQATAN ishlaydi. Bu muhim farq: `shop.official` ham xuddi
-- shunday umid bergan edi, lekin 63 113 doʻkonning hammasida `false`
-- chiqdi va shuning uchun yozilmaydi. `oversized` esa oʻzgaradi —
-- jonli oʻlchandi:
--   7 ta muzlatgich/elektromobil → `true`
--   7 ta yengil tovar           → `false`
--
-- `false` HECH NIMANI YOPMAYDI. U "katta emas" degani, "ogʻir emas"
-- degani emas: 6 kg li ixcham tovar ham `false` boʻladi. Shuning
-- uchun filtr `false` da baribir "baholanmadi" deb qaytadi.
--
-- Quyidagi uch funksiya 0023, 0024 va 0025 dagi asl matndan olindi
-- va faqat `oversized` qatorlari qoʻshildi. Qayta yozilmadi: 0023
-- da bir marta shunday qilib koʻrdim va kunlik yozuv mantigʻi
-- bilmasdan oʻzgarib ketgan edi.

alter table selleros.product
  add column if not exists oversized boolean;

comment on column selleros.product.oversized is
  'Uzumning oʻz «katta hajmli» belgisi (Product.oversized). '
  '`null` = oʻlchanmagan. `false` "ogʻir emas" degani EMAS.';

-- ==== so_ingest_batch (0023 + oversized) ====

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
      (x->>'shop_official')::boolean as rasmiy
    from jsonb_array_elements(p_batch) x
    where x->>'shop_external_id' is not null
  ),
  yozildi as (
    insert into selleros.shop (platform, external_id, name, official, updated_at)
    select p_platform, ext, coalesce(nomi, 'Sotuvchi ' || ext), coalesce(rasmiy, false), now()
    from kirish
    on conflict (platform, external_id) do update
      set name = excluded.name, official = excluded.official, updated_at = now()
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
      (x->>'oversized')::boolean as katta
    from jsonb_array_elements(p_batch) x
  ),
  yozildi as (
    insert into selleros.product
      (platform, external_id, title, shop_id, category_id, weight_g, oversized,
       updated_at)
    select p_platform, k.ext, k.nomi, s.id, c.id, k.ogirlik, k.katta, now()
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

-- ==== so_tovar_royxati (0024 + oversized) ====

create or replace function public.so_tovar_royxati(
  p_category_external_id bigint,
  p_limit int default 50
)
returns jsonb
language sql
security definer
set search_path = selleros, public
set statement_timeout = '30s'
as $$
  with turkum as (
    select id, external_id, coalesce(name_uz, name_ru) as name from selleros.category
    where platform = 'uzum' and external_id = p_category_external_id
  ),
  talab as (
    -- Turkumning mavsumiylik jadvali — 2-tuzoq uchun.
    select cr.seasonality
    from turkum t
    left join selleros.category_requirements cr on cr.category_id = t.id
    limit 1
  ),
  tovar as (
    select p.id, p.external_id, p.title, p.shop_id, p.weight_g, p.volume_ml,
           p.oversized,
           coalesce(p.brand, selleros.brend_topish(p.title, s.name)) as brand,
           s.name as shop_name
    from selleros.product p
    join turkum t on t.id = p.category_id
    left join selleros.shop s on s.id = p.shop_id
    where p.platform = 'uzum'
  ),
  oxirgi as (
    -- Har tovarning eng soʻnggi oʻlchovi: narx, qoldiq, reyting.
    select distinct on (o.product_id) o.product_id,
           o.price, o.stock, o.rating, o.reviews, o.observed_at
    from selleros.product_observation o
    join tovar tv on tv.id = o.product_id
    order by o.product_id, o.observed_at desc
  ),
  brend_dokoni as (
    select tv.brand, count(distinct p2.shop_id) as dokonlar,
           min(p2.external_id) as eng_eski
    from tovar tv
    join selleros.product p2
      on p2.platform = 'uzum'
     and p2.title ~* ('(^|[^[:alnum:]])' || tv.brand || '([^[:alnum:]]|$)')
    where tv.brand is not null
    group by tv.brand
  ),
  mediana as (
    select percentile_cont(0.5) within group (order by s.sold_30d)::int as med
    from tovar tv join selleros.tovar_sotuvi s on s.product_id = tv.id
    where s.sold_30d is not null
  )
  select jsonb_build_object(
    'turkum', (select jsonb_build_object('categoryId', external_id, 'name', name) from turkum),
    'royxat', coalesce((
      select jsonb_agg(jsonb_build_object(
        -- Tuzoq filtrlari kutadigan maydonlar (TovarHolati).
        'productId',              tv.external_id,
        'title',                  tv.title,
        'brand',                  tv.brand,
        'sellersCount',           null,
        'sellersStableDays',      null,
        'brandSellersCount',      b.dokonlar,
        'brandAgeDays',           selleros.id_yoshi('uzum', b.eng_eski),
        'shopOfficial',           null,
        'soldUnits30d',           s.sold_30d,
        'categoryMedianUnits30d', (select med from mediana),
        'sotuvManbasi',           s.manba,
        -- Koʻrsatish uchun.
        'olchanganKun',           s.olchangan_kun,
        'shopName',               tv.shop_name,
        'narxSom',                o.price,
        'qoldiq',                 o.stock,
        'reyting',                o.rating,
        'sharhSoni',              o.reviews,
        'olchandi',               o.observed_at,
        -- Qolgan toʻrt tuzoq uchun kirish.
        --
        -- Bugun uchtasi boʻsh va bu KUTILGAN: `weightG` keyingi
        -- oʻlchovdan boshlab toʻladi (0023), `seasonality` ni
        -- nazoratchi CSV bilan beradi, `yangiSotuvUlushi` esa
        -- kunlik tarix yigʻilgach hisoblanadi.
        --
        -- Boʻsh maydon filtrni "baholanmadi" ga olib boradi va bu
        -- SONI bilan koʻrsatiladi — jimgina "tuzoq yoʻq" ga
        -- aylanmaydi.
        'weightG',                tv.weight_g,
        'volumeMl',               tv.volume_ml,
        'oversized',              tv.oversized,
        'seasonality',            (select seasonality from talab),
        'productAgeDays',         selleros.id_yoshi('uzum', tv.external_id),
        'yangiSotuvUlushi',       null
      ) order by s.sold_30d desc nulls last, tv.external_id)
      from (select * from tovar order by external_id limit p_limit) tv
      left join oxirgi o on o.product_id = tv.id
      left join selleros.tovar_sotuvi s on s.product_id = tv.id
      left join brend_dokoni b on b.brand = tv.brand
    ), '[]'::jsonb)
  )
$$;

revoke all on selleros.tovar_sotuvi from public, anon, authenticated;
revoke all on function public.so_tovar_royxati(bigint, int) from public, anon, authenticated;

-- ==== so_tovar_holati (0025 + oversized) ====

create or replace function public.so_tovar_holati(p_platform text default 'uzum', p_limit integer default 200)
returns jsonb
language sql
security definer
set search_path to 'selleros', 'public'
as $function$
  with tovar as (
    select p.id, p.external_id, p.title, p.category_id, p.weight_g, p.volume_ml,
           p.oversized,
           coalesce(p.brand, selleros.brend_topish(p.title, s.name)) as brand
    from selleros.product p
    left join selleros.shop s on s.id = p.shop_id
    where p.platform = p_platform
  ),
  brend_dokoni as (
    select t.brand, count(distinct p2.shop_id) as dokonlar, min(p2.external_id) as eng_eski
    from tovar t
    join selleros.product p2
      on p2.platform = p_platform
     and p2.title ~* ('(^|[^[:alnum:]])' || t.brand || '([^[:alnum:]]|$)')
    where t.brand is not null
    group by t.brand
  ),
  oxirgi as (
    select distinct on (o.product_id) o.product_id, o.reviews, o.rating
    from selleros.product_observation o
    order by o.product_id, o.observed_at desc
  ),
  mediana as (
    select p.category_id,
           percentile_cont(0.5) within group (order by s.sold_30d)::int as med
    from selleros.product p
    join selleros.tovar_sotuvi s on s.product_id = p.id
    where p.platform = p_platform and s.sold_30d is not null
    group by p.category_id
  ),
  mavsum as (
    select c.id as category_id, cr.seasonality
    from selleros.category c
    left join selleros.category_requirements cr on cr.category_id = c.id
    where c.platform = p_platform
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'productId', t.external_id,
           'title', t.title,
           'brand', t.brand,
           'sellersCount', null,
           'sellersStableDays', null,
           'brandSellersCount', b.dokonlar,
           'brandAgeDays', selleros.id_yoshi(p_platform, b.eng_eski),
           'shopOfficial', null,
           'soldUnits30d', so.sold_30d,
           'categoryMedianUnits30d', m.med,
           'sotuvManbasi', so.manba,
           'sharhSoni', o.reviews,
           'reyting', o.rating,
           'weightG', t.weight_g,
           'oversized', t.oversized,
           'volumeMl', t.volume_ml,
           'seasonality', mv.seasonality,
           'productAgeDays', selleros.id_yoshi(p_platform, t.external_id),
           'yangiSotuvUlushi', null
         )), '[]'::jsonb)
  from (select * from tovar limit p_limit) t
  left join brend_dokoni b on b.brand = t.brand
  left join selleros.tovar_sotuvi so on so.product_id = t.id
  left join oxirgi o on o.product_id = t.id
  left join mediana m on m.category_id = t.category_id
  left join mavsum mv on mv.category_id = t.category_id;
$function$;

revoke all on function public.so_tovar_holati(text, integer) from public, anon, authenticated;
