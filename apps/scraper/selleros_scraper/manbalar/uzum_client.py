"""Uzumga so'rov yuborish qatlami.

Bu yerdagi asosiy qaror: NIMANI xato deb hisoblash.

O'lchandi — mavjud bo'lmagan id GraphQL `errors` bilan qaytadi:

    The field at path '/productPage/product' was declared as non-null
    but the value ... is null

Bu XATO EMAS, bu JAVOB: "bunday mahsulot yo'q". Id fazosining ~70% i
bo'sh va agar ularning har biri xato deb sanalsa, xato darajasi 70% ga
chiqadi va kill-switch bekordan yig'ishni to'xtatadi.

Haqiqiy xato — 429 (juda tez), 401 (token o'ldi), tarmoq uzilishi.
Ular alohida ajratiladi, chunki javobi ham boshqacha: birinchisida
sekinlashamiz, ikkinchisida token yangilaymiz, uchinchisida qayta
urinamiz.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any

import httpx

from .uzum import PRODUCT_QUERY, PRODUCT_QUERY_STOK, Kuzatuv, parse

ENDPOINT = "https://graphql.uzum.uz/"


class Natija(Enum):
    """So'rov nima bilan tugadi."""

    TOPILDI = "topildi"
    #: Mahsulot yo'q. Bu javob, xato emas — xato darajasiga qo'shilmaydi.
    YOQ = "yo'q"
    #: Juda tez so'radik. Sekinlashish kerak.
    TEZ = "tez"
    #: Token o'ldi. Yangilash kerak.
    TOKEN = "token"
    #: Tarmoq yoki kutilmagan javob. Qayta urinish mumkin.
    XATO = "xato"


@dataclass(frozen=True)
class Javob:
    natija: Natija
    kuzatuv: Kuzatuv | None = None
    tafsilot: str = ""

    @property
    def xato_hisoblanadimi(self) -> bool:
        """Kill-switch va sifat hisobotiga kiradimi.

        `YOQ` kirmaydi: bo'sh id — kutilgan holat. Agar kirsa, xato
        darajasi 70% ga chiqib yig'ish bekorga to'xtardi.
        """
        return self.natija in (Natija.TEZ, Natija.TOKEN, Natija.XATO)


def _yoq_deganimi(errors: list[dict[str, Any]]) -> bool:
    """GraphQL xatosi aslida "mahsulot yo'q" deganimi."""
    matn = str(errors)
    return "productPage/product" in matn or "non-null" in matn


def _tez_deganimi(errors: list[dict[str, Any]]) -> bool:
    matn = str(errors).lower()
    return "429" in matn or "too many" in matn


def sorov(
    client: httpx.Client,
    headers: dict[str, str],
    product_id: int,
    *,
    stok: bool = False,
) -> Javob:
    """Bitta mahsulotni so'raydi va javobni turkumlaydi.

    `stok=True` og'ir so'rovni yuboradi — u `skuList` ni ham oladi va
    qoldiq shundan chiqadi. Javob ~16 barobar shishadi (0,4 KB → 5,0
    KB), shuning uchun standart qiymat `False`: og'ir so'rov faqat
    TANLANGAN tovarlarga beriladi.

    Standart `False` bo'lgani bir vaqtlar jimgina zarar keltirgan:
    `PRODUCT_QUERY_STOK` yozilgan, lekin hech qayerdan chaqirilmagan
    edi. Natijada `stock` HAR DOIM `None` bo'lgan va sotuv baholash
    (`prev_stock − stock`) ishlay olmasdi — chunki farqni hisoblash
    uchun ikkita `None` dan boshqa narsa yo'q edi.
    """
    try:
        response = client.post(
            ENDPOINT,
            json={
                "query": PRODUCT_QUERY_STOK if stok else PRODUCT_QUERY,
                "variables": {"id": product_id},
            },
            headers=headers,
        )
    except httpx.HTTPError as exc:
        return Javob(Natija.XATO, tafsilot=str(exc)[:120])

    if response.status_code == 401:
        return Javob(Natija.TOKEN)
    if response.status_code == 429:
        return Javob(Natija.TEZ)
    if response.status_code != 200:
        return Javob(Natija.XATO, tafsilot=f"HTTP {response.status_code}")

    try:
        body = response.json()
    except ValueError:
        return Javob(Natija.XATO, tafsilot="JSON emas")

    if errors := body.get("errors"):
        if _tez_deganimi(errors):
            return Javob(Natija.TEZ)
        if _yoq_deganimi(errors):
            return Javob(Natija.YOQ)
        return Javob(Natija.XATO, tafsilot=str(errors)[:120])

    kuzatuv = parse((body.get("data") or {}).get("productPage"))
    if kuzatuv is None:
        return Javob(Natija.YOQ)
    return Javob(Natija.TOPILDI, kuzatuv=kuzatuv)
