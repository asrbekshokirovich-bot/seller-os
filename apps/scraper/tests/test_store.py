"""Bazaga yozish qatlami testlari.

Bu fayl jonli sinovdan keyin yozildi. Skreyper birinchi marta bazaga
yozganda hammasi to'g'ri yozilgan — mahsulot, do'kon, o'lchov, sweep
ochildi va yopildi — lekin buyruq baribir QIZIL qaytdi:
`so_sweep_close` hech narsa qaytarmaydi (`void`), PostgREST esa 204 va
bo'sh tana beradi, kod esa har javobni JSON deb o'qirdi.

Xato natijani emas, faqat xabarni buzgan. Bu ayniqsa chalg'ituvchi:
"qizil" ni ko'rib "yozilmadi" deb o'ylash mumkin edi.
"""

import httpx
import pytest

from selleros_scraper.store import Store, StoreError


def store_bilan(handler) -> tuple[Store, httpx.Client]:
    return (
        Store(url="https://sinov", service_key="MAXFIY"),
        httpx.Client(transport=httpx.MockTransport(handler)),
    )


def test_BOSH_JAVOB_XATO_EMAS():
    """`void` RPC 204 va bo'sh tana qaytaradi — bu muvaffaqiyat."""
    s, c = store_bilan(lambda r: httpx.Response(204))
    assert s._rpc(c, "so_sweep_close", {}) is None


def test_bosh_tanali_200_ham_qabul_qilinadi():
    s, c = store_bilan(lambda r: httpx.Response(200, content=b""))
    assert s._rpc(c, "so_sweep_close", {}) is None


def test_oddiy_javob_oqiladi():
    s, c = store_bilan(lambda r: httpx.Response(200, json={"products": 9}))
    assert s._rpc(c, "so_ingest_batch", {}) == {"products": 9}


def test_JSON_EMAS_JAVOB_ANIQ_XATO_BERADI():
    """Bo'sh tana bilan buzuq tanani aralashtirmaymiz."""
    s, c = store_bilan(lambda r: httpx.Response(200, content=b"<html>502</html>"))
    with pytest.raises(StoreError, match="JSON qaytarmadi"):
        s._rpc(c, "so_ingest_batch", {})


def test_KALIT_XATO_MATNIGA_TUSHMAYDI():
    """Kalit log ga chiqsa, u log turgan hamma joyga tarqaydi."""
    s, c = store_bilan(lambda r: httpx.Response(500, content=b"MAXFIY kaliti yaroqsiz"))
    with pytest.raises(StoreError) as xato:
        s._rpc(c, "so_ingest_batch", {})
    assert "MAXFIY" not in str(xato.value)
    assert "<kalit>" in str(xato.value)


def test_kalit_json_emas_xatosida_ham_yashiriladi():
    s, c = store_bilan(lambda r: httpx.Response(200, content=b"MAXFIY <html>"))
    with pytest.raises(StoreError) as xato:
        s._rpc(c, "so_ingest_batch", {})
    assert "MAXFIY" not in str(xato.value)


def test_bosh_partiya_sorov_yubormaydi():
    yuborildi = []
    s, c = store_bilan(lambda r: (yuborildi.append(1), httpx.Response(200, json={}))[1])
    natija = s.yoz(c, [])
    assert not yuborildi, "bo'sh partiya uchun so'rov yuborilmasligi kerak"
    assert natija["observations"] == 0
