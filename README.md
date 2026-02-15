📊 IMC Management System v1.0.0

Sistema integral para la gestión de proyectos y voluntarios. Diseñado para control administrativo, auditoría y seguimiento de actividades en tiempo real.
🚀 Inicio Rápido (Servidor Local)

Sigue estos pasos para desplegar la aplicación en el entorno de la empresa.
1. Requisitos Previos

    Python 3.9+

    Node.js & npm (para el frontend)

    Base de Datos usada (provisional): mariaDB.

# Instalación de librerías necesarias para MariaDB
pip install pymysql cryptography


# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias en carpeta backend
pip install -r requirements.txt
tambien: pip install pymysql cryptography bcrypt

# Iniciar la API
uvicorn app.main:app --host 0.0.0.0 --port 8000
uvicorn app.main:app:reload (por si se tuvo que agregar algo mas)

# Iniciar en modo desarrollo
npm install
npm run dev

🛠 Estructura del Proyecto
    /database: desarrollada en mariaDB
    /backend: Desarrollado con FastAPI y SQLAlchemy.
    /frontend: Desarrollado con React y Vite.

🥔 Arquitectura en Capas - "Potato Order"

El Sistema de Gestión IMC implementa la arquitectura "Potato Order" (Orden de Papa), un patrón de organización en capas concéntricas que facilita la escalabilidad, mantenibilidad y testabilidad del código. Este patrón asegura que las capas internas no dependan de las externas, permitiendo cambios en tecnologías sin afectar la lógica de negocio.

Principios Fundamentales:
    🎯 Separación de Responsabilidades: Cada capa tiene un propósito específico y bien definido
    🔄 Inversión de Dependencias: Las capas internas no conocen a las externas
    🧪 Testabilidad: La lógica de negocio puede testearse independientemente
    📈 Escalabilidad: Fácil agregar nuevas funcionalidades sin impactar código existente
    🔧 Flexibilidad: Cambiar tecnologías sin afectar la lógica central

Las Cuatro Capas del Sistema IMC:

1️⃣ CAPA DE DOMINIO (Domain Layer)
    📍 Ubicación: /backend/app/models/
    📦 Archivos: user.py, project.py, volunteer.py, audit.py
    🎯 Responsabilidad: Define las entidades principales del negocio
    🔐 Características:
        - Modelos SQLAlchemy que representan los datos
        - Validaciones de negocio a nivel de entidad
        - Relaciones entre entidades (User → Projects, Volunteers)
        - Timestamps y control de eliminación lógica (is_deleted flag)
    💡 Ejemplo: Modelo User contiene definición de roles, atributos de auditoría

2️⃣ CAPA DE SERVICIOS (Service Layer)
    📍 Ubicación: /backend/app/services/ (recomendado), /backend/app/utils/
    📦 Archivos: auth.py (utils), imc.py (utils), audit.py (utils)
    🎯 Responsabilidad: Implementa la lógica de negocio central
    🔐 Características:
        - Cálculos de IMC y categorización de salud
        - Validaciones complejas de negocio
        - Gestión de auditoría y rastreo
        - Generación de reportes PDF/CSV
        - Transacciones de base de datos
    💡 Ejemplo: Servicio de cálculo IMC aplica redondeo a 2 decimales y colorea resultados

3️⃣ CAPA DE API (API/Router Layer)
    📍 Ubicación: /backend/app/routers/
    📦 Archivos: auth.py, users.py, projects.py, volunteers.py, audit.py, reports.py
    🎯 Responsabilidad: Expone la funcionalidad como endpoints REST
    🔐 Características:
        - Rutas HTTP (GET, POST, PUT, DELETE)
        - Validación de entrada con Pydantic schemas
        - Manejo de errores HTTP
        - Autenticación y autorización (JWT, role-based)
        - Transformación de datos para respuestas
    💡 Ejemplo: Router users.py expone GET /api/users con control de permisos

4️⃣ CAPA DE PRESENTACIÓN (Presentation Layer)
    📍 Ubicación: /frontend/src/
    📦 Archivos:
        - /pages/: Dashboard.jsx, Projects.jsx, Users.jsx, AuditTrail.jsx
        - /components/: Layout.jsx, reusable UI components
        - /context/: AuthContext.jsx (estado global)
        - /services/: api.js, dataService.js (comunicación con API)
    🎯 Responsabilidad: Interfaz de usuario e interacción del usuario
    🔐 Características:
        - Componentes React funcionales
        - Gestión de estado con Context API
        - Consumo de API REST
        - Formularios y validación del lado del cliente
        - Estilos CSS modulares
    💡 Ejemplo: Componente Projects consume GET /api/projects y muestra lista

Diagrama de Capas (Flujo de Datos):

