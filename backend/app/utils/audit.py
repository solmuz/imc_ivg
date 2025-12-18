"""Audit trail utilities."""
import json
from datetime import datetime
from typing import Optional, Any
from sqlalchemy.orm import Session

from app.models.audit import AuditLog, EntityType, ActionType
from app.models.user import User


def create_audit_log(
    db: Session,
    user: User,
    entidad: EntityType,
    entidad_id: int,
    accion: ActionType,
    project_id: Optional[int] = None,
    detalle_before: Optional[dict] = None,
    detalle_after: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> AuditLog:
    """
    Create an audit log entry.
    
    Args:
        db: Database session
        user: User performing the action
        entidad: Entity type being affected
        entidad_id: ID of the entity
        accion: Type of action performed
        project_id: Optional project ID for project-level audit
        detalle_before: Optional dict with state before change
        detalle_after: Optional dict with state after change
        ip_address: Optional client IP address
        user_agent: Optional client user agent
    
    Returns:
        Created AuditLog instance
    """
    audit = AuditLog(
        project_id=project_id,
        entidad=entidad,
        entidad_id=entidad_id,
        accion=accion,
        user_id=user.user_id,
        detalle_before=json.dumps(detalle_before, default=str) if detalle_before else None,
        detalle_after=json.dumps(detalle_after, default=str) if detalle_after else None,
        ip_address=ip_address,
        user_agent=user_agent,
        created_at=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit


def model_to_dict(model: Any, exclude: list = None) -> dict:
    """
    Convert a SQLAlchemy model to a dictionary for audit logging.
    
    Args:
        model: SQLAlchemy model instance
        exclude: List of field names to exclude
    
    Returns:
        Dictionary representation of the model
    """
    exclude = exclude or []
    result = {}
    for column in model.__table__.columns:
        if column.name not in exclude:
            value = getattr(model, column.name)
            # Handle special types
            if isinstance(value, datetime):
                value = value.isoformat()
            elif hasattr(value, 'value'):  # Enum
                value = value.value
            result[column.name] = value
    return result
