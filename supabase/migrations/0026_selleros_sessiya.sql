-- Kirishsiz boshlash: anonim sessiya.
--
-- Reja (B3, onboarding): "Telegram orqali boshlash → Usta 1-qadami
-- DARHOL". Yaʼni kirish oqimning oldida turmaydi — odam avval
-- javob beradi, keyin oʻzini tanitadi.
--
-- Shu sababdan foydalanuvchi birinchi tashrifda yaratiladi:
-- `telegram_id` va `phone` boʻsh, lekin `id` bor. Javoblar oʻsha
-- `id` ga yoziladi. Keyin Telegram ulanganda AYNAN OʻSHA qator
-- toʻldiriladi — javoblar yoʻqolmaydi.
--
-- Muqobil yoʻl — javoblarni brauzerda saqlash — rad etildi:
-- brauzer tozalansa hammasi yoʻqoladi va tavsiya logi
-- (`recommendations`) hech qachon toʻlmaydi.
--
-- TOKEN XESHLANIB SAQLANADI.
--
-- Jadvalda tokenning oʻzi emas, `sha256` i turadi. Baza sizib
-- ketsa ham hech kimning sessiyasini oʻgʻirlab boʻlmaydi. Token
-- faqat bir marta — yaratilganda — qaytariladi va Next server uni
-- HttpOnly cookie ga qoʻyadi; brauzer JS i uni koʻrmaydi.

create extension if not exists pgcrypto with schema extensions;

create table if not exists selleros.user_session (
  token_hash   text primary key,
  user_id      uuid not null references selleros.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists user_session_user_idx
  on selleros.user_session (user_id);

comment on table selleros.user_session is
  'Anonim sessiya. Tokenning sha256 xeshi saqlanadi, tokenning ozi emas.';

/*
 * Yangi sessiya: foydalanuvchi + token.
 *
 * Token FAQAT shu yerda qaytariladi. Keyin uni tiklab bolmaydi —
 * bu ataylab: tiklanadigan token xeshlashning manosini yoqotadi.
 */
create or replace function public.so_sessiya_boshla()
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  yangi_id    uuid := gen_random_uuid();
  token       text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  insert into selleros.users (id) values (yangi_id);
  insert into selleros.user_session (token_hash, user_id)
  values (encode(extensions.digest(token, 'sha256'), 'hex'), yangi_id);

  return jsonb_build_object('token', token, 'userId', yangi_id);
end;
$$;

/*
 * Tokendan foydalanuvchini topadi.
 *
 * Topilmasa `null` qaytaradi — xato OTMAYDI. Sabab: eskirgan
 * cookie odatiy holat (baza tozalangan, sessiya oʻchirilgan) va u
 * xato emas. Chaqiruvchi yangi sessiya ochadi.
 */
create or replace function public.so_sessiya_user(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
begin
  if p_token is null or length(p_token) < 32 then
    return null;
  end if;

  update selleros.user_session
  set last_seen_at = now()
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  returning user_id into u;

  if u is null then return null; end if;
  return jsonb_build_object('userId', u);
end;
$$;

revoke all on selleros.user_session from public, anon, authenticated;
revoke all on function public.so_sessiya_boshla() from public, anon, authenticated;
revoke all on function public.so_sessiya_user(text) from public, anon, authenticated;
