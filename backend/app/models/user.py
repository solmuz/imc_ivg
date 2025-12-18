"""User model for authentication and authorization."""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base


class UserRole(str, enum.Enum):
    """User roles enumeration."""
    ADMINISTRADOR = "Administrador"
    CALIDAD = "Calidad"
    USUARIO = "Usuario"


class UserStatus(str, enum.Enum):
    """User status enumeration."""
    ACTIVO = "Activo"
    INACTIVO = "Inactivo"


class User(Base):
    """User model for the system."""
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    rol = Column(SQLEnum(UserRole), nullable=False, default=UserRole.USUARIO)
    estado = Column(SQLEnum(UserStatus), nullable=False, default=UserStatus.ACTIVO)
    force_password_change = Column(Boolean, default=False)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    projects_responsible = relationship(
        "Project", 
        foreign_keys="Project.responsable_id",
        back_populates="responsable"
    )
    projects_created = relationship(
        "Project",
        foreign_keys="Project.created_by",
        back_populates="creator"
    )
    volunteers_registered = relationship(
        "Volunteer",
        foreign_keys="Volunteer.registered_by",
        back_populates="registrar"
    )
    volunteers_deleted = relationship(
        "Volunteer",
        foreign_keys="Volunteer.deleted_by",
        back_populates="deleter"
    )
    audit_logs = relationship("AuditLog", back_populates="user")
    
    def __repr__(self):
        return f"<User {self.email}>"
