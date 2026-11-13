-- 0086: zs_*_nomzodlari funksiyalari faqat service_role uchun (2026-11-13).
--
-- 0044 va 0049 bu oltita SECURITY DEFINER funksiyaga faqat service_role ga
-- GRANT bergan, lekin Postgres yangi funksiyaga PUBLIC EXECUTE ni o'zi beradi
-- va u olib tashlanmagan. Natija: sayt anon kaliti bilan har kim
-- /rest/v1/rpc/zs_*_nomzodlari ni chaqirib, ichki ma'lumotni (narx, sotuv
-- bahosi) o'qiy olardi. Jonli bazada o'lchandi (2026-11-13):
-- proacl = {=X/postgres, postgres=X/postgres, service_role=X/postgres},
-- has_function_privilege('anon', ..., 'execute') = true.
--
-- zs_tuzoq_nomzodlari va zs_monopoliya_nomzodlari allaqachon shunday yopiq.
-- Sayt, Edge, kengaytma va skreyper kodida ularni anon bilan chaqiradigan
-- joy yo'q (fikstura generatori service_role bilan ishlaydi).
-- Topilgan joyi: zumsavdo docs/HANDOFF.md, 2026-10-21.

revoke all on function public.zs_demping_nomzodlari()    from public, anon, authenticated;
revoke all on function public.zs_hype_nomzodlari()       from public, anon, authenticated;
revoke all on function public.zs_mavsumiy_nomzodlari()   from public, anon, authenticated;
revoke all on function public.zs_nakrutka_nomzodlari()   from public, anon, authenticated;
revoke all on function public.zs_ogir_nomzodlari()       from public, anon, authenticated;
revoke all on function public.zs_sertifikat_nomzodlari() from public, anon, authenticated;

grant execute on function public.zs_demping_nomzodlari()    to service_role;
grant execute on function public.zs_hype_nomzodlari()       to service_role;
grant execute on function public.zs_mavsumiy_nomzodlari()   to service_role;
grant execute on function public.zs_nakrutka_nomzodlari()   to service_role;
grant execute on function public.zs_ogir_nomzodlari()       to service_role;
grant execute on function public.zs_sertifikat_nomzodlari() to service_role;
