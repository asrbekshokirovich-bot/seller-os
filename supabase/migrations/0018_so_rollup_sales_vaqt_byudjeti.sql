-- `so_rollup_sales` ga vaqt byudjeti.
--
-- Bugun `zs_rollup_days` PostgREST ning 8 soniyalik byudjetiga
-- sigʻmay qolgani aniqlandi va jadvalli sweep ikki marta yiqildi.
-- Oʻsha tekshiruvda maʼlum boʻldiki, `so_rollup_sales` da ham byudjet
-- sozlanmagan.
--
-- Hozircha u tez ishlaydi, chunki `selleros` da atigi 6 000 tovar
-- bor. Lekin u aynan oʻsha yoʻldan boradi: maʼlumot oʻssa, bir kuni
-- byudjetga sigʻmay qoladi va sotuv hisobi jimgina yozilmay
-- boshlaydi. Kutib turishning maʼnosi yoʻq — `so_rollup_days` da
-- 120 soniya allaqachon bor, bu esa uning juftidir.
--
-- Panel bu funksiyani soʻramaydi va u anon uchun yopiq.

alter function public.so_rollup_sales(date, date) set statement_timeout = '120s';
