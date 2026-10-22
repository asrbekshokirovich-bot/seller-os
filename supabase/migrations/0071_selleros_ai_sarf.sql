-- 0071 — AI xarajati: har Claude javobining sarfi `ai_usage` ga (nazoratchi, 2026-10-22:
-- «AI xarajatini tuzat»).
--
-- NIMA BUZUQ EDI. `ai_usage` (0004) va uning KPI si (0028) bor edi, lekin jadvalga HECH KIM
-- yozmasdi. Claude 2026-10-19 dan beri har xabarni yozadi, panel esa «AI ulanmagan —
-- `ai_usage` boʻsh» derdi: pul ketardi, xarajat koʻrinmasdi. QOIDALAR §8 dagi «jim oʻlim»
-- ning aynan oʻzi — «hech narsa boʻlmadi» va «hammasi joyida» bir xil koʻrinardi.
--
-- ENDI Edge har Claude javobidan keyin `so_ai_sarf_yoz` ni chaqiradi (fonda — mijoz kutmaydi):
-- model, maqsad (`ai-tushun`, `ai-yoz`, `sahifa`, `kartochka`…), tokenlar va taxminiy narx
-- ($, roʻyxat narxi boʻyicha — `llm-claude.ts`, `NARXLAR`). Mijoz sessiya tokenidan topiladi;
-- sessiyasiz soʻrovda (bosh sahifadagi savol) `user_id` boʻsh.
--
-- Matn (savol, javob) YOZILMAYDI — faqat sanoq va narx.
--
-- Jadvalga ikki ustun — kesh tokenlari. Anthropic `input_tokens` ni keshdan TASHQARI beradi;
-- kesh alohida saqlanmasa narxni tokenlardan qayta tekshirib boʻlmasdi. `cached` — prompt
-- keshidan oʻqildimi.
--
-- `so_kpi_xom` ning `ai` qismi kengaydi; eski ikki maydon (`qatorlar`, `xarajat_usd`) oʻz
-- joyida. Uni oʻqiydigan kod ikkala shaklni ham qabul qiladi (QOIDALAR §8-h).

alter table selleros.ai_usage
  add column if not exists cache_read_tokens  integer,
  add column if not exists cache_write_tokens integer;

create or replace function public.so_ai_sarf_yoz(
  p_token        text,
  p_model        text,
  p_maqsad       text,
  p_kirish       integer,
  p_chiqish      integer,
  p_kesh_oqildi  integer,
  p_kesh_yozildi integer,
  p_narx_usd     numeric
)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
begin
  -- Sessiyasiz yoki eskirgan token — `user_id` boʻsh: sarf baribir yoziladi, pul ketgan.
  if p_token is not null and p_token <> '' then
    u := (public.so_sessiya_user(p_token)->>'userId')::uuid;
  end if;

  insert into selleros.ai_usage
    (user_id, model, purpose, input_tokens, output_tokens,
     cache_read_tokens, cache_write_tokens, cost_usd, cached)
  values (
    u,
    left(coalesce(nullif(btrim(p_model), ''), 'nomaʼlum'), 80),
    left(coalesce(nullif(btrim(p_maqsad), ''), 'nomaʼlum'), 40),
    greatest(coalesce(p_kirish, 0), 0),
    greatest(coalesce(p_chiqish, 0), 0),
    greatest(coalesce(p_kesh_oqildi, 0), 0),
    greatest(coalesce(p_kesh_yozildi, 0), 0),
    -- Narxi nomaʼlum model — `null`, nol EMAS: nol «tekin» degan daʼvo boʻlardi.
    -- `numeric(10,6)` ga sigʻmaydigan qiymat ham `null` (bitta javob $10 000 turmaydi).
    case when p_narx_usd >= 0 and p_narx_usd < 10000 then round(p_narx_usd, 6) end,
    coalesce(p_kesh_oqildi, 0) > 0
  );

  return jsonb_build_object('yozildi', true);
end;
$$;

revoke all on function public.so_ai_sarf_yoz(text, text, text, integer, integer, integer, integer, numeric)
  from public, anon, authenticated;
grant execute on function public.so_ai_sarf_yoz(text, text, text, integer, integer, integer, integer, numeric)
  to service_role;

-- KPI xom sanoqlari (0028) — `ai` qismi kengaydi, qolgani oʻzgarmadi.
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
  ),

  -- AI sarfi (0071): oxirgi 30 kun; "bugun" — Toshkent kuni.
  ai_oyna as (
    select a.user_id, a.purpose, a.cost_usd,
           a.created_at >= (date_trunc('day', now() at time zone 'Asia/Tashkent')
                            at time zone 'Asia/Tashkent') as bugun,
           a.created_at >= now() - interval '7 days' as kun7
    from selleros.ai_usage a
    where a.created_at >= now() - interval '30 days'
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
      'xarajat_usd', (select sum(cost_usd) from selleros.ai_usage),
      'oxirgi',      (select max(created_at) from selleros.ai_usage),
      -- `usd` — narxi maʼlum qatorlar yigʻindisi; qator boʻlmasa `null` (chaqiruv soni bilan oʻqiladi).
      'bugun', (select jsonb_build_object('chaqiruv', count(*), 'usd', sum(cost_usd)) from ai_oyna where bugun),
      'kun7',  (select jsonb_build_object('chaqiruv', count(*), 'usd', sum(cost_usd)) from ai_oyna where kun7),
      'kun30', (select jsonb_build_object(
                  'chaqiruv',   count(*),
                  'usd',        sum(cost_usd),
                  'narxsiz',    count(*) filter (where cost_usd is null),
                  -- Sessiyasi bor mijozlar; sessiyasiz soʻrovlar xarajati alohida.
                  'mijoz',      count(distinct user_id),
                  'mehmon_usd', sum(cost_usd) filter (where user_id is null))
                from ai_oyna),
      'maqsad_30kun', coalesce((
        select jsonb_object_agg(purpose, jsonb_build_object('chaqiruv', n, 'usd', usd))
        from (select purpose, count(*) as n, sum(cost_usd) as usd from ai_oyna group by purpose) m
      ), '{}'::jsonb),
      -- Jim oʻlim qorovuli: mijozlar yozib turibdi-yu, AI sarfi yozilmayapti — yozuv singan.
      'xabar_7kun', (select count(*) from selleros.suhbat_xabar
                     where rol = 'obunachi' and created_at >= now() - interval '7 days')
    ),
    'hodisa', jsonb_build_object('qatorlar', (select count(*) from selleros.events))
  );
$$;

revoke all on function public.so_kpi_xom() from public, anon, authenticated;
grant execute on function public.so_kpi_xom() to service_role;
