-- Tavsiya jurnali — javobgarlik va oʻrganish.
--
-- Reja, 5-boʻlim: "`recommendations` — har tavsiya logi: kimga,
-- nima, qaysi ball/filtr bilan (javobgarlik + oʻrganish)".
--
-- Jadval bor edi, 0 qator. Yaʼni tizim odamga "shu yoʻnalishni
-- oling" deb aytardi va bu haqda hech qanday yozuv qolmasdi.
--
-- NEGA MAJBURIY. "Shu odamga nega aynan shu yoʻnalish
-- koʻrsatilgan?" degan savolga bir oydan keyin ham javob boʻlishi
-- kerak. Ball formulasi oʻzgaradi, chegaralar oʻzgaradi — oʻsha
-- kungi QAROR esa oʻzgarmasligi kerak. Shuning uchun ball, qism
-- taqsimoti, bayroqlar va formula versiyasi birga saqlanadi.
--
-- JURNAL TAHRIRLANMAYDI.
--
-- `update` va `delete` trigger bilan taqiqlangan. Oʻzgartirilishi
-- mumkin boʻlgan jurnal javobgarlik uchun yaroqsiz: xato tavsiya
-- berilgach uni "toʻgʻrilash" imkoni boʻlsa, jurnalning maʼnosi
-- qolmaydi.
--
-- Tekshirildi: `update ... set score = 99` xato bilan toʻxtadi,
-- ball 77.28 boʻlib qoldi.

create or replace function selleros.tavsiya_ozgarmas()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'recommendations faqat QOSHILADI. Tahrirlash va ochirish taqiqlangan: '
    'ozgartirilishi mumkin bolgan jurnal javobgarlik uchun yaroqsiz.';
end;
$$;

drop trigger if exists tavsiya_ozgarmas_trig on selleros.recommendations;
create trigger tavsiya_ozgarmas_trig
  before update or delete on selleros.recommendations
  for each row execute function selleros.tavsiya_ozgarmas();

create index if not exists recommendations_user_idx
  on selleros.recommendations (user_id, created_at desc);

-- Tavsiyani yozadi. Sessiya tokeni orqali kim ekanini aniqlaydi.
create or replace function public.so_tavsiya_yoz(
  p_token      text,
  p_step       smallint,
  p_tavsiyalar jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
  n int := 0;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  if p_tavsiyalar is null or jsonb_array_length(p_tavsiyalar) = 0 then
    return jsonb_build_object('userId', u, 'yozildi', 0);
  end if;

  insert into selleros.recommendations
    (user_id, step, product_id, category_id, score, score_breakdown, flags, formula_version)
  select
    u,
    p_step,
    p.id,
    c.id,
    nullif(t->>'score', '')::numeric,
    t->'breakdown',
    t->'flags',
    coalesce(t->>'formulaVersion', 'nomalum')
  from jsonb_array_elements(p_tavsiyalar) t
  left join selleros.product p
    on p.platform = 'uzum' and p.external_id = nullif(t->>'productId','')::bigint
  left join selleros.category c
    on c.platform = 'uzum' and c.external_id = nullif(t->>'categoryId','')::bigint;

  get diagnostics n = row_count;
  return jsonb_build_object('userId', u, 'yozildi', n);
end;
$$;

revoke all on function public.so_tavsiya_yoz(text, smallint, jsonb) from public, anon, authenticated;
