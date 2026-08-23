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
