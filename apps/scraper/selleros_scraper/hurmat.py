"""Hurmat rejimi — skreyping qoidalari.

Maqsad: uzoq yillik barqarorlik. Tez yig'ib bir marta bloklanish —
sekin yig'ib yillar davomida ishlashdan yomonroq.

Qoidalar QOIDALAR.md ning 7-bo'limida. Bu yerda ularning kodi.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Limits:
    """Tezlik chegaralari.

    Boshlang'ich qiymat ataylab past: 2-4 so'rov/soniya. Uni oshirish
    o'lchov bilan asoslanishi kerak, "tez bo'lsin" deb emas.
    """

    per_second: float = 3.0
    timeout_s: float = 20.0
    max_retries: int = 4

    # Xato ulushi shundan oshsa — avtomatik sekinlashish.
    slowdown_error_rate: float = 0.05
    # Shundan oshsa — kill-switch: to'xtaydi va odamni chaqiradi.
    stop_error_rate: float = 0.25


def next_delay(limits: Limits, error_rate: float) -> float:
    """Kuzatilgan xato ulushiga qarab keyingi kechikish.

    Xato ko'paysa sekinlashamiz. Bu muzokaradan ko'ra arzon: platforma
    bizni bloklashidan oldin o'zimiz sekinlashsak, kirish ochiq qoladi.
    """
    base = 1.0 / limits.per_second
    if error_rate >= limits.stop_error_rate:
        raise KillSwitch(f"xato ulushi {error_rate:.0%} — to'xtatildi")
    if error_rate >= limits.slowdown_error_rate:
        # Xato qancha ko'p bo'lsa shuncha sekin, lekin 8 barobardan ko'p emas.
        factor = min(8.0, 1.0 + error_rate * 20)
        return base * factor
    return base


class KillSwitch(RuntimeError):
    """Xato darajasi chegaradan oshdi — yig'ish to'xtatildi.

    Jimgina davom etish eng yomon variant: baza buzuq ma'lumot bilan
    to'ladi va buni keyin ajratib bo'lmaydi.
    """
