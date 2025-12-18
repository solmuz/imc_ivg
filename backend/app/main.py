"""FastAPI main application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db, SessionLocal
from app.models.user import User, UserRole, UserStatus
from app.utils.auth import get_password_hash
from app.routers import (
    auth_router, users_router, projects_router,
    volunteers_router, audit_router, reports_router
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup: Initialize database and create default admin
    init_db()
    create_default_admin()
    yield
    # Shutdown: cleanup if needed


def create_default_admin():
    """Create default admin user if not exists."""
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@imc.com").first()
        if not admin:
            admin = User(
                nombre="Administrador",
                email="admin@imc.com",
                password_hash=get_password_hash("Admin123!"),
                rol=UserRole.ADMINISTRADOR,
                estado=UserStatus.ACTIVO,
                force_password_change=False
            )
            db.add(admin)
            db.commit()
            print("✓ Usuario administrador creado: admin@imc.com / Admin123!")
    finally:
        db.close()


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Sistema de gestión de Índice de Masa Corporal (IMC) por proyecto",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(projects_router)
app.include_router(volunteers_router)
app.include_router(audit_router)
app.include_router(reports_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
