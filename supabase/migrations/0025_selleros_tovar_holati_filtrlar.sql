-- `so_tovar_holati` ga qolgan filtrlar uchun kirish maydonlari.
--
-- `/tuzoqlar` uchi 500 tovarni tekshirardi va HAMMASI "baholanmadi"
-- chiqardi. Sabab qisman maʼlumot yoʻqligida emas edi: `sharhSoni`
-- va `productAgeDays` bazada BOR, funksiya ularni uzatmasdi.
--
-- Yaʼni panel "maʼlumot yetishmayapti" deb koʻrsatardi, aslida
-- maʼlumot bor edi va faqat yoʻl uzilgan edi. Bu ham jim nosozlik:
-- hisobot toʻgʻri shaklda, xulosasi notoʻgʻri.
--
-- Sotuv hisobi `selleros.tovar_sotuvi` koʻrinishidan olinadi (0022),
-- yaʼni ikki joyda takrorlanmaydi.
create or replace function public.so_tovar_holati(p_platform text default 'uzum', p_limit integer default 200)
returns jsonb
language sql
security definer
set search_path to 'selleros', 'public'
as $function$
  with tovar as (
    select p.id, p.external_id, p.title, p.category_id, p.weight_g, p.volume_ml,
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
