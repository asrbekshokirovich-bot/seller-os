-- 2-qadam uchun turkum nomzodlari.
--
-- Reja B2, 2-qadam: foydalanuvchiga bir nechta YOʻNALISH koʻrsatiladi
-- va tanlovni u qiladi. Bu funksiya shu roʻyxat uchun XOM raqamlarni
-- yigʻadi — ball hisoblamaydi. Ball `packages/shared` da, bitta joyda
-- (QOIDALAR.md, 3-boʻlim): baza va backend ikki xil javob bermasin.
--
-- Manbalar ataylab aralash:
--   talab, sotuvchi, top-3  — zumsavdo perepisidan (butun katalog);
--   markirovka, sertifikat, mavsum, optimal kirish
--                           — selleros.category_requirements dan.
--
-- Qator emas, bitta jsonb qaytaradi: PostgREST qator qaytaradigan
-- soʻrovni 1000 tada **xatosiz** kesadi (0014 ga qarang).
--
-- `top3Ulush` sotuvdan emas, SHARHLAR yigʻindisidan chiqadi. Sotuv
-- oʻrniga sharh ishlatilgani xato emas, VAQTINCHALIK: 30 kunlik
-- sotuv hali yoʻq. Ikkalasi ham "doʻkon qanchalik katta" ni oʻlchaydi
-- va ulush foizda chiqqani uchun tartib saqlanadi.
--
-- Vaqt byudjeti alohida qoʻyilgan. PostgREST `authenticator` roli
-- bilan ulanadi va uning `statement_timeout` i 8s — service_role ham
-- shuni meros oladi. Funksiya darajasidagi `set` uni bosadi. Qoʻlda
-- sinov `postgres` roli bilan ketadi va bu xatoni KOʻRSATMAYDI.
create or replace function public.so_yonalish_nomzodlari()
returns jsonb
language sql
security definer
set search_path = selleros, zumsavdo, public
set statement_timeout = '120s'
as $$
  with kuzatilgan as (
    select distinct category_external_id as cid
    from selleros.tracked_product where active and category_external_id is not null
  ),
  oxirgi as (
    select distinct on (pc.product_id) pc.product_id, pc.reviews, pc.buyers_per_week
    from zumsavdo.product_census pc
    join zumsavdo.product p on p.id = pc.product_id
    join kuzatilgan k on k.cid = p.category_id
    order by pc.product_id, pc.observed_at desc
  ),
  dokon as (
    select p.category_id, p.shop_id, sum(o.reviews) as sharh
    from zumsavdo.product p
    join oxirgi o on o.product_id = p.id
    where p.shop_id is not null
    group by p.category_id, p.shop_id
  ),
  jami as (
    select category_id, count(*) as sotuvchi, sum(sharh) as sharh_jami
    from dokon group by category_id
  ),
  top3 as (
    select category_id, sum(sharh) as t3 from (
      select category_id, sharh,
             row_number() over (partition by category_id order by sharh desc) as orin
      from dokon) x
    where orin <= 3 group by category_id
  ),
  talab as (
    select p.category_id, sum(o.buyers_per_week) as olchov
    from zumsavdo.product p join oxirgi o on o.product_id = p.id
    group by p.category_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'categoryId',     c.id,
    'name',           c.name,
    'talabOlchovi',   t.olchov,
    'sotuvchiSoni',   j.sotuvchi,
    'top3Ulush',      round(100.0 * k.t3 / nullif(j.sharh_jami, 0))::int,
    'optimalKirishSom', cr.optimal_entry_uzs,
    'talablar', jsonb_build_object(
      'markirovka', cr.marking_required,
      'sertifikat', cr.certificate_required,
      'haftalar',   cr.entry_weeks
    ),
    'mavsumiylik',    cr.seasonality
  ) order by c.id), '[]'::jsonb)
  from kuzatilgan ku
  join zumsavdo.category c on c.id = ku.cid
  left join jami j  on j.category_id = c.id
  left join top3 k  on k.category_id = c.id
  left join talab t on t.category_id = c.id
  left join selleros.category sc
    on sc.platform = 'uzum' and sc.external_id = c.id
  left join selleros.category_requirements cr on cr.category_id = sc.id
$$;

-- Faqat backend chaqiradi. Brauzer bazaga toʻgʻridan-toʻgʻri tegmaydi
-- (reja, 5-boʻlim).
revoke all on function public.so_yonalish_nomzodlari() from public, anon, authenticated;
