-- Tuzoq roʻyxati nomzodlarini bazadan chiqaradi.
--
-- NEGA KOD, NEGA QOʻLDA EMAS. Nazoratchidan 20+ tuzoq tovar roʻyxatini
-- soʻrash mumkin edi. Lekin u roʻyxatni yozib berguncha ish toʻxtaydi, va
-- roʻyxat bir kishining xotirasi bilan cheklanadi.
--
-- NEGA AYLANMA EMAS. Nomzodni topadigan belgi filtrning oʻz signallaridan
-- BOʻLMASLIGI shart, aks holda filtr oʻzi topgan narsada oʻzini sinaydi va
-- test doim yashil boʻladi. Bu yerdagi belgi: **doʻkon NOMI brend nomi
-- bilan bir xil**. Filtr bunga qaramaydi — u sotuvchilar soni, brend
-- doʻkonlari soni, sharh yigʻindisi va sotuvga qaraydi.
--
-- "Lamart" degan doʻkon "Lamart" mahsulotini sotsa — bu brendning oʻz
-- doʻkoni. Bunga tushuntirish kerak emas.

with brend_dokoni as (
  -- Doʻkon nomi mahsulot nomidagi soʻz bilan bir xil.
  select p.shop_id, s.name as dokon, lower(w) as brend, count(*) as mahsulot
  from zumsavdo.product p
  join zumsavdo.shop s on s.id = p.shop_id,
  lateral unnest(regexp_split_to_array(p.title, '[^A-Za-z]+')) as w
  where w ~ '^[A-Z][a-zA-Z]{3,13}$'
    and lower(w) = lower(regexp_replace(s.name, '[^A-Za-z]', '', 'g'))
  group by p.shop_id, s.name, lower(w)
  having count(*) >= 20
),
tarqalishi as (
  -- Shu brendni butun bazada nechta doʻkon sotadi.
  select lower(w) as brend, count(distinct p.shop_id) as sotuvchi_dokon
  from zumsavdo.product p,
  lateral unnest(regexp_split_to_array(p.title, '[^A-Za-z]+')) as w
  where lower(w) in (select brend from brend_dokoni)
  group by lower(w)
),
oxirgi as (
  select distinct on (product_id) product_id, reviews
  from zumsavdo.product_census order by product_id, observed_at desc
),
sharhi as (
  select b.brend, sum(o.reviews) as brend_sharhi
  from brend_dokoni b
  join zumsavdo.product p on p.shop_id = b.shop_id
  join oxirgi o on o.product_id = p.id
  group by b.brend
),
vakil as (
  -- Har brenddan eng koʻp sharhli bitta mahsulot — test uchun.
  select distinct on (b.brend) b.brend, p.id as product_id, p.title
  from brend_dokoni b
  join zumsavdo.product p on p.shop_id = b.shop_id
  join oxirgi o on o.product_id = p.id
  order by b.brend, o.reviews desc
)
select b.dokon, b.brend, b.mahsulot, t.sotuvchi_dokon,
       coalesce(sh.brend_sharhi, 0) as brend_sharhi,
       v.product_id, v.title,
       -- Yopiq brend faqat brend YANGI EMAS boʻlsa. Yangi brendda bitta
       -- sotuvchi boʻlishi tabiiy va u aynan yaxshi imkoniyat.
       case when coalesce(sh.brend_sharhi,0) >= 200 then 'closed_brand'
            else 'tuzoq_emas__yangi_brend' end as kutilgan
from brend_dokoni b
join tarqalishi t on t.brend = b.brend
join vakil v on v.brend = b.brend
left join sharhi sh on sh.brend = b.brend
where t.sotuvchi_dokon <= 2
order by coalesce(sh.brend_sharhi,0) desc;
