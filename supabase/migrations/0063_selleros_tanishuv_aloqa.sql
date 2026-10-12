-- 1-qadam (Tanishuv): ism-familiya va telefon — `selleros.users` ga.
--
-- NAZORATCHI QARORI (2026-10-12): har yangi suhbat avval mijozning ismi,
-- familiyasi va telefon raqamini soʻraydi (keyin savdo tajribasi va qancha
-- pul bilan boshlash). Javob suhbat holatida ham turadi, lekin «Boshidan
-- boshlash» holatni tozalaydi — bogʻlanish uchun u doimiy joyda boʻlsin:
-- `selleros.users.name` va `phone` (0004 dan bor, hozirgacha boʻsh edi).
--
-- Ssenariy telefonni bir xil shaklda yozadi (`+998901234567`, tanishuv.ts),
-- ismni — tekislangan holda ("Aziz Karimov"). Boʻsh matn — null.
--
-- `so_suhbat_yoz` jonli taʼrifi patchlanadi (0039/0050/0054/0056 usuli);
-- boʻlak topilmasa — xato, jimgina oʻtib ketmaydi. Kod bu migratsiyasiz ham
-- ishlaydi: notanish `p_profil` kalitlari eʼtiborsiz qoladi (faqat bazaga
-- yozilmaydi).

do $migratsiya$
declare
  eski text;
  yangi text;
  matn text;
begin
  select pg_get_functiondef(p.oid) into matn
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'so_suhbat_yoz';

  if position('p_profil ? ''fullName''' in matn) > 0 then
    raise notice 'so_suhbat_yoz: fullName allaqachon bor — oʻtkazildi';
    return;
  end if;

  eski := '    if p_profil ? ''hasUzumShop'' then';
  yangi := '    -- 1-qadam: ism-familiya va telefon (0063) — bogʻlanish uchun, selleros.users ga.
    if p_profil ? ''fullName'' then
      update selleros.users set name = nullif(trim(p_profil->>''fullName''), '''') where id = u;
    end if;
    if p_profil ? ''phone'' then
      update selleros.users set phone = nullif(trim(p_profil->>''phone''), '''') where id = u;
    end if;
    if p_profil ? ''hasUzumShop'' then';
  if position(eski in matn) = 0 then
    raise exception 'so_suhbat_yoz: almashtiriladigan bolak topilmadi';
  end if;
  execute replace(matn, eski, yangi);
end
$migratsiya$;

comment on column selleros.users.name is
  'Ism-familiya — suhbatning 1-savoli (0063, 2026-10-12). Bogʻlanish uchun; boshqa hech kimga berilmaydi.';
comment on column selleros.users.phone is
  'Telefon, +998901234567 shaklida — suhbatning 2-savoli (0063). Bogʻlanish uchun; boshqa hech kimga berilmaydi.';
