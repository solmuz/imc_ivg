"""Projects management router."""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional

from app.database import get_db
from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus
from app.models.volunteer import Volunteer
from app.models.audit import EntityType, ActionType
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse
from app.utils.auth import get_current_active_user, require_admin_or_user, require_admin_or_calidad
from app.utils.audit import create_audit_log, model_to_dict

router = APIRouter(prefix="/api/projects", tags=["Projects"])


@router.get("/", response_model=ProjectListResponse)
async def get_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    estado: Optional[ProjectStatus] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all projects with pagination and filters."""
    query = db.query(Project).options(joinedload(Project.responsable))
    
    # Apply filters
    if estado:
        query = query.filter(Project.estado == estado)
    if search:
        query = query.filter(Project.nombre.ilike(f"%{search}%"))
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    projects = query.offset((page - 1) * page_size).limit(page_size).all()
    
    # Add volunteer count to each project
    project_responses = []
    for project in projects:
        volunteer_count = db.query(func.count(Volunteer.volunteer_id)).filter(
            Volunteer.project_id == project.project_id,
            Volunteer.is_deleted == False
        ).scalar()
        
        response = ProjectResponse.model_validate(project)
        response.volunteer_count = volunteer_count
        project_responses.append(response)
    
    return ProjectListResponse(
        projects=project_responses,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific project."""
    project = db.query(Project).options(
        joinedload(Project.responsable)
    ).filter(Project.project_id == project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Get volunteer count
    volunteer_count = db.query(func.count(Volunteer.volunteer_id)).filter(
        Volunteer.project_id == project_id,
        Volunteer.is_deleted == False
    ).scalar()
    
    response = ProjectResponse.model_validate(project)
    response.volunteer_count = volunteer_count
    return response


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    request: Request,
    project_data: ProjectCreate,
    current_user: User = Depends(require_admin_or_user),
    db: Session = Depends(get_db)
):
    """Create a new project (Admin or Usuario only)."""
    # Verify responsable exists
    responsable = db.query(User).filter(User.user_id == project_data.responsable_id).first()
    if not responsable:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario responsable no existe"
        )
    
    # Create project
    new_project = Project(
        nombre=project_data.nombre,
        descripcion=project_data.descripcion,
        responsable_id=project_data.responsable_id,
        fecha_inicio=project_data.fecha_inicio or date.today(),
        estado=ProjectStatus.ACTIVO,
        created_by=current_user.user_id
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    # Audit log
    ip_address = request.client.host if request.client else None
    create_audit_log(
        db=db, user=current_user, entidad=EntityType.PROJECT,
        entidad_id=new_project.project_id, accion=ActionType.ALTA,
        project_id=new_project.project_id,
        detalle_after=model_to_dict(new_project),
        ip_address=ip_address
    )
    
    response = ProjectResponse.model_validate(new_project)
    response.volunteer_count = 0
    return response


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    request: Request,
    project_id: int,
    project_data: ProjectUpdate,
    current_user: User = Depends(require_admin_or_user),
    db: Session = Depends(get_db)
):
    """Update a project (Admin or Usuario only)."""
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Check if project is archived
    if project.estado == ProjectStatus.ARCHIVADO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede modificar un proyecto archivado"
        )
    
    # Save before state
    before = model_to_dict(project)
    
    # Update fields
    if project_data.nombre is not None:
        project.nombre = project_data.nombre
    if project_data.descripcion is not None:
        project.descripcion = project_data.descripcion
    if project_data.responsable_id is not None:
        # Verify new responsable exists
        responsable = db.query(User).filter(User.user_id == project_data.responsable_id).first()
        if not responsable:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El usuario responsable no existe"
            )
        project.responsable_id = project_data.responsable_id
    if project_data.estado is not None:
        project.estado = project_data.estado
    
    db.commit()
    db.refresh(project)
    
    # Audit log
    ip_address = request.client.host if request.client else None
    create_audit_log(
        db=db, user=current_user, entidad=EntityType.PROJECT,
        entidad_id=project.project_id, accion=ActionType.MODIFICACION,
        project_id=project.project_id,
        detalle_before=before,
        detalle_after=model_to_dict(project),
        ip_address=ip_address
    )
    
    # Get volunteer count
    volunteer_count = db.query(func.count(Volunteer.volunteer_id)).filter(
        Volunteer.project_id == project_id,
        Volunteer.is_deleted == False
    ).scalar()
    
    response = ProjectResponse.model_validate(project)
    response.volunteer_count = volunteer_count
    return response


@router.post("/{project_id}/archive")
async def archive_project(
    request: Request,
    project_id: int,
    current_user: User = Depends(require_admin_or_calidad),
    db: Session = Depends(get_db)
):
    """Archive a project (Admin or Calidad only)."""
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Save before state
    before = model_to_dict(project)
    
    # Archive
    project.estado = ProjectStatus.ARCHIVADO
    db.commit()
    
    # Audit log
    ip_address = request.client.host if request.client else None
    create_audit_log(
        db=db, user=current_user, entidad=EntityType.PROJECT,
        entidad_id=project.project_id, accion=ActionType.ELIMINACION,
        project_id=project.project_id,
        detalle_before=before,
        detalle_after=model_to_dict(project),
        ip_address=ip_address
    )
    
    return {"message": "Proyecto archivado exitosamente"}
