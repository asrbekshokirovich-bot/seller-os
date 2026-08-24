-- 1-qadam javoblari — qolgan oltita savol.
--
-- `docs/1-QADAM-SAVOLLAR.md` 2026-08-24 da tasdiqlandi: 12 savolning
-- hammasi qoladi. Jadvalda ettitasi bor edi (`experience`,
-- `family_field`, `interest`, `budget_uzs`, `hours_per_week`, `city`),
-- oltitasi yo'q.
--
-- ENG MUHIM QAROR: hech biri `NOT NULL DEFAULT` olmaydi.
--
-- Ha/yo'q savollarini `boolean not null default false` qilish oson va
-- xato bo'lardi: javob bermagan odam "yo'q" degan odamga aylanadi.
-- Masalan 11-savol (sertifikat tajribasi) `false` bo'lsa, tizim unga
-- sertifikat kerak bo'lmagan turkumlarni tavsiya qiladi — holbuki u
-- tajribali bo'lishi va eng foydali yo'nalish aynan o'sha bo'lishi
-- mumkin. QOIDALAR.md 4-qoidasi shu haqda: `null` "bilmayman", `false`
-- esa "yo'q" degan JAVOB.
--
-- Shu sababli hammasi `null` bilan boshlanadi va `FORMULA.md` ning
-- "Ma'lumot yetishmasa" qoidasi ishlaydi: `null` qism vazndan
-- chiqariladi, nol deb sanalmaydi.

alter table selleros.user_profiles
  -- 5-savol: pul qancha vaqt bog'lanib qolishi mumkin.
  add column if not exists capital_lock text,
  -- 8-savol: ilgari onlayn sotganmi.
  add column if not exists online_experience text,
  -- 9-savol: Uzumda do'koni bormi. Token rejimini hal qiladi.
  add column if not exists has_uzum_shop boolean,
  -- 10-savol: Xitoydan tovar keltirganmi.
  add column if not exists imported_from_china boolean,
  -- 11-savol: sertifikat/markirovka bilan ishlaganmi.
  add column if not exists cert_experience boolean,
  -- 12-savol: nimadan ko'proq qo'rqadi.
  add column if not exists risk_preference text;

-- Qiymatlar ro'yxati kodda ham, bazada ham turadi. Ikkalasi ham kerak:
-- kod xato qiymatni yubormasligi uchun, baza esa kod chetlab o'tilsa
-- (qo'lda SQL, boshqa xizmat) ushlab qolishi uchun.
alter table selleros.user_profiles
  drop constraint if exists user_profiles_capital_lock_check,
  add constraint user_profiles_capital_lock_check
    check (capital_lock is null or capital_lock in ('3_oy', '6_oy', '1_yil', 'muddatsiz'));

alter table selleros.user_profiles
  drop constraint if exists user_profiles_online_experience_check,
  add constraint user_profiles_online_experience_check
    check (online_experience is null or online_experience in ('yoq', 'biroz', 'tajribali'));

alter table selleros.user_profiles
  drop constraint if exists user_profiles_risk_preference_check,
  add constraint user_profiles_risk_preference_check
    check (risk_preference is null or risk_preference in ('ehtiyotkor', 'tavakkal'));

-- Byudjet manfiy bo'lmaydi. NOL esa RUXSAT ETILADI va u `null` dan
-- boshqa narsani anglatadi: nol "hozircha pulim yo'q" degan haqiqiy
-- javob, `null` esa "aytmadi". Ikkalasiga ham javob boshqacha bo'ladi
-- — birinchisida pulsiz boshlash yo'llari, ikkinchisida savolni qayta
-- so'rash.
alter table selleros.user_profiles
  drop constraint if exists user_profiles_budget_check,
  add constraint user_profiles_budget_check
    check (budget_uzs is null or budget_uzs >= 0);

alter table selleros.user_profiles
  drop constraint if exists user_profiles_hours_check,
  add constraint user_profiles_hours_check
    check (hours_per_week is null or (hours_per_week >= 0 and hours_per_week <= 168));

comment on column selleros.user_profiles.budget_uzs is
  'So''m. `null` = aytmadi, 0 = puli yo''q. Bo''sh maydonni 0 ga aylantirish TAQIQLANADI.';
comment on column selleros.user_profiles.cert_experience is
  '`null` = aytmadi, `false` = ishlamagan. Standart qiymat yo''q — ataylab.';
