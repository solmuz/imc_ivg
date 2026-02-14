import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { projectService, volunteerService, reportService } from '../services/dataService'
import { formatDate } from '../utils/dateFormatter'
import './ProjectDetail.css'

function ProjectDetail() {
  const { projectId } = useParams()
  const { canEdit, canDelete } = useAuth()
  const [project, setProject] = useState(null)
  const [volunteers, setVolunteers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editVolunteer, setEditVolunteer] = useState(null)
  const [formData, setFormData] = useState({
    sexo: 'M',
    peso_kg: '',
    estatura_m: ''
  })
  const [error, setError] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(null)

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    try {
      const [projectRes, volunteersRes, statsRes] = await Promise.all([
        projectService.getById(projectId),
        volunteerService.getAll(projectId, { page_size: 100 }),
        volunteerService.getStats(projectId)
      ])
      setProject(projectRes.data)
      setVolunteers(volunteersRes.data.volunteers)
      setStats(statsRes.data)
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
      const data = {
        sexo: formData.sexo,
        peso_kg: parseFloat(formData.peso_kg),
        estatura_m: parseFloat(formData.estatura_m)
      }
      
      if (editVolunteer) {
        await volunteerService.update(projectId, editVolunteer.volunteer_id, data)
      } else {
        await volunteerService.create(projectId, data)
      }
      setShowModal(false)
      setEditVolunteer(null)
      setFormData({ sexo: 'M', peso_kg: '', estatura_m: '' })
      loadData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar')
    }
  }

  const openEdit = (volunteer) => {
    setEditVolunteer(volunteer)
    setFormData({
      sexo: volunteer.sexo,
      peso_kg: volunteer.peso_kg,
      estatura_m: volunteer.estatura_m
    })
    setShowModal(true)
  }

  const handleDelete = async (volunteerId) => {
    try {
      await volunteerService.delete(projectId, volunteerId, { deletion_reason: deleteReason })
      setShowDeleteModal(null)
      setDeleteReason('')
      loadData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar')
    }
  }

  const exportCSV = async () => {
    try {
      const response = await reportService.exportCSV(projectId)
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte_${project.nombre}.csv`
      a.click()
    } catch (error) {
      console.error('Error exporting CSV:', error)
    }
  }

  const exportPDF = async () => {
    try {
      const response = await reportService.exportPDF(projectId)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte_${project.nombre}.pdf`
      a.click()
    } catch (error) {
      console.error('Error exporting PDF:', error)
    }
  }

  const getBandaClass = (banda) => {
    const classes = { LOW: 'banda-low', NORMAL: 'banda-normal', HIGH: 'banda-high' }
    return classes[banda] || ''
  }

  const getBandaLabel = (banda) => {
    const labels = { LOW: 'Bajo', NORMAL: 'Normal', HIGH: 'Alto' }
    return labels[banda] || banda
  }

  if (loading) return <div className="loading">Cargando...</div>
  if (!project) return <div className="error">Proyecto no encontrado</div>

  return (
    <div className="project-detail">
      <div className="breadcrumb">
        <Link to="/projects">← Volver a proyectos</Link>
      </div>

      <div className="project-header">
        <div>
          <h2>{project.nombre}</h2>
          <p>{project.descripcion || 'Sin descripción'}</p>
          <div className="project-meta">
            <span>📅 Inicio: {project.fecha_inicio}</span>
            <span>👤 Responsable: {project.responsable?.nombre || 'N/A'}</span>
            <span className={`status-badge ${project.estado.toLowerCase()}`}>
              {project.estado}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={exportCSV} className="btn-export">📊 Exportar CSV</button>
          <button onClick={exportPDF} className="btn-export">📄 Exportar PDF</button>
        </div>
      </div>

      {stats && (
        <div className="stats-section">
          <h3>Estadísticas</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{stats.total_active}</span>
              <span className="stat-label">Total Voluntarios</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.imc_promedio || '—'}</span>
              <span className="stat-label">IMC Promedio</span>
            </div>
            <div className="stat-item banda-low">
              <span className="stat-value">{stats.count_low}</span>
              <span className="stat-label">Bajo (Amarillo)</span>
            </div>
            <div className="stat-item banda-normal">
              <span className="stat-value">{stats.count_normal}</span>
              <span className="stat-label">Normal (Verde)</span>
            </div>
            <div className="stat-item banda-high">
              <span className="stat-value">{stats.count_high}</span>
              <span className="stat-label">Alto (Rojo)</span>
            </div>
          </div>
        </div>
      )}

      <div className="volunteers-section">
        <div className="section-header">
          <h3>Voluntarios</h3>
          {canEdit() && project.estado !== 'Archivado' && (
            <button 
              className="btn-primary"
              onClick={() => {
                setEditVolunteer(null)
                setFormData({ sexo: 'M', peso_kg: '', estatura_m: '' })
                setShowModal(true)
              }}
            >
              + Agregar Voluntario
            </button>
          )}
        </div>

        {volunteers.length === 0 ? (
          <p className="empty-message">No hay voluntarios registrados</p>
        ) : (
          <table className="volunteers-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Sexo</th>
                <th>Peso (kg)</th>
                <th>Estatura (m)</th>
                <th>IMC</th>
                <th>Categoría</th>
                <th>Fecha</th>
                <th>Registrado por</th>
                {(canEdit() || canDelete()) && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {volunteers.map(v => (
                <tr key={v.volunteer_id} className={`${getBandaClass(v.banda_imc)} ${v.is_deleted ? 'deleted' : ''}`}>
                  <td>Vol. {v.correlativo}</td>
                  <td>{v.sexo}</td>
                  <td>{parseFloat(v.peso_kg).toFixed(2)}</td>
                  <td>{parseFloat(v.estatura_m).toFixed(2)}</td>
                  <td><strong>{parseFloat(v.imc).toFixed(2)}</strong></td>
                  <td>
                    <span className={`banda-badge ${getBandaClass(v.banda_imc)}`}>
                      {getBandaLabel(v.banda_imc)}
                    </span>
                  </td>
                  <td>{formatDate(v.created_at)}</td>
                  <td>{v.registrar?.nombre || 'N/A'}</td>
                  {(canEdit() || canDelete()) && (
                    <td>
                      {!v.is_deleted && (
                        <>
                          {canEdit() && project.estado !== 'Archivado' && (
                            <button onClick={() => openEdit(v)} className="btn-sm btn-edit">
                              Editar
                            </button>
                          )}
                          {canDelete() && (
                            <button onClick={() => setShowDeleteModal(v)} className="btn-sm btn-delete">
                              Eliminar
                            </button>
                          )}
                        </>
                      )}
                      {v.is_deleted && <span className="deleted-badge">Eliminado</span>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Voluntario */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editVolunteer ? 'Editar Voluntario' : 'Nuevo Voluntario'}</h3>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Sexo *</label>
                <select
                  value={formData.sexo}
                  onChange={(e) => setFormData({...formData, sexo: e.target.value})}
                  required
                >
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="No especificado">No especificado</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Peso (kg) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="500"
                  value={formData.peso_kg}
                  onChange={(e) => setFormData({...formData, peso_kg: e.target.value})}
                  placeholder="Ej: 70.50"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Estatura (m) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1.00"
                  max="2.50"
                  value={formData.estatura_m}
                  onChange={(e) => setFormData({...formData, estatura_m: e.target.value})}
                  placeholder="Ej: 1.75"
                  required
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editVolunteer ? 'Guardar cambios' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Eliminar Voluntario</h3>
            <p>¿Está seguro de eliminar al Voluntario {showDeleteModal.correlativo}?</p>
            
            <div className="form-group">
              <label>Motivo de eliminación (opcional)</label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
                placeholder="Indique el motivo..."
              />
            </div>
            
            <div className="modal-actions">
              <button onClick={() => setShowDeleteModal(null)} className="btn-cancel">
                Cancelar
              </button>
              <button 
                onClick={() => handleDelete(showDeleteModal.volunteer_id)} 
                className="btn-danger"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectDetail
