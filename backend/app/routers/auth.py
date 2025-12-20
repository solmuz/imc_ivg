"""Authentication router."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserStatus
from app.models.audit import EntityType, ActionType
from app.schemas.user import UserLogin, Token, UserResponse, UserChangePassword
from app.utils.auth import (
    verify_password, 
    get_password_hash, 
    create_access_token,
    get_current_active_user
)
from app.utils.audit import create_audit_log
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Authenticate user and return JWT token."""
    # Find user by email
    user = db.query(User).filter(User.email == form_data.username).first()
    
    # Get client info for audit
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", None)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if account is locked
    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cuenta bloqueada. Intente de nuevo más tarde."
        )
    
    # Verify password
    if not verify_password(form_data.password, user.password_hash):
        # Increment failed attempts
        user.failed_login_attempts += 1
        
        # Lock account if max attempts reached
        if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            user.locked_until = datetime.utcnow() + timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)
            db.commit()
            
            # Log failed attempt
            create_audit_log(
                db=db, user=user, entidad=EntityType.SESSION,
                entidad_id=user.user_id, accion=ActionType.LOGIN_FAILED,
                ip_address=ip_address, user_agent=user_agent
            )
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cuenta bloqueada por {settings.LOCKOUT_DURATION_MINUTES} minutos"
            )
        
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if user.estado != UserStatus.ACTIVO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    
    # Reset failed attempts on successful login
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.user_id), "email": user.email, "rol": user.rol.value}
    )
    
    # Log successful login
    create_audit_log(
        db=db, user=user, entidad=EntityType.SESSION,
        entidad_id=user.user_id, accion=ActionType.LOGIN,
        ip_address=ip_address, user_agent=user_agent
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Log out user (audit only, token invalidation handled client-side)."""
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", None)
    
    create_audit_log(
        db=db, user=current_user, entidad=EntityType.SESSION,
        entidad_id=current_user.user_id, accion=ActionType.LOGOUT,
        ip_address=ip_address, user_agent=user_agent
    )
    
    return {"message": "Sesión cerrada exitosamente"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    """Get current user information."""
    return UserResponse.model_validate(current_user)


@router.post("/change-password")
async def change_password(
    password_data: UserChangePassword,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change current user's password."""
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contraseña actual incorrecta"
        )
    
    # Update password
    current_user.password_hash = get_password_hash(password_data.new_password)
    current_user.force_password_change = False
    db.commit()
    
    return {"message": "Contraseña actualizada exitosamente"}
