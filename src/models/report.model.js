const db = require('../config/database');

class Report {
    // Crear registro de reporte generado
    static async create(reportData) {
        const {
            project_id,
            generated_by,
            report_type,
            filters = null,
            file_path,
            file_size_bytes = null,
            quality_approved_by = null
        } = reportData;

        const sql = `
            INSERT INTO reports 
            (project_id, generated_by, report_type, filters, file_path, file_size_bytes, quality_approved_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await db.query(sql, [
            project_id, generated_by, report_type, 
            filters ? JSON.stringify(filters) : null,
            file_path, file_size_bytes, quality_approved_by
        ]);

        return result.insertId;
    }

    // Obtener reporte por ID
    static async findById(id) {
        const sql = `
            SELECT r.*,
                   p.name as project_name,
                   u.username as generated_by_name,
                   ua.username as quality_approved_by_name
            FROM reports r
            JOIN projects p ON r.project_id = p.id
            JOIN users u ON r.generated_by = u.id
            LEFT JOIN users ua ON r.quality_approved_by = ua.id
            WHERE r.id = ?
        `;
        
        const reports = await db.query(sql, [id]);
        return reports[0] || null;
    }

    // Listar reportes (con filtros)
    static async findAll(filters = {}, page = 1, limit = 10) {
        const {
            project_id,
            report_type,
            generated_by,
            start_date,
            end_date
        } = filters;

        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        const values = [];

        if (project_id) {
            whereClause += ' AND r.project_id = ?';
            values.push(project_id);
        }

        if (report_type) {
            whereClause += ' AND r.report_type = ?';
            values.push(report_type);
        }

        if (generated_by) {
            whereClause += ' AND r.generated_by = ?';
            values.push(generated_by);
        }

        if (start_date) {
            whereClause += ' AND DATE(r.generated_at) >= ?';
            values.push(start_date);
        }

        if (end_date) {
            whereClause += ' AND DATE(r.generated_at) <= ?';
            values.push(end_date);
        }

        const sql = `
            SELECT r.*,
                   p.name as project_name,
                   u.username as generated_by_name,
                   ua.username as quality_approved_by_name
            FROM reports r
            JOIN projects p ON r.project_id = p.id
            JOIN users u ON r.generated_by = u.id
            LEFT JOIN users ua ON r.quality_approved_by = ua.id
            ${whereClause}
            ORDER BY r.generated_at DESC
            LIMIT ? OFFSET ?
        `;

        const countSql = `
            SELECT COUNT(*) as total 
            FROM reports r
            ${whereClause}
        `;

        values.push(limit, offset);
        const countValues = values.slice(0, -2);

        const [reports, countResult] = await Promise.all([
            db.query(sql, values),
            db.query(countSql, countValues)
        ]);

        return {
            reports,
            total: countResult[0].total,
            page,
            limit,
            totalPages: Math.ceil(countResult[0].total / limit)
        };
    }

    // Aprobar reporte por calidad
    static async approve(id, approvedBy) {
        const sql = `
            UPDATE reports 
            SET quality_approved_by = ?, quality_approved_at = NOW()
            WHERE id = ?
        `;
        
        const result = await db.query(sql, [approvedBy, id]);
        return result.affectedRows > 0;
    }

    // Obtener estadísticas de reportes
    static async getStatistics() {
        const sql = `
            SELECT 
                report_type,
                COUNT(*) as total,
                SUM(file_size_bytes) as total_size_bytes,
                DATE(generated_at) as date,
                COUNT(*) as daily_count
            FROM reports
            WHERE generated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY report_type, DATE(generated_at)
            ORDER BY date DESC
        `;
        
        return await db.query(sql);
    }

    // Obtener reportes por proyecto
    static async findByProject(projectId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        
        const sql = `
            SELECT r.*,
                   u.username as generated_by_name,
                   ua.username as quality_approved_by_name
            FROM reports r
            JOIN users u ON r.generated_by = u.id
            LEFT JOIN users ua ON r.quality_approved_by = ua.id
            WHERE r.project_id = ?
            ORDER BY r.generated_at DESC
            LIMIT ? OFFSET ?
        `;

        const countSql = `
            SELECT COUNT(*) as total 
            FROM reports 
            WHERE project_id = ?
        `;

        const [reports, countResult] = await Promise.all([
            db.query(sql, [projectId, limit, offset]),
            db.query(countSql, [projectId])
        ]);

        return {
            reports,
            total: countResult[0].total,
            page,
            limit,
            totalPages: Math.ceil(countResult[0].total / limit)
        };
    }
}

module.exports = Report;
