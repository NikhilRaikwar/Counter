from __future__ import annotations

from functools import lru_cache

from pydantic import AnyHttpUrl, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Counter API"
    environment: str = "development"
    database_url: str = "sqlite+aiosqlite:///./counter.db"
    frontend_url: AnyHttpUrl = AnyHttpUrl("http://localhost:8080")
    backend_url: AnyHttpUrl = AnyHttpUrl("http://localhost:8000")

    openrouter_api_key: SecretStr | None = Field(default=None, repr=False)
    openrouter_model: str = "openai/gpt-5.4-mini"
    openrouter_fallback_model: str = "anthropic/claude-sonnet-4.6"
    openrouter_base_url: AnyHttpUrl = AnyHttpUrl("https://openrouter.ai/api/v1")
    openrouter_timeout_seconds: float = Field(default=20.0, gt=0, le=60)
    langgraph_checkpoint_path: str = "./counter_graph.db"
    razorpay_key_id: SecretStr | None = Field(default=None, repr=False)
    razorpay_key_secret: SecretStr | None = Field(default=None, repr=False)
    razorpay_webhook_secret: SecretStr | None = Field(default=None, repr=False)
    langsmith_api_key: SecretStr | None = Field(default=None, repr=False)
    langsmith_tracing: bool = False
    langsmith_project: str = "counter-dev"

    @field_validator("database_url")
    @classmethod
    def require_async_database_driver(cls, value: str) -> str:
        if not value.startswith(("sqlite+aiosqlite://", "postgresql+asyncpg://")):
            raise ValueError(
                "DATABASE_URL must use an async driver: sqlite+aiosqlite or postgresql+asyncpg"
            )
        return value

    @property
    def cors_origins(self) -> list[str]:
        return [str(self.frontend_url).rstrip("/")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
