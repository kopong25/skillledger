from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    app_name: str = "SkillsLedger"
    version: str = "1.0.0"
    debug: bool = False

    # Security
    jwt_secret: str = "dev-secret-change-in-production-must-be-32-chars"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 30

    # GitHub
    github_token: str = ""

    # Database
    db_path: str = ""

    # Server
    port: int = 10000
    environment: str = "development"

    @property
    def database_url(self) -> str:
        if self.db_path:
            return f"sqlite+aiosqlite:///{self.db_path}"
        if self.environment == "production":
            return "sqlite+aiosqlite:////var/data/SkillsLedger.db"
        return "sqlite+aiosqlite:///./SkillsLedger.db"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


def get_settings() -> Settings:
    return Settings()
