const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    // Crear usuario
    static async create(userData) {
        const {
            username,
            email,
            password,
            user_role = 'Usuario',
            user_status = 'Activo',
            created_by
        } = userData;

        // Hashear contraseña
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10);
        const password_hash = await bcrypt.hash(password, salt);

        const sql = `
            INSERT INTO users (
                username, email, password_hash, user_role, 
                user_status, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;

        const result = await db.query(sql, [
            username, email, password_hash, user_role,
            user_status, created_by
        ]);

        return result.insertId;
    }

    // Buscar por email
    static async findByEmail(email) {
        const sql = 'SELECT * FROM users WHERE email = ?';
        const users = await db.query(sql, [email]);
        return users[0] || null;
    }

    // Buscar por ID
    static async findById(id) {
        const sql = `
            SELECT id, username, email, user_role, user_status, 
                   created_at, updated_at, created_by 
            FROM users WHERE id = ?
        `;
        const users = await db.query(sql, [id]);
        return users[0] || null;
    }

    // Buscar por username
    static async findByUsername(username) {
        const sql = 'SELECT * FROM users WHERE username = ?';
        const users = await db.query(sql, [username]);
        return users[0] || null;
    }

    // Listar usuarios (con paginación)
    static async findAll(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        
        const sql = `
            SELECT id, username, email, user_role, user_status, 
                   created_at, updated_at,
                   (SELECT username FROM users u2 WHERE u2.id = users.created_by) as created_by_name
            FROM users 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `;

        const countSql = 'SELECT COUNT(*) as total FROM users';
        
        const [users, countResult] = await Promise.all([
            db.query(sql, [limit, offset]),
            db.query(countSql)
        ]);

        return {
            users,
            total: countResult[0].total,
            page,
            limit,
            totalPages: Math.ceil(countResult[0].total / limit)
        };
    }

    // Actualizar usuario
    static async update(id, updateData) {
        const allowedFields = ['user_role', 'user_status'];
        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        }

        if (updates.length === 0) {
            throw new Error('No hay campos válidos para actualizar');
        }

        values.push(id);
        const sql = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;
        
        const result = await db.query(sql, values);
        return result.affectedRows > 0;
    }

    // Desactivar usuario
    static async deactivate(id) {
        const sql = 'UPDATE users SET user_status = "Inactivo", updated_at = NOW() WHERE id = ?';
        const result = await db.query(sql, [id]);
        return result.affectedRows > 0;
    }

    // Verificar contraseña
    static async verifyPassword(user, password) {
        if (!user || !user.password_hash) return false;
        return await bcrypt.compare(password, user.password_hash);
    }

    // Actualizar contraseña
    static async updatePassword(id, newPassword) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10);
        const password_hash = await bcrypt.hash(newPassword, salt);
        
        const sql = 'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?';
        const result = await db.query(sql, [password_hash, id]);
        
        return result.affectedRows > 0;
    }

    // Registrar intento de login
    static async logLoginAttempt(userId, username, ip, userAgent, success, failureReason = null) {
        const sql = `
            INSERT INTO login_attempts 
            (user_id, username_attempted, ip_address, user_agent, success, failure_reason, login_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;
        
        await db.query(sql, [userId, username, ip, userAgent, success ? 1 : 0, failureReason]);
    }

    // Incrementar intentos fallidos
    static async incrementFailedAttempts(userId) {
        const sql = `
            UPDATE users 
            SET failed_login_attempts = failed_login_attempts + 1,
                account_locked_until = CASE 
                    WHEN failed_login_attempts + 1 >= ? THEN DATE_ADD(NOW(), INTERVAL ? MINUTE)
                    ELSE account_locked_until
                END
            WHERE id = ?
        `;
        
        const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
        const lockoutMinutes = parseInt(process.env.ACCOUNT_LOCKOUT_MINUTES) || 15;
        
        await db.query(sql, [maxAttempts, lockoutMinutes, userId]);
    }

    // Resetear intentos fallidos
    static async resetFailedAttempts(userId) {
        const sql = 'UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL WHERE id = ?';
        await db.query(sql, [userId]);
    }

    // Verificar si cuenta está bloqueada
    static async isAccountLocked(user) {
        if (!user.account_locked_until) return false;
        
        const lockUntil = new Date(user.account_locked_until);
        const now = new Date();
        
        return lockUntil > now;
    }

    // Obtener estadísticas de usuarios
    static async getStatistics() {
        const sql = `
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN user_status = 'Activo' THEN 1 ELSE 0 END) as active_users,
                SUM(CASE WHEN user_status = 'Inactivo' THEN 1 ELSE 0 END) as inactive_users,
                SUM(CASE WHEN user_role = 'Administrador' THEN 1 ELSE 0 END) as admins,
                SUM(CASE WHEN user_role = 'Calidad' THEN 1 ELSE 0 END) as calidad_users,
                SUM(CASE WHEN user_role = 'Usuario' THEN 1 ELSE 0 END) as regular_users,
                DATE(created_at) as registration_date,
                COUNT(*) as daily_registrations
            FROM users
            GROUP BY DATE(created_at)
            ORDER BY registration_date DESC
            LIMIT 30
        `;
        
        return await db.query(sql);
    }
}

module.exports = User;
