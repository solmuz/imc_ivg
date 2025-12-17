const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();
const app = express();

// Configuración de seguridad
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // límite de solicitudes por IP
});
app.use('/api/', limiter);

// Middleware
app.use(express.json({ limit: process.env.MAX_REQUEST_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ===== RUTAS PÚBLICAS =====
// Ruta de salud
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        timezone: 'America/Monterrey',
        database: process.env.DB_NAME,
        environment: process.env.NODE_ENV
    });
});

// Ruta para probar conexión a DB (con mejor manejo de errores)
app.get('/api/test-db', async (req, res) => {
    try {
        const db = require('./config/database');
        const testResult = await db.testConnection();
        
        if (testResult.success) {
            // if stuff works the
            const result = await db.query('SELECT 1 as test, NOW() as server_time');
            res.json({
                success: true,
                database: 'Conectado correctamente',
                test: result[0].test,
                server_time: result[0].server_time,
                db_name: process.env.DB_NAME
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Error de conexión a base de datos',
                message: testResult.error,
                details: testResult.details,
                config: {
                    host: process.env.DB_HOST,
                    database: process.env.DB_NAME,
                    user: process.env.DB_USER
                }
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error en test de base de datos',
            message: error.message,
            config_loaded: !!process.env.DB_NAME
        });
    }
});

// Ruta de bienvenida
app.get('/', (req, res) => {
    res.json({
        message: 'Bienvenido a la API del Sistema IMC App',
        version: '1.0.0',
        status: 'Servidor funcionando',
        timezone: 'America/Monterrey',
        endpoints: {
            health: 'GET /api/health',
            test_db: 'GET /api/test-db',
            auth: {
                login: 'POST /api/auth/login',
                verify: 'GET /api/auth/verify'
            }
        }
    });
});

// Auth routes :D
const authRouter = require('express').Router();

// Login simulado
authRouter.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Email y contraseña son requeridos'
        });
    }
    
    // Simulación de login exitoso
    res.json({
        success: true,
        message: 'Login simulado (en desarrollo)',
        token: 'jwt-simulado-123456',
        user: {
            id: 1,
            email: email,
            role: 'Administrador',
            username: 'admin_simulado'
        }
    });
});

// Verificar token
authRouter.get('/verify', (req, res) => {
    res.json({
        success: true,
        message: 'Endpoint de verificación (en desarrollo)'
    });
});

app.use('/api/auth', authRouter);

// Error handling :D
// Ruta no encontrada
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Ruta no encontrada',
        path: req.path,
        method: req.method,
        availableEndpoints: [
            'GET /',
            'GET /api/health',
            'GET /api/test-db',
            'POST /api/auth/login',
            'GET /api/auth/verify'
        ]
    });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// server start :D
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Timezone: America/Monterrey`);
    console.log(`Base de datos configurada: ${process.env.DB_NAME || 'No configurada'}`);
    console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Endpoints disponibles:`);
    console.log(`   • GET  /`);
    console.log(`   • GET  /api/health`);
    console.log(`   • GET  /api/test-db`);
    console.log(`   • POST /api/auth/login`);
    console.log(`   • GET  /api/auth/verify`);
});

module.exports = app;
