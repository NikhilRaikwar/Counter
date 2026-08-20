from __future__ import annotations

from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StrictInt, StringConstraints, model_validator

NonBlank = Annotated[str, StringConstraints(strict=True, strip_whitespace=True, min_length=1)]


class AgentAction(StrEnum):
    COUNTER = "counter"
    OFFER_BUNDLE = "offer_bundle"
    ACCEPT = "accept"
    REFUSE = "refuse"
    CLARIFY = "clarify"


class AgentDecision(BaseModel):
    """An untrusted model proposal. It never represents financial approval."""

    model_config = ConfigDict(extra="forbid")

    action: AgentAction
    proposed_amount_paise: Annotated[StrictInt, Field(gt=0, le=10_000_000_000)] | None = None
    bundle_id: Annotated[str, StringConstraints(strict=True, pattern=r"^[a-z0-9][a-z0-9_-]{0,119}$")] | None = None
    message: NonBlank = Field(max_length=2_000)
    reason_code: Annotated[str, StringConstraints(strict=True, pattern=r"^[a-z][a-z0-9_]{0,63}$")] | None = None

    @model_validator(mode="after")
    def validate_action_fields(self) -> "AgentDecision":
        if self.action in {AgentAction.COUNTER, AgentAction.ACCEPT} and self.proposed_amount_paise is None:
            raise ValueError("counter and accept decisions require proposed_amount_paise")
        if self.action == AgentAction.OFFER_BUNDLE and (
            self.bundle_id is None or self.proposed_amount_paise is None
        ):
            raise ValueError("offer_bundle decisions require bundle_id and proposed_amount_paise")
        return self
