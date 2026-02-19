import { useState, useEffect } from 'react'
import { auditService, userService, projectService } from '../services/dataService'
import { formatDateTime } from '../utils/dateFormatter'
import './AuditTrail.css'

function AuditTrail() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [volunteers, setVolunteers] = useState([])
  const [filters, setFilters] = useState({
    project_id: '',
    user_id: '',
    accion: '',
    entidad: ''
  })
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 50

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    loadLogs()
  }, [page, filters])

  const loadInitialData = async () => {
    try {
      const [usersRes, projectsRes, volunteersRes] = await Promise.all([
        userService.getAll(),
        projectService.getAll({ page_size: 100 }),
        projectService.getAllVolunteers?.()?.catch(() => ({ data: [] }))
      ])
      setUsers(usersRes.data)
      setProjects(projectsRes.data.projects)
      setVolunteers(volunteersRes?.data || [])
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params = {
        page,
        page_size: pageSize,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        )
      }
      const response = await auditService.getAll(params)
      setLogs(response.data.logs)
      setTotal(response.data.total)
    } catch (error) {
      console.error('Error loading logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value })
    setPage(1)
  }

  const getActionBadge = (action) => {
    const badges = {
      ALTA: 'action-create',
      MODIFICACION: 'action-update',
      ELIMINACION: 'action-delete',
      EXPORT: 'action-export',
      LOGIN: 'action-login',
      LOGOUT: 'action-logout',
      LOGIN_FAILED: 'action-failed'
    }
    return badges[action] || ''
  }

  const getEntityLabel = (entity) => {
    const labels = {
      PROJECT: 'Proyecto',
      VOLUNTEER: 'Voluntario',
      USER: 'Usuario',
      REPORT: 'Reporte',
      SESSION: 'Sesión'
    }
    return labels[entity] || entity
  }

  const getActionLabel = (action) => {
    const labels = {
      ALTA: 'Alta',
      MODIFICACION: 'Modificación',
      ELIMINACION: 'Eliminación',
      EXPORT: 'Exportación',
      LOGIN: 'Inicio Sesión',
      LOGOUT: 'Cierre Sesión',
      LOGIN_FAILED: 'Login Fallido'
    }
    return labels[action] || action
  }

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.project_id === projectId)
    return project ? project.nombre : `Proyecto #${projectId}`
  }

  const getEntityDisplayName = (entityType, entityId) => {
    switch (entityType) {
      case 'PROJECT': {
        const project = projects.find(p => p.project_id === entityId)
        return project ? project.nombre : `Proyecto #${entityId}`
      }
      case 'VOLUNTEER': {
        const volunteer = volunteers.find(v => v.volunteer_id === entityId)
        return volunteer ? `${volunteer.nombre} ${volunteer.apellido}` : `Voluntario #${entityId}`
      }
      case 'USER': {
        const user = users.find(u => u.user_id === entityId)
        return user ? user.nombre : `Usuario #${entityId}`
      }
      case 'REPORT':
        return `Reporte #${entityId}`
      case 'SESSION':
        return `Sesión #${entityId}`
      default:
        return `#${entityId}`
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="audit-page">
      <div className="page-header">
        <h2>Audit Trail</h2>
        <span className="total-count">{total} registros</span>
      </div>

      <div className="filters-bar">
        <select
          value={filters.project_id}
          onChange={(e) => handleFilterChange('project_id', e.target.value)}
        >
          <option value="">Todos los proyectos</option>
          {projects.map(p => (
            <option key={p.project_id} value={p.project_id}>{p.nombre}</option>
          ))}
        </select>

        <select
          value={filters.user_id}
          onChange={(e) => handleFilterChange('user_id', e.target.value)}
        >
          <option value="">Todos los usuarios</option>
          {users.map(u => (
            <option key={u.user_id} value={u.user_id}>{u.nombre}</option>
          ))}
        </select>

        <select
          value={filters.entidad}
          onChange={(e) => handleFilterChange('entidad', e.target.value)}
        >
          <option value="">Todas las entidades</option>
          <option value="PROJECT">Proyecto</option>
          <option value="VOLUNTEER">Voluntario</option>
          <option value="USER">Usuario</option>
          <option value="REPORT">Reporte</option>
          <option value="SESSION">Sesión</option>
        </select>

        <select
          value={filters.accion}
          onChange={(e) => handleFilterChange('accion', e.target.value)}
        >
          <option value="">Todas las acciones</option>
          <option value="ALTA">Alta</option>
          <option value="MODIFICACION">Modificación</option>
          <option value="ELIMINACION">Eliminación</option>
          <option value="EXPORT">Exportación</option>
          <option value="LOGIN">Login</option>
          <option value="LOGOUT">Logout</option>
        </select>

        <button onClick={() => setFilters({ project_id: '', user_id: '', accion: '', entidad: '' })} className="btn-clear">
          Limpiar filtros
        </button>
      </div>

      {loading ? (
        <div className="loading">Cargando...</div>
      ) : (
        <>
          <div className="audit-list">
            {logs.length === 0 ? (
              <p className="empty-message">No hay registros de auditoría</p>
            ) : (
              logs.map(log => (
                <div key={log.audit_id} className="audit-item">
                  <div className="audit-header">
                    <span className={`action-badge ${getActionBadge(log.accion)}`}>
                      {getActionLabel(log.accion)}
                    </span>
                    <span className="entity-badge">
                      {getEntityLabel(log.entidad)}: {getEntityDisplayName(log.entidad, log.entidad_id)}
                    </span>
                    <span className="audit-time">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                  <div className="audit-body">
                    <span className="audit-user">
                      👤 {log.user?.nombre || 'Usuario desconocido'}
                    </span>
                    {log.project_id && (
                      <span className="audit-project">
                        📁 {getProjectName(log.project_id)}
                      </span>
                    )}
                    {log.ip_address && (
                      <span className="audit-ip">
                        🌐 {log.ip_address}
                      </span>
                    )}
                  </div>
                  {(log.detalle_before || log.detalle_after) && (
                    <div className="audit-details">
                      {log.detalle_before && (
                        <details>
                          <summary>Antes</summary>
                          <pre>{JSON.stringify(JSON.parse(log.detalle_before), null, 2)}</pre>
                        </details>
                      )}
                      {log.detalle_after && (
                        <details>
                          <summary>Después</summary>
                          <pre>{JSON.stringify(JSON.parse(log.detalle_after), null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Anterior
              </button>
              <span>Página {page} de {totalPages}</span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AuditTrail
