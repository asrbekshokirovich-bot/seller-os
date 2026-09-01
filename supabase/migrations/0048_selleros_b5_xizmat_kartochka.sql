-- B5: Xizmat arizalari, AI kartochka ishlari, sotuvchi tokenlar.
--
-- Uch jadval:
--   1. xizmat_arizalari — "buyurtma bering" → nazoratchiga so'rov
--   2. kartochka_ishlar — AI kartochka generatsiya navbati
--   3. sotuvchi_tokenlar — Uzum Seller API bilan bog'langan tokenlar
--
-- + so_tolov_webhook yangilanadi: yillik obuna muddati (365 kun).

-- ================================================================
-- 1. XIZMAT ARIZALARI
-- ================================================================

create table if not exists selleros.xizmat_arizalari (
  id          bigserial primary key,
  user_id     uuid not null references selleros.users(id),
  turi        text not null check (turi in ('start-paket', 'kalit-taxtida', 'kartochka')),
  holat       text not null default 'yangi'
              check (holat in ('yangi', 'qabul', 'jarayonda', 'tayyor', 'rad')),
  -- Ariza tafsilotlari: categoryId, productId, til, va h.k.
  tafsilot    jsonb not null default '{}'::jsonb,
  -- Nazoratchi izohi — qabul/rad sababi.
  izoh        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_xizmat_arizalari_user
  on selleros.xizmat_arizalari(user_id);

create index if not exists idx_xizmat_arizalari_holat
  on selleros.xizmat_arizalari(holat) where holat = 'yangi';

-- ================================================================
-- 2. KARTOCHKA ISHLARI
-- ================================================================

create table if not exists selleros.kartochka_ishlar (
  id          bigserial primary key,
  user_id     uuid not null references selleros.users(id),
  ariza_id    bigint references selleros.xizmat_arizalari(id),
  product_id  bigint not null,
  til         text not null default 'uz' check (til in ('uz', 'ru')),
  -- Kiritilgan ma'lumotlar: tovar nomi, turkum, kalit so'zlar.
  kirish      jsonb not null default '{}'::jsonb,
  -- AI natija: nom, tavsif, seoKalitSozlar, qisqaTavsif.
  natija      jsonb,
  holat       text not null default 'navbatda'
              check (holat in ('navbatda', 'jarayonda', 'tayyor', 'xato')),
  model       text,
  -- Token sarfi: input, output, cost_usd.
  tokenlar    jsonb,
  xato        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_kartochka_ishlar_user
  on selleros.kartochka_ishlar(user_id);

create index if not exists idx_kartochka_ishlar_holat
  on selleros.kartochka_ishlar(holat) where holat = 'navbatda';

-- ================================================================
-- 3. SOTUVCHI TOKENLAR
-- ================================================================

create table if not exists selleros.sotuvchi_tokenlar (
  id                bigserial primary key,
  user_id           uuid not null references selleros.users(id),
  -- Token SHA-256 xeshi — ochiq matn saqlanmaydi.
  token_hash        text not null,
  dokon_id          text,
  dokon_nomi        text,
  holat             text not null default 'faol'
                    check (holat in ('faol', 'xato', 'muddati_tugagan')),
  oxirgi_tekshiruv  timestamptz,
  created_at        timestamptz not null default now(),
  unique(user_id)
);

-- ================================================================
-- 4. RPC: ARIZA YARATISH
-- ================================================================

create or replace function public.so_xizmat_ariza(
  p_token     text,
  p_turi      text,
  p_tafsilot  jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
  v_id bigint;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  if p_turi not in ('start-paket', 'kalit-taxtida', 'kartochka') then
    return jsonb_build_object('xato', 'notanish xizmat turi');
  end if;

  insert into selleros.xizmat_arizalari (user_id, turi, tafsilot)
  values (u, p_turi, p_tafsilot)
  returning id into v_id;

  return jsonb_build_object('arizaId', v_id, 'holat', 'yangi');
end;
$$;

revoke all on function public.so_xizmat_ariza(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.so_xizmat_ariza(text, text, jsonb) to service_role;

-- ================================================================
-- 5. RPC: ARIZA RO'YXATI (foydalanuvchi uchun)
-- ================================================================

create or replace function public.so_xizmat_royxat(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  return coalesce(
    (select jsonb_agg(jsonb_build_object(
      'id', a.id, 'turi', a.turi, 'holat', a.holat,
      'tafsilot', a.tafsilot, 'izoh', a.izoh,
      'created_at', a.created_at, 'updated_at', a.updated_at
    ) order by a.created_at desc)
    from selleros.xizmat_arizalari a
    where a.user_id = u),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.so_xizmat_royxat(text) from public, anon, authenticated;
grant execute on function public.so_xizmat_royxat(text) to service_role;

-- ================================================================
-- 6. RPC: KARTOCHKA YARATISH
-- ================================================================

create or replace function public.so_kartochka_yarat(
  p_token      text,
  p_product_id bigint,
  p_til        text default 'uz',
  p_kirish     jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
  v_id bigint;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  if p_til not in ('uz', 'ru') then
    return jsonb_build_object('xato', 'notanish til');
  end if;

  insert into selleros.kartochka_ishlar (user_id, product_id, til, kirish)
  values (u, p_product_id, p_til, p_kirish)
  returning id into v_id;

  return jsonb_build_object('ishId', v_id, 'holat', 'navbatda');
end;
$$;

revoke all on function public.so_kartochka_yarat(text, bigint, text, jsonb) from public, anon, authenticated;
grant execute on function public.so_kartochka_yarat(text, bigint, text, jsonb) to service_role;

-- ================================================================
-- 7. RPC: KARTOCHKA NATIJASI
-- ================================================================

create or replace function public.so_kartochka_natija(
  p_token  text,
  p_ish_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
  v_ish selleros.kartochka_ishlar%rowtype;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  select * into v_ish
  from selleros.kartochka_ishlar
  where id = p_ish_id and user_id = u;

  if not found then
    return jsonb_build_object('xato', 'ish topilmadi');
  end if;

  return jsonb_build_object(
    'id', v_ish.id,
    'holat', v_ish.holat,
    'natija', v_ish.natija,
    'model', v_ish.model,
    'xato', v_ish.xato,
    'tokenlar', v_ish.tokenlar,
    'created_at', v_ish.created_at
  );
end;
$$;

revoke all on function public.so_kartochka_natija(text, bigint) from public, anon, authenticated;
grant execute on function public.so_kartochka_natija(text, bigint) to service_role;

-- ================================================================
-- 8. RPC: SOTUVCHI TOKEN SAQLASH
-- ================================================================

create or replace function public.so_sotuvchi_token_saqla(
  p_token      text,
  p_token_hash text,
  p_dokon_id   text default null,
  p_dokon_nomi text default null
)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
  v_id bigint;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  -- UPSERT: bitta foydalanuvchida bitta token.
  insert into selleros.sotuvchi_tokenlar (user_id, token_hash, dokon_id, dokon_nomi)
  values (u, p_token_hash, p_dokon_id, p_dokon_nomi)
  on conflict (user_id) do update
    set token_hash = excluded.token_hash,
        dokon_id = excluded.dokon_id,
        dokon_nomi = excluded.dokon_nomi,
        holat = 'faol',
        oxirgi_tekshiruv = now()
  returning id into v_id;

  return jsonb_build_object('ok', true, 'tokenId', v_id);
end;
$$;

revoke all on function public.so_sotuvchi_token_saqla(text, text, text, text) from public, anon, authenticated;
grant execute on function public.so_sotuvchi_token_saqla(text, text, text, text) to service_role;

-- ================================================================
-- 9. so_tolov_webhook YANGILANISHI: yillik muddat
-- ================================================================
-- Summa yillik narxga mos kelsa → 365 kun, aks holda → 30 kun.

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
  v_muddat interval;
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
    -- Yillik narxlar: 990_000 (pro) yoki 2_990_000 (biznes) → 365 kun.
    if v_tolov.amount_uzs in (990000, 2990000) then
      v_muddat := interval '365 days';
    else
      v_muddat := interval '30 days';
    end if;

    select id into v_sub_id
    from selleros.subscriptions
    where user_id = v_tolov.user_id
    order by started_at desc, id desc
    limit 1;

    if v_sub_id is not null then
      update selleros.subscriptions
      set status = 'active',
          retry_count = 0,
          ends_at = now() + v_muddat,
          updated_at = now()
      where id = v_sub_id;
    else
      insert into selleros.subscriptions (user_id, plan, status, ends_at)
      values (
        v_tolov.user_id,
        case when v_tolov.amount_uzs >= 299000 then 'biznes' else 'pro' end,
        'active',
        now() + v_muddat
      );
    end if;
  end if;

  return jsonb_build_object('ok', true, 'holat', p_holat);
end;
$$;

revoke all on function public.so_tolov_webhook(bigint, text, text) from public, anon, authenticated;
grant execute on function public.so_tolov_webhook(bigint, text, text) to service_role;

-- ================================================================
-- 10. RPC: KUNLIK KARTOCHKA LIMITI
-- ================================================================

create or replace function public.so_kartochka_limit(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
  v_soni integer;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  select count(*) into v_soni
  from selleros.kartochka_ishlar
  where user_id = u
    and created_at >= current_date;

  return jsonb_build_object('soni', v_soni);
end;
$$;

revoke all on function public.so_kartochka_limit(text) from public, anon, authenticated;
grant execute on function public.so_kartochka_limit(text) to service_role;
