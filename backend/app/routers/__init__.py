# Routers package
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.projects import router as projects_router
from app.routers.volunteers import router as volunteers_router
from app.routers.audit import router as audit_router
from app.routers.reports import router as reports_router

__all__ = [
    "auth_router", "users_router", "projects_router",
    "volunteers_router", "audit_router", "reports_router"
]
