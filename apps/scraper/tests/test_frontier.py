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
