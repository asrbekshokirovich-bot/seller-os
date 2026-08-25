-- 3-qadam: turkum ichidagi tovarlar roʻyxati.
--
-- Reja, 2-boʻlim, 3-qadam: "Yoʻnalish ichida aniq tovarlar, har biriga
-- real statistika: oylik sotuv taxmini, narx oraligʻi, sotuvchi soni,
-- taxminiy marja."
--
-- SOTUV MANTIQI TAKRORLANMAYDI. `so_tovar_holati` da ikki manbali
-- sotuv hisobi bor edi (oʻlchangan qoldiq farqi, boʻlmasa perepis
-- taxmini). Uni bu yerga koʻchirish oson boʻlardi va aynan shu —
-- takrorlangan mantiq — bugun bir necha marta nosozlik manbai boʻldi.
-- Shuning uchun u koʻrinishga (`selleros.tovar_sotuvi`) chiqarildi va
-- ikkala funksiya ham shundan oʻqiydi.

create or replace view selleros.tovar_sotuvi as
with kunlar as (
  -- Nechta kun oʻlchangani. Bu raqam KOʻRSATILADI ham: 30 kunlik
  -- sotuv 2 kunlik oʻlchovdan chiqarilgan boʻlsa, foydalanuvchi
  -- buni bilishi kerak.
  select product_id, count(distinct date)::int as kun
  from selleros.sales_estimates
  where date > (now() at time zone 'Asia/Tashkent')::date - 30
  group by product_id
),
olchangan as (
  -- 1-manba: qoldiq farqidan OʻLCHANGAN sotuv, 30 kun.
  --
  -- KUN SHARTI MAJBURIY. Busiz 1 kunlik oʻlchovdan "30 kunlik
  -- sotuv = 0" chiqardi va bu "oʻlchanmadi" ni "sotilmaydi" ga
  -- aylantirardi — QOIDALAR.md 4-qoidasi aynan shuni taqiqlaydi.
  --
  -- 7 = `THRESHOLDS.data.minDaysForDemand`
  -- (`packages/shared/src/thresholds.ts`). Raqam ikki joyda
  -- yozilgan, shuning uchun ular bir xilligi testda tekshiriladi:
  -- `supabase/test/kun-sharti.test.ts`.
  select e.product_id, sum(e.sold_units)::int as sotuv
  from selleros.sales_estimates e
  join kunlar k on k.product_id = e.product_id
  where e.date > (now() at time zone 'Asia/Tashkent')::date - 30
    and e.sold_units is not null
    and k.kun >= 7
  group by e.product_id
),
taxminiy as (
  -- 2-manba: perepisdagi haftalik xaridorlar. Uzum oʻzi aytgan
  -- raqam, yaʼni bitta oʻlchovda ham butun davrni qamraydi.
  --
  -- OGOHLANTIRISH: bu raqamdan MIQDOR hisoblanmaydi. Maʼnosi
  -- tasdiqlanmagan — batafsil `packages/shared/src/qadamlar.ts`,
  -- `MIQDOR_UCHUN_MANBA` izohida.
  select distinct on (o.product_id) o.product_id,
         round(o.buyers_per_week * 4.3)::int as sotuv
  from selleros.product_observation o
  where o.buyers_per_week is not null
  order by o.product_id, o.observed_at desc
)
select
  p.id as product_id,
  coalesce(m.sotuv, x.sotuv) as sold_30d,
  case when m.sotuv is not null then 'olchandi'
       when x.sotuv is not null then 'taxmin'
       else null end as manba,
  coalesce(k.kun, 0) as olchangan_kun
from selleros.product p
left join olchangan m on m.product_id = p.id
left join kunlar    k on k.product_id = p.id
left join taxminiy  x on x.product_id = p.id;

comment on view selleros.tovar_sotuvi is
  '30 kunlik sotuv: oʻlchangan (qoldiq farqi) yoki taxmin (perepis). '
  'Manba va oʻlchangan kun soni ham qaytariladi.';

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
  tovar as (
    select p.id, p.external_id, p.title, p.shop_id,
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
        'olchandi',               o.observed_at
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
