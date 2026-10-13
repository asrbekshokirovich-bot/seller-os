-- 3-qadam katalogi: eng mashhur tovarlar tepada, Uzum yozuvi, halol sotuv.
--
-- NAZORATCHI (2026-10-13): katalogda hamma tovarda "30 kunda: 0 dona ·
-- oʻlchandi" va "taklif: 1 dona" turardi; "bu maʼlumotlarni qayerdan
-- olyapsan?". Tekshiruv (2026-10-13) ikki xatoni topdi:
--
--   1. `so_tovar_royxati` turkumdagi tovarlarni TOVAR RAQAMI boʻyicha
--      olardi (`order by external_id limit p_limit`) — yaʼni eng eski
--      raqamlilarni, eng mashhurlarini emas. "Simsiz quloqchinlar": 20 ta
--      tovarning 17 tasi 24-avgustdan beri oʻzgarmagan, qoldigʻi 0.
--      Endi: avval oʻzimiz oʻlchagan sotuv (noldan katta), keyin Uzum
--      sahifasidagi «N kishi sotib oldi» yozuvi boʻyicha. Yozuv ham
--      qaytariladi (`xaridorYozuvi`) — katalog uni Uzum yozuvi deb koʻrsatadi
--      (maʼnosi — haftalikmi, jamimi — tasdiqlanmagan, `qadamlar.ts`
--      MIQDOR izohi; miqdor undan hisoblanmaydi).
--
--   2. `tovar_sotuvi` qoldigʻi 0 boʻlgan kunlarni ham "sotilmadi" deb
--      sanardi: 6 025 tovarning 4 624 tasida (77 %) oxirgi qoldiq 0, 5 537
--      tasida "oʻlchangan sotuv" 0. Qoldiq 0 boʻlgan kuni sotib boʻlmaydi —
--      bu "sotilmadi" emas, "oʻlchab boʻlmadi". Endi `olchandi` faqat tovar
--      SOTUVDA boʻlgan kunlardan (oldingi kun qoldigʻi > 0), kamida 7 kun.

create or replace view selleros.tovar_sotuvi as
with oyna as (
  select ((now() at time zone 'Asia/Tashkent')::date - 30) as dan
),
sotuvda as (
  -- Sotuvda boʻlgan kun: oldingi kun yopilishidagi qoldiq > 0 (sotish mumkin edi).
  select e.product_id, e.date, e.sold_units
  from selleros.sales_estimates e
  cross join oyna
  join selleros.product_daily d on d.product_id = e.product_id and d.date = e.date - 1
  where e.date > oyna.dan and e.sold_units is not null and d.stock > 0
),
kunlar as (
  select product_id, count(distinct date)::integer as kun
  from sotuvda
  group by product_id
),
olchangan as (
  select s.product_id, sum(s.sold_units)::integer as sotuv
  from sotuvda s
  join kunlar k on k.product_id = s.product_id
  where k.kun >= 7
  group by s.product_id
),
taxminiy as (
  select distinct on (o.product_id) o.product_id,
         round(o.buyers_per_week::numeric * 4.3)::integer as sotuv
  from selleros.product_observation o
  where o.buyers_per_week is not null
  order by o.product_id, o.observed_at desc
)
select p.id as product_id,
       coalesce(m.sotuv, x.sotuv) as sold_30d,
       case
         when m.sotuv is not null then 'olchandi'::text
         when x.sotuv is not null then 'taxmin'::text
         else null::text
       end as manba,
       coalesce(k.kun, 0) as olchangan_kun
from selleros.product p
left join olchangan m on m.product_id = p.id
left join kunlar k on k.product_id = p.id
left join taxminiy x on x.product_id = p.id;

comment on view selleros.tovar_sotuvi is
  'Tovarning 30 kunlik sotuvi. olchandi — qoldiq kamayishidan, faqat SOTUVDA boʻlgan kunlardan (oldingi kun qoldigʻi > 0, kamida 7 kun; 0064). taxmin — Uzum yozuvi × 4,3 (maʼnosi tasdiqlanmagan; miqdor undan hisoblanmaydi).';

do $migratsiya$
declare
  matn text;
  yangi text;
begin
  select pg_get_functiondef('public.so_tovar_royxati(bigint,integer)'::regprocedure) into matn;

  if position('xaridorYozuvi' in matn) > 0 then
    raise notice 'so_tovar_royxati: allaqachon yangilangan — oʻtkazildi';
    return;
  end if;

  -- (a) oxirgi oʻlchovda Uzum yozuvi ham.
  yangi := replace(matn,
    '           o.price, o.stock, o.rating, o.reviews, o.observed_at',
    '           o.price, o.stock, o.rating, o.reviews, o.observed_at, o.buyers_per_week');
  -- (b) chiqishda Uzum yozuvi.
  yangi := replace(yangi,
    '''qoldiq'',                 o.stock,',
    '''qoldiq'',                 o.stock,
        -- Uzum sahifasidagi «N kishi sotib oldi» (0064). Maʼnosi tasdiqlanmagan —
        -- katalog uni Uzum yozuvi deb koʻrsatadi, miqdor undan hisoblanmaydi.
        ''xaridorYozuvi'',          o.buyers_per_week,');
  -- (c) tanlov va tartib: eng mashhurlari (tovar raqami boʻyicha emas).
  yangi := replace(yangi,
    '      ) order by s.sold_30d desc nulls last, tv.external_id)
      from (select * from tovar order by external_id limit p_limit) tv
      left join oxirgi o on o.product_id = tv.id
      left join selleros.tovar_sotuvi s on s.product_id = tv.id',
    '      ) order by case when s.manba = ''olchandi'' and s.sold_30d > 0 then s.sold_30d end desc nulls last,
                 o.buyers_per_week desc nulls last, tv.external_id)
      from (
        select tv0.* from tovar tv0
        left join oxirgi o0 on o0.product_id = tv0.id
        left join selleros.tovar_sotuvi s0 on s0.product_id = tv0.id
        order by case when s0.manba = ''olchandi'' and s0.sold_30d > 0 then s0.sold_30d end desc nulls last,
                 o0.buyers_per_week desc nulls last, tv0.external_id
        limit p_limit
      ) tv
      left join oxirgi o on o.product_id = tv.id
      left join selleros.tovar_sotuvi s on s.product_id = tv.id');

  if position('xaridorYozuvi' in yangi) = 0 or position('o0.buyers_per_week' in yangi) = 0
     or position('o.observed_at, o.buyers_per_week' in yangi) = 0 then
    raise exception 'so_tovar_royxati: almashtiriladigan boʻlak topilmadi';
  end if;
  execute yangi;
end
$migratsiya$;
