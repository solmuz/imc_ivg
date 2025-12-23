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

# Instalar dependencias
pip install -r requirements.txt

# Iniciar la API
uvicorn app.main:app --host 0.0.0.0 --port 8000

3. Configuración del Frontend

Navega a la carpeta /frontend:

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

🛠 Estructura del Proyecto
    /database: desarrollada en mariaDB
    /backend: Desarrollado con FastAPI y SQLAlchemy.
    /frontend: Desarrollado con React y Vite.

📝 Notas de Implementación

    Auditoría: Todas las acciones (ALTAS, MODIFICACIONES, ELIMINACIONES) se registran automáticamente con IP y ID de usuario.

    Seguridad: Implementa hashing de contraseñas con bcrypt y tokens JWT.

    Localización: El sistema está configurado para operar en red local mediante la IP del servidor.
