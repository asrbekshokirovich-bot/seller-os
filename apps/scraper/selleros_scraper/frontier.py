"""Frontier zondi — Uzumdagi eng katta mahsulot id sini topadi.

Binary-search: `past` (javob beradi) va `baland` (javob bermaydi)
orasini toraytirib boradi. Id fazosining ~70% i bo'sh, shuning uchun
oxirgi MAVJUD id ni topish — ENG KATTA JAVOB BERUVCHI id ni topish.

Natija `selleros.id_frontier` ga yoziladi (0043-migratsiya). 30+ kun
to'plangach `id_yoshi()` statik jadvaldan dinamik regressiyaga
o'tadi.

Hurmat rejimi (QOIDALAR.md §7): binary-search 25 dan ortiq so'rov
yubormaydi (2^25 > 33 million — Uzum id fazosidan katta). Har
so'rov orasida 1/rps kutiladi.

Ishlatish (skreyper ichidan):
    python -m selleros_scraper frontier

Yoki to'g'ridan-to'g'ri:
    python -m selleros_scraper.frontier
"""

from __future__ import annotations

import sys
import time

import httpx

from .manbalar.uzum_client import Natija, sorov
from .store import Store
from .token import TokenProvider

MAX_QADAMLAR = 25


class FrontierXato(RuntimeError):
    """Zond javob o'rniga xato oldi — natija ishonchsiz, bazaga yozilmaydi."""


def mavjudmi(
    client: httpx.Client, headers: dict[str, str], pid: int
) -> bool:
    """`True` — mahsulot bor, `False` — Uzum "yo'q" dedi.

    Boshqa har qanday natija (429, 401, 403, tarmoq, 5xx) "yo'q" EMAS —
    `FrontierXato`. 2026-11-12..13: Uzum (Cloudflare) GitHub IP laridan
    har so'rovga HTTP 403 qaytardi; eski kod uni "yo'q" deb o'qib,
    binary-search boshlang'ich chegaraga (2 500 000) tushdi va shu son
    `selleros.id_frontier` ga yozildi (haqiqiysi ~3,63 mln edi).
    """
    javob = sorov(client, headers, pid)
    if javob.natija == Natija.TOPILDI:
        return True
    if javob.natija == Natija.YOQ:
        return False
    tafsilot = f" ({javob.tafsilot})" if javob.tafsilot else ""
    raise FrontierXato(f"id {pid}: {javob.natija.value}{tafsilot}")


def frontier_top(
    client: httpx.Client,
    tokens: TokenProvider,
    *,
    boshlangich_past: int = 2_500_000,
    boshlangich_baland: int = 5_000_000,
    rps: float = 3.0,
) -> tuple[int, int]:
    """Eng katta javob beruvchi id ni binary-search bilan topadi.

    Qaytaradi: (max_id, qadamlar_soni).

    Birinchi qadam: `baland` haqiqatan javob bermaydimi tekshirish.
    Agar bersa — oraliqni ikki barobar oshirib borish (exponential
    probe). Keyin binary-search.
    """
    oraliq = 1.0 / rps
    token = tokens.get(client)
    hdrs = tokens.headers(token)
    qadamlar = 0

    past = boshlangich_past
    baland = boshlangich_baland

    # Exponential probe: baland haqiqatan javob bermaydiganini aniqlash.
    while qadamlar < MAX_QADAMLAR:
        time.sleep(oraliq)
        qadamlar += 1
        if not mavjudmi(client, hdrs, baland):
            break
        past = baland
        baland *= 2
    else:
        return past, qadamlar

    # Binary-search: past (bor) va baland (yo'q) orasini toraytirish.
    while baland - past > 1 and qadamlar < MAX_QADAMLAR:
        orta = (past + baland) // 2
        time.sleep(oraliq)
        qadamlar += 1

        # Token yangilanishi kerakmi.
        token = tokens.get(client)
        hdrs = tokens.headers(token)

        if mavjudmi(client, hdrs, orta):
            past = orta
        else:
            baland = orta

    # Hech bir zond "bor" demagan bo'lsa, `past` — bizning taxminimiz,
    # o'lchov emas. Uni frontier deb yozish — raqam to'qish.
    if past == boshlangich_past:
        raise FrontierXato(
            f"{boshlangich_past} dan yuqori birorta ham id topilmadi — natija ishonchsiz"
        )

    return past, qadamlar


def main(argv: list[str] | None = None) -> int:
    import argparse
    import json
    import os
    import uuid

    from .hurmat import Limits

    p = argparse.ArgumentParser(
        prog="selleros_scraper frontier",
        description="Uzumdagi eng katta mahsulot id sini topadi.",
    )
    p.add_argument("--quruq", action="store_true", help="Bazaga yozmaydi.")
    p.add_argument("--rps", type=float, default=Limits.per_second,
                   help=f"So'rov/soniya (standart {Limits.per_second}).")
    p.add_argument("--past", type=int, default=2_500_000,
                   help="Qidiruv boshi (standart 2 500 000).")
    p.add_argument("--baland", type=int, default=5_000_000,
                   help="Qidiruv yuqorisi (standart 5 000 000).")
    args = p.parse_args(argv)

    UA = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    )
    tokens = TokenProvider(user_agent=UA, installation_id=str(uuid.uuid4()))

    store: Store | None = None
    if not args.quruq:
        from .store import StoreError
        try:
            store = Store.env_dan()
        except StoreError as xato:
            print(f"XATO: {xato}", file=sys.stderr)
            return 2

    try:
        with httpx.Client(timeout=20.0) as client:
            max_id, qadamlar = frontier_top(
                client, tokens,
                boshlangich_past=args.past,
                boshlangich_baland=args.baland,
                rps=args.rps,
            )
    except FrontierXato as xato:
        # Bugungi nuqta YOZILMAYDI: yo'q nuqta — bo'shliq, noto'g'ri
        # nuqta esa `id_yoshi()` regressiyasini buzadi.
        print(json.dumps({
            "max_id": None, "qadamlar": None, "yozildi": False, "bazada": None,
            "xato": str(xato),
        }, ensure_ascii=False, indent=2))
        print(f"XATO: frontier o'lchanmadi, bazaga yozilmadi — {xato}", file=sys.stderr)
        return 3

    # Avval yoziladi, keyin hisobot bosiladi.
    #
    # Tartib ATAYLAB shunday. Ilgari JSON yozishdan OLDIN chiqardi va
    # `"yozildi": true` yozish muvaffaqiyatli boʻlishidan qatʼi nazar
    # koʻrinardi — yaʼni hisobot niyatni aytardi, natijani emas.
    # Endi u bazadan qaytgan qiymatni koʻrsatadi.
    yozilgan: dict | None = None
    if store is not None:
        with httpx.Client(timeout=20.0) as client:
            yozilgan = store.frontier_yoz(client, max_id, qadamlar)

    print(json.dumps({
        "max_id": max_id,
        "qadamlar": qadamlar,
        "yozildi": yozilgan is not None,
        # Bazada NIMA turgani. `frontier_yoz` ichidagi `greatest(...)`
        # tufayli bu yuborilgan qiymatdan katta boʻlishi mumkin: kun
        # ichida ikkinchi oʻlchov birinchisidan kichik chiqsa, kattasi
        # qoladi. Workflow aynan shu qiymatga qaraydi.
        "bazada": yozilgan,
    }, ensure_ascii=False, indent=2))

    if yozilgan is not None:
        print(f"Bazaga yozildi: {yozilgan}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
