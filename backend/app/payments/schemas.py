from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, StrictInt


class EmptyPaymentLinkRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class PaymentLinkResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["payment_link_ready"] = "payment_link_ready"
    payment_url: str
    amount_paise: StrictInt
    currency: Literal["INR"]


class PaymentStatusResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["created", "paid", "expired", "cancelled"]
    amount_paise: StrictInt
    currency: Literal["INR"]
    paid_at: datetime | None = None


class WebhookResponse(BaseModel):
    received: bool = True
    duplicate: bool = False
