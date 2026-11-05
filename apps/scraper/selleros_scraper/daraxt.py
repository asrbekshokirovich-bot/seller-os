"""Uzum turkum daraxti — bitta soʻrovda, bazaga toʻliq almashtirib.

    python -m selleros_scraper.daraxt --quruq

NEGA KERAK (2026-11-05). `zumsavdo.category` da daraxt yoʻq: perepis
faqat barg turkumni yozadi, 5 449 qatordan 5 200 tasida ota boʻsh.
Shuning uchun AI tahlilchi «kiyim-poyabzal sotuvchilari nechta?»
degan savolga javob bera olmadi — «Kiyim» qaysi barglardan iboratligini
tizim bilmaydi; 312 ta nom takrorlanadi («Shimlar» — 6 ta).

NEGA BITTA SOʻROV. `category(id:1)` ning `children` i ichma-ich yana
`children` beradi — 12 daraja soʻralsa butun daraxt bitta javobda
keladi (2026-09-12 jonli: 6 923 tugun, eng chuquri 9-daraja; zumsavdo
`ingest/lib/categories.mjs`). Bu qidiruv (`makeSearch`) emas, shuning
uchun qidiruv limitiga tegmaydi.

YARIM DARAXT YOZILMAYDI. Javob kesilgan, tugun kam yoki ildiz yoʻq
boʻlsa — bazaga hech narsa ketmaydi va buyruq qizil qaytadi. Baza
tomoni (`so_turkum_daraxti_yoz`) ham shuni qayta tekshiradi: yangi
roʻyxatda yoʻq tugun oʻchiriladi, demak yarim roʻyxat butun daraxtni
yoʻq qilardi.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass, field
from typing import Any

import httpx

from .manbalar.turkum_hajmi import ENDPOINT, cookie_ol, sarlavhalar
from .store import Store
from .token import TokenProvider

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)

#: Ildiz — «Barcha toifalar».
ILDIZ = 1
#: Nechta daraja ichma-ich soʻraladi. Jonli maksimum 9 (2026-09-12) —
#: 12 zaxira bilan; eng chuqur tugun shu darajaga yetsa, javob kesilgan
#: boʻlishi mumkin va daraxt YOZILMAYDI.
CHUQURLIK = 12
#: Bundan kam tugun — javob toʻliq emas (jonli: 6 923).
ENG_KAM_TUGUN = 5000


def daraxt_sorovi(chuqurlik: int = CHUQURLIK) -> str:
    """`id title adult children { … }` — `chuqurlik` marta ichma-ich.

    Qoʻlda yozilsa 12 ta jingalak qavs adashadi — shuning uchun yasaladi.
    """
    tanlov = "id title adult"
    for _ in range(chuqurlik):
        tanlov = f"id title adult children {{ {tanlov} }}"
    return f"query selleroaTurkumDaraxti($id: Int!) {{ category(id: $id) {{ {tanlov} }} }}"


@dataclass
class Tekis:
    tugunlar: list[dict[str, Any]] = field(default_factory=list)
    eng_chuqur: int = 0
    takror: int = 0

    @property
    def kesilgan(self) -> bool:
        """Eng chuqur tugun soʻralgan darajaga yetdi — pastida bola qolgan boʻlishi mumkin."""
        return self.eng_chuqur >= CHUQURLIK


def tekisla(ildiz: dict[str, Any]) -> Tekis:
    """Ichma-ich daraxt → tekis roʻyxat `{id, ota_id, nom, kattalar}`.

    Takror id — birinchisi qoladi va sanaladi (jonli daraxtda yoʻq,
    lekin tekshirilmasa bitta barg ikki marta yozilardi).
    """
    natija = Tekis()
    korilgan: set[int] = set()
    # Rekursiya emas — stek: chuqurlik kichik, lekin chegarasiz kirish kelsa ham yiqilmasin.
    stek: list[tuple[dict[str, Any], int | None, int]] = [(ildiz, None, 0)]
    while stek:
        tugun, ota, daraja = stek.pop()
        try:
            tid = int(tugun.get("id"))
        except (TypeError, ValueError, AttributeError):
            continue
        if tid in korilgan:
            natija.takror += 1
            continue
        korilgan.add(tid)
        natija.eng_chuqur = max(natija.eng_chuqur, daraja)
        nom = tugun.get("title")
        natija.tugunlar.append({
            "id": tid,
            "ota_id": ota,
            "nom": nom if isinstance(nom, str) and nom.strip() else f"Turkum {tid}",
            "kattalar": bool(tugun.get("adult")),
        })
        bolalar = tugun.get("children")
        if isinstance(bolalar, list):
            # Teskari tartibda — stekdan Uzum tartibida chiqsin.
            for bola in reversed(bolalar):
                if isinstance(bola, dict):
                    stek.append((bola, tid, daraja + 1))
    return natija


class DaraxtXatosi(RuntimeError):
    """Daraxt olinmadi yoki toʻliq emas — bazaga yozilmaydi."""


def daraxtni_ol(client: httpx.Client, headers: dict[str, str]) -> Tekis:
    """Bitta GraphQL soʻrovi. Xato YASHIRILMAYDI."""
    tana = {"query": daraxt_sorovi(), "variables": {"id": ILDIZ}}
    try:
        r = client.post(ENDPOINT, json=tana, headers=headers)
    except httpx.HTTPError as exc:
        raise DaraxtXatosi(f"tarmoq: {str(exc)[:120]}") from None
    if r.status_code != 200:
        raise DaraxtXatosi(f"HTTP {r.status_code}: {r.text[:200]}")
    try:
        body = r.json()
    except ValueError:
        raise DaraxtXatosi("javob JSON emas") from None
    ildiz = (body.get("data") or {}).get("category") if isinstance(body, dict) else None
    if not isinstance(ildiz, dict):
        xato = body.get("errors") if isinstance(body, dict) else None
        raise DaraxtXatosi(f"category(id:{ILDIZ}) boʻsh: {str(xato)[:200]}")
    return tekisla(ildiz)


def tekshir(t: Tekis) -> None:
    """Toʻliq boʻlmagan daraxt — xato. Yozishdan OLDIN."""
    if t.kesilgan:
        raise DaraxtXatosi(
            f"Daraxt {CHUQURLIK}-darajaga yetdi — pastidagi bolalar soʻralmagan. CHUQURLIK ni oshiring."
        )
    if len(t.tugunlar) < ENG_KAM_TUGUN:
        raise DaraxtXatosi(f"Atigi {len(t.tugunlar)} tugun (kamida {ENG_KAM_TUGUN} kutilgan).")
    if not any(x["id"] == ILDIZ and x["ota_id"] is None for x in t.tugunlar):
        raise DaraxtXatosi("Ildiz (1) yoʻq.")


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Uzum turkum daraxtini bazaga yozadi.")
    p.add_argument("--quruq", action="store_true", help="bazaga yozmaydi, qisqa hisobot chiqaradi")
    args = p.parse_args(argv)

    url = os.environ.get("SUPABASE_URL", "")
    kalit = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not args.quruq and not (url and kalit):
        print("SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY kerak (yoki --quruq).", file=sys.stderr)
        return 2

    # Turkum hajmi bilan bir xil oʻrnatma (`turkum.py`) — yangi oʻrnatma ochilmaydi.
    tp = TokenProvider(user_agent=UA, installation_id="selleros-turkum")
    try:
        with httpx.Client(timeout=60.0, follow_redirects=False) as client:
            cookie_ol(client, UA)
            headers = sarlavhalar(tp.headers(tp.get(client)))
            t = daraxtni_ol(client, headers)
        tekshir(t)
    except DaraxtXatosi as exc:
        print(f"DARAXT YOZILMADI: {exc}", file=sys.stderr)
        return 1

    otalar = {x["ota_id"] for x in t.tugunlar}
    barglar = sum(1 for x in t.tugunlar if x["id"] not in otalar)
    print(f"Daraxt: {len(t.tugunlar)} tugun, {barglar} barg, eng chuquri {t.eng_chuqur}-daraja, takror {t.takror}.")
    if args.quruq:
        print(json.dumps(t.tugunlar[:5], ensure_ascii=False))
        return 0

    store = Store(url=url, service_key=kalit, platform="uzum")
    with httpx.Client(timeout=120.0) as yozuvchi:
        javob = store.turkum_daraxtini_yoz(yozuvchi, t.tugunlar)
    print(f"Bazaga: {json.dumps(javob, ensure_ascii=False)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
