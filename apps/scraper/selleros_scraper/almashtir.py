"""Kuzatuv ro'yxatini yangilash — uzoq tugagan tovar o'rniga sotuvdagisi (2026-10-20).

    python -m selleros_scraper almashtir

NEGA. Ro'yxat 2026-08-24 da bir marta tanlangan va hech qachon yangilanmagan:
2026-10-20 da 5 999 tadan 4 536 tasi 14 kundan beri qoldiqsiz, 4 326 tasida
24-avgustdan beri birorta ham qoldiq ko'rilmagan. Uzumning o'zi ularni «Tugadi»
deydi (`skuList.stock.status = OUT_OF_STOCK`). 3-qadam katalogi shularni
ko'rsatardi — ko'pi «Uzumda hozir tugagan».

QANDAY. Baza har o'lik o'ringa o'sha turkum va talab bo'lagidan nomzodlar beradi
(`so_almashtir_nomzodlari`, 0068). Bu yerda har nomzod Uzumda O'LCHANADI (og'ir
so'rov, xuddi `--stok` dagidek): qoldig'i bor va turkumi o'sha bo'lsa — juft;
aks holda rad (baza uni bir muddat qayta taklif qilmaydi). Perepisning «haftalik
xaridor» belgisi tirik ekanini AYTMAYDI: u tugagan tovarda ham qoladi
(o'lik o'rinlarda o'rtacha 142, o'lchandi).

Tarmoq xatosi yoki 429 — rad EMAS: tovar aybdor emas, keyingi safar yana
so'raladi. Kill-switch va sekinlashish — `sweep` dagidek (QOIDALAR.md §7).
So'rovlar soni cheklangan (`MAX_SOROV`): keyingi qadam «O'lchash» ga vaqt qolsin.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

import httpx

from .hurmat import KillSwitch, Limits, next_delay
from .manbalar.uzum_client import Natija, sorov
from .store import Store, StoreError
from .token import TokenProvider

#: Bir ishda Uzumga nechta tekshiruv so'rovi. 3 so'rov/soniyada ~11 daqiqa —
#: «O'lchash» (6 000 tovar) bilan birga 180 daqiqalik ishga sig'adi.
MAX_SOROV = 2_000


@dataclass
class AlmashtirHisobot:
    """Bir ish natijasi — workflow logida ko'rinadi."""

    olik: int = 0
    slotlar: int = 0
    sorovlar: int = 0
    xatolar: int = 0
    juftlar: list[dict[str, Any]] = field(default_factory=list)
    rad: list[int] = field(default_factory=list)
    toxtadi: str | None = None

    @property
    def xato_darajasi(self) -> float:
        return self.xatolar / self.sorovlar if self.sorovlar else 0.0


def almashtir(
    nomzodlar: dict[str, Any],
    *,
    client: httpx.Client,
    tokens: TokenProvider,
    limits: Limits | None = None,
    max_sorov: int = MAX_SOROV,
    uxla: Callable[[float], None] = time.sleep,
) -> AlmashtirHisobot:
    """Har o'lik o'rin uchun nomzodlarni tartib bilan o'lchaydi; birinchi sotuvdagisi — juft.

    Bir nomzod shu ishda bir marta so'raladi (qo'shni o'ringa ham taklif qilingan
    bo'lishi mumkin) va bir marta juft bo'ladi.
    """
    limits = limits or Limits()
    h = AlmashtirHisobot(olik=int(nomzodlar.get("olik_jami") or 0))
    #: id -> yaroqlimi (qoldig'i bor, turkumi mos). Shu ishda qayta so'ralmaydi.
    yaroqli: dict[int, bool] = {}
    band: set[int] = set()
    token = tokens.get(client)

    for slot in nomzodlar.get("slotlar") or []:
        if h.toxtadi or h.sorovlar >= max_sorov:
            break
        h.slotlar += 1
        turkum = slot.get("turkum")
        for n in slot.get("nomzodlar") or []:
            pid = int(n["id"])
            if pid in band:
                continue
            if pid not in yaroqli:
                if h.sorovlar >= max_sorov:
                    break
                h.sorovlar += 1
                javob = sorov(client, tokens.headers(token), pid, stok=True)
                if javob.natija is Natija.TOKEN:
                    # Token o'ldi — yangilaymiz va SHU id ni qayta so'raymiz.
                    tokens.invalidate()
                    token = tokens.get(client)
                    javob = sorov(client, tokens.headers(token), pid, stok=True)

                if javob.natija is Natija.TOPILDI and javob.kuzatuv is not None:
                    k = javob.kuzatuv
                    yaroqli[pid] = (k.stock or 0) > 0 and k.category_external_id == turkum
                    if not yaroqli[pid]:
                        h.rad.append(pid)
                elif javob.natija is Natija.YOQ:
                    # Uzumda yo'q (o'chirilgan) — u ham rad.
                    yaroqli[pid] = False
                    h.rad.append(pid)
                else:
                    # Tarmoq, 429, token — tovar aybdor emas: rad emas, keyingisiga o'tamiz.
                    h.xatolar += 1

                try:
                    kechikish = next_delay(limits, h.xato_darajasi, h.sorovlar)
                except KillSwitch as toxtash:
                    h.toxtadi = str(toxtash)
                    break
                if kechikish > 0:
                    uxla(kechikish)

            if yaroqli.get(pid):
                band.add(pid)
                h.juftlar.append({"eski": int(slot["eski"]), "yangi": pid, "xaridor": n.get("xaridor")})
                break
    return h


UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="selleros_scraper almashtir",
                                description="Uzoq tugagan kuzatuv tovarlarini sotuvdagisi bilan almashtiradi.")
    p.add_argument("--max-sorov", type=int, default=MAX_SOROV, help="Uzumga eng ko'p so'rov.")
    p.add_argument("--kun", type=int, default=14, help="Necha kun qoldiqsiz bo'lsa — o'lik.")
    p.add_argument("--rps", type=float, default=Limits.per_second, help="So'rov/soniya.")
    p.add_argument("--quruq", action="store_true",
                   help="Bazaga yozmaydi (nomzodlar baribir bazadan olinadi).")
    args = p.parse_args(argv)

    try:
        store = Store.env_dan()
    except StoreError as xato:
        print(f"XATO: {xato}", file=sys.stderr)
        return 2

    tokens = TokenProvider(user_agent=UA, installation_id=str(uuid.uuid4()))
    limits = Limits(per_second=args.rps)
    with httpx.Client(timeout=120.0) as baza, httpx.Client(timeout=limits.timeout_s) as uzum:
        nomzodlar = store.almashtir_nomzodlari(baza, kun=args.kun)
        h = almashtir(nomzodlar, client=uzum, tokens=tokens, limits=limits, max_sorov=args.max_sorov)
        # Avval yoziladi, keyin hisobot: hisobot niyatni emas, bazadan qaytganini aytsin.
        yozildi = None
        if not args.quruq and (h.juftlar or h.rad):
            yozildi = store.almashtir(baza, h.juftlar, h.rad)

    print(json.dumps({
        "o'lik_o'rinlar": h.olik,
        "ko'rilgan_o'rinlar": h.slotlar,
        "so'rovlar": h.sorovlar,
        "xatolar": h.xatolar,
        "juftlar": len(h.juftlar),
        "rad": len(h.rad),
        "to'xtadi": h.toxtadi,
        "sabab": nomzodlar.get("sabab"),
        "bazada": yozildi,
        "quruq": args.quruq,
    }, ensure_ascii=False, indent=2))
    return 1 if h.toxtadi else 0


if __name__ == "__main__":
    raise SystemExit(main())
