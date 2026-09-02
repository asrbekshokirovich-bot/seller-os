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


def nakrutka_fiksturasi() -> dict:
    qatorlar = rpc("zs_nakrutka_nomzodlari")
    elementlar = []
    for q in qatorlar:
        sotuv = q["sold_30d"]
        manba_q = q["manba"]
        sharh = q["reviews"]
        reyting = q["rating"]

        if sharh is None or sotuv is None:
            kutilgan = "baholanmadi"
            sabab = "sotuv yoki sharh oʻlchanmagan"
        elif manba_q == "taxmin":
            kutilgan = "baholanmadi"
            sabab = "sotuvManbasi=taxmin — oʻlchangan sotuv emas"
        elif sotuv <= 0:
            kutilgan = "baholanmadi"
            sabab = "sotuv=0 — nisbat hisoblanmaydi"
        else:
            kutilgan_sharh = sotuv * 0.08
            nisbat = sharh / kutilgan_sharh
            if nisbat < 0.25 or nisbat > 4.0:
                kutilgan = "fake_sales"
                tur = "oʻta koʻp sharh" if nisbat > 4.0 else "oʻta kam sharh"
                sabab = (f"sharh/sotuv = {sharh}/({sotuv}×0.08) "
                         f"= {nisbat:.1f} — {tur}")
            else:
                kutilgan = None
                sabab = (f"sharh/sotuv = {sharh}/({sotuv}×0.08) "
                         f"= {nisbat:.2f} — normal oraliqda [0.25, 4.0]")

        elementlar.append({
            "platform": "uzum", "external_id": q["pid"],
            "expect": kutilgan, "title": q["title"],
            "kirish": {
                "soldUnits30d": sotuv,
                "sotuvManbasi": manba_q or "olchandi",
                "reviews": sharh,
                "rating": float(reyting) if reyting else 0,
            },
            "note": sabab,
        })
    return {"izoh": ["Bazadan avtomatik yasalgan: supabase/seed/fikstura_yasash.py"],
            "elementlar": elementlar}


OY_NOM = ["yanvar", "fevral", "mart", "aprel", "may", "iyun",
          "iyul", "avgust", "sentyabr", "oktyabr", "noyabr", "dekabr"]
PAST_KOEF = 0.7
OGOHLANTIRISH_HAFTA = 8


def _mavsum_tugashi(koef: list[float], oy: int) -> int | None:
    for i in range(1, 13):
        keyingi = koef[(oy - 1 + i) % 12]
        if keyingi < PAST_KOEF:
            return round(i * 4.345)
    return None


def mavsumiy_fiksturasi() -> dict:
    qatorlar = rpc("zs_mavsumiy_nomzodlari")
    oy = 9
    elementlar = []
    for q in qatorlar:
        s = [float(x) for x in q["seasonality"]]
        joriy = s[oy - 1]
        haftalar = _mavsum_tugashi(s, oy)

        if joriy < PAST_KOEF:
            kutilgan = "seasonal"
            sabab = f"{OY_NOM[oy - 1]}={joriy} < {PAST_KOEF} — mavsumdan tashqari"
        elif haftalar is not None and haftalar <= OGOHLANTIRISH_HAFTA:
            kutilgan = "seasonal"
            keyingi_idx = next(
                (oy - 1 + i) % 12 for i in range(1, 13)
                if s[(oy - 1 + i) % 12] < PAST_KOEF
            )
            sabab = (f"{OY_NOM[oy - 1]}={joriy}, lekin "
                     f"{OY_NOM[keyingi_idx]}={s[keyingi_idx]} — "
                     f"mavsum {haftalar} haftada tugaydi")
        elif haftalar is None:
            kutilgan = None
            sabab = (f"{OY_NOM[oy - 1]}={joriy}, "
                     f"hech qachon <{PAST_KOEF} — mavsumiy emas")
        else:
            kutilgan = None
            keyingi_idx = next(
                (oy - 1 + i) % 12 for i in range(1, 13)
                if s[(oy - 1 + i) % 12] < PAST_KOEF
            )
            oy_farqi = next(
                i for i in range(1, 13)
                if s[(oy - 1 + i) % 12] < PAST_KOEF
            )
            sabab = (f"{OY_NOM[oy - 1]}={joriy}, keyingi <{PAST_KOEF} "
                     f"{OY_NOM[keyingi_idx]}da "
                     f"({oy_farqi} oy={haftalar} hafta) — uzoq")

        elementlar.append({
            "platform": "uzum",
            "category_external_id": q["category_external_id"],
            "expect": kutilgan, "turkum": q["turkum"],
            "kirish": {"seasonality": s, "oy": oy},
            "note": sabab,
        })
    return {"izoh": ["Bazadan avtomatik yasalgan: supabase/seed/fikstura_yasash.py"],
            "elementlar": elementlar}


OGIR_GRAMM = 5000
KATTA_HAJM_ML = 30000

MIN_MARJA_FOIZ = 5


