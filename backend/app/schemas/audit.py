"""Audit log schemas for request/response validation."""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.audit import EntityType, ActionType


class AuditUserInfo(BaseModel):
    """Minimal user info for audit response."""
    user_id: int
    nombre: str
    email: str
    
    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    """Schema for audit log response."""
    audit_id: int
    project_id: Optional[int]
    entidad: EntityType
    entidad_id: int
    accion: ActionType
    user_id: int
    user: Optional[AuditUserInfo] = None
    detalle_before: Optional[str]
    detalle_after: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class AuditLogFilter(BaseModel):
    """Schema for filtering audit logs."""
    project_id: Optional[int] = None
    entidad: Optional[EntityType] = None
    accion: Optional[ActionType] = None
    user_id: Optional[int] = None
    fecha_desde: Optional[datetime] = None
    fecha_hasta: Optional[datetime] = None


class AuditLogListResponse(BaseModel):
    """Schema for audit log list with pagination."""
    logs: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
