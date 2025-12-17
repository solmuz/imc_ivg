const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

try {
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'imc_app',
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0
    });
    
    console.log('✅ Configuración DB cargada');
} catch (error) {
    console.error('❌ Error creando pool de conexiones:', error.message);
    pool = null;
}

async function query(sql, params = []) {
    if (!pool) {
        throw new Error('Pool de conexiones no inicializado');
    }
    
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('❌ Error en consulta SQL:', error.message);
        console.error('Consulta:', sql);
        throw error;
    }
}

// Función de prueba segura
async function testConnection() {
    if (!pool) {
        return { success: false, error: 'Pool no inicializado' };
    }
    
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        return { success: true };
    } catch (error) {
        return { 
            success: false, 
            error: error.message,
            details: 'Verifica que MySQL esté corriendo y las credenciales sean correctas'
        };
    }
}

module.exports = {
    query,
    testConnection
};