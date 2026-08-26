-- 6-tuzoqning qamrov qorovuli OʻCHIRILGAN edi — SQL uni bekor qilardi.
--
-- `monopoliya.ts` da qorovul bor va u bekorga qoʻyilmagan. Izohida
-- 2026-08-19 dagi oʻlchov yozilgan:
--
--   "Qoplamalar" turkumida 10 ta sotuvchi oʻlchangan, ular boʻyicha
--   ulush 76% — filtr ogohlantirish berardi. Aslida turkumda
--   2 052 ta sotuvchi bor va haqiqiy ulush 21%.
--
-- Qorovul `measuredSellers / totalSellers` nisbatiga qaraydi.
-- Lekin `so_turkum_holati` ikkalasiga BIR XIL sonni qoʻyardi:
--
--   -- Ulush butun turkum ustida hisoblandi: qamrov 100%.
--   'measuredSellers', j.sotuvchilar,
--   'totalSellers',    j.sotuvchilar
--
-- Yaʼni qamrov har doim 100% chiqardi va qorovul hech qachon
-- ishlamasdi. Izohdagi "qamrov 100%" daʼvosi ham notoʻgʻri edi:
-- hisob `selleros.product` dan, yaʼni 6 000 lik namunadan
-- ketardi.
--
-- OʻLCHANDI 2026-08-26, 319 turkum:
--
--   mediana sotuvchi, namunada      19
--   mediana sotuvchi, perepisda    785
--   mediana qamrov                 2,3%
--
-- Natija: 319 turkumdan 284 tasi "monopol" deb bayroqlanardi —
-- 89%. Bu signal emas, shovqin: filtr deyarli hamma narsani
-- belgilasa, foydalanuvchi uni oʻqishni toʻxtatadi.
--
-- ============================================================
-- TUZATILGANDAN KEYIN
-- ============================================================
--
--   bayroqli      284  →  8
--   baholanmadi    21  →  0
--
-- Baholanmadi nolga tushgani muhim: perepis turkumning HAMMA
-- sotuvchisini koʻradi, yaʼni qamrov endi haqiqatan 100% va
-- qorovul ortiqcha ushlamaydi.
--
-- Qolgan sakkiztasi haqiqiy: masalan 435 sotuvchili turkumda
-- bozorning 88% i uch doʻkonda.
--
-- NEGA KESH. Hisob perepis boʻylab kechadi — oʻlchandi, 19,5 s.
-- Har soʻrovda emas, supurishdan keyin bir marta. Bu
-- `so_yonalish_yangila` va `so_brend_yangila` bilan bir xil naqsh.

create table if not exists selleros.turkum_raqobati (
  category_external_id bigint primary key,
  sotuvchi_soni int not null,
  top3_ulush    int,
  olchandi      timestamptz not null default now()
);

comment on table selleros.turkum_raqobati is
  'Turkumdagi sotuvchilar va top-3 ulushi. Manba PEREPIS (1,85 mln), namuna emas.';

create or replace function public.so_turkum_raqobati_yangila()
returns jsonb
language plpgsql
security definer
set search_path to 'selleros', 'public'
set statement_timeout to '300s'
as $$
declare
  n int := 0;
begin
  with oxirgi as (
    select distinct on (pc.product_id) pc.product_id, pc.reviews
    from zumsavdo.product_census pc
    order by pc.product_id, pc.observed_at desc
  ),
  dokon as (
    select p.category_id, p.shop_id, sum(o.reviews) as sharh
    from zumsavdo.product p
    join oxirgi o on o.product_id = p.id
    where p.shop_id is not null and p.category_id is not null
    group by p.category_id, p.shop_id
  ),
  jami as (
    select category_id, count(*) as sotuvchi, sum(sharh) as s
    from dokon group by category_id
  ),
  top3 as (
    select category_id, sum(sharh) as t3 from (
      select category_id, sharh,
             row_number() over (partition by category_id order by sharh desc) as orin
      from dokon
    ) x where orin <= 3 group by category_id
  ),
  yozildi as (
    insert into selleros.turkum_raqobati
      (category_external_id, sotuvchi_soni, top3_ulush, olchandi)
    select j.category_id, j.sotuvchi::int,
           -- Sharh yigʻindisi nol boʻlsa ulush hisoblanmaydi:
           -- nolga boʻlish emas, `null` — "bilmayman".
           round(100.0 * k.t3 / nullif(j.s, 0))::int,
           now()
    from jami j left join top3 k on k.category_id = j.category_id
    on conflict (category_external_id) do update
      set sotuvchi_soni = excluded.sotuvchi_soni,
          top3_ulush = excluded.top3_ulush,
          olchandi = now()
    returning 1
  )
  select count(*) into n from yozildi;
  return jsonb_build_object('turkum', n);
end;
$$;

revoke all on function public.so_turkum_raqobati_yangila() from public, anon, authenticated;
grant execute on function public.so_turkum_raqobati_yangila() to service_role;

create or replace function public.so_turkum_holati(p_platform text default 'uzum')
returns jsonb
language sql
security definer
set search_path to 'selleros', 'public'
as $$
  -- Uchala son ham PEREPISDAN. Yuqoridagi izohga qarang.
  select coalesce(jsonb_agg(jsonb_build_object(
           'categoryId', c.external_id,
           'name', coalesce(c.name_uz, c.name_ru),
           'top3SharePercent', r.top3_ulush,
           'measuredSellers', r.sotuvchi_soni,
           'totalSellers', r.sotuvchi_soni
         )), '[]'::jsonb)
  from selleros.turkum_raqobati r
  join selleros.category c
    on c.external_id = r.category_external_id and c.platform = p_platform
  -- Faqat kuzatuvdagi turkumlar: panel ular haqida gapiradi.
  where exists (
    select 1 from selleros.product p
    where p.category_id = c.id and p.platform = p_platform
  );
$$;

revoke all on function public.so_turkum_holati(text) from public;
grant execute on function public.so_turkum_holati(text) to anon, authenticated, service_role;
