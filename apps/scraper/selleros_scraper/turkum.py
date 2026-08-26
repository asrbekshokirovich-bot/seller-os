"""Turkum hajmini yigʻish — Uzumning oʻz soni.

    python -m selleros_scraper.turkum --soni 300 --quruq

NEGA ALOHIDA ISH. Bu supurish bilan bir vaqtda yurmaydi: ikkalasi
Uzumga bir vaqtda soʻrov yuborsa, ikkalasi ham sekinlashadi.
Bundan tashqari turkum soni kuniga bir marta oʻzgarsa yetarli —
u tovar qoldigʻidek tez oʻzgarmaydi.

HURMAT REJIMI. Har soʻrov orasida `--kechikish` soniya (standart
4). 429 kelsa 60 soniya kutib bir marta qayta urinadi; ketma-ket
ikkinchi 429 da TOʻXTAYDI. Jimgina davom etish eng yomon variant:
yarim toʻlgan jadval "oʻlchandi" boʻlib koʻrinardi.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time

import httpx

from .manbalar.turkum_hajmi import Hajm, cookie_ol, sarlavhalar, sorov
from .store import Store
from .token import TokenProvider

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)


def yig(
    client: httpx.Client,
    headers: dict[str, str],
    idlar: list[int],
    kechikish: float,
) -> tuple[list[Hajm], str | None]:
    """Roʻyxatni yigʻadi. Ikkinchi ketma-ket 429 da toʻxtaydi."""
    natija: list[Hajm] = []
    ketma_ket = 0
    for cid in idlar:
        h = sorov(client, headers, cid)
        if h.sabab == "429":
            ketma_ket += 1
            if ketma_ket >= 2:
                return natija, f"ketma-ket 429 ({cid})"
            time.sleep(60)
            h = sorov(client, headers, cid)
        if h.total is not None:
            ketma_ket = 0
        natija.append(h)
        time.sleep(kechikish)
    return natija, None


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Uzum turkum hajmini yigʻadi.")
    p.add_argument("--soni", type=int, default=300, help="nechta turkum (talab boʻyicha)")
    p.add_argument("--turkum", help="vergul bilan turkum id lari — bazadan olish oʻrniga")
    p.add_argument("--kechikish", type=float, default=4.0, help="soʻrovlar orasida, soniya")
    p.add_argument("--quruq", action="store_true", help="bazaga yozmaydi")
    args = p.parse_args(argv)

    url = os.environ.get("SUPABASE_URL", "")
    kalit = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not args.quruq and not (url and kalit):
        print("SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY kerak (yoki --quruq).",
              file=sys.stderr)
        return 2

    store = Store(url=url, service_key=kalit, platform="uzum")
    tp = TokenProvider(user_agent=UA, installation_id="selleros-turkum")

    # `follow_redirects=False` — saytdan bizga faqat cookie kerak,
    # sahifa emas; redirekt sikliga tushib oʻtirmaymiz.
    with httpx.Client(timeout=30.0, follow_redirects=False) as client:
        # `--turkum` — bazasiz sinash uchun. Ishlab chiqarishda
        # roʻyxat bazadan keladi: qaysi turkum muhimligi
        # skreyperda emas, bazada hal qilinadi.
        idlar = ([int(x) for x in args.turkum.split(",") if x.strip()]
                 if args.turkum else store.turkum_royxati(client, args.soni))
        print(f"{len(idlar)} ta turkum soʻraladi.")

        cookie_ol(client, UA)
        headers = sarlavhalar(tp.headers(tp.get(client)))
        natija, toxtadi = yig(client, headers, idlar, args.kechikish)

    olchandi = [h for h in natija if h.total is not None]
    print(f"Javob berdi: {len(olchandi)}/{len(natija)}")
    if toxtadi:
        print(f"TOʻXTADI: {toxtadi}", file=sys.stderr)

    if args.quruq:
        print(json.dumps([h.__dict__ for h in olchandi[:10]], ensure_ascii=False))
        return 0 if olchandi else 1

    with httpx.Client(timeout=60.0) as yozuvchi:
        yozildi = store.turkum_hajmini_yoz(
            yozuvchi,
            [{"category_id": h.category_id, "total": h.total} for h in olchandi],
        )
    print(f"Bazaga: {yozildi}")
    # Nol qator "turkum yoʻq" degani EMAS — "yigʻilmadi" degani.
    return 0 if olchandi else 1


if __name__ == "__main__":
    raise SystemExit(main())
