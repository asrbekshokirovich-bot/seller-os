"""Bazaga yozish.

PostgREST orqali, `service_role` kaliti bilan. To'g'ridan-to'g'ri
Postgres ulanishi emas: yig'uvchi ko'p parallel ishlaydi va har biri o'z
ulanishini ochsa Supabase ning ulanish chegarasiga uriladi.

Kalit `env` dan olinadi va bu yerdan chiqmaydi (QOIDALAR.md, 3-qoida).
Log ga ham tushmaydi — xato matnida kalit bo'lsa u kesib tashlanadi.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

import httpx


class StoreError(RuntimeError):
    """Bazaga yozib bo'lmadi."""


@dataclass
class Store:
    url: str
    service_key: str
    platform: str = "uzum"

    @classmethod
    def env_dan(cls, platform: str = "uzum") -> "Store":
        url = os.environ.get("SUPABASE_URL", "").rstrip("/")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if not url or not key:
            raise StoreError(
                "SUPABASE_URL yoki SUPABASE_SERVICE_ROLE_KEY berilmagan. "
                ".env.example dan nusxa oling."
            )
        return cls(url=url, service_key=key, platform=platform)

    def _headers(self) -> dict[str, str]:
        return {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json",
        }

    def _rpc(self, client: httpx.Client, nomi: str, args: dict[str, Any]) -> Any:
        response = client.post(
            f"{self.url}/rest/v1/rpc/{nomi}", json=args, headers=self._headers()
        )
        if response.status_code >= 400:
            # Kalit xato matniga tushib qolmasin.
            matn = response.text.replace(self.service_key, "<kalit>")[:300]
            raise StoreError(f"{nomi} bajarilmadi (HTTP {response.status_code}): {matn}")

        # Hech narsa qaytarmaydigan RPC (`void`) PostgREST'da 204 va BO'SH
        # tana bilan keladi. Ilgari bu yerda `response.json()` shartsiz
        # chaqirilardi va `so_sweep_close` — aynan shunday funksiya —
        # JSONDecodeError bilan yiqilardi. Yomon tomoni shundaki, yozish
        # allaqachon MUVAFFAQIYATLI bo'lgan: baza yangilangan, sweep
        # yopilgan, lekin buyruq qizil qaytgan. Ya'ni xato natijani emas,
        # faqat xabarni buzgan — bu esa "yozilmadi" degan noto'g'ri
        # xulosaga olib boradi.
        if response.status_code == 204 or not response.content:
            return None
        try:
            return response.json()
        except ValueError:
            matn = response.text.replace(self.service_key, "<kalit>")[:200]
            raise StoreError(f"{nomi} JSON qaytarmadi (HTTP {response.status_code}): {matn}") from None

    def yoz(self, client: httpx.Client, partiya: list[dict[str, Any]]) -> dict[str, int]:
        """Partiyani atomik yozadi. Bo'sh partiya — bekorga so'rov emas."""
        if not partiya:
            return {"categories": 0, "shops": 0, "products": 0, "daily": 0, "observations": 0}
        return self._rpc(client, "so_ingest_batch", {"p_platform": self.platform, "p_batch": partiya})

    def kuzatuv_royxati(self, client: httpx.Client, limit: int | None = None) -> list[int]:
        """Qaysi tovarlar o'lchanadi.

        Ro'yxat bazada turadi (`selleros.tracked_product`) va turkum
        bo'yicha muvozanatli tanlangan — faqat eng ko'p sotiladiganlar
        emas, aks holda turkum medianasi shishib ketardi.

        RPC qator emas, bitta jsonb massiv qaytaradi. Bu ataylab:
        PostgREST qator qaytaradigan so'rovni 1000 tada kesadi va xato
        bermaydi. Aynan shu zumsavdo sweepini jimgina 2% ga tushirgan
        edi. Bitta skalyar qiymatga bu chegara tegmaydi, ya'ni
        sahifalashni unutish ham mumkin emas.
        """
        javob = self._rpc(client, "so_select_tracked", {"p_limit": limit})
        if not isinstance(javob, list):
            raise StoreError(f"so_select_tracked ro'yxat qaytarmadi: {type(javob).__name__}")
        return [int(x) for x in javob]

    def turkum_royxati(self, client: httpx.Client, limit: int) -> list[int]:
        """Qaysi turkumlarning hajmi oʻlchanadi (talab boʻyicha).

        `kuzatuv_royxati` bilan bir xil sababdan bitta jsonb massiv
        qaytaradi: PostgREST qator qaytaradigan soʻrovni 1000 tada
        JIMGINA kesadi.
        """
        javob = self._rpc(client, "so_turkum_royxati", {"p_limit": limit})
        if not isinstance(javob, list):
            raise StoreError(
                f"so_turkum_royxati ro'yxat qaytarmadi: {type(javob).__name__}")
        return [int(x) for x in javob]

    def turkum_hajmini_yoz(
        self, client: httpx.Client, royxat: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """Uzum aytgan turkum hajmini yozadi."""
        return self._rpc(client, "so_turkum_hajmi_yoz", {"p_royxat": royxat})

    def sotuvni_hisobla(self, client: httpx.Client, kundan: str, kungacha: str) -> dict[str, Any]:
        return self._rpc(client, "so_rollup_sales", {"p_from": kundan, "p_to": kungacha})

    def sweep_ochish(self, client: httpx.Client) -> int:
        """Aylanish boshlanganini yozadi.

        Yozilmasa yig'uvchi jimgina ishlamay qolishi mumkin va buni hech
        narsa ko'rsatmaydi: baza eski ma'lumot bilan to'g'ridek turaveradi.
        """
        return int(self._rpc(client, "so_sweep_open", {"p_platform": self.platform}))

    def sweep_yopish(self, client: httpx.Client, sweep_id: int, hisobot: Any) -> None:
        self._rpc(
            client,
            "so_sweep_close",
            {
                "p_id": sweep_id,
                "p_requested": hisobot.sorovlar,
                "p_found": hisobot.topildi,
                # Bo'sh id XATO EMAS — alohida ustunda.
                "p_missing": hisobot.yoq,
                "p_errors": hisobot.xatolar,
                "p_written": hisobot.yozildi or None,
                "p_stopped_reason": hisobot.toxtadi,
            },
        )

    def frontier_yoz(self, client: httpx.Client, max_id: int, steps: int) -> dict[str, Any]:
        """Kunlik frontier o'lchovini yozadi va YOZILGANINI qaytaradi.

        Uch nomni adashtirmaslik kerak: ish `selleros.frontier_yoz` da
        qoladi, chaqiriladigan uch esa `public.so_frontier_yoz`.
        PostgREST faqat `public` ni ko'radi, shuning uchun ilgari bu
        yerda turgan sxemasiz `frontier_yoz` nomi `public` da
        qidirilardi va topilmasdi — ya'ni zond hech qachon yoza
        olmagan (0051-migratsiya izohiga qarang).

        Qaytgan `max_id` yuborilganidan FARQ qilishi mumkin: baza
        tomonda `greatest(...)` bor va bir kunda ikki marta o'lchansa
        kattasi qoladi. Chaqiruvchi shuning uchun qaytgan qiymatga
        qaraydi, o'zi yuborganiga emas.
        """
        javob = self._rpc(client, "so_frontier_yoz", {
            "p_platform": self.platform,
            "p_max_id": max_id,
            "p_steps": steps,
        })
        if not isinstance(javob, dict):
            raise StoreError(
                f"so_frontier_yoz kutilmagan javob qaytardi: {type(javob).__name__}"
            )
        return javob