def ogir_fiksturasi() -> dict:
    qatorlar = rpc("zs_ogir_nomzodlari")
    elementlar = []
    for q in qatorlar:
        wg = q["weight_g"]
        vm = q["volume_ml"]
        ov = q["oversized"]

        if wg is None and vm is None and ov is None:
            kutilgan = "baholanmadi"
            sabab = "oʻlchov maʼlumoti yoʻq"
        elif wg is not None and wg >= OGIR_GRAMM:
            kutilgan = "heavy"
            sabab = f"ogʻirlik={wg} ≥ {OGIR_GRAMM}"
        elif vm is not None and vm >= KATTA_HAJM_ML:
            kutilgan = "heavy"
            sabab = f"hajm={vm} ≥ {KATTA_HAJM_ML}"
        elif ov is True:
            kutilgan = "heavy"
            sabab = "faqat Uzum belgisi"
        else:
            kutilgan = None
            sabab = "chegaradan past"

        elementlar.append({
            "platform": "uzum", "external_id": q["pid"],
            "expect": kutilgan, "title": q["title"],
            "kirish": {
                "weightG": wg, "volumeMl": vm, "oversized": ov,
            },
            "note": sabab,
        })
    return {"izoh": ["Bazadan avtomatik yasalgan: supabase/seed/fikstura_yasash.py"],
            "elementlar": elementlar}


def sertifikat_fiksturasi() -> dict:
    qatorlar = rpc("zs_sertifikat_nomzodlari")
    elementlar = []
    for q in qatorlar:
        mr = q["marking_required"]
        cr = q["certificate_required"]
        src = q["source"]

        if mr is True or cr is True:
            kutilgan = "certification"
            sabab = ("markirovka kerak" if mr else "sertifikat kerak")
        else:
            kutilgan = "baholanmadi"
            sabab = "ikkala talab ham null — baholanmadi"

        elementlar.append({
            "platform": "uzum",
            "category_external_id": q["category_external_id"],
            "expect": kutilgan, "turkum": q["turkum"],
            "kirish": {
                "categoryId": q["category_external_id"],
                "markingRequired": mr,
                "certificateRequired": cr,
                "entryCostUzs": q["entry_cost_uzs"],
                "entryWeeks": q["entry_weeks"],
                "source": src,
                "izoh": q["note"],
            },
            "note": sabab,
        })
    return {"izoh": ["Bazadan avtomatik yasalgan: supabase/seed/fikstura_yasash.py"],
            "elementlar": elementlar}


YOSH_KUN = 42


def demping_fiksturasi() -> dict:
    """3-tuzoq: demping fiksturasi.

    Tannarx DB da saqlanmaydi — sotuvchi kiritadi. Shuning uchun RPC
    faqat sotuv narxi va komissiya foizini qaytaradi, qolgan xarajatlarni
    SHU FUNKSIYA realitsik nisbatlar bilan sintez qiladi.

    Tipik xarajat tarkibi (yangi sotuvchi uchun):
      xitoyNarxi  ~ sotuv narxining 30-50%
      kargo       ~ 10-15%
      bojxonaQqs   ~ 12% (QQS) × xitoyNarxi
      komissiya   ~ turkum bo'yicha (5-15%)
    """
    qatorlar = rpc("zs_demping_nomzodlari")
    elementlar = []
    for q in qatorlar:
        sotuv_narxi = q["sotuv_narxi"]
        komissiya_foiz = 10.0

        xitoy_past = int(sotuv_narxi * 0.50)
        xitoy_yaxshi = int(sotuv_narxi * 0.30)
        kargo = int(sotuv_narxi * 0.12)
        bojxona_qqs = int(xitoy_past * 0.12)
        komissiya = int(sotuv_narxi * komissiya_foiz / 100)

        sof_past = sotuv_narxi - xitoy_past - kargo - bojxona_qqs - komissiya
        marja_past = (sof_past / sotuv_narxi * 100) if sotuv_narxi else 0

        sof_yaxshi = sotuv_narxi - xitoy_yaxshi - kargo - int(xitoy_yaxshi * 0.12) - komissiya
        marja_yaxshi = (sof_yaxshi / sotuv_narxi * 100) if sotuv_narxi else 0

        if sotuv_narxi < 50000:
            xitoy = xitoy_past
            boj = int(xitoy * 0.12)
            sof = sotuv_narxi - xitoy - kargo - boj - komissiya
            marja = (sof / sotuv_narxi * 100) if sotuv_narxi else 0
            if marja < MIN_MARJA_FOIZ:
                kutilgan = "dumping"
                sabab = f"marja={marja:.1f}% < {MIN_MARJA_FOIZ}% — demping"
            else:
                kutilgan = None
                sabab = f"marja={marja:.1f}% ≥ {MIN_MARJA_FOIZ}% — normal"
        elif sotuv_narxi > 500000:
            xitoy = xitoy_yaxshi
            boj = int(xitoy * 0.12)
            sof = sotuv_narxi - xitoy - kargo - boj - komissiya
            marja = (sof / sotuv_narxi * 100) if sotuv_narxi else 0
            kutilgan = None
            sabab = f"marja={marja:.1f}% ≥ {MIN_MARJA_FOIZ}% — normal (qimmat tovar)"
        else:
            xitoy = int(sotuv_narxi * 0.40)
            boj = int(xitoy * 0.12)
            sof = sotuv_narxi - xitoy - kargo - boj - komissiya
            marja = (sof / sotuv_narxi * 100) if sotuv_narxi else 0
            if marja < MIN_MARJA_FOIZ:
                kutilgan = "dumping"
                sabab = f"marja={marja:.1f}% < {MIN_MARJA_FOIZ}% — demping"
            else:
                kutilgan = None
                sabab = f"marja={marja:.1f}% ≥ {MIN_MARJA_FOIZ}% — normal"

        elementlar.append({
            "platform": "uzum", "external_id": q["pid"],
            "expect": kutilgan, "title": q["title"],
            "kirish": {
                "sotuvNarxi": sotuv_narxi,
                "xitoyNarxi": xitoy,
                "kargo": kargo,
                "bojxonaQqs": boj,
                "komissiya": komissiya,
                "uzumLogistika": 0,
                "saqlash": 0,
            },
            "note": sabab,
        })

    bosh = [{
        "platform": "uzum", "external_id": 0,
        "expect": "baholanmadi", "title": "Narxi nomaʼlum",
        "kirish": {
            "sotuvNarxi": None, "xitoyNarxi": None, "kargo": None,
            "bojxonaQqs": None, "komissiya": None,
            "uzumLogistika": None, "saqlash": None,
        },
        "note": "barcha maydon null — baholanmadi",
    }, {
        "platform": "uzum", "external_id": 1,
        "expect": "baholanmadi", "title": "Xitoy narxi nomaʼlum",
        "kirish": {
            "sotuvNarxi": 100000, "xitoyNarxi": None, "kargo": None,
            "bojxonaQqs": None, "komissiya": None,
            "uzumLogistika": None, "saqlash": None,
        },
        "note": "xitoyNarxi null — baholanmadi",
    }]

    return {"izoh": ["Bazadan avtomatik yasalgan: supabase/seed/fikstura_yasash.py",
                     "Tannarx sintez qilingan — haqiqiy xitoy narxi emas."],
            "elementlar": elementlar + bosh}


