-- 0083 — «Ishlarim» (ikkinchi koʻrik K2, 2026-11-06).
--
-- Chat «Ochiq ishlar yozildi: YATT ochilishi; Uzum ombor qabuli (12.11.2026 gacha)» derdi, lekin bu
-- roʻyxatni keyin koʻradigan joy yoʻq edi — mijoz eslab qolishi kerak edi. Endi menyuda «Ishlarim»:
-- ochiq ishlar muddati bilan, bajarilganini belgilash mumkin; chat oʻzi bilgan ishni («Yuk keldi»,
-- «Ha, YATT ochdim») oʻzi yopadi.
--
-- YANGI JADVAL YOʻQ: ishlar `selleros.ochiq_ish` da (0056) — `holat` ('ochiq'/'yopiq') va `yopildi_at`
-- ustunlari shu uchun bor edi, faqat hech kim ularni oʻzgartirmasdi. Ikki funksiya, sessiya tokeni bilan —
-- har mijoz faqat oʻzinikini koʻradi va belgilaydi:
--   so_ochiq_ishlar(p_token)                       — roʻyxat: ochiqlari oldin (muddat boʻyicha, muddatsizi
--                                                    oxirida), keyin bajarilganlari (oxirgisi tepada); 50 ta;
--   so_ochiq_ish_holat(p_token, p_id, p_bajarildi) — bajarildi / qayta ochiq. Qayta «bajarildi» —
--                                                    birinchi yopilgan vaqti saqlanadi.
-- «tekshirish» turidagi ishlar («sayt boshqacha» belgisi) — jamoa uchun: roʻyxatga chiqmaydi, belgilanmaydi.
-- Faqat funksiyalar; jadval va maʼlumot oʻzgarmaydi. Qaytarish: ikkala funksiyani `drop function`.

create or replace function public.so_ochiq_ishlar(p_token text)
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
  return jsonb_build_object('ishlar', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', t.id, 'tur', t.tur, 'sabab', t.sabab, 'muddat', t.muddat, 'holat', t.holat,
             'yaratildi', t.created_at, 'yopildi', t.yopildi_at)
           order by t.n)
    from (
      select i.*, row_number() over (
               order by (i.holat = 'yopiq'),
                        case when i.holat = 'ochiq' then i.muddat end nulls last,
                        i.yopildi_at desc nulls last,
                        i.id desc) as n
        from selleros.ochiq_ish i
       where i.user_id = u and i.tur <> 'tekshirish'
    ) t
    where t.n <= 50
  ), '[]'::jsonb));
end;
$$;

create or replace function public.so_ochiq_ish_holat(p_token text, p_id bigint, p_bajarildi boolean)
returns jsonb
language plpgsql
security definer
set search_path = selleros, extensions, public
as $$
declare
  u uuid;
  n int;
begin
  select (public.so_sessiya_user(p_token)->>'userId')::uuid into u;
  if u is null then
    return jsonb_build_object('xato', 'sessiya topilmadi');
  end if;
  if p_id is null or p_bajarildi is null then
    return jsonb_build_object('xato', 'id va bajarildi kerak');
  end if;
  update selleros.ochiq_ish
     set holat = case when p_bajarildi then 'yopiq' else 'ochiq' end,
         yopildi_at = case when p_bajarildi then coalesce(yopildi_at, now()) else null end
   where id = p_id and user_id = u and tur <> 'tekshirish';
  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('xato', 'ish topilmadi');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.so_ochiq_ishlar(text) from public, anon, authenticated;
revoke all on function public.so_ochiq_ish_holat(text, bigint, boolean) from public, anon, authenticated;
grant execute on function public.so_ochiq_ishlar(text) to service_role;
grant execute on function public.so_ochiq_ish_holat(text, bigint, boolean) to service_role;
