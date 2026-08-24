-- Kirish talablari: huquqiy manbadan olingan roʻyxat.
--
-- Nega alohida jadval. `category_requirements` ichki
-- `selleros.category(id)` ga bogʻlangan, roʻyxat esa platforma turkum
-- id si boʻyicha keladi. Skreyper turkumni hali kashf qilmagan
-- boʻlishi mumkin — roʻyxat oʻshanda ham yoʻqolmasligi kerak. Shuning
-- uchun manba alohida saqlanadi va turkum paydo boʻlgan sari
-- koʻchiriladi.
--
-- MOSLASHTIRISH QOʻLDA QILINGAN — ataylab.
--
-- Avtomatik nom moslashtirish sinab koʻrildi va u xavfli chiqdi.
-- "Konditsioner" naqshi soch balzamini va kir yumshatgichni ushladi;
-- "kir yuvish" kir yuvish kukunini; "plita" qurilish plitasini;
-- "pech" bolalar pechenyesini. Bitta soʻrovda 9 ta moslikdan 5 tasi
-- yolgʻon edi. Uzum turkum daraxtida `parent_id` toʻldirilmagan,
-- yaʼni ota-turkum bilan ham ajratib boʻlmaydi.
--
-- `false` HECH QAYERGA YOZILMAYDI. Xatoning narxi simmetrik emas:
--   notoʻgʻri "kerak emas" → odam sota olmaydigan tovarga butun
--                            partiya pulini tikadi
--   notoʻgʻri "kerak"      → odam bir marta ortiqcha tekshiradi
-- Shuning uchun ishonch komil boʻlmagan turkum umuman yozilmaydi va
-- filtr uni `baholanmadi` deb qaytaradi.
--
-- Sertifikat talablari uchun manba topilmadi — hammasi `null`.

create table if not exists selleros.marking_reference (
  platform text not null default 'uzum' references selleros.platform(code),
  category_external_id bigint not null,
  category_name text,
  marking_required boolean,
  certificate_required boolean,
  source text not null,
  checked_at date not null,
  note text,
  primary key (platform, category_external_id)
);

comment on table selleros.marking_reference is
  'Huquqiy manbadan olingan kirish talablari, platforma turkum id si boʻyicha.';

create or replace function selleros.kirish_talablarini_kochirish()
returns jsonb
language plpgsql
security definer
set search_path = selleros, public
as $$
declare n int;
begin
  with kochdi as (
    insert into selleros.category_requirements
      (category_id, marking_required, certificate_required, source, checked_at)
    select c.id, m.marking_required, m.certificate_required, m.source, m.checked_at
    from selleros.marking_reference m
    join selleros.category c
      on c.platform = m.platform and c.external_id = m.category_external_id
    on conflict (category_id) do update
      set marking_required = excluded.marking_required,
          certificate_required = excluded.certificate_required,
          source = excluded.source,
          checked_at = excluded.checked_at,
          updated_at = now()
    returning 1
  )
  select count(*) into n from kochdi;

  return jsonb_build_object(
    'kochirildi', n,
    'manbada', (select count(*) from selleros.marking_reference),
    'hali_kashf_etilmagan', (
      select count(*) from selleros.marking_reference m
      where not exists (
        select 1 from selleros.category c
        where c.platform = m.platform and c.external_id = m.category_external_id)
    )
  );
end $$;

revoke all on function selleros.kirish_talablarini_kochirish() from public, anon, authenticated;

-- Manba: Vazirlar Mahkamasining 2022-04-02 dagi 148-sonli qarori,
-- maishiy texnika mahsulotlarini majburiy raqamli markirovkalash
-- (lex.uz/docs/-5936141). Guruhlar va sanalar:
--   1-guruh 2022-04-15: changyutgich 8508, kir yuvish mashinasi 8450,
--                       muzlatgich 8418, televizor/monitor 8528
--   2-guruh 2022-08-01: gaz plitasi, soʻrgich, duxovka, mikrotoʻlqinli
--                       pech, dazmol, suv isitgich
--   3-guruh 2022-11-01: suv isitish qozonlari, konditsionerlar, ichiga
--                       elektr dvigatel oʻrnatilgan asboblar (blender,
--                       mikser, goʻsht maydalagich, qahva tegirmoni,
--                       sharbat siqgich), barcha turdagi lampalar
insert into selleros.marking_reference
  (category_external_id, category_name, marking_required, certificate_required, source, checked_at, note)
values
  (12894, 'Changyutgichlar',                 true, null, 'VMQ 148, 02.04.2022 (lex.uz/docs/-5936141), 1-guruh', '2026-08-24', 'TIF TN 8508'),
  (15,    'Kir yuvish mashinalari',          true, null, 'VMQ 148, 02.04.2022 (lex.uz/docs/-5936141), 1-guruh', '2026-08-24', 'TIF TN 8450'),
  (15296, 'Avtomatik kir yuvish mashinalari',true, null, 'VMQ 148, 02.04.2022 (lex.uz/docs/-5936141), 1-guruh', '2026-08-24', 'TIF TN 8450'),
  (83,    'Muzlatgichlar',                   true, null, 'VMQ 148, 02.04.2022 (lex.uz/docs/-5936141), 1-guruh', '2026-08-24', 'TIF TN 8418'),
  (12601, 'Televizorlar',                    true, null, 'VMQ 148, 02.04.2022 (lex.uz/docs/-5936141), 1-guruh', '2026-08-24', 'TIF TN 8528'),
  (15519, 'Ichki joylashadigan televizorlar',true, null, 'VMQ 148, 02.04.2022 (lex.uz/docs/-5936141), 1-guruh', '2026-08-24', 'TIF TN 8528'),
  (13,    'Gaz pechkalar',                   true, null, 'VMQ 148, 02.04.2022 (lex.uz/docs/-5936141), 2-guruh', '2026-08-24', null),
  (13265, 'Mikrotoʻlqinli pechlar',          true, null, 'VMQ 148, 02.04.2022 (lex.uz/docs/-5936141), 2-guruh', '2026-08-24', null),
  (12236, 'Dazmollar',                       true, null, 'VMQ 148, 02.04.2022 (lex.uz/docs/-5936141), 2-guruh', '2026-08-24', null),
  (13401, 'Koʻchma konditsionerlar',         true, null, 'VMQ 148, 02.04.2022 (lex.uz/docs/-5936141), 3-guruh', '2026-08-24', null),
  (14725, 'Deraza konditsionerlari',         true, null, 'VMQ 148, 02.04.2022 (lex.uz/docs/-5936141), 3-guruh', '2026-08-24', null),
  (16202, 'Daldirma blenderlar',             true, null, 'VMQ 148, 02.04.2022 (lex.uz/docs/-5936141), 3-guruh', '2026-08-24', null),
  (11801, 'Mikserlar',                       true, null, 'VMQ 148, 02.04.2022 (lex.uz/docs/-5936141), 3-guruh', '2026-08-24', null)
on conflict (platform, category_external_id) do update
  set marking_required = excluded.marking_required,
      source = excluded.source,
      checked_at = excluded.checked_at,
      note = excluded.note;

select selleros.kirish_talablarini_kochirish();
