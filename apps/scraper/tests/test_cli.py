"""Ishga tushirish nuqtasi testlari.

Nega bu fayl bor. Paketda yig'ish, token, hurmat rejimi va yozish —
hammasi yozilgan va testlari yashil edi, lekin ularni CHAQIRADIGAN
hech narsa yo'q edi. Skreyper hech qachon ishlamagan, `selleros`
sxemasi bo'sh turgan, testlar esa 29/29 yashil ko'rsatgan.
"""

import httpx
import pytest

from selleros_scraper.__main__ import id_lar, main
from selleros_scraper.manbalar.uzum import PRODUCT_QUERY_STOK
from selleros_scraper.manbalar.uzum_client import sorov


class Args:
    def __init__(self, id=None, dan=None, gacha=None):
        self.id, self.dan, self.gacha = id, dan, gacha


def test_id_royxati():
    assert id_lar(Args(id=[5, 7])) == [5, 7]


def test_oraliq_ikki_chetini_ham_oladi():
    assert id_lar(Args(dan=3, gacha=6)) == [3, 4, 5, 6]


def test_teskari_oraliq_rad_etiladi():
    with pytest.raises(SystemExit):
        id_lar(Args(dan=9, gacha=2))


def test_id_ham_oraliq_ham_berilmasa_rad_etiladi():
    with pytest.raises(SystemExit):
        id_lar(Args())


def test_SIR_YOQ_BOLSA_JIM_QURUQ_YURISHGA_OTMAYDI(monkeypatch, capsys):
    """Sirsiz ishga tushirish quruq yurishga tushib ketmasligi kerak.

    Aks holda buyruq yashil tugab, bazaga hech narsa yozmasdi — va
    buni faqat oylar keyin, bo'sh jadvalga qarab bilardik.
    """
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    kod = main(["--id", "1"])
    assert kod == 2, "sir yo'q bo'lsa xato kodi qaytishi kerak"
    assert "quruq" in capsys.readouterr().err


def test_STOK_SORAGANDA_OGIR_SOROV_KETADI():
    """`--stok` og'ir so'rovni yuborishi kerak.

    `PRODUCT_QUERY_STOK` yozilgan, lekin hech qayerdan chaqirilmagan
    edi: `stock` HAR DOIM `None` bo'lgan, ya'ni `prev_stock - stock`
    ga tayanadigan sotuv baholash umuman ishlay olmasdi.
    """
    yuborilgan = []

    def handler(request):
        yuborilgan.append(request.read().decode())
        return httpx.Response(200, json={"data": {"productPage": None}})

    c = httpx.Client(transport=httpx.MockTransport(handler))
    sorov(c, {}, 42, stok=True)
    assert "skuList" in yuborilgan[0]

    yuborilgan.clear()
    sorov(c, {}, 42, stok=False)
    assert "skuList" not in yuborilgan[0], "yengil so'rov skuList so'ramasligi kerak"


def test_ogir_sorov_aynan_stok_query_si():
    yuborilgan = []
    c = httpx.Client(transport=httpx.MockTransport(
        lambda r: (yuborilgan.append(r.read().decode()),
                   httpx.Response(200, json={"data": {"productPage": None}}))[1]))
    sorov(c, {}, 1, stok=True)
    assert "sellerosProductStok" in yuborilgan[0]
    assert PRODUCT_QUERY_STOK.strip()[:40] in yuborilgan[0].replace("\\n", "\n")


def test_kuzatuv_rejimida_id_oraligi_talab_qilinmaydi(monkeypatch, capsys):
    """`--kuzatuv` da ro'yxat bazadan keladi, argumentdan emas."""
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    # Sir yo'q — 2 qaytaradi, ya'ni id oralig'i yo'qligidan EMAS,
    # balki bazaga ulanib bo'lmaganidan to'xtadi.
    assert main(["--kuzatuv"]) == 2
    assert "quruq" in capsys.readouterr().err
