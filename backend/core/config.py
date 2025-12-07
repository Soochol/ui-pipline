"""Application configuration."""

from typing import List
from pathlib import Path


class Settings:
    """Application settings."""

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    # CORS settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Plugin settings
    PLUGIN_DIR: Path = Path(__file__).parent.parent / "plugins"

    # Logging
    LOG_LEVEL: str = "INFO"

    # API prefix
    API_PREFIX: str = "/api"


settings = Settings()
