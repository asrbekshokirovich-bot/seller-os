-- `so_tovar_holati` namunasi BARQAROR boʻlsin.
--
-- NUQSON. Funksiya oxirida `(select * from tovar limit p_limit)`
-- turgan — TARTIBSIZ. Postgres uchun bu "istalgan 500 qator"
-- degani va u jismoniy tartibga bogʻliq.
--
-- Oqibati 2026-08-25/26 da oʻlchandi. `/tuzoqlar` da `heavy`
-- filtri baholay olmagan tovarlar soni 125 dan 167 ga "oshdi" —
-- holbuki maʼlumot YAXSHILANGAN edi (`oversized` qoʻshildi va
-- baholanadigan tovarlar 4 874 dan 4 920 ga koʻtarildi).
-- Sabab: supurish qatorlarni yangiladi, jismoniy tartib oʻzgardi
-- va namunaga BOSHQA 500 ta tovar tushdi.
--
-- Bu eng yomon turdagi nosozlik: bir daqiqa ichida uch marta
-- soʻrasangiz uchala javob bir xil chiqadi, yaʼni raqam ishonchli
-- koʻrinadi. U faqat maʼlumot oʻzgarganda siljiydi — yaʼni aynan
-- taqqoslash kerak boʻlgan paytda.
--
-- `so_tovar_royxati` da bu allaqachon toʻgʻri edi
-- (`order by external_id limit p_limit`). Bu yerda unutilgan.
--
-- Funksiya matni 0032 dagidek, faqat oxirgi `from` qatoriga
-- `order by external_id` qoʻshildi. Jonli bazaga qoʻllangan.
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
  -- `order by` SHART: busiz namuna maʼlumot oʻzgarganda jimgina
  -- siljiydi va oʻlchovlarni taqqoslab boʻlmaydi.
  from (select * from tovar order by external_id limit p_limit) t
  left join brend_dokoni b on b.brand = t.brand
  left join selleros.tovar_sotuvi so on so.product_id = t.id
  left join oxirgi o on o.product_id = t.id
  left join mediana m on m.category_id = t.category_id
  left join mavsum mv on mv.category_id = t.category_id
  left join yangi_sotuv y on y.product_id = t.id;
$function$;

revoke all on function public.so_tovar_holati(text, integer) from public, anon, authenticated;
