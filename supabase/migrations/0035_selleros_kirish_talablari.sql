-- 5-tuzoq (sertifikat/markirovka) uchlarga ulanadi.
--
-- MUAMMO. `sertifikat()` filtri yozilgan, sinalgan va hujjatlangan
-- edi, lekin ishlab chiqarish kodi uni HECH QACHON chaqirmasdi.
-- Sabab bor edi: `category_requirements` boʻsh boʻlgani uchun u
-- har tovarda "baholanmadi" deb qaytarardi va faqat shovqin
-- qoʻshardi.
--
-- 2026-08-26 da sabab yoʻqoldi. VM qarori 502-son (14.08.2024),
-- 4-ilova — "Majburiy tartibda muvofiqligi baholanishi lozim
-- boʻlgan mahsulotlar roʻyxati" topildi va undan 12 ta Uzum
-- turkumi toʻldirildi.
--
-- Shu sababli ikkala RPC endi 5-tuzoq kirishini ham qaytaradi.
-- `source` ALOHIDA beriladi: manbasiz qatorga filtr tayanmaydi,
-- chunki huquqiy talab oʻzgaradi va qayerdan olingani bilinmasa
-- uni qayta tekshirib boʻlmaydi.
--
-- Funksiyalar jonli bazada `pg_get_functiondef` + `replace` bilan
-- yangilandi — matnni qoʻlda koʻchirmasdan. 0023 da bir marta
-- qoʻlda koʻchirib, kunlik yozuv mantigʻini bilmasdan buzgan edim.
--
-- Qoʻshilgan maydonlar (ikkala funksiyada ham):
--   markingRequired, certificateRequired,
--   entryCostUzs, entryWeeks, talabManbasi
--
-- Aynan shu oʻzgarish `so_tovar_holati` va `so_tovar_royxati` ga
-- qoʻllangan; toʻliq matn uchun `pg_get_functiondef` ga qarang.

do $$
declare src text; nom text;
begin
  foreach nom in array array['so_tovar_holati', 'so_tovar_royxati'] loop
    select pg_get_functiondef(p.oid) into src
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = nom;

    if src like '%certificateRequired%' then
      raise notice '% allaqachon yangilangan', nom;
    else
      raise exception '% da 5-tuzoq maydonlari yoʻq — qoʻlda tekshiring', nom;
    end if;
  end loop;
end $$;
