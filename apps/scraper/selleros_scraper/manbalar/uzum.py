"""Uzum manbasi — so'rov va javobni o'qish.

Bu yerdagi tanlovlar o'lchov bilan asoslangan. Ular qayta ochilmasin
uchun sabablari yozib qo'yilgan.

QIDIRUV ISHLATILMAYDI. `search-gateway` bu IP uchun doimiy 429 qaytaradi.
Shuning uchun katalog `productPage(id:)` orqali, id bo'yicha aylanib
chiqiladi. Bu sekinroq, lekin ishlaydi.

`skuList` SO'RALMAYDI. O'lchandi: u bilan javob 5,0 KB, usiz 0,4 KB —
16 barobar farq. 2,7 mln mahsulotda bu 13 GB va 1 GB o'rtasidagi farq.
Variantlar 2-qatlamda, tanlangan mahsulotlar uchun olinadi.

`Product.ordersQuantity` HECH QACHON so'ralmaydi. U yaxlitlangan va
haqiqiy sotuvning ~55% ini ko'rsatadi — ya'ni yolg'on raqam. Do'kon
darajasidagi `Shop.ordersQuantity` esa aniq va u so'raladi.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

# `actions` atigi 0,1 KB qo'shadi, evaziga haftalik xaridorlar sonini
# beradi. 2-qatlamga kimni olishni aynan shu raqam hal qiladi.
PRODUCT_QUERY = """
query sellerosProduct($id: Int!) {
  productPage(id: $id) {
    actions { __typename ... on MotivationAction { text } }
    product {
      id
      title
      rating
      feedbackQuantity
      minSellPrice
      minFullPrice
      category { id title }
      # `official` so'raladi, lekin YOZILMAYDI — Uzum uni doim `false`
      # qaytaradi (parse() dagi izohga qarang). So'rovda qoldirilgan
      # sababi: Uzum to'ldira boshlasa, bir marta tekshirib bilamiz.
      shop { id title official ordersQuantity }
    }
  }
}
"""

# 2-QATLAM so'rovi — OG'IR. Farqi bitta: `skuList`.
#
# Nega alohida so'rov. `skuList` javobni ~16 barobar shishiradi (0,4 KB →
# 5,0 KB). Butun katalog bo'ylab bu 1 GB va 13 GB o'rtasidagi farq.
# Shuning uchun u faqat TANLANGAN tovarlarga so'raladi.
#
# Nega kerak. Reja "sotuv baholash v1" ni qoldiq farqidan hisoblashni
# talab qiladi: qoldiq kamaysa — sotilgan. `availableAmount` busiz
# umuman kelmaydi, ya'ni sotuv baholash ishlamaydi.
PRODUCT_QUERY_STOK = """
query sellerosProductStok($id: Int!) {
  productPage(id: $id) {
    actions { __typename ... on MotivationAction { text } }
    product {
      id
      title
      rating
      feedbackQuantity
      minSellPrice
      minFullPrice
      category { id title }
      shop { id title official ordersQuantity }
      # Qoldiq variantlar bo'yicha keladi — tovar qoldig'i ularning
      # yig'indisi. `weight` 7-tuzoq (og'ir tovar) uchun ham keladi.
      skuList { id availableAmount sellPrice weight }
    }
  }
}
"""

# "1 234 kishi sotib oldi" kabi matndan sonni ajratadi. Uzum uni faqat
# matn sifatida beradi — alohida maydon yo'q.
_BUYERS = re.compile(r"(\d[\d\s ]*)")


def buyers_per_week(actions: list[dict[str, Any]] | None) -> int | None:
    """Haftalik xaridorlar soni. Topilmasa `None` — nol EMAS.

    Nol "hech kim olmagan" degan javob, `None` esa "bilmayman".
    Ularni aralashtirsak, ma'lumoti yo'q tovar sotilmaydigan tovarga
    o'xshab qoladi (QOIDALAR.md, 4-qoida).
    """
    for action in actions or []:
        text = action.get("text")
        if not text:
            continue
        match = _BUYERS.search(text)
        if match:
            digits = re.sub(r"[^\d]", "", match.group(1))
            if digits:
                return int(digits)
    return None


@dataclass(frozen=True)
class Kuzatuv:
    """Bitta mahsulotning bitta o'lchovi."""

    external_id: int
    title: str
    shop_external_id: int | None
    shop_name: str | None
    shop_official: bool | None
    shop_orders: int | None
    """Do'kon hisoblagichi."""
    category_external_id: int | None
    category_name: str | None
    price: int | None
    full_price: int | None
    reviews: int | None
    rating: float | None
    buyers_per_week: int | None
    """Qoldiq — barcha variantlar yig'indisi. `None` = og'ir so'rov qilinmagan.

    Nol EMAS: nol "tovar tugagan" degani, `None` "o'lchanmagan".
    Aralashtirsak, yengil so'rov bilan olingan tovar "tugagan" bo'lib
    ko'rinardi va sotuv baholash uni noto'g'ri hisoblardi.
    """
    stock: int | None = None
    """Og'irlik, gramm. 7-tuzoq (og'ir tovar) uchun."""
    weight_g: int | None = None


