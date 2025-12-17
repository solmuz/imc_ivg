const db = require('../config/database');

class Audit {
    // Crear registro de auditoría
    static async create(auditData) {
        const {
            user_id,
            entity_type,
            entity_id,
            action_type,
            project_id = null,
            user_ip = null,
            user_agent = null,
            details_before = null,
            details_after = null,
            action_description = null
        } = auditData;

        const sql = `
            INSERT INTO audit_trail 
            (user_id, entity_type, entity_id, project_id, action_type, 
             user_ip, user_agent, details_before, details_after, action_description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await db.query(sql, [
            user_id, entity_type, entity_id, project_id, action_type,
            user_ip, user_agent, 
            details_before ? JSON.stringify(details_before) : null,
            details_after ? JSON.stringify(details_after) : null,
            action_description
        ]);

        return result.insertId;
    }

    // Obtener registros de auditoría (con filtros)
    static async findAll(filters = {}, page = 1, limit = 20) {
        const {
            entity_type,
            action_type,
            user_id,
            project_id,
            start_date,
            end_date,
            search
        } = filters;

        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        const values = [];

        if (entity_type) {
            whereClause += ' AND a.entity_type = ?';
            values.push(entity_type);
        }

        if (action_type) {
            whereClause += ' AND a.action_type = ?';
            values.push(action_type);
        }

        if (user_id) {
            whereClause += ' AND a.user_id = ?';
            values.push(user_id);
        }

        if (project_id) {
            whereClause += ' AND a.project_id = ?';
            values.push(project_id);
        }

        if (start_date) {
            whereClause += ' AND DATE(a.timestamp) >= ?';
            values.push(start_date);
        }

        if (end_date) {
            whereClause += ' AND DATE(a.timestamp) <= ?';
            values.push(end_date);
        }

        if (search) {
            whereClause += ' AND (u.username LIKE ? OR p.name LIKE ?)';
            values.push(`%${search}%`, `%${search}%`);
        }

        const sql = `
            SELECT 
                a.*,
                u.username as user_name,
                u.email as user_email,
                p.name as project_name,
                CASE 
                    WHEN a.entity_type = 'user' THEN (SELECT username FROM users WHERE id = a.entity_id)
                    WHEN a.entity_type = 'project' THEN (SELECT name FROM projects WHERE id = a.entity_id)
                    WHEN a.entity_type = 'volunteer' THEN (SELECT volunteer_correlative FROM volunteers WHERE id = a.entity_id)
                    ELSE NULL
                END as entity_name
            FROM audit_trail a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN projects p ON a.project_id = p.id
            ${whereClause}
            ORDER BY a.timestamp DESC
            LIMIT ? OFFSET ?
        `;

        const countSql = `
            SELECT COUNT(*) as total 
            FROM audit_trail a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN projects p ON a.project_id = p.id
            ${whereClause}
        `;

        values.push(limit, offset);
        const countValues = values.slice(0, -2);

        const [audits, countResult] = await Promise.all([
            db.query(sql, values),
            db.query(countSql, countValues)
        ]);

        return {
            audits,
            total: countResult[0].total,
            page,
            limit,
            totalPages: Math.ceil(countResult[0].total / limit)
        };
    }

    // Obtener auditoría por ID
    static async findById(id) {
        const sql = `
            SELECT 
                a.*,
                u.username as user_name,
                p.name as project_name
            FROM audit_trail a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN projects p ON a.project_id = p.id
            WHERE a.id = ?
        `;
        
        const audits = await db.query(sql, [id]);
        return audits[0] || null;
    }

    // Obtener auditoría por entidad
    static async findByEntity(entity_type, entity_id) {
        const sql = `
            SELECT * FROM audit_trail 
            WHERE entity_type = ? AND entity_id = ?
            ORDER BY timestamp DESC
        `;
        
        return await db.query(sql, [entity_type, entity_id]);
    }

    // Obtener estadísticas de auditoría
    static async getStatistics() {
        const sql = `
            SELECT 
                entity_type,
                action_type,
                COUNT(*) as count,
                DATE(timestamp) as date,
                COUNT(*) as daily_count
            FROM audit_trail
            WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY entity_type, action_type, DATE(timestamp)
            ORDER BY date DESC
        `;
        
        return await db.query(sql);
    }

    // Obtener actividad reciente por usuario
    static async getRecentActivity(userId, limit = 10) {
        const sql = `
            SELECT 
                a.*,
                p.name as project_name,
                CASE 
                    WHEN a.entity_type = 'user' THEN (SELECT username FROM users WHERE id = a.entity_id)
                    WHEN a.entity_type = 'project' THEN (SELECT name FROM projects WHERE id = a.entity_id)
                    WHEN a.entity_type = 'volunteer' THEN (SELECT volunteer_correlative FROM volunteers WHERE id = a.entity_id)
                    ELSE NULL
                END as entity_name
            FROM audit_trail a
            LEFT JOIN projects p ON a.project_id = p.id
            WHERE a.user_id = ?
            ORDER BY a.timestamp DESC
            LIMIT ?
        `;
        
        return await db.query(sql, [userId, limit]);
    }
}

module.exports = Audit;