```
┌─────────────────────────────────────────────────────────┐
│                 PRESENTACIÓN (Frontend)                 │
│  React Components | Pages | Context | Services HTTP    │
└─────────────────────────────────────────────────────────┘
                            ↑ HTTP/REST ↓
┌─────────────────────────────────────────────────────────┐
│                 API (Backend Routers)                    │
│  /auth  /users  /projects  /volunteers  /reports        │
└─────────────────────────────────────────────────────────┘
                            ↑ Métodos ↓
┌─────────────────────────────────────────────────────────┐
│                  SERVICIOS (Business Logic)              │
│  IMC Calculation | Audit Tracking | Report Generation   │
└─────────────────────────────────────────────────────────┘
                            ↑ Métodos ↓
┌─────────────────────────────────────────────────────────┐
│                  DOMINIO (Data Models)                   │
│  User | Project | Volunteer | Audit Entities           │
└─────────────────────────────────────────────────────────┘
                            ↑ ORM ↓
┌─────────────────────────────────────────────────────────┐
│               BASE DE DATOS (MariaDB/SQLite)            │
│  Tablas: users, projects, volunteers, audit_logs       │
└─────────────────────────────────────────────────────────┘
```

Estructura Detallada del Backend (Python/FastAPI):

backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Aplicación FastAPI principal
│   ├── config.py               # Configuración y variables de entorno
│   ├── database.py             # Conexión e inicialización de BD
│   │
│   ├── models/                 # 🥔 CAPA DE DOMINIO
│   │   ├── user.py             # Entidad User (roles, permisos)
│   │   ├── project.py          # Entidad Project
│   │   ├── volunteer.py        # Entidad Volunteer
│   │   └── audit.py            # Entidad AuditLog
│   │
│   ├── schemas/                # Validación de datos (Pydantic)
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── volunteer.py
│   │   └── audit.py
│   │
│   ├── services/               # 🥔 CAPA DE SERVICIOS (RECOMENDADO)
│   │   ├── user_service.py     # Lógica de usuarios
│   │   ├── project_service.py  # Lógica de proyectos
│   │   └── volunteer_service.py# Lógica de voluntarios
│   │
│   ├── utils/                  # 🥔 UTILIDADES (Actual ubicación de servicios)
│   │   ├── auth.py             # Autenticación y JWT
│   │   ├── imc.py              # Cálculo de IMC
│   │   └── audit.py            # Registro de auditoría
│   │
│   └── routers/                # 🥔 CAPA DE API
│       ├── auth.py             # POST /auth/login, /register
│       ├── users.py            # GET /users, POST /users
│       ├── projects.py         # GET /projects, POST /projects
│       ├── volunteers.py       # GET /volunteers, POST /volunteers
│       ├── audit.py            # GET /audit (reporte de auditoría)
│       └── reports.py          # GET /reports/pdf, /csv

Estructura Detallada del Frontend (React/Vite):

frontend/
├── src/
│   ├── App.jsx                 # Componente raíz
│   ├── main.jsx                # Punto de entrada
│   ├── index.css               # Estilos globales
│   │
│   ├── pages/                  # 🥔 CAPA DE PRESENTACIÓN (Pantallas)
│   │   ├── Dashboard.jsx       # Panel de control principal
│   │   ├── Projects.jsx        # Listado de proyectos
│   │   ├── ProjectDetail.jsx   # Detalle de proyecto
│   │   ├── Users.jsx           # Gestión de usuarios
│   │   ├── AuditTrail.jsx      # Registro de auditoría
│   │   ├── Login.jsx           # Autenticación
│   │   └── ChangePassword.jsx  # Cambio de contraseña
│   │
│   ├── components/             # Componentes reutilizables
│   │   └── Layout.jsx          # Estructura general (navbar, sidebar)
│   │
│   ├── context/                # Estado global (React Context)
│   │   └── AuthContext.jsx     # Contexto de autenticación
│   │
│   ├── services/               # 🥔 SERVICIOS HTTP
│   │   ├── api.js              # Configuración Axios
│   │   └── dataService.js      # Llamadas a API
│   │
│   └── hooks/                  # Custom hooks (recomendado)
│       └── useAuth.js          # Hook para autenticación

Flujo de Integración de Capas - Ejemplo (Consultar Usuarios):

1. PRESENTACIÓN (Frontend):
   Usuario hace click en "Ver Usuarios"
   → Componente Users.jsx dispara useEffect
   → Llama a api.js: GET /api/users

2. API (Router):
   routers/users.py recibe GET /api/users
   → Valida autenticación (JWT)
   → Verifica rol (Admin o Calidad)
   → Llama a user_service.get_all_users()

3. SERVICIOS (Business Logic):
   user_service.py:get_all_users()
   → Aplica filtros de negocio
   → Ejecuta audit.log_action("GET_USERS")
   → Retorna lista de usuarios

4. DOMINIO (Models):
   SQLAlchemy User.query.filter(...)
   → Consulta BD
   → Retorna objetos User

5. BASE DE DATOS:
   SELECT * FROM users WHERE is_deleted = 0
   → Retorna datos

📋 Recomendaciones para Escalabilidad Futura:

✅ Implementado:
    ✔ Separación clara de capas (models, routers, utils)
    ✔ Autenticación JWT con bcrypt
    ✔ Auditoría integrada en todas las operaciones
    ✔ Validación con Pydantic schemas

📝 Notas de Implementación

    Auditoría: Todas las acciones (ALTAS, MODIFICACIONES, ELIMINACIONES) se registran automáticamente con IP y ID de usuario.

    Seguridad: Implementa hashing de contraseñas con bcrypt y tokens JWT.

    Localización: El sistema está configurado para operar en red local mediante la IP del servidor.
