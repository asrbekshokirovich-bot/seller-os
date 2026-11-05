-- 0081 — AI tahlilchi jadvallarini avtomatik yangilash (pg_cron, 2026-11-05).
--
-- Har 10 daqiqada `zumsavdo.tahlil_yangila()` chaqiriladi. U manba oʻzgarmagan boʻlsa
-- hech narsa qilmaydi (bir necha kichik soʻrov); yangi `tovar_30kun` kuni (VPS, har kecha
-- 01:00 dan keyin), yangi toʻliq perepis oʻtishi yoki yangi daraxt kelsa — oʻsha jadvallarni
-- yangilaydi (jonli oʻlchov 05.11: formula 810 ming tovarga ~2 daqiqa, perepis birlashmasi
-- ~30 s). Yiqilsa — `cron.job_run_details` da koʻrinadi, AI esa javobida maʼlumot sanasini
-- aytadi (eskirgani yashirinmaydi).
--
-- `statement_timeout`: Supabase standart 2 daqiqa — yangilashga yetmaydi; shu buyruq uchun
-- 30 daqiqa (faqat shu ish, boshqa soʻrovlarga taʼsiri yoʻq).
--
-- pg_cron boʻlmagan muhitda (PGlite sinovi) fayl hech narsa qilmaydi.

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice '0081: pg_cron yoʻq — jadval qoʻyilmadi';
    return;
  end if;
  -- Supabase hujjatidagi tartib (pg_cron faqat pg_catalog ga oʻrnatiladi).
  create extension if not exists pg_cron with schema pg_catalog;
  grant usage on schema cron to postgres;
  grant all privileges on all tables in schema cron to postgres;

  if exists (select 1 from cron.job where jobname = 'zumsavdo-tahlil') then
    perform cron.unschedule('zumsavdo-tahlil');
  end if;
  perform cron.schedule(
    'zumsavdo-tahlil',
    '*/10 * * * *',
    $cmd$set statement_timeout = '30min'; select zumsavdo.tahlil_yangila();$cmd$
  );
end $$;
