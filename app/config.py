"""Application configuration settings."""
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Application
    APP_NAME: str = "IMC Management System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite:///./imc_database.db"
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-change-in-production-minimum-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Password policies
    PASSWORD_MIN_LENGTH: int = 8
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15
    
    # Session
    SESSION_TIMEOUT_MINUTES: int = 30
    
    # Timezone
    TIMEZONE: str = "America/Monterrey"
    
    # Validation limits
    PESO_MIN_KG: float = 0.01
    PESO_MAX_KG: float = 500.00
    ESTATURA_MIN_M: float = 1.00
    ESTATURA_MAX_M: float = 2.50
    
    # IMC thresholds
    IMC_LOW_THRESHOLD: float = 18.00
    IMC_HIGH_THRESHOLD: float = 27.00
    
    # Audit
    AUDIT_RETENTION_DAYS: Optional[int] = None  # None = indefinite
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
