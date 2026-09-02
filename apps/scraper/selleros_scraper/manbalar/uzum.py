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
      # Uzumning O'ZI "katta hajmli" deb belgilagan tovar. Bu bitta
      # boolean — javobga deyarli hech narsa qo'shmaydi, lekin
      # 7-tuzoqning "katta hajm" tarmog'i uchun YAGONA manba:
      # `volumeMl` Uzumda umuman yo'q.
      #
      # `shop.official` dan farqli o'laroq bu maydon HAQIQATAN
      # ishlaydi — jonli o'lchandi: 7 ta muzlatgichda `true`,
      # 7 ta yengil tovarda `false`.
      oversized
      # `official` so'raladi, lekin YOZILMAYDI — Uzum uni doim `false`
      # qaytaradi (parse() dagi izohga qarang). So'rovda qoldirilgan
      # sababi: Uzum to'ldira boshlasa, bir marta tekshirib bilamiz.
      # `feedbackQuantity` va `rating` — do'kon darajasida. Ular
      # `official` dan FARQLI o'laroq haqiqatan to'ldiriladi: 70 ta
      # tasodifiy do'konda o'lchandi (2026-09-02), 60 tasida ikkalasi
      # ham noldan katta, `null` bitta ham yo'q, reyting 2.5–5.0.
      shop { id title official ordersQuantity feedbackQuantity rating }
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
      oversized
      # `feedbackQuantity` va `rating` — do'kon darajasida. Ular
      # `official` dan FARQLI o'laroq haqiqatan to'ldiriladi: 70 ta
      # tasodifiy do'konda o'lchandi (2026-09-02), 60 tasida ikkalasi
      # ham noldan katta, `null` bitta ham yo'q, reyting 2.5–5.0.
      shop { id title official ordersQuantity feedbackQuantity rating }
      # Qoldiq variantlar bo'yicha keladi — tovar qoldig'i ularning
      # yig'indisi. `weight` 7-tuzoq (og'ir tovar) uchun ham keladi.
      # `dimensions` — uzunlik/kenglik/balandlik, millimetrda.
      # Uzum logistika yig'imi HAJM bo'yicha hisoblanadi:
      # uzunlik × kenglik × balandlik / 1 000 000 = litr.
      skuList { id availableAmount sellPrice weight
                dimensions { length width height } }
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
    shop_reviews: int | None
    """Do'kon sharhlari soni. Nol — HAQIQIY javob ("hali sharh yo'q"),
    `None` esa "kelmadi". Ikkalasi boshqa narsa."""
    shop_rating: float | None
    """Do'kon reytingi. `None` — baho YO'Q, nol emas.

    O'lchandi 2026-09-02, 70 ta tasodifiy do'kon: reyting nol bo'lgan
    10 ta do'konning HAMMASIDA sharh ham nol edi, va sharhi bor
    do'konda reyting nol bo'lgan holat BITTA ham chiqmadi. Ya'ni
    Uzumning `rating: 0.0` i "nol baho" degani emas — "hali
    baholanmagan" degani. Uni nol deb yozsak, yangi do'kon eng yomon
    do'konga o'xshab qolardi (QOIDALAR.md, 4-qoida)."""
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
    """Uzumning o'z "katta hajmli" belgisi. 7-tuzoq uchun.

    `None` = so'ralmagan yoki kelmagan. `False` "og'ir emas" degani
    EMAS — u faqat "katta emas" deydi.
    """
    oversized: bool | None = None
    """Hajm, millilitrda. Uzum logistika yig'imi shunga bog'liq."""
    volume_ml: int | None = None


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
        shop_reviews=_int(shop.get("feedbackQuantity")),
        shop_rating=_dokon_reytingi(shop),
        category_external_id=_int(category.get("id")),
        category_name=category.get("title"),
        price=_int(product.get("minSellPrice")),
        full_price=_int(product.get("minFullPrice")),
        reviews=_int(product.get("feedbackQuantity")),
        rating=_float(product.get("rating")),
        buyers_per_week=buyers_per_week((node or {}).get("actions")),
        stock=_qoldiq(product.get("skuList")),
        weight_g=_ogirlik(product.get("skuList")),
        oversized=_bool(product.get("oversized")),
        volume_ml=_hajm(product.get("skuList")),
    )


def _dokon_reytingi(shop: dict[str, Any]) -> float | None:
    """Do'kon reytingi, sharhsiz do'konda `None`.

    Uzum sharhi yo'q do'konga `rating: 0.0` beradi — bu baho emas,
    bahoning yo'qligi. O'lchandi 2026-09-02, 70 ta tasodifiy do'kon:

        sharh = 0 va reyting = 0        10 ta
        sharh > 0 lekin reyting = 0      0 ta   ← nol hech qachon baho emas
        sharh = 0 lekin reyting > 0      0 ta

    Ya'ni ikkalasi doim birga nol bo'ladi. Nolni bazaga yozsak, endi
    ochilgan do'kon 2.5 ballik do'kondan ham yomon ko'rinardi.

    Bu `official` bilan bir xil dars, lekin bu safar oldindan
    o'lchandi: `official` da Uzumning doimiy `false` i bir yil bazada
    o'lchov bo'lib turgan edi (0009-migratsiya).
    """
    reyting = _float(shop.get("rating"))
    if reyting is None or reyting <= 0:
        return None
    sharh = _int(shop.get("feedbackQuantity"))
    # Sharh kelmagan bo'lsa (`None`) reytingga ishonamiz: u noldan
    # katta, ya'ni baho haqiqatan mavjud.
    if sharh is not None and sharh <= 0:
        return None
    return reyting


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


# 2 m³. Undan katta narsa marketpleys posilkasi emas — bu terish
# xatosi. Muzlatgich 675 l, divan ~1 000 l; 2 000 l chegara ularni
# o'tkazadi va absurdni to'sadi.
HAJM_SHIFTI_ML = 2_000_000


def _hajm(sku_list: list[dict[str, Any]] | None) -> int | None:
    """Hajm, millilitrda. Variantlar MEDIANASI.

    Og'irlik bilan bir xil sabab: o'lcham ham sotuvchi qo'lida va
    unga ishonib bo'lmaydi. Jonli o'lchandi — bolalar
    elektromobilida bitta variant 88×47×26 mm (0,11 l), ikkinchisi
    1150×650×450 mm (336 l) deb yozilgan. Ya'ni bir tovarning ikki
    varianti ming barobar farq qiladi.

    `max` olsak eng katta xato g'olib chiqardi, `min` olsak eng
    kichigi. Mediana ikkalasidan ham himoya qiladi.
    """
    if not sku_list:
        return None
    hajmlar = []
    for s in sku_list:
        d = (s or {}).get("dimensions") or {}
        u, k, b = _int(d.get("length")), _int(d.get("width")), _int(d.get("height"))
        if not (u and k and b):
            continue
        # mm³ → ml: 1 ml = 1 000 mm³.
        hajmlar.append(round(u * k * b / 1_000))
    if not hajmlar:
        return None
    hajmlar.sort()
    mediana = hajmlar[len(hajmlar) // 2]
    return None if mediana > HAJM_SHIFTI_ML else mediana


def _bool(value: Any) -> bool | None:
    """`None` va `False` ni ARALASHTIRMAYDI.

    `bool(None)` `False` beradi va shu sababli "so'ralmagan" jimgina
    "katta emas" ga aylanardi. Bu 4-qoidaning buzilishi bo'lardi.
    """
    return value if isinstance(value, bool) else None


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
