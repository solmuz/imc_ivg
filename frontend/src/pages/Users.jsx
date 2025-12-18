import { useState, useEffect } from 'react'
import { userService } from '../services/dataService'
import './Users.css'

function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [showResetModal, setShowResetModal] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'Usuario'
  })
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const response = await userService.getAll()
      setUsers(response.data)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    try {
      if (editUser) {
        const { password, ...updateData } = formData
        await userService.update(editUser.user_id, updateData)
      } else {
        await userService.create(formData)
      }
      setShowModal(false)
      setEditUser(null)
      setFormData({ nombre: '', email: '', password: '', rol: 'Usuario' })
      loadData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar')
    }
  }

  const openEdit = (user) => {
    setEditUser(user)
    setFormData({
      nombre: user.nombre,
      email: user.email,
      password: '',
      rol: user.rol
    })
    setShowModal(true)
  }

  const handleResetPassword = async () => {
    try {
      await userService.resetPassword(showResetModal.user_id, { new_password: newPassword })
      setShowResetModal(null)
      setNewPassword('')
      alert('Contraseña restablecida exitosamente')
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al restablecer contraseña')
    }
  }

  const handleDeactivate = async (userId) => {
    if (window.confirm('¿Está seguro de desactivar este usuario?')) {
      try {
        await userService.deactivate(userId)
        loadData()
      } catch (err) {
        alert(err.response?.data?.detail || 'Error al desactivar')
      }
    }
  }

  if (loading) return <div className="loading">Cargando...</div>

  return (
    <div className="users-page">
      <div className="page-header">
        <h2>Administración de Usuarios</h2>
        <button 
          className="btn-primary"
          onClick={() => {
            setEditUser(null)
            setFormData({ nombre: '', email: '', password: '', rol: 'Usuario' })
            setShowModal(true)
          }}
        >
          + Nuevo Usuario
        </button>
      </div>

      <table className="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Creado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.user_id} className={user.estado === 'Inactivo' ? 'inactive' : ''}>
              <td>{user.user_id}</td>
              <td>{user.nombre}</td>
              <td>{user.email}</td>
              <td>
                <span className={`role-badge role-${user.rol.toLowerCase()}`}>
                  {user.rol}
                </span>
              </td>
              <td>
                <span className={`status-badge ${user.estado.toLowerCase()}`}>
                  {user.estado}
                </span>
              </td>
              <td>{new Date(user.created_at).toLocaleDateString()}</td>
              <td>
                <button onClick={() => openEdit(user)} className="btn-sm btn-edit">
                  Editar
                </button>
                <button onClick={() => setShowResetModal(user)} className="btn-sm btn-reset">
                  Reset Pass
                </button>
                {user.estado === 'Activo' && (
                  <button onClick={() => handleDeactivate(user.user_id)} className="btn-sm btn-deactivate">
                    Desactivar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal Usuario */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            
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
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              
              {!editUser && (
                <div className="form-group">
                  <label>Contraseña *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    minLength={8}
                    required
                  />
                  <small>Mínimo 8 caracteres</small>
                </div>
              )}
              
              <div className="form-group">
                <label>Rol *</label>
                <select
                  value={formData.rol}
                  onChange={(e) => setFormData({...formData, rol: e.target.value})}
                  required
                >
                  <option value="Usuario">Usuario</option>
                  <option value="Calidad">Calidad</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editUser ? 'Guardar cambios' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Restablecer Contraseña</h3>
            <p>Usuario: {showResetModal.nombre} ({showResetModal.email})</p>
            
            <div className="form-group">
              <label>Nueva Contraseña *</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
              <small>Mínimo 8 caracteres. El usuario deberá cambiarla en su próximo inicio de sesión.</small>
            </div>
            
            <div className="modal-actions">
              <button onClick={() => setShowResetModal(null)} className="btn-cancel">
                Cancelar
              </button>
              <button onClick={handleResetPassword} className="btn-primary" disabled={newPassword.length < 8}>
                Restablecer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users
