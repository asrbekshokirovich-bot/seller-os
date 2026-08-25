-- KPI xom sanoqlari va tarif rejasi.
--
-- Reja, 8-boʻlim: "Birinchi kundan oʻlchanadigan raqamlar" — oʻn
-- bitta KPI, beshtasi pilot darvozasiga bogʻlangan. Shu paytgacha
-- bu raqamlarni koʻrsatadigan joy yoʻq edi.
--
-- BU YERDA FAQAT SANOQ BOR, BAHO YOʻQ.
--
-- Foiz ham, maqsad ham, "yaxshi/yomon" ham `@selleros/shared/kpi`
-- da hisoblanadi. Sabab yoʻnalish va tovar ballari bilan bir xil:
-- mantiq bitta joyda tursin, web/bot/kengaytma uch xil javob
-- bermasin. Bazada foiz hisoblansa, uni testdan oʻtkazish uchun
-- har safar baza kerak boʻlardi.
--
-- Nol bilan boʻsh ARALASHTIRILMAYDI. Masalan `tolov.qatorlar = 0`
-- xom haqiqat: `payments` jadvalida qator yoʻq. Undan "konversiya
-- 0%" degan xulosa BU YERDA chiqarilmaydi — buni shared qatlami
-- koʻradi va qatorni `null` qilib, sababini yozib qaytaradi.

create or replace function public.so_kpi_xom()
returns jsonb
language sql
security definer
set search_path = selleros, public
set statement_timeout = '20s'
as $$
  with
  -- "Ustani boshladi" = 1-qadam savollariga javob berdi. Sessiya
  -- ochilishi emas: birinchi tashrifda `users` qatori yaratiladi
  -- va uni "boshladi" deb sanash maxrajni shishirardi.
  boshladi as (select user_id from selleros.user_profiles),
  uchinchi as (select distinct user_id from selleros.recommendations where step = 3),

  -- Konversiya kohorti: 30 kunlik oynasi YOPILGAN foydalanuvchilar.
  -- Kecha kelgan odam hali "30 kun ichida toʻlamadi" deb sanalmaydi.
  kohort as (
    select id, created_at from selleros.users
    where created_at <= now() - interval '30 days'
  ),
  pullik_30 as (
    select distinct k.id
    from kohort k
    join selleros.subscriptions s on s.user_id = k.id
    where s.plan <> 'bepul'
      and s.started_at <= k.created_at + interval '30 days'
  ),

  -- Ketish: davri tugagan obunalardan qaytmaganlari.
  davr as (
    select status from selleros.subscriptions
    where ends_at is not null and ends_at <= now()
  )

  select jsonb_build_object(
    'olchandi', now(),
    'usta', jsonb_build_object(
      'boshladi',       (select count(*) from boshladi),
      'uchinchi_qadam', (select count(*) from uchinchi u
                         where exists (select 1 from boshladi b where b.user_id = u.user_id)),
      -- 3-qadamga yetgan, lekin profili YOʻQ foydalanuvchilar.
      -- Bu nisbatga kirmaydi (maxrajda ular yoʻq), lekin jimgina
      -- yoʻqolmaydi ham: noldan katta boʻlsa, `/tovarlar` profilsiz
      -- ochilayotgani koʻrinadi va nisbat shu qadar toʻliq emas.
      'uchinchi_profilsiz', (select count(*) from uchinchi u
                             where not exists (select 1 from boshladi b where b.user_id = u.user_id))
    ),
    'tavsiya', jsonb_build_object(
      'jami',  (select count(*) from selleros.recommendations),
      -- Tanlash hodisasi yozilmaydi. Nol emas, `null`: nol
      -- "hech kim tanlamadi" degan daʼvo boʻlardi.
      'qabul', (select case when count(*) = 0 then null else count(*) end
                from selleros.events where name = 'tavsiya_tanlandi')
    ),
    'obuna', jsonb_build_object(
      'kohort',       (select count(*) from kohort),
      'pullik_30kun', (select count(*) from pullik_30),
      'davr_tugadi',  (select count(*) from davr),
      'davr_ketdi',   (select count(*) from davr where status in ('cancelled', 'paused'))
    ),
    'tolov',  jsonb_build_object('qatorlar', (select count(*) from selleros.payments)),
    'ai',     jsonb_build_object(
      'qatorlar',    (select count(*) from selleros.ai_usage),
      'xarajat_usd', (select sum(cost_usd) from selleros.ai_usage)
    ),
    'hodisa', jsonb_build_object('qatorlar', (select count(*) from selleros.events))
  );
$$;

revoke all on function public.so_kpi_xom() from public, anon, authenticated;

-- Amaldagi obuna — sessiya tokeni boʻyicha.
--
-- Qator YOʻQ boʻlishi ODATIY hol: hamma bepuldan boshlanadi.
-- Shuning uchun `null` xato emas va shared qatlami uni `bepul`
-- deb oʻqiydi. Qaysi rejaga toʻgʻri kelishini baza hal QILMAYDI —
-- u faqat qatorni beradi.
create or replace function public.so_obuna(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
  r record;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  -- Bir nechta qator boʻlsa eng yangisi olinadi: obuna tarixi
  -- oʻchirilmaydi, ustiga yoziladi.
  select s.plan, s.status, s.ends_at into r
  from selleros.subscriptions s
  where s.user_id = u
  order by s.started_at desc, s.id desc
  limit 1;

  return jsonb_build_object(
    'userId', u,
    'obuna', case when r is null then null
                  else jsonb_build_object('plan', r.plan, 'status', r.status,
                                          'ends_at', r.ends_at) end
  );
end;
$$;

revoke all on function public.so_obuna(text) from public, anon, authenticated;
