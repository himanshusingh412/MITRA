"""Application configuration.

Every value comes from the environment with a development-safe default. Nothing
secret is ever hardcoded — see SECURITY.md §9.
"""

import os
import secrets
from functools import lru_cache
from pathlib import Path


def _load_env_file() -> None:
    for env_path in [Path(".env"), Path("../.env"), Path(__file__).resolve().parents[2] / ".env"]:
        if env_path.is_file():
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k, v = k.strip(), v.strip()
                            if k and k not in os.environ:
                                os.environ[k] = v
            except Exception:
                pass

_load_env_file()


class Settings:
    """Runtime configuration, read once at import."""

    APP_NAME: str = "MITRA API"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"

    ENV: str = os.getenv("APP_ENV", "development")

    # Citizen and admin tokens are signed with DIFFERENT secrets and carry different
    # audiences. This makes a citizen token cryptographically unverifiable on an admin
    # route — not merely unauthorised. See SECURITY.md §2.
    JWT_CITIZEN_SECRET: str = os.getenv("JWT_CITIZEN_SECRET", secrets.token_urlsafe(32))
    JWT_ADMIN_SECRET: str = os.getenv("JWT_ADMIN_SECRET", secrets.token_urlsafe(32))
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TTL_MINUTES: int = int(os.getenv("JWT_ACCESS_TTL_MINUTES", "15"))

    AUDIENCE_CITIZEN: str = "mitra:citizen"
    AUDIENCE_ADMIN: str = "mitra:admin"

    CORS_ALLOWED_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
        if o.strip()
    ]

    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "100"))
    LOGIN_RATE_LIMIT_PER_HOUR: int = int(os.getenv("LOGIN_RATE_LIMIT_PER_HOUR", "10"))

    DEFAULT_LOCALE: str = os.getenv("DEFAULT_LOCALE", "hi")
    SUPPORTED_LOCALES: list[str] = ["en", "hi", "bn", "ta", "mr"]

    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "gemini")
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    AI_MODEL: str = os.getenv("AI_MODEL", "gemini-3.1-flash-lite")
    AI_TEMPERATURE: float = float(os.getenv("AI_TEMPERATURE", "0.2"))
    AI_MAX_OUTPUT_TOKENS: int = int(os.getenv("AI_MAX_OUTPUT_TOKENS", "2048"))

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
