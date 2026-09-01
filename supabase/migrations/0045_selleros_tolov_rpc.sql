-- To'lov va obuna boshqaruvi — B3 (To'lov + kirish).
--
-- Reja, B3: Payme/Click/Nasiya orqali to'lov, webhook bilan
-- obunani faollashtirish, va dunning (muddati o'tgan to'lovni
-- 1/3/7-kunlik jadval bilan qayta so'rash, keyin yumshoq
-- pasaytirish). Bu yerda faqat baza qatlami — imzo tekshiruvi,
-- checkout URL yasash va HTTP chaqiruvlari backend'da,
-- `@selleros/shared/tolov` mantig'iga tayanib.
--
-- HECH NARSA O'CHIRILMAYDI.
--
-- To'lov muvaffaqiyatsiz bo'lsa ham `payments` qatori qoladi —
-- shu orqali "necha marta urinildi, nega rad etildi" ma'lum
-- bo'ladi. Obuna to'xtatilganda ham qator o'chirilmaydi, faqat
-- `status = 'paused'` bo'ladi: tarix hisobot uchun kerak.

-- To'lovni boshlash: mavjud sessiya egasiga yangi `payments` qatori
-- ochadi. Checkout URL bu yerda YO'Q — uni provayder javobidan
-- backend yozadi, chunki provayderga tarmoq chaqiruvi baza ichida
-- qilinmaydi.
create or replace function public.so_tolov_boshla(
  p_token     text,
  p_provayder text,
  p_reja      text,
  p_summa     bigint,
  p_sandbox   boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
  v_payment_id bigint;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  if p_provayder not in ('payme', 'click', 'nasiya') then
    return jsonb_build_object('xato', 'notanish provayder');
  end if;

  if p_reja not in ('pro', 'biznes') then
    return jsonb_build_object('xato', 'notanish reja');
  end if;

  if p_summa is null or p_summa <= 0 then
    return jsonb_build_object('xato', 'notogri summa');
  end if;

  insert into selleros.payments (user_id, provider, amount_uzs, status, sandbox)
  values (u, p_provayder, p_summa, 'kutmoqda', p_sandbox)
  returning id into v_payment_id;

  return jsonb_build_object(
    'paymentId', v_payment_id,
    'userId', u,
    'sandbox', p_sandbox
  );
end;
$$;

revoke all on function public.so_tolov_boshla(text, text, text, bigint, boolean) from public, anon, authenticated;
grant execute on function public.so_tolov_boshla(text, text, text, bigint, boolean) to service_role;

-- Webhook: provayder natijasini qayd qiladi va, to'langan bo'lsa,
-- obunani faollashtiradi.
--
-- Token orqali emas — provayder foydalanuvchi sessiyasini bilmaydi,
-- faqat `payment_id` ni. Imzo tekshiruvi bu funksiyaga YETIB
-- KELMASDAN OLDIN backend'da bo'ladi (`@selleros/shared/tolov`
-- dagi `imzoTekshir`): baza soxta webhook'ni farqlay olmaydi.
create or replace function public.so_tolov_webhook(
  p_payment_id  bigint,
  p_holat       text,
  p_external_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = selleros, public
as $$
declare
  v_tolov selleros.payments%rowtype;
  v_sub_id bigint;
begin
  select * into v_tolov from selleros.payments where id = p_payment_id;
  if not found then
    return jsonb_build_object('xato', 'tolov topilmadi');
  end if;

  if p_holat not in ('kutmoqda', 'tolangan', 'rad', 'qaytarildi') then
    return jsonb_build_object('xato', 'notanish holat');
  end if;

  update selleros.payments
  set status = p_holat,
      external_id = coalesce(p_external_id, external_id)
  where id = p_payment_id;

  if p_holat = 'tolangan' then
    -- Eng so'nggi obuna qatori — tarix o'chirilmaydi, ustiga yoziladi.
    select id into v_sub_id
    from selleros.subscriptions
    where user_id = v_tolov.user_id
    order by started_at desc, id desc
    limit 1;

    if v_sub_id is not null then
      update selleros.subscriptions
      set status = 'active',
          retry_count = 0,
          ends_at = now() + interval '30 days',
          updated_at = now()
      where id = v_sub_id;
    else
      insert into selleros.subscriptions (user_id, plan, status, ends_at)
      values (
        v_tolov.user_id,
        -- To'lov summasidan reja aniqlanadi: xabarnoma bilan reja
        -- kelmasa ham (masalan eski provayder javobi) obuna ochilib
        -- qolmasin.
        case when v_tolov.amount_uzs >= 299000 then 'biznes' else 'pro' end,
        'active',
        now() + interval '30 days'
      );
    end if;
  end if;

  return jsonb_build_object('ok', true, 'holat', p_holat);
end;
$$;

revoke all on function public.so_tolov_webhook(bigint, text, text) from public, anon, authenticated;
grant execute on function public.so_tolov_webhook(bigint, text, text) to service_role;

-- Dunning: muddati o'tgan obunalarni jadval bo'yicha bir qadam
-- oldinga suradi. Kron/cheklab beriladigan job chaqiradi (masalan
-- kuniga bir marta) — foydalanuvchi so'rovi bilan emas.
create or replace function public.so_dunning_tekshir()
returns jsonb
language plpgsql
security definer
set search_path = selleros, public
as $$
declare
  v_grace_ga_otdi integer := 0;
  v_toxtadi       integer := 0;
  v_qayta_urinish integer := 0;
begin
  -- 1. Muddati tugagan `active` → `grace`. Xizmat hali ishlaydi,
  -- lekin "to'lov kutilmoqda" ko'rsatiladi.
  update selleros.subscriptions
  set status = 'grace',
      updated_at = now()
  where status = 'active'
    and ends_at is not null
    and ends_at < now();
  get diagnostics v_grace_ga_otdi = row_count;

  -- 2. Imtiyoz muddati (3 kun) va qayta urinishlar tugagan →
  -- yumshoq pasaytirish. Qator o'chirilmaydi.
  update selleros.subscriptions
  set status = 'paused',
      updated_at = now()
  where status = 'grace'
    and retry_count >= 3
    and updated_at < now() - interval '3 days';
  get diagnostics v_toxtadi = row_count;

  -- 3. Imtiyozda va hali urinishlar bor — 1/3/7-kunlik jadvalga
  -- ko'ra keyingi urinish sanaladi (`retry_count` shu bosqichni
  -- belgilaydi, aniq sanani `@selleros/shared/tolov` dagi
  -- `keyingiUrinish` hisoblaydi).
  update selleros.subscriptions
  set retry_count = retry_count + 1,
      updated_at = now()
  where status = 'grace'
    and retry_count < 3
    and updated_at < now() - interval '1 day';
  get diagnostics v_qayta_urinish = row_count;

  return jsonb_build_object(
    'grace_ga_otdi', v_grace_ga_otdi,
    'toxtadi', v_toxtadi,
    'qayta_urinish', v_qayta_urinish
  );
end;
$$;

revoke all on function public.so_dunning_tekshir() from public, anon, authenticated;
grant execute on function public.so_dunning_tekshir() to service_role;

-- Telegram ulash: mavjud (sessiya bilan boshlangan) foydalanuvchiga
-- `telegram_id` yozadi. Onboarding: "Telegram orqali boshlash →
-- Usta 1-qadami DARHOL" — javoblar avval anonim sessiyaga yoziladi,
-- Telegram keyin ULANADI, ustiga yozilmaydi.
create or replace function public.so_telegram_ulab(
  p_token       text,
  p_telegram_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
  v_boshqa uuid;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  select id into v_boshqa
  from selleros.users
  where telegram_id = p_telegram_id and id <> u;

  if v_boshqa is not null then
    return jsonb_build_object('xato', 'telegram_id boshqa hisobga ulangan');
  end if;

  update selleros.users
  set telegram_id = p_telegram_id
  where id = u;

  return jsonb_build_object('ok', true, 'userId', u);
end;
$$;

revoke all on function public.so_telegram_ulab(text, bigint) from public, anon, authenticated;
grant execute on function public.so_telegram_ulab(text, bigint) to service_role;

-- Obuna holati + so'nggi to'lovlar — `so_obuna` dan kengroq: dunning
-- va to'lov ekranlariga kerakli hamma narsa bitta chaqiruvda.
create or replace function public.so_obuna_toliq(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
  v_obuna jsonb;
  v_tolovlar jsonb;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  select jsonb_build_object(
    'plan', s.plan, 'status', s.status,
    'started_at', s.started_at, 'ends_at', s.ends_at,
    'retry_count', s.retry_count
  ) into v_obuna
  from selleros.subscriptions s
  where s.user_id = u
  order by s.started_at desc, s.id desc
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'provider', p.provider,
    'amount_uzs', p.amount_uzs, 'status', p.status,
    'sandbox', p.sandbox, 'created_at', p.created_at
  ) order by p.created_at desc), '[]'::jsonb) into v_tolovlar
  from (
    select * from selleros.payments
    where user_id = u
    order by created_at desc
    limit 5
  ) p;

  return jsonb_build_object(
    'userId', u,
    'obuna', v_obuna,
    'tolovlar', v_tolovlar
  );
end;
$$;

revoke all on function public.so_obuna_toliq(text) from public, anon, authenticated;
grant execute on function public.so_obuna_toliq(text) to service_role;
