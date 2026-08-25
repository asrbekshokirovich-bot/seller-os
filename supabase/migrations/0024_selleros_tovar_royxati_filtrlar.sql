-- 3-qadam roʻyxatiga qolgan toʻrt tuzoq uchun kirish maydonlari.
--
-- 0022 da roʻyxat faqat 1-tuzoq (yopiq brend) uchun maʼlumot
-- berardi. Endi 2, 4, 7 va 8-tuzoqlar ham kirish oladi:
--
--   4-tuzoq (nakrutka)   `sharhSoni` + `sotuvManbasi` — allaqachon bor
--   7-tuzoq (ogʻir)      `weightG`, `volumeMl`        — YANGI
--   2-tuzoq (mavsumiy)   `seasonality`                — YANGI
--   8-tuzoq (hype)       `productAgeDays`             — YANGI
--
-- `yangiSotuvUlushi` hozircha `null`: uni hisoblash uchun kunlik
-- sotuv tarixi kerak va bugun uch kun bor. Filtr shu sababdan
-- "baholanmadi" qaytaradi — bu holat interfeysda koʻrinadi.

-- Turkum ichidagi tovarlar.
--
-- Qator emas, bitta jsonb: PostgREST qator qaytaradigan soʻrovni
-- 1000 tada xatosiz kesadi (0014 ga qarang).
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
