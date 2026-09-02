-- 0052: tovar → turkum xaritasi (monopoliya bayrogʻi uchun).
--
-- NEGA KERAK. 6-tuzoq (monopoliya) TURKUM darajasida hisoblanadi, lekin
-- `product_flags` TOVAR boʻyicha yoziladi. Ikkisini bogʻlash uchun
-- "qaysi tovar qaysi turkumda" degan xarita kerak, va u hozir hech
-- qayerdan kelmaydi: `so_tovar_holati` turkum id sini qaytarmaydi.
--
-- Natijada `product_flags` da `monopoly` turi BITTA ham yoʻq edi:
-- filtr ishlaydi, `/tuzoqlar` uchida koʻrinadi, lekin
-- `bayroqlarni-hisobla` faqat `tovarniTekshir` ni chaqiradi va
-- `turkumniTekshir` ga hech kim tegmaydi.
--
-- NEGA ALOHIDA UCH, NEGA `so_tovar_holati` GA USTUN QOʻSHILMADI.
-- Ikkinchisi ham ishlardi, lekin u 100 qatorli funksiyani qayta
-- yozishni talab qiladi. Aynan shunday qayta yozishlar `0009` ni
-- ikki marta bekor qilgan (`0050` izohiga qarang): tana eski
-- nusxadan koʻchiriladi va bir blok jimgina yoʻqoladi. Qoʻshimcha
-- uch esa mavjud hech narsaga tegmaydi.
--
-- NEGA SQL DA FILTR YOʻQ. Chegara (`top3SharePercent > 70`,
-- `MIN_SOTUVCHI = 8`, qamrov 50%) TypeScript da, `thresholds.ts` da.
-- Uni bu yerga koʻchirsak raqam ikki joyda yashardi va albatta
-- ajralib ketardi — repoda bunday holat allaqachon bor va uni
-- `supabase/test/kun-sharti.test.ts` ushlab turadi. Bu uch faqat
-- XARITA beradi, qaror TypeScript da qoladi (QOIDALAR.md, 3-qoida:
-- tavsiyani kod beradi).
--
-- Oʻlchandi 2026-09-02: 322 turkumdan 9 tasi monopol chegaradan
-- oʻtadi va ularda jami 67 ta kuzatuv tovari bor. Yaʼni bu bayroq
-- `product_flags` ga 67 qator qoʻshadi, minglab emas.

create or replace function public.so_turkum_tovarlari(
  p_platform text default 'uzum'
)
returns jsonb
language sql
stable
security definer
set search_path = selleros, public
as $$
  -- `productId` va `categoryId` ikkalasi ham TASHQI id: `so_tovar_holati`
  -- tovarni tashqi id bilan, `so_turkum_holati` turkumni tashqi id bilan
  -- beradi. Ichki id qaytarsak, chaqiruvchi ikkalasini bogʻlay olmasdi.
  select coalesce(jsonb_agg(jsonb_build_object(
           'productId',  p.external_id,
           'categoryId', c.external_id
         )), '[]'::jsonb)
  from selleros.product p
  join selleros.category c on c.id = p.category_id
  where p.platform = p_platform;
$$;

revoke all on function public.so_turkum_tovarlari(text) from public, anon, authenticated;
grant execute on function public.so_turkum_tovarlari(text) to service_role, anon, authenticated;

comment on function public.so_turkum_tovarlari(text) is
  'Tovar → turkum xaritasi, ikkala tomonda ham TASHQI id. Turkum '
  'darajasidagi bayroqni (6-tuzoq, monopoliya) tovarlarga tarqatish '
  'uchun: `product_flags` tovar boʻyicha yoziladi.';
