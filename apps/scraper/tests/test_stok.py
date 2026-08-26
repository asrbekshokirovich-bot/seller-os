"""Qoldiq (stok) yig'ish testlari.

Reja (B1) sotuvni qoldiq farqidan hisoblashni talab qiladi. Buning
uchun qoldiq YIG'ILISHI kerak, va u `None` bilan `0` ni aralashtirmasligi
shart: `0` — "tovar tugagan", `None` — "o'lchanmagan".
"""
from selleros_scraper.manbalar.uzum import PRODUCT_QUERY_STOK, parse

ASOS = {
    "id": 886388,
    "title": "Chia urug'i",
    "shop": {"id": 13000, "title": "HORUN"},
    "category": {"id": 17499, "title": "Urug'lar"},
}


def _javob(**qoshimcha):
    return {"product": dict(ASOS, **qoshimcha)}


def test_ogir_sorovda_skulist_bor():
    """Yengil so'rovda `skuList` bo'lmasligi kerak — u javobni 16x shishiradi."""
    assert "skuList" in PRODUCT_QUERY_STOK
    from selleros_scraper.manbalar.uzum import PRODUCT_QUERY

    assert "skuList" not in PRODUCT_QUERY


def test_qoldiq_variantlar_yigindisi():
    k = parse(_javob(skuList=[
        {"availableAmount": 0, "weight": 300},
        {"availableAmount": 100, "weight": 300},
        {"availableAmount": 5, "weight": 300},
    ]))
    assert k.stock == 105


def test_skulist_yoq_bolsa_None_nol_emas():
    """Eng muhim test.

    Yengil so'rovda qoldiq umuman kelmaydi. Agar uni `0` deb yozsak,
    sotuv baholash "hammasi sotilgan" degan yolg'on chiqarardi.
    """
    assert parse(_javob()).stock is None
    assert parse(_javob(skuList=[])).stock is None


def test_qoldiq_nol_bolsa_nol_qoladi():
    """`0` haqiqiy o'lchov — tovar tugagan. U `None` ga aylanmasligi kerak."""
    k = parse(_javob(skuList=[{"availableAmount": 0}, {"availableAmount": 0}]))
    assert k.stock == 0


def test_ogirlik_eng_kattasi():
    """Kargo tannarxi eng og'ir variantga qarab hisoblanadi."""
    k = parse(_javob(skuList=[
        {"availableAmount": 1, "weight": 300},
        {"availableAmount": 1, "weight": 1200},
    ]))
    assert k.weight_g == 1200


def test_ogirlik_yoq_bolsa_None():
    assert parse(_javob(skuList=[{"availableAmount": 1}])).weight_g is None


# --- Uzumning o'z "katta hajmli" belgisi (`oversized`) ---
#
# NEGA KERAK. 7-tuzoqning "katta hajm" tarmog'i hech qachon ishlamagan:
# `volumeMl` Uzumda umuman yo'q. Ustiga-ustak kuzatuvdagi tovarlarning
# ~19% ida og'irlik ham yo'q — Uzum `weight` ni bo'sh qaytaradi.
#
# `oversized` esa HAR IKKALA so'rovda keladi va haqiqatan o'zgaradi
# (jonli o'lchandi: 7 ta muzlatgichda `true`, 7 ta yengil tovarda
# `false`). `shop.official` dan farqi shu — u 63 113 do'konda ham
# `false` edi va shuning uchun yozilmaydi.


def test_oversized_ikkala_sorovda_ham_soraladi():
    """Og'irlikdan farqli: bu maydon yengil so'rovda ham kerak."""
    from selleros_scraper.manbalar.uzum import PRODUCT_QUERY

    assert "oversized" in PRODUCT_QUERY
    assert "oversized" in PRODUCT_QUERY_STOK


def test_oversized_true_ajratiladi():
    assert parse(_javob(oversized=True)).oversized is True


def test_oversized_false_ajratiladi():
    assert parse(_javob(oversized=False)).oversized is False


def test_oversized_yoq_bolsa_none():
    """`None` va `False` ARALASHMAYDI.

    `bool(None)` `False` beradi. Agar shunday yozilsa, "so'ralmagan"
    jimgina "katta emas" ga aylanardi — va 7-tuzoq o'lchanmagan
    tovarni "tekshirildi, toza" deb ko'rsatardi.
    """
    assert parse(_javob()).oversized is None


def test_oversized_notogri_tur_none():
    """Uzum kutilmagan qiymat bersa ham `False` ga aylanmaydi."""
    assert parse(_javob(oversized="ha")).oversized is None
    assert parse(_javob(oversized=1)).oversized is None


# --- Hajm (`dimensions`) ---
#
# Uzum logistika yig'imi HAJM bo'yicha: uzunlik × kenglik ×
# balandlik / 1 000 000 = litr. Ya'ni hajmsiz marja hisobi to'liq
# emas.
#
# `Product` turida o'lcham yo'q, lekin `Sku.dimensions` da BOR —
# buni topguncha "Uzum o'lcham bermaydi" deb o'ylagandim.


def test_hajm_medianadan_olinadi():
    """Bir tovarning ikki varianti ming barobar farq qilishi mumkin.

    Jonli o'lchandi: bolalar elektromobilida bitta variant
    88×47×26 mm (0,11 l), ikkinchisi 1150×650×450 mm (336 l).
    `max` olsak eng katta xato g'olib chiqardi.
    """
    k = parse(_javob(skuList=[
        {"dimensions": {"length": 258, "width": 101, "height": 151}},
        {"dimensions": {"length": 286, "width": 157, "height": 103}},
    ]))
    # Mediana: ikkitadan ikkinchisi → 286×157×103 / 1000
    assert k.volume_ml == 4625


def test_hajm_mm_dan_ml_ga():
    """1 ml = 1 000 mm³."""
    k = parse(_javob(skuList=[{"dimensions": {"length": 100, "width": 100, "height": 100}}]))
    assert k.volume_ml == 1000  # 1 litr


def test_olchamsiz_tovar_none():
    """`None` — nol EMAS. Nol "hajmi yo'q" degan da'vo bo'lardi."""
    assert parse(_javob(skuList=[{"weight": 100}])).volume_ml is None
    assert parse(_javob()).volume_ml is None


def test_nolinchi_olcham_hisobga_olinmaydi():
    """Bitta o'lcham nol bo'lsa hajm ham nol — bu o'lchov emas."""
    k = parse(_javob(skuList=[{"dimensions": {"length": 100, "width": 0, "height": 50}}]))
    assert k.volume_ml is None


def test_hajm_shifti():
    """2 m³ dan katta — terish xatosi, marketpleys posilkasi emas."""
    k = parse(_javob(skuList=[
        {"dimensions": {"length": 5000, "width": 5000, "height": 5000}},
    ]))
    assert k.volume_ml is None


def test_hajm_ikkala_sorovda_ham_sorlamaydi():
    """`dimensions` og'ir so'rovda, yengilida yo'q — javob shishmasin."""
    from selleros_scraper.manbalar.uzum import PRODUCT_QUERY

    assert "dimensions" in PRODUCT_QUERY_STOK
    assert "dimensions" not in PRODUCT_QUERY
