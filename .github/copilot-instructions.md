# IMC Management System - Development Instructions

## Project Overview
Web application for calculating Body Mass Index (BMI/IMC) and managing records by project, with role-based access control and complete audit trail.

## Tech Stack
- **Backend**: Python 3.11+ with FastAPI (REST API)
- **Frontend**: React 18+ with Vite, React Router, Axios
- **Database**: SQLite with SQLAlchemy ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Styling**: CSS3 with custom components
- **Reports**: PDF (ReportLab) and CSV generation

## Project Structure
```
IMC/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application entry
│   │   ├── config.py            # Configuration settings
│   │   ├── database.py          # Database connection
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── routers/             # API routes
│   │   ├── services/            # Business logic
│   │   └── utils/               # Utilities (auth, IMC calc)
│   ├── tests/                   # Unit and integration tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── services/            # API services
│   │   ├── context/             # React context (auth, etc.)
│   │   ├── hooks/               # Custom hooks
│   │   ├── utils/               # Utility functions
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Key Features
- Role-based access: Administrador, Calidad, Usuario
- IMC calculation with color-coded indicators (Yellow/Green/Red)
- Audit trail for all operations
- PDF and CSV report exports

## Development Guidelines
- All numeric values round to 2 decimal places (half up)
- Timezone: America/Monterrey (configurable)
- Logical deletion only (is_deleted flag)
- All timestamps in ISO format
