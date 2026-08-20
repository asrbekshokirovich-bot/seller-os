#!/usr/bin/env python3
"""Darvoza fiksturalarini BAZADAN yasaydi.

B1 tekshiruvi shuni ochdi: avvalgi skriptlar bazaga ULANMASDI — ichida
SQL natijasi qoʻlda koʻchirilgan massiv turardi. "Roʻyxat oʻlchovdan
chiqadi" degani shuning uchun yarim rost edi: SQL haqiqiy, lekin uni
JSON ga aylantirish qoʻlda boʻlgan.

Endi skript `.sql` fayllarni bazada ishlatadi va natijani toʻgʻridan-
toʻgʻri fiksturaga yozadi. Perepis tugagach roʻyxatni yangilash — bitta
buyruq.

Ishlatish:
    export ZUMSAVDO_SUPABASE_URL=...
    export ZUMSAVDO_SUPABASE_SERVICE_ROLE_KEY=...
    python supabase/seed/fikstura_yasash.py

Kalit muhitdan olinadi va hech qayerga yozilmaydi.
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
from pathlib import Path

ILDIZ = Path(__file__).resolve().parents[2]
FIKSTURA = ILDIZ / "apps" / "backend" / "test" / "fixtures"


def _muhit(nom: str) -> str:
    qiymat = os.environ.get(nom) or os.environ.get(nom.replace("ZUMSAVDO_", ""))
    if not qiymat:
        sys.exit(f"{nom} berilmagan. Kalitni muhitga qoʻying, faylga yozmang.")
    return qiymat


def rpc(nom: str) -> list[dict]:
    """Bazadagi nomzod funksiyasini chaqiradi.

    Ataylab "ixtiyoriy SQL" RPC si emas: unday uch kalit sizib ketsa
    butun baza ochiq boʻlardi. Soʻrov bazada oʻzgarmas turadi.
    """
    url = _muhit("ZUMSAVDO_SUPABASE_URL").rstrip("/")
    kalit = _muhit("ZUMSAVDO_SUPABASE_SERVICE_ROLE_KEY")
    talab = urllib.request.Request(
        f"{url}/rest/v1/rpc/{nom}",
        data=b"{}",
        headers={
            "apikey": kalit,
            "Authorization": f"Bearer {kalit}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(talab, timeout=120) as javob:
        return json.loads(javob.read()) or []


def brend_nomda(brend: str, nomi: str) -> bool:
    """Brend nomi tovar nomida SOʻZ sifatida uchraydimi.

    `in` yetarli emas: "Nike" va "nike air" bir xil, lekin "Nikelli sim"
    boshqa narsa. `packages/shared/.../yopiq_brend.ts` bilan bir xil
    mantiq — ikkalasi ajralib ketmasligi kerak.
    """
    t, b = nomi.lower(), brend.lower()
    i = t.find(b)
    if i < 0:
        return False
    oldin = " " if i == 0 else t[i - 1]
    keyin = " " if i + len(b) >= len(t) else t[i + len(b)]
    soz = re.compile(r"[^\W_]", re.UNICODE)
    return not soz.match(oldin) and not soz.match(keyin)


def yopiq_brend_fiksturasi() -> dict:
    qatorlar = rpc("zs_tuzoq_nomzodlari")
    elementlar = []
    for q in qatorlar:
        nomda = brend_nomda(q["brend"], q["title"])
        yosh, sotuv, med = q["brand_age_days"], q["sold_30d"], q["cat_median"]
        if sotuv is None or yosh is None:
            kutilgan, sabab = "baholanmadi", "sotuv yoki yosh oʻlchanmagan"
        elif nomda and q["brand_sellers"] <= 2 and yosh >= 180 and med and sotuv >= med * 3:
            kutilgan = "closed_brand"
            sabab = f"{q['dokon']}: {q['brand_sellers']} doʻkon, {yosh} kunlik brend"
        else:
            kutilgan, sabab = None, f"{q['dokon']}: shartlarning biri bajarilmadi"
        elementlar.append({
            "platform": "uzum", "external_id": q["pid"], "expect": kutilgan,
            "dokon": q["dokon"], "title": q["title"],
            "kirish": {
                "brand": q["brend"], "title": q["title"],
                "sellersCount": None, "sellersStableDays": None,
                "brandSellersCount": q["brand_sellers"], "brandAgeDays": yosh,
                "soldUnits30d": sotuv, "categoryMedianUnits30d": med,
            },
            "note": sabab,
        })
    return {"izoh": ["Bazadan avtomatik yasalgan: supabase/seed/fikstura_yasash.py"],
            "elementlar": elementlar}


def monopoliya_fiksturasi() -> dict:
    qatorlar = rpc("zs_monopoliya_nomzodlari")
    elementlar = []
    for q in qatorlar:
        elementlar.append({
            "platform": "uzum", "category_external_id": q["category_external_id"],
            "expect": q["kutilgan"], "turkum": q["turkum"],
            "kirish": {
                "categoryId": q["category_external_id"], "name": q["turkum"],
                "top3SharePercent": q["top3_foiz"],
                "measuredSellers": q["measured_sellers"],
                "totalSellers": q["total_sellers"],
            },
            "note": f"{q['turkum']}: {q['sotuvchilar']} sotuvchi, top-3 {q['top3_foiz']}%",
        })
    return {"izoh": ["Bazadan avtomatik yasalgan: supabase/seed/fikstura_yasash.py",
                     "Konsentratsiya PEREPISDAN — namunadan emas (TUZOQLAR.md)."],
            "elementlar": elementlar}


def main() -> None:
    for nom, yasovchi in (("traps.json", yopiq_brend_fiksturasi),
                          ("monopoliya.json", monopoliya_fiksturasi)):
        maʼlumot = yasovchi()
        (FIKSTURA / nom).write_text(
            json.dumps(maʼlumot, ensure_ascii=False, indent=2) + "\n")
        print(f"{nom}: {len(maʼlumot['elementlar'])} qator")


if __name__ == "__main__":
    main()
