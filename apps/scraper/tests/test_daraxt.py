"""Turkum daraxti — soʻrov, tekislash va «yarim daraxt yozilmaydi» qoidasi.

Tarmoq YOʻQ: `httpx.Client` oʻrniga soxta obyekt. Sinaladigan narsa —
javobni oʻqish va toʻliq boʻlmagan daraxtni rad etish.
"""

from __future__ import annotations

import httpx
import pytest

from selleros_scraper.daraxt import (
    CHUQURLIK,
    ENG_KAM_TUGUN,
    DaraxtXatosi,
    Tekis,
    daraxt_sorovi,
    daraxtni_ol,
    tekisla,
    tekshir,
)


class SoxtaClient:
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


KICHIK = {
    "id": 1, "title": "Barcha toifalar", "adult": False,
    "children": [
        {"id": 10014, "title": "Kiyim", "adult": False, "children": [
            {"id": 13700, "title": "Shimlar", "adult": False, "children": []},
            {"id": 14937, "title": "Yubkalar", "adult": False, "children": []},
        ]},
        {"id": 10013, "title": "Poyabzallar", "adult": False, "children": [
            {"id": 14237, "title": "Krossovkalar", "adult": False},
        ]},
    ],
}


def test_sorov_chuqurligi_va_qavslari():
    q = daraxt_sorovi()
    assert q.count("children {") == CHUQURLIK
    assert q.count("{") == q.count("}")
    assert "category(id: $id)" in q


def test_tekisla_ota_va_chuqurlik():
    t = tekisla(KICHIK)
    by_id = {x["id"]: x for x in t.tugunlar}
    assert len(t.tugunlar) == 6
    assert by_id[1]["ota_id"] is None
    assert by_id[10014]["ota_id"] == 1
    assert by_id[13700]["ota_id"] == 10014
    assert by_id[14237]["ota_id"] == 10013
    assert t.eng_chuqur == 2
    assert t.takror == 0
    # Uzum tartibi saqlanadi (stek teskari qoʻshadi).
    assert [x["id"] for x in t.tugunlar][:3] == [1, 10014, 13700]


def test_takror_id_bir_marta_va_sanaladi():
    d = {"id": 1, "title": "R", "children": [
        {"id": 5, "title": "A", "children": [{"id": 7, "title": "x"}]},
        {"id": 6, "title": "B", "children": [{"id": 7, "title": "x"}]},
    ]}
    t = tekisla(d)
    assert [x["id"] for x in t.tugunlar].count(7) == 1
    assert t.takror == 1


def test_nomsiz_tugun_nomi_bor():
    t = tekisla({"id": 1, "title": "", "children": [{"id": 2, "title": None}]})
    assert t.tugunlar[1]["nom"] == "Turkum 2"


def test_kam_tugun_rad_etiladi():
    with pytest.raises(DaraxtXatosi, match="tugun"):
        tekshir(tekisla(KICHIK))


def test_kesilgan_daraxt_rad_etiladi():
    t = Tekis(tugunlar=[{"id": 1, "ota_id": None, "nom": "R", "kattalar": False}] * ENG_KAM_TUGUN,
              eng_chuqur=CHUQURLIK)
    with pytest.raises(DaraxtXatosi, match="darajaga"):
        tekshir(t)


def test_ildizsiz_daraxt_rad_etiladi():
    t = Tekis(tugunlar=[{"id": 2, "ota_id": 1, "nom": "x", "kattalar": False}] * ENG_KAM_TUGUN)
    with pytest.raises(DaraxtXatosi, match="Ildiz"):
        tekshir(t)


def test_toliq_daraxt_otadi():
    tugunlar = [{"id": 1, "ota_id": None, "nom": "R", "kattalar": False}]
    tugunlar += [{"id": i, "ota_id": 1, "nom": f"t{i}", "kattalar": False} for i in range(2, ENG_KAM_TUGUN + 2)]
    tekshir(Tekis(tugunlar=tugunlar, eng_chuqur=1))


def test_daraxtni_ol_javobi():
    c = SoxtaClient(javob(200, {"data": {"category": KICHIK}}))
    t = daraxtni_ol(c, {})
    assert len(t.tugunlar) == 6
    assert c.tana["variables"] == {"id": 1}


@pytest.mark.parametrize("res,matn", [
    (javob(429, {"errors": ["429"]}), "HTTP 429"),
    (javob(200, {"data": {"category": None}, "errors": [{"message": "x"}]}), "boʻsh"),
    (javob(200, {"data": None}), "boʻsh"),
])
def test_daraxtni_ol_xatolarni_yashirmaydi(res, matn):
    with pytest.raises(DaraxtXatosi, match=matn):
        daraxtni_ol(SoxtaClient(res), {})


def test_daraxtni_ol_tarmoq_xatosi():
    with pytest.raises(DaraxtXatosi, match="tarmoq"):
        daraxtni_ol(SoxtaClient(xato=httpx.ConnectError("yoq")), {})
