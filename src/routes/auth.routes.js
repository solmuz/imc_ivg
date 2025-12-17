const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { validateLogin, validateChangePassword } = require('../middleware/validation.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Login
router.post('/login', validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;
        const userIp = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        // Buscar usuario
        const user = await User.findByEmail(email);
        
        if (!user) {
            await User.logLoginAttempt(null, email, userIp, userAgent, false, 'usuario_no_encontrado');
            return res.status(401).json({ 
                success: false,
                error: 'Credenciales inválidas' 
            });
        }

        // Verificar estado
        if (user.user_status !== 'Activo') {
            return res.status(401).json({ 
                success: false,
                error: 'Cuenta desactivada' 
            });
        }

        // Verificar bloqueo temporal
        if (await User.isAccountLocked(user)) {
            return res.status(401).json({ 
                success: false,
                error: 'Cuenta bloqueada temporalmente por múltiples intentos fallidos' 
            });
        }

        // Verificar contraseña
        const isValidPassword = await User.verifyPassword(user, password);
        
        if (!isValidPassword) {
            await User.logLoginAttempt(user.id, email, userIp, userAgent, false, 'contrasena_incorrecta');
            
            // Incrementar intentos fallidos
            await User.incrementFailedAttempts(user.id);
            
            const updatedUser = await User.findById(user.id);
            const remainingAttempts = Math.max(
                0, 
                (parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5) - updatedUser.failed_login_attempts
            );
            
            return res.status(401).json({ 
                success: false,
                error: 'Credenciales inválidas',
                remainingAttempts
            });
        }

        // Resetear intentos fallidos
        await User.resetFailedAttempts(user.id);
        
        // Registrar login exitoso
        await User.logLoginAttempt(user.id, email, userIp, userAgent, true);

        // Generar JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.user_role,
                username: user.username
            },
            process.env.JWT_SECRET || 'secret-key',
            { 
                expiresIn: process.env.JWT_EXPIRES_IN || '8h',
                issuer: 'imc-app-api',
                audience: 'imc-app-client'
            }
        );

        // Respuesta exitosa
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.user_role,
                status: user.user_status,
                created_at: user.created_at
            },
            expiresIn: process.env.JWT_EXPIRES_IN || '8h',
            tokenType: 'Bearer'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error en el servidor' 
        });
    }
});

// Cambiar contraseña
router.post('/change-password', authenticateToken, validateChangePassword, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Obtener usuario completo (con password_hash)
        const user = await User.findByEmail(req.user.email);
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'Usuario no encontrado' 
            });
        }

        // Verificar contraseña actual
        const isValid = await User.verifyPassword(user, currentPassword);
        
        if (!isValid) {
            return res.status(400).json({ 
                success: false,
                error: 'Contraseña actual incorrecta' 
            });
        }

        // Actualizar contraseña
        const updated = await User.updatePassword(userId, newPassword);

        if (!updated) {
            return res.status(500).json({ 
                success: false,
                error: 'Error al actualizar contraseña' 
            });
        }

        res.json({ 
            success: true,
            message: 'Contraseña actualizada exitosamente' 
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error en el servidor' 
        });
    }
});

// Verificar token
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user,
        valid: true,
        message: 'Token válido'
    });
});

// Obtener perfil de usuario actual
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.user_role,
                status: user.user_status,
                created_at: user.created_at,
                updated_at: user.updated_at,
                created_by: user.created_by
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener perfil'
        });
    }
});

// Logout (cliente-side)
router.post('/logout', authenticateToken, (req, res) => {
    res.json({ 
        success: true,
        message: 'Sesión cerrada exitosamente' 
    });
});

module.exports = router;
