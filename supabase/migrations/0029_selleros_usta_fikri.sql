-- Sotuvchi fikri — B2 darvozasining dalili.
--
-- Reja B2 darvozasi: "begona 3 sotuvchi Ustadan MUSTAQIL oʻtib
-- tovar roʻyxatiga yetadi va «mantiqli» deydi".
--
-- Shu paytgacha buni yozib oladigan joy YOʻQ edi. Sotuvchi
-- "miqdor mantiqsiz" desa, bu gap yoʻqolardi: nazoratchi yonida
-- oʻtirib qogʻozga yozishi kerak boʻlardi. Uch odam uchun bu bir
-- kunlik ish.
--
-- Endi fikr oqimning ichida soʻraladi va bazaga tushadi. Yaʼni
-- darvoza dalili — "3 tadan 3 tasi «mantiqli» dedi" — soʻrov
-- bilan olinadi, xotiradan emas.
--
-- `events` jadvaliga yoziladi, yangi jadval yasalmaydi: reja uni
-- aynan shu uchun belgilagan ("mahsulot ichidagi harakatlar").
--
-- FIKR OʻZGARTIRILISHI MUMKIN. Tavsiya jurnalidan farqi shu:
-- jurnal javobgarlik uchun (oʻzgarmas), fikr esa oʻrganish uchun.
-- Odam fikrini qaytarib olsa — bu haqiqiy holat, uni toʻsish
-- notoʻgʻri boʻlardi.

create index if not exists events_name_idx
  on selleros.events (name, created_at desc);

/*
 * Usta haqidagi fikrni yozadi.
 *
 * `p_mantiqli` uch holatli: `true`, `false` va `null`.
 * `null` — "javob bermadi", va u FIKR EMAS. Shuning uchun u
 * darvoza hisobiga kirmaydi.
 */
create or replace function public.so_fikr_yoz(
  p_token    text,
  p_mantiqli boolean,
  p_matn     text,
  p_qadam    smallint,
  p_turkum   bigint
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

  -- Matn cheklanadi: bu maydon foydalanuvchidan keladi va
  -- chegarasiz matn bazani shishirishi mumkin.
  insert into selleros.events (user_id, name, props)
  values (u, 'usta_fikri', jsonb_build_object(
    'mantiqli', p_mantiqli,
    'matn', nullif(left(coalesce(p_matn, ''), 2000), ''),
    'qadam', p_qadam,
    'turkum', p_turkum
  ));

  return jsonb_build_object('userId', u, 'saqlandi', true);
end;
$$;

revoke all on function public.so_fikr_yoz(text, boolean, text, smallint, bigint)
  from public, anon, authenticated;

/*
 * B2 darvozasi hisobi.
 *
 * "Nechta boshqa-boshqa odam «mantiqli» dedi" degan savolga
 * javob. Bir odam ikki marta aytsa BIR marta sanaladi —
 * darvoza uch KISHI talab qiladi, uch bosishni emas.
 */
create or replace function public.so_darvoza_b2()
returns jsonb
language sql
security definer
set search_path = selleros, public
as $$
  with fikr as (
    select distinct on (user_id)
           user_id, (props->>'mantiqli')::boolean as mantiqli,
           props->>'matn' as matn, created_at
    from selleros.events
    where name = 'usta_fikri' and props->>'mantiqli' is not null
    order by user_id, created_at desc
  )
  select jsonb_build_object(
    'javob_bergan', (select count(*) from fikr),
    'mantiqli',     (select count(*) from fikr where mantiqli),
    'mantiqsiz',    (select count(*) from fikr where not mantiqli),
    'kerak',        3,
    'ochiq',        (select count(*) from fikr where mantiqli) >= 3,
    -- Salbiy fikrlar matni bilan: darvoza yopiq boʻlsa NEGA
    -- yopiqligi koʻrinib tursin.
    'izohlar', coalesce((
      select jsonb_agg(jsonb_build_object('mantiqli', mantiqli, 'matn', matn)
             order by created_at desc)
      from fikr where matn is not null
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.so_darvoza_b2() from public, anon, authenticated;
