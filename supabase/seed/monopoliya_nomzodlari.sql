-- 6-tuzoq (monopoliya) roʻyxatini bazadan chiqaradi.
--
-- ASOSIY QAROR: konsentratsiya PEREPISDAN hisoblanadi — butun turkum,
-- hamma doʻkon. 2-qatlam namunasidan EMAS.
--
-- Sabab oʻlchangan (2026-08-20). Namuna boʻyicha hisoblangan ulush
-- haqiqatdan keskin farq qiladi:
--
--   turkum        namuna/jami   namuna ulushi   haqiqiy ulush
--   Qoplamalar     10/2052          76%              21%
--   Choʻtkalar      8/720           79%              43%
--   Sumkalar        9/2439          63%              12%
--   Ziraklar        8/1452          57%              19%
--
-- Yettita turkumdan yettitasida ham namuna konsentratsiyani 2–4 barobar
-- OSHIRIB koʻrsatdi. Sabab: 2-qatlamga aynan yirik sotuvchilar tushadi,
-- kichiklari namunaga kirmaydi. "Qoplamalar" filtrga namuna bilan
-- berilsa — yolgʻon ogohlantirish chiqardi.

with oxirgi as (
  select distinct on (product_id) product_id, reviews
  from zumsavdo.product_census
  order by product_id, observed_at desc
),
dokon_ulushi as (
  select p.category_id, p.shop_id, sum(o.reviews) as sharh
  from zumsavdo.product p
  join oxirgi o on o.product_id = p.id
  where p.category_id is not null and p.shop_id is not null
  group by p.category_id, p.shop_id
),
turkum as (
  select category_id, count(*) as sotuvchilar, sum(sharh) as jami_sharh
  from dokon_ulushi group by category_id
),
top3 as (
  select category_id, sum(sharh) as top3_sharh
  from (
    select category_id, sharh,
           row_number() over (partition by category_id order by sharh desc) as oʻrin
    from dokon_ulushi
  ) x
  where oʻrin <= 3
  group by category_id
)
select c.id as category_external_id,
       c.name as turkum,
       t.sotuvchilar,
       round(100.0 * k.top3_sharh / nullif(t.jami_sharh, 0)) as top3_foiz,
       -- Qamrov perepisda doim 100%: ulush butun turkum ustida hisoblandi.
       t.sotuvchilar as measured_sellers,
       t.sotuvchilar as total_sellers,
       case when t.sotuvchilar >= 8
             and 100.0 * k.top3_sharh / nullif(t.jami_sharh, 0) > 70
            then 'monopoly' else null end as kutilgan
from turkum t
join top3 k on k.category_id = t.category_id
join zumsavdo.category c on c.id = t.category_id
where t.sotuvchilar >= 8 and t.jami_sharh > 2000
order by 100.0 * k.top3_sharh / nullif(t.jami_sharh, 0) desc;
