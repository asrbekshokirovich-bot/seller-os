"""Javobni turkumlash testlari.

Eng muhim savol: nima XATO deb sanaladi. Noto'g'ri javob berilsa,
kill-switch bekorga ishga tushadi va yig'ish to'xtaydi.
"""

import httpx
import pytest

from selleros_scraper.manbalar.uzum_client import Javob, Natija, sorov

JAVOB_OK = {
    "data": {
        "productPage": {
            "actions": [],
            "product": {
                "id": 1, "title": "T", "rating": 5, "feedbackQuantity": 1,
                "minSellPrice": 100, "minFullPrice": 200,
                "category": {"id": 2, "title": "K"},
                "shop": {"id": 3, "title": "D", "official": False, "ordersQuantity": 10},
            },
        }
    }
}

# Uzum mavjud bo'lmagan id uchun aynan shunday javob beradi — o'lchangan.
JAVOB_YOQ = {
    "errors": [{"message": "The field at path '/productPage/product' was declared as non-null but the value is null"}],
    "data": {"productPage": None},
}


def client_bilan(handler) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_topilgan_mahsulot_oqiladi():
    c = client_bilan(lambda r: httpx.Response(200, json=JAVOB_OK))
    j = sorov(c, {}, 1)
    assert j.natija is Natija.TOPILDI
    assert j.kuzatuv.external_id == 1


def test_yoq_id_XATO_DEB_SANALMAYDI():
    """Id fazosining ~70% i bo'sh.

    Agar ular xato deb sanalsa, xato darajasi 70% ga chiqadi va
    kill-switch bekordan yig'ishni to'xtatadi.
    """
    c = client_bilan(lambda r: httpx.Response(200, json=JAVOB_YOQ))
    j = sorov(c, {}, 999_999_999)
    assert j.natija is Natija.YOQ
    assert j.xato_hisoblanadimi is False


def test_429_tez_deb_ajratiladi():
    c = client_bilan(lambda r: httpx.Response(429, text="slow down"))
    j = sorov(c, {}, 1)
    assert j.natija is Natija.TEZ
    assert j.xato_hisoblanadimi is True


def test_401_token_deb_ajratiladi():
    """Token o'lgan — qayta urinish emas, yangilash kerak."""
    c = client_bilan(lambda r: httpx.Response(401))
    assert sorov(c, {}, 1).natija is Natija.TOKEN


def test_tarmoq_uzilsa_xato():
    def handler(request):
        raise httpx.ConnectError("uzildi")

    c = client_bilan(handler)
    j = sorov(c, {}, 1)
    assert j.natija is Natija.XATO
    assert j.xato_hisoblanadimi is True


def test_notogri_json_xato():
    c = client_bilan(lambda r: httpx.Response(200, text="<html>"))
    assert sorov(c, {}, 1).natija is Natija.XATO
