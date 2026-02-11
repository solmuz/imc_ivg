"""Timezone utilities for handling America/Monterrey timezone."""
from datetime import datetime
import pytz
from app.config import settings


def get_now() -> datetime:
    """
    Get current datetime in the configured timezone (America/Monterrey).
    
    Returns:
        Timezone-aware datetime in America/Monterrey
    """
    tz = pytz.timezone(settings.TIMEZONE)
    return datetime.now(tz)


def utc_now() -> datetime:
    """
    Get current datetime in UTC (for backward compatibility).
    
    Returns:
        Timezone-aware datetime in UTC
    """
    return datetime.now(pytz.UTC)
