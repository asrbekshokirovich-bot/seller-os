-- Sifat paneli — ADMIN maʼlumoti, ochiq emas.
--
-- `so_quality` anon uchun ochiq qolgan edi. U faqat oʻqiydi, yozmaydi —
-- shuning uchun zarar kichik. Lekin reja uni "Admin sifat paneli" deb
-- ataydi va u yigʻuvchining ichki holatini koʻrsatadi: qamrov %, xato %,
-- oxirgi yangilanish, toʻxtash sababi.
--
-- Bu raqamlar raqobatchiga yigʻuvchi qachon va qanday ishlashini aytadi.
-- Bozor maʼlumoti emas, lekin ochiq turishi ham shart emas.
--
-- Backend va Edge Function uni `service_role` bilan chaqiradi — bu
-- oʻzgarish hech narsani buzmaydi.
revoke all on function public.so_quality(text) from public, anon, authenticated;
grant execute on function public.so_quality(text) to service_role;
