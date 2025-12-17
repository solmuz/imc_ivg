const express = require('express');
const ProjectController = require('../controllers/project.controller');
const { validateProject } = require('../middleware/validation.middleware');
const { checkRole, checkResourceOwnership } = require('../middleware/auth.middleware');

const router = express.Router();

// Crear proyecto
router.post('/', 
    validateProject, 
    checkRole(['Administrador', 'Usuario']), 
    ProjectController.createProject
);

// Obtener todos los proyectos
router.get('/', ProjectController.getProjects);

// Obtener proyecto específico
router.get('/:id', ProjectController.getProjectById);

// Actualizar proyecto
router.put('/:id', 
    checkRole(['Administrador', 'Usuario', 'Calidad']),
    ProjectController.updateProject
);

// Archivar proyecto
router.put('/:id/archive', 
    checkRole(['Administrador', 'Calidad']),
    ProjectController.archiveProject
);

// Obtener estadísticas del proyecto
router.get('/:id/statistics', ProjectController.getProjectStatistics);

// Obtener voluntarios del proyecto
router.get('/:id/volunteers', ProjectController.getProjectVolunteers);

module.exports = router;
