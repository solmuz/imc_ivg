const Project = require('../models/project.model');
const Volunteer = require('../models/volunteer.model');
const Audit = require('../models/audit.model');
const { AppError, NotFoundError, ForbiddenError } = require('../middleware/error.middleware');

class ProjectController {
    // Crear proyecto
    static async createProject(req, res, next) {
        try {
            const projectData = {
                ...req.body,
                responsible_user_id: req.user.role === 'Administrador' 
                    ? req.body.responsible_user_id || req.user.id
                    : req.user.id
            };

            const projectId = await Project.create(projectData);

            // Auditoría
            await Audit.create({
                user_id: req.user.id,
                entity_type: 'project',
                entity_id: projectId,
                action_type: 'CREATE',
                user_ip: req.ip,
                user_agent: req.headers['user-agent'],
                details_after: projectData,
                action_description: `Proyecto "${projectData.name}" creado`
            });

            res.status(201).json({
                success: true,
                message: 'Proyecto creado exitosamente',
                data: { 
                    projectId,
                    volunteer_correlative_start: 'Voluntario 1'
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Obtener todos los proyectos
    static async getProjects(req, res, next) {
        try {
            const { page = 1, limit = 10, status, search } = req.query;
            
            const filters = {};
            if (status) filters.status = status;
            if (search) filters.search = search;

            // Si no es administrador, solo ver sus proyectos
            if (req.user.role !== 'Administrador' && req.user.role !== 'Calidad') {
                filters.responsible_user_id = req.user.id;
            }

            const result = await Project.findAll(filters, parseInt(page), parseInt(limit));

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    // Obtener proyecto por ID
    static async getProjectById(req, res, next) {
        try {
            const projectId = req.params.id;
            
            // Verificar permisos
            const hasPermission = await Project.checkPermission(
                projectId, 
                req.user.id, 
                req.user.role
            );

            if (!hasPermission) {
                throw new ForbiddenError('No tiene permisos para ver este proyecto');
            }

            const project = await Project.findById(projectId);
            
            if (!project) {
                throw new NotFoundError('Proyecto no encontrado');
            }

            res.json({
                success: true,
                data: project
            });
        } catch (error) {
            next(error);
        }
    }

    // Actualizar proyecto
    static async updateProject(req, res, next) {
        try {
            const projectId = req.params.id;

            // Verificar permisos
            const project = await Project.findById(projectId);
            if (!project) {
                throw new NotFoundError('Proyecto no encontrado');
            }

            // Usuario solo puede editar sus propios proyectos
            if (req.user.role === 'Usuario' && project.responsible_user_id !== req.user.id) {
                throw new ForbiddenError('Solo puede editar sus propios proyectos');
            }

            // Calidad solo puede archivar, no editar
            if (req.user.role === 'Calidad' && req.body.project_status !== 'Archivado') {
                throw new ForbiddenError('El rol Calidad solo puede archivar proyectos');
            }

            const updated = await Project.update(projectId, req.body);

            if (!updated) {
                throw new AppError('No se pudo actualizar el proyecto', 400);
            }

            // Auditoría
            await Audit.create({
                user_id: req.user.id,
                entity_type: 'project',
                entity_id: projectId,
                action_type: 'UPDATE',
                user_ip: req.ip,
                user_agent: req.headers['user-agent'],
                details_after: req.body,
                action_description: `Proyecto "${project.name}" actualizado`
            });

            res.json({
                success: true,
                message: 'Proyecto actualizado exitosamente'
            });
        } catch (error) {
            next(error);
        }
    }

    // Archivar proyecto
    static async archiveProject(req, res, next) {
        try {
            const projectId = req.params.id;

            // Verificar que existe
            const project = await Project.findById(projectId);
            if (!project) {
                throw new NotFoundError('Proyecto no encontrado');
            }

            const archived = await Project.archive(projectId);

            if (!archived) {
                throw new AppError('No se pudo archivar el proyecto', 400);
            }

            // Auditoría
            await Audit.create({
                user_id: req.user.id,
                entity_type: 'project',
                entity_id: projectId,
                action_type: 'UPDATE',
                user_ip: req.ip,
                user_agent: req.headers['user-agent'],
                details_after: { project_status: 'Archivado' },
                action_description: `Proyecto "${project.name}" archivado`
            });

            res.json({
                success: true,
                message: 'Proyecto archivado exitosamente'
            });
        } catch (error) {
            next(error);
        }
    }

    // Obtener estadísticas del proyecto
    static async getProjectStatistics(req, res, next) {
        try {
            const projectId = req.params.id;
            
            // Verificar permisos
            const hasPermission = await Project.checkPermission(
                projectId, 
                req.user.id, 
                req.user.role
            );

            if (!hasPermission) {
                throw new ForbiddenError('No tiene permisos para ver este proyecto');
            }

            const statistics = await Project.getStatistics(projectId);

            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            next(error);
        }
    }

    // Obtener voluntarios del proyecto
    static async getProjectVolunteers(req, res, next) {
        try {
            const projectId = req.params.id;
            const { page = 1, limit = 20, gender, bmi_category, search } = req.query;
            
            // Verificar permisos
            const hasPermission = await Project.checkPermission(
                projectId, 
                req.user.id, 
                req.user.role
            );

            if (!hasPermission) {
                throw new ForbiddenError('No tiene permisos para ver este proyecto');
            }

            const filters = { gender, bmi_category, search };
            const result = await Volunteer.findByProject(
                projectId, 
                filters, 
                parseInt(page), 
                parseInt(limit)
            );

            // Obtener estadísticas adicionales
            const statistics = await Volunteer.getProjectStatistics(projectId);

            res.json({
                success: true,
                data: {
                    volunteers: result,
                    statistics
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = ProjectController;
