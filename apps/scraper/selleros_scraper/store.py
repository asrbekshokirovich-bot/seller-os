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
        return response.json()

    def yoz(self, client: httpx.Client, partiya: list[dict[str, Any]]) -> dict[str, int]:
        """Partiyani atomik yozadi. Bo'sh partiya — bekorga so'rov emas."""
        if not partiya:
            return {"categories": 0, "shops": 0, "products": 0, "daily": 0, "observations": 0}
        return self._rpc(client, "so_ingest_batch", {"p_platform": self.platform, "p_batch": partiya})

    def sotuvni_hisobla(self, client: httpx.Client, kundan: str, kungacha: str) -> dict[str, Any]:
        return self._rpc(client, "so_rollup_sales", {"p_from": kundan, "p_to": kungacha})
