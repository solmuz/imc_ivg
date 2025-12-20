"""Audit trail model for logging all operations."""
from sqlalchemy import Column, BigInteger, Integer, String, Text, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base


class EntityType(str, enum.Enum):
    """Entity type enumeration for audit."""
    PROJECT = "PROJECT"
    VOLUNTEER = "VOLUNTEER"
    USER = "USER"
    REPORT = "REPORT"
    SESSION = "SESSION"


class ActionType(str, enum.Enum):
    """Action type enumeration for audit."""
    ALTA = "ALTA"
    MODIFICACION = "MODIFICACION"
    ELIMINACION = "ELIMINACION"
    EXPORT = "EXPORT"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    LOGIN_FAILED = "LOGIN_FAILED"


class AuditLog(Base):
    """Audit log model - immutable, only inserts allowed."""
    __tablename__ = "audit_logs"
    
    audit_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.project_id"), nullable=True)  # Optional
    entidad = Column(SQLEnum(EntityType), nullable=False)
    entidad_id = Column(Integer, nullable=False)
    accion = Column(SQLEnum(ActionType), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    detalle_before = Column(Text, nullable=True)  # JSON string
    detalle_after = Column(Text, nullable=True)   # JSON string
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # Relationships
    project = relationship("Project", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")
    
    def __repr__(self):
        return f"<AuditLog {self.audit_id} - {self.accion.value}>"
        