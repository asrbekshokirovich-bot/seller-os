"""Yig'uvchi tsikli.

Token, so'rov, hurmat rejimi va yozishni bir joyga bog'laydi.

Ikki narsa ataylab shunday qilingan:

1. XATO DARAJASI faqat HAQIQIY xatolardan hisoblanadi. Bo'sh id
   (`Natija.YOQ`) kirmaydi — id fazosining ~70% i bo'sh va agar ular
   sanalsa kill-switch bekordan ishga tushardi.

2. PARTIYALAB yoziladi, har id dan keyin emas. Bitta so'rov 500 ta
   o'lchovni yozadi; har biriga alohida so'rov yuborilsa, yozish
   yig'ishdan sekinroq bo'lib qolardi.

3. KECHIKISH HAQIQATAN QO'LLANADI. Bir vaqtlar `next_delay()` chaqirilib,
   qaytargan qiymati tashlab yuborilgan edi — ya'ni kill-switch ishlagan
   (u istisno tashlaydi), sekinlashish esa umuman ishlamagan va so'rovlar
   tsikl qanchalik tez aylansa shunchalik tez ketgan. QOIDALAR.md §7
   talab qiladigan hurmat rejimi shu sababli faqat qog'ozda bo'lgan.
   Uyqu funksiyasi tashqaridan berilishi mumkin — test uni almashtiradi,
   aks holda tekshirish uchun rostdan kutish kerak bo'lardi.
"""

from __future__ import annotations

import time
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from datetime import datetime, timezone

import httpx

from .hurmat import KillSwitch, Limits, Proksilar, next_delay
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
    #: Proksi holati. To'xtagan manzil hisobotda KO'RINADI —
    #: aks holda u jimgina yiqilib, yig'ish sekinlashardi.
    proksi: dict | None = None
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
    stok: bool = False,
    uxla: Callable[[float], None] = time.sleep,
    proksilar: Proksilar | None = None,
    mijoz_yasa: Callable[[str], httpx.Client] | None = None,
) -> Hisobot:
    """Berilgan id lar bo'yicha bir aylanish.

    `store=None` — quruq yurish: yig'iladi, lekin yozilmaydi. Sinov
    uchun kerak, chunki bazaga to'qilgan ma'lumot yozish taqiqlangan.

    `stok=True` og'ir so'rovni yuboradi va qoldiqni ham oladi. U
    javobni ~16 barobar shishirgani uchun standart qiymat `False`.
    """
    limits = limits or Limits()
    proksilar = proksilar or Proksilar()
    hisobot = Hisobot()
    partiya: list[dict] = []
    sweep_id = store.sweep_ochish(client) if store else None

    # Har proksi uchun alohida mijoz — httpx da proksi mijozga
    # bog'lanadi, so'rovga emas.
    #
    # BAZAGA YOZISH proksidan O'TMAYDI: `client` o'zgarmaydi va
    # `store` o'shani ishlatadi. Proksi Uzumga chiqish uchun, o'z
    # bazamizga emas.
    mijozlar: dict[str, httpx.Client] = {}

    def _mijoz_yasa(manzil: str) -> httpx.Client:
        if mijoz_yasa is not None:
            return mijoz_yasa(manzil)
        return httpx.Client(timeout=limits.timeout_s, proxy=manzil)

    def uzum_mijozi(manzil: str | None) -> httpx.Client:
        if manzil is None:
            return client
        if manzil not in mijozlar:
            mijozlar[manzil] = _mijoz_yasa(manzil)
        return mijozlar[manzil]

    def yuborish() -> None:
        if store and partiya:
            natija = store.yoz(client, partiya)
            for kalit, qiymat in natija.items():
                hisobot.yozildi[kalit] = hisobot.yozildi.get(kalit, 0) + qiymat
        partiya.clear()

    token = tokens.get(client)
    for pid in ids:
        hisobot.sorovlar += 1
        manzil = proksilar.keyingi()
        c = uzum_mijozi(manzil)
        javob = sorov(c, tokens.headers(token), pid, stok=stok)

        if javob.natija is Natija.TOKEN:
            # Token o'ldi — yangilaymiz va SHU id ni qayta so'raymiz.
            tokens.invalidate()
            token = tokens.get(client)
            javob = sorov(c, tokens.headers(token), pid, stok=stok)

        # Tarmoq xatosi proksining aybi bo'lishi mumkin; "tovar
        # yo'q" esa emas — u to'g'ri javob.
        if javob.natija in (Natija.XATO, Natija.TEZ):
            proksilar.xato(manzil)
        elif javob.natija is not Natija.TOKEN:
            proksilar.yaxshi(manzil)

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
            kechikish = next_delay(limits, hisobot.xato_darajasi, hisobot.sorovlar)
        except KillSwitch as toxtash:
            hisobot.toxtadi = str(toxtash)
            break
        if kechikish > 0:
            uxla(kechikish)

    yuborish()
    for m in mijozlar.values():
        m.close()
    hisobot.proksi = proksilar.holat()
    if store and sweep_id is not None:
        store.sweep_yopish(client, sweep_id, hisobot)
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
        # Og'ir so'rovda qoldiq keladi, yengilida `None` qoladi.
        # `None` va 0 ATAYLAB farqlanadi: 0 "tovar tugagan", `None`
        # "o'lchanmagan". Sotuv baholash faqat o'lchanganlarni sanaydi.
        "stock": k.stock,
        "reviews": k.reviews,
        "rating": k.rating,
        "buyers_per_week": k.buyers_per_week,
        # Og'irlik 7-tuzoq (og'ir tovar) uchun. `skuList` dan keladi,
        # ya'ni faqat og'ir so'rovda (`--stok`).
        #
        # 2026-08-25 gacha bu maydon YUBORILMASDI: uzum.py uni ajratib
        # olardi, `Kuzatuv.weight_g` da saqlardi va shu yerda tashlab
        # ketilardi. Natijada `product.weight_g` ustuni 0001-migratsiyadan
        # beri bo'sh turgan va 7-tuzoq umuman ishlay olmasdi.
        "weight_g": k.weight_g,
        # Uzumning o'z "katta hajmli" belgisi. Og'irlikdan farqli
        # o'laroq u YENGIL so'rovda ham keladi, ya'ni og'irligi
        # yo'q tovarlar uchun ham 7-tuzoq baholanadi.
        "oversized": k.oversized,
        "observed_at": _hozir(),
    }
