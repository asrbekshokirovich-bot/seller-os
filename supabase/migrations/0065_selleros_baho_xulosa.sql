-- 0065 — yordamchi javoblari bahosi (👍/👎) xulosasi: /olchov paneli uchun.
--
-- Nazoratchi (2026-10-13): "Mijoz har javobga 👍/👎 baho bersin — bahoni siz
-- koʻrasiz". Baho `events` ga yoziladi: nomi `javob_baho`, props
-- {seq, baho, manba, savolId} (`so_hodisa_yoz`, 0047; Edge `POST /baho`).
--
-- FAQAT SANOQ qaytaradi, matn emas: Edge uchiga anon kalit bilan har kim kira
-- oladi (kalit Chrome kengaytmasida ochiq). Qaysi javobga 👎 bosilgani kerak
-- boʻlsa — `events.props->>'seq'` ni `suhbat_xabar` (user_id + seq) bilan
-- bogʻlab, bazadan alohida oʻqiladi.
--
-- Har (foydalanuvchi, xabar) uchun OXIRGI baho sanaladi: fikrini oʻzgartirgan
-- mijoz (👍 → 👎) ikki marta sanalmaydi.

create or replace function public.so_baho_xulosa(p_kun int default 30)
returns jsonb
language sql
stable
security definer
set search_path = selleros, public
as $$
  with davr as (
    select greatest(1, least(coalesce(p_kun, 30), 365)) as kun
  ),
  oxirgi as (
    select distinct on (e.user_id, e.props->>'seq')
           e.props->>'baho'                            as baho,
           coalesce(e.props->>'manba', 'nomaʼlum')     as manba,
           coalesce(e.props->>'savolId', 'nomaʼlum')   as savol
      from selleros.events e, davr
     where e.name = 'javob_baho'
       and e.created_at >= now() - make_interval(days => davr.kun)
     order by e.user_id, e.props->>'seq', e.created_at desc
  ),
  manbalar as (
    select manba,
           count(*) filter (where baho = 'yaxshi') as yaxshi,
           count(*) filter (where baho = 'yomon')  as yomon
      from oxirgi
     group by manba
  ),
  savollar as (
    select savol, count(*) as yomon
      from oxirgi
     where baho = 'yomon'
     group by savol
     order by count(*) desc, savol
     limit 5
  )
  select jsonb_build_object(
    'kun',    (select kun from davr),
    'yaxshi', (select count(*) from oxirgi where baho = 'yaxshi'),
    'yomon',  (select count(*) from oxirgi where baho = 'yomon'),
    'manba',  coalesce((select jsonb_object_agg(manba, jsonb_build_object('yaxshi', yaxshi, 'yomon', yomon)) from manbalar), '{}'::jsonb),
    'savol',  coalesce((select jsonb_agg(jsonb_build_object('savolId', savol, 'yomon', yomon) order by yomon desc, savol) from savollar), '[]'::jsonb)
  );
$$;

revoke all on function public.so_baho_xulosa(int) from public, anon, authenticated;
