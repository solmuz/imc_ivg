"""Volunteer schemas for request/response validation."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from app.models.volunteer import Sexo, BandaIMC
from app.config import settings


class VolunteerBase(BaseModel):
    """Base volunteer schema."""
    sexo: Sexo
    peso_kg: Decimal = Field(..., gt=0, le=settings.PESO_MAX_KG, decimal_places=2)
    estatura_m: Decimal = Field(..., ge=settings.ESTATURA_MIN_M, le=settings.ESTATURA_MAX_M, decimal_places=2)
    
    @field_validator('peso_kg', 'estatura_m', mode='before')
    @classmethod
    def round_decimal(cls, v):
        """Round to 2 decimal places using half up."""
        if v is not None:
            return Decimal(str(v)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return v


class VolunteerCreate(VolunteerBase):
    """Schema for creating a new volunteer."""
    pass


class VolunteerUpdate(BaseModel):
    """Schema for updating a volunteer."""
    sexo: Optional[Sexo] = None
    peso_kg: Optional[Decimal] = Field(None, gt=0, le=settings.PESO_MAX_KG, decimal_places=2)
    estatura_m: Optional[Decimal] = Field(None, ge=settings.ESTATURA_MIN_M, le=settings.ESTATURA_MAX_M, decimal_places=2)
    
    @field_validator('peso_kg', 'estatura_m', mode='before')
    @classmethod
    def round_decimal(cls, v):
        """Round to 2 decimal places using half up."""
        if v is not None:
            return Decimal(str(v)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return v


class VolunteerDelete(BaseModel):
    """Schema for soft-deleting a volunteer."""
    deletion_reason: Optional[str] = Field(None, max_length=255)


class RegistrarInfo(BaseModel):
    """Minimal user info for volunteer response."""
    user_id: int
    nombre: str
    
    class Config:
        from_attributes = True


class VolunteerResponse(BaseModel):
    """Schema for volunteer response."""
    volunteer_id: int
    project_id: int
    correlativo: int
    sexo: Sexo
    peso_kg: Decimal
    estatura_m: Decimal
    imc: Decimal
    banda_imc: BandaIMC
    registered_by: int
    registrar: Optional[RegistrarInfo] = None
    is_deleted: bool
    deleted_at: Optional[datetime] = None
    deletion_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class VolunteerListResponse(BaseModel):
    """Schema for volunteer list with pagination."""
    volunteers: list[VolunteerResponse]
    total: int
    page: int
    page_size: int


class VolunteerStats(BaseModel):
    """Statistics for volunteers in a project."""
    total: int
    total_active: int
    imc_promedio: Optional[Decimal] = None
    imc_minimo: Optional[Decimal] = None
    imc_maximo: Optional[Decimal] = None
    count_low: int  # Amarillo
    count_normal: int  # Verde
    count_high: int  # Rojo
    count_masculino: int
    count_femenino: int
    count_no_especificado: int
