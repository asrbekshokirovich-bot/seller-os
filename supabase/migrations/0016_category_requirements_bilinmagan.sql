-- Kirish talablari: "bilinmaydi" ni "kerak emas" dan ajratamiz.
--
-- Nuqson. `marking_required` va `certificate_required` `boolean NOT
-- NULL` edi. Jadval boʻsh (0 qator), yaʼni HAR turkum uchun javob
-- "kerak emas" boʻlib chiqardi. Bu xatoning yoʻnalishi bir tomonlama
-- ogʻir: odam sertifikat talab qiladigan turkumga pul tikadi, tovarni
-- keltiradi va sota olmaydi. Teskarisi (bekorga ogohlantirish) atigi
-- bitta ortiqcha tekshiruvga olib boradi.
--
-- QOIDALAR.md 4-qoidasi: `null` — "bilmayman", `false` — "kerak emas"
-- degan JAVOB. Bu yerda ularni aralashtirish qimmat turadi.
--
-- Huquqiy maʼlumot vaqt oʻtishi bilan oʻzgaradi, shuning uchun
-- manba va tekshirilgan sana ham saqlanadi. Manbasiz qator —
-- ishonchsiz qator.

alter table selleros.category_requirements
  alter column marking_required drop not null,
  alter column certificate_required drop not null;

-- Standart qiymat ham olib tashlanadi: yangi qator "bilinmaydi" dan
-- boshlanishi kerak, "kerak emas" dan emas.
alter table selleros.category_requirements
  alter column marking_required drop default,
  alter column certificate_required drop default;

alter table selleros.category_requirements
  add column if not exists source text,
  add column if not exists checked_at date;

comment on column selleros.category_requirements.marking_required is
  '`null` = tekshirilmagan, `false` = kerak emas. Aralashtirilmaydi.';
comment on column selleros.category_requirements.certificate_required is
  '`null` = tekshirilmagan, `false` = kerak emas. Aralashtirilmaydi.';
comment on column selleros.category_requirements.source is
  'Qayerdan olindi. Manbasiz qator tavsiyaga taʼsir qilmaydi.';
comment on column selleros.category_requirements.checked_at is
  'Qachon tekshirilgan. Huquqiy talab oʻzgaradi — eski qator qayta koʻriladi.';
