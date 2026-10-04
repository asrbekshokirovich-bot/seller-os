/**
 * Ikki tilli matn — statik sahifa uchun (404). Ikkala til ham HTML da,
 * koʻrinadigani `<html lang>` boʻyicha (globals.css). `lang` ni ildiz
 * layoutdagi head skripti chizishdan OLDIN qoʻyadi: rus tilidagi odam
 * oʻzbekchani koʻrmaydi, sahifa esa cookie oʻqimaydi va statik qoladi
 * (cookie oʻqiydigan 404 hamma sahifani dinamik qilib qoʻyardi).
 */
export function Ikki({ uz, ru }: { uz: string; ru: string }) {
  return (
    <>
      <span className="zs-uz">{uz}</span>
      <span className="zs-ru">{ru}</span>
    </>
  );
}
