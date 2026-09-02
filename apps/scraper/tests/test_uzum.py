"""Uzum manbasi — javobni o'qish testlari.

Tarmoqqa chiqmaydi: javob shakli qotirilgan. Shakl o'zgarsa test
yiqiladi va biz buni bilamiz — jimgina `None` qaytarib qolmaymiz.
"""

from selleros_scraper.manbalar.uzum import (
    PRODUCT_QUERY,
    PRODUCT_QUERY_STOK,
    buyers_per_week,
    parse,
    _dokon_reytingi,
    _ogirlik,
)

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
        "shop": {
            "id": 6016,
            "title": "Sunlight Group",
            "official": True,
            "ordersQuantity": 102400,
            "feedbackQuantity": 3021,
            "rating": 4.6,
        },
    },
}


def _dokon(**maydonlar):
    """Berilgan do'kon bilan javob yasaydi."""
    return {"product": dict(JAVOB["product"], shop={"id": 1, "title": "D", **maydonlar})}


def test_toliq_javob_oqiladi():
    k = parse(JAVOB)
    assert k is not None
    assert k.external_id == 1705639
    assert k.shop_external_id == 6016
    assert k.price == 11370
    assert k.buyers_per_week == 313


def test_yopiq_brend_uchun_dokon_nomi_kerak():
    """1-tuzoq do'kon nomisiz ishlamaydi."""
    k = parse(JAVOB)
    assert k.shop_name == "Sunlight Group"


def test_uzumdan_official_yozilmaydi():
    """Uzumning `official` i o'lchov emas — doimiy.

    63 113 do'kondan birortasi ham `true` emas (2026-08-19): ARTEL_OFFICIAL,
    Artel Brand Shop, Яшкино ham `false`. Uning `false` ini bazaga yozsak,
    bo'shliq o'lchov bo'lib ko'rinadi (QOIDALAR.md, 4-qoida). Javobda
    `official: True` tursa ham yozmaymiz — manbaga ishonch yo'q.
    """
    assert parse(JAVOB).shop_official is None

    javob = {"product": dict(JAVOB["product"], shop={"id": 1, "title": "D"})}
    assert parse(javob).shop_official is None


# --------------------------------------- do'kon reytingi va sharh soni


def test_dokon_reytingi_va_sharhi_oqiladi():
    """`official` dan farqli — bular haqiqiy o'lchov.

    Jonli o'lchandi 2026-09-02, 70 ta tasodifiy do'kon: 60 tasida
    ikkalasi ham noldan katta, `null` bitta ham yo'q, reyting
    2.5–5.0 oralig'ida.
    """
    k = parse(JAVOB)
    assert k.shop_rating == 4.6
    assert k.shop_reviews == 3021


def test_sharhsiz_dokonda_reyting_none_nol_emas():
    """Uzum sharhi yo'q do'konga `rating: 0.0` beradi — bu baho emas.

    O'lchandi 2026-09-02: reyting nol bo'lgan 10 ta do'konning
    hammasida sharh ham nol edi; sharhi bor do'konda reyting nol
    bo'lgan holat BITTA ham chiqmadi. Nolni yozsak, endi ochilgan
    do'kon 2.5 ballik do'kondan yomon ko'rinardi — 0009-migratsiyadagi
    `official` xatosining aynan o'zi.
    """
    k = parse(_dokon(feedbackQuantity=0, rating=0.0))
    assert k.shop_rating is None
    # Sharh soni uchun nol esa HAQIQIY javob va saqlanadi.
    assert k.shop_reviews == 0


def test_sharhi_bor_dokonning_past_reytingi_yoqolmaydi():
    """2.5 ball — yomon do'kon, lekin o'lchangan. U yo'qolmasin."""
    assert _dokon_reytingi({"feedbackQuantity": 42, "rating": 2.5}) == 2.5


def test_dokon_maydonlari_kelmasa_none():
    """Kelmagan maydon nolga aylanmaydi."""
    k = parse(_dokon())
    assert k.shop_rating is None
    assert k.shop_reviews is None


def test_sharh_soni_kelmasa_reytingga_ishonamiz():
    """Sharh kelmagan, lekin reyting noldan katta — baho mavjud."""
    assert _dokon_reytingi({"rating": 4.9}) == 4.9


def test_dokon_reytingi_ikkala_sorovda_ham_soraladi():
    """Yengil so'rovda unutilsa, ustun kunlarcha bo'sh qolardi."""
    for nomi, sorov in (("yengil", PRODUCT_QUERY), ("og'ir", PRODUCT_QUERY_STOK)):
        dokon = sorov[sorov.index("shop {"):]
        dokon = dokon[: dokon.index("}")]
        assert "rating" in dokon, f"{nomi} so'rovda do'kon reytingi yo'q"
        assert "feedbackQuantity" in dokon, f"{nomi} so'rovda do'kon sharhi yo'q"


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


# ------------------------------------------------- og'irlik: mediana


def _sku(ogirliklar):
    return [{"weight": w} for w in ogirliklar]


def test_ogirlik_medianadan_olinadi():
    """Eng kattasi bitta terish xatosidan buziladi.

    O'lchandi 2026-08-25, "Campus krossovkalari" (63 variant):
    571–820 g, ikkitasida 987455. Eng kattasi 987 kg krossovka
    berardi; mediana 695 g va u to'g'ri.
    """
    krossovka = [655, 805, 720, 775, 655, 645, 750, 987455, 730, 660, 987445]
    assert _ogirlik(_sku(krossovka)) < 1000


def test_ogirlik_yarim_axlatgacha_chidaydi():
    """Mediana variantlarning yarmi buzilmaguncha turadi."""
    assert _ogirlik(_sku([300, 300, 300, 500000, 500000])) == 300


def test_ogirlik_shiftdan_oshsa_olchanmagan():
    """Bilmaslik va "juda og'ir" boshqa-boshqa javob.

    Chegaradan oshgani `None` bo'ladi — filtr "baholanmadi" deydi,
    tovarni ayblamaydi.
    """
    assert _ogirlik(_sku([987455])) is None


def test_haqiqiy_ogir_tovar_otadi():
    """Muzlatgich 64 kg — o'lchangan haqiqiy qiymat, u yo'qolmasin."""
    assert _ogirlik(_sku([64000])) == 64000


def test_ogirlik_yoq_bolsa_none():
    assert _ogirlik(None) is None
    assert _ogirlik([]) is None
    # Nol og'irlik — "kiritilmagan" degani, nol emas.
    assert _ogirlik(_sku([0, 0])) is None
