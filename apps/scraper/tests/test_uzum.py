"""Uzum manbasi — javobni o'qish testlari.

Tarmoqqa chiqmaydi: javob shakli qotirilgan. Shakl o'zgarsa test
yiqiladi va biz buni bilamiz — jimgina `None` qaytarib qolmaymiz.
"""

from selleros_scraper.manbalar.uzum import PRODUCT_QUERY, buyers_per_week, parse

JAVOB = {
    "actions": [{"__typename": "MotivationAction", "text": "313 kishi shu hafta sotib oldi"}],
    "product": {
        "id": 1705639,
        "title": "Quyosh nurida nam salfetkalar",
        "rating": 4.8,
        "feedbackQuantity": 312,
        "minSellPrice": 11370,
        "minFullPrice": 15000,
        "category": {"id": 2570, "title": "Nam salfetkalar"},
        "shop": {"id": 6016, "title": "Sunlight Group", "official": True, "ordersQuantity": 102400},
    },
}


def test_toliq_javob_oqiladi():
    k = parse(JAVOB)
    assert k is not None
    assert k.external_id == 1705639
    assert k.shop_external_id == 6016
    assert k.price == 11370
    assert k.buyers_per_week == 313


def test_yopiq_brend_uchun_majburiy_maydonlar():
    """1-tuzoq `official` va do'kon nomisiz ishlamaydi."""
    k = parse(JAVOB)
    assert k.shop_official is True
    assert k.shop_name == "Sunlight Group"


def test_olik_id_none_qaytaradi_xato_emas():
    """Id fazosining ~70% i bo'sh — bu normal holat, xato emas."""
    assert parse(None) is None
    assert parse({}) is None
    assert parse({"product": None}) is None


def test_xaridor_topilmasa_none_nol_emas():
    """Nol "hech kim olmagan", None "bilmayman" — ular boshqa narsa."""
    assert buyers_per_week(None) is None
    assert buyers_per_week([]) is None
    assert buyers_per_week([{"text": "Bepul yetkazib berish"}]) is None


def test_xaridor_soni_boshliq_bilan_ajratilgan():
    assert buyers_per_week([{"text": "1 234 kishi sotib oldi"}]) == 1234
    assert buyers_per_week([{"text": "1 234 kishi sotib oldi"}]) == 1234


def test_product_ordersquantity_hech_qachon_soralmaydi():
    """U yaxlitlangan va haqiqiy sotuvning ~55% ini ko'rsatadi.

    So'rovga tushib qolsa — yolg'on raqam bazaga kiradi va uni keyin
    ajratib bo'lmaydi. Shuning uchun test.
    """
    product_block = PRODUCT_QUERY[PRODUCT_QUERY.index("product {"):]
    assert "ordersQuantity" in PRODUCT_QUERY, "do'kon hisoblagichi kerak"
    # Do'kon bloki ichidagisi mayli, mahsulot darajasidagisi yo'q.
    before_shop = product_block[: product_block.index("shop {")]
    assert "ordersQuantity" not in before_shop


def test_skulist_soralmaydi():
    """16 barobar og'irroq javob. Variantlar 2-qatlamda olinadi."""
    assert "skuList" not in PRODUCT_QUERY
