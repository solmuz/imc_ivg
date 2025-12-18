-- ============================================
-- ESQUEMA COMPLETO: Sistema de Gestión de IMC
-- Base de datos: imc_app
-- ============================================

-- Eliminar base de datos si existe (CUIDADO: Solo para desarrollo)
-- DROP DATABASE IF EXISTS imc_app;

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS imc_app 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE imc_app;

-- ============================================
-- TABLA: users (Usuarios del sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único del usuario',
    
    -- Credenciales y autenticación
    username VARCHAR(50) NOT NULL UNIQUE COMMENT 'Nombre de usuario único para login',
    email VARCHAR(100) NOT NULL UNIQUE COMMENT 'Email único para login y notificaciones',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Hash de la contraseña (bcrypt)',
    
    -- Control de acceso y estado
    user_role ENUM('Administrador', 'Calidad', 'Usuario') NOT NULL DEFAULT 'Usuario' COMMENT 'Rol del usuario en el sistema',
    user_status ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo' COMMENT 'Estado de la cuenta',
    
    -- Seguridad adicional
    password_changed_at TIMESTAMP NULL COMMENT 'Fecha del último cambio de contraseña',
    failed_login_attempts INT UNSIGNED DEFAULT 0 COMMENT 'Intentos fallidos de login',
    account_locked_until TIMESTAMP NULL COMMENT 'Bloqueo temporal por intentos fallidos',
    
    -- Auditoría
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de última actualización',
    created_by INT UNSIGNED NULL COMMENT 'Usuario que creó este registro',
    
    -- Índices
    INDEX idx_user_role_status (user_role, user_status),
    INDEX idx_user_email (email),
    INDEX idx_user_username (username),
    
    -- Claves foráneas
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de usuarios del sistema';

-- ============================================
-- TABLA: projects (Proyectos de investigación)
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único del proyecto',
    
    -- Información básica
    name VARCHAR(150) NOT NULL COMMENT 'Nombre del proyecto',
    description TEXT COMMENT 'Descripción detallada del proyecto',
    
    -- Responsable y fechas
    responsible_user_id INT UNSIGNED NOT NULL COMMENT 'Usuario responsable del proyecto',
    project_status ENUM('Activo', 'Cerrado', 'Archivado') NOT NULL DEFAULT 'Activo' COMMENT 'Estado del proyecto',
    start_date DATE NOT NULL COMMENT 'Fecha de inicio del proyecto',
    
    -- Auditoría
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de última actualización',
    
    -- Índices
    INDEX idx_project_status (project_status),
    INDEX idx_project_responsible (responsible_user_id),
    INDEX idx_project_created (created_at),
    
    -- Claves foráneas
    FOREIGN KEY (responsible_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de proyectos de investigación';

-- ============================================
-- TABLA: volunteers (Voluntarios registrados)
-- ============================================
CREATE TABLE IF NOT EXISTS volunteers (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único del voluntario',
    
    -- Identificación correlativa por proyecto
    volunteer_correlative VARCHAR(20) NOT NULL COMMENT 'Identificador correlativo (ej: "Voluntario 1")',
    project_id INT UNSIGNED NOT NULL COMMENT 'Proyecto al que pertenece el voluntario',
    
    -- Datos biométricos
    gender ENUM('Male', 'Female', 'Unspecified') NOT NULL DEFAULT 'Unspecified' COMMENT 'Sexo del voluntario',
    weight_kg DECIMAL(7, 2) NOT NULL COMMENT 'Peso en kilogramos (precisión: 7,2)',
    height_m DECIMAL(4, 2) NOT NULL COMMENT 'Estatura en metros (precisión: 4,2)',
    
    -- IMC calculado (automático via trigger)
    bmi DECIMAL(4, 2) NOT NULL COMMENT 'Índice de Masa Corporal calculado',
    bmi_category ENUM('Low', 'Normal', 'High') NOT NULL COMMENT 'Categoría del IMC',
    bmi_color ENUM('Yellow', 'Green', 'Red') NOT NULL COMMENT 'Color del semáforo del IMC',
    
    -- Borrado lógico
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Indica si el registro fue eliminado (borrado lógico)',
    deleted_at TIMESTAMP NULL COMMENT 'Fecha de eliminación (borrado lógico)',
    deleted_by INT UNSIGNED NULL COMMENT 'Usuario que realizó la eliminación',
    
    -- Registro y auditoría
    registered_by INT UNSIGNED NOT NULL COMMENT 'Usuario que registró al voluntario',
    registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora del registro',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de última actualización',
    
    -- Índices
    UNIQUE INDEX uk_correlative_project (project_id, volunteer_correlative) COMMENT 'Correlativo único por proyecto',
    INDEX idx_volunteer_project (project_id) COMMENT 'Búsqueda por proyecto',
    INDEX idx_volunteer_bmi_category (bmi_category) COMMENT 'Búsqueda por categoría IMC',
    INDEX idx_volunteer_registered_by (registered_by) COMMENT 'Búsqueda por usuario registrador',
    INDEX idx_volunteer_status (is_deleted) COMMENT 'Búsqueda por estado',
    INDEX idx_volunteer_gender (gender) COMMENT 'Búsqueda por género',
    INDEX idx_volunteer_registered_at (registered_at) COMMENT 'Búsqueda por fecha de registro',
    
    -- Claves foráneas
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de voluntarios con datos biométricos';

-- ============================================
-- TABLA: audit_trail (Auditoría del sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_trail (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único del registro de auditoría',
    
    -- Identificación de la entidad afectada
    entity_type ENUM('project', 'volunteer', 'user') NOT NULL COMMENT 'Tipo de entidad auditada',
    entity_id INT UNSIGNED NOT NULL COMMENT 'ID de la entidad afectada',
    project_id INT UNSIGNED NULL COMMENT 'Proyecto relacionado (si aplica)',
    
    -- Acción realizada
    action_type ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL COMMENT 'Tipo de acción realizada',
    
    -- Información del usuario y contexto
    user_id INT UNSIGNED NOT NULL COMMENT 'Usuario que realizó la acción',
    user_ip VARCHAR(45) COMMENT 'Dirección IP del usuario',
    user_agent VARCHAR(255) COMMENT 'Agente de usuario (navegador)',
    
    -- Timestamp
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora de la acción',
    
    -- Detalles del cambio
    details_before JSON COMMENT 'Datos de la entidad antes del cambio (formato JSON)',
    details_after JSON COMMENT 'Datos de la entidad después del cambio (formato JSON)',
    action_description VARCHAR(500) COMMENT 'Descripción legible de la acción',
    
    -- Índices
    INDEX idx_audit_entity (entity_type, entity_id) COMMENT 'Búsqueda por entidad',
    INDEX idx_audit_user (user_id) COMMENT 'Búsqueda por usuario',
    INDEX idx_audit_project (project_id) COMMENT 'Búsqueda por proyecto',
    INDEX idx_audit_timestamp (timestamp) COMMENT 'Búsqueda por fecha',
    INDEX idx_audit_action (action_type) COMMENT 'Búsqueda por tipo de acción',
    INDEX idx_audit_user_time (user_id, timestamp) COMMENT 'Búsqueda combinada usuario-fecha',
    
    -- Claves foráneas
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de auditoría de todas las operaciones del sistema';

<<<<<<< HEAD
-- ============================================
-- TABLA: reports (Reportes generados)
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único del reporte',
    
    -- Información del reporte
    project_id INT UNSIGNED NOT NULL COMMENT 'Proyecto del reporte',
    generated_by INT UNSIGNED NOT NULL COMMENT 'Usuario que generó el reporte',
    report_type ENUM('PDF', 'CSV') NOT NULL COMMENT 'Tipo de reporte',
    
    -- Filtros y configuración
    filters JSON COMMENT 'Filtros aplicados para generar el reporte (formato JSON)',
    
    -- Información del archivo
    file_path VARCHAR(255) NOT NULL COMMENT 'Ruta o nombre del archivo generado',
    file_size_bytes INT UNSIGNED COMMENT 'Tamaño del archivo en bytes',
    
    -- Aprobación de calidad
    quality_approved_by INT UNSIGNED NULL COMMENT 'Usuario de calidad que aprobó el reporte',
    quality_approved_at TIMESTAMP NULL COMMENT 'Fecha de aprobación por calidad',
    
    -- Timestamps
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora de generación',
    
    -- Índices
    INDEX idx_report_project (project_id) COMMENT 'Búsqueda por proyecto',
    INDEX idx_report_generated_by (generated_by) COMMENT 'Búsqueda por usuario generador',
    INDEX idx_report_type (report_type) COMMENT 'Búsqueda por tipo de reporte',
    INDEX idx_report_generated_at (generated_at) COMMENT 'Búsqueda por fecha de generación',
    INDEX idx_report_approved (quality_approved_by) COMMENT 'Búsqueda por aprobador',
    
    -- Claves foráneas
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (quality_approved_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de reportes generados';

-- ============================================
-- TABLA: system_config (Configuración del sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS system_config (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único de configuración',
    
    -- Clave y valor
    config_key VARCHAR(100) NOT NULL UNIQUE COMMENT 'Clave única de configuración',
    config_value TEXT NOT NULL COMMENT 'Valor de la configuración',
    config_type ENUM('string', 'number', 'boolean', 'json') NOT NULL COMMENT 'Tipo de dato del valor',
    
    -- Categoría y descripción
    category ENUM('security', 'bmi', 'validation', 'general', 'reporting') NOT NULL COMMENT 'Categoría de configuración',
    description VARCHAR(500) COMMENT 'Descripción de la configuración',
    
    -- Auditoría
    updated_by INT UNSIGNED NULL COMMENT 'Último usuario que modificó la configuración',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de última actualización',
    
    -- Índices
    INDEX idx_config_category (category) COMMENT 'Búsqueda por categoría',
    INDEX idx_config_key (config_key) COMMENT 'Búsqueda por clave',
    
    -- Claves foráneas
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de configuración del sistema';

-- ============================================
-- TABLA: login_attempts (Intentos de login)
-- ============================================
CREATE TABLE IF NOT EXISTS login_attempts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único del intento',
    
    -- Información del intento
    user_id INT UNSIGNED NULL COMMENT 'Usuario intentado (si se identificó)',
    username_attempted VARCHAR(50) NOT NULL COMMENT 'Nombre de usuario intentado',
    
    -- Información de contexto
    ip_address VARCHAR(45) NOT NULL COMMENT 'Dirección IP del intento',
    user_agent VARCHAR(255) COMMENT 'Agente de usuario (navegador)',
    
    -- Resultado del intento
    success BOOLEAN NOT NULL COMMENT 'Indica si el login fue exitoso',
    failure_reason VARCHAR(100) COMMENT 'Razón del fallo (si aplica)',
    
    -- Timestamp
    login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora del intento',
    
    -- Índices
    INDEX idx_login_user (user_id) COMMENT 'Búsqueda por usuario',
    INDEX idx_login_username (username_attempted) COMMENT 'Búsqueda por nombre de usuario',
    INDEX idx_login_ip (ip_address) COMMENT 'Búsqueda por IP',
    INDEX idx_login_success (success) COMMENT 'Búsqueda por resultado',
    INDEX idx_login_time (login_at) COMMENT 'Búsqueda por fecha',
    INDEX idx_login_user_time (user_id, login_at) COMMENT 'Búsqueda combinada usuario-fecha',
    
    -- Claves foráneas
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de registro de intentos de login';

-- ============================================
-- TRIGGERS: Automatización del cálculo de IMC
-- ============================================

DELIMITER $$

-- Trigger para calcular IMC al INSERTAR voluntario
CREATE TRIGGER IF NOT EXISTS calculate_bmi_before_insert
BEFORE INSERT ON volunteers
FOR EACH ROW
BEGIN
    -- Calcular BMI con redondeo half up a 2 decimales
    SET NEW.bmi = ROUND(NEW.weight_kg / (NEW.height_m * NEW.height_m), 2);
    
    -- Determinar categoría según umbrales del negocio
    IF NEW.bmi < 18.00 THEN
        SET NEW.bmi_category = 'Low';
        SET NEW.bmi_color = 'Yellow';
    ELSEIF NEW.bmi <= 27.00 THEN
        SET NEW.bmi_category = 'Normal';
        SET NEW.bmi_color = 'Green';
    ELSE
        SET NEW.bmi_category = 'High';
        SET NEW.bmi_color = 'Red';
    END IF;
    
    -- Establecer timestamp de registro si no viene
    IF NEW.registered_at IS NULL THEN
        SET NEW.registered_at = CURRENT_TIMESTAMP;
    END IF;
END$$

-- Trigger para recalcular IMC al ACTUALIZAR peso o estatura
CREATE TRIGGER IF NOT EXISTS calculate_bmi_before_update
BEFORE UPDATE ON volunteers
FOR EACH ROW
BEGIN
    -- Solo recalcular si cambió peso o altura
    IF NEW.weight_kg != OLD.weight_kg OR NEW.height_m != OLD.height_m THEN
        SET NEW.bmi = ROUND(NEW.weight_kg / (NEW.height_m * NEW.height_m), 2);
        
        -- Determinar categoría según umbrales del negocio
        IF NEW.bmi < 18.00 THEN
            SET NEW.bmi_category = 'Low';
            SET NEW.bmi_color = 'Yellow';
        ELSEIF NEW.bmi <= 27.00 THEN
            SET NEW.bmi_category = 'Normal';
            SET NEW.bmi_color = 'Green';
        ELSE
            SET NEW.bmi_category = 'High';
            SET NEW.bmi_color = 'Red';
        END IF;
    END IF;
    
    -- Manejar borrado lógico
    IF NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE THEN
        SET NEW.deleted_at = CURRENT_TIMESTAMP;
    END IF;
END$$

DELIMITER ;

-- ============================================
-- VISTAS: Vistas útiles para reportes y consultas
-- ============================================

-- Vista: Voluntarios activos con información completa
CREATE OR REPLACE VIEW active_volunteers AS
SELECT 
    v.id,
    v.volunteer_correlative,
    v.project_id,
    p.name AS project_name,
    v.gender,
    v.weight_kg,
    v.height_m,
    v.bmi,
    v.bmi_category,
    v.bmi_color,
    v.registered_at,
    v.registered_by,
    u.username AS registered_by_name,
    p.responsible_user_id,
    ur.username AS project_responsible_name
FROM volunteers v
JOIN projects p ON v.project_id = p.id
JOIN users u ON v.registered_by = u.id
JOIN users ur ON p.responsible_user_id = ur.id
WHERE v.is_deleted = FALSE
AND p.project_status = 'Activo';

-- Vista: Estadísticas por proyecto
CREATE OR REPLACE VIEW project_statistics AS
SELECT 
    p.id AS project_id,
    p.name AS project_name,
    p.project_status,
    COUNT(v.id) AS total_volunteers,
    ROUND(AVG(v.bmi), 2) AS avg_bmi,
    MIN(v.bmi) AS min_bmi,
    MAX(v.bmi) AS max_bmi,
    SUM(CASE WHEN v.bmi_category = 'Low' THEN 1 ELSE 0 END) AS low_count,
    SUM(CASE WHEN v.bmi_category = 'Normal' THEN 1 ELSE 0 END) AS normal_count,
    SUM(CASE WHEN v.bmi_category = 'High' THEN 1 ELSE 0 END) AS high_count,
    SUM(CASE WHEN v.gender = 'Male' THEN 1 ELSE 0 END) AS male_count,
    SUM(CASE WHEN v.gender = 'Female' THEN 1 ELSE 0 END) AS female_count,
    SUM(CASE WHEN v.gender = 'Unspecified' THEN 1 ELSE 0 END) AS unspecified_count
FROM projects p
LEFT JOIN volunteers v ON p.id = v.project_id AND v.is_deleted = FALSE
GROUP BY p.id, p.name, p.project_status;

-- Vista: Auditoría legible
CREATE OR REPLACE VIEW audit_trail_readable AS
SELECT 
    a.id,
    a.timestamp,
    a.entity_type,
    a.entity_id,
    CASE 
        WHEN a.entity_type = 'user' THEN (SELECT username FROM users WHERE id = a.entity_id)
        WHEN a.entity_type = 'project' THEN (SELECT name FROM projects WHERE id = a.entity_id)
        WHEN a.entity_type = 'volunteer' THEN (SELECT volunteer_correlative FROM volunteers WHERE id = a.entity_id)
        ELSE 'N/A'
    END AS entity_name,
    a.action_type,
    a.user_id,
    u.username AS user_name,
    a.project_id,
    p.name AS project_name,
    a.user_ip,
    a.user_agent,
    a.details_before,
    a.details_after,
    a.action_description
FROM audit_trail a
LEFT JOIN users u ON a.user_id = u.id
LEFT JOIN projects p ON a.project_id = p.id;

-- ============================================
-- DATOS INICIALES: Configuración y usuario admin
-- ============================================

-- Insertar usuario administrador inicial
INSERT INTO users (username, email, password_hash, user_role, user_status, created_by) 
VALUES (
    'admin_root', 
    'admin@imcapp.com', 
    -- Contraseña: Admin123 (bcrypt hash)
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
    'Administrador', 
    'Activo', 
    NULL
) ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Insertar configuraciones del sistema
INSERT INTO system_config (config_key, config_value, config_type, category, description) VALUES
-- Configuraciones de BMI
('bmi_low_threshold', '18.00', 'number', 'bmi', 'Umbral inferior para categoría Normal de IMC'),
('bmi_high_threshold', '27.00', 'number', 'bmi', 'Umbral superior para categoría Normal de IMC'),
-- Configuraciones de validación
('weight_min', '0.01', 'number', 'validation', 'Peso mínimo permitido en kg'),
('weight_max', '500.00', 'number', 'validation', 'Peso máximo permitido en kg'),
('height_min', '1.00', 'number', 'validation', 'Estatura mínima permitida en metros'),
('height_max', '2.50', 'number', 'validation', 'Estatura máxima permitida en metros'),
-- Configuraciones de seguridad
('password_min_length', '8', 'number', 'security', 'Longitud mínima de contraseña'),
('max_login_attempts', '5', 'number', 'security', 'Intentos máximos de login fallidos antes de bloqueo'),
('account_lockout_minutes', '15', 'number', 'security', 'Minutos de bloqueo por intentos fallidos'),
('session_timeout_minutes', '30', 'number', 'security', 'Tiempo de expiración de sesión en minutos'),
-- Configuraciones generales
('timezone', 'America/Monterrey', 'string', 'general', 'Zona horaria del sistema'),
('default_user_role', 'Usuario', 'string', 'general', 'Rol por defecto para nuevos usuarios'),
('audit_retention_days', '365', 'number', 'general', 'Días de retención de registros de auditoría'),
-- Configuraciones de reportes
('report_logo_path', '/assets/logo.png', 'string', 'reporting', 'Ruta del logo para reportes'),
('report_include_signature', 'true', 'boolean', 'reporting', 'Incluir espacio para firmas en reportes PDF')
ON DUPLICATE KEY UPDATE 
    config_value = VALUES(config_value),
    updated_at = CURRENT_TIMESTAMP,
    updated_by = (SELECT id FROM users WHERE username = 'admin_root' LIMIT 1);

-- ============================================
-- PROCEDIMIENTOS ALMACENADOS: Operaciones comunes
-- ============================================

DELIMITER $$

-- Procedimiento: Crear voluntario con auditoría automática
CREATE PROCEDURE IF NOT EXISTS create_volunteer_with_audit(
    IN p_project_id INT UNSIGNED,
    IN p_gender ENUM('Male', 'Female', 'Unspecified'),
    IN p_weight_kg DECIMAL(7,2),
    IN p_height_m DECIMAL(4,2),
    IN p_registered_by INT UNSIGNED,
    IN p_user_ip VARCHAR(45),
    IN p_user_agent VARCHAR(255)
)
BEGIN
    DECLARE next_correlative INT;
    DECLARE volunteer_id INT UNSIGNED;
    DECLARE project_exists INT;
    
    -- Verificar que el proyecto existe y está activo
    SELECT COUNT(*) INTO project_exists 
    FROM projects 
    WHERE id = p_project_id AND project_status = 'Activo';
    
    IF project_exists = 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Proyecto no encontrado o no está activo';
    END IF;
    
    -- Obtener siguiente correlativo para el proyecto
    SELECT COALESCE(MAX(CAST(SUBSTRING(volunteer_correlative, 11) AS UNSIGNED)), 0) + 1 
    INTO next_correlative 
    FROM volunteers 
    WHERE project_id = p_project_id;
    
    -- Insertar voluntario (el trigger calculará BMI automáticamente)
    INSERT INTO volunteers (
        volunteer_correlative,
        project_id,
        gender,
        weight_kg,
        height_m,
        registered_by
    ) VALUES (
        CONCAT('Voluntario ', next_correlative),
        p_project_id,
        p_gender,
        p_weight_kg,
        p_height_m,
        p_registered_by
    );
    
    SET volunteer_id = LAST_INSERT_ID();
    
    -- Registrar auditoría
    INSERT INTO audit_trail (
        entity_type,
        entity_id,
        project_id,
        action_type,
        user_id,
        user_ip,
        user_agent,
        details_after
    ) VALUES (
        'volunteer',
        volunteer_id,
        p_project_id,
        'CREATE',
        p_registered_by,
        p_user_ip,
        p_user_agent,
        JSON_OBJECT(
            'volunteer_id', volunteer_id,
            'correlative', CONCAT('Voluntario ', next_correlative),
            'project_id', p_project_id,
            'gender', p_gender,
            'weight_kg', p_weight_kg,
            'height_m', p_height_m,
            'registered_by', p_registered_by
        )
    );
    
    SELECT 
        volunteer_id AS new_volunteer_id,
        CONCAT('Voluntario ', next_correlative) AS volunteer_correlative;
END$$

-- Procedimiento: Eliminar voluntario (borrado lógico)
CREATE PROCEDURE IF NOT EXISTS soft_delete_volunteer(
    IN p_volunteer_id INT UNSIGNED,
    IN p_deleted_by INT UNSIGNED,
    IN p_user_ip VARCHAR(45),
    IN p_user_agent VARCHAR(255),
    IN p_reason VARCHAR(500)
)
BEGIN
    DECLARE v_project_id INT UNSIGNED;
    DECLARE v_correlative VARCHAR(20);
    DECLARE rows_affected INT;
    
    -- Obtener datos del voluntario
    SELECT project_id, volunteer_correlative 
    INTO v_project_id, v_correlative
    FROM volunteers 
    WHERE id = p_volunteer_id AND is_deleted = FALSE;
    
    IF v_project_id IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Voluntario no encontrado o ya eliminado';
    END IF;
    
    -- Marcar como eliminado
    UPDATE volunteers 
    SET is_deleted = TRUE,
        deleted_by = p_deleted_by,
        deleted_at = CURRENT_TIMESTAMP
    WHERE id = p_volunteer_id AND is_deleted = FALSE;
    
    SET rows_affected = ROW_COUNT();
    
    IF rows_affected > 0 THEN
        -- Registrar auditoría
        INSERT INTO audit_trail (
            entity_type,
            entity_id,
            project_id,
            action_type,
            user_id,
            user_ip,
            user_agent,
            action_description
        ) VALUES (
            'volunteer',
            p_volunteer_id,
            v_project_id,
            'DELETE',
            p_deleted_by,
            p_user_ip,
            p_user_agent,
            CONCAT('Eliminación de ', v_correlative, '. Razón: ', COALESCE(p_reason, 'No especificada'))
        );
    END IF;
    
    SELECT rows_affected AS rows_updated;
END$$

-- Procedimiento: Generar estadísticas de proyecto
CREATE PROCEDURE IF NOT EXISTS get_project_statistics(
    IN p_project_id INT UNSIGNED
)
BEGIN
    SELECT 
        p.name AS project_name,
        p.description,
        p.start_date,
        p.project_status,
        u.username AS responsible_name,
        -- Conteos
        COUNT(v.id) AS total_volunteers,
        -- Estadísticas de BMI
        ROUND(AVG(v.bmi), 2) AS avg_bmi,
        MIN(v.bmi) AS min_bmi,
        MAX(v.bmi) AS max_bmi,
        STD(v.bmi) AS std_bmi,
        -- Distribución por categoría
        SUM(CASE WHEN v.bmi_category = 'Low' THEN 1 ELSE 0 END) AS low_count,
        SUM(CASE WHEN v.bmi_category = 'Normal' THEN 1 ELSE 0 END) AS normal_count,
        SUM(CASE WHEN v.bmi_category = 'High' THEN 1 ELSE 0 END) AS high_count,
        -- Distribución por género
        SUM(CASE WHEN v.gender = 'Male' THEN 1 ELSE 0 END) AS male_count,
        SUM(CASE WHEN v.gender = 'Female' THEN 1 ELSE 0 END) AS female_count,
        SUM(CASE WHEN v.gender = 'Unspecified' THEN 1 ELSE 0 END) AS unspecified_count,
        -- Distribución por color
        SUM(CASE WHEN v.bmi_color = 'Yellow' THEN 1 ELSE 0 END) AS yellow_count,
        SUM(CASE WHEN v.bmi_color = 'Green' THEN 1 ELSE 0 END) AS green_count,
        SUM(CASE WHEN v.bmi_color = 'Red' THEN 1 ELSE 0 END) AS red_count,
        -- Porcentajes
        ROUND((SUM(CASE WHEN v.bmi_category = 'Low' THEN 1 ELSE 0 END) / COUNT(v.id)) * 100, 2) AS low_percentage,
        ROUND((SUM(CASE WHEN v.bmi_category = 'Normal' THEN 1 ELSE 0 END) / COUNT(v.id)) * 100, 2) AS normal_percentage,
        ROUND((SUM(CASE WHEN v.bmi_category = 'High' THEN 1 ELSE 0 END) / COUNT(v.id)) * 100, 2) AS high_percentage
    FROM projects p
    LEFT JOIN users u ON p.responsible_user_id = u.id
    LEFT JOIN volunteers v ON p.id = v.project_id AND v.is_deleted = FALSE
    WHERE p.id = p_project_id
    GROUP BY p.id, p.name, p.description, p.start_date, p.project_status, u.username;
END$$

DELIMITER ;

-- ============================================
-- EVENTOS: Mantenimiento automático
-- ============================================

DELIMITER $$

-- Evento: Limpiar intentos de login antiguos (ejecutar diariamente)
CREATE EVENT IF NOT EXISTS clean_old_login_attempts
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    -- Eliminar intentos de login con más de 90 días
    DELETE FROM login_attempts 
    WHERE login_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    -- Registrar en audit trail
    INSERT INTO audit_trail (entity_type, action_type, user_id, action_description)
    VALUES ('system', 'UPDATE', NULL, 'Limpieza automática de intentos de login antiguos');
END$$

-- Evento: Archivar proyectos antiguos (ejecutar mensualmente)
CREATE EVENT IF NOT EXISTS archive_old_projects
ON SCHEDULE EVERY 1 MONTH
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE project_id INT UNSIGNED;
    DECLARE project_name VARCHAR(150);
    DECLARE cur CURSOR FOR 
        SELECT id, name 
        FROM projects 
        WHERE project_status = 'Cerrado' 
        AND updated_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO project_id, project_name;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Archivar proyecto
        UPDATE projects 
        SET project_status = 'Archivado'
        WHERE id = project_id;
        
        -- Registrar auditoría
        INSERT INTO audit_trail (entity_type, entity_id, action_type, action_description)
        VALUES ('project', project_id, 'UPDATE', 
                CONCAT('Archivado automáticamente: ', project_name));
    END LOOP;
    
    CLOSE cur;
END$$

DELIMITER ;

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

-- Comentarios de tabla
ALTER TABLE users COMMENT = 'Usuarios del sistema con roles y autenticación';
ALTER TABLE projects COMMENT = 'Proyectos de investigación con responsables y estados';
ALTER TABLE volunteers COMMENT = 'Voluntarios con datos biométricos y cálculo automático de IMC';
ALTER TABLE audit_trail COMMENT = 'Registro completo de auditoría de todas las operaciones';
ALTER TABLE reports COMMENT = 'Reportes generados con filtros y aprobación de calidad';
ALTER TABLE system_config COMMENT = 'Configuración parametrizable del sistema';
ALTER TABLE login_attempts COMMENT = 'Registro de seguridad para intentos de login';

-- ============================================
-- FIN DEL ESQUEMA
-- ============================================

-- Mostrar resumen de la base de datos creada
SELECT 
    'Base de datos creada exitosamente' AS message,
    'imc_app' AS database_name,
    COUNT(*) AS total_tables,
    (SELECT COUNT(*) FROM users) AS users_count,
    (SELECT COUNT(*) FROM system_config) AS config_count
FROM information_schema.tables 
WHERE table_schema = 'imc_app';
=======
-- Insertar el primer usuario (Administrador) con un hash temporal
INSERT INTO users (
    username,
    email,
    password_hash,
    user_role,
    user_status,
    created_by
) VALUES (
    'admin_root',
    'admin@imcapp.com',
    'TEMPORAL_PENDIENTE_HASH', -- <-- Valor temporal
    'Administrador',
    'Activo',
    NULL
);
>>>>>>> acbaa98 (fastapi change)
