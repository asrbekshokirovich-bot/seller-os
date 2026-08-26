-- Turkum hajmi — Uzumning OʻZI aytgan tovarlar soni.
--
-- NEGA. Perepisdagi turkum boʻyicha tovar soni Uzumdagi jonli son
-- bilan bir xil emas, va farq BIR TOMONLAMA ham emas.
--
-- Oʻlchandi 2026-08-26, 20 ta turkum:
--
--   turkum                bizda    Uzumda   nisbat
--   Smartfonlar Android   12 472    2 442     511%
--   Shampunlar             9 276    3 202     290%
--   Simsiz quloqchinlar   19 070    9 133     209%
--   Parfyumlangan suv     34 329   17 364     198%
--   Krossovkalar          10 597    8 163     130%
--   Sumkalar              13 128   10 606     124%
--   Soat                  12 883   17 660      73%
--   Qoplamalar            19 796   31 776      62%
--
-- Ikki xil narsa sanaladi:
--
--   * `zumsavdo.product` — id fazosi boʻylab yurib TOPILGAN hamma
--     tovar, uch oʻtish davomida toʻplangan. Roʻyxatdan olingan
--     tovar ham ichida qoladi.
--   * Uzumning `total` — HOZIR shu turkumda koʻrinadigani.
--
-- Xaridor ikkinchisini koʻradi va sotuvchi ikkinchisi bilan
-- raqobatlashadi.
--
-- LEKIN BIRINCHISI HAM TASHLANMAYDI. Farqning oʻzi qamrov
-- qorovuli: Qoplamalarda biz Uzumda bor tovarning 62% ini
-- koʻramiz — bu bizning boʻshligʻimiz va uni bilishimiz kerak.
-- Smartfonlarda esa 5 barobar koʻp koʻramiz — demak roʻyxatdan
-- olingan tovarlar hisobni shishirmoqda.
--
-- SHUNING UCHUN IKKALASI HAM SAQLANADI va hech biri ikkinchisini
-- almashtirmaydi. Bugun bu son hech qayerda ISHLATILMAYDI —
-- avval qamrov oʻlchanadi, keyin qaror qilinadi. Oʻlchovsiz
-- almashtirish bitta taxminni ikkinchisiga almashtirish boʻlardi.
--
-- SOʻROV RETSEPTI `manbalar/turkum_hajmi.py` da yozilgan:
-- sayt cookie si + `apollographql-client-name` + `limit` nol emas.
-- 30 ta ketma-ket soʻrovda bitta ham 429 kelmadi.

create table if not exists selleros.turkum_hajmi (
  category_external_id bigint primary key,
  uzum_total           int not null,
  olchandi             timestamptz not null default now()
);

comment on table selleros.turkum_hajmi is
  'Uzumning OʻZI aytgan turkum hajmi (makeSearch.total). Perepis soni bilan solishtirish uchun.';

-- Qaysi turkumlarning hajmi oʻlchanadi.
--
-- Talab boʻyicha eng kattalari: aynan ular tavsiyaga chiqadi,
-- yaʼni ularning raqobat soni eng koʻp kerak boʻladi.
--
-- Qator emas, BITTA jsonb massiv. Sabab `so_select_tracked` bilan
-- bir xil: PostgREST qator qaytaradigan soʻrovni 1000 tada
-- JIMGINA kesadi.
create or replace function public.so_turkum_royxati(p_limit int default 300)
returns jsonb
language sql
security definer
set search_path to 'selleros', 'public'
stable
as $$
  select coalesce(jsonb_agg(category_id order by talab_olchovi desc nulls last), '[]'::jsonb)
  from (
    select category_id, talab_olchovi
    from selleros.yonalish_nomzodi
    order by talab_olchovi desc nulls last
    limit greatest(1, p_limit)
  ) q;
$$;

