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
    assert h == Hajm(13983, 8163)


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
    assert "facets" not in QUERY
