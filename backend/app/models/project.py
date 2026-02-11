"""Project model for managing IMC projects."""
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum

from app.database import Base


def _get_now():
    """Factory function to get current time in local timezone (avoids circular imports)."""
    from app.utils.timezone import get_now
    return get_now()


class ProjectStatus(str, enum.Enum):
    """Project status enumeration."""
    ACTIVO = "Activo"
    CERRADO = "Cerrado"
    ARCHIVADO = "Archivado"


class Project(Base):
    """Project model for grouping volunteers."""
    __tablename__ = "projects"
    
    project_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=True)
    responsable_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    fecha_inicio = Column(Date, nullable=False, default=date.today)
    estado = Column(SQLEnum(ProjectStatus), nullable=False, default=ProjectStatus.ACTIVO)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=_get_now)
    updated_at = Column(DateTime, nullable=False, default=_get_now, onupdate=_get_now)
    
    # Relationships
    responsable = relationship(
        "User",
        foreign_keys=[responsable_id],
        back_populates="projects_responsible"
    )
    creator = relationship(
        "User",
        foreign_keys=[created_by],
        back_populates="projects_created"
    )
    volunteers = relationship("Volunteer", back_populates="project", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="project")
    
    def __repr__(self):
        return f"<Project {self.nombre}>"
        