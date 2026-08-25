-- Ogʻirlik shifti — 987 kg krossovka bazada QOLIB KETMASIN.
--
-- Skreyperda ogʻirlik `max` dan `median` ga oʻtkazildi va 150 kg
-- shifti qoʻyildi (`uzum.py`, OGIRLIK_SHIFTI_G). Lekin bu faqat
-- KELAJAKDAGI yozuvni tuzatadi. Bazada allaqachon uch qator bor:
--
--   987 455 g  "Campus krossovkalari"        (987 kg poyabzal)
--   500 000 g  "Avtomobil mikrofiber salfetka" (500 kg salfetka)
--   180 000 g  "Bolalar elektromobili"        (180 kg oʻyinchoq)
--
-- Ular oʻz-oʻzidan tuzalmaydi: `so_ingest_batch` da
-- `coalesce(excluded.weight_g, product.weight_g)` turadi, yaʼni
-- yangi `null` eski qiymatni OʻCHIRMAYDI. Bu qoida toʻgʻri
-- (yengil soʻrov oʻlchangan ogʻirlikni yoʻqotmasligi kerak), lekin
-- natijada notoʻgʻri qiymat abadiy qolar edi va 7-tuzoq (ogʻir
-- tovar) shu tovarlarni har safar bayroqlab turardi.
--
-- NEGA TRIGGER, NEGA FUNKSIYA EMAS. `so_ingest_batch` ikki yuz
-- qatorli va 0023 da uni qayta yozishga urinib bir marta kunlik
-- yozuv mantigʻini buzganman. Trigger esa kichik, mustaqil va
-- HAMMA yozuvchini tutadi — kelajakda boshqa uch qoʻshilsa ham.
--
-- SHIFT USTIDAGI QIYMAT NOLGA emas, `null` GA aylanadi.
-- Nol "tovar ogʻirligi nol" degan daʼvo boʻlardi; `null` esa
-- "oʻlchanmagan" — va filtr aynan shuni kutadi.

create or replace function selleros.ogirlik_shifti()
returns trigger
language plpgsql
as $$
begin
  -- 150 kg. Uzumda bundan ogʻir tovar bor (muzlatgich 64 kg,
  -- divan), lekin 150 kg dan ogʻirini yakka sotuvchi pochta bilan
  -- yubormaydi — bunday qiymat deyarli har doim terish xatosi.
  if new.weight_g is not null and new.weight_g > 150000 then
    new.weight_g := null;
  end if;
  return new;
end;
$$;

drop trigger if exists ogirlik_shifti_trg on selleros.product;
create trigger ogirlik_shifti_trg
  before insert or update on selleros.product
  for each row execute function selleros.ogirlik_shifti();

-- Bazada turgan xato qiymatlarni tozalaymiz.
update selleros.product set weight_g = null where weight_g > 150000;
