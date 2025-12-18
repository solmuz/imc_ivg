"""Project schemas for request/response validation."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from app.models.project import ProjectStatus


class ProjectBase(BaseModel):
    """Base project schema."""
    nombre: str = Field(..., min_length=1, max_length=150)
    descripcion: Optional[str] = None


class ProjectCreate(ProjectBase):
    """Schema for creating a new project."""
    responsable_id: int
    fecha_inicio: Optional[date] = None


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""
    nombre: Optional[str] = Field(None, min_length=1, max_length=150)
    descripcion: Optional[str] = None
    responsable_id: Optional[int] = None
    estado: Optional[ProjectStatus] = None


class ResponsableInfo(BaseModel):
    """Minimal user info for project response."""
    user_id: int
    nombre: str
    email: str
    
    class Config:
        from_attributes = True


class ProjectResponse(ProjectBase):
    """Schema for project response."""
    project_id: int
    responsable_id: int
    responsable: Optional[ResponsableInfo] = None
    fecha_inicio: date
    estado: ProjectStatus
    created_by: int
    created_at: datetime
    updated_at: datetime
    volunteer_count: Optional[int] = None
    
    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    """Schema for project list with pagination."""
    projects: list[ProjectResponse]
    total: int
    page: int
    page_size: int
