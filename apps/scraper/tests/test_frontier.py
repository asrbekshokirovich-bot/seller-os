"""Frontier zondi testlari.

Binary-search mantiqini tekshiradi: mavjud id lar orasidan eng
kattasini to'g'ri topishi kerak.
"""

import json
import time

import httpx

from selleros_scraper.frontier import frontier_top
from selleros_scraper.token import TokenProvider


def javob_ok(pid: int) -> dict:
    return {
        "data": {
            "productPage": {
                "actions": [],
                "product": {
                    "id": pid, "title": f"T{pid}", "rating": 5, "feedbackQuantity": 1,
                    "minSellPrice": 100, "minFullPrice": 200,
                    "category": {"id": 2, "title": "K"},
                    "shop": {"id": 3, "title": "D", "official": True, "ordersQuantity": 10},
                },
            }
        }
    }


JAVOB_YOQ = {"errors": [{"message": "path '/productPage/product' declared as non-null"}]}


class FakeTokens:
    def get(self, _client: httpx.Client) -> str:
        return "fake-token"

    def headers(self, token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _transport(chegarasi: int) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        pid = json.loads(request.content)["variables"]["id"]
        if pid <= chegarasi:
            return httpx.Response(200, json=javob_ok(pid))
        return httpx.Response(200, json=JAVOB_YOQ)
    return httpx.MockTransport(handler)


def test_frontier_aniq_topadi(monkeypatch):
    """Binary-search 3_200_000 ni topishi kerak (±1)."""
    monkeypatch.setattr(time, "sleep", lambda _: None)

    chegarasi = 3_200_000
    tokens = FakeTokens()
    with httpx.Client(transport=_transport(chegarasi)) as client:
        max_id, qadamlar = frontier_top(
            client, tokens,
            boshlangich_past=2_500_000,
            boshlangich_baland=5_000_000,
            rps=100.0,
        )

    assert max_id == chegarasi
    assert qadamlar <= 25


def test_frontier_exponential_probe(monkeypatch):
    """Agar baland ham mavjud bo'lsa, exponential probe ishlashi kerak."""
    monkeypatch.setattr(time, "sleep", lambda _: None)

    chegarasi = 12_000_000
    tokens = FakeTokens()
    with httpx.Client(transport=_transport(chegarasi)) as client:
        max_id, qadamlar = frontier_top(
            client, tokens,
            boshlangich_past=2_500_000,
            boshlangich_baland=5_000_000,
            rps=100.0,
        )

    assert max_id == chegarasi
    assert qadamlar <= 25


def test_frontier_kichik_oraliq(monkeypatch):
    """Kichik oraliqda ham to'g'ri ishlashi kerak."""
    monkeypatch.setattr(time, "sleep", lambda _: None)

    chegarasi = 100
    tokens = FakeTokens()
    with httpx.Client(transport=_transport(chegarasi)) as client:
        max_id, qadamlar = frontier_top(
            client, tokens,
            boshlangich_past=50,
            boshlangich_baland=200,
            rps=100.0,
        )

    assert max_id == chegarasi
    assert qadamlar <= 25


# ------------------------------------------------ bazaga yozish yo'li


class FakeStore:
    """`Store` o'rniga: qaysi RPC chaqirilganini eslab qoladi."""

    platform = "uzum"

    def __init__(self, javob):
        self.javob = javob
        self.chaqiruvlar: list[tuple[str, dict]] = []

    def frontier_yoz(self, client, max_id, steps):
        from selleros_scraper.store import Store
        # Haqiqiy metodni ishlatamiz — tekshirilayotgan narsa aynan
        # uning ichidagi RPC NOMI.
        return Store.frontier_yoz(self, client, max_id, steps)

    def _rpc(self, client, nomi, args):
        self.chaqiruvlar.append((nomi, args))
        return self.javob


def test_frontier_public_uchni_chaqiradi():
    """`so_frontier_yoz`, `frontier_yoz` EMAS.

    Ish `selleros.frontier_yoz` da qoladi, lekin PostgREST faqat
    `public` ni ko'radi. Sxemasiz nom `public.frontier_yoz` ni
    qidiradi va topmaydi — zond aynan shu sababdan hech qachon
    yoza olmagan va `selleros.id_frontier` 0 qator bo'lib turgan
    (0051-migratsiya).
    """
    store = FakeStore({"sana": "2026-09-02", "max_id": 3285215, "qadamlar": 23})
    natija = store.frontier_yoz(None, 3285215, 23)

    nomi, args = store.chaqiruvlar[0]
    assert nomi == "so_frontier_yoz"
    assert args == {"p_platform": "uzum", "p_max_id": 3285215, "p_steps": 23}
    assert natija["max_id"] == 3285215


def test_frontier_baza_javobini_qaytaradi():
    """Bazada `greatest(...)` bor — qaytgan qiymat yuborilganidan
    farq qilishi mumkin va chaqiruvchi AYNAN o'shanga qarashi kerak.

    Kun ichida ikkinchi o'lchov birinchisidan kichik chiqsa (Uzum
    javob bermay qolsa binary-search pastroq to'xtaydi), bazada
    kattasi qoladi.
    """
    store = FakeStore({"sana": "2026-09-02", "max_id": 3285215, "qadamlar": 20})
    natija = store.frontier_yoz(None, 3_000_000, 20)
    assert natija["max_id"] == 3285215, "baza qiymati emas, yuborilgani qaytdi"


def test_frontier_kutilmagan_javob_xato():
    """Nol qator "frontier yo'q" degani emas — "yozilmadi" degani.

    RPC ro'yxat yoki `None` qaytarsa jimgina o'tib ketmasligi kerak:
    aks holda workflow yashil bo'lib, jadval bo'sh qolardi.
    """
    import pytest
    from selleros_scraper.store import StoreError

    for yomon in (None, [], "ok"):
        store = FakeStore(yomon)
        with pytest.raises(StoreError):
            store.frontier_yoz(None, 3285215, 23)
