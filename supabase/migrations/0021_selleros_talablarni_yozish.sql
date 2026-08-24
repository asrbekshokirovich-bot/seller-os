-- `category_requirements` ni CSV dan yozish.
--
-- NEGA. `supabase/seed/category_requirements.csv` yozilgan va
-- ustunlari hujjatlashtirilgan, lekin uni bazaga OLIB KIRADIGAN yoʻl
-- yoʻq edi. Yaʼni odam bilimi uchun eshik qurilmagan — shu sababdan
-- `optimal_entry_uzs` va `seasonality` da bugun nol qator, `kirish`
-- va `mavsum` ballari esa doim `null`.
--
-- BOʻSH KATAK `null` BOʻLIB QOLADI.
--
-- `coalesce(excluded.x, eski.x)` ATAYLAB ishlatilmaydi. U "CSV da
-- boʻsh boʻlsa eskisini saqla" degan boʻlardi, lekin bu boshqa
-- xatoni tugʻdiradi: nazoratchi notoʻgʻri qiymatni oʻchirib
-- yubormoqchi boʻlsa, uni oʻchira olmaydi. CSV — HAQIQAT MANBAI;
-- unda boʻsh boʻlsa bazada ham boʻsh.
--
-- Bundan tashqari `null` "bilmaymiz" degani va uni "bilardik,
-- endi unutdik" bilan aralashtirish kerak emas.
--
-- `source` CSV DAN keladi, bu yerda yozilmaydi. Bazada allaqachon
-- huquqiy havolali qatorlar bor ("VMQ 148, 02.04.2022, 1-guruh").
-- Agar bu yerda `'seed-csv'` deb qattiq yozilsa, "markirovka kerak"
-- degan daʼvo qolardi, uning DALILI esa yoʻqolardi. Manba
-- maʼlumotning bir qismi, yuklash usulining emas.
create or replace function public.so_talablarni_yoz(p_qatorlar jsonb)
returns jsonb
language plpgsql
security definer
set search_path = selleros, public
set statement_timeout = '60s'
as $$
declare
  yozildi   integer := 0;
  topilmadi bigint[];
begin
  -- Notanish turkum JIMGINA tashlanmaydi.
  --
  -- Ilgari bunday qator `insert ... select ... join` da yoʻqolib
  -- ketardi va natija "yozildi: 12" deb koʻrinardi — nazoratchi
  -- esa 15 ta qator yozgan boʻlardi. Uchtasi qayerga ketgani
  -- hech qayerda aytilmasdi (QOIDALAR.md §8).
  select array_agg(x.cid) into topilmadi
  from (
    select (q->>'category_external_id')::bigint as cid
    from jsonb_array_elements(p_qatorlar) q
  ) x
  where not exists (
    select 1 from selleros.category c
    where c.platform = 'uzum' and c.external_id = x.cid
  );

  if topilmadi is not null and array_length(topilmadi, 1) > 0 then
    raise exception
      'Bu turkumlar `selleros.category` da yoʻq: %. Skreyper ularni hali koʻrmagan boʻlishi mumkin.',
      topilmadi;
  end if;

  insert into selleros.category_requirements as cr (
    category_id, marking_required, certificate_required,
    entry_cost_uzs, entry_weeks, optimal_entry_uzs, seasonality,
    source, checked_at, updated_at, note
  )
  select
    c.id,
    (q->>'marking_required')::boolean,
    (q->>'certificate_required')::boolean,
    (q->>'entry_cost_uzs')::bigint,
    (q->>'entry_weeks')::int,
    (q->>'optimal_entry_uzs')::bigint,
    case when q->'seasonality' = 'null'::jsonb then null
         else (select array_agg(v::numeric)
               from jsonb_array_elements_text(q->'seasonality') v)
    end,
    coalesce(nullif(q->>'source', ''), 'seed-csv'),
    current_date,
    now(),
    nullif(q->>'note', '')
  from jsonb_array_elements(p_qatorlar) q
  join selleros.category c
    on c.platform = 'uzum'
   and c.external_id = (q->>'category_external_id')::bigint
  on conflict (category_id) do update
     set marking_required     = excluded.marking_required,
         certificate_required = excluded.certificate_required,
         entry_cost_uzs       = excluded.entry_cost_uzs,
         entry_weeks          = excluded.entry_weeks,
         optimal_entry_uzs    = excluded.optimal_entry_uzs,
         seasonality          = excluded.seasonality,
         source               = excluded.source,
         note                 = excluded.note,
         checked_at           = excluded.checked_at,
         updated_at           = now();

  get diagnostics yozildi = row_count;

  return jsonb_build_object(
    'berildi', jsonb_array_length(p_qatorlar),
    'yozildi', yozildi
  );
end;
$$;

-- Faqat seed skripti chaqiradi, brauzer emas.
revoke all on function public.so_talablarni_yoz(jsonb) from public, anon, authenticated;
