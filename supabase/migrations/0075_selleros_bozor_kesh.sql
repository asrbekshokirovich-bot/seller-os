-- 0075 — bozor paneli: hamma Edge nusxasi uchun umumiy kesh (2026-10-27).
--
-- Jonli oʻlchov (2026-10-27, 0074 dan keyin): eng katta turkum («Parfyumlangan suv»,
-- 15 571 tovar) — panel 4,1 s; takroriy soʻrov ham 4 s. Edge xotirasidagi kesh har
-- nusxada alohida, soʻrov esa har safar boshqa nusxaga tushishi mumkin. Maʼlumot
-- kuniga bir marta yangilanadi (VPS, 01:00) — hisoblangan panel shu kun uchun bazada
-- saqlanadi va hamma nusxa uni oʻqiydi: kunda birinchi ochgan odam kutadi, qolgani — yoʻq.
--
--   selleros.bozor_kesh     — turkum → panel (jsonb), qaysi kun maʼlumotidan va qaysi
--                             kod versiyasi bilan (`BOZOR_KESH_VERSIYASI`, bozor-paneli.ts).
--   so_bozor_kesh_oqi       — joriy maʼlumot kuni (`xulosa_jurnal`) va shu kunga, shu
--                             versiyaga yozilgan panel (boʻlmasa `null`).
--   so_bozor_kesh_yoz       — panelni yozadi; eskiroq kun yangisining ustiga yozilmaydi.
--
-- `so_bozor_qatorlar` (0074) oʻzgarmadi: saralashsiz varianti oʻlchandi (eng katta turkum,
-- iliq: 0,86 → 0,80 s), doʻkon nomlarini indeksdan olish esa sovuq oʻqishda sekinroq chiqdi
-- (1 562 doʻkon — tasodifiy oʻqish, toʻliq oʻqish 0,28 s ga qarshi ~1 s). Vaqtning asosiy
-- qismi — Edge da (qatorlarni olib kelish va hisoblash); uni kesh yechadi.
--
-- Panel — ochiq maʼlumotdan yigʻilgan raqamlar, shaxsiy narsa yoʻq. Baribir faqat
-- service_role (Edge Function): jadvalda RLS yoqiq va siyosat yoʻq, huquq olib qoʻyilgan.

create table if not exists selleros.bozor_kesh (
  kategoriya bigint primary key,
  sana       date not null,
  versiya    text not null,
  panel      jsonb not null,
  yozildi    timestamptz not null default now()
);

alter table selleros.bozor_kesh enable row level security;
revoke all on selleros.bozor_kesh from public, anon, authenticated;

create or replace function public.so_bozor_kesh_oqi(p_kategoriya bigint, p_versiya text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with j as (select x.sana from zumsavdo.xulosa_jurnal x order by x.id desc limit 1)
  select jsonb_build_object(
    'sana', (select j.sana from j),
    'panel', (select k.panel
                from selleros.bozor_kesh k, j
               where k.kategoriya = p_kategoriya and k.versiya = p_versiya and k.sana = j.sana));
$$;

create or replace function public.so_bozor_kesh_yoz(p_kategoriya bigint, p_sana date, p_versiya text, p_panel jsonb)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into selleros.bozor_kesh as k (kategoriya, sana, versiya, panel, yozildi)
  values (p_kategoriya, p_sana, p_versiya, p_panel, now())
  on conflict (kategoriya) do update
    set sana = excluded.sana, versiya = excluded.versiya, panel = excluded.panel, yozildi = excluded.yozildi
    where k.sana <= excluded.sana;
$$;

revoke all on function public.so_bozor_kesh_oqi(bigint, text) from public, anon, authenticated;
revoke all on function public.so_bozor_kesh_yoz(bigint, date, text, jsonb) from public, anon, authenticated;
grant execute on function public.so_bozor_kesh_oqi(bigint, text) to service_role;
grant execute on function public.so_bozor_kesh_yoz(bigint, date, text, jsonb) to service_role;
