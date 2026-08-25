"""Hurmat rejimi — skreyping qoidalari.

Maqsad: uzoq yillik barqarorlik. Tez yig'ib bir marta bloklanish —
sekin yig'ib yillar davomida ishlashdan yomonroq.

Qoidalar QOIDALAR.md ning 7-bo'limida. Bu yerda ularning kodi.
"""

from dataclasses import dataclass, field


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
    #: Kill-switch shuncha so'rovdan OLDIN ishlamaydi.
    #:
    #: Ilgari chegara yo'q edi va birinchi so'rov xato bersa ulush
    #: 1/1 = 100% chiqib, butun yig'ish o'sha zahoti to'xtardi.
    #: Ya'ni bitta tasodifiy tarmoq uzilishi 6 000 tovarlik ishni
    #: o'ldirardi.
    #:
    #: Bu KPI panelidagi "kichik namuna" muammosining aynan o'zi:
    #: bitta kuzatuvdan chiqqan foiz qaror uchun yaroqsiz.
    min_sorov: int = 20


def next_delay(limits: Limits, error_rate: float, sorovlar: int = 0) -> float:
    """Kuzatilgan xato ulushiga qarab keyingi kechikish.

    Xato ko'paysa sekinlashamiz. Bu muzokaradan ko'ra arzon: platforma
    bizni bloklashidan oldin o'zimiz sekinlashsak, kirish ochiq qoladi.

    `sorovlar` — shu paytgacha yuborilgan so'rovlar soni. Kill-switch
    `min_sorov` dan kam namunada ISHLAMAYDI: bitta xatodan chiqqan
    100% haqiqiy signal emas.
    """
    base = 1.0 / limits.per_second
    if error_rate >= limits.stop_error_rate and sorovlar >= limits.min_sorov:
        raise KillSwitch(
            f"xato ulushi {error_rate:.0%} ({sorovlar} so'rovda) — to'xtatildi")
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


# ---------------------------------------------------------------- proksi
#
# Reja, B1: "Navbat (pg-boss), proksi rotatsiya, tezlik chegarasi,
# backoff, kill-switch". Oxirgi uchtasi yuqorida bor edi, proksi
# rotatsiya yo'q edi.
#
# NEGA KERAK. Hozir hamma so'rov bitta IP dan ketadi. Uzum uni
# bloklasa, yig'ish BUTUNLAY to'xtaydi va tiklash uchun odam kerak
# bo'ladi. Bir nechta manzil bo'lsa, bittasi yiqilganda qolgani
# ishlayveradi.
#
# RO'YXAT BO'SH BO'LSA — TO'G'RIDAN-TO'G'RI. Bu odatiy hol va u
# xato emas: bugun proksi sotib olinmagan. Kod tayyor turadi va
# `SKREYPER_PROKSI` berilganda o'zi ishlay boshlaydi.


@dataclass
class Proksilar:
    """Proksi manzillarini navbat bilan beradi va yiqilganini chetlaydi.

    Ketma-ket `max_ketma_ket_xato` marta xato bergan manzil
    "to'xtatilgan" bo'ladi va boshqa berilmaydi. Bu jimgina
    bo'lmaydi: `holat()` uni ko'rsatadi va hisobotga tushadi.
    """

    manzillar: tuple[str, ...] = ()
    max_ketma_ket_xato: int = 3
    _keyingi: int = 0
    _xatolar: dict[str, int] = field(default_factory=dict)
    _toxtagan: set[str] = field(default_factory=set)

    def tirik(self) -> list[str]:
        return [m for m in self.manzillar if m not in self._toxtagan]

    def keyingi(self) -> str | None:
        """Navbatdagi tirik manzil. `None` — to'g'ridan-to'g'ri.

        `None` ikki holatda qaytadi: ro'yxat bo'sh (proksi sotib
        olinmagan) yoki hammasi to'xtagan. Ikkinchisida yig'ish
        TO'XTAMAYDI — to'g'ridan-to'g'ri davom etadi, chunki
        hech narsa yig'masdan to'xtash undan yomonroq.
        """
        tirik = self.tirik()
        if not tirik:
            return None
        manzil = tirik[self._keyingi % len(tirik)]
        self._keyingi += 1
        return manzil

    def xato(self, manzil: str | None) -> None:
        if manzil is None:
            return
        soni = self._xatolar.get(manzil, 0) + 1
        self._xatolar[manzil] = soni
        if soni >= self.max_ketma_ket_xato:
            self._toxtagan.add(manzil)

    def yaxshi(self, manzil: str | None) -> None:
        """Muvaffaqiyatli so'rov ketma-ket xato hisobini nolga qaytaradi."""
        if manzil is not None:
            self._xatolar[manzil] = 0

    def holat(self) -> dict:
        """Hisobot uchun. To'xtagan proksi ko'rinib turishi SHART."""
        return {
            "jami": len(self.manzillar),
            "tirik": len(self.tirik()),
            "to'xtagan": sorted(self._toxtagan),
            # Ketma-ket xato soni ham ko'rsatiladi: "tirik: 2" deb
            # yozib, ikkalasi ham xato berayotganini yashirish
            # aynan jim nosozlik bo'lardi.
            "xatolar": {m: n for m, n in sorted(self._xatolar.items()) if n},
        }


def proksilarni_oqi(matn: str | None) -> Proksilar:
    """Vergul bilan ajratilgan ro'yxatni o'qiydi.

    Bo'sh satr va bo'shliqlar tashlanadi: `.env` da tasodifan
    qolgan vergul yig'ishni buzmasin.
    """
    if not matn:
        return Proksilar()
    manzillar = tuple(m.strip() for m in matn.split(",") if m.strip())
    return Proksilar(manzillar=manzillar)
