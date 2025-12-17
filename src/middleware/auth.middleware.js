const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Middleware para verificar JWT
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'Token de autenticación requerido' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
        
        // Verificar que el usuario aún existe
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ 
                success: false,
                error: 'Usuario no encontrado' 
            });
        }

        if (user.user_status !== 'Activo') {
            return res.status(401).json({ 
                success: false,
                error: 'Cuenta desactivada' 
            });
        }

        // Verificar si la cuenta está bloqueada temporalmente
        if (await User.isAccountLocked(user)) {
            return res.status(401).json({ 
                success: false,
                error: 'Cuenta bloqueada temporalmente por múltiples intentos fallidos' 
            });
        }

        // Agregar usuario al request
        req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.user_role,
            status: user.user_status
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                error: 'Token expirado. Por favor, inicie sesión nuevamente.' 
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                error: 'Token inválido' 
            });
        }
        
        console.error('Auth middleware error:', error);
        return res.status(500).json({ 
            success: false,
            error: 'Error en autenticación' 
        });
    }
};

// Middleware para verificar roles
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                error: 'Usuario no autenticado' 
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false,
                error: 'No tiene permisos para realizar esta acción',
                requiredRoles: roles,
                userRole: req.user.role
            });
        }
        next();
    };
};

// Middleware para verificar propiedad del recurso
const checkResourceOwnership = (resourceType) => {
    return async (req, res, next) => {
        try {
            if (req.user.role === 'Administrador') {
                return next(); // Administrador puede todo
            }

            // Diferentes lógicas según el tipo de recurso
            switch (resourceType) {
                case 'project':
                    // Verificar si el usuario es responsable del proyecto
                    const projectId = req.params.projectId || req.params.id;
                    const db = require('../config/database');
                    const project = await db.query(
                        'SELECT responsible_user_id FROM projects WHERE id = ?',
                        [projectId]
                    );
                    
                    if (project.length === 0) {
                        return res.status(404).json({ 
                            success: false,
                            error: 'Recurso no encontrado' 
                        });
                    }

                    if (project[0].responsible_user_id !== req.user.id) {
                        return res.status(403).json({ 
                            success: false,
                            error: 'No es el responsable de este proyecto' 
                        });
                    }
                    break;

                case 'volunteer':
                    // Verificar si el usuario registró el voluntario
                    const volunteerId = req.params.volunteerId || req.params.id;
                    const volunteer = await db.query(
                        'SELECT registered_by FROM volunteers WHERE id = ?',
                        [volunteerId]
                    );
                    
                    if (volunteer.length === 0) {
                        return res.status(404).json({ 
                            success: false,
                            error: 'Recurso no encontrado' 
                        });
                    }

                    if (volunteer[0].registered_by !== req.user.id) {
                        return res.status(403).json({ 
                            success: false,
                            error: 'No registró este voluntario' 
                        });
                    }
                    break;

                default:
                    return res.status(403).json({ 
                        success: false,
                        error: 'Verificación de permisos no implementada para este recurso' 
                    });
            }

            next();
        } catch (error) {
            console.error('Resource ownership check error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Error verificando permisos del recurso' 
            });
        }
    };
};

module.exports = {
    authenticateToken,
    checkRole,
    checkResourceOwnership
};
