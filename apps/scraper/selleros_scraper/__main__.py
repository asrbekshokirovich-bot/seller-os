"""Yig'uvchini ishga tushirish.

    python -m selleros_scraper --dan 1234560 --gacha 1234570 --quruq

Nega bu fayl kech paydo bo'ldi. Paketda yig'ish, token, hurmat rejimi
va bazaga yozish — hammasi yozilgan va testlari yashil edi, lekin
ularni CHAQIRADIGAN hech narsa yo'q edi. Ya'ni skreyper hech qachon
ishlamagan: `selleros.sweep_log` bo'sh turgan. "Testlar yashil" ni
"ishlaydi" deb o'qib bo'lmasligiga yana bir misol (QOIDALAR.md §8).

Sirlar faqat muhitdan olinadi:

    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY

`--quruq` bilan ularning ikkalasi ham kerak emas — yig'iladi, lekin
bazaga tegilmaydi.
"""

from __future__ import annotations

import argparse
import json
import sys
import uuid

import httpx

from .hurmat import Limits
from .store import Store, StoreError
from .sweep import sweep
from .token import TokenProvider

#: Uzum brauzerdan kelmagan so'rovni rad etadi, shuning uchun haqiqiy
#: brauzer sarlavhasi beriladi. Yashirinish emas — Uzum saytining o'zi
#: shu yo'ldan foydalanadi (token.py dagi izohga qarang).
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)


def id_lar(args: argparse.Namespace) -> list[int]:
    """Qaysi id lar o'lchanadi.

    Ataylab oddiy: ro'yxat yoki oraliq. Bazadan tanlash qo'shilmadi,
    chunki SellerOS uchun "kimni kuzatamiz" degan qaror hali
    yozilmagan — uni shu yerda o'ylab topish tanlovni yashirib
    qo'yardi.
    """
    if args.id:
        return list(args.id)
    if args.dan is None or args.gacha is None:
        raise SystemExit("--id yoki (--dan va --gacha) bering.")
    if args.gacha < args.dan:
        raise SystemExit("--gacha --dan dan kichik.")
    return list(range(args.dan, args.gacha + 1))


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="selleros_scraper", description="Uzum o'lchovi.")
    p.add_argument("--id", type=int, action="append", help="Bitta id (bir necha marta berish mumkin).")
    p.add_argument("--dan", type=int, help="Oraliq boshi.")
    p.add_argument("--gacha", type=int, help="Oraliq oxiri (kiradi).")
    p.add_argument("--stok", action="store_true",
                   help="Og'ir so'rov: qoldiqni ham oladi (javob ~16 barobar katta).")
    p.add_argument("--quruq", action="store_true",
                   help="Bazaga yozmaydi. Sir ham kerak emas.")
    p.add_argument("--rps", type=float, default=Limits.per_second,
                   help=f"So'rov/soniya (standart {Limits.per_second}).")
    args = p.parse_args(argv)

    ids = id_lar(args)
    limits = Limits(per_second=args.rps)

    store: Store | None = None
    if not args.quruq:
        try:
            store = Store.env_dan()
        except StoreError as xato:
            # Jimgina quruq yurishga o'tib ketmaymiz: u yashil ko'rinib,
            # bazaga hech narsa yozmasdi.
            print(f"XATO: {xato}", file=sys.stderr)
            print("Bazaga yozmasdan sinash uchun: --quruq", file=sys.stderr)
            return 2

    tokens = TokenProvider(user_agent=UA, installation_id=str(uuid.uuid4()))
    with httpx.Client(timeout=limits.timeout_s) as client:
        hisobot = sweep(ids, client=client, tokens=tokens, store=store,
                        limits=limits, stok=args.stok)

    print(json.dumps({
        "so'ralgan": hisobot.sorovlar,
        "topildi": hisobot.topildi,
        "yo'q": hisobot.yoq,
        "xatolar": hisobot.xatolar,
        "xato_darajasi": round(hisobot.xato_darajasi, 4),
        "yozildi": hisobot.yozildi or None,
        "to'xtadi": hisobot.toxtadi,
        "quruq": args.quruq,
    }, ensure_ascii=False, indent=2))

    # Kill-switch ishlagan bo'lsa bu muvaffaqiyat emas.
    if hisobot.toxtadi:
        return 1
    # Hech narsa topilmagan bo'lsa ham qizil: "xatosiz ishladi, lekin
    # hech narsa o'lchamadi" — aynan jim o'lim.
    if hisobot.topildi == 0:
        print("XATO: bitta ham tovar o'lchanmadi.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
