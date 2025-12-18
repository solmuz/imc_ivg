"""Audit trail router."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional

from app.database import get_db
from app.models.user import User, UserRole
from app.models.audit import AuditLog, EntityType, ActionType
from app.schemas.audit import AuditLogResponse, AuditLogListResponse
from app.utils.auth import get_current_active_user

router = APIRouter(prefix="/api/audit", tags=["Audit Trail"])


@router.get("/", response_model=AuditLogListResponse)
async def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    project_id: Optional[int] = None,
    entidad: Optional[EntityType] = None,
    accion: Optional[ActionType] = None,
    user_id: Optional[int] = None,
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get audit logs with filters.
    - Admin: Full access to all logs
    - Calidad: Read-only access to all logs
    - Usuario: No access
    """
    # Check permissions
    if current_user.rol == UserRole.USUARIO:
        raise HTTPException(
            status_code=403,
            detail="No tiene permisos para ver el audit trail"
        )
    
    query = db.query(AuditLog).options(joinedload(AuditLog.user))
    
    # Apply filters
    if project_id is not None:
        query = query.filter(AuditLog.project_id == project_id)
    if entidad is not None:
        query = query.filter(AuditLog.entidad == entidad)
    if accion is not None:
        query = query.filter(AuditLog.accion == accion)
    if user_id is not None:
        query = query.filter(AuditLog.user_id == user_id)
    if fecha_desde is not None:
        query = query.filter(AuditLog.created_at >= fecha_desde)
    if fecha_hasta is not None:
        query = query.filter(AuditLog.created_at <= fecha_hasta)
    
    # Order by most recent first
    query = query.order_by(AuditLog.created_at.desc())
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    logs = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return AuditLogListResponse(
        logs=[AuditLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/project/{project_id}", response_model=AuditLogListResponse)
async def get_project_audit_logs(
    project_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    accion: Optional[ActionType] = None,
    user_id: Optional[int] = None,
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get audit logs for a specific project."""
    # Check permissions
    if current_user.rol == UserRole.USUARIO:
        raise HTTPException(
            status_code=403,
            detail="No tiene permisos para ver el audit trail"
        )
    
    query = db.query(AuditLog).options(
        joinedload(AuditLog.user)
    ).filter(AuditLog.project_id == project_id)
    
    # Apply filters
    if accion is not None:
        query = query.filter(AuditLog.accion == accion)
    if user_id is not None:
        query = query.filter(AuditLog.user_id == user_id)
    if fecha_desde is not None:
        query = query.filter(AuditLog.created_at >= fecha_desde)
    if fecha_hasta is not None:
        query = query.filter(AuditLog.created_at <= fecha_hasta)
    
    # Order by most recent first
    query = query.order_by(AuditLog.created_at.desc())
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    logs = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return AuditLogListResponse(
        logs=[AuditLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{audit_id}", response_model=AuditLogResponse)
async def get_audit_log(
    audit_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific audit log entry."""
    # Check permissions
    if current_user.rol == UserRole.USUARIO:
        raise HTTPException(
            status_code=403,
            detail="No tiene permisos para ver el audit trail"
        )
    
    log = db.query(AuditLog).options(
        joinedload(AuditLog.user)
    ).filter(AuditLog.audit_id == audit_id).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="Registro de auditoría no encontrado")
    
    return AuditLogResponse.model_validate(log)
