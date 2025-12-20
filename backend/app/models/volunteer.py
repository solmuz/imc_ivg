"""Volunteer model for IMC records."""
from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, Enum as SQLEnum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base


class Sexo(str, enum.Enum):
    """Sex enumeration."""
    M = "M"
    F = "F"
    NO_ESPECIFICADO = "No especificado"


class BandaIMC(str, enum.Enum):
    """IMC band/category enumeration."""
    LOW = "LOW"      # Amarillo - IMC < 18.00
    NORMAL = "NORMAL"  # Verde - 18.00 <= IMC <= 27.00
    HIGH = "HIGH"    # Rojo - IMC > 27.00


class Volunteer(Base):
    """Volunteer model with IMC data."""
    __tablename__ = "volunteers"
    
    volunteer_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.project_id"), nullable=False)
    correlativo = Column(Integer, nullable=False)  # Auto-assigned per project
    sexo = Column(SQLEnum(Sexo), nullable=False)
    peso_kg = Column(Numeric(5, 2), nullable=False)  # Max 999.99 kg
    estatura_m = Column(Numeric(3, 2), nullable=False)  # Max 9.99 m
    imc = Column(Numeric(5, 2), nullable=False)  # Calculated field
    banda_imc = Column(SQLEnum(BandaIMC), nullable=False)
    registered_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    is_deleted = Column(Boolean, default=False)
    deleted_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    deletion_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Unique constraint: correlativo must be unique within a project
    __table_args__ = (
        UniqueConstraint('project_id', 'correlativo', name='uq_project_correlativo'),
    )
    
    # Relationships
    project = relationship("Project", back_populates="volunteers")
    registrar = relationship(
        "User",
        foreign_keys=[registered_by],
        back_populates="volunteers_registered"
    )
    deleter = relationship(
        "User",
        foreign_keys=[deleted_by],
        back_populates="volunteers_deleted"
    )
    
    def __repr__(self):
        return f"<Volunteer {self.correlativo} - Project {self.project_id}>"
        