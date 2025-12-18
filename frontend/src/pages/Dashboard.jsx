import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { projectService } from '../services/dataService'
import './Dashboard.css'

function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ projects: 0, activeProjects: 0 })
  const [recentProjects, setRecentProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const response = await projectService.getAll({ page_size: 5 })
      setRecentProjects(response.data.projects)
      setStats({
        projects: response.data.total,
        activeProjects: response.data.projects.filter(p => p.estado === 'Activo').length
      })
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Cargando...</div>
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Bienvenido, {user?.nombre}</h2>
        <p>Panel de control del sistema de gestión de IMC</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon projects-icon">📁</div>
          <div className="stat-info">
            <span className="stat-value">{stats.projects}</span>
            <span className="stat-label">Proyectos Totales</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon active-icon">✓</div>
          <div className="stat-info">
            <span className="stat-value">{stats.activeProjects}</span>
            <span className="stat-label">Proyectos Activos</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon role-icon">👤</div>
          <div className="stat-info">
            <span className="stat-value">{user?.rol}</span>
            <span className="stat-label">Tu Rol</span>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h3>Proyectos Recientes</h3>
          <Link to="/projects" className="btn-view-all">Ver todos</Link>
        </div>
        
        {recentProjects.length === 0 ? (
          <p className="empty-message">No hay proyectos registrados</p>
        ) : (
          <div className="projects-list">
            {recentProjects.map(project => (
              <Link 
                key={project.project_id} 
                to={`/projects/${project.project_id}`}
                className="project-card"
              >
                <div className="project-info">
                  <h4>{project.nombre}</h4>
                  <p>{project.descripcion || 'Sin descripción'}</p>
                </div>
                <div className="project-meta">
                  <span className={`status-badge ${project.estado.toLowerCase()}`}>
                    {project.estado}
                  </span>
                  <span className="volunteer-count">
                    {project.volunteer_count || 0} voluntarios
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="quick-actions">
        <h3>Acciones Rápidas</h3>
        <div className="actions-grid">
          <Link to="/projects" className="action-card">
            <span className="action-icon">📋</span>
            <span>Ver Proyectos</span>
          </Link>
          {user?.rol !== 'Calidad' && (
            <Link to="/projects?new=true" className="action-card">
              <span className="action-icon">➕</span>
              <span>Nuevo Proyecto</span>
            </Link>
          )}
          {(user?.rol === 'Administrador' || user?.rol === 'Calidad') && (
            <Link to="/audit" className="action-card">
              <span className="action-icon">📜</span>
              <span>Ver Auditoría</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
