import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { projectService, userService } from '../services/dataService'
import './Projects.css'

function Projects() {
  const [searchParams] = useSearchParams()
  const { canEdit } = useAuth()
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(searchParams.get('new') === 'true')
  const [editProject, setEditProject] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    responsable_id: ''
  })
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [projectsRes, usersRes] = await Promise.all([
        projectService.getAll({ page_size: 100 }),
        canEdit() ? userService.getAll() : Promise.resolve({ data: [] })
      ])
      setProjects(projectsRes.data.projects)
      setUsers(usersRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    try {
      if (editProject) {
        await projectService.update(editProject.project_id, formData)
      } else {
        await projectService.create(formData)
      }
      setShowModal(false)
      setEditProject(null)
      setFormData({ nombre: '', descripcion: '', responsable_id: '' })
      loadData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar')
    }
  }

  const openEdit = (project) => {
    setEditProject(project)
    setFormData({
      nombre: project.nombre,
      descripcion: project.descripcion || '',
      responsable_id: project.responsable_id
    })
    setShowModal(true)
  }

  const handleArchive = async (projectId) => {
    if (window.confirm('¿Está seguro de archivar este proyecto?')) {
      try {
        await projectService.archive(projectId)
        loadData()
      } catch (err) {
        alert(err.response?.data?.detail || 'Error al archivar')
      }
    }
  }

  const filteredProjects = projects.filter(p => 
    p.nombre.toLowerCase().includes(filter.toLowerCase())
  )

  if (loading) return <div className="loading">Cargando...</div>

  return (
    <div className="projects-page">
      <div className="page-header">
        <h2>Proyectos</h2>
        {canEdit() && (
          <button 
            className="btn-primary"
            onClick={() => {
              setEditProject(null)
              setFormData({ nombre: '', descripcion: '', responsable_id: '' })
              setShowModal(true)
            }}
          >
            + Nuevo Proyecto
          </button>
        )}
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Buscar proyectos..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="projects-grid">
        {filteredProjects.length === 0 ? (
          <p className="empty-message">No hay proyectos que mostrar</p>
        ) : (
          filteredProjects.map(project => (
            <div key={project.project_id} className="project-card-full">
              <div className="card-header">
                <h3>{project.nombre}</h3>
                <span className={`status-badge ${project.estado.toLowerCase()}`}>
                  {project.estado}
                </span>
              </div>
              <p className="card-description">{project.descripcion || 'Sin descripción'}</p>
              <div className="card-meta">
                <span>📅 {project.fecha_inicio}</span>
                <span>👤 {project.responsable?.nombre || 'N/A'}</span>
                <span>👥 {project.volunteer_count || 0} voluntarios</span>
              </div>
              <div className="card-actions">
                <Link to={`/projects/${project.project_id}`} className="btn-view">
                  Ver detalle
                </Link>
                {canEdit() && project.estado !== 'Archivado' && (
                  <button onClick={() => openEdit(project)} className="btn-edit">
                    Editar
                  </button>
                )}
                {project.estado !== 'Archivado' && (
                  <button 
                    onClick={() => handleArchive(project.project_id)} 
                    className="btn-archive"
                  >
                    Archivar
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h3>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div className="form-group">
                <label>Responsable *</label>
                <select
                  value={formData.responsable_id}
                  onChange={(e) => setFormData({...formData, responsable_id: e.target.value})}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {users.map(user => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.nombre} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editProject ? 'Guardar cambios' : 'Crear proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Projects
