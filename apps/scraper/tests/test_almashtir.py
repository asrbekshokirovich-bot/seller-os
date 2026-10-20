"""Kuzatuv ro'yxatini yangilash testlari (`almashtir.py`, 0068).

Eng muhimlari:
  - nomzod Uzumda O'LCHANADI: qoldig'i bor va turkumi o'sha bo'lsagina juft;
  - tarmoq xatosi va 429 — rad EMAS (tovar aybdor emas, keyingi safar yana so'raladi);
  - bir nomzod bir ishda bir marta so'raladi va bir marta juft bo'ladi;
  - so'rov byudjeti va kill-switch ishlaydi — Uzumga hurmat (QOIDALAR.md §7).
"""

import json

import httpx
import pytest

from selleros_scraper.almashtir import almashtir, main
from selleros_scraper.hurmat import Limits
from selleros_scraper.store import Store, StoreError
from selleros_scraper.token import TokenProvider


def UXLAMA(_kechikish: float) -> None:
    return None


def tokens() -> TokenProvider:
    tp = TokenProvider(user_agent="t", installation_id="i")
    tp._token = "sinov"
    tp._expires_at = 9e18
    return tp


def tovar(pid: int, *, turkum: int = 100, qoldiq: int = 3) -> dict:
    """Og'ir so'rov javobi: `skuList` bilan (qoldiq variantlar yig'indisi)."""
    return {"data": {"productPage": {"actions": [], "product": {
        "id": pid, "title": f"T{pid}", "rating": 5, "feedbackQuantity": 1,
        "minSellPrice": 100, "minFullPrice": 200,
        "category": {"id": turkum, "title": "K"},
        "shop": {"id": 3, "title": "D", "official": False, "ordersQuantity": 10},
        "skuList": [{"id": pid * 10, "availableAmount": qoldiq, "sellPrice": 100, "weight": 300}],
    }}}}


JAVOB_YOQ = {"errors": [{"message": "path '/productPage/product' declared as non-null"}]}


def uzum(javoblar: dict[int, object]) -> tuple[httpx.Client, list[int]]:
    """Soxta Uzum: id -> javob (dict — 200 JSON, int — HTTP holati). So'ralganlar yoziladi."""
    soralgan: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        pid = json.loads(request.content)["variables"]["id"]
        soralgan.append(pid)
        j = javoblar[pid]
        if isinstance(j, int):
            return httpx.Response(j)
        return httpx.Response(200, json=j)

    return httpx.Client(transport=httpx.MockTransport(handler)), soralgan


def slot(eski: int, *ids: int, turkum: int = 100) -> dict:
    return {"eski": eski, "turkum": turkum, "bolak": 1, "nomzodlar": [{"id": i, "xaridor": 50} for i in ids]}


def test_sotuvdagi_birinchi_nomzod_juft_tugagani_rad():
    c, soralgan = uzum({11: tovar(11), 21: tovar(21, qoldiq=0), 22: tovar(22)})
    h = almashtir({"olik_jami": 2, "slotlar": [slot(1, 11, 12), slot(2, 21, 22)]},
                  client=c, tokens=tokens(), uxla=UXLAMA)
    assert h.juftlar == [{"eski": 1, "yangi": 11, "xaridor": 50}, {"eski": 2, "yangi": 22, "xaridor": 50}]
    assert h.rad == [21]
    # Juft topilgach qolgan nomzod so'ralmaydi (12) — Uzumga ortiqcha so'rov yo'q.
    assert soralgan == [11, 21, 22]
    assert h.olik == 2 and h.slotlar == 2


def test_turkumi_boshqa_yoki_uzumda_yoq_rad():
    c, _ = uzum({11: tovar(11, turkum=999), 12: JAVOB_YOQ, 13: tovar(13)})
    h = almashtir({"slotlar": [slot(1, 11, 12, 13)]}, client=c, tokens=tokens(), uxla=UXLAMA)
    assert h.rad == [11, 12]
    assert [j["yangi"] for j in h.juftlar] == [13]


def test_TARMOQ_XATOSI_RAD_EMAS():
    """500/429 — tovar aybdor emas: rad ro'yxatiga tushsa, sotuvdagi tovar 14 kun taklif qilinmasdi."""
    c, _ = uzum({11: 500, 12: 429, 13: tovar(13)})
    h = almashtir({"slotlar": [slot(1, 11, 12, 13)]}, client=c, tokens=tokens(), uxla=UXLAMA)
    assert h.rad == []
    assert h.xatolar == 2
    assert [j["yangi"] for j in h.juftlar] == [13]


def test_bir_nomzod_bir_marta_soraladi_va_bir_marta_juft():
    c, soralgan = uzum({11: tovar(11), 12: tovar(12), 21: tovar(21, qoldiq=0)})
    h = almashtir({"slotlar": [slot(1, 21, 11), slot(2, 21, 11, 12)]}, client=c, tokens=tokens(), uxla=UXLAMA)
    assert soralgan == [21, 11, 12]
    assert [(j["eski"], j["yangi"]) for j in h.juftlar] == [(1, 11), (2, 12)]
    assert h.rad == [21]


def test_sorov_byudjeti():
    c, soralgan = uzum({i: tovar(i, qoldiq=0) for i in range(10, 20)})
    h = almashtir({"slotlar": [slot(1, *range(10, 15)), slot(2, *range(15, 20))]},
                  client=c, tokens=tokens(), max_sorov=3, uxla=UXLAMA)
    assert len(soralgan) == 3
    assert h.sorovlar == 3
    assert h.juftlar == []


def test_VAQT_TUGASA_TOXTAYDI_TOPILGANI_QOLADI():
    """Uzum sekinlatsa — vaqt tugaydi; «O'lchash» ga vaqt qolsin, topilgan juftlar yo'qolmasin."""
    c, soralgan = uzum({11: tovar(11), 21: tovar(21, qoldiq=0), 22: tovar(22)})
    vaqt = iter([0.0, 10.0, 70.0, 130.0])  # boshlanish, 1-so'rov, 2-so'rov oldidan; chegara 1 daqiqa
    h = almashtir({"slotlar": [slot(1, 11), slot(2, 21, 22)]}, client=c, tokens=tokens(),
                  max_daqiqa=1.0, uxla=UXLAMA, soat=lambda: next(vaqt))
    assert h.vaqt_tugadi is True
    assert soralgan == [11]
    assert [j["yangi"] for j in h.juftlar] == [11]


def test_token_olsa_yangilab_osha_id_qayta_soraladi():
    holat = {"marta": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        holat["marta"] += 1
        if holat["marta"] == 1:
            return httpx.Response(401)
        return httpx.Response(200, json=tovar(11))

    tp = tokens()
    yangilandi = []
    tp.invalidate = lambda: yangilandi.append(1)  # type: ignore[method-assign]
    h = almashtir({"slotlar": [slot(1, 11)]}, client=httpx.Client(transport=httpx.MockTransport(handler)),
                  tokens=tp, uxla=UXLAMA)
    assert yangilandi == [1]
    assert [j["yangi"] for j in h.juftlar] == [11]


def test_kop_xato_kill_switch():
    c, soralgan = uzum({i: 500 for i in range(100)})
    h = almashtir({"slotlar": [slot(1, *range(100))]}, client=c, tokens=tokens(), uxla=UXLAMA)
    assert h.toxtadi is not None
    assert len(soralgan) < 100


def test_KECHIKISH_QOLLANADI():
    """Hurmat rejimi: har so'rovdan keyin kutiladi (sweep dagidek)."""
    kutildi: list[float] = []
    c, _ = uzum({11: tovar(11, qoldiq=0), 12: tovar(12)})
    almashtir({"slotlar": [slot(1, 11, 12)]}, client=c, tokens=tokens(),
              limits=Limits(per_second=4.0), uxla=kutildi.append)
    assert kutildi == [0.25, 0.25]


def test_store_nomzodlar_va_almashtir():
    sorovlar: list[tuple[str, dict]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        nom = request.url.path.rsplit("/", 1)[-1]
        sorovlar.append((nom, json.loads(request.content)))
        if nom == "so_almashtir_nomzodlari":
            return httpx.Response(200, json={"slotlar": [], "olik_jami": 0})
        return httpx.Response(200, json={"qoshildi": 1, "ochirildi": 1, "rad": 1, "faol": 6000})

    s = Store(url="https://sinov", service_key="MAXFIY")
    c = httpx.Client(transport=httpx.MockTransport(handler))
    assert s.almashtir_nomzodlari(c, kun=14) == {"slotlar": [], "olik_jami": 0}
    assert s.almashtir(c, [{"eski": 1, "yangi": 2, "xaridor": 5}], [3])["faol"] == 6000
    assert sorovlar == [("so_almashtir_nomzodlari", {"p_kun": 14}),
                        ("so_almashtir", {"p_juftlar": [{"eski": 1, "yangi": 2, "xaridor": 5}], "p_rad": [3]})]


def test_store_kutilmagan_javob_xato():
    s = Store(url="https://sinov", service_key="MAXFIY")
    c = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(200, json=[1, 2])))
    with pytest.raises(StoreError):
        s.almashtir_nomzodlari(c)
    with pytest.raises(StoreError):
        s.almashtir(c, [], [])


def test_cli_sirsiz_xato_kodi(monkeypatch, capsys):
    """`python -m selleros_scraper almashtir` — sir yo'q bo'lsa jim o'tib ketmaydi."""
    from selleros_scraper.__main__ import main as bosh_main

    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    assert bosh_main(["almashtir"]) == 2
    assert "SUPABASE_URL" in capsys.readouterr().err
    assert main(["--quruq"]) == 2
