"""Users management router."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.models.audit import EntityType, ActionType
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserPasswordReset
from app.utils.auth import get_password_hash, require_admin, get_current_active_user
from app.utils.audit import create_audit_log, model_to_dict

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all users (Admin only)."""
    users = db.query(User).offset(skip).limit(limit).all()
    return [UserResponse.model_validate(u) for u in users]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get a specific user (Admin only)."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return UserResponse.model_validate(user)


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: Request,
    user_data: UserCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new user (Admin only)."""
    # Check if email already exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    # Create user
    new_user = User(
        nombre=user_data.nombre,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        rol=user_data.rol,
        estado=UserStatus.ACTIVO,
        force_password_change=True  # Force password change on first login
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Audit log
    ip_address = request.client.host if request.client else None
    create_audit_log(
        db=db, user=current_user, entidad=EntityType.USER,
        entidad_id=new_user.user_id, accion=ActionType.ALTA,
        detalle_after=model_to_dict(new_user, exclude=['password_hash']),
        ip_address=ip_address
    )
    
    return UserResponse.model_validate(new_user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    request: Request,
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update a user (Admin only)."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Save before state
    before = model_to_dict(user, exclude=['password_hash'])
    
    # Update fields
    if user_data.nombre is not None:
        user.nombre = user_data.nombre
    if user_data.email is not None:
        # Check if new email already exists
        existing = db.query(User).filter(
            User.email == user_data.email,
            User.user_id != user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado"
            )
        user.email = user_data.email
    if user_data.rol is not None:
        user.rol = user_data.rol
    if user_data.estado is not None:
        user.estado = user_data.estado
    if user_data.force_password_change is not None:
        user.force_password_change = user_data.force_password_change
    
    db.commit()
    db.refresh(user)
    
    # Audit log
    ip_address = request.client.host if request.client else None
    create_audit_log(
        db=db, user=current_user, entidad=EntityType.USER,
        entidad_id=user.user_id, accion=ActionType.MODIFICACION,
        detalle_before=before,
        detalle_after=model_to_dict(user, exclude=['password_hash']),
        ip_address=ip_address
    )
    
    return UserResponse.model_validate(user)


@router.post("/{user_id}/reset-password")
async def reset_password(
    request: Request,
    user_id: int,
    password_data: UserPasswordReset,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Reset a user's password (Admin only)."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Update password and force change
    user.password_hash = get_password_hash(password_data.new_password)
    user.force_password_change = True
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    
    # Audit log
    ip_address = request.client.host if request.client else None
    create_audit_log(
        db=db, user=current_user, entidad=EntityType.USER,
        entidad_id=user.user_id, accion=ActionType.MODIFICACION,
        detalle_after={"action": "password_reset"},
        ip_address=ip_address
    )
    
    return {"message": "Contraseña restablecida exitosamente"}


@router.delete("/{user_id}")
async def deactivate_user(
    request: Request,
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Deactivate a user (Admin only). No physical deletion."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if user.user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puede desactivar su propia cuenta"
        )
    
    # Save before state
    before = model_to_dict(user, exclude=['password_hash'])
    
    # Deactivate user
    user.estado = UserStatus.INACTIVO
    db.commit()
    
    # Audit log
    ip_address = request.client.host if request.client else None
    create_audit_log(
        db=db, user=current_user, entidad=EntityType.USER,
        entidad_id=user.user_id, accion=ActionType.ELIMINACION,
        detalle_before=before,
        detalle_after=model_to_dict(user, exclude=['password_hash']),
        ip_address=ip_address
    )
    
    return {"message": "Usuario desactivado exitosamente"}
