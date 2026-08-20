from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Enum,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    DateTime,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


def new_id() -> str:
    return str(uuid.uuid4())


class OfferStatus(str, enum.Enum):
    DRAFT = "draft"
    LIVE = "live"
    PAUSED = "paused"
    ARCHIVED = "archived"


class DealStatus(str, enum.Enum):
    NEGOTIATING = "negotiating"
    AGREED = "agreed"
    PAYMENT_PENDING = "payment_pending"
    PAID = "paid"
    BLOCKED = "blocked"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class MessageSender(str, enum.Enum):
    BUYER = "buyer"
    COUNTER = "counter"
    SYSTEM = "system"


class PaymentExecutionStatus(str, enum.Enum):
    CLAIMED = "claimed"
    CREATING = "creating"
    READY = "ready"
    PAID = "paid"
    FAILED = "failed"
    UNKNOWN = "unknown"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class WebhookProcessingStatus(str, enum.Enum):
    RECEIVED = "received"
    PROCESSED = "processed"
    IGNORED = "ignored"
    FAILED = "failed"


enum_args = {"native_enum": False, "validate_strings": True, "length": 32}


class Offer(TimestampMixin, Base):
    __tablename__ = "offers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    public_slug: Mapped[str | None] = mapped_column(String(160), unique=True)
    management_capability_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    merchant_name: Mapped[str] = mapped_column(String(160), nullable=False)
    product_name: Mapped[str] = mapped_column(String(240), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(2048))
    list_price_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    status: Mapped[OfferStatus] = mapped_column(
        Enum(OfferStatus, name="offer_status", **enum_args), nullable=False, default=OfferStatus.DRAFT
    )

    policy_versions: Mapped[list[PolicyVersion]] = relationship(back_populates="offer")
    deals: Mapped[list[Deal]] = relationship(back_populates="offer")

    __table_args__ = (
        CheckConstraint("list_price_paise > 0", name="positive_list_price"),
        CheckConstraint("length(currency) = 3", name="currency_length"),
    )


class PolicyVersion(Base):
    __tablename__ = "policy_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    offer_id: Mapped[str] = mapped_column(ForeignKey("offers.id", ondelete="CASCADE"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    list_price_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    floor_price_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    max_discount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    max_rounds: Mapped[int] = mapped_column(Integer, nullable=False)
    expiry_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    raw_rules: Mapped[str] = mapped_column(Text, nullable=False)
    policy_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="CURRENT_TIMESTAMP", nullable=False
    )

    offer: Mapped[Offer] = relationship(back_populates="policy_versions")
    deals: Mapped[list[Deal]] = relationship(back_populates="policy_version")

    __table_args__ = (
        UniqueConstraint("offer_id", "version"),
        CheckConstraint("version > 0", name="positive_version"),
        CheckConstraint("list_price_paise > 0", name="positive_list_price"),
        CheckConstraint("floor_price_paise >= 0", name="nonnegative_floor"),
        CheckConstraint("max_discount_paise >= 0", name="nonnegative_discount"),
        CheckConstraint("max_rounds > 0", name="positive_max_rounds"),
        CheckConstraint("expiry_minutes > 0", name="positive_expiry"),
        CheckConstraint("length(currency) = 3", name="currency_length"),
    )


class Deal(TimestampMixin, Base):
    __tablename__ = "deals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    offer_id: Mapped[str] = mapped_column(ForeignKey("offers.id", ondelete="RESTRICT"), nullable=False)
    policy_version_id: Mapped[str] = mapped_column(
        ForeignKey("policy_versions.id", ondelete="RESTRICT"), nullable=False
    )
    public_session_token_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    status: Mapped[DealStatus] = mapped_column(
        Enum(DealStatus, name="deal_status", **enum_args),
        nullable=False,
        default=DealStatus.NEGOTIATING,
    )
    current_round: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    accepted_amount_paise: Mapped[int | None] = mapped_column(BigInteger)
    accepted_currency: Mapped[str | None] = mapped_column(String(3))
    accepted_bundle_id: Mapped[str | None] = mapped_column(String(120))
    agreement_locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_counter_amount_paise: Mapped[int | None] = mapped_column(BigInteger)
    candidate_action: Mapped[str | None] = mapped_column(String(32))
    candidate_amount_paise: Mapped[int | None] = mapped_column(BigInteger)
    candidate_bundle_id: Mapped[str | None] = mapped_column(String(120))
    candidate_validation_status: Mapped[str | None] = mapped_column(String(32))
    candidate_violation_codes: Mapped[list[str] | None] = mapped_column(JSON)

    offer: Mapped[Offer] = relationship(back_populates="deals")
    policy_version: Mapped[PolicyVersion] = relationship(back_populates="deals")
    messages: Mapped[list[DealMessage]] = relationship(back_populates="deal")
    payment_executions: Mapped[list[PaymentExecution]] = relationship(back_populates="deal")

    __table_args__ = (
        CheckConstraint("current_round >= 0", name="nonnegative_round"),
        CheckConstraint(
            "accepted_amount_paise IS NULL OR accepted_amount_paise > 0",
            name="positive_accepted_amount",
        ),
        CheckConstraint(
            "candidate_amount_paise IS NULL OR candidate_amount_paise > 0",
            name="positive_candidate_amount",
        ),
    )


class DealMessage(Base):
    __tablename__ = "deal_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    deal_id: Mapped[str] = mapped_column(ForeignKey("deals.id", ondelete="CASCADE"), nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    sender: Mapped[MessageSender] = mapped_column(
        Enum(MessageSender, name="message_sender", **enum_args), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    client_message_id: Mapped[str | None] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="CURRENT_TIMESTAMP", nullable=False
    )

    deal: Mapped[Deal] = relationship(back_populates="messages")

    __table_args__ = (
        UniqueConstraint("deal_id", "sequence"),
        UniqueConstraint("deal_id", "client_message_id"),
        CheckConstraint("sequence >= 0", name="nonnegative_sequence"),
    )


class PaymentExecution(TimestampMixin, Base):
    __tablename__ = "payment_executions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    deal_id: Mapped[str] = mapped_column(ForeignKey("deals.id", ondelete="RESTRICT"), nullable=False)
    execution_identity: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    reference_id: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    status: Mapped[PaymentExecutionStatus] = mapped_column(
        Enum(PaymentExecutionStatus, name="payment_execution_status", **enum_args),
        nullable=False,
        default=PaymentExecutionStatus.CLAIMED,
    )
    provider_payment_link_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    provider_payment_id: Mapped[str | None] = mapped_column(String(80), unique=True)
    short_url: Mapped[str | None] = mapped_column(String(500))
    error_code: Mapped[str | None] = mapped_column(String(120))

    deal: Mapped[Deal] = relationship(back_populates="payment_executions")

    __table_args__ = (
        CheckConstraint("amount_paise > 0", name="positive_amount"),
        CheckConstraint("length(currency) = 3", name="currency_length"),
        Index("ix_payment_executions_deal_status", "deal_id", "status"),
    )


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    provider_event_id: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    event_type: Mapped[str] = mapped_column(String(120), nullable=False)
    processing_status: Mapped[WebhookProcessingStatus] = mapped_column(
        Enum(WebhookProcessingStatus, name="webhook_processing_status", **enum_args),
        nullable=False,
        default=WebhookProcessingStatus.RECEIVED,
    )
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    error_code: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="CURRENT_TIMESTAMP", nullable=False
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
