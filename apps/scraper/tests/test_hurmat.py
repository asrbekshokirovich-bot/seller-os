import pytest

from selleros_scraper.hurmat import KillSwitch, Limits, next_delay


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
        next_delay(limits, error_rate=0.30)


def test_sekinlashish_cheksiz_emas():
    limits = Limits(per_second=4.0, stop_error_rate=0.99)
    assert next_delay(limits, error_rate=0.9) <= 0.25 * 8
