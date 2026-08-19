"""Yig'uvchi tsikli.

Token, so'rov, hurmat rejimi va yozishni bir joyga bog'laydi.

Ikki narsa ataylab shunday qilingan:

1. XATO DARAJASI faqat HAQIQIY xatolardan hisoblanadi. Bo'sh id
   (`Natija.YOQ`) kirmaydi — id fazosining ~70% i bo'sh va agar ular
   sanalsa kill-switch bekordan ishga tushardi.

2. PARTIYALAB yoziladi, har id dan keyin emas. Bitta so'rov 500 ta
   o'lchovni yozadi; har biriga alohida so'rov yuborilsa, yozish
   yig'ishdan sekinroq bo'lib qolardi.
"""

from __future__ import annotations

from collections.abc import Iterable, Iterator
from dataclasses import dataclass, field
from datetime import datetime, timezone

import httpx

from .hurmat import KillSwitch, Limits, next_delay
from .manbalar.uzum_client import Javob, Natija, sorov
from .store import Store
from .token import TokenProvider

#: Nechta o'lchov to'plangach bazaga yoziladi.
PARTIYA = 500


@dataclass
class Hisobot:
    """Sweep natijasi — sifat paneli shundan o'qiydi."""

    sorovlar: int = 0
    topildi: int = 0
    yoq: int = 0
    xatolar: int = 0
    yozildi: dict[str, int] = field(default_factory=dict)
    toxtadi: str | None = None

    @property
    def xato_darajasi(self) -> float:
        """Bo'sh id XATO EMAS — u maxrajga ham, suratga ham kirmaydi."""
        tekshirilgan = self.topildi + self.xatolar
        return self.xatolar / tekshirilgan if tekshirilgan else 0.0

    @property
    def qamrov(self) -> float:
        return self.topildi / self.sorovlar if self.sorovlar else 0.0


def _hozir() -> str:
    return datetime.now(timezone.utc).isoformat()


def sweep(
    ids: Iterable[int],
    *,
    client: httpx.Client,
    tokens: TokenProvider,
    store: Store | None,
    limits: Limits | None = None,
) -> Hisobot:
    """Berilgan id lar bo'yicha bir aylanish.

    `store=None` — quruq yurish: yig'iladi, lekin yozilmaydi. Sinov
    uchun kerak, chunki bazaga to'qilgan ma'lumot yozish taqiqlangan.
    """
    limits = limits or Limits()
    hisobot = Hisobot()
    partiya: list[dict] = []

    def yuborish() -> None:
        if store and partiya:
            natija = store.yoz(client, partiya)
            for kalit, qiymat in natija.items():
                hisobot.yozildi[kalit] = hisobot.yozildi.get(kalit, 0) + qiymat
        partiya.clear()

    token = tokens.get(client)
    for pid in ids:
        hisobot.sorovlar += 1
        javob = sorov(client, tokens.headers(token), pid)

        if javob.natija is Natija.TOKEN:
            # Token o'ldi — yangilaymiz va SHU id ni qayta so'raymiz.
            tokens.invalidate()
            token = tokens.get(client)
            javob = sorov(client, tokens.headers(token), pid)

        if javob.natija is Natija.TOPILDI and javob.kuzatuv:
            hisobot.topildi += 1
            partiya.append(_qatorga(javob))
            if len(partiya) >= PARTIYA:
                yuborish()
        elif javob.natija is Natija.YOQ:
            hisobot.yoq += 1
        else:
            hisobot.xatolar += 1

        try:
            next_delay(limits, hisobot.xato_darajasi)
        except KillSwitch as toxtash:
            hisobot.toxtadi = str(toxtash)
            break

    yuborish()
    return hisobot


def _qatorga(javob: Javob) -> dict:
    k = javob.kuzatuv
    assert k is not None
    return {
        "external_id": k.external_id,
        "title": k.title,
        "shop_external_id": k.shop_external_id,
        "shop_name": k.shop_name,
        "shop_official": k.shop_official,
        "category_external_id": k.category_external_id,
        "category_name": k.category_name,
        "price": k.price,
        "stock": None,  # yengil so'rovda qoldiq yo'q — 2-qatlamda olinadi
        "reviews": k.reviews,
        "rating": k.rating,
        "buyers_per_week": k.buyers_per_week,
        "observed_at": _hozir(),
    }
