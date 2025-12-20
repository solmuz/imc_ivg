"""Database connection and session management."""
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Crear URL de conexión para MariaDB
DATABASE_URL = f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"

print(f"🔗 Conectando a MariaDB: {settings.DB_USER}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}")

# Create engine
engine = create_engine(
    DATABASE_URL,
    echo=True,           # Muestra SQL en consola (cambia a False en producción)
    pool_pre_ping=True,  # Verifica conexiones antes de usarlas
    pool_recycle=3600    # Recicla conexiones cada hora
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """
    Dependency to get database session.
    Usage in FastAPI endpoints:
        from app.database import get_db
        def some_endpoint(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database tables.
    This handles foreign key constraints properly.
    """
    print("🔧 Inicializando base de datos...")
    
    # Deshabilitar verificación de FK temporalmente (solo para MariaDB/MySQL)
    with engine.connect() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        conn.commit()
    
    # Importar TODOS los modelos para que se registren con Base
    # Nota: Solo necesitas importarlos, no usar las clases directamente
    from app.models import user, project, volunteer, audit
    
    # Crear todas las tablas
    # SQLAlchemy detecta automáticamente las dependencias y crea en orden correcto
    Base.metadata.create_all(bind=engine)
    
    # Re-habilitar verificación de FK
    with engine.connect() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))
        conn.commit()
    
    print("✅ Base de datos inicializada exitosamente")