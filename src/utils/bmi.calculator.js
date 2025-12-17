// Middleware para manejo centralizado de errores
const errorHandler = (err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        user: req.user ? req.user.id : 'unauthenticated'
    });

    // Errores de validación
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Error de validación',
            details: err.errors || err.message
        });
    }

    // Errores de JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Token inválido'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token expirado'
        });
    }

    // Errores de base de datos
    if (err.code === 'ER_DUP_ENTRY') {
        const match = err.message.match(/Duplicate entry '(.+)' for key/);
        const duplicateValue = match ? match[1] : 'valor duplicado';
        
        return res.status(409).json({
            success: false,
            error: 'Registro duplicado',
            details: `El valor '${duplicateValue}' ya existe en el sistema`
        });
    }

    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
        return res.status(404).json({
            success: false,
            error: 'Recurso referenciado no encontrado',
            details: 'La referencia a otro registro no es válida'
        });
    }

    if (err.code === 'ER_DATA_TOO_LONG') {
        return res.status(400).json({
            success: false,
            error: 'Datos demasiado largos',
            details: 'Uno o más campos exceden la longitud permitida'
        });
    }

    // Errores de MySQL
    if (err.code && err.code.startsWith('ER_')) {
        return res.status(500).json({
            success: false,
            error: 'Error de base de datos',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
        });
    }

    // Errores personalizados con código de estado
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message || 'Error del servidor'
        });
    }

    // Error por defecto
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { 
            message: err.message,
            stack: err.stack 
        })
    });
};

// Clase para errores personalizados
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, errors = []) {
        super(message || 'Error de validación', 400);
        this.errors = errors;
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Recurso no encontrado') {
        super(message, 404);
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'No autorizado') {
        super(message, 401);
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Acceso prohibido') {
        super(message, 403);
    }
}

class ConflictError extends AppError {
    constructor(message = 'Conflicto de datos') {
        super(message, 409);
    }
}

module.exports = {
    errorHandler,
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError
};
