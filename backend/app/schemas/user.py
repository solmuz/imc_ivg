"""User schemas for request/response validation."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from app.models.user import UserRole, UserStatus


class UserBase(BaseModel):
    """Base user schema."""
    nombre: str = Field(..., min_length=1, max_length=100)
    email: EmailStr


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8)
    rol: UserRole = UserRole.USUARIO


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    rol: Optional[UserRole] = None
    estado: Optional[UserStatus] = None
    force_password_change: Optional[bool] = None


class UserPasswordReset(BaseModel):
    """Schema for password reset."""
    new_password: str = Field(..., min_length=8)


class UserChangePassword(BaseModel):
    """Schema for user changing their own password."""
    current_password: str
    new_password: str = Field(..., min_length=8)


class UserResponse(UserBase):
    """Schema for user response."""
    user_id: int
    rol: UserRole
    estado: UserStatus
    force_password_change: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Schema for token payload data."""
    user_id: Optional[int] = None
    email: Optional[str] = None
    rol: Optional[str] = None
