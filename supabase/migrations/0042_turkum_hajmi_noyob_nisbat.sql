-- Turkum hajmi — variant-inflated `total` ni tuzatish.
--
-- Muammo: Uzumning `makeSearch.total` maydoni SKU variantlarini
-- ALOHIDA hisoblaydi. 13309-turkumda oʻlchandi: 500 natijadan
-- faqat 305 noyob productId (61%). Yaʼni `total` ~1,6 barobar
-- shishgan.
--
-- Yechim: birinchi sahifadagi (24 ta) natijalarning noyob
-- productId nisbatini hisoblash va `total` ni shunga koʻpaytirish.
-- Qoʻshimcha soʻrov TALAB QILMAYDI — allaqachon kelayotgan
-- javobdagi `catalog.items` dan olinadi.

alter table selleros.turkum_hajmi
  add column if not exists noyob_nisbat real,
  add column if not exists tuzatilgan_total int;

comment on column selleros.turkum_hajmi.noyob_nisbat is
  'Birinchi sahifadagi noyob productId / jami natijalar. NULL = oʻlchanmadi (eski qator).';
comment on column selleros.turkum_hajmi.tuzatilgan_total is
  'uzum_total × noyob_nisbat — variant-dublikatsiz haqiqiy tovar soni. NULL = nisbat nomaʼlum.';

-- so_turkum_hajmi_yoz ni yangilash: noyob_nisbat va tuzatilgan_total
create or replace function public.so_turkum_hajmi_yoz(p_royxat jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'selleros', 'public'
as $$
declare
  n int := 0;
begin
  with kirish as (
    select
      (x->>'category_id')::bigint as cid,
      (x->>'total')::int as total,
      (x->>'noyob_nisbat')::real as noyob_nisbat
    from jsonb_array_elements(p_royxat) x
    where x->>'total' is not null
  ),
  yozildi as (
    insert into selleros.turkum_hajmi
      (category_external_id, uzum_total, noyob_nisbat, tuzatilgan_total, olchandi)
    select
      cid, total, noyob_nisbat,
      case when noyob_nisbat is not null
        then round(total * noyob_nisbat)::int
        else null
      end,
      now()
    from kirish
    on conflict (category_external_id) do update set
      uzum_total = excluded.uzum_total,
      noyob_nisbat = excluded.noyob_nisbat,
      tuzatilgan_total = excluded.tuzatilgan_total,
      olchandi = now()
    returning 1
  )
  select count(*) into n from yozildi;
  return jsonb_build_object('yozildi', n);
end;
$$;

revoke all on function public.so_turkum_hajmi_yoz(jsonb) from public, anon, authenticated;
grant execute on function public.so_turkum_hajmi_yoz(jsonb) to service_role;

-- Qamrov hisobotini yangilash: tuzatilgan total bilan ham hisoblash
create or replace function public.so_qamrov_hisoboti()
returns jsonb
language sql
security definer
set search_path to 'selleros', 'public'
set statement_timeout to '60s'
stable
as $$
  with perepis as (
    select category_id, count(*)::int as bizda
    from zumsavdo.product
    where category_id is not null
    group by category_id
  ),
  juft as (
    select
      h.uzum_total,
      h.tuzatilgan_total,
      h.noyob_nisbat,
      coalesce(p.bizda, 0) as bizda,
      h.olchandi
    from selleros.turkum_hajmi h
    left join perepis p on p.category_id = h.category_external_id
    where h.uzum_total > 0
  )
  select jsonb_build_object(
    'turkum', count(*),
    'uzum_jami', sum(uzum_total),
    'bizda_jami', sum(bizda),
    'mediana_nisbat_foiz',
      round(100 * percentile_cont(0.5) within group (
        order by bizda::numeric / uzum_total)::numeric, 1),
    'kam_koradiganlar', count(*) filter (where bizda < uzum_total * 0.8),
    'kop_koradiganlar', count(*) filter (where bizda > uzum_total * 1.2),
    -- Tuzatilgan total bilan hisoblangan qamrov
    'tuzatilgan_turkum', count(*) filter (where tuzatilgan_total is not null),
    'tuzatilgan_mediana_foiz', (
      select round(100 * percentile_cont(0.5) within group (
        order by j2.bizda::numeric / nullif(j2.tuzatilgan_total, 0))::numeric, 1)
      from juft j2 where j2.tuzatilgan_total is not null and j2.tuzatilgan_total > 0),
    'tuzatilgan_kam', count(*) filter (
      where tuzatilgan_total is not null and bizda < tuzatilgan_total * 0.8),
    'mediana_noyob_nisbat', (
      select round(percentile_cont(0.5) within group (
        order by j3.noyob_nisbat)::numeric, 2)
      from juft j3 where j3.noyob_nisbat is not null),
    'olchandi', max(olchandi)
  )
  from juft;
$$;

revoke all on function public.so_qamrov_hisoboti() from public;
grant execute on function public.so_qamrov_hisoboti() to anon, authenticated, service_role;
