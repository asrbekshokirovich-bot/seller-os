"""Yig'uvchi tsikli testlari.

Eng muhim ikkitasi:
  - bo'sh id xato deb sanalmasligi (aks holda kill-switch bekorga ishlaydi)
  - token o'lganda o'sha id qayta so'ralishi (aks holda o'lchov yo'qoladi)
"""

import httpx
import pytest

from selleros_scraper.hurmat import Limits
from selleros_scraper.sweep import Hisobot, sweep
from selleros_scraper.token import TokenProvider


def javob_ok(pid: int) -> dict:
    return {
        "data": {
            "productPage": {
                "actions": [],
                "product": {
                    "id": pid, "title": f"T{pid}", "rating": 5, "feedbackQuantity": 1,
                    "minSellPrice": 100, "minFullPrice": 200,
                    "category": {"id": 2, "title": "K"},
                    "shop": {"id": 3, "title": "D", "official": True, "ordersQuantity": 10},
                },
            }
        }
    }


JAVOB_YOQ = {"errors": [{"message": "path '/productPage/product' declared as non-null"}]}


#: Testda rostdan kutmaymiz. `sweep` hurmat rejimida har id dan keyin
#: uxlaydi (3 so'rov/sek -> 0,33 s); 100 id li test 33 soniya ketardi.
#: Uyquni ALMASHTIRAMIZ, O'CHIRMAYMIZ — u haqiqatan chaqirilishini
#: `test_KECHIKISH_HAQIQATAN_QOLLANADI` tekshiradi.
def UXLAMA(_kechikish: float) -> None:
    return None


def tokens() -> TokenProvider:
    tp = TokenProvider(user_agent="t", installation_id="i")
    tp._token = "sinov"
    tp._expires_at = 9e18
    return tp


def test_hammasi_topilsa_qamrov_toliq():
    def handler(request):
        pid = int(request.read().decode().split('"id":')[1].split("}")[0])
        return httpx.Response(200, json=javob_ok(pid))

    c = httpx.Client(transport=httpx.MockTransport(handler))
    h = sweep([1, 2, 3], client=c, tokens=tokens(), store=None, uxla=UXLAMA)
    assert h.topildi == 3
    assert h.xatolar == 0
    assert h.qamrov == 1.0


def test_BOSH_ID_XATO_DEB_SANALMAYDI():
    """Id fazosining ~70% i bo'sh.

    Agar ular xato deb sanalsa, xato darajasi 70% ga chiqib kill-switch
    bekordan yig'ishni to'xtatardi.
    """
    c = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(200, json=JAVOB_YOQ)))
    h = sweep(range(50), client=c, tokens=tokens(), store=None, uxla=UXLAMA)
    assert h.yoq == 50
    assert h.xatolar == 0
    assert h.xato_darajasi == 0.0
    assert h.toxtadi is None, "bo'sh id kill-switch ni ishga tushirmasligi kerak"


def test_kop_xato_kill_switch_ni_ishga_tushiradi():
    """Jimgina davom etish eng yomon variant: baza buzuq to'ladi."""
    c = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(500)))
    h = sweep(range(100), client=c, tokens=tokens(), store=None, uxla=UXLAMA)
    assert h.toxtadi is not None
    assert h.sorovlar < 100, "to'xtashi kerak edi, oxirigacha bormasligi kerak"


def test_token_olsa_osha_id_qayta_soraladi():
    """Aks holda o'sha mahsulotning o'lchovi butunlay yo'qolardi."""
    urinishlar = {"n": 0}

    def handler(request):
        urinishlar["n"] += 1
        if urinishlar["n"] == 1:
            return httpx.Response(401)
        return httpx.Response(200, json=javob_ok(7))

    c = httpx.Client(transport=httpx.MockTransport(handler))
    tp = tokens()
    tp._fetch = lambda client: "yangi"  # type: ignore[method-assign]
    h = sweep([7], client=c, tokens=tp, store=None, uxla=UXLAMA)
    assert h.topildi == 1, "token yangilangach o'lchov olinishi kerak edi"


def test_hisobot_qamrov_va_xato_darajasini_beradi():
    h = Hisobot(sorovlar=10, topildi=6, yoq=3, xatolar=1)
    assert h.qamrov == 0.6
    # 1 / (6 + 1) — bo'sh id maxrajga kirmaydi
    assert h.xato_darajasi == pytest.approx(1 / 7)


def test_KECHIKISH_HAQIQATAN_QOLLANADI():
    """Hurmat rejimi qog'ozda emas, amalda ishlashi kerak.

    Bir vaqtlar `next_delay()` chaqirilib, qaytargan qiymati tashlab
    yuborilgan edi: kill-switch ishlagan (u istisno tashlaydi), lekin
    sekinlashish umuman bo'lmagan va so'rovlar tsikl qanchalik tez
    aylansa shunchalik tez ketgan. Tashqaridan qaralganda hammasi
    joyida ko'rinardi — QOIDALAR.md §7 esa buzilib turardi.
    """
    kutilgan = []

    def yozib_ol(kechikish: float) -> None:
        kutilgan.append(kechikish)

    c = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(200, json=javob_ok(1))))
    sweep([1, 2, 3], client=c, tokens=tokens(), store=None,
          limits=Limits(per_second=4.0), uxla=yozib_ol)

    assert len(kutilgan) == 3, "har id dan keyin kechikish qo'llanishi kerak"
    assert all(k == pytest.approx(0.25) for k in kutilgan), (
        f"4 so'rov/sek -> 0,25 s kutilardi, keldi: {kutilgan}"
    )


def test_kill_switch_da_uxlanmaydi():
    """To'xtash qaroridan keyin kutish — bekorga sarflangan vaqt."""
    kutilgan = []
    c = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(500)))
    h = sweep(range(100), client=c, tokens=tokens(), store=None,
              uxla=kutilgan.append)
    assert h.toxtadi is not None
    # Oxirgi qadam to'xtash bo'lgani uchun uyqu so'rovdan bitta kam.
    assert len(kutilgan) < h.sorovlar
