from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

import httpx


class RazorpayFailure(Exception):
    def __init__(self, code: str, *, ambiguous: bool = False) -> None:
        super().__init__(code)
        self.code = code
        self.ambiguous = ambiguous


@dataclass(frozen=True)
class RazorpayPaymentLink:
    id: str
    short_url: str
    status: str
    reference_id: str
    amount: int
    currency: str


class PaymentLinksClient(Protocol):
    async def create_standard_payment_link(
        self, *, amount: int, currency: str, reference_id: str, expire_by: int
    ) -> RazorpayPaymentLink: ...


class UnconfiguredPaymentLinksClient:
    async def create_standard_payment_link(
        self, *, amount: int, currency: str, reference_id: str, expire_by: int
    ) -> RazorpayPaymentLink:
        raise RazorpayFailure("razorpay_not_configured")


class RazorpayPaymentLinksClient:
    def __init__(self, key_id: str, key_secret: str, timeout_seconds: float = 15.0) -> None:
        if not key_id.startswith("rzp_test_"):
            raise ValueError("Counter permits Razorpay Test Mode credentials only")
        self._auth = (key_id, key_secret)
        self._timeout = timeout_seconds

    async def create_standard_payment_link(
        self, *, amount: int, currency: str, reference_id: str, expire_by: int
    ) -> RazorpayPaymentLink:
        payload: dict[str, Any] = {
            "amount": amount,
            "currency": currency,
            "accept_partial": False,
            "reference_id": reference_id,
            "description": "Counter verified deal",
            "expire_by": expire_by,
            "notify": {"sms": False, "email": False},
            "reminder_enable": False,
        }
        try:
            async with httpx.AsyncClient(
                base_url="https://api.razorpay.com/v1",
                auth=self._auth,
                timeout=self._timeout,
            ) as client:
                response = await client.post("/payment_links", json=payload)
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise RazorpayFailure("razorpay_result_unknown", ambiguous=True) from exc
        if response.status_code >= 400:
            code = "razorpay_rejected" if response.status_code < 500 else "razorpay_unavailable"
            raise RazorpayFailure(code)
        try:
            data = response.json()
            return RazorpayPaymentLink(
                id=data["id"],
                short_url=data["short_url"],
                status=data["status"],
                reference_id=data["reference_id"],
                amount=int(data["amount"]),
                currency=data["currency"],
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise RazorpayFailure("razorpay_invalid_response", ambiguous=True) from exc
