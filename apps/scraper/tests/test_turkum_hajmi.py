"""Turkum hajmi manbai — javobni qanday oʻqiydi.

Bu yerda tarmoq YOʻQ: `httpx.Client` oʻrniga soxta obyekt
beriladi. Sinaladigan narsa soʻrov emas, JAVOBNI TURKUMLASH —
aynan shu joyda "xato" va "javob" chalkashishi mumkin.
"""

from __future__ import annotations

import httpx
import pytest

from selleros_scraper.manbalar.turkum_hajmi import (
    QUERY,
    Hajm,
    sarlavhalar,
    sorov,
)


class SoxtaClient:
    """Bitta tayyor javobni qaytaradi va soʻrovni yozib qoʻyadi."""

    def __init__(self, javob=None, xato: Exception | None = None):
        self._javob = javob
        self._xato = xato
        self.tana = None

    def post(self, url, json=None, headers=None):
        self.tana = json
        if self._xato is not None:
            raise self._xato
        return self._javob


def javob(status: int, body) -> httpx.Response:
    return httpx.Response(status, json=body, request=httpx.Request("POST", "https://x"))


def test_total_oqiladi():
    c = SoxtaClient(javob(200, {"data": {"makeSearch": {"total": 8163}}}))
    h = sorov(c, {}, 13983)
    assert h.category_id == 13983
    assert h.total == 8163
    assert h.noyob_nisbat is None  # items yo'q


def test_429_alohida_ajratiladi():
    """429 boshqa xatolardan farq qiladi: unda kutish kerak."""
    c = SoxtaClient(javob(200, {"errors": [{"message": "...: 429: Too Many Requests"}]}))
    assert sorov(c, {}, 1).sabab == "429"


def test_xato_javobda_total_YOQ_nol_emas():
    """Nol qaytarilsa "turkum boʻsh" degan yolgʻon chiqardi."""
    c = SoxtaClient(javob(200, {"errors": [{"message": "boshqa xato"}]}))
    h = sorov(c, {}, 1)
    assert h.total is None
    assert h.sabab


def test_tarmoq_xatosi_yiqilmaydi():
    c = SoxtaClient(xato=httpx.ConnectError("uzildi"))
    h = sorov(c, {}, 1)
    assert h.total is None
    assert "tarmoq" in h.sabab


def test_total_null_bolsa_ham_nol_emas():
    c = SoxtaClient(javob(200, {"data": {"makeSearch": {"total": None}}}))
    assert sorov(c, {}, 1).total is None


def test_pagination_limit_NOL_EMAS():
    """
    Retseptning bir qismi: `limit: 0` bilan darvoza 429 berardi.
    Bu qator oʻsha qiymat qaytib kelmasligi uchun.
    """
    c = SoxtaClient(javob(200, {"data": {"makeSearch": {"total": 1}}}))
    sorov(c, {}, 1)
    assert c.tana["variables"]["q"]["pagination"]["limit"] > 0


def test_sarlavhada_client_nomi_bor():
    # Retseptning ikkinchi qismi.
    h = sarlavhalar({"Authorization": "Bearer x"})
    assert h["apollographql-client-name"] == "web-customer"
    assert h["Authorization"] == "Bearer x"


def test_soqrov_matni_faqat_total_soraydi():
    """Ortiqcha maydon soʻrash javobni shishiradi va e'tiborni tortadi."""
    assert "total" in QUERY
    assert "productId" in QUERY
    assert "facets" not in QUERY


def test_noyob_nisbat_hisoblanadi():
    """24 ta natijadan 12 ta noyob → 0.5."""
    items = [{"catalogCard": {"productId": i % 12}} for i in range(24)]
    ms_body = {"total": 1000, "items": items}
    c = SoxtaClient(javob(200, {"data": {"makeSearch": ms_body}}))
    h = sorov(c, {}, 555)
    assert h.total == 1000
    assert h.noyob_nisbat == pytest.approx(0.5)


def test_noyob_nisbat_hammasi_noyob():
    """Hamma ID farqli — nisbat 1.0."""
    items = [{"catalogCard": {"productId": i}} for i in range(24)]
    ms_body = {"total": 500, "items": items}
    c = SoxtaClient(javob(200, {"data": {"makeSearch": ms_body}}))
    h = sorov(c, {}, 100)
    assert h.noyob_nisbat == pytest.approx(1.0)


def test_noyob_nisbat_items_bosh():
    """Items bo'sh massiv — nisbat None."""
    ms_body = {"total": 100, "items": []}
    c = SoxtaClient(javob(200, {"data": {"makeSearch": ms_body}}))
    h = sorov(c, {}, 100)
    assert h.noyob_nisbat is None


def test_noyob_nisbat_items_yoq():
    """Javobda items yo'q — nisbat None."""
    c = SoxtaClient(javob(200, {"data": {"makeSearch": {"total": 100}}}))
    h = sorov(c, {}, 100)
    assert h.noyob_nisbat is None