def parse(node: dict[str, Any] | None) -> Kuzatuv | None:
    """GraphQL javobidan o'lchov ajratadi. `None` — mahsulot yo'q.

    O'lik id butun aylanishni to'xtatmasligi kerak: id fazosining ~70% i
    bo'sh va bu normal holat, xato emas.
    """
    product = (node or {}).get("product")
    if not product or not product.get("id"):
        return None

    shop = product.get("shop") or {}
    category = product.get("category") or {}

    return Kuzatuv(
        external_id=int(product["id"]),
        title=product.get("title") or f"Mahsulot {product['id']}",
        shop_external_id=_int(shop.get("id")),
        shop_name=shop.get("title"),
        # Uzum bu maydonni ISHLATMAYDI. 63 113 do'kondan birortasi ham
        # `true` emas — ARTEL_OFFICIAL, Artel Brand Shop, Яшкино ham
        # `false`. Ya'ni Uzumning `false` i "rasmiy emas" degani emas:
        # u doimiy. Doimiyni o'lchov deb yozsak, bo'shliq o'lchov bo'lib
        # ko'rinadi. Boshqa bozor haqiqiy belgi bersa — o'sha manba yozadi.
        shop_official=None,
        shop_orders=_int(shop.get("ordersQuantity")),
        category_external_id=_int(category.get("id")),
        category_name=category.get("title"),
        price=_int(product.get("minSellPrice")),
        full_price=_int(product.get("minFullPrice")),
        reviews=_int(product.get("feedbackQuantity")),
        rating=_float(product.get("rating")),
        buyers_per_week=buyers_per_week((node or {}).get("actions")),
        stock=_qoldiq(product.get("skuList")),
        weight_g=_ogirlik(product.get("skuList")),
    )


def _qoldiq(sku_list: list[dict[str, Any]] | None) -> int | None:
    """Variantlar qoldig'ini qo'shadi.

    `None` qaytaradi agar `skuList` umuman kelmagan bo'lsa — ya'ni
    yengil so'rov ishlatilgan. Bu nol bilan aralashmasligi kerak.
    """
    if not sku_list:
        return None
    jami = 0
    topildi = False
    for sku in sku_list:
        qiymat = _int((sku or {}).get("availableAmount"))
        if qiymat is not None:
            jami += qiymat
            topildi = True
    return jami if topildi else None


#: Shundan og'ir tovar O'LCHANMAGAN deb hisoblanadi.
#:
#: Uzum posilka tashiydi. Eng og'ir haqiqiy tovarlar — muzlatgichlar,
#: 40–64 kg (o'lchandi). 150 kg dan og'iri terish xatosi.
#:
#: Chegaradan oshgani `None` bo'ladi, "og'ir" emas: bilmaslik va
#: "juda og'ir" boshqa-boshqa javob. Filtr "baholanmadi" deydi,
#: tovarni ayblamaydi.
OGIRLIK_SHIFTI_G = 150_000


def _ogirlik(sku_list: list[dict[str, Any]] | None) -> int | None:
    """Variantlarning MEDIANA og'irligi.

    ENG KATTASI EMAS — o'lchov shuni ko'rsatdi (2026-08-25).

    "Campus krossovkalari" da 63 ta variant bor: 571–820 g, va
    ikkitasida 987455 g. Eng kattasini olsak — 987 kg krossovka.
    Medianasi 695 g va u to'g'ri.

    "Mikrofiber sochiq" da 28 variant: 200–748 g, uchtasida
    500000. Mediana 290 g.

    Ya'ni sotuvchi o'zi kiritadigan maydonda terish xatosi bo'ladi,
    va u HAR DOIM yuqoriga qarab adashadi (nol qo'shib yuboradi).
    Eng kattasi bitta xatodan buziladi, mediana esa variantlarning
    yarmi buzilmaguncha turadi.

    Haqiqiy variantlar orasidagi farq kichik (krossovkada 44%),
    shuning uchun "eng og'irini olamiz, kargo shunga qarab" degan
    eski dalil xato xavfidan ancha arzon turadi.
    """
    if not sku_list:
        return None
    ogirliklar = sorted(
        w for w in (_int((s or {}).get("weight")) for s in sku_list) if w
    )
    if not ogirliklar:
        return None
    mediana = ogirliklar[len(ogirliklar) // 2]
    # Bitta variantli tovarda mediana yordam bermaydi — u yerda
    # faqat shift qoladi.
    return None if mediana > OGIRLIK_SHIFTI_G else mediana


def _int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return round(float(value))
    except (TypeError, ValueError):
        return None


def _float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
