"""Volunteers management router."""
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional

from app.database import get_db
from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus
from app.models.volunteer import Volunteer, Sexo, BandaIMC
from app.models.audit import EntityType, ActionType
from app.schemas.volunteer import (
    VolunteerCreate, VolunteerUpdate, VolunteerResponse, 
    VolunteerDelete, VolunteerListResponse, VolunteerStats
)
from app.utils.auth import get_current_active_user, require_admin_or_user, require_admin
from app.utils.imc import calculate_imc, get_banda_imc
from app.utils.audit import create_audit_log, model_to_dict
from app.utils.timezone import get_now

router = APIRouter(prefix="/api/projects/{project_id}/volunteers", tags=["Volunteers"])


def get_project_or_404(project_id: int, db: Session) -> Project:
    """Get project or raise 404."""
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return project


def get_next_correlativo(project_id: int, db: Session) -> int:
    """Get the next correlativo number for a project."""
    max_correlativo = db.query(func.max(Volunteer.correlativo)).filter(
        Volunteer.project_id == project_id
    ).scalar()
    return (max_correlativo or 0) + 1


@router.get("/", response_model=VolunteerListResponse)
async def get_volunteers(
    project_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sexo: Optional[Sexo] = None,
    banda_imc: Optional[BandaIMC] = None,
    include_deleted: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all volunteers for a project with pagination and filters."""
    # Verify project exists
    get_project_or_404(project_id, db)
    
    query = db.query(Volunteer).options(
        joinedload(Volunteer.registrar)
    ).filter(Volunteer.project_id == project_id)
    
    # Apply filters
    if not include_deleted:
        query = query.filter(Volunteer.is_deleted == False)
    if sexo:
        query = query.filter(Volunteer.sexo == sexo)
    if banda_imc:
        query = query.filter(Volunteer.banda_imc == banda_imc)
    
    # Order by correlativo
    query = query.order_by(Volunteer.correlativo)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    volunteers = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return VolunteerListResponse(
        volunteers=[VolunteerResponse.model_validate(v) for v in volunteers],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/stats", response_model=VolunteerStats)
async def get_volunteer_stats(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get statistics for volunteers in a project."""
    # Verify project exists
    get_project_or_404(project_id, db)
    
    # Base query for active volunteers
    base_query = db.query(Volunteer).filter(
        Volunteer.project_id == project_id,
        Volunteer.is_deleted == False
    )
    
    # Total counts
    total = db.query(func.count(Volunteer.volunteer_id)).filter(
        Volunteer.project_id == project_id
    ).scalar()
    
    total_active = base_query.count()
    
    # IMC statistics
    imc_stats = db.query(
        func.avg(Volunteer.imc),
        func.min(Volunteer.imc),
        func.max(Volunteer.imc)
    ).filter(
        Volunteer.project_id == project_id,
        Volunteer.is_deleted == False
    ).first()
    
    # Counts by banda
    count_low = base_query.filter(Volunteer.banda_imc == BandaIMC.LOW).count()
    count_normal = base_query.filter(Volunteer.banda_imc == BandaIMC.NORMAL).count()
    count_high = base_query.filter(Volunteer.banda_imc == BandaIMC.HIGH).count()
    
    # Counts by sexo
    count_m = base_query.filter(Volunteer.sexo == Sexo.M).count()
    count_f = base_query.filter(Volunteer.sexo == Sexo.F).count()
    count_ne = base_query.filter(Volunteer.sexo == Sexo.NO_ESPECIFICADO).count()
    
    return VolunteerStats(
        total=total,
        total_active=total_active,
        imc_promedio=Decimal(str(imc_stats[0])).quantize(Decimal('0.01')) if imc_stats[0] else None,
        imc_minimo=Decimal(str(imc_stats[1])).quantize(Decimal('0.01')) if imc_stats[1] else None,
        imc_maximo=Decimal(str(imc_stats[2])).quantize(Decimal('0.01')) if imc_stats[2] else None,
        count_low=count_low,
        count_normal=count_normal,
        count_high=count_high,
        count_masculino=count_m,
        count_femenino=count_f,
        count_no_especificado=count_ne
    )


@router.get("/{volunteer_id}", response_model=VolunteerResponse)
async def get_volunteer(
    project_id: int,
    volunteer_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific volunteer."""
    volunteer = db.query(Volunteer).options(
        joinedload(Volunteer.registrar)
    ).filter(
        Volunteer.volunteer_id == volunteer_id,
        Volunteer.project_id == project_id
    ).first()
    
    if not volunteer:
        raise HTTPException(status_code=404, detail="Voluntario no encontrado")
    
    return VolunteerResponse.model_validate(volunteer)


@router.post("/", response_model=VolunteerResponse, status_code=status.HTTP_201_CREATED)
async def create_volunteer(
    request: Request,
    project_id: int,
    volunteer_data: VolunteerCreate,
    current_user: User = Depends(require_admin_or_user),
    db: Session = Depends(get_db)
):
    """Create a new volunteer (Admin or Usuario only)."""
    # Verify project exists and is active
    project = get_project_or_404(project_id, db)
    if project.estado == ProjectStatus.ARCHIVADO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pueden agregar voluntarios a un proyecto archivado"
        )
    
    # Calculate IMC
    imc = calculate_imc(volunteer_data.peso_kg, volunteer_data.estatura_m)
    banda = get_banda_imc(imc)
    
    # Get next correlativo
    correlativo = get_next_correlativo(project_id, db)
    
    # Create volunteer
    new_volunteer = Volunteer(
        project_id=project_id,
        correlativo=correlativo,
        sexo=volunteer_data.sexo,
        peso_kg=volunteer_data.peso_kg,
        estatura_m=volunteer_data.estatura_m,
        imc=imc,
        banda_imc=banda,
        registered_by=current_user.user_id
    )
    db.add(new_volunteer)
    db.commit()
    db.refresh(new_volunteer)
    
    # Audit log
    ip_address = request.client.host if request.client else None
    create_audit_log(
        db=db, user=current_user, entidad=EntityType.VOLUNTEER,
        entidad_id=new_volunteer.volunteer_id, accion=ActionType.ALTA,
        project_id=project_id,
        detalle_after=model_to_dict(new_volunteer),
        ip_address=ip_address
    )
    
    return VolunteerResponse.model_validate(new_volunteer)


@router.put("/{volunteer_id}", response_model=VolunteerResponse)
async def update_volunteer(
    request: Request,
    project_id: int,
    volunteer_id: int,
    volunteer_data: VolunteerUpdate,
    current_user: User = Depends(require_admin_or_user),
    db: Session = Depends(get_db)
):
    """Update a volunteer (Admin or Usuario only)."""
    # Verify project is not archived
    project = get_project_or_404(project_id, db)
    if project.estado == ProjectStatus.ARCHIVADO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pueden modificar voluntarios de un proyecto archivado"
        )
    
    volunteer = db.query(Volunteer).filter(
        Volunteer.volunteer_id == volunteer_id,
        Volunteer.project_id == project_id
    ).first()
    
    if not volunteer:
        raise HTTPException(status_code=404, detail="Voluntario no encontrado")
    
    if volunteer.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede modificar un voluntario eliminado"
        )
    
    # Save before state
    before = model_to_dict(volunteer)
    
    # Update fields
    if volunteer_data.sexo is not None:
        volunteer.sexo = volunteer_data.sexo
    if volunteer_data.peso_kg is not None:
        volunteer.peso_kg = volunteer_data.peso_kg
    if volunteer_data.estatura_m is not None:
        volunteer.estatura_m = volunteer_data.estatura_m
    
    # Recalculate IMC
    volunteer.imc = calculate_imc(volunteer.peso_kg, volunteer.estatura_m)
    volunteer.banda_imc = get_banda_imc(volunteer.imc)
    
    db.commit()
    db.refresh(volunteer)
    
    # Audit log
    ip_address = request.client.host if request.client else None
    create_audit_log(
        db=db, user=current_user, entidad=EntityType.VOLUNTEER,
        entidad_id=volunteer.volunteer_id, accion=ActionType.MODIFICACION,
        project_id=project_id,
        detalle_before=before,
        detalle_after=model_to_dict(volunteer),
        ip_address=ip_address
    )
    
    return VolunteerResponse.model_validate(volunteer)


@router.delete("/{volunteer_id}")
async def delete_volunteer(
    request: Request,
    project_id: int,
    volunteer_id: int,
    delete_data: VolunteerDelete = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Soft-delete a volunteer (Admin only)."""
    volunteer = db.query(Volunteer).filter(
        Volunteer.volunteer_id == volunteer_id,
        Volunteer.project_id == project_id
    ).first()
    
    if not volunteer:
        raise HTTPException(status_code=404, detail="Voluntario no encontrado")
    
    if volunteer.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El voluntario ya está eliminado"
        )
    
    # Save before state
    before = model_to_dict(volunteer)
    
    # Soft delete
    volunteer.is_deleted = True
    volunteer.deleted_by = current_user.user_id
    volunteer.deleted_at = get_now()
    volunteer.deletion_reason = delete_data.deletion_reason if delete_data else None
    
    db.commit()
    
    # Audit log
    ip_address = request.client.host if request.client else None
    create_audit_log(
        db=db, user=current_user, entidad=EntityType.VOLUNTEER,
        entidad_id=volunteer.volunteer_id, accion=ActionType.ELIMINACION,
        project_id=project_id,
        detalle_before=before,
        detalle_after=model_to_dict(volunteer),
        ip_address=ip_address
    )
    
    return {"message": "Voluntario eliminado exitosamente"}
