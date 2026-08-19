"""Uzum uchun anonim token.

`graphql.uzum.uz` tokensiz so'rovni 401 bilan rad etadi. Token
`id.uzum.uz/api/auth/token` dan olinadi — bu ochiq uch, saytning o'zi ham
shu yo'ldan foydalanadi.

Sarlavhalar tajribada aniqlangan (qayta topish qimmat bo'lgani uchun
yozib qo'yilgan):

  - `Origin` va `Referer` bo'lmasa   -> `insufficient_headers`
  - `App-Version`/`Version` yuborilsa -> `unallowed_app`

Ya'ni kamroq sarlavha yuborish kerak, ko'proq emas. Bu odatdagidan
teskari, shuning uchun yozilgan.

Token javob tanasida EMAS, `set-cookie: access_token=` da keladi.
"""

from __future__ import annotations

import base64
import json
import time
from dataclasses import dataclass, field

import httpx

TOKEN_URL = "https://id.uzum.uz/api/auth/token"

# Muddati tugashidan shuncha oldin yangilanadi. So'rov o'rtasida token
# o'lib qolsa butun partiya 401 bo'ladi.
REFRESH_MARGIN_S = 5 * 60


class TokenError(RuntimeError):
    """Token olinmadi. So'rovlarni davom ettirish ma'nosiz."""


def _expiry(jwt: str) -> float:
    """JWT ichidagi `exp`. O'qib bo'lmasa 0 — ya'ni darhol yangilanadi."""
    try:
        payload = jwt.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        return float(json.loads(base64.urlsafe_b64decode(payload))["exp"])
    except Exception:
        return 0.0


@dataclass
class TokenProvider:
    user_agent: str
    installation_id: str
    language: str = "uz-UZ"
    _token: str | None = field(default=None, repr=False)
    _expires_at: float = 0.0

    def headers(self, token: str) -> dict[str, str]:
        """Har GraphQL so'rovi uchun sarlavhalar."""
        return {
            "Content-Type": "application/json",
            "User-Agent": self.user_agent,
            "x-iid": self.installation_id,
            "Accept-Language": self.language,
            "Origin": "https://uzum.uz",
            "Referer": "https://uzum.uz/",
            "Authorization": f"Bearer {token}",
        }

    def get(self, client: httpx.Client) -> str:
        if self._token and time.time() < self._expires_at - REFRESH_MARGIN_S:
            return self._token
        return self._fetch(client)

    def invalidate(self) -> None:
        """401 kelganda chaqiriladi — keyingi so'rov yangi token oladi."""
        self._token = None
        self._expires_at = 0.0

    def _fetch(self, client: httpx.Client) -> str:
        response = client.post(
            TOKEN_URL,
            content="{}",
            headers={
                "Content-Type": "application/json",
                "User-Agent": self.user_agent,
                "x-iid": self.installation_id,
                "Accept-Language": self.language,
                "Origin": "https://uzum.uz",
                "Referer": "https://uzum.uz/",
            },
        )
        if response.status_code not in (200, 204):
            raise TokenError(
                f"Token olinmadi (HTTP {response.status_code}): {response.text[:200]}"
            )

        # Token cookie da keladi, tanada emas.
        for cookie in response.headers.get_list("set-cookie"):
            if cookie.startswith("access_token="):
                token = cookie.split("=", 1)[1].split(";", 1)[0]
                self._token = token
                self._expires_at = _expiry(token)
                return token

        raise TokenError("Javobda `access_token` cookie topilmadi.")
