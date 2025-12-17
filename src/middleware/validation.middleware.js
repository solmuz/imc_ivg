// Validaciones para los diferentes modelos

const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];

    if (!email || email.trim() === '') {
        errors.push('El email es requerido');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
        errors.push('El email no tiene un formato válido');
    }

    if (!password || password.trim() === '') {
        errors.push('La contraseña es requerida');
    } else if (password.length < 8) {
        errors.push('La contraseña debe tener al menos 8 caracteres');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            errors
        });
    }

    next();
};

const validateUserCreate = (req, res, next) => {
    const { username, email, password, user_role } = req.body;
    const errors = [];

    if (!username || username.trim() === '') {
        errors.push('El nombre de usuario es requerido');
    } else if (username.length < 3) {
        errors.push('El nombre de usuario debe tener al menos 3 caracteres');
    }

    if (!email || email.trim() === '') {
        errors.push('El email es requerido');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
        errors.push('El email no tiene un formato válido');
    }

    if (!password || password.trim() === '') {
        errors.push('La contraseña es requerida');
    } else if (password.length < 8) {
        errors.push('La contraseña debe tener al menos 8 caracteres');
    }

    const validRoles = ['Administrador', 'Calidad', 'Usuario'];
    if (user_role && !validRoles.includes(user_role)) {
        errors.push(`El rol debe ser uno de: ${validRoles.join(', ')}`);
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            errors
        });
    }

    next();
};

const validateProject = (req, res, next) => {
    const { name, description, start_date } = req.body;
    const errors = [];

    if (!name || name.trim() === '') {
        errors.push('El nombre del proyecto es requerido');
    } else if (name.length > 150) {
        errors.push('El nombre del proyecto no puede exceder 150 caracteres');
    }

    if (description && description.length > 65535) {
        errors.push('La descripción es demasiado larga');
    }

    if (!start_date) {
        errors.push('La fecha de inicio es requerida');
    } else {
        const date = new Date(start_date);
        if (isNaN(date.getTime())) {
            errors.push('La fecha de inicio no es válida');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            errors
        });
    }

    next();
};

const validateVolunteer = (req, res, next) => {
    const { gender, weight_kg, height_m } = req.body;
    const errors = [];

    const validGenders = ['Male', 'Female', 'Unspecified'];
    if (gender && !validGenders.includes(gender)) {
        errors.push(`El género debe ser uno de: ${validGenders.join(', ')}`);
    }

    if (!weight_kg || isNaN(weight_kg)) {
        errors.push('El peso es requerido y debe ser un número');
    } else if (weight_kg <= 0 || weight_kg > 500) {
        errors.push('El peso debe estar entre 0.01 y 500.00 kg');
    }

    if (!height_m || isNaN(height_m)) {
        errors.push('La estatura es requerida y debe ser un número');
    } else if (height_m < 1.00 || height_m > 2.50) {
        errors.push('La estatura debe estar entre 1.00 y 2.50 m');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            errors
        });
    }

    next();
};

const validateChangePassword = (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    const errors = [];

    if (!currentPassword || currentPassword.trim() === '') {
        errors.push('La contraseña actual es requerida');
    }

    if (!newPassword || newPassword.trim() === '') {
        errors.push('La nueva contraseña es requerida');
    } else if (newPassword.length < 8) {
        errors.push('La nueva contraseña debe tener al menos 8 caracteres');
    } else if (newPassword === currentPassword) {
        errors.push('La nueva contraseña debe ser diferente a la actual');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            errors
        });
    }

    next();
};

// Validaciones para reportes
const validateReportFilters = (req, res, next) => {
    const { filters } = req.body;
    
    if (filters) {
        try {
            // Validar que filters sea un objeto JSON válido
            const parsedFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;
            
            // Validar tipos de filtros permitidos
            const allowedFilters = ['gender', 'bmi_category', 'start_date', 'end_date', 'registered_by'];
            const filterKeys = Object.keys(parsedFilters);
            
            for (const key of filterKeys) {
                if (!allowedFilters.includes(key)) {
                    return res.status(400).json({
                        success: false,
                        error: `Filtro no permitido: ${key}`
                    });
                }
            }
            
            // Validar fechas
            if (parsedFilters.start_date) {
                const startDate = new Date(parsedFilters.start_date);
                if (isNaN(startDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        error: 'Fecha de inicio inválida'
                    });
                }
            }
            
            if (parsedFilters.end_date) {
                const endDate = new Date(parsedFilters.end_date);
                if (isNaN(endDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        error: 'Fecha de fin inválida'
                    });
                }
            }
            
            req.parsedFilters = parsedFilters;
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Formato de filtros inválido'
            });
        }
    }
    
    next();
};

module.exports = {
    validateLogin,
    validateUserCreate,
    validateProject,
    validateVolunteer,
    validateChangePassword,
    validateReportFilters
};