revoke all on function public.so_turkum_royxati(int) from public, anon, authenticated;
grant execute on function public.so_turkum_royxati(int) to service_role;

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
    select (x->>'category_id')::bigint as cid, (x->>'total')::int as total
    from jsonb_array_elements(p_royxat) x
    -- `total` yoʻq qatorlar TASHLANADI, nolga aylantirilmaydi:
    -- nol "turkum boʻsh" degan javob boʻlardi.
    where x->>'total' is not null
  ),
  yozildi as (
    insert into selleros.turkum_hajmi (category_external_id, uzum_total, olchandi)
    select cid, total, now() from kirish
    on conflict (category_external_id) do update
      set uzum_total = excluded.uzum_total, olchandi = now()
    returning 1
  )
  select count(*) into n from yozildi;
  return jsonb_build_object('yozildi', n);
end;
$$;

revoke all on function public.so_turkum_hajmi_yoz(jsonb) from public, anon, authenticated;
grant execute on function public.so_turkum_hajmi_yoz(jsonb) to service_role;

-- Qamrov hisoboti: perepis Uzumda koʻringan tovarning qanchasini koʻradi.
--
-- Birinchi variantim PostgREST orqali YIQILDI (57014, statement
-- timeout): har turkum uchun alohida `count(*)` qilardi — 300 ta
-- bogʻlangan pastki soʻrov, har biri 1,85 mln qatorli jadvalga.
-- Toʻgʻridan-toʻgʻri SQL da ishlardi, PostgREST da esa yoʻq —
-- yaʼni "menda ishladi" yetarli emasligining yana bir misoli.
--
-- Endi perepis bir marta guruhlanadi: 2,0 s.
create or replace function public.so_qamrov_hisoboti()
returns jsonb
language sql
security definer
set search_path to 'selleros', 'public'
-- Chegara ATAYLAB yoziladi: sekinlashsa "javob yoʻq" emas,
-- "vaqt tugadi" deb bilinsin.
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
    select h.uzum_total, coalesce(p.bizda, 0) as bizda, h.olchandi
    from selleros.turkum_hajmi h
    left join perepis p on p.category_id = h.category_external_id
    where h.uzum_total > 0
  )
  select jsonb_build_object(
    'turkum', count(*),
    'uzum_jami', sum(uzum_total),
    'bizda_jami', sum(bizda),
    -- Mediana NISBAT, yigʻindilar nisbati emas: bitta ulkan
    -- turkum butun rasmni oʻziga tortib ketmasin.
    'mediana_nisbat_foiz',
      round(100 * percentile_cont(0.5) within group (
        order by bizda::numeric / uzum_total)::numeric, 1),
    'kam_koradiganlar', count(*) filter (where bizda < uzum_total * 0.8),
    'kop_koradiganlar', count(*) filter (where bizda > uzum_total * 1.2),
    'olchandi', max(olchandi)
  )
  from juft;
$$;

revoke all on function public.so_qamrov_hisoboti() from public;
grant execute on function public.so_qamrov_hisoboti() to anon, authenticated, service_role;

-- ============================================================
-- BIRINCHI TOʻLIQ OʻLCHOV — 2026-08-26, 300 turkum
-- ============================================================
--
--   turkum                       300
--   Uzumda jami              730 363
--   bizda jami               991 847
--   mediana nisbat             157,8%
--   kam koʻradiganlar (<80%)      34
--   koʻp koʻradiganlar (>120%)   210
--
-- Yaʼni 300 turkumdan 210 tasida biz Uzum koʻrsatganidan KOʻP
-- sanaymiz. Sabab yuqorida: perepis roʻyxatdan olingan tovarni
-- ham saqlaydi.
--
-- Lekin 34 tasida KAM koʻramiz va bu bizning boʻshligʻimiz:
--
--   Qoplamalar                        19 796 / 31 776   62%
--   Avtomobil breloklari gʻiloflari     3 457 / 12 112   29%
--   Quyoshdan himoya koʻzoynaklari      4 400 /  8 414   52%
--   Futbolkalar                         7 702 / 11 959   64%
--   Tungi kiyimlar                      1 882 /  3 898   48%
--
-- Bu roʻyxat keyingi ish uchun: perepis nima uchun bu
-- turkumlarni toʻliq koʻrmayotganini aniqlash kerak. Bugun
-- FAQAT OʻLCHANDI — sabab hali maʼlum emas va taxmin
-- yozilmaydi.
