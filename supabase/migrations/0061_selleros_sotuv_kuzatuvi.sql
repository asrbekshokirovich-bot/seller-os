-- 11-qadam (Sotuv boshlandi): sotuvchining OʻZ Uzum kartochkasini kuzatuvga
-- qoʻshish va kunlik tarixini oʻqish.
--
-- NEGA. Skreyper (`--kuzatuv --stok`, kuniga 3 marta: 09:00, 17:00, 01:00
-- Toshkent — .github/workflows/skreyper.yml) faqat `selleros.tracked_product`
-- dagi faol tovarlarni oʻlchaydi (`so_select_tracked`, 0014). Sotuvchining
-- yangi kartochkasi u yerda yoʻq — bitta qator qoʻshilsa keyingi aylanishda
-- oʻlchanadi, `so_ingest_batch` product qatorini oʻzi yaratadi,
-- `so_rollup_sales` sotuvni zaxira kamayishidan hisoblaydi (0038).
--
-- `category_external_id` BOʻSH qoldiriladi: 2-qadam yoʻnalish nomzodlari
-- faqat turkumi bor kuzatuvdan yasaladi (0019/0020) — sotuvchi qoʻshgan
-- tovar ularni oʻzgartirmaydi.
--
-- SUISTEʼMOL. Qoʻshish faqat haqiqiy sessiya bilan (`so_sessiya_user`);
-- bitta sessiya jami 20 tagacha tovar qoʻsha oladi (`selleros.sotuvchi_tovar`),
-- bitta chaqiruvda ham 20 tagacha.

create table if not exists selleros.sotuvchi_tovar (
  user_id     uuid not null references selleros.users(id) on delete cascade,
  external_id bigint not null,
  added_at    timestamptz not null default now(),
  primary key (user_id, external_id)
);

comment on table selleros.sotuvchi_tovar is
  'Sotuvchi 11-qadamda bergan oʻz Uzum kartochkalari. Kuzatuvga qoʻshish sababi va har sessiya chegarasi uchun.';

create or replace function public.so_sotuv_kuzat(p_token text, p_external_ids bigint[])
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
  v_ids bigint[];
  v_jami integer;
  v_yangi integer := 0;
  v_bor integer := 0;
  x bigint;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;

  select array_agg(distinct i) into v_ids
  from unnest(coalesce(p_external_ids, '{}'::bigint[])) as i
  where i > 0 and i < 100000000000;
  if v_ids is null then
    return jsonb_build_object('qoshildi', 0, 'bor', 0);
  end if;
  if array_length(v_ids, 1) > 20 then
    return jsonb_build_object('xato', 'bir marta 20 tagacha tovar');
  end if;

  select count(*) into v_jami from selleros.sotuvchi_tovar
  where user_id = u and external_id <> all (v_ids);
  if v_jami + array_length(v_ids, 1) > 20 then
    return jsonb_build_object('xato', 'bitta sessiya 20 tagacha tovar kuzata oladi');
  end if;

  foreach x in array v_ids loop
    insert into selleros.sotuvchi_tovar (user_id, external_id) values (u, x)
    on conflict do nothing;
    if exists (select 1 from selleros.tracked_product where external_id = x) then
      update selleros.tracked_product set active = true where external_id = x and not active;
      v_bor := v_bor + 1;
    else
      insert into selleros.tracked_product (external_id, platform) values (x, 'uzum');
      v_yangi := v_yangi + 1;
    end if;
  end loop;

  return jsonb_build_object('qoshildi', v_yangi, 'bor', v_bor);
end;
$$;

-- Bir nechta tovarning kunlik tarixi: narx, zaxira, sharhlar soni, reyting
-- (`product_daily`) va zaxira kamayishidan hisoblangan sotuv
-- (`sales_estimates`). Tovar hali oʻlchanmagan boʻlsa `topildi:false` —
-- bu "sotuv yoʻq" EMAS, "oʻlchov yoʻq".
create or replace function public.so_sotuv_holati(p_external_ids bigint[], p_kun integer default 45)
returns jsonb
language sql
stable
security definer
set search_path = selleros, public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'externalId', i.eid,
    'kuzatuvda', exists (select 1 from selleros.tracked_product t where t.external_id = i.eid and t.active),
    'topildi', p.id is not null,
    'title', p.title,
    'kunlar', coalesce((
      select jsonb_agg(jsonb_build_object(
        'sana', d.date, 'narx', d.price, 'zaxira', d.stock, 'sharh', d.reviews, 'reyting', d.rating,
        'sotildi', s.sold_units, 'daromad', s.revenue_uzs
      ) order by d.date)
      from selleros.product_daily d
      left join selleros.sales_estimates s on s.product_id = d.product_id and s.date = d.date
      where d.product_id = p.id
        and d.date >= current_date - greatest(1, least(coalesce(p_kun, 45), 120))
    ), '[]'::jsonb)
  ) order by i.eid), '[]'::jsonb)
  from (
    select distinct x as eid
    from unnest(coalesce(p_external_ids, '{}'::bigint[])) as x
    where x > 0
    limit 40
  ) i
  left join selleros.product p on p.platform = 'uzum' and p.external_id = i.eid;
$$;

revoke all on selleros.sotuvchi_tovar from public, anon, authenticated;
revoke all on function public.so_sotuv_kuzat(text, bigint[]) from public, anon, authenticated;
revoke all on function public.so_sotuv_holati(bigint[], integer) from public, anon, authenticated;
grant execute on function public.so_sotuv_kuzat(text, bigint[]) to service_role;
grant execute on function public.so_sotuv_holati(bigint[], integer) to service_role;
