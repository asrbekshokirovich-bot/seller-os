-- 0071 — kengaytma: Uzumdagi istalgan tovarning 30 kunlik qatorini oʻqish (2026-10-21).
--
-- Nazoratchi qarori («Sotuvchi koʻzoynagi»): kengaytma Uzum roʻyxatida har tovar
-- tagida sotuvni (A, bepul), tovar sahifasida pasportni (C) va taqqoslash
-- jadvalini (D) koʻrsatadi. Qatorlarni VPS kuniga bir marta yozadi —
-- `zumsavdo.tovar_30kun` (zumsavdo ombori, migratsiya 20261021113923).
-- Sotuvni bu funksiya HISOBLAMAYDI: formula — `packages/shared/src/tovar-sotuvi.ts`
-- (FORMULA.md «Tovar sotuvi»); bu yerda qator va unga kerakli qoʻshimchalar:
--   komissiya_foizi — `selleros.uzum_komissiya` (turkum boʻyicha, FBO);
--   kategoriya_nomi — `zumsavdo.category`;
--   nom_perepis     — harakatsiz tovarda VPS nom yozmaydi; perepisdagi nom.
--
-- Faqat service_role (Edge Function). anon kaliti kengaytmada ochiq turadi —
-- unga bazani toʻgʻridan-toʻgʻri soʻrash huquqi berilmaydi.
-- Bir chaqiruvda 200 tagacha id (Uzum sahifasida 48–100 kartochka).

create or replace function public.so_tovar_30kun(p_ids bigint[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
           to_jsonb(t) || jsonb_build_object(
             'komissiya_foizi', k.komissiya_foizi,
             'kategoriya_nomi', c.name,
             'nom_perepis', case when t.nom is null then p.title end)
           order by array_position(p_ids, t.product_id)), '[]'::jsonb)
  from zumsavdo.tovar_30kun t
  left join selleros.uzum_komissiya k on k.platform = 'uzum' and k.category_external_id = t.kategoriya
  left join zumsavdo.category c on c.id = t.kategoriya
  left join zumsavdo.product p on p.id = t.product_id and t.nom is null
  where t.product_id = any (p_ids[1:200]);
$$;

-- Oxirgi yozuv: sana, nechta qator, qachon. Yozuv toʻxtasa (VPS, timer) — /health
-- da koʻrinadi; aks holda kengaytma eski raqamni jimgina koʻrsataverardi
-- (QOIDALAR.md, 8-boʻlim).
create or replace function public.so_tovar_30kun_holati()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object('sana', j.sana, 'jami', j.jami, 'yozildi', j.yozildi,
                               'ochirildi', j.ochirildi, 'tugadi', j.tugadi)
       from zumsavdo.xulosa_jurnal j order by j.id desc limit 1),
    jsonb_build_object('sana', null));
$$;

revoke all on function public.so_tovar_30kun(bigint[]) from public, anon, authenticated;
revoke all on function public.so_tovar_30kun_holati() from public, anon, authenticated;
grant execute on function public.so_tovar_30kun(bigint[]) to service_role;
grant execute on function public.so_tovar_30kun_holati() to service_role;
