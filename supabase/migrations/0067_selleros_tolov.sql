-- Obuna toʻlovi — Payme va Click (nazoratchi, 2026-10-14: "149 000 soʻm/oy, faqat
-- Payme/Click", "2-bosqichni boshla").
--
-- BUYURTMA — `payments` qatori: bitta toʻlov urinishi (kim, qaysi provayder, qancha,
-- qaysi reja, necha kun). Payme `ac.order_id` va Click `merchant_trans_id` — shu
-- qatorning `id`si. Holati: kutmoqda → tolangan | bekor | qaytarildi.
--
-- TRANZAKSIYA — provayderning oʻz yozuvi (`tolov_tranzaksiya`): Payme — `id` (24 belgi),
-- Click — `click_trans_id`. Bir buyurtmaga bir nechta tranzaksiya boʻlishi mumkin
-- (bekor qilingandan keyin yangisi), lekin bir vaqtda faqat BITTA ochiq. Holatlar Payme
-- bilan bir xil: 1 — yaratildi (pul kutilmoqda), 2 — bajarildi, -1 — bajarilmasdan
-- bekor, -2 — bajarilgandan keyin bekor (pul qaytdi).
--
-- Obuna FAQAT shu yerda uzaytiriladi — bajarilish bilan bitta tranzaksiyada: pul
-- yechildi-yu obuna yozilmadi (yoki teskarisi) holati boʻlmaydi. Summa bazadagi
-- buyurtma bilan solishtiriladi — provayder yuborgan summaga ishonilmaydi.
--
-- Eski `so_tolov_boshla` (0045) va `so_tolov_webhook` (0048) olib tashlanadi: ikkinchisi
-- rejani SUMMADAN taxmin qilardi va imzosiz Fastify uchidan chaqirilardi.
--
-- Hamma funksiya service_role uchun (Edge Function); anon/authenticated ga yopiq.

alter table selleros.payments
  add column if not exists reja text,
  add column if not exists kun integer;

create table if not exists selleros.tolov_tranzaksiya (
  id           bigserial primary key,
  payment_id   bigint not null references selleros.payments(id),
  provider     text not null check (provider in ('payme', 'click')),
  -- Payme tranzaksiya id si / Click click_trans_id — provayderning oʻzi bergani.
  tashqi_id    text not null,
  holat        smallint not null check (holat in (1, 2, -1, -2)),
  summa_tiyin  bigint not null check (summa_tiyin > 0),
  -- Payme `time` (ms) — GetStatement shu boʻyicha filtrlaydi. Click da yoʻq.
  tashqi_vaqt  bigint,
  -- Bizning vaqtimiz (ms): Payme javoblarida aynan shu qiymatlar qaytadi.
  yaratildi_ms bigint not null,
  bajarildi_ms bigint not null default 0,
  bekor_ms     bigint not null default 0,
  -- Payme bekor sababi (1–10) yoki Click xato kodi (manfiy).
  sabab        smallint,
  created_at   timestamptz not null default now(),
  unique (provider, tashqi_id)
);

create index if not exists tolov_tranzaksiya_buyurtma_idx on selleros.tolov_tranzaksiya (payment_id);
create index if not exists tolov_tranzaksiya_vaqt_idx on selleros.tolov_tranzaksiya (provider, tashqi_vaqt);

revoke all on selleros.tolov_tranzaksiya from public, anon, authenticated;

drop function if exists public.so_tolov_boshla(text, text, text, bigint, boolean);
drop function if exists public.so_tolov_webhook(bigint, text, text);

/* Hozirgi vaqt, millisekund — Payme shu birlikda ishlaydi. */
create or replace function selleros.tolov_ms()
returns bigint
language sql
volatile
as $$
  select (extract(epoch from clock_timestamp()) * 1000)::bigint
$$;

/*
 * Obuna uzaytiriladi: faol boʻlsa — tugash sanasidan, boʻlmasa (yoʻq, tugagan,
 * toʻxtatilgan) — hozirdan. Muddatsiz obuna muddatsizligicha qoladi.
 */
create or replace function selleros.obuna_uzaytir(p_user uuid, p_reja text, p_kun integer)
returns void
language plpgsql
set search_path = selleros, public
as $$
declare
  s record;
begin
  select * into s from selleros.subscriptions
   where user_id = p_user
   order by started_at desc, id desc
   limit 1
   for update;
  if found and s.status in ('trial', 'active', 'grace') and (s.ends_at is null or s.ends_at > now()) then
    update selleros.subscriptions
       set status = 'active', plan = p_reja, retry_count = 0, updated_at = now(),
           ends_at = case when s.ends_at is null then null else s.ends_at + make_interval(days => p_kun) end
     where id = s.id;
  else
    insert into selleros.subscriptions (user_id, plan, status, started_at, ends_at)
    values (p_user, p_reja, 'active', now(), now() + make_interval(days => p_kun));
  end if;
end;
$$;

/* Pul qaytarildi (Payme: bajarilgandan keyin bekor) — oʻsha kunlar obunadan olinadi. */
create or replace function selleros.obuna_qisqartir(p_user uuid, p_kun integer)
returns void
language plpgsql
set search_path = selleros, public
as $$
declare
  s record;
begin
  select * into s from selleros.subscriptions
   where user_id = p_user
   order by started_at desc, id desc
   limit 1
   for update;
  if found and s.ends_at is not null then
    update selleros.subscriptions
       set ends_at = greatest(now(), s.ends_at - make_interval(days => p_kun)), updated_at = now()
     where id = s.id;
  end if;
end;
$$;

/*
 * Buyurtma — sessiya egasi uchun. Narx va muddatni kod beradi (`tolov.ts`), lekin
 * keyin provayder summasi AYNAN shu qator bilan solishtiriladi.
 */
create or replace function public.so_tolov_buyurtma(
  p_token text, p_provayder text, p_reja text, p_summa_som bigint, p_kun integer, p_sandbox boolean
)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
  i bigint;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;
  if p_provayder is null or p_provayder not in ('payme', 'click') or coalesce(p_reja, '') = ''
     or p_summa_som is null or p_summa_som <= 0 or p_kun is null or p_kun <= 0 then
    return jsonb_build_object('xato', 'buyurtma notoʻgʻri');
  end if;
  insert into selleros.payments (user_id, provider, amount_uzs, status, sandbox, reja, kun)
  values (u, p_provayder, p_summa_som, 'kutmoqda', coalesce(p_sandbox, true), p_reja, p_kun)
  returning id into i;
  return jsonb_build_object('id', i, 'summa_som', p_summa_som);
end;
$$;

-- ------------------------------------------------------------------ Payme (Merchant API)

/*
 * Payme buyurtmasi toʻlanadimi. `null` — ha; aks holda sabab: buyurtma_yoq,
 * buyurtma_yopiq (toʻlangan/bekor), summa, band (boshqa ochiq tranzaksiya bor).
 * 12 soatdan eski ochiq tranzaksiya shu yerda bekor qilinadi (sabab 4 — muddat).
 */
create or replace function selleros.payme_buyurtma(p_buyurtma bigint, p_summa_tiyin bigint, p_tashqi text)
returns text
language plpgsql
set search_path = selleros, public
as $$
declare
  p record;
begin
  select * into p from selleros.payments where id = p_buyurtma and provider = 'payme' for update;
  if not found then return 'buyurtma_yoq'; end if;
  if p.status <> 'kutmoqda' then return 'buyurtma_yopiq'; end if;
  if p.amount_uzs * 100 <> p_summa_tiyin then return 'summa'; end if;
  update selleros.tolov_tranzaksiya
     set holat = -1, bekor_ms = selleros.tolov_ms(), sabab = 4
   where payment_id = p.id and holat = 1 and selleros.tolov_ms() - yaratildi_ms > 43200000;
  if exists (select 1 from selleros.tolov_tranzaksiya t
              where t.payment_id = p.id and t.holat = 1 and t.tashqi_id is distinct from p_tashqi) then
    return 'band';
  end if;
  return null;
end;
$$;

/* CheckPerformTransaction. */
create or replace function public.so_payme_tekshir(p_buyurtma bigint, p_summa_tiyin bigint)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  x text;
begin
  x := selleros.payme_buyurtma(p_buyurtma, p_summa_tiyin, null);
  if x is not null then return jsonb_build_object('xato', x); end if;
  return jsonb_build_object('ok', true);
end;
$$;

/* CreateTransaction. Shu id qayta kelsa — oʻsha javob (Payme javob yoʻqolsa takrorlaydi). */
create or replace function public.so_payme_yarat(p_id text, p_time bigint, p_summa_tiyin bigint, p_buyurtma bigint)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  t record;
  x text;
  hozir bigint := selleros.tolov_ms();
  yangi bigint;
begin
  select * into t from selleros.tolov_tranzaksiya where provider = 'payme' and tashqi_id = p_id for update;
  if found then
    if t.holat <> 1 then return jsonb_build_object('xato', 'holat'); end if;
    if hozir - t.yaratildi_ms > 43200000 then
      update selleros.tolov_tranzaksiya set holat = -1, bekor_ms = hozir, sabab = 4 where id = t.id;
      return jsonb_build_object('xato', 'holat');
    end if;
    return jsonb_build_object('create_time', t.yaratildi_ms, 'transaction', t.id::text, 'state', 1);
  end if;
  x := selleros.payme_buyurtma(p_buyurtma, p_summa_tiyin, p_id);
  if x is not null then return jsonb_build_object('xato', x); end if;
  insert into selleros.tolov_tranzaksiya (payment_id, provider, tashqi_id, holat, summa_tiyin, tashqi_vaqt, yaratildi_ms)
  values (p_buyurtma, 'payme', p_id, 1, p_summa_tiyin, p_time, hozir)
  returning id into yangi;
  return jsonb_build_object('create_time', hozir, 'transaction', yangi::text, 'state', 1);
end;
$$;

/* PerformTransaction — pul yechildi: buyurtma toʻlandi va obuna uzaytiriladi. */
create or replace function public.so_payme_bajar(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  t record;
  p record;
  hozir bigint := selleros.tolov_ms();
begin
  select * into t from selleros.tolov_tranzaksiya where provider = 'payme' and tashqi_id = p_id for update;
  if not found then return jsonb_build_object('xato', 'topilmadi'); end if;
  if t.holat = 2 then
    return jsonb_build_object('transaction', t.id::text, 'perform_time', t.bajarildi_ms, 'state', 2);
  end if;
  if t.holat <> 1 then return jsonb_build_object('xato', 'holat'); end if;
  if hozir - t.yaratildi_ms > 43200000 then
    update selleros.tolov_tranzaksiya set holat = -1, bekor_ms = hozir, sabab = 4 where id = t.id;
    return jsonb_build_object('xato', 'holat');
  end if;
  select * into p from selleros.payments where id = t.payment_id for update;
  update selleros.tolov_tranzaksiya set holat = 2, bajarildi_ms = hozir where id = t.id;
  update selleros.payments set status = 'tolangan', external_id = p_id where id = p.id;
  perform selleros.obuna_uzaytir(p.user_id, coalesce(p.reja, 'pro'), coalesce(p.kun, 30));
  return jsonb_build_object('transaction', t.id::text, 'perform_time', hozir, 'state', 2);
end;
$$;

/* CancelTransaction. Toʻlangandan keyin bekor — pul qaytdi: obuna kunlari olinadi. */
create or replace function public.so_payme_bekor(p_id text, p_sabab integer)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  t record;
  p record;
  hozir bigint := selleros.tolov_ms();
begin
  select * into t from selleros.tolov_tranzaksiya where provider = 'payme' and tashqi_id = p_id for update;
  if not found then return jsonb_build_object('xato', 'topilmadi'); end if;
  if t.holat in (-1, -2) then
    return jsonb_build_object('transaction', t.id::text, 'cancel_time', t.bekor_ms, 'state', t.holat);
  end if;
  select * into p from selleros.payments where id = t.payment_id for update;
  if t.holat = 1 then
    update selleros.tolov_tranzaksiya set holat = -1, bekor_ms = hozir, sabab = p_sabab where id = t.id;
    update selleros.payments set status = 'bekor' where id = p.id and status = 'kutmoqda';
    return jsonb_build_object('transaction', t.id::text, 'cancel_time', hozir, 'state', -1);
  end if;
  update selleros.tolov_tranzaksiya set holat = -2, bekor_ms = hozir, sabab = p_sabab where id = t.id;
  update selleros.payments set status = 'qaytarildi' where id = p.id;
  perform selleros.obuna_qisqartir(p.user_id, coalesce(p.kun, 30));
  return jsonb_build_object('transaction', t.id::text, 'cancel_time', hozir, 'state', -2);
end;
$$;

/* CheckTransaction. */
create or replace function public.so_payme_holat(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  t record;
begin
  select * into t from selleros.tolov_tranzaksiya where provider = 'payme' and tashqi_id = p_id;
  if not found then return jsonb_build_object('xato', 'topilmadi'); end if;
  return jsonb_build_object('create_time', t.yaratildi_ms, 'perform_time', t.bajarildi_ms, 'cancel_time', t.bekor_ms,
    'transaction', t.id::text, 'state', t.holat, 'reason', t.sabab);
end;
$$;

/* GetStatement — Payme vaqti (`time`) boʻyicha, oʻsish tartibida. */
create or replace function public.so_payme_royxat(p_dan bigint, p_gacha bigint)
returns jsonb
language sql
security definer
set search_path = selleros, extensions, public
as $$
  select jsonb_build_object('transactions', coalesce(jsonb_agg(jsonb_build_object(
           'id', t.tashqi_id, 'time', t.tashqi_vaqt, 'amount', t.summa_tiyin,
           'account', jsonb_build_object('order_id', t.payment_id::text),
           'create_time', t.yaratildi_ms, 'perform_time', t.bajarildi_ms, 'cancel_time', t.bekor_ms,
           'transaction', t.id::text, 'state', t.holat, 'reason', t.sabab
         ) order by t.tashqi_vaqt, t.id), '[]'::jsonb))
    from selleros.tolov_tranzaksiya t
   where t.provider = 'payme' and t.tashqi_vaqt between p_dan and p_gacha;
$$;

-- ------------------------------------------------------------------ Click (SHOP API)

/* Prepare (action = 0). Shu click_trans_id qayta kelsa — oʻsha prepare_id. */
create or replace function public.so_click_tayyorla(p_click_id bigint, p_buyurtma bigint, p_summa_tiyin bigint)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  t record;
  p record;
  yangi bigint;
begin
  select * into t from selleros.tolov_tranzaksiya where provider = 'click' and tashqi_id = p_click_id::text for update;
  if found then
    if t.payment_id <> p_buyurtma or t.summa_tiyin <> p_summa_tiyin then
      return jsonb_build_object('xato', 'tranzaksiya_yoq');
    end if;
    if t.holat = 1 then return jsonb_build_object('prepare_id', t.id); end if;
    if t.holat = 2 then return jsonb_build_object('xato', 'tolangan'); end if;
    return jsonb_build_object('xato', 'bekor');
  end if;
  select * into p from selleros.payments where id = p_buyurtma and provider = 'click' for update;
  if not found then return jsonb_build_object('xato', 'buyurtma_yoq'); end if;
  if p.status = 'tolangan' then return jsonb_build_object('xato', 'tolangan'); end if;
  if p.status <> 'kutmoqda' then return jsonb_build_object('xato', 'bekor'); end if;
  if p.amount_uzs * 100 <> p_summa_tiyin then return jsonb_build_object('xato', 'summa'); end if;
  if exists (select 1 from selleros.tolov_tranzaksiya x where x.payment_id = p.id and x.holat = 1) then
    return jsonb_build_object('xato', 'band');
  end if;
  insert into selleros.tolov_tranzaksiya (payment_id, provider, tashqi_id, holat, summa_tiyin, yaratildi_ms)
  values (p.id, 'click', p_click_id::text, 1, p_summa_tiyin, selleros.tolov_ms())
  returning id into yangi;
  return jsonb_build_object('prepare_id', yangi);
end;
$$;

/*
 * Complete (action = 1). Click xato yuborsa (`p_click_xato` < 0) — bekor. Muvaffaqiyatda
 * buyurtma toʻlandi va obuna uzaytiriladi; takror kelsa — «allaqachon toʻlangan».
 */
create or replace function public.so_click_yakunla(
  p_click_id bigint, p_prepare_id bigint, p_buyurtma bigint, p_summa_tiyin bigint, p_click_xato integer
)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  t record;
  p record;
  hozir bigint := selleros.tolov_ms();
begin
  select * into t from selleros.tolov_tranzaksiya
   where id = p_prepare_id and provider = 'click' and tashqi_id = p_click_id::text
   for update;
  if not found or t.payment_id <> p_buyurtma then return jsonb_build_object('xato', 'tranzaksiya_yoq'); end if;
  if t.summa_tiyin <> p_summa_tiyin then return jsonb_build_object('xato', 'summa'); end if;
  if t.holat = 2 then return jsonb_build_object('xato', 'tolangan'); end if;
  if t.holat <> 1 then return jsonb_build_object('xato', 'bekor'); end if;
  select * into p from selleros.payments where id = t.payment_id for update;
  if coalesce(p_click_xato, 0) < 0 then
    update selleros.tolov_tranzaksiya
       set holat = -1, bekor_ms = hozir, sabab = greatest(-32768, p_click_xato)
     where id = t.id;
    update selleros.payments set status = 'bekor' where id = p.id and status = 'kutmoqda';
    return jsonb_build_object('xato', 'bekor');
  end if;
  update selleros.tolov_tranzaksiya set holat = 2, bajarildi_ms = hozir where id = t.id;
  update selleros.payments set status = 'tolangan', external_id = p_click_id::text where id = p.id;
  perform selleros.obuna_uzaytir(p.user_id, coalesce(p.reja, 'pro'), coalesce(p.kun, 30));
  return jsonb_build_object('confirm_id', t.id);
end;
$$;

revoke all on function selleros.tolov_ms() from public, anon, authenticated;
revoke all on function selleros.obuna_uzaytir(uuid, text, integer) from public, anon, authenticated;
revoke all on function selleros.obuna_qisqartir(uuid, integer) from public, anon, authenticated;
revoke all on function selleros.payme_buyurtma(bigint, bigint, text) from public, anon, authenticated;
revoke all on function public.so_tolov_buyurtma(text, text, text, bigint, integer, boolean) from public, anon, authenticated;
revoke all on function public.so_payme_tekshir(bigint, bigint) from public, anon, authenticated;
revoke all on function public.so_payme_yarat(text, bigint, bigint, bigint) from public, anon, authenticated;
revoke all on function public.so_payme_bajar(text) from public, anon, authenticated;
revoke all on function public.so_payme_bekor(text, integer) from public, anon, authenticated;
revoke all on function public.so_payme_holat(text) from public, anon, authenticated;
revoke all on function public.so_payme_royxat(bigint, bigint) from public, anon, authenticated;
revoke all on function public.so_click_tayyorla(bigint, bigint, bigint) from public, anon, authenticated;
revoke all on function public.so_click_yakunla(bigint, bigint, bigint, bigint, integer) from public, anon, authenticated;