def hype_fiksturasi() -> dict:
    qatorlar = rpc("zs_hype_nomzodlari")
    elementlar = []
    for q in qatorlar:
        yosh = q["product_age_days"]
        sold_30 = q["sold_30d"]
        sold_14 = q["sold_14d"]
        manba_q = q["manba"]

        if yosh is None or sold_30 is None or sold_14 is None:
            kutilgan = "baholanmadi"
            sabab = "yosh yoki sotuv maʼlumoti yoʻq"
            ulush = None
        elif manba_q == "taxmin":
            kutilgan = "baholanmadi"
            sabab = "sotuvManbasi=taxmin — oʻlchangan sotuv emas"
            ulush = None
        elif sold_30 <= 0:
            kutilgan = "baholanmadi"
            sabab = "sotuv=0 — ulush hisoblanmaydi"
            ulush = None
        else:
            ulush = round(sold_14 / sold_30, 2)
            yosh_signal = yosh <= YOSH_KUN
            osish_signal = ulush > 0.5

            if yosh_signal and osish_signal:
                kutilgan = "hype"
                sabab = (f"yosh={yosh} ≤ {YOSH_KUN} kun VA "
                         f"ulush={ulush} > 0.5 — trend xavfi")
            elif yosh_signal:
                kutilgan = None
                sabab = (f"yosh={yosh} ≤ {YOSH_KUN} kun, lekin "
                         f"ulush={ulush} ≤ 0.5 — barqaror oʻsish")
            elif osish_signal:
                kutilgan = None
                sabab = (f"ulush={ulush} > 0.5, lekin "
                         f"yosh={yosh} > {YOSH_KUN} kun — eski tovar")
            else:
                kutilgan = None
                sabab = (f"yosh={yosh} > {YOSH_KUN} kun, "
                         f"ulush={ulush} ≤ 0.5 — barqaror eski")

        elementlar.append({
            "platform": "uzum", "external_id": q["pid"],
            "expect": kutilgan, "title": q["title"],
            "kirish": {
                "productAgeDays": yosh,
                "yangiSotuvUlushi": ulush,
            },
            "note": sabab,
        })
    return {"izoh": ["Bazadan avtomatik yasalgan: supabase/seed/fikstura_yasash.py"],
            "elementlar": elementlar}


def main() -> None:
    for nom, yasovchi in (
        ("traps.json", yopiq_brend_fiksturasi),
        ("monopoliya.json", monopoliya_fiksturasi),
        ("nakrutka.json", nakrutka_fiksturasi),
        ("mavsumiy.json", mavsumiy_fiksturasi),
        ("ogir.json", ogir_fiksturasi),
        ("sertifikat.json", sertifikat_fiksturasi),
        ("demping.json", demping_fiksturasi),
        ("hype.json", hype_fiksturasi),
    ):
        maʼlumot = yasovchi()
        (FIKSTURA / nom).write_text(
            json.dumps(maʼlumot, ensure_ascii=False, indent=2) + "\n")
        print(f"{nom}: {len(maʼlumot['elementlar'])} qator")


if __name__ == "__main__":
    main()
