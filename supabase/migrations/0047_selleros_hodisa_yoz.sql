-- Hodisa yozish — foydalanuvchi harakatlari bazaga yoziladi.
--
-- KPI `tavsiya_qabul` `events` jadvalidagi `tavsiya_tanlandi`
-- hodisalarini sanaydi (`so_kpi_xom`). Shu paytgacha bu hodisani
-- yozadigan JOY yoʻq edi — `events` jadval bor, lekin unga
-- yozadigan uchi yoʻq.

create or replace function public.so_hodisa_yoz(
  p_token text,
  p_nom   text,
  p_props jsonb default null
)
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

  -- Nom uzunligi cheklanadi: tashqi input, chegarasiz qoʻyib
  -- boʻlmaydi. Hodisat nomlari qisqa.
  if length(p_nom) > 100 then
    return jsonb_build_object('xato', 'hodisa nomi juda uzun');
  end if;

  insert into selleros.events (user_id, name, props)
  values (u, p_nom, p_props);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.so_hodisa_yoz(text, text, jsonb)
  from public, anon, authenticated;
