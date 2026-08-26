-- Hajm nihoyat bazaga yoziladi — va oldingi xulosam tuzatiladi.
--
-- `selleros.product.volume_ml` 0001-migratsiyadan beri bor va
-- 7-tuzoq hamda tannarx hisobi uchun moʻljallangan. Bugungacha u
-- BOʻSH edi va men uni "Uzum bunday maydon bermaydi" deb
-- SXEMA.md va TUZOQLAR.md ga ham yozib qoʻygandim.
--
-- BU XATO EDI. Faqat `Product` turini qaraganman. Oʻlchamlar
-- `Sku.dimensions` da: `length`, `width`, `height` — millimetrda.
--
-- Nazoratchining qoʻlyozma yozuvidagi formula toʻgʻri chiqdi:
--   uzunlik × kenglik × balandlik / 1 000 000 = litr
--
-- Jonli oʻlchandi:
--   muzlatgich   1800×600×625 mm →  675 l
--   krossovka     286×157×103 mm →  4,6 l
--
-- NEGA MUHIM. Uzum logistika yigʻimi HAJM boʻyicha (5 250 soʻm
-- birinchi litr, +250 har qoʻshimcha). Hajmsiz bu xarajat
-- hisoblanmaydi va marja oshib koʻrsatiladi.
--
-- Ogʻirlik bilan bir xil himoya: MEDIANA va 2 m³ shifti. Bir
-- tovarning ikki varianti ming barobar farq qilishi mumkin —
-- bolalar elektromobilida 0,11 l va 336 l deb yozilgan.
--
-- `so_ingest_batch` ham yangilandi (`pg_get_functiondef` + replace
-- bilan, matnni qoʻlda koʻchirmasdan): `volume_ml` oʻqiladi va
-- `coalesce` bilan yoziladi — yengil soʻrovdagi `null` oʻlchangan
-- hajmni oʻchirmaydi.
--
-- Jonli tekshirildi: 4 625 ml yozildi, keyingi maydonsiz soʻrov
-- uni oʻchirmadi.

alter table selleros.product
  alter column volume_ml type integer;

comment on column selleros.product.volume_ml is
  'Hajm, ml. `Sku.dimensions` medianasidan. `null` = oʻlchanmagan.';

create or replace function selleros.hajm_shifti()
returns trigger
language plpgsql
as $$
begin
  if new.volume_ml is not null and new.volume_ml > 2000000 then
    new.volume_ml := null;
  end if;
  return new;
end;
$$;

drop trigger if exists hajm_shifti_trg on selleros.product;
create trigger hajm_shifti_trg
  before insert or update on selleros.product
  for each row execute function selleros.hajm_shifti();

update selleros.product set volume_ml = null where volume_ml > 2000000;
