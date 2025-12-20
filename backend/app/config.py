"""Application configuration settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Application
    APP_NAME: str = "IMC Management System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database MariaDB - ¡USAR imc_user NO root!
    DB_HOST: str = "localhost"
    DB_PORT: str = "3306"
    DB_USER: str = "imc_user"           # ← ¡CAMBIADO de "root" a "imc_user"!
    DB_PASSWORD: str = "PasswordSeguro123!"  # ← Contraseña que le diste al usuario
    DB_NAME: str = "imc_app"
    
    # Security
    SECRET_KEY: str = "0SIz2/SWXyaqdpI3CfoSkrbt+zdEesB1aff9KCk9a0M="
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Password policies
    PASSWORD_MIN_LENGTH: int = 8
    MIN_PASSWORD_LENGTH: int = 8
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
    AUDIT_RETENTION_DAYS: Optional[int] = None
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Pydantic v2 configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()