"""Turkum hajmi — Uzumning OʻZI aytgan tovarlar soni.

NEGA KERAK. Perepisdagi turkum boʻyicha tovar soni Uzumdagi
jonli son bilan bir xil EMAS va farq bir tomonlama ham emas.
Oʻlchandi (2026-08-26, 20 ta turkum):

    turkum                bizda    Uzumda    nisbat
    Smartfonlar Android   12 472     2 442     511%
    Shampunlar             9 276     3 202     290%
    Simsiz quloqchinlar   19 070     9 133     209%
    Qoplamalar            19 796    31 776      62%
    Soat                  12 883    17 660      73%

Ikki xil narsa sanaladi:

  * `zumsavdo.product` — id fazosi boʻylab yurib TOPILGAN hamma
    tovar, bir necha oʻtish davomida toʻplangan. Roʻyxatdan
    olingan tovar ham ichida qoladi.
  * Uzumning `total` — HOZIR shu turkumda koʻrinadigan tovarlar.

Xaridor ikkinchisini koʻradi, sotuvchi ikkinchisi bilan
raqobatlashadi. Shuning uchun "raqobat qanchalik zich" degan
savolga Uzumning oʻz soni toʻgʻriroq javob beradi.

BU SONNI PEREPIS OʻRNIGA QOʻYMAYMIZ. Ikkalasi ham saqlanadi:
farqning oʻzi qamrov qorovuli — biz Uzumda bor tovarni
koʻrmayotgan boʻlsak (Qoplamalar 62%), buni bilishimiz kerak.

SOʻROV RETSEPTI. `search-gateway` oddiy soʻrovga 429 qaytaradi.
Ishlaydigan shakl 2026-08-26 da oʻlchandi:

  1. avval `GET https://uzum.uz/` — `_yasc` cookie olinadi
     (javob 307 boʻlsa ham cookie keladi);
  2. oʻsha `httpx.Client` bilan GraphQL soʻrovi;
  3. `apollographql-client-name: web-customer` sarlavhasi;
  4. `pagination.limit` NOL EMAS (24 ishlaydi).

Qaysi biri hal qilgani ajratilmadi. 30 ta ketma-ket soʻrovda
bitta ham 429 kelmadi.
"""

from __future__ import annotations

from dataclasses import dataclass

import httpx

ENDPOINT = "https://graphql.uzum.uz/"
SAYT = "https://uzum.uz/"

QUERY = """
query selleroaTurkumHajmi($q: MakeSearchQueryInput!) {
  makeSearch(query: $q) {
    total
    items { catalogCard { productId } }
  }
}
"""


@dataclass(frozen=True)
class Hajm:
    category_id: int
    #: `None` — oʻlchanmadi. NOL EMAS: nol "turkum boʻsh" degan javob.
    total: int | None
    #: Birinchi sahifadagi noyob tovar IDlar / jami natijalar.
    #: `total` variant-inflated — shu nisbat tuzatadi.
    noyob_nisbat: float | None = None
    sabab: str = ""


def cookie_ol(client: httpx.Client, user_agent: str) -> None:
    """Saytdan `_yasc` cookie sini oladi.

    Javob 307 boʻladi va bu KUTILGAN: bizga sahifa emas, cookie
    kerak. Xato boʻlsa ham toʻxtamaymiz — soʻrov baribir
    sinaladi va natijasi koʻrinadi.
    """
    try:
        client.get(SAYT, headers={"User-Agent": user_agent, "Accept": "text/html,*/*"})
    except httpx.HTTPError:
        pass


def sarlavhalar(asosiy: dict[str, str]) -> dict[str, str]:
    """Token sarlavhalariga qidiruv uchun kerakli qoʻshimchalar."""
    return asosiy | {
        "Accept": "*/*",
        "apollographql-client-name": "web-customer",
    }


def sorov(
    client: httpx.Client,
    headers: dict[str, str],
    category_id: int,
) -> Hajm:
    """Bitta turkumning hajmini soʻraydi.

    Xatoni YASHIRMAYDI: 429 ham, boshqa xato ham sababi bilan
    qaytadi va chaqiruvchi nima qilishni oʻzi hal qiladi.
    """
    tana = {
        "query": QUERY,
        "variables": {"q": {
            "categoryId": str(category_id),
            "showAdultContent": "NONE",
            "filters": [],
            "sort": "BY_RELEVANCE_DESC",
            # NOL EMAS — yuqoridagi retseptga qarang.
            "pagination": {"offset": 0, "limit": 24},
        }},
    }
    try:
        r = client.post(ENDPOINT, json=tana, headers=headers)
    except httpx.HTTPError as exc:
        return Hajm(category_id, None, sabab=f"tarmoq: {str(exc)[:80]}")

    if r.status_code != 200:
        return Hajm(category_id, None, sabab=f"HTTP {r.status_code}")
    try:
        body = r.json()
    except ValueError:
        return Hajm(category_id, None, sabab="JSON emas")

    if errors := body.get("errors"):
        matn = str(errors)
        if "429" in matn:
            return Hajm(category_id, None, sabab="429")
        return Hajm(category_id, None, sabab=matn[:80])

    ms = (body.get("data") or {}).get("makeSearch")
    if ms is None or ms.get("total") is None:
        return Hajm(category_id, None, sabab="total yoʻq")
    total = int(ms["total"])

    noyob_nisbat = _noyob_nisbat(ms)
    return Hajm(category_id, total, noyob_nisbat=noyob_nisbat)


def _noyob_nisbat(ms: dict) -> float | None:
    """Birinchi sahifadagi noyob productId / jami natijalar."""
    try:
        items = ms["items"]
    except (KeyError, TypeError):
        return None
    if not items:
        return None
    idlar = []
    for item in items:
        pid = (item.get("catalogCard") or {}).get("productId")
        if pid is not None:
            idlar.append(pid)
    if not idlar:
        return None
    return len(set(idlar)) / len(idlar)
