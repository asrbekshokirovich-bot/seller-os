-- 8-tuzoq (qisqa trend) uchun `yangiSotuvUlushi` — nihoyat hisoblanadi.
--
-- MUAMMO. Panelga qoʻshilgan "tuzoq sogʻligi" bloki birinchi
-- ishga tushishidayoq koʻrsatdi: `hype` filtri 500 ta tovardan
-- BIRONTASIDA ham baholanmagan. Sababi ikkala RPC da ham
-- `'yangiSotuvUlushi', null` deb yozib qoʻyilgan edi — maydon
-- filtrga kerak, lekin uni hech kim hisoblamasdi.
--
-- HISOB. `sales_estimates` da kunlik `sold_units` bor. Ulush =
-- soʻnggi 14 kundagi sotuv / soʻnggi 30 kundagi sotuv.
--
-- QATʼIY QOʻRIQCHI — ENG MUHIM QISMI. Ikkala oynada ham kamida
-- 7 kun oʻlchov boʻlishi SHART. Busiz tarix qisqa boʻlganda
-- ikkala oyna bir xil kunlarni qamrab olardi, nisbat 1.0 chiqardi
-- va HAR BIR yosh tovar "trend" deb bayroqlanardi.
--
-- Bu nazariy xavf emas: bugun bazada atigi 3 kunlik tarix bor
-- (2026-08-23 dan). Qoʻriqchisiz filtr bugunoq yolgʻon
-- bayroqlar toʻkardi.
--
-- Yaʼni filtr bugun ham "baholanmadi" deydi — lekin endi u
-- ULANGAN va tarix toʻlgach (~4 hafta) oʻzi ishlay boshlaydi.
-- Farqi katta: ilgari u hech qachon ishlamasdi.

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
  with
  bugun as (
    select (now() at time zone 'Asia/Tashkent')::date as d
  ),
  turkum as (
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
  /*
   * 8-tuzoq (qisqa trend) uchun: sotuvning qancha ulushi soʻnggi
   * 14 kunda boʻlgan.
   *
   * QATʼIY QOʻRIQCHI. Ikkala oynada ham kamida 7 kun oʻlchov
   * boʻlishi SHART. Busiz tarix qisqa boʻlganda ikkala oyna bir
   * xil kunlarni qamrab olardi va nisbat 1.0 chiqardi — yaʼni
   * HAR BIR yosh tovar "trend" deb bayroqlanardi. Bugun bazada
   * atigi 3 kunlik tarix bor, yaʼni bu xato darhol sodir boʻlardi.
   *
   * Shuning uchun `null` qaytadi va filtr "baholanmadi" deydi.
   * Bu yolgʻon bayroqdan yaxshiroq: tarix toʻlgach oʻzi ishlaydi.
   */
  yangi_sotuv as (
    select e.product_id,
           count(distinct e.date) filter (
             where e.date > bugun.d - 14) as kun_yangi,
           count(distinct e.date) filter (
             where e.date <= bugun.d - 14) as kun_eski,
           sum(e.sold_units) filter (where e.date > bugun.d - 14) as sotuv_yangi,
           sum(e.sold_units) as sotuv_jami
    from selleros.sales_estimates e, bugun
    where e.date > bugun.d - 30 and e.sold_units is not null
    group by e.product_id
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
        -- `weightG` 81% toʻlgan (qolgani Uzumda yoʻq), `oversized`
        -- yangi supurishdan boshlab toʻladi, `seasonality` ni
        -- nazoratchi CSV bilan beradi, `yangiSotuvUlushi` esa
        -- tarix 14+14 kunga yetgach oʻzi hisoblanadi.
        --
        -- Boʻsh maydon filtrni "baholanmadi" ga olib boradi va bu
        -- SONI bilan koʻrsatiladi — jimgina "tuzoq yoʻq" ga
        -- aylanmaydi.
        'weightG',                tv.weight_g,
        'volumeMl',               tv.volume_ml,
        'oversized',              tv.oversized,
        'seasonality',            (select seasonality from talab),
        'productAgeDays',         selleros.id_yoshi('uzum', tv.external_id),
        'yangiSotuvUlushi',       case
          when y.kun_yangi >= 7 and y.kun_eski >= 7 and y.sotuv_jami > 0
          then round(y.sotuv_yangi::numeric / y.sotuv_jami, 4)
          else null
        end
      ) order by s.sold_30d desc nulls last, tv.external_id)
      from (select * from tovar order by external_id limit p_limit) tv
      left join oxirgi o on o.product_id = tv.id
      left join selleros.tovar_sotuvi s on s.product_id = tv.id
      left join brend_dokoni b on b.brand = tv.brand
      left join yangi_sotuv y on y.product_id = tv.id
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
  with
  bugun as (
    select (now() at time zone 'Asia/Tashkent')::date as d
  ),
  tovar as (
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
  /*
   * 8-tuzoq (qisqa trend) uchun: sotuvning qancha ulushi soʻnggi
   * 14 kunda boʻlgan.
   *
   * QATʼIY QOʻRIQCHI. Ikkala oynada ham kamida 7 kun oʻlchov
   * boʻlishi SHART. Busiz tarix qisqa boʻlganda ikkala oyna bir
   * xil kunlarni qamrab olardi va nisbat 1.0 chiqardi — yaʼni
   * HAR BIR yosh tovar "trend" deb bayroqlanardi. Bugun bazada
   * atigi 3 kunlik tarix bor, yaʼni bu xato darhol sodir boʻlardi.
   *
   * Shuning uchun `null` qaytadi va filtr "baholanmadi" deydi.
   * Bu yolgʻon bayroqdan yaxshiroq: tarix toʻlgach oʻzi ishlaydi.
   */
  yangi_sotuv as (
    select e.product_id,
           count(distinct e.date) filter (
             where e.date > bugun.d - 14) as kun_yangi,
           count(distinct e.date) filter (
             where e.date <= bugun.d - 14) as kun_eski,
           sum(e.sold_units) filter (where e.date > bugun.d - 14) as sotuv_yangi,
           sum(e.sold_units) as sotuv_jami
    from selleros.sales_estimates e, bugun
    where e.date > bugun.d - 30 and e.sold_units is not null
    group by e.product_id
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
           'yangiSotuvUlushi', case
             when y.kun_yangi >= 7 and y.kun_eski >= 7 and y.sotuv_jami > 0
             then round(y.sotuv_yangi::numeric / y.sotuv_jami, 4)
             else null
           end
         )), '[]'::jsonb)
  from (select * from tovar limit p_limit) t
  left join brend_dokoni b on b.brand = t.brand
  left join selleros.tovar_sotuvi so on so.product_id = t.id
  left join oxirgi o on o.product_id = t.id
  left join mediana m on m.category_id = t.category_id
  left join mavsum mv on mv.category_id = t.category_id
  left join yangi_sotuv y on y.product_id = t.id;
$function$;

revoke all on function public.so_tovar_holati(text, integer) from public, anon, authenticated;
