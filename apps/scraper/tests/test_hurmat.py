import pytest

from selleros_scraper.hurmat import (
    KillSwitch,
    Limits,
    Proksilar,
    next_delay,
    proksilarni_oqi,
)


def test_normal_holatda_asosiy_tezlik():
    limits = Limits(per_second=4.0)
    assert next_delay(limits, error_rate=0.0) == pytest.approx(0.25)


def test_xato_kopaysa_sekinlashadi():
    limits = Limits(per_second=4.0)
    tez = next_delay(limits, error_rate=0.0)
    sekin = next_delay(limits, error_rate=0.10)
    assert sekin > tez


def test_kill_switch_ishlaydi():
    """Jimgina davom etish eng yomon variant."""
    limits = Limits()
    with pytest.raises(KillSwitch):
        next_delay(limits, error_rate=0.30, sorovlar=100)


def test_kill_switch_kichik_namunada_ishlamaydi():
    """Bitta xatodan chiqqan 100% haqiqiy signal emas.

    Ilgari chegara yo'q edi: birinchi so'rov tarmoq uzilishiga
    tushsa ulush 1/1 = 100% chiqib, 6 000 tovarlik yig'ish o'sha
    zahoti to'xtardi.
    """
    limits = Limits()
    # 1 so'rov, 100% xato — hali to'xtatmaydi.
    assert next_delay(limits, error_rate=1.0, sorovlar=1) > 0
    # min_sorov ga yetgach — to'xtatadi.
    with pytest.raises(KillSwitch):
        next_delay(limits, error_rate=1.0, sorovlar=limits.min_sorov)


def test_sekinlashish_cheksiz_emas():
    limits = Limits(per_second=4.0, stop_error_rate=0.99)
    assert next_delay(limits, error_rate=0.9) <= 0.25 * 8


# ---------------------------------------------------------------- proksi


def test_proksisiz_togridan_togri():
    """Ro'yxat bo'sh — bu odatiy hol, xato emas."""
    p = proksilarni_oqi(None)
    assert p.keyingi() is None
    assert p.holat()["jami"] == 0


def test_proksi_royxati_tozalanadi():
    """`.env` da tasodifan qolgan vergul yig'ishni buzmasin."""
    p = proksilarni_oqi("http://a:1, http://b:2 ,, ")
    assert p.manzillar == ("http://a:1", "http://b:2")


def test_navbat_bilan_almashadi():
    p = proksilarni_oqi("http://a:1,http://b:2")
    assert [p.keyingi() for _ in range(4)] == [
        "http://a:1", "http://b:2", "http://a:1", "http://b:2",
    ]


def test_ketma_ket_xato_bergan_proksi_chetlanadi():
    p = Proksilar(manzillar=("http://a:1", "http://b:2"), max_ketma_ket_xato=2)
    p.xato("http://a:1")
    p.xato("http://a:1")
    assert p.tirik() == ["http://b:2"]
    assert p.holat()["to'xtagan"] == ["http://a:1"]
    assert set(p.keyingi() for _ in range(4)) == {"http://b:2"}


def test_muvaffaqiyat_xato_hisobini_tiklaydi():
    """Bitta-yarim xato proksini o'ldirmasin."""
    p = Proksilar(manzillar=("http://a:1",), max_ketma_ket_xato=2)
    p.xato("http://a:1")
    p.yaxshi("http://a:1")
    p.xato("http://a:1")
    assert p.tirik() == ["http://a:1"]


def test_hammasi_toxtasa_togridan_togri_davom_etadi():
    """Hech narsa yig'masdan to'xtash undan yomonroq."""
    p = Proksilar(manzillar=("http://a:1",), max_ketma_ket_xato=1)
    p.xato("http://a:1")
    assert p.keyingi() is None


def test_holat_xato_sonini_ham_korsatadi():
    """"tirik: 2" deb yozib, ikkalasi xato berayotganini yashirmaslik."""
    p = Proksilar(manzillar=("http://a:1", "http://b:2"), max_ketma_ket_xato=5)
    p.xato("http://a:1")
    p.xato("http://a:1")
    assert p.holat()["xatolar"] == {"http://a:1": 2}
